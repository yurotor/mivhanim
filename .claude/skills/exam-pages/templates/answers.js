// Password gate. Expects a global P = { s: salt b64, i: iv b64, c: ciphertext b64 } (PBKDF2-SHA256 200k → AES-GCM-256)
// With several quiz versions the plaintext holds <section class="ver" id="vN"> blocks; .vernav switches between them (#vN).
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
function showVersion() {
  const secs = document.querySelectorAll("#content section.ver");
  if (!secs.length) return;
  const want = (location.hash.match(/^#v(\d+)$/) || [])[1] || "1";
  const v = [...secs].some(s => s.dataset.v === want) ? want : "1";
  secs.forEach(s => s.hidden = s.dataset.v !== v);
  document.querySelectorAll(".vernav a").forEach(a => a.toggleAttribute("aria-current", a.dataset.v === v));
}
window.addEventListener("hashchange", showVersion);
document.getElementById("gate").addEventListener("submit", async e => {
  e.preventDefault();
  const err = document.getElementById("err"); err.textContent = "";
  try {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(document.getElementById("pw").value), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey({name:"PBKDF2", salt:b64(P.s), iterations:200000, hash:"SHA-256"}, base, {name:"AES-GCM", length:256}, false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({name:"AES-GCM", iv:b64(P.i)}, key, b64(P.c));
    document.getElementById("content").innerHTML = new TextDecoder().decode(plain);
    document.getElementById("gate").remove();
    const nav = document.querySelector(".vernav");
    if (nav) nav.hidden = false;
    showVersion();
  } catch (x) {
    err.textContent = "סיסמה שגויה";
  }
});
