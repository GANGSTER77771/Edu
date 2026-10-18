'use strict';

(function () {
  const editId = App.qs('id');
  let questions = [];
  let savedTestId = editId;
  let savedCode = null;
  let lockedQuestions = false;

  const qs = (sel) => document.querySelector(sel);

  function blankQuestion() {
    return { text: '', points: 1, options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] };
  }

  function renderQuestions() {
    const wrap = qs('#questions-wrap');
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    wrap.innerHTML = questions.map((q, qi) => `
      <div class="question-editor" data-qi="${qi}">
        <div class="q-head">
          <textarea class="q-text" placeholder="Savol matni (${qi + 1})..." maxlength="1000">${App.escapeHtml(q.text)}</textarea>
          <input type="number" class="q-points" min="1" max="100" value="${q.points}" title="Ball" style="width:80px">
          ${lockedQuestions ? '' : `<button class="del-q" type="button" data-del="${qi}" title="Savolni o‘chirish">🗑</button>`}
        </div>
        <div class="q-options mt-1">
          ${q.options.map((o, oi) => `
            <div class="option-editor">
              <span class="opt-letter" style="width:24px;text-align:center;font-weight:700;color:var(--text-muted)">${letters[oi] || '?'}</span>
              <input type="text" class="opt-text" maxlength="300" value="${App.escapeHtml(o.text)}" placeholder="Javob varianti ${oi + 1}">
              <label class="correct-radio" title="To‘g‘ri javob">
                <input type="radio" name="correct-${qi}" data-qi="${qi}" data-oi="${oi}" ${o.isCorrect ? 'checked' : ''}>
                To‘g‘ri
              </label>
              ${lockedQuestions ? '' : `<button type="button" class="icon-btn" style="width:30px;height:30px" data-delopt="${qi}:${oi}" title="Variantni o‘chirish">✕</button>`}
            </div>`).join('')}
          ${lockedQuestions ? '' : `<button class="btn btn-sm btn-ghost" type="button" data-addopt="${qi}">+ Variant</button>`}
        </div>
      </div>`).join('');

    wrap.querySelectorAll('.q-text').forEach((el) => {
      el.addEventListener('input', () => { questions[+el.closest('.question-editor').dataset.qi].text = el.value; });
    });
    wrap.querySelectorAll('.q-points').forEach((el) => {
      el.addEventListener('input', () => { questions[+el.closest('.question-editor').dataset.qi].points = Math.max(1, parseInt(el.value, 10) || 1); });
    });
    wrap.querySelectorAll('.opt-text').forEach((el) => {
      el.addEventListener('input', () => {
        const editor = el.closest('.question-editor');
        const oi = [...editor.querySelectorAll('.opt-text')].indexOf(el);
        questions[+editor.dataset.qi].options[oi].text = el.value;
      });
    });
    wrap.querySelectorAll('input[type="radio"]').forEach((el) => {
      el.addEventListener('change', () => {
        const qi = +el.dataset.qi;
        questions[qi].options.forEach((o, i) => { o.isCorrect = i === +el.dataset.oi; });
      });
    });
    wrap.querySelectorAll('[data-del]').forEach((el) => {
      el.addEventListener('click', () => {
        questions.splice(+el.dataset.del, 1);
        renderQuestions();
      });
    });
    wrap.querySelectorAll('[data-delopt]').forEach((el) => {
      el.addEventListener('click', () => {
        const [qi, oi] = el.dataset.delopt.split(':').map(Number);
        const q = questions[qi];
        if (q.options.length <= 2) return App.toast('Kamida 2 ta variant qolishi kerak', 'error');
        const wasCorrect = q.options[oi].isCorrect;
        q.options.splice(oi, 1);
        if (wasCorrect) q.options[0].isCorrect = true;
        renderQuestions();
      });
    });
    wrap.querySelectorAll('[data-addopt]').forEach((el) => {
      el.addEventListener('click', () => {
        const q = questions[+el.dataset.addopt];
        if (q.options.length >= 8) return App.toast('Ko‘pi bilan 8 ta variant', 'error');
        q.options.push({ text: '', isCorrect: false });
        renderQuestions();
      });
    });
  }

  async function loadMeta() {
    const [cats, subs, classes] = await Promise.all([
      API.get('/api/categories'),
      API.get('/api/subjects'),
      Promise.resolve({ items: Array.from({ length: 11 }, (_, i) => i + 1) })
    ]);
    qs('#tf-category').innerHTML += cats.items.map((c) => `<option value="${c.id}">${App.escapeHtml(c.name)}</option>`).join('');
    qs('#tf-subject').innerHTML += subs.items.map((s) => `<option value="${s.id}">${App.escapeHtml(s.name)}</option>`).join('');
    qs('#tf-class').innerHTML += classes.items.map((n) => `<option value="${n}">${n}-sinf</option>`).join('');
  }

  function toLocalInput(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function loadTest() {
    const data = await API.get(`/api/teacher/tests/${editId}`);
    const t = data.test;
    savedTestId = t.id;
    savedCode = t.code;
    qs('#crumb-title').textContent = t.title;
    qs('#page-title').textContent = 'Testni tahrirlash';
    qs('#tf-title').value = t.title;
    qs('#tf-desc').value = t.description || '';
    qs('#tf-category').value = t.category_id || '';
    qs('#tf-class').value = t.class_id || '';
    qs('#tf-subject').value = t.subject_id || '';
    qs('#tf-time').value = t.time_limit_minutes;
    qs('#tf-attempts').value = t.max_attempts;
    qs('#tf-start').value = toLocalInput(t.start_at);
    qs('#tf-end').value = toLocalInput(t.end_at);
    qs('#tf-show-results').value = t.show_results;
    qs('#tf-correct').checked = t.show_correct_answers === 1;
    qs('#tf-shuffle').checked = t.shuffle_questions === 1;
    questions = data.questions.map((q) => ({
      text: q.text,
      points: q.points,
      options: q.options.map((o) => ({ text: o.text, isCorrect: !!o.isCorrect }))
    }));
    lockedQuestions = data.attemptsTotal > 0;
    if (lockedQuestions) {
      qs('#save-error').classList.remove('hidden');
      qs('#save-error').textContent = 'Diqqat: bu test allaqachon topshirilgan, shuning uchun savollar tarkibi o‘zgartirilmaydi (faqat sozlamalar yangilanadi).';
    }
    renderQuestions();
    showCode(t.code);
  }

  function collect() {
    return {
      title: qs('#tf-title').value,
      description: qs('#tf-desc').value,
      categoryId: qs('#tf-category').value || null,
      classNumber: qs('#tf-class').value || null,
      subjectId: qs('#tf-subject').value || null,
      timeLimitMinutes: parseInt(qs('#tf-time').value, 10) || 0,
      maxAttempts: parseInt(qs('#tf-attempts').value, 10) || 1,
      startAt: qs('#tf-start').value ? new Date(qs('#tf-start').value).toISOString() : null,
      endAt: qs('#tf-end').value ? new Date(qs('#tf-end').value).toISOString() : null,
      showResults: qs('#tf-show-results').value,
      showCorrectAnswers: qs('#tf-correct').checked,
      shuffleQuestions: qs('#tf-shuffle').checked,
      questions: lockedQuestions ? undefined : questions.map((q) => ({
        text: q.text,
        points: q.points,
        options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect }))
      }))
    };
  }

  async function save(e) {
    e.preventDefault();
    const errBox = qs('#save-error');
    errBox.classList.add('hidden');
    const payload = collect();
    if (!lockedQuestions && (!payload.questions.length || payload.questions.some((q) => !q.text.trim() || q.options.some((o) => !o.text.trim())))) {
      errBox.textContent = 'Barcha savol va javob variantlari to‘ldirilishi shart.';
      errBox.classList.remove('hidden');
      return;
    }
    const btn = qs('#save-btn');
    btn.disabled = true;
    try {
      if (savedTestId) {
        await API.put(`/api/teacher/tests/${savedTestId}`, payload);
        App.toast('Test saqlandi', 'success');
        showCode(savedCode);
      } else {
        const created = await API.post('/api/teacher/tests', payload);
        savedTestId = created.test.id;
        savedCode = created.test.code;
        history.replaceState(null, '', `/teacher-test.html?id=${savedTestId}`);
        App.toast('Test yaratildi. Endi uni ochib, kodni o‘quvchilarga yuboring', 'success');
        qs('#page-title').textContent = 'Testni tahrirlash';
        showCode(savedCode);
      }
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      btn.disabled = false;
    }
  }

  function showCode(code) {
    if (!code) return;
    qs('#code-card').classList.remove('hidden');
    qs('#test-code').textContent = code;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await App.requireRolePage('teacher', 'admin');
    if (!user) return;
    await loadMeta();
    if (editId) {
      try { await loadTest(); } catch (err) { App.toast(err.message, 'error'); }
    } else {
      questions = [blankQuestion()];
      renderQuestions();
    }
    qs('#add-question').addEventListener('click', () => {
      if (lockedQuestions) return App.toast('Topshirilgan testning savollari o‘zgarmaydi', 'error');
      questions.push(blankQuestion());
      renderQuestions();
    });
    qs('#test-form').addEventListener('submit', save);
    qs('#copy-code').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(qs('#test-code').textContent);
        App.toast('Kod nusxalandi', 'success');
      } catch (_) { /* noop */ }
    });
    qs('#regen-code').addEventListener('click', async () => {
      if (!savedTestId) return;
      if (!confirm('Kodni yangilashda davom etasizmi? Eski kod ishlamay qoladi.')) return;
      try {
        const data = await API.post(`/api/teacher/tests/${savedTestId}/regenerate-code`);
        savedCode = data.code;
        showCode(data.code);
        App.toast('Yangi kod tayyor', 'success');
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });
  });
})();
