/**
 * Delete a locally installed skill
 */

import { getLocalSkillPath } from "../lib/paths.js";
import { dirExists, rmDir } from "../lib/fs-utils.js";
import { parseLocalSkillName } from "../lib/local-skill-ref.js";

export async function deleteCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.log("Usage: skill-memory delete <skill-name>");
    console.log("Example: skill-memory delete @xlsx");
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

  // Check if skill exists
  if (!(await dirExists(skillPath))) {
    console.error(`Error: Skill '${name}' not found in local library.`);
    process.exit(1);
  }

  // Delete the skill directory
  await rmDir(skillPath);

  console.log(`Deleted skill: @${name}`);
}
