/**
 * File system utilities
 */

import { access, readdir, copyFile, mkdir, stat, rm, open } from "fs/promises";
import { join } from "path";

/**
 * Common binary file extensions
 */
const BINARY_EXTENSIONS = new Set([
  // Images
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".ico",
  ".webp",
  ".svg",
  ".tiff",
  ".tif",
  // Audio
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".aac",
  ".m4a",
  // Video
  ".mp4",
  ".avi",
  ".mov",
  ".mkv",
  ".webm",
  ".wmv",
  // Archives
  ".zip",
  ".tar",
  ".gz",
  ".bz2",
  ".7z",
  ".rar",
  ".xz",
  // Documents
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  // Executables
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  // Fonts
  ".ttf",
  ".otf",
  ".woff",
  ".woff2",
  ".eot",
  // Other
  ".pyc",
  ".class",
  ".o",
  ".a",
  ".node",
]);

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

/**
 * Recursively delete a directory
 */
export async function rmDir(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
}

/**
 * Check if a file is binary based on extension and content
 * @param filePath - Path to the file to check
 * @returns true if the file is binary, false if it's text
 */
export async function isBinaryFile(filePath: string): Promise<boolean> {
  // First check by extension
  const ext = filePath.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (ext && BINARY_EXTENSIONS.has(ext)) {
    return true;
  }

  // Then check by content - read first 8KB and look for null bytes
  try {
    const fileHandle = await open(filePath, "r");
    try {
      const buffer = Buffer.alloc(8192);
      const { bytesRead } = await fileHandle.read(buffer, 0, 8192, 0);

      // Check for null bytes in the content
      for (let i = 0; i < bytesRead; i++) {
        if (buffer[i] === 0) {
          return true;
        }
      }

      return false;
    } finally {
      await fileHandle.close();
    }
  } catch {
    // If we can't read the file, assume it's text
    return false;
  }
}

/**
 * Count files in a directory recursively
 * @param dirPath - Path to the directory
 * @returns Number of files (not directories) in the directory
 */
export async function countFiles(dirPath: string): Promise<number> {
  let count = 0;
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      // Skip .git directories
      if (entry.name === ".git") {
        continue;
      }
      count += await countFiles(entryPath);
    } else {
      count++;
    }
  }

  return count;
}
