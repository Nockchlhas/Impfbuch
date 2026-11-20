// Regel-Engine: wertet eingetragene Impfungen gegen (vereinfachte) STIKO-Empfehlungen aus.
// Reine Funktionen ohne DOM – getestet in tests/rules.test.js.

import { DISEASES, DISEASE_BY_ID, COUNTRY_BY_CODE, TRAVEL_LEAD_DAYS } from './data.js';
import { addDays, addMonths, addYears, ageAt, de, diffDays, month, year } from './dates.js';

export const STATUS = {
  overdue: { label: 'Überfällig', tone: 'red', rank: 0 },
  missing: { label: 'Fehlt', tone: 'red', rank: 1 },
  incomplete: { label: 'Unvollständig', tone: 'orange', rank: 2 },
  soon: { label: 'Bald fällig', tone: 'orange', rank: 3 },
  planned: { label: 'Ausstehend', tone: 'blue', rank: 4 },
  ok: { label: 'Aktuell', tone: 'green', rank: 5 },
  immune: { label: 'Immun', tone: 'green', rank: 6 },
  expired: { label: 'Abgelaufen', tone: 'gray', rank: 7 },
  optional: { label: 'Bei Bedarf', tone: 'gray', rank: 8 },
  none: { label: 'Nicht nötig', tone: 'gray', rank: 9 },
};

// ---------------------------------------------------------------- Kontext

export function makeContext(state, today, overrides = {}) {
  const p = state.profile || {};
  return {
    today,
    lead: Number(state.settings?.leadDays ?? 30),
    profile: p,
    age: p.birthdate ? ageAt(p.birthdate, today) : null,
    birthYear: p.birthdate ? year(p.birthdate) : null,
    vaccinations: state.vaccinations || [],
    overrides: state.overrides || {},
    ...overrides,
  };
}

function dosesFor(id, ctx) {
  return ctx.vaccinations
    .filter((v) => v.diseases?.includes(id) && v.date && v.date <= (ctx.cutoff || '9999-12-31'))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
}

function dueStatus(date, ctx) {
  if (!date) return 'ok';
  if (date < ctx.today) return 'overdue';
  if (diffDays(ctx.today, date) <= ctx.lead) return 'soon';
  return 'ok';
}

const ageAtDose = (dose, ctx) => (ctx.profile.birthdate ? ageAt(ctx.profile.birthdate, dose.date) : 99);

// ---------------------------------------------------------------- Einzelregeln
// Jede Regel liefert: { relevance, status, validUntil?, nextDue?, nextLabel?, headline?, detail, hints? }
// relevance: 'standard' | 'indication' | 'travel' | 'none'

function ruleTetDiph(id, doses, ctx) {
  const n = doses.length;
  const detail = 'STIKO: Grundimmunisierung mit 3 Impfungen (0, 1, 6–12 Monate), danach Auffrischung alle 10 Jahre – meist kombiniert als Td bzw. Tdap.';
  if (!n) return { relevance: 'standard', status: 'missing', headline: 'Keine Impfung eingetragen', detail, nextDue: ctx.today, nextLabel: 'Impfung' };
  const validUntil = addYears(doses[n - 1].date, 10);
  const hints = n < 3 ? ['Für eine vollständige Grundimmunisierung sind 3 Impfungen nötig. Trage ggf. ältere Impfungen aus früheren Impfausweisen nach.'] : [];
  return { relevance: 'standard', status: dueStatus(validUntil, ctx), validUntil, nextDue: validUntil, nextLabel: 'Auffrischung (Td/Tdap)', detail, hints };
}

function rulePertussis(doses, ctx, tetanus) {
  const n = doses.length;
  if (ctx.profile.healthcare) {
    const detail = 'STIKO (beruflich): Personal im Gesundheitswesen und in Gemeinschaftseinrichtungen alle 10 Jahre gegen Keuchhusten (Tdap).';
    if (!n) return { relevance: 'indication', status: 'missing', headline: 'Tdap-Impfung fehlt', detail, nextDue: ctx.today, nextLabel: 'Tdap' };
    const validUntil = addYears(doses[n - 1].date, 10);
    return { relevance: 'indication', status: dueStatus(validUntil, ctx), validUntil, nextDue: validUntil, nextLabel: 'Tdap-Auffrischung', detail };
  }
  if (ctx.age !== null && ctx.age < 18) {
    const detail = 'STIKO: Grundimmunisierung im Säuglingsalter, Auffrischungen mit 5–6 und 9–16 Jahren.';
    return n ? { relevance: 'standard', status: 'ok', headline: `${n} Impfung${n > 1 ? 'en' : ''} eingetragen`, detail }
      : { relevance: 'standard', status: 'missing', headline: 'Keine Impfung eingetragen', detail, nextDue: ctx.today, nextLabel: 'Impfung' };
  }
  const detail = 'STIKO: Alle Erwachsenen sollen einmalig eine Keuchhusten-Impfung erhalten – als Tdap bei der nächsten fälligen Tetanus-Auffrischung. Schwangere in jeder Schwangerschaft.';
  const adult = doses.filter((d) => ageAtDose(d, ctx) >= 18);
  if (adult.length) return { relevance: 'standard', status: 'ok', headline: `Tdap als Erwachsene/r erhalten (${de(adult[adult.length - 1].date)})`, detail };
  const tStatus = tetanus?.status;
  const nextDue = tetanus?.nextDue || ctx.today;
  const status = tStatus === 'overdue' || tStatus === 'missing' ? 'overdue' : tStatus === 'soon' ? 'soon' : 'planned';
  return { relevance: 'standard', status, nextDue, nextLabel: 'Tdap (mit Tetanus-Auffrischung)', headline: `Einmalig Tdap bei nächster Td-Auffrischung (${de(nextDue)})`, detail };
}

