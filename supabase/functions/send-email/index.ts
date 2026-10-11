// supabase/functions/send-email/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Sends the app's emails (welcome, deposit, withdrawal) through Resend.
//
// Deploy:
//   supabase secrets set RESEND_API_KEY=re_xxx EMAIL_FROM="Profit Gain Signals <noreply@yourdomain.com>"
//   supabase functions deploy send-email
//
// Security: callers must be signed in, and an email can only go to the
// signed-in user's own address. Without that check, anyone with an account
// could use your domain to send arbitrary HTML to anyone (an open relay).
// If you already have a send-email function deployed, keep yours but add the
// same check.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Who is calling?
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return json({ error: "Not signed in" }, 401);

  let payload: { to?: string; subject?: string; html?: string };
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const { to, subject, html } = payload;
  if (!subject || !html) return json({ error: "subject and html are required" }, 400);
  if (to && to.toLowerCase() !== user.email.toLowerCase()) return json({ error: "You can only send email to your own address" }, 403);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: Deno.env.get("EMAIL_FROM"), to: user.email, subject, html }),
  });
  if (!res.ok) return json({ error: `Email provider error: ${await res.text()}` }, 502);
  return json({ ok: true });
});
