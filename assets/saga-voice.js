/* SAGA Saathi: simulated multilingual voice assistant with a full-screen "live" interface.
   SagaVoice.mount({ root, trigger, user, examples:{en,hi,te}, handle(text, lang), onOpen, onClose })
   handle returns { reply:{en,hi,te}, act?:fn, stay?:bool } or null when not understood.
   Demo only: no microphone or network. Tapping the S "hears" the next sample phrase. */
(function () {
  const S_PATH = '<path d="M86 14 H32 A18 18 0 0 0 32 50 H68 A18 18 0 0 1 68 86 H34" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/><circle cx="19" cy="86" r="7" fill="#33C6F0"/>';
  const ICON = {
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    kb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M7 15h10"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>'
  };
  const CSS = `
.svl{position:absolute;inset:0;z-index:95;display:flex;flex-direction:column;color:#fff;background:#05060B;font-family:"Inter Tight",system-ui,sans-serif;overflow:hidden;
  clip-path:circle(0 at 50% calc(100% - 45px));transition:clip-path .6s cubic-bezier(.2,.8,.2,1);pointer-events:none;visibility:hidden}
.svl.on{clip-path:circle(150% at 50% calc(100% - 45px));pointer-events:auto;visibility:visible}
.svl .aur{position:absolute;left:-30%;right:-30%;bottom:-38%;height:70%;filter:blur(46px);opacity:.75;transition:opacity .6s,transform .6s}
.svl .aur i{position:absolute;border-radius:50%;mix-blend-mode:screen}
.svl .aur i:nth-child(1){width:60%;height:80%;left:8%;top:22%;background:#2449F0;animation:svA 7s ease-in-out infinite alternate}
.svl .aur i:nth-child(2){width:46%;height:70%;left:40%;top:30%;background:#33C6F0;animation:svB 6s ease-in-out infinite alternate}
.svl .aur i:nth-child(3){width:50%;height:75%;left:58%;top:18%;background:#3B2BD9;animation:svC 8s ease-in-out infinite alternate}
@keyframes svA{to{transform:translate(18%,-8%) scale(1.15)}}
@keyframes svB{to{transform:translate(-22%,6%) scale(.9)}}
@keyframes svC{to{transform:translate(-12%,-10%) scale(1.1)}}
.svl.listen .aur{opacity:1;transform:translateY(-14%) scaleY(1.25)}
.svl.think .aur{opacity:.9;transform:translateY(-6%)}
.svl.listen .aur i{animation-duration:1.6s,1.4s,1.8s}
.svl .top{position:relative;display:flex;align-items:center;justify-content:space-between;padding:58px 18px 0}
.svl .who{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:500}
.svl .who svg{width:22px;height:22px;color:#fff}
.svl .langs{display:flex;gap:2px;padding:3px;border-radius:99px;background:rgba(255,255,255,.08)}
.svl .langs button{height:30px;padding:0 11px;border-radius:99px;font-size:13px;font-weight:500;color:rgba(255,255,255,.7)}
.svl .langs button[aria-pressed="true"]{background:#fff;color:#05060B}
.svl .mid{position:relative;flex:1;padding:44px 26px 0;display:flex;flex-direction:column}
.svl .hi{font-size:15px;color:rgba(255,255,255,.55)}
.svl .said{margin-top:10px;font-size:28px;line-height:1.22;font-weight:400;letter-spacing:-.02em;min-height:70px}
.svl .said .dim{color:rgba(255,255,255,.4)}
.svl .reply{margin-top:18px;font-size:17px;line-height:1.45;color:#BFD4FF;min-height:50px}
.svl .status{margin-top:12px;font-size:13px;color:rgba(255,255,255,.5);display:flex;align-items:center;gap:8px}
.svl .status i{width:6px;height:6px;border-radius:50%;background:#33C6F0;box-shadow:0 0 8px #33C6F0;animation:svP 1s infinite}
@keyframes svP{50%{opacity:.25}}
.svl .chips{position:relative;display:flex;flex-direction:column;gap:8px;padding:0 18px 14px}
.svl .chips button{align-self:flex-start;max-width:100%;padding:11px 16px;border-radius:16px;background:rgba(255,255,255,.1);font-size:15px;text-align:left;color:#fff;transition:background .2s}
.svl .chips button:active{background:rgba(255,255,255,.2)}
.svl .type{position:relative;display:none;gap:8px;padding:0 18px 12px}
.svl.kb .type{display:flex}.svl.kb .chips{display:none}
.svl .type input{flex:1;min-width:0;height:50px;border-radius:25px;border:0;background:rgba(255,255,255,.12);color:#fff;padding:0 18px;font-size:16px;outline:none;font-family:inherit}
.svl .type input::placeholder{color:rgba(255,255,255,.5)}
.svl .type button{width:50px;height:50px;border-radius:50%;background:#fff;color:#05060B;display:grid;place-items:center}
.svl .type svg{width:20px;height:20px}
.svl .ctl{position:relative;display:flex;align-items:center;justify-content:space-between;padding:6px 34px 40px}
.svl .ctl .sm{width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.1);display:grid;place-items:center;color:#fff}
.svl .ctl .sm svg{width:22px;height:22px}
.svl .orb{position:relative;isolation:isolate;width:84px;height:84px;border-radius:50%;display:grid;place-items:center;color:#fff}
.svl .orb::before{content:"";position:absolute;inset:0;border-radius:50%;padding:3px;background:conic-gradient(from 0deg,#2449F0,#33C6F0,#7B8CFF,#2449F0) border-box;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:svR 4s linear infinite}
.svl .orb::after{content:"";position:absolute;inset:3px;border-radius:50%;background:#07080C;z-index:-1;box-shadow:0 0 30px rgba(51,198,240,.45)}
.svl.listen .orb{animation:svG 1s ease-in-out infinite}
.svl.listen .orb::before{animation-duration:1.2s}
.svl .orb svg{width:38px;height:38px;filter:drop-shadow(0 0 6px rgba(51,198,240,.85))}
@keyframes svR{to{transform:rotate(1turn)}}
@keyframes svG{50%{transform:scale(1.08)}}
.svl .note{position:absolute;left:0;right:0;bottom:14px;text-align:center;font-size:11px;color:rgba(255,255,255,.4)}
@media (prefers-reduced-motion:reduce){.svl,.svl *,.svl *::before{animation:none!important;transition:none!important}}`;
  const L = { en: "EN", hi: "हिं", te: "తె" };
  const UI = {
    en: { hi: n => `Hi ${n}`, ask: "Where would you like to go?", listen: "Listening", think: "Working on it", sorry: "I can help with SAGA rides only. Try one of these.", ph: "Type a request" },
    hi: { hi: n => `नमस्ते ${n}`, ask: "आप कहाँ जाना चाहेंगे?", listen: "सुन रहा हूँ", think: "कर रहा हूँ", sorry: "मैं सिर्फ़ SAGA की राइड में मदद कर सकता हूँ।", ph: "यहाँ लिखें" },
    te: { hi: n => `నమస్తే ${n}`, ask: "ఎక్కడికి వెళ్ళాలి?", listen: "వింటున్నాను", think: "చేస్తున్నాను", sorry: "నేను SAGA రైడ్‌లకు మాత్రమే సహాయం చేయగలను.", ph: "ఇక్కడ టైప్ చేయండి" }
  };
  const detect = t => /[ఀ-౿]/.test(t) ? "te" : /[ऀ-ॿ]/.test(t) ? "hi" : null;

  window.SagaVoice = {
    S_SVG: `<svg viewBox="0 0 100 100" aria-hidden="true">${S_PATH}</svg>`,
    mount(o) {
      if (!document.getElementById("svl-css")) { const st = document.createElement("style"); st.id = "svl-css"; st.textContent = CSS; document.head.append(st); }
      let lang = o.lang || "en", busy = false, timers = [], idx = { en: 0, hi: 0, te: 0 };
      const later = (f, ms) => timers.push(setTimeout(f, ms));
      const el = document.createElement("div"); el.className = "svl"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "SAGA Saathi voice assistant");
      el.innerHTML = `<div class="aur" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="top"><div class="who"><svg viewBox="0 0 100 100" aria-hidden="true">${S_PATH}</svg>Saathi</div>
          <div class="langs">${Object.keys(L).map(k => `<button data-l="${k}" aria-pressed="${k === lang}">${L[k]}</button>`).join("")}</div></div>
        <div class="mid"><div class="hi"></div><div class="said" aria-live="polite"></div><div class="reply" aria-live="polite"></div><div class="status"></div></div>
        <div class="chips"></div>
        <div class="type"><input autocomplete="off" aria-label="Type a request"><button aria-label="Send">${ICON.send}</button></div>
        <div class="ctl"><button class="sm kbb" aria-label="Type instead">${ICON.kb}</button>
          <button class="orb" aria-label="Speak"><svg viewBox="0 0 100 100" aria-hidden="true">${S_PATH}</svg></button>
          <button class="sm xb" aria-label="Close">${ICON.x}</button></div>
        <div class="note">Voice demo · tap the S to hear a sample request</div>`;
      o.root.append(el);
      const $ = s => el.querySelector(s);
      const said = $(".said"), reply = $(".reply"), status = $(".status"), input = $(".type input");
      const state = s => { el.classList.remove("listen", "think"); if (s) el.classList.add(s); o.onState && o.onState(s); };
      const setStatus = t => status.innerHTML = t ? `<i></i>${t}` : "";
      const paint = () => {
        el.querySelectorAll(".langs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.l === lang)));
        $(".hi").textContent = UI[lang].hi(o.user || "");
        input.placeholder = UI[lang].ph;
        $(".chips").innerHTML = (o.examples[lang] || []).slice(0, 3).map(t => `<button>${t}</button>`).join("");
        if (!busy) { said.textContent = UI[lang].ask; reply.textContent = ""; setStatus(""); }
      };
      const reset = () => { timers.forEach(clearTimeout); timers = []; busy = false; state(""); };
      const open = () => { reset(); el.classList.remove("kb"); paint(); el.classList.add("on"); o.onOpen && o.onOpen(); };
      const close = () => { reset(); el.classList.remove("on"); o.onClose && o.onClose(); };
      const run = text => {
        const d = detect(text); if (d && d !== lang) { lang = d; el.querySelectorAll(".langs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.l === lang))); $(".hi").textContent = UI[lang].hi(o.user || ""); }
        state("think"); setStatus(UI[lang].think);
        later(() => {
          let r = null; try { r = o.handle(text, lang); } catch (e) { r = null; }
          state(""); busy = false; setStatus("");
          if (!r) { reply.textContent = UI[lang].sorry; return; }
          reply.textContent = r.reply[lang] || r.reply.en;
          if (r.act) later(() => { if (!r.stay) close(); r.act(); }, r.stay ? 400 : 1500);
        }, 800);
      };
      const speak = text => {
        if (busy) return; reset(); busy = true; state("listen"); setStatus(UI[lang].listen); reply.textContent = "";
        const words = text.split(" "); let n = 0;
        const step = () => { n++; said.innerHTML = `${words.slice(0, n).join(" ")}<span class="dim">${n < words.length ? " …" : ""}</span>`; if (n < words.length) later(step, 240 + Math.random() * 110); else later(() => run(text), 450); };
        said.innerHTML = '<span class="dim">…</span>'; later(step, 500);
      };
      const typed = () => { const t = input.value.trim(); if (!t) return; input.value = ""; reset(); busy = true; said.textContent = t; reply.textContent = ""; run(t); };
      const next = () => { const ex = o.examples[lang] || []; return ex[idx[lang]++ % ex.length]; };
      $(".orb").addEventListener("click", () => { if (busy) { reset(); paint(); } else speak(next()); });
      $(".xb").addEventListener("click", close);
      $(".kbb").addEventListener("click", () => { el.classList.toggle("kb"); if (el.classList.contains("kb")) setTimeout(() => input.focus(), 50); });
      $(".type button").addEventListener("click", typed);
      input.addEventListener("keydown", e => { if (e.key === "Enter") typed(); if (e.key === "Escape") close(); });
      el.querySelector(".langs").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; lang = b.dataset.l; reset(); paint(); });
      $(".chips").addEventListener("click", e => { const b = e.target.closest("button"); if (b) speak(b.textContent); });
      if (o.trigger) o.trigger.addEventListener("click", () => { open(); later(() => speak(next()), 700); });
      return { open, close, speak, el };
    }
  };
})();
