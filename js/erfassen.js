// Tab "Erfassen": Start/Stop-Timer, Formular, eigene Einträge.

import { $, esc, fmtDate, fmtDuration, fmtHours, hhmm, isoDate, sumMinutes, tagChips, toast, TAG_COLORS } from './util.js';

const MAX_MINUTES = 24 * 60;
const RECENT_COUNT = 15;

let ctx;
let form;
let editingId = null;
let selectedTags = new Set();
let ticker = null;

export function init(c) {
  ctx = c;
  form = $('#entry-form');
  form.date.value = isoDate();

  $('#timer-start').addEventListener('click', startTimer);
  $('#timer-stop').addEventListener('click', stopTimer);
  $('#timer-discard').addEventListener('click', discardTimer);
  form.addEventListener('submit', saveEntry);
  $('#entry-cancel').addEventListener('click', resetForm);
  $('#add-tag-btn').addEventListener('click', addTag);
  $('#new-tag').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
  });
  $('#tag-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('button.chip');
    if (!chip) return;
    const name = chip.dataset.tag;
    if (selectedTags.has(name)) selectedTags.delete(name); else selectedTags.add(name);
    chip.setAttribute('aria-pressed', selectedTags.has(name));
  });
  $('#my-entries').addEventListener('click', onListClick);
}

export function show() {
  renderTimer();
  renderTagChips();
  renderMine();
}

