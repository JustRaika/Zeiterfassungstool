// Tab "Dateien": Wer arbeitet gerade an welcher Datei im Unreal-Projekt? Binärdateien (.uasset, .umap)
// lassen sich nicht zusammenführen, darum trägt man hier ein, was man gerade anfasst. Die Liste ist
// eine Absprache im Team, keine technische Sperre im Repository.
// Sie bleibt von selbst aktuell: sofort über Supabase Realtime, zusätzlich alle 60 s und beim
// Zurückkehren in den Tab (falls die Live-Verbindung einmal fehlt).

import { $, confirmDialog, esc, hhmm, personLabel, toast } from './util.js';

const POLL_MS = 60_000;
const MIN_RELOAD_GAP_MS = 5_000; // Fokus-Wechsel kurz hintereinander lösen nur einen Abruf aus
const MAX_PATH = 300;

let ctx;
let locks = [];
let live = false; // Live-Verbindung steht
let lastLoad = 0;

// Pfad vereinheitlichen: Windows-Schrägstriche, doppelte und führende Schrägstriche weg
export function normalizePath(raw) {
  return raw.trim().replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/^\//, '');
}

// Ordner enden mit "/" und sperren alles darin
const isFolder = (path) => path.endsWith('/');

// Sperre aus list, die path im Weg steht: derselbe Pfad (Gross/Klein egal) oder ein Ordner,
// in dem der andere Pfad liegt. null = frei.
export function findConflict(path, list) {
  const p = path.toLowerCase();
  return list.find((lock) => {
    const q = lock.path.toLowerCase();
    return p === q || (isFolder(q) && p.startsWith(q)) || (isFolder(p) && q.startsWith(p));
  }) || null;
}

// "gerade eben", "seit 12 min", "seit 3 h", "seit 2 Tagen"
export function since(date, now = new Date()) {
  const minutes = Math.floor((now - date) / 60_000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `seit ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `seit ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'seit gestern' : `seit ${days} Tagen`;
}

export function init(c) {
  ctx = c;
  $('#lock-form').addEventListener('submit', addLocks);
  $('#lock-form').addEventListener('input', () => formError(''));
  $('#lock-search').addEventListener('input', render);
  $('#locks-release-mine').addEventListener('click', releaseMine);
  $('#lock-list').addEventListener('click', (e) => {
    const id = e.target.closest('[data-release]')?.dataset.release;
    if (id) release(locks.find((l) => l.id === id));
  });

  // Läuft ab dem Start im Hintergrund, damit die Zahl in der Navigation auf jedem Reiter stimmt
  ctx.db.onLocksChange(() => load(), (connected) => {
    live = connected;
    renderStatus();
  });
  setInterval(() => { if (document.visibilityState === 'visible') load(); }, POLL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastLoad > MIN_RELOAD_GAP_MS) load();
  });
  load();
}

export function show() {
  load();
}

// Sperren neu holen. Läuft oft im Hintergrund: Fehler stören nicht mit einer Meldung,
// sie stehen nur beim Stand (ausser die Person hat selbst etwas ausgelöst, dann meldet es der Aufrufer).
async function load() {
  lastLoad = Date.now();
  try {
    locks = await ctx.db.listLocks();
    render();
    renderStatus();
  } catch (err) {
    console.error(err);
    renderStatus('Keine Verbindung, Stand evtl. veraltet');
  }
}

function renderStatus(problem = '') {
  $('#locks-status').textContent = problem || `${live ? 'Live · ' : ''}Stand ${hhmm(new Date(lastLoad))} Uhr`;
  $('#locks-status').classList.toggle('error-text', !!problem);
}

function canRelease(lock) {
  return lock.locked_by === ctx.me.github_username || !!ctx.me.is_admin;
}

