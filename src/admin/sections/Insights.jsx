import React, { useState } from 'react';
import { PageHead, Tabs, CrudTable, Pill, fmtDateTime } from '../adminShared';

/* Values the /insights page filters and styles by */
const MARKETS  = ['Crypto', 'Forex', 'Equities', 'Commodities', 'Bonds'];
const BADGES   = ['gold', 'blue', 'green', 'red', 'amber', 'purple', 'muted'];
const IMPACT_KIND = { high: 'bad', medium: 'warn', low: '' };

export default function InsightsAdmin() {
  const [tab, setTab] = useState('news');
  return (
    <>
      <PageHead title="Insights" sub={`Content for the Insights page: economic news, the events calendar, asset forecasts and AI predictions. The page's market filter matches these values: ${MARKETS.join(', ')}.`} />
      <Tabs value={tab} onChange={setTab} items={[
        { key:'news',     label:'Economic news' },
        { key:'events',   label:'Events calendar' },
        { key:'forecasts',label:'Forecasts' },
        { key:'predict',  label:'AI predictions' },
      ]} />

      {tab === 'news' && (
        <CrudTable table="news_articles" itemName="article" order="published_at" defaults={{ tab: 'economic', published_at: new Date().toISOString() }}
          fields={[
            { key:'title', required:true, full:true },
            { key:'category', required:true, help:'Shown above the headline, e.g. Central banks, Inflation' },
            { key:'tab', type:'select', required:true, options:['economic'], help:'The Insights page shows the “economic” tab' },
            { key:'impact_level', type:'select', options:['high', 'medium', 'low'], help:'Used by the High / Medium impact filter' },
            { key:'published_at', type:'datetime', required:true },
            { key:'source', help:'e.g. Reuters, Federal Reserve' },
            { key:'badge_label', help:'Small tag, e.g. Breaking' },
            { key:'badge_type', type:'select', options: BADGES, label:'Badge colour' },
            { key:'markets_affected', type:'list', help:`Comma-separated: ${MARKETS.join(', ')}` },
            { key:'body', type:'textarea' },
          ]}
          columns={[
            { key:'published_at', label:'Published', render:n => fmtDateTime(n.published_at) },
            { key:'title', label:'Headline', wrap:true, render:n => <strong style={{ fontWeight:600 }}>{n.title}</strong> },
            { key:'category', label:'Category' },
            { key:'impact_level', label:'Impact', render:n => n.impact_level ? <span className={`ad-pill ${IMPACT_KIND[n.impact_level] ?? ''}`}>{n.impact_level}</span> : '—' },
            { key:'markets_affected', label:'Markets', render:n => (n.markets_affected || []).join(', ') || '—' },
          ]} />
      )}

      {tab === 'events' && (
        <CrudTable table="market_events" itemName="event" order="event_time" asc defaults={{ impact_level: 3 }}
          fields={[
            { key:'title', required:true, full:true, help:'e.g. US Non-Farm Payrolls' },
            { key:'event_time', type:'datetime', required:true, label:'Date and time' },
            { key:'impact_level', type:'select', required:true, options:[
              { value:'1', label:'1 · Low' }, { value:'2', label:'2 · Medium' }, { value:'3', label:'3 · Medium' }, { value:'4', label:'4 · High' }, { value:'5', label:'5 · Very high' },
            ], help:'4 and above count as High impact' },
            { key:'affected_assets', type:'list', help:`Comma-separated: ${MARKETS.join(', ')}` },
            { key:'forecast_value', help:'e.g. 185K' },
            { key:'previous_value', help:'e.g. 175K' },
            { key:'actual_value', help:'Fill in after the release' },
            { key:'source' },
            { key:'badge_label' },
            { key:'badge_type', type:'select', options: BADGES, label:'Badge colour' },
            { key:'description', type:'textarea' },
          ]}
          beforeSave={(p) => ({ ...p, impact_level: Number(p.impact_level) })}
          columns={[
            { key:'event_time', label:'When', render:e => fmtDateTime(e.event_time) },
            { key:'title', label:'Event', wrap:true, render:e => <strong style={{ fontWeight:600 }}>{e.title}</strong> },
            { key:'impact_level', label:'Impact', render:e => <span className={`ad-pill ${e.impact_level >= 4 ? 'bad' : e.impact_level >= 2 ? 'warn' : ''}`}>{'●'.repeat(e.impact_level || 0)}</span> },
            { key:'values', label:'Forecast / previous / actual', render:e => <span className="ad-mono">{e.forecast_value || '—'} / {e.previous_value || '—'} / {e.actual_value || '—'}</span> },
            { key:'affected_assets', label:'Markets', render:e => (e.affected_assets || []).join(', ') || '—' },
          ]} />
      )}

      {tab === 'forecasts' && (
        <CrudTable table="asset_forecasts" itemName="forecast" order="category" asc
          fields={[
            { key:'asset', required:true, help:'e.g. BTC/USD, Gold, S&P 500' },
            { key:'title', required:true, help:'e.g. Bitcoin year-end target' },
            { key:'category', type:'select', required:true, options: MARKETS },
            { key:'period', required:true, help:'Quarter like “Q4 2026”. The table on the page shows the two latest quarters' },
            { key:'range_low', type:'number' },
            { key:'range_high', type:'number' },
            { key:'bullish_pct', type:'number', label:'Bullish (%)' },
            { key:'confidence_pct', type:'number', label:'Confidence (%)', help:'Filled in = shown as a gauge card at the top' },
            { key:'source' },
            { key:'color_hex', placeholder:'#E2AE4A' },
          ]}
          columns={[
            { key:'asset', label:'Asset', render:f => <div className="ad-user"><strong>{f.asset}</strong><small>{f.title}</small></div> },
            { key:'category', label:'Market' },
            { key:'period', label:'Period' },
            { key:'range', label:'Range', render:f => f.range_low != null ? `${f.range_low} – ${f.range_high}` : '—' },
            { key:'bullish_pct', label:'Bullish', align:'right', render:f => f.bullish_pct != null ? `${f.bullish_pct}%` : '—' },
            { key:'confidence_pct', label:'Gauge', render:f => f.confidence_pct != null ? <Pill status="info">{f.confidence_pct}%</Pill> : '—' },
          ]} />
      )}

      {tab === 'predict' && (
        <CrudTable table="ai_predictions" itemName="prediction"
          fields={[
            { key:'title', required:true, full:true, help:'e.g. Fed cuts rates in December' },
            { key:'probability_pct', type:'number', required:true, label:'Probability (%)' },
            { key:'source', help:'e.g. Model v3, CME FedWatch' },
            { key:'badge_label' },
            { key:'color_hex', placeholder:'#2FD394' },
            { key:'factors', type:'json', default:'[]', help:'List of factors: [{"label":"CPI trend","val":"Cooling","icon":"ti-trending-down","color":"#2FD394"}]. Icons: ti-trending-up, ti-trending-down, ti-minus, ti-chart-line, ti-cpu, ti-database' },
          ]}
          columns={[
            { key:'created_at', label:'Added', render:p => fmtDateTime(p.created_at) },
            { key:'title', label:'Prediction', wrap:true, render:p => <strong style={{ fontWeight:600 }}>{p.title}</strong> },
            { key:'probability_pct', label:'Probability', align:'right', render:p => `${p.probability_pct}%` },
            { key:'factors', label:'Factors', align:'right', render:p => Array.isArray(p.factors) ? p.factors.length : 0 },
            { key:'source', label:'Source' },
          ]} />
      )}
    </>
  );
}
