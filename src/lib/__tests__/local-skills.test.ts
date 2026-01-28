/**
 * Tests for local-skills.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { listLocalSkills, getLocalSkill } from "../local-skills.js";

const TEST_DIR = join(tmpdir(), "local-skills-tests", Date.now().toString());

describe("listLocalSkills", () => {
  beforeAll(() => {
    // Set SKILL_MEMORY_HOME to test directory
    process.env.SKILL_MEMORY_HOME = TEST_DIR;
  });

  afterAll(async () => {
    delete process.env.SKILL_MEMORY_HOME;
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("empty library", () => {
    it("should return empty array when skills directory does not exist", async () => {
      const skills = await listLocalSkills();
      expect(skills).toEqual([]);
    });
  });

  describe("with skills", () => {
    beforeEach(async () => {
      const skillsDir = join(TEST_DIR, "skills");
      await mkdir(skillsDir, { recursive: true });
    });

    afterEach(async () => {
      try {
        await rm(join(TEST_DIR, "skills"), { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it("should list single skill", async () => {
      const skillDir = join(TEST_DIR, "skills", "xlsx");
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, "SKILL.md"),
        `---
name: xlsx
description: Excel spreadsheet manipulation
---

# XLSX Skill`
      );

      const skills = await listLocalSkills();
      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe("xlsx");
      expect(skills[0].description).toBe("Excel spreadsheet manipulation");
    });

    it("should list multiple skills sorted alphabetically", async () => {
      const skills1Dir = join(TEST_DIR, "skills", "zebra");
      const skills2Dir = join(TEST_DIR, "skills", "alpha");
      const skills3Dir = join(TEST_DIR, "skills", "beta");

      await mkdir(skills1Dir, { recursive: true });
      await mkdir(skills2Dir, { recursive: true });
      await mkdir(skills3Dir, { recursive: true });

      await writeFile(
        join(skills1Dir, "SKILL.md"),
        "---\nname: zebra\ndescription: Z skill\n---"
      );
      await writeFile(
        join(skills2Dir, "SKILL.md"),
        "---\nname: alpha\ndescription: A skill\n---"
      );
      await writeFile(
        join(skills3Dir, "SKILL.md"),
        "---\nname: beta\ndescription: B skill\n---"
      );

      const skills = await listLocalSkills();
      expect(skills).toHaveLength(3);
      expect(skills[0].name).toBe("alpha");
      expect(skills[1].name).toBe("beta");
      expect(skills[2].name).toBe("zebra");
    });

    it("should handle skill without frontmatter", async () => {
      const skillDir = join(TEST_DIR, "skills", "no-frontmatter");
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(skillDir, "SKILL.md"), "# Just a heading");

      const skills = await listLocalSkills();
      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe("no-frontmatter");
      expect(skills[0].description).toBe("No description");
    });

    it("should skip directories without SKILL.md", async () => {
      const skillDir = join(TEST_DIR, "skills", "empty-skill");
      await mkdir(skillDir, { recursive: true });
      // No SKILL.md file

      const skills = await listLocalSkills();
      expect(skills).toHaveLength(0);
    });

    it("should skip hidden directories", async () => {
      const hiddenDir = join(TEST_DIR, "skills", ".hidden");
      await mkdir(hiddenDir, { recursive: true });
      await writeFile(
        join(hiddenDir, "SKILL.md"),
        "---\nname: hidden\ndescription: Hidden skill\n---"
      );

      const skills = await listLocalSkills();
      expect(skills).toHaveLength(0);
    });
  });
});

describe("getLocalSkill", () => {
  beforeAll(() => {
    process.env.SKILL_MEMORY_HOME = TEST_DIR;
  });

  afterAll(async () => {
    delete process.env.SKILL_MEMORY_HOME;
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    const skillsDir = join(TEST_DIR, "skills");
    await mkdir(skillsDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(join(TEST_DIR, "skills"), { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should return skill when it exists", async () => {
    const skillDir = join(TEST_DIR, "skills", "my-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      "---\nname: my-skill\ndescription: My test skill\n---"
    );

    const skill = await getLocalSkill("my-skill");
    expect(skill).not.toBeNull();
    expect(skill!.name).toBe("my-skill");
    expect(skill!.description).toBe("My test skill");
  });

  it("should return null when skill does not exist", async () => {
    const skill = await getLocalSkill("nonexistent");
    expect(skill).toBeNull();
  });

  it("should return null when SKILL.md is missing", async () => {
    const skillDir = join(TEST_DIR, "skills", "no-skill-md");
    await mkdir(skillDir, { recursive: true });
    // No SKILL.md file

    const skill = await getLocalSkill("no-skill-md");
    expect(skill).toBeNull();
  });
});
