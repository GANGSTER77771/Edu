'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const config = require('./config/env');
const db = require('./config/database');
const fileService = require('./services/file-service');
const { sessionMiddleware } = require('./middleware/auth');
const { csrfMiddleware, csrfProtect } = require('./middleware/csrf');
const limits = require('./middleware/rate-limit');
const { notFound, errorHandler } = require('./middleware/error-handler');

const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/account');
const bookRoutes = require('./routes/books');
const readingRoutes = require('./routes/reading');
const testRoutes = require('./routes/tests');
const teacherRoutes = require('./routes/teacher');
const adminAuthRoutes = require('./routes/admin/auth');
const adminBookRoutes = require('./routes/admin/books');
const adminTaxonomyRoutes = require('./routes/admin/taxonomy');
const adminStatsRoutes = require('./routes/admin/statistics');
const adminSettingsRoutes = require('./routes/admin/settings');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
      'font-src': ["'self'", 'https://cdnjs.cloudflare.com', 'data:'],
      'img-src': ["'self'", 'data:', 'blob:'],
      'connect-src': ["'self'"],
      'worker-src': ["'self'", 'blob:'],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'same-origin' }
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());

// ---- API ----
app.use('/api', csrfMiddleware, csrfProtect, sessionMiddleware, limits.general);
app.use('/api/auth', authRoutes.router);
app.use('/api/account', accountRoutes);
app.use('/api', bookRoutes);
app.use('/api/me', readingRoutes);
app.use('/api', testRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/admin', limits.general, adminAuthRoutes);
app.use('/api/admin', adminBookRoutes);
app.use('/api/admin', adminTaxonomyRoutes);
app.use('/api/admin', adminStatsRoutes);
app.use('/api/admin', adminSettingsRoutes);

// ---- Statik fayllar (faqat ommaviy papkalar; ildiz manba fayllari ochilmaydi) ----
app.use('/css', express.static(path.join(config.root, 'css')));
app.use('/js', express.static(path.join(config.root, 'js')));
app.use('/assets', express.static(path.join(config.root, 'assets')));
app.use('/vendor', express.static(path.join(config.root, 'public', 'vendor')));
app.use('/admin', express.static(path.join(config.root, 'admin')));

// Ildiz sahifalar (whitelist)
const pages = [
  'index.html', 'library.html', 'books.html', 'book.html', 'reader.html',
  'about.html', 'contact.html', 'privacy.html', 'login.html', 'register.html',
  'cabinet.html', 'test.html', 'result.html', 'teacher.html', 'teacher-test.html',
  'teacher-results.html', 'settings.html'
];
app.get('/', (_req, res) => res.sendFile(path.join(config.root, 'index.html')));
for (const page of pages) {
  app.get('/' + page, (_req, res) => res.sendFile(path.join(config.root, page)));
}
app.get('/robots.txt', (_req, res) => res.sendFile(path.join(config.root, 'robots.txt')));
app.get('/sitemap.xml', (_req, res) => res.sendFile(path.join(config.root, 'sitemap.xml')));

app.use(notFound);
app.use(errorHandler);

fileService.ensureDirs();

if (require.main === module) {
  const server = app.listen(config.port, () => {
    const info = db.info();
    console.log(`[edukitob] Server ishga tushdi: http://localhost:${config.port}`);
    console.log(`[edukitob] DB drayver: ${info.driver}${info.sqliteFile ? ' (' + info.sqliteFile + ')' : ''}`);
    console.log(`[edukitob] Rejim: ${config.isProd ? 'production' : 'development'}`);
  });

  async function shutdown() {
    console.log('[edukitob] Yopilmoqda...');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000);
    await db.close().catch(() => {});
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = app;
