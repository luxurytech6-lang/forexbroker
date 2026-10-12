# Profit Gain Signals — final update package

Everything from this round of work in one place: the user dashboard pages, the admin
console, the crypto payment flow, the welcome email, the Supabase email templates and
every database schema.

```
src/         → copy over your project's src/ folder (same paths)
database/    → run in the Supabase SQL editor, in number order
supabase/    → edge function + email templates
```

---

## 1. Database — run in this order

Open **Supabase → SQL editor** and run each file top to bottom, in order.
All nine have been run on a fresh database in this order, and a second time, without errors,
so they are safe to re-run.

| # | File | What it adds |
|---|------|--------------|
| 01 | `01_main_schema.sql` | Your main schema (unchanged — skip if it is already in your project) |
| 02 | `02_cards_schema.sql` | Your cards schema (unchanged — skip if already applied) |
| 03 | `03_payments_schema.sql` | `is_admin()`, payment proof column on transactions, plan payment requests, the private **payment-proofs** storage bucket, payment columns on card orders and copy trading, copy-trading guard |
| 04 | `04_real_estate_schema.sql` | Properties, investments (with payment columns), payouts, 6 starter listings |
| 05 | `05_mining_schema.sql` | Mining plans, contracts (with payment columns), daily payouts, 6 starter plans |
| 06 | `06_trading_schema.sql` | Terminal trade approval (`approval_status`) and its guard |
| 07 | `07_admin_schema.sql` | Admin table, audit log, admin access policies, admin wallet / review functions |
| 08 | `08_welcome_email_schema.sql` | Trigger that sends the welcome email after sign-up (see step 3 first) |
| 09 | `09_identity_account_schema.sql` | Identity verification table + private **identity-documents** bucket; account and withdrawal suspend / lock; admin functions to review identity, restrict and delete users |

**Make yourself an admin** — after file 07, run (with your email):

```sql
insert into public.admins (email, full_name, is_active)
values ('you@example.com', 'Your Name', true);
```

Then sign in at **/admin/login**.

---

## 2. Code — copy `src/` into your project

The folder structure matches yours. New files:

- `src/admin/…` — admin login, dashboard and one section per area
  (users, transactions, subscriptions, mining, real estate, cards, copy trading,
  hire a trader, terminal, stocks, insights, marketplace, deposit addresses,
  notifications, support, audit log)
- `src/payment/CryptoCheckout.jsx` — the payment popup
- `src/componet/ChatwayWidget.jsx` — the live chat loader
- `src/dashboard/mining.jsx`, `src/email/welcomeEmail.js`
- `src/dashboard/VerifyIdentity.jsx` — the identity verification page (`/verify-identity`)
- `src/account/` — `accountState.js` (shared helper), `IdentityBanner.jsx` (dashboard card), `AccountGuard.jsx` (suspended / locked notices)
- `src/admin/sections/Identity.jsx` — Admin → Identity checks

These still come from your own project and are **not** in this package (leave yours as they are):
`supabase.js`, `payment/paymentService.js`, `componet/tradeflowlanding`, `about`, `policy`, `terms`,
`user/login`, `user/forget_password`.

> The `.sql` files that used to sit inside `src/` now live only in `database/`.
> If you copied earlier versions into `src/`, you can delete them there.

---

## 3. Welcome email (edge function)

1. Deploy: `supabase functions deploy send-welcome-email --no-verify-jwt`
2. Add secrets (**Edge Functions → Secrets**):
   - `RESEND_API_KEY` — from resend.com
   - `SITE_URL` — e.g. `https://profitgainsignals.com`
   - `WELCOME_WEBHOOK_SECRET` — any long random string
   - optional: `EMAIL_FROM`, `REG_DOC_URL`
3. In the SQL editor, store the function URL and the same secret in the vault
   (the two `vault.create_secret` lines at the top of `08_welcome_email_schema.sql`), then run file 08.

---

## 4. Email templates

