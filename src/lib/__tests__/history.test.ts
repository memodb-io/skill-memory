/**
 * Tests for history command
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { getGitHistory, getCommitCount } from "../git.js";

const execFileAsync = promisify(execFile);

// Create unique test directory for each test run
const TEST_DIR = join(tmpdir(), "history-tests", Date.now().toString());

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
    await execFileAsync("git", ["commit", "-m", `feat(skill-${i}): add file ${i}`], { cwd: dir });
    // Add small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

describe("getGitHistory", () => {
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

  it("should return empty array for empty repo (no commits)", async () => {
    await execFileAsync("git", ["init"], { cwd: testDir });

    const history = await getGitHistory(testDir);
    expect(history).toEqual([]);
  });

  it("should return empty array for non-git directory", async () => {
    const history = await getGitHistory(testDir);
    expect(history).toEqual([]);
  });

  it("should return all commits when count is less than limit", async () => {
    await initGitRepoWithCommits(testDir, 3);

    const history = await getGitHistory(testDir);

    expect(history).toHaveLength(3);
    // Should be in reverse chronological order (newest first)
    expect(history[0].message).toBe("feat(skill-3): add file 3");
    expect(history[1].message).toBe("feat(skill-2): add file 2");
    expect(history[2].message).toBe("feat(skill-1): add file 1");
  });

  it("should return formatted date strings", async () => {
    await initGitRepoWithCommits(testDir, 1);

    const history = await getGitHistory(testDir);

    expect(history).toHaveLength(1);
    // Date should match YYYY-MM-DD HH:MM:SS format
    expect(history[0].date).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("should respect limit parameter", async () => {
    await initGitRepoWithCommits(testDir, 5);

    const history = await getGitHistory(testDir, 0, 2);

    expect(history).toHaveLength(2);
    expect(history[0].message).toBe("feat(skill-5): add file 5");
    expect(history[1].message).toBe("feat(skill-4): add file 4");
  });

  it("should respect offset parameter", async () => {
    await initGitRepoWithCommits(testDir, 5);

    const history = await getGitHistory(testDir, 2, 2);

    expect(history).toHaveLength(2);
    expect(history[0].message).toBe("feat(skill-3): add file 3");
    expect(history[1].message).toBe("feat(skill-2): add file 2");
  });

  it("should return empty array when offset exceeds total commits", async () => {
    await initGitRepoWithCommits(testDir, 3);

    const history = await getGitHistory(testDir, 10, 5);

    expect(history).toEqual([]);
  });

  it("should return remaining commits when offset + limit exceeds total", async () => {
    await initGitRepoWithCommits(testDir, 5);

    const history = await getGitHistory(testDir, 3, 10);

    expect(history).toHaveLength(2);
    expect(history[0].message).toBe("feat(skill-2): add file 2");
    expect(history[1].message).toBe("feat(skill-1): add file 1");
  });

  it("should handle messages with pipe characters", async () => {
    await execFileAsync("git", ["init"], { cwd: testDir });
    await configureGitUser(testDir);
    await writeFile(join(testDir, "file.txt"), "content");
    await execFileAsync("git", ["add", "-A"], { cwd: testDir });
    await execFileAsync("git", ["commit", "-m", "fix: handle a | b | c pattern"], { cwd: testDir });

    const history = await getGitHistory(testDir);

    expect(history).toHaveLength(1);
    expect(history[0].message).toBe("fix: handle a | b | c pattern");
  });
});

describe("History Command Integration", () => {
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

  it("should display history after creating skills", async () => {
    // Create skills
    const { initCommand } = await import("../../commands/init.js");
    await initCommand(["@test-skill-1"]);
    await initCommand(["@test-skill-2"]);

    // Capture console output
    const consoleLogs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((msg) => consoleLogs.push(msg));

    // Get history
    const { historyCommand } = await import("../../commands/history.js");
    await historyCommand([]);

    // Verify output
    expect(consoleLogs.some((log) => log.includes("History (showing 1-2 of 2)"))).toBe(true);
    expect(consoleLogs.some((log) => log.includes("test-skill-2"))).toBe(true);
    expect(consoleLogs.some((log) => log.includes("test-skill-1"))).toBe(true);
  });

  it("should respect --limit argument", async () => {
    // Create multiple skills
    const { initCommand } = await import("../../commands/init.js");
    await initCommand(["@skill-1"]);
    await initCommand(["@skill-2"]);
    await initCommand(["@skill-3"]);

    const count = await getCommitCount(skillsDir);
    expect(count).toBe(3);

    // Capture console output
    const consoleLogs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((msg) => consoleLogs.push(msg));

    // Get history with limit
    const { historyCommand } = await import("../../commands/history.js");
    await historyCommand(["--limit", "2"]);

    // Verify output shows limited entries
    expect(consoleLogs.some((log) => log.includes("History (showing 1-2 of 3)"))).toBe(true);
    expect(consoleLogs.some((log) => log.includes("skill-3"))).toBe(true);
    expect(consoleLogs.some((log) => log.includes("skill-2"))).toBe(true);
    // skill-1 should not be shown due to limit
    expect(consoleLogs.filter((log) => log.includes("skill-1")).length).toBe(0);
  });

  it("should respect --offset argument", async () => {
    // Create multiple skills
    const { initCommand } = await import("../../commands/init.js");
    await initCommand(["@skill-1"]);
    await initCommand(["@skill-2"]);
    await initCommand(["@skill-3"]);

    // Capture console output
    const consoleLogs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((msg) => consoleLogs.push(msg));

    // Get history with offset
    const { historyCommand } = await import("../../commands/history.js");
    await historyCommand(["--offset", "1", "--limit", "2"]);

    // Verify output shows offset entries
    expect(consoleLogs.some((log) => log.includes("History (showing 2-3 of 3)"))).toBe(true);
    expect(consoleLogs.some((log) => log.includes("skill-2"))).toBe(true);
    expect(consoleLogs.some((log) => log.includes("skill-1"))).toBe(true);
    // skill-3 should not be shown due to offset
    expect(consoleLogs.filter((log) => log.includes("skill-3")).length).toBe(0);
  });

  it("should show message when no commits exist", async () => {
    // Initialize empty git repo
    await execFileAsync("git", ["init"], { cwd: skillsDir });

    // Capture console output
    const consoleLogs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((msg) => consoleLogs.push(msg));

    // Get history
    const { historyCommand } = await import("../../commands/history.js");
    await historyCommand([]);

    // Verify message
    expect(consoleLogs.some((log) => log.includes("No history found"))).toBe(true);
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

    const { historyCommand } = await import("../../commands/history.js");

    await expect(historyCommand([])).rejects.toThrow("process.exit called");

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

    const { historyCommand } = await import("../../commands/history.js");

    await expect(historyCommand([])).rejects.toThrow("process.exit called");

    expect(consoleErrors.some((err) => err.includes("No git repository"))).toBe(true);
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should show 'No more history entries' when offset exceeds total", async () => {
    // Create one skill
    const { initCommand } = await import("../../commands/init.js");
    await initCommand(["@test-skill"]);

    // Capture console output
    const consoleLogs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((msg) => consoleLogs.push(msg));

    // Get history with large offset
    const { historyCommand } = await import("../../commands/history.js");
    await historyCommand(["--offset", "100"]);

    // Verify message
    expect(consoleLogs.some((log) => log.includes("No more history entries"))).toBe(true);
  });
});
