import React, { useState, useEffect, useRef } from "react";
import regDoc1 from "../doc/file1.jpeg";
import regDoc2 from "../doc/file2.jpeg";

/* ─────────────────────────────────────────────
   DESIGN TOKENS — "Global Desk"
   A broker's desk after hours: midnight navy chrome,
   bullion gold for the brand, clean porcelain surfaces
   for reading. Serif display for the wealth side, a
   precise sans with tabular figures for the trading side.
   Green/red are reserved for gains and losses only.
───────────────────────────────────────────── */
const C = {
  night:      "#07101E",
  night2:     "#0C1A2E",
  night3:     "#13233B",
  nightLine:  "#22334F",
  porcelain:  "#EEF2F7",
  porcelain2: "#E3E9F1",
  white:      "#FFFFFF",
  ink:        "#0B1628",
  inkMid:     "#4A5970",
  inkDim:     "#8090A6",
  line:       "#D5DDE8",
  lineStrong: "#B7C3D3",
  gold:       "#E2AE4A",
  goldDeep:   "#C99331",
  goldSoft:   "rgba(226,174,74,.16)",
  blue:       "#5B8CFF",
  blueSoft:   "rgba(91,140,255,.16)",
  gain:       "#0F8F5F",
  gainSoft:   "rgba(15,143,95,.11)",
  loss:       "#C8373F",
  lossSoft:   "rgba(200,55,63,.10)",
  gainLit:    "#2FD394",
  lossLit:    "#FF6470",
  onDark:     "rgba(238,242,247,.74)",
  onDarkDim:  "rgba(238,242,247,.5)",
  darkRule:   "rgba(238,242,247,.12)",
};

/* ─────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
html, body {
  background: ${C.porcelain}; color: ${C.ink};
  font-family: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 16px; line-height: 1.6; -webkit-font-smoothing: antialiased; overflow-x: hidden;
}
a { color: inherit; text-decoration: none; }
button { font-family: inherit; }
ul, ol { list-style: none; }
svg { display: block; }
.num { font-variant-numeric: tabular-nums; }
.brand { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: 26px; line-height: 1; letter-spacing: -.01em; color: ${C.porcelain}; white-space: nowrap; }
.brand b { font-weight: 400; color: ${C.gold}; }
.serif { font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif; font-weight: 400; }
:focus-visible { outline: 2px solid ${C.blue}; outline-offset: 3px; border-radius: 4px; }
.on-dark :focus-visible { outline-color: ${C.gold}; }

.tx-wrap    { max-width: 1220px; margin: 0 auto; position: relative; }
.tx-section { padding: 112px clamp(20px,5vw,56px); position: relative; }
.dark { background: ${C.night}; color: ${C.porcelain}; }
.tx-h2 { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: clamp(38px,5vw,64px); line-height: 1; letter-spacing: -.01em; }
.tx-lede { font-size: 18px; color: ${C.inkMid}; max-width: 32em; margin-top: 18px; }
.on-dark .tx-lede { color: ${C.onDark}; }

/* ── Buttons ── */
.tx-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: 50px; padding: 0 24px; border-radius: 10px;
  font-size: 15.5px; font-weight: 600; cursor: pointer; white-space: nowrap;
  border: 1px solid transparent; transition: background .15s, border-color .15s, color .15s, box-shadow .15s;
}
.tx-btn-sm   { height: 40px; padding: 0 16px; font-size: 14.5px; }
.tx-btn-gold { background: ${C.gold}; color: ${C.night}; box-shadow: 0 10px 30px -12px rgba(226,174,74,.7); }
.tx-btn-gold:hover { background: #EDBE5F; }
.tx-btn-ink  { background: ${C.ink}; color: ${C.porcelain}; }
.tx-btn-ink:hover { background: ${C.night3}; }
.tx-btn-line { background: transparent; color: ${C.ink}; border-color: ${C.lineStrong}; }
.tx-btn-line:hover { border-color: ${C.ink}; }
.on-dark .tx-btn-line { color: ${C.porcelain}; border-color: rgba(238,242,247,.28); }
.on-dark .tx-btn-line:hover { border-color: ${C.porcelain}; background: rgba(238,242,247,.06); }

/* ── Nav ── */
.tx-nav {
  position: sticky; top: 0; z-index: 300;
  display: flex; align-items: center; justify-content: space-between; gap: 24px;
  height: 68px; padding: 0 clamp(20px,4vw,40px);
  background: rgba(7,16,30,.86); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid ${C.darkRule}; color: ${C.porcelain};
}
.nav-links { display: flex; gap: 28px; }
.nav-link  { font-size: 15px; color: ${C.onDark}; font-weight: 500; transition: color .15s; }
.nav-link:hover { color: #fff; }
.nav-cta   { display: flex; gap: 10px; align-items: center; }
.hamburger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 8px; }
.mobile-menu {
  position: fixed; top: 68px; left: 0; right: 0; z-index: 299;
  background: ${C.night2}; padding: 8px 20px 20px; display: flex; flex-direction: column;
  border-bottom: 1px solid ${C.darkRule}; animation: menuOpen .2s ease both;
}
.mobile-menu .nav-link { padding: 14px 0; font-size: 17px; border-bottom: 1px solid ${C.darkRule}; }
@supports (padding-top: env(safe-area-inset-top)) {
  .tx-nav { padding-top: env(safe-area-inset-top); height: calc(68px + env(safe-area-inset-top)); }
  .mobile-menu { top: calc(68px + env(safe-area-inset-top)); }
}

/* ── Hero ── */
.hero { position: relative; overflow: hidden; background: radial-gradient(120% 90% at 78% 30%, #13284A 0%, ${C.night} 60%); color: ${C.porcelain}; }
.hero-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1.05fr); gap: 40px; align-items: center; min-height: clamp(640px, calc(100vh - 108px), 860px); padding: 64px 0 72px; }
.tx-h1 { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: clamp(54px,6.6vw,96px); line-height: .96; letter-spacing: -.015em; animation: rise .9s cubic-bezier(.22,1,.36,1) both; }
.hero-sub  { font-size: clamp(17px,1.4vw,19px); color: ${C.onDark}; max-width: 30em; margin-top: 24px; animation: rise .9s cubic-bezier(.22,1,.36,1) .1s both; }
.hero-btns { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 32px; animation: rise .9s cubic-bezier(.22,1,.36,1) .2s both; }
.hero-assets { display: flex; flex-wrap: wrap; gap: 8px 20px; margin-top: 40px; font-size: 14.5px; color: ${C.onDarkDim}; animation: rise .9s cubic-bezier(.22,1,.36,1) .3s both; }
.hero-assets span { display: inline-flex; align-items: center; gap: 8px; }
.hero-assets i { width: 6px; height: 6px; border-radius: 50%; background: ${C.gold}; }

/* Hero composite: a desk of floating instruments over a globe */
.desk { position: relative; height: 560px; perspective: 1600px; animation: fadeIn 1.2s ease .2s both; }
.desk-inner { position: absolute; inset: 0; transform-style: preserve-3d; transition: transform .5s cubic-bezier(.22,1,.36,1); }
.plate { position: absolute; transform-style: preserve-3d; }
.globe { position: absolute; left: 50%; top: 50%; width: 560px; height: 560px; margin: -280px 0 0 -280px; opacity: .9; }
.glass {
  background: linear-gradient(160deg, rgba(27,45,74,.92), rgba(12,26,46,.94));
  border: 1px solid rgba(238,242,247,.12); border-radius: 16px;
  box-shadow: 0 1px 0 rgba(255,255,255,.08) inset, 0 40px 80px -30px rgba(0,0,0,.75);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); color: ${C.porcelain};
}
.float-a { animation: floatY 7s ease-in-out infinite; }
.float-b { animation: floatY 8s ease-in-out -3s infinite; }
.float-c { animation: floatY 9s ease-in-out -5s infinite; }
.chip-dot { width: 8px; height: 8px; border-radius: 50%; background: ${C.gainLit}; box-shadow: 0 0 0 4px rgba(47,211,148,.18); }
.glass-lbl { font-size: 12.5px; color: ${C.onDarkDim}; }
.glass-val { font-size: 15px; font-weight: 600; }

/* ── Ticker ── */
.tx-ticker { height: 44px; background: ${C.night2}; border-top: 1px solid ${C.darkRule}; border-bottom: 1px solid ${C.darkRule}; overflow: hidden; display: flex; align-items: center; }
.tx-ticker-track { display: inline-flex; white-space: nowrap; animation: tickerScroll 60s linear infinite; }
.tx-ticker-item { display: inline-flex; align-items: center; gap: 10px; padding: 0 24px; font-size: 14px; border-right: 1px solid ${C.darkRule}; }

/* ── Product explorer (porcelain) ── */
.explorer { margin-top: 48px; }
.ex-tabs { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 12px; margin-bottom: 20px; }
.ex-tab {
  display: flex; gap: 14px; align-items: flex-start; text-align: left; cursor: pointer;
  background: transparent; border: 1px solid ${C.line}; border-radius: 14px; padding: 16px;
  color: ${C.inkMid}; transition: border-color .15s, background .15s, box-shadow .15s;
}
.ex-tab:hover { border-color: ${C.lineStrong}; background: rgba(255,255,255,.5); }
.ex-tab[aria-selected="true"] { background: ${C.white}; border-color: ${C.ink}; box-shadow: 0 16px 30px -22px rgba(11,22,40,.5); }
.ex-tab-art { flex-shrink: 0; width: 44px; height: 44px; border-radius: 11px; background: ${C.night}; display: flex; align-items: center; justify-content: center; }
.ex-tab[aria-selected="true"] .ex-tab-art { background: ${C.gold}; }
.ex-tab-art { color: ${C.porcelain}; }
.ex-tab[aria-selected="true"] .ex-tab-art { color: ${C.night}; }
.ex-tab-t { display: block; font-size: 16.5px; font-weight: 700; color: ${C.ink}; line-height: 1.3; }
.ex-tab-s { display: block; font-size: 14px; line-height: 1.4; margin-top: 2px; }
.ex-panel { animation: fadeUp .35s cubic-bezier(.22,1,.36,1) both; }

.mx { background: ${C.white}; color: ${C.ink}; border: 1px solid ${C.line}; border-radius: 18px; overflow: hidden; box-shadow: 0 40px 70px -50px rgba(11,22,40,.55); }
.mx-head, .mx-row { display: grid; grid-template-columns: minmax(0,1fr) 96px minmax(0,1fr); }
.mx-head { background: ${C.porcelain}; border-bottom: 1px solid ${C.line}; }
.mx-head > div { padding: 18px 24px; display: flex; align-items: center; gap: 14px; }
.mx-head .mx-mid { justify-content: center; padding: 0; }
.mx-who  { font-weight: 700; font-size: 16.5px; line-height: 1.3; }
.mx-what { font-size: 14.5px; color: ${C.inkMid}; line-height: 1.4; }
.mx-body { position: relative; }
.mx-body::before { content: ''; position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; margin-left: -1px; background: ${C.gold}; }
.mx-row  { border-bottom: 1px solid ${C.line}; align-items: center; min-height: 62px; }
.mx-lead, .mx-you { padding: 14px 24px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 15px; }
.mx-you  { justify-content: space-between; }
.mx-time { font-size: 13px; color: ${C.inkDim}; }
.mx-pair { font-weight: 700; }
.mx-side { font-size: 12.5px; font-weight: 700; padding: 2px 9px; border-radius: 6px; }
.mx-side.buy  { color: ${C.gain}; background: ${C.gainSoft}; }
.mx-side.sell { color: ${C.loss}; background: ${C.lossSoft}; }
.mx-link { position: relative; z-index: 1; justify-self: center; background: ${C.white}; border: 1.5px solid ${C.gold}; border-radius: 999px; padding: 2px 10px; font-size: 12.5px; font-weight: 600; }
.mx-filled { font-size: 13px; font-weight: 600; color: ${C.gain}; }
.mx-row.is-new { animation: flash 1.8s ease .45s both; }
.mx-row.is-new .mx-lead { animation: leadIn .45s cubic-bezier(.22,1,.36,1) both; }
.mx-row.is-new .mx-link { animation: pop .3s ease .3s both; }
.mx-row.is-new .mx-you  { animation: copyIn .45s cubic-bezier(.22,1,.36,1) .42s both; }
.mx-foot { display: grid; grid-template-columns: repeat(3,1fr); background: ${C.porcelain}; }
.mx-foot > div { padding: 16px 24px; border-right: 1px solid ${C.line}; }
.mx-foot > div:last-child { border-right: none; }
.mx-foot-lbl { font-size: 13.5px; color: ${C.inkMid}; }
.mx-foot-val { font-size: 18px; font-weight: 700; }
.mx-cta { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 16px 24px; background: ${C.porcelain}; border-top: 1px solid ${C.line}; }
.mx-note { font-size: 14px; color: ${C.inkMid}; }

