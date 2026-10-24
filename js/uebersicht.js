// Tab "Übersicht": alle Einträge, Filter, Anteile pro Person, Zeit nach Tags, CSV-Export.

import {
  $, esc, fmtDate, fmtDuration, fmtHours, fmtPercent, isoDate, personLabel, sumMinutes, tagChip, tagChips, tagColor,
} from './util.js';
import { deleteEntry } from './erfassen.js';

// Die Tabelle zeigt zuerst nur die neuesten Einträge; „Alle anzeigen“ blendet den Rest ein,
// bis ein Filter geändert wird.
const TABLE_LIMIT = 50;
const AREA_COUNT = 3; // Hauptbereiche (Tags) pro Person

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
  // Basis für "Wer hat woran gearbeitet": Zeitraum + Tag, aber alle Personen
  const base = ctx.entries.filter((e) =>
    (!from || e.date >= from) && (!to || e.date <= to) && (!tag || e.tags.includes(tag)));
  const list = person ? base.filter((e) => e.member === person) : base;
  return { base, list, tag, person };
}

function render() {
  const custom = $('#f-period').value === 'custom';
  for (const el of document.querySelectorAll('.custom-range')) el.hidden = !custom;

  const { base, list, tag, person } = filtered();
  renderShares(base, tag, person);
  renderTagSums(list);
  renderTable(list);
}

// Balken = Anteil an der Gesamtzeit (bei Personen und Tags derselbe Massstab).
// extraHtml steht unter Balken und Wert (z. B. die Hauptbereiche einer Person).
function barRow(labelHtml, fraction, color, valueHtml, extraHtml = '', selected = false) {
  return `<div class="bar-row${selected ? ' selected' : ''}">
    <span class="name">${labelHtml}</span>
    <span class="bar"><span style="width:${(fraction * 100).toFixed(2)}%; --c:${esc(color)}"></span></span>
    <span class="val">${valueHtml}</span>
    ${extraHtml}
  </div>`;
}

// Minuten pro Tag; Einträge mit mehreren Tags zählen bei jedem Tag voll
function tagSums(entries) {
  const sums = new Map();
  for (const e of entries) {
    for (const t of e.tags.length ? e.tags : ['(ohne Tag)']) {
      sums.set(t, (sums.get(t) || 0) + e.duration_minutes);
    }
  }
  return [...sums].sort((a, b) => b[1] - a[1]);
}

// Feste Reihenfolge nach Namen (keine Rangliste). Pro Person die Hauptbereiche, denn
// Stunden sagen nichts über das Ergebnis.
function renderShares(base, tag, person) {
  const notes = [tag && `nur Tag „${tag}“`, person && 'immer alle Personen, gewählte hervorgehoben'].filter(Boolean);
  $('#shares-tag-note').textContent = notes.length ? ` (${notes.join(', ')})` : '';
  const total = sumMinutes(base);
  if (!total) {
    $('#shares').innerHTML = '<p class="empty">Keine Einträge im gewählten Zeitraum.</p>';
    return;
  }
  const members = [...ctx.members].sort((a, b) => a.display_name.localeCompare(b.display_name, 'de'));
  $('#shares').innerHTML = members.map((m) => {
    const own = base.filter((e) => e.member === m.github_username);
    const minutes = sumMinutes(own);
    const areas = tagSums(own).slice(0, AREA_COUNT).map(([name, min]) =>
      tagChip(name, ctx.tagMap, ` <span class="muted">${fmtHours(min)}</span>`)).join('');
    return barRow(personLabel(m), minutes / total, m.color,
      `<b>${fmtHours(minutes)}</b> <span class="muted small">${fmtPercent(minutes / total)}</span>`,
      areas && `<span class="chips areas">${areas}</span>`, m.github_username === person);
  }).join('') + `<p class="muted small">Gesamt: ${fmtHours(total)}</p>`;
}

function renderTagSums(list) {
  const sorted = tagSums(list);
  if (!sorted.length) {
    $('#tag-sums').innerHTML = '<p class="empty">Keine Einträge.</p>';
    return;
  }
  const total = sumMinutes(list);
  $('#tag-sums').innerHTML = sorted.map(([name, minutes]) =>
    barRow(esc(name), minutes / total, tagColor(name, ctx.tagMap), fmtHours(minutes))).join('');
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
