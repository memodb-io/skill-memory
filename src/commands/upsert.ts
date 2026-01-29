/**
 * Upsert a file from local disk to a skill in the local library
 */

import { copyFile, stat, mkdir } from "fs/promises";
import { dirname, resolve } from "path";
import { join } from "path";
import { getLocalSkillPath } from "../lib/paths.js";
import { dirExists, fileExists } from "../lib/fs-utils.js";
import { parseSkillPathRef } from "../lib/skill-path-ref.js";
import { ensureGitReady, commitSkillChange } from "../lib/skill-git.js";

interface UpsertArgs {
  source: string;
  dest: string;
  message?: string;
}

/**
 * Parse command arguments including -m flag
 */
function parseArgs(args: string[]): UpsertArgs {
  let message: string | undefined;
  const positionalArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-m" && i + 1 < args.length) {
      message = args[i + 1];
      i++; // Skip next arg (the message value)
    } else {
      positionalArgs.push(args[i]);
    }
  }

  return {
    source: positionalArgs[0] || "",
    dest: positionalArgs[1] || "",
    message,
  };
}

export async function upsertCommand(args: string[]): Promise<void> {
  const { source, dest, message } = parseArgs(args);

  // Validate required arguments
  if (!source || !dest) {
    console.log("Usage: skill-memory upsert <source> <@skill/path> [-m <message>]");
    console.log("Example: skill-memory upsert ./recalc.py @xlsx/recalc.py -m 'add feature'");
    process.exit(1);
  }

  // Resolve and validate source file
  const sourcePath = resolve(source);
  try {
    const stats = await stat(sourcePath);
    if (!stats.isFile()) {
      console.error("Error: Source must be a file, not a directory.");
      process.exit(1);
    }
  } catch {
    console.error(`Error: Source file '${source}' not found.`);
    process.exit(1);
  }

  // Parse destination skill path reference (file path required)
  let skillName: string;
  let filePath: string;
  try {
    const ref = parseSkillPathRef(dest, false); // allowEmptyPath = false
    skillName = ref.skillName;
    filePath = ref.filePath;
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }

  // Verify skill exists
  const skillPath = getLocalSkillPath(skillName);
  if (!(await dirExists(skillPath))) {
    console.error(`Error: Skill '${skillName}' not found.`);
    process.exit(1);
  }

  // Prepare git before making changes
  await ensureGitReady();

  // Build target path and check if it's an update
  const targetPath = join(skillPath, filePath);
  const isUpdate = await fileExists(targetPath);

  // Ensure parent directories exist
  await mkdir(dirname(targetPath), { recursive: true });

  // Copy file to skill
  await copyFile(sourcePath, targetPath);

  // Print success message
  console.log(`Upserted: ${source} → @${skillName}/${filePath}`);

  // Commit the change
  await commitSkillChange({
    type: isUpdate ? "fix" : "feat",
    scope: skillName,
    description: isUpdate ? `update ${filePath}` : `add ${filePath}`,
    body: message,
  });
}
