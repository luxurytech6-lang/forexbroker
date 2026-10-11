import React, { useState, useEffect, useRef } from "react";
import supabase from "../../supabase";

/* ─────────────────────────────────────────────
   DESIGN TOKENS  (match ProfitGainSignal landing)
───────────────────────────────────────────── */
const C = {
  bg:         "#EEF2F7",
  surface:    "#FFFFFF",
  surfaceAlt: "#F4F7FB",
  border:     "#D5DDE8",
  borderFocus:"#C9933160",
  borderHover:"#B7C3D3",
  accent:     "#8A5E0F",
  accentDim:  "rgba(226,174,74,0.14)",
  accentGlow: "rgba(226,174,74,0.45)",
  text:       "#0B1628",
  textMid:    "#4A5970",
  textDim:    "#8090A6",
  red:        "#C8373F",
  green:      "#0F8F5F",
  blue:       "#3D6FE0",
};

/* ─────────────────────────────────────────────
   GLOBAL CSS
───────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800;0,9..144,900;1,9..144,400;1,9..144,500&family=Public+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  scroll-behavior: smooth;
  height: 100%;
}

body {
  background: ${C.bg};
  color: ${C.text};
  font-family: 'Instrument Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  min-height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
}

a { text-decoration: none; color: inherit; }

/* ── Animations ── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes gridFade {
  from { opacity: 0; }
  to   { opacity: .3; }
}
@keyframes pulse {
  0%,100% { opacity:1; transform:scale(1); }
  50%     { opacity:.5; transform:scale(.9); }
}
@keyframes spinDot {
  to { transform: rotate(360deg); }
}
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20%,60% { transform: translateX(-6px); }
  40%,80% { transform: translateX(6px); }
}
@keyframes successPop {
  0%   { transform: scale(.8); opacity:0; }
  60%  { transform: scale(1.08); }
  100% { transform: scale(1); opacity:1; }
}

.auth-card-enter { animation: fadeUp .65s cubic-bezier(.22,1,.36,1) .05s both; }
.auth-header-enter { animation: fadeUp .65s cubic-bezier(.22,1,.36,1) .15s both; }

.grid-bg {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    linear-gradient(${C.border} 1px, transparent 1px),
    linear-gradient(90deg, ${C.border} 1px, transparent 1px);
  background-size: 56px 56px;
  animation: gridFade 1.2s ease-out both;
  mask-image: radial-gradient(ellipse 70% 70% at 50% 40%, black 0%, transparent 100%);
}

/* ── Nav ── */
.tf-nav {
  height: 60px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 clamp(16px, 4vw, 40px);
  background: ${C.bg}F2; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid ${C.border};
  position: sticky; top: 0; z-index: 100;
}

/* ── Nav actions / signup CTA ── */
.tf-nav-actions {
  display: flex; align-items: center; gap: 12px;
  min-width: 0;
}
.tf-nav-cta-label {
  font-size: 13px; color: ${C.textDim};
  white-space: nowrap;
}
.tf-nav-cta {
  font-size: 12px; padding: 8px 16px; border-radius: 8px;
  background: ${C.accentDim}; border: 1px solid ${C.accent}40;
  color: ${C.accent}; font-weight: 700; letter-spacing: .01em;
  transition: background .2s, color .2s;
  white-space: nowrap; flex-shrink: 0;
}

@media (max-width: 480px) {
  .tf-nav-actions { gap: 8px; }
  .tf-nav-cta-label { display: none; }
  .tf-nav-cta { font-size: 11px; padding: 7px 11px; }
}
@media (max-width: 360px) {
  .tf-nav-actions { gap: 6px; }
  .tf-nav-cta { font-size: 10px; padding: 6px 9px; }
}

/* ── iOS PWA safe area (notch / Dynamic Island) ── */
@supports (padding-top: env(safe-area-inset-top)) {
  .tf-nav {
    padding-top: env(safe-area-inset-top);
    height: calc(60px + env(safe-area-inset-top));
  }
  .tf-nav-offset {
    min-height: calc(100vh - 60px - env(safe-area-inset-top));
  }
}

/* ── Input ── */
.tf-input {
  width: 100%;
  background: ${C.surfaceAlt};
  border: 1px solid ${C.border};
  border-radius: 10px;
  padding: 13px 16px;
  font-size: 14px; color: ${C.text};
  font-family: 'Instrument Sans', sans-serif;
  outline: none;
  transition: border-color .2s, box-shadow .2s;
}
.tf-input:focus {
  border-color: ${C.accent}60;
  box-shadow: 0 0 0 3px ${C.accentDim};
}
.tf-input::placeholder { color: ${C.textDim}; }
.tf-input.error {
  border-color: ${C.red}70;
  box-shadow: 0 0 0 3px rgba(192,57,43,.08);
}
.tf-input.success {
  border-color: ${C.accent}60;
}

/* ── Password input wrapper ── */
.pw-wrap { position: relative; }
.pw-wrap .tf-input { padding-right: 46px; }
.pw-toggle {
  position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
  background: none; border: none; color: ${C.textDim}; cursor: pointer;
  font-size: 17px; padding: 4px; line-height: 1;
  transition: color .15s;
}
.pw-toggle:hover { color: ${C.textMid}; }

/* ── Checkbox ── */
.tf-checkbox {
  appearance: none; -webkit-appearance: none;
  width: 16px; height: 16px; border-radius: 4px;
  border: 1px solid ${C.border}; background: ${C.surfaceAlt};
  cursor: pointer; flex-shrink: 0;
  transition: border-color .15s, background .15s;
  position: relative;
}
.tf-checkbox:checked {
  background: ${C.accent}; border-color: ${C.accent};
}
.tf-checkbox:checked::after {
  content: '✓';
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%,-52%);
  font-size: 10px; color: #F3FAF7; font-weight: 800;
}

/* ── Buttons ── */
.btn-primary {
  width: 100%; padding: 14px;
  background: ${C.accent}; color: #F3FAF7;
  border: none; border-radius: 10px;
  font-size: 14px; font-weight: 700;
  font-family: 'Instrument Sans', sans-serif;
  cursor: pointer; letter-spacing: .01em;
  transition: transform .18s, box-shadow .18s, background .18s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  position: relative; overflow: hidden;
}
.btn-primary::after {
  content:''; position:absolute; inset:0;
  background: linear-gradient(135deg,rgba(255,255,255,.16) 0%,transparent 60%);
  opacity:0; transition:opacity .2s;
}
.btn-primary:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 36px ${C.accentGlow}; }
.btn-primary:hover::after { opacity:1; }
.btn-primary:disabled { opacity:.55; cursor:not-allowed; transform:none; }

