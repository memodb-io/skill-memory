/**
 * File system utilities
 */

import { access, readdir, copyFile, mkdir, stat } from "fs/promises";
import { join } from "path";

/**
 * Check if a directory exists
 */
export async function dirExists(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively copy a directory
 */
export async function copyDir(src: string, dest: string): Promise<void> {
  // Create destination directory
  await mkdir(dest, { recursive: true });

  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      // Skip .git directories
      if (entry.name === ".git") {
        continue;
      }
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}
