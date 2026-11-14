#!/usr/bin/env node
// Builds content/<id>/{study,quiz-1..N,answers}.html (one quiz page per version in spec.quizzes) + content/<id>.js from an exam spec,
// and flips hasContent to true in data.js.
//
// usage: node build.mjs <spec.json> --password <pw> [--root <site root>]
//        (password may also come from EXAM_PASSWORD)
//
// No dependencies; uses Node's WebCrypto so hashing/encryption match the browser exactly.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { webcrypto as crypto } from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const die = (m) => { console.error("✗ " + m); process.exit(1); };
const warn = (m) => console.warn("⚠ " + m);

// ---------- args ----------
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const root = path.resolve(opt("--root") || process.cwd());
const password = opt("--password") || process.env.EXAM_PASSWORD;
const specPath = args[0];
if (!specPath) die("usage: node build.mjs <spec.json> --password <pw> [--root <site root>]");
if (!password) die("missing --password (or EXAM_PASSWORD)");
if (!fs.existsSync(path.join(root, "data.js"))) die(`no data.js in ${root} — pass --root <site root>`);

const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
const errors = [];
const need = (cond, msg) => { if (!cond) errors.push(msg); };

// ---------- event / subject from data.js ----------
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "data.js"), "utf8"), sandbox);
const { EVENTS, SUBJECTS } = sandbox.window;
const ev = EVENTS.find((e) => e.id === spec.id);
if (!ev) die(`id "${spec.id}" not found in data.js`);
const subj = SUBJECTS[ev.subject];
if (!subj) die(`event ${spec.id} has no subject`);
const S = subj.name;
const color = subj.color;

// ---------- helpers ----------
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const finals = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
const norm = (w) => w.toLowerCase().replace(/[֑-ׇ]/g, "").replace(/[ךםןףץ]/g, (c) => finals[c]);
const fmt = (n) => String(Math.round(n * 10) / 10);
const json = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
const tpl = (f) => fs.readFileSync(path.join(HERE, "templates", f), "utf8");

// ---------- quiz versions ----------
const VER = "אבגדהוזח";
const versions = spec.quizzes || (spec.quiz ? [spec.quiz] : []);
if (!versions.length) die("spec needs quizzes: [v1, v2, v3] (or a single quiz)");
if (versions.length < 3) warn(`only ${versions.length} quiz version(s) — the site wants 3 (quizzes: [v1, v2, v3])`);
const multi = versions.length > 1;
const quizFile = (v) => (multi ? `quiz-${v + 1}.html` : "quiz.html");
const verName = (v) => `גרסה ${VER[v]}`;

