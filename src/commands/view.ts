/**
 * View a file from a local skill
 */

import { readFile, stat } from "fs/promises";
import { join } from "path";
import { getLocalSkillPath } from "../lib/paths.js";
import { dirExists, fileExists, isBinaryFile } from "../lib/fs-utils.js";
import { parseSkillPathRef } from "../lib/skill-path-ref.js";

const MAX_LINES = 400;

export async function viewCommand(args: string[]): Promise<void> {
  if (args.length < 1) {
    console.log("Usage: skill-memory view <@skill/path>");
    console.log("Example: skill-memory view @xlsx/SKILL.md");
    process.exit(1);
  }

  const [input] = args;

  // Parse the skill path reference
  let skillName: string;
  let filePath: string;
  try {
    const ref = parseSkillPathRef(input);
    skillName = ref.skillName;
    filePath = ref.filePath;
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }

  // Get the skill directory path
  const skillPath = getLocalSkillPath(skillName);

  // Check if skill exists
  if (!(await dirExists(skillPath))) {
    console.error(`Error: Skill '${skillName}' not found.`);
    process.exit(1);
  }

  // Build the full file path
  const fullPath = join(skillPath, filePath);

  // Check if file exists
  if (!(await fileExists(fullPath))) {
    console.error(`Error: File '${filePath}' not found in skill '${skillName}'.`);
    process.exit(1);
  }

  // Check if it's a directory
  try {
    const stats = await stat(fullPath);
    if (stats.isDirectory()) {
      console.error(`Error: '${filePath}' is a directory, not a file.`);
      console.log(`Hint: Use 'skill-memory list @${skillName}' to see files.`);
      process.exit(1);
    }
  } catch {
    // stat failed, file might not exist
    console.error(`Error: Cannot access '${filePath}' in skill '${skillName}'.`);
    process.exit(1);
  }

  // Check if file is binary
  if (await isBinaryFile(fullPath)) {
    const fileName = filePath.split("/").pop() || filePath;
    console.error(`Error: Cannot view binary file '${fileName}'.`);
    console.log(`Hint: Use 'skill-memory download @${skillName}/${filePath} ./' to download it.`);
    process.exit(1);
  }

  // Read and output the file contents
  try {
    const content = await readFile(fullPath, "utf-8");
    const lines = content.split("\n");

    if (lines.length > MAX_LINES) {
      // Truncate to MAX_LINES and add [truncated] indicator
      const truncatedContent = lines.slice(0, MAX_LINES).join("\n");
      console.log(truncatedContent);
      console.log("[truncated]");
    } else {
      // Output full content
      console.log(content);
    }
  } catch (error) {
    console.error(`Error: Cannot read file '${filePath}': ${(error as Error).message}`);
    process.exit(1);
  }
}