.split { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); }
.split > div { padding: 24px; }
.split > div + div { border-left: 1px solid ${C.line}; }
.terms li { display: flex; justify-content: space-between; gap: 16px; padding: 11px 0; border-bottom: 1px solid ${C.line}; font-size: 15px; }
.terms li:last-child { border-bottom: none; }
.terms li span:first-child { color: ${C.inkMid}; }
.terms li span:last-child { font-weight: 600; text-align: right; }
.panel-h { font-size: 15.5px; font-weight: 700; margin-bottom: 12px; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.chip { height: 34px; padding: 0 14px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; background: transparent; border: 1px solid ${C.lineStrong}; color: ${C.ink}; }
.chip[aria-pressed="true"] { background: ${C.ink}; border-color: ${C.ink}; color: ${C.porcelain}; }
.fee-bar { display: flex; height: 12px; border-radius: 6px; overflow: hidden; margin: 6px 0 14px; }
.fee-bar span:first-child { background: ${C.gain}; }
.fee-bar span:last-child  { background: ${C.gold}; }
.watch-row { display: grid; grid-template-columns: 64px minmax(0,1fr) auto 72px; gap: 12px; align-items: center; width: 100%; padding: 12px 24px; border: none; border-bottom: 1px solid ${C.line}; background: none; font-size: 15px; text-align: left; cursor: pointer; color: ${C.ink}; }
.watch-row:hover { background: ${C.porcelain}; }
.watch-row[aria-pressed="true"] { background: ${C.goldSoft}; box-shadow: inset 3px 0 0 ${C.gold}; }
.watch-row:last-child { border-bottom: none; }
.ticket-side { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid ${C.lineStrong}; border-radius: 10px; overflow: hidden; margin-bottom: 16px; }
.ticket-side button { height: 40px; border: none; background: none; font-size: 15px; font-weight: 600; cursor: pointer; color: ${C.inkMid}; }
.ticket-side button[aria-pressed="true"].buy  { background: ${C.gain}; color: #fff; }
.ticket-side button[aria-pressed="true"].sell { background: ${C.loss}; color: #fff; }
.amount { display: flex; align-items: center; border: 1px solid ${C.lineStrong}; border-radius: 10px; padding: 0 14px; height: 50px; margin-bottom: 10px; background: ${C.white}; }
.amount:focus-within { border-color: ${C.ink}; }
.amount input { flex: 1; min-width: 0; border: none; outline: none; font-size: 19px; font-weight: 600; font-family: inherit; color: ${C.ink}; background: none; }
.prop-row { display: grid; grid-template-columns: 112px minmax(0,2fr) repeat(2,minmax(0,.8fr)) minmax(0,1.3fr) 88px; gap: 20px; align-items: center; padding: 16px 24px; border-bottom: 1px solid ${C.line}; }
.prop-row:last-child { border-bottom: none; }
.prop-thumb { width: 112px; height: 76px; border-radius: 10px; overflow: hidden; background: ${C.night2}; }
.prop-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.prop-name { font-weight: 700; font-size: 16.5px; line-height: 1.3; }
.prop-meta { font-size: 14px; color: ${C.inkMid}; line-height: 1.35; }
.prop-lbl  { font-size: 13px; color: ${C.inkMid}; }
.prop-val  { font-size: 17px; font-weight: 700; }
.progress  { height: 8px; border-radius: 4px; background: ${C.porcelain2}; overflow: hidden; margin-top: 6px; }
.progress span { display: block; height: 100%; background: ${C.gold}; border-radius: 4px; }

/* ── Leaderboard ── */
.sec-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 32px; flex-wrap: wrap; margin-bottom: 40px; }
.text-link { font-weight: 600; font-size: 15.5px; border-bottom: 2px solid ${C.gold}; padding-bottom: 2px; }
.text-link:hover { border-bottom-color: currentColor; }
.lb { background: ${C.white}; border: 1px solid ${C.line}; border-radius: 18px; padding: 4px 24px; }
.lb-row { display: grid; grid-template-columns: minmax(0,2.3fr) repeat(5,minmax(0,1fr)) 92px 168px; gap: 16px; align-items: center; padding: 16px 0; border-bottom: 1px solid ${C.line}; }
.lb-row:last-child { border-bottom: none; }
.lb-head { font-size: 13.5px; color: ${C.inkMid}; padding: 14px 0 10px; }
.lb-n    { text-align: right; font-size: 15.5px; font-weight: 600; }
.lb-lbl  { display: none; font-size: 12.5px; font-weight: 400; color: ${C.inkDim}; }
.lb-trader { display: flex; align-items: center; gap: 14px; min-width: 0; }
.lb-name  { font-weight: 700; font-size: 16.5px; line-height: 1.3; }
.lb-style { font-size: 14px; color: ${C.inkMid}; line-height: 1.3; }
.lb-act   { display: flex; gap: 8px; justify-content: flex-end; }
.tag-top { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; margin-left: 8px; white-space: nowrap; color: ${C.goldDeep}; }
.tag-top::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: ${C.gold}; }

/* ── How it works: equity curve ── */
.curve-art { margin-top: 48px; }
.steps { display: grid; grid-template-columns: repeat(4,1fr); gap: 0 32px; margin-top: 8px; }
.step h3 { font-size: 20px; font-weight: 700; margin-bottom: 6px; color: #fff; }
.step p  { font-size: 16px; color: ${C.onDark}; }
.step-n  { display: none; width: 34px; height: 34px; border-radius: 50%; background: ${C.gold}; color: ${C.night}; font-weight: 700; align-items: center; justify-content: center; margin-bottom: 12px; }

/* ── Features with app mockup ── */
.feat { display: grid; grid-template-columns: minmax(0,.9fr) minmax(0,1.1fr); gap: 80px; align-items: center; }
.feat-list { display: grid; grid-template-columns: 1fr 1fr; gap: 36px 40px; margin-top: 40px; }
.feat-item h3 { font-size: 19px; font-weight: 700; margin-bottom: 6px; }
.feat-item p  { font-size: 15.5px; color: ${C.inkMid}; }
.feat-item a  { display: inline-block; margin-top: 10px; }
.phone-stage { position: relative; display: flex; justify-content: center; padding: 36px 0; }
.phone { width: 300px; border-radius: 44px; padding: 12px; background: ${C.night}; box-shadow: 0 0 0 1px #2A3A55, 0 60px 100px -40px rgba(11,22,40,.7); position: relative; z-index: 2; }
.phone-screen { border-radius: 34px; background: ${C.night2}; color: ${C.porcelain}; padding: 44px 20px 22px; overflow: hidden; position: relative; }
.phone-notch { position: absolute; top: 12px; left: 50%; width: 92px; height: 24px; margin-left: -46px; background: ${C.night}; border-radius: 14px; }
.alloc li { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid ${C.darkRule}; font-size: 14px; }
.alloc li:last-child { border-bottom: none; }
.alloc i { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.side-card { position: absolute; z-index: 3; background: ${C.white}; border: 1px solid ${C.line}; border-radius: 14px; padding: 12px 14px; box-shadow: 0 24px 50px -24px rgba(11,22,40,.5); font-size: 14px; }

/* ── Testimonials ── */
.testi { display: grid; grid-template-columns: minmax(0,1.3fr) minmax(0,1fr); gap: 64px; margin-top: 48px; }
.testi-main q { display: block; font-family: 'Instrument Serif', Georgia, serif; font-size: clamp(28px,3.2vw,42px); line-height: 1.15; quotes: "\\201C" "\\201D"; }
.testi-side { display: flex; flex-direction: column; gap: 32px; }
.testi-side figure { border-top: 1px solid ${C.lineStrong}; padding-top: 20px; }
.testi-side q { display: block; font-size: 18px; line-height: 1.5; quotes: "\\201C" "\\201D"; }
.testi figcaption { display: flex; align-items: center; gap: 12px; margin-top: 20px; font-size: 15px; color: ${C.inkMid}; }
.testi figcaption strong { display: block; color: ${C.ink}; font-weight: 700; }

/* ── Security ── */
.sec-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; margin-top: 48px; }
.sec-item { border: 1px solid ${C.darkRule}; border-radius: 16px; padding: 28px; background: rgba(255,255,255,.02); }
.sec-item h3 { font-size: 20px; font-weight: 700; margin: 20px 0 8px; }
.sec-item p  { font-size: 16px; color: ${C.onDark}; }
.badges { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 32px; }
.badges li { font-size: 14px; font-weight: 600; color: ${C.onDark}; border: 1px solid ${C.darkRule}; border-radius: 8px; padding: 6px 12px; }

/* ── CTA with market sessions ── */
.cta { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 72px; align-items: center; }
.cta-form { display: flex; gap: 10px; margin-top: 32px; }
.cta-input { flex: 1; min-width: 0; height: 52px; padding: 0 16px; border-radius: 10px; background: rgba(238,242,247,.06); border: 1px solid rgba(238,242,247,.24); color: #fff; font-size: 16px; font-family: inherit; outline: none; transition: border-color .15s; }
.cta-input::placeholder { color: ${C.onDarkDim}; }
.cta-input:focus { border-color: ${C.gold}; }
.cta .tx-btn { height: 52px; }
.sessions { border-radius: 18px; overflow: hidden; }
.session { display: grid; grid-template-columns: minmax(0,1.2fr) minmax(0,1fr) 150px; gap: 16px; align-items: center; padding: 16px 22px; border-bottom: 1px solid ${C.darkRule}; }
.session:last-child { border-bottom: none; }
.session-bar { position: relative; height: 6px; border-radius: 3px; background: rgba(238,242,247,.1); }
.session-bar span { position: absolute; top: 0; bottom: 0; border-radius: 3px; background: ${C.blue}; }
.session-bar b { position: absolute; top: -4px; width: 2px; height: 14px; background: ${C.gold}; }
.status { display: inline-flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 600; white-space: nowrap; }
.status i { width: 7px; height: 7px; border-radius: 50%; }

/* ── Registration & documents ── */
.reg { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,.95fr); gap: 64px; align-items: center; }
.reg-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 24px; }
.reg-frame { position: relative; background: ${C.white}; border: 1px solid ${C.line}; border-radius: 18px; padding: 18px; box-shadow: 0 40px 70px -50px rgba(11,22,40,.55); }
.reg-frame img { display: block; width: 100%; height: auto; border-radius: 8px; }
.reg-docs { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.reg-docs.single { grid-template-columns: 1fr; }
.reg-thumb { position: relative; display: block; width: 100%; padding: 0; border: 1px solid ${C.line}; border-radius: 10px; overflow: hidden; background: ${C.porcelain}; cursor: zoom-in; transition: border-color .15s, box-shadow .15s, transform .15s; }
.reg-thumb:hover { border-color: ${C.gold}; box-shadow: 0 16px 30px -20px rgba(11,22,40,.55); transform: translateY(-2px); }
.reg-thumb img { display: block; width: 100%; aspect-ratio: .77; object-fit: cover; object-position: top; border-radius: 0; }
.reg-thumb span { position: absolute; left: 8px; bottom: 8px; font-size: 12px; font-weight: 600; padding: 3px 9px; border-radius: 6px; background: rgba(7,16,30,.78); color: ${C.porcelain}; }
.reg-lightbox { position: fixed; inset: 0; z-index: 1000; background: rgba(5,12,23,.88); display: flex; align-items: center; justify-content: center; padding: 64px 20px 24px; animation: fadeIn .2s ease both; }
.reg-lightbox img { max-width: min(900px, 100%); max-height: 100%; object-fit: contain; border-radius: 10px; box-shadow: 0 40px 90px -30px rgba(0,0,0,.8); background: #fff; }
.reg-lb-btn { position: absolute; width: 44px; height: 44px; border-radius: 50%; border: 1px solid rgba(238,242,247,.3); background: rgba(7,16,30,.6); color: #fff; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.reg-lb-btn:hover { border-color: ${C.gold}; color: ${C.gold}; }
.reg-lb-close { top: 16px; right: 16px; }
.reg-lb-prev { left: 16px; top: 50%; margin-top: -22px; }
.reg-lb-next { right: 16px; top: 50%; margin-top: -22px; }
.reg-lb-count { position: absolute; top: 26px; left: 50%; transform: translateX(-50%); color: ${C.onDark}; font-size: 14px; }
.reg-doc { position: relative; aspect-ratio: 0.77; border-radius: 8px; overflow: hidden; background: #FBFAF6; border: 2px dashed ${C.lineStrong}; display: flex; flex-direction: column; align-items: center; padding: 9% 11%; gap: 4%; }
.reg-doc .bar { height: 2.4%; border-radius: 4px; background: ${C.porcelain2}; }
.reg-doc .bar.dark { background: ${C.lineStrong}; }
.reg-doc .mark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
.reg-doc .mark span { transform: rotate(-24deg); font-size: clamp(36px, 6vw, 64px); font-weight: 700; letter-spacing: .12em; color: rgba(11,22,40,.08); text-transform: uppercase; }
.reg-caption { display: flex; align-items: center; gap: 8px; margin-top: 14px; font-size: 14px; color: ${C.inkMid}; }
.reg-caption b { display: inline-flex; height: 22px; padding: 0 8px; align-items: center; border-radius: 6px; background: ${C.goldSoft}; color: ${C.goldDeep}; font-size: 12px; }
@media (max-width: 900px) { .reg { grid-template-columns: 1fr; gap: 40px; } }

/* ── Footer ── */
.tx-footer { background: #050C17; color: ${C.porcelain}; padding: 64px clamp(20px,5vw,56px) 32px; }
.footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; margin-bottom: 48px; }
.footer-h { font-size: 14px; font-weight: 600; color: ${C.onDarkDim}; margin-bottom: 14px; }
.footer-link { display: block; font-size: 15px; color: ${C.onDark}; margin-bottom: 10px; transition: color .15s; }
.footer-link:hover { color: ${C.gold}; }
.social { width: 38px; height: 38px; border-radius: 10px; border: 1px solid ${C.darkRule}; display: flex; align-items: center; justify-content: center; color: ${C.onDark}; transition: background .15s, color .15s, border-color .15s; }
.social:hover { background: ${C.gold}; border-color: ${C.gold}; color: ${C.night}; }
.footer-bottom { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; padding-top: 24px; border-top: 1px solid ${C.darkRule}; font-size: 13.5px; color: ${C.onDarkDim}; }

/* ── Language switcher ── */
.lang-switcher { position: relative; display: inline-flex; }
.lang-btn { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 12px; background: transparent; border: 1px solid rgba(238,242,247,.2); border-radius: 10px; font-size: 14px; font-weight: 500; color: ${C.onDark}; cursor: pointer; white-space: nowrap; }
.lang-btn:hover { border-color: rgba(238,242,247,.5); color: #fff; }
.lang-dropdown { position: absolute; top: calc(100% + 8px); right: 0; z-index: 400; min-width: 190px; background: ${C.white}; border-radius: 12px; padding: 6px; box-shadow: 0 20px 44px -12px rgba(0,0,0,.45); animation: menuOpen .18s ease both; }
.lang-option { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border-radius: 8px; font-size: 14.5px; color: ${C.inkMid}; cursor: pointer; background: none; border: none; text-align: left; }
.lang-option:hover { background: ${C.porcelain}; color: ${C.ink}; }
.lang-option.active { color: ${C.ink}; font-weight: 600; background: ${C.goldSoft}; }

.cookie-banner { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 999; width: calc(100% - 40px); max-width: 720px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; background: ${C.white}; border: 1px solid ${C.line}; border-radius: 16px; padding: 20px 24px; box-shadow: 0 30px 70px -20px rgba(11,22,40,.45); animation: cookieSlide .5s cubic-bezier(.22,1,.36,1) 1.4s both; }

.goog-te-banner-frame, #goog-gt-tt, .goog-te-balloon-frame { display: none !important; }
body { top: 0 !important; }
.skiptranslate { display: none !important; }
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: ${C.porcelain}; }
::-webkit-scrollbar-thumb { background: ${C.lineStrong}; border-radius: 4px; }

@keyframes tickerScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes rise   { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes floatY { 0%,100% { translate: 0 0; } 50% { translate: 0 -10px; } }
@keyframes leadIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
@keyframes copyIn { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: none; } }
@keyframes pop    { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: none; } }
@keyframes flash  { from { background: ${C.goldSoft}; } to { background: transparent; } }
@keyframes spin   { to { transform: rotate(360deg); } }
@keyframes arc    { from { stroke-dashoffset: 400; } to { stroke-dashoffset: 0; } }
@keyframes blip   { 0% { r: 3; opacity: .9; } 100% { r: 16; opacity: 0; } }
@keyframes menuOpen { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@keyframes cookieSlide { from { transform: translateX(-50%) translateY(120%); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }

@media (max-width: 1100px) {
  .hero-grid { grid-template-columns: 1fr; min-height: 0; gap: 16px; padding: 56px 0 40px; }
  .desk { height: 520px; max-width: 640px; width: 100%; margin: 0 auto; }
  .feat { grid-template-columns: 1fr; gap: 56px; }
}
@media (max-width: 1000px) {
  .nav-links, .nav-cta { display: none; }
  .hamburger { display: flex; }
  .ex-tabs { grid-template-columns: 1fr 1fr; }
  .lb-row { grid-template-columns: minmax(0,2fr) repeat(4,minmax(0,1fr)) 160px; }
  .lb-col-month, .lb-spark { display: none; }
  .prop-row { grid-template-columns: 112px minmax(0,2fr) repeat(2,minmax(0,.8fr)) minmax(0,1.2fr); }
  .prop-row .tx-btn { display: none; }
  .cta { grid-template-columns: 1fr; gap: 48px; }
}
@media (max-width: 760px) {
  .tx-section { padding: 80px 20px; }
  .hero-grid { padding: 40px 0 24px; }
  .tx-h1 { font-size: 52px; }
  .hero-btns .tx-btn { flex: 1; }
  .desk { height: 400px; transform: scale(.82); transform-origin: top center; margin-bottom: -60px; }
  .plate-extra { display: none; }
  .stats { gap: 24px !important; }
  .stats .serif { font-size: 34px !important; }
  .explorer { margin-top: 36px; }
  .ex-tabs { display: flex; overflow-x: auto; gap: 10px; margin: 0 -20px 16px; padding: 0 20px 4px; scrollbar-width: none; }
  .ex-tabs::-webkit-scrollbar { display: none; }
  .ex-tab { flex: 0 0 230px; }
  .mx-head { grid-template-columns: 1fr; }
  .mx-head > div { padding: 14px 16px; }
  .mx-head > div:last-child:not(:first-child) { border-top: 1px solid ${C.line}; }
  .mx-head .mx-mid, .mx-body::before { display: none; }
  .mx-row { grid-template-columns: 1fr; }
  .mx-lead { padding: 14px 16px 6px; }
  .mx-link { justify-self: start; margin-left: 16px; }
  .mx-you  { padding: 6px 16px 14px; }
  .mx-foot { grid-template-columns: 1fr; }
  .mx-foot > div { display: flex; justify-content: space-between; align-items: baseline; border-right: none; border-bottom: 1px solid ${C.line}; padding: 12px 16px; }
  .mx-foot > div:last-child { border-bottom: none; }
  .mx-cta { padding: 14px 16px; }
  .split { grid-template-columns: 1fr !important; }
  .split > div { padding: 18px 16px; }
  .split > div + div { border-left: none; border-top: 1px solid ${C.line}; }
  .watch-row { padding: 12px 16px; grid-template-columns: 56px minmax(0,1fr) auto; }
  .watch-row .spark-cell { display: none; }
  .prop-row { grid-template-columns: 1fr 1fr; padding: 16px; gap: 14px 16px; }
  .prop-row > .prop-thumb, .prop-row > .prop-title, .prop-row > .prop-fund, .prop-row .tx-btn { grid-column: 1 / -1; }
  .prop-row .tx-btn { display: inline-flex; }
  .prop-thumb { width: 100%; height: 160px; }
  .lb { padding: 4px 16px; }
  .lb-head { display: none; }
  .lb-row  { grid-template-columns: 1fr 1fr; row-gap: 14px; padding: 22px 0; }
  .lb-trader, .lb-act { grid-column: 1 / -1; }
  .lb-col-month { display: block; }
  .lb-n    { text-align: left; }
  .lb-lbl  { display: block; }
  .lb-act  { justify-content: stretch; }
  .lb-act .tx-btn { flex: 1; }
  .curve-art { display: none; }
  .steps { grid-template-columns: 1fr; gap: 32px; margin-top: 40px; }
  .step-n { display: flex; }
  .feat-list, .sec-grid, .testi { grid-template-columns: 1fr; }
  .testi { gap: 40px; }
  .side-card { display: none; }
  .cta-form { flex-direction: column; }
  .session { grid-template-columns: 1fr auto; padding: 14px 16px; }
  .session-bar { grid-column: 1 / -1; grid-row: 2; }
  .footer-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
  .footer-grid { grid-template-columns: 1fr; }
  .footer-bottom { flex-direction: column; align-items: flex-start; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .001ms !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
  html { scroll-behavior: auto; }
  .desk-inner { transform: none !important; }
}
`;

/* ─────────────────────────────────────────────
   GRAPHICS KIT — all drawn in code, no image files
───────────────────────────────────────────── */
const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

const AVATAR_BG = ["#1C3A6E", "#6A4516", "#1F5A4E", "#4A2A62", "#2B3D5C"];
const Avatar = ({ initials, seed = 0, size = 44, ring = false }) => (
  <div aria-hidden="true" style={{
    width:size, height:size, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
    background:`linear-gradient(145deg, ${AVATAR_BG[seed % AVATAR_BG.length]}, ${C.night})`,
    color:C.gold, fontWeight:700, fontSize:size * .34, letterSpacing:".02em",
    boxShadow: ring ? `0 0 0 2px ${C.white}, 0 0 0 4px ${C.gold}` : "none",
  }}>{initials}</div>
);

/* ── Wireframe globe with exchange pins and trade arcs ── */
const EXCHANGES = [
  { x:168, y:232 }, { x:268, y:196 }, { x:284, y:300 }, { x:342, y:252 }, { x:428, y:234 }, { x:410, y:360 },
];
const ARCS = [[0,1],[1,3],[3,4],[1,2],[4,5],[0,2]];
const Globe = () => {
  const R = 230, cx = 280, cy = 280;
  const lats = [-60,-40,-20,0,20,40,60];
  const lons = [15,35,55,75];
  return (
    <svg className="globe" viewBox="0 0 560 560" aria-hidden="true">
      <defs>
        <radialGradient id="globeFill" cx=".38" cy=".32">
          <stop offset="0" stopColor="#1B3560" stopOpacity=".9" />
          <stop offset="1" stopColor={C.night} stopOpacity=".2" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="url(#globeFill)" stroke="rgba(91,140,255,.55)" />
      {lats.map(l => {
        const rad = l * Math.PI / 180;
        return <ellipse key={l} cx={cx} cy={cy - R * Math.sin(rad)} rx={R * Math.cos(rad)} ry={R * Math.cos(rad) * .16} fill="none" stroke="rgba(91,140,255,.26)" />;
      })}
      <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke="rgba(91,140,255,.26)" />
      {lons.map(l => <ellipse key={l} cx={cx} cy={cy} rx={R * Math.sin(l * Math.PI / 180)} ry={R} fill="none" stroke="rgba(91,140,255,.26)" />)}
      {ARCS.map(([a, b], i) => {
        const p = EXCHANGES[a], q = EXCHANGES[b];
        const mx = (p.x + q.x) / 2, my = Math.min(p.y, q.y) - 60;
        return <path key={i} d={`M${p.x},${p.y} Q${mx},${my} ${q.x},${q.y}`} fill="none" stroke={C.gold} strokeWidth="1.4" strokeDasharray="400" style={{ animation:`arc 2.4s cubic-bezier(.22,1,.36,1) ${.4 + i * .25}s both` }} opacity=".75" />;
      })}
      {EXCHANGES.map((e, i) => (
        <g key={i}>
          <circle cx={e.x} cy={e.y} r="3" fill={C.gold}>
            <animate attributeName="r" values="3;16" dur="2.6s" begin={`${i * .45}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values=".8;0" dur="2.6s" begin={`${i * .45}s`} repeatCount="indefinite" />
          </circle>
          <circle cx={e.x} cy={e.y} r="3.5" fill={C.gold} />
        </g>
      ))}
    </svg>
  );
};

/* ── Live candlestick chart ── */
const seedCandles = () => {
  const r = rng(42); let p = 118; const out = [];
  for (let i = 0; i < 30; i++) {
    const o = p, c = o + (r() - .42) * 2.4;
    out.push({ o, c, h: Math.max(o, c) + r() * 1.2, l: Math.min(o, c) - r() * 1.2 });
    p = c;
  }
  return out;
};
const CandleChart = ({ w = 360, h = 150 }) => {
  const [candles, setCandles] = useState(seedCandles);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let tick = 0;
    const id = setInterval(() => {
      if (document.hidden) return;
      tick++;
      setCandles(cs => {
        const next = cs.slice();
        const last = { ...next[next.length - 1] };
        last.c = last.c + (Math.random() - .45) * .9;
        last.h = Math.max(last.h, last.c); last.l = Math.min(last.l, last.c);
        next[next.length - 1] = last;
        if (tick % 6 === 0) { next.shift(); next.push({ o:last.c, c:last.c, h:last.c, l:last.c }); }
        return next;
      });
    }, 900);
    return () => clearInterval(id);
  }, []);
  const lo = Math.min(...candles.map(c => c.l)), hi = Math.max(...candles.map(c => c.h));
  const y = v => 8 + (1 - (v - lo) / (hi - lo)) * (h - 16);
  const cw = w / candles.length;
  const last = candles[candles.length - 1].c;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {[0,1,2,3].map(i => <line key={i} x1="0" x2={w} y1={10 + i * (h - 20) / 3} y2={10 + i * (h - 20) / 3} stroke="rgba(238,242,247,.07)" />)}
      {candles.map((c, i) => {
        const up = c.c >= c.o, col = up ? C.gainLit : C.lossLit, x = i * cw + cw / 2;
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={col} strokeWidth="1.2" />
            <rect x={x - cw * .3} width={cw * .6} y={y(Math.max(c.o, c.c))} height={Math.max(1.5, Math.abs(y(c.o) - y(c.c)))} fill={col} rx="1" />
          </g>
        );
      })}
      <line x1="0" x2={w} y1={y(last)} y2={y(last)} stroke={C.gold} strokeDasharray="3 4" strokeWidth="1" />
    </svg>
  );
};

