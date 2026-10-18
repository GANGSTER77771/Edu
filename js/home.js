'use strict';

(function () {
  async function loadClasses() {
    const grid = document.getElementById('classes-grid');
    try {
      const data = await API.get('/api/classes');
      grid.innerHTML = data.items.map((c) => `
        <div class="class-card" role="link" tabindex="0" data-class="${c.classNumber}">
          <div class="num">${c.classNumber}</div>
          <div class="lbl">Sinf darsliklari</div>
          <div class="cnt">${c.count} ta kitob</div>
        </div>`).join('');
      grid.querySelectorAll('[data-class]').forEach((el) => {
        const open = () => { location.href = `/books.html?class=${el.dataset.class}`; };
        el.addEventListener('click', open);
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
      });
    } catch (err) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">${App.escapeHtml(err.message)}</div>`;
    }
  }

  async function loadSubjects() {
    const grid = document.getElementById('subjects-grid');
    try {
      const data = await API.get('/api/subjects');
      grid.innerHTML = data.items.map((s) =>
        `<a class="subject-chip" href="/books.html?subject=${s.id}">${App.escapeHtml(s.name)}</a>`
      ).join('');
    } catch (err) {
      grid.innerHTML = `<span class="muted">${App.escapeHtml(err.message)}</span>`;
    }
  }

  async function loadBookLists() {
    try {
      const [newData, popData] = await Promise.all([
        API.get('/api/books/new?limit=8'),
        API.get('/api/books/popular?limit=8')
      ]);
      App.renderBooks(document.getElementById('new-books'), newData.items);
      App.renderBooks(document.getElementById('popular-books'), popData.items);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const hs = document.getElementById('header-search');
    if (hs) {
      hs.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') location.href = '/books.html?q=' + encodeURIComponent(hs.value.trim());
      });
    }
    loadClasses();
    loadSubjects();
    loadBookLists();
  });
})();
