/**
 * ChatwayWidget.jsx — the Chatway live chat, everywhere except the admin console.
 *
 * Rendered once in App.js inside <Router>. It watches the route:
 *   • any normal page  → loads the Chatway script (once) and shows the chat bubble
 *   • /admin/...       → hides the bubble and closes any open chat
 *
 * The script is only fetched on the first non-admin page, so an admin who goes
 * straight to /admin never loads it. Once loaded it can't be unloaded in a
 * single-page app, so on admin routes it is hidden with CSS instead.
 *
 * Pages must NOT add their own Chatway <script> any more — this is the only loader.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const CHATWAY_ID = '3Ljj1m1cEAob';
const SCRIPT_ID = 'chatway';
const HIDE_CLASS = 'no-chatway';

const HIDE_CSS = `
html.${HIDE_CLASS} #chatway_widget_trigger,
html.${HIDE_CLASS} #chatway_widget_app,
html.${HIDE_CLASS} .chatway--container,
html.${HIDE_CLASS} .chatway--frame-container,
html.${HIDE_CLASS} .chatway--trigger-container,
html.${HIDE_CLASS} .chatway--image-viewer-container,
html.${HIDE_CLASS} .chatway--youtube-viewer-container { display: none !important; }
`;

export const isAdminPath = (path) => path === '/admin' || path.startsWith('/admin/');

function loadChatway() {
  if (document.getElementById(SCRIPT_ID)) return;
  const s = document.createElement('script');
  s.id = SCRIPT_ID;
  s.async = true;
  s.src = `https://cdn.chatway.app/widget.js?id=${CHATWAY_ID}`;
  document.body.appendChild(s);
}

export default function ChatwayWidget() {
  const { pathname } = useLocation();
  const admin = isAdminPath(pathname);

  // The hide rule lives in <head> for the life of the app
  useEffect(() => {
    if (document.getElementById('chatway-hide-css')) return;
    const st = document.createElement('style');
    st.id = 'chatway-hide-css';
    st.textContent = HIDE_CSS;
    document.head.appendChild(st);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (admin) {
      root.classList.add(HIDE_CLASS);
      try { window.closeChatwayWidget?.(); } catch { /* widget not ready yet */ }
    } else {
      root.classList.remove(HIDE_CLASS);
      loadChatway();
    }
  }, [admin]);

  return null;
}
