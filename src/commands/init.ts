/**
 * Initialize a new skill from template
 */

import { mkdir, writeFile } from "fs/promises";
import { getSkillsDir, getLocalSkillPath, ensureDir } from "../lib/paths.js";
import { dirExists } from "../lib/fs-utils.js";
import { parseLocalSkillName } from "../lib/local-skill-ref.js";
import { generateSkillTemplate } from "../lib/templates.js";
import { ensureGitReady, commitSkillChange } from "../lib/skill-git.js";
import { join } from "path";

export async function initCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.log("Usage: skill-memory init <skill-name>");
    console.log("Example: skill-memory init @my-skill");
    process.exit(1);
  }

  const input = args[0];

  // Parse and validate skill name
  let name: string;
  try {
    name = parseLocalSkillName(input);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }

  // Get the skill path
  const skillPath = getLocalSkillPath(name);

  // Check if skill already exists
  if (await dirExists(skillPath)) {
    console.error(`Error: Skill '${name}' already exists.`);
    process.exit(1);
  }

  // Ensure skills directory exists
  await ensureDir(getSkillsDir());

  // Ensure git repo is ready BEFORE creating skill (for proper migration)
  await ensureGitReady();

  // Create skill directory
  await mkdir(skillPath, { recursive: true });

  // Write template SKILL.md
  const template = generateSkillTemplate(name);
  await writeFile(join(skillPath, "SKILL.md"), template, "utf-8");

  console.log(`Created skill: @${name}`);

  // Commit the new skill
  await commitSkillChange({
    type: "feat",
    scope: name,
    description: "initialize new skill",
  });
}
