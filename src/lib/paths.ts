/**
 * Path utilities for skill-memory
 */

import { homedir } from "os";
import { join, normalize, resolve } from "path";
import { mkdir, stat, access, constants } from "fs/promises";
import type { GithubRepoReference } from "../types.js";

/**
 * Sanitize a path segment to prevent directory traversal attacks.
 * Removes or replaces dangerous characters and patterns.
 */
function sanitizePathSegment(segment: string): string {
  // Remove null bytes
  let sanitized = segment.replace(/\0/g, "");

  // Replace .. with empty string (prevents directory traversal)
  sanitized = sanitized.replace(/\.\./g, "");

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, "");

  // Replace path separators
  sanitized = sanitized.replace(/[/\\]/g, "-");

  // If empty after sanitization, use a placeholder
  if (!sanitized) {
    throw new Error(`Invalid path segment: "${segment}"`);
  }

  return sanitized;
}

/**
 * Validate that a resolved path is within the expected base directory.
 * Throws an error if path escapes the base directory.
 */
function validatePathWithinBase(targetPath: string, baseDir: string): void {
  const resolvedTarget = resolve(normalize(targetPath));
  const resolvedBase = resolve(normalize(baseDir));

  if (!resolvedTarget.startsWith(resolvedBase)) {
    throw new Error("Path traversal attempt detected");
  }
}

/**
 * Get the skill-memory root directory.
 * Uses SKILL_MEMORY_HOME environment variable if set, otherwise falls back to ~/.skill-memory
 */
export function getSkillMemoryDir(): string {
  const envHome = process.env.SKILL_MEMORY_HOME;
  if (envHome) {
    return resolve(envHome);
  }
  return join(homedir(), ".skill-memory");
}

/**
 * Get the repos cache directory
 */
export function getReposCacheDir(): string {
  return join(getSkillMemoryDir(), "repos");
}

/**
 * Get the local skills directory
 */
export function getSkillsDir(): string {
  return join(getSkillMemoryDir(), "skills");
}

/**
 * Get the cache path for a specific GitHub repo.
 * Sanitizes path segments to prevent directory traversal.
 */
export function getRepoCachePath(ref: GithubRepoReference): string {
  const sanitizedHost = sanitizePathSegment(ref.host);
  const sanitizedOwner = sanitizePathSegment(ref.owner);
  const sanitizedRepo = sanitizePathSegment(ref.repo);

  const cachePath = join(getReposCacheDir(), sanitizedHost, sanitizedOwner, sanitizedRepo);

  // Validate the path doesn't escape the cache directory
  validatePathWithinBase(cachePath, getReposCacheDir());

  return cachePath;
}

/**
 * Get the local path for a skill.
 * Sanitizes the name to prevent directory traversal.
 */
export function getLocalSkillPath(name: string): string {
  const sanitizedName = sanitizePathSegment(name);
  const skillPath = join(getSkillsDir(), sanitizedName);

  // Validate the path doesn't escape the skills directory
  validatePathWithinBase(skillPath, getSkillsDir());

  return skillPath;
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

/**
 * Validate that a local path exists, is a directory, and is readable.
 * Throws descriptive errors if validation fails.
 */
export async function validateLocalPath(localPath: string): Promise<void> {
  try {
    // Check if path is readable
    await access(localPath, constants.R_OK);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      throw new Error(`Path '${localPath}' not found`);
    }
    if (nodeError.code === "EACCES") {
      throw new Error(`Permission denied: cannot read '${localPath}'`);
    }
    throw new Error(`Cannot access path '${localPath}': ${nodeError.message}`);
  }

  // Check if it's a directory
  try {
    const stats = await stat(localPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path '${localPath}' is not a directory`);
    }
  } catch (error) {
    // Re-throw our own errors
    if (error instanceof Error && error.message.includes("is not a directory")) {
      throw error;
    }
    const nodeError = error as NodeJS.ErrnoException;
    throw new Error(`Cannot stat path '${localPath}': ${nodeError.message}`);
  }
}
