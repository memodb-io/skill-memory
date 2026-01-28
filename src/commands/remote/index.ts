/**
 * Remote command router
 */

import { listCommand } from "./list.js";
import { addCommand } from "./add.js";

export async function remoteCommand(args: string[]): Promise<void> {
  const subcommand = args[0];

  switch (subcommand) {
    case "list":
      await listCommand(args.slice(1));
      break;

    case "add":
      await addCommand(args.slice(1));
      break;

    default:
      printHelp();
      break;
  }
}

function printHelp(): void {
  console.log(`Usage: skill-memory remote <subcommand> [options]

Subcommands:
  list <repo>     List all skills in a remote repository
                  Example: skill-memory remote list github.com@owner/repo

  add <skill>     Add a skill from a remote repository
                  Example: skill-memory remote add github.com@owner/repo@skill
                  Options:
                    --rename <name>   Use a custom local name for the skill

Run 'skill-memory remote <subcommand> --help' for more information.`);
}
