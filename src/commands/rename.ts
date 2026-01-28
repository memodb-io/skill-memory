/**
 * Rename a skill
 */

import { rename } from "fs/promises";
import { getLocalSkillPath } from "../lib/paths.js";
import { dirExists } from "../lib/fs-utils.js";
import { parseLocalSkillName } from "../lib/local-skill-ref.js";

export async function renameCommand(args: string[]): Promise<void> {
  if (args.length < 2) {
    console.log("Usage: skill-memory rename <source> <target>");
    console.log("Example: skill-memory rename @xlsx my-xlsx");
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
    console.error("Error: Cannot rename to same name");
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

  // Rename the skill directory
  await rename(sourcePath, targetPath);

  console.log(`Renamed skill: @${sourceName} → @${targetName}`);
}
