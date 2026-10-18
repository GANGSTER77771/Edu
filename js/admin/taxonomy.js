'use strict';

(async function () {
  const user = await Admin.require();
  if (!user) return;

  function row(item, { onRename, onToggle, onDelete }) {
    const div = document.createElement('div');
    div.className = 'result-row flex items-center gap-1';
    div.innerHTML = `
      <div class="flex-1">
        <b>${App.escapeHtml(item.name)}</b>
        ${item.code ? `<span class="muted">(${App.escapeHtml(item.code)})</span>` : ''}
      </div>
      ${item.is_active !== undefined ? (item.is_active
        ? '<span class="status-badge green">Faol</span>'
        : '<span class="status-badge gray">Yashir</span>') : ''}
      <div class="flex gap-1">
        <button class="btn btn-sm btn-outline" data-act="rename">Nomni o‘zgartirish</button>
        ${onToggle ? `<button class="btn btn-sm btn-ghost" data-act="toggle">${item.is_active ? 'Yashirish' : 'Ko‘rsatish'}</button>` : ''}
        <button class="btn btn-sm btn-danger" data-act="delete">O‘chirish</button>
      </div>`;
    div.querySelector('[data-act="rename"]').addEventListener('click', onRename);
    const t = div.querySelector('[data-act="toggle"]');
    if (t && onToggle) t.addEventListener('click', onToggle);
    div.querySelector('[data-act="delete"]').addEventListener('click', onDelete);
    return div;
  }

  // ---- Fanlar ----
  const sList = document.getElementById('s-list');
  async function loadSubjects() {
    const data = await API.get('/api/admin/subjects');
    sList.innerHTML = '';
    if (!data.items.length) sList.innerHTML = '<p class="muted">Fan yo‘q.</p>';
    data.items.forEach((s) => {
      sList.appendChild(row(s, {
        onRename: async () => {
          const name = prompt('Yangi nom:', s.name);
          if (!name || name === s.name) return;
          try { await API.patch(`/api/admin/subjects/${s.id}`, { name }); loadSubjects(); }
          catch (e) { App.toast(e.message, 'error'); }
        },
        onToggle: async () => {
          try { await API.patch(`/api/admin/subjects/${s.id}`, { is_active: s.is_active ? 0 : 1 }); loadSubjects(); }
          catch (e) { App.toast(e.message, 'error'); }
        },
        onDelete: async () => {
          if (!confirm(`«${s.name}» fanini o‘chirasizmi? Unga biriktirilgan kitoblar bo‘lsa, o‘chirilmaydi.`)) return;
          try { await API.del(`/api/admin/subjects/${s.id}`); loadSubjects(); }
          catch (e) { App.toast(e.message, 'error'); }
        }
      }));
    });
  }
  document.getElementById('s-add').addEventListener('click', async () => {
    const input = document.getElementById('s-name');
    const name = input.value.trim();
    if (!name) return;
    try { await API.post('/api/admin/subjects', { name }); input.value = ''; loadSubjects(); }
    catch (e) { App.toast(e.message, 'error'); }
  });

  // ---- Adabiyot turlari ----
  const cList = document.getElementById('c-list');
  async function loadCategories() {
    const data = await API.get('/api/admin/categories');
    cList.innerHTML = '';
    if (!data.items.length) cList.innerHTML = '<p class="muted">Tur yo‘q.</p>';
    data.items.forEach((c) => {
      cList.appendChild(row(c, {
        onRename: async () => {
          const name = prompt('Yangi nom:', c.name);
          if (!name || name === c.name) return;
          try { await API.patch(`/api/admin/categories/${c.id}`, { name }); loadCategories(); }
          catch (e) { App.toast(e.message, 'error'); }
        },
        onToggle: async () => {
          try { await API.patch(`/api/admin/categories/${c.id}`, { is_active: c.is_active ? 0 : 1 }); loadCategories(); }
          catch (e) { App.toast(e.message, 'error'); }
        },
        onDelete: async () => {
          if (!confirm(`«${c.name}» turini o‘chirasizmi? Unga biriktirilgan kitoblar bo‘lsa, o‘chirilmaydi.`)) return;
          try { await API.del(`/api/admin/categories/${c.id}`); loadCategories(); }
          catch (e) { App.toast(e.message, 'error'); }
        }
      }));
    });
  }
  document.getElementById('c-add').addEventListener('click', async () => {
    const input = document.getElementById('c-name');
    const name = input.value.trim();
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'tur';
    try { await API.post('/api/admin/categories', { name, slug }); input.value = ''; loadCategories(); }
    catch (e) { App.toast(e.message, 'error'); }
  });

  // ---- Tillar ----
  const lList = document.getElementById('l-list');
  async function loadLanguages() {
    const data = await API.get('/api/admin/languages');
    lList.innerHTML = '';
    if (!data.items.length) lList.innerHTML = '<p class="muted">Til yo‘q.</p>';
    data.items.forEach((l) => {
      lList.appendChild(row(l, {
        onRename: () => App.toast('Til nomi faqat kod bilan qo‘shiladi', ''),
        onToggle: null,
        onDelete: async () => {
          try { await API.del(`/api/admin/languages/${l.id}`); loadLanguages(); }
          catch (e) { App.toast(e.message, 'error'); }
        }
      }));
    });
  }
  document.getElementById('l-add').addEventListener('click', async () => {
    const code = document.getElementById('l-code').value.trim();
    const name = document.getElementById('l-name').value.trim();
    if (!code || !name) return App.toast('Til kodi va nomini kiriting', 'error');
    try {
      await API.post('/api/admin/languages', { code, name });
      document.getElementById('l-code').value = '';
      document.getElementById('l-name').value = '';
      loadLanguages();
    } catch (e) { App.toast(e.message, 'error'); }
  });

  loadSubjects();
  loadCategories();
  loadLanguages();
})();
