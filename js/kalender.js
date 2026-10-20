// Tab "Kalender": gemeinsame Termine mit FullCalendar (global per <script> geladen).

import { $, hhmm, isoDate, toast } from './util.js';

const HOUR_MS = 60 * 60 * 1000;

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
}

export function show() {
  if (!calendar) createCalendar();
  else calendar.refetchEvents();
  calendar.updateSize();
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
      ctx.db.listEvents().then((rows) => success(rows.map(toCalendarEvent))).catch((err) => {
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

function toCalendarEvent(row) {
  const color = ctx.memberMap.get(row.created_by)?.color || '#6b7280';
  return {
    id: row.id,
    title: row.title,
    start: row.starts_at,
    end: row.ends_at || undefined,
    allDay: row.all_day,
    backgroundColor: color,
    borderColor: color,
    textColor: '#ffffff',
    extendedProps: { row },
  };
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
    calendar.refetchEvents();
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
    calendar.refetchEvents();
  } catch (err) {
    dialogError(err.message || String(err));
  }
}
