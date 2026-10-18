'use strict';

(async function () {
  const user = await Admin.require();
  if (!user) return;

  async function fillSelects() {
    const [cats, classes, subjects, langs] = await Promise.all([
      API.get('/api/admin/categories'),
      API.get('/api/classes'),
      API.get('/api/admin/subjects'),
      API.get('/api/admin/languages')
    ]);
    const set = (id, items, labelKey, valueKey, withEmpty = true) => {
      const sel = document.getElementById(id);
      if (withEmpty) sel.insertAdjacentHTML('beforeend', '');
      sel.insertAdjacentHTML('beforeend', items
        .map((i) => `<option value="${i[valueKey]}">${App.escapeHtml(i[labelKey])}</option>`).join(''));
    };
    set('b-category', cats.items, 'name', 'id');
    set('b-class', classes.items, 'classNumber', 'classNumber');
    set('b-subject', subjects.items, 'name', 'id');
    set('b-language', langs.items, 'name', 'id');
    set('i-category', cats.items, 'name', 'id');
  }
  fillSelects().catch((e) => App.toast(e.message, 'error'));

  // ---- Ommaviy PDF ----
  const filesInput = document.getElementById('b-files');
  const zone = document.getElementById('pdf-zone');
  const filesInfo = document.getElementById('b-files-info');

  filesInput.addEventListener('change', () => {
    const n = filesInput.files.length;
    filesInfo.textContent = n ? `${n} ta fayl tanlandi` : 'Hozir hech narsa tanlanmagan';
  });
  ['dragover', 'dragenter'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, () => zone.classList.remove('drag')));
  zone.addEventListener('drop', (e) => {
    const dropped = e.dataTransfer && e.dataTransfer.files;
    if (!dropped || !dropped.length) return;
    const dt = new DataTransfer();
    Array.from(dropped).forEach((f) => {
      if (/pdf/i.test(f.type) || /\.pdf$/i.test(f.name)) dt.items.add(f);
    });
    if (dt.files.length) {
      filesInput.files = dt.files;
      filesInput.dispatchEvent(new Event('change'));
    }
  });

  document.getElementById('b-submit').addEventListener('click', async () => {
    const errBox = document.getElementById('b-error');
    const resultsBox = document.getElementById('b-results');
    errBox.style.display = 'none';
    resultsBox.innerHTML = '';

    const categoryId = document.getElementById('b-category').value;
    if (!categoryId) {
      errBox.textContent = 'Adabiyot turini tanlang';
      errBox.style.display = 'block';
      return;
    }
    const files = filesInput.files;
    if (!files.length) {
      errBox.textContent = 'Kamida bitta PDF fayl tanlang';
      errBox.style.display = 'block';
      return;
    }

    const fd = new FormData();
    fd.set('category_id', categoryId);
    fd.set('class_id', document.getElementById('b-class').value);
    fd.set('subject_id', document.getElementById('b-subject').value);
    fd.set('language_id', document.getElementById('b-language').value);
    fd.set('author', document.getElementById('b-author').value.trim());
    fd.set('publisher', document.getElementById('b-publisher').value.trim());
    fd.set('publication_year', document.getElementById('b-year').value);
    fd.set('is_published', document.getElementById('b-publish').checked ? '1' : '0');
    Array.from(files).forEach((f) => fd.append('pdfs', f));

    const btn = document.getElementById('b-submit');
    btn.disabled = true;
    document.getElementById('b-progress-wrap').style.display = 'block';
    try {
      const data = await API.upload('/api/admin/books/bulk-pdf', fd, (pct) => {
        document.getElementById('b-progress-fill').style.width = pct + '%';
      });
      const ok = data.results.filter((r) => r.ok);
      const failed = data.results.filter((r) => !r.ok);
      resultsBox.innerHTML = `
        <p><b class="status-badge green">${ok.length} ta saqlandi</b>
        ${failed.length ? `<b class="status-badge red">${failed.length} ta xato</b>` : ''}</p>
        ${data.results.map((r) => `
          <div class="result-row">
            ${r.ok
              ? `<i class="fa-solid fa-check" style="color:var(--success)"></i> ${App.escapeHtml(r.title)}`
              : `<i class="fa-solid fa-xmark" style="color:var(--danger)"></i> ${App.escapeHtml(r.title)} — ${App.escapeHtml(r.error)}`}
          </div>`).join('')}`;
      filesInput.value = '';
      filesInfo.textContent = 'Hozir hech narsa tanlanmagan';
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    } finally {
      btn.disabled = false;
      document.getElementById('b-progress-wrap').style.display = 'none';
      document.getElementById('b-progress-fill').style.width = '0%';
    }
  });

  // ---- Import ----
  document.getElementById('i-submit').addEventListener('click', async () => {
    const errBox = document.getElementById('i-error');
    const resultsBox = document.getElementById('i-results');
    errBox.style.display = 'none';
    resultsBox.innerHTML = '';

    const file = document.getElementById('i-file').files[0];
    if (!file) {
      errBox.textContent = 'CSV yoki Excel faylni tanlang';
      errBox.style.display = 'block';
      return;
    }
    const fd = new FormData();
    fd.set('category_id', document.getElementById('i-category').value);
    fd.set('file', file);

    const btn = document.getElementById('i-submit');
    btn.disabled = true;
    document.getElementById('i-progress-wrap').style.display = 'block';
    try {
      const data = await API.upload('/api/admin/books/import', fd, (pct) => {
        document.getElementById('i-progress-fill').style.width = pct + '%';
      });
      resultsBox.innerHTML = `
        <p><b class="status-badge green">${data.created} ta qo‘shildi</b>
           <b class="status-badge gray">${data.skipped} ta o‘tkazib yuborildi</b>
           ${data.errors.length ? `<b class="status-badge red">${data.errors.length} ta xato</b>` : ''}</p>
        ${data.errors.slice(0, 20).map((e2) => `<div class="result-row">${App.escapeHtml(e2)}</div>`).join('')}`;
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    } finally {
      btn.disabled = false;
      document.getElementById('i-progress-wrap').style.display = 'none';
      document.getElementById('i-progress-fill').style.width = '0%';
    }
  });
})();
