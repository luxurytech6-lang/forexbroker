import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import supabase from '../supabase';

// TradingView's advanced-chart embed script makes its own internal request
// to a support-portal health-check endpoint (tradingview-widget.com/support/
// support-portal-problems). That endpoint returns 403 in most environments —
// it's part of TradingView's bundled code, unrelated to price data, and the
// chart itself loads and works fine regardless. It's not something this app
// can fix (it lives inside TradingView's hosted script), but the widget's
// internal logger spams the console with it, so filter just that one known
// line without touching any other console output.
if (typeof window !== 'undefined' && !window.__tvNoiseFiltered) {
  window.__tvNoiseFiltered = true;
  const origConsoleError = console.error;
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].toLowerCase().includes('support portal problems')) return;
    origConsoleError.apply(console, args);
  };
}

/* ─── Design Tokens ──────────────────────────────────────────────────────────── */
const T = {
  bg:   '#07101E', s:   '#0C1A2E', s2:  '#112238',
  br:   '#1C2C45', br2: '#2A3D5C', gr:  '#EEF2F7',
  nt:   '#8A9AB2', fa:  '#56677F',
  g:    '#E2AE4A', gd:  'rgba(226,174,74,.12)',
  bl:   '#5B8CFF', rd:  '#FF6470',
  gn:   '#34d399', pr:  '#B49BFF',
  am:   '#f59e0b', pk:  '#f472b6',
  bull: '#26a69a', bear: '#ef5350',
  sans: "'Instrument Sans', system-ui, sans-serif",
  serif:"'Instrument Serif', serif",
  mono: "'Instrument Sans', system-ui, sans-serif",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap');
@import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.34.1/dist/tabler-icons.min.css');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{font-size:14px;}
:root{
  --bg:#07101E; --s:#0C1A2E; --s2:#112238;
  --br:#1C2C45; --br2:#2A3D5C; --tx:#EEF2F7;
  --nt:#8A9AB2; --fa:#56677F;
  --g:#E2AE4A;  --gd:rgba(226,174,74,.12); --gw:rgba(226,174,74,.06);
  --gn:#34d399; --rd:#FF6470; --bl:#5B8CFF; --pr:#B49BFF;
  --am:#f59e0b; --pk:#f472b6;
  --bull:#26a69a; --bear:#ef5350;
  --nav-h:48px;
  --wl-w:196px;
  --op-w:220px;
  --sans:'Instrument Sans', system-ui, sans-serif;
  --serif:'Instrument Serif',serif;
  --mono:'Instrument Sans', system-ui, sans-serif;
  --r1:6px; --r2:10px; --r3:14px;
}
html,body,#root{font-family:var(--sans);background:var(--bg);color:var(--tx);height:100vh;height:100dvh;overflow:hidden;overscroll-behavior:none;-webkit-font-smoothing:antialiased;}
a{color:inherit;text-decoration:none;}
button{font-family:var(--sans);cursor:pointer;border:none;background:none;color:inherit;}
input,select{font-family:var(--sans);}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-thumb{background:var(--br2);border-radius:4px;}

/* ── NAV ── */
.gnav{
  height:var(--nav-h);flex-shrink:0;
  display:flex;align-items:center;gap:0;
  background:var(--s);border-bottom:1px solid var(--br);
  padding:0 16px;z-index:200;position:relative;
}
.gnav::after{
  content:'';position:absolute;bottom:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,var(--g) 30%,var(--br) 70%,transparent);
  opacity:.15;pointer-events:none;
}
.nav-logo{font-family:var(--serif);font-size:17px;letter-spacing:-.3px;margin-right:8px;}
.nav-logo em{color:var(--g);font-style:normal;}
.nav-live{font-size:8px;font-weight:800;letter-spacing:1.5px;color:#000;background:var(--rd);padding:2px 5px;border-radius:3px;animation:liveblink 2s infinite;}
@keyframes liveblink{0%,100%{opacity:1}50%{opacity:.6}}
.gnav-links{display:flex;gap:2px;margin:0 12px;flex:1;}
.gnav-link{
  display:flex;align-items:center;gap:6px;
  padding:5px 10px;border-radius:var(--r1);
  font-size:12px;font-weight:600;color:var(--nt);
  transition:all .15s;position:relative;
}
.gnav-link i{font-size:15px;}
.gnav-link:hover{color:var(--tx);background:rgba(255,255,255,.04);}
.gnav-link.active{color:var(--g);background:var(--gd);}
.gnav-link-badge{font-size:8px;font-weight:800;background:var(--g);color:#000;padding:1px 5px;border-radius:3px;}
.gnav-right{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.nav-sess{display:flex;align-items:center;gap:8px;}
.nav-sess-logo{width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#000;flex-shrink:0;}
.nav-sess-name{font-size:11px;font-weight:700;}
.nav-sess-bal{font-size:10px;color:var(--nt);font-family:var(--mono);}
.nav-icon-btn{
  width:30px;height:30px;border-radius:var(--r1);
  background:var(--s2);border:1px solid var(--br);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--nt);font-size:16px;
  transition:all .15s;position:relative;
}
.nav-icon-btn:hover{border-color:var(--br2);color:var(--tx);}
.nav-ndot{position:absolute;top:4px;right:4px;width:5px;height:5px;background:var(--rd);border-radius:50%;border:1.5px solid var(--s);}
.nav-av{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--g),#C99331);color:#000;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 0 8px rgba(226,174,74,.2);}
.btn-connect{display:inline-flex;align-items:center;gap:6px;background:var(--g);color:#000;border:none;border-radius:var(--r1);padding:6px 12px;font-size:11px;font-weight:800;font-family:var(--sans);cursor:pointer;transition:all .15s;}
.btn-connect:hover{opacity:.88;box-shadow:0 0 14px rgba(226,174,74,.3);}
.btn-disconnect{display:inline-flex;align-items:center;gap:5px;background:var(--s2);border:1px solid var(--br);color:var(--nt);border-radius:var(--r1);padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;}
.btn-disconnect:hover{border-color:var(--rd);color:var(--rd);}
.nav-hamburger{display:none;flex-direction:column;gap:4px;cursor:pointer;padding:4px;margin-right:8px;}
.nav-hamburger span{display:block;width:18px;height:2px;background:var(--tx);border-radius:2px;}
.mob-nav-connect-only{display:none;}

/* ── SIDEBAR (mobile) ── */
.sidebar-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:299;display:none;backdrop-filter:blur(2px);}
.sidebar-backdrop.open{display:block;}
.sidebar{
  position:fixed;top:0;left:0;width:264px;height:100vh;height:100dvh;
  background:var(--s);border-right:1px solid var(--br);
  z-index:300;transform:translateX(-100%);
  transition:transform .28s cubic-bezier(.4,0,.2,1);
  display:flex;flex-direction:column;
}
.sidebar.open{transform:translateX(0);box-shadow:8px 0 32px rgba(0,0,0,.55);}
.sb-head{
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 16px 14px;border-bottom:1px solid var(--br);flex-shrink:0;
}
.sb-head-logo{font-family:var(--serif);font-size:18px;letter-spacing:-.3px;}
.sb-head-logo em{color:var(--g);font-style:normal;}
.sb-close{
  width:28px;height:28px;border-radius:var(--r1);flex-shrink:0;
  background:var(--s2);border:1px solid var(--br);color:var(--nt);
  display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;
}
.sb-close:hover{border-color:var(--rd);color:var(--rd);}
.sb-scroll{flex:1;overflow-y:auto;padding:10px 0;min-height:0;}
.sb-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--fa);padding:10px 16px 6px;}
.sb-item{display:flex;align-items:center;gap:11px;padding:9px 14px;margin:1px 8px;border-radius:var(--r2);font-size:13px;font-weight:600;color:var(--nt);transition:all .15s;position:relative;}
.sb-item-icon{
  width:30px;height:30px;border-radius:var(--r1);flex-shrink:0;
  background:var(--s2);border:1px solid var(--br);
  display:flex;align-items:center;justify-content:center;
  font-size:15px;color:var(--nt);transition:all .15s;
}
.sb-item-icon i{font-size:15px;}
.sb-item-label{flex:1;}
.sb-item-badge{font-size:8px;font-weight:800;background:var(--g);color:#000;padding:1px 5px;border-radius:3px;}
.sb-item:hover{color:var(--tx);background:rgba(255,255,255,.045);}
.sb-item:hover .sb-item-icon{border-color:var(--br2);color:var(--tx);}
.sb-item.active{color:var(--g);background:var(--gd);}
.sb-item.active .sb-item-icon{background:var(--gd);border-color:rgba(226,174,74,.3);color:var(--g);}
.sb-item.active::before{content:'';position:absolute;left:-8px;top:8px;bottom:8px;width:3px;border-radius:0 3px 3px 0;background:var(--g);}
.sb-divider{height:1px;background:var(--br);margin:8px 16px;}
.sb-user{display:flex;align-items:center;gap:10px;padding:14px 16px;border-top:1px solid var(--br);flex-shrink:0;}
.sb-av{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--g),#C99331);color:#000;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sb-user-info{min-width:0;}
.sb-name{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sb-role{font-size:10px;color:var(--g);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

/* ── TERMINAL SHELL ── */
.term-shell{
  display:grid;
  grid-template-columns:var(--wl-w) 1fr var(--op-w);
  flex:1;overflow:hidden;min-height:0;
}
.term-left{overflow:hidden;border-right:1px solid var(--br);display:flex;flex-direction:column;}
.term-center{display:flex;flex-direction:column;overflow:hidden;min-width:0;}
.term-right{border-left:1px solid var(--br);overflow:hidden;display:flex;flex-direction:column;}

/* ── WATCHLIST ── */
.watchlist{display:flex;flex-direction:column;height:100%;overflow:hidden;}
.wl-account{background:var(--s);border-bottom:1px solid var(--br);padding:10px 12px;}
.wl-acc-broker-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.wl-acc-logo{width:26px;height:26px;border-radius:6px;font-size:9px;font-weight:800;color:#000;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.wl-acc-name{font-size:12px;font-weight:700;}
.wl-acc-server{font-size:9px;color:var(--nt);font-family:var(--mono);}
.wl-acc-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px;}
.wl-acc-row{display:flex;justify-content:space-between;font-size:10px;}
.wl-acc-row span:first-child{color:var(--nt);}
.wl-head{
  display:grid;grid-template-columns:1fr 56px 56px;
  padding:5px 8px;border-bottom:1px solid var(--br);
  font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--nt);
  background:var(--s2);flex-shrink:0;
}
.wl-body{flex:1;overflow-y:auto;}
.wl-cat{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:var(--fa);padding:6px 8px 3px;background:var(--bg);}
.wl-row{
  display:grid;grid-template-columns:1fr 56px 56px;
  padding:5px 8px;cursor:pointer;transition:background .1s;
  border-bottom:1px solid rgba(30,37,53,.5);align-items:center;position:relative;
}
.wl-row:hover{background:rgba(255,255,255,.025);}
.wl-row.active{background:var(--gd);}
.wl-row.active::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--g);}
.wl-sym{font-size:11px;font-weight:800;display:block;letter-spacing:.2px;}
.wl-chg{font-size:9px;font-weight:600;}
.wl-price{font-family:var(--mono);font-size:11px;font-weight:600;text-align:right;}
.wl-ask{color:var(--nt);}
.wl-remove{
  position:absolute;right:4px;top:50%;transform:translateY(-50%);
  font-size:9px;color:var(--nt);opacity:0;
  transition:opacity .15s;background:transparent;border:none;cursor:pointer;padding:2px 4px;
}
.wl-row:hover .wl-remove{opacity:1;}
.wl-add-row{flex-shrink:0;border-top:1px solid var(--br);padding:8px;}
.wl-add-btn{width:100%;background:rgba(226,174,74,.07);border:1px solid rgba(226,174,74,.2);color:var(--g);border-radius:var(--r1);padding:6px;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;transition:all .15s;}
.wl-add-btn:hover{background:rgba(226,174,74,.12);}
.flash-up{animation:fup .3s ease;}
.flash-dn{animation:fdn .3s ease;}
@keyframes fup{0%,100%{color:inherit}50%{color:var(--gn)}}
@keyframes fdn{0%,100%{color:inherit}50%{color:var(--rd)}}

/* ── TOOLBAR ── */
.toolbar{
  display:flex;align-items:center;gap:4px;
  height:38px;flex-shrink:0;
  background:var(--s);border-bottom:1px solid var(--br);
  padding:0 8px;overflow-x:auto;overflow-y:hidden;
}
.tb-sym-block{display:flex;align-items:center;gap:8px;flex-shrink:0;padding-right:8px;}
.tb-sym{font-size:13px;font-weight:800;letter-spacing:.3px;}
.tb-bid{font-family:var(--mono);font-size:12px;font-weight:700;}
.tb-chg{font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px;}
.tb-div{width:1px;height:18px;background:var(--br);margin:0 4px;flex-shrink:0;}
.tb-tf-group{display:flex;gap:2px;flex-shrink:0;}
.tb-tf{
  font-size:10px;font-weight:700;padding:3px 7px;border-radius:var(--r1);
  background:transparent;color:var(--nt);cursor:pointer;transition:all .15s;border:none;
}
.tb-tf:hover{color:var(--tx);}
.tb-tf.active{background:var(--gd);color:var(--g);}
.tb-tool{
  width:26px;height:26px;border-radius:var(--r1);
  background:transparent;color:var(--nt);cursor:pointer;
  display:flex;align-items:center;justify-content:center;font-size:14px;
  transition:all .15s;border:none;
}
.tb-tool:hover{background:rgba(255,255,255,.05);color:var(--tx);}
.tb-tool.active{background:var(--gd);color:var(--g);}
.tb-chart-type{display:flex;gap:2px;flex-shrink:0;}

/* ── CHART ── */
.chart-area{flex:1;position:relative;overflow:hidden;background:var(--bg);z-index:1;}
.is-mobile .chart-area{z-index:1;}
.chart-svg-wrap{width:100%;height:100%;min-height:300px;position:relative;}
.chart-svg{width:100%;height:100%;display:block;}
.chart-placeholder{display:flex;align-items:center;justify-content:center;height:100%;}
.chart-loader{display:flex;gap:5px;}
.chart-loader span{width:5px;height:5px;border-radius:50%;background:var(--g);animation:ldot 1.1s ease-in-out infinite;}
.chart-loader span:nth-child(2){animation-delay:.2s;}
.chart-loader span:nth-child(3){animation-delay:.4s;}
@keyframes ldot{0%,80%,100%{transform:scale(0);opacity:.3}40%{transform:scale(1);opacity:1}}
.chart-tooltip{
  position:absolute;pointer-events:none;z-index:10;
  background:var(--s);border:1px solid var(--br2);
  border-radius:var(--r2);padding:8px 10px;min-width:110px;
}
.ct-row{display:flex;justify-content:space-between;gap:16px;font-size:10px;margin-bottom:2px;}
.ct-row span:first-child{color:var(--nt);}
.mono{font-family:var(--mono);}
.up{color:var(--gn)!important;}
.dn{color:var(--rd)!important;}
.text-gold{color:var(--g)!important;}
.text-muted{color:var(--nt)!important;}

/* ── BOTTOM PANEL ── */
.term-bottom{height:160px;flex-shrink:0;border-top:1px solid var(--br);display:flex;flex-direction:column;}
.bp-tabs{display:flex;gap:0;border-bottom:1px solid var(--br);background:var(--s);flex-shrink:0;}
.bp-tab{
  display:flex;align-items:center;gap:6px;
  padding:7px 14px;font-size:11px;font-weight:700;
  color:var(--nt);cursor:pointer;border-right:1px solid var(--br);
  transition:all .15s;background:transparent;border-top:none;border-left:none;border-bottom:2px solid transparent;
}
.bp-tab:hover{color:var(--tx);}
.bp-tab.active{color:var(--g);border-bottom-color:var(--g);background:var(--gd);}
.bp-tab i{font-size:13px;}
.bal-bar{display:flex;align-items:center;gap:0;border-bottom:1px solid var(--br);background:var(--s);flex-shrink:0;padding:0 6px;height:36px;overflow-x:auto;}
.bal-stat{display:flex;flex-direction:column;align-items:flex-start;padding:0 14px;border-right:1px solid var(--br);min-width:fit-content;}
.bal-stat:last-child{border-right:none;}
.bal-stat-lbl{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--nt);}
.bal-stat-val{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--tx);line-height:1.2;}
.bal-stat-val.up{color:var(--gn);}
.bal-stat-val.dn{color:var(--rd);}
.bal-stat-val.gold{color:#f0b429;}
.mob-nav-btn-inner{display:flex;flex-direction:column;align-items:center;gap:1px;}
.mob-nav-lbl{font-size:8px;font-family:var(--mono);font-weight:600;letter-spacing:.3px;color:inherit;line-height:1;}
.mob-bal-bar{display:flex;align-items:center;gap:0;background:var(--s);border-bottom:1px solid var(--br);padding:6px 12px;flex-shrink:0;}
.mob-bal-item{display:flex;flex-direction:column;align-items:flex-start;flex:1;}
.mob-bal-lbl{font-size:9px;text-transform:uppercase;letter-spacing:.7px;color:var(--nt);font-weight:600;}
.mob-bal-val{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--tx);}
.mob-bal-val.gold{color:#f0b429;}
.mob-bal-val.up{color:var(--gn);}
.mob-bal-val.dn{color:var(--rd);}
.mob-bal-divider{width:1px;height:28px;background:var(--br);margin:0 8px;flex-shrink:0;}
/* mob-bal-bar visibility is controlled by .is-mobile class (JS-driven) */
.gt-widget{display:inline-flex;align-items:center;margin-left:8px;}
.gt-widget .goog-te-gadget{font-size:0 !important;}
.gt-widget select{background:var(--s2);color:var(--tx);border:1px solid var(--br);border-radius:4px;font-size:10px;padding:2px 4px;cursor:pointer;font-family:var(--mono);}
.bp-content{flex:1;overflow:auto;}
.blotter{height:100%;}
.blotter-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:5px 12px;background:var(--s2);border-bottom:1px solid var(--br);
  font-size:11px;flex-shrink:0;
}
.blotter-total{font-family:var(--mono);font-size:11px;font-weight:700;}
.pos-badge{font-size:9px;font-weight:800;background:rgba(226,174,74,.2);color:var(--g);padding:1px 5px;border-radius:3px;margin-left:5px;}
.dt-wrap{overflow:auto;height:calc(100% - 30px);}
.dt{width:100%;border-collapse:collapse;font-size:11px;}
.dt th{
  position:sticky;top:0;z-index:1;
  text-align:left;padding:5px 8px;
  color:var(--nt);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;
  background:var(--s2);border-bottom:1px solid var(--br);white-space:nowrap;
}
.dt td{padding:6px 8px;border-bottom:1px solid rgba(30,37,53,.6);white-space:nowrap;}
.dt tr:hover td{background:rgba(255,255,255,.02);}
.badge{display:inline-block;font-size:9px;font-weight:800;padding:1px 6px;border-radius:3px;}
.badge-green{background:rgba(52,211,153,.15);color:var(--gn);}
.badge-red{background:rgba(248,113,113,.15);color:var(--rd);}
.pos-close-btn{background:transparent;border:none;color:var(--nt);cursor:pointer;font-size:11px;padding:1px 5px;border-radius:3px;transition:all .15s;}
.pos-close-btn:hover{background:var(--rd-dim, rgba(248,113,113,.1));color:var(--rd);}
.journal{padding:10px 14px;font-family:var(--mono);font-size:10px;color:var(--nt);line-height:1.9;}
.journal-time{color:var(--g);}

