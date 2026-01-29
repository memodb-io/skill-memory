/**
 * Copy a skill to a new name
 */

import { getLocalSkillPath } from "../lib/paths.js";
import { dirExists, copyDir } from "../lib/fs-utils.js";
import { parseLocalSkillName } from "../lib/local-skill-ref.js";
import { ensureGitReady, commitSkillChange } from "../lib/skill-git.js";

export async function copyCommand(args: string[]): Promise<void> {
  if (args.length < 2) {
    console.log("Usage: skill-memory copy <source> <target>");
    console.log("Example: skill-memory copy @xlsx my-xlsx");
    process.exit(1);
  }

  const [sourceInput, targetInput] = args;

  // Parse and validate source skill name
  let sourceName: string;
  try {
    sourceName = parseLocalSkillName(sourceInput);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }

  // Parse and validate target skill name
  let targetName: string;
  try {
    targetName = parseLocalSkillName(targetInput);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }

  // Check for same name
  if (sourceName === targetName) {
    console.error("Error: Cannot copy to same name");
    process.exit(1);
  }

  // Get paths
  const sourcePath = getLocalSkillPath(sourceName);
  const targetPath = getLocalSkillPath(targetName);

  // Check if source exists
  if (!(await dirExists(sourcePath))) {
    console.error(`Error: Skill '${sourceName}' not found.`);
    process.exit(1);
  }

  // Check if target already exists
  if (await dirExists(targetPath)) {
    console.error(`Error: Skill '${targetName}' already exists.`);
    process.exit(1);
  }

  // Ensure git repo is ready BEFORE copying skill (for proper migration)
  await ensureGitReady();

  // Copy the skill directory
  await copyDir(sourcePath, targetPath);

  console.log(`Copied skill: @${sourceName} → @${targetName}`);

  // Commit the copy
  await commitSkillChange({
    type: "feat",
    scope: targetName,
    description: `copy skill from ${sourceName}`,
  });
}
