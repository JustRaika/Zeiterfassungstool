// Tab "Board": gemeinsames Kanban-Board mit Drag & Drop (Desktop) und Dialog (überall).

import { $, esc, fmtDate, isoDate, personLabel, tagChips, toast } from './util.js';

const COLUMNS = [
  ['backlog', 'Backlog'],
  ['todo', 'To Do'],
  ['doing', 'In Bearbeitung'],
  ['done', 'Erledigt'],
];

// Kategorie bestimmt die Randfarbe (bewusst anders als die Personenfarben)
export const CATEGORIES = {
  // Reihenfolge = Reihenfolge der Zeilen (Swimlanes) auf dem Board
  design: { label: 'Design', color: '#e879f9' },   // Fuchsia
  code: { label: 'Code', color: '#2dd4bf' },       // Türkis
  admin: { label: 'Admin', color: '#cbd5e1' },     // Silber
  testing: { label: 'Testing', color: '#a3e635' }, // Limette
};

const PRIORITIES = { 1: 'Prio 1', 2: 'Prio 2', 3: 'Prio 3' };

let ctx;
let cards = [];
let editing = null;     // Karte im Dialog, null = neu
let newStatus = 'todo'; // Spalte für eine neue Karte
let dialogTags = new Set();
let draggedId = null;

export function init(c) {
  ctx = c;
  const board = $('#board');
  board.addEventListener('click', onBoardClick);
  board.addEventListener('dragstart', onDragStart);
  board.addEventListener('dragend', onDragEnd);
  board.addEventListener('dragover', onDragOver);
  board.addEventListener('drop', onDrop);

  const form = $('#card-form');
  form.addEventListener('submit', saveCard);
  $('#card-cancel').addEventListener('click', () => $('#card-dialog').close());
  $('#card-delete').addEventListener('click', deleteCard);
  $('#card-tags').addEventListener('click', (e) => {
    const chip = e.target.closest('button.chip');
    if (!chip) return;
    const name = chip.dataset.tag;
    if (dialogTags.has(name)) dialogTags.delete(name); else dialogTags.add(name);
    chip.setAttribute('aria-pressed', dialogTags.has(name));
  });
}

export async function show() {
  try {
    cards = await ctx.db.listCards();
  } catch (err) { ctx.fail(err); return; }
  render();
}

// ---------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------
// Raster: Spalten = Status, Zeilen (Swimlanes) = Kategorie, getrennt durch eine farbige Linie.
// Karten ohne Kategorie kommen in eine letzte Zeile, aber nur wenn es welche gibt.
function render() {
  const lanes = Object.keys(CATEGORIES);
  if (cards.some((c) => !CATEGORIES[c.category])) lanes.push('');

  const head = COLUMNS.map(([status, label]) => `
    <header class="kanban-col-head">
      <h2>${label} <span class="count">${cards.filter((c) => c.status === status).length}</span></h2>
      <button class="icon-btn" data-add="${status}" title="Karte hinzufügen">+</button>
    </header>`).join('');

  const rows = lanes.map((category) => `
    <div class="kanban-lane-sep" style="--c:${CATEGORIES[category]?.color || 'var(--border)'}"></div>
    ${COLUMNS.map(([status]) => `
      <div class="kanban-list" data-status="${status}" data-category="${category}">
        ${cardsIn(status, category).map(cardHtml).join('')}
      </div>`).join('')}`).join('');

  $('#board').innerHTML = head + rows + COLUMNS.map(() => '<div class="kanban-col-foot"></div>').join('');
}

// Karten einer Zelle (Status + Kategorie), sortiert
function cardsIn(status, category) {
  return cards
    .filter((c) => c.status === status && (CATEGORIES[c.category] ? c.category : '') === category)
    .sort((a, b) => a.position - b.position);
}

