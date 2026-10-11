import React from 'react';

/* ─────────────────────────────────────────────
   DESIGN TOKENS  (match ProfitGainSignal login/signup)
───────────────────────────────────────────── */
const C = {
  bg:         "#EEF2F7",
  surface:    "#FFFFFF",
  surfaceAlt: "#F4F7FB",
  border:     "#D5DDE8",
  borderHover:"#B7C3D3",
  accent:     "#A8741F",
  accentDim:  "rgba(226,174,74,0.16)",
  accentGlow: "rgba(226,174,74,0.38)",
  text:       "#0B1628",
  textMid:    "#4A5970",
  textDim:    "#8090A6",
  red:        "#C8373F",
  green:      "#0F8F5F",
  blue:       "#3D6FE0",
  purple:     "#7A5AD6",
  amber:      "#B7791F",
};

/* ─────────────────────────────────────────────
   GLOBAL CSS
───────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wdth,wght@75..100,400..700&family=DM+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html {
  scroll-behavior: smooth;
  height: 100%;
}
body {
  background: ${C.bg};
  color: ${C.text};
  font-family: 'Instrument Sans',system-ui,sans-serif;
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
@keyframes slideIn {
  from { opacity: 0; transform: translateX(-16px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* ── Grid BG ── */
.grid-bg {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    linear-gradient(${C.border} 1px, transparent 1px),
    linear-gradient(90deg, ${C.border} 1px, transparent 1px);
  background-size: 56px 56px;
  animation: gridFade 1.2s ease-out both;
  mask-image: radial-gradient(ellipse 70% 70% at 50% 20%, black 0%, transparent 100%);
}

/* ── Nav ── */
.tf-nav {
  height: 60px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 clamp(16px, 4vw, 40px);
  background: rgba(5,8,15,.9); backdrop-filter: blur(14px);
  border-bottom: 1px solid ${C.border};
  position: sticky; top: 0; z-index: 100;
}
.tf-nav-links {
  display: flex; align-items: center; gap: 4px;
}
.tf-nav-link {
  font-size: 13px; font-weight: 500; color: ${C.textMid};
  padding: 6px 12px; border-radius: 7px;
  transition: color .15s, background .15s;
}
.tf-nav-link:hover { color: ${C.text}; background: rgba(255,255,255,.04); }
.tf-nav-link.active { color: ${C.text}; font-weight: 600; }

/* ── Buttons ── */
.btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 11px 22px;
  background: ${C.accent}; color: #040A14;
  border: none; border-radius: 10px;
  font-size: 13px; font-weight: 700;
  font-family: 'Instrument Sans',system-ui,sans-serif;
  cursor: pointer; letter-spacing: .01em;
  transition: transform .18s, box-shadow .18s;
  position: relative; overflow: hidden;
  text-decoration: none;
}
.btn-primary::after {
  content:''; position:absolute; inset:0;
  background: linear-gradient(135deg,rgba(255,255,255,.16) 0%,transparent 60%);
  opacity:0; transition:opacity .2s;
}
.btn-primary:hover { transform:translateY(-2px); box-shadow:0 10px 36px ${C.accentGlow}; }
.btn-primary:hover::after { opacity:1; }

.btn-ghost {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 8px 16px;
  background: transparent; color: ${C.textMid};
  border: 1px solid ${C.border}; border-radius: 8px;
  font-size: 12px; font-weight: 600;
  font-family: 'Instrument Sans',system-ui,sans-serif;
  cursor: pointer; letter-spacing: .01em;
  transition: border-color .2s, color .2s;
  text-decoration: none;
}
.btn-ghost:hover { border-color: ${C.borderHover}; color: ${C.text}; }

/* ── Badge ── */
.badge-live {
  display:inline-flex; align-items:center; gap:5px;
  background:rgba(0,229,160,.08); border:1px solid rgba(0,229,160,.2);
  border-radius:6px; padding:3px 10px;
  font-family:'DM Mono',monospace; font-size:10px; color:${C.accent};
  letter-spacing:.04em; text-transform:uppercase;
}
.badge-live::before {
  content:''; width:5px; height:5px; border-radius:50%;
  background:${C.accent}; animation:pulse 1.5s ease-in-out infinite; flex-shrink:0;
}

/* ── Section label ── */
.section-eyebrow {
  font-family:'DM Mono',monospace; font-size:10px; font-weight:500;
  color:${C.accent}; letter-spacing:.1em; text-transform:uppercase;
  margin-bottom:14px;
}

/* ── Cards ── */
.feat-card {
  background: ${C.surface};
  border: 1px solid ${C.border};
  border-radius: 14px;
  padding: 24px;
  transition: border-color .2s, transform .2s, box-shadow .2s;
}
.feat-card:hover {
  border-color: ${C.borderHover};
  transform: translateY(-3px);
  box-shadow: 0 30px 50px -34px rgba(11,22,40,.4);
}

.team-card {
  background: ${C.surface};
  border: 1px solid ${C.border};
  border-radius: 14px;
  padding: 24px 20px;
  text-align: center;
  transition: border-color .2s, transform .2s;
}
.team-card:hover { border-color: ${C.borderHover}; transform: translateY(-3px); }

