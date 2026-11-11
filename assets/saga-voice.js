/* SAGA Saathi: simulated multilingual voice assistant (demo, no microphone or network).
   SagaVoice.mount({ root, theme:"light"|"dark", fabBottom, title, examples:{en,hi,te}, handle(text, lang) })
   handle returns { reply:{en,hi,te}, act?:fn, stay?:bool } or null when not understood. */
(function () {
  const CSS = `
.sv-fab{position:absolute;right:16px;bottom:var(--sv-b,96px);z-index:65;width:56px;height:56px;border-radius:50%;display:grid;place-items:center;color:#fff;
  background:radial-gradient(circle at 30% 30%,#4D6BFF,#092EC9 60%,#07080C);box-shadow:0 10px 26px rgba(9,46,201,.45),0 0 0 3px rgba(255,255,255,.9);transition:transform .25s cubic-bezier(.34,1.56,.64,1)}
.sv-fab:active{transform:scale(.9)}
.sv-fab::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(51,198,240,.6);animation:svp 2.4s infinite}
@keyframes svp{0%{transform:scale(.85);opacity:1}100%{transform:scale(1.35);opacity:0}}
.sv-fab svg{width:24px;height:24px}
.sv-sheet{position:absolute;inset:0;z-index:90;display:flex;flex-direction:column;justify-content:flex-end;background:rgba(7,8,12,.45);opacity:0;pointer-events:none;transition:opacity .3s}
.sv-sheet.on{opacity:1;pointer-events:auto}
.sv-panel{margin:0 8px 8px;border-radius:30px;padding:16px 16px 18px;background:#07080C;color:#fff;transform:translateY(40px);transition:transform .45s cubic-bezier(.2,.8,.2,1);box-shadow:0 -10px 40px rgba(0,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.08);font-family:"Inter Tight",system-ui,sans-serif}
.sv-sheet.on .sv-panel{transform:none}
.sv-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.sv-title{display:flex;align-items:center;gap:10px;font-weight:800;font-size:17px}
.sv-title i{width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,#2449F0,#33C6F0);display:grid;place-items:center}
.sv-badge{font-family:"JetBrains Mono",monospace;font-size:10.5px;font-weight:600;letter-spacing:.06em;padding:4px 8px;border-radius:7px;background:#1A1E29;color:rgba(255,255,255,.7)}
.sv-x{width:38px;height:38px;border-radius:50%;background:#1A1E29;color:#fff;display:grid;place-items:center}
.sv-langs{display:flex;gap:6px;margin-top:12px}
.sv-langs button{flex:1;height:38px;border-radius:12px;background:#1A1E29;color:rgba(255,255,255,.75);font-weight:700;font-size:14px;transition:all .2s}
.sv-langs button[aria-pressed="true"]{background:#fff;color:#07080C}
.sv-stage{display:flex;flex-direction:column;align-items:center;margin-top:14px;min-height:150px}
.sv-orb{position:relative;width:96px;height:96px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,#5B7BFF,#092EC9 55%,#050610);box-shadow:0 0 40px rgba(36,73,240,.5)}
.sv-orb.listen{animation:svo 1.1s ease-in-out infinite}
.sv-orb.think{animation:svt 1.2s linear infinite}
@keyframes svo{50%{box-shadow:0 0 70px rgba(51,198,240,.85);transform:scale(1.06)}}
@keyframes svt{to{filter:hue-rotate(60deg)}}
.sv-bars{display:flex;gap:4px;align-items:center;height:34px}
.sv-bars i{width:4px;height:8px;border-radius:4px;background:#fff;opacity:.9;transition:height .12s}
.sv-said{margin-top:12px;min-height:26px;text-align:center;font-size:18px;font-weight:700;line-height:1.35}
.sv-said .p{color:rgba(255,255,255,.55)}
.sv-reply{margin-top:8px;min-height:22px;text-align:center;font-size:15px;color:#9FE6FF;line-height:1.45}
.sv-status{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.08em;color:rgba(255,255,255,.5);margin-top:6px}
.sv-ex{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:12px -16px 0;padding:0 16px}
.sv-ex::-webkit-scrollbar{display:none}
.sv-ex button{flex:none;height:36px;padding:0 12px;border-radius:999px;background:#1A1E29;color:#fff;font-size:13.5px;font-weight:600;white-space:nowrap}
.sv-row{display:flex;gap:8px;margin-top:12px}
.sv-row input{flex:1;min-width:0;height:48px;border-radius:15px;border:0;background:#1A1E29;color:#fff;padding:0 14px;font-size:15px;outline:none}
.sv-row input:focus{box-shadow:inset 0 0 0 2px #33C6F0}
.sv-mic{width:48px;height:48px;border-radius:15px;background:#2449F0;color:#fff;display:grid;place-items:center;flex:none}
.sv-mic.rec{background:#C8243C}
.sv-mic svg,.sv-x svg{width:20px;height:20px}
.sv-note{margin-top:10px;text-align:center;font-size:11.5px;color:rgba(255,255,255,.45)}
@media (prefers-reduced-motion:reduce){.sv-fab::after,.sv-orb{animation:none!important}}`;
  const MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/></svg>';
  const X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const L = { en: "English", hi: "हिंदी", te: "తెలుగు" };
  const UI = {
    en: { tap: "Tap the mic and speak", listen: "LISTENING…", think: "UNDERSTANDING…", done: "DONE", sorry: "Sorry, I can only help with SAGA rides. Try one of these.", ph: "Or type what you want…" },
    hi: { tap: "माइक दबाएँ और बोलें", listen: "सुन रहा हूँ…", think: "समझ रहा हूँ…", done: "हो गया", sorry: "माफ़ कीजिए, मैं सिर्फ़ SAGA की सवारी में मदद कर सकता हूँ।", ph: "या यहाँ लिखें…" },
    te: { tap: "మైక్ నొక్కి మాట్లాడండి", listen: "వింటున్నాను…", think: "అర్థం చేసుకుంటున్నాను…", done: "అయిపోయింది", sorry: "క్షమించండి, నేను SAGA రైడ్‌లకు మాత్రమే సహాయం చేయగలను.", ph: "లేదా ఇక్కడ టైప్ చేయండి…" }
  };
  const detect = t => /[ఀ-౿]/.test(t) ? "te" : /[ऀ-ॿ]/.test(t) ? "hi" : "en";

  window.SagaVoice = {
    mount(o) {
      if (!document.getElementById("sv-css")) { const st = document.createElement("style"); st.id = "sv-css"; st.textContent = CSS; document.head.append(st); }
      const root = o.root; let lang = o.lang || "en", busy = false, exIdx = { en: 0, hi: 0, te: 0 }, timers = [];
      const later = (f, ms) => timers.push(setTimeout(f, ms));
      const fab = document.createElement("button"); fab.className = "sv-fab"; fab.setAttribute("aria-label", "Open SAGA Saathi voice assistant"); fab.innerHTML = MIC;
      fab.style.setProperty("--sv-b", (o.fabBottom || 96) + "px");
      const sh = document.createElement("div"); sh.className = "sv-sheet"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-label", "SAGA Saathi voice assistant");
      sh.innerHTML = `<div class="sv-panel">
        <div class="sv-head"><div class="sv-title"><i>${MIC.replace('width="24" height="24"', '')}</i>${o.title || "SAGA Saathi"}<span class="sv-badge">VOICE DEMO</span></div><button class="sv-x" aria-label="Close">${X}</button></div>
        <div class="sv-langs">${Object.keys(L).map(k => `<button data-l="${k}" aria-pressed="${k === lang}">${L[k]}</button>`).join("")}</div>
        <div class="sv-stage"><div class="sv-orb"><div class="sv-bars">${"<i></i>".repeat(7)}</div></div>
          <div class="sv-said" aria-live="polite"></div><div class="sv-reply" aria-live="polite"></div><div class="sv-status"></div></div>
        <div class="sv-ex"></div>
        <div class="sv-row"><input aria-label="Type a command" autocomplete="off"><button class="sv-mic" aria-label="Speak">${MIC}</button></div>
        <div class="sv-note">Simulated voice: tap the mic to hear a sample phrase, or type in any of the three languages.</div></div>`;
      root.append(fab, sh);
      const $ = s => sh.querySelector(s);
      const said = $(".sv-said"), reply = $(".sv-reply"), status = $(".sv-status"), orb = $(".sv-orb"), bars = [...sh.querySelectorAll(".sv-bars i")], input = $(".sv-row input"), mic = $(".sv-mic");
      let barT = 0;
      const wave = on => { clearInterval(barT); if (on) barT = setInterval(() => bars.forEach(b => b.style.height = (6 + Math.random() * 26) + "px"), 110); else bars.forEach((b, i) => b.style.height = [8, 12, 18, 24, 18, 12, 8][i] + "px"); };
      const paintLang = () => {
        sh.querySelectorAll(".sv-langs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.l === lang)));
        input.placeholder = UI[lang].ph;
        $(".sv-ex").innerHTML = (o.examples[lang] || []).map(t => `<button>${t}</button>`).join("");
        if (!busy) { said.innerHTML = ""; reply.textContent = UI[lang].tap; status.textContent = ""; }
      };
      const reset = () => { timers.forEach(clearTimeout); timers = []; busy = false; orb.className = "sv-orb"; mic.classList.remove("rec"); wave(false); };
      const open = () => { reset(); paintLang(); sh.classList.add("on"); };
      const close = () => { reset(); sh.classList.remove("on"); };
      const run = text => {
        const l = detect(text); if (l !== lang) { lang = l; paintLang(); }
        orb.className = "sv-orb think"; status.textContent = UI[lang].think; reply.textContent = "";
        later(() => {
          let r = null; try { r = o.handle(text, lang); } catch (e) { r = null; }
          orb.className = "sv-orb"; wave(false); busy = false;
          if (!r) { reply.textContent = UI[lang].sorry; status.textContent = ""; return; }
          reply.textContent = r.reply[lang] || r.reply.en; status.textContent = UI[lang].done + " ✓";
          if (r.act) later(() => { if (!r.stay) close(); r.act(); }, r.stay ? 300 : 1300);
        }, 750);
      };
      const speak = text => {
        if (busy) return; reset(); busy = true;
        orb.className = "sv-orb listen"; mic.classList.add("rec"); wave(true); status.textContent = UI[lang].listen; reply.textContent = ""; said.innerHTML = "";
        const words = text.split(" "); let n = 0;
        const step = () => { n++; said.innerHTML = `<span>${words.slice(0, n).join(" ")}</span> <span class="p">${n < words.length ? "…" : ""}</span>`; if (n < words.length) later(step, 230 + Math.random() * 120); else later(() => { mic.classList.remove("rec"); said.innerHTML = `“${text}”`; run(text); }, 500); };
        later(step, 500);
      };
      const nextExample = () => { const ex = o.examples[lang] || []; const t = ex[exIdx[lang] % ex.length]; exIdx[lang]++; return t; };
      fab.addEventListener("click", () => { open(); speak(nextExample()); });
      $(".sv-x").addEventListener("click", close);
      sh.addEventListener("click", e => { if (e.target === sh) close(); });
      sh.querySelector(".sv-langs").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; lang = b.dataset.l; reset(); paintLang(); });
      $(".sv-ex").addEventListener("click", e => { const b = e.target.closest("button"); if (b) speak(b.textContent); });
      mic.addEventListener("click", () => { if (input.value.trim()) { const t = input.value.trim(); input.value = ""; reset(); busy = true; said.innerHTML = `“${t}”`; run(t); } else speak(nextExample()); });
      input.addEventListener("keydown", e => { if (e.key === "Enter" && input.value.trim()) { const t = input.value.trim(); input.value = ""; reset(); busy = true; said.innerHTML = `“${t}”`; run(t); } });
      wave(false);
      return { open, close, speak };
    }
  };
})();