function rulePolio(doses, ctx) {
  const n = doses.length;
  const detail = 'STIKO: Grundimmunisierung (3–4 Dosen) und eine Auffrischung mit 9–16 Jahren. Erwachsene: fehlende Impfungen nachholen; weitere Auffrischungen nur bei Indikation (z. B. Reisen in Polio-Gebiete, wenn die letzte Impfung > 10 Jahre zurückliegt).';
  if (n >= 3) return { relevance: 'standard', status: 'ok', headline: `Grundimmunisierung vollständig (${n} Dosen)`, detail };
  if (!n) return { relevance: 'standard', status: 'missing', headline: 'Keine Impfung eingetragen', detail, nextDue: ctx.today, nextLabel: 'Impfung' };
  const nextDue = n === 1 ? addMonths(doses[0].date, 1) : addMonths(doses[1].date, 6);
  return { relevance: 'standard', status: 'incomplete', headline: nextDue <= ctx.today ? `${n} von 3 Dosen eingetragen – fehlende nachholen` : `${n} von 3 Dosen – ${n + 1}. Dosis ab ${de(nextDue)}`, nextDue, nextLabel: `${n + 1}. Polio-Dosis`, detail,
    hints: ['Falls du als Kind vollständig geimpft wurdest, trage die Impfungen aus dem alten Impfausweis nach.'] };
}

function ruleMMR(id, doses, ctx) {
  const n = doses.length;
  const name = DISEASE_BY_ID[id].name;
  const minor = ctx.age !== null && ctx.age < 18;
  const bornBefore1971 = ctx.birthYear !== null && ctx.birthYear <= 1970;
  const female = ctx.profile.sex === 'f';
  let need = 0, relevance = 'none';
  let detail;

  if (minor) { need = 2; relevance = 'standard'; detail = 'STIKO: 2 Impfungen (MMR) im Alter von 11 und 15 Monaten; fehlende Impfungen bis zum 18. Geburtstag nachholen.'; }
  else if (id === 'masern') {
    detail = 'STIKO: Nach 1970 geborene Erwachsene, die ungeimpft sind, nur einmal in der Kindheit geimpft wurden oder deren Status unklar ist, erhalten einmalig eine MMR-Impfung. Masernschutzgesetz: Beschäftigte in Gemeinschafts- und medizinischen Einrichtungen brauchen 2 Impfungen.';
    if (!bornBefore1971) { need = ctx.profile.healthcare ? 2 : 1; relevance = 'standard'; }
  } else if (id === 'roeteln') {
    detail = 'STIKO: Frauen im gebärfähigen Alter benötigen 2 Röteln-Impfungen (als MMR). Für Personal im Gesundheitswesen/Kinderbetreuung gilt eine Indikation.';
    if (female && (ctx.age ?? 0) < 50) { need = 2; relevance = 'standard'; }
    else if (ctx.profile.healthcare && !bornBefore1971) { need = 1; relevance = 'indication'; }
  } else {
    detail = 'STIKO: Mumps-Impfung ist Standard im Kindesalter (als MMR). Erwachsene: berufliche Indikation (Gesundheitswesen, Gemeinschaftseinrichtungen) bei nach 1970 Geborenen.';
    if (ctx.profile.healthcare && !bornBefore1971) { need = 1; relevance = 'indication'; }
  }

  if (relevance === 'none') {
    if (n) return { relevance: 'none', status: 'ok', headline: `${n} Impfung${n > 1 ? 'en' : ''} (MMR) – kein weiterer Bedarf`, detail };
    const headline = bornBefore1971 && id === 'masern' ? 'Vor 1971 Geborene gelten als immun' : 'Für dich keine Standardimpfung';
    return { relevance: 'none', status: 'none', headline, detail };
  }

  // Erwachsene (nicht minderjährig) mit 1 Dosis in der Kindheit brauchen eine weitere.
  const adultDose = doses.some((d) => ageAtDose(d, ctx) >= 18);
  const ok = n >= need && (minor || need >= 2 || n >= 2 || adultDose || id !== 'masern');
  if (ok) return { relevance, status: 'ok', headline: n >= 2 ? `Vollständig (${n} Impfungen)` : `${n} Impfung als Erwachsene/r – ausreichend`, detail,
    hints: n === 1 && id === 'masern' ? ['Für Tätigkeiten in Kita, Schule oder im Gesundheitswesen sind laut Masernschutzgesetz 2 Impfungen nötig.'] : [] };
  if (!n) return { relevance, status: 'missing', headline: `Keine ${name}-Impfung eingetragen`, detail, nextDue: ctx.today, nextLabel: 'MMR-Impfung' };
  const nextDue = addDays(doses[n - 1].date, 28);
  return { relevance, status: 'incomplete', headline: `${n} Impfung – eine weitere MMR-Impfung empfohlen`, detail, nextDue, nextLabel: `${n + 1}. MMR-Impfung` };
}

function ruleVaricella(doses, ctx) {
  const n = doses.length;
  const minor = ctx.age !== null && ctx.age < 18;
  const detail = 'STIKO: 2 Impfungen im Kindesalter; Nachholimpfung für Kinder und Jugendliche ohne Windpocken. Erwachsene: seronegative Frauen mit Kinderwunsch und Personal im Gesundheitswesen (2 Impfungen). Wer Windpocken hatte, ist immun.';
  if (n >= 2) return { relevance: minor ? 'standard' : 'none', status: 'ok', headline: 'Vollständig (2 Impfungen)', detail };
  if (n === 1) {
    const nextDue = addDays(doses[0].date, 28);
    return { relevance: minor ? 'standard' : 'indication', status: 'incomplete', headline: '2. Impfung frühestens 4 Wochen nach der 1.', nextDue, nextLabel: '2. Varizellen-Impfung', detail };
  }
  if (minor) return { relevance: 'standard', status: 'missing', headline: 'Keine Impfung eingetragen', detail, nextDue: ctx.today, nextLabel: 'Impfung' };
  return { relevance: 'none', status: 'optional', headline: 'Windpocken gehabt? Dann als „immun“ markieren', detail };
}

