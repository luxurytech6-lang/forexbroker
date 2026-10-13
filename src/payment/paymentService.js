/**
 * paymentService.js
 * ─────────────────────────────────────────────────────────────
 * Profit Gain Signals – Payment page backend service layer
 *
 * Covers:
 *  1. Auth helpers  (get current user + session)
 *  2. Wallet data   (fetch user wallets from DB)
 *  3. Subscription  (fetch plans + active subscription)
 *  4. Transactions  (fetch history, deposit, withdraw)
 *  5. Email         (deposit confirmed, withdrawal requested)
 *  6. Metrics       (aggregate balance, deposited, withdrawn)
 *
 * Dependencies: supabase client at ../supabase
 * Email: Supabase Edge Function  "send-email"  (wraps Resend / SendGrid)
 * ─────────────────────────────────────────────────────────────
 */

import supabase from '../supabase';

// ─── 1. AUTH ─────────────────────────────────────────────────

/**
 * Returns the current authenticated user, or null.
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Returns full user profile row from the `users` table.
 * Includes first_name, last_name, email, currency, country_name, plan, avatar_url.
 */
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, handle, avatar_url, plan, currency, country_name, dial_code')
    .eq('id', userId)
    .single();

  if (error) throw new Error(`getUserProfile: ${error.message}`);
  return data;
}

// ─── 2. WALLETS ──────────────────────────────────────────────

/**
 * Fetches all wallets for the current user.
 * Returns array of { id, currency, balance }.
 */
export async function fetchUserWallets(userId) {
  const { data, error } = await supabase
    .from('wallets')
    .select('id, currency, balance, created_at')
    .eq('user_id', userId)
    .order('currency');

  if (error) throw new Error(`fetchUserWallets: ${error.message}`);
  return data ?? [];
}

/**
 * Get a single wallet by currency for the user (e.g. 'USD').
 */
export async function getWalletByCurrency(userId, currency) {
  const { data, error } = await supabase
    .from('wallets')
    .select('id, currency, balance')
    .eq('user_id', userId)
    .eq('currency', currency.toUpperCase())
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(`getWalletByCurrency: ${error.message}`);
  return data ?? null;
}

/**
 * Upsert a wallet (create if missing).
 * Called before a deposit to ensure the wallet row exists.
 */
export async function ensureWallet(userId, currency) {
  const { data, error } = await supabase
    .from('wallets')
    .upsert(
      { user_id: userId, currency: currency.toUpperCase(), balance: 0 },
      { onConflict: 'user_id,currency', ignoreDuplicates: true }
    )
    .select()
    .single();

  if (error) throw new Error(`ensureWallet: ${error.message}`);
  return data;
}

// ─── 3. SUBSCRIPTION PLANS ───────────────────────────────────

/**
 * Fetches all subscription plans from the DB.
 * Returns [{ id, name, monthly_price, annual_price, features, ... }]
 */
export async function fetchSubscriptionPlans() {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('monthly_price');

  if (error) throw new Error(`fetchSubscriptionPlans: ${error.message}`);
  return data ?? [];
}

/**
 * Fetches the user's current active subscription with plan details.
 * Returns null if no active subscription.
 */
export async function fetchActiveSubscription(userId) {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select(`
      id, billing_cycle, status, current_period_start, current_period_end,
      subscription_plans ( id, name, monthly_price, annual_price, features )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`fetchActiveSubscription: ${error.message}`);
  return data ?? null;
}

/**
 * Upgrades the user to a new subscription plan.
 * Cancels existing active sub (sets status = 'cancelled'), inserts new one.
 */
export async function upgradeSubscription(userId, planId, billingCycle = 'monthly') {
  // Cancel current active sub
  await supabase
    .from('user_subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'active');

  const now = new Date();
  const periodEnd = new Date(now);
  billingCycle === 'annual'
    ? periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    : periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { data, error } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: userId,
      plan_id: planId,
      billing_cycle: billingCycle,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`upgradeSubscription: ${error.message}`);

  // Also update users.plan column for quick reads
  await supabase
    .from('users')
    .update({ plan: data.id })
    .eq('id', userId);

  return data;
}

// ─── 4. TRANSACTIONS ─────────────────────────────────────────

/**
 * Fetch paginated transaction history for the user.
 * @param {string} userId
 * @param {{ type?: string, search?: string, page?: number, pageSize?: number }} opts
 */
export async function fetchTransactions(userId, opts = {}) {
  const { type = 'all', search = '', page = 0, pageSize = 20 } = opts;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('transactions')
    .select('id, type, amount, currency, fee, net_amount, status, description, reference, invoice_number, created_at, payment_methods(type, label)', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (type !== 'all') {
    query = query.eq('type', type);
  }
  if (search.trim()) {
    query = query.ilike('description', `%${search.trim()}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`fetchTransactions: ${error.message}`);
  return { transactions: data ?? [], total: count ?? 0 };
}

