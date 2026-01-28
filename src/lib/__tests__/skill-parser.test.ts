/**
 * Tests for skill-parser.ts
 */

import { describe, it, expect } from "vitest";
import { join } from "path";
import { findSkillFiles, parseSkillFrontmatter, parseAllSkills } from "../skill-parser.js";

// Use the actual skill-memory repo for testing
const REPO_ROOT = join(import.meta.dirname, "../../../..");

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