function ruleHPV(doses, ctx) {
  const n = doses.length;
  const detail = 'STIKO: Impfung für alle Kinder mit 9–14 Jahren (2 Dosen im Abstand von 5–13 Monaten), Nachholimpfung bis zum 18. Geburtstag (ab 15 Jahren 3 Dosen). Danach individuelle Entscheidung.';
  const firstAge = n ? ageAtDose(doses[0], ctx) : ctx.age;
  const need = firstAge !== null && firstAge <= 14 ? 2 : 3;
  const minor = ctx.age !== null && ctx.age >= 9 && ctx.age < 18;
  if (n >= need) return { relevance: minor ? 'standard' : 'none', status: 'ok', headline: `Vollständig (${n} Dosen)`, detail };
  if (!minor) return n ? { relevance: 'none', status: 'incomplete', headline: `${n} von ${need} Dosen`, detail }
    : { relevance: 'none', status: ctx.age !== null && ctx.age < 9 ? 'none' : 'optional', headline: 'Standard nur bis 17 Jahre', detail };
  if (!n) return { relevance: 'standard', status: 'missing', headline: 'Keine Impfung eingetragen', detail, nextDue: ctx.today, nextLabel: 'HPV-Impfung' };
  const nextDue = need === 2 ? addMonths(doses[0].date, 5) : n === 1 ? addMonths(doses[0].date, 1) : addMonths(doses[0].date, 6);
  return { relevance: 'standard', status: 'incomplete', headline: `${n} von ${need} Dosen`, detail, nextDue, nextLabel: `${n + 1}. HPV-Dosis` };
}

export function hepBNeeded(doses) {
  return doses.length && doses.every((d) => d.productId === 'heplisav') ? 2 : 3;
}

function ruleHepB(doses, ctx) {
  const n = doses.length;
  const need = hepBNeeded(doses);
  const minor = ctx.age !== null && ctx.age < 18;
  const ind = ctx.profile.healthcare || ctx.profile.chronic;
  const relevance = minor ? 'standard' : ind ? 'indication' : 'none';
  const detail = 'STIKO: Grundimmunisierung im Säuglingsalter, Nachholimpfung bis 17 Jahre (3 Dosen: 0, 1, 6 Monate). Erwachsene bei Indikation (z. B. Gesundheitswesen, chronische Erkrankungen, längere Reisen in Risikogebiete).';
  if (n >= need) return { relevance, status: 'ok', headline: `Grundimmunisierung vollständig (${n} Dosen)`, detail };
  if (n) {
    const nextDue = n === 1 ? addMonths(doses[0].date, 1) : addMonths(doses[0].date, 6);
    return { relevance: relevance === 'none' ? 'travel' : relevance, status: 'incomplete', headline: `${n} von ${need} Dosen`, nextDue, nextLabel: `${n + 1}. Hepatitis-B-Dosis`, detail };
  }
  if (relevance === 'none') return { relevance: 'travel', status: 'optional', headline: 'Bei Indikation oder für längere Reisen', detail };
  return { relevance, status: 'missing', headline: 'Keine Impfung eingetragen', detail, nextDue: ctx.today, nextLabel: 'Hepatitis-B-Impfung' };
}

function ruleChildOnly(id, doses, ctx, maxAge, need, detail) {
  const n = doses.length;
  const child = ctx.age !== null && ctx.age < maxAge;
  if (n >= need) return { relevance: child ? 'standard' : 'none', status: 'ok', headline: `${n} Impfung${n > 1 ? 'en' : ''} eingetragen`, detail };
  if (child) return { relevance: 'standard', status: n ? 'incomplete' : 'missing', headline: n ? `${n} von ${need}` : 'Keine Impfung eingetragen', detail, nextDue: ctx.today, nextLabel: 'Impfung' };
  return { relevance: 'none', status: 'none', headline: `Standard nur bis ${maxAge - 1} Jahre`, detail };
}

function rulePneumo(doses, ctx) {
  const n = doses.length;
  const ind = (ctx.age ?? 0) >= 60 || ctx.profile.chronic;
  const detail = 'STIKO: Ab 60 Jahren (und bei bestimmten Grunderkrankungen) einmalig eine Impfung mit einem Konjugatimpfstoff (PCV20 bzw. PCV21). Wer bereits PPSV23 erhalten hat, bekommt PCV20 frühestens 6 Jahre danach.';
  const hasPCV20 = doses.some((d) => d.productId === 'pcv20');
  if (hasPCV20) return { relevance: ind ? 'standard' : 'none', status: 'ok', headline: 'Konjugatimpfung erhalten – keine Auffrischung nötig', detail };
  if (!ind) return n ? { relevance: 'none', status: 'ok', headline: `${n} Impfung${n > 1 ? 'en' : ''} eingetragen`, detail }
    : { relevance: 'none', status: 'none', headline: 'Standard ab 60 Jahren', detail };
  if (n) {
    const nextDue = addYears(doses[n - 1].date, 6);
    return { relevance: 'standard', status: nextDue <= ctx.today ? 'overdue' : 'incomplete', headline: `PCV20 ab ${de(nextDue)} empfohlen`, nextDue, nextLabel: 'Pneumokokken (PCV20)', detail };
  }
  return { relevance: 'standard', status: 'missing', headline: 'Einmalige Impfung (PCV20) fehlt', detail, nextDue: ctx.today, nextLabel: 'Pneumokokken-Impfung' };
}

function ruleInfluenza(doses, ctx) {
  const ind = (ctx.age ?? 0) >= 60 || ctx.profile.chronic || ctx.profile.healthcare;
  const detail = 'STIKO: Jährlich im Herbst (Oktober bis Mitte Dezember) für alle ab 60 Jahren, Schwangere, chronisch Kranke und Personal mit erhöhtem Risiko (z. B. Gesundheitswesen). Ab 60 mit Hochdosis- oder adjuvantiertem Impfstoff.';
  const m = month(ctx.today), y = year(ctx.today);
  const seasonYear = m >= 8 ? y : y - 1;
  const seasonStart = `${seasonYear}-08-01`;
  const label = `${seasonYear}/${String(seasonYear + 1).slice(2)}`;
  const last = doses[doses.length - 1];
  const relevance = ind ? 'indication' : 'none';
  if (last && last.date >= seasonStart) {
    const nextDue = `${seasonYear + 1}-10-01`;
    return { relevance, status: 'ok', headline: `Für Saison ${label} geimpft`, validUntil: `${seasonYear + 1}-07-31`, nextDue: ind ? nextDue : null, nextLabel: 'Grippeimpfung', detail };
  }
  if (!ind) return { relevance, status: 'optional', headline: last ? `Zuletzt ${de(last.date)}` : 'Für dich keine Standardimpfung', detail };
  const seasonOpen = m >= 10 || m <= 3;
  if (seasonOpen) return { relevance, status: 'overdue', headline: `Impfung für Saison ${label} fehlt`, nextDue: ctx.today, nextLabel: 'Grippeimpfung', detail };
  const nextDue = `${y}-10-01`;
  return { relevance, status: dueStatus(nextDue, ctx), headline: `Nächste Grippeimpfung ab ${de(nextDue)}`, nextDue, nextLabel: 'Grippeimpfung', detail };
}

