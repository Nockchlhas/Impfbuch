// Erzeugt eine iCalendar-Datei (.ics) mit Erinnerungen. iOS bietet beim Öffnen
// "Alle hinzufügen" an; die Kalender-App meldet sich dann zuverlässig per Mitteilung.

import { addDays, de } from './dates.js';

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

function fold(line) {
  // RFC 5545: Zeilen max. 75 Oktette
  const out = [];
  let cur = '';
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > 74) { out.push(cur); cur = ' ' + ch; }
    else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n');
}

const compact = (iso) => iso.replace(/-/g, '');

function stamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function buildICS(reminders, { leadDays = 30, today }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Impfbuch//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Impfbuch',
  ];
  for (const r of reminders) {
    // Überfällige Erinnerungen auf morgen legen, damit iOS noch eine Mitteilung zeigt.
    const date = r.date <= today ? addDays(today, 1) : r.date;
    const title = r.kind === 'trip' ? r.title : `${r.overdue ? 'Überfällig: ' : ''}Impfung fällig – ${r.title}`;
    const desc = [
      r.kind === 'trip'
        ? `Für deine Reise fehlen noch Impfungen: ${r.diseases.join(', ')}.${r.deadline ? ` Spätestens impfen bis ${de(r.deadline)}.` : ''}`
        : `Fällig am ${de(r.date)}: ${r.diseases.join(', ')}.`,
      'Termin beim Hausarzt vereinbaren. (Erstellt mit der Impfbuch-App)',
    ].join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${r.uid}@impfbuch.app`,
      `DTSTAMP:${stamp()}`,
      `DTSTART:${compact(date)}T090000`,
      `DTEND:${compact(date)}T091500`,
      `SUMMARY:${esc(title)}`,
      `DESCRIPTION:${esc(desc)}`,
      'TRANSP:TRANSPARENT',
    );
    const lead = r.kind === 'trip' ? 0 : leadDays;
    const leadDate = addDays(date, -lead);
    if (lead > 0 && leadDate > today) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(`In ${lead} Tagen fällig: ${r.title}`)}`, `TRIGGER:-P${lead}D`, 'END:VALARM');
    }
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
