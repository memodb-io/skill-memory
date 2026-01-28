/**
 * Parse SKILL.md files and extract skill information
 */

import { readdir, readFile } from "fs/promises";
import { join, dirname, relative } from "path";
import { parse as parseYaml } from "yaml";
import type { SkillInfo, RepoReference } from "../types.js";
import { buildFullRef } from "./repo-reference.js";

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
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = content.match(frontmatterRegex);

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
