/**
 * Local skill management utilities
 */

import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { parse as parseYaml } from "yaml";
import { getSkillsDir } from "./paths.js";
import { dirExists } from "./fs-utils.js";

/**
 * Represents a locally installed skill
 */
export interface LocalSkill {
  name: string; // Folder name (used as @name reference)
  displayName: string; // From frontmatter, or folder name
  description: string; // From frontmatter
  path: string; // Full path to skill directory
}

/**
 * Extract YAML frontmatter from a markdown file content
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
 * Parse a local skill directory and extract skill information
 */
async function parseLocalSkill(
  skillDir: string,
  name: string
): Promise<LocalSkill | null> {
  const skillPath = join(skillDir, "SKILL.md");

  try {
    const content = await readFile(skillPath, "utf-8");
    const frontmatter = extractFrontmatter(content);

    let displayName = name;
    let description = "No description";

    if (frontmatter) {
      if (typeof frontmatter.name === "string") {
        displayName = frontmatter.name;
      }
      if (typeof frontmatter.description === "string") {
        description = frontmatter.description;
      }
    }

    return {
      name,
      displayName,
      description,
      path: skillDir,
    };
  } catch {
    // SKILL.md doesn't exist or is unreadable
    return null;
  }
}

/**
 * List all locally installed skills
 */
export async function listLocalSkills(): Promise<LocalSkill[]> {
  const skillsDir = getSkillsDir();

  // Check if skills directory exists
  if (!(await dirExists(skillsDir))) {
    return [];
  }

  const entries = await readdir(skillsDir, { withFileTypes: true });
  const skills: LocalSkill[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    // Skip hidden directories
    if (entry.name.startsWith(".")) {
      continue;
    }

    const skillDir = join(skillsDir, entry.name);
    const skill = await parseLocalSkill(skillDir, entry.name);

    if (skill) {
      skills.push(skill);
    }
    // Silently skip directories without valid SKILL.md
  }

  // Sort alphabetically by name
  skills.sort((a, b) => a.name.localeCompare(b.name));

  return skills;
}

/**
 * Get a specific local skill by name
 */
export async function getLocalSkill(name: string): Promise<LocalSkill | null> {
  const skillsDir = getSkillsDir();
  const skillDir = join(skillsDir, name);

  if (!(await dirExists(skillDir))) {
    return null;
  }

  return parseLocalSkill(skillDir, name);
}