function ruleCovid(doses, ctx) {
  const n = doses.length;
  const ind = (ctx.age ?? 0) >= 60 || ctx.profile.chronic || ctx.profile.healthcare;
  if (ctx.age !== null && ctx.age < 18) return { relevance: 'none', status: n ? 'ok' : 'none', headline: 'Für gesunde Kinder keine Standardimpfung', detail: 'STIKO: Für gesunde Kinder und Jugendliche keine Standardempfehlung.' };
  const detail = 'STIKO: Basisimmunität für alle Erwachsenen (3 Antigenkontakte, davon mind. 2 Impfungen; Infektionen zählen mit). Ab 60 Jahren, bei Grunderkrankungen und für Personal im Gesundheitswesen jährliche Auffrischung im Herbst (Abstand mind. 12 Monate).';
  if (ind) {
    if (!n) return { relevance: 'indication', status: 'missing', headline: 'Keine Impfung eingetragen', detail, nextDue: ctx.today, nextLabel: 'COVID-19-Impfung' };
    let nextDue = addMonths(doses[n - 1].date, 12);
    if (month(nextDue) < 9) nextDue = `${year(nextDue)}-09-01`;
    return { relevance: 'indication', status: dueStatus(nextDue, ctx), nextDue, nextLabel: 'COVID-19-Auffrischung', detail };
  }
  if (n >= 3) return { relevance: 'standard', status: 'ok', headline: `Basisimmunität erreicht (${n} Impfungen)`, detail };
  return { relevance: 'standard', status: 'incomplete', headline: `${n} von 3 Antigenkontakten – Infektionen zählen mit`, detail,
    hints: ['Hattest du nachgewiesene COVID-19-Infektionen, ist die Basisimmunität meist erreicht – dann als „immun“ markieren.'] };
}

function ruleZoster(allDoses, ctx) {
  // Der frühere Lebendimpfstoff (Zostavax) zählt nicht – STIKO empfiehlt trotzdem 2× Shingrix.
  const doses = allDoses.filter((d) => d.productId !== 'zostavax');
  const n = doses.length;
  const live = allDoses.length > n ? ['Zostavax (Lebendimpfstoff) wird nicht angerechnet – die STIKO empfiehlt zusätzlich 2 Dosen des Totimpfstoffs.'] : [];
  const ind = (ctx.age ?? 0) >= 60 || ((ctx.age ?? 0) >= 50 && ctx.profile.chronic);
  const detail = 'STIKO: Ab 60 Jahren (bei Grunderkrankungen ab 50) 2 Impfungen mit dem Totimpfstoff im Abstand von 2–6 Monaten. Keine Auffrischung nötig.';
  if (n >= 2) return { relevance: ind ? 'standard' : 'none', status: 'ok', headline: 'Vollständig (2 Dosen)', detail, hints: live };
  if (n === 1) {
    const nextDue = addMonths(doses[0].date, 2);
    return { relevance: ind ? 'standard' : 'indication', status: 'incomplete', headline: `2. Dosis zwischen ${de(nextDue)} und ${de(addMonths(doses[0].date, 6))}`, nextDue, nextLabel: '2. Gürtelrose-Dosis', detail, hints: live };
  }
  if (!ind) return { relevance: 'none', status: 'none', headline: 'Standard ab 60 Jahren', detail, hints: live };
  return { relevance: 'standard', status: 'missing', headline: '2 Impfungen empfohlen', detail, nextDue: ctx.today, nextLabel: 'Gürtelrose-Impfung', hints: live };
}

function ruleRSV(doses, ctx) {
  const n = doses.length;
  const age = ctx.age ?? 0;
  const ind = age >= 75 || (age >= 60 && ctx.profile.chronic);
  const detail = 'STIKO: Einmalige RSV-Impfung ab 75 Jahren sowie für 60- bis 74-Jährige mit schweren Grunderkrankungen – am besten im September/Oktober vor der RSV-Saison.';
  if (n) return { relevance: ind ? 'standard' : 'none', status: 'ok', headline: `Geimpft am ${de(doses[n - 1].date)}`, detail };
  if (!ind) return { relevance: 'none', status: 'none', headline: 'Standard ab 75 Jahren', detail };
  return { relevance: 'standard', status: 'missing', headline: 'Einmalige Impfung empfohlen', detail, nextDue: ctx.today, nextLabel: 'RSV-Impfung' };
}

export function fsmeSchedule(doses, age) {
  const n = doses.length;
  if (!n) return null;
  const encepur = doses.some((d) => d.productId === 'encepur');
  const last = doses[n - 1].date;
  if (n === 1) return { complete: false, nextDue: addMonths(last, 1), nextLabel: '2. FSME-Dosis', protectedUntil: null };
  if (n === 2) return { complete: false, nextDue: addMonths(last, encepur ? 9 : 5), nextLabel: '3. FSME-Dosis', protectedUntil: addMonths(last, 12) };
  if (n === 3) { const v = addYears(last, 3); return { complete: true, validUntil: v, nextDue: v, nextLabel: '1. FSME-Auffrischung' }; }
  const interval = (encepur ? age >= 50 : age >= 60) ? 3 : 5;
  const v = addYears(last, interval);
  return { complete: true, validUntil: v, nextDue: v, nextLabel: 'FSME-Auffrischung' };
}

