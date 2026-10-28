// Local dev server. In production Vercel serves public/ and runs api/ directly (see vercel.json).
import http from 'node:http';
import { networkInterfaces } from 'node:os';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import comments from './api/comments.js';
import restaurant from './api/restaurant.js';

const PUBLIC_DIR = fileURLToPath(new URL('./public/', import.meta.url));
const PORT = Number(process.env.PORT) || 3100;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const API = { '/api/comments': comments, '/api/restaurant': restaurant };

function pageFor(pathname) {
  if (/^\/r\/[^/]+\/?$/.test(pathname)) return 'index.html';
  if (/^\/r\/[^/]+\/reviews\/?$/.test(pathname)) return 'reviews.html';
  return pathname === '/' ? 'index.html' : pathname.slice(1);
}

http
  .createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');

    // Same helpers Vercel adds to res, so the api/ handlers run unchanged.
    res.status = (code) => ((res.statusCode = code), res);
    res.json = (body) => (res.setHeader('Content-Type', 'application/json'), res.end(JSON.stringify(body)));

    try {
      if (API[pathname]) return await API[pathname](req, res);

      const file = normalize(join(PUBLIC_DIR, pageFor(pathname)));
      if (!file.startsWith(PUBLIC_DIR)) return res.status(403).end();

      res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream');
      res.end(await readFile(file));
    } catch (err) {
      if (err.code === 'ENOENT') return res.status(404).end('Not found');
      console.error(err);
      res.status(500).end('Server error');
    }
  })
  .listen(PORT, '0.0.0.0', () => {
    console.log(`Local:   http://localhost:${PORT}/r/ansaris-home`);
    for (const nets of Object.values(networkInterfaces())) {
      for (const net of nets ?? []) {
        if (net.family === 'IPv4' && !net.internal) console.log(`Network: http://${net.address}:${PORT}/r/ansaris-home`);
      }
    }
  });
