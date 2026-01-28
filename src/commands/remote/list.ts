/**
 * remote list command - List all skills in a remote repository
 */

import { dirname } from "path";
import { parseRepoReference, buildCloneUrl } from "../../lib/repo-reference.js";
import { getRepoCachePath, ensureDir } from "../../lib/paths.js";
import { isGitInstalled, ensureRepo } from "../../lib/git.js";
import { parseAllSkills } from "../../lib/skill-parser.js";

export async function listCommand(args: string[]): Promise<void> {
  const repoArg = args[0];

  if (!repoArg || repoArg === "--help" || repoArg === "-h") {
    printHelp();
    return;
  }

  // Check if git is installed
  if (!(await isGitInstalled())) {
    console.error("Error: Git is not installed. Please install git and try again.");
    process.exit(1);
  }

  // Parse repo reference
  let repoRef;
  try {
    repoRef = parseRepoReference(repoArg);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
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

  // Find and parse all skills
  const skills = await parseAllSkills(cachePath, repoRef);

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
  console.log(`\nUse \`skill-memory remote add <id>\` to add a skill to skill-memory.`);
}

function printHelp(): void {
  console.log(`Usage: skill-memory remote list <repo>

List all skills available in a remote repository.

Arguments:
  <repo>    Repository reference in format: github.com@owner/repo

Examples:
  skill-memory remote list github.com@anthropics/skills
  skill-memory remote list github.com@memodb-io/skill-memory`);
}
