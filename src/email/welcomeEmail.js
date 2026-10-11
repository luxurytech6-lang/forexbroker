/**
 * welcomeEmail.js
 * Sends the "Welcome to Profit Gain Signals" email once registration is complete.
 * Uses the same Supabase Edge Function ("send-email") as the deposit and
 * withdrawal emails in payment/paymentService.js.
 */
import supabase from '../supabase';

const BRAND = 'Profit Gain Signals';
const SUPPORT_EMAIL = 'support@profitgainsignals.com';

const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

function welcomeHtml({ firstName, origin }) {
  const name = esc(firstName || 'there');
  const step = (n, title, text, href, cta) => `
    <tr><td style="padding:0 0 14px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#112238;border:1px solid #1C2C45;border-radius:12px">
        <tr>
          <td width="56" valign="top" style="padding:18px 0 18px 18px">
            <div style="width:32px;height:32px;border-radius:16px;background:#E2AE4A;color:#07101E;font:700 14px/32px Arial,sans-serif;text-align:center">${n}</div>
          </td>
          <td style="padding:16px 18px 16px 4px;font-family:Arial,sans-serif">
            <div style="font-size:15px;font-weight:700;color:#EEF2F7;margin-bottom:4px">${title}</div>
            <div style="font-size:14px;line-height:1.55;color:#8A9AB2;margin-bottom:10px">${text}</div>
            <a href="${origin}${href}" style="font-size:14px;font-weight:700;color:#E2AE4A;text-decoration:none">${cta} &rarr;</a>
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
            ${step(1, 'Verify your identity', 'Confirm who you are so deposits and withdrawals aren’t held up later.', '/profile', 'Verify now')}
            ${step(2, 'Fund your wallet', 'Add money to your USD wallet. It funds trading, copy trading, property and your card.', '/payments', 'Add funds')}
            ${step(3, 'Choose how to invest', 'Trade stocks yourself, copy or hire a trader, or buy shares of rental property.', '/dashboard', 'Go to your dashboard')}
          </table>
        </td></tr>
        <tr><td style="padding:12px 36px 28px" align="center">
          <a href="${origin}/dashboard" style="display:inline-block;background:#E2AE4A;color:#07101E;font:700 15px Arial,sans-serif;text-decoration:none;padding:14px 28px;border-radius:10px">Open my account</a>
        </td></tr>
        <tr><td style="padding:0 36px 28px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#8A9AB2">
          Questions? Reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}" style="color:#E2AE4A">${SUPPORT_EMAIL}</a>.
          If you didn’t create this account, contact us straight away.
        </td></tr>
        <tr><td style="padding:18px 36px 24px;border-top:1px solid #1C2C45;font-family:Arial,sans-serif;font-size:11.5px;line-height:1.6;color:#56677F">
          Trading and investing involve risk, and you can lose some or all of the money you put in. Past performance doesn’t guarantee future results.<br>
          &copy; ${new Date().getFullYear()} ${BRAND} &middot; <a href="${origin}/settings" style="color:#56677F">Email preferences</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Sends the welcome email. Never throws: a failed email must not block sign-up.
 * Returns true if the email function accepted it.
 */
export async function sendWelcomeEmail({ email, firstName }) {
  if (!email) return false;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        subject: `Welcome to ${BRAND}, ${firstName || 'there'}`,
        html: welcomeHtml({ firstName, origin }),
      },
    });
    if (error) { console.error('Welcome email failed:', error.message); return false; }
    return true;
  } catch (e) {
    console.error('Welcome email failed:', e?.message || e);
    return false;
  }
}