function ruleFSME(doses, ctx) {
  const ind = !!ctx.profile.fsmeArea;
  const detail = 'STIKO: Für Personen, die in FSME-Risikogebieten (u. a. Bayern, Baden-Württemberg, Südhessen, Südthüringen, Sachsen und viele Nachbarländer) zeckenexponiert sind. Grundimmunisierung 3 Dosen, 1. Auffrischung nach 3 Jahren, dann alle 5 Jahre (ab 60 alle 3 Jahre; Encepur ab 50).';
  const s = fsmeSchedule(doses, ctx.age ?? 0);
  const relevance = ind ? 'indication' : 'travel';
  if (!s) return ind ? { relevance, status: 'missing', headline: 'Grundimmunisierung fehlt', detail, nextDue: ctx.today, nextLabel: 'FSME-Impfung' }
    : { relevance, status: 'optional', headline: 'Bei Aufenthalt in FSME-Risikogebieten', detail };
  if (!s.complete) return { relevance, status: 'incomplete', headline: `${doses.length} von 3 Dosen – ${s.nextLabel} ab ${de(s.nextDue)}`, nextDue: s.nextDue, nextLabel: s.nextLabel, protectedUntil: s.protectedUntil, detail };
  const r = { relevance, validUntil: s.validUntil, nextDue: s.nextDue, nextLabel: s.nextLabel, detail };
  return ind ? { ...r, status: dueStatus(s.validUntil, ctx) } : travelExpiry(r, ctx);
}

export function hepAState(doses) {
  const twin = doses.filter((d) => d.productId === 'twinrix').length;
  const mono = doses.length - twin;
  const complete = mono >= 2 || twin >= 3 || (mono >= 1 && twin >= 2);
  return { complete, mono, twin };
}

function ruleHepA(doses, ctx) {
  const n = doses.length;
  const detail = 'Reiseimpfung (STIKO/DTG) für Reisen in Länder mit erhöhtem Risiko (außerhalb Nord-/Westeuropas, Nordamerikas, Australiens). 2 Dosen im Abstand von 6–12 Monaten schützen langjährig, wahrscheinlich lebenslang. Schutz bereits ca. 2 Wochen nach der 1. Dosis.';
  if (!n) return { relevance: 'travel', status: 'optional', headline: 'Für viele Reiseziele empfohlen', detail };
  const s = hepAState(doses);
  if (s.complete) return { relevance: 'travel', status: 'ok', headline: 'Vollständig – langjähriger Schutz', detail };
  const first = doses[0].date;
  const nextDue = s.twin && !s.mono ? (n === 1 ? addMonths(first, 1) : addMonths(first, 6)) : addMonths(first, 6);
  const headline = nextDue <= ctx.today ? `${n} Dosis erhalten – ${n + 1}. Dosis jetzt nachholen (kein Neubeginn nötig)` : `${n}. Dosis erhalten – nächste ab ${de(nextDue)}`;
  return { relevance: 'travel', status: 'incomplete', headline, nextDue, nextLabel: `${n + 1}. Hepatitis-A-Dosis`, protectedUntil: addMonths(doses[n - 1].date, 12), detail };
}

function ruleTyphus(doses, ctx) {
  const n = doses.length;
  const detail = 'Reiseimpfung für Reisen nach Süd-/Südostasien, Afrika, Lateinamerika – vor allem bei einfachen hygienischen Bedingungen. Spritze (Typhim Vi): Schutz ca. 3 Jahre; Schluckimpfung (Vivotif): ca. 1 Jahr.';
  if (!n) return { relevance: 'travel', status: 'optional', headline: 'Je nach Reiseziel', detail };
  const last = doses[n - 1];
  const validUntil = addYears(last.date, last.productId === 'vivotif' ? 1 : 3);
  return travelExpiry({ relevance: 'travel', validUntil, nextDue: validUntil, nextLabel: 'Typhus-Auffrischung', detail }, ctx);
}

function ruleYF(doses, ctx) {
  const n = doses.length;
  const detail = 'Reiseimpfung für Gelbfiebergebiete in Afrika und Südamerika (nur in zugelassenen Gelbfieber-Impfstellen). Das internationale Impfzertifikat gilt lebenslang, ab dem 10. Tag nach der Impfung. STIKO: einmalige Auffrischung bei erneutem Risiko, wenn die Impfung ≥ 10 Jahre zurückliegt.';
  if (!n) return { relevance: 'travel', status: 'optional', headline: 'Für Gelbfiebergebiete', detail };
  const hints = n === 1 && addYears(doses[0].date, 10) < ctx.today ? ['Die Impfung liegt über 10 Jahre zurück: Vor einer erneuten Reise in ein Gelbfiebergebiet empfiehlt die STIKO eine einmalige Auffrischung.'] : [];
  return { relevance: 'travel', status: 'ok', headline: n >= 2 ? 'Lebenslang geschützt' : 'Zertifikat lebenslang gültig', detail, hints };
}

function ruleRabies(doses, ctx) {
  const n = doses.length;
  const detail = 'Reiseimpfung bei Reisen in Länder mit Tollwut, v. a. bei längeren Aufenthalten, Tierkontakt oder Reisen abseits medizinischer Versorgung. Grundimmunisierung: 2 Dosen (Tag 0 und 7). Auffrischung nur bei erneutem Risiko nach ärztlicher Abwägung.';
  if (n >= 2) return { relevance: 'travel', status: 'ok', headline: `Grundimmunisierung vollständig (${n} Dosen)`, detail };
  if (n === 1) { const nextDue = addDays(doses[0].date, 7); return { relevance: 'travel', status: 'incomplete', headline: `2. Dosis ab ${de(nextDue)}`, nextDue, nextLabel: '2. Tollwut-Dosis', detail }; }
  return { relevance: 'travel', status: 'optional', headline: 'Je nach Reiseart', detail };
}

