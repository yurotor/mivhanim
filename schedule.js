(function () {
  const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"];
  const ALL_SUBJECTS = Object.assign({}, window.SUBJECTS, window.SCHEDULE_SUBJECTS);

  document.getElementById("eyebrow").textContent = `${SCHOOL.name} · ${SCHOOL.term}`;
  document.getElementById("cls").textContent = SCHOOL.className;

  const now = new Date();
  const todayIdx = now.getDay(); // 0 = Sunday … 6 = Saturday
  const isSchoolDay = todayIdx <= 4;

  let day = isSchoolDay ? todayIdx : 0;
  let view = store("schedule-view") || (window.innerWidth >= 760 ? "week" : "day");

  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const nowMin = now.getHours() * 60 + now.getMinutes();

  function subj(lesson) {
    return ALL_SUBJECTS[lesson.s] || { name: lesson.s, color: "#64748b" };
  }
  function lessonName(lesson) {
    return lesson.label || subj(lesson).name;
  }

  // Next calendar date (from today) that falls on weekday d
  function nextDateFor(d) {
    const t = todayDate();
    const diff = (d - t.getDay() + 7) % 7;
    return new Date(t.getFullYear(), t.getMonth(), t.getDate() + diff);
  }
  function ymd(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function eventsOn(date) {
    const key = ymd(date);
    return window.EVENTS.filter((e) => key >= e.date && key <= (e.endDate || e.date));
  }

  // ---------- now / next ----------
  function renderNow() {
    const el = document.getElementById("now");
    let title, body, lesson;

    if (isSchoolDay) {
      const lessons = TIMETABLE[todayIdx];
      const curIdx = PERIODS.findIndex((p) => nowMin >= toMin(p.start) && nowMin < toMin(p.end));
      const nextIdx = PERIODS.findIndex((p, i) => toMin(p.start) > nowMin && lessons[i]);
      if (curIdx >= 0 && lessons[curIdx]) {
        lesson = lessons[curIdx];
        title = `עכשיו · שעה ${PERIODS[curIdx].n}`;
        body = `עד ${PERIODS[curIdx].end}`;
        const nx = PERIODS.findIndex((p, i) => i > curIdx && lessons[i]);
        if (nx >= 0) body += ` · אחר כך: ${lessonName(lessons[nx])} (${PERIODS[nx].start})`;
      } else if (nextIdx >= 0) {
        lesson = lessons[nextIdx];
        title = `השיעור הבא · שעה ${PERIODS[nextIdx].n}`;
        body = `היום ב-${PERIODS[nextIdx].start}`;
      }
    }

    if (!lesson) {
      // next school day's first lesson
      let d = (todayIdx + 1) % 7;
      while (d > 4) d = (d + 1) % 7;
      const i = TIMETABLE[d].findIndex(Boolean);
      lesson = TIMETABLE[d][i];
      const when = d === (todayIdx + 1) % 7 ? "מחר" : `ביום ${DAY_NAMES[d]}`;
      title = `השיעור הבא · ${when}`;
      body = `${PERIODS[i].start} · שעה ${PERIODS[i].n}`;
    }

    const s = subj(lesson);
    el.innerHTML = `
      <div class="next" style="--subj:${s.color}">
        <div class="next-label">${title}</div>
        <div class="next-row">
          <div class="next-title">${esc(lessonName(lesson))}</div>
        </div>
        <div class="next-meta">${esc(body)}${lesson.room ? " · " + esc(lesson.room) : ""}</div>
      </div>`;
  }

  // ---------- controls ----------
  function renderControls() {
    const days = document.getElementById("days");
    days.hidden = view !== "day";
    days.innerHTML = DAY_NAMES.map((n, i) =>
      `<button class="chip-btn" role="tab" data-day="${i}" aria-pressed="${i === day}">${n}${i === todayIdx ? " · היום" : ""}</button>`).join("");
    days.onclick = (e) => {
      const b = e.target.closest("[data-day]");
      if (!b) return;
      day = Number(b.dataset.day);
      renderControls();
      renderSchedule();
    };

    const views = document.getElementById("views");
    views.innerHTML = [["day", "יום"], ["week", "כל השבוע"]].map(([k, l]) =>
      `<button class="chip-btn" data-view="${k}" aria-pressed="${k === view}">${l}</button>`).join("");
    views.onclick = (e) => {
      const b = e.target.closest("[data-view]");
      if (!b) return;
      view = b.dataset.view;
      store("schedule-view", view);
      renderControls();
      renderSchedule();
    };
  }

  function isCurrent(d, i) {
    const p = PERIODS[i];
    return d === todayIdx && nowMin >= toMin(p.start) && nowMin < toMin(p.end);
  }

  // ---------- day view ----------
  function dayHtml() {
    const date = nextDateFor(day);
    const evs = eventsOn(date);
    const evHtml = evs.map((e) => {
      const s = subjectOf(e);
      const inner = `${TYPE_LABELS[e.type]}: ${esc(e.title)}${e.hours ? " · " + esc(e.hours) : ""}`;
      return isTest(e)
        ? `<a class="day-event" href="${examUrl(e)}"${s ? ` style="--subj:${s.color}"` : ""}>📝 ${inner}</a>`
        : `<div class="day-event t-${e.type}">📌 ${inner}</div>`;
    }).join("");

    const rows = PERIODS.map((p, i) => {
      const l = TIMETABLE[day][i];
      if (!l) return `<div class="row lesson empty"><div class="date"><span class="d">${p.n}</span><span class="w">${p.start}</span></div><div class="body"><div class="title">—</div></div></div>`;
      const s = subj(l);
      const meta = [l.teacher, l.room].filter(Boolean).map(esc).join(" · ");
      return `
        <div class="row lesson${isCurrent(day, i) ? " current" : ""}" style="--subj:${s.color}">
          <div class="date"><span class="d">${p.n}</span><span class="w"><bdi dir="ltr">${p.start}–${p.end}</bdi></span></div>
          <div class="body">
            <div class="title">${esc(lessonName(l))}</div>
            ${meta ? `<div class="meta">${meta}</div>` : ""}
          </div>
          <div class="side">
            ${isCurrent(day, i) ? `<span class="count soon">עכשיו</span>` : ""}
            ${l.groups ? `<span class="status">בקבוצות · ${esc(l.groups)}</span>` : ""}
          </div>
        </div>`;
    }).join("");

    return `
      <div class="month">
        <h2>יום ${DAY_NAMES[day]} · ${date.getDate()}/${date.getMonth() + 1}</h2>
        ${evHtml ? `<div class="day-events">${evHtml}</div>` : ""}
        <div class="rows">${rows}</div>
      </div>`;
  }

  // ---------- week view ----------
  function weekHtml() {
    const head = DAY_NAMES.map((n, d) => `<th scope="col"${d === todayIdx ? ' class="today"' : ""}>${n}</th>`).join("");
    const body = PERIODS.map((p, i) => {
      const cells = DAY_NAMES.map((_, d) => {
        const l = TIMETABLE[d][i];
        if (!l) return `<td class="free"></td>`;
        const s = subj(l);
        const sub = l.teacher || (l.groups ? "בקבוצות" : "");
        return `<td class="${isCurrent(d, i) ? "current" : ""}" style="--subj:${s.color}">
          <div class="cell"><b>${esc(lessonName(l))}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</div></td>`;
      }).join("");
      return `<tr><th scope="row"><span class="pn">${p.n}</span><span class="pt"><bdi dir="ltr">${p.start}–${p.end}</bdi></span></th>${cells}</tr>`;
    }).join("");
    return `<div class="week-scroll"><table class="week"><thead><tr><th></th>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function renderSchedule() {
    document.getElementById("schedule").innerHTML = view === "week" ? weekHtml() : dayHtml();
  }

  renderNow();
  renderControls();
  renderSchedule();
})();
