import { parseArgs } from "node:util";

import Discord from "./lib/discord.js";
import commands from "./commands.json" with { type: "json" };
import config from "./config.json" with { type: "json" };
const { botToken, appId, guildId } = config;

async function main() {
  const { values: options, positionals: args } = parseArgs({
    allowPositionals: true,
    options: {
      global: {
        type: "boolean",
        short: "g",
        default: false,
      },
    }});

  // Get arguments.
  if (args.length <= 0) {
    console.error("Required argument subcommand");
    process.exit(1);
  }
  const subcommand = args[0];

  // Execute.
  const discord = new Discord(botToken, appId, {
    guildId: options.global ? "" : guildId,
  });
  switch (subcommand) {
    case "list":
      {
        const { ok, value } = await discord.listCommand();
        console.dir(value, { depth: null });
      }
      break;

    case "add":
      {
        if (args.length <= 1) {
          console.error("Required argument command name");
          process.exit(1);
        }
        const commandName = args[1];

        const command = commands[commandName];
        if (!command) {
          console.error("Invalid command name");
          process.exit(1);
        }

        const { ok, value } = await discord.addCommand(command);
        console.dir(value, { depth: null });
      }
      break;

    case "remove":
      {
        if (args.length <= 1) {
          console.error("Required argument command ID");
          process.exit(1);
        }
        const commandId = args[1];

        const { ok, value } = await discord.removeCommand(commandId);
        console.dir(value, { depth: null });
      }
      break;

    default:
      console.error("Invalid subcommand");
      process.exit(1);
      break;
  }
}

main().catch(console.error);