function render() {
  const count = $('#nav-locks');
  count.textContent = locks.length;
  count.hidden = !locks.length;

  const mine = locks.filter((l) => l.locked_by === ctx.me.github_username);
  $('#locks-release-mine').hidden = mine.length < 2;

  const q = normalizePath($('#lock-search').value).toLowerCase();
  // Eigene zuerst, dann die neuesten
  const shown = locks
    .filter((l) => !q || l.path.toLowerCase().includes(q))
    .sort((a, b) => (b.locked_by === ctx.me.github_username) - (a.locked_by === ctx.me.github_username)
      || b.locked_at.localeCompare(a.locked_at));

  if (!shown.length) {
    $('#lock-list').innerHTML = `<p class="empty">${locks.length ? 'Kein gesperrter Pfad passt zur Suche.' : 'Gerade ist nichts gesperrt.'}</p>`;
    return;
  }
  const now = new Date();
  $('#lock-list').innerHTML = `<div class="table-wrap"><table class="entries lock-table">
    <thead><tr><th>Datei oder Ordner</th><th>Wer</th><th>Seit</th><th>Notiz</th><th></th></tr></thead>
    <tbody>${shown.map((l) => `
      <tr class="${l.locked_by === ctx.me.github_username ? 'own' : ''}">
        <td class="lock-path">${esc(l.path)}</td>
        <td class="nowrap">${personLabel(ctx.memberMap.get(l.locked_by))}</td>
        <td class="nowrap muted" title="${esc(new Date(l.locked_at).toLocaleString('de-DE'))}">${since(new Date(l.locked_at), now)}</td>
        <td class="comment">${esc(l.note || '')}</td>
        <td class="actions">${canRelease(l) ? `<button class="icon-btn" data-release="${esc(l.id)}">Freigeben</button>` : ''}</td>
      </tr>`).join('')}
    </tbody></table></div>`;
}

function formError(message) {
  $('#lock-error').textContent = message;
  $('#lock-error').hidden = !message;
}

function ownerName(lock) {
  return lock.locked_by === ctx.me.github_username ? 'dir' : ctx.memberMap.get(lock.locked_by)?.display_name || lock.locked_by;
}

async function addLocks(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const paths = [...new Set(form.paths.value.split('\n').map(normalizePath).filter(Boolean))];
  if (!paths.length) { formError('Bitte mindestens einen Pfad eintragen.'); form.paths.focus(); return; }
  const tooLong = paths.find((p) => p.length > MAX_PATH);
  if (tooLong) { formError(`Ein Pfad ist länger als ${MAX_PATH} Zeichen.`); return; }

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    // Mit dem neuesten Stand prüfen, nicht mit dem, der vielleicht seit einer Minute auf dem Bildschirm steht
    locks = await ctx.db.listLocks();
    const taken = paths.map((p) => [p, findConflict(p, locks)]).filter(([, lock]) => lock);
    if (taken.length) {
      render();
      formError(taken.map(([p, lock]) =>
        `${p} ist schon von ${ownerName(lock)} gesperrt${lock.path.toLowerCase() === p.toLowerCase() ? '' : ` (${lock.path})`}.`).join('\n'));
      return;
    }
    const note = form.note.value.trim() || null;
    await ctx.db.addLocks(paths.map((path) => ({ path, note })));
    form.reset();
    formError('');
    toast(paths.length === 1 ? 'Datei gesperrt.' : `${paths.length} Pfade gesperrt.`);
  } catch (err) {
    // Zwei Personen im selben Moment: die Datenbank lässt denselben Pfad nur einmal zu
    if (/duplicate key|unique/i.test(err.message || '')) formError('Ein Pfad wurde gerade eben von jemand anderem gesperrt.');
    else ctx.fail(err);
  } finally {
    btn.disabled = false;
    load();
  }
}

async function release(lock) {
  if (!lock) return;
  const foreign = lock.locked_by !== ctx.me.github_username;
  if (foreign && !await confirmDialog(`Sperre von ${ownerName(lock)} auf „${lock.path}“ aufheben?`, 'Freigeben')) return;
  await releaseLocks([lock], 'Freigegeben.');
}

async function releaseMine() {
  const mine = locks.filter((l) => l.locked_by === ctx.me.github_username);
  if (!await confirmDialog(`Alle deine ${mine.length} Sperren freigeben?`, 'Freigeben')) return;
  await releaseLocks(mine, 'Alle deine Sperren freigegeben.');
}

async function releaseLocks(list, message) {
  try {
    await ctx.db.deleteLocks(list.map((l) => l.id));
    toast(message);
  } catch (err) {
    ctx.fail(err);
  }
  load();
}
