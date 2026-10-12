/**
 * welcomeEmail.js
 * Asks the "send-welcome-email" edge function to send the welcome email to the
 * signed-in user. The function builds the email, attaches the registration PDF,
 * sends it and records users.welcome_sent_at, so calling this more than once is
 * harmless — the email only goes out once.
 *
 * The database trigger in supabase/welcome_email_schema.sql also sends it the
 * moment the email address is verified; this call is the backup.
 */
import supabase from '../supabase';

/* invoke() only says "Edge Function returned a non-2xx status code";
   the real reason is in the response body, so read it for the console. */
async function describe(error) {
  try {
    const res = error?.context;
    if (res && typeof res.text === 'function') return `${error.message} — ${res.status}: ${await res.clone().text()}`;
  } catch (_) { /* ignore */ }
  return error?.message || String(error);
}

/**
 * Never throws: a failed email must not block sign-up.
 * Resolves to true if the email was sent now or had already been sent.
 */
export async function sendWelcomeEmail() {
  try {
    const { data, error } = await supabase.functions.invoke('send-welcome-email', { body: {} });
    if (error) { console.error('Welcome email failed:', await describe(error)); return false; }
    if (!data?.sent) console.info('Welcome email:', data?.reason || 'not sent');
    return true;
  } catch (e) {
    console.error('Welcome email failed:', e?.message || e);
    return false;
  }
}
