'use strict';

// Barcha so'rovlar uchun umumiy API klient. CSRF tokenni cookie + header (double-submit) usulida yuboradi.
const API = {
  getTokenFromCookie() {
    const m = document.cookie.match(/(?:^|;\s*)edk_csrf=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  },

  async ensureCsrf() {
    if (this.getTokenFromCookie()) return;
    try { await fetch('/api/auth/csrf', { credentials: 'same-origin' }); } catch (_) { /* ignore */ }
  },

  async request(method, url, body, { raw = false } = {}) {
    await this.ensureCsrf();
    const headers = {};
    const mutating = !['GET', 'HEAD'].includes(method);
    if (mutating) headers['x-csrf-token'] = this.getTokenFromCookie();
    if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';

    const res = await fetch(url, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : (body instanceof FormData ? body : JSON.stringify(body))
    });

    if (raw) return res;

    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try { data = await res.json(); } catch (_) { data = null; }
    }
    if (!res.ok) {
      const err = new Error((data && data.error) || `So'rov xatosi (${res.status})`);
      err.status = res.status;
      err.fields = data && data.fields;
      throw err;
    }
    return data;
  },

  get(url) { return this.request('GET', url); },
  post(url, body) { return this.request('POST', url, body || {}); },
  put(url, body) { return this.request('PUT', url, body || {}); },
  patch(url, body) { return this.request('PATCH', url, body || {}); },
  del(url, body) { return this.request('DELETE', url, body || {}); },

  upload(url, formData, onProgress, method = 'POST') {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url);
      xhr.setRequestHeader('x-csrf-token', this.getTokenFromCookie());
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let data = null;
        try { data = JSON.parse(xhr.responseText); } catch (_) { /* noop */ }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else {
          const err = new Error((data && data.error) || `Yuklashda xato (${xhr.status})`);
          err.status = xhr.status;
          err.data = data;
          reject(err);
        }
      };
      xhr.onerror = () => reject(new Error('Tarmoq xatosi'));
      xhr.send(formData);
    });
  }
};

window.API = API;
