/**
 * Tests for fs-utils.ts
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { dirExists, fileExists, copyDir } from "../fs-utils.js";

const TEST_DIR = join(tmpdir(), "fs-utils-tests", Date.now().toString());

describe("dirExists", () => {
  beforeAll(async () => {
    await mkdir(join(TEST_DIR, "existing-dir"), { recursive: true });
    await writeFile(join(TEST_DIR, "existing-file.txt"), "test");
  });

  afterAll(async () => {
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should return true for existing directory", async () => {
    const result = await dirExists(join(TEST_DIR, "existing-dir"));
    expect(result).toBe(true);
  });

  it("should return false for non-existing directory", async () => {
    const result = await dirExists(join(TEST_DIR, "non-existing-dir"));
    expect(result).toBe(false);
  });

  it("should return false for a file", async () => {
    const result = await dirExists(join(TEST_DIR, "existing-file.txt"));
    expect(result).toBe(false);
  });
});

describe("fileExists", () => {
  beforeAll(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    await writeFile(join(TEST_DIR, "test-file.txt"), "test content");
  });

  afterAll(async () => {
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should return true for existing file", async () => {
    const result = await fileExists(join(TEST_DIR, "test-file.txt"));
    expect(result).toBe(true);
  });

  it("should return false for non-existing file", async () => {
    const result = await fileExists(join(TEST_DIR, "non-existing-file.txt"));
    expect(result).toBe(false);
  });
});

describe("copyDir", () => {
  const srcDir = join(TEST_DIR, "copy-src");
  const destDir = join(TEST_DIR, "copy-dest");

  beforeAll(async () => {
    await mkdir(join(srcDir, "subdir"), { recursive: true });
    await writeFile(join(srcDir, "file1.txt"), "content1");
    await writeFile(join(srcDir, "subdir", "file2.txt"), "content2");
  });

  afterAll(async () => {
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should copy directory recursively", async () => {
    await copyDir(srcDir, destDir);

    expect(await fileExists(join(destDir, "file1.txt"))).toBe(true);
    expect(await fileExists(join(destDir, "subdir", "file2.txt"))).toBe(true);
    expect(await dirExists(join(destDir, "subdir"))).toBe(true);
  });
});
