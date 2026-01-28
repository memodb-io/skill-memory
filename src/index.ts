const args = process.argv.slice(2);
const command = args[0];

if (command === "ping") {
  console.log("pong");
} else {
  console.log(`skill-memory v0.0.1

Usage:
  skill-memory <command>

Commands:
  ping    Check if the CLI is working

Run 'skill-memory <command> --help' for more information.`);
}
