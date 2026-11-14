// מערכת שעות כיתה ח'6 – מקור: schedule.jpeg (Smart School, 30/08/2026)
// שעה 0 ויום ו' ריקים במערכת ולכן לא מופיעים.

window.PERIODS = [
  { n: 1, start: "08:20", end: "09:05" },
  { n: 2, start: "09:05", end: "09:55" },
  { n: 3, start: "10:15", end: "11:00" },
  { n: 4, start: "11:00", end: "11:45" },
  { n: 5, start: "12:00", end: "12:45" },
  { n: 6, start: "12:45", end: "13:30" },
  { n: 7, start: "13:35", end: "14:15" },
  { n: 8, start: "14:15", end: "15:00" },
];

// Subjects that appear only in the timetable (exam subjects come from data.js)
window.SCHEDULE_SUBJECTS = {
  pe:       { name: "חנ\"ג",          color: "#dc2626" },
  majors:   { name: "מגמות",          color: "#64748b" },
  ortech:   { name: "אורטכניון",      color: "#0f766e" },
  culture:  { name: "תרבות ישראל",    color: "#c026d3" },
  homeroom: { name: "חינוך",          color: "#475569" },
  roots:    { name: "\"שורשים לחיים\"", color: "#ca8a04" },
};

// Reusable lessons
const L = {
  tanach:   { s: "tanach",     teacher: "קורל טובול",   room: "ח'6 110" },
  lashon:   { s: "lashon",     teacher: "הודיה בן חמו", room: "ח'6 110" },
  arabic:   { s: "arabic",     teacher: "שיימא אמארה",  room: "ח'6 110" },
  lit:      { s: "literature", teacher: "טל זלטניק",    room: "ח'6 110" },
  english:  { s: "english",    groups: "ח'6–ח'8" },
  science:  { s: "science",    groups: "ח'6–ח'8" },
  math:     { s: "math", label: "מתמטיקה / אורטכניון", groups: "ח'5–ח'8" },
  pe:       { s: "pe", teacher: "יונתן וואס, מי סלק", room: "אולם ספורט רמון", groups: "ח'5, ח'6" },
};

// Days: 0 = Sunday … 4 = Thursday. Each day lists periods 1–8 (null = no lesson).
window.TIMETABLE = [
  // ראשון
  [L.tanach, L.arabic, L.english, L.english, L.math, L.science, L.pe, null],
  // שני
  [L.tanach, L.lashon, L.science, L.science, L.math,
    { s: "culture", teacher: "הודיה בן חמו", room: "ח'6 110" }, null, null],
  // שלישי
  [L.lashon, L.english, L.pe, L.lashon, L.arabic, L.arabic, L.english, null],
  // רביעי
  [L.math, L.math, L.lit, L.science,
    { s: "math", label: "מתמטיקה STEM", groups: "ח'5–ח'8" },
    { s: "majors", groups: "ח'1–ח'6" },
    { s: "majors", groups: "ח'1–ח'6" },
    { s: "majors", groups: "ח'1–ח'7" }],
  // חמישי
  [{ s: "world", teacher: "תמי גדרון", room: "ח'6 110" },
    L.lashon, L.lit, L.math,
    { s: "roots", teacher: "רחלי טשלה", room: "ח'6 110" },
    L.english,
    { s: "homeroom", teacher: "הודיה בן חמו", room: "ח'6 110" },
    { s: "ortech", teacher: "אבי אזולאי", room: "אורטכניון 215", groups: "ח'5–ח'8" }],
];
