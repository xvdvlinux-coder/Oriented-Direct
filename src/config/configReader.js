/**
 * Oriented-Direct (.osp) Project Configuration Reader
 * Reads configuration from package.json ("osp" field) or osp.json, merged with CLI flags.
 */

import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_CONFIG = {
  entry: null,
  outDir: 'public',
  outFile: 'app.js',
  bundle: false,
  format: 'esm', // 'esm' | 'iife'
  minify: false,
  target: 'browser', // 'browser' | 'node'
  assets: ['index.html', '*.css', 'styles/**/*.css', 'assets/**/*', 'images/**/*'],
  includeRuntime: true
};

/**
 * Find and load project configuration
 * @param {string} cwd - Current working directory
 * @returns {object} Normalized configuration object
 */
export function loadProjectConfig(cwd = process.cwd()) {
  let fileConfig = {};

  // 1. Check for osp.json
  const ospJsonPath = path.join(cwd, 'osp.json');
  if (fs.existsSync(ospJsonPath)) {
    try {
      const raw = fs.readFileSync(ospJsonPath, 'utf-8');
      fileConfig = JSON.parse(raw);
    } catch (err) {
      console.warn(`[Oriented-Direct Warning] Failed to parse '${ospJsonPath}':`, err.message);
    }
  } else {
    // 2. Check for package.json ("osp" or "oriented-direct" field)
    const pkgJsonPath = path.join(cwd, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const raw = fs.readFileSync(pkgJsonPath, 'utf-8');
        const pkg = JSON.parse(raw);
        if (pkg.osp && typeof pkg.osp === 'object') {
          fileConfig = pkg.osp;
        } else if (pkg['oriented-direct'] && typeof pkg['oriented-direct'] === 'object') {
          fileConfig = pkg['oriented-direct'];
        }
      } catch (err) {
        // ignore
      }
    }
  }

  return { ...DEFAULT_CONFIG, ...fileConfig };
}

/**
 * Automatically detect an entry .osp file if not explicitly configured
 * @param {string} cwd - Current working directory
 * @returns {string|null} Path to entry file or null
 */
export function detectDefaultEntry(cwd = process.cwd()) {
  const candidatePaths = [
    'src/index.osp',
    'src/main.osp',
    'src/app.osp',
    'main.osp',
    'app.osp',
    'index.osp'
  ];

  for (const candidate of candidatePaths) {
    const fullPath = path.join(cwd, candidate);
    if (fs.existsSync(fullPath)) {
      return candidate;
    }
  }

  return null;
}
