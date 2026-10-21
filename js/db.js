// Datenzugriff. Zwei Backends mit derselben API:
//  - Supabase (echte, gemeinsame Datenbank)
//  - Demo (Beispieldaten im localStorage, wenn config.js leer ist)

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';
const PAGE_SIZE = 1000; // Supabase liefert max. 1000 Zeilen pro Abfrage

export async function createDb() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const { createClient } = await import(SUPABASE_JS);
    return new SupabaseDb(createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
  }
  return new DemoDb();
}

function check({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// ---------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------
class SupabaseDb {
  mode = 'supabase';

  constructor(client) {
    this.sb = client;
  }

  // { status: 'signedOut' } | { status: 'notMember', login } | { status: 'ok', me }
  async getAuthState() {
    const { data: { session } } = await this.sb.auth.getSession();
    if (!session) return { status: 'signedOut' };
    const username = check(await this.sb.rpc('current_member'));
    if (!username) {
      const meta = session.user.user_metadata || {};
      return { status: 'notMember', login: meta.user_name || meta.preferred_username || session.user.email };
    }
    const me = check(await this.sb.from('members').select('*').eq('github_username', username).single());
    return { status: 'ok', me };
  }

  async signIn() {
    const redirectTo = location.origin + location.pathname;
    check(await this.sb.auth.signInWithOAuth({ provider: 'github', options: { redirectTo } }));
  }

  async signOut() {
    await this.sb.auth.signOut();
  }

  async listMembers() {
    return check(await this.sb.from('members').select('*').order('display_name'));
  }

  async updateMe(username, patch) {
    return check(await this.sb.from('members').update(patch).eq('github_username', username).select().single());
  }

  async listTags() {
    return check(await this.sb.from('tags').select('*').order('created_at').order('name'));
  }

  async listEntries() {
    const rows = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const page = check(await this.sb.from('time_entries').select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1));
      rows.push(...page);
      if (page.length < PAGE_SIZE) return rows;
    }
  }

  async addEntry(entry) {
    return check(await this.sb.from('time_entries').insert(entry).select().single());
  }

  async updateEntry(id, patch) {
    return check(await this.sb.from('time_entries').update(patch).eq('id', id).select().single());
  }

  async deleteEntry(id) {
    check(await this.sb.from('time_entries').delete().eq('id', id));
  }

  async listEvents() {
    return check(await this.sb.from('events').select('*').order('starts_at'));
  }

  async addEvent(ev) {
    return check(await this.sb.from('events').insert(ev).select().single());
  }

  async updateEvent(id, patch) {
    return check(await this.sb.from('events').update(patch).eq('id', id).select().single());
  }

  async deleteEvent(id) {
    check(await this.sb.from('events').delete().eq('id', id));
  }

  async listCards() {
    return check(await this.sb.from('kanban_cards').select('*').order('position'));
  }

  async addCard(card) {
    return check(await this.sb.from('kanban_cards').insert(card).select().single());
  }

  async updateCard(id, patch) {
    return check(await this.sb.from('kanban_cards').update(patch).eq('id', id).select().single());
  }

  async deleteCard(id) {
    check(await this.sb.from('kanban_cards').delete().eq('id', id));
  }
}

// ---------------------------------------------------------------------
// Demo (localStorage)
// ---------------------------------------------------------------------
const DEMO_KEY = 'fourcast-zeit-demo-v6';
const DEMO_USER_KEY = 'fourcast-zeit-demo-user';

const DEMO_TAGS = [
  ['Coding', '#2e86ab'], ['3D magic', '#9b5de5'], ['Organisation', '#6b7280'],
  ['Meeting', '#f0a202'], ['Artsy Stuff', '#e4572e'], ['Sound', '#00a6a6'],
  ['Woahbuilding', '#29a36a'], ['VFX', '#d63384'], ['Lighting', '#e0b000'],
  ['Social Media', '#3a86ff'], ['Projektplanung', '#8d6e63'], ['Puzzle Cooking', '#ff7f50'],
  ['Testing', '#4c956c'], ['Texturing', '#b5838d'],
];

