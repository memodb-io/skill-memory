/**
 * Delete a locally installed skill or a file from a skill
 */

import { unlink } from "fs/promises";
import { join } from "path";
import { getLocalSkillPath } from "../lib/paths.js";
import { dirExists, fileExists, rmDir } from "../lib/fs-utils.js";
import { parseSkillPathRef } from "../lib/skill-path-ref.js";
import { ensureGitReady, commitSkillChange } from "../lib/skill-git.js";

export async function deleteCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.log("Usage: skill-memory delete <@skill> or <@skill/path>");
    console.log("Examples:");
    console.log("  skill-memory delete @xlsx           # delete entire skill");
    console.log("  skill-memory delete @xlsx/file.py   # delete file from skill");
    process.exit(1);
  }

  const input = args[0];

  // Parse as skill path reference (allow empty path for skill-only deletion)
  let skillName: string;
  let filePath: string;
  try {
    const ref = parseSkillPathRef(input, true); // allowEmptyPath = true
    skillName = ref.skillName;
    filePath = ref.filePath;
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }

  const skillPath = getLocalSkillPath(skillName);

  // Check if skill exists
  if (!(await dirExists(skillPath))) {
    console.error(`Error: Skill '${skillName}' not found.`);
    process.exit(1);
  }

  if (filePath) {
    // Delete a file from the skill
    const targetPath = join(skillPath, filePath);

    if (!(await fileExists(targetPath))) {
      console.error(`Error: File '${filePath}' not found in skill '${skillName}'.`);
      process.exit(1);
    }

    await ensureGitReady();
    await unlink(targetPath);

    console.log(`Deleted: @${skillName}/${filePath}`);

    await commitSkillChange({
      type: "chore",
      scope: skillName,
      description: `delete ${filePath}`,
    });
  } else {
    // Delete entire skill (existing behavior)
    await ensureGitReady();
    await rmDir(skillPath);

    console.log(`Deleted skill: @${skillName}`);

    await commitSkillChange({
      type: "chore",
      scope: skillName,
      description: "delete skill",
    });
  }
}