function ruleJE(doses, ctx) {
  const n = doses.length;
  const detail = 'Reiseimpfung für Süd-, Südost- und Ostasien bei längeren Aufenthalten oder Reisen in ländliche Gebiete (Reisfelder). 2 Dosen (Tag 0 und 7 bzw. 28), Auffrischung nach 12–24 Monaten bei fortbestehendem Risiko, danach nach ca. 10 Jahren.';
  if (!n) return { relevance: 'travel', status: 'optional', headline: 'Je nach Reiseart', detail };
  if (n === 1) { const nextDue = addDays(doses[0].date, 7); return { relevance: 'travel', status: 'incomplete', headline: `2. Dosis ab ${de(nextDue)}`, nextDue, nextLabel: '2. JE-Dosis', detail }; }
  const validUntil = n === 2 ? addMonths(doses[1].date, 12) : addYears(doses[n - 1].date, 10);
  return travelExpiry({ relevance: 'travel', validUntil, nextDue: validUntil, nextLabel: 'JE-Auffrischung', detail }, ctx);
}

function ruleMenACWY(doses, ctx) {
  const n = doses.length;
  const detail = 'Reiseimpfung für den afrikanischen „Meningitisgürtel“ (v. a. in der Trockenzeit, bei engem Kontakt zur Bevölkerung) und Pflicht für Pilgerreisen nach Saudi-Arabien (Hajj/Umrah). Auffrischung nach 5 Jahren bei fortbestehendem Risiko.';
  if (!n) return { relevance: 'travel', status: 'optional', headline: 'Je nach Reiseziel', detail };
  const validUntil = addYears(doses[n - 1].date, 5);
  return travelExpiry({ relevance: 'travel', validUntil, nextDue: validUntil, nextLabel: 'MenACWY-Auffrischung', detail }, ctx);
}

function ruleCholera(doses, ctx) {
  const n = doses.length;
  const detail = 'Nur in Ausnahmefällen (z. B. humanitäre Einsätze in Ausbruchsgebieten). Schluckimpfung: 2 Dosen im Abstand von 1–6 Wochen, Schutz ca. 2 Jahre.';
  if (!n) return { relevance: 'travel', status: 'none', headline: 'Nur in Ausnahmefällen', detail };
  if (n === 1) { const nextDue = addDays(doses[0].date, 7); return { relevance: 'travel', status: 'incomplete', headline: `2. Dosis ab ${de(nextDue)}`, nextDue, nextLabel: '2. Cholera-Dosis', detail }; }
  const validUntil = addYears(doses[n - 1].date, 2);
  return travelExpiry({ relevance: 'travel', validUntil, nextDue: validUntil, nextLabel: 'Cholera-Auffrischung', detail }, ctx);
}

function ruleRecordOnly(doses) {
  const n = doses.length;
  return n ? { relevance: 'none', status: 'ok', headline: `${n} Impfung${n > 1 ? 'en' : ''} eingetragen`, detail: 'Nur zur Dokumentation – keine allgemeine Empfehlungslogik hinterlegt.' }
    : { relevance: 'none', status: 'none', headline: 'Nur zur Dokumentation', detail: 'Keine allgemeine STIKO-Standardempfehlung. Bitte reisemedizinisch beraten lassen.' };
}

// Reiseimpfungen "laufen ab", sind aber ohne geplante Reise nicht überfällig.
function travelExpiry(r, ctx) {
  const s = dueStatus(r.validUntil, ctx);
  return { ...r, status: s === 'overdue' ? 'expired' : 'ok', headline: s === 'overdue' ? `Abgelaufen am ${de(r.validUntil)}` : `Gültig bis ${de(r.validUntil)}` };
}

// ---------------------------------------------------------------- Auswertung

function rawEvaluate(id, ctx, cache) {
  const doses = dosesFor(id, ctx);
  switch (id) {
    case 'tetanus': case 'diphtherie': return ruleTetDiph(id, doses, ctx);
    case 'pertussis': return rulePertussis(doses, ctx, cache.tetanus);
    case 'polio': return rulePolio(doses, ctx);
    case 'masern': case 'mumps': case 'roeteln': return ruleMMR(id, doses, ctx);
    case 'varizellen': return ruleVaricella(doses, ctx);
    case 'hpv': return ruleHPV(doses, ctx);
    case 'hepb': return ruleHepB(doses, ctx);
    case 'hib': return ruleChildOnly(id, doses, ctx, 5, 3, 'STIKO: Grundimmunisierung im Säuglingsalter (als 6-fach-Impfung). Für ältere Kinder und Erwachsene nur bei besonderer Indikation (z. B. fehlende Milz).');
    case 'menc': return ruleChildOnly(id, doses, ctx, 18, 1, 'STIKO: Einmalige Impfung im Alter von 12 Monaten, Nachholimpfung bis zum 18. Geburtstag. Eine MenACWY-Impfung schützt ebenfalls gegen Meningokokken C.');
    case 'menb': return ruleChildOnly(id, doses, ctx, 5, 1, 'STIKO: Standardimpfung für Säuglinge (seit 2024), Nachholimpfung bis zum 5. Geburtstag. Ältere nur bei Indikation.');
    case 'pneumo': return rulePneumo(doses, ctx);
    case 'influenza': return ruleInfluenza(doses, ctx);
    case 'covid': return ruleCovid(doses, ctx);
    case 'zoster': return ruleZoster(doses, ctx);
    case 'rsv': return ruleRSV(doses, ctx);
    case 'fsme': return ruleFSME(doses, ctx);
    case 'hepa': return ruleHepA(doses, ctx);
    case 'typhus': return ruleTyphus(doses, ctx);
    case 'gelbfieber': return ruleYF(doses, ctx);
    case 'tollwut': return ruleRabies(doses, ctx);
    case 'je': return ruleJE(doses, ctx);
    case 'menacwy': return ruleMenACWY(doses, ctx);
    case 'cholera': return ruleCholera(doses, ctx);
    default: return ruleRecordOnly(doses);
  }
}

function headlineFor(r) {
  if (r.status === 'immune') return 'Als immun markiert';
  if (r.headline && !['overdue', 'soon'].includes(r.status)) return r.headline;
  if (r.status === 'overdue' && r.nextDue) return `${r.nextLabel} fällig seit ${de(r.nextDue)}`;
  if (r.status === 'soon' && r.nextDue) return `${r.nextLabel} fällig am ${de(r.nextDue)}`;
  if (r.headline) return r.headline;
  if (r.validUntil) return `Gültig bis ${de(r.validUntil)}`;
  return STATUS[r.status].label;
}

