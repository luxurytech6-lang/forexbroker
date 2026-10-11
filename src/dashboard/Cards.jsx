/**
 * Cards.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Cards — Route: /cards
 * Order a virtual or physical debit card, track delivery, and manage cards
 * (freeze, online / contactless controls, monthly limit, report lost).
 *
 * Data (see cards_schema.sql):
 *   cards               issued cards (last 4 digits only; never the full number)
 *   card_orders         orders and their delivery status
 *   card_transactions   card payments, written by the issuer integration
 *   order_card()        RPC: checks the wallet, charges the fee, records the order
 *   set_card_controls() RPC: freeze / online / contactless / monthly limit
 *   report_card_lost()  RPC: blocks a card for good
 *
 * The page never sees or stores a full card number or CVV. Those stay with the
 * card issuer; this app only keeps the last four digits for display.
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  CreditCard, Snowflake, Truck, PackageCheck, Globe, Nfc, ShieldCheck, MapPin,
  CheckCircle2, Info, X, Gem, Receipt, Clock, ChevronRight, Wallet, Smartphone, Lock, Sparkles,
} from "lucide-react";
import {
  LayoutDashboard as DkDashboard, LineChart as DkLine, Copy as DkCopy, Users as DkUsers,
  Building2 as DkBuilding, Pickaxe as DkPickaxe, CandlestickChart as DkCandle, Bot as DkBot, TrendingUp as DkTrend,
  CreditCard as DkCard, UserCircle as DkUser, Settings as DkSettings, Headset as DkHeadset,
  LogOut as DkLogout, Bell as DkBell, RefreshCw as DkRefresh, WalletCards as DkCards,
} from "lucide-react";
import supabase from "../supabase";

/* ─── Page layout + visual system ─────────────────────────────────────────── */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap');
:root {
  --bg:#07101E; --surface:#0C1A2E; --surface2:#112238; --border:#1C2C45; --border2:#2A3D5C;
  --text:#EEF2F7; --muted:#8A9AB2; --faint:#56677F;
  --accent:#E2AE4A; --accent-dim:rgba(226,174,74,.14); --accent-glow:rgba(226,174,74,.07);
  --green:#2FD394; --green-dim:rgba(47,211,148,.12); --red:#FF6470; --red-dim:rgba(255,100,112,.12);
  --blue:#5B8CFF; --blue-dim:rgba(91,140,255,.14);
  --sidebar-w:264px; --topbar-h:64px;
}
:root[data-theme="light"] {
  --bg:#EEF2F7; --surface:#FFFFFF; --surface2:#F4F7FB; --border:#D5DDE8; --border2:#B7C3D3;
  --text:#0B1628; --muted:#4A5970; --faint:#8090A6; --green:#0F8F5F; --green-dim:rgba(15,143,95,.1); --red:#C8373F; --red-dim:rgba(200,55,63,.1);
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: var(--bg); color: var(--text); font-family: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.55; -webkit-font-smoothing: antialiased; }
a { color: inherit; text-decoration: none; }
button { font-family: inherit; color: inherit; }
.num { font-variant-numeric: tabular-nums; }

.cd-shell { display: grid; grid-template-columns: var(--sidebar-w) minmax(0,1fr); min-height: 100vh; }
.cd-sidebar { position: sticky; top: 0; z-index: 200; }
.cd-right { min-width: 0; display: flex; flex-direction: column; }
.cd-topbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; padding: 0 28px; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.cd-hamburger { display: none; flex-direction: column; gap: 4px; padding: 8px; cursor: pointer; }
.cd-hamburger span { width: 20px; height: 2px; border-radius: 1px; background: var(--text); }
.cd-backdrop { display: none; }
.cd-main { padding: 28px 28px 64px; max-width: 1400px; width: 100%; margin: 0 auto; }

.cd-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; margin-bottom: 24px; }
.cd-page-title { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: clamp(34px,3.6vw,48px); line-height: 1.02; letter-spacing: -.01em; }
.cd-page-sub { font-size: 15.5px; color: var(--muted); margin-top: 8px; max-width: 40em; }
.cd-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 42px; padding: 0 18px; border-radius: 10px; font-size: 14.5px; font-weight: 600; border: 1px solid transparent; cursor: pointer; white-space: nowrap; transition: filter .15s, background .15s, border-color .15s, color .15s; }
.cd-btn svg { width: 16px; height: 16px; }
.cd-btn-sm { height: 36px; padding: 0 14px; font-size: 13.5px; }
.cd-btn-accent { background: var(--accent); color: #07101E; }
.cd-btn-accent:hover:not(:disabled) { filter: brightness(1.07); }
.cd-btn:disabled { opacity: .45; cursor: not-allowed; }
.cd-btn-ghost { background: transparent; border-color: var(--border2); color: var(--text); }
.cd-btn-ghost:hover:not(:disabled) { background: var(--surface2); }
.cd-btn-danger { background: transparent; border-color: rgba(255,100,112,.4); color: var(--red); }
.cd-btn-danger:hover:not(:disabled) { background: var(--red-dim); }

.cd-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; box-shadow: 0 24px 48px -36px rgba(0,0,0,.6); }
.cd-section-h { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 4px 12px; margin: 36px 0 14px; }
.cd-section-h h2 { font-size: 20px; font-weight: 600; }
.cd-section-h span { font-size: 14px; color: var(--muted); }
.cd-note { display: flex; gap: 10px; align-items: flex-start; padding: 12px 16px; border-radius: 12px; background: var(--accent-glow); border: 1px solid var(--accent-dim); font-size: 14px; color: var(--muted); margin-bottom: 20px; }
.cd-note svg { color: var(--accent); flex-shrink: 0; margin-top: 2px; }
.cd-note strong { color: var(--text); }

