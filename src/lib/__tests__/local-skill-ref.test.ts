/**
 * Tests for local-skill-ref.ts
 */

import { describe, it, expect } from "vitest";
import { parseLocalSkillName, validateSkillName } from "../local-skill-ref.js";

describe("parseLocalSkillName", () => {
  describe("valid inputs", () => {
    it("should parse name with @ prefix", () => {
      expect(parseLocalSkillName("@xlsx")).toBe("xlsx");
    });

    it("should parse name without @ prefix", () => {
      expect(parseLocalSkillName("xlsx")).toBe("xlsx");
    });

    it("should handle names with dashes", () => {
      expect(parseLocalSkillName("@my-cool-skill")).toBe("my-cool-skill");
    });

    it("should handle names with underscores", () => {
      expect(parseLocalSkillName("my_cool_skill")).toBe("my_cool_skill");
    });

    it("should handle names with numbers", () => {
      expect(parseLocalSkillName("skill123")).toBe("skill123");
    });

    it("should trim whitespace", () => {
      expect(parseLocalSkillName("  @xlsx  ")).toBe("xlsx");
    });
  });

  describe("error cases", () => {
    it("should throw on empty name", () => {
      expect(() => parseLocalSkillName("@")).toThrow("Invalid skill name");
    });

    it("should throw on just whitespace", () => {
      expect(() => parseLocalSkillName("  ")).toThrow("Invalid skill name");
    });

    it("should throw on reserved names", () => {
      expect(() => parseLocalSkillName("..")).toThrow("Invalid skill name");
      expect(() => parseLocalSkillName(".")).toThrow("Invalid skill name");
    });

    it("should throw on path traversal attempts", () => {
      expect(() => parseLocalSkillName("../hack")).toThrow("Invalid skill name");
      expect(() => parseLocalSkillName("@../hack")).toThrow("Invalid skill name");
    });

    it("should throw on names with spaces", () => {
      expect(() => parseLocalSkillName("my skill")).toThrow("Invalid skill name");
    });

    it("should throw on names with special characters", () => {
      expect(() => parseLocalSkillName("my@skill")).toThrow("Invalid skill name");
      expect(() => parseLocalSkillName("my/skill")).toThrow("Invalid skill name");
      expect(() => parseLocalSkillName("my\\skill")).toThrow("Invalid skill name");
    });
  });
});

describe("validateSkillName", () => {
  describe("valid names", () => {
    it("should accept alphanumeric names", () => {
      expect(() => validateSkillName("myskill")).not.toThrow();
      expect(() => validateSkillName("MySkill123")).not.toThrow();
    });

    it("should accept names with dashes", () => {
      expect(() => validateSkillName("my-skill")).not.toThrow();
    });

    it("should accept names with underscores", () => {
      expect(() => validateSkillName("my_skill")).not.toThrow();
    });
  });

  describe("invalid names", () => {
    it("should reject empty names", () => {
      expect(() => validateSkillName("")).toThrow("Invalid skill name");
    });

    it("should reject reserved names", () => {
      expect(() => validateSkillName(".")).toThrow("Invalid skill name");
      expect(() => validateSkillName("..")).toThrow("Invalid skill name");
    });

    it("should reject names with path traversal", () => {
      expect(() => validateSkillName("../hack")).toThrow("Invalid skill name");
    });

    it("should reject names with null bytes", () => {
      expect(() => validateSkillName("skill\0name")).toThrow("Invalid skill name");
    });

    it("should reject names with special characters", () => {
      expect(() => validateSkillName("skill!name")).toThrow("Invalid skill name");
      expect(() => validateSkillName("skill@name")).toThrow("Invalid skill name");
      expect(() => validateSkillName("skill#name")).toThrow("Invalid skill name");
    });
  });
});
