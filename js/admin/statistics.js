'use strict';

(async function () {
  const user = await Admin.require();
  if (!user) return;

  function fillBars(elId, series) {
    const el = document.getElementById(elId);
    const map = Object.fromEntries(series.map((s) => [s.day, s.count]));
    const days = [];
    const n = parseInt(document.getElementById('days').value, 10) || 14;
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
      days.push({ day: d, count: map[d] || 0 });
    }
    const max = Math.max(1, ...days.map((d) => d.count));
    el.innerHTML = days.map((d) => `
      <div class="bar" style="height:${Math.max(2, Math.round((d.count / max) * 100))}%">
        <span class="tip">${d.day}: ${d.count}</span>
      </div>`).join('');
  }

  async function load() {
    const days = document.getElementById('days').value;
    try {
      const data = await API.get(`/api/admin/statistics?days=${days}`);
      fillBars('bars-views', data.dailyViews);
      fillBars('bars-downloads', data.dailyDownloads);
      fillBars('bars-attempts', data.dailyAttempts);

      const tb = document.querySelector('#top-books tbody');
      tb.innerHTML = data.topBooks.length
        ? data.topBooks.map((b) => `
            <tr>
              <td><a href="/book.html?id=${App.escapeHtml(b.slug)}" target="_blank">${App.escapeHtml(b.title)}</a></td>
              <td>${b.views}</td>
              <td>${b.downloads}</td>
            </tr>`).join('')
        : '<tr><td colspan="3" class="muted">Ma‘lumot yo‘q</td></tr>';

      const tt = document.querySelector('#top-tests tbody');
      tt.innerHTML = data.topTests.length
        ? data.topTests.map((t) => `
            <tr>
              <td>${App.escapeHtml(t.title)}</td>
              <td><span class="code-box" style="font-size:13px;padding:2px 8px">${App.escapeHtml(t.code)}</span></td>
              <td>${t.attempts}</td>
              <td>${t.attempts ? t.avg_percent + '%' : '—'}</td>
            </tr>`).join('')
        : '<tr><td colspan="4" class="muted">Ma‘lumot yo‘q</td></tr>';
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }

  document.getElementById('days').addEventListener('change', load);
  load();
})();
