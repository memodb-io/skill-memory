/**
 * Find a specific skill in a repository by name
 */

import { dirname } from "path";
import { findSkillFiles, parseSkillFrontmatter } from "./skill-parser.js";
import type { RepoReference } from "../types.js";

/**
 * Find a skill by name in a repository
 * Returns the path to the skill directory, or null if not found
 */
export async function findSkillByName(
  repoPath: string,
  skillName: string,
  repoRef: RepoReference
): Promise<string | null> {
  const skillFiles = await findSkillFiles(repoPath);

  for (const file of skillFiles) {
    try {
      const skill = await parseSkillFrontmatter(file, repoPath, repoRef);

      if (skill.name === skillName) {
        // Return the directory containing the SKILL.md
        return dirname(file);
      }
    } catch {
      // Skip files that can't be parsed
      continue;
    }
  }

  return null;
}
