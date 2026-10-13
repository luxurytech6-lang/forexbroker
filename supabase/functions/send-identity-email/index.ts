// supabase/functions/send-identity-email/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Emails the user when an admin approves their identity verification.
// Sent once per approved submission (identity_verifications.approval_email_sent_at).
//
// It can be called two ways (both are safe — the email only ever goes out once):
//   1. By the database trigger in 10_identity_email_schema.sql, the moment a
//      submission becomes "approved"
//      (header  x-webhook-secret: <secret>,  body { "verification_id": "<uuid>" }).
//   2. By the admin console right after "Approve", as the signed-in admin
//      (normal Supabase JWT, same body). The caller must be an active admin.
//
// Secrets (Supabase → Edge Functions → Secrets) — the same ones the welcome email uses:
//   RESEND_API_KEY           API key from resend.com
//   EMAIL_FROM               e.g. "Profit Gain Signals <hello@yourdomain.com>" (domain verified in Resend)
//   SITE_URL                 e.g. https://profitgainsignals.com  (links in the email)
//   WELCOME_WEBHOOK_SECRET   the shared secret the database sends (IDENTITY_WEBHOOK_SECRET overrides it)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
//
// Deploy:  supabase functions deploy send-identity-email --no-verify-jwt
// (--no-verify-jwt because the database trigger authenticates with the webhook
//  secret; admin calls are still checked below.)
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const SUPABASE_URL   = env("SUPABASE_URL");
const SERVICE_KEY    = env("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = env("RESEND_API_KEY");
const RESEND_URL     = env("RESEND_API_URL", "https://api.resend.com/emails");
const EMAIL_FROM     = env("EMAIL_FROM", "Profit Gain Signals <onboarding@resend.dev>");
const SITE_URL       = env("SITE_URL", "https://profitgainsignals.com").replace(/\/+$/, "");
const WEBHOOK_SECRET = env("IDENTITY_WEBHOOK_SECRET") || env("WELCOME_WEBHOOK_SECRET");

const BRAND = "Profit Gain Signals";
const SUPPORT_EMAIL = "support@profitgainsignals.com";
const DOC_LABEL: Record<string, string> = {
  passport: "Passport", national_id: "National ID", drivers_license: "Driver’s licence", residence_permit: "Residence permit",
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const esc = (v = "") => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const fmtDate = (d: string | null) =>
  new Date(d || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const maskNumber = (n = "") => {
  const s = String(n).replace(/\s+/g, "");
  return s.length <= 4 ? s : `${"•".repeat(Math.min(6, s.length - 4))}${s.slice(-4)}`;
};

export function approvedHtml(v: { firstName: string; fullName: string; docType: string; docNumber: string; verifiedAt: string | null }) {
  const name = esc(v.firstName || "there");
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:11px 16px;border-bottom:1px solid #1C2C45;font-family:Arial,sans-serif;font-size:13.5px;color:#8A9AB2">${label}</td>
      <td align="right" style="padding:11px 16px;border-bottom:1px solid #1C2C45;font-family:Arial,sans-serif;font-size:13.5px;font-weight:700;color:#EEF2F7">${value}</td>
    </tr>`;
  const unlock = (title: string, text: string) => `
    <tr><td style="padding:0 0 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="30" valign="top" style="padding-top:1px">
          <div style="width:20px;height:20px;border-radius:10px;background:rgba(47,211,148,.15);color:#2FD394;font:700 12px/20px Arial,sans-serif;text-align:center">&#10003;</div>
        </td>
        <td style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#8A9AB2">
          <strong style="color:#EEF2F7">${title}</strong> &mdash; ${text}
        </td>
      </tr></table>
    </td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light">
<title>Your identity is verified</title>
<style>
  @media only screen and (max-width:600px){
    .card{border-radius:0!important;border-left:0!important;border-right:0!important}
    .px{padding-left:22px!important;padding-right:22px!important}
    .h1{font-size:27px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#07101E;-webkit-text-size-adjust:100%">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#07101E;font-size:1px;line-height:1px">
    Good news, ${name} — your identity is verified and every feature on your account is unlocked.&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#07101E">
    <tr><td align="center" style="padding:32px 12px">
      <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#0C1A2E;border:1px solid #1C2C45;border-radius:18px">

        <tr><td style="height:4px;line-height:4px;font-size:0;background:#2FD394;border-radius:18px 18px 0 0">&nbsp;</td></tr>

        <tr><td class="px" style="padding:28px 40px 6px;font-family:Georgia,'Times New Roman',serif">
          <div style="font-size:22px;color:#EEF2F7">Profit Gain <span style="color:#E2AE4A">Signals</span></div>
        </td></tr>

        <tr><td class="px" style="padding:24px 40px 0">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="background:rgba(47,211,148,.12);border:1px solid rgba(47,211,148,.35);border-radius:999px;padding:6px 14px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#2FD394">
              &#10003;&nbsp; Identity verified
            </td>
          </tr></table>
        </td></tr>

        <tr><td class="px" style="padding:16px 40px 6px;font-family:Georgia,'Times New Roman',serif">
          <h1 class="h1" style="margin:0;font-size:31px;line-height:1.2;font-weight:400;color:#EEF2F7">You're verified, ${name}.</h1>
        </td></tr>

        <tr><td class="px" style="padding:10px 40px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#8A9AB2">
          Thanks for confirming who you are. Our team has checked your documents and approved your identity,
          so your account now has full access.
        </td></tr>

        <tr><td class="px" style="padding:0 40px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#112238;border:1px solid #1C2C45;border-radius:12px;border-collapse:separate">
            ${row("Name", esc(v.fullName))}
            ${row("Document", `${esc(DOC_LABEL[v.docType] || v.docType)} &middot; ${esc(maskNumber(v.docNumber))}`)}
            <tr>
              <td style="padding:11px 16px;font-family:Arial,sans-serif;font-size:13.5px;color:#8A9AB2">Verified on</td>
              <td align="right" style="padding:11px 16px;font-family:Arial,sans-serif;font-size:13.5px;font-weight:700;color:#EEF2F7">${esc(fmtDate(v.verifiedAt))}</td>
            </tr>
          </table>
        </td></tr>

        <tr><td class="px" style="padding:26px 40px 6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#EEF2F7">
          What's unlocked
        </td></tr>
        <tr><td class="px" style="padding:6px 40px 4px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${unlock("Withdrawals", "send money out of your wallet whenever you need to")}
            ${unlock("Every way to invest", "stocks, copy trading, hiring a trader, real estate and mining")}
            ${unlock("Your verified badge", "shown on your profile and across the app")}
          </table>
        </td></tr>

        <tr><td class="px" align="center" style="padding:18px 40px 28px">
          <a href="${SITE_URL}/dashboard" style="display:inline-block;background:#E2AE4A;color:#07101E;font:700 15px Arial,sans-serif;text-decoration:none;padding:14px 30px;border-radius:10px">Go to my dashboard</a>
        </td></tr>

        <tr><td class="px" style="padding:0 40px 28px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.22);border-radius:12px">
            <tr><td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#C9A55A">
              <strong style="color:#F2C46B">Didn't submit your documents?</strong>
              Contact us straight away at <a href="mailto:${SUPPORT_EMAIL}" style="color:#F2C46B">${SUPPORT_EMAIL}</a> so we can secure your account.
            </td></tr>
          </table>
        </td></tr>

        <tr><td class="px" style="padding:18px 40px 26px;border-top:1px solid #1C2C45;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;line-height:1.65;color:#56677F">
          Trading and investing involve risk, and you can lose some or all of the money you put in. Past performance doesn't guarantee future results.<br>
          &copy; ${new Date().getFullYear()} ${BRAND} &middot; <a href="${SITE_URL}/settings" style="color:#56677F">Email preferences</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Use POST" });
  if (!RESEND_API_KEY) return json(500, { error: "RESEND_API_KEY is not set" });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));
  const verificationId: string | null = body?.verification_id ?? null;

  // ── Who's asking? The database (webhook secret) or an active admin ─────────
  const secret = req.headers.get("x-webhook-secret");
  if (secret) {
    if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) return json(401, { error: "Bad webhook secret" });
  } else {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data, error } = await admin.auth.getUser(jwt);
    if (error || !data?.user?.email) return json(401, { error: "Sign in first" });
    const { data: adm } = await admin.from("admins").select("id").ilike("email", data.user.email).eq("is_active", true).limit(1);
    if (!Array.isArray(adm) || !adm.length) return json(403, { error: "Admins only" });
  }
  if (!verificationId) return json(400, { error: "verification_id is required" });

  // ── Claim the send (atomic): only an approved, not-yet-emailed row comes back ─
  const { data: claimed, error: claimErr } = await admin
    .from("identity_verifications")
    .update({ approval_email_sent_at: new Date().toISOString() })
    .eq("id", verificationId)
    .eq("status", "approved")
    .is("approval_email_sent_at", null)
    .select("id, user_id, first_name, last_name, document_type, document_number, reviewed_at");
  if (claimErr) return json(500, { error: `Could not read the verification: ${claimErr.message}` });
  const v = Array.isArray(claimed) ? claimed[0] : null;
  if (!v) return json(200, { sent: false, reason: "not approved, already emailed, or not found" });

  const release = () => admin.from("identity_verifications").update({ approval_email_sent_at: null }).eq("id", verificationId);

  const { data: users, error: userErr } = await admin.from("users").select("email, first_name").eq("id", v.user_id).limit(1);
  const user = Array.isArray(users) ? users[0] : null;
  if (userErr || !user?.email) {
    await release();
    return json(404, { error: "User not found" });
  }

  // ── Send ─────────────────────────────────────────────────────────────────
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [user.email],
      reply_to: SUPPORT_EMAIL,
      subject: "Your identity is verified",
      html: approvedHtml({
        firstName: user.first_name || v.first_name,
        fullName: `${v.first_name} ${v.last_name}`,
        docType: v.document_type,
        docNumber: v.document_number,
        verifiedAt: v.reviewed_at,
      }),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    await release();   // let a later call try again
    console.error("Resend error", res.status, detail);
    return json(502, { error: "Email provider rejected the message", status: res.status, detail });
  }
  const out = await res.json().catch(() => ({}));
  return json(200, { sent: true, id: out?.id ?? null, to: user.email });
});