/* ── ORDER PANEL ── */
.order-panel{display:flex;flex-direction:column;height:100%;overflow-y:auto;background:var(--s);}
.op-header{padding:10px 12px;border-bottom:1px solid var(--br);flex-shrink:0;}
.op-sym-name{font-size:15px;font-weight:800;letter-spacing:.3px;}
.op-sym-label{font-size:10px;color:var(--nt);margin-top:1px;}
.op-prices{
  display:grid;grid-template-columns:1fr 40px 1fr;
  padding:10px 10px 8px;border-bottom:1px solid var(--br);
  flex-shrink:0;gap:4px;
}
.op-side{border-radius:var(--r2);padding:8px 6px;text-align:center;cursor:pointer;transition:all .15s;}
.op-sell{background:rgba(239,83,80,.08);border:1px solid rgba(239,83,80,.2);}
.op-sell:hover{background:rgba(239,83,80,.14);}
.op-buy{background:rgba(38,166,154,.08);border:1px solid rgba(38,166,154,.2);}
.op-buy:hover{background:rgba(38,166,154,.14);}
.op-side.disabled{cursor:not-allowed;opacity:.4;pointer-events:none;}
.op-side-lbl{font-size:9px;font-weight:800;letter-spacing:1px;}
.op-side-price{font-family:var(--mono);font-size:14px;font-weight:800;margin-top:2px;}
.op-spread-col{display:flex;flex-direction:column;align-items:center;justify-content:center;}
.op-spread-val{font-family:var(--mono);font-size:11px;font-weight:700;color:var(--nt);}
.op-spread-lbl{font-size:8px;color:var(--nt);margin-top:1px;}
.op-body{padding:10px 10px;flex:1;display:flex;flex-direction:column;gap:8px;}
.op-balance-warn{
  display:flex;align-items:center;gap:6px;
  background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);
  color:var(--am);font-size:11px;font-weight:600;line-height:1.4;
  border-radius:var(--r1);padding:8px 10px;
}
.op-balance-warn i{font-size:14px;flex-shrink:0;}
.op-type-row{display:flex;gap:3px;background:var(--s2);border-radius:var(--r1);padding:3px;}
.op-type-btn{flex:1;font-size:10px;font-weight:700;padding:4px 0;border-radius:5px;text-align:center;background:transparent;color:var(--nt);transition:all .15s;}
.op-type-btn.active{background:var(--s);color:var(--tx);box-shadow:0 1px 3px rgba(0,0,0,.3);}
.op-field label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--nt);display:block;margin-bottom:4px;}
.op-field label.up{color:var(--gn);}
.op-field label.dn{color:var(--rd);}
.op-num-row{display:flex;align-items:center;gap:3px;}
.op-stepper{
  width:26px;height:26px;border-radius:var(--r1);flex-shrink:0;
  background:var(--s2);border:1px solid var(--br);color:var(--tx);
  font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;
  transition:all .15s;
}
.op-stepper:hover{border-color:var(--br2);}
.op-input{
  flex:1;background:var(--s2);border:1px solid var(--br);color:var(--tx);
  border-radius:var(--r1);padding:4px 8px;font-size:12px;text-align:center;
  outline:none;transition:border-color .15s;height:26px;
}
.op-input.full{text-align:left;flex:none;width:100%;}
.op-input:focus{border-color:var(--g);}
.op-sl-tp{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
.op-exec-row{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px;}
.op-exec-btn{
  border:none;border-radius:var(--r2);padding:10px 6px;cursor:pointer;
  display:flex;flex-direction:column;align-items:center;gap:2px;
  font-family:var(--sans);transition:all .15s;
}
.op-exec-sell{background:var(--bear);color:#fff;}
.op-exec-sell:hover{filter:brightness(1.1);}
.op-exec-buy{background:var(--bull);color:#fff;}
.op-exec-buy:hover{filter:brightness(1.1);}
.op-exec-btn:disabled{opacity:.35;cursor:not-allowed;filter:none;}
.op-exec-lbl{font-size:11px;font-weight:800;letter-spacing:1.5px;}
.op-exec-px{font-family:var(--mono);font-size:12px;font-weight:600;}
.op-info{
  display:flex;justify-content:space-between;
  font-size:10px;color:var(--nt);padding:0 2px;margin-top:2px;
}
.flash-red{animation:fred .4s ease;}
.flash-green{animation:fgreen .4s ease;}
@keyframes fred{0%,100%{background:rgba(239,83,80,.08)}50%{background:rgba(239,83,80,.35)}}
@keyframes fgreen{0%,100%{background:rgba(38,166,154,.08)}50%{background:rgba(38,166,154,.35)}}

/* ── FOOTER ── */
.term-footer{
  height:22px;flex-shrink:0;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 14px;background:var(--s2);border-top:1px solid var(--br);
  font-size:9px;color:var(--nt);letter-spacing:.3px;
}
.tf-logo{font-family:var(--serif);font-size:11px;}
.tf-logo em{color:var(--g);font-style:normal;}
.tf-sep{margin:0 6px;opacity:.3;}
.tf-right a{color:var(--nt);margin-left:10px;}
.tf-right a:hover{color:var(--tx);}

/* ── MODALS ── */
.modal-overlay{
  position:fixed;inset:0;background:rgba(0,0,0,.75);
  display:flex;align-items:center;justify-content:center;
  z-index:500;padding:16px;
}
.modal{
  background:var(--s);border:1px solid var(--br);border-radius:16px;
  width:100%;max-width:460px;max-height:88vh;overflow-y:auto;
  padding:20px;position:relative;
}
.modal-title{font-family:var(--serif);font-size:18px;margin-bottom:12px;}
.modal-close{position:absolute;top:14px;right:14px;background:transparent;border:1px solid var(--br);color:var(--nt);border-radius:6px;width:26px;height:26px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .15s;}
.modal-close:hover{border-color:var(--rd);color:var(--rd);}

/* Connect modal */
.conn-sub{font-size:12px;color:var(--nt);margin-bottom:14px;}
.conn-search-wrap{position:relative;margin-bottom:12px;}
.conn-search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--nt);font-size:14px;pointer-events:none;}
.conn-search{
  width:100%;background:var(--s2);border:1px solid var(--br);color:var(--tx);
  border-radius:var(--r2);padding:8px 32px;font-size:13px;outline:none;transition:border-color .15s;
}
.conn-search:focus{border-color:var(--g);}
.conn-clear{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:transparent;border:none;color:var(--nt);cursor:pointer;font-size:13px;}
.conn-broker-list{max-height:300px;overflow-y:auto;border-radius:var(--r2);border:1px solid var(--br);overflow:hidden;}
.conn-broker-row{display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;transition:background .15s;border-bottom:1px solid var(--br);}
.conn-broker-row:last-child{border-bottom:none;}
.conn-broker-row:hover{background:var(--s2);}
.conn-broker-logo{width:32px;height:32px;border-radius:8px;font-size:9px;font-weight:800;color:#000;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.conn-broker-name{font-size:13px;font-weight:700;}
.conn-broker-meta{font-size:10px;color:var(--nt);margin-top:1px;}
.conn-popular{margin-left:auto;font-size:9px;font-weight:800;background:var(--gd);color:var(--g);padding:2px 6px;border-radius:3px;flex-shrink:0;}
.conn-security{display:flex;align-items:flex-start;gap:6px;font-size:10px;color:var(--nt);margin-top:14px;line-height:1.5;background:var(--s2);border-radius:var(--r1);padding:8px 10px;}
.conn-security i{color:var(--g);font-size:13px;flex-shrink:0;margin-top:1px;}
.conn-back{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--nt);margin-bottom:4px;padding:4px 0;background:transparent;border:none;cursor:pointer;transition:color .15s;}
.conn-back:hover{color:var(--tx);}
.conn-broker-badge{width:28px;height:28px;border-radius:7px;font-size:9px;font-weight:800;color:#000;display:inline-flex;align-items:center;justify-content:center;margin-right:8px;vertical-align:middle;}
.conn-section-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--nt);margin-bottom:8px;display:flex;align-items:center;gap:8px;}
.conn-loading-badge{font-size:9px;color:var(--am);background:rgba(245,158,11,.1);padding:2px 6px;border-radius:3px;}
.conn-plat-row{display:flex;gap:6px;margin-bottom:4px;}
.conn-plat-btn{padding:5px 12px;border-radius:var(--r1);font-size:11px;font-weight:700;background:var(--s2);border:1px solid var(--br);color:var(--nt);cursor:pointer;transition:all .15s;}
.conn-plat-btn.active{background:var(--gd);border-color:rgba(226,174,74,.3);color:var(--g);}
.conn-server-list{border:1px solid var(--br);border-radius:var(--r2);overflow:hidden;max-height:200px;overflow-y:auto;margin-bottom:4px;}
.conn-server-row{padding:10px 12px;cursor:pointer;transition:background .15s;border-bottom:1px solid var(--br);display:flex;align-items:center;justify-content:space-between;}
.conn-server-row:last-child{border-bottom:none;}
.conn-server-row:hover{background:var(--s2);}
.conn-server-row.active{background:var(--gd);}
.conn-server-name{font-size:12px;font-weight:700;font-family:var(--mono);margin-bottom:3px;}
.conn-server-meta{display:flex;gap:8px;font-size:10px;color:var(--nt);}
.srv-live{color:var(--gn);font-weight:700;}
.srv-demo{color:var(--am);font-weight:700;}
.conn-srv-loading{display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px;color:var(--nt);font-size:12px;}
.conn-continue-btn{width:100%;margin-top:14px;background:var(--g);color:#000;border:none;border-radius:var(--r2);padding:10px;font-size:13px;font-weight:800;cursor:pointer;font-family:var(--sans);transition:all .15s;}
.conn-continue-btn:hover{opacity:.88;}
.conn-continue-btn:disabled{opacity:.35;cursor:not-allowed;}
.conn-login-summary{background:var(--s2);border:1px solid var(--br);border-radius:var(--r2);padding:12px;margin-bottom:14px;}
.conn-summ-row{display:flex;justify-content:space-between;font-size:12px;padding:3px 0;}
.conn-summ-row span:first-child{color:var(--nt);}
.conn-live-warn{display:flex;align-items:flex-start;gap:6px;font-size:11px;color:var(--am);background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:var(--r1);padding:8px 10px;margin-bottom:12px;line-height:1.5;}
.conn-field{margin-bottom:10px;}
.conn-field label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--nt);display:block;margin-bottom:5px;}
.conn-field input{
  width:100%;background:var(--s2);border:1px solid var(--br);color:var(--tx);
  border-radius:var(--r1);padding:8px 10px;font-size:12px;outline:none;transition:border-color .15s;
}
.conn-field input:focus{border-color:var(--g);}
.conn-eye{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:transparent;border:none;color:var(--nt);cursor:pointer;font-size:14px;}
.conn-error{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--rd);background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);border-radius:var(--r1);padding:8px 10px;margin-bottom:10px;}
.conn-anim{display:flex;flex-direction:column;align-items:center;padding:20px 0;}
.conn-anim-logo{width:52px;height:52px;border-radius:14px;font-size:14px;font-weight:800;color:#000;display:flex;align-items:center;justify-content:center;margin-bottom:16px;position:relative;z-index:1;}
.conn-anim-ring{
  position:absolute;width:68px;height:68px;border-radius:50%;
  border:2px solid var(--g);border-top-color:transparent;
  animation:spin 1s linear infinite;margin-top:-8px;
}
@keyframes spin{to{transform:rotate(360deg)}}
.conn-anim-title{font-family:var(--serif);font-size:16px;margin-bottom:16px;margin-top:10px;}
.conn-step{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--nt);margin-bottom:8px;transition:color .3s;}
.conn-step.done{color:var(--gn);}
.conn-step-check{width:16px;height:16px;border-radius:50%;background:var(--s2);border:1px solid var(--br);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:9px;}
.conn-step.done .conn-step-check{background:var(--gn);border-color:var(--gn);color:#000;}
.conn-step-dot{width:5px;height:5px;border-radius:50%;background:var(--nt);}

/* Add symbol modal */
.sym-add-list{overflow-y:auto;flex:1;max-height:320px;}
.mob-sym-add-btn{
  width:30px;height:30px;border-radius:50%;flex-shrink:0;
  background:rgba(226,174,74,.1);border:1px solid rgba(226,174,74,.3);color:var(--g);
  display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;
}
.mob-sym-add-btn:hover{background:rgba(226,174,74,.18);}
.mob-sym-add-btn:active{transform:scale(.94);}

/* ── ORDER TOAST ── */
.order-toast{
  position:fixed;bottom:36px;left:50%;transform:translateX(-50%);
  background:var(--s);border:1px solid var(--g);border-radius:var(--r2);
  padding:8px 18px;font-size:12px;font-weight:700;
  display:flex;align-items:center;gap:8px;z-index:400;
  box-shadow:0 0 20px rgba(226,174,74,.2);
  animation:toastin .3s ease;
}
.order-toast i{color:var(--g);}
@keyframes toastin{from{opacity:0;transform:translateX(-50%) translateY(10px)}}

/* ── RESPONSIVE ── */

/* ── XL / 4K / Wide (≥1600px) ── */
@media(min-width:1600px){
  :root{--wl-w:224px;--op-w:260px;--nav-h:54px;}
  html{font-size:15px;}
  .nav-logo{font-size:19px;}
  .gnav-link{font-size:13px;padding:6px 13px;}
  .gnav-link i{font-size:17px;}
  .term-footer{height:26px;font-size:10px;}
}
@media(min-width:2000px){
  :root{--wl-w:260px;--op-w:300px;}
  html{font-size:16px;}
}

/* ── Medium desktop (821–1100px) ── */
@media(max-width:1100px) and (min-width:821px){
  :root{--wl-w:164px;--op-w:190px;}
  .gnav-link span{display:none;}
  .gnav-link{padding:5px 8px;}
  .bp-tab{padding:7px 10px;font-size:10px;}
}

/* ── Tablet landscape (769–820px) ── */
@media(max-width:820px) and (min-width:769px){
  .term-shell{grid-template-columns:var(--wl-w) 1fr;}
  .term-right{display:none;}
  .gnav-links{display:none;}
  .nav-hamburger{display:flex;}
  .tab-trade-fab{
    display:flex;align-items:center;justify-content:center;
    position:fixed;bottom:18px;right:16px;
    width:52px;height:52px;border-radius:50%;
    background:var(--g);color:#000;font-size:22px;
    box-shadow:0 4px 18px rgba(226,174,74,.35);
    z-index:250;cursor:pointer;border:none;transition:all .2s;
  }
  .tab-trade-fab:hover{transform:scale(1.07);}
  .term-right.tab-open{
    display:flex;position:fixed;right:0;top:var(--nav-h);bottom:22px;
    width:var(--op-w);z-index:240;
    box-shadow:-4px 0 20px rgba(0,0,0,.5);
  }
}
@media(min-width:821px){
  .tab-trade-fab{display:none;}
}

/* ── MOBILE PANES: hidden by default, JS class .is-mobile reveals them ── */
.mob-pane{display:none!important;background:var(--bg);}
.mob-bottom-nav{display:none;}
.mob-bal-bar{display:none;}

/* When JS adds .is-mobile to the root wrapper */
.is-mobile .term-shell{display:none!important;}
.is-mobile .term-footer{display:none;}
.is-mobile .tab-trade-fab{display:none!important;}
/* Wrapper takes all remaining height between bal-bar and bottom nav */
.mob-panes-wrapper{display:none;min-height:0;position:relative;background:var(--bg);}
.is-mobile .mob-panes-wrapper{display:flex;flex-direction:column;flex:1 1 0%;overflow:hidden;min-height:0;background:var(--bg);}
.is-mobile .mob-pane{display:flex!important;flex-direction:column;flex:1;overflow:hidden;min-height:0;}
.is-mobile .mob-pane.hidden{display:none!important;}
.is-mobile .mob-bottom-nav{
  display:flex;
  height:58px;flex-shrink:0;flex-grow:0;
  background:var(--s);border-top:1px solid var(--br);
  flex-direction:row;align-items:stretch;z-index:100;
  padding-bottom:env(safe-area-inset-bottom,0);
  width:100%;
}
.is-mobile .mob-bal-bar{display:flex;}

/* Mobile header: only show hamburger + connect button */
.is-mobile .gnav{padding:0 12px;justify-content:space-between;}
.is-mobile .nav-logo{display:none;}
.is-mobile .nav-live{display:none;}
.is-mobile .gnav-links{display:none!important;}
.is-mobile .gnav-right{display:none;}
.is-mobile .nav-hamburger{display:flex;}
.is-mobile .mob-nav-connect-only{
  display:flex;align-items:center;gap:8px;
}


/* ── Mobile touch / size tweaks ── */
.is-mobile .mob-nav-btn{min-width:44px;min-height:44px;}
.is-mobile .mob-tit{padding:12px 6px;min-height:44px;}
.is-mobile .mob-sym-row{padding:13px 14px;min-height:48px;}
.is-mobile .mob-pos-close{padding:11px;min-height:44px;}
.is-mobile .modal{padding:16px;border-radius:12px;}
.is-mobile .modal-overlay{padding:8px;}
.is-mobile .order-toast{bottom:74px;}
/* iOS Safari force-zooms the page on focus of any input under 16px — this reads as
   a "glitch" (sudden zoom + snap back). Force mobile inputs to 16px to prevent it. */
.is-mobile .op-input,
.is-mobile .conn-field input,
.is-mobile .conn-search{font-size:16px!important;}

/* ── Very small phones (≤375px) ── */
@media(max-width:375px){
  html{font-size:12px;}
  .mob-sym-name{font-size:12px;}
  .mob-ct-sym{font-size:13px;}
  .mob-pos-sym{font-size:13px;}
  .mob-nav-btn i,.mob-nav-btn svg{font-size:20px;width:20px;height:20px;}
  .is-mobile .mob-bottom-nav{height:62px;}
  .modal{padding:12px;}
  .conn-broker-list{max-height:220px;}
}

/* ── Very small phones landscape (short height) ── */
@media(max-height:500px) and (max-width:900px){
  .is-mobile .mob-bottom-nav{height:48px;}
  .mob-nav-btn i,.mob-nav-btn svg{font-size:18px;width:18px;height:18px;}
  .mob-nav-lbl{display:none;}
  .mob-bal-bar{padding:4px 12px;}
  .mob-bal-lbl{font-size:8px;}
  .mob-bal-val{font-size:11px;}
}
.mob-nav-btn{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:4px;color:var(--nt);background:transparent;border:none;cursor:pointer;
  transition:color .15s;position:relative;
}
.mob-nav-btn i,.mob-nav-btn svg{font-size:22px;line-height:1;width:22px;height:22px;flex-shrink:0;transition:transform .15s;}
.mob-nav-btn.active{color:var(--g);}
.mob-nav-btn.active i,.mob-nav-btn.active svg{filter:drop-shadow(0 0 6px rgba(226,174,74,.5));}
.mob-nav-btn.active svg{transform:scale(1.08);}
.mob-nav-badge{
  position:absolute;top:6px;right:calc(50% - 18px);
  min-width:16px;height:16px;border-radius:8px;
  background:var(--rd);color:#fff;font-size:8px;font-weight:800;
  display:flex;align-items:center;justify-content:center;padding:0 3px;
  border:2px solid var(--s);
}

/* ── MOBILE SYMBOL SCREEN ── */
.mob-sym-screen{display:flex;flex-direction:column;height:100%;background:var(--bg);}
.mob-sym-header{
  padding:12px 14px 8px;background:var(--s);border-bottom:1px solid var(--br);
  flex-shrink:0;
}
.mob-sym-title{font-size:13px;font-weight:800;letter-spacing:.4px;color:var(--nt);text-transform:uppercase;}
.mob-sym-list{flex:1;overflow-y:auto;}
.mob-sym-cat{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:1.4px;color:var(--fa);padding:8px 14px 4px;background:var(--bg);}
.mob-sym-row{
  display:grid;grid-template-columns:1fr 70px 70px;
  align-items:center;padding:11px 14px;
  border-bottom:1px solid rgba(30,37,53,.6);cursor:pointer;transition:background .1s;
}
.mob-sym-row:hover,.mob-sym-row.active{background:var(--gd);}
.mob-sym-row.active{border-left:2px solid var(--g);}
.mob-sym-name{font-size:13px;font-weight:800;letter-spacing:.2px;display:block;}
.mob-sym-label{font-size:9px;color:var(--nt);margin-top:1px;display:block;}
.mob-sym-chg{font-size:9px;font-weight:700;margin-top:2px;display:block;}
.mob-sym-price{font-family:var(--mono);font-size:12px;font-weight:700;text-align:right;}
.mob-sym-ask{color:var(--nt);}

/* ── MOBILE CHART PANE ── */
.mob-chart-pane{display:flex;flex-direction:column;height:100%;position:relative;overflow:visible;}
/* chart toolbar: only sym info + dropdowns */
.mob-chart-toolbar{
  display:flex;align-items:center;gap:6px;
  height:40px;flex-shrink:0;background:var(--s);
  border-bottom:1px solid var(--br);padding:0 10px;
  /* overflow must stay visible so TF / chart-type dropdowns paint over the chart */
  overflow:visible;
  position:relative;
  z-index:30;
}
.mob-ct-sym{font-size:14px;font-weight:800;letter-spacing:.3px;}
.mob-ct-price{font-family:var(--mono);font-size:12px;font-weight:700;}
.mob-ct-chg{font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px;}
.mob-ct-spacer{flex:1;}

/* ── MOBILE DROPDOWN SHARED ── */
.mob-dd{position:relative;flex-shrink:0;z-index:40;}
.mob-dd-btn{
  display:flex;align-items:center;gap:4px;
  padding:4px 9px;border-radius:var(--r1);border:1px solid var(--br);
  background:var(--s2);color:var(--tx);font-size:11px;font-weight:700;cursor:pointer;
  white-space:nowrap;height:28px;
}
.mob-dd-btn.accent{background:var(--gd);border-color:rgba(226,174,74,.25);color:var(--g);}
.mob-dd-btn i.ch{font-size:11px;color:var(--nt);}
.mob-dd-menu{
  position:absolute;top:calc(100% + 5px);left:0;z-index:50;
  background:var(--s);border:1px solid var(--br2);border-radius:var(--r2);
  box-shadow:0 10px 30px rgba(0,0,0,.6);overflow:hidden;
  display:none;
}
.mob-dd-menu.open{display:block;}
/* Align chart-type menu to the right edge of its trigger so it stays on-screen */
.mob-dd-menu.ct-grid{right:0;left:auto;}
/* TF menu: 3-col grid */
.mob-dd-menu.tf-grid{display:none;grid-template-columns:repeat(3,1fr);min-width:150px;}
.mob-dd-menu.tf-grid.open{display:grid;}
.mob-dd-tf-opt{
  padding:10px 14px;font-size:11px;font-weight:700;color:var(--nt);
  cursor:pointer;text-align:center;transition:all .12s;
}
.mob-dd-tf-opt:hover{background:rgba(255,255,255,.04);color:var(--tx);}
.mob-dd-tf-opt.active{color:var(--g);background:var(--gd);}
/* Chart type: 3-col icon grid */
.mob-dd-menu.ct-grid{display:none;grid-template-columns:repeat(3,1fr);min-width:120px;}
.mob-dd-menu.ct-grid.open{display:grid;}
.mob-dd-ct-opt{
  padding:12px;display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--nt);font-size:17px;transition:all .12s;
  border-right:1px solid var(--br);
}
.mob-dd-ct-opt:hover{background:rgba(255,255,255,.05);color:var(--tx);}
.mob-dd-ct-opt.active{color:var(--g);background:var(--gd);}

/* ── MOBILE TRADE SCREEN ── */
.mob-trade-screen{display:flex;flex-direction:column;height:100%;background:var(--bg);}
.mob-trade-header{
  padding:12px 14px 8px;background:var(--s);border-bottom:1px solid var(--br);
  display:flex;align-items:center;justify-content:space-between;flex-shrink:0;
}
.mob-trade-title{font-size:13px;font-weight:800;letter-spacing:.4px;color:var(--nt);text-transform:uppercase;}
.mob-trade-inner-tabs{display:flex;gap:0;border-bottom:1px solid var(--br);flex-shrink:0;background:var(--s2);}
.mob-tit{flex:1;padding:10px 6px;font-size:11px;font-weight:700;text-align:center;color:var(--nt);cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;}
.mob-tit.active{color:var(--g);border-bottom-color:var(--g);background:var(--gd);}
.mob-trade-content{flex:1;overflow-y:auto;}

