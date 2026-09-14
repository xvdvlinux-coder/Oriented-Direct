import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const trialsDir = path.resolve(process.cwd(), 'MathL/trials');
const files = fs.readdirSync(trialsDir)
  .filter(f => f.startsWith('trial_') && f.endsWith('.js'))
  .sort();

console.log(`Discovered ${files.length} MathL trial files.`);

let passCount = 0;
let failCount = 0;

for (const file of files) {
  const fullPath = path.join(trialsDir, file);
  const result = spawnSync('node', [fullPath], {
    cwd: process.cwd(),
    encoding: 'utf-8',
    stdio: 'pipe'
  });

  if (result.status === 0) {
    passCount++;
    console.log(`[PASS] ${file}`);
  } else {
    failCount++;
    console.error(`[FAIL] ${file} (Exit code: ${result.status})`);
    if (result.stdout) console.error(result.stdout);
    if (result.stderr) console.error(result.stderr);
  }
}

console.log(`\nResults: ${passCount} PASSED, ${failCount} FAILED out of ${files.length} trials.`);
if (failCount > 0) {
  process.exit(1);
}
