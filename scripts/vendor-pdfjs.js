'use strict';

const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build');
const dest = path.join(__dirname, '..', 'public', 'vendor', 'pdfjs');
fs.mkdirSync(dest, { recursive: true });
for (const f of ['pdf.min.mjs', 'pdf.worker.min.mjs']) {
  fs.copyFileSync(path.join(src, f), path.join(dest, f));
  console.log('[vendor] ' + f + ' nusxalandi');
}
