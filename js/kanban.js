// Tab "Tasks": gemeinsame Aufgaben als Kanban-Board (Drag & Drop) oder als Liste.

import { $, esc, fmtDate, isoDate, personLabel, tagChips, toast, toggleChip, toggleChips } from './util.js';

const COLUMNS = [
  ['backlog', 'Backlog'],
  ['todo', 'To Do'],
  ['doing', 'In Bearbeitung'],
  ['done', 'Erledigt'],
];

// Kategorie bestimmt die Randfarbe (bewusst anders als die Personenfarben)
const CATEGORIES = {
  // Reihenfolge = Reihenfolge der Zeilen (Swimlanes) auf dem Board
  design: { label: 'Design', color: '#e879f9' },   // Fuchsia
  code: { label: 'Code', color: '#4169e1' },       // Royalblau
  admin: { label: 'Admin', color: '#cbd5e1' },     // Silber
  testing: { label: 'Testing', color: '#a3e635' }, // Limette
};

const PRIORITIES = { 1: 'Prio 1', 2: 'Prio 2', 3: 'Prio 3' };
const VIEW_KEY = 'fourcast-tasks-view';
const MAX_IMAGES = 10;        // pro Task
const MAX_IMAGE_SIDE = 1600;  // px, Bilder werden vor dem Hochladen verkleinert
// Hochgeladene, aber (noch) nicht gespeicherte Bilder: { pfad: Zeitpunkt }. Wird die Seite mit
// offenem Dialog geschlossen, räumt der nächste Start sie nach einer Weile weg.
const PENDING_KEY = 'fourcast-pending-images';
const PENDING_MAX_AGE_MS = 12 * 60 * 60 * 1000;

let ctx;
let cards = [];
let dialogTags = new Set();
let dialogAssignees = new Set();
let dialogSubtasks = []; // [{ title, done }]
// Zustand des offenen Task-Dialogs. Jedes Öffnen bekommt ein neues Objekt, damit ein später
// fertiger Upload oder Speichervorgang nicht im nächsten Dialog landet.
// { card (null = neu), images: Pfade, urls: { pfad: Link }, uploads: hier hochgeladen,
//   uploading, saving, saved, closed }
let dlg = newDialogState(null);
let draggedId = null;
let view = loadView(); // 'board' | 'list'
// Filter der Listenansicht ('' = alle)
let filters = { q: '', person: '', category: '', priority: '', status: '' };

// Gewählte Ansicht pro Browser merken (falls localStorage nicht geht: einfach Board)
function loadView() {
  try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'board'; } catch { return 'board'; }
}

function setView(next) {
  view = next;
  try { localStorage.setItem(VIEW_KEY, next); } catch { /* egal */ }
  render();
}

export function init(c) {
  ctx = c;
  const board = $('#board');
  board.addEventListener('click', onBoardClick);
  board.addEventListener('keydown', (e) => openOnKey(e, '.kanban-card'));
  board.addEventListener('dragstart', onDragStart);
  board.addEventListener('dragend', onDragEnd);
  board.addEventListener('dragover', onDragOver);
  board.addEventListener('drop', onDrop);
  $('#task-list').addEventListener('click', (e) => {
    const row = e.target.closest('[data-id]');
    if (row) openCard(row);
  });
  $('#task-list').addEventListener('keydown', (e) => openOnKey(e, 'tr[data-id]'));
  $('#tasks-view-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-view]');
    if (btn) setView(btn.dataset.view);
  });
  $('#task-new').addEventListener('click', () => openDialog(null));
  setupFilters();
  renderChoices();

  const form = $('#card-form');
  form.addEventListener('submit', saveCard);
  $('#card-cancel').addEventListener('click', () => $('#card-dialog').close());
  $('#card-delete').addEventListener('click', deleteCard);
  $('#card-tags').addEventListener('click', (e) => toggleChip(e, dialogTags, 'tag'));
  $('#card-assignees').addEventListener('click', (e) => toggleChip(e, dialogAssignees, 'member'));
  cleanupPendingUploads();

  // Unteraufgaben
  $('#subtask-add').addEventListener('click', addSubtask);
  $('#subtask-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addSubtask(); }
  });
  $('#subtask-list').addEventListener('change', (e) => {
    const i = Number(e.target.dataset.done);
    if (!Number.isNaN(i)) dialogSubtasks[i].done = e.target.checked;
  });
  $('#subtask-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    dialogSubtasks.splice(Number(btn.dataset.remove), 1);
    renderSubtasks();
  });

  // Bilder: Datei wählen, einfügen (Strg + V) oder in den Dialog ziehen
  const dialog = $('#card-dialog');
  $('#image-input').addEventListener('change', (e) => {
    addImages([...e.target.files]);
    e.target.value = '';
  });
  dialog.addEventListener('paste', (e) => {
    // Text (z. B. aus Word/Excel, das zusätzlich ein Bild mitliefert) normal einfügen
    if (e.clipboardData.types.includes('text/plain')) return;
    const files = [...e.clipboardData.files].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    addImages(files);
  });
  dialog.addEventListener('dragover', (e) => {
    if (e.dataTransfer.types.includes('Files')) e.preventDefault();
  });
  dialog.addEventListener('drop', (e) => {
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    addImages(files);
  });
  $('#card-images').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-image]');
    if (!btn) return;
    dlg.images.splice(Number(btn.dataset.removeImage), 1);
    renderImages();
  });
  // Ohne Speichern geschlossen: frisch hochgeladene Bilder wieder entfernen.
  // Läuft gerade das Speichern, entscheidet saveCard selbst, wenn es fertig ist.
  dialog.addEventListener('close', () => {
    dlg.closed = true;
    if (!dlg.saving && !dlg.saved) discardUploads(dlg);
  });
}

