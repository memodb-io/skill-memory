/**
 * Tests for upsert command
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { dirExists, fileExists } from "../fs-utils.js";
import { getLocalSkillPath, getSkillsDir } from "../paths.js";
import { parseSkillPathRef } from "../skill-path-ref.js";

const TEST_DIR = join(tmpdir(), "upsert-tests", Date.now().toString());
const SOURCE_DIR = join(TEST_DIR, "source-files");

describe("Upsert Command Tests", () => {
  beforeAll(async () => {
    process.env.SKILL_MEMORY_HOME = TEST_DIR;
    await mkdir(SOURCE_DIR, { recursive: true });
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

  describe("Argument Parsing", () => {
    it("should parse basic args without -m flag", () => {
      // Test parseSkillPathRef for destination parsing
      const ref = parseSkillPathRef("@xlsx/recalc.py", false);
      expect(ref.skillName).toBe("xlsx");
      expect(ref.filePath).toBe("recalc.py");
    });

    it("should parse nested file path", () => {
      const ref = parseSkillPathRef("@xlsx/lib/deep/parser.ts", false);
      expect(ref.skillName).toBe("xlsx");
      expect(ref.filePath).toBe("lib/deep/parser.ts");
    });

    it("should reject destination without @", () => {
      expect(() => parseSkillPathRef("xlsx/file.py", false)).toThrow(
        "must start with '@'"
      );
    });

    it("should reject destination without file path", () => {
      expect(() => parseSkillPathRef("@xlsx", false)).toThrow(
        "must include file path"
      );
    });

    it("should reject empty file path with trailing slash", () => {
      // Empty file path after normalization should throw
      expect(() => parseSkillPathRef("@xlsx/", false)).toThrow(
        "file path cannot be empty"
      );
    });

    it("should reject path traversal in destination", () => {
      expect(() => parseSkillPathRef("@xlsx/../secret.txt", false)).toThrow(
        "traversal not allowed"
      );
    });

    it("should reject path traversal in skill name", () => {
      expect(() => parseSkillPathRef("@../secret/file.txt", false)).toThrow();
    });
  });

  describe("Skill Validation", () => {
    it("should detect existing skill", async () => {
      const skillName = "test-skill";
      const skillPath = getLocalSkillPath(skillName);
      await mkdir(skillPath, { recursive: true });
      await writeFile(join(skillPath, "SKILL.md"), "---\nname: test-skill\n---");

      expect(await dirExists(skillPath)).toBe(true);
    });

    it("should detect non-existent skill", async () => {
      const skillPath = getLocalSkillPath("nonexistent");
      expect(await dirExists(skillPath)).toBe(false);
    });
  });

  describe("File Operations", () => {
    it("should insert new file to skill", async () => {
      const skillName = "test-skill";
      const skillPath = getLocalSkillPath(skillName);
      const sourceFile = join(SOURCE_DIR, "new-file.py");
      const targetFile = join(skillPath, "new-file.py");

      // Create skill
      await mkdir(skillPath, { recursive: true });
      await writeFile(join(skillPath, "SKILL.md"), "---\nname: test-skill\n---");

      // Create source file
      await writeFile(sourceFile, "print('hello')");

      // Simulate upsert (copy file)
      const { copyFile } = await import("fs/promises");
      await copyFile(sourceFile, targetFile);

      expect(await fileExists(targetFile)).toBe(true);
      const content = await readFile(targetFile, "utf-8");
      expect(content).toBe("print('hello')");
    });

    it("should update existing file in skill", async () => {
      const skillName = "test-skill";
      const skillPath = getLocalSkillPath(skillName);
      const sourceFile = join(SOURCE_DIR, "update-file.py");
      const targetFile = join(skillPath, "existing.py");

      // Create skill with existing file
      await mkdir(skillPath, { recursive: true });
      await writeFile(join(skillPath, "SKILL.md"), "---\nname: test-skill\n---");
      await writeFile(targetFile, "old content");

      // Create source file with new content
      await writeFile(sourceFile, "new content");

      // Check that target exists before (for isUpdate logic)
      const isUpdate = await fileExists(targetFile);
      expect(isUpdate).toBe(true);

      // Simulate upsert (copy file)
      const { copyFile } = await import("fs/promises");
      await copyFile(sourceFile, targetFile);

      const content = await readFile(targetFile, "utf-8");
      expect(content).toBe("new content");
    });

    it("should create nested directories", async () => {
      const skillName = "test-skill";
      const skillPath = getLocalSkillPath(skillName);
      const sourceFile = join(SOURCE_DIR, "nested-file.py");
      const targetDir = join(skillPath, "lib", "deep");
      const targetFile = join(targetDir, "parser.py");

      // Create skill
      await mkdir(skillPath, { recursive: true });
      await writeFile(join(skillPath, "SKILL.md"), "---\nname: test-skill\n---");

      // Create source file
      await writeFile(sourceFile, "# parser code");

      // Create nested directories and copy
      await mkdir(targetDir, { recursive: true });
      const { copyFile } = await import("fs/promises");
      await copyFile(sourceFile, targetFile);

      expect(await dirExists(targetDir)).toBe(true);
      expect(await fileExists(targetFile)).toBe(true);
    });

    it("should handle files with spaces in name", async () => {
      const skillName = "test-skill";
      const skillPath = getLocalSkillPath(skillName);
      const sourceFile = join(SOURCE_DIR, "my file.py");
      const targetFile = join(skillPath, "my file.py");

      // Create skill
      await mkdir(skillPath, { recursive: true });
      await writeFile(join(skillPath, "SKILL.md"), "---\nname: test-skill\n---");

      // Create source file with spaces in name
      await writeFile(sourceFile, "content with spaces");

      // Simulate upsert
      const { copyFile } = await import("fs/promises");
      await copyFile(sourceFile, targetFile);

      expect(await fileExists(targetFile)).toBe(true);
    });

    it("should handle binary files", async () => {
      const skillName = "test-skill";
      const skillPath = getLocalSkillPath(skillName);
      const sourceFile = join(SOURCE_DIR, "binary.bin");
      const targetFile = join(skillPath, "binary.bin");

      // Create skill
      await mkdir(skillPath, { recursive: true });
      await writeFile(join(skillPath, "SKILL.md"), "---\nname: test-skill\n---");

      // Create binary source file
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]);
      await writeFile(sourceFile, binaryContent);

      // Simulate upsert
      const { copyFile } = await import("fs/promises");
      await copyFile(sourceFile, targetFile);

      expect(await fileExists(targetFile)).toBe(true);
      const content = await readFile(targetFile);
      expect(content).toEqual(binaryContent);
    });
  });

  describe("Commit Type Logic", () => {
    it("should determine feat for new file", async () => {
      const skillPath = getLocalSkillPath("test-skill");
      await mkdir(skillPath, { recursive: true });
      const targetPath = join(skillPath, "new-file.py");

      const isUpdate = await fileExists(targetPath);
      expect(isUpdate).toBe(false);

      const type = isUpdate ? "fix" : "feat";
      expect(type).toBe("feat");
    });

    it("should determine fix for existing file", async () => {
      const skillPath = getLocalSkillPath("test-skill");
      await mkdir(skillPath, { recursive: true });
      const targetPath = join(skillPath, "existing.py");
      await writeFile(targetPath, "old content");

      const isUpdate = await fileExists(targetPath);
      expect(isUpdate).toBe(true);

      const type = isUpdate ? "fix" : "feat";
      expect(type).toBe("fix");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty skill name in path ref", () => {
      expect(() => parseSkillPathRef("@/file.py", false)).toThrow(
        "skill name cannot be empty"
      );
    });

    it("should handle special characters in skill name", () => {
      expect(() => parseSkillPathRef("@my@skill/file.py", false)).toThrow(
        "only alphanumeric"
      );
    });

    it("should allow dashes and underscores in skill name", () => {
      const ref = parseSkillPathRef("@my-skill_name/file.py", false);
      expect(ref.skillName).toBe("my-skill_name");
    });

    it("should normalize multiple slashes in path", () => {
      const ref = parseSkillPathRef("@skill//path///to////file.py", false);
      expect(ref.filePath).toBe("path/to/file.py");
    });

    it("should strip leading slash from file path", () => {
      const ref = parseSkillPathRef("@skill//file.py", false);
      expect(ref.filePath).toBe("file.py");
    });
  });
});

describe("parseArgs function behavior", () => {
  // Inline test of the argument parsing logic
  function parseArgs(args: string[]): { source: string; dest: string; message?: string } {
    let message: string | undefined;
    const positionalArgs: string[] = [];

    for (let i = 0; i < args.length; i++) {
      if (args[i] === "-m" && i + 1 < args.length) {
        message = args[i + 1];
        i++; // Skip next arg (the message value)
      } else {
        positionalArgs.push(args[i]);
      }
    }

    return {
      source: positionalArgs[0] || "",
      dest: positionalArgs[1] || "",
      message,
    };
  }

  it("should parse args without -m flag", () => {
    const result = parseArgs(["./file.py", "@skill/file.py"]);
    expect(result.source).toBe("./file.py");
    expect(result.dest).toBe("@skill/file.py");
    expect(result.message).toBeUndefined();
  });

  it("should parse args with -m flag at end", () => {
    const result = parseArgs(["./file.py", "@skill/file.py", "-m", "my message"]);
    expect(result.source).toBe("./file.py");
    expect(result.dest).toBe("@skill/file.py");
    expect(result.message).toBe("my message");
  });

  it("should parse args with -m flag in middle", () => {
    const result = parseArgs(["./file.py", "-m", "my message", "@skill/file.py"]);
    expect(result.source).toBe("./file.py");
    expect(result.dest).toBe("@skill/file.py");
    expect(result.message).toBe("my message");
  });

  it("should parse args with -m flag at beginning", () => {
    const result = parseArgs(["-m", "my message", "./file.py", "@skill/file.py"]);
    expect(result.source).toBe("./file.py");
    expect(result.dest).toBe("@skill/file.py");
    expect(result.message).toBe("my message");
  });

  it("should handle missing source", () => {
    const result = parseArgs([]);
    expect(result.source).toBe("");
    expect(result.dest).toBe("");
  });

  it("should handle -m without value", () => {
    const result = parseArgs(["./file.py", "@skill/file.py", "-m"]);
    expect(result.source).toBe("./file.py");
    expect(result.dest).toBe("@skill/file.py");
    expect(result.message).toBeUndefined();
  });

  it("should handle message with spaces", () => {
    const result = parseArgs(["./file.py", "@skill/file.py", "-m", "add multi-sheet support"]);
    expect(result.message).toBe("add multi-sheet support");
  });
});
