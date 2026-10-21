// Tab "Kalender": gemeinsame Termine mit FullCalendar (global per <script> geladen).

import { $, esc, fmtDate, hhmm, isoDate, toast } from './util.js';

const HOUR_MS = 60 * 60 * 1000;
const UPCOMING_COUNT = 5;
const EVENT_COLOR = '#8ec5ff';

// Kalendertage addieren (nicht 24 h, sonst stimmt es bei der Zeitumstellung nicht)
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

let ctx;
let calendar = null;
let editing = null; // Datenbank-Zeile des geöffneten Termins, null = neu

export function init(c) {
  ctx = c;
  const form = $('#event-form');
  form.addEventListener('submit', saveEvent);
  form.all_day.addEventListener('change', syncAllDay);
  form.start_date.addEventListener('change', () => {
    if (!form.end_date.value || form.end_date.value < form.start_date.value) form.end_date.value = form.start_date.value;
  });
  $('#event-cancel').addEventListener('click', () => $('#event-dialog').close());
  $('#event-delete').addEventListener('click', deleteEvent);
  $('#event-new').addEventListener('click', () => {
    const start = new Date();
    start.setHours(18, 0, 0, 0);
    openDialog(null, { start, end: new Date(start.getTime() + HOUR_MS), allDay: false });
  });
  $('#upcoming').addEventListener('click', (e) => {
    const item = e.target.closest('[data-event]');
    const row = item && upcomingRows.find((r) => r.id === item.dataset.event);
    if (row) openDialog(row);
  });
}

export function show() {
  if (!calendar) createCalendar(); // lädt die Termine beim ersten Anzeigen selbst
  else refresh();
  calendar.updateSize();
}

// Termine neu laden: eine Abfrage füllt Kalender und Liste der nächsten Termine
// (siehe events-Quelle in createCalendar)
function refresh() {
  calendar.refetchEvents();
}

// ---------------------------------------------------------------------
// Nächste Termine
// ---------------------------------------------------------------------
let upcomingRows = [];

function renderUpcoming(rows) {
  const now = new Date();
  // Noch nicht vorbei: Ende (oder Start, wenn es kein Ende gibt) liegt in der Zukunft
  upcomingRows = rows
    .filter((r) => new Date(r.ends_at || r.starts_at) > now || (r.all_day && !r.ends_at && isoDate(new Date(r.starts_at)) === isoDate(now)))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, UPCOMING_COUNT);

  if (!upcomingRows.length) {
    $('#upcoming').innerHTML = '<li class="empty">Keine anstehenden Termine.</li>';
    return;
  }
  $('#upcoming').innerHTML = upcomingRows.map((r) => {
    return `<li data-event="${esc(r.id)}" class="${r.is_milestone ? 'milestone' : ''}">
      <span class="when">${esc(eventWhen(r))}</span>
      <span class="what">${r.is_milestone ? '<span class="star">★</span> ' : ''}<b>${esc(r.title)}</b>${r.location ? ` <span class="muted">· ${esc(r.location)}</span>` : ''}</span>
      <span class="countdown muted">${esc(countdown(r, now))}</span>
    </li>`;
  }).join('');
}

// "Di., 17.11.2026", "Di., 17.11.2026, 18:00" oder "23.10. – 25.10.2026"
function eventWhen(r) {
  const start = new Date(r.starts_at);
  if (r.all_day) {
    const last = r.ends_at ? addDays(new Date(r.ends_at), -1) : start;
    if (isoDate(last) !== isoDate(start)) {
      return `${start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} – ${fmtDate(isoDate(last))}`;
    }
    return fmtDate(isoDate(start));
  }
  return `${fmtDate(isoDate(start))}, ${hhmm(start)}`;
}