/**
 * Aggregate metrics: total balance, total deposited, total withdrawn.
 */
export async function fetchPaymentMetrics(userId) {
  // Sum wallets for total balance (USD equivalent – for now raw sum)
  const { data: wallets } = await supabase
    .from('wallets')
    .select('currency, balance')
    .eq('user_id', userId);

  // Sum completed deposits
  const { data: deposited } = await supabase
    .from('transactions')
    .select('net_amount')
    .eq('user_id', userId)
    .eq('type', 'deposit')
    .eq('status', 'completed');

  // Sum completed withdrawals
  const { data: withdrawn } = await supabase
    .from('transactions')
    .select('net_amount')
    .eq('user_id', userId)
    .eq('type', 'withdrawal')
    .eq('status', 'completed');

  const totalDeposited = (deposited ?? []).reduce((s, r) => s + Number(r.net_amount), 0);
  const totalWithdrawn = (withdrawn ?? []).reduce((s, r) => s + Number(r.net_amount), 0);
  const totalBalance   = (wallets ?? []).reduce((s, r) => s + Number(r.balance), 0);

  return { totalBalance, totalDeposited, totalWithdrawn };
}

// ─── 5. DEPOSIT ──────────────────────────────────────────────

/**
 * Records a completed deposit transaction and updates wallet balance.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.currency    e.g. 'USD'
 * @param {number} params.amount      gross amount
 * @param {string} params.method      'crypto' | 'bank'
 * @param {string} [params.reference] blockchain tx hash / bank ref
 * @param {string} [params.description]
 * @returns {object} created transaction row
 */
export async function recordDeposit({ userId, currency, amount, method, reference = null, description = null }) {
  const FEE_RATE = 0.001; // 0.1%
  const fee = parseFloat((amount * FEE_RATE).toFixed(8));
  const netAmount = parseFloat((amount - fee).toFixed(8));
  const invoiceNum = `TF-DEP-${Date.now()}`;

  // Ensure wallet exists
  const wallet = await ensureWallet(userId, currency);

  // Insert transaction record (status = completed for crypto after confirmation)
  const { data: txn, error: txnErr } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      wallet_id: wallet.id,
      type: 'deposit',
      amount,
      currency: currency.toUpperCase(),
      fee,
      net_amount: netAmount,
      status: 'completed',
      reference,
      description: description ?? `Deposit via ${method}`,
      invoice_number: invoiceNum,
    })
    .select()
    .single();

  if (txnErr) throw new Error(`recordDeposit (insert txn): ${txnErr.message}`);

  // Credit wallet balance
  const { error: walletErr } = await supabase.rpc('increment_wallet_balance', {
    p_wallet_id: wallet.id,
    p_amount: netAmount,
  });

  if (walletErr) {
    // Fallback: manual update if RPC not available
    await supabase
      .from('wallets')
      .update({ balance: wallet.balance + netAmount })
      .eq('id', wallet.id);
  }

  // Create in-app notification
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'deposit_confirmed',
    title: 'Deposit Confirmed',
    body: `Your deposit of ${currency} ${netAmount.toFixed(2)} has been credited to your wallet.`,
    is_read: false,
  });

  return txn;
}

// ─── 6. WITHDRAWAL ───────────────────────────────────────────

/**
 * Records a withdrawal request and debits wallet balance.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.currency
 * @param {number} params.amount       gross amount requested
 * @param {string} params.method       'bank' | 'crypto'
 * @param {string} [params.destination] account / address
 * @param {string} [params.description]
 * @returns {object} created transaction row
 */
