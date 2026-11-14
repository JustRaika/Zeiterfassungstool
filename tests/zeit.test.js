// Zeitrechnung: Timer, Dauer-Formate, Zeiträume, Summen und CSV.
// Diese Zahlen sind die Grundlage für die spätere Aufteilung, darum sind sie abgesichert.
process.env.TZ = 'Europe/Zurich';

import test from 'node:test';
import assert from 'node:assert/strict';
import { esc, fmtDuration, fmtHours, isoDate } from '../js/util.js';
import { fmtClock, fmtSpan, timerState, workMs } from '../js/erfassen.js';
import { csvCell, rangeFor, tagSums } from '../js/uebersicht.js';

const at = (h, m = 0) => new Date(2026, 10, 14, h, m);

test('Timer: Zustand ergibt sich aus dem letzten Abschnitt', () => {
  assert.equal(timerState([]), 'idle');
  assert.equal(timerState([{ start: at(9), end: null }]), 'running');
  assert.equal(timerState([{ start: at(9), end: at(10) }]), 'paused');
  assert.equal(timerState([{ start: at(9), end: at(10), stop: true }]), 'stopped');
  // Nach einer Pause wieder gestartet: läuft, obwohl der erste Abschnitt abgeschlossen ist
  assert.equal(timerState([{ start: at(9), end: at(10) }, { start: at(11), end: null }]), 'running');
});

test('Timer: Pausen zählen nicht zur Arbeitszeit', () => {
  const segs = [
    { start: at(10, 0), end: at(10, 30) }, // 30 min
    { start: at(11, 0), end: null },       // läuft seit 11:00
  ];
  assert.equal(workMs(segs, at(11, 15).getTime()), 45 * 60_000);
  // Gestoppt: "jetzt" spielt keine Rolle mehr
  const stopped = [{ start: at(10, 0), end: at(10, 30), stop: true }];
  assert.equal(workMs(stopped, at(18, 0).getTime()), 30 * 60_000);
});

test('Timer-Anzeige: Stunden ohne, Minuten und Sekunden mit führender Null', () => {
  assert.equal(fmtClock(3_725_000), '1:02:05');
  assert.equal(fmtClock(59_999), '0:00:59'); // abgerundet, die Uhr springt nicht vor
  assert.equal(fmtClock(-5000), '0:00:00');  // Uhr des Geräts geht nach: nie negativ
});

test('Stempel-Dauer: unter einer Minute in Sekunden, sonst wie Einträge', () => {
  assert.equal(fmtSpan(45_000), '45 s');
  assert.equal(fmtSpan(90 * 60_000), '1 h 30 min');
});

test('Dauer: nur die Teile, die es gibt', () => {
  assert.equal(fmtDuration(45), '45 min');
  assert.equal(fmtDuration(120), '2 h');
  assert.equal(fmtDuration(150), '2 h 30 min');
  assert.equal(fmtHours(90), '1,5 h'); // deutsches Komma
});

test('isoDate nimmt das lokale Datum, nicht UTC', () => {
  // 00:30 Uhr in Zürich ist in UTC noch der Vortag
  assert.equal(isoDate(new Date(2026, 0, 1, 0, 30)), '2026-01-01');
  assert.equal(isoDate(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
});

test('Zeitraum: Monatsgrenzen, auch über den Jahreswechsel', () => {
  assert.deepEqual(rangeFor('month', new Date(2028, 1, 10)), ['2028-02-01', '2028-02-29']); // Schaltjahr
  assert.deepEqual(rangeFor('lastmonth', new Date(2027, 0, 5)), ['2026-12-01', '2026-12-31']);
  assert.deepEqual(rangeFor('lastmonth', new Date(2026, 2, 31)), ['2026-02-01', '2026-02-28']);
  assert.deepEqual(rangeFor('year', new Date(2026, 5, 1)), ['2026-01-01', '2026-12-31']);
  assert.deepEqual(rangeFor('custom', new Date(), ['2026-03-01', '']), ['2026-03-01', '']);
  assert.deepEqual(rangeFor('all', new Date()), ['', '']);
});

test('Zeit nach Tags: mehrere Tags zählen je voll, grösste Summe zuerst', () => {
  const sums = tagSums([
    { tags: ['Coding', 'Testing'], duration_minutes: 60 },
    { tags: ['Testing'], duration_minutes: 30 },
    { tags: [], duration_minutes: 15 },
  ]);
  assert.deepEqual(sums, [['Testing', 90], ['Coding', 60], ['(ohne Tag)', 15]]);
});

test('CSV: Formeln entschärfen, Trennzeichen und Anführungszeichen schützen', () => {
  assert.equal(csvCell('=SUMME(A1:A9)'), "'=SUMME(A1:A9)");
  assert.equal(csvCell('@nika'), "'@nika");
  assert.equal(csvCell(-5), '-5'); // Zahlen bleiben Zahlen
  assert.equal(csvCell('Level 2; Blockout'), '"Level 2; Blockout"');
  assert.equal(csvCell('Der "Boss"'), '"Der ""Boss"""');
  assert.equal(csvCell('Zeile 1\nZeile 2'), '"Zeile 1\nZeile 2"');
  assert.equal(csvCell(null), '');
});

test('esc macht HTML unschädlich, auch in Attributen', () => {
  assert.equal(esc('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(esc("O'Neil & Co"), 'O&#39;Neil &amp; Co');
  assert.equal(esc(null), '');
});