/* ── Hero composite: floating instruments over the globe ── */
const HeroDesk = () => {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x:0, y:0 });
  const [price, setPrice] = useState(124.30);
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) setPrice(p => +(p + (Math.random() - .45) * .18).toFixed(2)); }, 900);
    return () => clearInterval(id);
  }, []);
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    setTilt({ x: ((e.clientY - r.top) / r.height - .5) * -7, y: ((e.clientX - r.left) / r.width - .5) * 9 });
  };
  const chg = ((price - 121.72) / 121.72) * 100;
  return (
    <div className="desk" ref={ref} onMouseMove={onMove} onMouseLeave={() => setTilt({ x:0, y:0 })} aria-hidden="true">
      <div className="desk-inner" style={{ transform:`rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}>
        <div className="plate" style={{ inset:0, transform:"translateZ(-80px)" }}><Globe /></div>

        <div className="plate" style={{ left:"4%", top:"96px", width:"min(420px,78%)", transform:"translateZ(20px)" }}>
          <div className="glass float-a" style={{ padding:"18px 18px 12px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px" }}>
              <div>
                <div className="glass-lbl">NVIDIA Corp. <span style={{ color:C.onDark }}>NVDA</span></div>
                <div className="num" style={{ fontSize:"28px", fontWeight:700, lineHeight:1.2 }}>${price.toFixed(2)}</div>
                <div className="num" style={{ fontSize:"13.5px", fontWeight:600, color: chg >= 0 ? C.gainLit : C.lossLit }}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}% today</div>
              </div>
              <div style={{ display:"flex", gap:"4px" }}>
                {["1H","1D","1W"].map((t, i) => <span key={t} style={{ fontSize:"12px", fontWeight:600, padding:"4px 9px", borderRadius:"7px", background: i === 1 ? "rgba(226,174,74,.18)" : "transparent", color: i === 1 ? C.gold : C.onDarkDim }}>{t}</span>)}
              </div>
            </div>
            <CandleChart />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginTop:"12px" }}>
              <span style={{ textAlign:"center", padding:"9px", borderRadius:"9px", background:C.gainLit, color:C.night, fontWeight:700, fontSize:"14px" }}>Buy</span>
              <span style={{ textAlign:"center", padding:"9px", borderRadius:"9px", border:`1px solid ${C.darkRule}`, fontWeight:600, fontSize:"14px" }}>Sell</span>
            </div>
          </div>
        </div>

        <div className="plate" style={{ right:"0", top:"18px", width:"270px", transform:"translateZ(90px)" }}>
          <div className="glass float-b" style={{ padding:"14px 16px", display:"flex", gap:"12px", alignItems:"center" }}>
            <Avatar initials="MW" size={40} />
            <div>
              <div className="glass-val">Marcus Webb bought BTC</div>
              <div className="glass-lbl num">Copied to you: 0.08 BTC in 38 ms</div>
            </div>
          </div>
        </div>

        <div className="plate plate-extra" style={{ right:"0", top:"330px", width:"236px", transform:"translateZ(130px)" }}>
          <div className="glass float-c" style={{ overflow:"hidden" }}>
            <div style={{ height:"104px" }}><PropertyArt type="office" /></div>
            <div style={{ padding:"12px 14px" }}>
              <div className="glass-val">Marina Business Suites</div>
              <div className="glass-lbl">Dubai. Target yield 8.1%</div>
              <div style={{ height:"6px", borderRadius:"3px", background:"rgba(238,242,247,.12)", marginTop:"10px" }}><div style={{ width:"64%", height:"100%", borderRadius:"3px", background:C.gold }} /></div>
            </div>
          </div>
        </div>

        <div className="plate plate-extra" style={{ left:"0", bottom:"8px", width:"250px", transform:"translateZ(60px)" }}>
          <div className="glass float-b" style={{ padding:"12px 16px", display:"flex", gap:"12px", alignItems:"center" }}>
            <span className="chip-dot" />
            <div>
              <div className="glass-val">Priya Sharma manages $10,000</div>
              <div className="glass-lbl num">Hired trader, <span style={{ color:C.gainLit }}>+3.2% this month</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Product tab icons ── */
const TabArt = ({ id }) => {
  const st = { stroke:"currentColor", strokeWidth:1.8, fill:"none", strokeLinecap:"round", strokeLinejoin:"round" };
  return (
    <span className="ex-tab-art">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className="tab-ico">
        {id === "copy" && <><path d="M3 15l5-5 4 3 6-7" {...st} /><path d="M3 20l5-5 4 3 6-7" {...st} strokeDasharray="2 3" opacity=".7" /><path d="M15 6h3v3" {...st} /></>}
        {id === "hire" && <><circle cx="9" cy="8" r="3.2" {...st} /><path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5" {...st} /><path d="M16 12l2.5-2.5L21 12M18.5 9.5V17" {...st} /></>}
        {id === "stocks" && <><path d="M6 4v16M12 7v12M18 3v14" {...st} /><rect x="4" y="8" width="4" height="7" rx="1" {...st} /><rect x="10" y="10" width="4" height="5" rx="1" {...st} /><rect x="16" y="5" width="4" height="8" rx="1" {...st} /></>}
        {id === "property" && <><path d="M4 21V9l6-4v16M10 21V3l10 5v13M3 21h18" {...st} /><path d="M14 11h2M14 14h2M14 17h2M6.5 12h1M6.5 15h1" {...st} /></>}
      </svg>
    </span>
  );
};

/* ── Property renders at dusk (swap in a photo with `img` on the property) ── */
const PropertyArt = ({ type }) => {
  const id = `dusk-${type}`;
  const win = (x, y, w, h, cols, rows, seed) => {
    const r = rng(seed); const out = [];
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      out.push(<rect key={`${i}-${j}`} x={x + j * (w / cols) + 1} y={y + i * (h / rows) + 1} width={w / cols - 2.2} height={h / rows - 2.4} fill={r() > .45 ? C.gold : "#2A4166"} opacity={r() > .45 ? .95 : .9} />);
    }
    return out;
  };
  return (
    <svg width="100%" height="100%" viewBox="0 0 112 76" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14264A" />
          <stop offset=".62" stopColor="#3B4C7A" />
          <stop offset="1" stopColor="#E7A95A" />
        </linearGradient>
      </defs>
      <rect width="112" height="76" fill={`url(#${id})`} />
      <circle cx="84" cy="58" r="9" fill="#F4C77A" opacity=".8" />
      <path d="M0,62 h8 v-12 h6 v-8 h7 v20 h10 v-16 h6 v16 h12 v-10 h8 v10 h10 v-22 h7 v22 h12 v-14 h9 v14 h17 V76 H0 Z" fill="#1A2B4A" />
      {type === "office" && <g>
        <path d="M44,76 V14 L60,6 V76 Z" fill="#23385F" /><path d="M60,6 L70,12 V76 H60 Z" fill="#172846" />
        {win(46, 18, 12, 54, 2, 12, 3)}
        <rect x="74" y="34" width="14" height="42" fill="#1E3052" />{win(75, 37, 12, 36, 2, 7, 9)}
      </g>}
      {type === "flats" && <g>
        <rect x="30" y="24" width="40" height="52" fill="#2B3F66" /><rect x="30" y="20" width="40" height="5" fill="#1B2C4B" />
        {win(33, 28, 34, 44, 5, 7, 5)}
        <rect x="74" y="40" width="18" height="36" fill="#22355A" />{win(76, 43, 14, 30, 2, 5, 11)}
      </g>}
      {type === "terraces" && <g>
        {[0,1,2,3,4].map(i => (
          <g key={i}>
            <rect x={14 + i * 17} y="46" width="16" height="30" fill={i % 2 ? "#2B3F66" : "#324874"} />
            <polygon points={`${13 + i * 17},46 ${22 + i * 17},37 ${31 + i * 17},46`} fill="#1B2C4B" />
            <rect x={17 + i * 17} y="51" width="4" height="5" fill={C.gold} /><rect x={24 + i * 17} y="51" width="4" height="5" fill={i % 3 ? C.gold : "#2A4166"} />
            <rect x={20 + i * 17} y="63" width="5" height="13" fill="#1B2C4B" />
          </g>
        ))}
      </g>}
    </svg>
  );
};

/* ── How it works: an equity curve with four milestones ── */
const CW = 1220, CH = 230;
const CURVE_X = [60, 372, 684, 996];
const CURVE_Y = [182, 140, 100, 58];
const CurveArt = () => {
  const r = rng(12);
  const pts = [];
  for (let x = 0; x <= CW; x += 20) {
    const seg = CURVE_X.findIndex(cx => cx > x);
    const i = seg === -1 ? 3 : Math.max(0, seg - 1);
    const x0 = CURVE_X[i], x1 = CURVE_X[i + 1] || CW + 80, y0 = CURVE_Y[i], y1 = CURVE_Y[i + 1] ?? 26;
    const t = Math.max(0, Math.min(1, (x - x0) / (x1 - x0)));
    const base = x < CURVE_X[0] ? 200 - (x / CURVE_X[0]) * 18 : y0 + (y1 - y0) * t;
    const near = CURVE_X.some(cx => Math.abs(cx - x) < 14);
    pts.push([x, near ? base : base + (r() - .5) * 16]);
  }
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg className="curve-art" viewBox={`0 0 ${CW} ${CH}`} width="100%" aria-hidden="true">
      <defs>
        <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.gold} stopOpacity=".28" />
          <stop offset="1" stopColor={C.gold} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0,1,2,3].map(i => <line key={i} x1="0" x2={CW} y1={30 + i * 56} y2={30 + i * 56} stroke="rgba(238,242,247,.07)" />)}
      <path d={`${line} L${CW},${CH} L0,${CH} Z`} fill="url(#curveFill)" />
      <path d={line} fill="none" stroke={C.gold} strokeWidth="2.2" strokeLinejoin="round" />
      {CURVE_X.map((x, i) => (
        <g key={x} transform={`translate(${x} ${CURVE_Y[i]})`}>
          <line y1="20" y2={CH - CURVE_Y[i]} stroke="rgba(238,242,247,.18)" strokeDasharray="2 4" />
          <circle r="19" fill={C.night} stroke={C.gold} strokeWidth="2" />
          <text textAnchor="middle" dy="5.5" fontSize="16" fontWeight="700" fill={C.gold} fontFamily="inherit">{i + 1}</text>
        </g>
      ))}
    </svg>
  );
};