.btn-verify {
  padding: 11px 18px;
  background: ${C.accentDim}; color: ${C.accent};
  border: 1px solid ${C.accent}40; border-radius: 8px;
  font-size: 12px; font-weight: 700;
  font-family: 'Instrument Sans', sans-serif;
  cursor: pointer; white-space: nowrap;
  transition: background .2s, color .2s, border-color .2s;
  flex-shrink: 0;
}
.btn-verify:hover { background: ${C.accent}; color: #F3FAF7; border-color: ${C.accent}; }

/* ── OTP inputs ── */
.otp-grid {
  display: grid; grid-template-columns: repeat(6,1fr); gap: 8px;
}
.otp-cell {
  aspect-ratio: 1;
  background: ${C.surfaceAlt}; border: 1px solid ${C.border};
  border-radius: 10px;
  font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 500;
  color: ${C.text}; text-align: center;
  outline: none; width: 100%;
  transition: border-color .2s, box-shadow .2s;
  padding: 0;
}
.otp-cell:focus {
  border-color: ${C.accent}60;
  box-shadow: 0 0 0 3px ${C.accentDim};
}
.otp-cell.filled { border-color: ${C.accent}50; color: ${C.accent}; }
.otp-cell.otp-error { border-color: ${C.red}70; animation: shake .35s ease; }

/* ── Step dots ── */
.step-dots { display:flex; align-items:center; gap:6px; justify-content:center; }
.step-dot {
  width:7px; height:7px; border-radius:50%;
  background:${C.border}; transition:background .25s, transform .25s;
}
.step-dot.active { background:${C.accent}; transform:scale(1.3); }
.step-dot.done   { background:${C.accent}40; }

/* ── Error message ── */
.field-error {
  font-size:12px; color:${C.red};
  margin-top:5px; display:flex; align-items:center; gap:4px;
}

/* ── Success screen ── */
.success-icon {
  width:64px; height:64px; border-radius:50%;
  background:${C.accentDim}; border:1px solid ${C.accent}40;
  display:flex; align-items:center; justify-content:center;
  font-size:28px; margin:0 auto 20px;
  animation: successPop .5s cubic-bezier(.22,1,.36,1) both;
}

/* ── Spinner ── */
.spinner {
  width:18px; height:18px; border-radius:50%;
  border:2px solid rgba(255,255,255,.3);
  border-top-color:#F3FAF7;
  animation: spinDot .7s linear infinite;
  flex-shrink:0;
}

/* ── Badge live ── */
.badge-live {
  display:inline-flex; align-items:center; gap:5px;
  background:rgba(14,124,90,.08); border:1px solid rgba(14,124,90,.2);
  border-radius:6px; padding:3px 8px;
  font-family:'Instrument Sans',system-ui,sans-serif; font-size:10px; color:${C.accent};
}
.badge-live::before {
  content:''; width:5px; height:5px; border-radius:50%;
  background:${C.accent}; animation:pulse 1.5s ease-in-out infinite; flex-shrink:0;
}

/* ── Scrollbar ── */
::-webkit-scrollbar { width:5px; }
::-webkit-scrollbar-track { background:${C.bg}; }
::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }

/* ── Language switcher ── */
.lang-switcher { position:relative; display:inline-flex; align-items:center; }
.lang-btn {
  display:inline-flex; align-items:center; gap:6px;
  background:transparent; border:1px solid ${C.border};
  border-radius:8px; padding:6px 10px;
  font-size:12px; font-weight:600; color:${C.textMid};
  cursor:pointer; font-family:'Instrument Sans',system-ui,sans-serif;
  transition:border-color .2s, color .2s, background .2s; white-space:nowrap;
}
.lang-btn:hover { border-color:${C.borderHover}; color:${C.text}; background:rgba(22,40,63,.04); }
.lang-dropdown {
  position:absolute; top:calc(100% + 6px); right:0;
  background:${C.surface}; border:1px solid ${C.border};
  border-radius:12px; padding:6px;
  min-width:180px; z-index:400;
  box-shadow:0 16px 40px rgba(22,40,63,.16);
  animation:fadeUp .2s ease both;
}
.lang-option {
  display:flex; align-items:center; gap:10px;
  padding:9px 12px; border-radius:8px;
  font-size:13px; color:${C.textMid};
  cursor:pointer; font-family:'Instrument Sans',system-ui,sans-serif;
  transition:background .15s, color .15s;
}
.lang-option:hover { background:${C.surfaceAlt}; color:${C.text}; }
.lang-option.active { color:${C.accent}; background:rgba(14,124,90,0.10); }

/* Hide Google's default toolbar */
.goog-te-banner-frame, #goog-gt-tt, .goog-te-balloon-frame { display:none !important; }
body { top:0 !important; }
.skiptranslate { display:none !important; }

/* ── Prevent Google Translate from rewriting text nodes in spots
   where React conditionally swaps DOM (step 1 ↔ step 2, validation
   errors appearing/disappearing, OTP cells). Google Translate wraps
   text nodes in <font> tags and rewrites them live; if it touches a
   node that React is about to remove/replace, React's reconciler can
   throw "Failed to execute 'removeChild' on 'Node'" because the node
   it expects to find isn't there anymore. Scoping notranslate only to
   these dynamic regions (rather than the whole page) keeps Google
   free to translate everything else — nav, footer, side panel, the
   bulk of the form labels — while protecting the conflict points. ── */
.notranslate, .notranslate * { translate: no; }