/* ── Card artwork ── */
.plastic {
  width: 340px; aspect-ratio: 1.586; border-radius: 4.8% / 7.6%; container-type: inline-size;
  position: relative; overflow: hidden; color: #EEF2F7; flex-shrink: 0;
  box-shadow: 0 1px 0 rgba(255,255,255,.18) inset, 0 30px 50px -28px rgba(0,0,0,.85);
  font-family: 'Instrument Sans', system-ui, sans-serif; user-select: none;
}
.plastic::before { content: ''; position: absolute; inset: 0; background: radial-gradient(120% 90% at 0% 0%, rgba(255,255,255,.16), transparent 55%); pointer-events: none; }
.plastic::after { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(115deg, rgba(255,255,255,.025) 0 2px, transparent 2px 6px); pointer-events: none; }
.plastic.d-midnight { background: linear-gradient(135deg, #14294B 0%, #07101E 70%); }
.plastic.d-graphite { background: linear-gradient(135deg, #3A4352 0%, #161B24 75%); }
.plastic.d-gold { background: linear-gradient(135deg, #F3D48A 0%, #D9A441 45%, #9C6B1B 100%); color: #1D1405; }
.plastic.d-black { background: linear-gradient(135deg, #2A2A2F 0%, #050506 70%); }
.plastic.d-virtual { background: linear-gradient(135deg, #3D6FE0 0%, #1C2F7A 55%, #0B1530 100%); }
.plastic.frozen { filter: saturate(.35) brightness(.8); }
.plastic .pl-in { position: absolute; inset: 0; z-index: 1; padding: 6.2cqw; display: flex; flex-direction: column; justify-content: space-between; }
.plastic .pl-top { display: flex; justify-content: space-between; align-items: flex-start; }
.plastic .pl-brand { font-family: 'Instrument Serif', Georgia, serif; font-size: 4.6cqw; line-height: 1; letter-spacing: .01em; }
.plastic .pl-tier { font-size: 3.3cqw; font-weight: 700; letter-spacing: .14em; opacity: .85; }
.plastic .pl-mid { display: flex; align-items: center; gap: 4cqw; }
.plastic .pl-mid svg:first-child { width: 15cqw; height: auto; }
.plastic .pl-mid svg:last-child { width: 6.5cqw; height: auto; opacity: .8; }
.plastic .pl-num { font-size: 5.8cqw; letter-spacing: .12em; font-variant-numeric: tabular-nums; font-weight: 500; white-space: nowrap; }
.plastic .pl-bot { display: flex; justify-content: space-between; align-items: flex-end; gap: 3cqw; }
.plastic .pl-name { font-size: 3.8cqw; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.plastic .pl-small { font-size: 2.8cqw; opacity: .7; letter-spacing: .06em; }
.plastic .pl-exp { font-size: 3.8cqw; font-weight: 600; font-variant-numeric: tabular-nums; }
.plastic .pl-mark { font-size: 3.6cqw; font-weight: 800; letter-spacing: .16em; opacity: .9; }
.plastic .pl-stamp { position: absolute; z-index: 2; inset: 0; display: flex; align-items: center; justify-content: center; gap: 2.4cqw; background: rgba(7,16,30,.45); font-size: max(11px, 5cqw); font-weight: 700; letter-spacing: .04em; color: #EEF2F7; }
.plastic .pl-stamp svg { width: max(12px, 5.4cqw); height: auto; }

/* ── My cards ── */
.cd-wallet { display: grid; grid-template-columns: minmax(0,1fr) 380px; gap: 20px; align-items: start; }
.cd-stage { padding: 28px; display: flex; flex-direction: column; gap: 22px; min-width: 0; }
.cd-tilt { perspective: 1200px; display: flex; justify-content: center; }
.cd-tilt .plastic { width: min(420px, 100%); transition: transform .45s cubic-bezier(.22,1,.36,1); }
.cd-picker { display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px 6px; scrollbar-width: thin; }
.cd-pick { background: none; border: 2px solid transparent; border-radius: 12px; padding: 2px; cursor: pointer; transition: border-color .15s, opacity .15s; opacity: .7; }
.cd-pick:hover { opacity: 1; }
.cd-pick[aria-pressed="true"] { border-color: var(--accent); opacity: 1; }
.cd-pick .plastic { width: 116px; box-shadow: none; }
.cd-pick .plastic .pl-name, .cd-pick .plastic .pl-small, .cd-pick .plastic .pl-exp { display: none; }

.cd-panel { padding: 22px; display: flex; flex-direction: column; gap: 18px; }
.cd-panel-h { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.cd-panel-name { font-size: 18px; font-weight: 600; }
.cd-badge { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border-radius: 999px; font-size: 12.5px; font-weight: 700; text-transform: capitalize; }
.cd-badge i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.cd-badge.active { background: var(--green-dim); color: var(--green); }
.cd-badge.frozen { background: var(--blue-dim); color: var(--blue); }
.cd-badge.blocked, .cd-badge.cancelled { background: var(--red-dim); color: var(--red); }
.cd-badge.pending, .cd-badge.processing, .cd-badge.shipped { background: var(--accent-dim); color: var(--accent); }
.cd-badge.delivered { background: var(--green-dim); color: var(--green); }
.cd-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.cd-meta div { background: var(--surface); padding: 11px 14px; }
.cd-meta span { display: block; font-size: 12.5px; color: var(--muted); }
.cd-meta strong { font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
.cd-toggle-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
.cd-toggle-row:last-child { border-bottom: none; }
.cd-toggle-row > svg { width: 18px; height: 18px; color: var(--muted); flex-shrink: 0; }
.cd-toggle-row div { flex: 1; min-width: 0; }
.cd-toggle-row strong { display: block; font-size: 14.5px; font-weight: 600; }
.cd-toggle-row span { font-size: 13px; color: var(--muted); }
.cd-switch { position: relative; width: 44px; height: 26px; border-radius: 999px; border: none; background: var(--border2); cursor: pointer; flex-shrink: 0; transition: background .2s; }
.cd-switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform .2s cubic-bezier(.22,1,.36,1); }
.cd-switch[aria-checked="true"] { background: var(--green); }
.cd-switch[aria-checked="true"]::after { transform: translateX(18px); }
.cd-switch:disabled { opacity: .45; cursor: not-allowed; }
.cd-limit { display: flex; gap: 8px; }
.cd-input { flex: 1; min-width: 0; height: 40px; padding: 0 12px; border-radius: 10px; background: var(--surface2); border: 1px solid var(--border); color: var(--text); font: inherit; font-size: 15px; font-variant-numeric: tabular-nums; outline: none; }
.cd-input:focus { border-color: var(--accent); }
.cd-msg { font-size: 13.5px; }
.cd-msg.err { color: var(--red); }
.cd-msg.ok { color: var(--green); }
.cd-sum { grid-template-columns: repeat(4,minmax(0,1fr)); border-radius: 16px; margin-bottom: 20px; }
.cd-sum div { padding: 16px 18px; }
.cd-sum strong { font-size: 22px; }
.cd-intro { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); align-items: center; gap: 24px; padding: 28px; }
.cd-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.cd-actions .cd-btn { flex: 1; }

.cd-empty { padding: 40px 20px; text-align: center; color: var(--muted); display: flex; flex-direction: column; align-items: center; gap: 10px; }
.cd-empty strong { color: var(--text); font-size: 16px; }

/* ── Products ── */
.cd-products { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 16px; }
.cd-product { display: flex; flex-direction: column; gap: 14px; padding: 18px; text-align: left; cursor: pointer; font: inherit; color: inherit; transition: border-color .2s, transform .2s; }
.cd-product:hover { border-color: var(--border2); transform: translateY(-3px); }
.cd-product .plastic { width: 100%; box-shadow: 0 20px 30px -24px rgba(0,0,0,.8); }
.cd-product-name { font-size: 17px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.cd-product-price { font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; }
.cd-product-price small { font-size: 13px; font-weight: 500; color: var(--muted); }
.cd-feat { display: flex; flex-direction: column; gap: 7px; font-size: 13.5px; color: var(--muted); }
.cd-feat li { display: flex; gap: 8px; align-items: flex-start; list-style: none; }
.cd-feat svg { width: 15px; height: 15px; color: var(--green); flex-shrink: 0; margin-top: 3px; }
.cd-tag { align-self: flex-start; font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: var(--accent-dim); color: var(--accent); }

/* ── Orders + transactions ── */
.cd-two { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 20px; }
.cd-order { padding: 18px 20px; border-bottom: 1px solid var(--border); }
.cd-order:last-child { border-bottom: none; }
.cd-order-top { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; }
.cd-order-name { font-weight: 600; }
.cd-order-sub { font-size: 13px; color: var(--muted); }
.cd-track { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; }
.cd-track div { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--faint); }
.cd-track div::before { content: ''; height: 4px; border-radius: 2px; background: var(--surface2); }
.cd-track div.on { color: var(--text); }
.cd-track div.on::before { background: var(--accent); }
.cd-tx { display: flex; align-items: center; gap: 12px; padding: 13px 20px; border-bottom: 1px solid var(--border); }
.cd-tx:last-child { border-bottom: none; }
.cd-tx-ico { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: var(--surface2); color: var(--muted); flex-shrink: 0; }
.cd-tx-ico svg { width: 17px; height: 17px; }
.cd-tx-main { flex: 1; min-width: 0; }
.cd-tx-main strong { display: block; font-size: 14.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cd-tx-main span { font-size: 13px; color: var(--muted); }
.cd-tx-amt { font-weight: 600; font-variant-numeric: tabular-nums; text-align: right; }
.cd-tx-amt span { display: block; font-size: 12.5px; font-weight: 500; color: var(--muted); }
.cd-list-h { padding: 16px 20px; border-bottom: 1px solid var(--border); font-weight: 600; display: flex; justify-content: space-between; align-items: center; }

/* ── Order drawer ── */
.cd-overlay { position: fixed; inset: 0; z-index: 600; background: rgba(3,8,16,.62); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); animation: cdFade .2s ease both; }
.cd-drawer { position: fixed; top: 0; right: 0; bottom: 0; z-index: 601; width: min(560px, 100vw); background: var(--surface); border-left: 1px solid var(--border); display: flex; flex-direction: column; box-shadow: -40px 0 80px -30px rgba(0,0,0,.7); animation: cdSlide .32s cubic-bezier(.22,1,.36,1) both; }
.cd-drawer-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 24px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.cd-drawer-head h3 { font-size: 18px; font-weight: 600; }
.cd-close { width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--border); background: none; color: var(--text); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.cd-drawer-body { flex: 1; overflow-y: auto; padding: 22px 24px 24px; display: flex; flex-direction: column; gap: 22px; }
.cd-drawer-body > * { flex-shrink: 0; }
.cd-preview { display: flex; justify-content: center; padding: 18px; border-radius: 16px; background: radial-gradient(120% 120% at 50% 0%, var(--accent-glow), transparent 70%), var(--surface2); }
.cd-preview .plastic { width: min(360px, 100%); }
.cd-steps { display: flex; gap: 6px; }
.cd-steps span { flex: 1; height: 4px; border-radius: 2px; background: var(--surface2); }
.cd-steps span.on { background: var(--accent); }
.cd-label { font-size: 14px; font-weight: 600; margin-bottom: 8px; display: block; }
.cd-hint { font-size: 13px; color: var(--muted); margin-top: 6px; }
.cd-field { display: flex; flex-direction: column; }
.cd-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cd-select-row { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 8px; }
.cd-opt { padding: 10px 8px; border-radius: 12px; border: 1.5px solid var(--border); background: var(--surface2); cursor: pointer; text-align: center; font: inherit; font-size: 13px; font-weight: 600; color: var(--text); display: flex; flex-direction: column; align-items: center; gap: 8px; }
.cd-opt[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-glow); }
.cd-swatch { width: 100%; height: 30px; border-radius: 6px; }
.cd-review { display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.cd-review div { display: flex; justify-content: space-between; gap: 12px; padding: 11px 14px; border-bottom: 1px solid var(--border); font-size: 14.5px; }
.cd-review div:last-child { border-bottom: none; font-weight: 600; background: var(--surface2); }
.cd-review span { color: var(--muted); }
.cd-review strong { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
.cd-drawer-foot { flex-shrink: 0; padding: 16px 24px calc(16px + env(safe-area-inset-bottom)); border-top: 1px solid var(--border); display: flex; gap: 10px; }
.cd-drawer-foot .cd-btn { height: 50px; font-size: 15.5px; }
.cd-drawer-foot .cd-btn-accent { flex: 1; }
.cd-success { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; padding: 20px 4px; }
.cd-success svg { color: var(--green); }
.cd-success h4 { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: 32px; line-height: 1.1; }
.cd-success p { color: var(--muted); max-width: 30em; }

.cd-modal { position: fixed; z-index: 700; left: 50%; top: 50%; transform: translate(-50%,-50%); width: min(440px, calc(100vw - 32px)); padding: 24px; display: flex; flex-direction: column; gap: 14px; animation: cdFade .2s ease both; }
.cd-modal h3 { font-size: 19px; font-weight: 600; }
.cd-modal p { color: var(--muted); font-size: 14.5px; }

@keyframes cdFade  { from { opacity: 0; } to { opacity: 1; } }
@keyframes cdSlide { from { transform: translateX(40px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes cdRise  { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.cd-main > * { animation: cdRise .55s cubic-bezier(.22,1,.36,1) both; }

@media (max-width: 1240px) {
  .cd-products { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .cd-wallet { grid-template-columns: minmax(0,1fr); }
}
@media (max-width: 960px) {
  .cd-shell { grid-template-columns: 1fr; }
  .cd-sidebar { position: fixed; inset: 0 auto 0 0; transform: translateX(-100%); transition: transform .3s cubic-bezier(.22,1,.36,1); }
  .cd-sidebar.open { transform: none; box-shadow: 30px 0 60px rgba(0,0,0,.45); }
  .cd-backdrop { display: block; position: fixed; inset: 0; z-index: 150; background: rgba(3,8,16,.55); opacity: 0; pointer-events: none; transition: opacity .25s; }
  .cd-backdrop.open { opacity: 1; pointer-events: auto; }
  .cd-hamburger { display: flex; }
  .cd-topbar { padding: 0 16px; }
  .cd-two { grid-template-columns: minmax(0,1fr); }
}
@media (max-width: 640px) {
  .cd-main { padding: 20px 16px 48px; }
  .cd-stage { padding: 18px; }
  .cd-products { grid-template-columns: 1fr; }
  .cd-sum { grid-template-columns: 1fr 1fr; }
  .cd-sum strong { font-size: 19px; }
  .cd-intro { grid-template-columns: 1fr; padding: 20px; }
  .cd-select-row { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .cd-grid2 { grid-template-columns: 1fr; }
  .cd-drawer { width: 100vw; border-left: none; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
}
`;
/* ═════════════════════════════════════════════════════════════════════════
   GLOBAL DESK SHELL — shared sidebar + topbar (matches the dashboard)
   The page keeps its own layout classes (cd-sidebar, cd-topbar) so its
   responsive off-canvas behaviour is unchanged; dk-* classes do the styling.
═════════════════════════════════════════════════════════════════════════ */
const DK_NAV = [
  { title:'Overview', links:[
    { key:'dashboard', href:'/dashboard',    Icon:DkDashboard, label:'Dashboard' },
  ]},
  { title:'Invest', links:[
    { key:'stocks',    href:'/stocks',       Icon:DkLine,      label:'Stocks' },
    { key:'copy',      href:'/copy-trading', Icon:DkCopy,      label:'Copy Trading' },
    { key:'hire',      href:'/hire-trader',  Icon:DkUsers,     label:'Hire a Trader' },
    { key:'realestate',href:'/real-estate',  Icon:DkBuilding,  label:'Real Estate', badge:'NEW' },
    { key:'mining',    href:'/mining',       Icon:DkPickaxe,   label:'Mining',      badge:'NEW' },
    { key:'terminal',  href:'/terminal',     Icon:DkCandle,    label:'Terminal' },
  ]},
  { title:'Discover', links:[
    { key:'market',    href:'/market-place', Icon:DkBot,       label:'Marketplace' },
    { key:'insights',  href:'/insights',     Icon:DkTrend,     label:'Insights' },
  ]},
  { title:'Account', links:[
    { key:'payments',  href:'/payments',     Icon:DkCard,      label:'Payments' },
    { key:'cards',     href:'/cards',        Icon:DkCards,     label:'Cards' },
    { key:'profile',   href:'/profile',      Icon:DkUser,      label:'Profile' },
    { key:'settings',  href:'/settings',     Icon:DkSettings,  label:'Settings' },
    { key:'support',   href:'/support',      Icon:DkHeadset,   label:'Support' },
  ]},
];
const DK_SYMBOLS = { USD:'$', EUR:'€', GBP:'£', JPY:'¥', AUD:'A$', CAD:'C$', CHF:'Fr', CNY:'¥', INR:'₹', NGN:'₦', ZAR:'R', KES:'KSh', GHS:'₵', BTC:'₿', ETH:'Ξ' };
const DK_ACTIVE = 'cards';
const DK_TITLE  = 'Cards';
const dkInitials = (u) => u?._initials ? u._initials : u ? ((`${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`).toUpperCase() || u.email?.[0]?.toUpperCase() || 'U') : 'U';
const dkName     = (u) => u ? ([u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || 'Account') : 'Loading…';
const dkPlan     = (u) => u?.plan ? `${u.plan} plan${u.is_verified == null ? '' : u.is_verified ? ', verified' : ', unverified'}` : '';
/* Pages pass user details in different shapes; normalise them once */
const dkUser = (p) => {
  const u = p.user && Object.keys(p.user).length ? p.user : null;
  if (u) return u;
  if (p.userName || p.userInitials || p.userPlan) {
    const [first = '', ...rest] = String(p.userName || '').split(' ');
    return { first_name:first, last_name:rest.join(' '), plan:String(p.userPlan || '').toLowerCase() || undefined, _initials:p.userInitials };
  }
  return null;
};
/* Plan: the active row in user_subscriptions (joined to subscription_plans) is the
   source of truth; users.plan is only a fallback because it can lag behind. */
const dkTier = (name) => {
  const n = String(name || '').toLowerCase();
  if (/elite|vip|enterprise|institution/.test(n)) return 2;
  if (/pro|premium|plus|gold/.test(n)) return 1;
  return 0;
};
const dkPlanLabel = (name) => {
  const n = String(name || '').replace(/\s*plan$/i, '').trim();
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
};
let dkPlanReq = null;
const dkFetchPlan = () => {
  if (!dkPlanReq) {
    dkPlanReq = (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return {};
      const uid = session.user.id;
      const [{ data: profile }, { data: sub }] = await Promise.all([
        supabase.from('users').select('first_name,last_name,email,plan,is_verified,currency').eq('id', uid).maybeSingle(),
        supabase.from('user_subscriptions').select('status, subscription_plans(name)')
          .eq('user_id', uid).eq('status', 'active').order('created_at', { ascending:false }).limit(1).maybeSingle(),
      ]);
      return { profile: profile || null, subPlan: sub?.subscription_plans?.name || null };
    })().catch(() => ({}));
  }
  return dkPlanReq;
};
function useDkUser(props) {
  const base = dkUser(props);
  const [fetched, setFetched] = useState(null);   // null = still loading
  useEffect(() => {
    let live = true;
    dkFetchPlan().then(d => { if (live) setFetched(d || {}); });
    return () => { live = false; };
  }, []);
  const planRaw = props.sub?.subscription_plans?.name
    || fetched?.subPlan
    || base?.plan
    || fetched?.profile?.plan
    || null;
  const merged = { ...(fetched?.profile || {}), ...(base || {}) };
  if (!Object.keys(merged).length && !planRaw) return null;
  return { ...merged, plan: planRaw ? dkPlanLabel(planRaw) : null, _planReady: fetched !== null || !!props.sub };
}
const dkLogout = async () => { try { await supabase.auth.signOut(); } catch (_) {} window.location.href = '/login'; };

function Sidebar(props) {
  const { open } = props;
  const user = useDkUser(props);
  const onLogout = props.onLogout || dkLogout;
  const planName = user?._planReady ? (user?.plan || 'Free') : null;
  const rank = planName ? dkTier(planName) : null;
  return (
    <aside className={`cd-sidebar dk-sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
      <div className="dk-brand"><a href="/dashboard"><BrandMark /></a></div>
      <nav className="dk-scroll">
        {DK_NAV.map(g => (
          <div key={g.title}>
            <div className="dk-section">{g.title}</div>
            {g.links.map(l => (
              <a key={l.key} href={l.href} className={`dk-link${l.key === DK_ACTIVE ? ' active' : ''}`} aria-current={l.key === DK_ACTIVE ? 'page' : undefined}>
                <l.Icon size={18} />{l.label}
                {l.badge && <span className="dk-badge">{l.badge}</span>}
              </a>
            ))}
          </div>
        ))}
        <button type="button" className="dk-link dk-logout" onClick={onLogout}><DkLogout size={18} />Log out</button>
      </nav>
      {planName && (rank < 2 ? (
        <a href="/payments" className="dk-plan">
          <span className="dk-plan-tag">{planName} plan</span>
          <span className="dk-plan-t">{rank === 0 ? 'Upgrade to Pro' : 'Upgrade to Elite'}</span>
          <span className="dk-plan-s">{rank === 0 ? 'Unlock copy trading and hiring' : 'Priority support and every tool'}</span>
        </a>
      ) : (
        <div className="dk-plan">
          <span className="dk-plan-tag">{planName} plan</span>
          <span className="dk-plan-t">You're on the top tier</span>
          <span className="dk-plan-s">Every tool and priority support</span>
        </div>
      ))}
      <div className="dk-user">
        <div className="dk-avatar">{dkInitials(user)}</div>
        <div style={{ minWidth:0 }}>
          <div className="dk-user-name">{dkName(user)}</div>
          <div className="dk-user-role">{dkPlan(user)}</div>
        </div>
      </div>
    </aside>
  );
}

function Topbar(props) {
  const { onMenu, onRefresh, refreshing } = props;
  const user = useDkUser(props);
  const onLogout = props.onLogout || dkLogout;
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const bal = typeof user?.balance === 'number' ? user.balance : null;
  const sym = DK_SYMBOLS[(user?.currency || 'USD').toUpperCase()] ?? (user?.currency || '$');
  return (
    <header className="cd-topbar dk-topbar">
      <button className="cd-hamburger dk-hamburger" onClick={onMenu} aria-label="Open menu"><span /><span /><span /></button>
      <div className="dk-crumb"><span>{DK_TITLE}</span></div>
      <div style={{ flex:1 }} />
      {bal != null && (
        <a href="/payments" className="dk-balance" title="Available balance">
          <span>Balance</span><strong>{sym}{bal.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}</strong>
        </a>
      )}
      {onRefresh && (
        <button type="button" className="dk-icon" onClick={onRefresh} aria-label="Refresh prices" style={{ background:'none', cursor:'pointer' }}>
          <DkRefresh size={18} style={{ animation: refreshing ? 'dkSpin .8s linear infinite' : 'none' }} />
        </button>
      )}
      <a href="/notification" className="dk-icon" aria-label="Notifications"><DkBell size={19} /><span className="dk-dot" /></a>
      <a href="/settings" className="dk-icon dk-hide-sm" aria-label="Settings"><DkSettings size={19} /></a>
      <div className="dk-menu" ref={ref}>
        <button type="button" className="dk-avatar" onClick={() => setOpen(o => !o)} aria-label="Account menu" aria-expanded={open}>{dkInitials(user)}</button>
        {open && (
          <div className="dk-drop" role="menu">
            <div className="dk-drop-head"><strong>{dkName(user)}</strong><span>{dkPlan(user)}</span></div>
            <a href="/profile" className="dk-drop-item" role="menuitem"><DkUser size={16} />Profile</a>
            <a href="/payments" className="dk-drop-item" role="menuitem"><DkCard size={16} />Payments</a>
            <button className="dk-drop-item dk-out" role="menuitem" onClick={onLogout}><DkLogout size={16} />Log out</button>
          </div>
        )}
      </div>
    </header>
  );
}

/* Visual layer: palette, type and component polish for the cd- page */
const DESK_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap');
body, #root { font-family: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; font-variant-numeric: tabular-nums; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* Sidebar */
.dk-sidebar { width: var(--sidebar-w, 264px); background: var(--surface) !important; border-right: 1px solid var(--border) !important; display: flex !important; flex-direction: column !important; height: 100vh; height: 100dvh; overflow: hidden; }
.dk-sidebar::after { display: none !important; }
.dk-brand { height: var(--topbar-h, 64px); flex-shrink: 0; display: flex; align-items: center; padding: 0 22px; border-bottom: 1px solid var(--border); }
.dk-brand img { height: 32px; width: auto; }
.dk-scroll { flex: 1; overflow-y: auto; padding: 10px 12px 14px; scrollbar-width: thin; }
.dk-section { font-size: 12px; font-weight: 600; color: var(--faint); padding: 14px 12px 6px; }
.dk-sidebar a, .dk-topbar a { text-decoration: none; color: inherit; }
.dk-link { position: relative; display: flex; align-items: center; gap: 12px; width: 100%; padding: 9px 12px; border-radius: 10px; font-size: 14.5px; font-weight: 500; color: var(--muted); background: none; border: none; cursor: pointer; text-align: left; font-family: inherit; transition: background .15s, color .15s; }
.dk-link:hover { background: var(--surface2); color: var(--text); }
.dk-link.active { background: var(--surface2); color: var(--text); font-weight: 600; }
.dk-link.active::before { content: ''; position: absolute; left: -12px; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0; background: var(--accent); }
.dk-link.active svg { color: var(--accent); }
.dk-badge { margin-left: auto; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: var(--accent-dim); color: var(--accent); }
.dk-logout:hover { color: var(--red); }
.dk-plan { display: flex; flex-direction: column; gap: 2px; margin: 0 12px 12px; padding: 14px; border-radius: 14px; border: 1px solid var(--border); background: linear-gradient(160deg, var(--surface2), var(--surface)); transition: border-color .15s; }
.dk-plan:hover { border-color: var(--accent); }
.dk-plan-tag { align-self: flex-start; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: var(--accent-dim); color: var(--accent); margin-bottom: 6px; }
.dk-plan-t { font-size: 14px; font-weight: 600; color: var(--text); }
.dk-plan-s { font-size: 12.5px; color: var(--muted); }
.dk-user { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-top: 1px solid var(--border); flex-shrink: 0; }
.dk-user-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text); }
.dk-user-role { font-size: 12.5px; color: var(--muted); }
.dk-avatar { width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 13.5px; font-weight: 700; font-family: inherit; background: linear-gradient(145deg, #1C3A6E, #07101E); color: #E2AE4A; border: 1px solid var(--border2); cursor: pointer; }

/* Topbar */
.dk-topbar { height: var(--topbar-h, 64px); gap: 10px !important; background: var(--bg) !important; border-bottom: 1px solid var(--border); }
.dk-hamburger { background: none; border: none; }
.dk-crumb { font-size: 15px; font-weight: 600; color: var(--text); white-space: nowrap; }
.dk-balance { display: inline-flex; align-items: baseline; gap: 8px; height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); font-size: 13px; color: var(--muted); white-space: nowrap; line-height: 40px; }
.dk-balance strong { font-size: 14.5px; color: var(--text); font-weight: 600; }
.dk-balance:hover { border-color: var(--accent); }
.dk-icon { position: relative; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--muted); border: 1px solid transparent; }
.dk-icon:hover { background: var(--surface); color: var(--text); border-color: var(--border); }
.dk-dot { position: absolute; top: 9px; right: 10px; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 2px var(--bg); }
.dk-menu { position: relative; }
.dk-drop { position: absolute; right: 0; top: calc(100% + 8px); z-index: 400; min-width: 230px; padding: 6px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); box-shadow: 0 24px 48px -16px rgba(0,0,0,.5); }
.dk-drop-head { padding: 10px 12px; border-bottom: 1px solid var(--border); margin-bottom: 4px; display: flex; flex-direction: column; }
.dk-drop-head strong { font-size: 14.5px; color: var(--text); }
.dk-drop-head span { font-size: 12.5px; color: var(--muted); }
.dk-drop-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border-radius: 8px; font-size: 14px; color: var(--muted); background: none; border: none; cursor: pointer; font-family: inherit; text-align: left; }
.dk-drop-item:hover { background: var(--surface2); color: var(--text); }
.dk-out:hover { color: var(--red); }
.lang-btn { height: 40px; border-radius: 10px !important; border: 1px solid var(--border) !important; background: none !important; color: var(--muted) !important; }
.lang-dropdown { border-radius: 12px !important; background: var(--surface) !important; border: 1px solid var(--border) !important; }
.lang-option.active { background: var(--accent-dim) !important; color: var(--text) !important; }
@keyframes dkSpin { to { transform: rotate(360deg); } }
@media (max-width: 760px) { .dk-balance span, .dk-hide-sm { display: none; } .dk-balance { padding: 0 10px; } }
@media (max-width: 420px) { .dk-balance { display: none; } }

/* Page heading */
.cd-page-title { font-family: 'Instrument Serif', Georgia, serif !important; font-weight: 400 !important; font-size: clamp(32px,3.4vw,46px) !important; line-height: 1.05 !important; letter-spacing: -.01em !important; color: var(--text); }
.cd-page-title em, .cd-page-title span { font-style: normal; color: var(--text) !important; }
.cd-page-sub { font-size: 15px !important; color: var(--muted) !important; margin-top: 8px; }

/* Buttons */
.cd-btn { border-radius: 10px !important; font-family: inherit !important; font-weight: 600 !important; letter-spacing: 0 !important; }
.cd-btn-accent { background: var(--accent) !important; color: #07101E !important; border: 1px solid transparent !important; }
.cd-btn-accent:hover { filter: brightness(1.07); }
.cd-btn-ghost { background: transparent !important; border: 1px solid var(--border2) !important; color: var(--text) !important; }
.cd-btn-ghost:hover { background: var(--surface) !important; }

/* Cards and metrics */
.cd-metric, .cd-card, .cd-trader-card, .cd-copying-card, .cd-item-card, .cd-lb-wrap, .cd-plan-card,
.fc-card, .pr-card, .ev-card, .eco-side-card, .fc-table-wrap {
  border-radius: 16px !important; border: 1px solid var(--border) !important; background: var(--surface) !important;
  box-shadow: 0 1px 0 rgba(255,255,255,.03) inset, 0 24px 48px -36px rgba(0,0,0,.6);
}
.cd-trader-card, .cd-item-card, .cd-copying-card { transition: border-color .15s, transform .2s; }
.cd-trader-card:hover, .cd-item-card:hover { border-color: var(--border2) !important; transform: translateY(-2px); }
.cd-metric-label { font-size: 13.5px !important; color: var(--muted) !important; text-transform: none !important; letter-spacing: 0 !important; font-family: inherit !important; }
.cd-metric-value { font-family: 'Instrument Sans', system-ui, sans-serif !important; font-weight: 600 !important; font-size: 26px !important; letter-spacing: -.01em; }
.cd-metric-sub { font-size: 13px !important; color: var(--muted) !important; font-family: inherit !important; }
.cd-metric-icon { border-radius: 10px !important; }

/* Tabs, selects, inputs */
.cd-tabs { background: var(--surface) !important; border: 1px solid var(--border) !important; border-radius: 12px !important; padding: 4px !important; }
.cd-tab { border-radius: 9px !important; font-family: inherit !important; font-weight: 600 !important; color: var(--muted); }
.cd-tab.active { background: var(--accent) !important; color: #07101E !important; }
.cd-select, .cd-input, .cd-filter-select, .cd-login-input {
  border-radius: 10px !important; background: var(--surface) !important; border: 1px solid var(--border) !important; color: var(--text) !important; font-family: inherit !important;
}
.cd-select:focus, .cd-input:focus, .cd-filter-select:focus, .cd-login-input:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 3px var(--accent-dim); outline: none; }

/* Tables */
.cd-table th, .fc-table-head { font-family: inherit !important; font-size: 12.5px !important; font-weight: 600 !important; text-transform: none !important; letter-spacing: 0 !important; color: var(--faint) !important; }
.cd-table td { font-variant-numeric: tabular-nums; }

/* Badges */
[class^="cd-badge"], [class*=" cd-badge"] { border-radius: 7px !important; font-family: inherit !important; font-weight: 700 !important; letter-spacing: 0 !important; text-transform: none !important; }

/* Modals */
.cd-modal-overlay, .cd-upgrade-overlay { background: rgba(3,8,16,.7) !important; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.cd-modal, .cd-upgrade-modal { border-radius: 20px !important; background: var(--surface) !important; border: 1px solid var(--border) !important; box-shadow: 0 40px 90px -30px rgba(0,0,0,.8) !important; }

/* Help-centre sub-pages */
.pg-hero { border-radius: 20px !important; border: 1px solid var(--border) !important; background: radial-gradient(120% 140% at 100% 0%, var(--accent-glow) 0%, transparent 55%), var(--surface) !important; }
.pg-hero-grid { display: none !important; }
.pg-hero-label { font-size: 13px !important; font-weight: 600 !important; letter-spacing: 0 !important; text-transform: none !important; color: var(--accent) !important; font-family: inherit !important; }
.pg-hero-title { font-family: 'Instrument Serif', Georgia, serif !important; font-weight: 400 !important; font-size: clamp(32px,3.6vw,48px) !important; line-height: 1.05 !important; }
.pg-hero-title em { font-style: normal; color: var(--accent); }
.pg-hero-sub { font-size: 15.5px !important; color: var(--muted) !important; }
.pg-card { border-radius: 16px !important; border: 1px solid var(--border) !important; background: var(--surface) !important; overflow: hidden; }
.pg-card-title { font-size: 16px !important; font-weight: 600 !important; }
.pg-back { font-size: 14px !important; color: var(--muted) !important; }
.pg-back:hover { color: var(--text) !important; }

/* Live dot */
.cd-live-dot { background: var(--green) !important; }

/* Mono labels become calm sentence-case text */
[class*="-lbl"], [class*="-label"] { letter-spacing: 0 !important; }
`;

/* ─── Card products ───────────────────────────────────────────────────────────
   Prices and limits are product settings — change them here and in
   order_card() in cards_schema.sql so the page and the database agree. */
const PRODUCTS = [
  { key:'virtual',  name:'Virtual card',   price:0,   physical:false, designs:['virtual'],            tier:'VIRTUAL',
    delivery:'Ready as soon as it’s approved', monthly:5000,  atm:0,
    features:['Pay online and in apps', 'Freeze or replace it any time', 'Spend up to $5,000 a month'] },
  { key:'standard', name:'Standard card',  price:10,  physical:true,  designs:['midnight','graphite'], tier:'STANDARD',
    delivery:'7 to 14 business days', monthly:10000, atm:500,
    features:['Contactless and chip-and-PIN', 'ATM withdrawals up to $500 a day', 'Spend up to $10,000 a month'] },
  { key:'gold',     name:'Gold metal',     price:49,  physical:true,  designs:['gold'],                tier:'GOLD',
    delivery:'5 to 7 business days, tracked', monthly:25000, atm:1500, tag:'Popular',
    features:['Solid metal card', 'ATM withdrawals up to $1,500 a day', 'Spend up to $25,000 a month'] },
  { key:'black',    name:'Black metal',    price:149, physical:true,  designs:['black'],               tier:'BLACK',
    delivery:'3 to 5 business days, express', monthly:50000, atm:3000, tag:'Highest limits',
    features:['Heavy matte-black metal', 'ATM withdrawals up to $3,000 a day', 'Spend up to $50,000 a month'] },
];
const PRODUCT = Object.fromEntries(PRODUCTS.map(p => [p.key, p]));
const DESIGNS = {
  virtual:  { label:'Electric blue', swatch:'linear-gradient(135deg,#3D6FE0,#0B1530)' },
  midnight: { label:'Midnight',      swatch:'linear-gradient(135deg,#14294B,#07101E)' },
  graphite: { label:'Graphite',      swatch:'linear-gradient(135deg,#3A4352,#161B24)' },
  gold:     { label:'Gold',          swatch:'linear-gradient(135deg,#F3D48A,#9C6B1B)' },
  black:    { label:'Black',         swatch:'linear-gradient(135deg,#1D1D20,#050506)' },
};
const ORDER_STEPS = ['Ordered', 'In production', 'Shipped', 'Delivered'];
const ORDER_STEP_INDEX = { pending:0, processing:1, shipped:2, delivered:3 };

const usd = (n, d = 2) => `${Number(n) < 0 ? '−' : ''}$${Math.abs(Number(n || 0)).toLocaleString('en-US', { minimumFractionDigits:d, maximumFractionDigits:d })}`;
const cleanName = (v) => v.toUpperCase().replace(/[^A-Z\s'-]/g, '').replace(/\s{2,}/g, ' ').slice(0, 22);
const fmtDate = (ts) => new Date(ts).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
const isMissingTable = (err) => !!err && (err.code === '42P01' || err.code === 'PGRST205' || /does not exist|could not find the table/i.test(err.message || ''));
const isMissingFn = (err) => !!err && (err.code === 'PGRST202' || err.code === '42883' || /function .* does not exist|could not find the function/i.test(err.message || ''));

/* ─── Card artwork ────────────────────────────────────────────────────────── */
function Chip() {
  return (
    <svg viewBox="0 0 50 38" aria-hidden="true" style={{ flexShrink:0 }}>
      <defs>
        <linearGradient id="cdChip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F6E3A8" /><stop offset=".5" stopColor="#D2A84F" /><stop offset="1" stopColor="#A57A27" /></linearGradient>
      </defs>
      <rect x="1" y="1" width="48" height="36" rx="7" fill="url(#cdChip)" stroke="rgba(0,0,0,.25)" />
      <path d="M1 13h14M1 25h14M35 13h14M35 25h14M15 1v36M35 1v36M15 19h20" stroke="rgba(80,55,10,.55)" strokeWidth="1.4" fill="none" />
    </svg>
  );
}

function CardArt({ product = 'standard', design, last4, name, expMonth, expYear, status, className = '', style }) {
  const p = PRODUCT[product] || PRODUCT.standard;
  const d = design || p.designs[0];
  const exp = expMonth && expYear ? `${String(expMonth).padStart(2, '0')}/${String(expYear).slice(-2)}` : '••/••';
  return (
    <div className={`plastic d-${d}${status === 'frozen' ? ' frozen' : ''} ${className}`} style={style} aria-label={`${p.name}${last4 ? ` ending ${last4}` : ''}`} role="img">
      <div className="pl-in">
      <div className="pl-top">
        <span className="pl-brand">ProfitGainSignal</span>
        <span className="pl-tier">{p.tier}</span>
      </div>
      <div className="pl-mid">
        <Chip />
        <Nfc aria-hidden="true" />
      </div>
      <div>
        <div className="pl-num">•••• •••• •••• {last4 || '••••'}</div>
      </div>
      <div className="pl-bot">
        <div style={{ minWidth:0 }}>
          <div className="pl-small">CARDHOLDER</div>
          <div className="pl-name">{name || 'YOUR NAME'}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div className="pl-small">EXPIRES</div>
          <div className="pl-exp">{exp}</div>
        </div>
        <div className="pl-mark">DEBIT</div>
      </div>
      </div>
      {status === 'frozen' && <div className="pl-stamp"><Snowflake />Frozen</div>}
      {status === 'blocked' && <div className="pl-stamp"><Lock />Blocked</div>}
    </div>
  );
}

function TiltCard(props) {
  const ref = useRef(null);
  const [t, setT] = useState({ x:0, y:0 });
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return (
    <div className="cd-tilt" ref={ref}
      onMouseMove={e => {
        if (reduce) return;
        const r = ref.current.getBoundingClientRect();
        setT({ x: ((e.clientY - r.top) / r.height - .5) * -8, y: ((e.clientX - r.left) / r.width - .5) * 10 });
      }}
      onMouseLeave={() => setT({ x:0, y:0 })}>
      <CardArt {...props} style={{ transform:`rotateX(${t.x}deg) rotateY(${t.y}deg)` }} />
    </div>
  );
}

/* ─── Order drawer ────────────────────────────────────────────────────────── */
function OrderDrawer({ initialProduct, user, balance, onClose, onOrdered }) {
  const [product, setProduct] = useState(initialProduct || 'virtual');
  const p = PRODUCT[product];
  const [design, setDesign] = useState(p.designs[0]);
  const [name, setName] = useState(() => cleanName([user?.first_name, user?.last_name].filter(Boolean).join(' ')));
  const [addr, setAddr] = useState({ line1:'', line2:'', city:'', region:'', postal:'', country:'', phone:'' });
  const [step, setStep] = useState(0);              // 0 card · 1 delivery · 2 review · 3 done
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);

  useEffect(() => { setDesign(PRODUCT[product].designs[0]); }, [product]);
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [onClose, busy]);

  const steps = p.physical ? ['Card', 'Delivery', 'Review'] : ['Card', 'Review'];
  const reviewStep = p.physical ? 2 : 1;
  const nameOk = name.trim().length >= 3;
  const addrOk = ['line1', 'city', 'postal', 'country', 'phone'].every(k => addr[k].trim());
  const short = balance != null && p.price > balance;

  const next = () => {
    setError('');
    if (step === 0 && !nameOk) { setError('Enter the name to print on the card (at least 3 letters).'); return; }
    if (step === 1 && p.physical && !addrOk) { setError('Fill in every required delivery field.'); return; }
    setStep(s => (s === 0 && !p.physical ? reviewStep : s + 1));
  };
  const back = () => { setError(''); setStep(s => (s === reviewStep && !p.physical ? 0 : s - 1)); };

  const place = async () => {
    setBusy(true); setError('');
    const delivery = p.physical ? {
      line1:addr.line1.trim(), line2:addr.line2.trim() || null, city:addr.city.trim(), region:addr.region.trim() || null,
      postal_code:addr.postal.trim(), country:addr.country.trim(), phone:addr.phone.trim(),
    } : null;
    try {
      const { error: rpcErr } = await supabase.rpc('order_card', {
        p_product: product, p_design: design, p_name_on_card: name.trim(), p_delivery: delivery,
      });
      if (rpcErr) {
        if (!isMissingFn(rpcErr)) throw rpcErr;
        // order_card() not installed: file a pending order for an admin to confirm and charge
        const { data: { session } } = await supabase.auth.getSession();
        const { error: insErr } = await supabase.from('card_orders').insert({
          user_id: session?.user?.id, product, design, name_on_card: name.trim(), delivery, fee: p.price, status: 'pending',
        });
        if (insErr) throw insErr;
        setPendingOnly(true);
      }
      setStep(3);
      onOrdered?.();
    } catch (e) {
      setError(isMissingTable(e) ? 'Card ordering isn’t set up yet. Please try again later.' : (e?.message || 'Something went wrong. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="cd-overlay" onClick={() => !busy && onClose()} />
      <aside className="cd-drawer" role="dialog" aria-modal="true" aria-label="Order a card">
        <div className="cd-drawer-head">
          <h3>{step === 3 ? 'Order placed' : 'Order a card'}</h3>
          <button className="cd-close" onClick={onClose} disabled={busy} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="cd-drawer-body">
          <div className="cd-preview"><CardArt product={product} design={design} name={name} /></div>

          {step === 3 ? (
            <div className="cd-success">
              <CheckCircle2 size={44} />
              <h4>{p.physical ? 'Your card is on its way' : 'Your card is being set up'}</h4>
              <p>
                {pendingOnly
                  ? `We've received your order for a ${p.name.toLowerCase()}. Our team will confirm it${p.price ? ` and charge the ${usd(p.price, 0)} fee` : ''} shortly.`
                  : p.physical
                    ? `We've charged ${usd(p.price, 0)} to your wallet. Delivery takes ${p.delivery.toLowerCase()}, and you can follow it under Orders.`
                    : 'It will appear under My cards as soon as it’s approved, usually within a few minutes.'}
              </p>
              <button className="cd-btn cd-btn-accent" onClick={onClose}>Done</button>
            </div>
          ) : (
            <>
              <div className="cd-steps" aria-hidden="true">{steps.map((s, i) => <span key={s} className={i <= (step === reviewStep ? steps.length - 1 : step) ? 'on' : ''} />)}</div>

              {step === 0 && (
                <>
                  <div>
                    <span className="cd-label">Card type</span>
                    <div className="cd-select-row">
                      {PRODUCTS.map(x => (
                        <button key={x.key} type="button" className="cd-opt" aria-pressed={product === x.key} onClick={() => setProduct(x.key)}>
                          <span className="cd-swatch" style={{ background:DESIGNS[x.designs[0]].swatch }} />
                          {x.name}
                          <span style={{ fontWeight:500, color:'var(--muted)' }}>{x.price ? usd(x.price, 0) : 'Free'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {p.designs.length > 1 && (
                    <div>
                      <span className="cd-label">Colour</span>
                      <div className="cd-select-row">
                        {p.designs.map(d => (
                          <button key={d} type="button" className="cd-opt" aria-pressed={design === d} onClick={() => setDesign(d)}>
                            <span className="cd-swatch" style={{ background:DESIGNS[d].swatch }} />{DESIGNS[d].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <label className="cd-field">
                    <span className="cd-label">Name on card</span>
                    <input className="cd-input" value={name} onChange={e => setName(cleanName(e.target.value))} placeholder="ALEX KIM" autoComplete="cc-name" />
                    <span className="cd-hint">Up to 22 letters. This must match the name on your verified account.</span>
                  </label>
                </>
              )}

              {step === 1 && p.physical && (
                <>
                  <label className="cd-field"><span className="cd-label">Address line 1</span><input className="cd-input" value={addr.line1} onChange={e => setAddr({ ...addr, line1:e.target.value })} autoComplete="address-line1" /></label>
                  <label className="cd-field"><span className="cd-label">Address line 2 <span style={{ fontWeight:400, color:'var(--muted)' }}>(optional)</span></span><input className="cd-input" value={addr.line2} onChange={e => setAddr({ ...addr, line2:e.target.value })} autoComplete="address-line2" /></label>
                  <div className="cd-grid2">
                    <label className="cd-field"><span className="cd-label">City</span><input className="cd-input" value={addr.city} onChange={e => setAddr({ ...addr, city:e.target.value })} autoComplete="address-level2" /></label>
                    <label className="cd-field"><span className="cd-label">State or region <span style={{ fontWeight:400, color:'var(--muted)' }}>(optional)</span></span><input className="cd-input" value={addr.region} onChange={e => setAddr({ ...addr, region:e.target.value })} autoComplete="address-level1" /></label>
                    <label className="cd-field"><span className="cd-label">Postal code</span><input className="cd-input" value={addr.postal} onChange={e => setAddr({ ...addr, postal:e.target.value })} autoComplete="postal-code" /></label>
                    <label className="cd-field"><span className="cd-label">Country</span><input className="cd-input" value={addr.country} onChange={e => setAddr({ ...addr, country:e.target.value })} autoComplete="country-name" /></label>
                  </div>
                  <label className="cd-field"><span className="cd-label">Phone for the courier</span><input className="cd-input" type="tel" value={addr.phone} onChange={e => setAddr({ ...addr, phone:e.target.value })} autoComplete="tel" /></label>
                </>
              )}

              {step === reviewStep && (
                <>
                  <div className="cd-review num">
                    <div><span>Card</span><strong>{p.name}</strong></div>
                    {p.designs.length > 1 && <div><span>Colour</span><strong>{DESIGNS[design].label}</strong></div>}
                    <div><span>Name on card</span><strong>{name}</strong></div>
                    {p.physical && <div><span>Deliver to</span><strong>{[addr.line1, addr.city, addr.country].filter(Boolean).join(', ')}</strong></div>}
                    <div><span>{p.physical ? 'Delivery' : 'Ready'}</span><strong>{p.delivery}</strong></div>
                    {balance != null && <div><span>Wallet after this</span><strong>{usd(balance - p.price)}</strong></div>}
                    <div><span>Fee, charged from your wallet</span><strong>{p.price ? usd(p.price, 0) : 'Free'}</strong></div>
                  </div>
                  {short && <div className="cd-msg err">Your wallet balance is {usd(balance)}. <a href="/payments" style={{ textDecoration:'underline' }}>Deposit funds</a> to order this card.</div>}
                </>
              )}

              {error && <div className="cd-msg err" role="alert">{error}</div>}
            </>
          )}
        </div>

        {step !== 3 && (
          <div className="cd-drawer-foot">
            {step > 0 && <button className="cd-btn cd-btn-ghost" onClick={back} disabled={busy}>Back</button>}
            {step !== reviewStep
              ? <button className="cd-btn cd-btn-accent" onClick={next}>Continue <ChevronRight /></button>
              : <button className="cd-btn cd-btn-accent" onClick={place} disabled={busy || short}>{busy ? 'Placing order…' : p.price ? `Pay ${usd(p.price, 0)} and order` : 'Order card'}</button>}
          </div>
        )}
      </aside>
    </>
  );
}

/* ─── Selected-card controls ──────────────────────────────────────────────── */
function CardControls({ card, spent, onChange, onReportLost, onReplace }) {
  const [limit, setLimit] = useState(String(card.monthly_limit ?? ''));
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const p = PRODUCT[card.product] || PRODUCT.standard;
  const blocked = card.status === 'blocked';
  const frozen = card.status === 'frozen';
  const cap = p.monthly;

  useEffect(() => { setLimit(String(card.monthly_limit ?? '')); setMsg(null); }, [card.id, card.monthly_limit]);

  const apply = async (key, patch, okText) => {
    setBusy(key); setMsg(null);
    const res = await onChange(card, patch);
    setBusy('');
    setMsg(res.ok ? { ok:true, text:okText } : { ok:false, text:res.error });
  };
  const saveLimit = () => {
    const v = Number(limit);
    if (!v || v < 50) { setMsg({ ok:false, text:'Set a limit of at least $50.' }); return; }
    if (v > cap) { setMsg({ ok:false, text:`The most this card allows is ${usd(cap, 0)} a month.` }); return; }
    apply('limit', { monthly_limit:v }, `Monthly limit set to ${usd(v, 0)}.`);
  };
  const usedPct = card.monthly_limit ? Math.min(100, (spent / card.monthly_limit) * 100) : 0;

  return (
    <section className="cd-card cd-panel" aria-label="Card settings">
      <div className="cd-panel-h">
        <div>
          <div className="cd-panel-name">{p.name} •••• {card.last4}</div>
          <div style={{ fontSize:13, color:'var(--muted)' }}>Issued {fmtDate(card.created_at)}</div>
        </div>
        <span className={`cd-badge ${card.status}`}><i />{card.status}</span>
      </div>

      <div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:13.5, marginBottom:6 }} className="num">
          <span style={{ color:'var(--muted)' }}>Spent this month</span>
          <span><strong>{usd(spent)}</strong> <span style={{ color:'var(--muted)' }}>of {usd(card.monthly_limit || cap, 0)}</span></span>
        </div>
        <div style={{ height:8, borderRadius:4, background:'var(--surface2)', overflow:'hidden' }}>
          <div style={{ width:`${usedPct}%`, height:'100%', borderRadius:4, background: usedPct > 90 ? 'var(--red)' : 'var(--accent)' }} />
        </div>
      </div>

      <div className="cd-meta num">
        <div><span>Expires</span><strong>{card.exp_month && card.exp_year ? `${String(card.exp_month).padStart(2, '0')}/${card.exp_year}` : '—'}</strong></div>
        <div><span>Type</span><strong>{p.physical ? 'Physical' : 'Virtual'}</strong></div>
        <div><span>ATM a day</span><strong>{p.atm ? usd(p.atm, 0) : 'Not available'}</strong></div>
        <div><span>Paid from</span><strong>USD wallet</strong></div>
      </div>

      <div>
        <div className="cd-toggle-row">
          <Snowflake />
          <div><strong>Freeze card</strong><span>Stops all payments until you unfreeze it.</span></div>
          <button className="cd-switch" role="switch" aria-checked={frozen} aria-label="Freeze card" disabled={blocked || !!busy}
            onClick={() => apply('freeze', { frozen: !frozen }, frozen ? 'Card unfrozen.' : 'Card frozen. No payments will go through.')} />
        </div>
        <div className="cd-toggle-row">
          <Globe />
          <div><strong>Online payments</strong><span>Shopping on websites and in apps.</span></div>
          <button className="cd-switch" role="switch" aria-checked={!!card.online_enabled} aria-label="Online payments" disabled={blocked || !!busy}
            onClick={() => apply('online', { online_enabled: !card.online_enabled }, card.online_enabled ? 'Online payments turned off.' : 'Online payments turned on.')} />
        </div>
        {p.physical && (
          <div className="cd-toggle-row">
            <Smartphone />
            <div><strong>Contactless</strong><span>Tap to pay at the till.</span></div>
            <button className="cd-switch" role="switch" aria-checked={!!card.contactless_enabled} aria-label="Contactless payments" disabled={blocked || !!busy}
              onClick={() => apply('contactless', { contactless_enabled: !card.contactless_enabled }, card.contactless_enabled ? 'Contactless turned off.' : 'Contactless turned on.')} />
          </div>
        )}
      </div>

      <div>
        <span className="cd-label">Monthly spending limit</span>
        <div className="cd-limit">
          <input className="cd-input" inputMode="numeric" value={limit} disabled={blocked} aria-label="Monthly spending limit in US dollars"
            onChange={e => setLimit(e.target.value.replace(/[^0-9]/g, ''))} />
          <button className="cd-btn cd-btn-ghost cd-btn-sm" style={{ height:40 }} onClick={saveLimit} disabled={blocked || busy === 'limit'}>Save</button>
        </div>
        <div className="cd-hint">Up to {usd(cap, 0)} a month on this card.</div>
      </div>

      {msg && <div className={`cd-msg ${msg.ok ? 'ok' : 'err'}`} role="status">{msg.text}</div>}

      <div className="cd-actions">
        {blocked
          ? <button className="cd-btn cd-btn-accent" onClick={() => onReplace(card.product)}><CreditCard />Order a replacement</button>
          : <button className="cd-btn cd-btn-danger" onClick={() => onReportLost(card)}><Lock />Report lost or stolen</button>}
      </div>
    </section>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function Cards() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser]         = useState(null);
  const [balance, setBalance]   = useState(null);
  const [cards, setCards]       = useState(null);     // null = loading
  const [orders, setOrders]     = useState([]);
  const [txs, setTxs]           = useState([]);
  const [setupMissing, setSetupMissing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [ordering, setOrdering] = useState(null);     // product key | null
  const [lostCard, setLostCard] = useState(null);
  const [lostBusy, setLostBusy] = useState(false);
  const [lostErr, setLostErr]   = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }
      const uid = session.user.id;
      const [profileRes, walletRes, settingsRes, cardsRes, ordersRes, txRes] = await Promise.all([
        supabase.from('users').select('first_name,last_name,email,plan,is_verified,currency').eq('id', uid).maybeSingle(),
        supabase.from('wallets').select('balance,currency').eq('user_id', uid).eq('currency', 'USD').maybeSingle(),
        supabase.from('user_settings').select('theme,accent_color').eq('user_id', uid).maybeSingle(),
        supabase.from('cards').select('*').eq('user_id', uid).order('created_at', { ascending:false }),
        supabase.from('card_orders').select('*').eq('user_id', uid).order('created_at', { ascending:false }).limit(10),
        supabase.from('card_transactions').select('*').eq('user_id', uid).order('created_at', { ascending:false }).limit(25),
      ]);
      if (!live) return;

      const st = settingsRes.data;
      if (st) {
        const dark = !st.theme || st.theme === 'dark' || (st.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        if (st.accent_color) {
          document.documentElement.style.setProperty('--accent', st.accent_color);
          document.documentElement.style.setProperty('--accent-dim', `${st.accent_color}24`);
          document.documentElement.style.setProperty('--accent-glow', `${st.accent_color}12`);
        }
      }

      const bal = walletRes.data ? Number(walletRes.data.balance) : null;
      setBalance(bal);
      setUser({ ...(profileRes.data || { email: session.user.email }), balance: bal ?? undefined, currency:'USD' });
      setSetupMissing(isMissingTable(cardsRes.error));
      const list = cardsRes.error ? [] : (cardsRes.data || []);
      setCards(list);
      setSelected(prev => (list.find(c => c.id === prev) ? prev : list.find(c => c.status !== 'blocked')?.id || list[0]?.id || null));
      setOrders(ordersRes.error ? [] : (ordersRes.data || []));
      setTxs(txRes.error ? [] : (txRes.data || []));
    })();
    return () => { live = false; };
  }, [reloadKey]);

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/login'; };

  const monthStart = useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }, []);
  const spentBy = useMemo(() => {
    const m = {};
    txs.forEach(t => {
      if (t.status === 'declined' || t.status === 'refunded') return;
      if (new Date(t.created_at).getTime() < monthStart) return;
      m[t.card_id] = (m[t.card_id] || 0) + Number(t.amount || 0);
    });
    return m;
  }, [txs, monthStart]);
  const spentMonth = Object.values(spentBy).reduce((a, b) => a + b, 0);

  const card = (cards || []).find(c => c.id === selected) || null;
  const activeCount = (cards || []).filter(c => c.status === 'active').length;
  const openOrders = orders.filter(o => ['pending', 'processing', 'shipped'].includes(o.status));
  const last4Of = (id) => (cards || []).find(c => c.id === id)?.last4;

  /* Controls go through an RPC so users can only change the switches, never
     the card's status, number or limits beyond what the product allows. */
  const changeCard = async (c, patch) => {
    const optimistic = { ...c };
    if ('frozen' in patch) optimistic.status = patch.frozen ? 'frozen' : 'active';
    ['online_enabled', 'contactless_enabled', 'monthly_limit'].forEach(k => { if (k in patch) optimistic[k] = patch[k]; });
    setCards(cs => cs.map(x => (x.id === c.id ? optimistic : x)));
    const { error } = await supabase.rpc('set_card_controls', {
      p_card_id: c.id,
      p_frozen: 'frozen' in patch ? patch.frozen : null,
      p_online: 'online_enabled' in patch ? patch.online_enabled : null,
      p_contactless: 'contactless_enabled' in patch ? patch.contactless_enabled : null,
      p_monthly_limit: 'monthly_limit' in patch ? patch.monthly_limit : null,
    });
    if (error) {
      setCards(cs => cs.map(x => (x.id === c.id ? c : x)));
      return { ok:false, error: isMissingFn(error) ? 'Card controls aren’t set up yet.' : (error.message || 'Couldn’t update the card.') };
    }
    return { ok:true };
  };

  const confirmLost = async () => {
    setLostBusy(true); setLostErr('');
    const { error } = await supabase.rpc('report_card_lost', { p_card_id: lostCard.id });
    setLostBusy(false);
    if (error) { setLostErr(isMissingFn(error) ? 'This isn’t set up yet. Please contact support to block your card.' : (error.message || 'Couldn’t block the card.')); return; }
    setLostCard(null);
    setReloadKey(k => k + 1);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: DESK_CSS }} />
      <div className={`cd-backdrop${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div className="cd-shell">
        <Sidebar open={sidebarOpen} user={user} onLogout={handleLogout} />
        <div className="cd-right">
          <Topbar onMenu={() => setSidebarOpen(v => !v)} user={user} onLogout={handleLogout} />

          <main className="cd-main">
            <div className="cd-head">
              <div>
                <h1 className="cd-page-title">Cards</h1>
                <p className="cd-page-sub">Spend your ProfitGainSignal balance in shops, online and at ATMs. Order a free virtual card or a physical card delivered to your door, then control it from here.</p>
              </div>
              <button className="cd-btn cd-btn-accent" onClick={() => setOrdering('virtual')}><CreditCard />Order a card</button>
            </div>

            {setupMissing && (
              <div className="cd-note">
                <Info size={18} />
                <span><strong>Cards aren’t switched on yet.</strong> You can look around, but ordering will be available once the cards tables are added to the database.</span>
              </div>
            )}

            {/* Summary */}
            <div className="cd-meta cd-sum num">
              <div><span>Available to spend</span><strong>{balance != null ? usd(balance) : '—'}</strong></div>
              <div><span>Spent this month</span><strong>{usd(spentMonth)}</strong></div>
              <div><span>Active cards</span><strong>{activeCount}</strong></div>
              <div><span>Orders on the way</span><strong>{openOrders.length}</strong></div>
            </div>

            {/* My cards */}
            {cards === null ? (
              <div className="cd-card cd-empty">Loading your cards…</div>
            ) : cards.length === 0 ? (
              <div className="cd-card cd-intro">
                <div style={{ display:'flex', justifyContent:'center' }}><CardArt product="gold" name={[user?.first_name, user?.last_name].filter(Boolean).join(' ').toUpperCase()} style={{ width:'min(360px,100%)' }} /></div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <h2 style={{ fontFamily:"'Instrument Serif', Georgia, serif", fontWeight:400, fontSize:34, lineHeight:1.05 }}>You don’t have a card yet</h2>
                  <p style={{ color:'var(--muted)' }}>A virtual card is free and ready as soon as it’s approved. Physical cards arrive in 3 to 14 business days depending on the card.</p>
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                    <button className="cd-btn cd-btn-accent" onClick={() => setOrdering('virtual')}>Get a free virtual card</button>
                    <a href="#products" className="cd-btn cd-btn-ghost">Compare cards</a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="cd-wallet">
                <section className="cd-card cd-stage" aria-label="My cards">
                  {card && <TiltCard product={card.product} design={card.design} last4={card.last4} name={card.name_on_card} expMonth={card.exp_month} expYear={card.exp_year} status={card.status} />}
                  {cards.length > 1 && (
                    <div className="cd-picker" role="group" aria-label="Choose a card">
                      {cards.map(c => (
                        <button key={c.id} className="cd-pick" aria-pressed={c.id === selected} onClick={() => setSelected(c.id)} aria-label={`${PRODUCT[c.product]?.name || 'Card'} ending ${c.last4}`}>
                          <CardArt product={c.product} design={c.design} last4={c.last4} status={c.status} />
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
                    <a href="/payments" className="cd-btn cd-btn-ghost cd-btn-sm"><Wallet />Add money</a>
                    <button className="cd-btn cd-btn-ghost cd-btn-sm" onClick={() => setOrdering('standard')}><CreditCard />Order another card</button>
                  </div>
                </section>
                {card && (
                  <CardControls card={card} spent={spentBy[card.id] || 0} onChange={changeCard}
                    onReportLost={(c) => { setLostErr(''); setLostCard(c); }} onReplace={(prod) => setOrdering(prod)} />
                )}
              </div>
            )}

            {/* Orders + transactions */}
            {(orders.length > 0 || txs.length > 0) && (
              <div className="cd-two" style={{ marginTop:20 }}>
                <section className="cd-card" aria-label="Card orders">
                  <div className="cd-list-h">Orders <span style={{ fontSize:13, fontWeight:500, color:'var(--muted)' }}>{openOrders.length} in progress</span></div>
                  {orders.length === 0 ? <div className="cd-empty" style={{ padding:28 }}>No card orders yet.</div> : orders.map(o => {
                    const p = PRODUCT[o.product] || PRODUCT.standard;
                    const at = ORDER_STEP_INDEX[o.status] ?? -1;
                    return (
                      <div key={o.id} className="cd-order">
                        <div className="cd-order-top">
                          <div>
                            <div className="cd-order-name">{p.name}{o.design && p.designs.length > 1 ? `, ${DESIGNS[o.design]?.label.toLowerCase()}` : ''}</div>
                            <div className="cd-order-sub num">Ordered {fmtDate(o.created_at)}{o.fee ? ` · ${usd(o.fee, 0)}` : ''}{o.tracking_number ? ` · Tracking ${o.tracking_number}` : ''}</div>
                          </div>
                          <span className={`cd-badge ${o.status}`}><i />{o.status}</span>
                        </div>
                        {p.physical && o.status !== 'cancelled' && (
                          <div className="cd-track" aria-label={`Delivery progress: ${ORDER_STEPS[Math.max(0, at)]}`}>
                            {ORDER_STEPS.map((s, i) => <div key={s} className={i <= at ? 'on' : ''}>{s}</div>)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </section>

                <section className="cd-card" aria-label="Recent card payments">
                  <div className="cd-list-h">Recent card payments</div>
                  {txs.length === 0 ? <div className="cd-empty" style={{ padding:28 }}>No card payments yet.</div> : txs.slice(0, 8).map(t => (
                    <div key={t.id} className="cd-tx">
                      <span className="cd-tx-ico">{t.category === 'atm' ? <Wallet /> : t.category === 'online' ? <Globe /> : <Receipt />}</span>
                      <div className="cd-tx-main">
                        <strong>{t.merchant || 'Card payment'}</strong>
                        <span className="num">{fmtDate(t.created_at)}{last4Of(t.card_id) ? ` · •••• ${last4Of(t.card_id)}` : ''}</span>
                      </div>
                      <div className="cd-tx-amt num" style={{ color: t.status === 'refunded' ? 'var(--green)' : t.status === 'declined' ? 'var(--muted)' : 'var(--text)' }}>
                        {t.status === 'refunded' ? '+' : '−'}{usd(t.amount).replace('−', '')}
                        <span style={{ textTransform:'capitalize' }}>{t.status === 'completed' ? '' : t.status}</span>
                      </div>
                    </div>
                  ))}
                </section>
              </div>
            )}

            {/* Products */}
            <div className="cd-section-h" id="products">
              <h2>Choose a card</h2>
              <span>Fees are charged once, from your wallet</span>
            </div>
            <div className="cd-products">
              {PRODUCTS.map(p => (
                <button key={p.key} type="button" className="cd-card cd-product" onClick={() => setOrdering(p.key)}>
                  <CardArt product={p.key} design={p.designs[0]} name={[user?.first_name, user?.last_name].filter(Boolean).join(' ').toUpperCase()} />
                  {p.tag ? <span className="cd-tag">{p.tag}</span> : <span className="cd-tag" style={{ visibility:'hidden' }}>.</span>}
                  <div>
                    <div className="cd-product-name">{p.physical ? <Gem size={16} style={{ color:'var(--accent)' }} /> : <Sparkles size={16} style={{ color:'var(--accent)' }} />}{p.name}</div>
                    <div className="cd-product-price">{p.price ? usd(p.price, 0) : 'Free'} <small>{p.physical ? 'one-off, delivery included' : 'no fee'}</small></div>
                  </div>
                  <ul className="cd-feat">
                    {p.features.map(f => <li key={f}><CheckCircle2 />{f}</li>)}
                    <li>{p.physical ? <Truck style={{ color:'var(--muted)' }} /> : <Clock style={{ color:'var(--muted)' }} />}{p.delivery}</li>
                  </ul>
                  <span className="cd-btn cd-btn-ghost cd-btn-sm" style={{ marginTop:'auto' }}>Order {p.name.toLowerCase()}</span>
                </button>
              ))}
            </div>

            {/* Security */}
            <div className="cd-two" style={{ marginTop:20 }}>
              <div className="cd-card" style={{ padding:22, display:'flex', gap:14 }}>
                <ShieldCheck size={22} style={{ color:'var(--accent)', flexShrink:0 }} />
                <div><strong style={{ display:'block', marginBottom:4 }}>Your card details stay with the card issuer</strong><span style={{ color:'var(--muted)', fontSize:14.5 }}>We only ever show the last four digits here. Freeze a card in one tap if you misplace it, and unfreeze it when it turns up.</span></div>
              </div>
              <div className="cd-card" style={{ padding:22, display:'flex', gap:14 }}>
                <PackageCheck size={22} style={{ color:'var(--accent)', flexShrink:0 }} />
                <div><strong style={{ display:'block', marginBottom:4 }}>Activate a physical card when it arrives</strong><span style={{ color:'var(--muted)', fontSize:14.5 }}>Your first payment must use chip and PIN. Contactless switches on after that, and you can turn it off here any time.</span></div>
              </div>
            </div>
            <p style={{ marginTop:18, fontSize:13, color:'var(--faint)', display:'flex', gap:6, alignItems:'center' }}><MapPin size={14} />Card availability and delivery times depend on your country. Card spending draws from your USD wallet balance.</p>
          </main>
        </div>
      </div>

      {ordering && (
        <OrderDrawer initialProduct={ordering} user={user} balance={balance}
          onClose={() => setOrdering(null)} onOrdered={() => setReloadKey(k => k + 1)} />
      )}

      {lostCard && (
        <>
          <div className="cd-overlay" onClick={() => !lostBusy && setLostCard(null)} />
          <div className="cd-card cd-modal" role="alertdialog" aria-modal="true" aria-labelledby="lost-title">
            <h3 id="lost-title">Block card ending {lostCard.last4}?</h3>
            <p>This blocks the card for good. Payments, ATM withdrawals and subscriptions on it will stop. You can order a replacement straight away. If you think you’ve just misplaced it, freeze it instead.</p>
            {lostErr && <div className="cd-msg err">{lostErr}</div>}
            <div className="cd-actions">
              <button className="cd-btn cd-btn-ghost" onClick={() => setLostCard(null)} disabled={lostBusy}>Cancel</button>
              <button className="cd-btn cd-btn-danger" onClick={confirmLost} disabled={lostBusy}>{lostBusy ? 'Blocking…' : 'Block card'}</button>
            </div>
          </div>
        </>
      )}
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