export function evaluateAll(ctx) {
  const cache = {};
  for (const d of DISEASES) {
    const r = rawEvaluate(d.id, ctx, cache);
    const ov = ctx.overrides[d.id] || {};
    r.id = d.id;
    r.disease = d;
    r.doses = dosesFor(d.id, ctx);
    r.hidden = !!ov.hidden;
    if (ov.immune) Object.assign(r, { status: 'immune', nextDue: null, validUntil: null, protectedUntil: null });
    r.headline = headlineFor(r);
    r.hints = r.hints || [];
    cache[d.id] = r;
  }
  // Pertussis folgt der Tetanus-Bewertung – erst nach Tetanus neu berechnen.
  if (!ctx.overrides.pertussis?.immune) {
    const p = rulePertussis(dosesFor('pertussis', ctx), ctx, cache.tetanus);
    Object.assign(cache.pertussis, p);
    cache.pertussis.headline = headlineFor(cache.pertussis);
    cache.pertussis.hints = p.hints || [];
  }
  return cache;
}

export function isRelevant(r) {
  return ['standard', 'indication'].includes(r.relevance) && r.status !== 'none';
}

export function summarize(results) {
  const list = Object.values(results).filter((r) => isRelevant(r) && !r.hidden);
  const count = (s) => list.filter((r) => s.includes(r.status)).length;
  return {
    overdue: count(['overdue', 'missing']),
    attention: count(['incomplete', 'soon']),
    ok: count(['ok', 'immune', 'planned']),
    total: list.length,
  };
}

// ---------------------------------------------------------------- Reiseplanung

const LEVEL = { base: 0, situational: 1, recommended: 2, required: 3 };
export const LEVEL_LABEL = { required: 'Pflicht', recommended: 'Empfohlen', situational: 'Je nach Reiseart', base: 'Standard' };

export function travelNeeds(trip, ctx) {
  const items = new Map();
  const add = (id, level, reason) => {
    const cur = items.get(id) || { id, level, reasons: new Set() };
    if (LEVEL[level] > LEVEL[cur.level]) cur.level = level;
    if (reason) cur.reasons.add(reason);
    items.set(id, cur);
  };
  const t = trip;
  const sit = (cond) => (cond ? 'recommended' : 'situational');
  const countries = (t.countries || []).map((c) => COUNTRY_BY_CODE[c]).filter(Boolean);

  for (const id of ['tetanus', 'diphtherie', 'polio', 'masern']) add(id, 'base');
  let poliobooster = false;
  for (const c of countries) {
    for (const f of c.flags) {
      if (f === 'A') add('hepa', 'recommended', c.name);
      if (f === 'T') add('typhus', 'recommended', c.name);
      if (f === 't') add('typhus', sit(t.rural || t.long), c.name);
      if (f === 'Y') add('gelbfieber', 'recommended', c.name);
      if (f === 'Y!') add('gelbfieber', 'required', c.name);
      if (f === 'P') { poliobooster = true; add('polio', 'recommended', c.name); }
      if (f === 'M!') add('menacwy', t.hajj ? 'required' : 'situational', c.name);
      if (f === 'm') add('menacwy', sit(t.rural || t.long), c.name);
      if (f === 'r') add('tollwut', sit(t.rural || t.outdoor || t.long), c.name);
      if (f === 'j') add('je', sit(t.rural || t.long), c.name);
      if (f === 'b') add('hepb', sit(t.long), c.name);
      if (f === 'f') add('fsme', sit(t.outdoor), c.name);
    }
  }
  return { items: [...items.values()].map((i) => ({ ...i, reasons: [...i.reasons] })), countries, poliobooster };
}