/* ── Value card ── */
.value-card {
  background: ${C.surface};
  border: 1px solid ${C.border};
  border-radius: 14px;
  padding: 28px 24px;
  transition: border-color .2s, transform .2s, box-shadow .2s;
}
.value-card:hover {
  border-color: ${C.borderHover};
  transform: translateY(-3px);
  box-shadow: 0 30px 50px -34px rgba(11,22,40,.4);
}

/* ── Timeline ── */
.timeline-item {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 20px;
  align-items: flex-start;
}
@media(max-width:500px) {
  .timeline-item { grid-template-columns: 56px 1fr; gap: 12px; }
}

/* ── Press card ── */
.press-card {
  background: ${C.surface};
  border: 1px solid ${C.border};
  border-radius: 14px;
  padding: 24px;
  transition: border-color .2s, transform .2s;
}
.press-card:hover { border-color: ${C.borderHover}; transform: translateY(-2px); }

/* ── Role card ── */
.role-card {
  background: ${C.surface};
  border: 1px solid ${C.border};
  border-radius: 14px;
  padding: 22px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  transition: border-color .2s, background .2s;
  text-decoration: none;
  flex-wrap: wrap;
}
.role-card:hover { border-color: ${C.accent}40; background: ${C.surfaceAlt}; }

/* ── Partner logo placeholder ── */
.partner-logo {
  background: ${C.surface};
  border: 1px solid ${C.border};
  border-radius: 10px;
  padding: 16px 24px;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Instrument Sans',system-ui,sans-serif;
  font-size: 13px; font-weight: 700;
  color: ${C.textDim};
  letter-spacing: .03em;
  transition: border-color .2s, color .2s;
  text-align: center;
}
.partner-logo:hover { border-color: ${C.borderHover}; color: ${C.textMid}; }

/* ── Scrollbar ── */
::-webkit-scrollbar { width:5px; }
::-webkit-scrollbar-track { background:${C.bg}; }
::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }

/* ── Responsive ── */
@media(max-width:600px) {
  .tf-nav-links { display:none; }
  .tf-nav-cta-text { display:none; }
}
@media(max-width:420px) {
  .role-card { flex-direction: column; align-items: flex-start; }
}

