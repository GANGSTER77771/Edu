'use strict';

(function () {
  const attemptId = App.qs('attempt');

  async function init() {
    const user = await App.requireRolePage('student', 'teacher', 'admin');
    if (!user || !attemptId) return;
    try {
      const data = await API.get(`/api/attempts/${attemptId}/result`);
      render(data);
    } catch (err) {
      document.getElementById('result-body').innerHTML = `
        <div class="empty-state"><div class="icon">⚠️</div><p>${App.escapeHtml(err.message)}</p></div>`;
    }
  }

  function render(data) {
    const body = document.getElementById('result-body');
    if (data.resultsHidden) {
      body.innerHTML = `
        <div class="form-card" style="text-align:center">
          <div style="font-size:40px;margin-bottom:8px">🔒</div>
          <h2 style="font-size:19px">Natijalar hozircha yashirilgan</h2>
          <p class="muted">${App.escapeHtml(data.message || 'O‘qituvchi natijalarni keyinroq ochadi.')}</p>
          <p class="muted">Test: <b>${App.escapeHtml(data.test.title)}</b></p>
        </div>`;
      document.title = `Natija — ${data.test.title} — EDUKITOB`;
      return;
    }
    const a = data.attempt;
    const good = a.percent >= 60;
    document.title = `Natija: ${a.percent}% — EDUKITOB`;
    let html = `
      <div class="score-hero">
        <div class="percent">${a.percent}%</div>
        <div class="sub">${a.score} / ${a.maxScore} ball · Sarflangan vaqt: ${App.fmtDuration(a.timeSpentSeconds)}</div>
        <div class="sub">${good ? 'Ajoyib natija!' : 'Yana mashq qilish foydali bo‘lar edi.'}</div>
      </div>
      <h2 style="font-size:19px">${App.escapeHtml(data.test.title)}</h2>
      <p class="muted" style="margin-top:0">Topshirilgan: ${App.fmtDateTime(a.submittedAt)}</p>`;

    if (Array.isArray(data.details) && data.details.length) {
      html += data.details.map((d, qi) => {
        const cls = d.isCorrect ? 'correct' : 'wrong';
        const icon = d.isCorrect ? '✅' : '❌';
        return `
        <div class="review-item ${cls}">
          <div class="q-num">${icon} Savol ${qi + 1}${d.isCorrect ? ' — to‘g‘ri' : ' — noto‘g‘ri'}</div>
          <div class="q-text" style="font-size:15.5px;margin:4px 0 10px">${App.escapeHtml(d.text)}</div>
          ${d.options.map((o) => {
            const classes = [];
            if (o.isCorrect === true) classes.push('correct-opt');
            if (o.chosen && o.isCorrect === false) classes.push('chosen-wrong');
            const mark = o.chosen ? ' ✍ sizning javobingiz' : (o.isCorrect === true ? ' ✔ to‘g‘ri javob' : '');
            return `<div class="opt-line ${classes.join(' ')}">${App.escapeHtml(o.text)}${mark ? `<span style="opacity:.75;font-size:12.5px;margin-left:auto">${mark}</span>` : ''}</div>`;
          }).join('')}
          ${!d.answered ? '<div class="muted" style="font-size:13px;margin-top:6px">Javob berilmagan</div>' : ''}
        </div>`;
      }).join('');
    }
    body.innerHTML = html;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
