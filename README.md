# EDUKITOB — 1–11-sinf elektron darsliklari platformasi

O‘zbekiston maktab o‘quvchilari uchun elektron kutubxona va test platformasi:
darsliklarni brauzerda o‘qish (PDF.js), 5 soniyalik himoyalangan taymer orqali yuklab olish,
o‘qituvchi–o‘quvchi test tizimi (kod bilan kirish), to‘liq himoyalangan admin panel.

**Texnologiyalar:** HTML5 + CSS3 + Vanilla JS (frontend) · Node.js + Express (backend) · PostgreSQL (production) yoki `node:sqlite` (lokal, o‘rnatish talab qilmaydi).

---

## 1. Imkoniyatlar

- **Kutubxona:** adabiyot turi → sinf (1–11) → kitob kartalari (muqova, nom, fan, muallif, yil) → batafsil sahifa.
- **PDF o‘quvchi:** sahifalash, zoom, ekranga moslash, to‘liq ekran, matn qidirish, xatcho‘p, o‘qilgan sahifa eslab qolinadi. PDF `storage/` ichida bo‘lib, faqat server endpointi orqali Range so‘rovlar bilan beriladi.
- **Yuklab olish:** 5 soniyalik taymer (UI) + server tomonidan imzolangan 120 soniyalik token. Taymerni JSda aylanib o‘tib bo‘lmaydi.
- **Akkauntlar:** o‘quvchi / o‘qituvchi / admin rollari. O‘qish va yuklab olish ro‘yxatdan o‘tmasdan ham ochiq.
- **Sozlamalar sahifasi** (`/settings.html`): profil va parol, Telegram username, yorug‘/qorong‘i rejim, matn o‘lchami, PDF o‘qish rejimi va davom ettirish, bildirishnoma sozlamalari (bazada saqlanadi), yuklab olish tarixi, faqat Wi-Fi rejimi, keshni tozalash, faol qurilmalar (sessiyalar) boshqaruvi va parol tasdiqlashi bilan hisobni o‘chirish.
- **Test platformasi:** o‘qituvchi savol+variant yaratadi, to‘g‘ri javobni belgilaydi, vaqt/urinish/muddat sozlaydi, **noyob 8-belgili kod** oladi. O‘quvchi kod bilan kirib topshiradi; baholash butunlay serverda, to‘g‘ri javoblar topshirilmaguncha yuborilmaydi. Har bir o‘quvchi faqat o‘z natijasini ko‘radi. O‘qituvchi kim topshirgani, foizi, sarflagan vaqti va savollar kesimidagi statistikani ko‘radi.
- **Admin panel** (`/admin`): dashboard, kitoblar (qo‘shish/tahrirlash/nashr/yashirish/o‘chirish), 30 tagacha bir vaqtda PDF yuklash, CSV/Excel import, fanlar/turlar/tillar, foydalanuvchilar, testlar nazorati, statistika (kundalik diagrammalar), audit jurnali, sayt sozlamalari.

## 2. Talablar

- **Node.js ≥ 22.5** (tavsiya: 24). `node -v` bilan tekshiring.
- **PostgreSQL 14+** — faqat production uchun. Lokal sinov uchun Postgres **shart emas**: loyiha avtomatik `node:sqlite` rejimida ishlaydi (`data/edukitob.db`).

## 3. O‘rnatish va lokal ishga tushirish

```bash
cd edukitob
npm install
npm run vendor     # PDF.js fayllarini public/vendor ga nusxalash

npm run migrate    # jadvallarni yaratish
npm run seed       # admin + demo akkauntlar, fanlar, tillar, sinflar, demo test (kod: TEST2345)
npm run samples    # namuna PDF kitoblar yaratish (ixtiyoriy)
npm run seed       # namuna kitoblarni bazaga yozish (samples'dan keyin)

npm start          # http://localhost:3000
```

Ishga tushganda konsolda drayver (`sqlite` yoki `pg`) ko‘rinadi.

**Demo akkauntlar (seed):**

| Rol | Email | Parol |
|---|---|---|
| Admin | `admin@edukitob.uz` | `BoshlangichParol123!` |
| O‘qituvchi | `oqituvchi@edukitob.uz` | `Parol12345` |
| O‘quvchi | `oquvchi@edukitob.uz` | `Parol12345` |