export function evaluateTrip(trip, baseCtx) {
  const start = trip.start || baseCtx.today;
  const end = trip.end && trip.end >= start ? trip.end : start;
  // Bewertung zum Abreisetag, nur mit Impfungen bis dahin.
  const ctx = { ...baseCtx, today: start, cutoff: start, age: baseCtx.profile.birthdate ? ageAt(baseCtx.profile.birthdate, start) : baseCtx.age };
  const res = evaluateAll(ctx);
  const needs = travelNeeds(trip, ctx);
  const out = [];

  for (const need of needs.items) {
    const r = res[need.id];
    const doses = r.doses;
    const last = doses[doses.length - 1];
    let state = 'ok', text = '';
    const leadDays = TRAVEL_LEAD_DAYS[need.id] ?? 14;
    const deadline = addDays(start, -leadDays);

    if (r.status === 'immune') { state = 'ok'; text = 'Als immun markiert'; }
    else if (need.id === 'masern' && r.status === 'none') { state = 'ok'; text = r.headline; }
    else if (!doses.length) { state = 'missing'; text = 'Keine Impfung eingetragen'; }
    else if (need.id === 'polio') {
      if (r.status !== 'ok') { state = 'incomplete'; text = r.headline; }
      else if (needs.poliobooster && addYears(last.date, 10) < start) { state = 'booster'; text = `Letzte Polio-Impfung ${de(last.date)} – Auffrischung empfohlen (> 10 Jahre)`; }
      else text = needs.poliobooster ? `Letzte Impfung ${de(last.date)} – innerhalb von 10 Jahren` : 'Grundimmunisierung vollständig';
    } else if (need.id === 'gelbfieber') {
      if (diffDays(last.date, start) < 10) { state = 'incomplete'; text = 'Zertifikat gilt erst ab dem 10. Tag nach der Impfung'; }
      else if (doses.length === 1 && addYears(last.date, 10) < start) { state = 'booster'; text = 'Zertifikat gültig – STIKO empfiehlt einmalige Auffrischung (> 10 Jahre)'; }
      else text = 'Zertifikat lebenslang gültig';
    } else if (need.id === 'hepa' && r.status === 'incomplete') {
      if (diffDays(last.date, start) >= 14 && r.protectedUntil >= end) { state = 'ok'; text = `Geschützt durch 1. Dosis – Folgedosis ab ${de(r.nextDue)}`; }
      else { state = 'incomplete'; text = r.headline; }
    } else if (need.id === 'fsme' && r.status === 'incomplete' && r.protectedUntil && r.protectedUntil >= end) {
      state = 'ok'; text = `Schutz nach 2 Dosen – ${r.nextLabel} ab ${de(r.nextDue)}`;
    } else if (r.status === 'incomplete' || r.status === 'missing') { state = 'incomplete'; text = r.headline; }
    else if (r.validUntil && r.validUntil < start) { state = 'expired'; text = `Abgelaufen am ${de(r.validUntil)}`; }
    else if (r.validUntil && r.validUntil < end) { state = 'expires'; text = `Läuft während der Reise ab (${de(r.validUntil)})`; }
    else text = r.validUntil ? `Gültig bis ${de(r.validUntil)}` : r.headline;

    if (need.id === 'menacwy' && trip.hajj && state === 'ok' && diffDays(last.date, start) < 10) { state = 'incomplete'; text = 'Impfung muss mind. 10 Tage vor Ankunft erfolgen'; }

    out.push({ ...need, disease: DISEASE_BY_ID[need.id], state, text, deadline, leadDays });
  }

  const order = { missing: 0, incomplete: 1, expired: 2, expires: 3, booster: 4, ok: 5 };
  out.sort((a, b) => LEVEL[b.level] - LEVEL[a.level] || order[a.state] - order[b.state]);

  const notes = [];
  const has = (f) => needs.countries.filter((c) => c.flags.includes(f));
  const yfReq = has('Y!');
  if (yfReq.length) notes.push(`Gelbfieber-Impfnachweis bei Einreise verlangt: ${yfReq.map((c) => c.name).join(', ')}. Impfung nur in zugelassenen Gelbfieber-Impfstellen; Eintrag im Internationalen Impfausweis.`);
  if (has('Y').length || yfReq.length) notes.push('Viele Länder verlangen einen Gelbfieber-Nachweis, wenn du aus einem Gelbfiebergebiet einreist – auch bei Weiterreise.');
  const polioWHO = needs.countries.filter((c) => ['PK', 'AF'].includes(c.code));
  if (polioWHO.length) notes.push(`${polioWHO.map((c) => c.name).join(', ')}: Bei Aufenthalten über 4 Wochen wird bei der Ausreise eine Polio-Impfung verlangt, die 4 Wochen bis 12 Monate zurückliegt.`);
  if (needs.countries.some((c) => c.code === 'SA')) notes.push(trip.hajj ? 'Hajj/Umrah: MenACWY-Konjugatimpfung (nicht älter als 5 Jahre, mind. 10 Tage vor Ankunft) ist Pflicht.' : 'Für Pilgerreisen (Hajj/Umrah) ist eine MenACWY-Impfung Pflicht – Option „Pilgerreise“ aktivieren.');
  if (needs.countries.some((c) => c.region !== 'Europa' && c.flags.includes('A') && !['IL', 'AE', 'QA', 'BH', 'KW', 'SG', 'HK', 'TW', 'KR', 'PR', 'BS', 'BB', 'UY', 'CL'].includes(c.code)))
    notes.push('Denk auch an Mückenschutz und ggf. Malaria-Prophylaxe (keine Impfung) – das klärt eine reisemedizinische Beratung.');
  notes.push('Lass dich idealerweise 6–8 Wochen vor Abreise reisemedizinisch beraten. Aktuelle Einreisebestimmungen: Auswärtiges Amt (Reise- und Sicherheitshinweise).');

  const open = out.filter((i) => i.state !== 'ok' && i.level !== 'situational');
  const earliest = open.length ? open.reduce((m, i) => (i.deadline < m ? i.deadline : m), open[0].deadline) : null;
  return { items: out, notes, start, end, open: open.length, earliestDeadline: earliest };
}

// ---------------------------------------------------------------- Erinnerungen

export function buildReminders(state, today) {
  const ctx = makeContext(state, today);
  const res = evaluateAll(ctx);
  const groups = new Map();
  for (const r of Object.values(res)) {
    if (!isRelevant(r) || r.hidden || r.status === 'immune' || !r.nextDue) continue;
    const key = `${r.nextDue}|${r.nextLabel}`;
    const g = groups.get(key) || { date: r.nextDue, label: r.nextLabel, ids: [], overdue: r.nextDue < today };
    g.ids.push(r.id);
    groups.set(key, g);
  }
  // Td + Tdap am selben Tag zusammenfassen
  const list = [...groups.values()].map((g) => ({
    uid: `impf-${g.ids.join('-')}`,
    date: g.date,
    overdue: g.overdue,
    title: `${g.label}`,
    ids: [...g.ids],
    diseases: g.ids.map((id) => DISEASE_BY_ID[id].name),
    kind: 'vaccine',
  }));
  const merged = [];
  for (const item of list.sort((a, b) => a.date.localeCompare(b.date))) {
    const same = merged.find((m) => m.date === item.date && m.kind === 'vaccine');
    if (same) { same.diseases.push(...item.diseases); same.ids.push(...item.ids); same.uid += `-${item.uid.slice(5)}`; if (!same.title.includes(item.title)) same.title += ` + ${item.title}`; }
    else merged.push({ ...item, ids: [...item.ids], diseases: [...item.diseases] });
  }
  for (const trip of state.trips || []) {
    if (!trip.start || trip.start < today) continue;
    const ev = evaluateTrip(trip, ctx);
    if (!ev.open) continue;
    const prep = addDays(trip.start, -42);
    merged.push({
      uid: `reise-${trip.id}`,
      date: prep > today ? prep : today,
      overdue: false,
      title: `Reiseimpfungen: ${trip.name || 'Reise'}`,
      ids: [],
      diseases: ev.items.filter((i) => i.state !== 'ok' && i.level !== 'situational').map((i) => i.disease.name),
      kind: 'trip',
      deadline: ev.earliestDeadline,
    });
  }
  return merged.sort((a, b) => a.date.localeCompare(b.date));
}