/* ── App mockup: one balance, four products ── */
const ALLOC = [
  { label:"Copy trading",   pct:35, val:"$8,701", color:C.gold },
  { label:"Stocks",         pct:30, val:"$7,458", color:C.blue },
  { label:"Hired traders",  pct:20, val:"$4,972", color:"#36C2B4" },
  { label:"Property shares",pct:15, val:"$3,729", color:"#C9D4E3" },
];
const Donut = () => {
  const R = 52, L = 2 * Math.PI * R; let acc = 0;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" style={{ margin:"4px auto 14px" }} aria-hidden="true">
      <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(238,242,247,.08)" strokeWidth="16" />
      {ALLOC.map(a => {
        const len = (a.pct / 100) * L - 3;
        const el = <circle key={a.label} cx="70" cy="70" r={R} fill="none" stroke={a.color} strokeWidth="16" strokeDasharray={`${len} ${L}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)" />;
        acc += (a.pct / 100) * L; return el;
      })}
      <text x="70" y="66" textAnchor="middle" fontSize="11" fill={C.onDarkDim} fontFamily="inherit">4 products</text>
      <text x="70" y="84" textAnchor="middle" fontSize="15" fontWeight="700" fill={C.porcelain} fontFamily="inherit">1 balance</text>
    </svg>
  );
};
const PhoneMockup = () => (
  <div className="phone-stage" aria-hidden="true">
    <div className="side-card" style={{ left:"0", bottom:"-8px" }}>
      <div style={{ color:C.inkMid, fontSize:"12.5px" }}>Rent paid, Riverside Apartments</div>
      <div className="num" style={{ fontWeight:700, color:C.gain }}>+$42.80</div>
    </div>
    <div className="side-card" style={{ right:"0", top:"-8px" }}>
      <div style={{ color:C.inkMid, fontSize:"12.5px" }}>Stop-loss on Marcus Webb</div>
      <div style={{ fontWeight:700 }}>Pause copying at −12%</div>
    </div>
    <div className="phone">
      <div className="phone-screen">
        <div className="phone-notch" />
        <div style={{ fontSize:"13px", color:C.onDarkDim }}>Total balance</div>
        <div className="num" style={{ fontSize:"30px", fontWeight:700, lineHeight:1.2 }}>$24,860.42</div>
        <div className="num" style={{ fontSize:"13.5px", color:C.gainLit, fontWeight:600 }}>+$1,284.10 this month</div>
        <Donut />
        <ul className="alloc num">
          {ALLOC.map(a => (
            <li key={a.label}><i style={{ background:a.color }} /><span style={{ flex:1 }}>{a.label}</span><span style={{ fontWeight:600 }}>{a.val}</span></li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

/* ── Security icons ── */
const SecIcon = ({ kind }) => {
  const st = { stroke:C.gold, strokeWidth:1.8, fill:"none", strokeLinecap:"round", strokeLinejoin:"round" };
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="rgba(226,174,74,.12)" />
      {kind === "vault"  && <><rect x="12" y="13" width="24" height="22" rx="3" {...st} /><circle cx="24" cy="24" r="5" {...st} /><path d="M24 19v-2M24 31v-2M19 24h-2M31 24h-2" {...st} /></>}
      {kind === "shield" && <><path d="M24 11l11 4.5V24c0 6.5-5 10.5-11 13-6-2.5-11-6.5-11-13v-8.5z" {...st} /><rect x="19.5" y="22" width="9" height="7" rx="1.5" {...st} /><path d="M21.5 22v-2a2.5 2.5 0 015 0v2" {...st} /></>}
      {kind === "pulse"  && <><circle cx="24" cy="24" r="12" {...st} /><path d="M12 24h5l2.5-5 4 10 2.5-5H36" {...st} /></>}
    </svg>
  );
};

/* ── Global market sessions (live, from the visitor's clock) ── */
const MARKETS = [
  { name:"New York", ex:"NYSE and Nasdaq", tz:"America/New_York", open:9.5, close:16 },
  { name:"London",   ex:"London Stock Exchange", tz:"Europe/London", open:8, close:16.5 },
 
  { name:"Tokyo",    ex:"Tokyo Stock Exchange", tz:"Asia/Tokyo", open:9, close:15.5 },
  { name:"Crypto",   ex:"Bitcoin, Ether and more", tz:null },
];
const zoneNow = (tz) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone:tz, hour:"2-digit", minute:"2-digit", weekday:"short", hourCycle:"h23" }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t)?.value;
  return { h: +get("hour") + +get("minute") / 60, label:`${get("hour")}:${get("minute")}`, wd:get("weekday") };
};
const MarketSessions = () => {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force(n => n + 1), 30000); return () => clearInterval(id); }, []);
  return (
    <div className="sessions glass" role="list" aria-label="Market sessions right now">
      {MARKETS.map(m => {
        if (!m.tz) return (
          <div key={m.name} className="session" role="listitem">
            <div><div style={{ fontWeight:700 }}>{m.name}</div><div className="glass-lbl">{m.ex}</div></div>
            <div className="session-bar"><span style={{ left:0, right:0 }} /></div>
            <span className="status"><i style={{ background:C.gainLit }} />Open 24/7</span>
          </div>
        );
        const z = zoneNow(m.tz);
        const weekend = z.wd === "Sat" || z.wd === "Sun";
        const open = !weekend && z.h >= m.open && z.h < m.close;
        return (
          <div key={m.name} className="session" role="listitem">
            <div><div style={{ fontWeight:700 }}>{m.name}</div><div className="glass-lbl">{m.ex}</div></div>
            <div className="session-bar">
              <span style={{ left:`${m.open / 24 * 100}%`, width:`${(m.close - m.open) / 24 * 100}%`, opacity: weekend ? .35 : 1 }} />
              <b style={{ left:`${z.h / 24 * 100}%` }} />
            </div>
            <span className="status num"><i style={{ background: open ? C.gainLit : "rgba(238,242,247,.3)" }} />{open ? "Open" : "Closed"}, {z.label} local</span>
          </div>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   COMPANY REGISTRATION — edit these to fill the "Registration" section.
   The document pages are imported from the doc/ folder (file1.jpeg, file2.jpeg).
   Put files in /public (e.g. /public/documents/registration.png) and
   reference them as "/documents/registration.png".
   registerUrl should point to the issuing body's public register so
   visitors can check the number for themselves.
───────────────────────────────────────────── */
const REGISTRATION = {
  companyName:   "ProfitGainSignal",
  documentTitle: "Certificate of registration",
  number:        "",   // registration number
  issuedBy:      "",   // registry or regulator that issued it
  issuedOn:      "",   // date issued
  // Document images, loaded from the doc/ folder
  images: [
    { src: regDoc1, label: "Page 1" },
    { src: regDoc2, label: "Page 2" },
  ],
  documentUrl:   "",   // full document (PDF) for "View document"
  registerUrl:   "",   // public register page where the number can be checked
};

const TICKER = [
  { sym:"BTC",   price:"$67,420", chg:"+2.31%", up:true  },
  { sym:"ETH",   price:"$3,841",  chg:"+1.82%", up:true  },
  { sym:"SOL",   price:"$178.40", chg:"+4.07%", up:true  },
  { sym:"EUR/USD", price:"1.0842", chg:"-0.12%", up:false },
  { sym:"XAU",   price:"$2,361",  chg:"+0.64%", up:true  },
  { sym:"BNB",   price:"$592.10", chg:"-0.54%", up:false },
  { sym:"XRP",   price:"$0.631",  chg:"+1.20%", up:true  },
  { sym:"ADA",   price:"$0.441",  chg:"-1.10%", up:false },
  { sym:"AVAX",  price:"$38.71",  chg:"+2.75%", up:true  },
  { sym:"LINK",  price:"$14.92",  chg:"-0.33%", up:false },
];

const TRADERS = [
  { id:"marcus-webb",    name:"Marcus Webb",    style:"Crypto momentum",        roi:"+412%", monthly:"+31.7%", dd:"5.6%", win:"69%", followers:"21.1K", spark:[20,38,30,55,65,58,78,82,70,98], initials:"MW", top:true },
  { id:"alexei-voronov", name:"Alexei Voronov", style:"Swing trades on majors", roi:"+347%", monthly:"+28.4%", dd:"4.2%", win:"73%", followers:"12.4K", spark:[30,45,38,55,42,68,60,78,72,95], initials:"AV" },
  { id:"priya-sharma",   name:"Priya Sharma",   style:"Forex, low drawdown",    roi:"+218%", monthly:"+19.1%", dd:"2.8%", win:"81%", followers:"8.7K",  spark:[40,35,50,46,60,55,72,68,80,88], initials:"PS" },
  { id:"daniel-mensah",  name:"Daniel Mensah",  style:"Gold and indices",       roi:"+164%", monthly:"+12.2%", dd:"3.1%", win:"77%", followers:"6.2K",  spark:[42,40,48,52,50,58,61,66,64,74], initials:"DM" },
  { id:"lucia-ferrer",   name:"Lucía Ferrer",   style:"Large-cap stocks",       roi:"+129%", monthly:"+9.8%",  dd:"2.4%", win:"79%", followers:"4.9K",  spark:[35,38,36,44,47,46,52,55,58,63], initials:"LF" },
];

const PRODUCTS = [
  { id:"copy",     title:"Copy trading",  sub:"Mirror a pro's trades automatically" },
  { id:"hire",     title:"Hire a trader", sub:"A pro manages your account for you" },
  { id:"stocks",   title:"Stock trading", sub:"Buy and sell shares yourself" },
  { id:"property", title:"Real estate",   sub:"Own a share of rental property" },
];

const STOCKS = [
  { sym:"NVDA", name:"NVIDIA",    px:124.30, chg: 2.14, spark:[40,44,42,50,53,51,58,62,60,66] },
  { sym:"AAPL", name:"Apple",     px:227.52, chg: 0.61, spark:[50,48,52,51,54,53,55,54,57,58] },
  { sym:"MSFT", name:"Microsoft", px:431.10, chg:-0.38, spark:[60,62,59,61,58,57,59,56,57,55] },
  { sym:"TSLA", name:"Tesla",     px:248.90, chg: 3.02, spark:[30,36,33,41,45,43,50,48,55,60] },
  { sym:"AMZN", name:"Amazon",    px:186.45, chg: 1.12, spark:[44,46,45,48,47,51,50,53,52,56] },
];

const PROPERTIES = [
  { id:"riverside", name:"Riverside Apartments",   place:"Manchester, UK",   kind:"48 rental flats", type:"flats",   yield:"7.2%", term:"5 years", funded:82 },
  { id:"marina",    name:"Marina Business Suites", place:"Dubai, UAE",       kind:"Office building", type:"office",  yield:"8.1%", term:"7 years", funded:64 },
  { id:"garden",    name:"Garden Terraces",        place:"Lisbon, Portugal", kind:"22 family homes", type:"terraces",yield:"6.4%", term:"4 years", funded:41 },
];

const STEPS = [
  { title:"Create your account", desc:"Sign up and verify your identity. It takes a few minutes." },
  { title:"Fund and set limits",  desc:"Deposit, then decide your stop-loss, daily loss limit and maximum exposure." },
  { title:"Choose how to invest", desc:"Copy a trader, hire one to manage your money, trade stocks yourself, or buy into property. Mix them if you like." },
  { title:"Watch and adjust",     desc:"Track everything from one dashboard. Move money between products or withdraw when you want." },
];

const FEATURES = [
  { title:"One balance for everything", desc:"Fund your account once and split it across copied traders, hired managers, stocks and property shares." },
  { title:"Risk limits",         desc:"Set a stop-loss, a daily loss limit and a maximum exposure for any trader you copy or hire, or for your whole account." },
  { title:"Audited traders",     desc:"Every trader's history is audited before they can be copied or hired, so you can compare real records side by side.", href:"/market-place", link:"Open the marketplace" },
  { title:"Portfolio analytics", desc:"Returns and drawdown for every trader, stock and property you hold, and what each one added to your total.", href:"/analytics", link:"See the analytics" },
  { title:"Rental income",       desc:"Your share of the rent from each property is paid into your balance every quarter." },
  { title:"Withdraw anytime",    desc:"No lockups on trading balances. Every deposit, trade and withdrawal is logged so you can check it later." },
];

const TESTIMONIALS = [
  { quote:"My return is up 180% in seven months, but what sold me was the March dip. My risk limits kicked in exactly where I'd set them and I didn't lose a cent I hadn't planned to.", author:"Sofia R.", role:"Portfolio manager, São Paulo" },
  { quote:"I copy one trader and own shares in two rental properties, all from the same balance. Seeing it in one place is the whole point.", author:"James K.", role:"Retail investor, London" },
  { quote:"Audited records mean I know exactly what I'm buying into before I allocate a single dollar.", author:"Tariq M.", role:"Family office, Dubai" },
];

const LANGUAGES = [
  { code:"en",    label:"English",   flag:"🇺🇸" },
  { code:"es",    label:"Español",   flag:"🇪🇸" },
  { code:"fr",    label:"Français",  flag:"🇫🇷" },
  { code:"de",    label:"Deutsch",   flag:"🇩🇪" },
  { code:"pt",    label:"Português", flag:"🇵🇹" },
  { code:"zh-CN", label:"中文",       flag:"🇨🇳" },
];


/* ─────────────────────────────────────────────
   MIRROR FEED — the hero's live copy stream
───────────────────────────────────────────── */
const PAIRS = [
  { pair:"BTC/USDT", unit:"BTC", px:67420,  pxDec:1, min:0.25,  max:1.6,    szDec:3 },
  { pair:"ETH/USDT", unit:"ETH", px:3841,   pxDec:2, min:3,     max:18,     szDec:2 },
  { pair:"SOL/USDT", unit:"SOL", px:178.4,  pxDec:2, min:60,    max:320,    szDec:1 },
  { pair:"EUR/USD",  unit:"EUR", px:1.0842, pxDec:4, min:50000, max:250000, szDec:0 },
  { pair:"XAU/USD",  unit:"oz",  px:2361.5, pxDec:2, min:10,    max:60,     szDec:1 },
];
const COPY_RATIO = 0.1;
const fmt = (n, d) => n.toLocaleString("en-US", { minimumFractionDigits:d, maximumFractionDigits:d });
let tradeSeq = 0;

const makeTrade = (secondsAgo = 0, isNew = true) => {
  const p = PAIRS[Math.floor(Math.random() * PAIRS.length)];
  const side = Math.random() > 0.38 ? "Buy" : "Sell";
  const size = p.min + Math.random() * (p.max - p.min);
  const price = p.px * (1 + (Math.random() - 0.5) * 0.004);
  const fill = price * (1 + (side === "Buy" ? 1 : -1) * Math.random() * 0.00015);
  const time = new Date(Date.now() - secondsAgo * 1000).toLocaleTimeString("en-GB", { hour12:false });
  return {
    id: ++tradeSeq, time, pair:p.pair, unit:p.unit, side,
    size, copySize: size * COPY_RATIO, price, fill,
    pxDec:p.pxDec, szDec:p.szDec, ms: 18 + Math.floor(Math.random() * 46), isNew,
  };
};

const MirrorFeed = () => {
  const [rows, setRows] = useState(() => [0, 41, 97, 158, 230].map(s => makeTrade(s, false)));

  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      setRows(rs => [makeTrade(), ...rs.slice(0, 4).map(r => ({ ...r, isNew:false }))]);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx" aria-label="Example of a trade being copied live">
      <div className="mx-head">
        <div>
          <Avatar initials="MW" seed={0} size={46} />
          <div>
            <div className="mx-who">Marcus Webb opens a trade</div>
            <div className="mx-what">Lead trader, +412% since joining</div>
          </div>
        </div>
        <div className="mx-mid" />
        <div>
          <div>
            <div className="mx-who">Your account copies it</div>
            <div className="mx-what">At 10% of his position size</div>
          </div>
        </div>
      </div>

      <div className="mx-body" aria-live="polite">
        {rows.map(r => (
          <div key={r.id} className={"mx-row num" + (r.isNew ? " is-new" : "")}>
            <div className="mx-lead">
              <span className="mx-time">{r.time}</span>
              <span className={"mx-side " + r.side.toLowerCase()}>{r.side}</span>
              <span className="mx-pair">{r.pair}</span>
              <span>{fmt(r.size, r.szDec)} {r.unit} at {fmt(r.price, r.pxDec)}</span>
            </div>
            <div className="mx-link" title="Time between his fill and yours">{r.ms} ms</div>
            <div className="mx-you">
              <span>{fmt(r.copySize, r.szDec === 0 ? 0 : r.szDec + 1)} {r.unit} at {fmt(r.fill, r.pxDec)}</span>
              <span className="mx-filled">Filled</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-foot num">
        <div><div className="mx-foot-lbl">Allocated to Marcus</div><div className="mx-foot-val">$2,500.00</div></div>
        <div><div className="mx-foot-lbl">Your return this month</div><div className="mx-foot-val" style={{ color:C.gain }}>+6.8%</div></div>
        <div><div className="mx-foot-lbl">Stop copying if down</div><div className="mx-foot-val">12%</div></div>
      </div>
    </div>
  );
};

const money = (n, d = 0) => "$" + fmt(n, d);

const HirePanel = () => {
  const [deposit, setDeposit] = useState(10000);
  const profit = deposit * 0.10;
  const fee = profit * 0.20;
  const keep = profit - fee;
  return (
    <div className="mx">
      <div className="mx-head" style={{ gridTemplateColumns:"1fr" }}>
        <div>
          <Avatar initials="PS" seed={2} size={46} />
          <div>
            <div className="mx-who">Hire Priya Sharma to manage your account</div>
            <div className="mx-what">Forex, low drawdown. She places the trades; you see every one.</div>
          </div>
        </div>
      </div>
      <div className="split num">
        <div>
          <div className="panel-h">Her terms</div>
          <ul className="terms">
            <li><span>Minimum deposit</span><span>$1,000</span></li>
            <li><span>Management fee</span><span>None</span></li>
            <li><span>Performance fee</span><span>20% of profit only</span></li>
            <li><span>Fee charged</span><span>Monthly, on new highs</span></li>
            <li><span>Your money stays</span><span>In your own account</span></li>
          </ul>
        </div>
        <div>
          <div className="panel-h">If her strategy returns 10% in a month</div>
          <div className="chips" role="group" aria-label="Deposit amount">
            {[1000, 10000, 50000].map(v => (
              <button key={v} className="chip" aria-pressed={deposit === v} onClick={() => setDeposit(v)}>{money(v)}</button>
            ))}
          </div>
          <div className="fee-bar" aria-hidden="true"><span style={{ width:"80%" }} /><span style={{ width:"20%" }} /></div>
          <ul className="terms">
            <li><span>Profit</span><span>{money(profit)}</span></li>
            <li><span>Priya's fee</span><span>−{money(fee)}</span></li>
            <li><span>You keep</span><span style={{ color:C.gain }}>{money(keep)}</span></li>
          </ul>
        </div>
      </div>
      <div className="mx-cta">
        <span className="mx-note">No profit, no fee. You can end the arrangement at any time.</span>
        <a href="/market-place" className="tx-btn tx-btn-ink tx-btn-sm">Find a trader to hire</a>
      </div>
    </div>
  );
};

const StocksPanel = () => {
  const [sel, setSel] = useState(STOCKS[0].sym);
  const [side, setSide] = useState("Buy");
  const [amount, setAmount] = useState("250");
  const stock = STOCKS.find(s => s.sym === sel);
  const value = parseFloat(amount) || 0;
  return (
    <div className="mx">
      <div className="split num" style={{ gridTemplateColumns:"minmax(0,1.15fr) minmax(0,.85fr)" }}>
        <div style={{ padding:0 }}>
          <div style={{ padding:"18px 24px 10px" }} className="panel-h">Watchlist</div>
          {STOCKS.map(s => (
            <button key={s.sym} className="watch-row" aria-pressed={sel === s.sym} onClick={() => setSel(s.sym)}>
              <span style={{ fontWeight:700 }}>{s.sym}</span>
              <span style={{ color:C.inkMid, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</span>
              <span style={{ textAlign:"right" }}>
                <span style={{ display:"block", fontWeight:600 }}>{money(s.px, 2)}</span>
                <span style={{ display:"block", fontSize:"13px", color: s.chg >= 0 ? C.gain : C.loss }}>{s.chg >= 0 ? "+" : ""}{s.chg.toFixed(2)}%</span>
              </span>
              <span className="spark-cell"><Sparkline data={s.spark} up={s.chg >= 0} w={72} /></span>
            </button>
          ))}
        </div>
        <div>
          <div className="panel-h">{side} {stock.name}</div>
          <div className="ticket-side" role="group" aria-label="Order side">
            <button className="buy"  aria-pressed={side === "Buy"}  onClick={() => setSide("Buy")}>Buy</button>
            <button className="sell" aria-pressed={side === "Sell"} onClick={() => setSide("Sell")}>Sell</button>
          </div>
          <label htmlFor="stock-amount" style={{ fontSize:"14px", color:C.inkMid }}>Amount in dollars</label>
          <div className="amount" style={{ marginTop:"6px" }}>
            <span style={{ fontSize:"18px", fontWeight:600, marginRight:"4px" }}>$</span>
            <input id="stock-amount" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
          </div>
          <div className="chips">
            {["50","250","1000"].map(v => (
              <button key={v} className="chip" aria-pressed={amount === v} onClick={() => setAmount(v)}>{money(+v)}</button>
            ))}
          </div>
          <p style={{ fontSize:"15px", color:C.inkMid, marginBottom:"16px" }}>
            That's about <strong style={{ color:C.ink }}>{fmt(value / stock.px, 4)} shares</strong> at {money(stock.px, 2)}. You can buy fractions of a share.
          </p>
          <a href="/signup" className="tx-btn tx-btn-ink" style={{ width:"100%" }}>Sign up to place this order</a>
        </div>
      </div>
    </div>
  );
};

const PropertyPanel = () => (
  <div className="mx">
    <div className="mx-head" style={{ gridTemplateColumns:"1fr" }}>
      <div>
        <div>
          <div className="mx-who">Buy a share of a rental property from $100</div>
          <div className="mx-what">You earn your share of the rent each quarter, plus any rise in value when the property is sold.</div>
        </div>
      </div>
    </div>
    <div className="num">
      {PROPERTIES.map(p => (
        <div key={p.id} className="prop-row">
          <div className="prop-thumb">{p.img ? <img src={p.img} alt="" /> : <PropertyArt type={p.type} />}</div>
          <div className="prop-title">
            <div className="prop-name">{p.name}</div>
            <div className="prop-meta">{p.place}, {p.kind.toLowerCase()}</div>
          </div>
          <div><div className="prop-lbl">Target yield</div><div className="prop-val">{p.yield}</div></div>
          <div><div className="prop-lbl">Hold period</div><div className="prop-val">{p.term}</div></div>
          <div className="prop-fund">
            <div className="prop-lbl">{p.funded}% funded</div>
            <div className="progress" role="progressbar" aria-valuenow={p.funded} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} funding`}><span style={{ width:`${p.funded}%` }} /></div>
          </div>
          <a href="/real-estate" className="tx-btn tx-btn-line tx-btn-sm">View</a>
        </div>
      ))}
    </div>
    <div className="mx-cta">
      <span className="mx-note">Property values can fall, and selling your share before the hold period ends isn't guaranteed.</span>
      <a href="/real-estate" className="tx-btn tx-btn-ink tx-btn-sm">See all properties</a>
    </div>
  </div>
);

