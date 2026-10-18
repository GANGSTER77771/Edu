'use strict';

import * as pdfjsLib from '/vendor/pdfjs/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';

const els = {
  title: document.getElementById('rd-title'),
  prev: document.getElementById('btn-prev'),
  next: document.getElementById('btn-next'),
  pageInput: document.getElementById('page-input'),
  pageTotal: document.getElementById('page-total'),
  zoomIn: document.getElementById('btn-zoom-in'),
  zoomOut: document.getElementById('btn-zoom-out'),
  fitWidth: document.getElementById('btn-fit-width'),
  fitPage: document.getElementById('btn-fit-page'),
  search: document.getElementById('btn-search'),
  bookmarks: document.getElementById('btn-bookmarks'),
  fullscreen: document.getElementById('btn-fullscreen'),
  download: document.getElementById('btn-download'),
  root: document.getElementById('reader-root'),
  loading: document.getElementById('reader-loading'),
  error: document.getElementById('reader-error'),
  errorText: document.getElementById('reader-error-text'),
  retry: document.getElementById('btn-retry'),
  wrap: document.getElementById('pdf-canvas-wrap'),
  canvas: document.getElementById('pdf-canvas'),
  highlight: document.getElementById('pdf-highlight-layer'),
  searchPanel: document.getElementById('search-panel'),
  searchInput: document.getElementById('search-input'),
  searchResults: document.getElementById('search-results'),
  bmPanel: document.getElementById('bookmark-panel'),
  bmNote: document.getElementById('bm-note'),
  bmAdd: document.getElementById('bm-add'),
  bmList: document.getElementById('bm-list')
};

const PREFS = {
  mode: 'edk_reader_mode',
  cont: 'edk_reader_continue',
  orient: 'edk_reader_orient'
};

function getPref(key, def) {
  try { return localStorage.getItem(key) ?? def; } catch (_) { return def; }
}

const state = {
  slug: App.qs('id'),
  book: null,
  pdf: null,
  page: 1,
  numPages: 0,
  mode: getPref(PREFS.mode, 'width') === 'page' ? 'page' : 'width',
  zoom: 1,
  renderTask: null,
  searchTimer: null,
  bookmarks: [],
  progressTimer: null,
  lastSavedPage: 0,
  currentScale: 1,
  baseViewport: null
};

function lsKey() {
  return `edk_progress_${state.slug}`;
}

function saveProgress(page) {
  try { localStorage.setItem(lsKey(), String(page)); } catch (_) { /* noop */ }
  if (!App.user || page === state.lastSavedPage) return;
  state.lastSavedPage = page;
  clearTimeout(state.progressTimer);
  state.progressTimer = setTimeout(() => {
    API.put(`/api/me/progress/${state.book.id}`, { page }).catch(() => {});
  }, 1200);
}

async function init() {
  if (!state.slug) return showError('Kitob tanlanmagan');
  let meta;
  try {
    meta = await API.get(`/api/books/${encodeURIComponent(state.slug)}/reader`);
  } catch (err) {
    return showError(err.message);
  }
  state.book = meta.book;
  state.bookmarks = meta.bookmarks || [];
  document.title = `${state.book.title} — o‘qish — EDUKITOB`;
  els.title.textContent = state.book.title;

  try {
    state.pdf = await pdfjsLib.getDocument({
      url: `/api/books/${state.book.id}/pdf`,
      rangeChunkSize: 262144,
      disableAutoFetch: true
    }).promise;
  } catch (err) {
    return showError('PDF fayl yuklanmadi. Internet aloqasini tekshirib, qayta urining.');
  }

  state.numPages = state.pdf.numPages;
  els.pageTotal.textContent = `/ ${state.numPages}`;
  els.pageInput.max = state.numPages;

  let startPage = parseInt(App.qs('page'), 10) || 1;
  const continueLast = getPref(PREFS.cont, '1') !== '0';
  if (!App.qs('page') && continueLast) {
    const metaPage = meta.lastPage || 1;
    const lsPage = parseInt(localStorage.getItem(lsKey()) || '0', 10);
    if (lsPage > startPage) startPage = lsPage;
    if (metaPage > startPage) startPage = metaPage;
  }
  startPage = Math.min(Math.max(1, startPage), state.numPages);

  els.loading.classList.add('hidden');
  els.wrap.classList.remove('hidden');
  await goTo(startPage, { skipSave: true });
  if (startPage > 1 && continueLast) App.toast(`${startPage}-sahifadan davom ettirildi`, 'success');
  if (getPref(PREFS.orient, '1') !== '0' && window.innerWidth < 768 && window.matchMedia('(orientation: portrait)').matches) {
    App.toast('Qulay o‘qish uchun telefonni yotim (landscape) holatga o‘tkazing');
  }
  window.addEventListener('resize', debounce(() => render(), 200));
}

