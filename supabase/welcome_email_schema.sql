-- ════════════════════════════════════════════════════════════════════════════
-- welcome_email_schema.sql — send the welcome email from the database
-- Run in the Supabase SQL editor AFTER deploying the send-welcome-email function.
-- Safe to re-run.
--
-- When a users row gets otp_verified = true (the sign-up page does this right
-- after the code is checked), this trigger calls the send-welcome-email edge
-- function in the background through pg_net. It never blocks or fails sign-up.
-- users.welcome_sent_at makes sure the email only goes out once.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Remember when the welcome email was sent
alter table public.users add column if not exists welcome_sent_at timestamptz;

-- 2. pg_net lets the database make HTTP calls (also under Database → Extensions)
create extension if not exists pg_net with schema extensions;

-- 3. Store the function URL and the shared secret in the Vault (encrypted).
--    Replace the two values below, run once, then remove them from this file.
--    The secret must equal the WELCOME_WEBHOOK_SECRET edge-function secret.
--
-- select vault.create_secret('https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-welcome-email', 'welcome_email_url');
-- select vault.create_secret('PASTE-THE-SAME-LONG-RANDOM-STRING', 'welcome_email_secret');
--
--    To change them later:
-- select vault.update_secret((select id from vault.secrets where name = 'welcome_email_secret'), 'NEW-VALUE');

-- 4. Trigger: fire once, when the email address becomes verified
create or replace function public.queue_welcome_email()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_url    text;
  v_secret text;
begin
  if new.otp_verified is true
     and new.welcome_sent_at is null
     and (tg_op = 'INSERT' or coalesce(old.otp_verified, false) = false) then

    select decrypted_secret into v_url    from vault.decrypted_secrets where name = 'welcome_email_url';
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'welcome_email_secret';

    if v_url is not null and v_secret is not null then
      perform net.http_post(
        url     := v_url,
        body    := jsonb_build_object('user_id', new.id),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
        timeout_milliseconds := 10000
      );
    end if;
  end if;
  return new;
exception when others then
  -- Never let an email problem stop the user's sign-up
  raise warning 'queue_welcome_email: %', sqlerrm;
  return new;
end $$;

drop trigger if exists users_send_welcome_email on public.users;
create trigger users_send_welcome_email
  after insert or update of otp_verified on public.users
  for each row execute function public.queue_welcome_email();


-- ─── Checking it ────────────────────────────────────────────────────────────
-- Recent calls the trigger made, with the function's reply:
-- select id, status_code, content, created from net._http_response order by created desc limit 10;
--
-- Who has / hasn't had the email:
-- select email, otp_verified, welcome_sent_at from public.users order by created_at desc limit 20;
--
-- Re-send to someone (clear the flag, then flip verification to fire the trigger,
-- or just call the function from the browser as that user):
-- update public.users set welcome_sent_at = null where email = 'someone@example.com';