export async function recordWithdrawal({ userId, currency, amount, method, destination = null, description = null }) {
  const FEE_RATE = 0.002; // 0.2%
  const fee = parseFloat((amount * FEE_RATE).toFixed(8));
  const netAmount = parseFloat((amount - fee).toFixed(8));
  const invoiceNum = `TF-WDR-${Date.now()}`;

  // Check wallet balance
  const wallet = await getWalletByCurrency(userId, currency);
  if (!wallet) throw new Error('Wallet not found.');
  if (Number(wallet.balance) < amount) throw new Error('Insufficient balance.');

  // Insert transaction record (status = pending until processed)
  const { data: txn, error: txnErr } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      wallet_id: wallet.id,
      type: 'withdrawal',
      amount,
      currency: currency.toUpperCase(),
      fee,
      net_amount: netAmount,
      status: 'pending',
      description: description ?? `Withdrawal via ${method}${destination ? ' to ' + destination : ''}`,
      invoice_number: invoiceNum,
    })
    .select()
    .single();

  if (txnErr) throw new Error(`recordWithdrawal (insert txn): ${txnErr.message}`);

  // Debit wallet (reserve funds)
  const { error: walletErr } = await supabase.rpc('decrement_wallet_balance', {
    p_wallet_id: wallet.id,
    p_amount: amount,
  });

  if (walletErr) {
    await supabase
      .from('wallets')
      .update({ balance: Number(wallet.balance) - amount })
      .eq('id', wallet.id);
  }

  // Create in-app notification
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'withdrawal_requested',
    title: 'Withdrawal Requested',
    body: `Your withdrawal of ${currency} ${netAmount.toFixed(2)} via ${method} is being processed.`,
    is_read: false,
  });

  return txn;
}

// ─── 7. EMAIL NOTIFICATIONS ──────────────────────────────────
//
// Calls the Supabase Edge Function "send-email".
// Deploy it at: supabase/functions/send-email/index.ts
// It should accept { to, subject, html } and call your email provider
// (Resend, SendGrid, etc.).
//
// Example Edge Function stub:
//   import { serve } from "https://deno.land/std/http/server.ts";
//   import { Resend } from "npm:resend";
//   const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
//   serve(async (req) => {
//     const { to, subject, html } = await req.json();
//     await resend.emails.send({ from: "noreply@profitgainsignal.com", to, subject, html });
//     return new Response("ok");
//   });
// ─────────────────────────────────────────────────────────────

/**
 * Low-level email dispatcher via Supabase Edge Function.
 */
async function sendEmail({ to, subject, html }) {
  const { error } = await supabase.functions.invoke('send-email', {
    body: { to, subject, html },
  });
  if (error) console.error('sendEmail error:', error.message);
}

/**
 * Sends a "Deposit Confirmed" email to the user.
 */
export async function sendDepositEmail({ email, firstName, amount, currency, method, reference, invoiceNumber, date }) {
  const formatted = `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const subject = `✅ Deposit of ${formatted} Confirmed — Profit Gain Signals`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #080b10; color: #e2e8f0; margin:0; padding:0; }
    .wrap { max-width: 540px; margin: 40px auto; background: #0e1219; border: 1px solid #1e2535; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0e1219 0%, #141922 100%); padding: 36px 40px 24px; border-bottom: 1px solid #1e2535; text-align: center; }
    .logo { font-size: 22px; font-weight: 700; color: #e2e8f0; letter-spacing: -.3px; }
    .logo span { color: #E2AE4A; }
    .icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(52,211,153,.15); display: flex; align-items: center; justify-content: center; margin: 20px auto 12px; font-size: 28px; }
    .title { font-size: 22px; font-weight: 700; color: #e2e8f0; margin: 0 0 6px; }
    .sub { font-size: 14px; color: #64748b; }
    .body { padding: 32px 40px; }
    .amount-box { background: rgba(52,211,153,.08); border: 1px solid rgba(52,211,153,.25); border-radius: 12px; padding: 20px 24px; text-align: center; margin-bottom: 28px; }
    .amount-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px; }
    .amount-val { font-size: 32px; font-weight: 700; color: #34d399; font-family: monospace; letter-spacing: -1px; }
    .amount-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    .details { background: #141922; border: 1px solid #1e2535; border-radius: 10px; padding: 16px 20px; margin-bottom: 28px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e2535; font-size: 13px; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #64748b; }
    .detail-val { color: #e2e8f0; font-weight: 600; }
    .footer { padding: 20px 40px; border-top: 1px solid #1e2535; text-align: center; font-size: 11px; color: #374151; }
    .cta { display: block; background: #E2AE4A; color: #000; font-weight: 700; font-size: 14px; text-align: center; padding: 14px 24px; border-radius: 10px; text-decoration: none; margin: 0 auto 24px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="logo">Profit Gain <span>Signals</span></div>
      <div class="icon">✅</div>
      <div class="title">Deposit Confirmed</div>
      <div class="sub">Hi ${firstName}, your funds have landed.</div>
    </div>
    <div class="body">
      <div class="amount-box">
        <div class="amount-label">Amount Credited</div>
        <div class="amount-val">${formatted}</div>
        <div class="amount-sub">Successfully deposited to your ${currency} Wallet</div>
      </div>
      <div class="details">
        <div class="detail-row"><span class="detail-label">Method</span><span class="detail-val">${method}</span></div>
        <div class="detail-row"><span class="detail-label">Invoice</span><span class="detail-val">${invoiceNumber}</span></div>
        ${reference ? `<div class="detail-row"><span class="detail-label">Reference</span><span class="detail-val">${reference}</span></div>` : ''}
        <div class="detail-row"><span class="detail-label">Date</span><span class="detail-val">${date}</span></div>
        <div class="detail-row"><span class="detail-label">Status</span><span class="detail-val" style="color:#34d399">Completed</span></div>
      </div>
      <a href="https://profitgainsignal.com/payments" class="cta">View Wallet →</a>
      <p style="font-size:12px;color:#64748b;text-align:center;line-height:1.6;">
        If you did not initiate this deposit, please <a href="mailto:support@profitgainsignal.com" style="color:#E2AE4A;">contact support</a> immediately.
      </p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Profit Gain Signals · <a href="https://profitgainsignal.com/settings" style="color:#64748b;">Manage notifications</a>
    </div>
  </div>
</body>
</html>`;

  await sendEmail({ to: email, subject, html });
}