/* positions card list */
.mob-pos-list{padding:10px;}
.mob-pos-card{background:var(--s2);border:1px solid var(--br);border-radius:var(--r2);padding:12px;margin-bottom:10px;}
.mob-pos-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.mob-pos-sym{font-size:14px;font-weight:800;letter-spacing:.3px;}
.mob-pos-pl{font-family:var(--mono);font-size:14px;font-weight:800;}
.mob-pos-row{display:flex;justify-content:space-between;font-size:11px;color:var(--nt);margin-bottom:4px;}
.mob-pos-row span:last-child{color:var(--tx);font-family:var(--mono);}
.mob-pos-close{
  width:100%;margin-top:10px;padding:9px;border-radius:var(--r1);
  background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);
  color:var(--rd);font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;
}

/* new trade form */
.mob-order-form{padding:14px;}

/* ═══ Global Desk layer (matches dashboard) ═══ */
:root{ --nav-h:56px; --r1:8px; --r2:10px; --r3:14px; }
html,body,#root{font-variant-numeric:tabular-nums;}
:focus-visible{outline:2px solid var(--g);outline-offset:2px;border-radius:4px;}
.gnav{padding:0 18px;gap:14px;background:var(--s);}
.gnav::after{display:none;}
.nav-logo{display:flex;align-items:center;margin-right:0;}
.nav-logo img{height:28px;width:auto;display:block;}
.nav-live{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 9px;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:0;color:var(--tx);background:var(--s2);border:1px solid var(--br);animation:none;}
.nav-live i{width:7px;height:7px;border-radius:50%;background:var(--gn);animation:termLive 2s ease-out infinite;}
@keyframes termLive{0%{box-shadow:0 0 0 0 rgba(52,211,153,.55)}100%{box-shadow:0 0 0 7px rgba(52,211,153,0)}}
.gnav-links{gap:2px;margin:0;min-width:0;overflow:hidden;}
.gnav-link{height:36px;padding:0 11px;border-radius:9px;font-size:13.5px;font-weight:500;white-space:nowrap;}
.gnav-link i{font-size:17px;}
.gnav-link:hover{background:var(--s2);}
.gnav-link.active{color:var(--tx);background:var(--s2);font-weight:600;box-shadow:inset 0 -2px 0 var(--g);}
.gnav-link.active i{color:var(--g);}
.gnav-link-badge{font-size:10.5px;font-weight:700;letter-spacing:0;padding:2px 6px;border-radius:6px;background:var(--gd);color:var(--g);}
@media (max-width:1440px){.gnav-secondary{display:none;}}
@media (max-width:1240px){.gnav-link{padding:0 8px;} .gnav-link i{display:none;}}
.nav-sess-name{font-size:13px;font-weight:600;}
.nav-acc{font-size:11px;font-weight:700;padding:1px 6px;border-radius:5px;background:var(--s2);color:var(--nt);margin-left:4px;}
.nav-acc.live{background:rgba(52,211,153,.14);color:var(--gn);}
.nav-sess-bal{font-size:12.5px;color:var(--tx);font-family:var(--sans);}
.nav-icon-btn{width:38px;height:38px;border-radius:10px;background:none;border:1px solid transparent;font-size:18px;}
.nav-icon-btn:hover{background:var(--s2);border-color:var(--br);}
.nav-ndot{top:8px;right:9px;width:7px;height:7px;background:var(--g);border:2px solid var(--s);}
.nav-menu{position:relative;}
.nav-av{width:36px;height:36px;font-size:12.5px;font-weight:700;background:linear-gradient(145deg,#1C3A6E,#07101E);color:var(--g);border:1px solid var(--br2);box-shadow:none;}
.nav-drop{position:absolute;right:0;top:calc(100% + 8px);z-index:500;min-width:230px;padding:6px;border-radius:12px;background:var(--s);border:1px solid var(--br);box-shadow:0 24px 48px -16px rgba(0,0,0,.6);}
.nav-drop-head{display:flex;flex-direction:column;padding:10px 12px;border-bottom:1px solid var(--br);margin-bottom:4px;}
.nav-drop-head strong{font-size:14px;}
.nav-drop-head span{font-size:12.5px;color:var(--nt);}
.nav-drop-item{display:flex;align-items:center;gap:10px;width:100%;padding:9px 12px;border-radius:8px;font-size:14px;color:var(--nt);text-align:left;}
.nav-drop-item i{font-size:17px;}
.nav-drop-item:hover{background:var(--s2);color:var(--tx);}
.nav-drop-out:hover{color:var(--rd);}
.btn-connect{height:36px;padding:0 14px;border-radius:9px;font-size:13.5px;font-weight:600;color:#07101E;}
.btn-connect:hover{opacity:1;filter:brightness(1.07);box-shadow:none;}
.btn-disconnect{height:36px;padding:0 12px;border-radius:9px;font-size:13px;font-weight:600;}
.sidebar{width:280px;}
.sb-head{height:64px;padding:0 16px 0 20px;}
.sb-head-logo img{height:30px;width:auto;display:block;}
.sb-scroll{padding:6px 12px 14px;}
.sb-lbl{font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--fa);padding:14px 12px 6px;}
.sb-item{margin:0;padding:10px 12px;gap:12px;font-size:14.5px;font-weight:500;width:100%;}
.sb-ico{font-size:18px;}
.sb-item.active{color:var(--tx);background:var(--s2);font-weight:600;}
.sb-item.active .sb-ico{color:var(--g);}
.sb-item.active::before{left:-12px;}
.sb-item-badge{font-size:10.5px;font-weight:700;padding:2px 6px;border-radius:6px;background:var(--gd);color:var(--g);}
.sb-out{text-align:left;cursor:pointer;font-family:inherit;}
.sb-out:hover{color:var(--rd);}
.sb-av{background:linear-gradient(145deg,#1C3A6E,#07101E);color:var(--g);border:1px solid var(--br2);font-weight:700;}
.sb-name{font-size:14px;font-weight:600;}
.sb-role{font-size:12.5px;color:var(--nt);}
.op-input{min-width:0;}
`;


/* ─── Data ───────────────────────────────────────────────────────────────────── */

const ALL_INSTRUMENTS = [
  /* ── Forex (30) ── */
  { sym:'EURUSD', label:'Euro / USD',      price:1.0862,  spread:0.00012, pip:0.0001,  digits:5, cat:'Forex',   icon:'€' },
  { sym:'GBPUSD', label:'GBP / USD',       price:1.2754,  spread:0.00015, pip:0.0001,  digits:5, cat:'Forex',   icon:'£' },
  { sym:'USDJPY', label:'USD / JPY',       price:155.42,  spread:0.012,   pip:0.01,    digits:3, cat:'Forex',   icon:'¥' },
  { sym:'USDCHF', label:'USD / CHF',       price:0.9021,  spread:0.00014, pip:0.0001,  digits:5, cat:'Forex',   icon:'₣' },
  { sym:'AUDUSD', label:'AUD / USD',       price:0.6541,  spread:0.00013, pip:0.0001,  digits:5, cat:'Forex',   icon:'A$'},
  { sym:'NZDUSD', label:'NZD / USD',       price:0.6012,  spread:0.00015, pip:0.0001,  digits:5, cat:'Forex',   icon:'N$'},
  { sym:'USDCAD', label:'USD / CAD',       price:1.3672,  spread:0.00015, pip:0.0001,  digits:5, cat:'Forex',   icon:'C$'},
  { sym:'EURGBP', label:'EUR / GBP',       price:0.8521,  spread:0.00018, pip:0.0001,  digits:5, cat:'Forex',   icon:'€' },
  { sym:'EURJPY', label:'EUR / JPY',       price:168.72,  spread:0.018,   pip:0.01,    digits:3, cat:'Forex',   icon:'€' },
  { sym:'GBPJPY', label:'GBP / JPY',       price:197.83,  spread:0.022,   pip:0.01,    digits:3, cat:'Forex',   icon:'£' },
  { sym:'EURAUD', label:'EUR / AUD',       price:1.6596,  spread:0.00025, pip:0.0001,  digits:5, cat:'Forex',   icon:'€' },
  { sym:'EURCAD', label:'EUR / CAD',       price:1.4845,  spread:0.00025, pip:0.0001,  digits:5, cat:'Forex',   icon:'€' },
  { sym:'EURCHF', label:'EUR / CHF',       price:0.9799,  spread:0.0002,  pip:0.0001,  digits:5, cat:'Forex',   icon:'€' },
  { sym:'EURNZD', label:'EUR / NZD',       price:1.8065,  spread:0.0003,  pip:0.0001,  digits:5, cat:'Forex',   icon:'€' },
  { sym:'GBPAUD', label:'GBP / AUD',       price:1.9498,  spread:0.0003,  pip:0.0001,  digits:5, cat:'Forex',   icon:'£' },
  { sym:'GBPCAD', label:'GBP / CAD',       price:1.7438,  spread:0.0003,  pip:0.0001,  digits:5, cat:'Forex',   icon:'£' },
  { sym:'GBPCHF', label:'GBP / CHF',       price:1.1508,  spread:0.00025, pip:0.0001,  digits:5, cat:'Forex',   icon:'£' },
  { sym:'GBPNZD', label:'GBP / NZD',       price:2.1218,  spread:0.00035, pip:0.0001,  digits:5, cat:'Forex',   icon:'£' },
  { sym:'AUDCAD', label:'AUD / CAD',       price:0.8942,  spread:0.00022, pip:0.0001,  digits:5, cat:'Forex',   icon:'A$'},
  { sym:'AUDCHF', label:'AUD / CHF',       price:0.5901,  spread:0.0002,  pip:0.0001,  digits:5, cat:'Forex',   icon:'A$'},
  { sym:'AUDJPY', label:'AUD / JPY',       price:101.65,  spread:0.018,   pip:0.01,    digits:3, cat:'Forex',   icon:'A$'},
  { sym:'AUDNZD', label:'AUD / NZD',       price:1.0881,  spread:0.0003,  pip:0.0001,  digits:5, cat:'Forex',   icon:'A$'},
  { sym:'CADCHF', label:'CAD / CHF',       price:0.6598,  spread:0.0002,  pip:0.0001,  digits:5, cat:'Forex',   icon:'C$'},
  { sym:'CADJPY', label:'CAD / JPY',       price:113.71,  spread:0.018,   pip:0.01,    digits:3, cat:'Forex',   icon:'C$'},
  { sym:'CHFJPY', label:'CHF / JPY',       price:172.31,  spread:0.02,    pip:0.01,    digits:3, cat:'Forex',   icon:'₣' },
  { sym:'NZDCAD', label:'NZD / CAD',       price:0.8221,  spread:0.00025, pip:0.0001,  digits:5, cat:'Forex',   icon:'N$'},
  { sym:'NZDJPY', label:'NZD / JPY',       price:93.44,   spread:0.02,    pip:0.01,    digits:3, cat:'Forex',   icon:'N$'},
  { sym:'USDSEK', label:'USD / SEK',       price:10.542,  spread:0.002,   pip:0.0001,  digits:4, cat:'Forex',   icon:'kr'},
  { sym:'USDNOK', label:'USD / NOK',       price:10.812,  spread:0.002,   pip:0.0001,  digits:4, cat:'Forex',   icon:'kr'},
  { sym:'USDZAR', label:'USD / ZAR',       price:18.72,   spread:0.008,   pip:0.0001,  digits:4, cat:'Forex',   icon:'R' },

  /* ── Metals (10) ── */
  { sym:'XAUUSD', label:'Gold / USD',      price:2314,    spread:0.3,     pip:0.1,     digits:2, cat:'Metals',  icon:'Au'},
  { sym:'XAGUSD', label:'Silver / USD',    price:27.42,   spread:0.04,    pip:0.01,    digits:3, cat:'Metals',  icon:'Ag'},
  { sym:'XPTUSD', label:'Platinum / USD',  price:968.5,   spread:0.5,     pip:0.1,     digits:2, cat:'Metals',  icon:'Pt'},
  { sym:'XPDUSD', label:'Palladium / USD', price:1012.0,  spread:0.8,     pip:0.1,     digits:2, cat:'Metals',  icon:'Pd'},
  { sym:'COPPER', label:'Copper',          price:4.512,   spread:0.004,   pip:0.001,   digits:3, cat:'Metals',  icon:'Cu'},
  { sym:'ALUMINUM',label:'Aluminum',       price:2385,    spread:1.2,     pip:0.1,     digits:1, cat:'Metals',  icon:'Al'},
  { sym:'ZINC',   label:'Zinc',            price:2745,    spread:1.5,     pip:0.1,     digits:1, cat:'Metals',  icon:'Zn'},
  { sym:'NICKEL', label:'Nickel',          price:17850,   spread:8,       pip:1,       digits:0, cat:'Metals',  icon:'Ni'},
  { sym:'LEAD',   label:'Lead',            price:2098,    spread:1,       pip:0.1,     digits:1, cat:'Metals',  icon:'Pb'},
  { sym:'TIN',    label:'Tin',             price:32450,   spread:15,      pip:1,       digits:0, cat:'Metals',  icon:'Sn'},

  /* ── Commodities (20) ── */
  { sym:'USOIL',  label:'Crude Oil WTI',   price:82.54,   spread:0.04,    pip:0.01,    digits:2, cat:'Commod.', icon:'OIL'},
  { sym:'UKOIL',  label:'Brent Crude',     price:86.12,   spread:0.05,    pip:0.01,    digits:2, cat:'Commod.', icon:'BRT'},
  { sym:'NATGAS', label:'Natural Gas',     price:2.145,   spread:0.003,   pip:0.001,   digits:3, cat:'Commod.', icon:'GAS'},
  { sym:'GASOLINE',label:'RBOB Gasoline',  price:2.412,   spread:0.003,   pip:0.001,   digits:3, cat:'Commod.', icon:'GAS'},
  { sym:'HEATOIL',label:'Heating Oil',     price:2.541,   spread:0.003,   pip:0.001,   digits:3, cat:'Commod.', icon:'OIL'},
  { sym:'COFFEE', label:'Coffee',          price:218.4,   spread:0.5,     pip:0.1,     digits:1, cat:'Commod.', icon:'COF'},
  { sym:'COCOA',  label:'Cocoa',           price:8420,    spread:15,      pip:1,       digits:0, cat:'Commod.', icon:'COC'},
  { sym:'SUGAR',  label:'Sugar #11',       price:21.34,   spread:0.05,    pip:0.01,    digits:2, cat:'Commod.', icon:'SUG'},
  { sym:'COTTON', label:'Cotton #2',       price:78.42,   spread:0.1,     pip:0.01,    digits:2, cat:'Commod.', icon:'COT'},
  { sym:'WHEAT',  label:'Wheat',           price:612.5,   spread:1,       pip:0.1,     digits:1, cat:'Commod.', icon:'WHT'},
  { sym:'CORN',   label:'Corn',            price:448.2,   spread:1,       pip:0.1,     digits:1, cat:'Commod.', icon:'CRN'},
  { sym:'SOYBEAN',label:'Soybean',         price:1182.5,  spread:2,       pip:0.1,     digits:1, cat:'Commod.', icon:'SOY'},
  { sym:'OJUICE', label:'Orange Juice',    price:342.1,   spread:0.5,     pip:0.1,     digits:1, cat:'Commod.', icon:'OJ' },
  { sym:'RICE',   label:'Rough Rice',      price:17.85,   spread:0.05,    pip:0.01,    digits:2, cat:'Commod.', icon:'RCE'},
  { sym:'OATS',   label:'Oats',            price:372.4,   spread:1,       pip:0.1,     digits:1, cat:'Commod.', icon:'OAT'},
  { sym:'LUMBER', label:'Lumber',          price:548.2,   spread:2,       pip:0.1,     digits:1, cat:'Commod.', icon:'LMB'},
  { sym:'CATTLE', label:'Live Cattle',     price:182.4,   spread:0.3,     pip:0.01,    digits:2, cat:'Commod.', icon:'CTL'},
  { sym:'LEANHOGS',label:'Lean Hogs',      price:92.15,   spread:0.3,     pip:0.01,    digits:2, cat:'Commod.', icon:'HOG'},
  { sym:'PALMOIL',label:'Palm Oil',        price:3845,    spread:5,       pip:1,       digits:0, cat:'Commod.', icon:'PLM'},
  { sym:'MILK',   label:'Class III Milk',  price:18.42,   spread:0.05,    pip:0.01,    digits:2, cat:'Commod.', icon:'MLK'},

  /* ── Indices (15) ── */
  { sym:'US30',   label:'Dow Jones',       price:38540,   spread:2,       pip:1,       digits:0, cat:'Indices', icon:'DJ'},
  { sym:'US500',  label:'S&P 500',         price:5240,    spread:0.5,     pip:0.1,     digits:1, cat:'Indices', icon:'SP'},
  { sym:'USTEC',  label:'NASDAQ 100',      price:18320,   spread:2,       pip:1,       digits:0, cat:'Indices', icon:'NQ'},
  { sym:'UK100',  label:'FTSE 100',        price:8120,    spread:1,       pip:1,       digits:0, cat:'Indices', icon:'FT'},
  { sym:'GER40',  label:'DAX 40',          price:18240,   spread:1.5,     pip:1,       digits:0, cat:'Indices', icon:'DX'},
  { sym:'JPN225', label:'Nikkei 225',      price:38420,   spread:15,      pip:1,       digits:0, cat:'Indices', icon:'N225'},
  { sym:'FRA40',  label:'CAC 40',          price:7845,    spread:2,       pip:0.1,     digits:1, cat:'Indices', icon:'CAC'},
  { sym:'AUS200', label:'ASX 200',         price:7684,    spread:2,       pip:0.1,     digits:1, cat:'Indices', icon:'AUS'},
  { sym:'HK50',   label:'Hang Seng',       price:17250,   spread:8,       pip:1,       digits:0, cat:'Indices', icon:'HK'},
  { sym:'ESP35',  label:'IBEX 35',         price:10842,   spread:3,       pip:0.1,     digits:1, cat:'Indices', icon:'IBX'},
  { sym:'ITA40',  label:'FTSE MIB',        price:33450,   spread:10,      pip:1,       digits:0, cat:'Indices', icon:'MIB'},
  { sym:'EU50',   label:'Euro Stoxx 50',   price:4920,    spread:1.5,     pip:0.1,     digits:1, cat:'Indices', icon:'SX5E'},
  { sym:'SWI20',  label:'Swiss Market Idx',price:11845,   spread:3,       pip:0.1,     digits:1, cat:'Indices', icon:'SMI'},
  { sym:'CHINA50',label:'China A50',       price:12420,   spread:4,       pip:0.1,     digits:1, cat:'Indices', icon:'CN50'},
  { sym:'NETH25', label:'AEX 25',          price:892.4,   spread:0.3,     pip:0.01,    digits:2, cat:'Indices', icon:'AEX'},

  /* ── Crypto (15) ── */
  { sym:'BTCUSD', label:'Bitcoin',         price:67420,   spread:12,      pip:1,       digits:0, cat:'Crypto',  icon:'₿' },
  { sym:'ETHUSD', label:'Ethereum',        price:3840,    spread:3,       pip:0.1,     digits:1, cat:'Crypto',  icon:'Ξ' },
  { sym:'SOLUSD', label:'Solana',          price:168,     spread:0.15,    pip:0.01,    digits:2, cat:'Crypto',  icon:'◎' },
  { sym:'BNBUSD', label:'BNB',             price:412,     spread:0.4,     pip:0.1,     digits:1, cat:'Crypto',  icon:'B' },
  { sym:'XRPUSD', label:'Ripple',          price:0.542,   spread:0.001,   pip:0.0001,  digits:4, cat:'Crypto',  icon:'X' },
  { sym:'DOGEUSD',label:'Dogecoin',        price:0.1542,  spread:0.0003,  pip:0.0001,  digits:4, cat:'Crypto',  icon:'Ð' },
  { sym:'ADAUSD', label:'Cardano',         price:0.452,   spread:0.001,   pip:0.0001,  digits:4, cat:'Crypto',  icon:'A' },
  { sym:'DOTUSD', label:'Polkadot',        price:6.842,   spread:0.01,    pip:0.001,   digits:3, cat:'Crypto',  icon:'D' },
  { sym:'MATICUSD',label:'Polygon',        price:0.685,   spread:0.001,   pip:0.0001,  digits:4, cat:'Crypto',  icon:'M' },
  { sym:'LTCUSD', label:'Litecoin',        price:84.2,    spread:0.1,     pip:0.01,    digits:2, cat:'Crypto',  icon:'Ł' },
  { sym:'LINKUSD',label:'Chainlink',       price:14.82,   spread:0.02,    pip:0.001,   digits:3, cat:'Crypto',  icon:'L' },
  { sym:'AVAXUSD',label:'Avalanche',       price:35.4,    spread:0.05,    pip:0.01,    digits:2, cat:'Crypto',  icon:'A' },
  { sym:'TRXUSD', label:'TRON',            price:0.1245,  spread:0.0002,  pip:0.0001,  digits:4, cat:'Crypto',  icon:'T' },
  { sym:'SHIBUSD',label:'Shiba Inu',       price:0.0000242,spread:0.0000001,pip:0.0000001,digits:8,cat:'Crypto',icon:'S' },
  { sym:'ATOMUSD',label:'Cosmos',          price:8.42,    spread:0.01,    pip:0.001,   digits:3, cat:'Crypto',  icon:'C' },

  /* ── Stocks (30) ── */
  { sym:'AAPL',   label:'Apple',           price:187.5,   spread:0.08,    pip:0.01,    digits:2, cat:'Stocks',  icon:'AAPL'},
  { sym:'MSFT',   label:'Microsoft',       price:415.2,   spread:0.12,    pip:0.01,    digits:2, cat:'Stocks',  icon:'MSFT'},
  { sym:'NVDA',   label:'NVIDIA',          price:892,     spread:0.35,    pip:0.01,    digits:2, cat:'Stocks',  icon:'NVDA'},
  { sym:'TSLA',   label:'Tesla',           price:174.2,   spread:0.12,    pip:0.01,    digits:2, cat:'Stocks',  icon:'TSLA'},
  { sym:'AMZN',   label:'Amazon',          price:182.4,   spread:0.10,    pip:0.01,    digits:2, cat:'Stocks',  icon:'AMZN'},
  { sym:'GOOGL',  label:'Alphabet',        price:175.4,   spread:0.1,     pip:0.01,    digits:2, cat:'Stocks',  icon:'GOOGL'},
  { sym:'META',   label:'Meta Platforms',  price:512.8,   spread:0.15,    pip:0.01,    digits:2, cat:'Stocks',  icon:'META'},
  { sym:'NFLX',   label:'Netflix',         price:685.2,   spread:0.2,     pip:0.01,    digits:2, cat:'Stocks',  icon:'NFLX'},
  { sym:'JPM',    label:'JPMorgan Chase',  price:198.4,   spread:0.08,    pip:0.01,    digits:2, cat:'Stocks',  icon:'JPM' },
  { sym:'V',      label:'Visa',            price:278.6,   spread:0.1,     pip:0.01,    digits:2, cat:'Stocks',  icon:'V'   },
  { sym:'MA',     label:'Mastercard',      price:468.2,   spread:0.12,    pip:0.01,    digits:2, cat:'Stocks',  icon:'MA'  },
  { sym:'DIS',    label:'Walt Disney',     price:112.4,   spread:0.06,    pip:0.01,    digits:2, cat:'Stocks',  icon:'DIS' },
  { sym:'BA',     label:'Boeing',          price:182.6,   spread:0.08,    pip:0.01,    digits:2, cat:'Stocks',  icon:'BA'  },
  { sym:'KO',     label:'Coca-Cola',       price:62.4,    spread:0.03,    pip:0.01,    digits:2, cat:'Stocks',  icon:'KO'  },
  { sym:'PEP',    label:'PepsiCo',         price:172.8,   spread:0.06,    pip:0.01,    digits:2, cat:'Stocks',  icon:'PEP' },
  { sym:'WMT',    label:'Walmart',         price:68.9,    spread:0.03,    pip:0.01,    digits:2, cat:'Stocks',  icon:'WMT' },
  { sym:'HD',     label:'Home Depot',      price:348.2,   spread:0.12,    pip:0.01,    digits:2, cat:'Stocks',  icon:'HD'  },
  { sym:'NKE',    label:'Nike',            price:92.4,    spread:0.05,    pip:0.01,    digits:2, cat:'Stocks',  icon:'NKE' },
  { sym:'INTC',   label:'Intel',           price:42.8,    spread:0.03,    pip:0.01,    digits:2, cat:'Stocks',  icon:'INTC'},
  { sym:'AMD',    label:'Advanced Micro',  price:168.4,   spread:0.08,    pip:0.01,    digits:2, cat:'Stocks',  icon:'AMD' },
  { sym:'ORCL',   label:'Oracle',          price:128.6,   spread:0.06,    pip:0.01,    digits:2, cat:'Stocks',  icon:'ORCL'},
  { sym:'CRM',    label:'Salesforce',      price:268.4,   spread:0.1,     pip:0.01,    digits:2, cat:'Stocks',  icon:'CRM' },
  { sym:'ADBE',   label:'Adobe',           price:512.6,   spread:0.15,    pip:0.01,    digits:2, cat:'Stocks',  icon:'ADBE'},
  { sym:'PYPL',   label:'PayPal',          price:68.2,    spread:0.04,    pip:0.01,    digits:2, cat:'Stocks',  icon:'PYPL'},
  { sym:'UBER',   label:'Uber Technolog.', price:72.4,    spread:0.04,    pip:0.01,    digits:2, cat:'Stocks',  icon:'UBER'},
  { sym:'SBUX',   label:'Starbucks',       price:94.6,    spread:0.04,    pip:0.01,    digits:2, cat:'Stocks',  icon:'SBUX'},
  { sym:'MCD',    label:"McDonald's",      price:268.4,   spread:0.1,     pip:0.01,    digits:2, cat:'Stocks',  icon:'MCD' },
  { sym:'XOM',    label:'Exxon Mobil',     price:112.8,   spread:0.05,    pip:0.01,    digits:2, cat:'Stocks',  icon:'XOM' },
  { sym:'CVX',    label:'Chevron',         price:158.4,   spread:0.06,    pip:0.01,    digits:2, cat:'Stocks',  icon:'CVX' },
  { sym:'JNJ',    label:'Johnson&Johnson', price:148.2,   spread:0.06,    pip:0.01,    digits:2, cat:'Stocks',  icon:'JNJ' },
];

const DEFAULT_WL = ['EURUSD','GBPUSD','USDJPY','XAUUSD','BTCUSD','ETHUSD','US500','AAPL','TSLA','USOIL'];
const TIMEFRAMES = ['M1','M5','M15','M30','H1','H4','D1','W1','MN'];
const TF_MAP     = { M1:'1m',M5:'5m',M15:'15m',M30:'30m',H1:'1h',H4:'4h',D1:'1D',W1:'1W',MN:'1M' };

const BROKERS = [
  { id:'icmarkets',  name:'IC Markets',      logo:'IC', color:'#0ea5e9', popular:true,  reg:'ASIC · CySEC · FSA',   platform:'MT4 / MT5',
    servers:[
      { name:'ICMarketsGlobal-Live',  type:'live', platform:'MT4', loc:'NY4' },
      { name:'ICMarketsGlobal-Demo',  type:'demo', platform:'MT4', loc:'NY4' },
      { name:'ICMarkets-Live01',      type:'live', platform:'MT5', loc:'LD4' },
      { name:'ICMarkets-Demo01',      type:'demo', platform:'MT5', loc:'LD4' },
    ]},
  { id:'pepperstone',name:'Pepperstone',      logo:'PP', color:'#22c55e', popular:true,  reg:'ASIC · FCA · DFSA',   platform:'MT4 / MT5',
    servers:[
      { name:'Pepperstone-Live01',  type:'live', platform:'MT4', loc:'LD4' },
      { name:'Pepperstone-Demo01',  type:'demo', platform:'MT4', loc:'LD4' },
      { name:'Pepperstone-Live',    type:'live', platform:'MT5', loc:'LD4' },
      { name:'Pepperstone-Demo',    type:'demo', platform:'MT5', loc:'LD4' },
    ]},
  { id:'xm',         name:'XM Global',        logo:'XM', color:'#f59e0b', popular:true,  reg:'CySEC · ASIC · IFSC', platform:'MT4 / MT5',
    servers:[
      { name:'XMGlobal-Real 3',  type:'live', platform:'MT4', loc:'LD4' },
      { name:'XMGlobal-Demo',    type:'demo', platform:'MT4', loc:'LD4' },
      { name:'XMGlobal-Real 5',  type:'live', platform:'MT5', loc:'NY4' },
      { name:'XMGlobal-Demo 2',  type:'demo', platform:'MT5', loc:'NY4' },
    ]},
  { id:'exness',     name:'Exness',           logo:'EX', color:'#B49BFF', popular:true,  reg:'FCA · CySEC · FSA',   platform:'MT4 / MT5',
    servers:[
      { name:'Exness-Real3',     type:'live', platform:'MT4', loc:'LD4' },
      { name:'Exness-Trial',     type:'demo', platform:'MT4', loc:'LD4' },
      { name:'Exness-MT5Real',   type:'live', platform:'MT5', loc:'LD4' },
      { name:'Exness-MT5Trial',  type:'demo', platform:'MT5', loc:'LD4' },
    ]},
  { id:'fxpro',      name:'FxPro',            logo:'FP', color:'#f472b6', popular:false, reg:'FCA · CySEC · SCB',   platform:'MT4 / MT5',
    servers:[
      { name:'FxPro.com-Real',  type:'live', platform:'MT4', loc:'LD4' },
      { name:'FxPro.com-Demo',  type:'demo', platform:'MT4', loc:'LD4' },
      { name:'FxProMT5-Real',   type:'live', platform:'MT5', loc:'LD4' },
      { name:'FxProMT5-Demo',   type:'demo', platform:'MT5', loc:'LD4' },
    ]},
  { id:'oanda',      name:'OANDA',            logo:'OA', color:'#fb923c', popular:false, reg:'FCA · ASIC · CFTC',   platform:'MT4',
    servers:[
      { name:'OANDA-v20 Live-1',    type:'live', platform:'MT4', loc:'NY4' },
      { name:'OANDA-v20 Practice',  type:'demo', platform:'MT4', loc:'NY4' },
    ]},
];

// Positions loaded from Supabase open_positions table

/* ─── Hooks ──────────────────────────────────────────────────────────────────── */

const FINNHUB_KEY = 'd98nl7hr01qugfuvt5mgd98nl7hr01qugfuvt5n0';

// Map internal symbol → Finnhub symbol for WebSocket subscription
const FINNHUB_SYM = {
  EURUSD:'OANDA:EUR_USD', GBPUSD:'OANDA:GBP_USD', USDJPY:'OANDA:USD_JPY',
  USDCHF:'OANDA:USD_CHF', AUDUSD:'OANDA:AUD_USD', NZDUSD:'OANDA:NZD_USD',
  USDCAD:'OANDA:USD_CAD', EURGBP:'OANDA:EUR_GBP', EURJPY:'OANDA:EUR_JPY',
  GBPJPY:'OANDA:GBP_JPY',
  EURAUD:'OANDA:EUR_AUD', EURCAD:'OANDA:EUR_CAD', EURCHF:'OANDA:EUR_CHF', EURNZD:'OANDA:EUR_NZD',
  GBPAUD:'OANDA:GBP_AUD', GBPCAD:'OANDA:GBP_CAD', GBPCHF:'OANDA:GBP_CHF', GBPNZD:'OANDA:GBP_NZD',
  AUDCAD:'OANDA:AUD_CAD', AUDCHF:'OANDA:AUD_CHF', AUDJPY:'OANDA:AUD_JPY', AUDNZD:'OANDA:AUD_NZD',
  CADCHF:'OANDA:CAD_CHF', CADJPY:'OANDA:CAD_JPY', CHFJPY:'OANDA:CHF_JPY',
  NZDCAD:'OANDA:NZD_CAD', NZDJPY:'OANDA:NZD_JPY',
  USDSEK:'OANDA:USD_SEK', USDNOK:'OANDA:USD_NOK', USDZAR:'OANDA:USD_ZAR',
  XAUUSD:'OANDA:XAU_USD', XAGUSD:'OANDA:XAG_USD', XPTUSD:'OANDA:XPT_USD', XPDUSD:'OANDA:XPD_USD',
  BTCUSD:'BINANCE:BTCUSDT', ETHUSD:'BINANCE:ETHUSDT', SOLUSD:'BINANCE:SOLUSDT',
  BNBUSD:'BINANCE:BNBUSDT', XRPUSD:'BINANCE:XRPUSDT',
  DOGEUSD:'BINANCE:DOGEUSDT', ADAUSD:'BINANCE:ADAUSDT', DOTUSD:'BINANCE:DOTUSDT',
  MATICUSD:'BINANCE:MATICUSDT', LTCUSD:'BINANCE:LTCUSDT', LINKUSD:'BINANCE:LINKUSDT',
  AVAXUSD:'BINANCE:AVAXUSDT', TRXUSD:'BINANCE:TRXUSDT', SHIBUSD:'BINANCE:SHIBUSDT',
  ATOMUSD:'BINANCE:ATOMUSDT',
  USOIL:'OANDA:BCO_USD', UKOIL:'OANDA:BCO_USD',
  US30:'OANDA:US30_USD', US500:'OANDA:SPX500_USD', USTEC:'OANDA:NAS100_USD',
  UK100:'OANDA:UK100_GBP', GER40:'OANDA:DE30_EUR',
  AAPL:'AAPL', MSFT:'MSFT', NVDA:'NVDA', TSLA:'TSLA', AMZN:'AMZN',
  GOOGL:'GOOGL', META:'META', NFLX:'NFLX', JPM:'JPM', V:'V', MA:'MA',
  DIS:'DIS', BA:'BA', KO:'KO', PEP:'PEP', WMT:'WMT', HD:'HD', NKE:'NKE',
  INTC:'INTC', AMD:'AMD', ORCL:'ORCL', CRM:'CRM', ADBE:'ADBE', PYPL:'PYPL',
  UBER:'UBER', SBUX:'SBUX', MCD:'MCD', XOM:'XOM', CVX:'CVX', JNJ:'JNJ',
};
const FINNHUB_TO_SYM = Object.fromEntries(Object.entries(FINNHUB_SYM).map(([k,v])=>[v,k]));

function useLivePrices() {
  const [prices, setPrices] = useState(() =>
    Object.fromEntries(ALL_INSTRUMENTS.map(i => [i.sym, {
      bid: i.price, ask: +(i.price + i.spread).toFixed(i.digits),
      change: 0, changePct: 0, dir: 0, basePrice: i.price,
    }]))
  );

  useEffect(() => {
    let ws;
    let reconnectTimer;
    let destroyed = false; // guard: prevents reconnect after unmount

    // Finnhub can push many trades/sec across all subscribed symbols. Committing
    // a setState (and re-rendering the whole tree) on every single message is
    // what was causing the janky/"glitchy" feel on mobile — phones don't have
    // the headroom desktops do to absorb 20-30+ re-renders a second. Instead,
    // buffer incoming trades and flush them to state in small batches so React
    // re-renders at a capped, steady rate instead of a tick storm.
    let pending = null;
    let flushTimer = null;

    const flush = () => {
      flushTimer = null;
      if (!pending) return;
      const batch = pending;
      pending = null;
      setPrices(prev => {
        const next = { ...prev };
        batch.forEach(trade => {
          const sym = FINNHUB_TO_SYM[trade.s];
          if (!sym) return;
          const inst = ALL_INSTRUMENTS.find(i => i.sym === sym);
          if (!inst) return;
          const old = next[sym] || prev[sym];
          const price = trade.p;
          const bid = +price.toFixed(inst.digits);
          const ask = +(price + inst.spread).toFixed(inst.digits);
          const change = +(bid - inst.price).toFixed(inst.digits);
          const changePct = +((bid - inst.price) / inst.price * 100).toFixed(2);
          next[sym] = { bid, ask, change, changePct, dir: bid > old.bid ? 1 : bid < old.bid ? -1 : 0, basePrice: inst.price };
        });
        return next;
      });
    };

    const connect = () => {
      if (destroyed) return;
      ws = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_KEY}`);

      ws.onopen = () => {
        ALL_INSTRUMENTS.forEach(inst => {
          const fsym = FINNHUB_SYM[inst.sym];
          if (fsym) ws.send(JSON.stringify({ type: 'subscribe', symbol: fsym }));
        });
      };

      ws.onmessage = e => {
        const msg = JSON.parse(e.data);
        if (msg.type !== 'trade' || !msg.data) return;
        pending = pending ? pending.concat(msg.data) : msg.data.slice();
        if (!flushTimer) flushTimer = setTimeout(flush, 150);
      };

      ws.onerror = () => ws.close();
      ws.onclose = () => {
        if (!destroyed) reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      destroyed = true; // stop any pending reconnect from firing
      clearTimeout(reconnectTimer);
      clearTimeout(flushTimer);
      if (ws) { ws.close(); }
    };
  }, []);

  return prices;
}

