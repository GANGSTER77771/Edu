'use strict';

(function () {
  const typeSection = document.getElementById('type-section');
  const classSection = document.getElementById('class-section');
  const classesGrid = document.getElementById('classes-grid');
  const steps = document.getElementById('steps');
  const classTitle = document.getElementById('class-title');

  const TYPES = {
    darslik: 'Darsliklar',
    badiy: 'Badiiy adabiyotlar'
  };

  function pill(index, label, state, href) {
    return `<span class="step-pill ${state}" ${href ? `role="link" tabindex="0" data-href="${href}"` : ''}>${index}. ${label}</span>`;
  }

  function renderSteps(category) {
    if (!category) {
      steps.innerHTML = pill(1, 'Adabiyot turi', 'current') + pill(2, 'Sinf', '') + pill(3, 'Kitoblar', '');
      return;
    }
    steps.innerHTML =
      pill(1, TYPES[category] || category, 'done', '/library.html') +
      pill(2, 'Sinf', 'current') +
      pill(3, 'Kitoblar', '');
  }

  async function showClasses(category) {
    renderSteps(category);
    typeSection.classList.add('hidden');
    classSection.classList.remove('hidden');
    classTitle.textContent = (TYPES[category] || category) + ' — sinfni tanlang';
    classesGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="spinner"></div></div>';
    try {
      const data = await API.get(`/api/classes?category=${encodeURIComponent(category)}`);
      if (!data.items.some((c) => c.count > 0)) {
        classesGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">Bu turda hozircha kitob yo‘q</div>';
        return;
      }
      classesGrid.innerHTML = data.items.map((c) => `
        <div class="class-card" role="link" tabindex="0" data-class="${c.classNumber}">
          <div class="num">${c.classNumber}</div>
          <div class="lbl">Sinf kitoblari</div>
          <div class="cnt">${c.count} ta kitob</div>
        </div>`).join('');
      classesGrid.querySelectorAll('[data-class]').forEach((el) => {
        const open = () => {
          location.href = `/books.html?category=${encodeURIComponent(category)}&class=${el.dataset.class}`;
        };
        el.addEventListener('click', open);
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
      });
    } catch (err) {
      classesGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">${App.escapeHtml(err.message)}</div>`;
    }
  }

  function showTypes() {
    renderSteps('');
    typeSection.classList.remove('hidden');
    classSection.classList.add('hidden');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('[data-category]').forEach((btn) => {
      btn.addEventListener('click', () => showClasses(btn.dataset.category));
    });
    steps.addEventListener('click', (e) => {
      const pillEl = e.target.closest('[data-href]');
      if (pillEl) location.href = pillEl.dataset.href;
    });
    steps.addEventListener('keydown', (e) => {
      const pillEl = e.target.closest('[data-href]');
      if (pillEl && e.key === 'Enter') location.href = pillEl.dataset.href;
    });

    try {
      const data = await API.get('/api/categories');
      const extras = data.items.filter((c) => !TYPES[c.slug]);
      document.getElementById('extra-types').innerHTML = extras.map((c) => `
        <button class="type-card" type="button" data-category="${App.escapeHtml(c.slug)}">
          <div class="ic">📚</div>
          <h3>${App.escapeHtml(c.name)}</h3>
          <p>Shu turdagi kitoblar to‘plami.</p>
        </button>`).join('');
      document.querySelectorAll('#extra-types [data-category]').forEach((btn) => {
        btn.addEventListener('click', () => showClasses(btn.dataset.category));
      });
    } catch (_) { /* asosiy turlar statik berilgan */ }

    const category = App.qs('category');
    if (category) showClasses(category);
    else showTypes();
  });
})();
