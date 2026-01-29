/**
 * Skill path reference parsing for @skill/path format
 */

/**
 * Represents a parsed skill path reference
 */
export interface SkillPathRef {
  skillName: string; // e.g., "xlsx"
  filePath: string; // e.g., "SKILL.md", "path/to/file.py", or "" for entire skill
}

/**
 * Parse a skill path reference from @skill/path format
 * @param input - The skill path reference (e.g., "@xlsx/SKILL.md" or "@xlsx/" for entire skill)
 * @param allowEmptyPath - If true, allows empty file path (for downloading entire skill)
 * @returns The parsed skill path reference
 * @throws Error if the format is invalid
 */
export function parseSkillPathRef(
  input: string,
  allowEmptyPath: boolean = false
): SkillPathRef {
  // Trim whitespace first
  const trimmed = input.trim();

  // Must start with @
  if (!trimmed.startsWith("@")) {
    throw new Error(
      `Invalid skill path reference: must start with '@'. Got: ${input}`
    );
  }

  // Remove @ prefix
  const withoutAt = trimmed.slice(1);

  // Find the first slash to separate skill name from file path
  const slashIndex = withoutAt.indexOf("/");

  let skillName: string;
  let filePath: string;

  if (slashIndex === -1) {
    // No slash - could be just skill name if allowEmptyPath is true
    if (allowEmptyPath) {
      skillName = withoutAt.trim();
      filePath = "";
    } else {
      throw new Error(
        `Invalid skill path reference: must include file path after skill name. Got: ${input}`
      );
    }
  } else {
    skillName = withoutAt.slice(0, slashIndex).trim();
    filePath = withoutAt.slice(slashIndex + 1).trim();
  }

  // Validate skill name
  if (!skillName) {
    throw new Error("Invalid skill path reference: skill name cannot be empty");
  }

  // Check for path traversal in skill name
  if (
    skillName.includes("..") ||
    skillName.includes("/") ||
    skillName.includes("\\")
  ) {
    throw new Error("Invalid skill name: path traversal not allowed");
  }

  // Validate file path (if not empty)
  if (filePath) {
    // Check for path traversal in file path
    if (filePath.includes("..")) {
      throw new Error("Invalid path: traversal not allowed");
    }

    // Check for null bytes in file path
    if (filePath.includes("\0")) {
      throw new Error("Invalid skill path reference: null bytes not allowed");
    }
  } else if (!allowEmptyPath) {
    throw new Error("Invalid skill path reference: file path cannot be empty");
  }

  // Check for null bytes in skill name
  if (skillName.includes("\0")) {
    throw new Error("Invalid skill path reference: null bytes not allowed");
  }

  // Validate skill name characters (only alphanumeric, dashes, and underscores)
  const validSkillNamePattern = /^[a-zA-Z0-9_-]+$/;
  if (!validSkillNamePattern.test(skillName)) {
    throw new Error(
      "Invalid skill name: only alphanumeric characters, dashes, and underscores are allowed"
    );
  }

  // Normalize file path (remove leading/trailing slashes)
  const normalizedFilePath = filePath
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\/+/g, "/");

  return {
    skillName,
    filePath: normalizedFilePath,
  };
}
