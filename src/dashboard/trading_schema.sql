-- ════════════════════════════════════════════════════════════════════════════
-- trading_schema.sql — trade approval for the Terminal page (/terminal)
-- Run in the Supabase SQL editor. Safe to re-run.
--
-- New terminal trades start with approval_status = 'pending' and show as
-- "Pending" until an admin approves them (Admin → Terminal trading).
-- The trigger below makes sure only admins can change approval_status, so a
-- user can't approve their own trade by editing the row from the browser.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Admin check (identical in every schema file) ───────────────────────────
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.admins
     where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
       and is_active
  );
$$;
grant execute on function public.is_admin() to authenticated;


-- ─── open_positions.approval_status (already in your table; added here if missing) ─
alter table public.open_positions add column if not exists approval_status text default 'pending';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'open_positions_approval_status_check') then
    alter table public.open_positions
      add constraint open_positions_approval_status_check
      check (approval_status is null or approval_status in ('pending','approved','rejected'));
  end if;
end $$;

create index if not exists open_positions_approval_idx on public.open_positions (approval_status) where status = 'open';


-- ─── Only admins can approve ────────────────────────────────────────────────
create or replace function public.guard_position_approval()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Admins and server-side jobs (no signed-in user) are trusted
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.approval_status := 'pending';                 -- every user trade starts pending
  else
    new.approval_status := old.approval_status;       -- users can't change it
    -- A trade that isn't approved can be cancelled, but not closed for a profit or loss
    if old.approval_status = 'pending' and new.status = 'closed' then
      raise exception 'This trade hasn''t been approved yet, so it can only be cancelled';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists open_positions_guard_approval on public.open_positions;
create trigger open_positions_guard_approval
  before insert or update on public.open_positions
  for each row execute function public.guard_position_approval();
