import React, { useState, useEffect } from 'react';

/* ─────────────────────────────────────────────
   DESIGN TOKENS  (match ProfitGainSignal system)
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
   TERMS CONTENT
   NOTE: all inner quotes use \" or single '
───────────────────────────────────────────── */
const SECTIONS = [
  {
    id: "acceptance",
    icon: "✅",
    color: C.accent,
    title: "Acceptance of Terms",
    content: [
      { type:"p", text:"By accessing or using the ProfitGainSignal platform, website, or any associated services (collectively, the \"Services\"), you agree to be bound by these Terms of Service (\"Terms\"). If you do not agree, you must not use the Services." },
      { type:"p", text:"These Terms constitute a legally binding agreement between you and ProfitGainSignal ([registered company name, number and address])." },
      { type:"callout", icon:"📋", text:"Last updated: 1 May 2025. We may revise these Terms at any time. Continued use of the Services after changes take effect constitutes your acceptance of the revised Terms." },
    ],
  },
  {
    id: "eligibility",
    icon: "🪪",
    color: C.blue,
    title: "Eligibility",
    content: [
      { type:"p", text:"To use ProfitGainSignal you must meet all of the following criteria at all times:" },
      { type:"list", label:"Requirements", items:[
        "Be at least 18 years of age (or the age of majority in your jurisdiction, if higher)",
        "Have the legal capacity to enter into a binding contract",
        "Not be a resident of a jurisdiction where our Services are prohibited or restricted",
        "Not be subject to any sanctions lists maintained by the UK, EU, UN, or US authorities",
        "Have completed our identity verification (KYC) process successfully",
      ]},
      { type:"callout", icon:"⚠️", text:"ProfitGainSignal is not available to residents of the United States, North Korea, Iran, or any other jurisdiction where financial services are restricted. It is your responsibility to ensure compliance with local laws." },
    ],
  },
  {
    id: "account",
    icon: "👤",
    color: C.purple,
    title: "Your Account",
    content: [
      { type:"p", text:"When you create a ProfitGainSignal account you are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account." },
      { type:"list", label:"Account responsibilities", items:[
        "Provide accurate, complete, and current registration information",
        "Keep your password and two-factor authentication codes secure",
        "Notify us immediately at security@profitgainsignals.com if you suspect unauthorised access",
        "Not share your account with, or transfer it to, any third party",
        "Not create more than one account per person without prior written consent",
      ]},
      { type:"p", text:"We reserve the right to suspend or terminate accounts that violate these Terms, provide false information, or engage in activity that threatens the security or integrity of the platform." },
    ],
  },
  {
    id: "services",
    icon: "⚙️",
    color: C.accent,
    title: "Services & Features",
    content: [
      { type:"p", text:"ProfitGainSignal provides a technology platform that enables users to copy the trading strategies of selected signal providers, hire professional traders to manage portfolios, and access market analytics tools." },
      { type:"list", label:"Available services", items:[
        "Copy Trading -- automated mirroring of verified signal providers with configurable risk limits",
        "Trader Hire -- delegation of portfolio management to vetted professional traders",
        "Analytics Dashboard -- Sharpe ratio, drawdown analysis, and AI-generated trade insights",
        "Paper Trading -- simulated trading environment for practice (no real funds involved)",
        "Notifications & Alerts -- real-time alerts for price movements and portfolio events",
      ]},
      { type:"callout", icon:"📊", text:"Past performance of any signal provider or hired trader is not indicative of future results. All trading involves risk and you may lose some or all of your invested capital." },
    ],
  },
  {
    id: "fees",
    icon: "💳",
    color: C.blue,
    title: "Fees & Payments",
    content: [
      { type:"p", text:"ProfitGainSignal charges fees for certain services. All fees are displayed before you commit to a transaction and are subject to change with 30 days' notice." },
      { type:"list", label:"Fee structure", items:[
        "Copy Trading -- no platform subscription fee; signal providers may charge a performance fee of 10-30% of profits",
        "Trader Hire -- negotiated directly with the trader; ProfitGainSignal charges a 5% intermediary fee on performance fees",
        "Deposits and withdrawals -- no platform fees; your bank or payment provider may charge their own fees",
        "Inactivity fee -- accounts with no activity for 12+ months may be charged GBP 5 per month",
        "Currency conversion -- a 0.5% spread applies to currency conversions",
      ]},
      { type:"p", text:"All fees are charged in the currency of your account. VAT or other applicable taxes will be added where required by law." },
    ],
  },
  {
    id: "risk",
    icon: "⚡",
    color: C.amber,
    title: "Risk Disclosure",
    content: [
      { type:"p", text:"Trading financial instruments carries a high level of risk and may not be suitable for all investors. You should carefully consider your investment objectives, level of experience, and risk appetite before using our Services." },
      { type:"list", label:"Key risks include", items:[
        "Market risk -- the value of investments can fall as well as rise",
        "Leverage risk -- some instruments allow trading on margin, magnifying both gains and losses",
        "Liquidity risk -- certain instruments may be difficult to sell at a fair price",
        "Counterparty risk -- third-party signal providers or hired traders may underperform or fail",
        "Technology risk -- platform outages or connectivity issues may prevent timely execution",
        "Regulatory risk -- changes in law or regulation may affect available instruments or your access",
      ]},
      { type:"callout", icon:"🔴", text:"You should never invest money you cannot afford to lose. If you are unsure whether trading is right for you, seek independent financial advice." },
    ],
  },
  {
    id: "prohibited",
    icon: "🚫",
    color: C.red,
    title: "Prohibited Conduct",
    content: [
      { type:"p", text:"You agree not to engage in any of the following activities when using ProfitGainSignal. Violations may result in immediate account termination and referral to relevant authorities." },
      { type:"list", label:"Prohibited activities", items:[
        "Using the platform for money laundering, fraud, or any other illegal purpose",
        "Manipulating markets, engaging in wash trading, or disseminating false information",
        "Attempting to reverse-engineer, hack, scrape, or disrupt our platform infrastructure",
        "Using automated bots or scripts to access the Services without written authorisation",
        "Impersonating another person or entity, or misrepresenting your affiliation",
        "Uploading malicious code, viruses, or any content that could damage our systems",
        "Harvesting or collecting other users' data without their consent",
      ]},
    ],
  },
  {
    id: "intellectual-property",
    icon: "©️",
    color: C.purple,
    title: "Intellectual Property",
    content: [
      { type:"p", text:"All content, software, trademarks, logos, and materials on the ProfitGainSignal platform are the exclusive property of ProfitGainSignal Technologies Ltd or our licensors and are protected by applicable intellectual property laws." },
      { type:"list", label:"Permitted and restricted use", items:[
        "You may access and use the platform solely for your personal, non-commercial purposes",
        "You may not copy, reproduce, distribute, or create derivative works without express written consent",
        "You retain ownership of any content you submit, but grant ProfitGainSignal a licence to use it to provide the Services",
        "Feedback or suggestions you provide may be used by ProfitGainSignal without obligation to you",
      ]},
    ],
  },
  {
    id: "liability",
    icon: "⚖️",
    color: C.blue,
    title: "Limitation of Liability",
    content: [
      { type:"p", text:"To the fullest extent permitted by applicable law, ProfitGainSignal and its directors, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Services." },
      { type:"list", label:"Liability caps and exclusions", items:[
        "Our total aggregate liability to you shall not exceed the fees you paid to us in the 12 months preceding the claim",
        "We are not liable for losses caused by third-party signal providers or hired traders",
        "We are not liable for losses resulting from platform outages, force majeure events, or regulatory actions",
        "Nothing in these Terms excludes liability for death, personal injury caused by our negligence, or fraud",
      ]},
      { type:"callout", icon:"⚠️", text:"Some jurisdictions do not allow the exclusion or limitation of certain warranties or liabilities. In such cases, our liability will be limited to the maximum extent permitted by law." },
    ],
  },
  {
    id: "termination",
    icon: "🔚",
    color: C.accent,
    title: "Termination",
    content: [
      { type:"p", text:"Either party may terminate the agreement at any time. You may close your account through the Settings page. We may suspend or terminate your account immediately if we believe you have violated these Terms." },
      { type:"list", label:"Upon termination", items:[
        "All open copy positions will be closed at the prevailing market price",
        "Any hired trader mandates will be terminated with immediate effect",
        "Your remaining balance will be returned to your nominated payment method within 5 business days",
        "Your access to the platform and all data will be revoked",
        "Obligations that by their nature should survive termination (e.g. liability clauses) will remain in effect",
      ]},
    ],
  },
  {
    id: "governing-law",
    icon: "🏛️",
    color: C.textMid,
    title: "Governing Law & Disputes",
    content: [
      { type:"p", text:"These Terms are governed by the laws of [your jurisdiction]. Any dispute arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of [your jurisdiction]." },
      { type:"p", text:"Before initiating formal proceedings, you agree to attempt to resolve any dispute informally by contacting us at legal@profitgainsignals.com. We will make reasonable efforts to resolve complaints within 30 days." },
      { type:"callout", icon:"💬", text:"Complaints can also be escalated to the Financial Ombudsman Service (FOS) if unresolved. Visit financial-ombudsman.org.uk for details." },
    ],
  },
];

