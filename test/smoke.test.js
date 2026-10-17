'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { build } = require('../scripts/build');
const { createServer } = require('../server');

let server, port;
test.before(async () => {
  build();
  server = createServer();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
});
test.after(() => server.close());

const get = (p, opts = {}) => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port, path: p, method: opts.method || 'GET', headers: opts.headers || {} }, res => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
  });
  req.on('error', reject);
  req.end();
});

test('home page is served with security headers', async () => {
  const r = await get('/');
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /text\/html/);
  assert.ok(r.headers['content-security-policy']);
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.match(r.body.toString(), /Kids Learning Fun/);
});

test('assets have the right MIME types', async () => {
  for (const [p, re] of [['/app.js', /javascript/], ['/styles.css', /css/], ['/manifest.webmanifest', /manifest\+json/],
    ['/icon-192.png', /image\/png/], ['/icon.svg', /svg/]]) {
    const r = await get(p);
    assert.equal(r.status, 200, p);
    assert.match(r.headers['content-type'], re, p);
  }
});

test('service worker has build hash and precache list injected', async () => {
  const r = await get('/sw.js');
  const t = r.body.toString();
  assert.ok(!t.includes('__BUILD__') && !t.includes('__PRECACHE__'));
  assert.match(t, /kids-learning-[0-9a-f]{10}/);
  assert.match(t, /"\/app\.js"/);
});

test('health endpoint', async () => {
  const r = await get('/health');
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(r.body).status, 'ok');
});

test('gzip and ETag/304', async () => {
  const z = await get('/app.js', { headers: { 'accept-encoding': 'gzip' } });
  assert.equal(z.headers['content-encoding'], 'gzip');
  const n = await get('/app.js', { headers: { 'if-none-match': z.headers.etag } });
  assert.equal(n.status, 304);
});

test('path traversal and unknown paths are blocked', async () => {
  for (const p of ['/../server.js', '/%2e%2e/server.js', '/..%2fpackage.json', '/nope.html']) {
    const r = await get(p);
    assert.equal(r.status, 404, p);
  }
});

test('only GET/HEAD allowed', async () => {
  assert.equal((await get('/', { method: 'POST' })).status, 405);
  assert.equal((await get('/', { method: 'HEAD' })).status, 200);
});
