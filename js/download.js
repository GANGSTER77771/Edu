'use strict';

// PDF yuklab olish: 5 soniyalik taymer faqat interfeys elementi.
// Server imzolangan, qisqa muddatli token bilan ruxsatni tekshiradi.
const DownloadFlow = {
  timerSeconds: 5,

  wifiOnlyEnabled() {
    try { return localStorage.getItem('edk_wifi_only') === '1'; } catch (_) { return false; }
  },

  onMeteredConnection() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return false;
    return conn.type === 'cellular' || /2g|3g|4g|5g|slow-2g/.test(conn.effectiveType || '');
  },

  openModal(book, onReady) {
    if (this.wifiOnlyEnabled() && this.onMeteredConnection()) {
      App.toast('"Faqat Wi-Fi orqali yuklash" yoqilgan. Wi-Fi tarmog‘iga ulaning.', 'error');
      return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="Yuklab olish">
        <button class="modal-close" type="button" aria-label="Yopish">✕</button>
        <h3>PDF yuklab olish</h3>
        <p style="margin:4px 0 2px"><b>${App.escapeHtml(book.title)}</b></p>
        <p class="muted" style="margin-top:0">Hajm: ${App.fmtBytes(book.file_size)}</p>
        <div class="progress-track" style="margin:14px 0"><div class="progress-fill" id="dl-progress" style="width:0%"></div></div>
        <p class="muted" id="dl-status">Taymer: <b id="dl-count">${this.timerSeconds}</b> soniya...</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" data-close>Bekor qilish</button>
          <a class="btn btn-primary" id="dl-btn" style="pointer-events:none;opacity:.5" href="#">Yuklab olish</a>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    let remain = this.timerSeconds;
    const fill = overlay.querySelector('#dl-progress');
    const count = overlay.querySelector('#dl-count');
    const status = overlay.querySelector('#dl-status');
    const btn = overlay.querySelector('#dl-btn');

    const tick = setInterval(() => {
      remain -= 1;
      count.textContent = Math.max(0, remain);
      fill.style.width = Math.min(100, ((this.timerSeconds - remain) / this.timerSeconds) * 100) + '%';
      if (remain <= 0) {
        clearInterval(tick);
        status.textContent = 'Taymer tugadi. Serverdan ruxsat olinmoqda...';
        this.requestToken(book).then((token) => {
          status.textContent = 'Yuklab olish tayyor';
          btn.removeAttribute('style');
          btn.href = 'javascript:void(0)';
          btn.addEventListener('click', async () => {
            btn.style.opacity = '.5';
            btn.textContent = 'Yuklanmoqda...';
            try {
              await this.download(book, token);
              status.textContent = 'Yuklab olindi';
              setTimeout(close, 900);
            } catch (err) {
              status.textContent = 'Xato: ' + err.message;
              btn.textContent = 'Qayta urinish';
              btn.removeAttribute('style');
              btn.onclick = () => this.requestToken(book).then((t) => this.download(book, t)).catch((e) => App.toast(e.message, 'error'));
            }
          });
        }).catch((err) => {
          status.textContent = err.message;
        });
      }
    }, 1000);
    fill.style.width = '0%';
  },

  async requestToken(book) {
    const data = await API.post(`/api/books/${book.id}/download-session`);
    return data.token;
  },

  async download(book, token) {
    const res = await API.request('POST', `/api/books/${book.id}/download`, { token }, { raw: true });
    if (!res.ok) {
      let msg = 'Yuklab olishda xato';
      try { msg = (await res.json()).error || msg; } catch (_) { /* noop */ }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (book.slug || 'kitob') + '.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 8000);
  }
};

window.DownloadFlow = DownloadFlow;