/* ─────────────────────────────────────────────
   GLOBAL CSS
───────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wdth,wght@75..100,400..700&family=DM+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  background: ${C.bg};
  color: ${C.text};
  font-family: 'Instrument Sans',system-ui,sans-serif;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
  overflow-x: hidden;
}
a { text-decoration: none; color: inherit; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(18px); }
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

/* ── Grid BG ── */
.grid-bg {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    linear-gradient(${C.border} 1px, transparent 1px),
    linear-gradient(90deg, ${C.border} 1px, transparent 1px);
  background-size: 56px 56px;
  animation: gridFade 1.2s ease-out both;
  mask-image: radial-gradient(ellipse 70% 50% at 50% 0%, black 0%, transparent 100%);
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
.tf-nav-links { display:flex; align-items:center; gap:4px; }
.tf-nav-link {
  font-size:13px; font-weight:500; color:${C.textMid};
  padding:6px 12px; border-radius:7px;
  transition:color .15s, background .15s;
}
.tf-nav-link:hover { color:${C.text}; background:rgba(255,255,255,.04); }
.tf-nav-link.active { color:${C.text}; font-weight:600; }
@media(max-width:600px){ .tf-nav-links { display:none; } }

/* ── Buttons ── */
.btn-primary {
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  padding:8px 16px; background:${C.accent}; color:#040A14;
  border:none; border-radius:8px; font-size:12px; font-weight:700;
  font-family:'Instrument Sans',system-ui,sans-serif; cursor:pointer; letter-spacing:.01em;
  transition:transform .18s, box-shadow .18s; text-decoration:none;
  position:relative; overflow:hidden;
}
.btn-primary::after {
  content:''; position:absolute; inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,.16) 0%,transparent 60%);
  opacity:0; transition:opacity .2s;
}
.btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 28px ${C.accentGlow}; }
.btn-primary:hover::after { opacity:1; }

