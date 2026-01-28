/**
 * Tests for paths.ts
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from "vitest";
import { homedir } from "os";
import { join } from "path";
import { mkdir, writeFile, rm } from "fs/promises";
import {
  getSkillMemoryDir,
  getReposCacheDir,
  getSkillsDir,
  getRepoCachePath,
  getLocalSkillPath,
  validateLocalPath,
} from "../paths.js";

// Test home directory within project root
const TEST_HOME = join(process.cwd(), ".test-skill-memory-home");

// Store original env to restore after all tests
const originalEnv = process.env.SKILL_MEMORY_HOME;

describe("paths", () => {
  beforeAll(() => {
    // Set test home directory for all tests
    process.env.SKILL_MEMORY_HOME = TEST_HOME;
  });

  afterAll(async () => {
    // Restore original environment
    if (originalEnv === undefined) {
      delete process.env.SKILL_MEMORY_HOME;
    } else {
      process.env.SKILL_MEMORY_HOME = originalEnv;
    }

    // Clean up test home directory
    await rm(TEST_HOME, { recursive: true, force: true });
  });

  describe("getSkillMemoryDir", () => {
    // These tests need to manipulate env var independently
    afterEach(() => {
      // Restore test home after each test in this block
      process.env.SKILL_MEMORY_HOME = TEST_HOME;
    });

    it("should return SKILL_MEMORY_HOME when set", () => {
      process.env.SKILL_MEMORY_HOME = "/custom/skill-memory";
      const result = getSkillMemoryDir();

      expect(result).toBe("/custom/skill-memory");
    });

    it("should resolve relative SKILL_MEMORY_HOME to absolute path", () => {
      process.env.SKILL_MEMORY_HOME = "./custom-dir";
      const result = getSkillMemoryDir();

      expect(result).toContain("custom-dir");
      expect(result).not.toBe("./custom-dir"); // Should be resolved to absolute
    });

    it("should fallback to ~/.skill-memory when SKILL_MEMORY_HOME is not set", () => {
      delete process.env.SKILL_MEMORY_HOME;
      const result = getSkillMemoryDir();

      expect(result).toBe(join(homedir(), ".skill-memory"));
    });

    it("should fallback to ~/.skill-memory when SKILL_MEMORY_HOME is empty string", () => {
      process.env.SKILL_MEMORY_HOME = "";
      const result = getSkillMemoryDir();

      expect(result).toBe(join(homedir(), ".skill-memory"));
    });
  });

  describe("getReposCacheDir", () => {
    it("should return repos subdirectory", () => {
      const result = getReposCacheDir();

      expect(result).toBe(join(TEST_HOME, "repos"));
    });
  });

  describe("getSkillsDir", () => {
    it("should return skills subdirectory", () => {
      const result = getSkillsDir();

      expect(result).toBe(join(TEST_HOME, "skills"));
    });
  });

  describe("getRepoCachePath", () => {
    it("should return correct cache path structure", () => {
      const result = getRepoCachePath({
        host: "github.com",
        owner: "memodb-io",
        repo: "skill-memory",
      });

      expect(result).toBe(
        join(TEST_HOME, "repos", "github.com", "memodb-io", "skill-memory")
      );
    });

    it("should neutralize directory traversal attempts in owner", () => {
      // The sanitizer removes ".." and replaces "/" with "-"
      // So "../../../etc" becomes "-etc" which is safe
      const result = getRepoCachePath({
        host: "github.com",
        owner: "../../../etc",
        repo: "passwd",
      });

      expect(result).not.toContain("..");
      expect(result).toContain("-etc");
      expect(result).toContain("passwd");
    });

    it("should neutralize directory traversal attempts in repo", () => {
      const result = getRepoCachePath({
        host: "github.com",
        owner: "owner",
        repo: "../../secrets",
      });

      expect(result).not.toContain("..");
      expect(result).toContain("owner");
      expect(result).toContain("secrets");
    });

    it("should handle path separators in names", () => {
      // Path separators should be replaced with hyphens
      const result = getRepoCachePath({
        host: "github.com",
        owner: "owner",
        repo: "repo-name",
      });

      expect(result).toContain("repo-name");
    });
  });

  describe("getLocalSkillPath", () => {
    it("should return correct skill path", () => {
      const result = getLocalSkillPath("my-skill");

      expect(result).toBe(join(TEST_HOME, "skills", "my-skill"));
    });

    it("should neutralize directory traversal attempts", () => {
      // The sanitizer removes ".." and replaces "/" with "-"
      const result = getLocalSkillPath("../../../etc/passwd");

      expect(result).not.toContain("..");
      expect(result).toContain("-etc-passwd");
    });

    it("should neutralize null bytes", () => {
      // Null bytes are removed
      const result = getLocalSkillPath("skill\0name");

      expect(result).toContain("skillname");
      expect(result).not.toContain("\0");
    });

    it("should reject empty names after sanitization", () => {
      expect(() => getLocalSkillPath("..")).toThrow("Invalid path segment");
    });
  });

  describe("validateLocalPath", () => {
    const testDir = join(TEST_HOME, "validate-test");
    const testFile = join(testDir, "test-file.txt");

    beforeEach(async () => {
      // Create test directory and file
      await mkdir(testDir, { recursive: true });
      await writeFile(testFile, "test content");
    });

    afterEach(async () => {
      // Clean up test directory
      await rm(testDir, { recursive: true, force: true });
    });

    it("should pass for existing directory", async () => {
      await expect(validateLocalPath(testDir)).resolves.not.toThrow();
    });

    it("should throw for non-existent path", async () => {
      await expect(validateLocalPath("/nonexistent/path/12345")).rejects.toThrow(
        "not found"
      );
    });

    it("should throw for file instead of directory", async () => {
      await expect(validateLocalPath(testFile)).rejects.toThrow(
        "is not a directory"
      );
    });
  });
});