export async function show() {
  try {
    cards = await ctx.db.listCards();
  } catch (err) { ctx.fail(err); return; }
  render();
}

function render() {
  for (const btn of document.querySelectorAll('#tasks-view-toggle [data-view]')) {
    btn.setAttribute('aria-pressed', btn.dataset.view === view);
  }
  $('#board').hidden = view !== 'board';
  $('.board-hint').hidden = view !== 'board';
  $('#task-filters').hidden = view !== 'list';
  $('#task-list').hidden = view !== 'list';
  if (view === 'board') renderBoard(); else renderList();
}

// ---------------------------------------------------------------------
// Gemeinsame Bausteine
// ---------------------------------------------------------------------
// Karten einer Zelle (Status + Kategorie), sortiert
function cardsIn(status, category) {
  return cards
    .filter((c) => c.status === status && (CATEGORIES[c.category] ? c.category : '') === category)
    .sort((a, b) => a.position - b.position);
}

// Zuständige: bis zwei mit Namen, sonst nur farbige Punkte
function assigneesHtml(c) {
  const people = c.assignees.map((u) => ctx.memberMap.get(u)).filter(Boolean);
  if (!people.length) return '<span class="muted">Niemand</span>';
  if (people.length <= 2) return people.map(personLabel).join(' ');
  return `<span class="dots" title="${esc(people.map((m) => m.display_name).join(', '))}">${
    people.map((m) => `<span class="dot" style="--c:${esc(m.color)}"></span>`).join('')}</span> ${people.length} Personen`;
}

function subtaskProgress(c) {
  if (!c.subtasks.length) return '';
  const done = c.subtasks.filter((s) => s.done).length;
  return `<span class="subtask-progress${done === c.subtasks.length ? ' complete' : ''}">☑ ${done}/${c.subtasks.length}</span>`;
}

function dueHtml(c) {
  if (!c.due_date) return '';
  const overdue = c.status !== 'done' && c.due_date < isoDate();
  return `<span class="${overdue ? 'overdue' : 'muted'}">📅 ${esc(fmtDate(c.due_date))}</span>`;
}

// ---------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------
// Raster: Spalten = Status, Zeilen (Swimlanes) = Kategorie, getrennt durch eine farbige Linie.
// Karten ohne Kategorie kommen in eine letzte Zeile, aber nur wenn es welche gibt.
function renderBoard() {
  const lanes = Object.keys(CATEGORIES);
  if (cards.some((c) => !CATEGORIES[c.category])) lanes.push('');

  const head = COLUMNS.map(([status, label]) => `
    <header class="kanban-col-head">
      <h2>${label} <span class="count">${cards.filter((c) => c.status === status).length}</span></h2>
    </header>`).join('');

  const rows = lanes.map((category) => `
    <div class="kanban-lane-sep" style="--c:${CATEGORIES[category]?.color || 'var(--border)'}"></div>
    ${COLUMNS.map(([status]) => `
      <div class="kanban-list" data-status="${status}" data-category="${category}" title="Klicken, um hier einen Task anzulegen">
        ${cardsIn(status, category).map(cardHtml).join('')}
      </div>`).join('')}`).join('');

  $('#board').innerHTML = head + rows + COLUMNS.map(() => '<div class="kanban-col-foot"></div>').join('');
}