.btn-ghost {
  display:inline-flex; align-items:center; justify-content:center;
  padding:8px 16px; background:transparent; color:${C.textMid};
  border:1px solid ${C.border}; border-radius:8px; font-size:12px; font-weight:600;
  font-family:'Instrument Sans',system-ui,sans-serif; cursor:pointer;
  transition:border-color .2s, color .2s; text-decoration:none;
}
.btn-ghost:hover { border-color:${C.borderHover}; color:${C.text}; }

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

/* ── TOC ── */
.toc-link {
  display:flex; align-items:center; gap:10px;
  padding:8px 12px; border-radius:8px;
  font-size:12px; font-weight:500; color:${C.textMid};
  cursor:pointer; transition:color .15s, background .15s;
  border:none; background:none; width:100%; text-align:left;
  font-family:'Instrument Sans',system-ui,sans-serif; line-height:1.4;
}
.toc-link:hover { color:${C.text}; background:rgba(255,255,255,.04); }
.toc-link.active { color:${C.accent}; background:${C.accentDim}; font-weight:600; }
.toc-dot {
  width:5px; height:5px; border-radius:50%; flex-shrink:0;
  background:currentColor; opacity:.4; transition:opacity .15s, transform .15s;
}
.toc-link.active .toc-dot { opacity:1; transform:scale(1.5); }

