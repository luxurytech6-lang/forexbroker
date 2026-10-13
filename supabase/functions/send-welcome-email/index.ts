// supabase/functions/send-welcome-email/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Sends the "Welcome to Profit Gain Signals" email, with the registration PDF
// attached, once per user.
//
// It can be called two ways (both are safe — the email only ever goes out once):
//   1. By the database trigger in welcome_email_schema.sql, the moment a user
//      verifies their email (header  x-webhook-secret: <WELCOME_WEBHOOK_SECRET>,
//      body { "user_id": "<uuid>" }).
//   2. By the sign-up page, as the signed-in user (normal Supabase JWT, no body).
//
// Secrets (Supabase → Edge Functions → Secrets, or `supabase secrets set`):
//   RESEND_API_KEY           API key from resend.com
//   EMAIL_FROM               e.g. "Profit Gain Signals <welcome@yourdomain.com>" (domain verified in Resend)
//   SITE_URL                 e.g. https://profitgainsignals.com  (links in the email)
//   WELCOME_WEBHOOK_SECRET   any long random string; the same value goes in the database vault
//   REG_DOC_URL  (optional)  public URL of the registration PDF; defaults to SITE_URL/docs/reg.pdf
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
//
// Deploy:  supabase functions deploy send-welcome-email --no-verify-jwt
// (--no-verify-jwt because the database trigger authenticates with the webhook
//  secret; browser calls are still checked below with auth.getUser.)
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const SUPABASE_URL   = env("SUPABASE_URL");
const SERVICE_KEY    = env("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = env("RESEND_API_KEY");
const RESEND_URL     = env("RESEND_API_URL", "https://api.resend.com/emails");
const EMAIL_FROM     = env("EMAIL_FROM", "Profit Gain Signals <onboarding@resend.dev>");
const SITE_URL       = env("SITE_URL", "https://profitgainsignals.com").replace(/\/+$/, "");
const REG_DOC_URL    = env("REG_DOC_URL", `${SITE_URL}/docs/reg.pdf`);
const WEBHOOK_SECRET = env("WELCOME_WEBHOOK_SECRET");

const BRAND = "Profit Gain Signals";
const SUPPORT_EMAIL = "support@profitgainsignals.com";
const REG_DOC_NAME = "ProfitGainSignal-Registration.pdf";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

/* bytes → base64 (chunked so large PDFs don't overflow the call stack) */
function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

const esc = (v = "") => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function welcomeHtml(firstName: string, hasAttachment: boolean) {
  const name = esc(firstName || "there");
  const step = (n: number, title: string, text: string, href: string, cta: string) => `
    <tr><td style="padding:0 0 14px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#112238;border:1px solid #1C2C45;border-radius:12px">
        <tr>
          <td width="56" valign="top" style="padding:18px 0 18px 18px">
            <div style="width:32px;height:32px;border-radius:16px;background:#E2AE4A;color:#07101E;font:700 14px/32px Arial,sans-serif;text-align:center">${n}</div>
          </td>
          <td style="padding:16px 18px 16px 4px;font-family:Arial,sans-serif">
            <div style="font-size:15px;font-weight:700;color:#EEF2F7;margin-bottom:4px">${title}</div>
            <div style="font-size:14px;line-height:1.55;color:#8A9AB2;margin-bottom:10px">${text}</div>
            <a href="${SITE_URL}${href}" style="font-size:14px;font-weight:700;color:#E2AE4A;text-decoration:none">${cta} &rarr;</a>
          </td>
        </tr>
      </table>
    </td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to ${BRAND}</title></head>
<body style="margin:0;padding:0;background:#07101E">
  <div style="display:none;max-height:0;overflow:hidden">Your ${BRAND} account is ready. Here's how to get started.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07101E">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0C1A2E;border:1px solid #1C2C45;border-radius:18px">
        <tr><td style="padding:32px 36px 8px;font-family:Georgia,'Times New Roman',serif">
          <div style="font-size:22px;color:#EEF2F7">Profit Gain <span style="color:#E2AE4A">Signals</span></div>
        </td></tr>
        <tr><td style="padding:16px 36px 8px;font-family:Georgia,'Times New Roman',serif">
          <div style="font-size:32px;line-height:1.15;color:#EEF2F7">Welcome, ${name}.</div>
        </td></tr>
        <tr><td style="padding:8px 36px 24px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#8A9AB2">
          Your account is set up and ready. Three quick steps and you can place your first investment.
        </td></tr>
        <tr><td style="padding:0 36px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${step(1, "Verify your identity", "Confirm who you are so deposits and withdrawals aren’t held up later.", "/verify-identity", "Verify now")}
            ${step(2, "Fund your wallet", "Add money to your USD wallet. It funds trading, copy trading, property and your card.", "/payments", "Add funds")}
            ${step(3, "Choose how to invest", "Trade stocks yourself, copy or hire a trader, or buy shares of rental property.", "/dashboard", "Go to your dashboard")}
          </table>
        </td></tr>
        <tr><td style="padding:4px 36px 8px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px dashed #2A3D5C;border-radius:12px">
            <tr><td style="padding:14px 18px;font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#8A9AB2">
              <strong style="color:#EEF2F7">Your registration document</strong><br>
              ${hasAttachment ? "It’s attached to this email. " : ""}Keep a copy for your records.
              <a href="${esc(REG_DOC_URL)}" style="color:#E2AE4A;font-weight:700;text-decoration:none">Download the PDF &rarr;</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:12px 36px 28px" align="center">
          <a href="${SITE_URL}/dashboard" style="display:inline-block;background:#E2AE4A;color:#07101E;font:700 15px Arial,sans-serif;text-decoration:none;padding:14px 28px;border-radius:10px">Open my account</a>
        </td></tr>
        <tr><td style="padding:0 36px 28px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#8A9AB2">
          Questions? Reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}" style="color:#E2AE4A">${SUPPORT_EMAIL}</a>.
          If you didn’t create this account, contact us straight away.
        </td></tr>
        <tr><td style="padding:18px 36px 24px;border-top:1px solid #1C2C45;font-family:Arial,sans-serif;font-size:11.5px;line-height:1.6;color:#56677F">
          Trading and investing involve risk, and you can lose some or all of the money you put in. Past performance doesn’t guarantee future results.<br>
          &copy; ${new Date().getFullYear()} ${BRAND} &middot; <a href="${SITE_URL}/settings" style="color:#56677F">Email preferences</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* Registration PDF as a base64 attachment; null if it can't be fetched (the email still goes, with the link) */
async function loadPdf(): Promise<string | null> {
  try {
    const res = await fetch(REG_DOC_URL);
    if (!res.ok) { console.warn(`reg.pdf: HTTP ${res.status} from ${REG_DOC_URL}`); return null; }
    const type = res.headers.get("content-type") || "";
    if (!type.includes("pdf")) { console.warn(`reg.pdf: ${REG_DOC_URL} returned ${type}, not a PDF`); return null; }
    return toBase64(new Uint8Array(await res.arrayBuffer()));
  } catch (e) {
    console.warn("reg.pdf: fetch failed", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Use POST" });
  if (!RESEND_API_KEY) return json(500, { error: "RESEND_API_KEY is not set" });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // ── Who is this for? ─────────────────────────────────────────────────────
  let userId: string | null = null;
  const secret = req.headers.get("x-webhook-secret");
  if (secret) {
    if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) return json(401, { error: "Bad webhook secret" });
    const body = await req.json().catch(() => ({}));
    userId = body?.user_id ?? null;
  } else {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data, error } = await admin.auth.getUser(jwt);
    if (error || !data?.user) return json(401, { error: "Sign in first" });
    userId = data.user.id;
  }
  if (!userId) return json(400, { error: "user_id is required" });

  // ── Claim the send (atomic): only one caller gets the row back ─────────────
  const { data: claimed, error: claimErr } = await admin
    .from("users")
    .update({ welcome_sent_at: new Date().toISOString() })
    .eq("id", userId)
    .is("welcome_sent_at", null)
    .select("id, email, first_name");
  if (claimErr) return json(500, { error: `Could not read the user: ${claimErr.message}` });
  const user = Array.isArray(claimed) ? claimed[0] : null;
  if (!user?.email) return json(200, { sent: false, reason: "already sent or no such user" });

  // ── Send ─────────────────────────────────────────────────────────────────
  const pdf = await loadPdf();
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [user.email],
      reply_to: SUPPORT_EMAIL,
      subject: `Welcome to ${BRAND}, ${user.first_name || "there"}`,
      html: welcomeHtml(user.first_name, !!pdf),
      attachments: pdf ? [{ filename: REG_DOC_NAME, content: pdf }] : undefined,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    // Release the claim so a later call (or a retry) can try again
    await admin.from("users").update({ welcome_sent_at: null }).eq("id", userId);
    console.error("Resend error", res.status, detail);
    return json(502, { error: "Email provider rejected the message", status: res.status, detail });
  }

  const out = await res.json().catch(() => ({}));
  return json(200, { sent: true, id: out?.id ?? null, attachment: !!pdf });
});
