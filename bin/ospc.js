#!/usr/bin/env node

/**
 * Oriented-Direct CLI Entry Point
 */

import { runCli } from '../src/cli/runner.js';

runCli(process.argv).catch((err) => {
  console.error('[Oriented-Direct Fatal]', err);
  process.exit(1);
});
