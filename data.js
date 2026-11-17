// לוח מבחנים – מחצית א' תשפ"ז – כיתה ח'6
// מקור: board.pdf
//
// type: exam (מבחן) | quiz (בוחן) | alt (הערכה חלופית) | makeup (מועד ב')
//       holiday (חופשה) | parents (יום הורים) | milestone (אירוע)
// hasContent: true  → נטען הקובץ content/<id>.js (ראו content/_template.js)

window.SCHOOL = {
  name: "אורט רמון · קריית מוצקין",
  className: "ח'6",
  term: "מחצית א' תשפ\"ז",
};

window.SUBJECTS = {
  english:    { name: "אנגלית",     color: "#2563eb" },
  science:    { name: "מדעים",      color: "#059669" },
  lashon:     { name: "לשון",       color: "#db2777" },
  math:       { name: "מתמטיקה",    color: "#7c3aed" },
  world:      { name: "מגלים עולם", color: "#ea580c" },
  literature: { name: "ספרות",      color: "#b45309" },
  arabic:     { name: "ערבית",      color: "#0891b2" },
  tanach:     { name: "תנ\"ך",      color: "#65a30d" },
};

window.EVENTS = [
  { id: "2026-10-13-english",    date: "2026-10-13", type: "exam",  subject: "english",    title: "מבחן מיפוי שכבתי באנגלית",          hours: "שעות 1+2", hasContent: false },
  { id: "2026-10-20-science",    date: "2026-10-20", type: "exam",  subject: "science",    title: "מבחן שכבתי במדעים באנגלית",         hours: "שעה 4",    hasContent: false },
  { id: "2026-10-25-lashon",     date: "2026-10-25", type: "quiz",  subject: "lashon",     title: "בוחן שכבתי בלשון",                  hours: "שעה 2",    hasContent: false },
  { id: "2026-10-27-elections",  date: "2026-10-27", type: "holiday",                      title: "חופש – יום בחירות" },
  { id: "2026-10-29-math",       date: "2026-10-29", type: "quiz",  subject: "math",       title: "בוחן שכבתי במתמטיקה",               hours: "שעה 1",    hasContent: false },
  { id: "2026-11-01-moed-b",     date: "2026-11-01", type: "makeup",                       title: "מועד ב'",                            hours: "שעות 7+8", subjects: ["english", "science", "math", "lashon"] },
  { id: "2026-11-04-world",      date: "2026-11-04", type: "alt",   subject: "world",      title: "הערכה חלופית שכבתית – מגלים עולם",  hours: "שעה 3",    hasContent: false },
  { id: "2026-11-08-literature", date: "2026-11-08", type: "quiz",  subject: "literature", title: "בוחן שכבתי בספרות",                 hours: "שעה 1",    hasContent: false },
  { id: "2026-11-12-arabic",     date: "2026-11-12", type: "quiz",  subject: "arabic",     title: "בוחן שכבתי בערבית",                 hours: "שעה 1",    hasContent: false },
  { id: "2026-11-16-tanach",     date: "2026-11-16", type: "exam",  subject: "tanach",     title: "מבחן שכבתי בתנ\"ך",                 hours: "שעות 1+2", hasContent: true },
  { id: "2026-11-18-english",    date: "2026-11-18", type: "quiz",  subject: "english",    title: "בוחן שכבתי באנגלית – Unseen",       hours: "שעה 4",    hasContent: true },
  { id: "2026-11-22-lashon",     date: "2026-11-22", type: "exam",  subject: "lashon",     title: "מבחן שכבתי בלשון",                  hours: "שעות 3+4", hasContent: true },
  { id: "2026-11-26-math",       date: "2026-11-26", type: "exam",  subject: "math",       title: "מבחן שכבתי במתמטיקה",               hours: "שעות 3+4", hasContent: false },
  { id: "2026-11-30-science",    date: "2026-11-30", type: "exam",  subject: "science",    title: "מבחן שכבתי במדעים",                 hours: "שעות 3+4", hasContent: false },
  { id: "2026-12-01-parents",    date: "2026-12-01", type: "parents",                      title: "יום הורים – רבעון 1" },
  { id: "2026-12-02-moed-b",     date: "2026-12-02", type: "makeup",                       title: "מועד ב'",                            hours: "שעות 7+8", subjects: ["english", "literature", "arabic", "tanach", "lashon", "science", "math", "world"] },
  { id: "2026-12-03-world",      date: "2026-12-03", type: "quiz",  subject: "world",      title: "בוחן שכבתי מגלים עולם",             hours: "שעה 2",    hasContent: false },
  { id: "2026-12-06-hanukkah",   date: "2026-12-06", endDate: "2026-12-12", days: "א'–ה'", type: "holiday", title: "חופשת חנוכה" },
  { id: "2026-12-15-arabic",     date: "2026-12-15", type: "alt",   subject: "arabic",     title: "הערכה חלופית שכבתית – ערבית",       hours: "שעה 5",    hasContent: false },
  { id: "2026-12-17-literature", date: "2026-12-17", type: "exam",  subject: "literature", title: "מבחן שכבתי בספרות",                 hours: "שעות 1+2", hasContent: false },
  { id: "2026-12-21-english",    date: "2026-12-21", type: "exam",  subject: "english",    title: "מבחן שכבתי באנגלית",                hours: "שעות 1+2", hasContent: false },
  { id: "2026-12-24-lashon",     date: "2026-12-24", type: "exam",  subject: "lashon",     title: "מבחן שכבתי בלשון",                  hours: "שעות 1+2", hasContent: false,
    note: "בלוח המקורי מופיע יום ג', אבל 24/12 הוא יום ה' – כדאי לוודא מול המורה" },
  { id: "2026-12-29-science",    date: "2026-12-29", type: "exam",  subject: "science",    title: "מבחן שכבתי במדעים",                 hours: "שעות 3+4", hasContent: false },
  { id: "2027-01-03-tanach",     date: "2027-01-03", type: "exam",  subject: "tanach",     title: "מבחן שכבתי בתנ\"ך",                 hours: "שעות 1+2", hasContent: false },
  { id: "2027-01-07-math",       date: "2027-01-07", type: "exam",  subject: "math",       title: "מבחן שכבתי במתמטיקה",               hours: "שעות 3+4", hasContent: false },
  { id: "2027-01-10-moed-b",     date: "2027-01-10", type: "makeup",                       title: "מועד ב'",                            hours: "שעות 7+8", subjects: ["world", "arabic", "tanach", "literature", "english", "science", "math", "lashon"] },
  { id: "2027-01-29-report",     date: "2027-01-29", type: "milestone",                    title: "חלוקת תעודות מחצית א'",
    note: "בלוח המקורי מופיע יום א', אבל 29/01 הוא יום ו' – כדאי לוודא מול המורה" },
];
