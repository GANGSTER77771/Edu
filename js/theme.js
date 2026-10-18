'use strict';

(function () {
  const THEME_KEY = 'edk_theme';
  const TEXT_SIZE_KEY = 'edk_text_size';
  const SIZES = [0.9, 1, 1.15, 1.3];

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      const icon = btn.querySelector('.theme-icon');
      if (icon) icon.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun" aria-hidden="true"></i>' : '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
      btn.setAttribute('aria-label', theme === 'dark' ? 'Yorug‘ rejim' : 'Tungi rejim');
    });
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function savedTheme() {
    try { return localStorage.getItem(THEME_KEY) || null; } catch (_) { return null; }
  }

  function applyTextSize(value) {
    const zoom = SIZES.includes(Number(value)) ? Number(value) : 1;
    document.body.style.zoom = zoom === 1 ? '' : String(zoom);
  }

  function savedTextSize() {
    try { return localStorage.getItem(TEXT_SIZE_KEY) || '1'; } catch (_) { return '1'; }
  }

  apply(savedTheme() || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  applyTextSize(savedTextSize());

  window.ThemeToggle = function () {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (_) { /* noop */ }
  };

  window.TextSize = {
    current: savedTextSize,
    set(value) {
      applyTextSize(value);
      try { localStorage.setItem(TEXT_SIZE_KEY, String(value)); } catch (_) { /* noop */ }
    }
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme-toggle]');
    if (btn) window.ThemeToggle();
  });

  // Sahifa yuklanishida twinkle oldini olish uchun tema head'da qo'llanadi (inline-skript CSPga tushmaydi,
  // shu sababli bu yerda qayta qo'llanadi)
  apply(savedTheme() || currentTheme());
  applyTextSize(savedTextSize());
})();