// Seed realistic candles from a real anchor price fetched from Finnhub quote (free tier)
// then live-tick the last candle from the WebSocket feed.
// Categorise each symbol so we know which free API to hit
const CRYPTO_SYMS = new Set(['BTCUSD','ETHUSD','SOLUSD','BNBUSD','XRPUSD','DOGEUSD','ADAUSD','DOTUSD','MATICUSD','LTCUSD','LINKUSD','AVAXUSD','TRXUSD','SHIBUSD','ATOMUSD']);
// Forex pairs: base→quote extracted from symbol name
const FX_PAIRS = {
  EURUSD:['EUR','USD'], GBPUSD:['GBP','USD'], USDJPY:['USD','JPY'],
  USDCHF:['USD','CHF'], AUDUSD:['AUD','USD'], NZDUSD:['NZD','USD'],
  USDCAD:['USD','CAD'], EURGBP:['EUR','GBP'], EURJPY:['EUR','JPY'],
  GBPJPY:['GBP','JPY'], XAUUSD:['XAU','USD'], XAGUSD:['XAG','USD'],
  EURAUD:['EUR','AUD'], EURCAD:['EUR','CAD'], EURCHF:['EUR','CHF'], EURNZD:['EUR','NZD'],
  GBPAUD:['GBP','AUD'], GBPCAD:['GBP','CAD'], GBPCHF:['GBP','CHF'], GBPNZD:['GBP','NZD'],
  AUDCAD:['AUD','CAD'], AUDCHF:['AUD','CHF'], AUDJPY:['AUD','JPY'], AUDNZD:['AUD','NZD'],
  CADCHF:['CAD','CHF'], CADJPY:['CAD','JPY'], CHFJPY:['CHF','JPY'],
  NZDCAD:['NZD','CAD'], NZDJPY:['NZD','JPY'],
  USDSEK:['USD','SEK'], USDNOK:['USD','NOK'], USDZAR:['USD','ZAR'],
};

// CoinGecko ID map for crypto (free, CORS-enabled, no key)
const COINGECKO_ID = {
  BTCUSD:'bitcoin', ETHUSD:'ethereum', SOLUSD:'solana',
  BNBUSD:'binancecoin', XRPUSD:'ripple',
  DOGEUSD:'dogecoin', ADAUSD:'cardano', DOTUSD:'polkadot',
  MATICUSD:'matic-network', LTCUSD:'litecoin', LINKUSD:'chainlink',
  AVAXUSD:'avalanche-2', TRXUSD:'tron', SHIBUSD:'shiba-inu', ATOMUSD:'cosmos',
};

async function fetchAnchorPrice(sym) {
  try {
    // ── Crypto: CoinGecko simple price (CORS-enabled, no key required) ──
    if (CRYPTO_SYMS.has(sym)) {
      const id = COINGECKO_ID[sym];
      if (!id) return null;
      const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
      const d = await r.json();
      return d[id]?.usd ? parseFloat(d[id].usd) : null;
    }
    // ── Forex & metals: open.er-api.com (free, CORS-enabled, no key required) ──
    const fx = FX_PAIRS[sym];
    if (fx) {
      const [base, quote] = fx;
      const r = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      const d = await r.json();
      return d.rates?.[quote] ? parseFloat(d.rates[quote]) : null;
    }
    // ── Indices/commodities/stocks: fall back to inst.price (seeded) ──
    return null;
  } catch { return null; }
}

function buildCandles(anchorPrice, inst, count = 150) {
  const vol = anchorPrice * 0.004;
  // Walk backwards from anchor so the last candle closes near the real price
  const arr = [];
  let price = anchorPrice;
  for (let i = 0; i < count; i++) arr.unshift(null); // placeholder
  price = anchorPrice * (1 - 0.015 + Math.random() * 0.01); // start slightly below
  for (let i = 0; i < count; i++) {
    const o = price;
    const move = (Math.random() - 0.49) * vol;
    const c = Math.max(price * 0.5, o + move);
    const h = Math.max(o, c) + Math.random() * vol * 0.3;
    const l = Math.min(o, c) - Math.random() * vol * 0.3;
    arr[i] = { o: +o.toFixed(inst.digits), h: +h.toFixed(inst.digits), l: +l.toFixed(inst.digits), c: +c.toFixed(inst.digits) };
    price = c;
  }
  // Force last candle close to real anchor price for accuracy
  if (arr.length) arr[arr.length - 1].c = anchorPrice;
  return arr;
}

function useCandles(sym, tf, livePrice) {
  const [candles, setCandles] = useState([]);

  useEffect(() => {
    const inst = ALL_INSTRUMENTS.find(i => i.sym === sym);
    if (!inst) return;
    setCandles([]); // clear on sym/tf change

    const init = async () => {
      // Try to get real current price as anchor
      const anchor = await fetchAnchorPrice(sym);
      const price  = anchor || inst.price;
      setCandles(buildCandles(price, inst));
    };

    init();
  }, [sym, tf]); // eslint-disable-line

  // Live-tick the last candle from WebSocket price
  useEffect(() => {
    if (!livePrice || !candles.length) return;
    const inst = ALL_INSTRUMENTS.find(i => i.sym === sym);
    if (!inst) return;
    setCandles(prev => {
      if (!prev.length) return prev;
      const next = [...prev];
      const last = { ...next[next.length - 1] };
      const p = livePrice;
      last.c = +p.toFixed(inst.digits);
      last.h = Math.max(last.h, last.c);
      last.l = Math.min(last.l, last.c);
      next[next.length - 1] = last;
      return next;
    });
  }, [livePrice]); // eslint-disable-line

  return candles;
}