// "läuft", "heute", "morgen", "in 27 Tagen"
function countdown(r, now) {
  const start = new Date(r.starts_at);
  if (start <= now) return 'läuft';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const days = Math.round((startDay - today) / (24 * HOUR_MS));
  if (days === 0) return 'heute';
  if (days === 1) return 'morgen';
  return `in ${days} Tagen`;
}

function createCalendar() {
  const narrow = window.innerWidth < 640;
  calendar = new FullCalendar.Calendar($('#calendar'), {
    locale: 'de',
    firstDay: 1,
    height: 'auto',
    initialView: narrow ? 'listMonth' : 'dayGridMonth',
    headerToolbar: narrow
      ? { left: 'prev,next', center: 'title', right: 'dayGridMonth,listMonth' }
      : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listMonth' },
    buttonText: { today: 'Heute', month: 'Monat', week: 'Woche', list: 'Liste' },
    noEventsText: 'Keine Termine',
    nowIndicator: true,
    selectable: true,
    editable: true,
    dayMaxEvents: true,
    eventTimeFormat: { hour: '2-digit', minute: '2-digit' },
    slotMinTime: '07:00:00',
    events: (info, success, failure) => {
      ctx.db.listEvents().then((rows) => {
        success(rows.map(toCalendarEvent));
        renderUpcoming(rows);
      }).catch((err) => {
        ctx.fail(err);
        failure(err);
      });
    },
    select: (info) => {
      calendar.unselect();
      const oneDay = info.allDay && isoDate(addDays(info.start, 1)) === isoDate(info.end);
      if (oneDay) {
        // Klick auf einen Tag in der Monatsansicht: Termin 18–19 Uhr vorschlagen
        const start = new Date(info.start);
        start.setHours(18, 0, 0, 0);
        openDialog(null, { start, end: new Date(start.getTime() + HOUR_MS), allDay: false });
      } else {
        openDialog(null, { start: info.start, end: info.end, allDay: info.allDay });
      }
    },
    eventClick: (info) => {
      info.jsEvent.preventDefault();
      openDialog(info.event.extendedProps.row);
    },
    eventDrop: moveEvent,
    eventResize: moveEvent,
  });
  calendar.render();
}

// Normale Termine pastellblau, Meilensteine mit schillerndem Verlauf (CSS-Klasse .milestone)
function toCalendarEvent(row) {
  return {
    id: row.id,
    title: row.is_milestone ? `★ ${row.title}` : row.title,
    start: row.starts_at,
    end: row.ends_at || undefined,
    allDay: row.all_day,
    backgroundColor: EVENT_COLOR,
    borderColor: EVENT_COLOR,
    textColor: '#1c1c23', // dunkle Schrift auf den Pastellfarben
    classNames: row.is_milestone ? ['milestone'] : [],
    extendedProps: { row },
  };
}

