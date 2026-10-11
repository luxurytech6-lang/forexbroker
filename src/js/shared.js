// shared.js — Navigation, Ticker, Sidebar helpers for Profit Gain Signals

const TICKER_HTML = `
<div class="ticker-bar">
  <div class="ticker-track">
    <span class="ticker-item"><span class="sym">BTC</span> &nbsp;<span class="up">▲ $67,420 +2.3%</span></span>
    <span class="ticker-item"><span class="sym">ETH</span> &nbsp;<span class="up">▲ $3,840 +1.8%</span></span>
    <span class="ticker-item"><span class="sym">S&amp;P500</span> &nbsp;<span class="dn">▼ 5,248 -0.4%</span></span>
    <span class="ticker-item"><span class="sym">GOLD</span> &nbsp;<span class="up">▲ $2,314 +0.9%</span></span>
    <span class="ticker-item"><span class="sym">NVDA</span> &nbsp;<span class="up">▲ $892 +3.1%</span></span>
    <span class="ticker-item"><span class="sym">EUR/USD</span> &nbsp;<span class="up">▲ 1.0862 +0.2%</span></span>
    <span class="ticker-item"><span class="sym">SOL</span> &nbsp;<span class="up">▲ $168 +4.7%</span></span>
    <span class="ticker-item"><span class="sym">BNB</span> &nbsp;<span class="dn">▼ $412 -0.9%</span></span>
    <span class="ticker-item"><span class="sym">BTC</span> &nbsp;<span class="up">▲ $67,420 +2.3%</span></span>
    <span class="ticker-item"><span class="sym">ETH</span> &nbsp;<span class="up">▲ $3,840 +1.8%</span></span>
    <span class="ticker-item"><span class="sym">GOLD</span> &nbsp;<span class="up">▲ $2,314 +0.9%</span></span>
    <span class="ticker-item"><span class="sym">NVDA</span> &nbsp;<span class="up">▲ $892 +3.1%</span></span>
  </div>
</div>`;

function buildSidebar(activePage) {
  const items = [
    { href: 'dashboard.html', icon: 'ti-layout-dashboard', label: 'Dashboard', key: 'dashboard' },
    { href: 'copy-trading.html', icon: 'ti-copy', label: 'Copy Trading', key: 'copy' },
    { href: 'hire-trader.html', icon: 'ti-users', label: 'Hire a Trader', key: 'hire' },
    { href: 'insights.html', icon: 'ti-chart-line', label: 'Insights', key: 'insight' },
  ];
  const bottom = [
    { href: 'payment.html', icon: 'ti-credit-card', label: 'Payments', key: 'payment' },
    { href: 'support.html', icon: 'ti-headset', label: 'Support', key: 'support' },
    { href: '#', icon: 'ti-file-description', label: 'Terms', key: 'terms' },
  ];
  const renderItem = ({ href, icon, label, key }) =>
    `<a href="${href}" class="sb-item${activePage === key ? ' active' : ''}"><i class="ti ${icon}"></i>${label}</a>`;

  return `
    <div class="sidebar">
      <div>
        <div class="sb-lbl">Main</div>
        ${items.map(renderItem).join('')}
      </div>
      <div style="margin-top:8px;">
        <div class="sb-lbl">Account</div>
        ${bottom.map(renderItem).join('')}
      </div>
      <div class="sb-spacer"></div>
      <div class="sb-user">
        <div class="sb-av">AK</div>
        <div>
          <div class="sb-name">Alex Kim</div>
          <div class="sb-role">Pro · Verified</div>
        </div>
      </div>
    </div>`;
}

function buildPublicNav(activePage) {
  const links = [
    { href: 'index.html', label: 'Home', key: 'home' },
    { href: 'about.html', label: 'About', key: 'about' },
    { href: '#', label: 'News', key: 'news' },
  ];
  return `
    <nav class="gnav">
      <a href="index.html" class="logo">Profit Gain <em>Signals</em></a>
      <div class="gnav-links">
        ${links.map(l => `<a href="${l.href}" class="${activePage === l.key ? 'active' : ''}">${l.label}</a>`).join('')}
      </div>
      <div class="gnav-right">
        <a href="login.html" class="btn btn-ghost btn-sm">Log in</a>
        <a href="signup.html" class="btn btn-gold btn-sm">Sign up free</a>
      </div>
    </nav>`;
}

function buildAppNav() {
  return `
    <nav class="gnav">
      <a href="index.html" class="logo">Profit Gain <em>Signals</em></a>
      <div class="gnav-right" style="gap:14px;">
        <span style="font-family:var(--fm);font-size:11px;color:var(--nt);">Portfolio &nbsp;<span style="color:var(--gr);">$48,204.33</span></span>
        <i class="ti ti-bell" style="font-size:17px;color:var(--nt);cursor:pointer;" aria-label="Notifications"></i>
        <div class="sb-av" style="width:28px;height:28px;font-size:10px;cursor:pointer;">AK</div>
      </div>
    </nav>`;
}

// Inject modal close on backdrop click
function initModal(overlayId) {
  const el = document.getElementById(overlayId);
  if (!el) return;
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
}