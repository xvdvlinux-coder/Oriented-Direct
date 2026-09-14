#!/usr/bin/env node

/**
 * Oriented-Direct CLI Entry Point
 * Version: 2.0.0 (ClandleLoop)
 * Strictly zero emojis.
 */

import { runCli } from '../src/cli/runner.js';
import { SafetyError } from '../src/index.js';

runCli(process.argv).catch((err) => {
  if (err instanceof SafetyError || err?.name === 'SafetyError') {
    console.error(err.formattedMessage || err.message);
    process.exit(1);
  }
  console.error('[Oriented-Direct Fatal]', err);
  process.exit(1);
});
