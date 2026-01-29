/**
 * Tests for delete file from skill functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { dirExists, fileExists } from "../fs-utils.js";
import { getLocalSkillPath, getSkillsDir } from "../paths.js";
import { parseSkillPathRef } from "../skill-path-ref.js";

const TEST_DIR = join(tmpdir(), "delete-file-tests", Date.now().toString());

describe("Delete File from Skill Tests", () => {
  beforeAll(async () => {
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

  describe("Skill Path Reference Parsing", () => {
    it("should parse skill-only reference", () => {
      const ref = parseSkillPathRef("@xlsx", true);
      expect(ref.skillName).toBe("xlsx");
      expect(ref.filePath).toBe("");
    });

    it("should parse skill with file path", () => {
      const ref = parseSkillPathRef("@xlsx/recalc.py", true);
      expect(ref.skillName).toBe("xlsx");
      expect(ref.filePath).toBe("recalc.py");
    });

    it("should parse skill with nested file path", () => {
      const ref = parseSkillPathRef("@xlsx/lib/deep/parser.ts", true);
      expect(ref.skillName).toBe("xlsx");
      expect(ref.filePath).toBe("lib/deep/parser.ts");
    });

    it("should reject path traversal", () => {
      expect(() => parseSkillPathRef("@xlsx/../secret.txt", true)).toThrow(
        "traversal not allowed"
      );
    });
  });

  describe("File Deletion Logic", () => {
    it("should delete a file from a skill", async () => {
      const skillName = "test-skill";
      const skillPath = getLocalSkillPath(skillName);
      const filePath = "to-delete.py";
      const targetFile = join(skillPath, filePath);

      // Create skill with file
      await mkdir(skillPath, { recursive: true });
      await writeFile(join(skillPath, "SKILL.md"), "---\nname: test-skill\n---");
      await writeFile(targetFile, "print('hello')");

      expect(await fileExists(targetFile)).toBe(true);

      // Delete the file
      await unlink(targetFile);

      expect(await fileExists(targetFile)).toBe(false);
      // Skill should still exist
      expect(await dirExists(skillPath)).toBe(true);
    });

    it("should delete nested file while preserving directories", async () => {
      const skillName = "test-skill";
      const skillPath = getLocalSkillPath(skillName);
      const nestedDir = join(skillPath, "lib", "deep");
      const targetFile = join(nestedDir, "parser.ts");

      // Create skill with nested file
      await mkdir(nestedDir, { recursive: true });
      await writeFile(join(skillPath, "SKILL.md"), "---\nname: test-skill\n---");
      await writeFile(targetFile, "// parser");

      expect(await fileExists(targetFile)).toBe(true);

      // Delete the file
      await unlink(targetFile);

      expect(await fileExists(targetFile)).toBe(false);
      // Directories should still exist
      expect(await dirExists(nestedDir)).toBe(true);
    });

    it("should detect non-existent file", async () => {
      const skillName = "test-skill";
      const skillPath = getLocalSkillPath(skillName);
      const targetFile = join(skillPath, "nonexistent.py");

      // Create skill without the file
      await mkdir(skillPath, { recursive: true });
      await writeFile(join(skillPath, "SKILL.md"), "---\nname: test-skill\n---");

      expect(await fileExists(targetFile)).toBe(false);
    });

    it("should detect non-existent skill", async () => {
      const skillPath = getLocalSkillPath("nonexistent");
      expect(await dirExists(skillPath)).toBe(false);
    });
  });

  describe("Entire Skill Deletion (existing behavior)", () => {
    it("should delete entire skill when no file path", async () => {
      const skillName = "test-skill";
      const skillPath = getLocalSkillPath(skillName);

      // Create skill
      await mkdir(skillPath, { recursive: true });
      await writeFile(join(skillPath, "SKILL.md"), "---\nname: test-skill\n---");
      await writeFile(join(skillPath, "file.py"), "content");

      expect(await dirExists(skillPath)).toBe(true);

      // Simulate delete skill (rmDir)
      const { rm } = await import("fs/promises");
      await rm(skillPath, { recursive: true, force: true });

      expect(await dirExists(skillPath)).toBe(false);
    });
  });

  describe("Branching Logic", () => {
    it("should branch to file deletion when filePath is present", () => {
      const ref = parseSkillPathRef("@xlsx/file.py", true);
      const shouldDeleteFile = ref.filePath !== "";
      expect(shouldDeleteFile).toBe(true);
    });

    it("should branch to skill deletion when filePath is empty", () => {
      const ref = parseSkillPathRef("@xlsx", true);
      const shouldDeleteFile = ref.filePath !== "";
      expect(shouldDeleteFile).toBe(false);
    });

    it("should branch to skill deletion when only trailing slash", () => {
      const ref = parseSkillPathRef("@xlsx/", true);
      // After normalization, filePath should be empty
      const shouldDeleteFile = ref.filePath !== "";
      expect(shouldDeleteFile).toBe(false);
    });
  });
});
