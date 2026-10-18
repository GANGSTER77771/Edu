'use strict';

(async function () {
  const user = await Admin.require();
  if (!user) return;

  const tbody = document.querySelector('#tests-table tbody');

  async function load() {
    try {
      const data = await API.get('/api/teacher/tests');
      if (!data.items.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="muted" style="text-align:center;padding:30px">Hozircha test yaratilmagan</td></tr>';
        return;
      }
      tbody.innerHTML = data.items.map((t) => {
        const status = {
          draft: '<span class="status-badge gray">Qoralama</span>',
          open: '<span class="status-badge green">Ochiq</span>',
          closed: '<span class="status-badge red">Yopiq</span>'
        }[t.status];
        return `
        <tr>
          <td><b>${App.escapeHtml(t.title)}</b><br><span class="muted">${t.class_id ? t.class_id + '-sinf · ' : ''}${t.time_limit_minutes ? t.time_limit_minutes + ' daq · ' : ''}${t.max_attempts} urinish</span></td>
          <td>${App.escapeHtml(t.teacher_name || '—')}</td>
          <td><span class="code-box" style="font-size:14px;padding:3px 9px">${App.escapeHtml(t.code)}</span></td>
          <td>${t.question_count}</td>
          <td>${status}</td>
          <td>${t.attempt_count}</td>
          <td>${t.attempt_count ? t.avg_percent + '%' : '—'}</td>
          <td class="text-right">
            <div class="flex gap-1" style="justify-content:flex-end;flex-wrap:wrap">
              ${t.status !== 'open' ? `<button class="btn btn-sm btn-primary" data-action="open" data-id="${t.id}">Ochish</button>` : ''}
              ${t.status === 'open' ? `<button class="btn btn-sm btn-ghost" data-action="close" data-id="${t.id}">Yopish</button>` : ''}
              <a class="btn btn-sm btn-outline" href="/teacher-results.html?id=${t.id}">Natijalar</a>
              <button class="btn btn-sm btn-danger" data-action="delete" data-id="${t.id}">O‘chirish</button>
            </div>
          </td>
        </tr>`;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" class="muted">${App.escapeHtml(err.message)}</td></tr>`;
    }
  }

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    try {
      if (btn.dataset.action === 'open') {
        await API.post(`/api/teacher/tests/${id}/status`, { status: 'open' });
        App.toast('Test ochildi', 'success');
      } else if (btn.dataset.action === 'close') {
        await API.post(`/api/teacher/tests/${id}/status`, { status: 'closed' });
        App.toast('Test yopildi');
      } else if (btn.dataset.action === 'delete') {
        if (!confirm('Testni butunlay o‘chirasizmi? Barcha natijalar ham o‘chadi.')) return;
        await API.del(`/api/teacher/tests/${id}`);
        App.toast('Test o‘chirildi');
      }
      load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  });

  load();
})();
