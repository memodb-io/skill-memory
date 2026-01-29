import { remoteCommand } from "./commands/remote/index.js";
import { listCommand } from "./commands/list.js";
import { initCommand } from "./commands/init.js";
import { deleteCommand } from "./commands/delete.js";
import { copyCommand } from "./commands/copy.js";
import { renameCommand } from "./commands/rename.js";
import { viewCommand } from "./commands/view.js";
import { downloadCommand } from "./commands/download.js";
import { upsertCommand } from "./commands/upsert.js";
import { undoCommand } from "./commands/undo.js";

const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<void> {
  switch (command) {
    case "ping":
      console.log("pong");
      break;

    case "remote":
      await remoteCommand(args.slice(1));
      break;

    case "list":
      await listCommand();
      break;

    case "init":
      await initCommand(args.slice(1));
      break;

    case "delete":
      await deleteCommand(args.slice(1));
      break;

    case "copy":
      await copyCommand(args.slice(1));
      break;

    case "rename":
      await renameCommand(args.slice(1));
      break;

    case "view":
      await viewCommand(args.slice(1));
      break;

    case "download":
      await downloadCommand(args.slice(1));
      break;

    case "upsert":
      await upsertCommand(args.slice(1));
      break;

    case "undo":
      await undoCommand();
      break;

    default:
      printHelp();
      break;
  }
}

function printHelp(): void {
  console.log(`skill-memory v0.0.1

Usage:
  skill-memory <command>

Commands:
  ping              Check if the CLI is working
  remote list       List skills in a remote repository
  remote add        Add a skill from a remote repository
  list              List locally installed skills
  init              Create a new skill from template
  delete            Remove a skill from local library
  copy              Duplicate a skill with a new name
  rename            Rename an existing skill
  view              View a file from a local skill
  download          Download a file/folder from a skill
  upsert            Upload a file to a skill
  undo              Undo the last skill-memory operation

Run 'skill-memory <command> --help' for more information.`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
