'use strict';

(async function () {
  const user = await Admin.require();
  if (!user) return;

  const mode = document.body.dataset.mode === 'edit' ? 'edit' : 'add';
  const bookId = mode === 'edit' ? Number(App.qs('id')) : null;
  const form = document.getElementById('book-form');
  const errorBox = document.getElementById('form-error');
  const progressWrap = document.getElementById('progress-wrap');
  const progressFill = document.getElementById('progress-fill');
  const submitBtn = document.getElementById('submit-btn');
  const coverInput = document.getElementById('cover');
  const coverPreview = document.getElementById('cover-preview');

  let current = null;

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
    errorBox.scrollIntoView({ block: 'nearest' });
  }

  coverInput.addEventListener('change', () => {
    const file = coverInput.files[0];
    if (file) {
      coverPreview.src = URL.createObjectURL(file);
      coverPreview.hidden = false;
    } else if (current && current.has_cover) {
      coverPreview.src = `/api/books/${current.id}/cover`;
    } else {
      coverPreview.hidden = true;
    }
  });

  // ---- Tanlovlar ----
  async function loadSelects() {
    const [cats, classes, subjects, langs] = await Promise.all([
      API.get('/api/admin/categories'),
      API.get('/api/classes'),
      API.get('/api/admin/subjects'),
      API.get('/api/admin/languages')
    ]);
    const set = (id, items, labelKey, valueKey) => {
      const sel = document.getElementById(id);
      sel.insertAdjacentHTML('beforeend', items
        .map((i) => `<option value="${i[valueKey]}">${App.escapeHtml(i[labelKey])}</option>`).join(''));
      return sel;
    };
    set('category', cats.items, 'name', 'id');
    set('class', classes.items, 'classNumber', 'classNumber');
    set('subject', subjects.items, 'name', 'id');
    set('language', langs.items, 'name', 'id');
  }

  function fillForm(b) {
    current = b;
    document.getElementById('title').value = b.title || '';
    document.getElementById('category').value = b.category_id || '';
    document.getElementById('class').value = b.class_id || '';
    document.getElementById('subject').value = b.subject_id || '';
    document.getElementById('language').value = b.language_id || '';
    document.getElementById('year').value = b.publication_year || '';
    document.getElementById('author').value = b.author || '';
    document.getElementById('publisher').value = b.publisher || '';
    document.getElementById('description').value = b.description || '';
    document.getElementById('allow-download').checked = !!b.allow_download;
    document.getElementById('is-published').checked = !!b.is_published;

    const info = [];
    info.push(`Slug: ${b.slug}`);
    info.push(`Ko‘rishlar: ${b.views || 0}`);
    info.push(`Qo‘shilgan: ${App.fmtDateTime(b.created_at)}`);
    document.getElementById('current-info').innerHTML = info.map(App.escapeHtml).join(' · ');

    const pdfStatus = document.getElementById('pdf-status');
    if (b.has_pdf) pdfStatus.textContent = `Hozirgi PDF: ${App.fmtBytes(b.file_size)}. Almashtirish uchun yangi fayl tanlang.`;
    else pdfStatus.textContent = 'PDF fayl hali yuklanmagan — nashr etishdan oldin yuklang.';

    if (b.has_cover) {
      coverPreview.src = `/api/books/${b.id}/cover`;
      coverPreview.hidden = false;
    }
  }

  function collect() {
    const fd = new FormData();
    fd.set('title', document.getElementById('title').value.trim());
    fd.set('category_id', document.getElementById('category').value);
    fd.set('class_id', document.getElementById('class').value);
    fd.set('subject_id', document.getElementById('subject').value);
    fd.set('language_id', document.getElementById('language').value);
    fd.set('publication_year', document.getElementById('year').value);
    fd.set('author', document.getElementById('author').value.trim());
    fd.set('publisher', document.getElementById('publisher').value.trim());
    fd.set('description', document.getElementById('description').value.trim());
    fd.set('allow_download', document.getElementById('allow-download').checked ? '1' : '0');
    fd.set('is_published', document.getElementById('is-published').checked ? '1' : '0');
    const pdf = document.getElementById('pdf').files[0];
    const cover = coverInput.files[0];
    if (pdf) fd.set('pdf', pdf);
    if (cover) fd.set('cover', cover);
    return fd;
  }

  function validate(fd) {
    if ((fd.get('title') || '').length < 2) return 'Kitob nomini kiriting';
    if (!fd.get('category_id')) return 'Adabiyot turini tanlang';
    if (mode === 'add' && !fd.get('pdf')) return 'PDF fayl tanlang';
    return null;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';
    const fd = collect();
    const invalid = validate(fd);
    if (invalid) return showError(invalid);

    submitBtn.disabled = true;
    progressWrap.style.display = 'block';
    progressFill.style.width = '0%';
    try {
      if (mode === 'add') {
        await API.upload('/api/admin/books', fd, (pct) => { progressFill.style.width = pct + '%'; });
        App.toast('Kitob saqlandi', 'success');
      } else {
        await API.upload(`/api/admin/books/${bookId}`, fd, (pct) => { progressFill.style.width = pct + '%'; }, 'PATCH');
        App.toast('Kitob yangilandi', 'success');
      }
      setTimeout(() => { location.href = '/admin/books.html'; }, 600);
    } catch (err) {
      showError(err.message);
      submitBtn.disabled = false;
      progressWrap.style.display = 'none';
    }
  });

  try {
    await loadSelects();
    if (mode === 'edit') {
      if (!Number.isFinite(bookId) || bookId <= 0) {
        document.getElementById('loading-box').innerHTML = '<p class="muted">Kitob ID ko‘rsatilmagan.</p>';
        return;
      }
      const data = await API.get(`/api/admin/books/${bookId}`);
      fillForm(data.book);
      document.getElementById('loading-box').hidden = true;
      form.hidden = false;
    }
  } catch (err) {
    document.getElementById('loading-box').innerHTML = `<p class="muted">${App.escapeHtml(err.message)}</p>`;
  }
})();
