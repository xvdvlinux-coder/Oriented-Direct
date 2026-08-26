/**
 * Oriented-Direct (.osp) Zero-Dependency Development Server
 * Serves public/dist directory with correct MIME types, Network IP exposure and automatic live watch/rebuild.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { handleBuild, handleWatch } from '../cli/runner.js';
import { DependencyResolver } from '../bundler/resolver.js';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm'
};

/**
 * Automatically discover the machine's local network IPv4 address
 * @returns {string|null} Local network IP address (e.g. 192.168.1.15)
 */
export function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

export class DevServer {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.publicDir = path.resolve(this.cwd, options.outDir || options.publicDir || 'public');
    this.port = Number(options.port) || 3000;
    this.host = options.host || '0.0.0.0';
    this.server = null;
  }

  /**
   * Start HTTP server
   * @returns {Promise<number>} Resolved port
   */
  startServer() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        let reqPath = decodeURIComponent(req.url.split('?')[0]);
        if (reqPath === '/' || reqPath === '') {
          reqPath = '/index.html';
        }

        const filePath = path.join(this.publicDir, reqPath);

        // Security check: ensure path is within publicDir
        if (!filePath.startsWith(this.publicDir)) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('403 Forbidden');
          return;
        }

        fs.stat(filePath, (err, stats) => {
          if (err || !stats.isFile()) {
            // SPA fallback to index.html if file not found
            const indexPath = path.join(this.publicDir, 'index.html');
            if (fs.existsSync(indexPath) && !path.extname(reqPath)) {
              this.serveFile(indexPath, res);
            } else {
              res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end(`404 Not Found: ${reqPath}`);
            }
            return;
          }

          this.serveFile(filePath, res);
        });
      });

      this.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[Oriented-Direct DevServer] Port ${this.port} is in use, trying ${this.port + 1}...`);
          this.port++;
          this.server.listen(this.port, this.host);
        } else {
          reject(err);
        }
      });

      this.server.listen(this.port, this.host, () => {
        resolve(this.port);
      });
    });
  }

  serveFile(filePath, res) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function renderBoxBanner(lines) {
  const maxContentLength = Math.max(...lines.map(l => stripAnsi(l).length), 48);
  const boxWidth = maxContentLength + 4;
  const horizontal = '─'.repeat(boxWidth);

  let banner = `\n\x1b[1;32m┌${horizontal}┐\x1b[0m\n`;
  for (const line of lines) {
    const visualLen = stripAnsi(line).length;
    const paddingRight = ' '.repeat(Math.max(0, boxWidth - visualLen - 2));
    banner += `\x1b[1;32m│\x1b[0m  ${line}${paddingRight}\x1b[1;32m│\x1b[0m\n`;
  }
  banner += `\x1b[1;32m└${horizontal}┘\x1b[0m\n`;
  return banner;
}

/**
 * Run full dev environment (Build -> Watch -> Serve)
 * @param {object} options - CLI & Config options
 */
export async function startDevServer(options = {}) {
  const cwd = options.cwd || process.cwd();
  options.publicMode = true;
  options.bundle = true;
  if (!options.sourcemap) {
    options.sourcemap = 'inline';
  }

  console.log('\x1b[1;36m[Oriented-Direct Dev]\x1b[0m Initializing development environment...');

  // 1. Initial build
  try {
    await handleBuild([], options);
  } catch (err) {
    console.error(err.formattedMessage || err.message || err);
  }

  // 2. Start HTTP Server
  const server = new DevServer({
    cwd,
    outDir: options.outDir || 'public',
    port: options.port || 3000,
    host: options.host || '0.0.0.0'
  });

  const activePort = await server.startServer();
  const relServingDir = (path.relative(cwd, server.publicDir) || '.') + '/';
  const networkIp = getLocalNetworkIp();

  const bannerLines = [
    '\x1b[1mOriented-Direct Dev Server is Running!\x1b[0m',
    '',
    `> \x1b[1mLocal:\x1b[0m    \x1b[36mhttp://localhost:${activePort}\x1b[0m`
  ];

  if (networkIp) {
    bannerLines.push(`> \x1b[1mNetwork:\x1b[0m  \x1b[36mhttp://${networkIp}:${activePort}\x1b[0m`);
  }

  bannerLines.push(`> \x1b[1mServing:\x1b[0m  \x1b[33m${relServingDir}\x1b[0m`);
  bannerLines.push(`> \x1b[1mStatus:\x1b[0m   Auto-recompiling on file changes`);

  const banner = renderBoxBanner(bannerLines);
  console.log(banner);

  // 3. Watch for changes in source files & assets
  const inputPath = path.resolve(cwd, options.inputFile);
  const resolver = new DependencyResolver({ cwd });

  const rebuild = async () => {
    try {
      await handleBuild([], options);
    } catch (err) {
      console.error(err.formattedMessage || err.message || err);
    }
  };

  const watchedFiles = new Set();
  const updateWatchers = () => {
    try {
      if (fs.existsSync(inputPath)) {
        const graph = resolver.resolveGraph(inputPath);
        for (const mod of graph) {
          if (!watchedFiles.has(mod.filePath)) {
            watchedFiles.add(mod.filePath);
            fs.watchFile(mod.filePath, { interval: 250 }, (curr, prev) => {
              if (curr.mtime !== prev.mtime) {
                console.log(`\x1b[1;34m[${new Date().toLocaleTimeString()}]\x1b[0m Recompiling: \x1b[1m${path.relative(cwd, mod.filePath)}\x1b[0m`);
                rebuild();
                updateWatchers();
              }
            });
          }
        }
      }
    } catch {
      // ignore in watch loop
    }
  };

  // Also watch index.html and root CSS files
  const rootAssets = ['index.html', 'styles.css', 'style.css'];
  for (const asset of rootAssets) {
    const assetPath = path.join(cwd, asset);
    if (fs.existsSync(assetPath) && !watchedFiles.has(assetPath)) {
      watchedFiles.add(assetPath);
      fs.watchFile(assetPath, { interval: 300 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          console.log(`\x1b[1;34m[${new Date().toLocaleTimeString()}]\x1b[0m Asset updated: \x1b[1m${asset}\x1b[0m`);
          rebuild();
        }
      });
    }
  }

  updateWatchers();
}
