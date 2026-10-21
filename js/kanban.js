// Tab "Board": gemeinsames Kanban-Board mit Drag & Drop (Desktop) und Dialog (überall).

import { $, esc, fmtDate, isoDate, personLabel, tagChips, toast } from './util.js';

const COLUMNS = [
  ['backlog', 'Ideen'],
  ['todo', 'To Do'],
  ['doing', 'In Arbeit'],
  ['done', 'Erledigt'],
];

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
function render() {
  $('#board').innerHTML = COLUMNS.map(([status, label]) => {
    const colCards = cardsIn(status);
    return `<section class="kanban-col" data-status="${status}">
      <header class="kanban-col-head">
        <h2>${label} <span class="count">${colCards.length}</span></h2>
        <button class="icon-btn" data-add="${status}" title="Karte hinzufügen">+</button>
      </header>
      <div class="kanban-list" data-status="${status}">
        ${colCards.map(cardHtml).join('') || '<p class="kanban-empty">Hierher ziehen</p>'}
      </div>
    </section>`;
  }).join('');
}

function cardsIn(status) {
  return cards.filter((c) => c.status === status).sort((a, b) => a.position - b.position);
}

function cardHtml(c) {
  const assignee = ctx.memberMap.get(c.assignee);
  const overdue = c.due_date && c.status !== 'done' && c.due_date < isoDate();
  return `<article class="kanban-card" draggable="true" data-id="${esc(c.id)}"
      style="--c:${esc(assignee?.color || 'var(--border)')}">
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
  const beforeEl = dropTarget(list, e.clientY);
  clearDropMarkers();

  const colCards = cardsIn(status).filter((c) => c.id !== id);
  const idx = beforeEl ? colCards.findIndex((c) => c.id === beforeEl.dataset.id) : colCards.length;
  const prev = colCards[idx - 1];
  const next = colCards[idx];
  let position;
  if (prev && next) position = (prev.position + next.position) / 2;
  else if (prev) position = prev.position + 1;
  else if (next) position = next.position - 1;
  else position = 0;

  const card = cards.find((c) => c.id === id);
  if (card.status === status && card.position === position) return;
  const old = { status: card.status, position: card.position };
  Object.assign(card, { status, position });
  render();
  try {
    await ctx.db.updateCard(id, { status, position });
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

  const status = form.status.value;
  const payload = {
    title,
    description: form.description.value.trim() || null,
    status,
    assignee: form.assignee.value || null,
    due_date: form.due_date.value || null,
    tags: ctx.tags.map((t) => t.name).filter((n) => dialogTags.has(n)),
  };
  // Neue Karte oder Spaltenwechsel: ans Ende der Spalte
  if (!editing || editing.status !== status) {
    const col = cardsIn(status).filter((c) => c.id !== editing?.id);
    payload.position = col.length ? col.at(-1).position + 1 : 0;
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
