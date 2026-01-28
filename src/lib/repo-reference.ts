/**
 * Parse repository and skill references
 */

import type { RepoReference, SkillReference } from "../types.js";

/**
 * Parse a repo reference in format: github.com@owner/repo
 */
export function parseRepoReference(ref: string): RepoReference {
  // Expected format: github.com@owner/repo
  const atIndex = ref.indexOf("@");

  if (atIndex === -1) {
    throw new Error(
      `Invalid repo reference: "${ref}". Expected format: github.com@owner/repo`
    );
  }

  const host = ref.substring(0, atIndex);
  const ownerRepo = ref.substring(atIndex + 1);

  if (host !== "github.com") {
    throw new Error(
      `Invalid host: "${host}". Only github.com is supported.`
    );
  }

  const slashIndex = ownerRepo.indexOf("/");
  if (slashIndex === -1) {
    throw new Error(
      `Invalid repo reference: "${ref}". Expected format: github.com@owner/repo`
    );
  }

  const owner = ownerRepo.substring(0, slashIndex);
  const repo = ownerRepo.substring(slashIndex + 1);

  // Check for extra slashes (invalid)
  if (repo.includes("/")) {
    throw new Error(
      `Invalid repo reference: "${ref}". Expected format: github.com@owner/repo`
    );
  }

  if (!owner || !repo) {
    throw new Error(
      `Invalid repo reference: "${ref}". Owner and repo cannot be empty.`
    );
  }

  return { host: "github.com", owner, repo };
}

/**
 * Parse a skill reference in format: github.com@owner/repo@skill_name
 */
export function parseSkillReference(ref: string): SkillReference {
  // Expected format: github.com@owner/repo@skill_name
  const atIndices: number[] = [];
  for (let i = 0; i < ref.length; i++) {
    if (ref[i] === "@") {
      atIndices.push(i);
    }
  }

  if (atIndices.length !== 2) {
    throw new Error(
      `Invalid skill reference: "${ref}". Expected format: github.com@owner/repo@skill_name`
    );
  }

  const host = ref.substring(0, atIndices[0]);
  const ownerRepo = ref.substring(atIndices[0] + 1, atIndices[1]);
  const skillName = ref.substring(atIndices[1] + 1);

  if (host !== "github.com") {
    throw new Error(
      `Invalid host: "${host}". Only github.com is supported.`
    );
  }

  const slashIndex = ownerRepo.indexOf("/");
  if (slashIndex === -1) {
    throw new Error(
      `Invalid skill reference: "${ref}". Expected format: github.com@owner/repo@skill_name`
    );
  }

  const owner = ownerRepo.substring(0, slashIndex);
  const repo = ownerRepo.substring(slashIndex + 1);

  if (!owner || !repo || !skillName) {
    throw new Error(
      `Invalid skill reference: "${ref}". Owner, repo, and skill name cannot be empty.`
    );
  }

  return { host: "github.com", owner, repo, skillName };
}

/**
 * Build a git clone URL from a repo reference
 */
export function buildCloneUrl(ref: RepoReference): string {
  return `https://github.com/${ref.owner}/${ref.repo}.git`;
}

/**
 * Build a full skill reference string
 */
export function buildFullRef(ref: RepoReference, skillName: string): string {
  return `${ref.host}@${ref.owner}/${ref.repo}@${skillName}`;
}
