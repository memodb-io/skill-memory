/**
 * Integration tests for local skill management commands
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile, readFile, readdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { dirExists, fileExists } from "../fs-utils.js";
import { listLocalSkills, getLocalSkill } from "../local-skills.js";
import { copyDir, rmDir } from "../fs-utils.js";
import { getLocalSkillPath, getSkillsDir, ensureDir } from "../paths.js";
import { parseLocalSkillName, validateSkillName } from "../local-skill-ref.js";
import { generateSkillTemplate } from "../templates.js";
import { updateSkillFrontmatterName } from "../skill-parser.js";

const TEST_DIR = join(tmpdir(), "commands-tests", Date.now().toString());

describe("Command Integration Tests", () => {
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
    const skillsDir = getSkillsDir();
    await mkdir(skillsDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(join(TEST_DIR, "skills"), { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("list command logic", () => {
    it("should list empty library", async () => {
      const skills = await listLocalSkills();
      expect(skills).toEqual([]);
    });

    it("should list single skill", async () => {
      const skillPath = getLocalSkillPath("test-skill");
      await mkdir(skillPath, { recursive: true });
      await writeFile(
        join(skillPath, "SKILL.md"),
        "---\nname: test-skill\ndescription: Test\n---"
      );

      const skills = await listLocalSkills();
      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe("test-skill");
    });

    it("should list multiple skills sorted", async () => {
      for (const name of ["charlie", "alpha", "bravo"]) {
        const path = getLocalSkillPath(name);
        await mkdir(path, { recursive: true });
        await writeFile(
          join(path, "SKILL.md"),
          `---\nname: ${name}\ndescription: ${name}\n---`
        );
      }

      const skills = await listLocalSkills();
      expect(skills.map((s) => s.name)).toEqual(["alpha", "bravo", "charlie"]);
    });
  });

  describe("init command logic", () => {
    it("should create skill with template", async () => {
      const name = "new-skill";
      const skillPath = getLocalSkillPath(name);

      // Simulate init command
      await ensureDir(getSkillsDir());
      await mkdir(skillPath, { recursive: true });
      const template = generateSkillTemplate(name);
      await writeFile(join(skillPath, "SKILL.md"), template, "utf-8");

      expect(await dirExists(skillPath)).toBe(true);
      expect(await fileExists(join(skillPath, "SKILL.md"))).toBe(true);

      const content = await readFile(join(skillPath, "SKILL.md"), "utf-8");
      expect(content).toContain("name: new-skill");
    });

    it("should reject invalid skill names", () => {
      expect(() => parseLocalSkillName("@")).toThrow();
      expect(() => parseLocalSkillName("@..")).toThrow();
      expect(() => parseLocalSkillName("@my skill")).toThrow();
      expect(() => parseLocalSkillName("@my@skill")).toThrow();
    });

    it("should detect existing skill", async () => {
      const name = "existing-skill";
      const skillPath = getLocalSkillPath(name);
      await mkdir(skillPath, { recursive: true });

      expect(await dirExists(skillPath)).toBe(true);
    });
  });

  describe("delete command logic", () => {
    it("should delete existing skill", async () => {
      const name = "to-delete";
      const skillPath = getLocalSkillPath(name);
      await mkdir(skillPath, { recursive: true });
      await writeFile(join(skillPath, "SKILL.md"), "test");

      expect(await dirExists(skillPath)).toBe(true);

      await rmDir(skillPath);

      expect(await dirExists(skillPath)).toBe(false);
    });

    it("should detect non-existent skill", async () => {
      const skillPath = getLocalSkillPath("nonexistent");
      expect(await dirExists(skillPath)).toBe(false);
    });
  });

  describe("copy command logic", () => {
    it("should copy skill to new name", async () => {
      const sourceName = "source-skill";
      const targetName = "target-skill";
      const sourcePath = getLocalSkillPath(sourceName);
      const targetPath = getLocalSkillPath(targetName);

      // Create source skill
      await mkdir(sourcePath, { recursive: true });
      await writeFile(join(sourcePath, "SKILL.md"), "---\nname: source-skill\n---");
      await mkdir(join(sourcePath, "subdir"), { recursive: true });
      await writeFile(join(sourcePath, "subdir", "extra.md"), "extra content");

      // Copy
      await copyDir(sourcePath, targetPath);

      // Verify both exist
      expect(await dirExists(sourcePath)).toBe(true);
      expect(await dirExists(targetPath)).toBe(true);
      expect(await fileExists(join(targetPath, "SKILL.md"))).toBe(true);
      expect(await fileExists(join(targetPath, "subdir", "extra.md"))).toBe(true);
    });

    it("should detect same name", () => {
      const source = parseLocalSkillName("@xlsx");
      const target = parseLocalSkillName("xlsx");
      expect(source).toBe(target);
    });

    it("should detect target exists", async () => {
      const targetPath = getLocalSkillPath("existing");
      await mkdir(targetPath, { recursive: true });

      expect(await dirExists(targetPath)).toBe(true);
    });
  });

  describe("rename command logic", () => {
    it("should rename skill", async () => {
      const { rename } = await import("fs/promises");

      const oldName = "old-name";
      const newName = "new-name";
      const oldPath = getLocalSkillPath(oldName);
      const newPath = getLocalSkillPath(newName);

      // Create source skill
      await mkdir(oldPath, { recursive: true });
      await writeFile(join(oldPath, "SKILL.md"), "---\nname: old-name\n---");

      // Rename
      await rename(oldPath, newPath);

      // Verify old is gone, new exists
      expect(await dirExists(oldPath)).toBe(false);
      expect(await dirExists(newPath)).toBe(true);
      expect(await fileExists(join(newPath, "SKILL.md"))).toBe(true);
    });

    it("should update frontmatter name after rename", async () => {
      const { rename } = await import("fs/promises");

      const oldName = "source-skill";
      const newName = "target-skill";
      const oldPath = getLocalSkillPath(oldName);
      const newPath = getLocalSkillPath(newName);

      // Create source skill with frontmatter
      await mkdir(oldPath, { recursive: true });
      await writeFile(
        join(oldPath, "SKILL.md"),
        "---\nname: source-skill\ndescription: A test skill\n---\n\n# Content"
      );

      // Rename directory
      await rename(oldPath, newPath);

      // Update frontmatter (simulating what rename command does)
      await updateSkillFrontmatterName(newPath, newName);

      // Verify frontmatter was updated
      const content = await readFile(join(newPath, "SKILL.md"), "utf-8");
      expect(content).toContain("name: target-skill");
      expect(content).toContain("description: A test skill");
    });
  });

  describe("copy command with frontmatter sync", () => {
    it("should update frontmatter name in copied skill", async () => {
      const sourceName = "original-skill";
      const targetName = "copied-skill";
      const sourcePath = getLocalSkillPath(sourceName);
      const targetPath = getLocalSkillPath(targetName);

      // Create source skill
      await mkdir(sourcePath, { recursive: true });
      await writeFile(
        join(sourcePath, "SKILL.md"),
        "---\nname: original-skill\ndescription: Original description\n---\n\n# Original"
      );

      // Copy directory
      await copyDir(sourcePath, targetPath);

      // Update frontmatter (simulating what copy command does)
      await updateSkillFrontmatterName(targetPath, targetName);

      // Verify source is unchanged
      const sourceContent = await readFile(join(sourcePath, "SKILL.md"), "utf-8");
      expect(sourceContent).toContain("name: original-skill");

      // Verify target has updated name
      const targetContent = await readFile(join(targetPath, "SKILL.md"), "utf-8");
      expect(targetContent).toContain("name: copied-skill");
      expect(targetContent).toContain("description: Original description");
    });
  });

  describe("skill name validation", () => {
    it("should reject names with spaces", () => {
      expect(() => validateSkillName("my skill")).toThrow(
        "only alphanumeric characters, dashes, and underscores are allowed"
      );
    });

    it("should reject names with special characters", () => {
      expect(() => validateSkillName("skill!@#$")).toThrow();
      expect(() => validateSkillName("skill.name")).toThrow();
      expect(() => validateSkillName("skill:name")).toThrow();
    });

    it("should accept valid names", () => {
      expect(() => validateSkillName("my-skill")).not.toThrow();
      expect(() => validateSkillName("my_skill")).not.toThrow();
      expect(() => validateSkillName("MySkill123")).not.toThrow();
      expect(() => validateSkillName("skill-name-123")).not.toThrow();
    });

    it("should reject path traversal attempts", () => {
      expect(() => validateSkillName("../evil")).toThrow("path traversal");
      expect(() => validateSkillName("skill/subdir")).toThrow("path traversal");
      expect(() => validateSkillName("skill\\subdir")).toThrow("path traversal");
    });

    it("should reject reserved names", () => {
      expect(() => validateSkillName(".")).toThrow("reserved name");
      expect(() => validateSkillName("..")).toThrow("reserved name");
    });
  });
});

describe("rmDir", () => {
  const testDir = join(TEST_DIR, "rmdir-tests");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeAll(() => {
    process.env.SKILL_MEMORY_HOME = TEST_DIR;
  });

  afterAll(() => {
    delete process.env.SKILL_MEMORY_HOME;
  });

  it("should remove directory recursively", async () => {
    const dir = join(testDir, "to-remove");
    await mkdir(join(dir, "subdir"), { recursive: true });
    await writeFile(join(dir, "file.txt"), "test");
    await writeFile(join(dir, "subdir", "nested.txt"), "nested");

    await rmDir(dir);

    expect(await dirExists(dir)).toBe(false);
  });

  it("should not throw on non-existent directory", async () => {
    const dir = join(testDir, "nonexistent");
    await expect(rmDir(dir)).resolves.not.toThrow();
  });
});
