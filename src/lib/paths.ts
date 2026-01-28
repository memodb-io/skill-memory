/**
 * Path utilities for skill-memory
 */

import { homedir } from "os";
import { join, normalize, resolve } from "path";
import { mkdir } from "fs/promises";
import type { RepoReference } from "../types.js";

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
 * Get the skill-memory root directory
 */
export function getSkillMemoryDir(): string {
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
 * Get the cache path for a specific repo.
 * Sanitizes path segments to prevent directory traversal.
 */
export function getRepoCachePath(ref: RepoReference): string {
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
