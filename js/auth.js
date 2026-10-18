'use strict';

(function () {
  const isLogin = !!document.getElementById('login-form');
  const form = document.getElementById(isLogin ? 'login-form' : 'register-form');
  const errBox = document.getElementById(isLogin ? 'login-error' : 'register-error');
  const submitBtn = document.getElementById('submit-btn');

  function showError(msg) {
    errBox.textContent = msg;
    errBox.classList.remove('hidden');
  }

  const passToggle = document.getElementById('pass-toggle');
  if (passToggle) {
    passToggle.addEventListener('click', () => {
      const input = document.getElementById('password');
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  }

  function nextUrl() {
    const next = App.qs('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) return next;
    return '/cabinet.html';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.classList.add('hidden');
    submitBtn.disabled = true;
    try {
      if (isLogin) {
        await API.post('/api/auth/login', {
          email: document.getElementById('email').value,
          password: document.getElementById('password').value
        });
      } else {
        await API.post('/api/auth/register', {
          fullName: document.getElementById('fullName').value,
          email: document.getElementById('email').value,
          password: document.getElementById('password').value,
          role: document.getElementById('role').value
        });
      }
      const me = await API.get('/api/auth/me');
      if (me.user && me.user.role === 'admin') {
        location.href = '/admin/index.html';
        return;
      }
      location.href = nextUrl();
    } catch (err) {
      showError(err.message);
      submitBtn.disabled = false;
    }
  });

  document.addEventListener('DOMContentLoaded', async () => {
    const me = await API.get('/api/auth/me').catch(() => null);
    if (me && me.user) location.href = me.user.role === 'admin' ? '/admin/index.html' : '/cabinet.html';
  });
})();