/* ── Section card ── */
.policy-section {
  background:${C.surface};
  border:1px solid ${C.border};
  border-radius:16px;
  padding:clamp(24px,3vw,36px);
  margin-bottom:14px;
  scroll-margin-top:80px;
  transition:border-color .2s;
}
.policy-section:hover { border-color:${C.borderHover}; }

/* ── Callout ── */
.callout {
  display:flex; align-items:flex-start; gap:12px;
  border-radius:10px; padding:14px 16px; margin-top:16px;
}
.callout-default { background:${C.accentDim}; border:1px solid ${C.accent}25; }
.callout-warn    { background:rgba(245,158,11,.08); border:1px solid rgba(245,158,11,.2); }
.callout-danger  { background:rgba(255,77,106,.08); border:1px solid rgba(255,77,106,.2); }

/* ── List ── */
.policy-list { list-style:none; margin-top:10px; }
.policy-list li {
  display:flex; align-items:baseline; gap:10px;
  padding:7px 0; border-bottom:1px solid ${C.border}40;
  font-size:14px; color:${C.textMid}; line-height:1.65;
}
.policy-list li:last-child { border-bottom:none; }
.policy-list li::before {
  content:''; width:4px; height:4px; border-radius:50%;
  background:${C.accent}; flex-shrink:0; margin-top:9px;
}

/* ── Section number badge ── */
.sec-num {
  font-family:'DM Mono',monospace; font-size:10px; font-weight:500;
  color:${C.textDim}; letter-spacing:.06em;
  margin-bottom:4px; text-transform:uppercase;
}

/* ── Read progress ── */
.read-progress {
  position:fixed; top:0; left:0; height:2px; z-index:200;
  background:${C.accent}; transition:width .1s linear;
  box-shadow:0 0 10px ${C.accent};
}

/* ── Scrollbar ── */
::-webkit-scrollbar { width:5px; }
::-webkit-scrollbar-track { background:${C.bg}; }
::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }

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
   NAV