function cardHtml(c) {
  return `<article class="kanban-card" draggable="true" tabindex="0" role="button" data-id="${esc(c.id)}"
      style="--c:${CATEGORIES[c.category]?.color || 'var(--border)'}">
    <div class="kanban-badges">
      <span class="prio prio-${c.priority}">${PRIORITIES[c.priority] || ''}</span>
      ${subtaskProgress(c)}
      ${c.images.length ? `<span class="muted" title="Bilder">🖼 ${c.images.length}</span>` : ''}
    </div>
    <div class="kanban-title">${esc(c.title)}</div>
    ${c.tags.length ? `<div class="chips">${tagChips(c.tags, ctx.tagMap)}</div>` : ''}
    <div class="kanban-meta">
      <span>${assigneesHtml(c)}</span>
      ${dueHtml(c)}
    </div>
  </article>`;
}

// Karte anklicken = bearbeiten, freie Stelle in einer Zelle = neuer Task genau dort
function onBoardClick(e) {
  const card = e.target.closest('.kanban-card');
  if (card) { openCard(card); return; }
  const cell = e.target.closest('.kanban-list');
  if (cell) openDialog(null, cell.dataset.status, cell.dataset.category);
}

// Element mit data-id (Karte oder Listenzeile) im Dialog öffnen
function openCard(el) {
  openDialog(cards.find((c) => c.id === el.dataset.id));
}

// Tastatur: fokussierte Karte (Board) oder Zeile (Liste) mit Enter oder Leertaste öffnen
function openOnKey(e, selector) {
  if ((e.key !== 'Enter' && e.key !== ' ') || !e.target.matches(selector)) return;
  e.preventDefault();
  openCard(e.target);
}