function shell({ title, tag, h1, facts = [], current, body, extraHero = "", answersHref = "answers.html" }) {
  const nav = [["study.html", "📖 עזר ללמידה"], [quizFile(0), "✏️ בוחן"], [answersHref, "✅ תשובות"]]
    .map(([href, label]) => {
      const cur = href === current || (label.includes("בוחן") && /^quiz/.test(current));
      return `<a href="${href}"${cur ? ' aria-current="page"' : ""}>${label}</a>`;
    }).join("");
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="icon" href="../../icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="../../apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../styles.css">
<link rel="stylesheet" href="../../content.css">
</head>
<body class="doc" style="--subj:${color}">
<main class="wrap">
<a class="back" href="../../exam.html?id=${encodeURIComponent(spec.id)}">→ חזרה למבחן ב${esc(S)}</a>
<section class="hero">
  <span class="tag">${esc(S)} · ${esc(tag)}</span>
  <h1>${esc(h1)}</h1>
  <div class="hero-facts">${facts.map((f) => `<span>${esc(f)}</span>`).join("")}</div>${extraHero}
</section>
<nav class="subnav" aria-label="חומרי המבחן">${nav}</nav>
${body}
</body>
</html>
`;
}

// version switcher (quiz pages link to each other; answers page switches in place)
const verNav = (cur, hrefFor) => multi
  ? `<nav class="vernav" aria-label="גרסאות הבוחן">${versions.map((_, v) =>
      `<a href="${hrefFor(v)}"${v === cur ? ' aria-current="page"' : ""} data-v="${v + 1}">${verName(v)}</a>`).join("")}</nav>\n`
  : "";

// ---------- study (optional – omit to keep an existing study.html) ----------
const study = spec.study;
let studyHtml = null, secNo = 0, bankCount = 0;
if (study) {
  need(Array.isArray(study.parts) && study.parts.length, "study.parts is required");
  const bank = {};
  const toc = [];
  let studyBody = "";
  (study.parts || []).forEach((part, pi) => {
    if (part.title) studyBody += `\n<h2${pi % 2 ? ' class="red"' : ""}>${esc(part.title)}</h2>\n`;
    if (part.intro) studyBody += `${part.intro}\n`;
    (part.sections || []).forEach((sec) => {
      secNo++;
      toc.push(sec.title);
      need(sec.title && sec.html, `study section ${secNo}: title and html are required`);
      studyBody += `\n<h3>${secNo}. ${esc(sec.title)}</h3>\n${sec.html}\n`;
      if (sec.bank && sec.bank.length) {
        if (sec.bank.length < 6) warn(`study section ${secNo} has only ${sec.bank.length} bank questions (aim for 6–8 so "שאלות חדשות" varies)`);
        bank[secNo] = sec.bank.map((b, k) => {
          need(b.q && b.a && Array.isArray(b.wrong) && b.wrong.length >= 2, `study section ${secNo} bank #${k + 1}: needs q, a, wrong[≥2]`);
          if (b.wrong && b.wrong.includes(b.a)) errors.push(`study section ${secNo} bank #${k + 1}: correct answer also listed as wrong`);
          return [b.q, b.a, b.wrong, b.explain || ""];
        });
        studyBody += `\n<div class="mini" data-sec="${secNo}"></div>\n`;
      }
    });
  });
  bankCount = Object.values(bank).reduce((a, b) => a + b.length, 0);
  studyHtml = shell({
    title: `דף הסברים – ${S}`,
    tag: "עזר ללמידה",
    h1: study.title || `דף הסברים ל${ev.type === "quiz" ? "בוחן" : "מבחן"} ב${S}`,
    facts: [spec.summary, ...(spec.facts || [])].filter(Boolean),
    current: "study.html",
    body: `
<div class="box toc">
<b>מה בחומר:</b>
<ol>
${toc.map((t) => `<li>${esc(t)}</li>`).join("\n")}
</ol>
</div>
${studyBody}
</main>
<script>
const BANK = ${json(bank)};
${tpl("study.js")}</script>`,
  });
} else if (!fs.existsSync(path.join(root, "content", spec.id, "study.html"))) {
  warn("spec has no study and there's no existing study.html — the study link will 404");
}

// ---------- quiz ----------
const LETTERS = "אבגדהוזח";

