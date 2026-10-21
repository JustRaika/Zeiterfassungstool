// Einstieg: Login prüfen, gemeinsame Daten laden, Tabs umschalten.

import { createDb } from './db.js';
import { $, esc, toast } from './util.js';
import * as erfassen from './erfassen.js';
import * as uebersicht from './uebersicht.js';
import * as kalender from './kalender.js';
import * as kanban from './kanban.js';

const VIEWS = { erfassen, uebersicht, kalender, tasks: kanban };
const REFRESH_AFTER_MS = 60_000;

// Gemeinsamer Zustand, den alle Ansichten bekommen.
const ctx = {
  db: null,
  me: null,
  members: [],
  memberMap: new Map(),
  tags: [],
  tagMap: new Map(),
  entries: [],
  currentTab: null,
  lastLoad: 0,

  async loadAll() {
    const [members, tags, entries] = await Promise.all([
      ctx.db.listMembers(), ctx.db.listTags(), ctx.db.listEntries(),
    ]);
    ctx.setMembers(members);
    ctx.setTags(tags);
    ctx.entries = entries;
    ctx.lastLoad = Date.now();
  },

  async reloadEntries() {
    ctx.entries = await ctx.db.listEntries();
  },

  setMembers(members) {
    ctx.members = members;
    ctx.memberMap = new Map(members.map((m) => [m.github_username, m]));
    ctx.me = ctx.memberMap.get(ctx.me.github_username) || ctx.me;
  },

  setTags(tags) {
    ctx.tags = tags;
    ctx.tagMap = new Map(tags.map((t) => [t.name, t]));
  },

  // Darf ich diesen Eintrag ändern? Eigene immer, als Admin alle.
  canEdit(entry) {
    return entry.member === ctx.me.github_username || !!ctx.me.is_admin;
  },

  // Fehler aus der Datenbank freundlich anzeigen
  fail(err) {
    console.error(err);
    toast(`Fehler: ${err.message || err}`, { error: true });
  },

  // Eintrag im Erfassen-Tab bearbeiten (wird aus der Übersicht aufgerufen)
  editEntry(entry) {
    location.hash = '#erfassen';
    erfassen.editEntry(entry);
  },
};

function showScreen(id) {
  for (const s of ['loading', 'login-screen', 'denied-screen', 'error-screen', 'app']) {
    $(`#${s}`).hidden = s !== id;
  }
}

function showTab() {
  const name = location.hash.slice(1) === 'board' ? 'tasks' : location.hash.slice(1); // alter Link #board
  const tab = VIEWS[name] ? name : 'erfassen';
  if (location.hash !== `#${tab}`) history.replaceState(null, '', `#${tab}`);

  for (const a of document.querySelectorAll('.tabs a')) {
    a.classList.toggle('active', a.dataset.tab === tab);
  }
  for (const key of Object.keys(VIEWS)) {
    $(`#view-${key}`).hidden = key !== tab;
  }
  ctx.currentTab = tab;
  VIEWS[tab].show();
}

// Beim Zurückkehren in den Tab neue Daten der anderen holen
async function refreshIfStale() {
  if (!ctx.me || Date.now() - ctx.lastLoad < REFRESH_AFTER_MS) return;
  try {
    await ctx.loadAll();
    VIEWS[ctx.currentTab].show();
  } catch (err) {
    ctx.fail(err);
  }
}

function setupHeader() {
  $('#user-name').textContent = ctx.me.display_name;
  $('#admin-badge').hidden = !ctx.me.is_admin;
  $('#user-dot').style.setProperty('--c', ctx.me.color);
  $('#logout-btn').addEventListener('click', async () => {
    await ctx.db.signOut();
    location.reload();
  });

  if (ctx.db.mode === 'demo') {
    $('#demo-banner').hidden = false;
    $('#logout-btn').hidden = true;
    $('#user-name').hidden = true;
    const sel = $('#demo-user');
    sel.hidden = false;
    sel.innerHTML = ctx.members.map((m) =>
      `<option value="${esc(m.github_username)}">${esc(m.display_name)}</option>`).join('');
    sel.value = ctx.me.github_username;
    sel.addEventListener('change', () => {
      ctx.db.setDemoUser(sel.value);
      location.reload();
    });
    $('#demo-reset').addEventListener('click', () => {
      if (!confirm('Alle Demo-Daten zurücksetzen?')) return;
      ctx.db.resetDemo();
      location.reload();
    });
  }
}

async function start() {
  try {
    ctx.db = await createDb();
    const auth = await ctx.db.getAuthState();

    if (auth.status === 'signedOut') {
      showScreen('login-screen');
      // Fehler vom GitHub-Login (steht in der Adresse) anzeigen und Adresse aufräumen
      const loginError = new URLSearchParams(location.search).get('error_description');
      if (loginError) {
        $('#login-error').textContent = `Anmeldung fehlgeschlagen: ${loginError}`;
        $('#login-error').hidden = false;
        history.replaceState(null, '', location.pathname);
      }
      $('#login-btn').addEventListener('click', () => ctx.db.signIn().catch(ctx.fail));
      return;
    }
    if (auth.status === 'notMember') {
      showScreen('denied-screen');
      $('#denied-login').textContent = auth.login || '(unbekannt)';
      $('#denied-logout').addEventListener('click', async () => {
        await ctx.db.signOut();
        location.reload();
      });
      return;
    }

    ctx.me = auth.me;
    await ctx.loadAll();
    setupHeader();
    for (const view of Object.values(VIEWS)) view.init(ctx);
    showScreen('app');
    showTab();
    window.addEventListener('hashchange', showTab);
    window.addEventListener('focus', refreshIfStale);
  } catch (err) {
    console.error(err);
    showScreen('error-screen');
    $('#error-text').textContent = err.message || String(err);
  }
}

start();
