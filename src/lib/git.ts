/**
 * Git utilities for cloning and pulling repositories
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { access } from "fs/promises";
import { join } from "path";

const execFileAsync = promisify(execFile);

// Timeout for git operations (15 seconds)
const GIT_TIMEOUT_MS = 15000;

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
