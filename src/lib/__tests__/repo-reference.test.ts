/**
 * Tests for repo-reference.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { homedir } from "os";
import { resolve } from "path";
import {
  parseRepoReference,
  parseSkillReference,
  buildCloneUrl,
  buildFullRef,
  isLocalRef,
  isGithubRef,
  isLocalSkillRef,
  isGithubSkillRef,
} from "../repo-reference.js";

describe("parseRepoReference", () => {
  describe("GitHub references", () => {
    it("should parse valid repo reference", () => {
      const result = parseRepoReference("github.com@memodb-io/skill-memory");

      expect(result).toEqual({
        host: "github.com",
        owner: "memodb-io",
        repo: "skill-memory",
      });
    });

    it("should parse repo with hyphenated names", () => {
      const result = parseRepoReference("github.com@my-org/my-repo-name");

      expect(result).toEqual({
        host: "github.com",
        owner: "my-org",
        repo: "my-repo-name",
      });
    });

    it("should throw on missing @ symbol", () => {
      expect(() => parseRepoReference("github.com/owner/repo")).toThrow(
        "Invalid repo reference"
      );
    });

    it("should throw on unsupported host", () => {
      expect(() => parseRepoReference("gitlab.com@owner/repo")).toThrow(
        "Supported hosts: github.com, localhost"
      );
    });

    it("should throw on missing slash", () => {
      expect(() => parseRepoReference("github.com@owner")).toThrow(
        "Invalid repo reference"
      );
    });

    it("should throw on extra slashes", () => {
      expect(() => parseRepoReference("github.com@owner/repo/extra")).toThrow(
        "Invalid repo reference"
      );
    });

    it("should throw on empty owner", () => {
      expect(() => parseRepoReference("github.com@/repo")).toThrow(
        "Owner and repo cannot be empty"
      );
    });

    it("should throw on empty repo", () => {
      expect(() => parseRepoReference("github.com@owner/")).toThrow(
        "Owner and repo cannot be empty"
      );
    });
  });

  describe("localhost references", () => {
    it("should parse absolute path", () => {
      const result = parseRepoReference("localhost@/home/user/skills");

      expect(result).toEqual({
        host: "localhost",
        path: "/home/user/skills",
      });
    });

    it("should resolve relative path from cwd", () => {
      const result = parseRepoReference("localhost@./my-skills");

      expect(result).toEqual({
        host: "localhost",
        path: resolve(process.cwd(), "./my-skills"),
      });
    });

    it("should resolve parent path from cwd", () => {
      const result = parseRepoReference("localhost@../shared-skills");

      expect(result).toEqual({
        host: "localhost",
        path: resolve(process.cwd(), "../shared-skills"),
      });
    });

    it("should expand tilde to home directory", () => {
      const result = parseRepoReference("localhost@~/skills");

      expect(result).toEqual({
        host: "localhost",
        path: resolve(homedir(), "skills"),
      });
    });

    it("should handle tilde alone", () => {
      const result = parseRepoReference("localhost@~");

      expect(result).toEqual({
        host: "localhost",
        path: homedir(),
      });
    });

    it("should throw on empty path", () => {
      expect(() => parseRepoReference("localhost@")).toThrow(
        "Path cannot be empty"
      );
    });

    it("should handle paths with spaces", () => {
      const result = parseRepoReference("localhost@/home/user/my skills");

      expect(result).toEqual({
        host: "localhost",
        path: "/home/user/my skills",
      });
    });

    it("should handle deep nested paths", () => {
      const result = parseRepoReference("localhost@/home/user/projects/skills/v2");

      expect(result).toEqual({
        host: "localhost",
        path: "/home/user/projects/skills/v2",
      });
    });

    it("should handle trailing slash (normalized by resolve)", () => {
      const result = parseRepoReference("localhost@/home/user/skills/");

      // Note: resolve() normalizes the path and removes trailing slash
      expect(result).toEqual({
        host: "localhost",
        path: "/home/user/skills",
      });
    });
  });
});

describe("parseSkillReference", () => {
  describe("GitHub skill references", () => {
    it("should parse valid skill reference", () => {
      const result = parseSkillReference("github.com@memodb-io/skill-memory@skill-memory");

      expect(result).toEqual({
        host: "github.com",
        owner: "memodb-io",
        repo: "skill-memory",
        skillName: "skill-memory",
      });
    });

    it("should parse skill with hyphenated names", () => {
      const result = parseSkillReference("github.com@my-org/my-repo@my-skill-name");

      expect(result).toEqual({
        host: "github.com",
        owner: "my-org",
        repo: "my-repo",
        skillName: "my-skill-name",
      });
    });

    it("should throw on missing skill name (only one @)", () => {
      expect(() => parseSkillReference("github.com@owner/repo")).toThrow(
        "Invalid repo reference"
      );
    });

    it("should throw on unsupported host", () => {
      expect(() => parseSkillReference("gitlab.com@owner/repo@skill")).toThrow(
        "Supported hosts: github.com, localhost"
      );
    });

    it("should throw on empty skill name", () => {
      expect(() => parseSkillReference("github.com@owner/repo@")).toThrow(
        "Skill name cannot be empty"
      );
    });
  });

  describe("localhost skill references", () => {
    it("should parse absolute path skill reference", () => {
      const result = parseSkillReference("localhost@/home/user/skills@xlsx");

      expect(result).toEqual({
        host: "localhost",
        path: "/home/user/skills",
        skillName: "xlsx",
      });
    });

    it("should parse relative path skill reference", () => {
      const result = parseSkillReference("localhost@./my-skills@pdf");

      expect(result).toEqual({
        host: "localhost",
        path: resolve(process.cwd(), "./my-skills"),
        skillName: "pdf",
      });
    });

    it("should parse tilde path skill reference", () => {
      const result = parseSkillReference("localhost@~/skills@my-skill");

      expect(result).toEqual({
        host: "localhost",
        path: resolve(homedir(), "skills"),
        skillName: "my-skill",
      });
    });

    it("should throw on empty skill name", () => {
      expect(() => parseSkillReference("localhost@/path@")).toThrow(
        "Skill name cannot be empty"
      );
    });

    it("should throw on missing skill name (only has repo ref)", () => {
      // localhost@/path is a valid repo reference but not a skill reference
      // parseSkillReference uses lastIndexOf, so it tries to parse "localhost" as a repo
      expect(() => parseSkillReference("localhost@/path")).toThrow(
        "Invalid repo reference"
      );
    });
  });
});

describe("buildCloneUrl", () => {
  it("should build correct HTTPS clone URL for GitHub", () => {
    const url = buildCloneUrl({
      host: "github.com",
      owner: "memodb-io",
      repo: "skill-memory",
    });

    expect(url).toBe("https://github.com/memodb-io/skill-memory.git");
  });
});

describe("buildFullRef", () => {
  it("should build correct full reference string for GitHub", () => {
    const ref = buildFullRef(
      { host: "github.com", owner: "memodb-io", repo: "skill-memory" },
      "my-skill"
    );

    expect(ref).toBe("github.com@memodb-io/skill-memory@my-skill");
  });

  it("should build correct full reference string for localhost", () => {
    const ref = buildFullRef(
      { host: "localhost", path: "/home/user/skills" },
      "my-skill"
    );

    expect(ref).toBe("localhost@/home/user/skills@my-skill");
  });
});

describe("type guards", () => {
  describe("isLocalRef", () => {
    it("should return true for localhost reference", () => {
      expect(isLocalRef({ host: "localhost", path: "/path" })).toBe(true);
    });

    it("should return false for GitHub reference", () => {
      expect(isLocalRef({ host: "github.com", owner: "owner", repo: "repo" })).toBe(false);
    });
  });

  describe("isGithubRef", () => {
    it("should return true for GitHub reference", () => {
      expect(isGithubRef({ host: "github.com", owner: "owner", repo: "repo" })).toBe(true);
    });

    it("should return false for localhost reference", () => {
      expect(isGithubRef({ host: "localhost", path: "/path" })).toBe(false);
    });
  });

  describe("isLocalSkillRef", () => {
    it("should return true for localhost skill reference", () => {
      expect(isLocalSkillRef({ host: "localhost", path: "/path", skillName: "skill" })).toBe(true);
    });

    it("should return false for GitHub skill reference", () => {
      expect(isLocalSkillRef({ host: "github.com", owner: "owner", repo: "repo", skillName: "skill" })).toBe(false);
    });
  });

  describe("isGithubSkillRef", () => {
    it("should return true for GitHub skill reference", () => {
      expect(isGithubSkillRef({ host: "github.com", owner: "owner", repo: "repo", skillName: "skill" })).toBe(true);
    });

    it("should return false for localhost skill reference", () => {
      expect(isGithubSkillRef({ host: "localhost", path: "/path", skillName: "skill" })).toBe(false);
    });
  });
});
