/**
 * Oriented-Direct (.osp) Asset Pipeline
 * Copies static assets (index.html, .css, images, fonts) to the distribution directory.
 */

import fs from 'node:fs';
import path from 'node:path';

export class AssetPipeline {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.outDir = path.resolve(this.cwd, options.outDir || 'public');
    this.assets = options.assets || ['index.html', '*.css', 'styles/**/*.css', 'assets/**/*', 'images/**/*'];
  }

  /**
   * Process and copy all matching static assets to the target outDir
   * @param {string} bundleFileName - Name of the output JS bundle (e.g. 'app.js')
   * @returns {Array<string>} List of copied files
   */
  copyAssets(bundleFileName = 'app.js') {
    if (!fs.existsSync(this.outDir)) {
      fs.mkdirSync(this.outDir, { recursive: true });
    }

    const copiedFiles = [];

    // 1. Copy index.html if exists
    const htmlCandidates = [
      path.join(this.cwd, 'index.html'),
      path.join(this.cwd, 'src', 'index.html'),
      path.join(this.cwd, 'public', 'index.html')
    ];

    let foundHtml = null;
    for (const h of htmlCandidates) {
      if (fs.existsSync(h) && path.resolve(h) !== path.resolve(this.outDir, 'index.html')) {
        foundHtml = h;
        break;
      }
    }

    if (foundHtml) {
      let htmlContent = fs.readFileSync(foundHtml, 'utf-8');
      const targetHtml = path.join(this.outDir, 'index.html');
      fs.writeFileSync(targetHtml, htmlContent, 'utf-8');
      copiedFiles.push('index.html');
    }

    // 2. Scan and copy CSS files
    const scanAndCopyFiles = (dir, ext) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(this.cwd, fullPath);

        // Skip destination outDir, node_modules, .git
        if (
          fullPath.startsWith(this.outDir) ||
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === '.osp_cache'
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          scanAndCopyFiles(fullPath, ext);
        } else if (entry.isFile() && entry.name.endsWith(ext)) {
          const destPath = path.join(this.outDir, entry.name);
          fs.copyFileSync(fullPath, destPath);
          copiedFiles.push(entry.name);
        }
      }
    };

    scanAndCopyFiles(this.cwd, '.css');

    // 3. Copy assets / images folders if they exist
    const assetFolders = ['assets', 'images', 'public/assets', 'static'];
    for (const folder of assetFolders) {
      const srcFolder = path.join(this.cwd, folder);
      if (fs.existsSync(srcFolder) && path.resolve(srcFolder) !== this.outDir) {
        const destFolder = path.join(this.outDir, path.basename(folder));
        this.copyRecursive(srcFolder, destFolder);
        copiedFiles.push(folder + '/');
      }
    }

    return copiedFiles;
  }

  copyRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}
