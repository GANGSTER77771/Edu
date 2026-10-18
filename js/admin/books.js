'use strict';

(async function () {
  const user = await Admin.require();
  if (!user) return;

  const tbody = document.querySelector('#books-table tbody');
  const pagerEl = document.getElementById('pager');
  const state = { page: 1, perPage: 20 };

  // ---- Filtr tanlovlarini yuklash ----
  async function loadFilters() {
    try {
      const [cats, classes, subjects] = await Promise.all([
        API.get('/api/admin/categories'),
        API.get('/api/classes'),
        API.get('/api/admin/subjects')
      ]);
      const fill = (sel, items, labelKey, valueKey) => {
        sel.insertAdjacentHTML('beforeend', items
          .map((i) => `<option value="${i[valueKey]}">${App.escapeHtml(i[labelKey])}</option>`).join(''));
      };
      fill(document.getElementById('f-category'), cats.items.filter((c) => c.is_active), 'name', 'id');
      fill(document.getElementById('f-class'), classes.items, 'classNumber', 'classNumber');
      fill(document.getElementById('f-subject'), subjects.items.filter((s) => s.is_active), 'name', 'id');
    } catch (_) { /* filtrlarsiz ham ishlaydi */ }
  }

  function params() {
    const p = new URLSearchParams();
    const q = document.getElementById('f-q').value.trim();
    const category = document.getElementById('f-category').value;
    const klass = document.getElementById('f-class').value;
    const subject = document.getElementById('f-subject').value;
    const status = document.getElementById('f-status').value;
    const sort = document.getElementById('f-sort').value;
    if (q) p.set('q', q);
    if (category) p.set('category', category);
    if (klass) p.set('class', klass);
    if (subject) p.set('subject', subject);
    if (status !== '') p.set('published', status);
    if (sort) p.set('sort', sort);
    p.set('page', state.page);
    p.set('perPage', state.perPage);
    return p.toString();
  }

  function coverCell(b) {
    if (b.has_cover) {
      return `<img class="cover-preview" style="width:40px" src="/api/books/${b.id}/cover" alt="" loading="lazy"
        onerror="this.style.display='none'">`;
    }
    return '<span class="muted">—</span>';
  }

  function render(items) {
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="muted" style="text-align:center;padding:30px">Kitob topilmadi</td></tr>';
      return;
    }
    tbody.innerHTML = items.map((b) => `
      <tr>
        <td>${coverCell(b)}</td>
        <td>
          <b>${App.escapeHtml(b.title)}</b><br>
          ${b.author ? `<span class="muted">${App.escapeHtml(b.author)}</span>` : ''}
        </td>
        <td class="muted">
          ${b.category_name ? App.escapeHtml(b.category_name) : '—'} /
          ${b.class_number ? b.class_number + '-sinf' : '—'} /
          ${b.subject_name ? App.escapeHtml(b.subject_name) : '—'}
        </td>
        <td>${b.language_name ? App.escapeHtml(b.language_name) : '—'}</td>
        <td>${b.publication_year || '—'}</td>
        <td>${b.has_pdf ? App.fmtBytes(b.file_size) : '<span class="status-badge red">PDF yo‘q</span>'}</td>
        <td>${b.views || 0}</td>
        <td>${b.is_published ? '<span class="status-badge green">Nashr</span>' : '<span class="status-badge amber">Qoralama</span>'}</td>
        <td class="text-right">
          <div class="flex gap-1" style="justify-content:flex-end;flex-wrap:wrap">
            ${b.is_published
              ? `<button class="btn btn-sm btn-ghost" data-action="hide" data-id="${b.id}">Yashirish</button>`
              : `<button class="btn btn-sm btn-primary" data-action="publish" data-id="${b.id}" ${b.has_pdf ? '' : 'disabled title="PDF yo‘q"'}>Nashr</button>`}
            <a class="btn btn-sm btn-outline" href="/admin/edit-book.html?id=${b.id}">Tahrirlash</a>
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${b.id}">O‘chirish</button>
          </div>
        </td>
      </tr>`).join('');
  }

  async function load() {
    try {
      const data = await API.get('/api/admin/books?' + params());
      render(data.items);
      Admin.pager(pagerEl, { page: data.page, perPage: data.perPage, total: data.total, onPage: (p) => { state.page = p; load(); } });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9" class="muted">${App.escapeHtml(err.message)}</td></tr>`;
    }
  }

  document.getElementById('f-apply').addEventListener('click', () => { state.page = 1; load(); });
  document.getElementById('f-clear').addEventListener('click', () => {
    ['f-q', 'f-category', 'f-class', 'f-subject', 'f-status'].forEach((id) => { document.getElementById(id).value = ''; });
    document.getElementById('f-sort').value = 'new';
    state.page = 1;
    load();
  });
  document.getElementById('f-q').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { state.page = 1; load(); }
  });

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    const id = btn.dataset.id;
    try {
      if (btn.dataset.action === 'publish') {
        await API.post(`/api/admin/books/${id}/publish`);
        App.toast('Kitob nashr etildi', 'success');
      } else if (btn.dataset.action === 'hide') {
        await API.post(`/api/admin/books/${id}/hide`);
        App.toast('Kitob yashirildi');
      } else if (btn.dataset.action === 'delete') {
        if (!confirm('Kitobni butunlay o‘chirasizmi? PDF fayl, statistika va xatcho‘plar ham o‘chadi.')) return;
        await API.del(`/api/admin/books/${id}`);
        App.toast('Kitob o‘chirildi');
      }
      load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  });

  loadFilters();
  load();
})();
