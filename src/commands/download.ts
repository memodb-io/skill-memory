/**
 * Download a file or folder from a local skill
 */

import { copyFile, stat, mkdir } from "fs/promises";
import { join, basename, dirname, resolve } from "path";
import { getLocalSkillPath } from "../lib/paths.js";
import { dirExists, fileExists, copyDir, countFiles } from "../lib/fs-utils.js";
import { parseSkillPathRef } from "../lib/skill-path-ref.js";

export async function downloadCommand(args: string[]): Promise<void> {
  if (args.length < 2) {
    console.log("Usage: skill-memory download <@skill/path> <destination>");
    console.log("Example: skill-memory download @xlsx/recalc.py ./");
    process.exit(1);
  }

  const [input, destInput] = args;

  // Parse the skill path reference (allow empty path for downloading entire skill)
  let skillName: string;
  let sourcePath: string;
  try {
    const ref = parseSkillPathRef(input, true); // allowEmptyPath = true
    skillName = ref.skillName;
    sourcePath = ref.filePath;
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

  // Build the full source path (if sourcePath is empty, use the skill directory itself)
  const fullSourcePath = sourcePath ? join(skillPath, sourcePath) : skillPath;
  const isEntireSkill = !sourcePath;

  // Check if source exists (skip for entire skill since we already checked skillPath)
  if (!isEntireSkill) {
    const sourceExists = (await fileExists(fullSourcePath)) || (await dirExists(fullSourcePath));
    if (!sourceExists) {
      console.error(`Error: '${sourcePath}' not found in skill '${skillName}'.`);
      process.exit(1);
    }
  }

  // Determine if source is a file or directory
  let isSourceDir = false;
  try {
    const stats = await stat(fullSourcePath);
    isSourceDir = stats.isDirectory();
  } catch {
    console.error(`Error: Cannot access '${sourcePath}' in skill '${skillName}'.`);
    process.exit(1);
  }

  // Resolve destination path
  const destination = resolve(destInput);
  // Use skill name as basename when downloading entire skill, otherwise use the source path's basename
  const sourceBasename = isEntireSkill ? skillName : basename(sourcePath);

  let targetPath: string;

  if (isSourceDir) {
    // Directory source
    targetPath = await resolveDirectoryDestination(
      destination,
      sourceBasename,
      sourcePath
    );
  } else {
    // File source
    targetPath = await resolveFileDestination(
      destination,
      sourceBasename,
      sourcePath
    );
  }

  // Ensure parent directory exists
  const parentDir = dirname(targetPath);
  await mkdir(parentDir, { recursive: true });

  // Copy the file or directory
  if (isSourceDir) {
    await copyDir(fullSourcePath, targetPath);
    const fileCount = await countFiles(targetPath);
    const sourceDisplay = isEntireSkill ? `@${skillName}/` : `@${skillName}/${sourcePath}/`;
    console.log(`Downloaded: ${sourceDisplay} → ${basename(targetPath)}/ (${fileCount} files)`);
  } else {
    await copyFile(fullSourcePath, targetPath);
    console.log(`Downloaded: @${skillName}/${sourcePath} → ${targetPath}`);
  }
}

/**
 * Resolve destination path for a file source
 */
async function resolveFileDestination(
  dest: string,
  sourceBasename: string,
  sourcePath: string
): Promise<string> {
  // Check if destination exists
  const destExists = (await fileExists(dest)) || (await dirExists(dest));

  if (destExists) {
    // Check if it's a directory
    try {
      const stats = await stat(dest);
      if (stats.isDirectory()) {
        // Destination is an existing directory - put file inside
        return join(dest, sourceBasename);
      } else {
        // Destination is an existing file - error
        console.error(`Error: File '${dest}' already exists.`);
        process.exit(1);
      }
    } catch {
      console.error(`Error: Cannot access destination '${dest}'.`);
      process.exit(1);
    }
  }

  // Destination doesn't exist
  if (dest.endsWith("/") || dest.endsWith("\\")) {
    // Treat as directory - create it and put file inside
    return join(dest, sourceBasename);
  }

  // Treat as file path (rename)
  return dest;
}

/**
 * Resolve destination path for a directory source
 */
async function resolveDirectoryDestination(
  dest: string,
  sourceBasename: string,
  sourcePath: string
): Promise<string> {
  // Check if destination exists
  const destExists = (await fileExists(dest)) || (await dirExists(dest));

  if (destExists) {
    // Check if it's a directory
    try {
      const stats = await stat(dest);
      if (stats.isDirectory()) {
        // Destination is an existing directory - nest source inside
        return join(dest, sourceBasename);
      } else {
        // Destination is an existing file - error
        console.error(`Error: Cannot overwrite file '${dest}' with directory.`);
        process.exit(1);
      }
    } catch {
      console.error(`Error: Cannot access destination '${dest}'.`);
      process.exit(1);
    }
  }

  // Destination doesn't exist - create it and copy contents into it
  return dest;
}
