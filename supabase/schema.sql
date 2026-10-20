-- =====================================================================
-- Fourcast Zeiterfassung – Datenbank-Schema für Supabase
--
-- Einmal komplett im Supabase SQL Editor ausführen (siehe README).
-- VORHER: unten bei "TEAM" eure 5 GitHub-Usernamen eintragen.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------

-- Wer zum Team gehört. Nur diese GitHub-Accounts kommen in die App.
create table if not exists public.members (
  github_username  text primary key,
  display_name     text not null,
  color            text not null default '#6b7280',
  timer_started_at timestamptz            -- läuft gerade ein Timer? (sonst null)
);

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

-- In members dürfen über die App nur Name, Farbe und Timer geändert werden.
revoke insert, update, delete on public.members from anon, authenticated;
grant update (display_name, color, timer_started_at) on public.members to authenticated;

-- tags: alle im Team dürfen alles
drop policy if exists "tags_all" on public.tags;
create policy "tags_all" on public.tags
  for all to authenticated
  using (public.current_member() is not null)
  with check (public.current_member() is not null);

-- time_entries: alle sehen alles, ändern nur eigene Einträge
drop policy if exists "entries_select" on public.time_entries;
create policy "entries_select" on public.time_entries
  for select to authenticated using (public.current_member() is not null);

drop policy if exists "entries_insert_own" on public.time_entries;
create policy "entries_insert_own" on public.time_entries
  for insert to authenticated with check (member = public.current_member());

drop policy if exists "entries_update_own" on public.time_entries;
create policy "entries_update_own" on public.time_entries
  for update to authenticated
  using (member = public.current_member())
  with check (member = public.current_member());

drop policy if exists "entries_delete_own" on public.time_entries;
create policy "entries_delete_own" on public.time_entries
  for delete to authenticated using (member = public.current_member());

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
  ('JustRaika',       'JustRaika', '#e4572e'),
  ('CelestialInsomniac',   'CelestialInsomniac', '#2e86ab'),
  ('mf-doodoo',   'mf-doodoo', '#29a36a'),
  ('Rico-Uttinger',   'Rico-Uttinger', '#9b5de5'),
  ('JanSchwegler',   'JanSchwegler', '#f0a202')
on conflict (github_username) do update
  set display_name = excluded.display_name, color = excluded.color;

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
