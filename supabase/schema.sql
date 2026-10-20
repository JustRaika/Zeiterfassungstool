-- =====================================================================
-- Fourcast Zeiterfassung – Datenbank-Schema für Supabase
--
-- Einmal komplett im Supabase SQL Editor ausführen.
-- VORHER: unten bei "TEAM" eure 5 GitHub-Usernamen eintragen.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------

-- Wer zum Team gehört. Nur diese GitHub-Accounts kommen in die App.
create table if not exists public.members (
  github_username  text primary key,
  display_name     text not null,
  color            text not null default '#6b7280'
);
-- Timer-Stempelungen: [{"start": ISO, "end": ISO | null}, ...]; letzter Abschnitt ohne end = läuft.
-- null = kein Timer aktiv. Pausen sind die Lücken zwischen den Abschnitten.
alter table public.members add column if not exists timer_segments jsonb;
-- Admins dürfen alle Zeiteinträge bearbeiten und löschen.
alter table public.members add column if not exists is_admin boolean not null default false;

-- Tags (Kategorien) für Zeiteinträge.
create table if not exists public.tags (
  name       text primary key,
  color      text not null default '#6b7280',
  created_at timestamptz not null default now()
);

-- Die eigentliche Zeiterfassung.
create table if not exists public.time_entries (
  id               uuid primary key default gen_random_uuid(),
  member           text not null references public.members (github_username) on update cascade,
  date             date not null default current_date,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 1440),
  tags             text[] not null default '{}',
  comment          text,
  created_at       timestamptz not null default now()
);
create index if not exists time_entries_date_idx on public.time_entries (date desc);

-- Gemeinsame Termine für den Kalender.
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  all_day     boolean not null default false,
  location    text,
  description text,
  created_by  text references public.members (github_username) on update cascade on delete set null,
  created_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- Wer ist gerade eingeloggt?
-- Liest den GitHub-Usernamen aus auth.identities (kommt direkt von GitHub
-- und kann vom User nicht selbst geändert werden). Gibt null zurück, wenn
-- der Account nicht in members steht.
-- ---------------------------------------------------------------------
create or replace function public.current_member()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select m.github_username
  from public.members m
  join auth.identities i
    on lower(coalesce(i.identity_data ->> 'user_name', i.identity_data ->> 'preferred_username'))
     = lower(m.github_username)
  where i.user_id = auth.uid()
    and i.provider = 'github'
  limit 1
$$;

revoke all on function public.current_member() from public, anon;
grant execute on function public.current_member() to authenticated;

-- Ist die eingeloggte Person Admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select m.is_admin from public.members m
                   where m.github_username = public.current_member()), false)
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Keep-Alive: Supabase Free pausiert Projekte nach 1 Woche ohne Zugriff.
-- Der GitHub-Workflow .github/workflows/keep-alive.yml ruft diese Funktion
-- regelmässig auf. Sie liest keine Daten und ändert nichts.
create or replace function public.keep_alive()
returns timestamptz
language sql
stable
as $$
  select now()
$$;

grant execute on function public.keep_alive() to anon, authenticated;

-- Neue Einträge/Termine gehören automatisch der eingeloggten Person.
alter table public.time_entries alter column member set default public.current_member();
alter table public.events alter column created_by set default public.current_member();


-- ---------------------------------------------------------------------
-- Zugriffsregeln (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.members      enable row level security;
alter table public.tags         enable row level security;
alter table public.time_entries enable row level security;
alter table public.events       enable row level security;

-- members: alle im Team sehen alle, ändern nur die eigene Zeile
drop policy if exists "members_select" on public.members;
create policy "members_select" on public.members
  for select to authenticated using (public.current_member() is not null);

drop policy if exists "members_update_own" on public.members;
create policy "members_update_own" on public.members
  for update to authenticated
  using (github_username = public.current_member())
  with check (github_username = public.current_member());

-- In members dürfen über die App nur Name, Farbe und Timer geändert werden (is_admin nicht!).
revoke insert, update, delete on public.members from anon, authenticated;
grant update (display_name, color, timer_segments) on public.members to authenticated;

-- tags: alle im Team sehen sie, neue Tags legt nur Nika im Supabase Table Editor an
drop policy if exists "tags_all" on public.tags;
drop policy if exists "tags_select" on public.tags;
create policy "tags_select" on public.tags
  for select to authenticated using (public.current_member() is not null);
revoke insert, update, delete on public.tags from anon, authenticated;

-- time_entries: alle sehen alles, ändern nur eigene Einträge (Admins: alle)
drop policy if exists "entries_select" on public.time_entries;
create policy "entries_select" on public.time_entries
  for select to authenticated using (public.current_member() is not null);

drop policy if exists "entries_insert_own" on public.time_entries;
create policy "entries_insert_own" on public.time_entries
  for insert to authenticated with check (member = public.current_member());

drop policy if exists "entries_update_own" on public.time_entries;
create policy "entries_update_own" on public.time_entries
  for update to authenticated
  using (member = public.current_member() or public.is_admin())
  with check (member = public.current_member() or public.is_admin());

drop policy if exists "entries_delete_own" on public.time_entries;
create policy "entries_delete_own" on public.time_entries
  for delete to authenticated using (member = public.current_member() or public.is_admin());

-- events: gemeinsamer Kalender, alle im Team dürfen alles
drop policy if exists "events_all" on public.events;
create policy "events_all" on public.events
  for all to authenticated
  using (public.current_member() is not null)
  with check (public.current_member() is not null);


-- ---------------------------------------------------------------------
-- Startdaten
-- ---------------------------------------------------------------------

-- TEAM: hier eure GitHub-Usernamen (genau wie auf github.com) und Anzeigenamen eintragen.
insert into public.members (github_username, display_name, color) values
  ('JustRaika',          'Nika',   '#8ec5ff'),  -- pastellblau
  ('JanSchwegler',       'Jan',    '#c4a7f5'),  -- pastellviolett
  ('CelestialInsomniac', 'Annina', '#f5a9cb'),  -- pastellpink
  ('mf-doodoo',          'Ardit',  '#f5df8a'),  -- pastellgelb
  ('Rico-Uttinger',      'Rico',   '#ffb88c')   -- pastellorange
on conflict (github_username) do update
  set display_name = excluded.display_name, color = excluded.color;

-- ADMIN: darf alle Zeiteinträge bearbeiten und löschen.
update public.members set is_admin = (github_username = 'JustRaika');

insert into public.tags (name, color) values
  ('Coding',         '#2e86ab'),
  ('3D magic',       '#9b5de5'),
  ('Organisation',   '#6b7280'),
  ('Meeting',        '#f0a202'),
  ('Artsy Stuff',    '#e4572e'),
  ('Sound',          '#00a6a6'),
  ('Woahbuilding',   '#29a36a'),
  ('VFX',            '#d63384'),
  ('Lighting',       '#e0b000'),
  ('Social Media',   '#3a86ff'),
  ('Projektplanung', '#8d6e63'),
  ('Puzzle Cooking', '#ff7f50'),
  ('Testing',        '#4c956c'),
  ('Texturing',      '#b5838d')
on conflict (name) do nothing;
