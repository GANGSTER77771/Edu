'use strict';

(function () {
  const attemptId = App.qs('attempt');
  const code = (App.qs('code') || '').trim();
  let questions = [];
  const answers = new Map();
  let deadline = null;
  let timerInterval = null;
  let submitted = false;

  async function init() {
    const user = await App.requireRolePage('student', 'teacher', 'admin');
    if (!user) return;

    let target = attemptId;
    if (!target && code) {
      try {
        const info = await API.post('/api/tests/join', { code });
        if (!info.canStart) {
          return renderError(info.reason || 'Test hozircha ochilmagan');
        }
        const started = await API.post(`/api/tests/${info.test.id}/start`);
        target = started.attemptId;
        history.replaceState(null, '', `/test.html?attempt=${target}`);
      } catch (err) {
        return renderError(err.message);
      }
    }
    if (!target) return renderError('Urinish topilmadi. Kabinetdan test kodini kiriting.');
    loadAttempt(target);
  }

  function renderError(msg) {
    document.getElementById('test-title').textContent = 'Xatolik';
    document.getElementById('test-body').innerHTML = `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <p>${App.escapeHtml(msg)}</p>
        <a class="btn btn-primary" href="/cabinet.html">Kabinetga qaytish</a>
      </div>`;
  }

  async function loadAttempt(id) {
    try {
      const data = await API.get(`/api/attempts/${id}`);
      questions = data.questions;
      deadline = data.attempt.deadline ? new Date(data.attempt.deadline) : null;
      document.getElementById('test-title').textContent = data.test.title;
      renderQuestions();
      updateCount();
      startTimer();
    } catch (err) {
      if (err.status === 410) {
        renderError(err.message);
      } else {
        renderError(err.message);
      }
    }
  }

  function renderQuestions() {
    const body = document.getElementById('test-body');
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    body.innerHTML = questions.map((q, qi) => `
      <div class="question-card" data-q="${q.id}">
        <div class="q-num">Savol ${qi + 1} · ${q.points} ball</div>
        <div class="q-text">${App.escapeHtml(q.text)}</div>
        ${q.options.map((o, oi) => `
          <div class="option-row" data-q="${q.id}" data-o="${o.id}" role="radio" tabindex="0" aria-checked="false">
            <span class="opt-letter">${letters[oi] || '?'}</span>
            <span>${App.escapeHtml(o.text)}</span>
          </div>`).join('')}
      </div>`).join('');

    body.querySelectorAll('.option-row').forEach((row) => {
      const pick = () => {
        const qid = row.dataset.q;
        body.querySelectorAll(`.option-row[data-q="${qid}"]`).forEach((r) => {
          r.classList.remove('selected');
          r.setAttribute('aria-checked', 'false');
        });
        row.classList.add('selected');
        row.setAttribute('aria-checked', 'true');
        answers.set(qid, row.dataset.o);
        updateCount();
      };
      row.addEventListener('click', pick);
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
  }

  function updateCount() {
    document.getElementById('answered-count').textContent = `Javob berilgan: ${answers.size} / ${questions.length}`;
  }

  function startTimer() {
    if (!deadline) return;
    const el = document.getElementById('timer');
    el.classList.remove('hidden');
    const tick = () => {
      const left = deadline - Date.now();
      if (left <= 0) {
        clearInterval(timerInterval);
        el.textContent = '00:00';
        el.className = 'timer-box danger';
        App.toast('Vaqt tugadi! Test avtomatik topshirilmoqda...', 'error');
        submit(true);
        return;
      }
      const totalSec = Math.floor(left / 1000);
      const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const ss = String(totalSec % 60).padStart(2, '0');
      el.textContent = `${mm}:${ss}`;
      if (totalSec < 60) el.className = 'timer-box danger';
      else if (totalSec < 180) el.className = 'timer-box warn';
      else el.className = 'timer-box';
    };
    tick();
    timerInterval = setInterval(tick, 1000);
  }

  async function submit(auto = false) {
    if (submitted) return;
    const unanswered = questions.length - answers.size;
    if (!auto && unanswered > 0) {
      if (!confirm(`${unanswered} ta savol javobsiz qoldi. Baribir topshirasizmi?`)) return;
    }
    submitted = true;
    clearInterval(timerInterval);
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = 'Tekshirilmoqda...';
    const payload = [...answers.entries()].map(([questionId, optionId]) => ({
      questionId: Number(questionId),
      optionId: Number(optionId)
    }));
    try {
      const result = await API.post(`/api/attempts/${attemptId}/submit`, { answers: payload });
      if (result.attempt && result.attempt.status === 'submitted') {
        location.href = `/result.html?attempt=${attemptId}`;
      } else {
        location.href = `/result.html?attempt=${attemptId}`;
      }
    } catch (err) {
      submitted = false;
      btn.disabled = false;
      btn.textContent = 'Testni yakunlash va topshirish';
      App.toast(err.message, 'error');
    }
  }

  document.getElementById('submit-btn').addEventListener('click', () => submit(false));

  // Sahifani tark etishda ogohlantirish (faol urinish yo'qolmasligi uchun)
  window.addEventListener('beforeunload', (e) => {
    if (!submitted && questions.length) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  document.addEventListener('DOMContentLoaded', init);
})();