/* ── Responsive ── */
@media (max-width: 767px) {
  .side-panel-desktop { display: none !important; }
}
@media (max-width: 480px) {
  .auth-panel { padding: 20px 16px !important; }
  .otp-cell { font-size: 16px; }
  .otp-grid { gap: 6px; }
}
@media (max-width: 360px) {
  .otp-cell { font-size: 14px; border-radius: 8px; }
  .otp-grid { gap: 4px; }
}
@media (min-width: 481px) and (max-width: 767px) {
  .auth-panel { padding: 28px 32px !important; }
}
/* Ensure side panel never shrinks too small */
@media (min-width: 768px) and (max-width: 1024px) {
  .side-panel-desktop { max-width: 340px !important; }
}
`;

/* ─────────────────────────────────────────────
   LANGUAGE SWITCHER
   Reads "tf_lang" from localStorage (set by the landing page)
   and auto-applies it — preserving the user's choice across pages.
───────────────────────────────────────────── */
const LANGUAGES = [
  { code:"en",    label:"English",   flag:"🇬🇧" },
  { code:"fr",    label:"Français",  flag:"🇫🇷" },
  { code:"es",    label:"Español",   flag:"🇪🇸" },
  { code:"de",    label:"Deutsch",   flag:"🇩🇪" },
  { code:"pt",    label:"Português", flag:"🇧🇷" },
  { code:"ar",    label:"العربية",   flag:"🇸🇦" },
  { code:"zh-CN", label:"中文",      flag:"🇨🇳" },
  { code:"ja",    label:"日本語",    flag:"🇯🇵" },
  { code:"ru",    label:"Русский",   flag:"🇷🇺" },
  { code:"hi",    label:"हिन्दी",    flag:"🇮🇳" },
  { code:"yo",    label:"Yoruba",    flag:"🇳🇬" },
  { code:"ha",    label:"Hausa",     flag:"🇳🇬" },
];

const initGoogleTranslate = () => {
  if (window._gtInitDone) return;
  window._gtInitDone = true;
  if (!document.getElementById("google_translate_element")) {
    const el = document.createElement("div");
    el.id = "google_translate_element";
    el.style.cssText = "display:none!important;position:absolute;left:-9999px;";
    document.body.appendChild(el);
  }
  window.googleTranslateElementInit = () => {
    new window.google.translate.TranslateElement({ pageLanguage:"en", autoDisplay:false }, "google_translate_element");
    const saved = localStorage.getItem("tf_lang");
    if (saved && saved !== "en") setTimeout(() => applyGoogleTranslate(saved), 800);
  };
  const script = document.createElement("script");
  script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.head.appendChild(script);
};

const applyGoogleTranslate = (langCode) => {
  if (langCode === "en") {
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
    window.location.reload();
    return;
  }
  const pair = "/en/" + langCode;
  document.cookie = "googtrans=" + pair + "; path=/";
  document.cookie = "googtrans=" + pair + "; path=/; domain=" + window.location.hostname;
  const sel = document.querySelector(".goog-te-combo");
  if (sel) { sel.value = langCode; sel.dispatchEvent(new Event("change")); }
  else window.location.reload();
};

const LanguageSwitcher = () => {
  const [open, setOpen]       = useState(false);
  const [current, setCurrent] = useState(() => localStorage.getItem("tf_lang") || "en");
  const ref                   = useRef(null);

  useEffect(() => { initGoogleTranslate(); }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (code) => {
    setCurrent(code);
    localStorage.setItem("tf_lang", code);
    setOpen(false);
    applyGoogleTranslate(code);
  };

  const active = LANGUAGES.find(l => l.code === current) || LANGUAGES[0];

  return (
    <div className="lang-switcher" ref={ref}>
      <button className="lang-btn" onClick={() => setOpen(o => !o)} title="Change language">
        <span style={{fontSize:"14px"}}>{active.flag}</span>
        <span>{active.label}</span>
        <span style={{fontSize:"9px", opacity:.6, marginLeft:"2px"}}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="lang-dropdown">
          <div style={{fontSize:"10px", fontWeight:"600", color:C.textDim, letterSpacing:".08em", textTransform:"uppercase", padding:"4px 12px 8px"}}>
            Select Language
          </div>
          {LANGUAGES.map(l => (
            <div
              key={l.code}
              className={"lang-option" + (l.code === current ? " active" : "")}
              onClick={() => select(l.code)}
            >
              <span style={{fontSize:"16px"}}>{l.flag}</span>
              <span>{l.label}</span>
              {l.code === current && <span style={{marginLeft:"auto", fontSize:"11px"}}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   ICON HELPERS  (inline SVG — no icon font dep)
───────────────────────────────────────────── */
const EyeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

/* ─────────────────────────────────────────────
   FIELD with label + error
───────────────────────────────────────────── */
const Field = ({ label, hint, error, children }) => (
  <div style={{ marginBottom: "20px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "7px" }}>
      <label style={{ fontSize: "13px", fontWeight: "600", color: C.textMid, letterSpacing: ".01em" }}>{label}</label>
      {hint}
    </div>
    {children}
    {error && <div className="field-error">⚠ {error}</div>}
  </div>
);

/* ─────────────────────────────────────────────
   OTP INPUT  (6 cells, auto-advance)
───────────────────────────────────────────── */
const OTPInput = ({ value, onChange, hasError }) => {
  const refs = useRef(Array.from({ length: 6 }, () => React.createRef()));
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);

  const handleKey = (i, e) => {
    if (e.key === "Backspace") {
      const next = value.slice(0, -1);
      onChange(next);
      if (i > 0) refs.current[i - 1].current?.focus();
      return;
    }
    if (/^\d$/.test(e.key)) {
      const next = (value + e.key).slice(0, 6);
      onChange(next);
      if (i < 5) refs.current[i + 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)].current?.focus();
    e.preventDefault();
  };

  return (
    <div className="otp-grid">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs.current[i]}
          className={`otp-cell${d ? " filled" : ""}${hasError ? " otp-error" : ""}`}
          type="text" inputMode="numeric" maxLength={1}
          value={d} readOnly
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={() => refs.current[i].current?.select()}
        />
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────
   STEP 1 — Credentials
───────────────────────────────────────────── */
const StepCredentials = ({ onNext }) => {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow]         = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);

  const validate = () => {
    const e = {};
    if (!email.includes("@"))       e.email    = "Enter a valid email address";
    if (password.length < 6)        e.password = "Password must be at least 6 characters";
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setLoading(false);
      onNext({ email });
    } catch (err) {
      setLoading(false);
      // Map Supabase error messages to friendly ones
      const msg = err.message?.toLowerCase() ?? "";
      if (msg.includes("invalid login")) {
        setErrors({ password: "Incorrect email or password." });
      } else if (msg.includes("email not confirmed")) {
        setErrors({ email: "Please verify your email before signing in." });
      } else {
        setErrors({ password: err.message || "Sign-in failed. Please try again." });
      }
    }
  };

  return (
    <div>
      <Field
        label="Email address"
        error={errors.email}
      >
        <input
          className={`tf-input${errors.email ? " error" : email.includes("@") ? " success" : ""}`}
          type="email" placeholder="alex@email.com"
          value={email} onChange={e => { setEmail(e.target.value); setErrors(p=>({...p,email:""})); }}
          onKeyDown={e => e.key==="Enter" && submit()}
          autoComplete="email"
        />
      </Field>

      <Field
        label="Password"
        hint={<a href="/forgot" style={{ fontSize:"12px", color:C.accent }}>Forgot password?</a>}
        error={errors.password}
      >
        <div className="pw-wrap">
          <input
            className={`tf-input${errors.password ? " error" : ""}`}
            type={show ? "text" : "password"}
            placeholder="Your password"
            value={password} onChange={e => { setPassword(e.target.value); setErrors(p=>({...p,password:""})); }}
            onKeyDown={e => e.key==="Enter" && submit()}
            autoComplete="current-password"
          />
          <button type="button" className="pw-toggle" onClick={() => setShow(s=>!s)} aria-label="Toggle password">
            {show ? <EyeOffIcon/> : <EyeIcon/>}
          </button>
        </div>
      </Field>

      {/* Remember me */}
      <div style={{ display:"flex", alignItems:"center", gap:"9px", marginBottom:"24px" }}>
        <input type="checkbox" className="tf-checkbox" id="remember" checked={remember} onChange={e=>setRemember(e.target.checked)}/>
        <label htmlFor="remember" style={{ fontSize:"13px", color:C.textMid, cursor:"pointer", userSelect:"none" }}>Keep me signed in for 30 days</label>
      </div>

      <button className="btn-primary" onClick={submit} disabled={loading}>
        {loading ? <><div className="spinner"/> Verifying…</> : <>Sign in</>}
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────────
   STEP 2 — Success
───────────────────────────────────────────── */
const StepSuccess = () => {
  useEffect(() => {
    const t = setTimeout(() => { window.location.href = "/dashboard"; }, 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{textAlign:"center", padding:"12px 0 8px"}}>
      <div className="success-icon">✓</div>
      <h3 style={{fontFamily:"'Instrument Serif',Georgia,serif", fontSize:"20px", fontWeight:"400", color:C.text, marginBottom:"8px"}}>
        You're in!
      </h3>
      <p style={{fontSize:"14px", color:C.textMid, lineHeight:"1.65", marginBottom:"24px"}}>
        Identity verified. Redirecting you to your dashboard…
      </p>
      <div style={{display:"flex", justifyContent:"center"}}>
        <div style={{
          width:"36px", height:"36px", borderRadius:"50%",
          border:`2px solid ${C.border}`, borderTopColor:C.accent,
          animation:"spinDot .8s linear infinite",
        }}/>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════
   AUTH SHELL — "Global Desk" (matches the landing page)
   Left: a dark trading desk with live, drawn graphics.
   Right: a calm porcelain form column.
═════════════════════════════════════════════ */
const D = {
  night:"#07101E", night2:"#0C1A2E", porcelain:"#EEF2F7", gold:"#E2AE4A", goldDeep:"#C99331",
  onDark:"rgba(238,242,247,.74)", onDarkDim:"rgba(238,242,247,.5)", darkRule:"rgba(238,242,247,.12)",
  gainLit:"#2FD394", lossLit:"#FF6470", blue:"#5B8CFF",
};

const AUTH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap');

body { font-family: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; background: ${C.bg}; color: ${C.text}; font-size: 16px; }
.grid-bg, .tf-nav { display: none !important; }
.num { font-variant-numeric: tabular-nums; }
:focus-visible { outline: 2px solid ${C.text}; outline-offset: 3px; }
.auth-desk :focus-visible { outline-color: ${D.gold}; }

/* Inputs */
.tf-input, .tf-select {
  height: 50px; padding: 0 16px; font-size: 15.5px; border-radius: 10px;
  background: #fff; border: 1px solid ${C.border}; color: ${C.text};
  font-family: 'Instrument Sans', system-ui, sans-serif;
}
.tf-input:hover, .tf-select:hover { border-color: ${C.borderHover}; }
.tf-input:focus-visible, .tf-select:focus-visible, .otp-cell:focus-visible, .otp-box:focus-visible { outline: none; }
.tf-input:focus, .tf-select:focus { border-color: ${D.goldDeep}; box-shadow: 0 0 0 4px rgba(226,174,74,.18); }
.tf-input.error, .tf-select.error { border-color: ${C.red}; box-shadow: 0 0 0 4px rgba(200,55,63,.10); }
.tf-input.success, .tf-select.success { border-color: ${C.green}80; }
.pw-toggle { color: ${C.textDim}; }
.field-error { font-size: 13px; }
.tf-checkbox { width: 18px; height: 18px; border-radius: 5px; background: #fff; border-color: ${C.borderHover}; }
.tf-checkbox:checked { background: ${C.text}; border-color: ${C.text}; }
.tf-checkbox:checked::after { color: ${D.gold}; }

/* Primary action: bullion gold, as on the landing page */
.btn-primary {
  height: 52px; padding: 0 20px; border-radius: 10px;
  background: ${D.gold}; color: ${D.night}; font-size: 15.5px; font-weight: 600;
  font-family: 'Instrument Sans', system-ui, sans-serif;
  box-shadow: 0 12px 30px -14px rgba(226,174,74,.9);
}
.btn-primary::after { display: none; }
.btn-primary:hover:not(:disabled) { background: #EDBE5F; transform: none; box-shadow: 0 16px 34px -14px rgba(226,174,74,1); }
.btn-primary:active:not(:disabled) { transform: translateY(1px); }
.spinner { border-color: rgba(7,16,30,.25); border-top-color: ${D.night}; }

/* One-time code cells */
.otp-cell, .otp-box {
  background: #fff; border: 1px solid ${C.border}; border-radius: 12px; color: ${C.text};
  font-family: 'Instrument Sans', system-ui, sans-serif; font-weight: 600; font-variant-numeric: tabular-nums;
}
.otp-cell:focus, .otp-box:focus { border-color: ${D.goldDeep}; box-shadow: 0 0 0 4px rgba(226,174,74,.18); }
.otp-cell.filled, .otp-box.filled { border-color: ${C.text}; color: ${C.text}; background: #FBF7EE; }

.success-icon { background: rgba(226,174,74,.16); border-color: rgba(226,174,74,.5); color: ${C.accent}; }
.step-dots, .step-connector { display: none !important; }

/* Language pickers (all variants) */
.lang-btn, .tf-lang-btn {
  height: 40px; padding: 0 12px; border-radius: 10px; font-size: 14px; font-weight: 500;
  background: transparent; border: 1px solid ${C.border}; color: ${C.textMid};
  font-family: 'Instrument Sans', system-ui, sans-serif;
}
.lang-btn:hover, .tf-lang-btn:hover, .tf-lang-btn.open { border-color: ${C.text}; color: ${C.text}; }
.lang-dropdown, .tf-lang-menu { border-radius: 12px; box-shadow: 0 20px 44px -12px rgba(11,22,40,.3); }
.lang-option.active, .tf-lang-opt.active { color: ${C.text}; background: rgba(226,174,74,.16); font-weight: 600; }

/* ── Layout ── */
.auth { display: grid; grid-template-columns: minmax(440px, 46%) minmax(0,1fr); min-height: 100vh; }
.auth-desk {
  position: sticky; top: 0; height: 100vh; overflow: hidden;
  display: flex; flex-direction: column; gap: 28px;
  padding: 32px clamp(28px,4vw,60px) 28px;
  background: radial-gradient(110% 80% at 80% 70%, #14294B 0%, ${D.night} 62%); color: ${C.bg};
}
.desk-logo img { height: 34px; width: auto; filter: brightness(0) invert(1); }
.desk-h {
  font-family: 'Instrument Serif', Georgia, serif; font-weight: 400;
  font-size: clamp(42px,4.2vw,64px); line-height: .98; letter-spacing: -.01em; max-width: 9em;
  animation: aRise .8s cubic-bezier(.22,1,.36,1) both;
}
.desk-p { font-size: 17px; color: ${D.onDark}; max-width: 26em; margin-top: 16px; animation: aRise .8s cubic-bezier(.22,1,.36,1) .08s both; }
.desk-art { position: relative; flex: 1; min-height: 280px; animation: aFade 1s ease .2s both; }
.desk-foot { display: flex; flex-wrap: wrap; gap: 8px 22px; font-size: 13.5px; color: ${D.onDarkDim}; }
.desk-foot span { display: inline-flex; align-items: center; gap: 8px; }
.desk-foot i { width: 6px; height: 6px; border-radius: 50%; background: ${D.gold}; }

.glass {
  position: absolute; color: ${C.bg};
  background: linear-gradient(160deg, rgba(27,45,74,.94), rgba(12,26,46,.96));
  border: 1px solid rgba(238,242,247,.12); border-radius: 16px;
  box-shadow: 0 1px 0 rgba(255,255,255,.08) inset, 0 40px 80px -30px rgba(0,0,0,.8);
}
.g-lbl { font-size: 12.5px; color: ${D.onDarkDim}; }
.g-val { font-size: 15px; font-weight: 600; }
.float-a { animation: aFloat 7s ease-in-out infinite; }
.float-b { animation: aFloat 8s ease-in-out -3s infinite; }
.float-c { animation: aFloat 9s ease-in-out -5s infinite; }

.desk-steps { display: flex; flex-direction: column; gap: 4px; margin-top: 28px; }
.desk-step { display: flex; align-items: center; gap: 14px; padding: 10px 0; font-size: 16px; color: ${D.onDarkDim}; transition: color .3s; }
.desk-step b {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; border: 1.5px solid rgba(238,242,247,.24); transition: all .3s;
}
.desk-step.now { color: #fff; }
.desk-step.now b { background: ${D.gold}; border-color: ${D.gold}; color: ${D.night}; box-shadow: 0 0 0 6px rgba(226,174,74,.16); }
.desk-step.done b { border-color: ${D.gold}; color: ${D.gold}; }

.auth-pane { display: flex; flex-direction: column; min-height: 100vh; min-width: 0; }
.pane-top { display: flex; align-items: center; justify-content: flex-end; gap: 14px; padding: 20px clamp(20px,4vw,48px); }
.pane-logo { display: none; margin-right: auto; }
.pane-logo img { height: 30px; width: auto; }
.pane-cta-label { font-size: 14.5px; color: ${C.textMid}; white-space: nowrap; }
.pane-cta {
  display: inline-flex; align-items: center; height: 40px; padding: 0 16px; border-radius: 10px; white-space: nowrap;
  font-size: 14.5px; font-weight: 600; background: ${C.text}; color: ${C.bg}; transition: background .15s;
}
.pane-cta:hover { background: #13233B; }
.pane-body { flex: 1; display: flex; justify-content: center; padding: clamp(16px,6vh,72px) clamp(20px,4vw,48px) 48px; }
.pane-col { width: 100%; max-width: 440px; }
.auth-title { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: clamp(38px,3.6vw,50px); line-height: 1; letter-spacing: -.01em; }
.auth-sub { font-size: 16.5px; color: ${C.textMid}; margin-top: 10px; }
.auth-prog { margin: 24px 0 0; }
.auth-prog-bars { display: grid; gap: 6px; }
.auth-prog-bars span { height: 4px; border-radius: 2px; background: ${C.border}; overflow: hidden; position: relative; }
.auth-prog-bars span::after { content: ''; position: absolute; inset: 0; background: ${C.text}; transform: scaleX(0); transform-origin: left; transition: transform .5s cubic-bezier(.22,1,.36,1); }
.auth-prog-bars span.on::after { transform: scaleX(1); }
.auth-prog-bars span.now::after { background: ${D.gold}; transform: scaleX(1); }
.auth-prog-lbl { font-size: 14px; color: ${C.textMid}; margin-top: 10px; }
.auth-prog-lbl strong { color: ${C.text}; font-weight: 600; }
.auth-card {
  margin-top: 28px; background: #fff; border: 1px solid ${C.border}; border-radius: 18px;
  padding: clamp(22px,3vw,32px); box-shadow: 0 40px 70px -50px rgba(11,22,40,.55);
  animation: aRise .7s cubic-bezier(.22,1,.36,1) .05s both;
}
.auth-alt { margin-top: 24px; font-size: 15px; color: ${C.textMid}; text-align: center; }
.auth-alt a { color: ${C.text}; font-weight: 600; border-bottom: 2px solid ${D.gold}; padding-bottom: 1px; }
.auth-legal { margin-top: 18px; font-size: 13px; color: ${C.textDim}; text-align: center; line-height: 1.6; }
.auth-legal a { text-decoration: underline; }

@keyframes aRise  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes aFade  { from { opacity: 0; } to { opacity: 1; } }
@keyframes aFloat { 0%,100% { translate: 0 0; } 50% { translate: 0 -9px; } }
@keyframes aSpin  { to { transform: rotate(360deg); } }
@keyframes aArc   { from { stroke-dashoffset: 400; } to { stroke-dashoffset: 0; } }

@media (max-width: 1100px) {
  .auth { grid-template-columns: minmax(380px, 42%) minmax(0,1fr); }
  .desk-art .hide-md { display: none; }
}
@media (max-width: 900px) {
  .auth { grid-template-columns: 1fr; }
  .auth-desk { position: relative; height: auto; padding: 22px 20px 28px; gap: 0; }
  .desk-logo, .desk-art, .desk-foot, .desk-steps { display: none; }
  .desk-h { font-size: 34px; max-width: none; }
  .desk-p { font-size: 15.5px; margin-top: 8px; }
  .auth-pane { min-height: 0; }
  .pane-top { position: absolute; top: 0; left: 0; right: 0; padding: 14px 20px; }
  .auth-desk { padding-top: 78px; }
  .pane-logo { display: inline-flex; }
  .pane-logo img { filter: brightness(0) invert(1); }
  .pane-top .lang-btn, .pane-top .tf-lang-btn { color: ${D.onDark}; border-color: rgba(238,242,247,.24); }
  .pane-cta-label { display: none; }
  .pane-cta { background: ${D.gold}; color: ${D.night}; }
  .pane-body { padding: 28px 20px 48px; }
  .auth-title { font-size: 36px; }
}
@media (max-width: 420px) {
  .pane-top .lang-btn span:nth-child(2), .pane-top .tf-lang-btn span:nth-child(3) { display: none; }
}
@media (min-width: 901px) and (max-height: 820px) {
  .auth-desk.has-steps .desk-art { display: none; }
  .auth-desk.has-steps { justify-content: space-between; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .001ms !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
}

/* Text wordmark logo */
.brand { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; line-height: 1; letter-spacing: -.01em; white-space: nowrap; display: inline-block; }
.brand b { font-weight: 400; color: #E2AE4A; }
.desk-logo .brand { font-size: 30px; color: #EEF2F7; }
.pane-logo .brand { font-size: 26px; color: #0B1628; }
@media (max-width: 900px) { .pane-logo .brand { color: #EEF2F7; } }
`;

