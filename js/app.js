'use strict';

// Umumiy yordamchilar: header holati, menyu, toast, kartalar, formatlash
const App = {
  user: null,

  escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  qs(name) {
    return new URLSearchParams(location.search).get(name);
  },

  fmtDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (_) { return iso; }
  },

  fmtDateTime(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (_) { return iso; }
  },

  fmtBytes(n) {
    if (!n && n !== 0) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  },

  fmtDuration(seconds) {
    const s = Math.max(0, Math.round(seconds || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return `${h} soat ${m % 60} daq`;
    }
    return m > 0 ? `${m} daq ${r} son` : `${r} son`;
  },

  roleLabel(role) {
    return { student: 'O‘quvchi', teacher: 'O‘qituvchi', admin: 'Admin' }[role] || role;
  },

  toast(message, type = '') {
    let box = document.getElementById('toast-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toast-box';
      document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  },

  statusLabel(b) {
    if (b.is_published) return '<span class="status-badge green">Nashr etilgan</span>';
    if (!b.has_pdf) return '<span class="status-badge gray">PDF yo‘q</span>';
    return '<span class="status-badge amber">Qoralama</span>';
  },

  bookCard(b, { showFav = false } = {}) {
    const cover = b.has_cover
      ? `<img src="/api/books/${b.id}/cover" alt="${this.escapeHtml(b.title)}" loading="lazy" onerror="this.style.display='none';this.parentNode.querySelector('.cover-fallback').style.display='flex'">`
      : '';
    const fallback = `<div class="cover-fallback" style="display:${b.has_cover ? 'none' : 'flex'}">${this.escapeHtml(b.title)}</div>`;
    const tags = [
      b.class_number ? `${b.class_number}-sinf` : '',
      b.subject_name || b.category_name || ''
    ].filter(Boolean).map((t) => `<span class="tag">${this.escapeHtml(t)}</span>`).join('');
    return `
      <article class="book-card">
        <a class="book-cover" href="/book.html?id=${b.slug}" aria-label="${this.escapeHtml(b.title)}">
          ${cover}${fallback}
          ${showFav ? '<span class="badge-fav" title="Sevimlilarda"><i class="fa-solid fa-heart"></i></span>' : ''}
        </a>
        <div class="book-body">
          <h3 class="book-title"><a href="/book.html?id=${b.slug}" style="color:inherit">${this.escapeHtml(b.title)}</a></h3>
          <div class="book-meta">${tags}</div>
          ${b.author ? `<div class="book-meta">${this.escapeHtml(b.author)}</div>` : ''}
        </div>
        <div class="book-actions">
          <a class="btn btn-primary btn-sm" href="/reader.html?id=${b.slug}">O‘qish</a>
          <a class="btn btn-outline btn-sm" href="/book.html?id=${b.slug}">Batafsil</a>
        </div>
      </article>`;
  },

  renderBooks(container, items, opts) {
    if (!items.length) {
      container.innerHTML = `<div class="empty-state"><div class="icon"><i class="fa-solid fa-book" aria-hidden="true"></i></div><p>Hozircha kitob topilmadi</p></div>`;
      return;
    }
    container.innerHTML = items.map((b) => this.bookCard(b, opts)).join('');
  },

  async loadUser() {
    try {
      const data = await API.get('/api/auth/me');
      this.user = data.user;
    } catch (_) {
      this.user = null;
    }
    this.updateHeaderAuth();
    return this.user;
  },

  updateHeaderAuth() {
    const slot = document.getElementById('auth-slot');
    if (!slot) return;
    if (!this.user) {
      slot.innerHTML = `
        <a class="btn btn-outline btn-sm" href="/login.html"><i class="fa-solid fa-right-to-bracket"></i>Kirish</a>
        <a class="btn btn-primary btn-sm" href="/register.html"><i class="fa-solid fa-user-plus"></i>Ro‘yxatdan o‘tish</a>`;
      return;
    }
    const links = [];
    if (this.user.role === 'student' || this.user.role === 'teacher') {
      links.push(['cabinet.html', 'fa-table-columns', 'Kabinetim']);
    }
    if (this.user.role === 'teacher') {
      links.push(['teacher.html', 'fa-chalkboard-user', 'O‘qituvchi kabineti']);
    }
    if (this.user.role === 'admin') {
      links.push(['/admin/index.html', 'fa-shield-halved', 'Admin panel']);
    }
    links.push(['settings.html', 'fa-gear', 'Sozlamalar']);
    slot.innerHTML = `
      <div class="user-menu" id="user-menu">
        <button type="button" aria-haspopup="true">
          <span class="user-name">${this.escapeHtml(this.user.fullName)}</span> <i class="fa-solid fa-chevron-down" style="font-size:11px;opacity:.5"></i>
        </button>
        <div class="dropdown">
          <div class="user-info">
            <div class="name">${this.escapeHtml(this.user.fullName)}</div>
            <div class="role"><span class="role-badge ${this.user.role}">${this.roleLabel(this.user.role)}</span></div>
          </div>
          ${links.map(([href, icon, label]) => `<a href="${href}"><i class="fa-solid ${icon}"></i>${label}</a>`).join('')}
          <button type="button" id="logout-btn"><i class="fa-solid fa-arrow-right-from-bracket"></i>Chiqish</button>
        </div>
      </div>`;
    const menu = document.getElementById('user-menu');
    menu.querySelector('button').addEventListener('click', () => menu.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target)) menu.classList.remove('open');
    });
    menu.querySelector('#logout-btn').addEventListener('click', async () => {
      try {
        await API.post('/api/auth/logout');
        location.href = '/index.html';
      } catch (err) {
        this.toast(err.message, 'error');
      }
    });
  },

  async requireRolePage(...roles) {
    const user = await this.loadUser();
    if (!user) {
      location.href = '/login.html?next=' + encodeURIComponent(location.pathname + location.search);
      return null;
    }
    if (roles.length && !roles.includes(user.role)) {
      document.body.innerHTML = `
        <div style="max-width:520px;margin:80px auto;text-align:center;padding:0 20px">
          <h1>403</h1>
          <p>Sizda bu sahifaga kirish ruxsati yo‘q.</p>
          <a class="btn btn-primary" href="/index.html">Bosh sahifaga</a>
        </div>`;
      return null;
    }
    return user;
  },

  initChrome() {
    const toggle = document.getElementById('mobile-toggle');
    const nav = document.getElementById('main-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', () => nav.classList.toggle('open'));
    }
    const year = document.getElementById('footer-year');
    if (year) year.textContent = new Date().getFullYear();
    const here = location.pathname === '/' ? '/index.html' : location.pathname;
    document.querySelectorAll('.main-nav a').forEach((a) => {
      if (a.getAttribute('href') === here) a.classList.add('active');
    });
    this.loadUser();
  }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('[data-app-chrome]')) App.initChrome();
});
