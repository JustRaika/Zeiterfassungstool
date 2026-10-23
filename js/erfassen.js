// Tab "Erfassen": Start/Stop-Timer, Formular, eigene Einträge.

import {
  $, esc, fmtDate, fmtDuration, fmtHours, hhmm, isoDate, sumMinutes, tagChips, toast, toggleChip, toggleChips,
} from './util.js';

const MAX_MINUTES = 24 * 60;
const RECENT_COUNT = 15;
const MIN_COMMENT = 3;
const DRAFT_KEY = 'fourcast-entry-draft';

let ctx;
let form;
let editingId = null;
let selectedTags = new Set();
let ticker = null;

export function init(c) {
  ctx = c;
  form = $('#entry-form');
  form.date.value = isoDate();
  restoreDraft();

  $('#timer-start').addEventListener('click', () => toggleTimer(['idle']));
  $('#timer-pause').addEventListener('click', () => toggleTimer(['running']));
  $('#timer-resume').addEventListener('click', () => toggleTimer(['paused', 'stopped']));
  $('#timer-stop').addEventListener('click', stopTimer);
  $('#timer-discard').addEventListener('click', discardTimer);
  form.addEventListener('submit', saveEntry);
  form.comment.addEventListener('input', saveDraft);
  // Wer ein Feld korrigiert, soll die Fehlermeldung dazu nicht mehr sehen
  form.addEventListener('input', (e) => {
    const errorId = e.target.getAttribute('aria-describedby');
    if (errorId?.startsWith('err-')) setError(errorId.slice(4));
  });
  $('#entry-cancel').addEventListener('click', resetForm);
  $('#tag-chips').addEventListener('click', (e) => {
    if (!toggleChip(e, selectedTags, 'tag')) return;
    saveDraft();
    if (selectedTags.size) setError('tags');
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
  // Gestoppter Timer (z. B. nach dem Neuladen): Zeit wieder ins leere Formular übernehmen
  if (!editingId && !form.hours.value && !form.minutes.value) fillFromTimer();
  renderTagChips();
  renderMine();
}

// Kommentar und Tags eines neuen Eintrags im Browser merken, damit sie das Neuladen überstehen
function saveDraft() {
  if (editingId) return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ comment: form.comment.value, tags: [...selectedTags] }));
  } catch { /* egal */ }
}

function restoreDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (!draft) return;
    form.comment.value = draft.comment || '';
    selectedTags = new Set(draft.tags || []);
  } catch { /* egal */ }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* egal */ }
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
  $('#timer-note').hidden = true;
  showErrors([]);
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Zurück zu "neuer Eintrag": angefangener Entwurf und gestoppter Timer kommen wieder ins Formular.
// fillTimer: false, wenn der Timer gerade schon verbraucht wurde (Eintrag gespeichert).
function resetForm({ fillTimer = true } = {}) {
  editingId = null;
  form.reset();
  form.date.value = isoDate();
  selectedTags = new Set();
  restoreDraft();
  renderTagChips();
  $('#form-title').textContent = 'Zeit eintragen';
  $('#entry-submit').textContent = 'Speichern';
  $('#entry-cancel').hidden = true;
  $('#timer-note').hidden = true;
  showErrors([]);
  if (fillTimer) fillFromTimer();
}

// ---------------------------------------------------------------------
// Timer mit Pausen. Die Stempelungen liegen in der Datenbank
// (members.timer_segments), bleiben also erhalten, wenn der Tab zu ist,
// und laufen geräteübergreifend weiter.
// Format: [{ start, end, stop }]; ein Abschnitt ohne end läuft gerade,
// sind alle abgeschlossen, ist Pause. Pausen = Lücken zwischen Abschnitten.
// stop: true am letzten Abschnitt = gestoppt; die Zeit steht im Formular und
// der Timer wird erst beim Speichern des Eintrags (oder Verwerfen) zurückgesetzt.
// ---------------------------------------------------------------------
function segments() {
  return (ctx.me.timer_segments || []).map((s) =>
    ({ start: new Date(s.start), end: s.end ? new Date(s.end) : null, stop: !!s.stop }));
}

