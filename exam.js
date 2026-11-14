(function () {
  const id = new URLSearchParams(location.search).get("id");
  const ev = window.EVENTS.find((e) => e.id === id);
  const hero = document.getElementById("hero");
  const content = document.getElementById("content");

  if (!ev || !isTest(ev)) {
    hero.innerHTML = `<div class="empty"><span class="label">המבחן לא נמצא</span><p>חזרו ללוח ובחרו מבחן מהרשימה.</p></div>`;
    return;
  }

  const subj = subjectOf(ev);
  document.getElementById("page").style.setProperty("--subj", subj.color);
  document.title = `${subj.name} · ${dateLabel(ev)}`;

  hero.innerHTML = `
    <section class="hero">
      <span class="tag">${esc(subj.name)} · ${TYPE_LABELS[ev.type]}</span>
      <h1>${esc(ev.title)}</h1>
      <div class="hero-facts">
        <span><b>${fullDateLabel(ev)}</b></span>
        ${ev.hours ? `<span>${esc(ev.hours)}</span>` : ""}
        <span class="count-big">${countdownLabel(ev)}</span>
      </div>
      ${ev.note ? `<div class="note">⚠️ ${esc(ev.note)}</div>` : ""}
    </section>`;

  function showEmpty() {
    content.innerHTML = `
      <div class="empty">
        <span class="label">עדיין אין תוכן למבחן הזה</span>
        <p>חומר לימוד, חידונים ותשובות יתווספו בקרוב.</p>
      </div>`;
  }

  if (!ev.hasContent) return showEmpty();

  // content/<id>.js calls registerContent(id, data)
  window.registerContent = function (cid, data) {
    if (cid === ev.id) render(data);
  };
  const s = document.createElement("script");
  s.src = `content/${encodeURIComponent(ev.id)}.js`;
  s.onerror = showEmpty;
  document.body.appendChild(s);

  // ---------- render ----------
  function render(data) {
    // Full content pages (study / quiz / answers as separate HTML files)
    if (data.pages && data.pages.length) {
      content.innerHTML = `
        ${data.summary ? `<p class="pages-summary">${data.summary}</p>` : ""}
        <div class="rows">${data.pages.map((p) => `
          <a class="row page-link" href="${p.href}">
            <div class="date"><span class="d">${p.icon || "📄"}</span></div>
            <div class="body"><div class="title">${esc(p.title)}</div><div class="desc">${esc(p.desc || "")}</div></div>
            <div class="side"><span class="arrow">‹</span></div>
          </a>`).join("")}</div>`;
      return;
    }

    const tabs = [];
    if ((data.topics && data.topics.length) || (data.study && data.study.length) || data.summary) {
      tabs.push({ key: "study", label: "עזר ללמידה", html: studyHtml(data) });
    }
    if (data.quiz && data.quiz.length) tabs.push({ key: "quiz", label: `חידון (${data.quiz.length})`, html: quizHtml(data.quiz) });
    if (data.qa && data.qa.length) tabs.push({ key: "qa", label: `שאלות ותשובות (${data.qa.length})`, html: qaHtml(data.qa) });

    if (!tabs.length) return showEmpty();

    const saved = store("tab:" + ev.id);
    let active = tabs.some((t) => t.key === saved) ? saved : tabs[0].key;

    content.innerHTML = `
      ${tabs.length > 1 ? `<div class="tabs" role="tablist">${tabs.map((t) =>
        `<button class="tab" role="tab" data-key="${t.key}" aria-selected="${t.key === active}">${t.label}</button>`).join("")}</div>` : ""}
      ${tabs.map((t) => `<section class="panel" data-key="${t.key}" ${t.key === active ? "" : "hidden"}>${t.html}</section>`).join("")}`;

    content.querySelectorAll(".tab").forEach((b) => {
      b.onclick = () => {
        active = b.dataset.key;
        store("tab:" + ev.id, active);
        content.querySelectorAll(".tab").forEach((x) => x.setAttribute("aria-selected", x.dataset.key === active));
        content.querySelectorAll(".panel").forEach((p) => (p.hidden = p.dataset.key !== active));
      };
    });

    if (data.quiz && data.quiz.length) wireQuiz(data.quiz);
  }

  function studyHtml(data) {
    let h = "";
    if (data.summary) h += `<div class="card"><p>${data.summary}</p></div>`;
    if (data.topics && data.topics.length) {
      h += `<div class="card"><h3>נושאים למבחן</h3><div class="topics">${data.topics.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div></div>`;
    }
    (data.study || []).forEach((sec) => {
      h += `<div class="card">${sec.title ? `<h3>${esc(sec.title)}</h3>` : ""}${sec.html || ""}</div>`;
    });
    return h;
  }

  function quizHtml(quiz) {
    return `
      <div class="score">
        <span id="score-text"></span>
        <div class="bar"><span id="score-bar"></span></div>
        <button class="btn" id="quiz-reset">התחלה מחדש</button>
      </div>
      ${quiz.map((q, i) => `
        <div class="card quiz-q" data-i="${i}">
          <div class="q-num">שאלה ${i + 1} מתוך ${quiz.length}</div>
          <div class="q-text">${q.q}</div>
          <div class="options">${q.options.map((o, j) => `<button class="opt" data-j="${j}">${o}</button>`).join("")}</div>
          <div class="explain" hidden></div>
        </div>`).join("")}`;
  }

  function wireQuiz(quiz) {
    const answers = new Array(quiz.length).fill(null);
    const scoreText = document.getElementById("score-text");
    const scoreBar = document.getElementById("score-bar");

    function updateScore() {
      const answered = answers.filter((a) => a !== null).length;
      const correct = answers.filter((a, i) => a === quiz[i].answer).length;
      scoreText.textContent = answered === quiz.length
        ? `סיימת! ${correct} מתוך ${quiz.length} נכונות`
        : `${correct} נכונות · ענית על ${answered} מתוך ${quiz.length}`;
      scoreBar.style.width = (correct / quiz.length) * 100 + "%";
    }

    content.querySelectorAll(".quiz-q").forEach((card) => {
      const i = Number(card.dataset.i);
      const q = quiz[i];
      card.querySelectorAll(".opt").forEach((btn) => {
        btn.onclick = () => {
          if (answers[i] !== null) return;
          const j = Number(btn.dataset.j);
          answers[i] = j;
          card.querySelectorAll(".opt").forEach((b) => {
            const k = Number(b.dataset.j);
            b.disabled = true;
            if (k === q.answer) b.classList.add("correct");
            else if (k === j) b.classList.add("wrong");
          });
          const ex = card.querySelector(".explain");
          ex.innerHTML = (j === q.answer ? "✅ נכון! " : "❌ לא נכון. ") + (q.explain || "");
          ex.hidden = false;
          updateScore();
        };
      });
    });

    document.getElementById("quiz-reset").onclick = () => {
      answers.fill(null);
      content.querySelectorAll(".opt").forEach((b) => {
        b.disabled = false;
        b.classList.remove("correct", "wrong");
      });
      content.querySelectorAll(".explain").forEach((e) => (e.hidden = true));
      updateScore();
      content.querySelector(".score").scrollIntoView({ behavior: "smooth", block: "start" });
    };

    updateScore();
  }

  function qaHtml(qa) {
    return qa.map((x) => `
      <details class="qa">
        <summary>${x.q}</summary>
        <div class="a">${x.a}</div>
      </details>`).join("");
  }
})();