/* ─── TradingView symbol mapping ────────────────────────────────────────────── */
// Maps our internal instrument symbols to TradingView's exchange-qualified symbols.
const TV_SYMBOL_MAP = {
  EURUSD: 'OANDA:EURUSD', GBPUSD: 'OANDA:GBPUSD', USDJPY: 'OANDA:USDJPY',
  USDCHF: 'OANDA:USDCHF', AUDUSD: 'OANDA:AUDUSD', NZDUSD: 'OANDA:NZDUSD',
  USDCAD: 'OANDA:USDCAD', EURGBP: 'OANDA:EURGBP', EURJPY: 'OANDA:EURJPY',
  GBPJPY: 'OANDA:GBPJPY',
  EURAUD: 'OANDA:EURAUD', EURCAD: 'OANDA:EURCAD', EURCHF: 'OANDA:EURCHF', EURNZD: 'OANDA:EURNZD',
  GBPAUD: 'OANDA:GBPAUD', GBPCAD: 'OANDA:GBPCAD', GBPCHF: 'OANDA:GBPCHF', GBPNZD: 'OANDA:GBPNZD',
  AUDCAD: 'OANDA:AUDCAD', AUDCHF: 'OANDA:AUDCHF', AUDJPY: 'OANDA:AUDJPY', AUDNZD: 'OANDA:AUDNZD',
  CADCHF: 'OANDA:CADCHF', CADJPY: 'OANDA:CADJPY', CHFJPY: 'OANDA:CHFJPY',
  NZDCAD: 'OANDA:NZDCAD', NZDJPY: 'OANDA:NZDJPY',
  USDSEK: 'OANDA:USDSEK', USDNOK: 'OANDA:USDNOK', USDZAR: 'OANDA:USDZAR',
  XAUUSD: 'OANDA:XAUUSD', XAGUSD: 'OANDA:XAGUSD', XPTUSD: 'OANDA:XPTUSD', XPDUSD: 'OANDA:XPDUSD',
  COPPER: 'COMEX:HG1!', ALUMINUM: 'LME:ALI1!', ZINC: 'LME:ZNC1!',
  NICKEL: 'LME:NIC1!', LEAD: 'LME:PBD1!', TIN: 'LME:TIN1!',
  USOIL: 'TVC:USOIL', UKOIL: 'TVC:UKOIL', NATGAS: 'TVC:NATURALGAS',
  GASOLINE: 'NYMEX:RB1!', HEATOIL: 'NYMEX:HO1!',
  COFFEE: 'ICEUS:KC1!', COCOA: 'ICEUS:CC1!', SUGAR: 'ICEUS:SB1!', COTTON: 'ICEUS:CT1!',
  WHEAT: 'CBOT:ZW1!', CORN: 'CBOT:ZC1!', SOYBEAN: 'CBOT:ZS1!', OJUICE: 'ICEUS:OJ1!',
  RICE: 'CBOT:ZR1!', OATS: 'CBOT:ZO1!', LUMBER: 'CME:LBS1!',
  CATTLE: 'CME:LE1!', LEANHOGS: 'CME:HE1!', PALMOIL: 'MYX:FCPO1!', MILK: 'CME:DC1!',
  BTCUSD: 'BINANCE:BTCUSDT', ETHUSD: 'BINANCE:ETHUSDT', SOLUSD: 'BINANCE:SOLUSDT',
  BNBUSD: 'BINANCE:BNBUSDT', XRPUSD: 'BINANCE:XRPUSDT',
  DOGEUSD: 'BINANCE:DOGEUSDT', ADAUSD: 'BINANCE:ADAUSDT', DOTUSD: 'BINANCE:DOTUSDT',
  MATICUSD: 'BINANCE:MATICUSDT', LTCUSD: 'BINANCE:LTCUSDT', LINKUSD: 'BINANCE:LINKUSDT',
  AVAXUSD: 'BINANCE:AVAXUSDT', TRXUSD: 'BINANCE:TRXUSDT', SHIBUSD: 'BINANCE:SHIBUSDT',
  ATOMUSD: 'BINANCE:ATOMUSDT',
  US30: 'DJ:DJI', US500: 'SP:SPX', USTEC: 'NASDAQ:NDX',
  UK100: 'TVC:UKX', GER40: 'XETR:DAX',
  JPN225: 'TVC:NI225', FRA40: 'TVC:CAC40', AUS200: 'ASX:XJO', HK50: 'TVC:HSI',
  ESP35: 'TVC:IBEX35', ITA40: 'MIL:FTSEMIB', EU50: 'TVC:SX5E', SWI20: 'TVC:SMI',
  CHINA50: 'TVC:CHINA50', NETH25: 'EURONEXT:AEX',
  AAPL: 'NASDAQ:AAPL', MSFT: 'NASDAQ:MSFT', NVDA: 'NASDAQ:NVDA',
  TSLA: 'NASDAQ:TSLA', AMZN: 'NASDAQ:AMZN', GOOGL: 'NASDAQ:GOOGL', META: 'NASDAQ:META',
  NFLX: 'NASDAQ:NFLX', JPM: 'NYSE:JPM', V: 'NYSE:V', MA: 'NYSE:MA', DIS: 'NYSE:DIS',
  BA: 'NYSE:BA', KO: 'NYSE:KO', PEP: 'NASDAQ:PEP', WMT: 'NYSE:WMT', HD: 'NYSE:HD',
  NKE: 'NYSE:NKE', INTC: 'NASDAQ:INTC', AMD: 'NASDAQ:AMD', ORCL: 'NYSE:ORCL',
  CRM: 'NYSE:CRM', ADBE: 'NASDAQ:ADBE', PYPL: 'NASDAQ:PYPL', UBER: 'NYSE:UBER',
  SBUX: 'NASDAQ:SBUX', MCD: 'NYSE:MCD', XOM: 'NYSE:XOM', CVX: 'NYSE:CVX', JNJ: 'NYSE:JNJ',
};
function toTvSymbol(sym) {
  return TV_SYMBOL_MAP[sym] || `OANDA:${sym}`;
}

// timeframe → TradingView interval codes
// NOTE: keys must match the TIMEFRAMES codes used as `tf` state (M1, M5,
// H1, D1, etc.) — a previous version of this map used TradingView's
// display-label strings ('1m','5m'…) as keys instead, which never matched
// `tf`, so every timeframe click silently fell through to the 'D' default.
const TV_INTERVAL_MAP = {
  M1:'1', M5:'5', M15:'15', M30:'30',
  H1:'60', H4:'240', D1:'D', W1:'W', MN:'M',
};

/* ─── ChartErrorBoundary ─────────────────────────────────────────────────────── */
// Catches errors thrown by the TradingView embed (e.g. if the external script
// fails to load or throws after mount) so a chart failure can't crash the
// whole terminal — it just shows a small inline fallback instead.
class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('Chart widget error:', error, info);
  }
  componentDidUpdate(prevProps) {
    // Reset error state when the chart's key inputs change, so switching
    // symbol/timeframe gives the widget another chance to mount.
    if (this.state.hasError && (prevProps.sym !== this.props.sym || prevProps.tf !== this.props.tf || prevProps.chartType !== this.props.chartType)) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height:'100%', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b', fontSize:13, flexDirection:'column', gap:8 }}>
          <span>Chart failed to load.</span>
          <button onClick={() => this.setState({ hasError: false })} style={{ background:'#112238', border:'1px solid #1C2C45', color:'#EEF2F7', borderRadius:6, padding:'6px 12px', fontSize:12, cursor:'pointer' }}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── TradingViewWidget ──────────────────────────────────────────────────────── */

const TradingViewWidget = memo(function TradingViewWidget({ sym, tf, chartType }) {
  const container = useRef(null);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    let cancelled = false;

    el.innerHTML = ''; // clear previous widget on sym/tf/style change

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = 'calc(100% - 32px)';
    widgetDiv.style.width = '100%';
    el.appendChild(widgetDiv);

    const copyrightDiv = document.createElement('div');
    copyrightDiv.className = 'tradingview-widget-copyright';
    el.appendChild(copyrightDiv);

    // 1=candle, 0=bar, 2=line (TradingView "style" setting)
    const styleMap = { candle: '1', bar: '0', line: '2' };

    const config = {
      allow_symbol_change: true,
      calendar: false,
      details: false,
      // The app's own toolbar exposes drawing-tool buttons (trendline, ray,
      // fib, rectangle, text…) but this embed script has no JS API to drive
      // TradingView's drawing engine from outside the iframe — there is no
      // way to make a custom button actually draw on the chart. TradingView
      // ships its own working versions of exactly these tools in its side
      // toolbar, so we show that instead of a set of buttons that look
      // clickable but do nothing.
      hide_side_toolbar: false,
      hide_top_toolbar: true,
      hide_legend: false,
      hide_volume: false,
      hotlist: false,
      interval: TV_INTERVAL_MAP[tf] || 'D',
      locale: 'en',
      save_image: true,
      style: styleMap[chartType] || '1',
      symbol: toTvSymbol(sym),
      theme: 'dark',
      timezone: 'Etc/UTC',
      backgroundColor: '#0F0F0F',
      gridColor: 'rgba(242, 242, 242, 0.06)',
      watchlist: [],
      withdateranges: false,
      compareSymbols: [],
      studies: [],
      autosize: true,
    };

    // Mount on next tick — avoids a remount race when sym/tf/chartType
    // change rapidly (e.g. user clicking through timeframes quickly),
    // which is what was throwing the cross-origin "Script error.".
    const timer = setTimeout(() => {
      if (cancelled || !container.current) return;
      try {
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
        script.type = 'text/javascript';
        script.async = true;
        // script.text (not innerHTML) is required for inline content to be
        // honored alongside `src` in this widget's loader pattern.
        script.text = JSON.stringify(config);
        widgetDiv.appendChild(script);
      } catch (err) {
        console.error('TradingView widget failed to mount:', err);
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sym, tf, chartType]);

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: '100%', width: '100%', background: '#0F0F0F' }} />
  );
});

/* ─── ConnectModal ───────────────────────────────────────────────────────────── */

function ConnStep({ label, delay }) {
  const [done, setDone] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDone(true), delay + 350); return () => clearTimeout(t); }, [delay]);
  return (
    <div className={`conn-step${done?' done':''}`}>
      <span className="conn-step-check">{done ? <i className="ti ti-check"/> : <span className="conn-step-dot"/>}</span>
      {label}
    </div>
  );
}

