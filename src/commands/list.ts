/**
 * List locally installed skills
 */

import { listLocalSkills } from "../lib/local-skills.js";

export async function listCommand(): Promise<void> {
  const skills = await listLocalSkills();

  if (skills.length === 0) {
    console.log("No skills installed. Use 'skill-memory remote add' to add skills.");
    return;
  }

  // Find the longest skill name for alignment
  const maxNameLength = Math.max(...skills.map((s) => s.name.length));

  for (const skill of skills) {
    const paddedName = `@${skill.name}`.padEnd(maxNameLength + 2);
    console.log(`${paddedName} ${skill.description}`);
  }

  console.log();
  console.log(`${skills.length} skill${skills.length === 1 ? "" : "s"} installed`);
}
