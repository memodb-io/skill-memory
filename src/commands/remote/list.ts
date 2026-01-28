/**
 * remote list command - List all skills in a remote repository or local directory
 */

import { dirname } from "path";
import { parseRepoReference, buildCloneUrl, isLocalRef } from "../../lib/repo-reference.js";
import { getRepoCachePath, ensureDir, validateLocalPath } from "../../lib/paths.js";
import { isGitInstalled, ensureRepo } from "../../lib/git.js";
import { parseAllSkills } from "../../lib/skill-parser.js";

export async function listCommand(args: string[]): Promise<void> {
  const repoArg = args[0];

  if (!repoArg || repoArg === "--help" || repoArg === "-h") {
    printHelp();
    return;
  }

  // Parse repo reference
  let repoRef;
  try {
    repoRef = parseRepoReference(repoArg);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  let sourcePath: string;

  if (isLocalRef(repoRef)) {
    // Local path - validate it exists and is a directory
    try {
      await validateLocalPath(repoRef.path);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
    sourcePath = repoRef.path;
    console.log(`Scanning ${repoRef.host}@${repoRef.path}...`);
  } else {
    // GitHub - check git is installed and clone/pull
    if (!(await isGitInstalled())) {
      console.error("Error: Git is not installed. Please install git and try again.");
      process.exit(1);
    }

    // Get cache path and ensure directory exists
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
  }

  // Find and parse all skills
  const skills = await parseAllSkills(sourcePath, repoRef);

  if (skills.length === 0) {
    console.log("\nNo skills found in this repository.");
    return;
  }

  // Output as pretty-printed JSON
  const output = skills.map((skill) => ({
    id: skill.fullRef,
    description: skill.description,
  }));

  console.log(JSON.stringify(output, null, 2));
  console.log(`\n${skills.length} skill${skills.length === 1 ? "" : "s"} found`);
}

function printHelp(): void {
  console.log(`Usage: skill-memory remote list <repo>

List all skills available in a remote repository or local directory.

Arguments:
  <repo>    Repository reference in one of these formats:
            - github.com@owner/repo      GitHub repository
            - localhost@/absolute/path   Local directory (absolute path)
            - localhost@./relative/path  Local directory (relative path)
            - localhost@~/path           Local directory (home-relative path)

Examples:
  # List skills from a GitHub repository
  skill-memory remote list github.com@anthropics/skills
  skill-memory remote list github.com@memodb-io/skill-memory

  # List skills from a local directory
  skill-memory remote list localhost@/home/user/my-skills
  skill-memory remote list localhost@./my-skills
  skill-memory remote list localhost@~/skills`);
}