function showError(msg) {
  els.loading.classList.add('hidden');
  els.wrap.classList.add('hidden');
  els.error.classList.remove('hidden');
  els.errorText.textContent = msg;
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function computeScale(pageViewport) {
  const containerWidth = Math.min(els.root.clientWidth, 1000) - 4;
  const containerHeight = window.innerHeight - 180;
  if (state.mode === 'page') {
    return Math.min(containerWidth / pageViewport.width, containerHeight / pageViewport.height);
  }
  return (containerWidth / pageViewport.width) * state.zoom;
}

async function render() {
  const page = await state.pdf.getPage(state.page);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.max(0.2, computeScale(base));
  const viewport = page.getViewport({ scale });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.currentScale = scale;
  state.baseViewport = base;

  if (state.renderTask) state.renderTask.cancel();
  const canvas = els.canvas;
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = Math.floor(viewport.width) + 'px';
  canvas.style.height = Math.floor(viewport.height) + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  state.renderTask = page.render({ canvasContext: ctx, viewport });
  try {
    await state.renderTask.promise;
  } catch (err) {
    if (err && err.name === 'RenderingCancelledException') return;
    console.error(err);
  }
  els.pageInput.value = state.page;
  state.renderTask = null;
  saveProgress(state.page);
}

async function goTo(page, { skipSave = false } = {}) {
  page = Math.min(Math.max(1, parseInt(page, 10) || 1), state.numPages);
  state.page = page;
  clearHighlights();
  await render();
  if (!skipSave) saveProgress(page);
}

async function nextPage() { if (state.page < state.numPages) await goTo(state.page + 1); }
async function prevPage() { if (state.page > 1) await goTo(state.page - 1); }

// ---------- Qidiruv ----------
async function runSearch(query) {
  if (!state.pdf || query.trim().length < 2) {
    els.searchResults.innerHTML = '<div class="no-results">So‘z kiriting — barcha sahifalarda qidiramiz.</div>';
    return;
  }
  const q = query.trim().toLowerCase();
  els.searchResults.innerHTML = '<div class="no-results">Qidirilmoqda...</div>';
  const results = [];
  for (let p = 1; p <= state.numPages && results.length < 60; p++) {
    let content;
    try {
      content = await state.pdf.getPage(p).getTextContent();
    } catch (_) { continue; }
    let line = '';
    const itemSpans = [];
    for (const item of content.items) {
      if (!item.str) continue;
      itemSpans.push({ start: line.length, end: line.length + item.str.length, item });
      line += item.str + ' ';
    }
    let idx = line.toLowerCase().indexOf(q);
    while (idx !== -1 && results.length < 60) {
      const snippet = line.slice(Math.max(0, idx - 30), idx + q.length + 30).trim();
      const hitItems = itemSpans.filter((s) => s.start < idx + q.length && s.end > idx).map((s) => s.item);
      results.push({ page: p, snippet, items: hitItems });
      idx = line.toLowerCase().indexOf(q, idx + q.length);
    }
  }
  if (!results.length) {
    els.searchResults.innerHTML = '<div class="no-results">Hech narsa topilmadi.</div>';
    return;
  }
  els.searchResults.innerHTML = results.map((r, i) =>
    `<div class="result-item" data-i="${i}"><b>${r.page}</b>-sahifa — ${App.escapeHtml(r.snippet)}</div>`
  ).join('');
  els.searchResults.querySelectorAll('[data-i]').forEach((el) => {
    el.addEventListener('click', async () => {
      const r = results[parseInt(el.dataset.i, 10)];
      await goTo(r.page);
      drawHighlights(r.items);
    });
  });
}

function drawHighlights(items) {
  clearHighlights();
  if (!items || !items.length || !state.baseViewport) return;
  const scale = state.currentScale;
  const hctx = els.highlight.getContext('2d');
  els.highlight.width = els.canvas.width;
  els.highlight.height = els.canvas.height;
  els.highlight.style.width = els.canvas.style.width;
  els.highlight.style.height = els.canvas.style.height;
  hctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
  hctx.fillStyle = 'rgba(255, 210, 60, 0.4)';
  for (const item of items) {
    if (!item.transform || !item.width || !item.height) continue;
    const [, , , , e, f] = item.transform;
    const x = e * scale;
    const y = (state.baseViewport.height - f - item.height) * scale;
    hctx.fillRect(x - 1, y - 1, item.width * scale + 2, item.height * scale + 2);
  }
}

function clearHighlights() {
  const hctx = els.highlight.getContext('2d');
  els.highlight.width = 0;
  els.highlight.height = 0;
  hctx && hctx.clearRect(0, 0, 1, 1);
}

// ---------- Xatcho'plar ----------
function renderBookmarks() {
  if (!state.bookmarks.length) {
    els.bmList.innerHTML = '<div class="no-results muted" style="font-size:13px">Hozircha xatcho‘p yo‘q. Joriy sahifani qo‘shing.</div>';
    return;
  }
  els.bmList.innerHTML = state.bookmarks.map((bm) => `
    <div class="bm-item" data-page="${bm.page}">
      <span><b>${bm.page}</b>-sahifa${bm.note ? ' — ' + App.escapeHtml(bm.note) : ''}</span>
      <button class="del" type="button" data-del="${bm.page}" title="O‘chirish">✕</button>
    </div>`).join('');
  els.bmList.querySelectorAll('[data-page]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-del]')) return;
      goTo(parseInt(el.dataset.page, 10));
    });
  });
  els.bmList.querySelectorAll('[data-del]').forEach((el) => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const page = parseInt(el.dataset.del, 10);
      state.bookmarks = state.bookmarks.filter((b) => b.page !== page);
      renderBookmarks();
      try {
        if (App.user) await API.del(`/api/me/bookmarks/${state.book.id}/${page}`);
      } catch (_) { /* noop */ }
    });
  });
}

