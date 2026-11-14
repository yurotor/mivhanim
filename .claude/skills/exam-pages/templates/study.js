// "בדוק את עצמך" mini-quizzes. Expects a global BANK = { "<section#>": [[q, correct, [wrong...], explain], ...] }
(function(){
  const LET = "אבגדהו";
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  document.querySelectorAll(".mini").forEach(box => {
    const pool = BANK[box.dataset.sec];
    if (!pool || !pool.length) { box.remove(); return; }
    const per = Math.min(3, pool.length);
    let last = [];
    function draw(){
      const avail = pool.map((_, i) => i).filter(i => !last.includes(i));
      const pickIdx = shuffle(avail.length >= per ? avail : pool.map((_, i) => i)).slice(0, per);
      last = pickIdx;
      let answered = 0, right = 0;
      box.innerHTML = `<div class="mini-head"><span>🧠 בדוק את עצמך</span><span class="mini-score"></span></div>` +
        pickIdx.map((qi, n) => {
          const [q, c, d] = pool[qi];
          const opts = shuffle([c, ...d]);
          return `<div class="mq" data-q="${qi}"><div class="mq-stem">${n+1}. ${esc(q)}</div>` +
            opts.map((o, j) => `<button type="button" class="mo" data-ok="${o === c ? 1 : 0}">${LET[j]}. ${esc(o)}</button>`).join("") +
            `<div class="mfb"></div></div>`;
        }).join("") +
        `<button type="button" class="mini-new">🔄 שאלות חדשות</button>`;
      box.querySelectorAll(".mq").forEach(mq => {
        const [, c, , ex] = pool[mq.dataset.q];
        mq.querySelectorAll(".mo").forEach(b => b.addEventListener("click", () => {
          if (mq.classList.contains("done")) return;
          mq.classList.add("done"); answered++;
          const fb = mq.querySelector(".mfb");
          mq.querySelectorAll(".mo").forEach(x => { x.disabled = true; if (x.dataset.ok === "1") x.classList.add("right"); });
          if (b.dataset.ok === "1") { right++; fb.className = "mfb ok"; fb.innerHTML = "✓ נכון! " + esc(ex || ""); }
          else { b.classList.add("wrong"); fb.className = "mfb bad"; fb.innerHTML = "✗ לא נכון. התשובה הנכונה: <b>" + esc(c) + "</b>" + (ex ? "<br>" + esc(ex) : ""); }
          if (answered === per) box.querySelector(".mini-score").textContent = `${right}/${per} ${right === per ? "🌟" : ""}`;
        }));
      });
      box.querySelector(".mini-new").addEventListener("click", draw);
    }
    draw();
  });
})();
