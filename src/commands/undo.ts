import { getSkillsDir } from "../lib/paths.js";
import { dirExists } from "../lib/fs-utils.js";
import { isGitRepo, getCommitCount, getLastCommitMessage, gitResetHard } from "../lib/git.js";

export async function undoCommand(): Promise<void> {
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

  // Check commit count
  const commitCount = await getCommitCount(skillsDir);
  if (commitCount === 0) {
    console.error("Error: No commits to undo. The skills repository has no history.");
    process.exit(1);
  }
  if (commitCount === 1) {
    console.error("Error: Already at the initial commit. Cannot undo further.");
    process.exit(1);
  }

  // Get the commit message before resetting
  const lastMessage = await getLastCommitMessage(skillsDir);

  // Reset to previous commit
  await gitResetHard(skillsDir, "HEAD~1");

  console.log(`Undone: ${lastMessage}`);
  console.log("Skills directory reset to previous state.");
}
