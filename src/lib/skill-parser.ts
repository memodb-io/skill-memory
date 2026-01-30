/**
 * Parse SKILL.md files and extract skill information
 */

import { readdir, readFile, writeFile } from "fs/promises";
import { join, dirname, relative } from "path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { SkillInfo, RepoReference } from "../types.js";
import { buildFullRef } from "./repo-reference.js";
import { fileExists } from "./fs-utils.js";

/**
 * Regex to match YAML frontmatter block (handles both CRLF and LF)
 */
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;

/**
 * Recursively find all SKILL.md files in a directory
 */
export async function findSkillFiles(dir: string): Promise<string[]> {
  const skillFiles: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip .git and node_modules directories
        if (entry.name === ".git" || entry.name === "node_modules") {
          continue;
        }
        await walk(fullPath);
      } else if (entry.isFile() && entry.name === "SKILL.md") {
        skillFiles.push(fullPath);
      }
    }
  }

  await walk(dir);
  return skillFiles;
}

/**
 * Extract YAML frontmatter from a markdown file
 */
function extractFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(FRONTMATTER_REGEX);

  if (!match) {
    return null;
  }

  try {
    return parseYaml(match[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Get skill name from directory path or frontmatter
 */
function getSkillName(
  frontmatter: Record<string, unknown> | null,
  filePath: string,
  baseDir: string
): string {
  // Try to get name from frontmatter
  if (frontmatter && typeof frontmatter.name === "string") {
    return frontmatter.name;
  }

  // Fall back to parent directory name
  const skillDir = dirname(filePath);
  const relativePath = relative(baseDir, skillDir);

  // Use the immediate parent directory name as the skill name
  const parts = relativePath.split(/[/\\]/);
  return parts[parts.length - 1] || "unknown";
}

/**
 * Get skill description from frontmatter or first paragraph
 */
function getSkillDescription(
  frontmatter: Record<string, unknown> | null,
  content: string
): string {
  // Try to get description from frontmatter
  if (frontmatter && typeof frontmatter.description === "string") {
    return frontmatter.description;
  }

  // Fall back to first non-empty line after frontmatter
  const lines = content.split("\n");
  let foundFrontmatterEnd = false;

  for (const line of lines) {
    if (line.trim() === "---") {
      if (foundFrontmatterEnd) {
        continue;
      }
      foundFrontmatterEnd = true;
      continue;
    }

    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      return trimmed.substring(0, 100);
    }
  }

  return "No description available";
}

/**
 * Parse a SKILL.md file and extract skill information
 */
export async function parseSkillFrontmatter(
  filePath: string,
  baseDir: string,
  repoRef: RepoReference
): Promise<SkillInfo> {
  const content = await readFile(filePath, "utf-8");
  const frontmatter = extractFrontmatter(content);

  const name = getSkillName(frontmatter, filePath, baseDir);
  const description = getSkillDescription(frontmatter, content);
  const skillDir = dirname(filePath);
  const path = relative(baseDir, skillDir);
  const fullRef = buildFullRef(repoRef, name);

  return { name, description, path, fullRef };
}

/**
 * Find and parse all skills in a repository
 */
export async function parseAllSkills(
  repoPath: string,
  repoRef: RepoReference
): Promise<SkillInfo[]> {
  const skillFiles = await findSkillFiles(repoPath);
  const skills: SkillInfo[] = [];

  for (const file of skillFiles) {
    try {
      const skill = await parseSkillFrontmatter(file, repoPath, repoRef);
      skills.push(skill);
    } catch (error) {
      // Skip files that can't be parsed
      console.warn(`Warning: Could not parse ${file}: ${error}`);
    }
  }

  return skills;
}

/**
 * Update the name field in a SKILL.md frontmatter
 * @param skillPath - The path to the skill directory (not the SKILL.md file)
 * @param newName - The new name to set in the frontmatter
 * @returns true if the update was successful, false otherwise
 */
export async function updateSkillFrontmatterName(
  skillPath: string,
  newName: string
): Promise<boolean> {
  const skillFilePath = join(skillPath, "SKILL.md");

  // Check if SKILL.md exists
  if (!(await fileExists(skillFilePath))) {
    // No SKILL.md file, skip update
    console.warn(`Warning: No SKILL.md found in ${skillPath}, skipping frontmatter update`);
    return false;
  }

  let content: string;
  try {
    content = await readFile(skillFilePath, "utf-8");
  } catch (error) {
    console.warn(`Warning: Could not read SKILL.md: ${error}`);
    return false;
  }

  // Detect line ending style (CRLF vs LF)
  const lineEnding = content.includes("\r\n") ? "\r\n" : "\n";

  const match = content.match(FRONTMATTER_REGEX);

  let newContent: string;

  if (match) {
    // Has existing frontmatter - parse and update
    const frontmatterText = match[1];
    let frontmatter: Record<string, unknown>;

    try {
      frontmatter = parseYaml(frontmatterText) as Record<string, unknown>;
      if (frontmatter === null || typeof frontmatter !== "object") {
        frontmatter = {};
      }
    } catch {
      // Malformed YAML - log warning and skip
      console.warn(`Warning: Malformed YAML frontmatter in ${skillFilePath}, skipping update`);
      return false;
    }

    // Update the name field
    frontmatter.name = newName;

    // Stringify back, preserving the order (name first for readability)
    const orderedFrontmatter: Record<string, unknown> = { name: newName };
    for (const [key, value] of Object.entries(frontmatter)) {
      if (key !== "name") {
        orderedFrontmatter[key] = value;
      }
    }

    // Use detected line ending style for consistency
    let newFrontmatterText = stringifyYaml(orderedFrontmatter).trimEnd();
    if (lineEnding === "\r\n") {
      newFrontmatterText = newFrontmatterText.replace(/\n/g, "\r\n");
    }

    // Replace frontmatter in content, preserving line ending style
    newContent = content.replace(FRONTMATTER_REGEX, `---${lineEnding}${newFrontmatterText}${lineEnding}---`);
  } else {
    // No frontmatter - add one at the top
    let newFrontmatterText = stringifyYaml({ name: newName }).trimEnd();
    if (lineEnding === "\r\n") {
      newFrontmatterText = newFrontmatterText.replace(/\n/g, "\r\n");
    }
    newContent = `---${lineEnding}${newFrontmatterText}${lineEnding}---${lineEnding}${lineEnding}${content}`;
  }

  // Write back to file
  try {
    await writeFile(skillFilePath, newContent, "utf-8");
    return true;
  } catch (error) {
    console.warn(`Warning: Could not write SKILL.md: ${error}`);
    return false;
  }
}