function cardHtml(c) {
  const assignee = ctx.memberMap.get(c.assignee);
  const category = CATEGORIES[c.category];
  const overdue = c.due_date && c.status !== 'done' && c.due_date < isoDate();
  return `<article class="kanban-card" draggable="true" data-id="${esc(c.id)}"
      style="--c:${category?.color || 'var(--border)'}">
    <div class="kanban-badges">
      <span class="prio prio-${c.priority}">${PRIORITIES[c.priority] || ''}</span>
    </div>
    <div class="kanban-title">${esc(c.title)}</div>
    ${c.tags.length ? `<div class="chips">${tagChips(c.tags, ctx.tagMap)}</div>` : ''}
    <div class="kanban-meta">
      <span>${assignee ? personLabel(assignee) : '<span class="muted">Niemand</span>'}</span>
      ${c.due_date ? `<span class="${overdue ? 'overdue' : 'muted'}">📅 ${esc(fmtDate(c.due_date))}</span>` : ''}
    </div>
  </article>`;
}

function onBoardClick(e) {
  const add = e.target.closest('[data-add]');
  if (add) { openDialog(null, add.dataset.add); return; }
  const card = e.target.closest('.kanban-card');
  if (card) openDialog(cards.find((c) => c.id === card.dataset.id));
}

// ---------------------------------------------------------------------
// Drag & Drop
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
  render();
  try {
    await ctx.db.updateCard(id, { status, position, category });
  } catch (err) {
    Object.assign(card, old);
    render();
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

function openDialog(card, status = 'todo') {
  editing = card;
  newStatus = status;
  const form = $('#card-form');
  form.reset();
  dialogError('');

  form.status.innerHTML = COLUMNS.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  form.assignee.innerHTML = '<option value="">Niemand</option>' +
    ctx.members.map((m) => `<option value="${esc(m.github_username)}">${esc(m.display_name)}</option>`).join('');
  // Priorität muss bei neuen Karten bewusst gewählt werden, daher kein Vorschlag
  form.priority.innerHTML = '<option value="" disabled>Bitte wählen …</option>' +
    Object.entries(PRIORITIES).map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  form.category.innerHTML = '<option value="">Keine</option>' +
    Object.entries(CATEGORIES).map(([value, c]) => `<option value="${value}">${c.label}</option>`).join('');
  form.priority.value = card?.priority ? String(card.priority) : '';
  form.category.value = card?.category || '';

  form.title.value = card?.title || '';
  form.description.value = card?.description || '';
  form.status.value = card?.status || status;
  form.assignee.value = card?.assignee || '';
  form.due_date.value = card?.due_date || '';
  dialogTags = new Set(card?.tags || []);
  $('#card-tags').innerHTML = ctx.tags.map((t) =>
    `<button type="button" class="chip" data-tag="${esc(t.name)}" style="--c:${esc(t.color)}"
      aria-pressed="${dialogTags.has(t.name)}">${esc(t.name)}</button>`).join('');

  $('#card-dialog-title').textContent = card ? 'Karte bearbeiten' : 'Neue Karte';
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
  if (!form.priority.value) { dialogError('Bitte eine Priorität wählen.'); return; }

  const status = form.status.value;
  const payload = {
    title,
    priority: Number(form.priority.value),
    category: form.category.value || null,
    description: form.description.value.trim() || null,
    status,
    assignee: form.assignee.value || null,
    due_date: form.due_date.value || null,
    tags: ctx.tags.map((t) => t.name).filter((n) => dialogTags.has(n)),
  };
  // Neue Karte oder Spalten-/Kategoriewechsel: ans Ende der Zelle
  if (!editing || editing.status !== status || (editing.category || null) !== payload.category) {
    const cell = cardsIn(status, payload.category || '').filter((c) => c.id !== editing?.id);
    payload.position = cell.length ? cell.at(-1).position + 1 : 0;
  }

  try {
    if (editing) await ctx.db.updateCard(editing.id, payload);
    else await ctx.db.addCard(payload);
    $('#card-dialog').close();
    toast(editing ? 'Karte gespeichert.' : 'Karte angelegt.');
    await show();
  } catch (err) {
    dialogError(err.message || String(err));
  }
}

async function deleteCard() {
  if (!editing || !confirm(`Karte „${editing.title}“ löschen?`)) return;
  try {
    await ctx.db.deleteCard(editing.id);
    $('#card-dialog').close();
    toast('Karte gelöscht.');
    await show();
  } catch (err) {
    dialogError(err.message || String(err));
  }
}
