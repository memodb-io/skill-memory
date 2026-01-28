/**
 * Tests for repo-reference.ts
 */

import { describe, it, expect } from "vitest";
import {
  parseRepoReference,
  parseSkillReference,
  buildCloneUrl,
  buildFullRef,
} from "../repo-reference.js";

describe("parseRepoReference", () => {
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
      "Only github.com is supported"
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

describe("parseSkillReference", () => {
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
      "Invalid skill reference"
    );
  });

  it("should throw on too many @ symbols", () => {
    expect(() => parseSkillReference("github.com@owner/repo@skill@extra")).toThrow(
      "Invalid skill reference"
    );
  });

  it("should throw on unsupported host", () => {
    expect(() => parseSkillReference("gitlab.com@owner/repo@skill")).toThrow(
      "Only github.com is supported"
    );
  });

  it("should throw on empty skill name", () => {
    expect(() => parseSkillReference("github.com@owner/repo@")).toThrow(
      "Owner, repo, and skill name cannot be empty"
    );
  });
});

describe("buildCloneUrl", () => {
  it("should build correct HTTPS clone URL", () => {
    const url = buildCloneUrl({
      host: "github.com",
      owner: "memodb-io",
      repo: "skill-memory",
    });

    expect(url).toBe("https://github.com/memodb-io/skill-memory.git");
  });
});

describe("buildFullRef", () => {
  it("should build correct full reference string", () => {
    const ref = buildFullRef(
      { host: "github.com", owner: "memodb-io", repo: "skill-memory" },
      "my-skill"
    );

    expect(ref).toBe("github.com@memodb-io/skill-memory@my-skill");
  });
});