async function buildQuiz(quiz, v) {
  const salt = multi ? `${spec.id}|v${v + 1}|` : spec.id + "|";
  const sha = async (s) => Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + s))).toString("hex");
  const where = multi ? `[${verName(v)}] ` : "";
  const cfgSections = [];
  let answersBody = "";
  let qn = 0, max = 0, bonusMax = 0, idc = 0;
  need(Array.isArray(quiz.sections) && quiz.sections.length, `${where}quiz.sections is required`);

  for (const sec of quiz.sections || []) {
    const items = [];
    let ans = `<h2>${esc(sec.title)}</h2>\n`;
    if (sec.type === "mc") {
      need(sec.points > 0, `${where}mc section "${sec.title}": points (per question) required`);
      for (const q of sec.questions || []) {
        const id = "q" + ++idc; qn++;
        need(Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length,
          `${where}mc question ${qn}: needs options[] and a valid 0-based answer index`);
        items.push({ id, text: q.q, options: q.options, h: await sha(`mc|${id}|${q.answer}`) });
        ans += `<div class="a"><b class="n">${qn}.</b> ${esc(q.q)}<br>✅ <b>${LETTERS[q.answer]}. ${esc(q.options[q.answer])}</b>${q.explain ? `<br>${q.explain}` : ""}</div>\n`;
      }
      const smax = sec.points * items.length;
      cfgSections.push({ type: "mc", title: sec.title, short: sec.short || sec.title, points: sec.points, max: smax,
        sub: `${fmt(sec.points)} נק' לכל שאלה – ${fmt(smax)} נק'`, items });
      max += smax;
    } else if (sec.type === "match") {
      need(sec.points > 0 && Array.isArray(sec.labels) && sec.labels.length && Array.isArray(sec.choices) && sec.choices.length,
        `${where}match section "${sec.title}": needs points, labels[], choices[]`);
      for (const q of sec.items || []) {
        const id = "m" + ++idc; qn++;
        need(Array.isArray(q.answers) && q.answers.length === (sec.labels || []).length, `${where}match item ${qn}: answers[] must have one entry per label`);
        (q.answers || []).forEach((a) => need((sec.choices || []).includes(a), `${where}match item ${qn}: answer "${a}" is not in choices[]`));
        items.push({ id, text: q.text, h: await Promise.all((q.answers || []).map((a, k) => sha(`m|${id}|${k}|${a}`))) });
        ans += `<div class="a"><b class="n">${qn}.</b> <span class="${sec.quote ? "serif" : ""}">${esc(q.text)}</span><br>` +
          (sec.labels || []).map((l, k) => `${esc(l.replace(/[?:]\s*$/, ""))}: <b>${esc(q.answers?.[k])}</b>`).join(" · ") +
          `${q.explain ? `<br>${q.explain}` : ""}</div>\n`;
      }
      const smax = sec.points * items.length;
      cfgSections.push({ type: "match", title: sec.title, short: sec.short || sec.title, points: sec.points, max: smax, quote: !!sec.quote,
        labels: sec.labels, choices: sec.choices, sub: `${fmt(sec.points)} נק' לכל פריט – ${fmt(smax)} נק'`, items });
      max += smax;
    } else if (sec.type === "open") {
      let smax = 0, sbonus = 0;
      for (const q of sec.questions || []) {
        const id = "o" + ++idc;
        const label = q.bonus ? "בונוס" : String(++qn);
        need(q.points > 0 && Array.isArray(q.groups) && q.groups.length, `${where}open question ${label}: needs points and groups[]`);
        const needN = q.need || (q.groups || []).length;
        need(needN <= (q.groups || []).length, `${where}open question ${label}: need (${needN}) > number of groups`);
        const groups = [];
        for (const [gi, g] of (q.groups || []).entries()) {
          need(Array.isArray(g.keywords) && g.keywords.length, `${where}open question ${label} group ${gi + 1}: keywords[] required`);
          const hs = new Set();
          for (const kw of g.keywords || []) {
            const n = norm(kw.trim());
            if (/\s/.test(n)) { errors.push(`${where}open question ${label}: keyword "${kw}" has a space — use single words (prefix-matched)`); continue; }
            if (n.length < 3) { errors.push(`${where}open question ${label}: keyword "${kw}" is shorter than 3 letters — it can never match`); continue; }
            hs.add(await sha(n));
          }
          groups.push([...hs]);
        }
        items.push({ id, text: q.q, points: q.points, need: needN, bonus: !!q.bonus, groups });
        if (q.bonus) sbonus += q.points; else smax += q.points;
        ans += `<div class="a"><b class="n">${q.bonus ? "בונוס:" : label + "."}</b> ${esc(q.q)} <small>(${q.points} נק')</small><br>${q.answer || ""}` +
          `<p><b>רעיונות מרכזיים לבדיקה</b> (צריך ${needN}):</p><ul>${(q.groups || []).map((g) => `<li>${esc(g.idea || (g.keywords || []).join(" / "))}</li>`).join("")}</ul></div>\n`;
      }
      cfgSections.push({ type: "open", title: sec.title, short: sec.short || sec.title, max: smax,
        sub: `${fmt(smax)} נק'${sbonus ? ` + ${fmt(sbonus)} בונוס` : ""}`, items });
      max += smax; bonusMax += sbonus;
    } else {
      errors.push(`${where}quiz section "${sec.title}": unknown type "${sec.type}" (mc | match | open)`);
    }
    answersBody += ans;
  }
  if (max !== 100) warn(`${where}quiz total is ${fmt(max)} points (not 100)`);
  const cfgId = multi ? `${spec.id}:v${v + 1}` : spec.id;
  return { quiz, cfg: { id: cfgId, salt, max, sections: cfgSections }, answersBody, qn, max, bonusMax };
}