> Productionga chiqishdan oldin admin parolini albatta o‘zgartiring (Admin panel → Foydalanuvchilar) yoki `ADMIN_EMAIL` / `ADMIN_PASSWORD` env bilan yangi admin yarating. Seed mavjud adminni qayta yaratmaydi.

## 4. `.env` sozlash

`.env.example` ni `.env` nomiga nusxalang va to‘ldiring. Haqiqiy kalitlarni Gitga yuklamang (`.gitignore` allaqachon `.env`ni olmaydi).

```ini
PORT=3000
NODE_ENV=production
SITE_URL=https://domeningiz.uz

# Database: bo'sh bo'lsa — lokal sqlite
DB_CLIENT=pg
DATABASE_URL=postgres://edukitob:PAROL@localhost:5432/edukitob

DOWNLOAD_SIGN_SECRET=<uzun-tasodifiy-satr>   # yuklab olish tokenlari imzosi
SESSION_TTL_HOURS=24
MAX_PDF_MB=100
MAX_IMAGE_MB=5

ADMIN_EMAIL=bosh@domeningiz.uz               # seed uchun (ixtiyoriy)
ADMIN_PASSWORD=<kuchli-parol>

# Ixtiyoriy: papkalarni ko'chirish
# DATA_DIR=/var/lib/edukitob/data
# STORAGE_DIR=/var/lib/edukitob/storage
```

`DOWNLOAD_SIGN_SECRET` ni generatsiya qilish: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

## 5. PostgreSQL sozlash (production)

```sql
CREATE USER edukitob WITH PASSWORD 'KUCHLI_PAROL';
CREATE DATABASE edukitob OWNER edukitob;
```

Keyin `.env`da `DB_CLIENT=pg` + `DATABASE_URL` ko‘rsatib:

```bash
npm run migrate && npm run seed
```

Migratsiya ikkala drayverda ham bir xil SQL ishlatadi (`?` placeholder avtomatik `$n`ga aylantiriladi).

## 6. HTTPS va domen

Node to‘g‘ridan-to‘g‘ri 80/443 portda TLS bilan ishlashi mumkin, lekin tavsiya etilgan yo‘l — **Nginx reverse proxy**:

```nginx
server {
    listen 443 ssl http2;
    server_name domeningiz.uz;
    ssl_certificate     /etc/letsencrypt/live/domeningiz.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/domeningiz.uz/privkey.pem;

    client_max_body_size 120M;   # PDF yuklash limiti

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Sertifikat: `sudo certbot --nginx -d domeningiz.uz`. `SITE_URL` ni HTTPS manzilga qo‘ying. Helmet allaqachon xavfsizlik sarlavhalarini beradi.

> Muhim: saytni faqat HTTPS orqali oching — sessiya cookie’lari `Secure` bayrog‘i bilan productionda beriladi.

## 7. Production rejimida ishga tushirish (PM2)

```bash
npm i -g pm2
NODE_ENV=production pm2 start server/app.js --name edukitob
pm2 save && pm2 startup
```

Qayta ishga tushganda kitoblar `storage/` va ma’lumotlar bazasida saqlanib qoladi.

## 8. Zaxira nusxa va tiklash

```bash
# PostgreSQL
pg_dump -U edukitob edukitob > backup-$(date +%F).sql
psql -U edukitob edukitob < backup-2026-01-01.sql

# sqlite
cp data/edukitob.db backup/edukitob-$(date +%F).db

