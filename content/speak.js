// Tap-to-hear for English words on exam pages (study / quiz / answers).
// Wraps English words in <span class="say"> and speaks them with the browser's built-in
// speech synthesis (works on desktop, iOS Safari and Android Chrome — no network, no audio files).
// A text run that is entirely English and short (a vocab item like "take care of") is one unit;
// English inside a Hebrew sentence is wrapped word by word. Content rendered later (quiz,
// self-check redraws, feedback, decrypted answer key) is picked up by a MutationObserver.
(function () {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
  const synth = window.speechSynthesis;

  let voice = null;
  function pickVoice() {
    const vs = synth.getVoices();
    voice = vs.find((v) => /^en[-_]US$/i.test(v.lang) && v.localService)
      || vs.find((v) => /^en[-_]US$/i.test(v.lang))
      || vs.find((v) => /^en([-_]|$)/i.test(v.lang))
      || null;
  }
  pickVoice();
  if (synth.addEventListener) synth.addEventListener("voiceschanged", pickVoice);
  else synth.onvoiceschanged = pickVoice;

  const WORD = /[A-Za-z]+(?:['’][A-Za-z]+)*(?:-[A-Za-z]+)*/g;
  const PHRASE = new RegExp(`${WORD.source}(?: +${WORD.source})*`, "g");
  const HEB = /[֐-׿]/;
  // Never wrap inside form controls, links, or one-tap answer buttons (a tap there would also answer).
  const SKIP = "script,style,textarea,input,select,option,a,.say,.mo,.say-hint";

  function wrapTextNode(node) {
    const text = node.nodeValue;
    const matches = [...text.matchAll(WORD)];
    if (!matches.length) return;
    const frag = document.createDocumentFragment();
    const span = (s) => { const el = document.createElement("span"); el.className = "say"; el.lang = "en"; el.textContent = s; return el; };
    // Short all-English runs: words joined only by spaces form one phrase ("take care of");
    // dashes, commas etc. still split ("admire – cousin" → two units).
    const re = !HEB.test(text) && matches.length <= 4 ? PHRASE : WORD;
    const ranges = [...text.matchAll(re)].map((m) => [m.index, m.index + m[0].length]);
    let pos = 0;
    for (const [a, b] of ranges) {
      if (a > pos) frag.appendChild(document.createTextNode(text.slice(pos, a)));
      frag.appendChild(span(text.slice(a, b)));
      pos = b;
    }
    if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
    node.parentNode.replaceChild(frag, node);
  }

  function scan(root) {
    if (!root || (root.nodeType === 1 && root.closest(SKIP))) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (/[A-Za-z]/.test(n.nodeValue) && n.parentElement && !n.parentElement.closest(SKIP)
        ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(wrapTextNode);
    if (nodes.length) addHint();
  }

  function addHint() {
    if (document.querySelector(".say-hint")) return;
    const nav = document.querySelector(".subnav");
    if (!nav) return;
    const p = document.createElement("p");
    p.className = "say-hint";
    p.textContent = "🔊 לחצו על מילה באנגלית כדי לשמוע איך אומרים אותה";
    nav.after(p);
  }

  let current = null;
  function speak(el) {
    const text = el.textContent.trim();
    if (!text) return;
    synth.cancel();
    if (current) current.classList.remove("speaking");
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice ? voice.lang : "en-US";
    if (voice) u.voice = voice;
    u.rate = 0.85;
    current = el;
    el.classList.add("speaking");
    const done = () => { el.classList.remove("speaking"); if (current === el) current = null; };
    u.onend = done; u.onerror = done;
    setTimeout(done, 6000);
    synth.speak(u);
    if (synth.paused) synth.resume(); // Chrome can get stuck paused
  }

  // Don't preventDefault: tapping an option word in a quiz should still select that option.
  document.addEventListener("click", (e) => {
    const el = e.target.closest && e.target.closest(".say");
    if (el) speak(el);
  });

  function start() {
    scan(document.body);
    new MutationObserver((muts) => {
      for (const m of muts) for (const n of m.addedNodes) {
        if (n.nodeType === 1) scan(n);
        else if (n.nodeType === 3 && n.parentElement) scan(n.parentElement);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
