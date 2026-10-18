'use strict';

(async function () {
  const user = await Admin.require();
  if (!user) return;

  const form = document.getElementById('settings-form');
  const errBox = document.getElementById('s-error');

  try {
    const data = await API.get('/api/admin/settings');
    const s = data.settings;
    document.getElementById('allow-downloads').checked = s.allow_downloads === '1';
    document.getElementById('timer').value = s.download_timer_seconds || '5';
    document.getElementById('allow-registration').checked = s.allow_registration === '1';
    document.getElementById('site-desc').value = s.site_description || '';
  } catch (err) {
    errBox.textContent = err.message;
    errBox.style.display = 'block';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.style.display = 'none';
    try {
      await API.put('/api/admin/settings', {
        allow_downloads: document.getElementById('allow-downloads').checked ? '1' : '0',
        download_timer_seconds: document.getElementById('timer').value,
        allow_registration: document.getElementById('allow-registration').checked ? '1' : '0',
        site_description: document.getElementById('site-desc').value
      });
      App.toast('Sozlamalar saqlandi', 'success');
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    }
  });
})();
