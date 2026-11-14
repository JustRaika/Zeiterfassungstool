// Logik hinter Kalender, Tasks und Dateien (ohne Browser).
process.env.TZ = 'Europe/Zurich';

import test from 'node:test';
import assert from 'node:assert/strict';
import { isoDate } from '../js/util.js';
import { addDays, countdown, dueTasks, eventWhen, googleCalendarUrl } from '../js/kalender.js';
import { matchesFilters, positionBetween } from '../js/kanban.js';
import { findConflict, normalizePath, since } from '../js/dateien.js';

// ---------- Kalender ----------
test('addDays rechnet in Kalendertagen, auch über die Zeitumstellung', () => {
  // In der Nacht auf den 29.03.2026 fehlt eine Stunde: +24 h wäre 01:00 Uhr am Folgetag
  const day = addDays(new Date(2026, 2, 28), 2);
  assert.equal(isoDate(day), '2026-03-30');
  assert.equal(day.getHours(), 0);
  // Im Herbst hat der Tag 25 Stunden: +24 h wäre noch derselbe Tag, 23:00 Uhr
  assert.equal(isoDate(addDays(new Date(2026, 9, 25), 1)), '2026-10-26');
  assert.equal(isoDate(addDays(new Date(2026, 2, 1), -1)), '2026-02-28');
});

test('Countdown zählt Kalendertage, nicht Stunden', () => {
  const now = new Date(2026, 10, 14, 23, 50);
  const ev = (y, mo, d, h, mi = 0) => ({ starts_at: new Date(y, mo, d, h, mi).toISOString() });
  assert.equal(countdown(ev(2026, 10, 14, 18), now), 'läuft');
  assert.equal(countdown(ev(2026, 10, 14, 23, 55), now), 'heute');
  assert.equal(countdown(ev(2026, 10, 15, 0, 30), now), 'morgen'); // nur 40 Minuten später
  assert.equal(countdown(ev(2026, 11, 11, 9), now), 'in 27 Tagen');
});

test('Ganztägige Termine zeigen den letzten Tag (das gespeicherte Ende ist exklusiv)', () => {
  const allDay = (from, to) => ({ all_day: true, starts_at: from.toISOString(), ends_at: to?.toISOString() || null });
  assert.equal(eventWhen(allDay(new Date(2026, 9, 23), new Date(2026, 9, 26))), '23.10. – So., 25.10.2026');
  assert.equal(eventWhen(allDay(new Date(2026, 9, 23), new Date(2026, 9, 24))), 'Fr., 23.10.2026');
  assert.equal(eventWhen(allDay(new Date(2026, 9, 23), null)), 'Fr., 23.10.2026');
  assert.equal(eventWhen({ all_day: false, starts_at: new Date(2026, 9, 23, 18, 5).toISOString() }), 'Fr., 23.10.2026, 18:05');
});

test('Google-Kalender-Link: ganztägig als Datum, sonst als UTC-Zeit', () => {
  const dates = (row) => new URL(googleCalendarUrl({ title: 'Sync', ...row })).searchParams.get('dates');
  // Ganztägig ohne Ende: ein Tag, Ende exklusiv
  assert.equal(dates({ all_day: true, starts_at: new Date(2026, 10, 17).toISOString(), ends_at: null }), '20261117/20261118');
  // 18:00 Uhr in Zürich (Winterzeit) ist 17:00 UTC; ohne Ende eine Stunde
  assert.equal(dates({ all_day: false, starts_at: new Date(2026, 10, 17, 18).toISOString(), ends_at: null }),
    '20261117T170000Z/20261117T180000Z');
});

test('Im Kalender stehen nur offene Tasks mit Datum', () => {
  const cards = [
    { id: 'a', due_date: '2026-11-20', status: 'todo' },
    { id: 'b', due_date: '2026-11-20', status: 'done' },
    { id: 'c', due_date: null, status: 'doing' },
  ];
  assert.deepEqual(dueTasks(cards).map((c) => c.id), ['a']);
});

// ---------- Tasks ----------
const card = (over = {}) => ({
  title: 'Puzzle-Mechanik', description: null, subtasks: [{ title: 'Kollisionen', done: false }],
  assignees: ['alex'], category: 'code', priority: 1, status: 'doing', ...over,
});
const filters = (over = {}) => ({
  q: '', person: new Set(), category: new Set(), priority: new Set(), status: new Set(), ...over,
});