const DEMO_MEMBERS = [
  ['demo-alex', 'Alex', '#8ec5ff', ['Coding', 'Testing', 'Puzzle Cooking']],
  ['demo-sam', 'Sam', '#c4a7f5', ['3D magic', 'Texturing', 'Lighting']],
  ['demo-kim', 'Kim', '#f5a9cb', ['Artsy Stuff', 'Woahbuilding', 'VFX']],
  ['demo-robin', 'Robin', '#f5df8a', ['Sound', 'Social Media']],
  ['demo-jo', 'Jo', '#ffb88c', ['Organisation', 'Projektplanung', 'Coding']],
];

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* privater Modus o.ä. – dann nur im Speicher */ }
}

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function seedDemo() {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  // Die erste Demo-Person ist Admin
  const members = DEMO_MEMBERS.map(([github_username, display_name, color], i) =>
    ({ github_username, display_name, color, timer_segments: null, is_admin: i === 0 }));
  const tags = DEMO_TAGS.map(([name, color], i) =>
    ({ name, color, created_at: new Date(2026, 0, 1, 0, 0, i).toISOString() }));

  const entries = [];
  const today = new Date();
  for (let back = 0; back < 100; back++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
    for (const [username, , , favs] of DEMO_MEMBERS) {
      if (rnd() < 0.55) continue;
      const tagList = [pick(favs)];
      if (rnd() < 0.25) tagList.push(pick(DEMO_TAGS)[0]);
      entries.push({
        id: crypto.randomUUID(),
        member: username,
        date: isoDate(day),
        duration_minutes: 15 * (2 + Math.floor(rnd() * 20)),
        tags: [...new Set(tagList)],
        comment: rnd() < 0.3 ? pick(['Bugfixes', 'Prototyp angepasst', 'Feedback eingearbeitet', 'Level 2 Blockout', 'Recherche']) : null,
        created_at: day.toISOString(),
      });
    }
  }

  const at = (dayOffset, h, m = 0) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayOffset, h, m);
    return d.toISOString();
  };
  const events = [
    { title: 'Weekly Sync', starts_at: at(2, 18), ends_at: at(2, 19), all_day: false, location: 'Discord', created_by: 'demo-jo' },
    { title: 'Playtest Session', starts_at: at(9, 14), ends_at: at(9, 17), all_day: false, location: 'Uni, Raum 2.14', created_by: 'demo-alex' },
    { title: 'Deadline Vertical Slice', starts_at: at(16, 0), ends_at: null, all_day: true, location: null, created_by: 'demo-jo', is_milestone: true },
    { title: 'Weekly Sync', starts_at: at(-5, 18), ends_at: at(-5, 19), all_day: false, location: 'Discord', created_by: 'demo-jo' },
  ].map((e) => ({ id: crypto.randomUUID(), description: null, created_at: new Date().toISOString(), ...e }));

  const cards = [
    ['backlog', 'Ideen für Level 4 sammeln', null, ['Woahbuilding'], 3, 'design'],
    ['todo', 'Steam-Page Texte schreiben', 'demo-robin', ['Social Media'], 1, 'admin'],
    ['todo', 'Hauptmenü-Musik', 'demo-robin', ['Sound'], 2, 'design'],
    ['doing', 'Puzzle-Mechanik Spiegel', 'demo-alex', ['Coding', 'Puzzle Cooking'], 1, 'code'],
    ['doing', 'Bugs im Level 2 prüfen', 'demo-sam', ['Testing'], 2, 'testing'],
    ['done', 'Teamvertrag aufsetzen', 'demo-jo', ['Organisation'], 2, 'admin'],
  ].map(([status, title, assignee, cardTags, priority, category], i) => ({
    id: crypto.randomUUID(), status, title, assignee, tags: cardTags, priority, category, position: i,
    description: null, due_date: null, created_by: 'demo-jo', created_at: new Date().toISOString(),
  }));

  return { members, tags, entries, events, cards };
}

