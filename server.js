'use strict';
// Zero-dependency static web server for the built app (dist/).
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, 'dist');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};
const COMPRESS = new Set(['.html', '.css', '.js', '.json', '.webmanifest', '.svg', '.txt']);
const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; media-src 'self' data: blob:; object-src 'none'; " +
    "base-uri 'self'; frame-ancestors 'self'",
};
const gzipCache = new Map();

function ensureBuilt() {
  if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
    console.log('dist/ not found - running build first...');
    require('./scripts/build').build();
  }
}

function send(res, status, headers, body) {
  res.writeHead(status, { ...SECURITY, ...headers });
  res.end(body);
}

function createServer() {
  ensureBuilt();
  return http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return send(res, 405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain' }, 'Method Not Allowed');
    }
    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    } catch {
      return send(res, 400, { 'Content-Type': 'text/plain' }, 'Bad Request');
    }
    if (urlPath === '/health') {
      return send(res, 200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        JSON.stringify({ status: 'ok', uptime: Math.round(process.uptime()) }));
    }
    if (urlPath.endsWith('/')) urlPath += 'index.html';

    const file = path.normalize(path.join(ROOT, urlPath));
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
      return send(res, 404, { 'Content-Type': 'text/plain' }, 'Not Found');
    }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) {
        return send(res, 404, { 'Content-Type': 'text/plain' }, 'Not Found');
      }
      const ext = path.extname(file).toLowerCase();
      const etag = `"${st.size.toString(16)}-${Math.round(st.mtimeMs).toString(16)}"`;
      const noCache = /(^|[\\/])(index\.html|sw\.js|manifest\.webmanifest|build-info\.json)$/.test(file);
      const headers = {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        ETag: etag,
        'Cache-Control': noCache ? 'no-cache' : 'public, max-age=86400',
        Vary: 'Accept-Encoding',
      };
      if (req.headers['if-none-match'] === etag) return send(res, 304, headers);

      fs.readFile(file, (e, data) => {
        if (e) return send(res, 500, { 'Content-Type': 'text/plain' }, 'Server Error');
        let body = data;
        if (COMPRESS.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
          const key = file + etag;
          if (!gzipCache.has(key)) gzipCache.set(key, zlib.gzipSync(data));
          body = gzipCache.get(key);
          headers['Content-Encoding'] = 'gzip';
        }
        headers['Content-Length'] = body.length;
        send(res, 200, headers, req.method === 'HEAD' ? undefined : body);
      });
    });
  });
}

module.exports = { createServer };

if (require.main === module) {
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || '0.0.0.0';
  const server = createServer();
  server.listen(PORT, HOST, () => console.log(`Little Learners running on http://${HOST}:${PORT}`));
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