const authRng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

/* Wireframe globe with exchange pins and gold trade routes */
const AuthGlobe = ({ size = 460, style }) => {
  const R = 190, cx = 230, cy = 230;
  const pins = [{ x:128, y:196 }, { x:222, y:164 }, { x:236, y:252 }, { x:290, y:210 }, { x:352, y:196 }, { x:336, y:300 }];
  const arcs = [[0,1],[1,3],[3,4],[1,2],[4,5]];
  return (
    <svg width={size} height={size} viewBox="0 0 460 460" style={style} aria-hidden="true">
      <defs>
        <radialGradient id="authGlobe" cx=".38" cy=".32"><stop offset="0" stopColor="#1B3560" stopOpacity=".9" /><stop offset="1" stopColor={D.night} stopOpacity=".15" /></radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="url(#authGlobe)" stroke="rgba(91,140,255,.5)" />
      {[-60,-35,-12,12,35,60].map(l => { const a = l * Math.PI / 180; return <ellipse key={l} cx={cx} cy={cy - R * Math.sin(a)} rx={R * Math.cos(a)} ry={R * Math.cos(a) * .16} fill="none" stroke="rgba(91,140,255,.24)" />; })}
      {[20,45,70].map(l => <ellipse key={l} cx={cx} cy={cy} rx={R * Math.sin(l * Math.PI / 180)} ry={R} fill="none" stroke="rgba(91,140,255,.24)" />)}
      <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke="rgba(91,140,255,.24)" />
      {arcs.map(([a, b], i) => { const p = pins[a], q = pins[b]; return <path key={i} d={`M${p.x},${p.y} Q${(p.x + q.x) / 2},${Math.min(p.y, q.y) - 50} ${q.x},${q.y}`} fill="none" stroke={D.gold} strokeWidth="1.4" strokeDasharray="400" opacity=".75" style={{ animation:`aArc 2.4s cubic-bezier(.22,1,.36,1) ${.4 + i * .25}s both` }} />; })}
      {pins.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill={D.gold}>
            <animate attributeName="r" values="3;14" dur="2.6s" begin={`${i * .45}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values=".8;0" dur="2.6s" begin={`${i * .45}s`} repeatCount="indefinite" />
          </circle>
          <circle cx={p.x} cy={p.y} r="3.4" fill={D.gold} />
        </g>
      ))}
    </svg>
  );
};

/* Live candlestick chart */
const AuthCandles = ({ w = 340, h = 120, seed = 42 }) => {
  const [cs, setCs] = useState(() => {
    const r = authRng(seed); let p = 118; const out = [];
    for (let i = 0; i < 28; i++) { const o = p, c = o + (r() - .42) * 2.4; out.push({ o, c, h: Math.max(o, c) + r() * 1.2, l: Math.min(o, c) - r() * 1.2 }); p = c; }
    return out;
  });
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let t = 0;
    const id = setInterval(() => {
      if (document.hidden) return;
      t++;
      setCs(prev => {
        const next = prev.slice(); const last = { ...next[next.length - 1] };
        last.c += (Math.random() - .45) * .9; last.h = Math.max(last.h, last.c); last.l = Math.min(last.l, last.c);
        next[next.length - 1] = last;
        if (t % 6 === 0) { next.shift(); next.push({ o:last.c, c:last.c, h:last.c, l:last.c }); }
        return next;
      });
    }, 900);
    return () => clearInterval(id);
  }, []);
  const lo = Math.min(...cs.map(c => c.l)), hi = Math.max(...cs.map(c => c.h));
  const y = v => 6 + (1 - (v - lo) / (hi - lo)) * (h - 12);
  const cw = w / cs.length, last = cs[cs.length - 1].c;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {[0,1,2].map(i => <line key={i} x1="0" x2={w} y1={10 + i * (h - 20) / 2} y2={10 + i * (h - 20) / 2} stroke="rgba(238,242,247,.07)" />)}
      {cs.map((c, i) => { const up = c.c >= c.o, col = up ? D.gainLit : D.lossLit, x = i * cw + cw / 2; return (
        <g key={i}>
          <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={col} strokeWidth="1.2" />
          <rect x={x - cw * .3} width={cw * .6} y={y(Math.max(c.o, c.c))} height={Math.max(1.5, Math.abs(y(c.o) - y(c.c)))} fill={col} rx="1" />
        </g>
      ); })}
      <line x1="0" x2={w} y1={y(last)} y2={y(last)} stroke={D.gold} strokeDasharray="3 4" />
    </svg>
  );
};

/* Dusk render of a property */
const AuthPropertyArt = () => (
  <svg width="100%" height="100%" viewBox="0 0 112 76" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="authDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#14264A" /><stop offset=".62" stopColor="#3B4C7A" /><stop offset="1" stopColor="#E7A95A" /></linearGradient></defs>
    <rect width="112" height="76" fill="url(#authDusk)" />
    <circle cx="84" cy="58" r="9" fill="#F4C77A" opacity=".8" />
    <path d="M0,62 h8 v-12 h6 v-8 h7 v20 h10 v-16 h6 v16 h12 v-10 h8 v10 h10 v-22 h7 v22 h12 v-14 h9 v14 h17 V76 H0 Z" fill="#1A2B4A" />
    <path d="M44,76 V14 L60,6 V76 Z" fill="#23385F" /><path d="M60,6 L70,12 V76 H60 Z" fill="#172846" />
    {Array.from({ length:12 }).map((_, r) => [0,1].map(c => <rect key={`${r}${c}`} x={47 + c * 6} y={18 + r * 4.5} width="4.4" height="2.6" fill={(r * 3 + c) % 4 ? D.gold : "#2A4166"} />))}
  </svg>
);

/* Vault dial for password recovery */
const AuthVault = () => (
  <svg width="300" height="300" viewBox="0 0 300 300" aria-hidden="true" style={{ position:"absolute", left:"50%", top:"50%", marginLeft:-150, marginTop:-150 }}>
    <circle cx="150" cy="150" r="140" fill="rgba(27,45,74,.6)" stroke="rgba(238,242,247,.12)" />
    <g style={{ transformOrigin:"150px 150px", animation:"aSpin 40s linear infinite" }}>
      {Array.from({ length:60 }).map((_, i) => (
        <line key={i} x1="150" y1="18" x2="150" y2={i % 5 ? 26 : 34} stroke={i % 5 ? "rgba(238,242,247,.25)" : D.gold} strokeWidth={i % 5 ? 1 : 2} transform={`rotate(${i * 6} 150 150)`} />
      ))}
    </g>
    <circle cx="150" cy="150" r="98" fill={D.night2} stroke="rgba(238,242,247,.14)" />
    <g style={{ transformOrigin:"150px 150px", animation:"aSpin 14s linear infinite reverse" }}>
      {[0,60,120,180,240,300].map(a => <rect key={a} x="146" y="58" width="8" height="22" rx="4" fill="rgba(238,242,247,.18)" transform={`rotate(${a} 150 150)`} />)}
    </g>
    <circle cx="150" cy="150" r="46" fill={D.gold} />
    <rect x="134" y="146" width="32" height="26" rx="5" fill={D.night} />
    <path d="M140 146v-8a10 10 0 0120 0v8" fill="none" stroke={D.night} strokeWidth="5" />
    <circle cx="150" cy="158" r="3.5" fill={D.gold} />
  </svg>
);

/* Live market sessions from the visitor's clock */
const AUTH_MARKETS = [
  { name:"New York", tz:"America/New_York", open:9.5, close:16 },
  { name:"London",   tz:"Europe/London",    open:8,   close:16.5 },
  { name:"Lagos",    tz:"Africa/Lagos",     open:10,  close:14.5 },
  { name:"Tokyo",    tz:"Asia/Tokyo",       open:9,   close:15.5 },
];
const authMarketOpen = (m) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone:m.tz, hour:"2-digit", minute:"2-digit", weekday:"short", hourCycle:"h23" }).formatToParts(new Date());
  const g = t => parts.find(p => p.type === t)?.value;
  const h = +g("hour") + +g("minute") / 60, wd = g("weekday");
  return wd !== "Sat" && wd !== "Sun" && h >= m.open && h < m.close;
};

const AuthDeskArt = ({ mode }) => {
  const [value, setValue] = useState(48291.4);
  useEffect(() => {
    if (mode !== "login") return;
    const id = setInterval(() => { if (!document.hidden) setValue(v => +(v + (Math.random() - .42) * 22).toFixed(2)); }, 1400);
    return () => clearInterval(id);
  }, [mode]);

  if (mode === "forgot") return (
    <div className="desk-art">
      <AuthVault />
      <div className="glass float-b" style={{ left:0, bottom:"6%", padding:"12px 16px", maxWidth:"260px" }}>
        <div className="g-val">Your funds stay locked</div>
        <div className="g-lbl">Resetting a password never moves money or changes your positions.</div>
      </div>
    </div>
  );

  if (mode === "signup") return (
    <div className="desk-art">
      <AuthGlobe size={420} style={{ position:"absolute", right:"-80px", top:"-10px", opacity:.8 }} />
      <div className="glass float-a" style={{ left:0, top:"4%", width:"min(300px,62%)", padding:"14px 16px 10px" }}>
        <div style={{ display:"flex", justifyContent:"space-between" }}><span className="g-val">Stock trading</span><span className="g-lbl num">NVDA</span></div>
        <AuthCandles w={300} h={78} seed={9} />
      </div>
      <div className="glass float-b" style={{ right:0, top:"20%", width:"236px", padding:"12px 14px", display:"flex", gap:"12px", alignItems:"center" }}>
        <span style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(145deg,#1C3A6E,#07101E)", color:D.gold, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13 }}>MW</span>
        <div><div className="g-val">Copy trading</div><div className="g-lbl num">Mirrors Marcus in 38 ms</div></div>
      </div>
      <div className="glass float-c hide-md" style={{ left:"8%", bottom:"4%", width:"210px", overflow:"hidden" }}>
        <div style={{ height:"78px" }}><AuthPropertyArt /></div>
        <div style={{ padding:"10px 14px" }}><div className="g-val">Real estate</div><div className="g-lbl">Shares from $100</div></div>
      </div>
      <div className="glass float-a" style={{ right:"4%", bottom:"12%", width:"220px", padding:"12px 14px" }}>
        <div className="g-val">Hire a trader</div>
        <div style={{ display:"flex", height:"8px", borderRadius:"4px", overflow:"hidden", margin:"8px 0 6px" }}><span style={{ width:"80%", background:D.gainLit }} /><span style={{ width:"20%", background:D.gold }} /></div>
        <div className="g-lbl">You keep 80% of profit. No profit, no fee.</div>
      </div>
    </div>
  );

  return (
    <div className="desk-art">
      <AuthGlobe size={440} style={{ position:"absolute", right:"-60px", top:"-20px", opacity:.85 }} />
      <div className="glass float-a" style={{ left:0, top:"8%", width:"min(360px,78%)", padding:"16px 16px 10px" }}>
        <div className="g-lbl">Portfolio value</div>
        <div className="num" style={{ fontSize:"26px", fontWeight:700, lineHeight:1.25 }}>${value.toLocaleString("en-US", { minimumFractionDigits:2 })}</div>
        <div className="num" style={{ fontSize:"13.5px", fontWeight:600, color:D.gainLit, marginBottom:"8px" }}>+2.4% today</div>
        <AuthCandles w={340} h={96} />
      </div>
      <div className="glass float-b" style={{ right:0, top:"52%", width:"250px", padding:"12px 14px", display:"flex", gap:"12px", alignItems:"center" }}>
        <span style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(145deg,#1C3A6E,#07101E)", color:D.gold, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13, flexShrink:0 }}>MW</span>
        <div><div className="g-val">Marcus Webb bought BTC</div><div className="g-lbl num">Copied while you were away</div></div>
      </div>
      <div className="glass float-c hide-md" style={{ left:"4%", bottom:"2%", padding:"10px 14px", display:"flex", gap:"16px", whiteSpace:"nowrap" }}>
        {AUTH_MARKETS.map(m => { const open = authMarketOpen(m); return (
          <span key={m.name} style={{ display:"inline-flex", alignItems:"center", gap:"7px", fontSize:"13px", fontWeight:600 }}>
            <i style={{ width:7, height:7, borderRadius:"50%", background: open ? D.gainLit : "rgba(238,242,247,.3)" }} />{m.name} {open ? "open" : "closed"}
          </span>
        ); })}
      </div>
    </div>
  );
};

const AUTH_COPY = {
  login:  { h:"Welcome back to your desk.", p:"Your positions, copied trades and property income are right where you left them." },
  signup: { h:"Open your account. Invest every way.", p:"Stocks, copy trading, hired traders and property shares, all from one balance." },
  forgot: { h:"Locked out? Let's get you back in.", p:"Three quick steps to a new password. Your money and positions stay untouched throughout." },
};

/* Text wordmark logo */
const Logo = () => (
  <span className="brand">Profit<b>Gain</b>Signal</span>
);

const AuthShell = ({ mode, steps, step, navRight, title, sub, progress, children, footer, legal, noTranslate }) => (
  <div className="auth">
    <aside className={"auth-desk" + (steps ? " has-steps" : "")}>
      <a href="/" className="desk-logo" aria-label="ProfitGainSignal home"><Logo /></a>
      <div>
        <h2 className="desk-h">{AUTH_COPY[mode].h}</h2>
        <p className="desk-p">{AUTH_COPY[mode].p}</p>
        {steps && (
          <ol className="desk-steps" aria-hidden="true">
            {steps.map((s, i) => (
              <li key={s} className={"desk-step" + (i + 1 === step ? " now" : i + 1 < step ? " done" : "")}>
                <b>{i + 1 < step ? "✓" : i + 1}</b>{s}
              </li>
            ))}
          </ol>
        )}
      </div>
      <AuthDeskArt mode={mode} />
      <div className="desk-foot">
        {["Segregated client funds","256-bit encryption","Two-factor sign-in"].map(t => <span key={t}><i />{t}</span>)}
      </div>
    </aside>

    <main className="auth-pane">
      <div className="pane-top">
        <a href="/" className="pane-logo" aria-label="ProfitGainSignal home"><Logo /></a>
        {navRight}
      </div>
      <div className="pane-body">
        <div className="pane-col">
          <h1 className="auth-title">{title}</h1>
          {sub && <p className="auth-sub">{sub}</p>}
          {progress && (
            <div className="auth-prog" aria-label={`Step ${progress.current} of ${progress.total}`}>
              <div className="auth-prog-bars" style={{ gridTemplateColumns:`repeat(${progress.total},1fr)` }}>
                {Array.from({ length:progress.total }).map((_, i) => <span key={i} className={i + 1 < progress.current ? "on" : i + 1 === progress.current ? "now" : ""} />)}
              </div>
              <div className="auth-prog-lbl">Step {progress.current} of {progress.total}: <strong>{progress.label}</strong></div>
            </div>
          )}
          <div className={"auth-card" + (noTranslate ? " notranslate" : "")} translate={noTranslate ? "no" : undefined}>
            {children}
          </div>
          {footer && <div className="auth-alt">{footer}</div>}
          {legal && <p className="auth-legal">{legal}</p>}
        </div>
      </div>
    </main>
  </div>
);


/* ─────────────────────────────────────────────
   MAIN LOGIN PAGE
───────────────────────────────────────────── */
const Login = () => {
  const [step, setStep]     = useState(1); // 1 | 2 | 3
  const [data, setData]     = useState({});

  const totalSteps = 1;

  // Inject Chatway live-chat widget
  useEffect(() => {
    if (document.getElementById("chatway-widget-script")) return;
    const script = document.createElement("script");
    script.id = "chatway-widget-script";
    script.src = "https://cdn.chatway.app/widget.js?id=rES12jPIPPNO";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const goSuccess = (info) => { setData(info); setStep(2); };

  const stepLabel = { 1:"Sign in", 2:"Signed in" };

  return (
    <>
      <style>{CSS}</style>
      <style>{AUTH_CSS}</style>
      <AuthShell
        mode="login"
        navRight={<><LanguageSwitcher /><span className="pane-cta-label">New to ProfitGainSignal?</span><a href="/signup" className="pane-cta">Open account</a></>}
        title={step === 1 ? "Welcome back" : "You're in"}
        sub={step === 1 ? "Sign in to your ProfitGainSignal account." : ""}
        noTranslate
        footer={step === 1 && <>Don't have an account? <a href="/signup">Open one free</a></>}
        legal={<>By signing in you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</>}
      >
        {step === 1 && <StepCredentials onNext={goSuccess} />}
        {step === 2 && <StepSuccess />}
      </AuthShell>
    </>
  );
};

export default Login;