const built = [];
for (const [v, q] of versions.entries()) built.push(await buildQuiz(q, v));
if (errors.length) die("spec has problems:\n  - " + errors.join("\n  - "));

const quizPages = built.map((b, v) => {
  const hasOpen = b.cfg.sections.some((s) => s.type === "open");
  return shell({
    title: `בוחן${multi ? ` (${verName(v)})` : ""} – ${S}`,
    tag: "בוחן תרגול",
    h1: (b.quiz.title || `בוחן ב${S}`) + (multi ? ` – ${verName(v)}` : ""),
    facts: [spec.summary, `${fmt(b.max)} נקודות${b.bonusMax ? ` + ${fmt(b.bonusMax)} בונוס` : ""}`].filter(Boolean),
    current: quizFile(v),
    answersHref: multi ? `answers.html#v${v + 1}` : "answers.html",
    extraHero: `\n  <div class="namebox"><label for="name">שם:</label><input type="text" id="name" autocomplete="off"></div>`,
    body: `${verNav(v, quizFile)}
<div id="result" aria-live="polite"></div>

<form id="quiz" autocomplete="off">
<div id="sections"></div>

<div class="actions">
  <button type="submit" id="submit">הגשה וחישוב ציון</button>
  <button type="button" id="reset">התחלה מחדש</button>
</div>
${hasOpen ? `<p class="note">בשאלות הפתוחות הציון מחושב אוטומטית לפי הרעיונות המרכזיים שמופיעים בתשובה, ולכן הוא משוער. כדאי שמבוגר יעבור על התשובות מול דף התשובות.</p>` : ""}
</form>
</main>
<script>
const CFG = ${json(b.cfg)};
${tpl("quiz.js")}</script>`,
  });
});

// ---------- answers (encrypted, all versions in one page) ----------
const answersPlain = multi
  ? built.map((b, v) => `<section class="ver" id="v${v + 1}" data-v="${v + 1}">\n<h2 class="ver-title">תשובות – ${verName(v)}</h2>\n${b.answersBody}</section>\n`).join("")
  : built[0].answersBody;
