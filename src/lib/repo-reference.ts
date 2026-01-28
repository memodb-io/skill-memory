/**
 * Parse repository and skill references
 */

import { homedir } from "os";
import { resolve } from "path";
import type {
  RepoReference,
  SkillReference,
  GithubRepoReference,
  LocalRepoReference,
  GithubSkillReference,
  LocalSkillReference,
} from "../types.js";

/**
 * Type guard to check if a reference is a GitHub reference
 */
export function isGithubRef(ref: RepoReference): ref is GithubRepoReference {
  return ref.host === "github.com";
}

/**
 * Type guard to check if a reference is a local reference
 */
export function isLocalRef(ref: RepoReference): ref is LocalRepoReference {
  return ref.host === "localhost";
}

/**
 * Type guard to check if a skill reference is a GitHub reference
 */
export function isGithubSkillRef(ref: SkillReference): ref is GithubSkillReference {
  return ref.host === "github.com";
}

/**
 * Type guard to check if a skill reference is a local reference
 */
export function isLocalSkillRef(ref: SkillReference): ref is LocalSkillReference {
  return ref.host === "localhost";
}

/**
 * Resolve a path string to an absolute path
 * - Expands ~ to home directory
 * - Resolves relative paths from cwd
 */
function resolvePath(pathStr: string): string {
  // Handle tilde expansion
  if (pathStr.startsWith("~/")) {
    return resolve(homedir(), pathStr.slice(2));
  }
  if (pathStr === "~") {
    return homedir();
  }

  // Resolve relative paths from current working directory
  return resolve(process.cwd(), pathStr);
}

/**
 * Parse a localhost repo reference
 */
function parseLocalRepoReference(pathStr: string): LocalRepoReference {
  if (!pathStr) {
    throw new Error(
      `Invalid localhost reference. Path cannot be empty. Expected format: localhost@/path/to/dir`
    );
  }

  const resolvedPath = resolvePath(pathStr);

  return { host: "localhost", path: resolvedPath };
}

/**
 * Parse a GitHub repo reference
 */
function parseGithubRepoReference(ownerRepo: string, originalRef: string): GithubRepoReference {
  const slashIndex = ownerRepo.indexOf("/");
  if (slashIndex === -1) {
    throw new Error(
      `Invalid repo reference: "${originalRef}". Expected format: github.com@owner/repo`
    );
  }

  const owner = ownerRepo.substring(0, slashIndex);
  const repo = ownerRepo.substring(slashIndex + 1);

  // Check for extra slashes (invalid)
  if (repo.includes("/")) {
    throw new Error(
      `Invalid repo reference: "${originalRef}". Expected format: github.com@owner/repo`
    );
  }

  if (!owner || !repo) {
    throw new Error(
      `Invalid repo reference: "${originalRef}". Owner and repo cannot be empty.`
    );
  }

  return { host: "github.com", owner, repo };
}

/**
 * Parse a repo reference in format: github.com@owner/repo or localhost@/path
 */
export function parseRepoReference(ref: string): RepoReference {
  const atIndex = ref.indexOf("@");

  if (atIndex === -1) {
    throw new Error(
      `Invalid repo reference: "${ref}". Expected format: github.com@owner/repo or localhost@/path`
    );
  }

  const host = ref.substring(0, atIndex);
  const rest = ref.substring(atIndex + 1);

  if (host === "localhost") {
    return parseLocalRepoReference(rest);
  }

  if (host === "github.com") {
    return parseGithubRepoReference(rest, ref);
  }

  throw new Error(
    `Invalid host: "${host}". Supported hosts: github.com, localhost`
  );
}

/**
 * Parse a skill reference in format:
 * - github.com@owner/repo@skill_name
 * - localhost@/path@skill_name
 */
export function parseSkillReference(ref: string): SkillReference {
  // Find the last @ which separates skill name
  const lastAtIndex = ref.lastIndexOf("@");

  if (lastAtIndex === -1) {
    throw new Error(
      `Invalid skill reference: "${ref}". Expected format: github.com@owner/repo@skill_name or localhost@/path@skill_name`
    );
  }

  const skillName = ref.substring(lastAtIndex + 1);
  const repoRefStr = ref.substring(0, lastAtIndex);

  if (!skillName) {
    throw new Error(
      `Invalid skill reference: "${ref}". Skill name cannot be empty.`
    );
  }

  // Parse the repo reference part
  let repoRef: RepoReference;
  try {
    repoRef = parseRepoReference(repoRefStr);
  } catch (_) {
    throw new Error(
      `Invalid skill reference: "${ref}". Expected format: github.com@owner/repo@skill_name or localhost@/path@skill_name`
    );
  }

  if (isLocalRef(repoRef)) {
    return { ...repoRef, skillName };
  }

  return { ...repoRef, skillName };
}

/**
 * Build a git clone URL from a GitHub repo reference.
 * Throws an error if called with a localhost reference.
 */
export function buildCloneUrl(ref: GithubRepoReference): string {
  return `https://github.com/${ref.owner}/${ref.repo}.git`;
}

/**
 * Build a full skill reference string
 * - For GitHub: github.com@owner/repo@skill_name
 * - For localhost: localhost@/path@skill_name
 */
export function buildFullRef(ref: RepoReference, skillName: string): string {
  if (isLocalRef(ref)) {
    return `${ref.host}@${ref.path}@${skillName}`;
  }
  return `${ref.host}@${ref.owner}/${ref.repo}@${skillName}`;
}
