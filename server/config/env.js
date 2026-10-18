'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

(function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
})();

function intEnv(name, def) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) ? v : def;
}

const config = {
  root: ROOT,
  port: intEnv('PORT', 3000),
  env: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  siteUrl: (process.env.SITE_URL || '').replace(/\/+$/, ''),
  dbClient: process.env.DB_CLIENT || 'auto',
  databaseUrl: process.env.DATABASE_URL || '',
  downloadSignSecret: process.env.DOWNLOAD_SIGN_SECRET || 'edukitob-dev-secret-change-me',
  sessionTtlHours: intEnv('SESSION_TTL_HOURS', 24),
  maxPdfMb: intEnv('MAX_PDF_MB', 100),
  maxImageMb: intEnv('MAX_IMAGE_MB', 5),
  storageDir: process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : path.join(ROOT, 'storage'),
  dataDir: process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data')
};

module.exports = config;
