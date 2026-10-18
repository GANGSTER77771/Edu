'use strict';

(async function () {
  const user = await Admin.require();
  if (!user) return;

  try {
    const data = await API.get('/api/admin/dashboard');
    const d = data.dashboard;

    document.getElementById('stats').innerHTML = [
      { v: d.booksTotal, l: 'Jami kitoblar', sub: `${d.booksPublished} nashr · ${d.booksHidden} yashir` },
      { v: d.usersTotal, l: 'Foydalanuvchilar', sub: `${d.usersStudents} o‘quvchi · ${d.usersTeachers} o‘qituvchi` },
      { v: d.testsTotal, l: 'Testlar' },
      { v: d.attemptsTotal, l: 'Test topshirishlar' },
      { v: d.viewsTotal, l: 'Kitob ko‘rishlar' },
      { v: d.downloadsTotal, l: 'Yuklab olishlar' },
      { v: d.subjectsTotal, l: 'Fanlar' },
      { v: d.classesTotal, l: 'Sinflar' }
    ].map((s) => `
      <div class="stat-card">
        <div class="val">${s.v}</div>
        <div class="lbl">${s.l}</div>
        ${s.sub ? `<div class="lbl muted">${s.sub}</div>` : ''}
      </div>`).join('');

    const rb = document.getElementById('recent-books');
    if (!data.recentBooks.length) {
      rb.innerHTML = '<p class="muted">Hozircha kitob yo‘q.</p>';
    } else {
      rb.innerHTML = data.recentBooks.map((b) => `
        <div class="result-row flex items-center gap-1">
          <div class="flex-1">
            <a href="/book.html?id=${App.escapeHtml(b.slug)}" target="_blank"><b>${App.escapeHtml(b.title)}</b></a>
            <div class="muted">${App.fmtDateTime(b.created_at)}</div>
          </div>
          ${b.is_published ? '<span class="status-badge green">Nashr</span>' : '<span class="status-badge amber">Qoralama</span>'}
        </div>`).join('');
    }

    const ra = document.getElementById('recent-audit');
    if (!data.recentAudit.length) {
      ra.innerHTML = '<p class="muted">Harakatlar qaydi bo‘sh.</p>';
    } else {
      ra.innerHTML = data.recentAudit.map((a) => `
        <div class="result-row">
          <div class="flex items-center gap-1 flex-wrap">
            <b>${App.escapeHtml(Admin.auditLabel(a.action))}</b>
            <span class="muted">· ${App.escapeHtml(a.actor_name || 'Tizim')} · ${App.fmtDateTime(a.created_at)}</span>
          </div>
          ${a.details ? `<div class="muted">${App.escapeHtml(Admin.auditDetails(a))}</div>` : ''}
        </div>`).join('');
    }
  } catch (err) {
    App.toast(err.message, 'error');
  }
})();
