'use strict';
// Build step: copies src/ -> dist/, stamps a content hash into the service worker
// and generates its precache list so installed copies update automatically.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SRC = path.join(__dirname, '..', 'src');
const DIST = path.join(__dirname, '..', 'dist');

function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

function build() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  const files = walk(SRC).sort();
  const hash = crypto.createHash('sha1');
  for (const f of files) {
    hash.update(f).update(fs.readFileSync(path.join(SRC, f)));
  }
  const buildId = hash.digest('hex').slice(0, 10);

  const precache = ['/', ...files.filter(f => f !== 'sw.js').map(f => '/' + f)];

  for (const f of files) {
    const out = path.join(DIST, f);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    if (f === 'sw.js') {
      const text = fs.readFileSync(path.join(SRC, f), 'utf8')
        .replace(/__BUILD__/g, buildId)
        .replace(/__PRECACHE__/g, JSON.stringify(precache));
      fs.writeFileSync(out, text);
    } else {
      fs.copyFileSync(path.join(SRC, f), out);
    }
  }

  const info = { name: 'kids-learning-fun', build: buildId, builtAt: new Date().toISOString(), files: files.length };
  fs.writeFileSync(path.join(DIST, 'build-info.json'), JSON.stringify(info, null, 2));
  console.log(`Built ${files.length} files -> dist/ (build ${buildId})`);
  return info;
}

module.exports = { build, DIST };
if (require.main === module) build();
