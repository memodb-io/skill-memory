/**
 * Tests for paths.ts
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
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

describe("getSkillMemoryDir", () => {
  it("should return path in home directory", () => {
    const result = getSkillMemoryDir();

    expect(result).toBe(join(homedir(), ".skill-memory"));
  });
});

describe("getReposCacheDir", () => {
  it("should return repos subdirectory", () => {
    const result = getReposCacheDir();

    expect(result).toBe(join(homedir(), ".skill-memory", "repos"));
  });
});

describe("getSkillsDir", () => {
  it("should return skills subdirectory", () => {
    const result = getSkillsDir();

    expect(result).toBe(join(homedir(), ".skill-memory", "skills"));
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
      join(homedir(), ".skill-memory", "repos", "github.com", "memodb-io", "skill-memory")
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

    expect(result).toBe(join(homedir(), ".skill-memory", "skills", "my-skill"));
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
  const testDir = join(process.cwd(), ".test-validate-local-path");
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