/* ═════════ "Global Desk" theme — matches the landing page ═════════ */
body, .btn-primary, .btn-ghost, .toc-link { font-family: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
body {
  background-color: #EEF2F7;
  background-image:
    radial-gradient(60% 40% at 100% 30%, rgba(226,174,74,.13) 0%, transparent 70%),
    radial-gradient(55% 45% at 0% 65%, rgba(91,140,255,.10) 0%, transparent 70%),
    radial-gradient(70% 40% at 60% 100%, rgba(226,174,74,.10) 0%, transparent 70%);
  background-attachment: fixed;
}
.grid-bg {
  background-image: radial-gradient(rgba(11,22,40,.13) 1px, transparent 1.4px);
  background-size: 26px 26px;
  mask-image: linear-gradient(180deg, transparent 0, black 30%, black 70%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, transparent 0, black 30%, black 70%, transparent 100%);
  animation: none; opacity: .55;
}

/* Nav: midnight glass */
.tf-nav { background: rgba(7,16,30,.9) !important; border-bottom: 1px solid rgba(238,242,247,.12) !important; -webkit-backdrop-filter: blur(14px); }
.tf-nav > a:first-child { font-family: 'Instrument Serif', Georgia, serif !important; font-weight: 400 !important; font-size: 26px !important; letter-spacing: -.01em !important; color: #EEF2F7 !important; }
.tf-nav-link { color: rgba(238,242,247,.7); font-size: 14.5px; }
.tf-nav-link:hover, .tf-nav-link.active { color: #fff; background: rgba(238,242,247,.07); }
.tf-nav .btn-ghost { color: #EEF2F7; border-color: rgba(238,242,247,.28); }
.tf-nav .btn-ghost:hover { border-color: #EEF2F7; background: rgba(238,242,247,.06); }

/* Buttons */
.btn-primary { background: #E2AE4A !important; color: #07101E !important; font-weight: 600 !important; border-radius: 10px !important; box-shadow: 0 10px 28px -12px rgba(226,174,74,.85); }
.btn-primary::after { display: none; }
.btn-primary:hover { background: #EDBE5F !important; transform: translateY(-1px); box-shadow: 0 16px 34px -14px rgba(226,174,74,1); }
.btn-ghost { border-radius: 10px; color: #0B1628; border-color: #B7C3D3; }
.btn-ghost:hover { border-color: #0B1628; color: #0B1628; }

/* Hero: a dark trading-desk band with a wireframe globe */
.hero-band {
  overflow: hidden; isolation: isolate;
  background:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600' fill='none' stroke='%235B8CFF' stroke-opacity='.28'><circle cx='300' cy='300' r='280'/><ellipse cx='300' cy='300' rx='280' ry='46'/><ellipse cx='300' cy='190' rx='258' ry='40'/><ellipse cx='300' cy='410' rx='258' ry='40'/><ellipse cx='300' cy='95' rx='190' ry='30'/><ellipse cx='300' cy='505' rx='190' ry='30'/><ellipse cx='300' cy='300' rx='96' ry='280'/><ellipse cx='300' cy='300' rx='190' ry='280'/><line x1='300' y1='20' x2='300' y2='580'/><path d='M150 250 Q240 150 330 220 T470 230' stroke='%23E2AE4A' stroke-opacity='.75' stroke-width='1.6'/><path d='M200 360 Q300 270 420 350' stroke='%23E2AE4A' stroke-opacity='.55' stroke-width='1.4'/><circle cx='150' cy='250' r='4' fill='%23E2AE4A' stroke='none'/><circle cx='330' cy='220' r='4' fill='%23E2AE4A' stroke='none'/><circle cx='470' cy='230' r='4' fill='%23E2AE4A' stroke='none'/><circle cx='200' cy='360' r='4' fill='%23E2AE4A' stroke='none'/><circle cx='420' cy='350' r='4' fill='%23E2AE4A' stroke='none'/></svg>") no-repeat right -140px center / 620px 620px,
    radial-gradient(90% 120% at 80% 20%, #16305A 0%, #07101E 62%);
  border-bottom: 1px solid rgba(226,174,74,.35);
}
.hero-band::before {
  content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background-image: linear-gradient(rgba(238,242,247,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(238,242,247,.05) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(70% 90% at 50% 40%, black, transparent);
  -webkit-mask-image: radial-gradient(70% 90% at 50% 40%, black, transparent);
}
.hero-band::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 90px; z-index: -1; pointer-events: none;
  background: linear-gradient(180deg, transparent, rgba(226,174,74,.08));
}
.hero-band * { color: rgba(238,242,247,.72) !important; }
.hero-band h1 { color: #fff !important; font-family: 'Instrument Serif', Georgia, serif !important; font-weight: 400 !important; letter-spacing: -.015em !important; line-height: 1 !important; }
.hero-band h1 span, .hero-band .badge-live { color: #E2AE4A !important; }
.hero-band .btn-primary { color: #07101E !important; }
@media (max-width: 760px) { .hero-band { background-position: center top -220px, 0 0; background-size: 520px 520px, auto; } }

/* Badges and eyebrows */
.badge-live { background: rgba(226,174,74,.14) !important; border-color: rgba(226,174,74,.4) !important; color: #8A5E0F !important; font-family: 'Instrument Sans', system-ui, sans-serif !important; font-size: 11.5px !important; font-weight: 600; }
.badge-live::before { background: #E2AE4A !important; }
.section-eyebrow { font-family: 'Instrument Sans', system-ui, sans-serif !important; font-size: 12.5px !important; font-weight: 600 !important; color: #A8741F !important; }

/* Cards: white on porcelain with soft depth */
.feat-card, .team-card, .value-card, .press-card, .role-card, .policy-section, .partner-logo {
  background: #fff; border-color: #D5DDE8; box-shadow: 0 30px 60px -50px rgba(11,22,40,.5);
}
.feat-card:hover, .value-card:hover, .team-card:hover, .press-card:hover { border-color: #B7C3D3; box-shadow: 0 30px 50px -34px rgba(11,22,40,.4); }
.role-card:hover { border-color: #E2AE4A; background: #FFFCF5; }
.partner-logo { font-family: 'Instrument Serif', Georgia, serif !important; font-weight: 400 !important; font-size: 18px !important; color: #4A5970; }
.partner-logo:hover { color: #0B1628; border-color: #E2AE4A; }
.policy-section:hover { border-color: #B7C3D3; }

/* Legal pages */
.toc-link:hover { background: #F4F7FB; color: #0B1628; }
.toc-link.active { color: #0B1628 !important; background: rgba(226,174,74,.16) !important; box-shadow: inset 3px 0 0 #E2AE4A; }
.policy-list li { border-bottom-color: #E3E9F1 !important; }
.policy-list li::before { background: #E2AE4A !important; }
.callout { background: #FBF7EE !important; border: 1px solid rgba(226,174,74,.35) !important; }
.callout-warn { background: #FFF7E8 !important; border-color: rgba(183,121,31,.35) !important; }
.callout-danger { background: #FDF1F1 !important; border-color: rgba(200,55,63,.3) !important; }
.read-progress { background: #E2AE4A !important; box-shadow: 0 0 10px rgba(226,174,74,.8) !important; }

::-webkit-scrollbar-track { background: #EEF2F7; }
::-webkit-scrollbar-thumb { background: #B7C3D3; }
/* Spacing below the hero band */
.hero-band { margin-bottom: clamp(40px, 6vw, 64px); }
/* Compact nav on phones */
.tf-nav .btn-ghost, .tf-nav .btn-primary { white-space: nowrap; }
@media (max-width: 600px) {
  .tf-nav > a:first-child { font-size: 21px !important; }
  .tf-nav .btn-ghost, .tf-nav .btn-primary { padding: 7px 12px !important; font-size: 12.5px !important; }
}
@media (max-width: 400px) { .tf-nav .btn-ghost { display: none; } }

`;

/* ─────────────────────────────────────────────
   STATIC DATA
───────────────────────────────────────────── */
const FEATURES = [
  { icon:"📋", color:C.green,  title:"Copy Trading",       desc:"Mirror verified professional traders in real time with configurable risk settings and instant stop controls." },
  { icon:"👥", color:C.blue,   title:"Hire a Trader",      desc:"Delegate your full portfolio to a vetted expert. Performance-based fees mean we win when you win." },
  { icon:"📊", color:C.purple, title:"Deep Insights",      desc:"Sharpe ratio, drawdown analysis, trade attribution, and AI-generated recommendations for every position." },
  { icon:"🔒", color:C.accent, title:"Secure by design", desc:"256-bit encryption, cold storage for assets, and 2FA on every account." },
];

const STATS = [
  { val:"2020",   lbl:"Founded",      color:C.accent  },
  { val:"42",     lbl:"Countries",    color:C.blue    },
  { val:"280K+",  lbl:"Traders",      color:C.purple  },
  { val:"140+",   lbl:"Team members", color:C.green   },
];

const TEAM = [
  { initials:"MC", name:"Marcus Chen",  role:"CEO & Co-founder",  color:C.green  },
  { initials:"SR", name:"Sara Ruiz",    role:"CTO & Co-founder",  color:C.blue   },
  { initials:"DP", name:"David Park",   role:"Head of Product",   color:C.purple },
  { initials:"AN", name:"Aisha Nwosu",  role:"Head of Risk",      color:C.accent },
];

const VALUES = [
  { icon:"🎯", color:C.accent, title:"Transparency first",    desc:"Every fee, every trade, every risk metric — visible and auditable. No hidden spreads, no dark patterns." },
  { icon:"⚡", color:C.blue,   title:"Speed without trade-offs", desc:"Sub-millisecond execution backed by institutional-grade infrastructure that never sleeps." },
  { icon:"🤝", color:C.green,  title:"Aligned incentives",    desc:"Performance-based pricing means our success is measured by yours. We grow when you grow." },
  { icon:"🌍", color:C.purple, title:"Radically inclusive",   desc:"Sophisticated tools shouldn't require a Bloomberg terminal. We make professional trading accessible to all." },
];

const TIMELINE = [
  { year:"2020", title:"Founded in Lagos & London", desc:"Marcus and Sara quit their hedge fund roles to build the platform they always wanted — starting with a 6-person team." },
  { year:"2021", title:"Seed round — $4.2M",        desc:"Backed by Sequoia Scouts and a group of fintech angels. Launched private beta with 800 hand-picked traders." },
  { year:"2022", title:"Public launch",              desc:"Opened the platform to the public." },
  { year:"2023", title:"Series A — $28M",            desc:"Led by Andreessen Horowitz. Expanded to 42 countries and launched AI copy-signal engine." },
  { year:"2024", title:"280,000 traders worldwide",  desc:"Surpassed $4 billion in annualised trading volume. Launched the Pro Trader Marketplace and Forecast suite." },
  { year:"2025", title:"What's next",                desc:"Building institutional prime brokerage, multi-currency wallets, and real-time social trading feeds." },
];

const PRESS = [];   // add genuine, attributable press coverage here

const ROLES = [
  { title:"Senior Frontend Engineer",  team:"Product",   location:"Remote / London",    type:"Full-time" },
  { title:"Quantitative Researcher",   team:"Trading",   location:"London",             type:"Full-time" },
  { title:"Risk & Compliance Analyst", team:"Risk",      location:"London or Remote",   type:"Full-time" },
  { title:"Growth Marketing Lead",     team:"Marketing", location:"Remote",             type:"Full-time" },
  { title:"Product Designer (Mobile)", team:"Design",    location:"Remote",             type:"Full-time" },
];

const PARTNERS = [
  "Sequoia Scouts","a16z","Fireblocks","AWS","Twilio","Stripe","Chainalysis","Sumsub",
];

/* ─────────────────────────────────────────────
   VALUES SECTION
───────────────────────────────────────────── */
function ValuesSection() {
  return (
    <div style={{
      maxWidth:"900px", margin:"0 auto",
      padding:"0 clamp(16px,5vw,48px) clamp(56px,7vw,88px)",
      position:"relative", zIndex:1,
    }}>
      <div style={{textAlign:"center", marginBottom:"40px", animation:"fadeUp .6s cubic-bezier(.22,1,.36,1) both"}}>
        <div className="section-eyebrow">Our principles</div>
        <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif", fontSize:"clamp(28px,3vw,38px)", fontWeight:"400", letterSpacing:"-.01em", color:C.text}}>
          What we believe in.
        </h2>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))", gap:"14px"}}>
        {VALUES.map(({ icon, color, title, desc }, i) => (
          <div key={title} className="value-card" style={{animation:`fadeUp .6s cubic-bezier(.22,1,.36,1) ${.1+i*.09}s both`}}>
            <div style={{
              width:"44px", height:"44px", borderRadius:"12px",
              background:`${color}18`, border:`1px solid ${color}30`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"20px", marginBottom:"16px",
            }}>{icon}</div>
            <div style={{fontFamily:"'Instrument Sans',system-ui,sans-serif", fontSize:"15px", fontWeight:"700", color:C.text, marginBottom:"8px", letterSpacing:"-0.2px"}}>{title}</div>
            <div style={{fontSize:"13px", color:C.textMid, lineHeight:"1.72"}}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TIMELINE / HISTORY
───────────────────────────────────────────── */
function TimelineSection() {
  return (
    <div style={{
      maxWidth:"760px", margin:"0 auto",
      padding:"0 clamp(16px,5vw,48px) clamp(56px,7vw,88px)",
      position:"relative", zIndex:1,
    }}>
      <div style={{textAlign:"center", marginBottom:"48px", animation:"fadeUp .6s cubic-bezier(.22,1,.36,1) both"}}>
        <div className="section-eyebrow">Our story</div>
        <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif", fontSize:"clamp(28px,3vw,38px)", fontWeight:"400", letterSpacing:"-.01em", color:C.text}}>
          From idea to 280,000 traders.
        </h2>
      </div>
      <div style={{position:"relative"}}>
        {/* Vertical line */}
        <div style={{
          position:"absolute", left:"39px", top:"8px", bottom:"8px", width:"1px",
          background:`linear-gradient(180deg, ${C.accent}60 0%, ${C.border} 100%)`,
        }}/>
        <div style={{display:"flex", flexDirection:"column", gap:"36px"}}>
          {TIMELINE.map(({ year, title, desc }, i) => (
            <div key={year} className="timeline-item" style={{animation:`fadeUp .6s cubic-bezier(.22,1,.36,1) ${.1+i*.1}s both`}}>
              {/* Year bubble */}
              <div style={{
                width:"80px", flexShrink:0,
                display:"flex", flexDirection:"column", alignItems:"center", gap:"8px",
                paddingTop:"2px",
              }}>
                <div style={{
                  width:"14px", height:"14px", borderRadius:"50%",
                  background: i === TIMELINE.length-1 ? C.border : C.accent,
                  border:`2px solid ${i === TIMELINE.length-1 ? C.borderHover : C.accent}`,
                  boxShadow: i === TIMELINE.length-1 ? "none" : `0 0 10px ${C.accentGlow}`,
                  position:"relative", zIndex:1, flexShrink:0,
                }}/>
                <div style={{
                  fontFamily:"'DM Mono',monospace",
                  fontSize:"11px", fontWeight:"500",
                  color: i === TIMELINE.length-1 ? C.textDim : C.accent,
                  letterSpacing:".04em",
                }}>{year}</div>
              </div>
              {/* Content */}
              <div style={{
                background: i === TIMELINE.length-1 ? "transparent" : C.surface,
                border:`1px solid ${i === TIMELINE.length-1 ? C.border : C.borderHover}`,
                borderRadius:"12px",
                padding:"18px 20px",
                flex:1,
              }}>
                <div style={{fontFamily:"'Instrument Sans',system-ui,sans-serif", fontSize:"14px", fontWeight:"700", color:C.text, marginBottom:"6px"}}>{title}</div>
                <div style={{fontSize:"13px", color:C.textMid, lineHeight:"1.7"}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PRESS & AWARDS
───────────────────────────────────────────── */
function PressSection() {
  if (!PRESS.length) return null;
  return (
    <div style={{
      maxWidth:"900px", margin:"0 auto",
      padding:"0 clamp(16px,5vw,48px) clamp(56px,7vw,88px)",
      position:"relative", zIndex:1,
    }}>
      <div style={{textAlign:"center", marginBottom:"40px", animation:"fadeUp .6s cubic-bezier(.22,1,.36,1) both"}}>
        <div className="section-eyebrow">In the press</div>
        <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif", fontSize:"clamp(28px,3vw,38px)", fontWeight:"400", letterSpacing:"-.01em", color:C.text}}>
          What people are saying.
        </h2>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))", gap:"14px"}}>
        {PRESS.map(({ outlet, quote, year }, i) => (
          <div key={outlet} className="press-card" style={{animation:`fadeUp .6s cubic-bezier(.22,1,.36,1) ${.1+i*.1}s both`}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px"}}>
              <div style={{fontFamily:"'Instrument Sans',system-ui,sans-serif", fontSize:"13px", fontWeight:"700", color:C.text, letterSpacing:"-0.2px"}}>{outlet}</div>
              <div style={{
                fontFamily:"'DM Mono',monospace", fontSize:"10px", color:C.textDim,
                background:C.surfaceAlt, border:`1px solid ${C.border}`,
                borderRadius:"6px", padding:"3px 8px",
              }}>{year}</div>
            </div>
            <div style={{fontSize:"13px", color:C.textMid, lineHeight:"1.75", fontStyle:"italic"}}>
              "{quote}"
            </div>
          </div>
        ))}
      </div>
      {/* Awards strip */}
      <div style={{
        marginTop:"28px",
        display:"flex", flexWrap:"wrap", gap:"12px", justifyContent:"center",
      }}>
        {["🏆 Forbes Fintech 50 — 2024","🥇 Wired Most Innovative — 2023","⭐ Trustpilot 4.8 / 5"].map((a,i) => (
          <div key={i} style={{
            background:C.surfaceAlt, border:`1px solid ${C.border}`,
            borderRadius:"8px", padding:"8px 16px",
            fontSize:"12px", color:C.textMid, fontWeight:"600",
            animation:`fadeUp .5s cubic-bezier(.22,1,.36,1) ${.2+i*.08}s both`,
          }}>{a}</div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PARTNERS / INVESTORS
───────────────────────────────────────────── */
function PartnersSection() {
  return (
    <div style={{
      maxWidth:"900px", margin:"0 auto",
      padding:"0 clamp(16px,5vw,48px) clamp(56px,7vw,88px)",
      position:"relative", zIndex:1,
    }}>
      <div style={{textAlign:"center", marginBottom:"36px", animation:"fadeUp .6s cubic-bezier(.22,1,.36,1) both"}}>
        <div className="section-eyebrow">Backed & powered by</div>
        <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif", fontSize:"clamp(28px,3vw,38px)", fontWeight:"400", letterSpacing:"-.01em", color:C.text}}>
          Trusted partners & investors.
        </h2>
      </div>
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",
        gap:"12px",
        animation:"fadeUp .6s cubic-bezier(.22,1,.36,1) .15s both",
      }}>
        {PARTNERS.map((name, i) => (
          <div key={name} className="partner-logo">{name}</div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   OPEN ROLES
───────────────────────────────────────────── */
function OpenRolesSection() {
  return (
    <div style={{
      maxWidth:"900px", margin:"0 auto",
      padding:"0 clamp(16px,5vw,48px) clamp(56px,7vw,88px)",
      position:"relative", zIndex:1,
    }}>
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"flex-end",
        flexWrap:"wrap", gap:"16px", marginBottom:"32px",
        animation:"fadeUp .6s cubic-bezier(.22,1,.36,1) both",
      }}>
        <div>
          <div className="section-eyebrow">We're hiring</div>
          <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif", fontSize:"clamp(28px,3vw,38px)", fontWeight:"400", letterSpacing:"-.01em", color:C.text}}>
            Open roles.
          </h2>
        </div>
        <a href="/careers" className="btn-ghost" style={{fontSize:"13px"}}>View all openings →</a>
      </div>
      <div style={{display:"flex", flexDirection:"column", gap:"10px"}}>
        {ROLES.map(({ title, team, location, type }, i) => (
          <a key={title} href="/careers" className="role-card"
            style={{animation:`fadeUp .5s cubic-bezier(.22,1,.36,1) ${.08+i*.07}s both`}}
          >
            <div style={{flex:1, minWidth:"160px"}}>
              <div style={{fontFamily:"'Instrument Sans',system-ui,sans-serif", fontSize:"14px", fontWeight:"700", color:C.text, marginBottom:"4px"}}>{title}</div>
              <div style={{fontSize:"12px", color:C.textDim, fontFamily:"'DM Mono',monospace"}}>{team}</div>
            </div>
            <div style={{display:"flex", gap:"8px", flexWrap:"wrap", alignItems:"center"}}>
              <span style={{
                fontSize:"11px", color:C.textMid,
                background:C.surfaceAlt, border:`1px solid ${C.border}`,
                borderRadius:"6px", padding:"4px 10px",
                whiteSpace:"nowrap",
              }}>{location}</span>
              <span style={{
                fontSize:"11px", color:C.accent,
                background:C.accentDim, border:`1px solid ${C.accent}30`,
                borderRadius:"6px", padding:"4px 10px",
                whiteSpace:"nowrap",
              }}>{type}</span>
              <span style={{fontSize:"18px", color:C.accent}}>→</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
───────────────────────────────────────────── */
function PublicNav() {
  return (
    <nav className="tf-nav">
      <a href="/" aria-label="ProfitGainSignal home" style={{whiteSpace:"nowrap", fontFamily:"'Instrument Serif',Georgia,serif", fontSize:"19px", fontWeight:"400", color:C.text, letterSpacing:"-.01em"}}>
        Profit<span style={{color:"#E2AE4A"}}>Gain</span>Signal
      </a>
      <div className="tf-nav-links">
        <a href="/"      className="tf-nav-link">Home</a>
        <a href="/about" className="tf-nav-link active">About</a>
        <a href="/news"  className="tf-nav-link">News</a>
      </div>
      <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
        <a href="/login"  className="btn-ghost">Log in</a>
        <a href="/signup" className="btn-primary" style={{padding:"8px 16px", fontSize:"12px"}}>Sign up free →</a>
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────────
   HERO
───────────────────────────────────────────── */
function HeroSection() {
  return (
    <div className="hero-band" style={{
      textAlign:"center",
      padding:"clamp(64px,10vw,120px) clamp(16px,6vw,48px) clamp(48px,7vw,80px)",
      position:"relative", zIndex:1,
      animation:"fadeUp .7s cubic-bezier(.22,1,.36,1) both",
    }}>
      {/* Glow */}
      <div style={{position:"absolute", width:"600px", height:"300px", borderRadius:"50%", background:C.accentGlow, filter:"blur(100px)", top:"0", left:"50%", transform:"translateX(-50%)", pointerEvents:"none", zIndex:0}}/>

      <div style={{position:"relative", zIndex:1}}>
        <div className="badge-live" style={{marginBottom:"24px"}}>About ProfitGainSignal</div>

        <h1 style={{
          fontFamily:"'Instrument Serif',Georgia,serif",
          fontSize:"clamp(42px,6vw,85px)",
          fontWeight:"400",
          letterSpacing:"-.01em",
          lineHeight:"1.05",
          color:C.text,
          marginBottom:"24px",
          maxWidth:"700px",
          marginLeft:"auto", marginRight:"auto",
        }}>
          Built for traders who<br/>
          <span style={{color:C.accent}}>demand more.</span>
        </h1>

        <p style={{
          fontSize:"clamp(15px,2vw,17px)",
          color:C.textMid,
          lineHeight:"1.75",
          maxWidth:"520px",
          marginLeft:"auto", marginRight:"auto",
          marginBottom:"36px",
        }}>
          ProfitGainSignal was founded in 2020 by traders and engineers frustrated with slow,
          expensive, and opaque platforms. We built the infrastructure we always wanted —
          and opened it to the world.
        </p>

        <a href="/signup" className="btn-primary" style={{fontSize:"14px", padding:"13px 28px"}}>
          Get started free →
        </a>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MISSION CARD
───────────────────────────────────────────── */
function MissionCard() {
  return (
    <div style={{
      maxWidth:"760px", margin:"0 auto",
      padding:"0 clamp(16px,5vw,48px) clamp(48px,6vw,72px)",
      position:"relative", zIndex:1,
      animation:"fadeUp .7s cubic-bezier(.22,1,.36,1) .1s both",
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${C.surface} 0%, #F7F2E6 100%)`,
        border:`1px solid ${C.border}`,
        borderLeft:`3px solid ${C.accent}`,
        borderRadius:"14px",
        padding:"32px 36px",
        position:"relative", overflow:"hidden",
      }}>
        <div style={{position:"absolute", width:"200px", height:"200px", borderRadius:"50%", background:C.accentGlow, filter:"blur(60px)", top:"-60px", right:"-40px", pointerEvents:"none"}}/>
        <blockquote style={{
          fontFamily:"'Instrument Serif',Georgia,serif",
          fontSize:"clamp(20px,2vw,25px)",
          fontWeight:"400",
          color:C.text,
          lineHeight:"1.55",
          letterSpacing:"-.01em",
          marginBottom:"16px",
          position:"relative", zIndex:1,
        }}>
          "Our mission is to democratize professional-grade trading for everyone —
          from first-time investors to seasoned fund managers."
        </blockquote>
        <cite style={{
          fontSize:"13px",
          color:C.textMid,
          fontStyle:"normal",
          fontFamily:"'DM Mono',monospace",
          letterSpacing:".03em",
          position:"relative", zIndex:1,
        }}>
          — Marcus Chen, CEO &amp; Co-founder
        </cite>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STATS STRIP
───────────────────────────────────────────── */
function StatsStrip() {
  return (
    <div style={{
      maxWidth:"900px", margin:"0 auto",
      padding:"0 clamp(16px,5vw,48px) clamp(56px,7vw,88px)",
      position:"relative", zIndex:1,
    }}>
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",
        gap:"1px",
        background:C.border,
        border:`1px solid ${C.border}`,
        borderRadius:"14px",
        overflow:"hidden",
      }}>
        {STATS.map(({ val, lbl, color }, i) => (
          <div key={lbl} style={{
            background:C.surface,
            padding:"28px 24px",
            textAlign:"center",
            animation:`fadeUp .6s cubic-bezier(.22,1,.36,1) ${.15+i*.08}s both`,
          }}>
            <div style={{
              fontFamily:"'Instrument Serif',Georgia,serif",
              fontSize:"clamp(31px,3vw,42px)",
              fontWeight:"400",
              color,
              letterSpacing:"-.01em",
              marginBottom:"6px",
            }}>{val}</div>
            <div style={{fontSize:"12px", color:C.textDim, fontFamily:"'DM Mono',monospace", letterSpacing:".06em", textTransform:"uppercase"}}>{lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FEATURES GRID
───────────────────────────────────────────── */
function FeaturesGrid() {
  return (
    <div style={{
      maxWidth:"900px", margin:"0 auto",
      padding:"0 clamp(16px,5vw,48px) clamp(56px,7vw,88px)",
      position:"relative", zIndex:1,
    }}>
      <div style={{textAlign:"center", marginBottom:"40px", animation:"fadeUp .6s cubic-bezier(.22,1,.36,1) both"}}>
        <div className="section-eyebrow">What we offer</div>
        <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif", fontSize:"clamp(28px,3vw,38px)", fontWeight:"400", letterSpacing:"-.01em", color:C.text}}>
          Everything you need to trade well.
        </h2>
      </div>

      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))",
        gap:"14px",
      }}>
        {FEATURES.map(({ icon, color, title, desc }, i) => (
          <div key={title} className="feat-card" style={{animation:`fadeUp .6s cubic-bezier(.22,1,.36,1) ${.1+i*.09}s both`}}>
            <div style={{
              width:"44px", height:"44px", borderRadius:"12px",
              background:`${color}18`,
              border:`1px solid ${color}30`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"20px", marginBottom:"16px",
            }}>{icon}</div>
            <div style={{fontFamily:"'Instrument Sans',system-ui,sans-serif", fontSize:"15px", fontWeight:"700", color:C.text, marginBottom:"8px", letterSpacing:"-0.2px"}}>{title}</div>
            <div style={{fontSize:"13px", color:C.textMid, lineHeight:"1.7"}}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TEAM SECTION
───────────────────────────────────────────── */
function TeamSection() {
  return (
    <div style={{
      maxWidth:"900px", margin:"0 auto",
      padding:"0 clamp(16px,5vw,48px) clamp(56px,7vw,88px)",
      position:"relative", zIndex:1,
    }}>
      <div style={{textAlign:"center", marginBottom:"40px", animation:"fadeUp .6s cubic-bezier(.22,1,.36,1) both"}}>
        <div className="section-eyebrow">The people</div>
        <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif", fontSize:"clamp(28px,3vw,38px)", fontWeight:"400", letterSpacing:"-.01em", color:C.text}}>
          Leadership team.
        </h2>
      </div>

      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",
        gap:"14px",
      }}>
        {TEAM.map(({ initials, name, role, color }, i) => (
          <div key={name} className="team-card" style={{animation:`fadeUp .6s cubic-bezier(.22,1,.36,1) ${.1+i*.09}s both`}}>
            <div style={{
              width:"52px", height:"52px", borderRadius:"50%",
              background:`${color}20`,
              border:`1px solid ${color}40`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"'Instrument Sans',system-ui,sans-serif",
              fontSize:"15px", fontWeight:"700",
              color,
              margin:"0 auto 14px",
            }}>{initials}</div>
            <div style={{fontFamily:"'Instrument Sans',system-ui,sans-serif", fontSize:"14px", fontWeight:"700", color:C.text, marginBottom:"5px"}}>{name}</div>
            <div style={{fontSize:"12px", color:C.textDim, fontFamily:"'DM Mono',monospace", letterSpacing:".03em"}}>{role}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CTA STRIP
───────────────────────────────────────────── */
function CtaStrip() {
  return (
    <div style={{
      maxWidth:"900px", margin:"0 auto",
      padding:"0 clamp(16px,5vw,48px) clamp(64px,8vw,100px)",
      position:"relative", zIndex:1,
      animation:"fadeUp .6s cubic-bezier(.22,1,.36,1) .2s both",
    }}>
      <div style={{
        background:`linear-gradient(135deg, ${C.surface} 0%, #F7F2E6 100%)`,
        border:`1px solid ${C.border}`,
        borderRadius:"18px",
        padding:"clamp(36px,5vw,56px)",
        textAlign:"center",
        position:"relative", overflow:"hidden",
        boxShadow:`0 40px 80px -50px rgba(11,22,40,.55)`,
      }}>
        {/* Decorative glows */}
        <div style={{position:"absolute", width:"400px", height:"200px", borderRadius:"50%", background:C.accentGlow, filter:"blur(80px)", bottom:"-80px", left:"50%", transform:"translateX(-50%)", pointerEvents:"none"}}/>
        <div style={{position:"absolute", width:"200px", height:"200px", borderRadius:"50%", background:"rgba(59,158,255,.1)", filter:"blur(60px)", top:"-60px", right:"10%", pointerEvents:"none"}}/>

        <div style={{position:"relative", zIndex:1}}>
          <div className="badge-live" style={{marginBottom:"20px"}}>Free to start</div>
          <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif", fontSize:"clamp(28px,4vw,45px)", fontWeight:"400", letterSpacing:"-.01em", color:C.text, marginBottom:"12px"}}>
            Ready to trade smarter?
          </h2>
          <p style={{fontSize:"14px", color:C.textMid, marginBottom:"28px", lineHeight:"1.65"}}>
            No credit card required. Cancel anytime.
          </p>
          <a href="/signup" className="btn-primary" style={{fontSize:"14px", padding:"14px 32px"}}>
            Get started free →
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
const About = () => (
  <>
    <style>{CSS}</style>
    <div className="grid-bg"/>
    <PublicNav/>
    <div style={{position:"relative"}}>
      <HeroSection/>
      <MissionCard/>
      <StatsStrip/>
      <ValuesSection/>
      <FeaturesGrid/>
      <TimelineSection/>
      <TeamSection/>
      <PressSection/>
      <PartnersSection/>
      <OpenRolesSection/>
      <CtaStrip/>
    </div>
  </>
);

export default About;