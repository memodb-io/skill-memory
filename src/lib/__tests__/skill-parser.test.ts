/**
 * Tests for skill-parser.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { join } from "path";
import { mkdir, rm, writeFile, readFile } from "fs/promises";
import { tmpdir } from "os";
import { findSkillFiles, parseSkillFrontmatter, parseAllSkills, updateSkillFrontmatterName } from "../skill-parser.js";

// Use the actual skill-memory repo for testing
// Go up 3 levels: __tests__ -> lib -> src -> repo root
const REPO_ROOT = join(import.meta.dirname, "../../..");

describe("findSkillFiles", () => {
  it("should find SKILL.md files in the repository", async () => {
    const files = await findSkillFiles(REPO_ROOT);

    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.endsWith("SKILL.md"))).toBe(true);
  });

  it("should find the skill-memory SKILL.md", async () => {
    const files = await findSkillFiles(REPO_ROOT);

    expect(files.some((f) => f.includes("skills/skill-memory/SKILL.md"))).toBe(true);
  });

  it("should skip .git and node_modules directories", async () => {
    const files = await findSkillFiles(REPO_ROOT);

    expect(files.every((f) => !f.includes(".git/"))).toBe(true);
    expect(files.every((f) => !f.includes("node_modules/"))).toBe(true);
  });
});

describe("parseSkillFrontmatter", () => {
  it("should parse the skill-memory SKILL.md", async () => {
    const skillPath = join(REPO_ROOT, "skills/skill-memory/SKILL.md");
    const repoRef = { host: "github.com" as const, owner: "memodb-io", repo: "skill-memory" };

    const skill = await parseSkillFrontmatter(skillPath, REPO_ROOT, repoRef);

    // Check structure - actual description may vary
    expect(skill.name).toBe("skill-memory");
    expect(skill.description).toBeDefined();
    expect(skill.description.length).toBeGreaterThan(0);
    expect(skill.path).toBe("skills/skill-memory");
    expect(skill.fullRef).toBe("github.com@memodb-io/skill-memory@skill-memory");
  });

  it("should extract name from frontmatter", async () => {
    const skillPath = join(REPO_ROOT, "skills/skill-memory/SKILL.md");
    const repoRef = { host: "github.com" as const, owner: "test", repo: "test" };

    const skill = await parseSkillFrontmatter(skillPath, REPO_ROOT, repoRef);

    // Name should come from frontmatter
    expect(skill.name).toBe("skill-memory");
  });
});

describe("parseAllSkills", () => {
  it("should find all skills in the repository", async () => {
    const repoRef = { host: "github.com" as const, owner: "memodb-io", repo: "skill-memory" };

    const skills = await parseAllSkills(REPO_ROOT, repoRef);

    expect(skills.length).toBeGreaterThan(0);
    expect(skills.some((s) => s.name === "skill-memory")).toBe(true);
  });

  it("should generate correct fullRef for each skill", async () => {
    const repoRef = { host: "github.com" as const, owner: "memodb-io", repo: "skill-memory" };

    const skills = await parseAllSkills(REPO_ROOT, repoRef);

    for (const skill of skills) {
      expect(skill.fullRef).toMatch(/^github\.com@memodb-io\/skill-memory@.+$/);
    }
  });
});

describe("updateSkillFrontmatterName", () => {
  const TEST_DIR = join(tmpdir(), "skill-parser-tests", Date.now().toString());

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

  it("should update existing frontmatter name field", async () => {
    const skillDir = join(TEST_DIR, "test-skill-1");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      "---\nname: old-name\ndescription: Test skill\n---\n\n# My Skill\n\nContent here."
    );

    await updateSkillFrontmatterName(skillDir, "new-name");

    const content = await readFile(join(skillDir, "SKILL.md"), "utf-8");
    expect(content).toContain("name: new-name");
    expect(content).toContain("description: Test skill");
    expect(content).toContain("# My Skill");
  });

  it("should preserve other frontmatter fields", async () => {
    const skillDir = join(TEST_DIR, "test-skill-2");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      "---\nname: original\ndescription: A description\nversion: 1.0.0\nauthor: Test Author\n---\n\nBody content."
    );

    await updateSkillFrontmatterName(skillDir, "renamed");

    const content = await readFile(join(skillDir, "SKILL.md"), "utf-8");
    expect(content).toContain("name: renamed");
    expect(content).toContain("description: A description");
    expect(content).toContain("version: 1.0.0");
    expect(content).toContain("author: Test Author");
    expect(content).toContain("Body content.");
  });

  it("should add frontmatter if missing", async () => {
    const skillDir = join(TEST_DIR, "test-skill-3");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      "# My Skill\n\nThis is a skill without frontmatter."
    );

    await updateSkillFrontmatterName(skillDir, "new-skill");

    const content = await readFile(join(skillDir, "SKILL.md"), "utf-8");
    expect(content).toMatch(/^---\nname: new-skill\n---/);
    expect(content).toContain("# My Skill");
    expect(content).toContain("This is a skill without frontmatter.");
  });

  it("should handle missing SKILL.md gracefully", async () => {
    const skillDir = join(TEST_DIR, "test-skill-4");
    await mkdir(skillDir, { recursive: true });
    // Don't create SKILL.md

    // Should not throw
    await expect(updateSkillFrontmatterName(skillDir, "new-name")).resolves.not.toThrow();
  });

  it("should handle malformed YAML gracefully", async () => {
    const skillDir = join(TEST_DIR, "test-skill-5");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      "---\nname: [invalid yaml\ndescription: broken\n---\n\nContent."
    );

    // Should not throw
    await expect(updateSkillFrontmatterName(skillDir, "new-name")).resolves.not.toThrow();

    // Content should be unchanged
    const content = await readFile(join(skillDir, "SKILL.md"), "utf-8");
    expect(content).toContain("[invalid yaml");
  });

  it("should handle complex YAML values", async () => {
    const skillDir = join(TEST_DIR, "test-skill-6");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      "---\nname: original\ntags:\n  - typescript\n  - cli\nmetadata:\n  created: 2024-01-01\n  updated: 2024-06-01\n---\n\nContent."
    );

    await updateSkillFrontmatterName(skillDir, "renamed-skill");

    const content = await readFile(join(skillDir, "SKILL.md"), "utf-8");
    expect(content).toContain("name: renamed-skill");
    expect(content).toContain("typescript");
    expect(content).toContain("cli");
    expect(content).toContain("created");
  });
});
