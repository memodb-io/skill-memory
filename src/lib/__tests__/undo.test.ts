/**
 * Tests for undo command
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { mkdir, rm, writeFile, readdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { isGitRepo, getCommitCount, getLastCommitMessage, gitResetHard } from "../git.js";

const execFileAsync = promisify(execFile);

// Create unique test directory for each test run
const TEST_DIR = join(tmpdir(), "undo-tests", Date.now().toString());

// Helper to get git log (all commits)
async function getGitLog(dir: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("git", ["log", "--oneline"], { cwd: dir });
    return stdout.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

// Helper to configure git user in a directory
async function configureGitUser(dir: string): Promise<void> {
  await execFileAsync("git", ["config", "user.email", "test@test.com"], { cwd: dir });
  await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: dir });
}

// Helper to initialize a git repo with commits
async function initGitRepoWithCommits(dir: string, commitCount: number): Promise<void> {
  await execFileAsync("git", ["init"], { cwd: dir });
  await configureGitUser(dir);

  for (let i = 1; i <= commitCount; i++) {
    await writeFile(join(dir, `file${i}.txt`), `content ${i}`);
    await execFileAsync("git", ["add", "-A"], { cwd: dir });
    await execFileAsync("git", ["commit", "-m", `commit ${i}`], { cwd: dir });
  }
}

describe("Git Undo Helper Functions", () => {
  let testDir: string;

  beforeAll(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    const testId = Date.now().toString() + Math.random().toString(36).slice(2, 8);
    testDir = join(TEST_DIR, testId);
    await mkdir(testDir, { recursive: true });
  });

  describe("getCommitCount", () => {
    it("should return 0 for empty repo (no commits)", async () => {
      await execFileAsync("git", ["init"], { cwd: testDir });

      const count = await getCommitCount(testDir);
      expect(count).toBe(0);
    });

    it("should return correct count for repo with commits", async () => {
      await initGitRepoWithCommits(testDir, 3);

      const count = await getCommitCount(testDir);
      expect(count).toBe(3);
    });

    it("should return 0 for non-git directory", async () => {
      const count = await getCommitCount(testDir);
      expect(count).toBe(0);
    });
  });

  describe("getLastCommitMessage", () => {
    it("should return null for empty repo", async () => {
      await execFileAsync("git", ["init"], { cwd: testDir });

      const message = await getLastCommitMessage(testDir);
      expect(message).toBeNull();
    });

    it("should return the last commit message", async () => {
      await initGitRepoWithCommits(testDir, 3);

      const message = await getLastCommitMessage(testDir);
      expect(message).toBe("commit 3");
    });

    it("should return null for non-git directory", async () => {
      const message = await getLastCommitMessage(testDir);
      expect(message).toBeNull();
    });
  });

  describe("gitResetHard", () => {
    it("should reset to previous commit", async () => {
      await initGitRepoWithCommits(testDir, 3);

      // Verify we have 3 commits
      let count = await getCommitCount(testDir);
      expect(count).toBe(3);

      // Reset to HEAD~1
      await gitResetHard(testDir, "HEAD~1");

      // Should now have 2 commits
      count = await getCommitCount(testDir);
      expect(count).toBe(2);

      // Last message should be "commit 2"
      const message = await getLastCommitMessage(testDir);
      expect(message).toBe("commit 2");
    });

    it("should remove files from reset commit", async () => {
      await initGitRepoWithCommits(testDir, 2);

      // Verify file2.txt exists
      let files = await readdir(testDir);
      expect(files).toContain("file2.txt");

      // Reset to HEAD~1
      await gitResetHard(testDir, "HEAD~1");

      // file2.txt should be gone
      files = await readdir(testDir);
      expect(files).not.toContain("file2.txt");
      expect(files).toContain("file1.txt");
    });
  });
});

describe("Undo Command Integration", () => {
  let skillsDir: string;
  let originalEnv: Record<string, string | undefined> = {};

  beforeAll(async () => {
    // Save original env
    originalEnv = {
      SKILL_MEMORY_HOME: process.env.SKILL_MEMORY_HOME,
      GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME,
      GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL,
      GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME,
      GIT_COMMITTER_EMAIL: process.env.GIT_COMMITTER_EMAIL,
    };

    // Set git user env vars for tests
    process.env.GIT_AUTHOR_NAME = "Test User";
    process.env.GIT_AUTHOR_EMAIL = "test@test.com";
    process.env.GIT_COMMITTER_NAME = "Test User";
    process.env.GIT_COMMITTER_EMAIL = "test@test.com";
  });

  afterAll(async () => {
    // Restore original env
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value !== undefined) {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }

    // Cleanup test directory
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Create fresh test environment for each test
    const testId = Date.now().toString() + Math.random().toString(36).slice(2, 8);
    const testHome = join(TEST_DIR, `home-${testId}`);
    skillsDir = join(testHome, "skills");

    // Set environment variable
    process.env.SKILL_MEMORY_HOME = testHome;

    // Create skills directory
    await mkdir(skillsDir, { recursive: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it("should undo the last commit successfully", async () => {
    // Create a skill first
    const { initCommand } = await import("../../commands/init.js");
    await initCommand(["@test-skill"]);

    // Verify skill exists
    let files = await readdir(skillsDir);
    expect(files).toContain("test-skill");

    // Create another skill
    await initCommand(["@another-skill"]);

    // Verify both skills exist
    files = await readdir(skillsDir);
    expect(files).toContain("test-skill");
    expect(files).toContain("another-skill");

    // Capture console output
    const consoleLogs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((msg) => consoleLogs.push(msg));

    // Undo
    const { undoCommand } = await import("../../commands/undo.js");
    await undoCommand();

    // Verify success message
    expect(consoleLogs.some((log) => log.includes("Undone:"))).toBe(true);
    expect(consoleLogs.some((log) => log.includes("reset to previous state"))).toBe(true);

    // Verify another-skill is gone
    files = await readdir(skillsDir);
    expect(files).toContain("test-skill");
    expect(files).not.toContain("another-skill");
  });

  it("should error when no commits exist", async () => {
    // Initialize empty git repo
    await execFileAsync("git", ["init"], { cwd: skillsDir });

    // Capture console output and exit
    const consoleErrors: string[] = [];
    vi.spyOn(console, "error").mockImplementation((msg) => consoleErrors.push(msg));
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });

    const { undoCommand } = await import("../../commands/undo.js");

    await expect(undoCommand()).rejects.toThrow("process.exit called");

    expect(consoleErrors.some((err) => err.includes("No commits to undo"))).toBe(true);
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should error when only initial commit exists", async () => {
    // Create one skill (creates one commit)
    const { initCommand } = await import("../../commands/init.js");
    await initCommand(["@only-skill"]);

    // Verify we have exactly 1 commit
    const count = await getCommitCount(skillsDir);
    expect(count).toBe(1);

    // Capture console output and exit
    const consoleErrors: string[] = [];
    vi.spyOn(console, "error").mockImplementation((msg) => consoleErrors.push(msg));
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });

    const { undoCommand } = await import("../../commands/undo.js");

    await expect(undoCommand()).rejects.toThrow("process.exit called");

    expect(consoleErrors.some((err) => err.includes("initial commit"))).toBe(true);
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should error when skills directory does not exist", async () => {
    // Remove skills directory
    await rm(skillsDir, { recursive: true, force: true });

    // Capture console output and exit
    const consoleErrors: string[] = [];
    vi.spyOn(console, "error").mockImplementation((msg) => consoleErrors.push(msg));
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });

    const { undoCommand } = await import("../../commands/undo.js");

    await expect(undoCommand()).rejects.toThrow("process.exit called");

    expect(consoleErrors.some((err) => err.includes("Skills directory not found"))).toBe(true);
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should error when no git repository exists", async () => {
    // Skills directory exists but no git repo

    // Capture console output and exit
    const consoleErrors: string[] = [];
    vi.spyOn(console, "error").mockImplementation((msg) => consoleErrors.push(msg));
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });

    const { undoCommand } = await import("../../commands/undo.js");

    await expect(undoCommand()).rejects.toThrow("process.exit called");

    expect(consoleErrors.some((err) => err.includes("No git repository"))).toBe(true);
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should restore deleted file after undo", async () => {
    // Create a skill with a file
    const { initCommand } = await import("../../commands/init.js");
    await initCommand(["@my-skill"]);

    // Add a file to the skill
    const { upsertCommand } = await import("../../commands/upsert.js");
    const testFilePath = join(TEST_DIR, "test-file.txt");
    await writeFile(testFilePath, "test content");
    await upsertCommand([testFilePath, "@my-skill/data.txt"]);

    // Verify file exists
    let skillFiles = await readdir(join(skillsDir, "my-skill"));
    expect(skillFiles).toContain("data.txt");

    // Delete the file
    const { deleteCommand } = await import("../../commands/delete.js");
    await deleteCommand(["@my-skill/data.txt"]);

    // Verify file is gone
    skillFiles = await readdir(join(skillsDir, "my-skill"));
    expect(skillFiles).not.toContain("data.txt");

    // Undo
    vi.spyOn(console, "log").mockImplementation(() => { });
    const { undoCommand } = await import("../../commands/undo.js");
    await undoCommand();

    // Verify file is restored
    skillFiles = await readdir(join(skillsDir, "my-skill"));
    expect(skillFiles).toContain("data.txt");
  });
});