function ConnectModal({ onClose, onConnected, userBalance, userCurrency }) {
  const [step,      setStep]      = useState('broker');
  const [query,     setQuery]     = useState('');
  const [broker,    setBroker]    = useState(null);
  const [platform,  setPlatform]  = useState('MT4');
  const [srvList,   setSrvList]   = useState([]);
  const [loadingSrv,setLoadingSrv]= useState(false);
  const [server,    setServer]    = useState(null);
  const [login,     setLogin]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [errMsg,    setErrMsg]    = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q ? BROKERS.filter(b => b.name.toLowerCase().includes(q) || b.platform.toLowerCase().includes(q)) : BROKERS;
  }, [query]);

  const fetchServers = useCallback((b, plat) => {
    setLoadingSrv(true); setSrvList([]); setServer(null);
    setTimeout(() => { setSrvList(b.servers.filter(s => s.platform === plat)); setLoadingSrv(false); }, 900);
  }, []);

  const handleSelectBroker = b => { setBroker(b); setPlatform('MT4'); fetchServers(b, 'MT4'); setStep('server'); };
  const handlePlatformChange = p => { setPlatform(p); if (broker) fetchServers(broker, p); };

  const handleConnect = () => {
    if (!login.trim()) { setErrMsg('Enter your account login number.'); return; }
    setErrMsg(''); setStep('connecting');
    setTimeout(() => {
      onConnected({ broker, server, platform, accType: server?.type || 'demo', login,
        balance: userBalance, equity: userBalance, leverage: '1:500', currency: userCurrency });
      onClose();
    }, 2600);
  };

  const availPlatforms = broker ? [...new Set(broker.servers.map(s => s.platform))] : [];

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>

        {step === 'broker' && <>
          <div className="modal-title">Connect Trading Account</div>
          <p className="conn-sub">Select your broker to load available servers</p>
          <div className="conn-search-wrap">
            <i className="ti ti-search conn-search-icon"/>
            <input className="conn-search" placeholder="Search broker…" value={query} onChange={e => setQuery(e.target.value)} autoFocus/>
            {query && <button className="conn-clear" onClick={() => setQuery('')}>✕</button>}
          </div>
          <div className="conn-broker-list">
            {filtered.map(b => (
              <div key={b.id} className="conn-broker-row" onClick={() => handleSelectBroker(b)}>
                <div className="conn-broker-logo" style={{ background: b.color }}>{b.logo}</div>
                <div className="conn-broker-info">
                  <div className="conn-broker-name">{b.name}</div>
                  <div className="conn-broker-meta">{b.reg} · {b.platform}</div>
                </div>
                {b.popular && <span className="conn-popular">Popular</span>}
                <i className="ti ti-chevron-right" style={{ color:'var(--nt)', fontSize:14 }}/>
              </div>
            ))}
            {!filtered.length && <div style={{ padding:'20px', textAlign:'center', color:'var(--nt)', fontSize:13 }}>No brokers found for "{query}"</div>}
          </div>
          <div className="conn-security"><i className="ti ti-shield-lock"/> Credentials are transmitted directly to your broker's server. ProfitGainSignal never stores them.</div>
        </>}

        {step === 'server' && <>
          <button className="conn-back" onClick={() => setStep('broker')}><i className="ti ti-arrow-left"/> Back</button>
          <div className="modal-title" style={{ marginTop:8 }}>
            <span className="conn-broker-badge" style={{ background: broker?.color }}>{broker?.logo}</span>
            {broker?.name}
          </div>
          <div className="conn-section-lbl">Platform</div>
          <div className="conn-plat-row">
            {availPlatforms.map(p => <button key={p} className={`conn-plat-btn${platform===p?' active':''}`} onClick={() => handlePlatformChange(p)}>{p}</button>)}
          </div>
          <div className="conn-section-lbl" style={{ marginTop:16 }}>
            Server {loadingSrv && <span className="conn-loading-badge">Fetching from MT gateway…</span>}
          </div>
          {loadingSrv ? (
            <div className="conn-srv-loading"><div className="chart-loader"><span/><span/><span/></div><span>Loading servers for {broker?.name}…</span></div>
          ) : (
            <div className="conn-server-list">
              {srvList.map(s => (
                <div key={s.name} className={`conn-server-row${server?.name===s.name?' active':''}`} onClick={() => setServer(s)}>
                  <div>
                    <div className="conn-server-name">{s.name}</div>
                    <div className="conn-server-meta">
                      <span className={s.type==='live'?'srv-live':'srv-demo'}>{s.type.toUpperCase()}</span>
                      <span>{s.platform}</span>
                      <span><i className="ti ti-map-pin" style={{ fontSize:10 }}/> {s.loc}</span>
                    </div>
                  </div>
                  {server?.name === s.name && <i className="ti ti-circle-check" style={{ color:'var(--g)', fontSize:18 }}/>}
                </div>
              ))}
              {!srvList.length && !loadingSrv && <div style={{ color:'var(--nt)', fontSize:12, padding:'12px 0' }}>No {platform} servers found.</div>}
            </div>
          )}
          <button className="conn-continue-btn" disabled={!server} onClick={() => setStep('login')}>
            Continue with {server?.name || 'selected server'} →
          </button>
        </>}

        {step === 'login' && <>
          <button className="conn-back" onClick={() => setStep('server')}><i className="ti ti-arrow-left"/> Back</button>
          <div className="modal-title" style={{ marginTop:8 }}>Login to {broker?.name}</div>
          <div className="conn-login-summary">
            <div className="conn-summ-row"><span>Broker</span><span style={{ fontWeight:700 }}>{broker?.name}</span></div>
            <div className="conn-summ-row"><span>Server</span><span className="mono" style={{ fontSize:11 }}>{server?.name}</span></div>
            <div className="conn-summ-row"><span>Type</span><span className={server?.type==='live'?'srv-live':'srv-demo'} style={{ fontWeight:700 }}>{server?.type?.toUpperCase()}</span></div>
            <div className="conn-summ-row"><span>Platform</span><span>{platform}</span></div>
          </div>
          {server?.type === 'live' && <div className="conn-live-warn"><i className="ti ti-alert-triangle"/> Connecting to a <strong>LIVE</strong> account. Real funds are at risk.</div>}
          <div className="conn-field">
            <label>Account Login / ID</label>
            <input value={login} onChange={e => setLogin(e.target.value)} placeholder="e.g. 12345678" autoFocus/>
          </div>
          <div className="conn-field">
            <label>Password</label>
            <div style={{ position:'relative' }}>
              <input value={password} onChange={e => setPassword(e.target.value)} type={showPass?'text':'password'} placeholder="Investor or trading password" style={{ paddingRight:40 }}/>
              <button className="conn-eye" onClick={() => setShowPass(v => !v)}><i className={`ti ${showPass?'ti-eye-off':'ti-eye'}`}/></button>
            </div>
          </div>
          {errMsg && <div className="conn-error"><i className="ti ti-alert-circle"/> {errMsg}</div>}
          <button className="conn-continue-btn" onClick={handleConnect}><i className="ti ti-plug"/> Connect Account</button>
          <div className="conn-security" style={{ marginTop:10 }}><i className="ti ti-shield-lock"/> Credentials are sent only to {broker?.name}'s servers and never stored.</div>
        </>}

        {step === 'connecting' && (
          <div className="conn-anim">
            <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', width:68, height:68 }}>
              <div className="conn-anim-ring"/>
              <div className="conn-anim-logo" style={{ background: broker?.color }}>{broker?.logo}</div>
            </div>
            <div className="conn-anim-title">Connecting to {broker?.name}…</div>
            <ConnStep label={`Resolving ${server?.name}`}        delay={0}    />
            <ConnStep label="Authenticating credentials"          delay={500}  />
            <ConnStep label="Loading account history"             delay={1000} />
            <ConnStep label="Syncing positions and market watch"  delay={1600} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Watchlist ──────────────────────────────────────────────────────────────── */

function BalanceBar({ userBalance, userCurrency, positions, prices }) {
  const totalPL    = positions.reduce((s, p) => s + (p.pl || 0), 0);
  const equity     = userBalance + totalPL;
  const totalPips  = positions.reduce((s, p) => s + (p.pips || 0), 0);
  const plUp       = totalPL >= 0;
  return (
    <div className="bal-bar">
      <div className="bal-stat">
        <span className="bal-stat-lbl">Balance</span>
        <span className="bal-stat-val gold">{userCurrency} {userBalance.toFixed(2)}</span>
      </div>
      <div className="bal-stat">
        <span className="bal-stat-lbl">Equity</span>
        <span className={`bal-stat-val ${equity >= userBalance ? 'up' : 'dn'}`}>{userCurrency} {equity.toFixed(2)}</span>
      </div>
      <div className="bal-stat">
        <span className="bal-stat-lbl">Open P&L</span>
        <span className={`bal-stat-val ${plUp ? 'up' : 'dn'}`}>{plUp ? '+' : ''}{userCurrency} {totalPL.toFixed(2)}</span>
      </div>
      <div className="bal-stat">
        <span className="bal-stat-lbl">Total Pips</span>
        <span className={`bal-stat-val ${totalPips >= 0 ? 'up' : 'dn'}`}>{totalPips >= 0 ? '+' : ''}{totalPips.toFixed(1)}</span>
      </div>
      <div className="bal-stat">
        <span className="bal-stat-lbl">Positions</span>
        <span className="bal-stat-val">{positions.length}</span>
      </div>
    </div>
  );
}

function Watchlist({ prices, selected, onSelect, watchlist, onAddSymbol, onRemoveSymbol, session, userBalance, userCurrency }) {
  const [showAdd, setShowAdd] = useState(false);
  const [addQuery, setAddQuery] = useState('');

  const cats = [...new Set(watchlist.map(sym => ALL_INSTRUMENTS.find(i => i.sym === sym)?.cat).filter(Boolean))];

  const filteredAdd = useMemo(() => {
    const q = addQuery.toLowerCase();
    return ALL_INSTRUMENTS.filter(i => !watchlist.includes(i.sym) && (i.sym.toLowerCase().includes(q) || i.label.toLowerCase().includes(q) || i.cat.toLowerCase().includes(q)));
  }, [addQuery, watchlist]);

  return (
    <div className="watchlist">
      {session && (
        <div className="wl-account">
          <div className="wl-acc-broker-row">
            <div className="wl-acc-logo" style={{ background: session.broker.color }}>{session.broker.logo}</div>
            <div>
              <div className="wl-acc-name">{session.broker.name}</div>
              <div className="wl-acc-server mono">{session.server.name}</div>
            </div>
            <span className={session.accType==='live'?'srv-live':'srv-demo'} style={{ marginLeft:'auto', fontWeight:800, fontSize:9 }}>{session.accType.toUpperCase()}</span>
          </div>
          <div className="wl-acc-grid">
            <div className="wl-acc-row"><span>Balance</span><span className="mono text-gold">{userCurrency} {userBalance.toFixed(2)}</span></div>
            <div className="wl-acc-row"><span>Equity</span><span className={`mono ${session.equity>=session.balance?'up':'dn'}`}>{userCurrency} {session.equity.toFixed(2)}</span></div>
            <div className="wl-acc-row"><span>Free Margin</span><span className="mono">${(session.equity*0.92).toFixed(2)}</span></div>
            <div className="wl-acc-row"><span>Leverage</span><span className="mono">{session.leverage}</span></div>
          </div>
        </div>
      )}

      <div className="wl-head"><span>Symbol</span><span style={{ textAlign:'right' }}>Bid</span><span style={{ textAlign:'right' }}>Ask</span></div>

      <div className="wl-body">
        {cats.map(cat => (
          <React.Fragment key={cat}>
            <div className="wl-cat">{cat}</div>
            {watchlist.map(sym => ALL_INSTRUMENTS.find(i => i.sym === sym)).filter(inst => inst?.cat === cat).map(inst => {
              const p = prices[inst.sym];
              if (!p) return null;
              return (
                <div key={inst.sym} className={`wl-row${selected===inst.sym?' active':''}`} onClick={() => onSelect(inst.sym)}>
                  <div>
                    <span className="wl-sym">{inst.sym}</span>
                    <span className={`wl-chg ${p.changePct>=0?'up':'dn'}`}>{p.changePct>=0?'+':''}{p.changePct.toFixed(2)}%</span>
                  </div>
                  <span className={`wl-price mono ${p.dir===-1?'flash-dn':p.dir===1?'flash-up':''}`}>{p.bid.toFixed(inst.digits)}</span>
                  <span className="wl-price wl-ask mono">{p.ask.toFixed(inst.digits)}</span>
                  <button className="wl-remove" onClick={e => { e.stopPropagation(); onRemoveSymbol(inst.sym); }}>✕</button>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div className="wl-add-row">
        <button className="wl-add-btn" onClick={() => setShowAdd(true)}><i className="ti ti-plus"/> Add Symbol</button>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={e => { if (e.target===e.currentTarget){setShowAdd(false);setAddQuery('');} }}>
          <div className="modal" style={{ maxWidth:440, maxHeight:'80vh', display:'flex', flexDirection:'column', gap:0 }}>
            <div className="modal-title">Add Symbol</div>
            <button className="modal-close" onClick={() => { setShowAdd(false); setAddQuery(''); }}>✕</button>
            <div style={{ position:'relative', marginBottom:10 }}>
              <i className="ti ti-search" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--nt)', fontSize:14, pointerEvents:'none' }}/>
              <input autoFocus className="conn-search" placeholder="Search symbol, name, category…" value={addQuery} onChange={e => setAddQuery(e.target.value)}/>
            </div>
            <div className="sym-add-list">
              {[...new Set(filteredAdd.map(i => i.cat))].map(cat => (
                <React.Fragment key={cat}>
                  <div className="wl-cat" style={{ position:'sticky', top:0 }}>{cat}</div>
                  {filteredAdd.filter(i => i.cat === cat).map(inst => (
                    <div key={inst.sym} className="conn-broker-row" style={{ padding:'7px 12px' }}
                      onClick={() => { onAddSymbol(inst.sym); setShowAdd(false); setAddQuery(''); }}>
                      <div style={{ width:30, height:30, borderRadius:6, background:'var(--s2)', border:'1px solid var(--br)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color:'var(--g)' }}>{inst.sym.slice(0,3)}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700 }}>{inst.sym}</div>
                        <div style={{ fontSize:10, color:'var(--nt)' }}>{inst.label} · {inst.cat}</div>
                      </div>
                      <i className="ti ti-plus" style={{ marginLeft:'auto', color:'var(--g)' }}/>
                    </div>
                  ))}
                </React.Fragment>
              ))}
              {!filteredAdd.length && <div style={{ padding:20, textAlign:'center', color:'var(--nt)', fontSize:13 }}>No results for "{addQuery}"</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Toolbar ────────────────────────────────────────────────────────────────── */

// Lucide-style inline icon component. Hoisted to module scope (not declared
// inside Toolbar/MobileChartPane) so it keeps a stable identity across
// renders — otherwise React treats every icon as a brand-new component type
// on every re-render (e.g. every price tick) and remounts them all, which is
// what caused the toolbar to visibly flicker/glitch.
const LI = ({ d, size=15, stroke='currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

// Icon paths for the mobile bottom nav (rendered via LI, replacing the old
// tabler icon-font classes so the nav matches the rest of the mobile UI's
// inline-SVG icon style).
const MOB_NAV_ICONS = {
  symbols: <><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.3" y2="16.3"/></>,
  chart:   <><rect x="4" y="9" width="4" height="10"/><line x1="6" y1="6" x2="6" y2="9"/><line x1="6" y1="19" x2="6" y2="21"/><rect x="10" y="11" width="4" height="6"/><line x1="12" y1="8" x2="12" y2="11"/><line x1="12" y1="17" x2="12" y2="19"/><rect x="16" y="6" width="4" height="13"/><line x1="18" y1="3" x2="18" y2="6"/><line x1="18" y1="19" x2="18" y2="21"/></>,
  trade:   <><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>,
  history: <><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></>,
  journal: <><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></>,
};

function Toolbar({ tf, onTf, sym, prices, chartType, onChartType }) {
  const inst = ALL_INSTRUMENTS.find(i => i.sym === sym);
  const p    = prices[sym];

  const ICONS = {
    candle:    <LI d={<><rect x="4" y="7" width="4" height="10"/><line x1="6" y1="4" x2="6" y2="7"/><line x1="6" y1="17" x2="6" y2="20"/><rect x="10" y="9" width="4" height="6"/><line x1="12" y1="6" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="18"/><rect x="16" y="5" width="4" height="12"/><line x1="18" y1="2" x2="18" y2="5"/><line x1="18" y1="17" x2="18" y2="20"/></>}/>,
    bar:       <LI d={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="18" y1="4" x2="18" y2="2"/><line x1="6" y1="20" x2="6" y2="16"/><line x1="6" y1="10" x2="6" y2="2"/><line x1="12" y1="20" x2="12" y2="14"/><line x1="12" y1="8" x2="12" y2="2"/><line x1="15" y1="10" x2="18" y2="10"/><line x1="3" y1="16" x2="6" y2="16"/><line x1="9" y1="8" x2="12" y2="8"/></>}/>,
    line:      <LI d={<polyline points="3 20 8 14 13 18 22 5"/>}/>,
  };

  const chartTypes = [{ id:'candle' }, { id:'bar' }, { id:'line' }];

  return (
    <div className="toolbar">
      <div className="tb-sym-block">
        <span className="tb-sym">{sym}</span>
        {p && inst && <>
          <span className={`tb-bid mono ${p.dir===1?'up':'dn'}`}>{p.bid.toFixed(inst.digits)}</span>
          <span className={`tb-chg ${p.changePct>=0?'up':'dn'}`} style={{ background: p.changePct>=0?'rgba(52,211,153,.1)':'rgba(248,113,113,.1)', padding:'1px 5px', borderRadius:3 }}>
            {p.changePct>=0?'+':''}{p.changePct.toFixed(2)}%
          </span>
        </>}
      </div>
      <div className="tb-div"/>

      <div className="tb-tf-group">
        {TIMEFRAMES.map(t => <button key={t} className={`tb-tf${tf===t?' active':''}`} onClick={() => onTf(t)}>{TF_MAP[t]}</button>)}
      </div>

      <div className="tb-div"/>
      <div className="tb-chart-type">
        {chartTypes.map(ct => <button key={ct.id} className={`tb-tool${chartType===ct.id?' active':''}`} onClick={() => onChartType(ct.id)} title={ct.id}>{ICONS[ct.id]}</button>)}
      </div>

      {/* Drawing tools (trendline, ray, fib, rectangle, text, etc.) live in
         TradingView's own side toolbar on the chart itself — see the
         hide_side_toolbar note in TradingViewWidget for why. */}
    </div>
  );
}

/* ─── Positions Blotter ──────────────────────────────────────────────────────── */

function Positions({ positions, prices, onClose }) {
  const totalPL = positions.reduce((s, p) => s + p.pl, 0);
  return (
    <div className="blotter">
      <div className="blotter-header">
        <span>Positions <span className="pos-badge">{positions.length}</span></span>
        <span className={`blotter-total ${totalPL>=0?'up':'dn'}`}>Float P/L: <span className="mono">{totalPL>=0?'+':''}${totalPL.toFixed(2)}</span></span>
      </div>
      <div className="dt-wrap">
        <table className="dt">
          <thead>
            <tr><th>#</th><th>Symbol</th><th>Type</th><th>Lots</th><th>Open</th><th>S/L</th><th>T/P</th><th>Current</th><th>Pips</th><th>Profit</th><th/></tr>
          </thead>
          <tbody>
            {!positions.length && <tr><td colSpan="11" style={{ textAlign:'center', color:'var(--nt)', padding:16 }}>No open positions</td></tr>}
            {positions.map(pos => {
              const lp   = prices[pos.sym];
              const inst = ALL_INSTRUMENTS.find(i => i.sym === pos.sym);
              const d    = inst?.digits ?? 2;
              const cur  = lp ? (pos.type==='BUY' ? lp.bid : lp.ask) : pos.open;
              return (
                <tr key={pos.id}>
                  <td className="mono text-muted" style={{ fontSize:10 }}>{pos.id}</td>
                  <td style={{ fontWeight:700 }}>{pos.sym}{pos.approval === 'pending' && <span className="badge" title="Waiting for an admin to approve this trade" style={{ marginLeft:6, background:'rgba(226,174,74,.15)', color:'#E2AE4A' }}>Pending</span>}</td>
                  <td><span className={`badge badge-${pos.type==='BUY'?'green':'red'}`}>{pos.type}</span></td>
                  <td className="mono">{pos.lots}</td>
                  <td className="mono">{pos.open.toFixed(d)}</td>
                  <td className="mono dn">{pos.sl?pos.sl.toFixed(d):'—'}</td>
                  <td className="mono up">{pos.tp?pos.tp.toFixed(d):'—'}</td>
                  <td className={`mono ${pos.type==='BUY'?'up':'dn'}`}>{cur.toFixed(d)}</td>
                  <td className={`mono ${pos.pips>=0?'up':'dn'}`}>{pos.pips>=0?'+':''}{pos.pips}</td>
                  <td className={`mono ${pos.pl>=0?'up':'dn'}`} style={{ fontWeight:700 }}>{pos.pl>=0?'+':''}${pos.pl.toFixed(2)}</td>
                  <td><button className="pos-close-btn" title={pos.approval === 'pending' ? 'Cancel request' : 'Close position'} onClick={() => onClose(pos.id)}>✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Trade History (closed trades) ──────────────────────────────────────────── */

function TradeHistory({ history }) {
  const totalPL = history.reduce((s, t) => s + (t.pl || 0), 0);
  const formatTime = iso => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
    } catch { return '—'; }
  };
  return (
    <div className="blotter">
      <div className="blotter-header">
        <span>History <span className="pos-badge">{history.length}</span></span>
        <span className={`blotter-total ${totalPL>=0?'up':'dn'}`}>
          Realized P/L: <span className="mono">{totalPL>=0?'+':''}${totalPL.toFixed(2)}</span>
        </span>
      </div>
      <div className="dt-wrap">
        <table className="dt">
          <thead>
            <tr>
              <th>#</th><th>Symbol</th><th>Type</th><th>Lots</th>
              <th>Open</th><th>Close</th><th>Pips</th><th>Profit</th><th>Closed</th>
            </tr>
          </thead>
          <tbody>
            {!history.length && (
              <tr>
                <td colSpan="9" style={{ textAlign:'center', color:'var(--nt)', padding:16 }}>
                  No closed trades yet
                </td>
              </tr>
            )}
            {history.map(t => {
              const inst = ALL_INSTRUMENTS.find(i => i.sym === t.sym);
              const d = inst?.digits ?? 2;
              return (
                <tr key={t.id}>
                  <td className="mono text-muted" style={{ fontSize:10 }}>{String(t.id).slice(0, 8)}</td>
                  <td style={{ fontWeight:700 }}>{t.sym}</td>
                  <td><span className={`badge badge-${t.type==='BUY'?'green':'red'}`}>{t.type}</span></td>
                  <td className="mono">{t.lots}</td>
                  <td className="mono">{(+t.open).toFixed(d)}</td>
                  <td className="mono">{(+t.close).toFixed(d)}</td>
                  <td className={`mono ${t.pips>=0?'up':'dn'}`}>{t.pips>=0?'+':''}{t.pips}</td>
                  <td className={`mono ${t.pl>=0?'up':'dn'}`} style={{ fontWeight:700 }}>
                    {t.pl>=0?'+':''}${Number(t.pl).toFixed(2)}
                  </td>
                  <td className="mono text-muted" style={{ fontSize:10 }}>{formatTime(t.closedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MobileTradeHistory({ history }) {
  const totalPL = history.reduce((s, t) => s + (t.pl || 0), 0);
  const formatTime = iso => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
    } catch { return '—'; }
  };
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--bg)' }}>
      <div style={{ padding:'12px 14px 8px', background:'var(--s)', borderBottom:'1px solid var(--br)', flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:13, fontWeight:800, letterSpacing:'.4px', color:'var(--nt)', textTransform:'uppercase' }}>
          History ({history.length})
        </span>
        {history.length > 0 && (
          <span className={`mono ${totalPL>=0?'up':'dn'}`} style={{ fontSize:12, fontWeight:800 }}>
            {totalPL>=0?'+':''}${totalPL.toFixed(2)}
          </span>
        )}
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:10 }}>
        {!history.length && (
          <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--nt)', fontSize:13 }}>
            <i className="ti ti-history" style={{ fontSize:32, display:'block', marginBottom:10, opacity:.3 }}/>
            No closed trades yet
          </div>
        )}
        {history.map(t => {
          const inst = ALL_INSTRUMENTS.find(i => i.sym === t.sym);
          const d = inst?.digits ?? 2;
          return (
            <div key={t.id} className="mob-pos-card">
              <div className="mob-pos-header">
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span className="mob-pos-sym">{t.sym}</span>
                  <span className={`badge badge-${t.type==='BUY'?'green':'red'}`}>{t.type}</span>
                  <span style={{ fontSize:10, color:'var(--nt)' }}>{t.lots} lots</span>
                </div>
                <span className={`mob-pos-pl ${t.pl>=0?'up':'dn'}`}>
                  {t.pl>=0?'+':''}${Number(t.pl).toFixed(2)}
                </span>
              </div>
              <div className="mob-pos-row"><span>Open</span><span>{(+t.open).toFixed(d)}</span></div>
              <div className="mob-pos-row"><span>Close</span><span>{(+t.close).toFixed(d)}</span></div>
              <div className="mob-pos-row">
                <span>Pips</span>
                <span className={t.pips>=0?'up':'dn'}>{t.pips>=0?'+':''}{t.pips}</span>
              </div>
              <div className="mob-pos-row"><span>Closed</span><span>{formatTime(t.closedAt)}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── OrderPanel ─────────────────────────────────────────────────────────────── */

function OrderPanel({ sym, prices, onPlace, userBalance, session }) {
  const inst = ALL_INSTRUMENTS.find(i => i.sym === sym);
  const p    = prices[sym];
  const [orderType, setOrderType] = useState('market');
  const [lots,      setLots]      = useState('0.10');
  const [sl,        setSl]        = useState('');
  const [tp,        setTp]        = useState('');
  const [limitPx,   setLimitPx]   = useState('');
  const [flash,     setFlash]     = useState(null);

  if (!p || !inst) return null;
  const bid = p.bid.toFixed(inst.digits);
  const ask = p.ask.toFixed(inst.digits);
  const spd = (inst.spread / inst.pip).toFixed(1);

  const canTrade = userBalance > 0;

  const place = side => {
    if (!canTrade) return;
    onPlace({ sym, type: side==='buy'?'BUY':'SELL', lots: parseFloat(lots)||0.01, open: side==='buy'?p.ask:p.bid, sl:parseFloat(sl)||null, tp:parseFloat(tp)||null });
    setFlash(side); setTimeout(() => setFlash(null), 500);
  };

  return (
    <div className="order-panel">
      <div className="op-header">
        <div className="op-sym-name">{sym}</div>
        <div className="op-sym-label">{inst.label}</div>
      </div>

      <div className="op-prices">
        <div className={`op-side op-sell${flash==='sell'?' flash-red':''}${canTrade?'':' disabled'}`} onClick={() => place('sell')}>
          <div className="op-side-lbl" style={{ color:'var(--rd)' }}>SELL</div>
          <div className="op-side-price dn mono">{bid}</div>
        </div>
        <div className="op-spread-col">
          <div className="op-spread-val mono">{spd}</div>
          <div className="op-spread-lbl">pts</div>
        </div>
        <div className={`op-side op-buy${flash==='buy'?' flash-green':''}${canTrade?'':' disabled'}`} onClick={() => place('buy')}>
          <div className="op-side-lbl" style={{ color:'var(--gn)' }}>BUY</div>
          <div className="op-side-price up mono">{ask}</div>
        </div>
      </div>

      <div className="op-body">
        {!canTrade && (
          <div className="op-balance-warn">
            <i className="ti ti-alert-triangle"/>
            {session ? 'Insufficient balance — deposit funds to trade.' : 'Connect an account with available balance to trade.'}
          </div>
        )}

        <div className="op-type-row">
          {['market','limit','stop'].map(t => <button key={t} className={`op-type-btn${orderType===t?' active':''}`} onClick={() => setOrderType(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
        </div>

        <div className="op-field">
          <label>Volume (lots)</label>
          <div className="op-num-row">
            <button className="op-stepper" onClick={() => setLots(v => Math.max(0.01, +v - 0.01).toFixed(2))}>−</button>
            <input className="op-input mono" value={lots} onChange={e => setLots(e.target.value)}/>
            <button className="op-stepper" onClick={() => setLots(v => (+v + 0.01).toFixed(2))}>+</button>
          </div>
        </div>

        {(orderType==='limit'||orderType==='stop') && (
          <div className="op-field">
            <label>{orderType==='limit'?'Limit':'Stop'} Price</label>
            <input className="op-input mono full" value={limitPx} onChange={e => setLimitPx(e.target.value)} placeholder={bid}/>
          </div>
        )}

        <div className="op-sl-tp">
          <div className="op-field">
            <label className="dn">Stop Loss</label>
            <input className="op-input mono full" value={sl} onChange={e => setSl(e.target.value)} placeholder="0.00"/>
          </div>
          <div className="op-field">
            <label className="up">Take Profit</label>
            <input className="op-input mono full" value={tp} onChange={e => setTp(e.target.value)} placeholder="0.00"/>
          </div>
        </div>

        <div className="op-exec-row">
          <button className="op-exec-btn op-exec-sell" onClick={() => place('sell')} disabled={!canTrade}>
            <span className="op-exec-lbl">SELL</span>
            <span className="op-exec-px mono">{bid}</span>
          </button>
          <button className="op-exec-btn op-exec-buy" onClick={() => place('buy')} disabled={!canTrade}>
            <span className="op-exec-lbl">BUY</span>
            <span className="op-exec-px mono">{ask}</span>
          </button>
        </div>

        <div className="op-info">
          <span>Margin: <span className="mono text-gold">${(+lots*inst.price*0.02).toFixed(2)}</span></span>
          <span>1pt = <span className="mono">${(+lots*10).toFixed(2)}</span></span>
        </div>
      </div>
    </div>
  );
}

/* ─── AppNav ─────────────────────────────────────────────────────────────────── */

const NAV_GROUPS = [
  { title:'Overview', links:[
    { href:'/dashboard',    icon:'ti-layout-dashboard', label:'Dashboard' },
  ]},
  { title:'Invest', links:[
    { href:'/stocks',       icon:'ti-chart-line',       label:'Stocks' },
    { href:'/copy-trading', icon:'ti-copy',             label:'Copy Trading' },
    { href:'/hire-trader',  icon:'ti-users',            label:'Hire a Trader' },
    { href:'/real-estate',  icon:'ti-building',         label:'Real Estate', badge:'NEW' },
    { href:'/mining',       icon:'ti-pick',             label:'Mining',      badge:'NEW' },
    { href:'/staking',      icon:'ti-stack-2',          label:'Staking',     badge:'NEW' },
    { href:'/swap',         icon:'ti-arrows-exchange',  label:'Swap',        badge:'NEW' },
    { href:'/terminal',     icon:'ti-chart-candle',     label:'Terminal', active:true },
  ]},
  { title:'Discover', links:[
    { href:'/market-place', icon:'ti-robot',            label:'Marketplace', secondary:true },
    { href:'/insights',     icon:'ti-bulb',             label:'Insights',    secondary:true },
  ]},
];
const NAV_LINKS = NAV_GROUPS.flatMap(g => g.links);
const ACCOUNT_LINKS = [
  { href:'/payments', icon:'ti-credit-card', label:'Payments' },
  { href:'/cards',    icon:'ti-cards',       label:'Cards' },
  { href:'/profile',  icon:'ti-user-circle', label:'Profile'  },
  { href:'/verify-identity', icon:'ti-shield-check', label:'Verify identity' },
  { href:'/settings', icon:'ti-settings',    label:'Settings' },
  { href:'/support',  icon:'ti-headset',     label:'Support'  },
];
const termLogout = async () => { try { await supabase.auth.signOut(); } catch (_) {} window.location.href = '/login'; };

function GoogleTranslate() {
  const ref = useRef(null);
  useEffect(() => {
    if (window.google?.translate) return; // already loaded
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        { pageLanguage: 'en', layout: 0, autoDisplay: false },
        ref.current
      );
    };
    const s = document.createElement('script');
    s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    document.head.appendChild(s);
  }, []);
  return <div ref={ref} className="gt-widget"/>;
}

function AppNav({ onMenuToggle, session, onConnectClick, onDisconnect, userBalance, userCurrency, userName }) {
  const initials = userName
    ? userName.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : '??';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <nav className="gnav">
      <button className="nav-hamburger nav-hamburger--mobile" onClick={onMenuToggle} aria-label="Open menu"><span/><span/><span/></button>
      <a href="/dashboard" className="nav-logo" aria-label="ProfitGainSignal dashboard"><BrandMark size={22} /></a>
      <span className="nav-live"><i />Live</span>
      <div className="gnav-links">
        {NAV_LINKS.map(({ href, icon, label, active, badge, secondary }) => (
          <a key={label} href={href} className={`gnav-link${active ? ' active' : ''}${secondary ? ' gnav-secondary' : ''}`} aria-current={active ? 'page' : undefined}>
            <i className={`ti ${icon}`}/>{label}
            {badge && <span className="gnav-link-badge">{badge}</span>}
          </a>
        ))}
      </div>
      <div className="gnav-right">
        {session ? (
          <>
            <div className="nav-sess">
              <div className="nav-sess-logo" style={{ background: session.broker.color }}>{session.broker.logo}</div>
              <div>
                <div className="nav-sess-name">{session.broker.name} <span className={`nav-acc ${session.accType === 'live' ? 'live' : ''}`}>{session.accType === 'live' ? 'Live' : 'Demo'}</span></div>
                <div className="nav-sess-bal">{userCurrency} {userBalance.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}</div>
                <GoogleTranslate/>
              </div>
            </div>
            <button className="btn-disconnect" onClick={onDisconnect}><i className="ti ti-plug-x"/> Disconnect</button>
          </>
        ) : (
          <button className="btn-connect" onClick={onConnectClick}><i className="ti ti-plug"/> Connect account</button>
        )}
        <a href="/notification" className="nav-icon-btn" aria-label="Notifications"><i className="ti ti-bell"/><span className="nav-ndot"/></a>
        <div className="nav-menu" ref={menuRef}>
          <button className="nav-av" onClick={() => setMenuOpen(o => !o)} aria-label="Account menu" aria-expanded={menuOpen}>{initials}</button>
          {menuOpen && (
            <div className="nav-drop" role="menu">
              <div className="nav-drop-head"><strong>{userName || 'Trader'}</strong><span>{session ? `${session.broker.name}, ${session.accType === 'live' ? 'live' : 'demo'} account` : 'No broker connected'}</span></div>
              {ACCOUNT_LINKS.map(l => <a key={l.label} href={l.href} className="nav-drop-item" role="menuitem"><i className={`ti ${l.icon}`}/>{l.label}</a>)}
              <button className="nav-drop-item nav-drop-out" role="menuitem" onClick={termLogout}><i className="ti ti-logout"/>Log out</button>
            </div>
          )}
        </div>
      </div>
      {/* Mobile-only: connect button shown in header */}
      <div className="mob-nav-connect-only">
        {session ? (
          <button className="btn-disconnect" onClick={onDisconnect}><i className="ti ti-plug-x"/> Disconnect</button>
        ) : (
          <button className="btn-connect" onClick={onConnectClick}><i className="ti ti-plug"/> Connect</button>
        )}
      </div>
    </nav>
  );
}

function MobileSidebar({ open, onClose, userName, session }) {
  const initials = userName
    ? userName.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : '??';
  return (
    <>
      <div className={`sidebar-backdrop${open ? ' open' : ''}`} onClick={onClose}/>
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
        <div className="sb-head">
          <a href="/dashboard" className="sb-head-logo"><BrandMark size={24} /></a>
          <button className="sb-close" onClick={onClose} aria-label="Close menu">
            <LI d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} size={14}/>
          </button>
        </div>
        <nav className="sb-scroll">
          {NAV_GROUPS.map(g => (
            <div key={g.title}>
              <div className="sb-lbl">{g.title}</div>
              {g.links.map(({ href, icon, label, active, badge }) => (
                <a key={label} href={href} className={`sb-item${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
                  <i className={`ti ${icon} sb-ico`}/>
                  <span className="sb-item-label">{label}</span>
                  {badge && <span className="sb-item-badge">{badge}</span>}
                </a>
              ))}
            </div>
          ))}
          <div className="sb-lbl">Account</div>
          {ACCOUNT_LINKS.map(({ href, icon, label }) => (
            <a key={label} href={href} className="sb-item">
              <i className={`ti ${icon} sb-ico`}/>
              <span className="sb-item-label">{label}</span>
            </a>
          ))}
          <button className="sb-item sb-out" onClick={termLogout}><i className="ti ti-logout sb-ico"/><span className="sb-item-label">Log out</span></button>
        </nav>
        <div className="sb-user">
          <div className="sb-av">{initials}</div>
          <div className="sb-user-info">
            <div className="sb-name">{userName || 'Trader'}</div>
            <div className="sb-role">{session ? `${session.broker.name}, ${session.accType === 'live' ? 'live' : 'demo'}` : 'No broker connected'}</div>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ─── MobileSymbolScreen ─────────────────────────────────────────────────────── */

function MobileSymbolScreen({ prices, watchlist, selectedSym, onSelect, onAddSymbol }) {
  const [showAdd, setShowAdd] = useState(false);
  const [addQuery, setAddQuery] = useState('');

  const cats = [...new Set(watchlist.map(sym => ALL_INSTRUMENTS.find(i => i.sym === sym)?.cat).filter(Boolean))];

  const filteredAdd = useMemo(() => {
    const q = addQuery.toLowerCase();
    return ALL_INSTRUMENTS.filter(i => !watchlist.includes(i.sym) && (i.sym.toLowerCase().includes(q) || i.label.toLowerCase().includes(q) || i.cat.toLowerCase().includes(q)));
  }, [addQuery, watchlist]);

  return (
    <div className="mob-sym-screen">
      <div className="mob-sym-header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span className="mob-sym-title">Market Watch</span>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:9, color:'var(--g)', fontWeight:700, fontFamily:'var(--mono)' }}>● LIVE</span>
            <button className="mob-sym-add-btn" onClick={() => setShowAdd(true)} aria-label="Add symbol">
              <LI d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} size={16}/>
            </button>
          </div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 72px 72px', padding:'6px 14px 4px', borderBottom:'1px solid var(--br)', background:'var(--s2)' }}>
        <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'var(--nt)' }}>Symbol</span>
        <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'var(--nt)', textAlign:'right' }}>Bid</span>
        <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'var(--nt)', textAlign:'right' }}>Ask</span>
      </div>
      <div className="mob-sym-list">
        {cats.map(cat => (
          <React.Fragment key={cat}>
            <div className="mob-sym-cat">{cat}</div>
            {watchlist
              .map(sym => ALL_INSTRUMENTS.find(i => i.sym === sym))
              .filter(inst => inst?.cat === cat)
              .map(inst => {
                const p = prices[inst.sym];
                if (!p) return null;
                return (
                  <div key={inst.sym} className={`mob-sym-row${selectedSym===inst.sym?' active':''}`} onClick={() => onSelect(inst.sym)}>
                    <div>
                      <span className="mob-sym-name">{inst.sym}</span>
                      <span className="mob-sym-label">{inst.label}</span>
                      <span className={`mob-sym-chg ${p.changePct>=0?'up':'dn'}`}>{p.changePct>=0?'+':''}{p.changePct.toFixed(2)}%</span>
                    </div>
                    <span className={`mob-sym-price ${p.dir===1?'flash-up':p.dir===-1?'flash-dn':''}`}>{p.bid.toFixed(inst.digits)}</span>
                    <span className="mob-sym-price mob-sym-ask">{p.ask.toFixed(inst.digits)}</span>
                  </div>
                );
              })}
          </React.Fragment>
        ))}
        {!watchlist.length && (
          <div style={{ padding:24, textAlign:'center', color:'var(--nt)', fontSize:13 }}>
            No symbols yet — tap + above to add one.
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={e => { if (e.target===e.currentTarget){setShowAdd(false);setAddQuery('');} }}>
          <div className="modal" style={{ maxWidth:440, maxHeight:'80vh', display:'flex', flexDirection:'column', gap:0 }}>
            <div className="modal-title">Add Symbol</div>
            <button className="modal-close" onClick={() => { setShowAdd(false); setAddQuery(''); }}>✕</button>
            <div style={{ position:'relative', marginBottom:10 }}>
              <i className="ti ti-search" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--nt)', fontSize:14, pointerEvents:'none' }}/>
              <input autoFocus className="conn-search" placeholder="Search symbol, name, category…" value={addQuery} onChange={e => setAddQuery(e.target.value)}/>
            </div>
            <div className="sym-add-list">
              {[...new Set(filteredAdd.map(i => i.cat))].map(cat => (
                <React.Fragment key={cat}>
                  <div className="wl-cat" style={{ position:'sticky', top:0 }}>{cat}</div>
                  {filteredAdd.filter(i => i.cat === cat).map(inst => (
                    <div key={inst.sym} className="conn-broker-row" style={{ padding:'7px 12px' }}
                      onClick={() => { onAddSymbol(inst.sym); setShowAdd(false); setAddQuery(''); }}>
                      <div style={{ width:30, height:30, borderRadius:6, background:'var(--s2)', border:'1px solid var(--br)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color:'var(--g)' }}>{inst.sym.slice(0,3)}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700 }}>{inst.sym}</div>
                        <div style={{ fontSize:10, color:'var(--nt)' }}>{inst.label} · {inst.cat}</div>
                      </div>
                      <i className="ti ti-plus" style={{ marginLeft:'auto', color:'var(--g)' }}/>
                    </div>
                  ))}
                </React.Fragment>
              ))}
              {!filteredAdd.length && <div style={{ padding:20, textAlign:'center', color:'var(--nt)', fontSize:13 }}>No results for "{addQuery}"</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MobileChartPane ────────────────────────────────────────────────────────── */

function MobileChartPane({ sym, tf, onTf, prices, chartType, onChartType }) {
  const inst = ALL_INSTRUMENTS.find(i => i.sym === sym);
  const p    = prices[sym];

  const [tfOpen, setTfOpen] = useState(false);
  const [ctOpen, setCtOpen] = useState(false);
  const tfRef = useRef(null);
  const ctRef = useRef(null);

  // Uses the shared module-scope LI icon component (see top of file).
  const ICONS = {
    candle:    <LI d={<><rect x="4" y="7" width="4" height="10"/><line x1="6" y1="4" x2="6" y2="7"/><line x1="6" y1="17" x2="6" y2="20"/><rect x="10" y="9" width="4" height="6"/><line x1="12" y1="6" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="18"/><rect x="16" y="5" width="4" height="12"/><line x1="18" y1="2" x2="18" y2="5"/><line x1="18" y1="17" x2="18" y2="20"/></>}/>,
    bar:       <LI d={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="18" y1="4" x2="18" y2="2"/><line x1="6" y1="20" x2="6" y2="16"/><line x1="6" y1="10" x2="6" y2="2"/><line x1="12" y1="20" x2="12" y2="14"/><line x1="12" y1="8" x2="12" y2="2"/><line x1="15" y1="10" x2="18" y2="10"/><line x1="3" y1="16" x2="6" y2="16"/><line x1="9" y1="8" x2="12" y2="8"/></>}/>,
    line:      <LI d={<polyline points="3 20 8 14 13 18 22 5"/>}/>,
    chevdown:  <LI d={<polyline points="6 9 12 15 18 9"/> } size={12}/>,
    chevup:    <LI d={<polyline points="18 15 12 9 6 15"/>} size={12}/>,
  };

  const chartTypes = [{ id:'candle' }, { id:'bar' }, { id:'line' }];

  useEffect(() => {
    const h = e => {
      if (tfRef.current && !tfRef.current.contains(e.target)) setTfOpen(false);
      if (ctRef.current && !ctRef.current.contains(e.target)) setCtOpen(false);
    };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
  }, []);

  const closeAll = () => { setTfOpen(false); setCtOpen(false); };

  return (
    <div className="mob-chart-pane">
      <div className="mob-chart-toolbar">
        <span className="mob-ct-sym">{sym}</span>
        {p && inst && <>
          <span className={`mob-ct-price mono ${p.dir===1?'up':'dn'}`}>{p.bid.toFixed(inst.digits)}</span>
          <span className={`mob-ct-chg ${p.changePct>=0?'up':'dn'}`}
            style={{ background: p.changePct>=0?'rgba(52,211,153,.12)':'rgba(248,113,113,.12)', padding:'2px 6px', borderRadius:3 }}>
            {p.changePct>=0?'+':''}{p.changePct.toFixed(2)}%
          </span>
        </>}
        <div className="mob-ct-spacer"/>

        {/* TF dropdown */}
        <div className="mob-dd" ref={tfRef}>
          <button className="mob-dd-btn accent" onClick={() => { closeAll(); setTfOpen(v=>!v); }}>
            {TF_MAP[tf]} {tfOpen ? ICONS.chevup : ICONS.chevdown}
          </button>
          <div className={`mob-dd-menu tf-grid${tfOpen?' open':''}`}>
            {TIMEFRAMES.map(t => (
              <div key={t} className={`mob-dd-tf-opt${tf===t?' active':''}`}
                onClick={() => { onTf(t); setTfOpen(false); }}>{TF_MAP[t]}</div>
            ))}
          </div>
        </div>

        {/* Chart type dropdown */}
        <div className="mob-dd" ref={ctRef}>
          <button className="mob-dd-btn" onClick={() => { closeAll(); setCtOpen(v=>!v); }}>
            {ICONS[chartType] || ICONS.candle}{ICONS.chevdown}
          </button>
          <div className={`mob-dd-menu ct-grid${ctOpen?' open':''}`}>
            {chartTypes.map(ct => (
              <div key={ct.id} className={`mob-dd-ct-opt${chartType===ct.id?' active':''}`}
                onClick={() => { onChartType(ct.id); setCtOpen(false); }}>
                {ICONS[ct.id]}
              </div>
            ))}
          </div>
        </div>

        {/* Drawing tools (trendline, ray, fib, rectangle, text, etc.) live in
           TradingView's own toolbar on the chart itself — tap the pencil/
           tools icon on the left edge of the chart. There's no JS bridge in
           this embed to drive TradingView's drawing engine from a custom
           button, so a custom tools dropdown here could never actually draw
           anything. */}
      </div>

      {/* Chart */}
      <div className="chart-area" style={{ flex:1 }}>
        <ChartErrorBoundary sym={sym} tf={tf} chartType={chartType}>
          <TradingViewWidget sym={sym} tf={tf} chartType={chartType}/>
        </ChartErrorBoundary>
      </div>
    </div>
  );
}

/* ─── MobileTradeScreen ──────────────────────────────────────────────────────── */

function MobileTradeScreen({ sym, prices, positions, onPlace, onClosePos, userBalance, session }) {
  const [tab,       setTab]       = useState('new');
  const [orderType, setOrderType] = useState('market');
  const [lots,      setLots]      = useState('0.10');
  const [sl,        setSl]        = useState('');
  const [tp,        setTp]        = useState('');
  const [limitPx,   setLimitPx]   = useState('');
  const [flash,     setFlash]     = useState(null);

  const inst = ALL_INSTRUMENTS.find(i => i.sym === sym);
  const p    = prices[sym];
  if (!p || !inst) return null;

  const bid = p.bid.toFixed(inst.digits);
  const ask = p.ask.toFixed(inst.digits);
  const spd = (inst.spread / inst.pip).toFixed(1);
  const totalPL = positions.reduce((s, pos) => s + pos.pl, 0);
  const canTrade = userBalance > 0;

  const place = side => {
    if (!canTrade) return;
    onPlace({ sym, type: side==='buy'?'BUY':'SELL', lots: parseFloat(lots)||0.01, open: side==='buy'?p.ask:p.bid, sl:parseFloat(sl)||null, tp:parseFloat(tp)||null });
    setFlash(side); setTimeout(() => setFlash(null), 500);
  };

  return (
    <div className="mob-trade-screen">
      <div className="mob-trade-inner-tabs">
        <div className={`mob-tit${tab==='new'?' active':''}`} onClick={() => setTab('new')}>
          <i className="ti ti-plus"/> New Trade
        </div>
        <div className={`mob-tit${tab==='positions'?' active':''}`} onClick={() => setTab('positions')}>
          <i className="ti ti-list"/> Positions ({positions.length})
        </div>
      </div>

      <div className="mob-trade-content">
        {tab === 'new' && (
          <div className="mob-order-form">
            {/* Symbol + spread header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:800 }}>{sym}</div>
                <div style={{ fontSize:10, color:'var(--nt)' }}>{inst.label}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:9, color:'var(--nt)', marginBottom:2 }}>SPREAD</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:14, fontWeight:800 }}>{spd} <span style={{ fontSize:9, color:'var(--nt)' }}>pts</span></div>
              </div>
            </div>

            {/* SELL / BUY buttons */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <div className={`op-side op-sell${flash==='sell'?' flash-red':''}${canTrade?'':' disabled'}`} onClick={() => place('sell')}
                style={{ padding:'14px 10px', borderRadius:10 }}>
                <div className="op-side-lbl" style={{ color:'var(--rd)', fontSize:10, letterSpacing:1.2 }}>SELL</div>
                <div className="op-side-price dn mono" style={{ fontSize:20 }}>{bid}</div>
              </div>
              <div className={`op-side op-buy${flash==='buy'?' flash-green':''}${canTrade?'':' disabled'}`} onClick={() => place('buy')}
                style={{ padding:'14px 10px', borderRadius:10 }}>
                <div className="op-side-lbl" style={{ color:'var(--gn)', fontSize:10, letterSpacing:1.2 }}>BUY</div>
                <div className="op-side-price up mono" style={{ fontSize:20 }}>{ask}</div>
              </div>
            </div>

            {/* Order type */}
            <div className="op-type-row" style={{ marginBottom:12 }}>
              {['market','limit','stop'].map(t => (
                <button key={t} className={`op-type-btn${orderType===t?' active':''}`}
                  onClick={() => setOrderType(t)} style={{ padding:'6px 0', fontSize:11 }}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>

            {/* Lots */}
            <div className="op-field" style={{ marginBottom:10 }}>
              <label>Volume (lots)</label>
              <div className="op-num-row">
                <button className="op-stepper" style={{ width:38, height:38 }}
                  onClick={() => setLots(v => Math.max(0.01, +v - 0.01).toFixed(2))}>−</button>
                <input className="op-input mono" style={{ height:38, fontSize:16 }} value={lots}
                  onChange={e => setLots(e.target.value)}/>
                <button className="op-stepper" style={{ width:38, height:38 }}
                  onClick={() => setLots(v => (+v + 0.01).toFixed(2))}>+</button>
              </div>
            </div>

            {(orderType==='limit'||orderType==='stop') && (
              <div className="op-field" style={{ marginBottom:10 }}>
                <label>{orderType==='limit'?'Limit':'Stop'} Price</label>
                <input className="op-input mono full" style={{ height:38 }} value={limitPx}
                  onChange={e => setLimitPx(e.target.value)} placeholder={bid}/>
              </div>
            )}

            {/* SL/TP */}
            <div className="op-sl-tp" style={{ marginBottom:12 }}>
              <div className="op-field">
                <label className="dn">Stop Loss</label>
                <input className="op-input mono full" style={{ height:38 }} value={sl}
                  onChange={e => setSl(e.target.value)} placeholder="0.00"/>
              </div>
              <div className="op-field">
                <label className="up">Take Profit</label>
                <input className="op-input mono full" style={{ height:38 }} value={tp}
                  onChange={e => setTp(e.target.value)} placeholder="0.00"/>
              </div>
            </div>

            {/* Execute buttons */}
            {!canTrade && (
              <div className="op-balance-warn" style={{ marginBottom:10 }}>
                <i className="ti ti-alert-triangle"/>
                {session ? 'Insufficient balance — deposit funds to trade.' : 'Connect an account with available balance to trade.'}
              </div>
            )}
            <div className="op-exec-row" style={{ marginBottom:10 }}>
              <button className="op-exec-btn op-exec-sell" style={{ padding:'16px 6px' }} onClick={() => place('sell')} disabled={!canTrade}>
                <span className="op-exec-lbl" style={{ fontSize:12, letterSpacing:2 }}>SELL</span>
                <span className="op-exec-px mono">{bid}</span>
              </button>
              <button className="op-exec-btn op-exec-buy" style={{ padding:'16px 6px' }} onClick={() => place('buy')} disabled={!canTrade}>
                <span className="op-exec-lbl" style={{ fontSize:12, letterSpacing:2 }}>BUY</span>
                <span className="op-exec-px mono">{ask}</span>
              </button>
            </div>

            <div className="op-info">
              <span>Margin: <span className="mono text-gold">${(+lots*inst.price*0.02).toFixed(2)}</span></span>
              <span>1pt = <span className="mono">${(+lots*10).toFixed(2)}</span></span>
            </div>
          </div>
        )}

        {tab === 'positions' && (
          <div className="mob-pos-list">
            {positions.length === 0 && (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--nt)', fontSize:13 }}>
                <i className="ti ti-inbox" style={{ fontSize:32, display:'block', marginBottom:10, opacity:.3 }}/>
                No open positions
              </div>
            )}
            {positions.length > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 4px 10px', borderBottom:'1px solid var(--br)', marginBottom:4, fontSize:12 }}>
                <span style={{ color:'var(--nt)' }}>Total Float P/L</span>
                <span className={`mono ${totalPL>=0?'up':'dn'}`} style={{ fontWeight:800 }}>{totalPL>=0?'+':''}${totalPL.toFixed(2)}</span>
              </div>
            )}
            {positions.map(pos => {
              const lp      = prices[pos.sym];
              const posInst = ALL_INSTRUMENTS.find(i => i.sym === pos.sym);
              const d       = posInst?.digits ?? 2;
              const cur     = lp ? (pos.type==='BUY' ? lp.bid : lp.ask) : pos.open;
              return (
                <div key={pos.id} className="mob-pos-card">
                  <div className="mob-pos-header">
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span className="mob-pos-sym">{pos.sym}</span>
                      <span className={`badge badge-${pos.type==='BUY'?'green':'red'}`}>{pos.type}</span>
                      <span style={{ fontSize:10, color:'var(--nt)' }}>{pos.lots} lots</span>
                      {pos.approval === 'pending' && <span className="badge" style={{ background:'rgba(226,174,74,.15)', color:'#E2AE4A' }}>Pending</span>}
                    </div>
                    <span className={`mob-pos-pl ${pos.pl>=0?'up':'dn'}`}>{pos.pl>=0?'+':''}${pos.pl.toFixed(2)}</span>
                  </div>
                  <div className="mob-pos-row"><span>Open</span><span>{pos.open.toFixed(d)}</span></div>
                  <div className="mob-pos-row"><span>Current</span><span className={pos.type==='BUY'?'up':'dn'}>{cur.toFixed(d)}</span></div>
                  {pos.sl ? <div className="mob-pos-row"><span>Stop Loss</span><span className="dn">{pos.sl.toFixed(d)}</span></div> : null}
                  {pos.tp ? <div className="mob-pos-row"><span>Take Profit</span><span className="up">{pos.tp.toFixed(d)}</span></div> : null}
                  <div className="mob-pos-row"><span>Pips</span><span className={pos.pips>=0?'up':'dn'}>{pos.pips>=0?'+':''}{pos.pips}</span></div>
                  <button className="mob-pos-close" onClick={() => onClosePos(pos.id)}>{pos.approval === 'pending' ? 'Cancel Request' : 'Close Position'}</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── MobileJournalScreen ────────────────────────────────────────────────────── */

function MobileJournalScreen({ journalLog }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--bg)' }}>
      <div style={{ padding:'12px 14px 8px', background:'var(--s)', borderBottom:'1px solid var(--br)', flexShrink:0 }}>
        <span style={{ fontSize:13, fontWeight:800, letterSpacing:'.4px', color:'var(--nt)', textTransform:'uppercase' }}>Journal</span>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'10px 14px' }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:11, lineHeight:2, color:'var(--nt)' }}>
          {journalLog.map((entry, i) => (
            <div key={i}><span style={{ color:'var(--g)' }}>[{entry.time}]</span> {entry.msg}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── MobileSettingsScreen ───────────────────────────────────────────────────── */

function MobileSettingsScreen({ session, onConnectClick, onDisconnect, userBalance, userCurrency, userName }) {
  const initials = userName
    ? userName.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : '??';
  const links = [
    { icon:'ti-user-circle', label:'Profile',  href:'/profile' },
    { icon:'ti-shield-check', label:'Verify identity', href:'/verify-identity' },
    { icon:'ti-credit-card', label:'Payments', href:'/payments' },
    { icon:'ti-cards', label:'Cards', href:'/cards' },
    { icon:'ti-settings',    label:'Settings', href:'/settings' },
    { icon:'ti-headset',     label:'Support',  href:'/support'  },
    { icon:'ti-shield-lock', label:'Legal',    href:'/legal'    },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--bg)' }}>
      <div style={{ padding:'12px 14px 8px', background:'var(--s)', borderBottom:'1px solid var(--br)', flexShrink:0 }}>
        <span style={{ fontSize:13, fontWeight:800, letterSpacing:'.4px', color:'var(--nt)', textTransform:'uppercase' }}>Settings</span>
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        {/* Account card */}
        <div style={{ margin:'14px', background:'var(--s)', border:'1px solid var(--br)', borderRadius:12, padding:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,var(--g),#C99331)', color:'#000', fontSize:13, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>{initials}</div>
            <div>
              <div style={{ fontSize:15, fontWeight:800 }}>{userName || 'Guest'}</div>
              <div style={{ fontSize:11, color:'var(--g)' }}>Pro · Verified</div>
            </div>
          </div>
          {session ? (
            <div style={{ background:'var(--s2)', borderRadius:8, padding:'10px 12px', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <div style={{ width:24, height:24, borderRadius:6, background:session.broker.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color:'#000' }}>{session.broker.logo}</div>
                <span style={{ fontSize:12, fontWeight:700 }}>{session.broker.name}</span>
                <span className={session.accType==='live'?'up':'text-muted'} style={{ fontSize:9, fontWeight:800, marginLeft:'auto' }}>{session.accType.toUpperCase()}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, fontSize:11 }}>
                <div style={{ color:'var(--nt)' }}>Balance</div><div className="mono text-gold">{userCurrency} {userBalance.toFixed(2)}</div>
              </div>
            </div>
          ) : null}
          {session
            ? <button className="btn-disconnect" style={{ width:'100%', justifyContent:'center', padding:'9px' }} onClick={onDisconnect}><i className="ti ti-plug-x"/> Disconnect Account</button>
            : <button className="btn-connect" style={{ width:'100%', justifyContent:'center', padding:'10px', fontSize:13 }} onClick={onConnectClick}><i className="ti ti-plug"/> Connect Account</button>
          }
        </div>
        {/* Nav links */}
        <div style={{ margin:'0 14px', background:'var(--s)', border:'1px solid var(--br)', borderRadius:12, overflow:'hidden' }}>
          {links.map(({ icon, label, href }, idx) => (
            <a key={label} href={href}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', color:'var(--nt)', borderBottom: idx<links.length-1?'1px solid var(--br)':'none', transition:'background .1s' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.03)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <i className={`ti ${icon}`} style={{ fontSize:19 }}/>
              <span style={{ fontSize:14, fontWeight:600 }}>{label}</span>
              <i className="ti ti-chevron-right" style={{ marginLeft:'auto', fontSize:14, opacity:.4 }}/>
            </a>
          ))}
        </div>
        <div style={{ padding:'20px 14px', fontSize:10, color:'var(--nt)', textAlign:'center' }}>
          ProfitGainSignal WebTerminal v2.4.1 · © 2025 ProfitGainSignal
        </div>
      </div>
    </div>
  );
}

/* ─── Terminal Page ──────────────────────────────────────────────────────────── */

export default function Terminal() {
  const [authLoading, setAuthLoading] = useState(true);
  const [session,     setSession]     = useState(null);
  const [userBalance,  setUserBalance]  = useState(0);
  const [userCurrency, setUserCurrency] = useState('USD');
  const [userId,       setUserId]       = useState(null);
  const [userName,     setUserName]     = useState('');
  const [showConnect, setShowConnect] = useState(false);
  const [selectedSym, setSelectedSym] = useState('EURUSD');
  const [tf,          setTf]          = useState('H1');
  const [chartType,   setChartType]   = useState('candle');
  const [positions,    setPositions]    = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [bottomTab,    setBottomTab]    = useState('positions');
  const [orderToast,   setOrderToast]   = useState(null);
  const [watchlist,    setWatchlist]    = useState(DEFAULT_WL);
  const [journalLog,   setJournalLog]   = useState([
    { time: new Date().toLocaleTimeString(), msg: 'ProfitGainSignal WebTerminal started', col: T.g },
    { time: new Date().toLocaleTimeString(), msg: 'Market data feed connected · 700ms tick interval', col: T.g },
  ]);
  const [mobView, setMobView] = useState('chart');
  const [tabOrderOpen, setTabOrderOpen] = useState(false);

  /* ── Auth + user data (same pattern as CopyTrading / Insights pages) ── */
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: authSession } }) => {
      if (authSession) {
        const uid = authSession.user.id;
        setUserId(uid);

        const [{ data: profile }, { data: wallet }, { data: openRows }, { data: closedRows }] = await Promise.all([
          supabase.from('users').select('currency, first_name, last_name').eq('id', uid).single(),
          supabase.from('wallets').select('balance, currency').eq('user_id', uid).maybeSingle(),
          supabase.from('open_positions').select('*').eq('user_id', uid).eq('status', 'open'),
          supabase.from('open_positions').select('*').eq('user_id', uid).eq('status', 'closed').order('closed_at', { ascending: false }).limit(200),
        ]);

        setUserCurrency(wallet?.currency || profile?.currency || 'USD');
        setUserBalance(parseFloat(wallet?.balance ?? 0) || 0);
        setUserName(profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '');

        if (openRows && openRows.length > 0) {
          setPositions(openRows.map(r => ({
            id:     r.id,
            sym:    r.symbol,
            type:   r.trade_type,
            lots:   parseFloat(r.lots),
            open:   parseFloat(r.open_price),
            sl:     r.stop_loss ? parseFloat(r.stop_loss) : null,
            tp:     r.take_profit ? parseFloat(r.take_profit) : null,
            pl:     parseFloat(r.profit_loss),
            pips:   parseFloat(r.pips),
            approval: r.approval_status || 'approved',   // 'pending' until an admin approves the trade
          })));
        }

        if (closedRows && closedRows.length > 0) {
          setTradeHistory(closedRows.map(r => ({
            id:         r.id,
            sym:        r.symbol,
            type:       r.trade_type,
            lots:       parseFloat(r.lots),
            open:       parseFloat(r.open_price),
            close:      r.close_price != null ? parseFloat(r.close_price) : parseFloat(r.open_price),
            sl:         r.stop_loss ? parseFloat(r.stop_loss) : null,
            tp:         r.take_profit ? parseFloat(r.take_profit) : null,
            pl:         parseFloat(r.profit_loss) || 0,
            pips:       parseFloat(r.pips) || 0,
            closedAt:   r.closed_at || r.updated_at || r.created_at,
            openedAt:   r.opened_at,
          })));
        }
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, authSession) => {
      if (!authSession) {
        setUserId(null);
        setUserName('');
        setUserBalance(0);
        setUserCurrency('USD');
        setPositions([]);
        setTradeHistory([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  /* ── Responsive: JS-driven mobile detection (≤768px) ── */
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', check);
    check();
    return () => window.removeEventListener('resize', check);
  }, []);

  const prices = useLivePrices();

  /* ── Live P&L updater ── */
  useEffect(() => {
    if (!positions.length) return;
    setPositions(prev => prev.map(pos => {
      const inst = ALL_INSTRUMENTS.find(i => i.sym === pos.sym);
      const lp   = prices[pos.sym];
      if (!lp || !inst) return pos;
      const curPrice = pos.type === 'BUY' ? lp.bid : lp.ask;
      const pipDiff  = pos.type === 'BUY' ? curPrice - pos.open : pos.open - curPrice;
      const pips     = +(pipDiff / inst.pip).toFixed(1);
      const pl       = +(pips * inst.pip * pos.lots * 100000 / curPrice).toFixed(2);
      return { ...pos, pl, pips, currentPrice: curPrice };
    }));
  }, [prices]); // eslint-disable-line

  const addJournal = msg => setJournalLog(prev => [{ time: new Date().toLocaleTimeString(), msg, col: T.g }, ...prev].slice(0, 50));

  const handleAddSymbol    = useCallback(sym => setWatchlist(prev => prev.includes(sym) ? prev : [...prev, sym]), []);
  const handleRemoveSymbol = useCallback(sym => setWatchlist(prev => prev.filter(s => s !== sym)), []);

  const handlePlaceOrder = useCallback(async order => {
    // Guard: can't open a position with no funds. Without this, a user with
    // an empty (or not-yet-loaded) balance could place trades that have no
    // real capital behind them.
    if (!(userBalance > 0)) {
      const msg = session
        ? 'Insufficient balance — deposit funds to place a trade.'
        : 'Connect an account with available balance to trade.';
      setOrderToast(msg);
      addJournal(msg);
      setTimeout(() => setOrderToast(null), 2500);
      return;
    }

    const inst = ALL_INSTRUMENTS.find(i => i.sym === order.sym);

    // Rough margin check (matches the 2% margin estimate shown in the order
    // panel) so a trade can't be opened for more than the account can cover.
    const requiredMargin = order.lots * (inst?.price || order.open) * 0.02;
    if (requiredMargin > userBalance) {
      const msg = `Insufficient balance for ${order.lots} lots ${order.sym} — reduce volume or deposit more funds.`;
      setOrderToast(msg);
      addJournal(msg);
      setTimeout(() => setOrderToast(null), 2500);
      return;
    }

    const msg = `${order.type} ${order.lots} lots ${order.sym} @ ${order.open.toFixed(inst?.digits||2)}`;

    if (userId) {
      const { data: row, error } = await supabase.from('open_positions').insert({
        user_id:       userId,
        symbol:        order.sym,
        trade_type:    order.type,
        lots:          order.lots,
        open_price:    order.open,
        current_price: order.open,
        stop_loss:     order.sl || null,
        take_profit:   order.tp || null,
        profit_loss:   0,
        pips:          0,
        status:        'open',
        order_type:    'market',
      }).select().single();
      if (!error && row) {
        setPositions(prev => [{ id: row.id, sym: row.symbol, type: row.trade_type, lots: parseFloat(row.lots), open: parseFloat(row.open_price), sl: row.stop_loss ? parseFloat(row.stop_loss) : null, tp: row.take_profit ? parseFloat(row.take_profit) : null, pl: 0, pips: 0, approval: row.approval_status || 'approved' }, ...prev]);
        if (row.approval_status === 'pending') {
          addJournal(`Position #${row.id} sent for approval — it goes live once an admin approves it`);
        }
      }
    } else {
      setPositions(prev => [{ id: Date.now(), sym: order.sym, type: order.type, lots: order.lots, open: order.open, sl: order.sl, tp: order.tp, pl: 0, pips: 0 }, ...prev]);
    }
    setOrderToast(msg);
    addJournal(msg);
    setTimeout(() => setOrderToast(null), 2500);
  }, [userId, userBalance, session]);

  const handleClosePosition = useCallback(async id => {
    const pos = positions.find(p => p.id === id);
    if (!pos) return;

    // Not approved yet: closing just withdraws the request — no P&L, no wallet change
    if (pos.approval === 'pending') {
      setPositions(prev => prev.filter(p => p.id !== id));
      addJournal(`Cancelled pending position #${id} ${pos.sym}`);
      if (userId) {
        const { error: cancelErr } = await supabase.from('open_positions')
          .update({ status: 'cancelled', closed_at: new Date().toISOString() }).eq('id', id);
        if (cancelErr) console.error('Failed to cancel pending position:', cancelErr);
      }
      return;
    }

    const closePrice = pos.currentPrice || pos.open;
    const closedAt = new Date().toISOString();
    const realizedPL = Number(pos.pl) || 0;

    addJournal(`Closed position #${id} ${pos.sym} · P/L: ${realizedPL>=0?'+':''}$${realizedPL.toFixed(2)}`);
    setPositions(prev => prev.filter(p => p.id !== id));

    // Immediately surface in History (optimistic)
    const historyEntry = {
      id: pos.id,
      sym: pos.sym,
      type: pos.type,
      lots: pos.lots,
      open: pos.open,
      close: closePrice,
      sl: pos.sl,
      tp: pos.tp,
      pl: realizedPL,
      pips: pos.pips,
      closedAt,
      openedAt: null,
    };
    setTradeHistory(prev => [historyEntry, ...prev]);

    // Always apply realized P&L to local balance immediately (profit adds, loss deducts)
    setUserBalance(prev => +(prev + realizedPL).toFixed(2));

    if (userId) {
      // Mark position as closed in DB
      const { error: closeErr } = await supabase.from('open_positions').update({
        status:      'closed',
        closed_at:   closedAt,
        close_price: closePrice,
        profit_loss: realizedPL,
        pips:        pos.pips,
      }).eq('id', id);
      if (closeErr) {
        console.error('Failed to close position in DB:', closeErr);
      }

      // Persist P&L to wallet: read latest balance, add realized P&L, write back
      try {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', userId)
          .eq('currency', userCurrency)
          .maybeSingle();
        const currentBal = parseFloat(wallet?.balance ?? userBalance) || 0;
        const newBal = +(currentBal + realizedPL).toFixed(2);
        const { error: walletErr } = await supabase
          .from('wallets')
          .upsert(
            { user_id: userId, currency: userCurrency, balance: newBal },
            { onConflict: 'user_id,currency' }
          );
        if (walletErr) {
          console.error('Failed to update wallet balance:', walletErr);
          // local balance already updated optimistically; leave it so UI stays consistent
        } else {
          // Re-sync local state to the authoritative DB value
          setUserBalance(newBal);
        }
      } catch (err) {
        console.error('Wallet update error:', err);
      }
    }
  }, [positions, userId, userBalance, userCurrency]);

  const handleConnected = useCallback(sess => {
    setSession(sess);
    setPositions([]);
    addJournal(`Connected to ${sess.broker.name} · ${sess.server.name} [${sess.accType.toUpperCase()}]`);
  }, []);

  const MOB_NAV = [
    { id:'symbols', label:'Markets' },
    { id:'chart',   label:'Chart'   },
    { id:'trade',   label:'Trade'   },
    { id:'history', label:'History' },
    { id:'journal', label:'Journal' },
  ];

  if (authLoading) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: CSS }}/>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100dvh', background: T.bg, color: T.nt, fontSize: 13,
        }}>
          Loading…
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }}/>

      <div style={{ display:'flex', flexDirection:'column', height:'100dvh', overflow:'hidden', minHeight:0 }} className={isMobile ? 'is-mobile' : ''}>
        <AppNav
          onMenuToggle={() => setSidebarOpen(v => !v)}
          session={session} userBalance={userBalance} userCurrency={userCurrency} userName={userName}
          onConnectClick={() => setShowConnect(true)}
          onDisconnect={() => { setSession(null); setPositions([]); addJournal('Account disconnected'); }}
        />

        <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} userName={userName} session={session}/>

        {orderToast && (
          <div className="order-toast"><i className="ti ti-check"/> {orderToast}</div>
        )}

        {showConnect && (
          <ConnectModal onClose={() => setShowConnect(false)} onConnected={handleConnected} userBalance={userBalance} userCurrency={userCurrency}/>
        )}

        {/* ── DESKTOP terminal shell ── */}
        <div className="term-shell" style={{ flex:1, overflow:'hidden' }}>
          <div className="term-left">
            <Watchlist
              prices={prices} selected={selectedSym} onSelect={setSelectedSym}
              watchlist={watchlist} onAddSymbol={handleAddSymbol} onRemoveSymbol={handleRemoveSymbol}
              session={session} userBalance={userBalance} userCurrency={userCurrency}
            />
          </div>
          <div className="term-center">
            <BalanceBar userBalance={userBalance} userCurrency={userCurrency} positions={positions} prices={prices}/>
            <Toolbar
              tf={tf} onTf={setTf} sym={selectedSym} prices={prices}
              chartType={chartType} onChartType={setChartType}
            />
            <div className="chart-area">
              {!isMobile && (
                <ChartErrorBoundary sym={selectedSym} tf={tf} chartType={chartType}>
                  <TradingViewWidget sym={selectedSym} tf={tf} chartType={chartType}/>
                </ChartErrorBoundary>
              )}
            </div>
            <div className="term-bottom">
              <div className="bp-tabs">
                {[
                  { key:'positions', icon:'ti-list',    label:`Positions (${positions.length})` },
                  { key:'orders',    icon:'ti-clock',   label:'Pending (0)'                     },
                  { key:'history',   icon:'ti-history', label:`History (${tradeHistory.length})` },
                  { key:'journal',   icon:'ti-terminal',label:'Journal'                          },
                ].map(({ key, icon, label }) => (
                  <button key={key} className={`bp-tab${bottomTab===key?' active':''}`} onClick={() => setBottomTab(key)}>
                    <i className={`ti ${icon}`}/>{label}
                  </button>
                ))}
              </div>
              <div className="bp-content">
                {bottomTab==='positions' && <Positions positions={positions} prices={prices} onClose={handleClosePosition}/>}
                {bottomTab==='orders'    && <div style={{ padding:'18px', color:'var(--nt)', fontSize:13, textAlign:'center' }}>No pending orders</div>}
                {bottomTab==='history'   && <TradeHistory history={tradeHistory}/>}
                {bottomTab==='journal'   && (
                  <div className="journal">
                    {journalLog.map((entry, i) => (
                      <div key={i}><span className="journal-time">[{entry.time}]</span> {entry.msg}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className={`term-right${tabOrderOpen?' tab-open':''}`}>
            <OrderPanel sym={selectedSym} prices={prices} onPlace={handlePlaceOrder} userBalance={userBalance} session={session}/>
          </div>
        </div>

        {/* ── TABLET TRADE FAB ── */}
        <button className="tab-trade-fab" onClick={() => setTabOrderOpen(o => !o)} title="Trade">
          <i className={`ti ${tabOrderOpen ? 'ti-x' : 'ti-trending-up'}`}/>
        </button>
        {tabOrderOpen && <div className="sidebar-backdrop open" onClick={() => setTabOrderOpen(false)}/>}

        {/* ── MOBILE BALANCE BAR ── */}
        <div className="mob-bal-bar">
          <div className="mob-bal-item">
            <span className="mob-bal-lbl">Balance</span>
            <span className="mob-bal-val gold">{userCurrency} {userBalance.toFixed(2)}</span>
          </div>
          <div className="mob-bal-divider"/>
          <div className="mob-bal-item">
            <span className="mob-bal-lbl">Equity</span>
            {(() => { const eq = userBalance + positions.reduce((s,p)=>s+(p.pl||0),0); return <span className={`mob-bal-val ${eq>=userBalance?'up':'dn'}`}>{userCurrency} {eq.toFixed(2)}</span>; })()}
          </div>
          <div className="mob-bal-divider"/>
          <div className="mob-bal-item">
            <span className="mob-bal-lbl">P&amp;L</span>
            {(() => { const pl = positions.reduce((s,p)=>s+(p.pl||0),0); return <span className={`mob-bal-val ${pl>=0?'up':'dn'}`}>{pl>=0?'+':''}{pl.toFixed(2)}</span>; })()}
          </div>
        </div>

        {/* ── MOBILE PANES WRAPPER ── */}
        <div className="mob-panes-wrapper">
        <div className={`mob-pane${mobView==='symbols'?'':' hidden'}`}>
          <MobileSymbolScreen
            prices={prices} watchlist={watchlist}
            selectedSym={selectedSym}
            onSelect={sym => { setSelectedSym(sym); setMobView('chart'); }}
            onAddSymbol={handleAddSymbol}
          />
        </div>
        <div className={`mob-pane${mobView==='chart'?'':' hidden'}`}>
          {isMobile && (
            <MobileChartPane
              sym={selectedSym} tf={tf} onTf={setTf} prices={prices}
              chartType={chartType} onChartType={setChartType}
            />
          )}
        </div>
        <div className={`mob-pane${mobView==='trade'?'':' hidden'}`}>
          <MobileTradeScreen
            sym={selectedSym} prices={prices}
            positions={positions} onPlace={handlePlaceOrder} onClosePos={handleClosePosition}
            userBalance={userBalance} session={session}
          />
        </div>
        <div className={`mob-pane${mobView==='journal'?'':' hidden'}`}>
          <MobileJournalScreen journalLog={journalLog}/>
        </div>
        <div className={`mob-pane${mobView==='history'?'':' hidden'}`}>
          <MobileTradeHistory history={tradeHistory}/>
        </div>
        <div className={`mob-pane${mobView==='settings'?'':' hidden'}`}>
          <MobileSettingsScreen
            session={session}
            userBalance={userBalance} userCurrency={userCurrency} userName={userName}
            onConnectClick={() => setShowConnect(true)}
            onDisconnect={() => { setSession(null); setPositions([]); addJournal('Account disconnected'); }}
          />
        </div>

        </div>{/* end mob-panes-wrapper */}

        {/* ── MOBILE BOTTOM NAV ── */}
        <nav className="mob-bottom-nav">
          {MOB_NAV.map(({ id, label }) => {
            const totalPL = positions.reduce((s,p) => s+(p.pl||0), 0);
            const plUp    = totalPL >= 0;
            return (
              <button key={id} className={`mob-nav-btn${mobView===id?' active':''}`} onClick={() => setMobView(id)}>
                <div className="mob-nav-btn-inner">
                  <LI d={MOB_NAV_ICONS[id]} size={22}/>
                  {id==='trade' && positions.length > 0
                    ? <span className={`mob-nav-lbl ${plUp?'up':'dn'}`}>{plUp?'+':''}{totalPL.toFixed(0)}</span>
                    : <span className="mob-nav-lbl">{label}</span>
                  }
                </div>
                {id==='trade' && positions.length > 0 && (
                  <span className="mob-nav-badge">{positions.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer — desktop only */}
        <footer className="term-footer">
          <div style={{ display:'flex', alignItems:'center', gap:0 }}>
            <span className="tf-logo">ProfitGainSignal</span>
            <span className="tf-sep">·</span>
            <span>WebTerminal v2.4.1</span>
            <span className="tf-sep">·</span>
            <span>Market data is simulated for demonstration purposes</span>
          </div>
          <div className="tf-right">
            <a href="/legal">Legal</a>
            <a href="/privacy">Privacy</a>
            <a href="/support">Support</a>
            <span className="tf-sep">·</span>
            <span>© 2026 ProfitGainSignal</span>
          </div>
        </footer>
      </div>
    </>
  );
}


/* ── Brand wordmark (replaces logo.png) ── */
function BrandMark({ size = 26 }) {
  return (
    <>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap');"}</style>
      <span aria-label="ProfitGainSignal" style={{ display:'inline-block', fontFamily:"'Instrument Serif', Georgia, serif", fontWeight:400, fontSize:size, lineHeight:1, letterSpacing:'-.01em', color:'#EEF2F7', whiteSpace:'nowrap' }}>
        Profit<span style={{ color:'#E2AE4A' }}>Gain</span>Signal
      </span>
    </>
  );
}