// Link, der den Termin im eigenen Google Kalender anlegt (mit dessen Erinnerungen aufs Handy)
function googleCalendarUrl(row) {
  const utc = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const day = (d) => isoDate(d).replace(/-/g, '');
  const start = new Date(row.starts_at);
  let dates;
  if (row.all_day) {
    const end = row.ends_at ? new Date(row.ends_at) : addDays(start, 1);
    dates = `${day(start)}/${day(end)}`;
  } else {
    const end = row.ends_at ? new Date(row.ends_at) : new Date(start.getTime() + HOUR_MS);
    dates = `${utc(start)}/${utc(end)}`;
  }
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: row.title,
    dates,
    details: [row.description, 'Aus der Fourcast Zeiterfassung'].filter(Boolean).join('\n\n'),
    location: row.location || '',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

async function moveEvent(info) {
  const ev = info.event;
  try {
    await ctx.db.updateEvent(ev.id, {
      starts_at: ev.start.toISOString(),
      ends_at: ev.end ? ev.end.toISOString() : null,
      all_day: ev.allDay,
    });
    toast('Termin verschoben.');
    refresh();
  } catch (err) {
    info.revert();
    ctx.fail(err);
  }
}

// ---------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------
function syncAllDay() {
  const allDay = $('#event-form').all_day.checked;
  for (const el of document.querySelectorAll('#event-form .time-field')) el.hidden = allDay;
}

// row = bestehender Termin, sonst defaults { start, end, allDay } für einen neuen
function openDialog(row, defaults = {}) {
  editing = row;
  const form = $('#event-form');
  form.reset();
  dialogError('');

  const allDay = row ? row.all_day : defaults.allDay;
  const start = row ? new Date(row.starts_at) : defaults.start;
  let end = row ? (row.ends_at ? new Date(row.ends_at) : null) : defaults.end;
  // Ganztägige Enden sind in FullCalendar exklusiv; im Formular zeigen wir den letzten Tag
  if (allDay && end) end = addDays(end, -1);

  form.title.value = row?.title || '';
  form.all_day.checked = allDay;
  form.is_milestone.checked = !!row?.is_milestone;
  form.start_date.value = isoDate(start);
  form.start_time.value = allDay ? '' : hhmm(start);
  form.end_date.value = end ? isoDate(end) : isoDate(start);
  form.end_time.value = end && !allDay ? hhmm(end) : '';
  form.location.value = row?.location || '';
  form.description.value = row?.description || '';
  syncAllDay();

  $('#event-dialog-title').textContent = row ? 'Termin bearbeiten' : 'Neuer Termin';
  $('#event-delete').hidden = !row;
  const creator = row && ctx.memberMap.get(row.created_by);
  $('#event-meta').textContent = creator ? `Angelegt von ${creator.display_name}` : '';
  $('#event-google').hidden = !row;
  if (row) $('#event-google').href = googleCalendarUrl(row);

  $('#event-dialog').showModal();
  form.title.focus();
}

function readForm() {
  const form = $('#event-form');
  const title = form.title.value.trim();
  if (!title) throw new Error('Bitte einen Titel eingeben.');
  if (!form.start_date.value) throw new Error('Bitte ein Startdatum wählen.');

  const allDay = form.all_day.checked;
  let start;
  let end = null;
  if (allDay) {
    start = new Date(`${form.start_date.value}T00:00`);
    const lastDay = form.end_date.value ? new Date(`${form.end_date.value}T00:00`) : start;
    end = addDays(lastDay, 1);
  } else {
    start = new Date(`${form.start_date.value}T${form.start_time.value || '00:00'}`);
    if (form.end_time.value) {
      end = new Date(`${form.end_date.value || form.start_date.value}T${form.end_time.value}`);
    }
  }
  if (end && end <= start) throw new Error('Das Ende muss nach dem Start liegen.');

  return {
    title,
    all_day: allDay,
    is_milestone: form.is_milestone.checked,
    starts_at: start.toISOString(),
    ends_at: end ? end.toISOString() : null,
    location: form.location.value.trim() || null,
    description: form.description.value.trim() || null,
  };
}

// Fehler im Dialog selbst anzeigen (der Toast läge hinter dem Dialog)
function dialogError(message) {
  $('#event-error').textContent = message || '';
  $('#event-error').hidden = !message;
}

async function saveEvent(e) {
  e.preventDefault();
  try {
    const payload = readForm();
    if (editing) await ctx.db.updateEvent(editing.id, payload);
    else await ctx.db.addEvent(payload);
    $('#event-dialog').close();
    toast(editing ? 'Termin gespeichert.' : 'Termin angelegt.');
    refresh();
  } catch (err) {
    dialogError(err.message || String(err));
  }
}

async function deleteEvent() {
  if (!editing || !confirm(`Termin „${editing.title}“ löschen?`)) return;
  try {
    await ctx.db.deleteEvent(editing.id);
    $('#event-dialog').close();
    toast('Termin gelöscht.');
    refresh();
  } catch (err) {
    dialogError(err.message || String(err));
  }
}
