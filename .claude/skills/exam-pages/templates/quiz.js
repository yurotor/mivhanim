// Practice quiz runtime. Expects a global CFG built by build.mjs.
// Answers are never in the page: only salted SHA-256 hashes of them.
const $ = s => document.querySelector(s);
const enc = new TextEncoder();
async function h(s){const b=await crypto.subtle.digest("SHA-256",enc.encode(CFG.salt+s));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");}
const LETTERS = "אבגדהוזח";
const finals = {"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
function norm(w){return w.toLowerCase().replace(/[֑-ׇ]/g,"").replace(/[ךםןףץ]/g,c=>finals[c]);}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
const fmt = n => String(Math.round(n*10)/10);

/* ---------- render ---------- */
const form = $("#quiz");
const host = $("#sections");
let num = 0;
CFG.sections.forEach(sec => {
  const h2 = document.createElement("h2");
  h2.innerHTML = `${esc(sec.title)} <small>(${esc(sec.sub)})</small>`;
  host.appendChild(h2);
  const box = document.createElement("div");
  host.appendChild(box);
  sec.items.forEach(q => {
    const d = document.createElement("div"); d.className = "q"; d.dataset.id = q.id;
    if (sec.type === "mc") {
      d.innerHTML = `<div class="stem">${++num}. ${esc(q.text)} <span class="pts">${fmt(sec.points)} נק'</span></div>` +
        q.options.map((o,j)=>`<label class="opt"><input type="radio" name="${q.id}" value="${j}"><span>${LETTERS[j]}. ${esc(o)}</span></label>`).join("") +
        `<div class="fb"></div>`;
    } else if (sec.type === "match") {
      const sel = name => `<select name="${name}"><option value="">— בחרו —</option>${sec.choices.map(p=>`<option>${esc(p)}</option>`).join("")}</select>`;
      d.innerHTML = `<div class="${sec.quote ? "quote" : "stem"}">${++num}. ${esc(q.text)} <span class="pts">${fmt(sec.points)} נק'</span></div>
        <div class="qtrow">${sec.labels.map((lab,k)=>`<label>${esc(lab)}${sel(q.id+"_"+k)}</label>`).join("")}</div><div class="fb"></div>`;
    } else {
      const label = q.bonus ? "בונוס:" : (++num) + ".";
      d.innerHTML = `<div class="stem">${label} ${esc(q.text)} <span class="pts">${fmt(q.points)} נק'</span></div><textarea name="${q.id}" placeholder="כתבו כאן את התשובה..."></textarea><div class="fb"></div>`;
    }
    box.appendChild(d);
  });
});

/* ---------- selection highlight + draft save ---------- */
const KEY = "quiz:" + CFG.id;
function markSel(){document.querySelectorAll(".opt").forEach(l=>l.classList.toggle("sel",l.querySelector("input").checked));}
function save(){try{const data={name:$("#name").value};new FormData(form).forEach((v,k)=>data[k]=v);localStorage.setItem(KEY,JSON.stringify(data));}catch(e){}}
function load(){try{const data=JSON.parse(localStorage.getItem(KEY)||"{}");if(data.name)$("#name").value=data.name;
  for(const [k,v] of Object.entries(data)){const els=form.elements[k];if(!els)continue;
    if(els instanceof RadioNodeList){els.forEach(r=>r.checked=(r.value===v));}else els.value=v;}}catch(e){}markSel();}
form.addEventListener("change",()=>{markSel();save();});
form.addEventListener("input",save);$("#name").addEventListener("input",save);
load();

/* ---------- grading ---------- */
async function wordHashes(text){
  const out=new Set();
  const words=norm(text).split(/[^א-תa-z0-9]+/).filter(Boolean);
  for(const w of words){
    const vars=new Set([w]);
    if(w.length>3 && "והבכלמש".includes(w[0])){vars.add(w.slice(1));
      if(w.length>4 && "הבכלמש".includes(w[1])) vars.add(w.slice(2));}
    for(const v of vars) for(let k=3;k<=v.length;k++) out.add(v.slice(0,k));
  }
  const arr=[...out];const hs=await Promise.all(arr.map(h));return new Set(hs);
}
function fb(el,cls,msg){el.className="fb show "+cls;el.textContent=msg;}

form.addEventListener("submit",async e=>{
  e.preventDefault();
  const btn=$("#submit");btn.disabled=true;btn.textContent="מחשב...";
  const scores = CFG.sections.map(()=>0);
  let bonus=0, bonusMax=0;

  for (const [si, sec] of CFG.sections.entries()) {
    for (const q of sec.items) {
      const box=document.querySelector(`.q[data-id="${q.id}"]`);
      const f=box.querySelector(".fb");
      if (sec.type === "mc") {
        const picked=form.elements[q.id].value;
        let correct=-1;
        for(let j=0;j<q.options.length;j++) if(await h("mc|"+q.id+"|"+j)===q.h){correct=j;break;}
        box.querySelectorAll(".opt").forEach((l,j)=>{l.classList.remove("sel");if(j===correct)l.classList.add("right");else if(String(j)===picked)l.classList.add("wrong");});
        if(picked===String(correct)){scores[si]+=sec.points;fb(f,"ok","נכון! +"+fmt(sec.points));}
        else fb(f,"bad",(picked===""?"לא נענתה. ":"לא נכון. ")+"התשובה הנכונה: "+LETTERS[correct]);
      } else if (sec.type === "match") {
        const per = sec.points / sec.labels.length;
        let pts=0;const msgs=[];
        for (const [k,lab] of sec.labels.entries()) {
          const s=form.elements[q.id+"_"+k];
          const ok = s.value && (await h("m|"+q.id+"|"+k+"|"+s.value))===q.h[k];
          s.classList.add(ok?"right":"wrong");
          if(ok)pts+=per;else{
            let ans="";for(const p of sec.choices) if((await h("m|"+q.id+"|"+k+"|"+p))===q.h[k]){ans=p;break;}
            msgs.push(lab.replace(/[?:]\s*$/,"")+": "+ans);
          }
        }
        scores[si]+=pts;
        fb(f,pts===sec.points?"ok":pts?"mid":"bad",pts===sec.points?"מצוין! +"+fmt(pts):`+${fmt(pts)}. התשובה הנכונה – `+msgs.join(", "));
      } else {
        if (q.bonus) bonusMax += q.points;
        const txt=form.elements[q.id].value.trim();
        if(!txt){fb(f,"bad","לא נענתה. 0 נק'");continue;}
        const hs=await wordHashes(txt);
        let hit=0;for(const g of q.groups) if(g.some(x=>hs.has(x))) hit++;
        const got=Math.min(hit,q.need);
        const pts=Math.round(q.points*got/q.need);
        if(q.bonus)bonus+=pts;else scores[si]+=pts;
        fb(f,pts===q.points?"ok":pts?"mid":"bad",`זוהו ${got} מתוך ${q.need} רעיונות מרכזיים · ציון משוער: ${pts}/${q.points}`);
      }
    }
  }

  const total=Math.round(scores.reduce((a,b)=>a+b,0));
  const name=$("#name").value.trim();
  const r=$("#result");
  const pct = total / CFG.max;
  r.innerHTML=`<div>${name?esc(name)+", ":""}הציון שלך:</div>
    <div class="grade">${total}${bonus?` <span style="font-size:1.4rem">+ ${bonus} בונוס</span>`:""}</div>
    <table>
      ${CFG.sections.map((s,i)=>`<tr><td>${esc(s.short)}${s.type==="open"?" (משוער)":""}</td><td>${fmt(scores[i])} / ${fmt(s.max)}</td></tr>`).join("")}
      ${bonusMax?`<tr><td>בונוס</td><td>${bonus} / ${bonusMax}</td></tr>`:""}
    </table>
    <p class="note">${pct>=.9?"כל הכבוד! 🌟":pct>=.75?"יפה מאוד! כדאי לחזור על מה שפספסת.":"כדאי לחזור על דף ההסברים ולנסות שוב."}</p>`;
  r.classList.add("show");
  form.querySelectorAll("input,select,textarea").forEach(x=>x.disabled=true);
  btn.textContent="הוגש";
  r.scrollIntoView({behavior:"smooth",block:"start"});
});

$("#reset").addEventListener("click",()=>{
  try{localStorage.removeItem(KEY);}catch(e){}
  HTMLFormElement.prototype.reset.call(form);
  form.querySelectorAll("input,select,textarea").forEach(x=>{x.disabled=false;x.classList.remove("right","wrong");});
  document.querySelectorAll(".opt").forEach(l=>l.classList.remove("right","wrong","sel"));
  document.querySelectorAll(".fb").forEach(f=>f.className="fb");
  $("#result").className="";$("#result").innerHTML="";
  const b=$("#submit");b.disabled=false;b.textContent="הגשה וחישוב ציון";
  window.scrollTo({top:0,behavior:"smooth"});
});
