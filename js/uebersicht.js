// Tab "Übersicht": alle Einträge, Filter, Anteile pro Person, Zeit nach Tags, CSV-Export.

import { $, esc, fmtDate, fmtDuration, fmtHours, fmtPercent, isoDate, personLabel, sumMinutes, tagChips } from './util.js';
import { deleteEntry } from './erfassen.js';

// Die Tabelle zeigt zuerst nur die neuesten Einträge; „Alle anzeigen“ blendet den Rest ein,
// bis ein Filter geändert wird.
const TABLE_LIMIT = 50;

let ctx;
let showAll = false;

export function init(c) {
  ctx = c;
  for (const id of ['#f-period', '#f-from', '#f-to', '#f-person', '#f-tag']) {
    $(id).addEventListener('change', () => {
      showAll = false;
      render();
    });
  }
  $('#entries-more').addEventListener('click', () => {
    showAll = true;
    render();
  });
  $('#csv-btn').addEventListener('click', exportCsv);
  $('#entries-body').addEventListener('click', async (e) => {
    const { edit, delete: del } = e.target.dataset;
    if (edit) ctx.editEntry(ctx.entries.find((x) => x.id === edit));
    if (del) {
      await deleteEntry(ctx, del);
      render();
    }
  });
}

export function show() {
  fillSelect('#f-person', 'Alle Personen', ctx.members.map((m) => [m.github_username, m.display_name]));
  fillSelect('#f-tag', 'Alle Tags', ctx.tags.map((t) => [t.name, t.name]));
  render();
}

function fillSelect(sel, allLabel, options) {
  const el = $(sel);
  const prev = el.value;
  el.innerHTML = `<option value="">${allLabel}</option>` +
    options.map(([v, label]) => `<option value="${esc(v)}">${esc(label)}</option>`).join('');
  if (options.some(([v]) => v === prev)) el.value = prev;
}

// Gewählter Zeitraum als [von, bis] (ISO-Daten, jeweils inklusive, '' = offen)
function periodRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch ($('#f-period').value) {
    case 'month': return [isoDate(new Date(y, m, 1)), isoDate(new Date(y, m + 1, 0))];
    case 'lastmonth': return [isoDate(new Date(y, m - 1, 1)), isoDate(new Date(y, m, 0))];
    case 'year': return [`${y}-01-01`, `${y}-12-31`];
    case 'custom': return [$('#f-from').value, $('#f-to').value];
    default: return ['', ''];
  }
}

function filtered() {
  const [from, to] = periodRange();
  const tag = $('#f-tag').value;
  const person = $('#f-person').value;
  // Basis für die Anteile: Zeitraum + Tag, aber alle Personen
  const base = ctx.entries.filter((e) =>
    (!from || e.date >= from) && (!to || e.date <= to) && (!tag || e.tags.includes(tag)));
  const list = person ? base.filter((e) => e.member === person) : base;
  return { base, list, tag };
}

function render() {
  const custom = $('#f-period').value === 'custom';
  for (const el of document.querySelectorAll('.custom-range')) el.hidden = !custom;

  const { base, list, tag } = filtered();
  renderShares(base, tag);
  renderTagSums(list);
  renderTable(list);
}

function barRow(labelHtml, minutes, fraction, color, valueHtml) {
  return `<div class="bar-row">
    <span class="name">${labelHtml}</span>
    <span class="bar"><span style="width:${(fraction * 100).toFixed(2)}%; --c:${esc(color)}"></span></span>
    <span class="val">${valueHtml}</span>
  </div>`;
}

function renderShares(base, tag) {
  $('#shares-tag-note').textContent = tag ? ` (nur Tag „${tag}“)` : '';
  const total = sumMinutes(base);
  if (!total) {
    $('#shares').innerHTML = '<p class="empty">Keine Einträge im gewählten Zeitraum.</p>';
    return;
  }
  const rows = ctx.members
    .map((m) => ({ m, minutes: sumMinutes(base.filter((e) => e.member === m.github_username)) }))
    .sort((a, b) => b.minutes - a.minutes);
  $('#shares').innerHTML = rows.map(({ m, minutes }) =>
    barRow(personLabel(m), minutes, minutes / total, m.color,
      `<b>${fmtPercent(minutes / total)}</b> <span class="muted">${fmtHours(minutes)}</span>`)).join('') +
    `<p class="muted small">Gesamt: ${fmtHours(total)}</p>`;
}

function renderTagSums(list) {
  const sums = new Map();
  for (const e of list) {
    for (const t of e.tags.length ? e.tags : ['(ohne Tag)']) {
      sums.set(t, (sums.get(t) || 0) + e.duration_minutes);
    }
  }
  if (!sums.size) {
    $('#tag-sums').innerHTML = '<p class="empty">Keine Einträge.</p>';
    return;
  }
  const sorted = [...sums].sort((a, b) => b[1] - a[1]);
  const max = sorted[0][1];
  $('#tag-sums').innerHTML = sorted.map(([name, minutes]) =>
    barRow(esc(name), minutes, minutes / max, ctx.tagMap.get(name)?.color || '#6b7280', fmtHours(minutes))).join('');
}

function renderTable(list) {
  $('#list-total').textContent = `${list.length} Einträge · ${fmtHours(sumMinutes(list))}`;
  const shown = showAll ? list : list.slice(0, TABLE_LIMIT);
  const more = $('#entries-more');
  more.hidden = shown.length === list.length;
  more.textContent = `Alle ${list.length} Einträge anzeigen`;
  if (!list.length) {
    $('#entries-body').innerHTML = '<tr><td colspan="6" class="empty">Keine Einträge.</td></tr>';
    return;
  }
  $('#entries-body').innerHTML = shown.map((e) => {
    const own = ctx.canEdit(e);
    return `<tr>
      <td class="date">${fmtDate(e.date)}</td>
      <td class="person">${personLabel(ctx.memberMap.get(e.member))}</td>
      <td class="num">${fmtDuration(e.duration_minutes)}</td>
      <td><span class="chips">${tagChips(e.tags, ctx.tagMap)}</span></td>
      <td class="comment">${esc(e.comment || '')}</td>
      <td class="actions">${own ? `
        <button class="icon-btn" data-edit="${e.id}">Bearbeiten</button>
        <button class="icon-btn" data-delete="${e.id}">Löschen</button>` : ''}</td>
    </tr>`;
  }).join('');
}

function exportCsv() {
  const { list } = filtered();
  const cell = (v) => {
    let s = String(v ?? '');
    // Text, der mit = + - @ beginnt, würde Excel als Formel ausführen: mit ' entschärfen
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    ['Datum', 'Person', 'GitHub', 'Minuten', 'Stunden', 'Tags', 'Kommentar'],
    ...list.map((e) => [
      e.date,
      ctx.memberMap.get(e.member)?.display_name || e.member,
      e.member,
      e.duration_minutes,
      (e.duration_minutes / 60).toFixed(2).replace('.', ','),
      e.tags.join(', '),
      e.comment || '',
    ]),
  ].map((row) => row.map(cell).join(';'));

  // BOM + Semikolon, damit Excel (deutsch) Umlaute und Spalten richtig erkennt
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const [from, to] = periodRange();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fourcast-zeiten${from ? `_${from}` : ''}${to ? `_bis_${to}` : ''}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
