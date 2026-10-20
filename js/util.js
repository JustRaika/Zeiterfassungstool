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

export function personLabel(member) {
  if (!member) return '<span class="muted">?</span>';
  return `<span class="dot" style="--c:${esc(member.color)}"></span> ${esc(member.display_name)}`;
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

export const TAG_COLORS = ['#2e86ab', '#9b5de5', '#e4572e', '#29a36a', '#f0a202', '#00a6a6', '#d63384', '#3a86ff', '#8d6e63', '#ff7f50', '#4c956c', '#b5838d'];
