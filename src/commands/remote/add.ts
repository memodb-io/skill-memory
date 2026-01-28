/**
 * remote add command - Add a skill from a remote repository
 */

import { dirname } from "path";
import { parseSkillReference, buildCloneUrl } from "../../lib/repo-reference.js";
import { getRepoCachePath, getLocalSkillPath, ensureDir, getSkillsDir } from "../../lib/paths.js";
import { isGitInstalled, ensureRepo } from "../../lib/git.js";
import { findSkillByName } from "../../lib/skill-finder.js";
import { dirExists, copyDir } from "../../lib/fs-utils.js";
import type { SkillReference } from "../../types.js";

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

  // Check if git is installed
  if (!(await isGitInstalled())) {
    console.error("Error: Git is not installed. Please install git and try again.");
    process.exit(1);
  }

  // Parse skill reference
  let skillRef: SkillReference;
  try {
    skillRef = parseSkillReference(skillArg);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  // Get cache path and ensure directory exists
  const repoRef = { host: skillRef.host, owner: skillRef.owner, repo: skillRef.repo };
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

  // Find the skill in the repository
  const skillPath = await findSkillByName(cachePath, skillRef.skillName, repoRef);

  if (!skillPath) {
    console.error(`Error: Skill '${skillRef.skillName}' not found in repository.`);
    process.exit(1);
  }

  // Determine target name
  const finalName = targetName || skillRef.skillName;

  // Check if skill already exists locally
  const localPath = getLocalSkillPath(finalName);
  if (await dirExists(localPath)) {
    console.error(`Error: Skill '${finalName}' already exists at ${localPath}`);
    console.error("Use --rename to choose a different name.");
    process.exit(1);
  }

  // Ensure skills directory exists
  await ensureDir(getSkillsDir());

  // Copy skill to local skills directory
  try {
    await copyDir(skillPath, localPath);
  } catch (error) {
    console.error(`Error: Failed to copy skill: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  console.log(`Added skill: ${skillRef.skillName} → ${localPath}`);
}

function printHelp(): void {
  console.log(`Usage: skill-memory remote add <skill> [options]

Add a skill from a remote repository to your local skill library.

Arguments:
  <skill>    Skill reference in format: github.com@owner/repo@skill_name

Options:
  --rename <name>    Use a custom local name for the skill

Examples:
  skill-memory remote add github.com@anthropics/skills@xlsx
  skill-memory remote add github.com@anthropics/skills@xlsx --rename my-xlsx`);
}
