// Tab "Erfassen": Start/Stop-Timer, Formular, eigene Einträge.

import { $, esc, fmtDate, fmtDuration, fmtHours, hhmm, isoDate, sumMinutes, tagChips, toast } from './util.js';

const MAX_MINUTES = 24 * 60;
const RECENT_COUNT = 15;
const MIN_COMMENT = 3;

let ctx;
let form;
let editingId = null;
let selectedTags = new Set();
let ticker = null;

export function init(c) {
  ctx = c;
  form = $('#entry-form');
  form.date.value = isoDate();

  $('#timer-start').addEventListener('click', () => toggleTimer('idle'));
  $('#timer-pause').addEventListener('click', () => toggleTimer('running'));
  $('#timer-resume').addEventListener('click', () => toggleTimer('paused'));
  $('#timer-stop').addEventListener('click', stopTimer);
  $('#timer-discard').addEventListener('click', discardTimer);
  form.addEventListener('submit', saveEntry);
  $('#entry-cancel').addEventListener('click', resetForm);
  $('#tag-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('button.chip');
    if (!chip) return;
    const name = chip.dataset.tag;
    if (selectedTags.has(name)) selectedTags.delete(name); else selectedTags.add(name);
    chip.setAttribute('aria-pressed', selectedTags.has(name));
  });
  $('#my-entries').addEventListener('click', onListClick);
  document.addEventListener('keydown', onSpace);
}