**Authentication → Email Templates** — paste the whole file into the message body:

| Template | File | Suggested subject |
|----------|------|-------------------|
| Confirm signup | `supabase/email-templates/confirm-signup.html` | `Your Profit Gain Signals code: {{ .Token }}` |
| Reset password | `supabase/email-templates/reset-password.html` | `Reset your Profit Gain Signals password` |

Both say the code expires in **1 hour** (Supabase's default) — change that line if your OTP expiry is different.

---

## 5. Remove the Chatway tag from index.html

Live chat is now loaded by `ChatwayWidget.jsx` (shown on every page, hidden on `/admin`).
If you pasted the Chatway `<script>` into `public/index.html`, remove it, or it will also show in the admin console.

---

## What changed — summary

**Identity verification**
- New page **Verify identity** (`/verify-identity`), linked in every side menu. Four steps: details →
  ID document (passport, national ID, driver's licence or residence permit, front/back) → selfie
  holding the ID (opens the camera on phones) → review and submit. Must be 18+.
- The dashboard shows a **Verify your identity** card until the user is verified — it changes to
  "we're checking" while pending and shows the reason if it was rejected.
- **Admin → Identity checks**: view details, ID photos and selfie; approve, or reject with a reason
  the user sees. Approving sets the user's verified badge. The user gets a notification either way.

**Account controls** (Admin → Users → open a user)
| Control | What the user experiences |
|---------|---------------------------|
| Suspend account | Can sign in and look around; deposits, withdrawals, investing, trades and purchases are blocked. A bar explains why. Optional end date (1 / 7 / 30 days or a date) — lifts by itself. |
| Lock account | Signed out at once and can't sign in (also banned in Supabase Auth) until unlocked. |
| Suspend withdrawals | Can't request withdrawals; everything else works. Optional end date. |
| Lock withdrawals | Can't request withdrawals until an admin unlocks them. |
| Delete user | Removes the user, their sign-in, wallets, history and uploaded files. Type their email to confirm. Admins must have admin access removed first; you can't delete yourself. |

Every change is written to the audit log and the user gets a notification with the reason.
These rules are enforced **in the database**, so they hold even if someone bypasses the app,
and users can't change their own status or mark themselves verified.


**Payments (crypto + proof, admin approves)**
- Copy trading, Real estate, Mining and paid Cards: the main button (*Start Copying*, *Invest*,
  *Buy contract*, *Order card*) opens a payment popup showing the amount, the wallet address
  (with Copy), a proof upload and a *Confirm … payment* button.
- Confirming saves the purchase as **pending** with the proof, and adds a pending payment in
  Transactions (same as Marketplace). Nothing activates until an admin approves it in the admin console.
- Withdrawals now show a **"Withdrawal sent"** popup with the amount, fee, amount received, method,
  destination, reference and status. A failed confirmation email no longer hides a withdrawal that went through.
- Deposits, withdrawals and plan upgrades refresh balances in the background instead of reloading the page.

**Admin console** (`/admin`)
- Approve / reject deposits, withdrawals, plan payments, mining contracts, property investments,
  card orders, copy trading and terminal trades, with the payment proof viewable on each.
- Pending counts in the sidebar; every admin action is written to the audit log.

**Sign-up & email**
- Welcome email sent by an edge function after the user verifies their code (sent only once).
- Branded confirm-signup and reset-password emails.

**Live chat**
- One Chatway loader for the whole app (widget `3Ljj1m1cEAob`); the old per-page loaders
  (which used older widget IDs) were removed.

---

## Known items not changed in this round

- Withdrawals don't *require* a verified identity yet. If you want that, it's a one-line change
  in `_assert_can_transact` (database file 09) — ask and it can be switched on.

- **Terminal and Stock pages** still update wallet balances from the browser. For a live
  money platform, move that into a database function so users can't change their own balance.
- **Copy trading → Pause / Stop** buttons are not wired up yet.
- **Payments → plan payment** shows a placeholder QR code.
