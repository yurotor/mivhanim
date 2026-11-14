---
name: exam-pages
description: Generate the three exam-prep pages (study guide with self-check mini-quizzes, interactive graded practice quiz, password-protected answer key) for an exam on this site, from a folder of exam topic material. Use when the user points at a folder of topics/material for an exam and wants study/quiz/answers pages "like the tanach exam", or asks to add content to an exam in data.js.
argument-hint: <topics-folder> [exam-id]
---

# Exam pages

Turns a folder of exam material into `content/<id>/study.html`, `quiz-1.html`…`quiz-3.html` (one per quiz version), `answers.html` (one encrypted key covering all versions, with גרסה א/ב/ג tabs) + `content/<id>.js`, and sets `hasContent: true` in `data.js`. The reference output is `content/2026-11-16-tanach/`.

You write the **content** as a JSON spec; `build.mjs` does everything mechanical (HTML shell, hashing quiz answers, encrypting the answer key). Never hand-write those three HTML files or hand-compute hashes.

## Steps

1. **Read the whole topics folder.** Text, Markdown, PDFs (Read with `pages`), images (Read them – photos of textbook pages/worksheets are common). Note exactly which chapters/topics the exam covers.

2. **Identify the exam.** Match to an event in `data.js` (by subject + date, or the id the user gave). It must be type exam/quiz/alt. If ambiguous, ask.

3. **Get the answers password.** Ask the user (offer: reuse the same one as previous exams). Never write it to any file, commit message, or spec.

4. **Write the spec** (schema below; full working example: `spec-example.json` next to this file). Save it **inside the topics folder** as `exam-spec.json` – it has the answers in plain text, so it must not land in the public repo or the deployed site. If the topics folder is inside this repo, add it to `.gitignore` and `.vercelignore`.

5. **Build:**
   ```
   node .claude/skills/exam-pages/build.mjs <topics-folder>/exam-spec.json --password '<pw>'
   ```
   Run from the repo root. Fix every `✗` error and act on `⚠` warnings (total ≠ 100, small banks), then rebuild. Rebuilding is safe – it overwrites.

6. **Check it** – serve the repo (`python3 -m http.server`) and open `exam.html?id=<id>`, the study page, and the quiz. Submit each quiz version once with good answers and once blank to see grading; unlock answers with the password and switch between the version tabs.

7. Report what was generated (section/question counts). Don't commit unless asked.

## Content guidance (Hebrew, for 8th graders)

- All text in Hebrew, clear and friendly, as in the tanach pages. Stay strictly within the material in the folder – don't invent facts; if the material is thin on something, say so to the user rather than padding.
- **Study** – group into `parts` (e.g. per chapter/unit), each with numbered `sections` per topic. Explain, don't just list: background `tip`, comparison tables, quotes in `verse`, "why" boxes. Include a final summary/terms section (no bank needed). Each teaching section gets a `bank` of **6–8** self-check MC questions (3 are drawn at random; "שאלות חדשות" redraws).
- **Quiz – always 3 versions** (`quizzes: [v1, v2, v3]`). Same structure and points in each, but **different questions** – no question text repeated across versions; spread the material so each version tests different words/facts. The builder warns if there are fewer than 3.
- **Each quiz version** – mirror a real school exam: ~100 points + an optional bonus. Typical mix: MC (8 × 5), a match section (who said to whom / term↔definition / event↔place, 4 × 4), 5–6 open questions (44 total) + 1 bonus. Adapt the section types to the subject.
- **Open questions** are auto-graded by keyword groups: each `group` is one key idea; the student gets `points × min(hits, need) / need`. Keywords are **single words** (≥3 letters) matched as **prefixes** after stripping niqqud, final letters, and up to two prefix letters (ו ה ב כ ל מ ש). So use the shortest unambiguous stem and list synonyms/spellings (e.g. `["ניטרל","נייטרל","שבט","שייכ"]`). Avoid very common stems that would match anything.

## Spec schema

```jsonc
{
  "id": "<event id from data.js>",
  "summary": "one line – what the exam covers",   // shown on exam page + heroes
  "facts": ["כיתה ח"],                             // optional extra hero chips (study page)
  "study": {
    "title": "דף הסברים ל...",                    // optional
    "parts": [{
      "title": "חלק א: ...",                       // optional h2 (alternates subject color / red)
      "intro": "<div class=\"tip\">...</div>",     // optional HTML before the sections
      "sections": [{
        "title": "...",                            // numbered automatically + listed in the TOC
        "html": "...",                             // body HTML, classes below
        "bank": [{ "q": "...", "a": "correct", "wrong": ["", "", ""], "explain": "..." }]   // optional
      }]
    }]
  },
  // "study" is optional: omit it to keep an existing (e.g. hand-made) study.html – its quiz link is repointed to quiz-1.html
  "quizzes": [{                                    // 3 versions (גרסה א/ב/ג), each shaped like this
    "title": "בוחן ב...",                          // optional
    "sections": [
      { "type": "mc", "title": "חלק א: שאלות אמריקאיות", "short": "חלק א – אמריקאיות", "points": 5,
        "questions": [{ "q": "...", "options": ["", "", "", ""], "answer": 0, "explain": "html for answer key" }] },
      { "type": "match", "title": "חלק ב: מי אמר למי?", "short": "...", "points": 4, "quote": true,
        "labels": ["מי אמר?", "למי?"], "choices": ["...all dropdown options..."],
        "items": [{ "text": "\"...\"", "answers": ["<choice for label 1>", "<choice for label 2>"], "explain": "" }] },
      { "type": "open", "title": "חלק ג: שאלות פתוחות", "short": "...",
        "questions": [{ "q": "...", "points": 8, "need": 3, "bonus": false,
          "answer": "<p>model answer HTML for the answer key</p>",
          "groups": [{ "idea": "the idea, for the answer key", "keywords": ["stem1", "stem2"] }] }] }
    ]
  }, { /* version ב */ }, { /* version ג */ }]
}
```

- `points` on mc/match is **per item**; match points split evenly across labels. `answer` in mc is a 0-based index. Match `answers` must be exact strings from `choices`. `short` is the label in the score table (defaults to `title`).
- Quiz text (`q`, `options`, `text`) is plain text. `html`, `intro`, `explain`, `answer` are HTML.

## HTML classes for study content (from `content.css`)

`<div class="tip"><b>רקע:</b> …</div>` highlighted note · `<div class="box">…</div>` white card (lists, "why" explanations) · `<div class="verse">"quote"<small>source</small></div>` serif quote block · `<div class="table-scroll"><table><tr><th>…</th></tr>…</table></div>` table (always wrap) · `<b>` for key terms. Use `<ul>/<ol>` freely.

## Files

- `build.mjs` – the builder (Node ≥18, no deps). Reads subject name/color from `data.js`.
- `templates/{study,quiz,answers}.js` – client runtime inlined into each page. Quiz answers are stored only as SHA-256 hashes salted with `<id>|v<n>|` (`<id>|` for a single-version quiz); the answer key is AES-GCM encrypted (PBKDF2-SHA256, 200k iterations).
- `spec-example.json` – small complete spec; good to copy from.