// ---------------------------------------------------------------------
// Liste: nach Spalte, darin nach Kategorie und Reihenfolge wie auf dem Board
// ---------------------------------------------------------------------
function setupFilters() {
  const el = $('#task-filters');
  const options = (pairs) => pairs.map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`).join('');
  el.person.innerHTML = options([['', 'Alle'], ...ctx.members.map((m) => [m.github_username, m.display_name]), ['-', 'Niemand']]);
  el.category.innerHTML = options([['', 'Alle'], ...Object.entries(CATEGORIES).map(([v, c]) => [v, c.label])]);
  el.priority.innerHTML = options([['', 'Alle'], ...Object.entries(PRIORITIES)]);
  el.status.innerHTML = options([['', 'Alle'], ['open', 'Alle offenen'], ...COLUMNS]);
  el.addEventListener('submit', (e) => e.preventDefault());
  el.addEventListener('input', () => {
    filters = {
      q: el.q.value.trim().toLowerCase(),
      person: el.person.value,
      category: el.category.value,
      priority: el.priority.value,
      status: el.status.value,
    };
    renderList();
  });
}

function matchesFilters(c) {
  const f = filters;
  const text = `${c.title} ${c.description || ''} ${c.subtasks.map((s) => s.title).join(' ')}`.toLowerCase();
  if (f.q && !text.includes(f.q)) return false;
  if (f.person === '-' ? c.assignees.length : f.person && !c.assignees.includes(f.person)) return false;
  if (f.category && c.category !== f.category) return false;
  if (f.priority && String(c.priority) !== f.priority) return false;
  if (f.status === 'open' ? c.status === 'done' : f.status && c.status !== f.status) return false;
  return true;
}

function renderList() {
  const statusOrder = COLUMNS.map(([s]) => s);
  const catOrder = Object.keys(CATEGORIES);
  const catIndex = (c) => (CATEGORIES[c.category] ? catOrder.indexOf(c.category) : catOrder.length);
  const sorted = cards.filter(matchesFilters).sort((a, b) =>
    statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
    || catIndex(a) - catIndex(b)
    || a.position - b.position);

  if (!sorted.length) {
    $('#task-list').innerHTML = `<p class="empty">${cards.length ? 'Keine Tasks für diese Filter.' : 'Noch keine Tasks.'}</p>`;
    return;
  }
  const statusLabel = Object.fromEntries(COLUMNS);
  $('#task-list').innerHTML = `<div class="table-wrap"><table class="entries task-table">
    <thead><tr><th>Aufgabe</th><th>Spalte</th><th>Prio</th><th>Zuständig</th><th>Fällig</th><th>Unteraufgaben</th></tr></thead>
    <tbody>${sorted.map((c) => `
      <tr data-id="${esc(c.id)}" tabindex="0" class="${c.status === 'done' ? 'done' : ''}"
          style="--c:${CATEGORIES[c.category]?.color || 'var(--border)'}">
        <td class="task-title">${esc(c.title)}</td>
        <td class="nowrap">${statusLabel[c.status]}</td>
        <td><span class="prio prio-${c.priority}">${PRIORITIES[c.priority] || ''}</span></td>
        <td class="nowrap">${assigneesHtml(c)}</td>
        <td class="nowrap">${dueHtml(c)}</td>
        <td>${subtaskProgress(c)}</td>
      </tr>`).join('')}
    </tbody></table></div>`;
}

// ---------------------------------------------------------------------
// Drag & Drop (nur Board)
// ---------------------------------------------------------------------
function onDragStart(e) {
  const card = e.target.closest('.kanban-card');
  if (!card) return;
  draggedId = card.dataset.id;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedId);
  requestAnimationFrame(() => card.classList.add('dragging'));
}

function onDragEnd() {
  draggedId = null;
  clearDropMarkers();
  document.querySelectorAll('.kanban-card.dragging').forEach((el) => el.classList.remove('dragging'));
}

function clearDropMarkers() {
  document.querySelectorAll('.drop-before, .drop-end').forEach((el) => el.classList.remove('drop-before', 'drop-end'));
}

// Vor welcher Karte (oder am Ende) soll eingefügt werden?
function dropTarget(list, y) {
  const others = [...list.querySelectorAll('.kanban-card:not(.dragging)')];
  return others.find((el) => {
    const r = el.getBoundingClientRect();
    return y < r.top + r.height / 2;
  }) || null;
}

function onDragOver(e) {
  const list = e.target.closest('.kanban-list');
  if (!list || !draggedId) return;
  e.preventDefault();
  clearDropMarkers();
  const before = dropTarget(list, e.clientY);
  if (before) before.classList.add('drop-before'); else list.classList.add('drop-end');
}

async function onDrop(e) {
  const list = e.target.closest('.kanban-list');
  if (!list || !draggedId) return;
  e.preventDefault();
  const id = draggedId;
  const status = list.dataset.status;
  const category = list.dataset.category || null; // Zeile wechseln = Kategorie wechseln
  const beforeEl = dropTarget(list, e.clientY);
  clearDropMarkers();

  const colCards = cardsIn(status, list.dataset.category).filter((c) => c.id !== id);
  const idx = beforeEl ? colCards.findIndex((c) => c.id === beforeEl.dataset.id) : colCards.length;
  const prev = colCards[idx - 1];
  const next = colCards[idx];
  let position;
  if (prev && next) position = (prev.position + next.position) / 2;
  else if (prev) position = prev.position + 1;
  else if (next) position = next.position - 1;
  else position = 0;

  const card = cards.find((c) => c.id === id);
  if (card.status === status && card.position === position && (card.category || null) === category) return;
  const old = { status: card.status, position: card.position, category: card.category };
  Object.assign(card, { status, position, category });
  renderBoard();
  try {
    await ctx.db.updateCard(id, { status, position, category });
  } catch (err) {
    Object.assign(card, old);
    renderBoard();
    ctx.fail(err);
  }
}

// ---------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------
function dialogError(message) {
  $('#card-error').textContent = message || '';
  $('#card-error').hidden = !message;
}

function renderSubtasks() {
  $('#subtask-list').innerHTML = dialogSubtasks.map((s, i) => `
    <li>
      <label class="check"><input type="checkbox" data-done="${i}" ${s.done ? 'checked' : ''}> <span>${esc(s.title)}</span></label>
      <button type="button" class="icon-btn" data-remove="${i}" title="Entfernen">✕</button>
    </li>`).join('');
}

// ---------------------------------------------------------------------
// Bilder
// ---------------------------------------------------------------------
function newDialogState(card) {
  return {
    card, images: [...(card?.images || [])], urls: {}, uploads: [],
    uploading: 0, saving: false, saved: false, closed: false,
  };
}

function pendingUploads() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY)) || {}; } catch { return {}; }
}

function markPending(paths, pending) {
  const all = pendingUploads();
  for (const p of paths) {
    if (pending) all[p] = Date.now(); else delete all[p];
  }
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(all)); } catch { /* egal */ }
}

// Übrig gebliebene Uploads früherer Sitzungen löschen (nur ältere, ein anderer Tab könnte sie noch brauchen)
function cleanupPendingUploads() {
  const old = Object.entries(pendingUploads())
    .filter(([, at]) => Date.now() - at > PENDING_MAX_AGE_MS)
    .map(([path]) => path);
  if (old.length) ctx.db.deleteImages(old).then(() => markPending(old, false)).catch(console.error);
}

// In diesem Dialog hochgeladene Bilder löschen (nur die angegebenen, sonst alle)
function discardUploads(d, paths = d.uploads) {
  if (!paths.length) return;
  ctx.db.deleteImages(paths).then(() => markPending(paths, false)).catch(console.error);
}

function renderImages() {
  const d = dlg;
  $('#card-images').innerHTML = d.images.map((path, i) => {
    const url = d.urls[path];
    return `<div class="image-thumb">
      ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt=""></a>` : '<span class="muted small">Lädt …</span>'}
      <button type="button" class="icon-btn" data-remove-image="${i}" title="Bild entfernen">✕</button>
    </div>`;
  }).join('');
  $('#image-status').textContent = d.uploading
    ? `Lädt ${d.uploading} Bild${d.uploading > 1 ? 'er' : ''} hoch …`
    : 'oder mit Strg + V einfügen / hineinziehen';
}

