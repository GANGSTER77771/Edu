'use strict';
const fs = require('fs');
const path = require('path');

const LABELS = {
  '/index.html': 'Bosh sahifa',
  '/library.html': 'Kutubxona',
  '/books.html': 'Barcha kitoblar',
  '/tests.html': 'Testlar',
  '/about.html': 'Sayt haqida'
};

const root = path.join(__dirname, '..');
const files = process.argv.slice(2);

let total = 0;
for (const f of files) {
  const p = path.join(root, f);
  let html = fs.readFileSync(p, 'utf8');
  let count = 0;
  html = html.replace(
    /<a href="(\/[a-z-]+\.html)"(?: title="([^"]*)")?(?: aria-label="([^"]*)")?><i class="(fa-[^"]+)" aria-hidden="true"><\/i>([^<]*)<\/a>/g,
    (m, href, oldTitle, oldLabel, icon, label) => {
      if (!LABELS[href]) return m;
      const text = (oldTitle || oldLabel || label || '').trim() || LABELS[href];
      count++;
      return `<a href="${href}" title="${text}" aria-label="${text}"><i class="${icon}" aria-hidden="true"></i><span>${text}</span></a>`;
    }
  );
  if (count) {
    fs.writeFileSync(p, html);
    total += count;
    console.log(`${f}: ${count} havola`);
  }
}
console.log(`Jami: ${total}`);
