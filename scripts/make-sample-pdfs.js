'use strict';

// EDUKITOB demo kitoblari uchun haqiqiy, ochiladigan namuna PDF fayllar yaratadi.
// Ishlab chiqarish materiallari bo'lmagani uchun bu fayllar to'liq shu skriptda
// yaratilgan namuna matnlardan iborat.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'storage', 'pdfs');

function esc(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function pageStream(title, pageNumber, totalPages, bodyLines) {
  const parts = [];
  parts.push(`BT /F1 20 Tf 64 720 Td (${esc(title)}) Tj ET`);
  parts.push(`0.2 0.35 0.6 RG 2 w 64 706 m 548 706 l S`);
  let y = 668;
  for (const line of bodyLines) {
    parts.push(`BT /F1 12 Tf 64 ${y} Td (${esc(line)}) Tj ET`);
    y -= 20;
  }
  parts.push(`BT /F1 10 Tf 500 40 Td (${pageNumber} / ${totalPages}) Tj ET`);
  return parts.join('\n');
}

const PAGE_TEXT = [
  'Bu sahifa EDUKITOB platformasi uchun yaratilgan namuna darslik matni.',
  'Namuna maqsadida har bir sahifada qisqa matn bloklari joylashtirilgan.',
  '',
  'Foydalanuvchi shu PDF orqali quyidagi funksiyalarni sinab ko‘rishi mumkin:',
  '- Brauzer ichida PDF o‘qish',
  '- Sahifalar bo‘yicha navigatsiya',
  '- Kattalashtirish va ekranga moslashtirish',
  '- To‘liq ekran rejimi',
  '- PDF ichidan matn qidirish',
  '- Oxirgi o‘qilgan sahifani saqlash',
  '- Sahifaga xatcho‘p qo‘yish',
  '',
  'Namuna fayl sifatida yaratildi va erkin tarqatiladi.'
];

function buildPdf(title, pageCount) {
  const objects = [];
  // 1: catalog, 2: pages, 3: font, then page+content pairs
  const pageIds = [];
  for (let p = 0; p < pageCount; p++) pageIds.push(4 + p * 2);

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';

  for (let p = 0; p < pageCount; p++) {
    const pid = pageIds[p];
    const cid = pid + 1;
    const isFirst = p === 0;
    const lines = isFirst
      ? [`«${title}»`, '', 'EDUKITOB namuna nashri', 'Bu fayl platformani sinash uchun yaratildi.', ...PAGE_TEXT]
      : PAGE_TEXT;
    objects[pid] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${cid} 0 R >>`;
    const stream = pageStream(title, p + 1, pageCount, lines);
    objects[cid] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`;
  }

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  const size = objects.length;
  pdf += `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let i = 1; i < size; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const files = [];
  for (let c = 1; c <= 11; c++) {
    files.push({ name: `demo-math-${c}.pdf`, title: `Matematika — ${c}-sinf (namuna)`, pages: 8 });
  }
  files.push({ name: 'demo-badiy-1.pdf', title: 'Sehrli bog‘ hikoyalari (namuna)', pages: 10 });
  files.push({ name: 'demo-badiy-2.pdf', title: 'Do‘stlik darslari (namuna)', pages: 10 });
  files.push({ name: 'demo-badiy-3.pdf', title: 'Yashil vodiy sirlari (namuna)', pages: 12 });

  for (const f of files) {
    const buf = buildPdf(f.title, f.pages);
    const dest = path.join(OUT_DIR, f.name);
    fs.writeFileSync(dest, buf);
    console.log(`[samples] ${f.name} (${buf.length} bayt, ${f.pages} sahifa)`);
  }
  console.log('[samples] Tayyor.');
}

main();
