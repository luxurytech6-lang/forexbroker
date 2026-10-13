/**
 * accountState.js — one place to read the signed-in user's account controls
 * and identity verification (see database/09_identity_account_schema.sql).
 *
 *   account      'active' | 'suspended' | 'locked'
 *   withdrawals  'active' | 'suspended' | 'locked'
 *   identity     'verified' | 'pending' | 'rejected' | 'none'
 *
 * Suspensions with an end date lift by themselves; the database works that
 * out, so the app never has to.
 */
import { useEffect, useState } from 'react';
import supabase from '../supabase';

export const IDENTITY_BUCKET = 'identity-documents';

const ACTIVE = { account: 'active', withdrawals: 'active' };

const effective = (status, until) => {
  const s = String(status || 'active').toLowerCase();
  if (['locked', 'banned', 'blocked', 'disabled'].includes(s)) return 'locked';
  if (['suspended', 'inactive'].includes(s) && (!until || new Date(until) > new Date())) return 'suspended';
  return 'active';
};

/** Account + withdrawal controls for the signed-in user. Never throws. */
export async function fetchAccountState() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const { data, error } = await supabase.rpc('my_account_state');
    if (!error && data) return { ...ACTIVE, ...data, userId: session.user.id };

    // Fallback if 09_identity_account_schema.sql hasn't been run yet
    const { data: u } = await supabase.from('users').select('*').eq('id', session.user.id).maybeSingle();
    if (!u) return { ...ACTIVE, userId: session.user.id };
    return {
      account: effective(u.status, u.status_until), account_reason: u.status_reason || null, account_until: u.status_until || null,
      withdrawals: effective(u.withdrawal_status, u.withdrawal_until), withdrawal_reason: u.withdrawal_reason || null,
      withdrawal_until: u.withdrawal_until || null, is_verified: !!u.is_verified, userId: session.user.id,
    };
  } catch (_) {
    return null;
  }
}

/** Latest identity submission + overall identity state. */
export async function fetchIdentity(userId) {
  const [{ data: u }, { data: rows, error }] = await Promise.all([
    supabase.from('users').select('is_verified').eq('id', userId).maybeSingle(),
    supabase.from('identity_verifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
  ]);
  const latest = error ? null : (rows || [])[0] || null;
  const verified = !!u?.is_verified || latest?.status === 'approved';
  return {
    verified,
    latest,
    state: verified ? 'verified' : latest?.status === 'pending' ? 'pending' : latest?.status === 'rejected' ? 'rejected' : 'none',
    tableMissing: !!error && /does not exist|could not find the table|PGRST205|42P01/i.test(`${error.code} ${error.message}`),
  };
}

/** React hook: { state, reload }. state is null while loading. */
export function useAccountState() {
  const [state, setState] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    fetchAccountState().then(s => { if (live) setState(s || ACTIVE); });
    return () => { live = false; };
  }, [tick]);
  return { state, reload: () => setTick(t => t + 1) };
}

export const fmtUntil = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/** Plain-English explanation for a blocked action (used by forms). */
export function restrictionMessage(s, { withdrawal = false } = {}) {
  if (!s) return '';
  if (s.account === 'locked') return 'Your account is locked. Please contact support.';
  if (s.account === 'suspended') return `Your account is suspended${s.account_until ? ` until ${fmtUntil(s.account_until)}` : ''}. Deposits, withdrawals, investments and trades are paused.`;
  if (withdrawal && s.withdrawals === 'locked') return 'Withdrawals are locked on your account. Please contact support.';
  if (withdrawal && s.withdrawals === 'suspended') return `Withdrawals are on hold for your account${s.withdrawal_until ? ` until ${fmtUntil(s.withdrawal_until)}` : ''}.`;
  return '';
}
