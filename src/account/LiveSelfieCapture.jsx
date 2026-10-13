/**
 * LiveSelfieCapture.jsx — takes a live selfie with the device camera.
 * Used to confirm a withdrawal (payment.jsx). The photo must come from the
 * camera right now — there's no "upload a file" option.
 *
 * props
 *   title, sub        heading text
 *   confirmLabel      main button text once a photo is taken
 *   onConfirm(blob)   async; called with the JPEG. Throw to show an error.
 *   onClose()         closes the window (disabled while confirming)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, RefreshCcw, X, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

const CSS = `
.ls-overlay { position: fixed; inset: 0; z-index: 2600; display: flex; align-items: center; justify-content: center; padding: 16px;
  background: rgba(3,8,18,.78); backdrop-filter: blur(4px); font-family: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
.ls { width: 100%; max-width: 440px; max-height: calc(100vh - 32px); overflow-y: auto; display: flex; flex-direction: column; gap: 14px;
  padding: 22px; border-radius: 18px; background: #0C1A2E; border: 1px solid #2A3D5C; color: #EEF2F7; box-shadow: 0 24px 60px rgba(0,0,0,.5); }
.ls-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.ls-head h3 { margin: 0; font-size: 18px; font-weight: 700; }
.ls-head p { margin: 4px 0 0; font-size: 13.5px; line-height: 1.5; color: #8A9AB2; }
.ls-x { width: 34px; height: 34px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid #1C2C45; background: transparent; color: #8A9AB2; cursor: pointer; }
.ls-stage { position: relative; aspect-ratio: 3 / 4; width: 100%; border-radius: 14px; overflow: hidden; background: #060D18; }
.ls-stage video, .ls-stage img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.ls-stage video { transform: scaleX(-1); }
.ls-guide { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse 34% 40% at 50% 45%, transparent 98%, rgba(6,13,24,.55) 100%); }
.ls-guide::after { content: ''; position: absolute; left: 50%; top: 45%; width: 68%; height: 80%; transform: translate(-50%, -50%);
  border: 3px dashed rgba(226,174,74,.85); border-radius: 50%; }
.ls-count { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 84px; font-weight: 700; color: #fff; text-shadow: 0 4px 24px rgba(0,0,0,.6); }
.ls-msg { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 24px; text-align: center; font-size: 14px; line-height: 1.55; color: #8A9AB2; }
.ls-msg strong { color: #EEF2F7; font-size: 15px; }
.ls-tips { margin: 0; padding: 0; list-style: none; display: grid; gap: 4px; font-size: 13px; color: #8A9AB2; }
.ls-tips li::before { content: '✓  '; color: #2FD394; }
.ls-err { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-radius: 10px; background: rgba(255,100,112,.08); border: 1px solid rgba(255,100,112,.25); color: #FF6470; font-size: 13.5px; }
.ls-actions { display: flex; gap: 10px; }
.ls-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 48px; border-radius: 12px; border: 1px solid transparent; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer; }
.ls-btn:disabled { opacity: .5; cursor: not-allowed; }
.ls-primary { background: #E2AE4A; color: #07101E; }
.ls-ghost { flex: 0 0 auto; padding: 0 16px; background: transparent; border-color: #2A3D5C; color: #EEF2F7; }
.ls-note { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; color: #56677F; text-align: center; }
.ls-spin { animation: lsSpin .8s linear infinite; }
@keyframes lsSpin { to { transform: rotate(360deg); } }
@media (max-width: 560px) {
  .ls-overlay { align-items: flex-end; padding: 0; }
  .ls { max-width: none; max-height: 96vh; border-radius: 18px 18px 0 0; padding: 18px 16px calc(18px + env(safe-area-inset-bottom)); }
}
`;

const cameraError = (e) => {
  const n = e?.name || '';
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'Camera access is blocked. Allow the camera for this site in your browser settings, then try again.';
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'We couldn’t find a camera. Please use a phone or computer with a front camera.';
  if (n === 'NotReadableError') return 'Your camera is being used by another app. Close it and try again.';
  if (!window.isSecureContext) return 'The camera only works on a secure (https) connection.';
  return 'We couldn’t start your camera. Please try again.';
};

export default function LiveSelfieCapture({ title = 'Take a live selfie', sub, confirmLabel = 'Use this photo', onConfirm, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [phase, setPhase] = useState('starting');   // starting | live | counting | taken | error
  const [count, setCount] = useState(3);
  const [shot, setShot] = useState(null);           // { blob, url }
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const stop = useCallback(() => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; }, []);

  const start = useCallback(async () => {
    setErr(''); setPhase('starting');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('no media'), { name: window.isSecureContext ? 'NotFoundError' : 'SecurityError' });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      setPhase('live');
    } catch (e) {
      setErr(cameraError(e)); setPhase('error');
    }
  }, []);

  useEffect(() => { start(); return stop; }, [start, stop]);
  useEffect(() => () => { if (shot?.url) URL.revokeObjectURL(shot.url); }, [shot]);

  // Escape closes (unless confirming); lock page scroll while open
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') { e.stopPropagation(); if (!busy) onClose?.(); } };
    window.addEventListener('keydown', k, true);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k, true); document.body.style.overflow = prev; };
  }, [busy, onClose]);

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) { setErr('The camera isn’t ready yet. Give it a second and try again.'); return; }
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    ctx.translate(c.width, 0); ctx.scale(-1, 1);          // save it the way the user saw it
    ctx.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((blob) => {
      if (!blob) { setErr('Couldn’t take the photo. Please try again.'); setPhase('live'); return; }
      setShot({ blob, url: URL.createObjectURL(blob) });
      setPhase('taken');
      stop();
    }, 'image/jpeg', 0.9);
  };

  const takeWithCountdown = () => {
    setErr(''); setPhase('counting'); setCount(3);
    let n = 3;
    const t = setInterval(() => {
      n -= 1;
      if (n <= 0) { clearInterval(t); capture(); } else setCount(n);
    }, 800);
  };

  const retake = () => { setShot(null); start(); };

  const confirm = async () => {
    if (!shot || busy) return;
    setBusy(true); setErr('');
    try { await onConfirm(shot.blob); }
    catch (e) { setErr(e?.message || 'Something went wrong. Please try again.'); setBusy(false); }
  };

  return createPortal(
    <div className="ls-overlay" onClick={e => e.stopPropagation()} onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose?.(); }}>
      <style>{CSS}</style>
      <div className="ls" role="dialog" aria-modal="true" aria-label={title}>
        <div className="ls-head">
          <div>
            <h3>{title}</h3>
            <p>{sub || 'For your security, we need a quick live photo to confirm it’s really you.'}</p>
          </div>
          <button type="button" className="ls-x" onClick={onClose} disabled={busy} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="ls-stage">
          <video ref={videoRef} playsInline muted autoPlay style={{ display: phase === 'taken' || phase === 'error' ? 'none' : 'block' }} />
          {(phase === 'live' || phase === 'counting') && <div className="ls-guide" />}
          {phase === 'counting' && <div className="ls-count" aria-live="assertive">{count}</div>}
          {phase === 'taken' && shot && <img src={shot.url} alt="Your selfie" />}
          {phase === 'starting' && <div className="ls-msg"><Loader2 className="ls-spin" />Starting your camera…</div>}
          {phase === 'error' && <div className="ls-msg"><Camera size={32} /><strong>Camera unavailable</strong>{err}</div>}
        </div>

        {phase !== 'taken' && phase !== 'error' && (
          <ul className="ls-tips">
            <li>Put your face inside the oval</li>
            <li>Good light, no sunglasses, hat or mask</li>
          </ul>
        )}

        {err && phase !== 'error' && <div className="ls-err" role="alert"><AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />{err}</div>}

        <div className="ls-actions">
          {phase === 'error' && <button type="button" className="ls-btn ls-primary" onClick={start}><RefreshCcw size={16} />Try again</button>}
          {(phase === 'live' || phase === 'counting' || phase === 'starting') && (
            <button type="button" className="ls-btn ls-primary" disabled={phase !== 'live'} onClick={takeWithCountdown}><Camera size={16} />Take photo</button>
          )}
          {phase === 'taken' && <>
            <button type="button" className="ls-btn ls-ghost" disabled={busy} onClick={retake}><RefreshCcw size={16} />Retake</button>
            <button type="button" className="ls-btn ls-primary" disabled={busy} onClick={confirm}>
              {busy ? <><Loader2 size={16} className="ls-spin" />Confirming…</> : confirmLabel}
            </button>
          </>}
        </div>
        <div className="ls-note"><ShieldCheck size={13} />Stored securely and only seen by our verification team</div>
      </div>
    </div>,
    document.body
  );
}
