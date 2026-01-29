/**
 * Git utilities for cloning, pulling, and local repository management
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { access, readdir } from "fs/promises";
import { join } from "path";

const execFileAsync = promisify(execFile);

// Timeout for git operations (15 seconds)
const GIT_TIMEOUT_MS = 15000;
// Shorter timeout for local git operations (5 seconds)
const LOCAL_GIT_TIMEOUT_MS = 5000;

/**
 * Conventional commit types
 */
export type ConventionalCommitType = "feat" | "fix" | "refactor" | "chore";

/**
 * Options for building a conventional commit message
 */
export interface CommitOptions {
  type: ConventionalCommitType;
  scope: string; // Skill name
  description: string; // Brief description of change
  body?: string; // Optional extended message (from -m flag)
}

/**
 * Check if git is installed
 */
export async function isGitInstalled(): Promise<boolean> {
  try {
    await execFileAsync("git", ["--version"], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is a git repository
 */
export async function isGitRepo(path: string): Promise<boolean> {
  try {
    await access(join(path, ".git"));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clone a repository to a path (shallow clone)
 * @param timeoutMs - Optional timeout in milliseconds (default: 15000)
 */
export async function cloneRepo(url: string, destPath: string, timeoutMs = GIT_TIMEOUT_MS): Promise<void> {
  try {
    await execFileAsync("git", ["clone", "--depth", "1", "--quiet", url, destPath], {
      timeout: timeoutMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("ETIMEDOUT") || message.includes("timed out")) {
      throw new Error(`Connection timed out: ${url}`);
    }
    if (message.includes("Repository not found") || message.includes("not found")) {
      throw new Error(`Repository not found: ${url}`);
    }
    if (message.includes("Could not resolve host") || message.includes("unable to access")) {
      throw new Error(`Network error: Unable to connect to ${url}`);
    }

    throw new Error(`Failed to clone repository: ${message}`);
  }
}

/**
 * Pull latest changes for a shallow repository
 */
export async function pullRepo(repoPath: string): Promise<void> {
  try {
    // For shallow clones, use fetch --depth 1 to get latest shallow snapshot
    await execFileAsync("git", ["-C", repoPath, "fetch", "--depth", "1", "--quiet", "origin"], {
      timeout: GIT_TIMEOUT_MS,
    });
    // Get the default branch name
    const { stdout } = await execFileAsync("git", ["-C", repoPath, "rev-parse", "--abbrev-ref", "origin/HEAD"], {
      timeout: 5000,
    });
    const branch = stdout.trim().replace("origin/", "");
    await execFileAsync("git", ["-C", repoPath, "reset", "--quiet", "--hard", `origin/${branch}`], {
      timeout: 5000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Non-fatal errors during pull - just warn
    if (message.includes("Could not resolve host") || message.includes("unable to access") || message.includes("timed out")) {
      console.warn("Warning: Could not pull latest changes (network error). Using cached version.");
      return;
    }

    // For other errors, just warn and use cached version
    console.warn("Warning: Could not update repository. Using cached version.");
  }
}

/**
 * Ensure a repo is available locally (clone or pull)
 */
export async function ensureRepo(url: string, cachePath: string): Promise<void> {
  if (await isGitRepo(cachePath)) {
    // Repo exists, pull latest changes
    await pullRepo(cachePath);
  } else {
    // Repo doesn't exist, clone it
    await cloneRepo(url, cachePath);
  }
}

// ============================================================================
// Local Git Operations (for skill-memory skills directory)
// ============================================================================

/**
 * Initialize a git repository in a directory
 */
export async function gitInit(dir: string): Promise<void> {
  await execFileAsync("git", ["init", "--quiet"], {
    cwd: dir,
    timeout: LOCAL_GIT_TIMEOUT_MS,
  });
}

/**
 * Stage files for commit
 * @param dir - Repository directory
 * @param paths - Array of file paths to stage, or empty to stage all (-A)
 */
export async function gitAdd(dir: string, paths: string[] = []): Promise<void> {
  const args = paths.length > 0 ? ["add", ...paths] : ["add", "-A"];
  await execFileAsync("git", args, {
    cwd: dir,
    timeout: LOCAL_GIT_TIMEOUT_MS,
  });
}

/**
 * Commit staged changes
 * @param dir - Repository directory
 * @param message - Commit message
 * @returns true if commit was created, false if nothing to commit
 */
export async function gitCommit(dir: string, message: string): Promise<boolean> {
  try {
    await execFileAsync("git", ["commit", "-m", message], {
      cwd: dir,
      timeout: LOCAL_GIT_TIMEOUT_MS,
    });
    return true;
  } catch (error) {
    // Check both the error message and stderr for "nothing to commit"
    const errorObj = error as { message?: string; stdout?: string; stderr?: string };
    const errorMessage = errorObj.message || "";
    const stdout = errorObj.stdout || "";
    const stderr = errorObj.stderr || "";
    const fullOutput = `${errorMessage} ${stdout} ${stderr}`;

    // "nothing to commit" is not an error - just means no changes
    if (
      fullOutput.includes("nothing to commit") ||
      fullOutput.includes("nothing added to commit") ||
      fullOutput.includes("no changes added to commit")
    ) {
      return false;
    }
    throw error;
  }
}

/**
 * Build a conventional commit message
 */
export function buildConventionalCommit(options: CommitOptions): string {
  const header = `${options.type}(${options.scope}): ${options.description}`;
  if (options.body) {
    return `${header}\n\n${options.body}`;
  }
  return header;
}

/**
 * List existing skill directories (for migration message)
 * @param skillsDir - Path to skills directory
 * @returns Array of skill names (directory names)
 */
export async function listExistingSkills(skillsDir: string): Promise<string[]> {
  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

/**
 * Result of ensuring a git repo exists in skills directory
 */
export interface EnsureGitRepoResult {
  initialized: boolean; // true if git init was run
  migratedSkills?: string[]; // names of existing skills that were committed
}

/**
 * Ensure a git repository exists in the skills directory.
 * If the directory exists but has no .git, initialize git and commit existing skills.
 * @param skillsDir - Path to skills directory
 * @returns Result indicating if init was run and what skills were migrated
 */
export async function ensureSkillsGitRepo(skillsDir: string): Promise<EnsureGitRepoResult> {
  // Check if git repo already exists
  if (await isGitRepo(skillsDir)) {
    return { initialized: false };
  }

  // Get existing skills before init (for migration)
  const existingSkills = await listExistingSkills(skillsDir);

  // Initialize git repository
  await gitInit(skillsDir);

  // If there are existing skills, create a migration commit
  if (existingSkills.length > 0) {
    await gitAdd(skillsDir);
    await gitCommit(skillsDir, "chore: initialize skill-memory git tracking");
    return { initialized: true, migratedSkills: existingSkills };
  }

  return { initialized: true };
}
