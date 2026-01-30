/**
 * remote add command - Add a skill from a remote repository or local directory
 */

import { dirname } from "path";
import { parseSkillReference, buildCloneUrl, isLocalSkillRef, isGithubSkillRef } from "../../lib/repo-reference.js";
import { getRepoCachePath, getLocalSkillPath, ensureDir, getSkillsDir, validateLocalPath } from "../../lib/paths.js";
import { isGitInstalled, ensureRepo } from "../../lib/git.js";
import { findSkillByName } from "../../lib/skill-finder.js";
import { dirExists, copyDir } from "../../lib/fs-utils.js";
import { ensureGitReady, commitSkillChange } from "../../lib/skill-git.js";
import { validateSkillName } from "../../lib/local-skill-ref.js";
import { updateSkillFrontmatterName } from "../../lib/skill-parser.js";
import type { SkillReference, GithubRepoReference, LocalRepoReference } from "../../types.js";

export async function addCommand(args: string[]): Promise<void> {
  const skillArg = args[0];

  if (!skillArg || skillArg === "--help" || skillArg === "-h") {
    printHelp();
    return;
  }

  // Parse --rename flag
  let targetName: string | undefined;
  const renameIndex = args.indexOf("--rename");
  if (renameIndex !== -1) {
    targetName = args[renameIndex + 1];
    if (!targetName) {
      console.error("Error: --rename requires a name argument.");
      process.exit(1);
    }
  }

  // Parse skill reference
  let skillRef: SkillReference;
  try {
    skillRef = parseSkillReference(skillArg);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  let sourcePath: string;
  let repoRef: GithubRepoReference | LocalRepoReference;

  if (isLocalSkillRef(skillRef)) {
    // Local path - validate it exists and is a directory
    try {
      await validateLocalPath(skillRef.path);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
    sourcePath = skillRef.path;
    repoRef = { host: skillRef.host, path: skillRef.path };
    console.log(`Scanning ${skillRef.host}@${skillRef.path}...`);
  } else if (isGithubSkillRef(skillRef)) {
    // GitHub - check git is installed and clone/pull
    if (!(await isGitInstalled())) {
      console.error("Error: Git is not installed. Please install git and try again.");
      process.exit(1);
    }

    // Get cache path and ensure directory exists
    repoRef = { host: skillRef.host, owner: skillRef.owner, repo: skillRef.repo };
    const cachePath = getRepoCachePath(repoRef);
    await ensureDir(dirname(cachePath));

    // Clone or pull the repository
    const cloneUrl = buildCloneUrl(repoRef);
    console.log(`Fetching ${repoRef.host}@${repoRef.owner}/${repoRef.repo}...`);

    try {
      await ensureRepo(cloneUrl, cachePath);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }

    sourcePath = cachePath;
  } else {
    console.error("Error: Unknown reference type.");
    process.exit(1);
  }

  // Find the skill in the repository
  const skillPath = await findSkillByName(sourcePath, skillRef.skillName, repoRef);

  if (!skillPath) {
    console.error(`Error: Skill '${skillRef.skillName}' not found.`);
    process.exit(1);
  }

  // Determine target name
  const finalName = targetName || skillRef.skillName;

  // Validate the final name
  try {
    validateSkillName(finalName);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (targetName) {
      // --rename was provided but the value is invalid
      console.error(`Error: ${message}`);
      console.error(`The --rename value '${targetName}' is not a valid skill name.`);
    } else {
      // Source skill name is invalid, suggest --rename
      console.error(`Error: ${message}`);
      console.error(`The source skill name '${skillRef.skillName}' is not valid for local installation.`);
      console.error(`Use --rename to specify a valid local name. Example:`);
      console.error(`  skill-memory remote add ${args[0]} --rename my-skill-name`);
    }
    process.exit(1);
  }

  // Check if skill already exists locally
  const localPath = getLocalSkillPath(finalName);
  if (await dirExists(localPath)) {
    console.error(`Error: Skill '${finalName}' already exists. Use --rename to choose a different name.`);
    process.exit(1);
  }

  // Ensure skills directory exists
  await ensureDir(getSkillsDir());

  // Ensure git repo is ready BEFORE copying skill (for proper migration)
  await ensureGitReady();

  // Copy skill to local skills directory
  try {
    await copyDir(skillPath, localPath);
  } catch (error) {
    console.error(`Error: Failed to copy skill: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  // Update frontmatter name if using --rename
  if (targetName) {
    await updateSkillFrontmatterName(localPath, finalName);
    console.log(`Added skill: @${skillRef.skillName} as @${finalName}`);
  } else {
    console.log(`Added skill: @${skillRef.skillName}`);
  }

  // Build source description for commit message
  let sourceDesc: string;
  if (isGithubSkillRef(skillRef)) {
    sourceDesc = `${skillRef.host}/${skillRef.owner}/${skillRef.repo}`;
  } else if (isLocalSkillRef(skillRef)) {
    sourceDesc = skillRef.path;
  } else {
    sourceDesc = "remote";
  }

  // Commit the added skill
  await commitSkillChange({
    type: "feat",
    scope: finalName,
    description: `add skill from ${sourceDesc}`,
  });
}

function printHelp(): void {
  console.log(`Usage: skill-memory remote add <skill> [options]

Add a skill from a remote repository or local directory to your local skill library.

Arguments:
  <skill>    Skill reference in one of these formats:
             - github.com@owner/repo@skill_name        GitHub skill
             - localhost@/absolute/path@skill_name     Local skill (absolute path)
             - localhost@./relative/path@skill_name    Local skill (relative path)
             - localhost@~/path@skill_name             Local skill (home-relative path)

Options:
  --rename <name>    Use a custom local name for the skill

Examples:
  # Add a skill from GitHub
  skill-memory remote add github.com@anthropics/skills@xlsx
  skill-memory remote add github.com@anthropics/skills@xlsx --rename my-xlsx

  # Add a skill from a local directory
  skill-memory remote add localhost@/home/user/my-skills@xlsx
  skill-memory remote add localhost@./my-skills@xlsx --rename my-xlsx
  skill-memory remote add localhost@~/skills@pdf`);
}