const b64 = (u) => Buffer.from(u).toString("base64");
const kdfSalt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: kdfSalt, iterations: 200000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(answersPlain));
const answersHtml = shell({
  title: `תשובות – ${S}`,
  tag: "תשובות",
  h1: "תשובות לבוחן",
  facts: ["מפתח בדיקה – רק אחרי שפותרים!"],
  current: "answers.html",
  body: `
<form id="gate" autocomplete="off">
  <h1>🔒 תשובות לבוחן</h1>
  <p>הדף מוגן בסיסמה</p>
  <input type="password" id="pw" placeholder="סיסמה" autofocus>
  <button type="submit">פתיחה</button>
  <div id="err" aria-live="polite"></div>
</form>
${verNav(-1, (v) => `#v${v + 1}`).replace('class="vernav"', 'class="vernav" hidden')}<div id="content"></div>
</main>
<script>
const P = ${json({ s: b64(kdfSalt), i: b64(iv), c: b64(ct) })};
${tpl("answers.js")}</script>`,
});

// ---------- write ----------
const dir = path.join(root, "content", spec.id);
fs.mkdirSync(dir, { recursive: true });
if (studyHtml) fs.writeFileSync(path.join(dir, "study.html"), studyHtml);
else if (fs.existsSync(path.join(dir, "study.html"))) {
  // kept study page: point its quiz link at the first quiz page
  const p = path.join(dir, "study.html");
  const old = fs.readFileSync(p, "utf8");
  const upd = old.replace(/href="quiz(-\d+)?\.html"/g, `href="${quizFile(0)}"`);
  if (upd !== old) fs.writeFileSync(p, upd);
}
quizPages.forEach((html, v) => fs.writeFileSync(path.join(dir, quizFile(v)), html));
fs.writeFileSync(path.join(dir, "answers.html"), answersHtml);
// remove quiz pages left over from a different number of versions
for (const f of fs.readdirSync(dir))
  if (/^quiz(-\d+)?\.html$/.test(f) && !quizPages.some((_, v) => quizFile(v) === f)) fs.unlinkSync(path.join(dir, f));

const ptsLabel = (b) => `${fmt(b.max)} נקודות${b.bonusMax ? ` + ${fmt(b.bonusMax)} בונוס` : ""}`;
const pages = [
  { href: `content/${spec.id}/study.html`, icon: "📖", title: "עזר ללמידה", desc: `דף הסברים עם כל החומר ל${ev.type === "quiz" ? "בוחן" : "מבחן"}, כולל שאלות "בדוק את עצמך" בכל נושא` },
  ...built.map((b, v) => ({ href: `content/${spec.id}/${quizFile(v)}`, icon: "✏️", title: multi ? `בוחן – ${verName(v)}` : "בוחן",
    desc: multi ? `בוחן תרגול עם שאלות אחרות בכל גרסה – ${ptsLabel(b)}, עם חישוב ציון` : `בוחן תרגול מלא – ${ptsLabel(b)}, עם חישוב ציון` })),
  { href: `content/${spec.id}/answers.html`, icon: "✅", title: "תשובות", desc: multi ? `מפתח בדיקה לכל ${built.length} הגרסאות (מוגן בסיסמה) – רק אחרי שפותרים!` : "מפתח בדיקה (מוגן בסיסמה) – רק אחרי שפותרים!" },
];
const pad = (s, n) => s + " ".repeat(Math.max(0, n - s.length));
const prevJs = path.join(root, "content", spec.id + ".js");
const summary = spec.summary || "";
fs.writeFileSync(prevJs,
  `registerContent(${JSON.stringify(spec.id)}, {
  summary: ${JSON.stringify(summary)},
  pages: [
${pages.map((p) => `    { href: ${pad(JSON.stringify(p.href) + ",", 44)} icon: ${JSON.stringify(p.icon)}, title: ${pad(JSON.stringify(p.title) + ",", 16)} desc: ${JSON.stringify(p.desc)} },`).join("\n")}
  ],
});
`);

// flip hasContent in data.js
const dataPath = path.join(root, "data.js");
const lines = fs.readFileSync(dataPath, "utf8").split("\n");
const li = lines.findIndex((l) => l.includes(`id: "${spec.id}"`));
if (li < 0) warn(`couldn't find the "${spec.id}" line in data.js — set hasContent: true by hand`);
else if (/hasContent:\s*false/.test(lines[li])) { lines[li] = lines[li].replace(/hasContent:\s*false/, "hasContent: true"); fs.writeFileSync(dataPath, lines.join("\n")); }
else if (!/hasContent:\s*true/.test(lines[li])) warn(`no hasContent field on the "${spec.id}" line in data.js — add hasContent: true by hand`);

console.log(`✓ ${path.relative(root, dir)}/{${studyHtml ? "study," : ""}${quizPages.map((_, v) => quizFile(v).replace(".html", "")).join(",")},answers}.html, content/${spec.id}.js`);
console.log(studyHtml ? `  study: ${secNo} sections, ${bankCount} self-check questions` : "  study: not in spec – kept existing study.html");
built.forEach((b, v) => console.log(`  quiz${multi ? " " + (v + 1) : ""}: ${b.qn} questions, ${fmt(b.max)} points${b.bonusMax ? ` + ${fmt(b.bonusMax)} bonus` : ""}`));
console.log(`  answers: encrypted (${answersPlain.length} chars of HTML${multi ? `, ${built.length} versions` : ""})`);
