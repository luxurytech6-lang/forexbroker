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
All fifteen have been run on a fresh database in this order, and 02–15 a second time, without errors,
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
| 10 | `10_identity_email_schema.sql` | Emails the user when their identity is approved (see step 3b first) |
| 11 | `11_withdrawal_selfie_schema.sql` | Live selfie required for every withdrawal; selfie linked to the withdrawal for admin review |
| 12 | `12_broker_trades_schema.sql` | Record broker trades for a user, correct P/L with a reason, settle results to the wallet |
| 13 | `13_deposit_review_fix.sql` | Every user deposit is saved as **pending** so it shows in Admin → Transactions for review; also fixes deposits already stuck with other status spellings |
| 14 | `14_connection_referral_schema.sql` | Connection key + status (not connected / pending / connected) and referral code for every user — created automatically at sign-up and filled in for existing users; admin connect functions; referral claims |
| 15 | `15_staking_swap_schema.sql` | Staking plans (4 starters), stakes, daily rewards; swap coins and prices (USD, USDT, BTC, ETH), fee and limits, swap history |

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
- `src/dashboard/Staking.jsx` (`/staking`) and `src/dashboard/Swap.jsx` (`/swap`) — new pages, already in the side menu of every page
- `src/account/ProfileExtras.jsx` — Connection and Refer-a-friend cards on the profile page
- `src/admin/sections/Connections.jsx`, `Staking.jsx`, `Swap.jsx` — Admin → Connections / Staking / Swap

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

### 3b. Identity-approved email (edge function)

1. Deploy: `supabase functions deploy send-identity-email --no-verify-jwt`
   — it uses the same secrets as the welcome email (`RESEND_API_KEY`, `EMAIL_FROM`, `SITE_URL`, `WELCOME_WEBHOOK_SECRET`); nothing new to add.
2. In the SQL editor, store its address (replace YOUR-PROJECT-REF):
   ```sql
   select vault.create_secret('https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-identity-email', 'identity_email_url');
   ```
3. Run `10_identity_email_schema.sql`.

When an admin approves an identity check, the user gets a "Your identity is verified" email.
It's sent once per approval; **Admin → Identity checks → Resend approval email** sends it again.

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

## Latest round

**Deposits not showing in admin.** The deposit page now saves each deposit itself as a
*pending* transaction with the proof attached (it no longer goes through `recordDeposit`
in your `paymentService.js`, which was saving it with a status the admin list didn't pick up).
File 13 also corrects deposits already saved that way. They appear in
**Admin → Transactions → Pending deposits**; Approve credits the wallet. The deposit
confirmation email still uses `sendDepositEmail` from your `paymentService.js`.

**Greeting.** Good morning 05:00–11:59, Good afternoon 12:00–16:59, Good evening otherwise.
Uses the timezone saved in the user's settings (falls back to the device clock) and updates
on its own while the page is open.

**Connection key.** Each user gets a key like `PGS-7KQ2-M9XD-4HT0` at sign-up. Their profile shows
the key and a status: *Not connected*, *Pending* (after they tap **Request connection**) or
*Connected*. In **Admin → Connections** paste a key (dashes, spaces and case don't matter),
**Find account**, then **Connect account** — the user's profile shows Connected and they get a
notification. Connect/Disconnect is also in each user's drawer under Admin → Users.

**Referral link.** The profile shows `yoursite.com/signup?ref=CODE` with Copy / Share and a
list of people who joined. A new user who signs up from the link is linked to the referrer
(only once, within 30 days of joining, never their own code).

**Staking (`/staking`).** User picks a plan, enters an amount and pays in crypto through the same
payment popup as mining. Admin approves in **Admin → Staking**; rewards (amount × APY ÷ 365 per day)
go to the USD wallet and the stake is returned when the lock ends. Click **Pay rewards now** daily,
or schedule it once in the SQL editor:

```sql
select cron.schedule('staking-rewards', '15 0 * * *', $$select public.process_staking_rewards()$$);
```
(enable the `pg_cron` extension first; running it twice in a day pays nothing extra.)

**Swap (`/swap`).** Instant exchange between the user's wallets at the prices in
**Admin → Swap**. Click **Fetch market prices** there (CoinGecko) before going live and regularly
after — a coin pauses for swaps if its price is older than the limit (60 min by default, changeable
under *Fee & limits*, with the fee, 0.5%, and minimum, $5). Suspended or locked accounts can't
stake or swap.

---

## What changed — summary

**Identity verification**
- New page **Verify identity** (`/verify-identity`), linked in every side menu. Three steps: details →
  ID document (passport, national ID, driver's licence or residence permit, front/back) → review and submit. Must be 18+.
- The dashboard shows a **Verify your identity** card until the user is verified — it changes to
  "we're checking" while pending and shows the reason if it was rejected.
- **Admin → Identity checks**: view the details and ID photos; approve, or reject with a reason
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

**Withdrawal selfie**
- After filling in a withdrawal and clicking **Withdraw**, the user takes a live selfie with their camera
  (front camera, face guide, 3-second countdown, retake). There's no file-upload option.
- The database refuses any withdrawal without a fresh, unused selfie (taken in the last 15 minutes), and links it to the withdrawal.
- **Admin → Transactions → Pending withdrawals → Selfie** shows the selfie next to the user's ID photo.

**Broker trades** (Admin → Terminal trading)
- **Record broker trade**: pick the user, enter the broker, ticket number, symbol, side, lots, prices and the P/L
  from the broker. Open or already-closed. A ticket can only be booked once.
- **P/L** button on any open or closed trade: enter the corrected figure and a reason (kept in the audit log).
  Open trades don't touch the wallet; for closed trades only the difference is posted, as a "P/L correction".
- **Close** pays the realised P/L into the wallet. Every change notifies the user; users can't edit desk trades.

## Known items not changed in this round

- Withdrawals don't *require* a verified identity yet. If you want that, it's a one-line change
  in `_assert_can_transact` (database file 09) — ask and it can be switched on.

- **Terminal and Stock pages** still update wallet balances from the browser. For a live
  money platform, move that into a database function so users can't change their own balance.
- **Copy trading → Pause / Stop** buttons are not wired up yet.
- **Payments → plan payment** shows a placeholder QR code.