function timerState(segs) {
  if (!segs.length) return 'idle';
  const last = segs.at(-1);
  if (!last.end) return 'running';
  return last.stop ? 'stopped' : 'paused';
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
  $('.timer-card').classList.toggle('stopped', state === 'stopped');
  $('#timer-start').hidden = state !== 'idle';
  $('#timer-pause').hidden = state !== 'running';
  $('#timer-resume').hidden = state !== 'paused' && state !== 'stopped';
  $('#timer-stop').hidden = state !== 'running' && state !== 'paused';
  $('#timer-discard').hidden = state === 'idle';
  $('#timer-note').hidden = state !== 'stopped' || !!editingId;

  clearInterval(ticker);
  const tick = () => {
    const now = Date.now();
    $('#timer-display').textContent = fmtClock(workMs(segs, now));
    if (state === 'idle') {
      $('#timer-hint').textContent = 'Läuft nicht.';
    } else if (state === 'running') {
      $('#timer-hint').textContent = `Läuft seit ${fmtStamp(segs.at(-1).start)} Uhr`;
    } else if (state === 'stopped') {
      $('#timer-hint').textContent = 'Gestoppt. Die Zeit steht im Formular, bitte noch speichern.';
    } else {
      $('#timer-hint').innerHTML = `<span class="pause-clock">⏸ Pause ${fmtClock(now - segs.at(-1).end)}</span>`;
    }
    renderStamps(segs, state, now);
  };
  tick();
  if (state === 'running' || state === 'paused') ticker = setInterval(tick, 1000);
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
  } else if (state === 'stopped') {
    rows.push(`<li class="stamp-stop">■ Gestoppt <span>${hhmm(segs.at(-1).end)}</span></li>`);
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
  const value = segs ? segs.map((s) => ({
    start: s.start.toISOString(),
    end: s.end ? s.end.toISOString() : null,
    ...(s.stop ? { stop: true } : {}),
  })) : null;
  const updated = await ctx.db.updateMe(ctx.me.github_username, { timer_segments: value });
  ctx.me = updated;
  ctx.memberMap.set(updated.github_username, updated);
  renderTimer();
}

// Start, Pause oder Weiter – je nach aktuellem Zustand.
// expected: Zustände, die der geklickte Knopf voraussetzt (Leertaste: egal).
async function toggleTimer(expected) {
  try {
    const segs = await freshSegments();
    const state = timerState(segs);
    if (expected && !expected.includes(state)) {
      renderTimer();
      toast('Der Timer wurde inzwischen auf einem anderen Gerät geändert.');
      return;
    }
    // Gestoppt geht nur per Knopf "Weiter" weiter, nicht mit der Leertaste
    if (!expected && state === 'stopped') return;
    // Läuft er, wird der Abschnitt beendet (Pause), sonst beginnt ein neuer (Start/Weiter)
    if (state === 'running') {
      segs.at(-1).end = new Date();
    } else {
      if (state === 'stopped') {
        segs.at(-1).stop = false;
        if (!editingId) { form.hours.value = ''; form.minutes.value = ''; }
      }
      segs.push({ start: new Date(), end: null });
    }
    await setTimer(segs);
  } catch (err) { ctx.fail(err); }
}

// Stoppen setzt den Timer nicht zurück: Er bleibt gestoppt gespeichert, bis der
// Eintrag gespeichert oder der Timer verworfen wird (übersteht also das Neuladen).
async function stopTimer() {
  try {
    const segs = await freshSegments();
    const state = timerState(segs);
    if (state === 'idle') { renderTimer(); return; }
    if (state === 'running') segs.at(-1).end = new Date();
    segs.at(-1).stop = true;
    await setTimer(segs);
  } catch (err) { ctx.fail(err); return; }

  if (editingId) resetForm(); // übernimmt die Zeit selbst
  else fillFromTimer();
  flashForm();
}

// Zeit eines gestoppten Timers ins Formular übernehmen
function fillFromTimer() {
  const segs = segments();
  if (editingId || timerState(segs) !== 'stopped') return;
  let minutes = Math.max(1, Math.round(workMs(segs) / 60000));
  if (minutes > MAX_MINUTES) {
    minutes = MAX_MINUTES;
    toast('Der Timer lief über 24 Stunden – bitte die Dauer prüfen.', { error: true });
  }
  form.date.value = isoDate(segs[0].start);
  form.hours.value = Math.floor(minutes / 60);
  form.minutes.value = minutes % 60;
  setError('date');
  setError('duration');
  $('#timer-note').hidden = false;
}

