// Datums-Helfer. Intern wird mit ISO-Strings "YYYY-MM-DD" gearbeitet (zeitzonenunabhängig).

export function parse(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function fmt(date) {
  return date.toISOString().slice(0, 10);
}

export function todayISO() {
  const n = new Date();
  return fmt(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())));
}

export function addDays(iso, days) {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fmt(d);
}

export function addMonths(iso, months) {
  const d = parse(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return fmt(d);
}

export function addYears(iso, years) {
  return addMonths(iso, years * 12);
}

export function diffDays(a, b) {
  // b - a in Tagen
  return Math.round((parse(b) - parse(a)) / 86400000);
}

export function ageAt(birthISO, atISO) {
  if (!birthISO) return null;
  const b = parse(birthISO), a = parse(atISO);
  let age = a.getUTCFullYear() - b.getUTCFullYear();
  const m = a.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && a.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

export function year(iso) {
  return Number(iso.slice(0, 4));
}

export function month(iso) {
  return Number(iso.slice(5, 7));
}

const MONTHS = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];

export function de(iso) {
  if (!iso) return '–';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function deLong(iso) {
  if (!iso) return '–';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}. ${MONTHS[m - 1]} ${y}`;
}

export function relative(fromISO, toISO) {
  const days = diffDays(fromISO, toISO);
  const abs = Math.abs(days);
  let txt;
  if (abs === 0) return 'heute';
  if (abs === 1) txt = '1 Tag';
  else if (abs < 45) txt = `${abs} Tagen`;
  else if (abs < 730) txt = `${Math.round(abs / 30.44)} Monaten`;
  else txt = `${Math.round(abs / 365.25)} Jahren`;
  if (abs === 1) return days > 0 ? 'morgen' : 'gestern';
  return days > 0 ? `in ${txt}` : `vor ${txt}`;
}

// Freie Datumseingabe: "05.12.2016", "5.12.16", "05122016", "051216", "5,12,2016", "2016-12-05".
// Zweistellige Jahre: bis zum aktuellen Jahr → 20xx, sonst 19xx. Liefert ISO oder null.
export function parseDateInput(str, todayIso = todayISO()) {
  const s = String(str || '').trim();
  if (!s) return null;
  let d, m, y;
  let mt;
  if ((mt = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [, y, m, d] = mt;
  else if ((mt = s.match(/^(\d{1,2})[.,/\- ]+(\d{1,2})[.,/\- ]+(\d{2}|\d{4})$/))) [, d, m, y] = mt;
  else if ((mt = s.match(/^(\d{2})(\d{2})(\d{4}|\d{2})$/))) [, d, m, y] = mt;
  else return null;
  d = Number(d); m = Number(m);
  if (String(y).length === 2) {
    const yy = Number(y), cur = Number(todayIso.slice(2, 4));
    y = (yy <= cur ? 2000 : 1900) + yy;
  }
  y = Number(y);
  if (m < 1 || m > 12 || d < 1 || y < 1900 || y > 2100) return null;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d > last) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Formatiert während des Tippens: Ziffern werden zu TT.MM.JJJJ, Komma (iOS-Zifferntastatur) wird zu Punkt.
export function formatDateTyping(raw, deleting = false) {
  const parts = [''];
  for (const ch of String(raw).replace(/,/g, '.')) {
    const i = parts.length - 1;
    if (ch === '.' || ch === '/' || ch === '-' || ch === ' ') { if (parts[i] && parts.length < 3) parts.push(''); continue; }
    if (!/\d/.test(ch)) continue;
    if (i < 2 && parts[i].length === 2) parts.push('');
    const j = parts.length - 1;
    if (j === 2 && parts[j].length >= 4) continue;
    parts[j] += ch;
  }
  let out = parts.join('.');
  const last = parts[parts.length - 1];
  if (!deleting && parts.length < 3 && last.length === 2) out += '.';
  return out;
}