// Auf max. MAX_IMAGE_SIDE px verkleinern und als WebP (sonst JPEG) speichern
async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const toBlob = (type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  const webp = await toBlob('image/webp', 0.82);
  return webp?.type === 'image/webp' ? webp : toBlob('image/jpeg', 0.85);
}

async function addImages(files) {
  const d = dlg;
  if (d.closed) return;
  dialogError('');
  const room = MAX_IMAGES - d.images.length - d.uploading;
  if (files.length > room) dialogError(`Maximal ${MAX_IMAGES} Bilder pro Task.`);
  await Promise.all(files.slice(0, Math.max(0, room)).map(async (file) => {
    d.uploading++;
    renderImages();
    try {
      const path = await ctx.db.uploadImage(await compressImage(file));
      markPending([path], true);
      // Dialog inzwischen zu: Bild gehört zu keinem Task mehr
      if (d.closed) { discardUploads(d, [path]); return; }
      d.uploads.push(path);
      Object.assign(d.urls, await ctx.db.imageUrls([path]));
      d.images.push(path);
    } catch (err) {
      if (d === dlg) dialogError(`Bild konnte nicht hochgeladen werden: ${err.message || err}`);
    } finally {
      d.uploading--;
      if (d === dlg) renderImages();
    }
  }));
}

async function loadImageUrls() {
  const d = dlg;
  renderImages();
  if (!d.images.length) return;
  try {
    d.urls = await ctx.db.imageUrls(d.images);
  } catch (err) {
    if (d === dlg) dialogError(`Bilder konnten nicht geladen werden: ${err.message || err}`);
  }
  if (d === dlg) renderImages();
}

function addSubtask() {
  const input = $('#subtask-input');
  const title = input.value.trim();
  if (!title) return;
  dialogSubtasks.push({ title, done: false });
  input.value = '';
  renderSubtasks();
  input.focus();
}

// Spalte, Kategorie und Priorität als Chips zum Anklicken (Radio-Buttons, je genau eine Wahl)
function renderChoices() {
  const chips = (name, pairs) => pairs.map(([value, label, color]) => `
    <label class="chip" style="--c:${color || 'var(--accent)'}"><input type="radio" name="${name}" value="${value}">${esc(label)}</label>`).join('');
  $('#card-status').innerHTML = chips('status', COLUMNS);
  $('#card-category').innerHTML = chips('category', Object.entries(CATEGORIES).map(([v, c]) => [v, c.label, c.color]));
  $('#card-priority').innerHTML = chips('priority', Object.entries(PRIORITIES));
}

