'use strict';

(function () {
  // Allaqachon admin sifatida kirgan bo'lsa — panelga yo'naltirish
  API.get('/api/admin/me').then(() => {
    const next = new URLSearchParams(location.search).get('next');
    location.href = next && next.startsWith('/admin/') ? next : '/admin/index.html';
  }).catch(() => { /* kirish formasini ko'rsatish */ });

  const form = document.getElementById('login-form');
  const errorBox = document.getElementById('error-box');
  const submitBtn = document.getElementById('submit-btn');
  const passInput = document.getElementById('password');

  document.getElementById('toggle-pass').addEventListener('click', () => {
    const show = passInput.type === 'password';
    passInput.type = show ? 'text' : 'password';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Tekshirilmoqda...';
    try {
      await API.post('/api/admin/login', {
        email: document.getElementById('email').value.trim(),
        password: passInput.value
      });
      const next = new URLSearchParams(location.search).get('next');
      location.href = next && next.startsWith('/admin/') ? next : '/admin/index.html';
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Kirish';
    }
  });
})();