const ProductExplorer = () => {
  const [tab, setTab] = useState("copy");
  const onKey = (e, i) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const n = (i + (e.key === "ArrowRight" ? 1 : PRODUCTS.length - 1)) % PRODUCTS.length;
    setTab(PRODUCTS[n].id);
    document.getElementById("tab-" + PRODUCTS[n].id)?.focus();
  };
  return (
    <div className="explorer" id="products">
      <div className="ex-tabs" role="tablist" aria-label="Ways to invest">
        {PRODUCTS.map((p, i) => (
          <button
            key={p.id} id={"tab-" + p.id} role="tab" className="ex-tab"
            aria-selected={tab === p.id} aria-controls={"panel-" + p.id} tabIndex={tab === p.id ? 0 : -1}
            onClick={() => setTab(p.id)} onKeyDown={e => onKey(e, i)}
          >
            <TabArt id={p.id} />
            <span>
              <span className="ex-tab-t">{p.title}</span>
              <span className="ex-tab-s">{p.sub}</span>
            </span>
          </button>
        ))}
      </div>
      <div key={tab} className="ex-panel" role="tabpanel" id={"panel-" + tab} aria-labelledby={"tab-" + tab}>
        {tab === "copy" && <MirrorFeed />}
        {tab === "hire" && <HirePanel />}
        {tab === "stocks" && <StocksPanel />}
        {tab === "property" && <PropertyPanel />}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   SMALL COMPONENTS
───────────────────────────────────────────── */
const Sparkline = ({ data, up = true, w = 88 }) => {
  const W = w, H = 30;
  const mn = Math.min(...data), mx = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - mn) / (mx - mn)) * H}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden="true">
      <polyline points={pts} stroke={up ? C.gain : C.loss} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const Logo = ({ size = 26 }) => (
  <span className="brand" style={{ fontSize:size }} aria-label="ProfitGainSignal">Profit<b>Gain</b>Signal</span>
);

