'use strict';

(function () {
  const grid = document.getElementById('books-grid');
  const pagination = document.getElementById('pagination');
  const countEl = document.getElementById('result-count');
  const titleEl = document.getElementById('page-title');
  const crumbs = document.getElementById('crumbs');

  const els = {
    q: document.getElementById('f-q'),
    category: document.getElementById('f-category'),
    class: document.getElementById('f-class'),
    subject: document.getElementById('f-subject'),
    language: document.getElementById('f-language'),
    sort: document.getElementById('f-sort')
  };

  let page = 1;
  let meta = { categoryNames: {} };

  async function loadMeta() {
    const [cats, subs, langs] = await Promise.all([
      API.get('/api/categories'),
      API.get('/api/subjects'),
      API.get('/api/languages')
    ]);
    els.category.innerHTML += cats.items.map((c) => `<option value="${App.escapeHtml(c.slug)}">${App.escapeHtml(c.name)}</option>`).join('');
    els.subject.innerHTML += subs.items.map((s) => `<option value="${s.id}">${App.escapeHtml(s.name)}</option>`).join('');
    els.language.innerHTML += langs.items.map((l) => `<option value="${App.escapeHtml(l.code)}">${App.escapeHtml(l.name)}</option>`).join('');
    els.class.innerHTML += Array.from({ length: 11 }, (_, i) => `<option value="${i + 1}">${i + 1}-sinf</option>`).join('');
    meta.categoryNames = Object.fromEntries(cats.items.map((c) => [c.slug, c.name]));
  }

  function fromQuery() {
    els.q.value = App.qs('q') || '';
    els.category.value = App.qs('category') || '';
    els.class.value = App.qs('class') || '';
    els.subject.value = App.qs('subject') || '';
    els.language.value = App.qs('language') || '';
    els.sort.value = App.qs('sort') || 'new';
    page = parseInt(App.qs('page'), 10) || 1;
  }

  function syncQuery(data) {
    const params = new URLSearchParams();
    for (const [key, el] of Object.entries(els)) {
      if (el.value) params.set(key === 'sort' ? 'sort' : key, el.value);
    }
    if (page > 1) params.set('page', page);
    const qsStr = params.toString();
    history.replaceState(null, '', qsStr ? `/books.html?${qsStr}` : '/books.html');

    const parts = ['<a href="/index.html">Bosh sahifa</a>', '<span class="sep">›</span>', '<a href="/library.html">Kutubxona</a>'];
    const cat = els.category.value;
    if (cat) parts.push('<span class="sep">›</span>', `<a href="/library.html?category=${encodeURIComponent(cat)}">${App.escapeHtml(meta.categoryNames[cat] || cat)}</a>`);
    if (els.class.value) parts.push('<span class="sep">›</span>', `${App.escapeHtml(els.class.value)}-sinf`);
    if (els.q.value) parts.push('<span class="sep">›</span>', `«${App.escapeHtml(els.q.value)}» qidiruvi`);
    crumbs.innerHTML = parts.join('');
    titleEl.textContent = cat
      ? `${meta.categoryNames[cat] || cat}${els.class.value ? ' — ' + els.class.value + '-sinf' : ''}`
      : 'Kitoblar';
  }

  async function load() {
    const params = new URLSearchParams();
    for (const [key, el] of Object.entries(els)) if (el.value) params.set(key, el.value);
    params.set('page', page);
    params.set('perPage', '12');
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="spinner"></div></div>';
    try {
      const data = await API.get('/api/books?' + params.toString());
      App.renderBooks(grid, data.items);
      countEl.textContent = `Jami ${data.total} ta kitob topildi`;
      renderPagination(data.page, Math.max(1, Math.ceil(data.total / data.perPage)));
      syncQuery(data);
      document.title = `${titleEl.textContent} — EDUKITOB`;
    } catch (err) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">${App.escapeHtml(err.message)}</div>`;
    }
  }

  function renderPagination(current, total) {
    if (total <= 1) { pagination.innerHTML = ''; return; }
    const btn = (label, target, opts = {}) =>
      `<button type="button" data-page="${target}" ${opts.disabled ? 'disabled' : ''} class="${opts.current ? 'current' : ''}">${label}</button>`;
    let html = btn('←', current - 1, { disabled: current <= 1 });
    const window = 2;
    for (let p = 1; p <= total; p++) {
      if (p === 1 || p === total || Math.abs(p - current) <= window) {
        html += btn(p, p, { current: p === current });
      } else if (Math.abs(p - current) === window + 1) {
        html += '<button disabled>…</button>';
      }
    }
    html += btn('→', current + 1, { disabled: current >= total });
    pagination.innerHTML = html;
  }

  pagination.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    page = parseInt(btn.dataset.page, 10);
    load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('filters').addEventListener('submit', (e) => {
    e.preventDefault();
    page = 1;
    load();
  });
  document.getElementById('clear-filters').addEventListener('click', () => {
    Object.values(els).forEach((el) => { el.value = ''; });
    page = 1;
    load();
  });

  document.addEventListener('DOMContentLoaded', async () => {
    await loadMeta();
    fromQuery();
    load();
  });
})();