// Neue Tasks: Backlog, Design, Prio 3 – ausser man klickt auf eine Zelle im Board
function openDialog(card, status = 'backlog', category = '') {
  dlg = newDialogState(card);
  const form = $('#card-form');
  form.reset();
  dialogError('');

  form.title.value = card?.title || '';
  form.description.value = card?.description || '';
  form.status.value = card?.status || status;
  form.category.value = card ? card.category || '' : category || 'design';
  form.priority.value = String(card?.priority || 3);
  form.due_date.value = card?.due_date || '';

  dialogAssignees = new Set(card?.assignees || []);
  $('#card-assignees').innerHTML = toggleChips(
    ctx.members.map((m) => ({ value: m.github_username, label: m.display_name, color: m.color })), dialogAssignees, 'member');
  dialogTags = new Set(card?.tags || []);
  $('#card-tags').innerHTML = toggleChips(
    ctx.tags.map((t) => ({ value: t.name, label: t.name, color: t.color })), dialogTags, 'tag');
  dialogSubtasks = structuredClone(card?.subtasks || []);
  renderSubtasks();
  loadImageUrls();

  $('#card-delete').hidden = !card;
  const creator = card && ctx.memberMap.get(card.created_by);
  $('#card-meta').textContent = creator ? `Angelegt von ${creator.display_name}` : '';
  $('#card-dialog').showModal();
  form.title.focus();
}

async function saveCard(e) {
  e.preventDefault();
  const form = $('#card-form');
  const title = form.title.value.trim();
  if (!title) { dialogError('Bitte einen Titel eingeben.'); return; }
  if (!form.status.value) { dialogError('Bitte eine Spalte wählen.'); return; }
  if (!form.category.value) { dialogError('Bitte eine Kategorie wählen.'); return; }
  if (!form.priority.value) { dialogError('Bitte eine Priorität wählen.'); return; }
  const d = dlg;
  if (d.uploading) { dialogError('Bitte warten, bis die Bilder hochgeladen sind.'); return; }
  if (d.saving) return;
  const editing = d.card;

  const status = form.status.value;
  const payload = {
    title,
    priority: Number(form.priority.value),
    category: form.category.value,
    description: form.description.value.trim() || null,
    status,
    assignees: ctx.members.map((m) => m.github_username).filter((u) => dialogAssignees.has(u)),
    due_date: form.due_date.value || null,
    tags: ctx.tags.map((t) => t.name).filter((n) => dialogTags.has(n)),
    subtasks: dialogSubtasks,
    images: [...d.images],
  };
  // Neue Karte oder Spalten-/Kategoriewechsel: ans Ende der Zelle
  if (!editing || editing.status !== status || (editing.category || null) !== payload.category) {
    const cell = cardsIn(status, payload.category || '').filter((c) => c.id !== editing?.id);
    payload.position = cell.length ? cell.at(-1).position + 1 : 0;
  }

  d.saving = true;
  try {
    if (editing) await ctx.db.updateCard(editing.id, payload);
    else await ctx.db.addCard(payload);
    d.saved = true;
    markPending(payload.images, false);
    // Entfernte Bilder (auch eben hochgeladene) auch im Speicher löschen
    const removed = [...(editing?.images || []), ...d.uploads].filter((p) => !payload.images.includes(p));
    discardUploads(d, removed);
    if (d === dlg && !d.closed) $('#card-dialog').close();
    toast(editing ? 'Task gespeichert.' : 'Task angelegt.');
    await show();
  } catch (err) {
    // Dialog wurde während des Speicherns geschlossen: Bilder gehören zu keinem Task
    if (d.closed) { discardUploads(d); ctx.fail(err); } else dialogError(err.message || String(err));
  } finally {
    d.saving = false;
  }
}

async function deleteCard() {
  const d = dlg;
  const card = d.card;
  if (!card || !confirm(`Task „${card.title}“ löschen?`)) return;
  try {
    await ctx.db.deleteCard(card.id);
    // Alle Bilder des Tasks (auch eben hochgeladene) löschen
    d.saved = true;
    discardUploads(d, [...new Set([...card.images, ...d.uploads])]);
    $('#card-dialog').close();
    toast('Task gelöscht.');
    await show();
  } catch (err) {
    dialogError(err.message || String(err));
  }
}
