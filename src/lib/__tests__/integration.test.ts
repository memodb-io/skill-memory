/**
 * Integration tests using real git clone
 * These tests require network access and will clone the skill-memory repo
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { rm, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { isGitInstalled, cloneRepo, isGitRepo } from "../git.js";
import { parseAllSkills } from "../skill-parser.js";
import { findSkillByName } from "../skill-finder.js";

// Test with the skill-memory repo itself
const TEST_REPO_URL = "https://github.com/memodb-io/skill-memory.git";
const TEST_REPO_REF = { host: "github.com" as const, owner: "memodb-io", repo: "skill-memory" };

// Temporary directory for cloned repos
const TEST_DIR = join(tmpdir(), "skill-memory-tests", Date.now().toString());

describe("Integration: Git Operations", () => {
  beforeAll(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Cleanup test directory
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should detect git installation", async () => {
    const hasGit = await isGitInstalled();

    expect(hasGit).toBe(true);
  });

  it("should clone the skill-memory repository", async () => {
    const clonePath = join(TEST_DIR, "skill-memory-clone");

    try {
      await cloneRepo(TEST_REPO_URL, clonePath);
    } catch (error) {
      // Skip test if clone fails due to environment restrictions (e.g., macOS sandbox)
      const message = (error as Error).message;
      if (message.includes("Operation not permitted") || message.includes("Permission denied")) {
        console.log("Skipping clone test: environment restrictions prevent git clone in temp directory");
        return;
      }
      throw error;
    }

    const isRepo = await isGitRepo(clonePath);
    expect(isRepo).toBe(true);
  });

});

describe("Integration: Skill Discovery (local repo with GitHub ref)", () => {
  // Use the local repo instead of cloned one to avoid dependency on remote state
  const localRepoPath = join(import.meta.dirname, "../../../..");

  it("should list skills in the local repository", async () => {
    const skills = await parseAllSkills(localRepoPath, TEST_REPO_REF);

    expect(skills.length).toBeGreaterThan(0);

    // Should find the skill-memory skill
    const skillMemory = skills.find((s) => s.name === "skill-memory");
    expect(skillMemory).toBeDefined();
    expect(skillMemory?.description).toBeDefined();
  });

  it("should find a skill by name", async () => {
    const skillPath = await findSkillByName(localRepoPath, "skill-memory", TEST_REPO_REF);

    expect(skillPath).not.toBeNull();
    expect(skillPath).toContain("skills");
    expect(skillPath).toContain("skill-memory");
  });

  it("should return null for non-existent skill", async () => {
    const skillPath = await findSkillByName(localRepoPath, "non-existent-skill", TEST_REPO_REF);

    expect(skillPath).toBeNull();
  });
});

describe("Integration: Localhost references", () => {
  // Use the local repo with a localhost reference
  const localRepoPath = join(import.meta.dirname, "../../../..");
  const localRepoRef = { host: "localhost" as const, path: localRepoPath };

  it("should list skills using localhost reference", async () => {
    const skills = await parseAllSkills(localRepoPath, localRepoRef);

    expect(skills.length).toBeGreaterThan(0);

    // Should find the skill-memory skill
    const skillMemory = skills.find((s) => s.name === "skill-memory");
    expect(skillMemory).toBeDefined();
    expect(skillMemory?.description).toBeDefined();

    // Verify fullRef uses localhost format
    expect(skillMemory?.fullRef).toMatch(/^localhost@/);
    expect(skillMemory?.fullRef).toContain("@skill-memory");
  });

  it("should find a skill by name using localhost reference", async () => {
    const skillPath = await findSkillByName(localRepoPath, "skill-memory", localRepoRef);

    expect(skillPath).not.toBeNull();
    expect(skillPath).toContain("skills");
    expect(skillPath).toContain("skill-memory");
  });

  it("should return null for non-existent skill with localhost reference", async () => {
    const skillPath = await findSkillByName(localRepoPath, "non-existent-skill", localRepoRef);

    expect(skillPath).toBeNull();
  });
});