# Fayllar
tar czf storage-$(date +%F).tar.gz storage/
```

Tiklashda zaxira SQL + `storage/` arxivi birgalikda tiklanadi.

## 9. Statik frontend haqida

Ommaviy sahifalar (`index.html`, `library.html`, ...) statik tarzda beriladi, lekin **mustaqil statik hostingga ko‘chirish shart emas** — hammasi bir Node serverdan xizmat qiladi. Agar alohida CDN/statik hosting ishlatsangiz, frontend xuddi shu domen ostida bo‘lishi shart (cookie + CSRF same-origin ishlaydi).

## 10. Bepul hosting cheklovlari

| Cheklov | Ta'siri |
|---|---|
| Fayl hajmi (ko‘pincha 100–500MB disk) | Katta PDF arxivi sig‘masligi mumkin; `MAX_PDF_MB` ni kamaytiring |
| Vaqtinchalik fayl tizimi (ba'zi PaaS) | `storage/` yo‘qoladi — doimiy disk yoki S3 kerak |
| Postgres limitlari (Railway/Neon free) | 500MB gacha — minglab kitoblar uchun yetarli |
| Cold start / uxlash | Birinchi so‘rov sekin bo‘lishi mumkin |
| Doimiy ishlash (Render free) | 15 daqiqada uxlaydi; PM2/VPS tavsiya etiladi |

VPS (masalan, eng arzon Ubuntu VPS) + Nginx + PostgreSQL eng ishonchli variant.

## 11. Testlar

```bash
npm test
```

Testlar har safar izolyatsiyalangan vaqtinchalik papka + sqlite bilan ishlaydi (haqiqiy ma’lumotlar bazasiga tegmaydi). Qamrab oladi: login/CSRF/sessiya, kitob nashr/yashirish va PDF himoyasi, noto‘g‘ri PDF rad etilishi, yuklab olish tokeni xavfsizligi, Range so‘rovlari, test platformasi (kod, javoblarni yashirish, serverda baholash, natija izolyatsiyasi, urinishlar chegarasi, muddat).

## 12. Xavfsizlik xulosasi

- Parollar **bcrypt** bilan xeshlanadi; admin paroli frontendda saqlanmaydi.
- Sessiyalar serverda (`sessions` jadvali), cookie: `HttpOnly`, `SameSite=Lax`, productionda `Secure`.
- Barcha mutating API so‘rovlari **double-submit CSRF** tekshiruvidan o‘tadi.
- Login urinishlari rate-limit qilinadi (15 daqiqada 20).
- PDF fayllari `storage/` ichida tasodifiy nom bilan; to‘g‘ridan-to‘g‘ri URL yo‘q; ildiz statik berilmaydi (faqat ommaviy `css/`, `js/`, `assets/` va `public/vendor`).
- Yuklab olish: server tomonida imzolangan qisqa muddatli token (taymer faqat UI).
- Test javoblari: `is_correct` hech qachon topshirilmagan urinishga yuborilmaydi; baholash serverda; natijalar egasiga ko‘rinadi.
- Admin harakatlari `audit_logs`ga yoziladi; oxirgi adminni o‘chirish/bloklash himoyasi mavjud.
- DB so‘rovlari hammasi parametrli (SQL injection yo‘q); HTML kanal `App.escapeHtml` (XSS himoyasi); Helmet CSP yoqilgan.

## 13. Loyiha tuzilmasi

```
edukitob/
├── *.html                 # ommaviy sahifalar (index, library, books, book, reader, tests, ...)
├── admin/                 # admin panel sahifalari (login, dashboard, books, ...)
├── css/  js/  assets/     # frontend
├── public/vendor/         # PDF.js (vendor)
├── server/
│   ├── app.js             # Express ilova
│   ├── config/            # env, database (pg/sqlite adapter)
│   ├── middleware/        # auth (sessiya), csrf, rate-limit, error-handler
│   ├── routes/            # auth, books, reading, tests, teacher, admin/*
│   ├── services/          # book, test, file, audit, import, qr, settings
│   └── lib/               # crypto (token/code), validate, csv
├── database/              # schema.sql, seed.sql (reference)
├── scripts/               # namuna PDF generator
├── storage/               # XUSUSIY: PDF va muqovalar (gitga kirmaydi)
├── data/                  # sqlite fayli (gitga kirmaydi)
└── tests/                 # node --test
```

## 14. Tez boshlash oqimi (admin)

1. `/admin/login.html` — admin bilan kiring.
2. **Kitob qo‘shish**: tur, sinf, fan, til tanlang, PDF yuklang → «Darhol ommaga chiqarish».
3. Ko‘p fayl bo‘lsa — **Ommaviy yuklash** (30 tagacha PDF, nomi fayl nomidan) yoki **CSV/Excel import** (namuna jadval yuklab olinadi).
4. **Testlar** uchun o‘qituvchi akkaunti kerak: o‘qituvchi `teacher.html`da test yaratadi, kodni o‘quvchilarga beradi, o‘quvchi `tests.html`da kod kiritadi.
