-- ════════════════════════════════════════════════════════════════════════════
-- 13_deposit_review_fix.sql — every deposit waits for admin review
-- Run in the Supabase SQL editor AFTER 07. Safe to re-run.
--
-- Problem: a deposit could succeed on the Payments page but never appear in
-- Admin → Transactions → Pending deposits. The admin list (and the approve
-- function) only pick up status = 'pending' exactly, and the deposit could be
-- saved as 'Pending', 'processing', 'completed', etc.
--
-- Fix:
--   1. Any deposit or withdrawal a user creates is saved as 'pending' — users
--      can't mark their own deposit completed. (Admins, the SQL editor and
--      server jobs are not affected.)
--   2. Status spellings are normalised ('Pending' → 'pending', 'processing' /
--      'awaiting' / 'under_review' … → 'pending').
--   3. Deposits already stuck with one of those spellings are fixed now.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.normalize_transaction_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_type text := lower(coalesce(new.type, ''));
begin
  new.status := lower(trim(coalesce(new.status, 'pending')));
  if new.status in ('processing', 'awaiting', 'awaiting_confirmation', 'awaiting_payment', 'under_review',
                    'in_review', 'submitted', 'review', 'in_progress', 'requested') then
    new.status := 'pending';
  end if;

  -- A deposit or withdrawal started by a user always waits for an admin
  if tg_op = 'INSERT' and auth.uid() is not null and not public.is_admin()
     and (v_type like '%deposit%' or v_type like '%withdraw%') then
    new.status := 'pending';
  end if;
  return new;
end $$;

drop trigger if exists aa_normalize_transaction_status on public.transactions;
create trigger aa_normalize_transaction_status before insert or update of status on public.transactions
  for each row execute function public.normalize_transaction_status();

-- Fix deposits / withdrawals already saved with another spelling
update public.transactions
   set status = 'pending', updated_at = now()
 where status <> 'pending'
   and lower(trim(status)) in ('pending', 'processing', 'awaiting', 'awaiting_confirmation', 'awaiting_payment',
                               'under_review', 'in_review', 'submitted', 'review', 'in_progress', 'requested');


-- ─── Checking it ────────────────────────────────────────────────────────────
-- The newest deposits and their status (each should be 'pending' until reviewed):
-- select t.created_at, u.email, t.type, t.amount, t.status, t.proof_url
--   from public.transactions t join public.users u on u.id = t.user_id
--  where t.type ilike '%deposit%' order by t.created_at desc limit 20;