const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });

const SLink = ({ to, children, className, onClick, style }) => (
  <a
    href={`#${to}`}
    className={className}
    style={style}
    onClick={(e) => { e.preventDefault(); scrollTo(to); onClick && onClick(); }}
  >
    {children}
  </a>
);

/* ── Google Translate wiring (unchanged behaviour) ── */
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
    // eslint-disable-next-line no-new
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
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(() => localStorage.getItem("tf_lang") || "en");
  const ref = useRef(null);

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
      <button className="lang-btn" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label="Change language">
        <span aria-hidden="true">{active.flag}</span>
        <span>{active.label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" style={{ transform: open ? "rotate(180deg)" : "none", transition:"transform .15s" }}>
          <path d="M1.5 3.5 5 7l3.5-3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="lang-dropdown" role="menu">
          {LANGUAGES.map(l => (
            <button key={l.code} role="menuitem" className={"lang-option" + (l.code === current ? " active" : "")} onClick={() => select(l.code)}>
              <span aria-hidden="true" style={{ fontSize:"16px" }}>{l.flag}</span>
              <span>{l.label}</span>
              {l.code === current && <span style={{ marginLeft:"auto", fontSize:"12px" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CookieBanner = () => {
  const [state, setState] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const choice = localStorage.getItem("tf_cookie_consent");
    setState(choice ? "hidden" : "show");
  }, []);

  const accept = () => {
    setSaving(true);
    setTimeout(() => { localStorage.setItem("tf_cookie_consent", "accepted"); setState("hidden"); }, 300);
  };
  const decline = () => { localStorage.setItem("tf_cookie_consent", "declined"); setState("hidden"); };

  if (state !== "show") return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent" style={{ opacity: saving ? 0 : 1, transition:"opacity .3s" }}>
      <div style={{ flex:1, minWidth:"220px" }}>
        <div style={{ fontSize:"16px", fontWeight:700, marginBottom:"4px" }}>Cookies on ProfitGainSignal</div>
        <p style={{ fontSize:"14px", color:C.inkMid, lineHeight:1.55 }}>
          We use cookies to keep you signed in, measure traffic and improve the site. See our{" "}
          <a href="/cookie" style={{ color:C.ink, textDecoration:"underline" }}>Cookie Policy</a>.
        </p>
      </div>
      <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
        <button onClick={decline} className="tx-btn tx-btn-line tx-btn-sm">Decline</button>
        <button onClick={accept} className="tx-btn tx-btn-ink tx-btn-sm">Accept cookies</button>
      </div>
    </div>
  );
};

const SOCIALS = [
  { key:"X", href:"https://x.com/ProfitGainSignals",
    icon:<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18.9 2H22l-7.6 8.7L23.3 22h-7l-5.5-7.2L4.5 22H1.3l8.1-9.3L1 2h7.2l5 6.6L18.9 2Zm-1.2 18h1.7L6.4 3.9H4.6L17.7 20Z"/></svg> },
  { key:"LinkedIn", href:"https://linkedin.com/company/ProfitGainSignals",
    icon:<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5ZM2.5 9.75h5V21h-5V9.75ZM10 9.75h4.8v1.54h.07c.67-1.2 2.3-2.47 4.73-2.47 5.06 0 6 3.13 6 7.2V21h-5v-5.6c0-1.34-.02-3.06-1.98-3.06-1.98 0-2.28 1.45-2.28 2.96V21h-5V9.75Z"/></svg> },
  { key:"Discord", href:"https://discord.gg/ProfitGainSignals",
    icon:<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M20.3 5.3A17.6 17.6 0 0 0 15.9 4l-.3.6c1.7.4 2.6.9 3.5 1.5-1.5-.7-3-1.1-4.5-1.1s-3 .4-4.5 1.1c.9-.6 1.9-1.1 3.5-1.5L13.3 4A17.6 17.6 0 0 0 8.9 5.3C6.4 8.9 5.7 12.4 6 15.8c1.8 1.4 3.6 2.2 5.4 2.7l.7-1.2c-.7-.3-1.4-.6-2-1 .2-.1.3-.3.5-.4 3.9 1.8 8.2 1.8 12.1 0 .1.1.3.3.5.4-.6.4-1.3.7-2 1l.7 1.2c1.8-.5 3.6-1.3 5.4-2.7.4-4-.6-7.4-2.5-10.5ZM11.4 13.9c-.8 0-1.4-.8-1.4-1.7 0-.9.6-1.7 1.4-1.7.8 0 1.5.8 1.4 1.7 0 .9-.6 1.7-1.4 1.7Zm5.3 0c-.8 0-1.4-.8-1.4-1.7 0-.9.6-1.7 1.4-1.7.8 0 1.5.8 1.4 1.7 0 .9-.6 1.7-1.4 1.7Z"/></svg> },
  { key:"Telegram", href:"https://t.me/ProfitGainSignals",
    icon:<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M21.9 4.4 18.6 20c-.2 1-.9 1.2-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9L18 7.1c.5-.4-.1-.6-.7-.3L6.4 13.2 1.7 11.7c-1-.3-1-1 .2-1.5L20.6 3c.8-.3 1.6.2 1.3 1.4Z"/></svg> },
  { key:"YouTube", href:"https://youtube.com/@ProfitGainSignals",
    icon:<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M23.5 7.2a3 3 0 0 0-2.1-2.1C19.5 4.6 12 4.6 12 4.6s-7.5 0-9.4.5A3 3 0 0 0 .5 7.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-4.8ZM9.6 15.5V8.5L15.8 12l-6.2 3.5Z"/></svg> },
];

const FOOTER_COLS = [
  { title:"Product", links:[
    { label:"Platform",     href:"/platform" },
    { label:"Copy trading",  href:"/copy-trading" },
    { label:"Hire a trader", href:"/market-place" },
    { label:"Stock trading", href:"/stocks" },
    { label:"Real estate",   href:"/real-estate" },
  ]},
  { title:"Company", links:[
    { label:"About", href:"/about" },
  ]},
  { title:"Legal", links:[
    { label:"Privacy",       href:"/privacy" },
    { label:"Terms",         href:"/terms" },
    { label:"Cookie policy", href:"/cookie" },
    { label:"Disclosures",   href:"/disclosures" },
  ]},
];

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
const DocPlaceholder = () => (
  <div className="reg-doc" aria-label="Sample document placeholder" role="img">
    <div className="bar dark" style={{ width:"58%", height:"4%" }} />
    <div className="bar" style={{ width:"40%" }} />
    <div className="bar dark" style={{ width:"72%", height:"5%", marginTop:"6%" }} />
    <div className="bar" style={{ width:"86%", marginTop:"6%" }} />
    <div className="bar" style={{ width:"78%" }} />
    <div className="bar" style={{ width:"82%" }} />
    <div className="bar" style={{ width:"64%" }} />
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6% 10%", width:"86%", marginTop:"8%" }}>
      {[0,1,2,3,4,5].map(i => <div key={i} className={`bar${i % 2 ? "" : " dark"}`} style={{ height:"10px" }} />)}
    </div>
    <div style={{ marginTop:"auto", width:"86%", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
      <div className="bar dark" style={{ width:"40%", height:"3px" }} />
      <div style={{ width:"18%", aspectRatio:"1", borderRadius:"50%", border:`2px dashed ${C.lineStrong}` }} />
    </div>
    <div className="mark"><span>Sample</span></div>
  </div>
);

const RegistrationSection = () => {
  const r = REGISTRATION;
  const docs = (r.images || []).filter(d => d && d.src);
  const [open, setOpen] = useState(null); // index of the document shown full size

  useEffect(() => {
    if (open === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen(i => (i + 1) % docs.length);
      if (e.key === "ArrowLeft")  setOpen(i => (i - 1 + docs.length) % docs.length);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, docs.length]);

  return (
    <section id="registration" className="tx-section" style={{ background:C.porcelain2 }}>
      <div className="tx-wrap reg">
        <div>
          <h2 className="tx-h2">Registration and documents</h2>
          <p className="tx-lede">Official registration documents for {r.companyName}. Tap a page to view it full size.</p>
          {(docs.length > 0 || r.documentUrl || r.registerUrl) && (
            <div className="reg-actions">
              {docs.length > 0 && <button type="button" onClick={() => setOpen(0)} className="tx-btn tx-btn-ink">View documents</button>}
              {r.documentUrl && <a href={r.documentUrl} target="_blank" rel="noopener noreferrer" className="tx-btn tx-btn-line">Download PDF</a>}
              {r.registerUrl && <a href={r.registerUrl} target="_blank" rel="noopener noreferrer" className="tx-btn tx-btn-line">Check on the public register</a>}
            </div>
          )}
        </div>
        <figure>
          <div className="reg-frame">
            {docs.length > 0 ? (
              <div className={"reg-docs" + (docs.length === 1 ? " single" : "")}>
                {docs.map((d, i) => (
                  <button key={i} type="button" className="reg-thumb" onClick={() => setOpen(i)} aria-label={`Open ${r.documentTitle}, ${d.label}`}>
                    <img src={d.src} alt={`${r.documentTitle} for ${r.companyName}, ${d.label}`} loading="lazy" />
                    <span>{d.label}</span>
                  </button>
                ))}
              </div>
            ) : <DocPlaceholder />}
          </div>
          <figcaption className="reg-caption">
            {docs.length > 0
              ? <>{r.documentTitle}</>
              : <><b>Sample</b>Your document will appear here once it's added.</>}
          </figcaption>
        </figure>
      </div>

      {open !== null && docs[open] && (
        <div className="reg-lightbox" role="dialog" aria-modal="true" aria-label={`${r.documentTitle}, ${docs[open].label}`} onClick={() => setOpen(null)}>
          <span className="reg-lb-count num">{docs[open].label} of {docs.length}</span>
          <img src={docs[open].src} alt={`${r.documentTitle}, ${docs[open].label}`} onClick={e => e.stopPropagation()} />
          <button type="button" className="reg-lb-btn reg-lb-close" aria-label="Close" onClick={() => setOpen(null)}>✕</button>
          {docs.length > 1 && <>
            <button type="button" className="reg-lb-btn reg-lb-prev" aria-label="Previous page" onClick={e => { e.stopPropagation(); setOpen(i => (i - 1 + docs.length) % docs.length); }}>‹</button>
            <button type="button" className="reg-lb-btn reg-lb-next" aria-label="Next page" onClick={e => { e.stopPropagation(); setOpen(i => (i + 1) % docs.length); }}>›</button>
          </>}
        </div>
      )}
    </section>
  );
};

const TradexflowLanding = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const closeMenu = () => setMenuOpen(false);
  const handleSubmit = () => { if (email.includes("@")) setSubmitted(true); };

  useEffect(() => { document.title = "ProfitGainSignal"; }, []);

  /* Chatway live-chat widget, injected once */
  useEffect(() => {
    if (document.getElementById("chatway-widget-script")) return;
    const script = document.createElement("script");
    script.id = "chatway-widget-script";
    script.src = "https://cdn.chatway.app/widget.js?id=rES12jPIPPNO";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const tickerAll = [...TICKER, ...TICKER];
  const NAV_ITEMS = [
    { label:"Invest",       id:"products"     },
    { label:"Traders",      id:"traders"      },
    { label:"How it works", id:"how-it-works" },
    { label:"Platform",     id:"features"     },
    { label:"Security",     id:"security"     },
    { label:"Company",      id:"registration" },
  ];

  return (
    <>
      <style>{CSS}</style>

      {/* ══ NAV ══ */}
      <nav className="tx-nav on-dark">
        <SLink to="hero" style={{ display:"flex", alignItems:"center" }}>
          <Logo />
        </SLink>
        <div className="nav-links">
          {NAV_ITEMS.map(n => <SLink key={n.id} to={n.id} className="nav-link">{n.label}</SLink>)}
        </div>
        <div className="nav-cta">
          <LanguageSwitcher />
          <a href="/login" className="tx-btn tx-btn-line tx-btn-sm">Log in</a>
          <a href="/signup" className="tx-btn tx-btn-gold tx-btn-sm">Open account</a>
        </div>
        <button className="hamburger" onClick={() => setMenuOpen(o => !o)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
          {[0,1,2].map(i => (
            <span key={i} style={{
              display:"block", width:"22px", height:"2px", background:C.porcelain, borderRadius:"1px",
              transform: menuOpen && i===0 ? "rotate(45deg) translate(5px,5px)" :
                         menuOpen && i===1 ? "scaleX(0)" :
                         menuOpen && i===2 ? "rotate(-45deg) translate(5px,-5px)" : "none",
              transition:"transform .2s",
            }}/>
          ))}
        </button>
      </nav>

      {menuOpen && (
        <div className="mobile-menu on-dark">
          {NAV_ITEMS.map(n => <SLink key={n.id} to={n.id} className="nav-link" onClick={closeMenu}>{n.label}</SLink>)}
          <div style={{ padding:"16px 0 4px" }}><LanguageSwitcher /></div>
          <div style={{ display:"flex", gap:"10px", marginTop:"12px" }}>
            <a href="/login" className="tx-btn tx-btn-line" style={{ flex:1 }}>Log in</a>
            <a href="/signup" className="tx-btn tx-btn-gold" style={{ flex:1 }}>Open account</a>
          </div>
        </div>
      )}

      {/* ══ HERO ══ */}
      <section id="hero" className="hero on-dark">
        <div className="tx-wrap" style={{ padding:"0 clamp(20px,5vw,56px)" }}>
          <div className="hero-grid">
            <div>
              <h1 className="tx-h1">One broker for every way you invest.</h1>
              <p className="hero-sub">
                Trade global stocks, copy or hire verified traders, and buy shares of income-producing property, all from a single account and a single balance.
              </p>
              <div className="hero-btns">
                <a href="/signup" className="tx-btn tx-btn-gold">Open free account</a>
                <SLink to="products" className="tx-btn tx-btn-line">Compare products</SLink>
              </div>
              <div className="hero-assets">
                {["Stocks and ETFs","Forex","Crypto","Commodities","Real estate"].map(a => <span key={a}><i />{a}</span>)}
              </div>
            </div>
            <HeroDesk />
          </div>
        </div>
      </section>

      <div className="tx-ticker on-dark" aria-hidden="true">
        <div className="tx-ticker-track num">
          {tickerAll.map((t, i) => (
            <span key={i} className="tx-ticker-item">
              <span style={{ color:"#fff", fontWeight:700 }}>{t.sym}</span>
              <span style={{ color:C.onDark }}>{t.price}</span>
              <span style={{ color: t.up ? C.gainLit : C.lossLit, fontWeight:600 }}>{t.up ? "▲" : "▼"} {t.chg.replace(/[+-]/, "")}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ══ PRODUCTS ══ */}
      <section id="products" className="tx-section">
        <div className="tx-wrap">
          <div className="sec-head" style={{ marginBottom:0 }}>
            <div>
              <h2 className="tx-h2">Four ways to put your money to work</h2>
              <p className="tx-lede">Every product draws from the same balance. Move money between them in a tap, and see all of it in one portfolio.</p>
            </div>
            <ul className="num stats" style={{ display:"flex", gap:"40px" }}>
              {[{ v:"280K", l:"investors" }, { v:"2,400", l:"verified traders" }, { v:"$4.2B", l:"invested" }].map(s => (
                <li key={s.l}><div className="serif" style={{ fontSize:"44px", lineHeight:1 }}>{s.v}</div><div style={{ fontSize:"14.5px", color:C.inkMid }}>{s.l}</div></li>
              ))}
            </ul>
          </div>
          <ProductExplorer />
        </div>
      </section>

      {/* ══ TRADERS ══ */}
      <section id="traders" className="tx-section" style={{ paddingTop:0 }}>
        <div className="tx-wrap">
          <div className="sec-head">
            <div>
              <h2 className="tx-h2">Traders you can copy or hire</h2>
              <p className="tx-lede">Every record is audited and updated daily. Max drawdown is the biggest peak-to-trough drop their account has had.</p>
            </div>
            <a href="/market-place" className="text-link">See all 2,400 traders</a>
          </div>

          <div className="lb" role="table" aria-label="Top traders">
            <div className="lb-row lb-head" role="row">
              <span role="columnheader">Trader</span>
              <span role="columnheader" className="lb-n" style={{ fontWeight:400 }}>Since joining</span>
              <span role="columnheader" className="lb-n lb-col-month" style={{ fontWeight:400 }}>Last 30 days</span>
              <span role="columnheader" className="lb-n" style={{ fontWeight:400 }}>Max drawdown</span>
              <span role="columnheader" className="lb-n" style={{ fontWeight:400 }}>Winning trades</span>
              <span role="columnheader" className="lb-n" style={{ fontWeight:400 }}>Followers</span>
              <span role="columnheader" className="lb-spark">Trend</span>
              <span />
            </div>
            {TRADERS.map((t, i) => (
              <div key={t.id} className="lb-row num" role="row">
                <div className="lb-trader" role="cell">
                  <Avatar initials={t.initials} seed={i} size={46} ring={t.top} />
                  <div style={{ minWidth:0 }}>
                    <div className="lb-name">{t.name}{t.top && <span className="tag-top">Most copied</span>}</div>
                    <div className="lb-style">{t.style}</div>
                  </div>
                </div>
                <div className="lb-n" role="cell" style={{ color:C.gain }}><span className="lb-lbl">Since joining</span>{t.roi}</div>
                <div className="lb-n lb-col-month" role="cell"><span className="lb-lbl">Last 30 days</span>{t.monthly}</div>
                <div className="lb-n" role="cell"><span className="lb-lbl">Max drawdown</span>{t.dd}</div>
                <div className="lb-n" role="cell"><span className="lb-lbl">Winning trades</span>{t.win}</div>
                <div className="lb-n" role="cell"><span className="lb-lbl">Followers</span>{t.followers}</div>
                <div className="lb-spark" role="cell"><Sparkline data={t.spark} /></div>
                <div className="lb-act" role="cell">
                  <a href="/signup" className="tx-btn tx-btn-line tx-btn-sm" aria-label={`Copy ${t.name}`}>Copy</a>
                  <a href="/market-place" className="tx-btn tx-btn-ink tx-btn-sm" aria-label={`Hire ${t.name}`}>Hire</a>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize:"14px", color:C.inkDim, marginTop:"16px" }}>Past performance doesn't guarantee future results. Copying or hiring a trader can lose money.</p>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section id="how-it-works" className="tx-section dark on-dark">
        <div className="tx-wrap">
          <h2 className="tx-h2" style={{ maxWidth:"13em" }}>From sign-up to your first position</h2>
          <CurveArt />
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="step">
                <span className="step-n">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ══ PLATFORM ══ */}
      <section id="features" className="tx-section">
        <div className="tx-wrap feat">
          <PhoneMockup />
          <div>
            <h2 className="tx-h2">Your whole portfolio in one place</h2>
            <p className="tx-lede">Whoever places the trades, you decide how much goes in, how far it can fall, and when to take it out.</p>
            <div className="feat-list">
              {FEATURES.map(f => (
                <div key={f.title} className="feat-item">
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                  {f.href && <a href={f.href} className="text-link" style={{ fontSize:"15px" }}>{f.link}</a>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══ */}
      <section id="testimonials" className="tx-section" style={{ background:C.porcelain2 }}>
        <div className="tx-wrap">
          <h2 className="tx-h2">What investors say</h2>
          <div className="testi">
            <figure className="testi-main">
              <q>{TESTIMONIALS[0].quote}</q>
              <figcaption><Avatar initials="SR" seed={1} size={44} /><span><strong>{TESTIMONIALS[0].author}</strong>{TESTIMONIALS[0].role}</span></figcaption>
            </figure>
            <div className="testi-side">
              {TESTIMONIALS.slice(1).map((t, i) => (
                <figure key={t.author}>
                  <q>{t.quote}</q>
                  <figcaption><Avatar initials={t.author.split(" ").map(w => w[0]).join("").replace(".", "")} seed={i + 3} size={40} /><span><strong>{t.author}</strong>{t.role}</span></figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ SECURITY ══ */}
      <section id="security" className="tx-section dark on-dark">
        <div className="tx-wrap">
          <h2 className="tx-h2" style={{ maxWidth:"14em" }}>Your money is held separately and protected</h2>
          <div className="sec-grid">
            {[
              { kind:"vault",  title:"Segregated custody",   desc:"Client funds sit in segregated accounts, kept apart from the company's own operating money." },
              { kind:"shield", title:"Encrypted end to end", desc:"Data is encrypted with AES-256 in transit and at rest, the same standard banks use." },
              { kind:"pulse",  title:"99.98% uptime",        desc:"Infrastructure runs across several regions with automatic failover, so orders keep executing." },
            ].map(s => (
              <div key={s.title} className="sec-item">
                <SecIcon kind={s.kind} />
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ REGISTRATION & DOCUMENTS ══ */}
      <RegistrationSection />

      {/* ══ CTA + live market sessions ══ */}
      <section id="cta" className="tx-section on-dark" style={{ background:`radial-gradient(90% 120% at 85% 20%, #16305A 0%, ${C.night} 60%)`, color:C.porcelain, borderTop:`1px solid ${C.darkRule}` }}>
        <div className="tx-wrap cta">
          <div>
            <h2 className="tx-h2">Markets are moving. Open your account in minutes.</h2>
            <p style={{ fontSize:"18px", color:C.onDark, marginTop:"18px", maxWidth:"30em" }}>
              No minimum balance for trading, and property shares start at $100.
            </p>
            {submitted ? (
              <p role="status" style={{ fontSize:"18px", borderLeft:`3px solid ${C.gold}`, paddingLeft:"16px", marginTop:"32px" }}>
                Thanks. We'll email <strong>{email}</strong> with the next steps.
              </p>
            ) : (
              <>
                <div className="cta-form">
                  <input className="cta-input" type="email" aria-label="Email address" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
                  <button onClick={handleSubmit} className="tx-btn tx-btn-gold">Open free account</button>
                </div>
                <p style={{ fontSize:"14px", color:C.onDarkDim, marginTop:"12px" }}>No card needed to sign up. A free plan is always available.</p>
              </>
            )}
          </div>
          <div>
            <div style={{ fontSize:"15px", fontWeight:600, marginBottom:"12px", color:C.onDark }}>Markets right now</div>
            <MarketSessions />
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="tx-footer on-dark">
        <div className="tx-wrap">
          <div className="footer-grid">
            <div>
              <a href="/" style={{ display:"inline-flex" }}>
                <Logo size={24} />
              </a>
              <p style={{ fontSize:"15px", color:C.onDark, marginTop:"14px", maxWidth:"260px" }}>
                Stocks, copy trading, hired traders and property in one brokerage account.
              </p>
              <div style={{ display:"flex", gap:"10px", marginTop:"20px" }}>
                {SOCIALS.map(s => (
                  <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.key} className="social">{s.icon}</a>
                ))}
              </div>
            </div>
            {FOOTER_COLS.map(col => (
              <div key={col.title}>
                <div className="footer-h">{col.title}</div>
                {col.links.map(l => <a key={l.label} href={l.href} className="footer-link">{l.label}</a>)}
              </div>
            ))}
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} ProfitGainSignal. Trading and property investing involve risk, and you can lose money.</p>
            <div style={{ display:"flex", gap:"20px" }}>
              <a href="/privacy" className="footer-link" style={{ margin:0, fontSize:"13.5px" }}>Privacy</a>
              <a href="/terms"   className="footer-link" style={{ margin:0, fontSize:"13.5px" }}>Terms</a>
              <a href="/cookie"  className="footer-link" style={{ margin:0, fontSize:"13.5px" }}>Cookies</a>
            </div>
          </div>
        </div>
      </footer>

      <CookieBanner />
    </>
  );
};

export default TradexflowLanding;