// Sichtbar machen, dass die Zeit rechts übernommen wurde
function flashForm() {
  for (const el of form.querySelectorAll('[name="date"], [name="hours"], [name="minutes"]')) {
    el.classList.remove('flash');
    void el.offsetWidth; // Animation neu starten
    el.classList.add('flash');
  }
  form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function discardTimer() {
  if (!confirm('Timer verwerfen? Die gestempelte Zeit wird nicht gespeichert.')) return;
  const wasStopped = timerState(segments()) === 'stopped';
  try {
    await setTimer(null);
  } catch (err) { ctx.fail(err); return; }
  if (wasStopped && !editingId) { form.hours.value = ''; form.minutes.value = ''; }
}

// ---------------------------------------------------------------------
// Formular
// ---------------------------------------------------------------------
function renderTagChips() {
  $('#tag-chips').innerHTML = toggleChips(
    ctx.tags.map((t) => ({ value: t.name, label: t.name, color: t.color })), selectedTags, 'tag');
}

// Fehlermeldungen stehen direkt unter dem jeweiligen Feld, alle auf einmal.
// Welche Felder zu einer Meldung gehören, steht im HTML: aria-describedby="err-<key>".
function setError(key, message = '') {
  const el = $(`#err-${key}`);
  if (!message && el.hidden) return;
  el.textContent = message;
  el.hidden = !message;
  for (const field of form.querySelectorAll(`[aria-describedby="err-${key}"]`)) {
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  }
}

// errors: [[key, Meldung, Feld für den Fokus], …] in Formular-Reihenfolge
function showErrors(errors) {
  const messages = Object.fromEntries(errors);
  for (const el of form.querySelectorAll('.field-error')) {
    const key = el.id.slice(4);
    setError(key, messages[key]);
  }
}

function validate({ date, hours, mins, duration, tags, comment }) {
  const errors = [];
  if (!date) errors.push(['date', 'Bitte ein Datum wählen.', form.date]);
  if (hours < 0 || mins < 0 || mins > 59) errors.push(['duration', 'Minuten bitte zwischen 0 und 59.', form.minutes]);
  else if (duration <= 0) errors.push(['duration', 'Bitte eintragen, wie lange du gearbeitet hast.', form.hours]);
  else if (duration > MAX_MINUTES) errors.push(['duration', 'Höchstens 24 Stunden pro Eintrag.', form.hours]);
  if (!tags.length) errors.push(['tags', 'Bitte mindestens einen Tag wählen.', $('#tag-chips button')]);
  if (comment.length < MIN_COMMENT) {
    errors.push(['comment', `Bitte ein kurzes Stichwort schreiben (mind. ${MIN_COMMENT} Zeichen).`, form.comment]);
  }
  return errors;
}

async function saveEntry(e) {
  e.preventDefault();
  const hours = parseInt(form.hours.value, 10) || 0;
  const mins = parseInt(form.minutes.value, 10) || 0;
  const duration = hours * 60 + mins;
  const date = form.date.value;
  const tags = ctx.tags.map((t) => t.name).filter((n) => selectedTags.has(n));
  const comment = form.comment.value.trim();

  const errors = validate({ date, hours, mins, duration, tags, comment });
  showErrors(errors);
  if (errors.length) {
    errors[0][2]?.focus();
    return;
  }

  const payload = { date, duration_minutes: duration, tags, comment };
  // Ein neuer Eintrag "verbraucht" einen gestoppten Timer
  const fromTimer = !editingId && timerState(segments()) === 'stopped';

  const btn = $('#entry-submit');
  btn.disabled = true;
  try {
    if (editingId) {
      await ctx.db.updateEntry(editingId, payload);
      toast('Eintrag geändert.');
      resetForm();
    } else {
      await ctx.db.addEntry(payload);
      // Ab hier ist der Eintrag gespeichert: Formular auf jeden Fall leeren, sonst droht ein doppelter Eintrag
      clearDraft();
      let timerError = null;
      if (fromTimer) {
        try { await clearStoppedTimer(); } catch (err) { timerError = err; }
      }
      resetForm({ fillTimer: false });
      if (timerError) {
        console.error(timerError);
        toast(`${fmtDuration(duration)} gespeichert, aber der Timer konnte nicht zurückgesetzt werden. Bitte „Verwerfen“ klicken.`, { error: true });
      } else {
        toast(`${fmtDuration(duration)} gespeichert.`);
      }
    }
    await ctx.reloadEntries();
    renderMine();
  } catch (err) {
    ctx.fail(err);
  } finally {
    btn.disabled = false;
  }
}

// Gestoppten Timer zurücksetzen – aber nur, wenn er in der Datenbank noch gestoppt ist
// (nicht, wenn er inzwischen auf einem anderen Gerät wieder läuft).
async function clearStoppedTimer() {
  const segs = await freshSegments();
  if (timerState(segs) === 'stopped') await setTimer(null);
  else renderTimer();
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
