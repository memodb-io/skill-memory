/**
 * Integration tests for git commit flow with skill commands
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { isGitRepo } from "../git.js";

const execFileAsync = promisify(execFile);

// Create unique test directory for each test run
const TEST_DIR = join(tmpdir(), "git-integration-tests", Date.now().toString());

// Helper to get git log (all commits)
async function getGitLog(dir: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("git", ["log", "--oneline"], { cwd: dir });
    return stdout.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

// Helper to get latest commit message
async function getLatestCommit(dir: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["log", "--oneline", "-1"], { cwd: dir });
    return stdout.trim();
  } catch {
    return "";
  }
}

// Helper to configure git user in a directory
async function configureGitUser(dir: string): Promise<void> {
  await execFileAsync("git", ["config", "user.email", "test@test.com"], { cwd: dir });
  await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: dir });
}

describe("Git Integration with Commands", () => {
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

    // Set git user env vars for tests (so commits work without global config)
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
    const testId = Date.now().toString();
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

  describe("Migration for existing skills", () => {
    it("should create initial commit with existing skills on first git init", async () => {
      // Create existing skills before git init
      await mkdir(join(skillsDir, "xlsx"), { recursive: true });
      await writeFile(join(skillsDir, "xlsx", "SKILL.md"), "# xlsx skill");
      await mkdir(join(skillsDir, "pdf"), { recursive: true });
      await writeFile(join(skillsDir, "pdf", "SKILL.md"), "# pdf skill");

      // Import and call init command (dynamic import for fresh module state)
      const { initCommand } = await import("../../commands/init.js");

      // Capture console output
      const consoleLogs: string[] = [];
      vi.spyOn(console, "log").mockImplementation((msg) => consoleLogs.push(msg));

      await initCommand(["@new-skill"]);

      // Should have git repo
      expect(await isGitRepo(skillsDir)).toBe(true);

      // Should have migration message
      expect(consoleLogs.some((log) => log.includes("[git] Initialized repository"))).toBe(true);
      expect(consoleLogs.some((log) => log.includes("xlsx") && log.includes("pdf"))).toBe(true);

      // Should have migration commit
      const logs = await getGitLog(skillsDir);
      expect(logs.some((log) => log.includes("chore: initialize skill-memory git tracking"))).toBe(true);

      // Should have feat commit for new skill
      expect(logs.some((log) => log.includes("feat(new-skill): initialize new skill"))).toBe(true);
    });

    it("should not create migration commit if no existing skills", async () => {
      const { initCommand } = await import("../../commands/init.js");

      // Capture console output
      const consoleLogs: string[] = [];
      vi.spyOn(console, "log").mockImplementation((msg) => consoleLogs.push(msg));

      await initCommand(["@first-skill"]);

      // Should have git repo
      expect(await isGitRepo(skillsDir)).toBe(true);

      // Should NOT have migration message
      expect(consoleLogs.some((log) => log.includes("[git] Initialized repository with existing"))).toBe(false);

      // Should only have feat commit (no migration commit)
      const logs = await getGitLog(skillsDir);
      expect(logs.length).toBe(1);
      expect(logs[0]).toContain("feat(first-skill): initialize new skill");
    });
  });

  describe("Init command", () => {
    it("should create commit after initializing skill", async () => {
      const { initCommand } = await import("../../commands/init.js");

      await initCommand(["@my-skill"]);

      // Verify commit was created
      const latest = await getLatestCommit(skillsDir);
      expect(latest).toContain("feat(my-skill): initialize new skill");
    });
  });

  describe("Delete command", () => {
    it("should create commit after deleting skill", async () => {
      // First create a skill
      const { initCommand } = await import("../../commands/init.js");
      await initCommand(["@to-delete"]);

      const { deleteCommand } = await import("../../commands/delete.js");

      await deleteCommand(["@to-delete"]);

      // Verify commit was created
      const latest = await getLatestCommit(skillsDir);
      expect(latest).toContain("chore(to-delete): delete skill");
    });
  });

  describe("Copy command", () => {
    it("should create commit after copying skill", async () => {
      // First create a skill
      const { initCommand } = await import("../../commands/init.js");
      await initCommand(["@source-skill"]);

      const { copyCommand } = await import("../../commands/copy.js");

      await copyCommand(["@source-skill", "copied-skill"]);

      // Verify commit was created
      const latest = await getLatestCommit(skillsDir);
      expect(latest).toContain("feat(copied-skill): copy skill from source-skill");
    });
  });

  describe("Rename command", () => {
    it("should create commit after renaming skill", async () => {
      // First create a skill
      const { initCommand } = await import("../../commands/init.js");
      await initCommand(["@old-name"]);

      const { renameCommand } = await import("../../commands/rename.js");

      await renameCommand(["@old-name", "new-name"]);

      // Verify commit was created
      const latest = await getLatestCommit(skillsDir);
      expect(latest).toContain("refactor(new-name): rename skill from old-name");
    });
  });

  describe("Error handling", () => {
    it("should warn but not fail when git operations fail", async () => {
      // Make skills directory read-only to cause git failures
      // This is tricky to test reliably, so we'll mock the git functions
      const git = await import("../git.js");
      vi.spyOn(git, "gitCommit").mockRejectedValue(new Error("Permission denied"));

      const { initCommand } = await import("../../commands/init.js");

      const consoleWarnings: string[] = [];
      const consoleLogs: string[] = [];
      vi.spyOn(console, "warn").mockImplementation((msg) => consoleWarnings.push(msg));
      vi.spyOn(console, "log").mockImplementation((msg) => consoleLogs.push(msg));

      // Should not throw
      await initCommand(["@test-skill"]);

      // Should have created the skill
      expect(consoleLogs.some((log) => log.includes("Created skill: @test-skill"))).toBe(true);

      // Should have warning about git
      expect(consoleWarnings.some((warn) => warn.includes("[git] Warning"))).toBe(true);
    });
  });
});