class DemoDb {
  mode = 'demo';

  constructor() {
    try {
      this.data = JSON.parse(safeGet(DEMO_KEY)) || seedDemo();
    } catch {
      this.data = seedDemo();
    }
    this.save();
  }

  save() {
    safeSet(DEMO_KEY, JSON.stringify(this.data));
  }

  get user() {
    const u = safeGet(DEMO_USER_KEY);
    return this.data.members.some((m) => m.github_username === u) ? u : this.data.members[0].github_username;
  }

  setDemoUser(username) {
    safeSet(DEMO_USER_KEY, username);
  }

  resetDemo() {
    this.data = seedDemo();
    this.save();
  }

  async getAuthState() {
    return { status: 'ok', me: structuredClone(this.data.members.find((m) => m.github_username === this.user)) };
  }

  async signIn() {}
  async signOut() {}

  async listMembers() {
    return structuredClone(this.data.members).sort((a, b) => a.display_name.localeCompare(b.display_name));
  }

  async updateMe(username, patch) {
    if (username !== this.user) throw new Error('Keine Berechtigung');
    const m = this.data.members.find((x) => x.github_username === username);
    Object.assign(m, patch);
    this.save();
    return structuredClone(m);
  }

  async listTags() {
    return structuredClone(this.data.tags);
  }

  async listEntries() {
    return structuredClone(this.data.entries).sort((a, b) =>
      b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  }

  // Eintrag, den die aktuelle Person ändern darf (eigener, oder als Admin jeder)
  ownEntry(id) {
    const e = this.data.entries.find((x) => x.id === id);
    const isAdmin = this.data.members.find((m) => m.github_username === this.user)?.is_admin;
    if (!e || (e.member !== this.user && !isAdmin)) throw new Error('Nur eigene Einträge können geändert werden.');
    return e;
  }

  async addEntry(entry) {
    const row = { id: crypto.randomUUID(), member: this.user, comment: null, tags: [], created_at: new Date().toISOString(), ...entry };
    if (row.member !== this.user) throw new Error('Nur eigene Einträge können angelegt werden.');
    this.data.entries.push(row);
    this.save();
    return structuredClone(row);
  }

  async updateEntry(id, patch) {
    const e = this.ownEntry(id);
    Object.assign(e, patch, { member: e.member });
    this.save();
    return structuredClone(e);
  }

  async deleteEntry(id) {
    this.ownEntry(id);
    this.data.entries = this.data.entries.filter((x) => x.id !== id);
    this.save();
  }

  async listEvents() {
    return structuredClone(this.data.events);
  }

  async addEvent(ev) {
    const row = { id: crypto.randomUUID(), created_by: this.user, created_at: new Date().toISOString(), ...ev };
    this.data.events.push(row);
    this.save();
    return structuredClone(row);
  }

  async updateEvent(id, patch) {
    const e = this.data.events.find((x) => x.id === id);
    Object.assign(e, patch);
    this.save();
    return structuredClone(e);
  }

  async deleteEvent(id) {
    this.data.events = this.data.events.filter((x) => x.id !== id);
    this.save();
  }

  async listCards() {
    return structuredClone(this.data.cards || []).sort((a, b) => a.position - b.position);
  }

  async addCard(card) {
    const row = {
      id: crypto.randomUUID(), status: 'todo', position: 0, priority: 2, category: null, description: null, assignee: null,
      tags: [], due_date: null, created_by: this.user, created_at: new Date().toISOString(), ...card,
    };
    (this.data.cards ||= []).push(row);
    this.save();
    return structuredClone(row);
  }

  async updateCard(id, patch) {
    const c = this.data.cards.find((x) => x.id === id);
    Object.assign(c, patch);
    this.save();
    return structuredClone(c);
  }

  async deleteCard(id) {
    this.data.cards = this.data.cards.filter((x) => x.id !== id);
    this.save();
  }
}