async function addBookmark() {
  const note = els.bmNote.value.trim().slice(0, 200);
  if (state.bookmarks.some((b) => b.page === state.page)) {
    App.toast('Bu sahifa allaqachon xatcho‘plangan');
    return;
  }
  state.bookmarks.push({ page: state.page, note });
  state.bookmarks.sort((a, b) => a.page - b.page);
  els.bmNote.value = '';
  renderBookmarks();
  try {
    if (App.user) await API.post(`/api/me/bookmarks/${state.book.id}`, { page: state.page, note });
    else App.toast('Akkauntga kirganingizda xatcho‘plar bulutda saqlanadi');
  } catch (_) { /* noop */ }
}

// ---------- To'liq ekran ----------
async function toggleFullscreen() {
  const rootEl = document.documentElement;
  try {
    if (!document.fullscreenElement) {
      await rootEl.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (_) {
    App.toast('Brauzeringiz to‘liq ekran rejimini qo‘llab-quvvatlamaydi. Telefonlarda brauzer menyusidan "To‘liq ekran"ni tanlang.');
  }
}

// ---------- Hodisalar ----------
els.prev.addEventListener('click', prevPage);
els.next.addEventListener('click', nextPage);
els.pageInput.addEventListener('change', () => goTo(els.pageInput.value));
els.zoomIn.addEventListener('click', () => { state.mode = 'zoom'; state.zoom = Math.min(3, state.zoom + 0.2); render(); });
els.zoomOut.addEventListener('click', () => { state.mode = 'zoom'; state.zoom = Math.max(0.4, state.zoom - 0.2); render(); });
els.fitWidth.addEventListener('click', () => { state.mode = 'width'; try { localStorage.setItem(PREFS.mode, 'width'); } catch (_) { /* noop */ } render(); });
els.fitPage.addEventListener('click', () => { state.mode = 'page'; try { localStorage.setItem(PREFS.mode, 'page'); } catch (_) { /* noop */ } render(); });
els.search.addEventListener('click', () => {
  els.searchPanel.classList.toggle('open');
  els.bmPanel.classList.remove('open');
  if (els.searchPanel.classList.contains('open')) els.searchInput.focus();
});
els.bookmarks.addEventListener('click', () => {
  els.bmPanel.classList.toggle('open');
  els.searchPanel.classList.remove('open');
});
els.fullscreen.addEventListener('click', toggleFullscreen);
els.download.addEventListener('click', () => DownloadFlow.openModal(state.book));
els.retry.addEventListener('click', () => location.reload());
els.bmAdd.addEventListener('click', addBookmark);
els.searchInput.addEventListener('input', () => {
  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(() => runSearch(els.searchInput.value), 350);
});
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea')) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') nextPage();
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') prevPage();
  else if (e.key === '+') els.zoomIn.click();
  else if (e.key === '-') els.zoomOut.click();
  else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  else if (e.key === '/') { e.preventDefault(); els.searchPanel.classList.add('open'); els.searchInput.focus(); }
});

window.addEventListener('beforeunload', () => saveProgress(state.page));

document.addEventListener('DOMContentLoaded', () => {
  App.loadUser().finally(init);
});
