'use strict';

(async function () {
  const testId = Number(App.qs('id'));
  const guard = document.getElementById('guard');
  const content = document.getElementById('content');

  const user = await App.requireRolePage('teacher', 'admin');
  if (!user) return;

  if (!Number.isFinite(testId) || testId <= 0) {
    guard.innerHTML = '<p class="muted">Test ID ko‘rsatilmagan.</p><a class="btn btn-outline btn-sm" href="/teacher.html">Qaytish</a>';
    return;
  }

  const pctClass = (p) => (p >= 80 ? 'good' : p >= 60 ? 'mid' : 'bad');

  function render(test, stats, questionStats, attempts) {
    document.getElementById('t-title').textContent = test.title;
    document.getElementById('t-code').textContent = test.code;
    const meta = [
      `${questionStats.length} savol`,
      test.time_limit_minutes ? `${test.time_limit_minutes} daqiqa` : 'Vaqt cheklovsiz',
      `${test.max_attempts} urinish`,
      test.start_at ? `Boshlanish: ${App.fmtDateTime(test.start_at)}` : '',
      test.end_at ? `Tugash: ${App.fmtDateTime(test.end_at)}` : '',
      test.status === 'open' ? 'Ochiq' : test.status === 'draft' ? 'Qoralama' : 'Yopiq'
    ].filter(Boolean);
    document.getElementById('t-meta').innerHTML = meta.map((m) => `<span>${App.escapeHtml(m)}</span>`).join('');

    document.getElementById('stat-grid').innerHTML = [
      { v: stats.attempts, l: 'Topshirishlar' },
      { v: stats.attempts ? stats.avgPercent + '%' : '—', l: 'O‘rtacha foiz' },
      { v: stats.attempts ? stats.bestPercent + '%' : '—', l: 'Eng yaxshi' },
      { v: stats.attempts ? stats.lowestPercent + '%' : '—', l: 'Eng past' },
      { v: stats.attempts ? App.fmtDuration(stats.avgTimeSeconds) : '—', l: 'O‘rtacha vaqt' }
    ].map((s) => `<div class="stat-mini"><div class="val">${s.v}</div><div class="lbl">${s.l}</div></div>`).join('');

    const qs = document.getElementById('q-stats');
    if (!questionStats.length) {
      qs.innerHTML = '<p class="muted" style="margin:0">Savollar topilmadi.</p>';
    } else {
      qs.innerHTML = questionStats.map((q, i) => {
        const rate = q.answered_count ? Math.round((q.correct_count / q.answered_count) * 100) : null;
        const cls = rate === null ? '' : pctClass(rate);
        return `
          <div class="qstat-row">
            <div class="qstat-head">
              <span class="qstat-num">${i + 1}</span>
              <span class="qstat-text">${App.escapeHtml(q.text)}</span>
              <span class="badge ${cls}">${rate === null ? '—' : rate + '%'}</span>
            </div>
            <div class="qstat-bar"><div class="qstat-fill ${cls}" style="width:${rate || 0}%"></div></div>
            <div class="qstat-sub">${q.correct_count}/${q.answered_count} to‘g‘ri javob · ${q.points} ball</div>
          </div>`;
      }).join('');
    }

    const tbody = document.querySelector('#attempts-table tbody');
    const empty = document.getElementById('attempts-empty');
    if (!attempts.length) {
      tbody.innerHTML = '';
      empty.hidden = false;
    } else {
      empty.hidden = true;
      tbody.innerHTML = attempts.map((a) => `
        <tr>
          <td><b>${App.escapeHtml(a.full_name)}</b></td>
          <td class="muted">${App.escapeHtml(a.email)}</td>
          <td>${a.score}/${a.max_score}</td>
          <td><span class="status-badge ${a.percent >= 80 ? 'green' : a.percent >= 60 ? 'amber' : 'red'}">${a.percent}%</span></td>
          <td>${App.fmtDuration(a.time_spent_seconds)}</td>
          <td class="muted">${App.fmtDateTime(a.submitted_at)}</td>
        </tr>`).join('');
    }
  }

  try {
    const data = await API.get(`/api/teacher/tests/${testId}/results`);
    render(data.test, data.stats, data.questionStats, data.attempts);
    guard.hidden = true;
    content.hidden = false;
  } catch (err) {
    guard.innerHTML = `<p class="muted">${App.escapeHtml(err.message)}</p><a class="btn btn-outline btn-sm" href="/teacher.html">Qaytish</a>`;
  }
})();
