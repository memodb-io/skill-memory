/**
 * Git commit orchestration for skill operations
 * Provides graceful error handling - git failures warn but don't fail commands
 */

import { getSkillsDir } from "./paths.js";
import {
  isGitInstalled,
  ensureSkillsGitRepo,
  gitAdd,
  gitCommit,
  buildConventionalCommit,
  type CommitOptions,
  type EnsureGitRepoResult,
} from "./git.js";
import { dirExists } from "./fs-utils.js";

/**
 * Ensure git repository is ready before making changes.
 * Call this BEFORE making changes to skills directory.
 * This allows migration to capture only pre-existing skills.
 *
 * @returns Result with migration info, or null if git not available
 */
export async function ensureGitReady(): Promise<EnsureGitRepoResult | null> {
  try {
    // Check if git is installed
    if (!(await isGitInstalled())) {
      return null;
    }

    const skillsDir = getSkillsDir();

    // Ensure skills directory exists
    if (!(await dirExists(skillsDir))) {
      return null;
    }

    // Ensure git repo exists (will init and migrate if needed)
    const repoResult = await ensureSkillsGitRepo(skillsDir);

    // Print migration message if we just initialized with existing skills
    if (repoResult.initialized && repoResult.migratedSkills && repoResult.migratedSkills.length > 0) {
      const skillList = repoResult.migratedSkills.join(", ");
      console.log(`[git] Initialized repository with existing skills (${skillList})`);
    }

    return repoResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`[git] Warning: Could not initialize repository: ${errorMessage}`);
    return null;
  }
}

/**
 * Commit a skill change with conventional commit format.
 * Handles all git operations gracefully - warns but doesn't fail the command.
 *
 * Flow:
 * 1. Check if git is installed
 * 2. Ensure git repo exists in skills directory (init + migrate if needed)
 * 3. Stage changes
 * 4. Commit with conventional commit message
 * 5. Print result
 *
 * @param options - Commit options (type, scope, description, body)
 */
export async function commitSkillChange(options: CommitOptions): Promise<void> {
  try {
    // Check if git is installed
    if (!(await isGitInstalled())) {
      // Silently skip if git not installed - not an error
      return;
    }

    const skillsDir = getSkillsDir();

    // Ensure skills directory exists
    if (!(await dirExists(skillsDir))) {
      // Skills directory doesn't exist yet - nothing to commit
      return;
    }

    // Ensure git repo exists (will init and migrate if needed)
    // Note: If ensureGitReady was called before changes, this will be a no-op
    const repoResult = await ensureSkillsGitRepo(skillsDir);

    // Print migration message if we just initialized with existing skills
    if (repoResult.initialized && repoResult.migratedSkills && repoResult.migratedSkills.length > 0) {
      const skillList = repoResult.migratedSkills.join(", ");
      console.log(`[git] Initialized repository with existing skills (${skillList})`);
    }

    // Stage all changes
    await gitAdd(skillsDir);

    // Build commit message
    const message = buildConventionalCommit(options);

    // Commit changes
    await gitCommit(skillsDir, message);
  } catch (error) {
    // Git operations should never fail the main command
    // Just warn the user
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`[git] Warning: Could not commit changes: ${errorMessage}`);
  }
}
