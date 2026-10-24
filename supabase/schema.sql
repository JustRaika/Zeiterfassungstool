-- =====================================================================
-- Fourcast Zeiterfassung – Datenbank-Schema für Supabase
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
-- Unveränderliche GitHub-Konto-ID. Der Login wird darüber zugeordnet, nicht über den Usernamen:
-- GitHub-Usernamen lassen sich umbenennen und werden danach wieder frei, die ID nie.
-- Neue Mitglieder brauchen diese ID (https://api.github.com/users/<username> → "id").
alter table public.members add column if not exists github_id text unique;
-- Farbe und Anzeigename landen bei allen anderen in der Oberfläche: nur echte Hex-Farben,
-- Namen ohne Rand-Leerzeichen, 1–40 Zeichen und (ohne Gross/Klein) eindeutig, damit sich niemand
-- als jemand anderes ausgeben kann.
alter table public.members drop constraint if exists members_color_hex;
alter table public.members add constraint members_color_hex check (color ~ '^#[0-9a-fA-F]{6}$');
alter table public.members drop constraint if exists members_display_name_ok;
alter table public.members add constraint members_display_name_ok
  check (display_name = btrim(display_name) and char_length(display_name) between 1 and 40);
create unique index if not exists members_display_name_unique on public.members (lower(display_name));

-- Tags (Kategorien) für Zeiteinträge.
create table if not exists public.tags (
  name       text primary key,
  color      text not null default '#6b7280',
  created_at timestamptz not null default now()
);
alter table public.tags drop constraint if exists tags_color_hex;
alter table public.tags add constraint tags_color_hex check (color ~ '^#[0-9a-fA-F]{6}$');

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
-- Meilensteine werden im Kalender besonders hervorgehoben.
alter table public.events add column if not exists is_milestone boolean not null default false;

-- Gemeinsames Kanban-Board.
create table if not exists public.kanban_cards (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 200),
  description text,
  status      text not null default 'todo' check (status in ('backlog', 'todo', 'doing', 'done')),
  position    double precision not null default 0,   -- Reihenfolge innerhalb der Spalte
  tags        text[] not null default '{}',
  due_date    date,
  created_by  text references public.members (github_username) on update cascade on delete set null,
  created_at  timestamptz not null default now()
);
-- Priorität 1 (hoch) bis 3 (tief) und Kategorie (bestimmt die Randfarbe der Karte)
alter table public.kanban_cards add column if not exists priority smallint not null default 2
  check (priority in (1, 2, 3));
alter table public.kanban_cards add column if not exists category text
  check (category in ('code', 'design', 'admin', 'testing'));
-- Mehrere Zuständige (GitHub-Usernamen) und Unteraufgaben [{"title": "...", "done": false}, ...]
alter table public.kanban_cards add column if not exists assignees text[] not null default '{}';
alter table public.kanban_cards add column if not exists subtasks jsonb not null default '[]';
-- Bilder: Pfade der Dateien im Storage-Bucket task-images (siehe unten)
alter table public.kanban_cards add column if not exists images text[] not null default '{}';
-- Früher gab es nur eine zuständige Person (Spalte assignee): übernehmen und Spalte entfernen
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'kanban_cards' and column_name = 'assignee') then
    update public.kanban_cards set assignees = array[assignee] where assignee is not null and assignees = '{}';
    alter table public.kanban_cards drop column assignee;
  end if;
end $$;


-- ---------------------------------------------------------------------
-- Wer ist gerade eingeloggt?
-- Ordnet den Login über die GitHub-Konto-ID zu (auth.identities.provider_id, kommt direkt von
-- GitHub und ändert sich nie, auch nicht beim Umbenennen). Gibt null zurück, wenn das Konto
-- nicht in members steht.
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
  join auth.identities i on i.provider_id = m.github_id
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
alter table public.kanban_cards alter column created_by set default public.current_member();


-- ---------------------------------------------------------------------
-- Zugriffsregeln (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.members      enable row level security;
alter table public.tags         enable row level security;
alter table public.time_entries enable row level security;
alter table public.events       enable row level security;
alter table public.kanban_cards enable row level security;

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

-- kanban_cards: gemeinsames Board, alle im Team dürfen alles
drop policy if exists "kanban_all" on public.kanban_cards;
create policy "kanban_all" on public.kanban_cards
  for all to authenticated
  using (public.current_member() is not null)
  with check (public.current_member() is not null);


-- ---------------------------------------------------------------------
-- Bilder für Tasks (Supabase Storage, getrennt von der Datenbank, 1 GB gratis).
-- Privater Bucket: Bilder sehen nur eingeloggte Team-Mitglieder (über kurzlebige Links).
-- Die App verkleinert Bilder vor dem Hochladen (max. 1600 px, WebP).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('task-images', 'task-images', false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

drop policy if exists "task_images_select" on storage.objects;
create policy "task_images_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'task-images' and public.current_member() is not null);

drop policy if exists "task_images_insert" on storage.objects;
create policy "task_images_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'task-images' and public.current_member() is not null);

drop policy if exists "task_images_delete" on storage.objects;
create policy "task_images_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'task-images' and public.current_member() is not null);


-- ---------------------------------------------------------------------
-- Startdaten
-- ---------------------------------------------------------------------

insert into public.members (github_username, display_name, color) values
  ('JustRaika',          'Nika',   '#8ec5ff'),  -- pastellblau
  ('JanSchwegler',       'Jan',    '#c4a7f5'),  -- pastellviolett
  ('CelestialInsomniac', 'Annina', '#f5a9cb'),  -- pastellpink
  ('mf-doodoo',          'Ardit',  '#f5df8a'),  -- pastellgelb
  ('Rico-Uttinger',      'Rico',   '#ffb88c')   -- pastellorange
on conflict (github_username) do update
  set display_name = excluded.display_name, color = excluded.color;

-- GitHub-Konto-IDs (unveränderlich, für den Login; Quelle: https://api.github.com/users/<username>)
update public.members m set github_id = v.id
from (values
  ('JustRaika',          '145673445'),
  ('JanSchwegler',       '88095095'),
  ('CelestialInsomniac', '145690070'),
  ('mf-doodoo',          '146451421'),
  ('Rico-Uttinger',      '32189012')
) as v (username, id)
where m.github_username = v.username;

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
