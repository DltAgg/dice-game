#!/usr/bin/env node
import { argv, stdout } from "node:process";
import { runPlaytestCli } from "./cli.js";

const args = argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  stdout.write(
    [
      "Headless Dice Skirmish AI playtest (no UI).",
      "",
      "Usage: npm run playtest:ai -- [--seed N] [--p1 loadout] [--p2 loadout] [--max-turns N] [--matches N] [--strength fast|standard|strong]",
      "",
      "Loadouts: tempo, control (also deck-tempo, deck-control).",
      "Strength: fast = 1-ply lookahead; standard = minimax + MCTS (default); strong = deeper search.",
      "",
    ].join("\n"),
  );
} else {
  stdout.write(`${runPlaytestCli(args)}\n`);
}
