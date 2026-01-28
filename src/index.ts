import { remoteCommand } from "./commands/remote/index.js";

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

Run 'skill-memory <command> --help' for more information.`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