export function editEntry(entry) {
  editingId = entry.id;
  form.date.value = entry.date;
  form.hours.value = Math.floor(entry.duration_minutes / 60);
  form.minutes.value = entry.duration_minutes % 60;
  form.comment.value = entry.comment || '';
  selectedTags = new Set(entry.tags);
  renderTagChips();
  $('#form-title').textContent = 'Eintrag bearbeiten';
  $('#entry-submit').textContent = 'Änderungen speichern';
  $('#entry-cancel').hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetForm() {
  editingId = null;
  form.reset();
  form.date.value = isoDate();
  selectedTags = new Set();
  renderTagChips();
  $('#form-title').textContent = 'Zeit eintragen';
  $('#entry-submit').textContent = 'Speichern';
  $('#entry-cancel').hidden = true;
}

// ---------------------------------------------------------------------
// Timer (Startzeit liegt in der Datenbank -> läuft geräteübergreifend weiter)
// ---------------------------------------------------------------------
function timerStart() {
  return ctx.me.timer_started_at ? new Date(ctx.me.timer_started_at) : null;
}

function renderTimer() {
  const start = timerStart();
  $('.timer-card').classList.toggle('running', !!start);
  $('#timer-start').hidden = !!start;
  $('#timer-stop').hidden = !start;
  $('#timer-discard').hidden = !start;
  $('#timer-hint').textContent = start
    ? `Läuft seit ${start.toDateString() === new Date().toDateString() ? '' : `${fmtDate(isoDate(start))}, `}${hhmm(start)} Uhr`
    : 'Läuft nicht.';

  clearInterval(ticker);
  const tick = () => {
    const secs = start ? Math.max(0, Math.floor((Date.now() - start) / 1000)) : 0;
    const h = Math.floor(secs / 3600);
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    $('#timer-display').textContent = `${h}:${m}:${s}`;
  };
  tick();
  if (start) ticker = setInterval(tick, 1000);
}

async function setTimer(value) {
  const updated = await ctx.db.updateMe(ctx.me.github_username, { timer_started_at: value });
  ctx.me = updated;
  ctx.memberMap.set(updated.github_username, updated);
  renderTimer();
}

async function startTimer() {
  try {
    await setTimer(new Date().toISOString());
  } catch (err) { ctx.fail(err); }
}

async function stopTimer() {
  const start = timerStart();
  if (!start) return;
  let minutes = Math.max(1, Math.round((Date.now() - start) / 60000));
  try {
    await setTimer(null);
  } catch (err) { ctx.fail(err); return; }

  if (minutes > MAX_MINUTES) {
    minutes = MAX_MINUTES;
    toast('Der Timer lief über 24 Stunden – bitte die Dauer prüfen.', { error: true });
  } else {
    toast('Timer gestoppt. Noch Tags wählen und speichern.');
  }
  if (editingId) resetForm();
  form.date.value = isoDate(start);
  form.hours.value = Math.floor(minutes / 60);
  form.minutes.value = minutes % 60;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function discardTimer() {
  if (!confirm('Laufenden Timer verwerfen? Die Zeit wird nicht gespeichert.')) return;
  try {
    await setTimer(null);
  } catch (err) { ctx.fail(err); }
}

// ---------------------------------------------------------------------
// Formular
// ---------------------------------------------------------------------
function renderTagChips() {
  $('#tag-chips').innerHTML = ctx.tags.map((t) =>
    `<button type="button" class="chip" data-tag="${esc(t.name)}" style="--c:${esc(t.color)}"
      aria-pressed="${selectedTags.has(t.name)}">${esc(t.name)}</button>`).join('');
}

async function addTag() {
  const input = $('#new-tag');
  const name = input.value.trim().replace(/\s+/g, ' ');
  if (!name) return;
  const existing = ctx.tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    selectedTags.add(existing.name);
  } else {
    try {
      const color = TAG_COLORS[ctx.tags.length % TAG_COLORS.length];
      const tag = await ctx.db.addTag({ name, color });
      ctx.setTags([...ctx.tags, tag]);
      selectedTags.add(tag.name);
    } catch (err) { ctx.fail(err); return; }
  }
  input.value = '';
  renderTagChips();
}

async function saveEntry(e) {
  e.preventDefault();
  const hours = parseInt(form.hours.value, 10) || 0;
  const mins = parseInt(form.minutes.value, 10) || 0;
  const duration = hours * 60 + mins;

  if (!form.date.value) return toast('Bitte ein Datum wählen.', { error: true });
  if (hours < 0 || mins < 0 || mins > 59) return toast('Minuten bitte zwischen 0 und 59.', { error: true });
  if (duration <= 0) return toast('Bitte eine Dauer eintragen.', { error: true });
  if (duration > MAX_MINUTES) return toast('Maximal 24 Stunden pro Eintrag.', { error: true });

  const payload = {
    date: form.date.value,
    duration_minutes: duration,
    tags: ctx.tags.map((t) => t.name).filter((n) => selectedTags.has(n)),
    comment: form.comment.value.trim() || null,
  };

  const btn = $('#entry-submit');
  btn.disabled = true;
  try {
    if (editingId) await ctx.db.updateEntry(editingId, payload);
    else await ctx.db.addEntry(payload);
    toast(editingId ? 'Eintrag geändert.' : `${fmtDuration(duration)} gespeichert.`);
    resetForm();
    await ctx.reloadEntries();
    renderMine();
  } catch (err) {
    ctx.fail(err);
  } finally {
    btn.disabled = false;
  }
}

// ---------------------------------------------------------------------
// Eigene Einträge
// ---------------------------------------------------------------------
function renderMine() {
  const mine = ctx.entries.filter((e) => e.member === ctx.me.github_username);

  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const weekFrom = isoDate(monday);
  const monthFrom = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  $('#my-stats').innerHTML = `
    <span>Diese Woche <b>${fmtHours(sumMinutes(mine.filter((e) => e.date >= weekFrom)))}</b></span>
    <span>Dieser Monat <b>${fmtHours(sumMinutes(mine.filter((e) => e.date >= monthFrom)))}</b></span>
    <span>Gesamt <b>${fmtHours(sumMinutes(mine))}</b></span>`;

  if (!mine.length) {
    $('#my-entries').innerHTML = '<p class="empty">Noch keine Einträge. Leg los!</p>';
    return;
  }
  $('#my-entries').innerHTML = `<ul class="entry-list">${mine.slice(0, RECENT_COUNT).map((e) => `
    <li>
      <span class="date">${fmtDate(e.date)}</span>
      <span class="dur">${fmtDuration(e.duration_minutes)}</span>
      <span class="chips tags-cell">${tagChips(e.tags, ctx.tagMap)}</span>
      <span class="actions">
        <button class="icon-btn" data-edit="${e.id}">Bearbeiten</button>
        <button class="icon-btn" data-delete="${e.id}">Löschen</button>
      </span>
      ${e.comment ? `<span class="comment">${esc(e.comment)}</span>` : ''}
    </li>`).join('')}</ul>
    ${mine.length > RECENT_COUNT ? `<p class="muted small">Alle ${mine.length} Einträge siehst du in der Übersicht.</p>` : ''}`;
}

async function onListClick(e) {
  const editId = e.target.dataset.edit;
  const deleteId = e.target.dataset.delete;
  if (editId) {
    editEntry(ctx.entries.find((x) => x.id === editId));
  } else if (deleteId) {
    await deleteEntry(ctx, deleteId);
    renderMine();
  }
}

// Wird auch von der Übersicht genutzt
export async function deleteEntry(c, id) {
  const entry = c.entries.find((x) => x.id === id);
  if (!entry || !confirm(`Eintrag vom ${fmtDate(entry.date)} (${fmtDuration(entry.duration_minutes)}) löschen?`)) return;
  try {
    await c.db.deleteEntry(id);
    c.entries = c.entries.filter((x) => x.id !== id);
    if (editingId === id) resetForm();
    toast('Eintrag gelöscht.');
  } catch (err) {
    c.fail(err);
  }
}
