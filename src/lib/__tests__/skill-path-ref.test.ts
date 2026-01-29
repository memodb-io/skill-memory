/**
 * Tests for skill-path-ref.ts
 */

import { describe, it, expect } from "vitest";
import { parseSkillPathRef } from "../skill-path-ref.js";

describe("parseSkillPathRef", () => {
  describe("valid inputs", () => {
    it("should parse simple skill/file reference", () => {
      const result = parseSkillPathRef("@xlsx/SKILL.md");
      expect(result).toEqual({
        skillName: "xlsx",
        filePath: "SKILL.md",
      });
    });

    it("should parse nested file path", () => {
      const result = parseSkillPathRef("@xlsx/lib/parser.py");
      expect(result).toEqual({
        skillName: "xlsx",
        filePath: "lib/parser.py",
      });
    });

    it("should parse deeply nested file path", () => {
      const result = parseSkillPathRef("@canvas-design/assets/fonts/README.md");
      expect(result).toEqual({
        skillName: "canvas-design",
        filePath: "assets/fonts/README.md",
      });
    });

    it("should handle skill names with dashes", () => {
      const result = parseSkillPathRef("@my-cool-skill/file.txt");
      expect(result).toEqual({
        skillName: "my-cool-skill",
        filePath: "file.txt",
      });
    });

    it("should handle skill names with underscores", () => {
      const result = parseSkillPathRef("@my_cool_skill/file.txt");
      expect(result).toEqual({
        skillName: "my_cool_skill",
        filePath: "file.txt",
      });
    });

    it("should handle skill names with numbers", () => {
      const result = parseSkillPathRef("@skill123/file.txt");
      expect(result).toEqual({
        skillName: "skill123",
        filePath: "file.txt",
      });
    });

    it("should trim whitespace", () => {
      const result = parseSkillPathRef("  @xlsx/SKILL.md  ");
      expect(result).toEqual({
        skillName: "xlsx",
        filePath: "SKILL.md",
      });
    });

    it("should normalize multiple slashes in file path", () => {
      const result = parseSkillPathRef("@xlsx/lib//parser.py");
      expect(result).toEqual({
        skillName: "xlsx",
        filePath: "lib/parser.py",
      });
    });

    it("should remove leading slashes from file path", () => {
      const result = parseSkillPathRef("@xlsx//SKILL.md");
      expect(result).toEqual({
        skillName: "xlsx",
        filePath: "SKILL.md",
      });
    });
  });

  describe("error cases", () => {
    it("should throw if not starting with @", () => {
      expect(() => parseSkillPathRef("xlsx/SKILL.md")).toThrow(
        "must start with '@'"
      );
    });

    it("should throw if missing file path", () => {
      expect(() => parseSkillPathRef("@xlsx")).toThrow(
        "must include file path"
      );
    });

    it("should throw on empty skill name", () => {
      expect(() => parseSkillPathRef("@/SKILL.md")).toThrow(
        "skill name cannot be empty"
      );
    });

    it("should throw on empty file path", () => {
      expect(() => parseSkillPathRef("@xlsx/")).toThrow(
        "file path cannot be empty"
      );
    });

    it("should throw on path traversal in file path", () => {
      expect(() => parseSkillPathRef("@xlsx/../secret.txt")).toThrow(
        "traversal not allowed"
      );
    });

    it("should throw on path traversal in skill name", () => {
      expect(() => parseSkillPathRef("@../hack/file.txt")).toThrow(
        "path traversal not allowed"
      );
    });

    it("should throw on null bytes in skill name", () => {
      expect(() => parseSkillPathRef("@skill\0name/file.txt")).toThrow(
        "null bytes not allowed"
      );
    });

    it("should throw on null bytes in file path", () => {
      expect(() => parseSkillPathRef("@skill/file\0.txt")).toThrow(
        "null bytes not allowed"
      );
    });

    it("should throw on skill name with special characters", () => {
      expect(() => parseSkillPathRef("@skill@name/file.txt")).toThrow(
        "Invalid skill name"
      );
      expect(() => parseSkillPathRef("@skill!name/file.txt")).toThrow(
        "Invalid skill name"
      );
    });

    it("should throw on skill name with spaces", () => {
      expect(() => parseSkillPathRef("@my skill/file.txt")).toThrow(
        "Invalid skill name"
      );
    });

    it("should throw on skill name with slashes", () => {
      expect(() => parseSkillPathRef("@skill/name/file/path.txt")).not.toThrow();
      // This should parse skill as "skill" and filePath as "name/file/path.txt"
      const result = parseSkillPathRef("@skill/name/file/path.txt");
      expect(result.skillName).toBe("skill");
      expect(result.filePath).toBe("name/file/path.txt");
    });

    it("should throw on empty input", () => {
      expect(() => parseSkillPathRef("")).toThrow("must start with '@'");
    });

    it("should throw on just @", () => {
      expect(() => parseSkillPathRef("@")).toThrow("must include file path");
    });

    it("should throw on whitespace only", () => {
      expect(() => parseSkillPathRef("   ")).toThrow("must start with '@'");
    });
  });

  describe("allowEmptyPath option", () => {
    it("should allow empty path with trailing slash when allowEmptyPath is true", () => {
      const result = parseSkillPathRef("@xlsx/", true);
      expect(result).toEqual({
        skillName: "xlsx",
        filePath: "",
      });
    });

    it("should allow skill name only (no slash) when allowEmptyPath is true", () => {
      const result = parseSkillPathRef("@xlsx", true);
      expect(result).toEqual({
        skillName: "xlsx",
        filePath: "",
      });
    });

    it("should still parse normal paths with allowEmptyPath true", () => {
      const result = parseSkillPathRef("@xlsx/SKILL.md", true);
      expect(result).toEqual({
        skillName: "xlsx",
        filePath: "SKILL.md",
      });
    });

    it("should still throw on invalid skill name with allowEmptyPath true", () => {
      expect(() => parseSkillPathRef("@my skill/", true)).toThrow(
        "Invalid skill name"
      );
    });

    it("should still throw on path traversal with allowEmptyPath true", () => {
      expect(() => parseSkillPathRef("@xlsx/../secret", true)).toThrow(
        "traversal not allowed"
      );
    });

    it("should still throw if missing @ with allowEmptyPath true", () => {
      expect(() => parseSkillPathRef("xlsx/", true)).toThrow(
        "must start with '@'"
      );
    });
  });
});
