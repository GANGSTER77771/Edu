'use strict';

(function () {
  const slug = App.qs('id');
  let book = null;
  let isFavorite = false;

  async function load() {
    if (!slug) return showError('Kitob tanlanmagan');
    try {
      const data = await API.get(`/api/books/${encodeURIComponent(slug)}`);
      book = data.book;
      isFavorite = data.favorite;
      render(data.lastPage);
    } catch (err) {
      showError(err.message);
    }
  }

  function showError(msg) {
    document.getElementById('book-wrap').classList.add('hidden');
    const errBox = document.getElementById('book-error');
    errBox.classList.remove('hidden');
    document.getElementById('book-error-text').textContent = msg;
  }

  function render(lastPage) {
    document.title = `${book.title} — EDUKITOB`;
    document.getElementById('book-wrap').classList.remove('hidden');
    document.getElementById('book-title').textContent = book.title;

    const coverEl = document.getElementById('book-cover');
    coverEl.innerHTML = book.has_cover
      ? `<img src="/api/books/${book.id}/cover" alt="${App.escapeHtml(book.title)}" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.remove();document.querySelector('#book-cover .cover-fallback').style.display='flex'"><div class="cover-fallback" style="display:none">${App.escapeHtml(book.title)}</div>`
      : `<div class="cover-fallback" style="display:flex;height:100%;font-size:18px">${App.escapeHtml(book.title)}</div>`;

    const tags = [
      book.class_number ? `${book.class_number}-sinf` : null,
      book.subject_name, book.category_name, book.language_name
    ].filter(Boolean);
    document.getElementById('book-tags').innerHTML = tags
      .map((t) => `<span class="tag" style="background:var(--surface-2);padding:3px 10px;border-radius:999px;font-size:13px">${App.escapeHtml(t)}</span>`)
      .join('');

    const rows = [
      ['Muallif', book.author],
      ['Nashriyot', book.publisher],
      ['Nashr yili', book.publication_year],
      ['Sahifalar soni', book.page_count],
      ['PDF hajmi', App.fmtBytes(book.file_size)],
      ['Qo‘shilgan sana', App.fmtDate(book.created_at)]
    ].filter(([, v]) => v);
    document.getElementById('book-info').innerHTML = rows
      .map(([k, v]) => `<tr><td style="padding:6px 18px 6px 0;color:var(--text-muted)">${k}</td><td style="padding:6px 0;font-weight:600">${App.escapeHtml(v)}</td></tr>`)
      .join('');

    document.getElementById('book-description').textContent = book.description || 'Tavsif kiritilmagan.';

    const crumbs = document.getElementById('crumbs');
    let crumbHtml = '<a href="/index.html">Bosh sahifa</a><span class="sep">›</span><a href="/library.html">Kutubxona</a>';
    if (book.category_slug) crumbHtml += `<span class="sep">›</span><a href="/books.html?category=${App.escapeHtml(book.category_slug)}">${App.escapeHtml(book.category_name)}</a>`;
    crumbHtml += `<span class="sep">›</span>${App.escapeHtml(book.title)}`;
    crumbs.innerHTML = crumbHtml;

    const readBtn = document.getElementById('btn-read');
    readBtn.href = `/reader.html?id=${book.slug}`;
    readBtn.textContent = lastPage && lastPage > 1 ? `Davom ettirish — ${lastPage}-sahifa` : 'Onlayn o‘qish';

    updateFavButton();

    const dl = document.getElementById('btn-download');
    if (book.allow_download) {
      dl.classList.remove('hidden');
      dl.addEventListener('click', () => DownloadFlow.openModal(book));
    } else {
      dl.classList.add('hidden');
    }

    document.getElementById('btn-share').addEventListener('click', openShare);
    document.getElementById('btn-favorite').addEventListener('click', toggleFavorite);
  }

  function updateFavButton() {
    const btn = document.getElementById('btn-favorite');
    btn.textContent = isFavorite ? '♥ Sevimlilarda' : '♡ Sevimlilarga qo‘shish';
  }

  async function toggleFavorite() {
    if (!App.user) {
      location.href = '/login.html?next=' + encodeURIComponent(location.pathname + location.search);
      return;
    }
    try {
      if (isFavorite) {
        await API.del(`/api/me/favorites/${book.id}`);
        isFavorite = false;
        App.toast('Sevimlilardan olib tashlandi');
      } else {
        await API.post(`/api/me/favorites/${book.id}`);
        isFavorite = true;
        App.toast('Sevimlilarga qo‘shildi', 'success');
      }
      updateFavButton();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }

  function openShare() {
    const url = `${location.origin}/book.html?id=${book.slug}`;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal qr-wrap" role="dialog" aria-modal="true" aria-label="Ulashish">
        <button class="modal-close" type="button" aria-label="Yopish">✕</button>
        <h3>Kitob havolasi va QR-kod</h3>
        <img src="/api/books/${book.id}/qr" alt="QR kod" width="220" height="220">
        <div class="share-link">
          <input readonly value="${App.escapeHtml(url)}" aria-label="Havola">
          <button class="btn btn-primary btn-sm" type="button" id="copy-link">Nusxalash</button>
        </div>
        <p class="muted" style="font-size:13px">Bu havola va QR-kodni do‘stlaringiz yoki o‘quvchilaringizga yuborishingiz mumkin.</p>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#copy-link').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url);
        App.toast('Havola nusxalandi', 'success');
      } catch (_) {
        overlay.querySelector('input').select();
        document.execCommand('copy');
        App.toast('Havola nusxalandi', 'success');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', load);
})();
