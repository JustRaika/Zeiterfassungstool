// Kleine Helfer, die von mehreren Ansichten genutzt werden.

export const $ = (sel, root = document) => root.querySelector(sel);

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// 150 -> "2 h 30 min"
export function fmtDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h} h`;
  return `${h} h ${m} min`;
}

// 150 -> "2,5 h"
export function fmtHours(minutes) {
  return `${(minutes / 60).toLocaleString('de-DE', { maximumFractionDigits: 1 })} h`;
}

export function fmtPercent(fraction) {
  return `${(fraction * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;
}

// "2026-10-20" -> "Di., 20.10.2026"
export function fmtDate(iso) {
  return new Date(`${iso}T00:00`).toLocaleDateString('de-DE', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// Date -> "2026-10-20" (lokale Zeit)
export function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Date -> "14:05" (lokale Zeit)
export function hhmm(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function sumMinutes(entries) {
  return entries.reduce((sum, e) => sum + e.duration_minutes, 0);
}

export function tagChips(tagNames, tagMap) {
  return tagNames.map((name) =>
    `<span class="chip" style="--c:${esc(tagMap.get(name)?.color || '#6b7280')}">${esc(name)}</span>`).join('');
}

// Chips zum An- und Abwählen (Tags, Personen). items: [{ value, label, color }],
// key: Name des data-Attributs, an dem toggleChip den Wert erkennt.
export function toggleChips(items, selected, key) {
  return items.map(({ value, label, color }) =>
    `<button type="button" class="chip" data-${key}="${esc(value)}" style="--c:${esc(color)}"
      aria-pressed="${selected.has(value)}">${esc(label)}</button>`).join('');
}

// Klick auf einen Chip aus toggleChips: Wert im Set umschalten. true, wenn ein Chip getroffen wurde.
export function toggleChip(e, set, key) {
  const chip = e.target.closest('button.chip');
  if (!chip) return false;
  const value = chip.dataset[key];
  if (set.has(value)) set.delete(value); else set.add(value);
  chip.setAttribute('aria-pressed', set.has(value));
  return true;
}

export function personLabel(member) {
  if (!member) return '<span class="muted">?</span>';
  return `<span class="dot" style="--c:${esc(member.color)}"></span> ${esc(member.display_name)}`;
}

// Kleine Strich-Icons (24er-Raster), übernehmen Farbe und Grösse vom umgebenden Text
const ICONS = {
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  checklist: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12 2 2 4-4"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
};

export function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
}

// Eigener Bestätigungsdialog statt confirm(). true, wenn bestätigt; Esc, Abbrechen oder
// ein Klick daneben ergeben false.
export function confirmDialog(message, okLabel = 'Löschen') {
  const dialog = $('#confirm-dialog');
  $('#confirm-text').textContent = message;
  $('#confirm-ok').textContent = okLabel;
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
  });
}

let toastTimer;
export function toast(message, { error = false } = {}) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.toggle('error', error);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), error ? 6000 : 3000);
}