/**
 * Sends a "Withdrawal Requested" email to the user.
 */
export async function sendWithdrawalEmail({ email, firstName, amount, currency, netAmount, fee, method, destination, invoiceNumber, date }) {
  const fmtGross = `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const fmtNet   = `${currency} ${Number(netAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const fmtFee   = `${currency} ${Number(fee).toFixed(2)}`;
  const subject  = `⏳ Withdrawal of ${fmtGross} Requested — Profit Gain Signals`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #080b10; color: #e2e8f0; margin:0; padding:0; }
    .wrap { max-width: 540px; margin: 40px auto; background: #0e1219; border: 1px solid #1e2535; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0e1219 0%, #141922 100%); padding: 36px 40px 24px; border-bottom: 1px solid #1e2535; text-align: center; }
    .logo { font-size: 22px; font-weight: 700; color: #e2e8f0; letter-spacing: -.3px; }
    .logo span { color: #E2AE4A; }
    .icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(96,165,250,.15); margin: 20px auto 12px; font-size: 28px; line-height: 64px; text-align: center; }
    .title { font-size: 22px; font-weight: 700; color: #e2e8f0; margin: 0 0 6px; }
    .sub { font-size: 14px; color: #64748b; }
    .body { padding: 32px 40px; }
    .amount-box { background: rgba(96,165,250,.08); border: 1px solid rgba(96,165,250,.25); border-radius: 12px; padding: 20px 24px; text-align: center; margin-bottom: 28px; }
    .amount-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px; }
    .amount-val { font-size: 32px; font-weight: 700; color: #60a5fa; font-family: monospace; letter-spacing: -1px; }
    .amount-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    .details { background: #141922; border: 1px solid #1e2535; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e2535; font-size: 13px; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #64748b; }
    .detail-val { color: #e2e8f0; font-weight: 600; }
    .warning { background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.2); border-radius: 10px; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; color: #f59e0b; line-height: 1.6; }
    .footer { padding: 20px 40px; border-top: 1px solid #1e2535; text-align: center; font-size: 11px; color: #374151; }
    .cta { display: block; background: rgba(96,165,250,.15); color: #60a5fa; font-weight: 700; font-size: 14px; text-align: center; padding: 14px 24px; border-radius: 10px; text-decoration: none; border: 1px solid rgba(96,165,250,.3); margin: 0 auto 24px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="logo">Profit Gain <span>Signals</span></div>
      <div class="icon">⬆️</div>
      <div class="title">Withdrawal Requested</div>
      <div class="sub">Hi ${firstName}, your withdrawal is being processed.</div>
    </div>
    <div class="body">
      <div class="amount-box">
        <div class="amount-label">Amount Requested</div>
        <div class="amount-val">${fmtGross}</div>
        <div class="amount-sub">You'll receive <strong style="color:#e2e8f0">${fmtNet}</strong> after fees</div>
      </div>
      <div class="details">
        <div class="detail-row"><span class="detail-label">Method</span><span class="detail-val">${method}</span></div>
        ${destination ? `<div class="detail-row"><span class="detail-label">Destination</span><span class="detail-val" style="font-family:monospace;font-size:11px">${destination}</span></div>` : ''}
        <div class="detail-row"><span class="detail-label">Processing Fee</span><span class="detail-val" style="color:#f87171">−${fmtFee}</span></div>
        <div class="detail-row"><span class="detail-label">You Receive</span><span class="detail-val" style="color:#60a5fa">${fmtNet}</span></div>
        <div class="detail-row"><span class="detail-label">Invoice</span><span class="detail-val">${invoiceNumber}</span></div>
        <div class="detail-row"><span class="detail-label">Date</span><span class="detail-val">${date}</span></div>
        <div class="detail-row"><span class="detail-label">Status</span><span class="detail-val" style="color:#f59e0b">Pending Processing</span></div>
      </div>
      <div class="warning">
        ⚠️ Withdrawals are subject to a 24-hour security review. Processing typically completes within 1–3 business days.
        If you did not initiate this request, <a href="mailto:support@profitgainsignal.com" style="color:#f59e0b;">contact support immediately</a>.
      </div>
      <a href="https://profitgainsignal.com/payments?tab=history" class="cta">View Transaction History →</a>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Profit Gain Signals · <a href="https://profitgainsignal.com/settings" style="color:#64748b;">Manage notifications</a>
    </div>
  </div>
</body>
</html>`;

  await sendEmail({ to: email, subject, html });
}

// ─── 8. CURRENCY HELPER ──────────────────────────────────────

/**
 * Returns the user's preferred currency from their profile.
 * Falls back to 'USD'.
 */
export async function getUserCurrency(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('currency')
    .eq('id', userId)
    .single();

  if (error || !data?.currency) return 'USD';
  return data.currency;
}

// ─── 9. SIDEBAR / NAV DATA ───────────────────────────────────

/**
 * Fetch the data needed for the sidebar portfolio pill:
 * latest portfolio snapshot for the user.
 */
export async function fetchSidebarData(userId) {
  const { data: snapshot } = await supabase
    .from('portfolio_snapshots')
    .select('total_value, daily_pnl')
    .eq('user_id', userId)
    .order('snapped_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: profile } = await supabase
    .from('users')
    .select('first_name, last_name, plan, avatar_url')
    .eq('id', userId)
    .single();

  return {
    portfolioValue: snapshot?.total_value ?? 0,
    dailyPnl: snapshot?.daily_pnl ?? 0,
    profile: profile ?? {},
  };
}

// ─── 10. PAYMENT METHODS ─────────────────────────────────────

/**
 * Fetch saved payment methods for a user.
 */
export async function fetchPaymentMethods(userId) {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('id, type, label, is_default, created_at')
    .eq('user_id', userId)
    .order('is_default', { ascending: false });

  if (error) throw new Error(`fetchPaymentMethods: ${error.message}`);
  return data ?? [];
}

// ─── 11. CRYPTO WALLET ADDRESSES ─────────────────────────────
//
// Platform deposit addresses are now stored in the dedicated
// `platform_crypto_wallets` table (see seed.sql).
// No adminUserId needed – these are platform-wide, not per-user.
// ─────────────────────────────────────────────────────────────

/**
 * Fetches a single platform crypto deposit address by coin symbol.
 *
 * @param {string} symbol  e.g. 'BTC' | 'ETH' | 'USDT' | 'BNB' | 'SOL'
 * @returns {{ symbol, name, network, address, icon, color } | null}
 */
export async function fetchCryptoWalletAddress(symbol) {
  const { data, error } = await supabase
    .from('platform_crypto_wallets')
    .select('symbol, name, network, address, icon, color, is_default')
    .eq('symbol', symbol.toUpperCase())
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`fetchCryptoWalletAddress: ${error.message}`);
  }
  return data ?? null;
}

/**
 * Fetches ALL active platform crypto deposit addresses.
 *
 * @returns {Array<{ symbol, name, network, address, icon, color, is_default }>}
 */
export async function fetchAllCryptoWalletAddresses() {
  const { data, error } = await supabase
    .from('platform_crypto_wallets')
    .select('symbol, name, network, address, icon, color, is_default')
    .eq('is_active', true)
    .order('id');

  if (error) throw new Error(`fetchAllCryptoWalletAddresses: ${error.message}`);
  return data ?? [];
}