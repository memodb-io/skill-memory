/**
 * View git commit history of skill-memory operations
 */

import { getSkillsDir } from "../lib/paths.js";
import { dirExists } from "../lib/fs-utils.js";
import { isGitRepo, getCommitCount, getGitHistory } from "../lib/git.js";

interface HistoryArgs {
  offset: number;
  limit: number;
}

function parseArgs(args: string[]): HistoryArgs {
  let offset = 0;
  let limit = 20;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--offset" && i + 1 < args.length) {
      offset = parseInt(args[i + 1], 10) || 0;
      i++;
    } else if (args[i] === "--limit" && i + 1 < args.length) {
      limit = parseInt(args[i + 1], 10) || 20;
      i++;
    }
  }

  return { offset, limit };
}

export async function historyCommand(args: string[]): Promise<void> {
  const { offset, limit } = parseArgs(args);
  const skillsDir = getSkillsDir();

  // Check if skills directory exists
  if (!(await dirExists(skillsDir))) {
    console.error("Error: Skills directory not found.");
    process.exit(1);
  }

  // Check if git repo exists
  if (!(await isGitRepo(skillsDir))) {
    console.error("Error: No git repository in skills directory.");
    process.exit(1);
  }

  // Get total commit count
  const totalCount = await getCommitCount(skillsDir);
  if (totalCount === 0) {
    console.log("No history found. Run some skill-memory commands first.");
    return;
  }

  // Get history entries
  const entries = await getGitHistory(skillsDir, offset, limit);

  if (entries.length === 0) {
    console.log("No more history entries.");
    return;
  }

  // Calculate display range
  const startNum = offset + 1;
  const endNum = offset + entries.length;

  console.log(`History (showing ${startNum}-${endNum} of ${totalCount}):\n`);

  for (const entry of entries) {
    console.log(`  ${entry.date}  ${entry.message}`);
  }
}
