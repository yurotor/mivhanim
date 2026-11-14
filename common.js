// Shared helpers for index.html and exam.html

const TYPE_LABELS = {
  exam: "מבחן",
  quiz: "בוחן",
  alt: "הערכה חלופית",
  makeup: "מועד ב'",
  holiday: "חופשה",
  parents: "יום הורים",
  milestone: "אירוע",
};

const DAY_LETTERS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];
const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function todayDate() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

function isTest(ev) {
  return ["exam", "quiz", "alt"].includes(ev.type);
}

function isAssessment(ev) {
  return isTest(ev) || ev.type === "makeup";
}

function endOf(ev) {
  return parseDate(ev.endDate || ev.date);
}

function isPast(ev, today = todayDate()) {
  return endOf(ev) < today;
}

function dayLabel(ev) {
  const start = parseDate(ev.date);
  if (!ev.endDate) return "יום " + DAY_LETTERS[start.getDay()];
  if (ev.days) return ev.days;
  return DAY_LETTERS[start.getDay()] + "–" + DAY_LETTERS[endOf(ev).getDay()];
}

function dateLabel(ev) {
  const s = parseDate(ev.date);
  const fmt = (d) => String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");
  if (!ev.endDate) return fmt(s);
  return String(s.getDate()) + "–" + fmt(endOf(ev));
}

function fullDateLabel(ev) {
  const s = parseDate(ev.date);
  if (!ev.endDate) return `${dayLabel(ev)}, ${s.getDate()} ב${MONTHS[s.getMonth()]} ${s.getFullYear()}`;
  const e = endOf(ev);
  return `${s.getDate()}–${e.getDate()} ב${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
}

function countdownLabel(ev, today = todayDate()) {
  const start = parseDate(ev.date);
  const end = endOf(ev);
  if (end < today) return "עבר";
  if (start <= today) return ev.endDate ? "עכשיו" : "היום";
  const n = daysBetween(today, start);
  if (n === 1) return "מחר";
  if (n === 2) return "בעוד יומיים";
  return `בעוד ${n} ימים`;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function subjectOf(ev) {
  return ev.subject ? window.SUBJECTS[ev.subject] : null;
}

function examUrl(ev) {
  return "exam.html?id=" + encodeURIComponent(ev.id);
}

function store(key, val) {
  try {
    if (val === undefined) return localStorage.getItem("mivhanim:" + key);
    localStorage.setItem("mivhanim:" + key, val);
  } catch (e) {
    return null;
  }
}
