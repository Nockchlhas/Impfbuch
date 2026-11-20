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