// Leertaste im Erfassen-Tab: Start, Pause, Weiter. Stoppen bleibt bewusst ein Klick.
function onSpace(e) {
  if (e.code !== 'Space' || e.repeat || ctx.currentTab !== 'erfassen') return;
  if (e.target.closest('input, textarea, select, button, a, [contenteditable]')) return;
  if (document.querySelector('dialog[open]')) return;
  e.preventDefault();
  toggleTimer();
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
  const owner = entry.member === ctx.me.github_username ? null : ctx.memberMap.get(entry.member);
  $('#form-title').textContent = owner ? `Eintrag von ${owner.display_name} bearbeiten` : 'Eintrag bearbeiten';
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
// Timer mit Pausen. Die Stempelungen liegen in der Datenbank
// (members.timer_segments), bleiben also erhalten, wenn der Tab zu ist,
// und laufen geräteübergreifend weiter.
// Format: [{ start, end }]; ein Abschnitt ohne end läuft gerade,
// sind alle abgeschlossen, ist Pause. Pausen = Lücken zwischen Abschnitten.
// ---------------------------------------------------------------------
function segments() {
  return (ctx.me.timer_segments || []).map((s) =>
    ({ start: new Date(s.start), end: s.end ? new Date(s.end) : null }));
}

function timerState(segs) {
  if (!segs.length) return 'idle';
  return segs.at(-1).end ? 'paused' : 'running';
}

function workMs(segs, now = Date.now()) {
  return segs.reduce((sum, s) => sum + ((s.end || now) - s.start), 0);
}

// 3725000 -> "1:02:05"
function fmtClock(ms) {
  const secs = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(secs / 3600);
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// Dauer für die Stempel-Liste: "45 s", "12 min", "1 h 30 min"
function fmtSpan(ms) {
  return ms < 60000 ? `${Math.max(0, Math.round(ms / 1000))} s` : fmtDuration(Math.round(ms / 60000));
}

// Uhrzeit, bei anderem Tag mit Datum davor
function fmtStamp(d) {
  return d.toDateString() === new Date().toDateString() ? hhmm(d) : `${fmtDate(isoDate(d))}, ${hhmm(d)}`;
}

function renderTimer() {
  const segs = segments();
  const state = timerState(segs);
  $('.timer-card').classList.toggle('running', state === 'running');
  $('.timer-card').classList.toggle('paused', state === 'paused');
  $('#timer-start').hidden = state !== 'idle';
  $('#timer-pause').hidden = state !== 'running';
  $('#timer-resume').hidden = state !== 'paused';
  $('#timer-stop').hidden = state === 'idle';
  $('#timer-discard').hidden = state === 'idle';

  clearInterval(ticker);
  const tick = () => {
    const now = Date.now();
    $('#timer-display').textContent = fmtClock(workMs(segs, now));
    if (state === 'idle') {
      $('#timer-hint').textContent = 'Läuft nicht.';
    } else if (state === 'running') {
      $('#timer-hint').textContent = `Läuft seit ${fmtStamp(segs.at(-1).start)} Uhr`;
    } else {
      $('#timer-hint').innerHTML = `<span class="pause-clock">⏸ Pause ${fmtClock(now - segs.at(-1).end)}</span>`;
    }
    renderStamps(segs, state, now);
  };
  tick();
  if (state !== 'idle') ticker = setInterval(tick, 1000);
}

// Liste der Stempelungen: Arbeitsabschnitte und Pausen dazwischen.
// Das DOM wird nur angefasst, wenn sich der angezeigte Text wirklich ändert.
let lastStampsHtml = null;
function renderStamps(segs, state, now) {
  const html = stampsHtml(segs, state, now);
  if (html === lastStampsHtml) return;
  lastStampsHtml = html;
  $('#timer-stamps').innerHTML = html;
}

function stampsHtml(segs, state, now) {
  if (!segs.length) return '';
  const rows = [];
  let pauseTotal = 0;
  segs.forEach((s, i) => {
    if (i > 0) {
      const pause = s.start - segs[i - 1].end;
      pauseTotal += pause;
      rows.push(`<li class="stamp-pause">⏸ Pause <span>${fmtSpan(pause)}</span></li>`);
    }
    rows.push(`<li>▶ ${fmtStamp(s.start)} – ${s.end ? hhmm(s.end) : 'läuft'} <span>${fmtSpan((s.end || now) - s.start)}</span></li>`);
  });
  if (state === 'paused') {
    const pause = now - segs.at(-1).end;
    pauseTotal += pause;
    rows.push(`<li class="stamp-pause">⏸ Pause seit ${hhmm(segs.at(-1).end)} <span>${fmtSpan(pause)}</span></li>`);
  }
  return rows.join('') +
    (pauseTotal ? `<li class="stamp-total">Pausen gesamt <span>${fmtSpan(pauseTotal)}</span></li>` : '');
}

// Vor jeder Timer-Aktion den aktuellen Stand aus der Datenbank holen, damit ein
// veralteter Tab keine Stempelungen eines anderen Geräts überschreibt.
async function freshSegments() {
  const member = await ctx.db.getMember(ctx.me.github_username);
  ctx.me = member;
  ctx.memberMap.set(member.github_username, member);
  return segments();
}

async function setTimer(segs) {
  const value = segs ? segs.map((s) => ({ start: s.start.toISOString(), end: s.end ? s.end.toISOString() : null })) : null;
  const updated = await ctx.db.updateMe(ctx.me.github_username, { timer_segments: value });
  ctx.me = updated;
  ctx.memberMap.set(updated.github_username, updated);
  renderTimer();
}

// Start, Pause oder Weiter – je nach aktuellem Zustand.
// expected: Zustand, den der geklickte Knopf voraussetzt (Leertaste: egal).
async function toggleTimer(expected) {
  try {
    const segs = await freshSegments();
    const state = timerState(segs);
    if (expected && state !== expected) {
      renderTimer();
      toast('Der Timer wurde inzwischen auf einem anderen Gerät geändert.');
      return;
    }
    // Läuft er, wird der Abschnitt beendet (Pause), sonst beginnt ein neuer (Start/Weiter)
    if (state === 'running') segs.at(-1).end = new Date();
    else segs.push({ start: new Date(), end: null });
    await setTimer(segs);
  } catch (err) { ctx.fail(err); }
}

async function stopTimer() {
  let segs;
  try {
    segs = await freshSegments();
  } catch (err) { ctx.fail(err); return; }
  if (!segs.length) { renderTimer(); return; }
  const start = segs[0].start;
  let minutes = Math.max(1, Math.round(workMs(segs) / 60000));
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
  if (!confirm('Timer verwerfen? Die gestempelte Zeit wird nicht gespeichert.')) return;
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

async function saveEntry(e) {
  e.preventDefault();
  const hours = parseInt(form.hours.value, 10) || 0;
  const mins = parseInt(form.minutes.value, 10) || 0;
  const duration = hours * 60 + mins;

  if (!form.date.value) return toast('Bitte ein Datum wählen.', { error: true });
  if (hours < 0 || mins < 0 || mins > 59) return toast('Minuten bitte zwischen 0 und 59.', { error: true });
  if (duration <= 0) return toast('Bitte eine Dauer eintragen.', { error: true });
  if (duration > MAX_MINUTES) return toast('Maximal 24 Stunden pro Eintrag.', { error: true });

  const tags = ctx.tags.map((t) => t.name).filter((n) => selectedTags.has(n));
  const comment = form.comment.value.trim();
  if (!tags.length) return toast('Bitte mindestens einen Tag wählen.', { error: true });
  if (comment.length < MIN_COMMENT) {
    form.comment.focus();
    return toast(`Bitte einen kurzen Kommentar schreiben (mind. ${MIN_COMMENT} Zeichen).`, { error: true });
  }

  const payload = { date: form.date.value, duration_minutes: duration, tags, comment };

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
  const owner = entry && entry.member !== c.me.github_username ? `${c.memberMap.get(entry.member)?.display_name || entry.member}: ` : '';
  if (!entry || !confirm(`${owner}Eintrag vom ${fmtDate(entry.date)} (${fmtDuration(entry.duration_minutes)}) löschen?`)) return;
  try {
    await c.db.deleteEntry(id);
    c.entries = c.entries.filter((x) => x.id !== id);
    if (editingId === id) resetForm();
    toast('Eintrag gelöscht.');
  } catch (err) {
    c.fail(err);
  }
}
