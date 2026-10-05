// Sert la version web exportée de l'application (pnpm e2e:build), avec repli sur index.html.
import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { WEB_URL } from './supabase.mjs';

const dir = fileURLToPath(new URL('../.web', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
};

http
  .createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, WEB_URL).pathname)).replace(
      /^(\.\.[/\\])+/,
      '',
    );
    let file = join(dir, path);
    if (!existsSync(file) || statSync(file).isDirectory()) {
      file = existsSync(`${file}.html`) ? `${file}.html` : join(dir, 'index.html');
    }
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  })
  .listen(Number(new URL(WEB_URL).port), '127.0.0.1');
