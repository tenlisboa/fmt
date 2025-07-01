#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

yargs(hideBin(process.argv))
  .scriptName("fmt")
  .usage("$0 <cmd> [args]")
  .commandDir("../commands", { extensions: ["ts", "js"] })
  .demandCommand(1, "You need at least one command before moving on")
  .strict()
  .help()
  .parse();
