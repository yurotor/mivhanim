(function () {
  const today = todayDate();
  // Only show today and what's still ahead: anything that ended before today is hidden.
  const events = window.EVENTS
    .filter((e) => !isPast(e, today))
    .sort((a, b) => a.date.localeCompare(b.date));

  const FILTERS = [
    { key: "all", label: "הכל", test: () => true },
    { key: "tests", label: "מבחנים", test: isAssessment },
    { key: "holiday", label: "חופשות", test: (e) => e.type === "holiday" },
    { key: "events", label: "יום הורים ואירועים", test: (e) => e.type === "parents" || e.type === "milestone" },
    { key: "past", label: "הצג מבחני עבר" },
  ];

  // Past exams that have study material: exactly the events hidden above, limited to tests with content, newest first.
  const pastWithContent = window.EVENTS
    .filter((e) => isPast(e, today) && isTest(e) && e.hasContent)
    .sort((a, b) => b.date.localeCompare(a.date));
  const listFor = (f) => (f.key === "past" ? pastWithContent : events.filter(f.test));

  let filter = store("filter");
  if (!FILTERS.some((f) => f.key === filter)) filter = "all";

  document.getElementById("eyebrow").textContent = `${SCHOOL.name} · ${SCHOOL.term}`;
  document.getElementById("cls").textContent = SCHOOL.className;
  document.title = `לוח מבחנים ${SCHOOL.className}`;

  function subjStyle(ev) {
    const s = subjectOf(ev);
    return s ? ` style="--subj:${s.color}"` : "";
  }

  // ---------- next up ----------
  function renderNext() {
    const upcoming = events.filter(isTest);
    const el = document.getElementById("next");
    if (!upcoming.length) {
      el.innerHTML = `<div class="next"><div class="next-label">המבחן הבא</div><div class="next-title">סיימת את כל המבחנים של המחצית 🎉</div></div>`;
      return;
    }
    const ev = upcoming[0];
    const s = subjectOf(ev);
    const more = upcoming.length - 1;
    el.innerHTML = `
      <a class="next" href="${examUrl(ev)}"${subjStyle(ev)}>
        <div class="next-label">המבחן הבא · ${esc(s.name)}</div>
        <div class="next-row">
          <div class="next-title">${esc(ev.title)}</div>
          <div class="next-count">${countdownLabel(ev, today)}</div>
        </div>
        <div class="next-meta">${fullDateLabel(ev)}${ev.hours ? " · " + esc(ev.hours) : ""}</div>
        ${more > 0 ? `<div class="next-more">ועוד ${more} מבחנים ובחנים עד סוף המחצית</div>` : ""}
      </a>`;
  }

  // ---------- filters ----------
  function renderFilters() {
    const nav = document.getElementById("filters");
    nav.innerHTML = FILTERS.map((f) => {
      const n = listFor(f).length;
      return `<button class="chip-btn" data-key="${f.key}" aria-pressed="${f.key === filter}">${f.label}<span class="n">${n}</span></button>`;
    }).join("");
    nav.onclick = (e) => {
      const b = e.target.closest("button[data-key]");
      if (!b) return;
      filter = b.dataset.key;
      store("filter", filter);
      renderFilters();
      renderTimeline();
    };
  }

  // ---------- rows ----------
  function rowHtml(ev) {
    const past = isPast(ev, today);
    const clickable = isTest(ev);
    const tag = clickable ? "a" : "div";
    const href = clickable ? ` href="${examUrl(ev)}"` : "";
    const s = subjectOf(ev);
    const start = parseDate(ev.date);
    const dayNum = ev.endDate ? `<bdi dir="ltr">${start.getDate()}–${endOf(ev).getDate()}</bdi>` : start.getDate();

    const daysLeft = daysBetween(today, start);
    const countCls = !past && daysLeft <= 3 ? "count soon" : "count";

    const subjects = ev.subjects
      ? `<div class="subjects">${ev.subjects.map((k) => `<span class="tag" style="--subj:${SUBJECTS[k].color}">${esc(SUBJECTS[k].name)}</span>`).join("")}</div>`
      : "";

    const status = clickable
      ? ev.hasContent
        ? `<span class="status ready">חומר לימוד זמין</span>`
        : `<span class="status">אין עדיין תוכן</span>`
      : "";

    return `
      <${tag} class="row t-${ev.type}${past ? " past" : ""}"${href}${subjStyle(ev)}>
        <div class="date"><span class="d">${dayNum}</span><span class="w">${dayLabel(ev)}</span></div>
        <div class="body">
          <div class="meta">
            <span class="tag">${s ? esc(s.name) + " · " : ""}${TYPE_LABELS[ev.type]}</span>
            ${ev.hours ? `<span>${esc(ev.hours)}</span>` : ""}
          </div>
          <div class="title">${esc(ev.title)}</div>
          ${subjects}
          ${ev.note ? `<div class="note">⚠️ ${esc(ev.note)}</div>` : ""}
        </div>
        <div class="side">
          <span class="${countCls}">${countdownLabel(ev, today)}</span>
          ${status}
        </div>
      </${tag}>`;
  }

  // ---------- timeline ----------
  function renderTimeline() {
    const f = FILTERS.find((x) => x.key === filter);
    const list = listFor(f);
    const el = document.getElementById("timeline");
    if (!list.length) {
      el.innerHTML = `<p class="empty-list">אין אירועים להצגה</p>`;
      return;
    }

    const groups = [];
    for (const ev of list) {
      const d = parseDate(ev.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      let g = groups[groups.length - 1];
      if (!g || g.key !== key) {
        g = { key, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, items: [] };
        groups.push(g);
      }
      g.items.push(ev);
    }

    el.innerHTML = groups.map((g) => {
      const rows = g.items.map(rowHtml).join("");
      return `<div class="month"><h2>${g.label}</h2><div class="rows">${rows}</div></div>`;
    }).join("");
  }

  renderNext();
  renderFilters();
  renderTimeline();
})();