test('Filter: ohne Auswahl passt alles', () => {
  assert.equal(matchesFilters(card(), filters()), true);
});

test('Filter: in einer Gruppe reicht ein Treffer, zwischen Gruppen müssen alle passen', () => {
  assert.equal(matchesFilters(card(), filters({ status: new Set(['todo', 'doing']) })), true);
  assert.equal(matchesFilters(card(), filters({ status: new Set(['todo', 'done']) })), false);
  assert.equal(matchesFilters(card(), filters({ category: new Set(['code']), priority: new Set(['3']) })), false);
  assert.equal(matchesFilters(card(), filters({ category: new Set(['code']), priority: new Set(['1']) })), true);
});

test('Filter Zuständig: Person oder "Niemand"', () => {
  const sam = filters({ person: new Set(['sam']) });
  assert.equal(matchesFilters(card({ assignees: ['alex', 'sam'] }), sam), true);
  assert.equal(matchesFilters(card({ assignees: ['alex'] }), sam), false);
  assert.equal(matchesFilters(card({ assignees: [] }), sam), false);
  const nobody = filters({ person: new Set(['-']) });
  assert.equal(matchesFilters(card({ assignees: [] }), nobody), true);
  assert.equal(matchesFilters(card({ assignees: ['alex'] }), nobody), false);
  // "Niemand" und eine Person zusammen: beides zeigen
  const both = filters({ person: new Set(['-', 'alex']) });
  assert.equal(matchesFilters(card({ assignees: [] }), both), true);
  assert.equal(matchesFilters(card({ assignees: ['alex'] }), both), true);
});

test('Suche findet auch Beschreibung und Unteraufgaben, Gross/Klein egal', () => {
  assert.equal(matchesFilters(card(), filters({ q: 'kollision' })), true);
  assert.equal(matchesFilters(card({ description: 'Spiegel im Keller' }), filters({ q: 'keller' })), true);
  assert.equal(matchesFilters(card(), filters({ q: 'musik' })), false);
});

test('Neue Position liegt zwischen den Nachbarn', () => {
  assert.equal(positionBetween({ position: 2 }, { position: 3 }), 2.5);
  assert.equal(positionBetween({ position: 4 }, undefined), 5);  // ans Ende
  assert.equal(positionBetween(undefined, { position: 0 }), -1); // an den Anfang
  assert.equal(positionBetween(undefined, undefined), 0);        // leere Zelle
});

// ---------- Dateien ----------
test('Pfade werden vereinheitlicht', () => {
  assert.equal(normalizePath('  Content\\Maps\\Level2.umap '), 'Content/Maps/Level2.umap');
  assert.equal(normalizePath('/Content//Maps/'), 'Content/Maps/');
});

test('Sperre kollidiert bei gleichem Pfad und bei Ordnern, nicht bei ähnlichen Namen', () => {
  const locks = [
    { path: 'Content/Maps/Level2.umap', locked_by: 'kim' },
    { path: 'Content/Characters/Hero/', locked_by: 'sam' },
  ];
  const who = (path) => findConflict(path, locks)?.locked_by ?? null;
  assert.equal(who('content/maps/LEVEL2.umap'), 'kim');              // Gross/Klein egal
  assert.equal(who('Content/Characters/Hero/Run.uasset'), 'sam');   // liegt im gesperrten Ordner
  assert.equal(who('Content/Maps/'), 'kim');                         // Ordner enthält eine gesperrte Datei
  assert.equal(who('Content/Maps/Level2_Night.umap'), null);         // nur ähnlicher Name
  assert.equal(who('Content/Maps/Level2.umap.bak'), null);           // Datei, die mit einem gesperrten Dateinamen beginnt
  assert.equal(who('Content/Characters/Hero2/Run.uasset'), null);    // anderer Ordner mit gleichem Anfang
  assert.equal(who('Content/Maps'), null);                           // ohne "/" ist es eine Datei
});

test('„Seit“ wird grob und verständlich angegeben', () => {
  const now = new Date(2026, 10, 14, 12, 0);
  const ago = (min) => since(new Date(now - min * 60_000), now);
  assert.equal(ago(0.5), 'gerade eben');
  assert.equal(ago(59), 'seit 59 min');
  assert.equal(ago(60), 'seit 1 h');
  assert.equal(ago(60 * 23), 'seit 23 h');
  assert.equal(ago(60 * 30), 'seit gestern');
  assert.equal(ago(60 * 24 * 3), 'seit 3 Tagen');
});
