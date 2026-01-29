/**
 * Tests for skill-git.ts and git.ts commit utilities
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdir, rm, writeFile, readdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import {
  buildConventionalCommit,
  gitInit,
  gitAdd,
  gitCommit,
  listExistingSkills,
  ensureSkillsGitRepo,
  isGitRepo,
  type CommitOptions,
} from "../git.js";

const execFileAsync = promisify(execFile);
const TEST_DIR = join(tmpdir(), "skill-git-tests", Date.now().toString());

// Helper to get git log
async function getGitLog(dir: string): Promise<string> {
  const { stdout } = await execFileAsync("git", ["log", "--oneline", "-1"], { cwd: dir });
  return stdout.trim();
}

// Helper to get git status
async function getGitStatus(dir: string): Promise<string> {
  const { stdout } = await execFileAsync("git", ["status", "--short"], { cwd: dir });
  return stdout.trim();
}

describe("buildConventionalCommit", () => {
  it("should build basic feat commit", () => {
    const options: CommitOptions = {
      type: "feat",
      scope: "xlsx",
      description: "initialize new skill",
    };
    const result = buildConventionalCommit(options);
    expect(result).toBe("feat(xlsx): initialize new skill");
  });

  it("should build commit with body", () => {
    const options: CommitOptions = {
      type: "feat",
      scope: "xlsx",
      description: "add recalc.py",
      body: "multi-sheet support",
    };
    const result = buildConventionalCommit(options);
    expect(result).toBe("feat(xlsx): add recalc.py\n\nmulti-sheet support");
  });

  it("should build chore commit", () => {
    const options: CommitOptions = {
      type: "chore",
      scope: "old-skill",
      description: "delete skill",
    };
    const result = buildConventionalCommit(options);
    expect(result).toBe("chore(old-skill): delete skill");
  });

  it("should build refactor commit", () => {
    const options: CommitOptions = {
      type: "refactor",
      scope: "new-name",
      description: "rename skill from old-name",
    };
    const result = buildConventionalCommit(options);
    expect(result).toBe("refactor(new-name): rename skill from old-name");
  });

  it("should build fix commit", () => {
    const options: CommitOptions = {
      type: "fix",
      scope: "my-skill",
      description: "update configuration",
    };
    const result = buildConventionalCommit(options);
    expect(result).toBe("fix(my-skill): update configuration");
  });
});

describe("gitInit", () => {
  const testDir = join(TEST_DIR, "git-init-test");

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should initialize git repository", async () => {
    await gitInit(testDir);
    expect(await isGitRepo(testDir)).toBe(true);
  });
});

describe("gitAdd and gitCommit", () => {
  const testDir = join(TEST_DIR, "git-add-commit-test");

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
    await gitInit(testDir);
    // Configure git user for commits
    await execFileAsync("git", ["config", "user.email", "test@test.com"], { cwd: testDir });
    await execFileAsync("git", ["config", "user.name", "Test"], { cwd: testDir });
  });

  afterAll(async () => {
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should stage and commit files", async () => {
    // Create a test file
    await writeFile(join(testDir, "test.txt"), "hello");

    // Stage and commit
    await gitAdd(testDir);
    const committed = await gitCommit(testDir, "test: add test file");

    expect(committed).toBe(true);

    // Verify commit
    const log = await getGitLog(testDir);
    expect(log).toContain("test: add test file");
  });

  it("should return false when nothing to commit", async () => {
    // No changes, so should return false
    const committed = await gitCommit(testDir, "test: nothing");
    expect(committed).toBe(false);
  });

  it("should stage specific paths", async () => {
    // Create two files
    await writeFile(join(testDir, "file1.txt"), "content1");
    await writeFile(join(testDir, "file2.txt"), "content2");

    // Stage only file1
    await gitAdd(testDir, ["file1.txt"]);
    await gitCommit(testDir, "test: add file1 only");

    // file2 should still be untracked
    const status = await getGitStatus(testDir);
    expect(status).toContain("file2.txt");
  });
});

describe("listExistingSkills", () => {
  const skillsDir = join(TEST_DIR, "skills-list-test");

  beforeAll(async () => {
    await mkdir(skillsDir, { recursive: true });
    await mkdir(join(skillsDir, "skill-a"), { recursive: true });
    await mkdir(join(skillsDir, "skill-b"), { recursive: true });
    await mkdir(join(skillsDir, ".hidden"), { recursive: true });
    await writeFile(join(skillsDir, "not-a-dir.txt"), "file");
  });

  afterAll(async () => {
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should list skill directories", async () => {
    const skills = await listExistingSkills(skillsDir);
    expect(skills).toContain("skill-a");
    expect(skills).toContain("skill-b");
    expect(skills).not.toContain(".hidden");
    expect(skills).not.toContain("not-a-dir.txt");
  });

  it("should return empty array for non-existent directory", async () => {
    const skills = await listExistingSkills("/non/existent/path");
    expect(skills).toEqual([]);
  });
});

describe("ensureSkillsGitRepo", () => {
  let testCounter = 0;

  beforeEach(() => {
    testCounter++;
  });

  afterAll(async () => {
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should initialize git repo in empty directory", async () => {
    const skillsDir = join(TEST_DIR, `ensure-empty-${testCounter}`);
    await mkdir(skillsDir, { recursive: true });

    const result = await ensureSkillsGitRepo(skillsDir);

    expect(result.initialized).toBe(true);
    expect(result.migratedSkills).toBeUndefined();
    expect(await isGitRepo(skillsDir)).toBe(true);
  });

  it("should skip if git repo already exists", async () => {
    const skillsDir = join(TEST_DIR, `ensure-exists-${testCounter}`);
    await mkdir(skillsDir, { recursive: true });
    await gitInit(skillsDir);

    const result = await ensureSkillsGitRepo(skillsDir);

    expect(result.initialized).toBe(false);
    expect(result.migratedSkills).toBeUndefined();
  });

  it("should create migration commit for existing skills", async () => {
    const skillsDir = join(TEST_DIR, `ensure-migrate-${testCounter}`);
    await mkdir(skillsDir, { recursive: true });

    // Create existing skills
    await mkdir(join(skillsDir, "xlsx"), { recursive: true });
    await writeFile(join(skillsDir, "xlsx", "SKILL.md"), "# xlsx skill");
    await mkdir(join(skillsDir, "pdf-reader"), { recursive: true });
    await writeFile(join(skillsDir, "pdf-reader", "SKILL.md"), "# pdf-reader skill");

    const result = await ensureSkillsGitRepo(skillsDir);

    expect(result.initialized).toBe(true);
    expect(result.migratedSkills).toBeDefined();
    expect(result.migratedSkills).toContain("xlsx");
    expect(result.migratedSkills).toContain("pdf-reader");

    // Verify migration commit was created
    const log = await getGitLog(skillsDir);
    expect(log).toContain("chore: initialize skill-memory git tracking");
  });
});