───────────────────────────────────────────── */
function PublicNav() {
  return (
    <nav className="tf-nav">
      <a href="/" aria-label="ProfitGainSignal home" style={{whiteSpace:"nowrap", fontFamily:"'Instrument Serif',Georgia,serif", fontSize:"19px", fontWeight:"400", color:C.text, letterSpacing:"-.01em"}}>
        Profit<span style={{color:"#E2AE4A"}}>Gain</span>Signal
      </a>
      <div className="tf-nav-links">
        <a href="/"      className="tf-nav-link">Home</a>
        <a href="/about" className="tf-nav-link">About</a>
        <a href="/news"  className="tf-nav-link">News</a>
      </div>
      <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
        <a href="/login"  className="btn-ghost">Log in</a>
        <a href="/signup" className="btn-primary">Sign up free →</a>
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────────
   SECTION RENDERER
───────────────────────────────────────────── */
function SectionBlock({ section, index }) {
  const calloutClass = (icon) => {
    if (icon === "⚠️" || icon === "🔴") return "callout callout-warn";
    if (icon === "🚫") return "callout callout-danger";
    return "callout callout-default";
  };

  return (
    <div id={section.id} className="policy-section">
      {/* Header */}
      <div style={{display:"flex", alignItems:"flex-start", gap:"14px", marginBottom:"20px"}}>
        <div style={{
          width:"44px", height:"44px", borderRadius:"12px", flexShrink:0,
          background:`${section.color}18`, border:`1px solid ${section.color}30`,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px",
        }}>{section.icon}</div>
        <div>
          <div className="sec-num">Section {String(index + 1).padStart(2, "0")}</div>
          <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif", fontSize:"clamp(19px,2vw,22px)", fontWeight:"400", color:C.text, letterSpacing:"-.01em", lineHeight:"1.2"}}>
            {section.title}
          </h2>
        </div>
      </div>

      {/* Content */}
      {section.content.map((block, i) => {
        if (block.type === "p") return (
          <p key={i} style={{fontSize:"14px", color:C.textMid, lineHeight:"1.8", marginBottom:"12px"}}>
            {block.text}
          </p>
        );

        if (block.type === "list") return (
          <div key={i} style={{marginBottom:"12px"}}>
            {block.label && (
              <div style={{fontSize:"10px", fontFamily:"'DM Mono',monospace", color:C.textDim, letterSpacing:".08em", textTransform:"uppercase", marginBottom:"6px", marginTop:"4px"}}>
                {block.label}
              </div>
            )}
            <ul className="policy-list">
              {block.items.map((item, j) => <li key={j}>{item}</li>)}
            </ul>
          </div>
        );

        if (block.type === "callout") return (
          <div key={i} className={calloutClass(block.icon)}>
            <span style={{fontSize:"18px", flexShrink:0, marginTop:"1px"}}>{block.icon}</span>
            <p style={{fontSize:"13px", color:C.textMid, lineHeight:"1.65"}}>{block.text}</p>
          </div>
        );

        return null;
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TABLE OF CONTENTS
───────────────────────────────────────────── */
function TableOfContents({ activeId }) {
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });
  };
  return (
    <div style={{
      position:"sticky", top:"80px",
      background:C.surface, border:`1px solid ${C.border}`,
      borderRadius:"14px", padding:"16px",
      width:"224px", flexShrink:0, alignSelf:"flex-start",
    }}>
      <div style={{fontSize:"10px", fontFamily:"'DM Mono',monospace", color:C.textDim, letterSpacing:".08em", textTransform:"uppercase", marginBottom:"12px", paddingLeft:"12px"}}>
        Sections
      </div>
      {SECTIONS.map((s, i) => (
        <button key={s.id} className={`toc-link ${activeId === s.id ? "active" : ""}`} onClick={() => scrollTo(s.id)}>
          <span style={{fontFamily:"'DM Mono',monospace", fontSize:"10px", color:"inherit", opacity:.5, flexShrink:0, minWidth:"18px"}}>
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="toc-dot"/>
          {s.title}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   READ PROGRESS
───────────────────────────────────────────── */
function ReadProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setPct(total > 0 ? (el.scrollTop / total) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <div className="read-progress" style={{width:`${pct}%`}}/>;
}

/* ─────────────────────────────────────────────
   ACTIVE SECTION TRACKER
───────────────────────────────────────────── */
function useActiveSection() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => { entries.forEach(e => { if (e.isIntersecting) setActiveId(e.target.id); }); },
      { rootMargin: "-20% 0px -60% 0px" }
    );
    SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);
  return activeId;
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
const Terms = () => {
  const activeId = useActiveSection();

  return (
    <>
      <style>{CSS}</style>
      <ReadProgress/>
      <div className="grid-bg"/>
      <PublicNav/>

      {/* ── HERO ── */}
      <div className="hero-band" style={{
        textAlign:"center",
        padding:"clamp(48px,7vw,88px) clamp(16px,6vw,48px) clamp(32px,4vw,48px)",
        position:"relative", zIndex:1,
        animation:"fadeUp .7s cubic-bezier(.22,1,.36,1) both",
      }}>
        <div style={{position:"absolute", width:"500px", height:"200px", borderRadius:"50%", background:C.accentGlow, filter:"blur(100px)", top:0, left:"50%", transform:"translateX(-50%)", pointerEvents:"none"}}/>
        <div style={{position:"relative", zIndex:1}}>
          <div className="badge-live" style={{marginBottom:"20px"}}>Legal</div>
          <h1 style={{
            fontFamily:"'Instrument Serif',Georgia,serif",
            fontSize:"clamp(38px,5vw,66px)",
            fontWeight:"400", letterSpacing:"-.01em", lineHeight:"1.05",
            color:C.text, marginBottom:"16px",
          }}>
            Terms of Service
          </h1>
          <p style={{fontSize:"14px", color:C.textMid, lineHeight:"1.7", maxWidth:"500px", margin:"0 auto 28px"}}>
            Please read these Terms carefully before using ProfitGainSignal. They set out your rights, our obligations, and the rules that apply to everyone on the platform.
          </p>

          {/* Meta strip */}
          <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:"32px", flexWrap:"wrap"}}>
            {[
              { label:"Effective date", val:"1 May 2025"      },
              { label:"Jurisdiction",   val:"England & Wales" },
              { label:"Sections",       val:`${SECTIONS.length} total` },
            ].map(({ label, val }) => (
              <div key={label} style={{textAlign:"center"}}>
                <div style={{fontSize:"10px", fontFamily:"'DM Mono',monospace", color:C.textDim, letterSpacing:".07em", textTransform:"uppercase", marginBottom:"3px"}}>{label}</div>
                <div style={{fontSize:"13px", color:C.textMid, fontWeight:"600"}}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{
        maxWidth:"1060px", margin:"0 auto",
        padding:"0 clamp(16px,4vw,40px) clamp(64px,8vw,100px)",
        display:"flex", gap:"28px", alignItems:"flex-start",
        position:"relative", zIndex:1,
      }}>

        {/* TOC sidebar (desktop only) */}
        <div style={{display:"none"}} className="terms-toc-desktop">
          <TableOfContents activeId={activeId}/>
        </div>
        <style>{`@media(min-width:860px){ .terms-toc-desktop{ display:block !important; } }`}</style>

        {/* Sections */}
        <div style={{flex:1, minWidth:0}}>
          {SECTIONS.map((s, i) => (
            <div key={s.id} style={{animation:`fadeUp .6s cubic-bezier(.22,1,.36,1) ${.04 + i * .05}s both`}}>
              <SectionBlock section={s} index={i}/>
            </div>
          ))}

          {/* Footer CTA */}
          <div style={{
            marginTop:"8px",
            background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:"16px", padding:"28px 32px",
            display:"flex", alignItems:"center", gap:"20px", flexWrap:"wrap",
            boxShadow:`0 40px 80px -50px rgba(11,22,40,.55)`,
            position:"relative", overflow:"hidden",
          }}>
            <div style={{position:"absolute", width:"300px", height:"150px", borderRadius:"50%", background:C.accentGlow, filter:"blur(70px)", bottom:"-60px", right:"0", pointerEvents:"none"}}/>
            <div style={{flex:1, minWidth:"200px", position:"relative", zIndex:1}}>
              <div style={{fontSize:"14px", fontWeight:"700", color:C.text, marginBottom:"4px", fontFamily:"'Instrument Sans',system-ui,sans-serif"}}>
                Questions about these Terms?
              </div>
              <div style={{fontSize:"13px", color:C.textMid}}>
                Our legal team is available at{" "}
                <a href="mailto:legal@profitgainsignals.com" style={{color:C.accent, fontWeight:"600"}}>legal@profitgainsignals.com</a>
              </div>
            </div>
            <div style={{display:"flex", gap:"10px", flexShrink:0, position:"relative", zIndex:1}}>
              <a href="/policy" className="btn-ghost" style={{padding:"11px 18px", fontSize:"13px"}}>Privacy Policy</a>
              <a href="/signup" className="btn-primary" style={{padding:"11px 22px", fontSize:"13px"}}>Get started →</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Terms;