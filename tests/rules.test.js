import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeContext, evaluateAll, evaluateTrip, buildReminders, summarize } from '../js/rules.js';
import { buildICS } from '../js/ics.js';
import { emptyState } from '../js/store.js';
import { COUNTRIES } from '../js/data.js';

const today = '2026-11-20';
const v = (date, productId, diseases) => ({ id: date + productId, date, productId, diseases });

function state(extra = {}) {
  const s = emptyState();
  s.profile.birthdate = '1990-05-10';
  Object.assign(s.profile, extra.profile || {});
  s.vaccinations = extra.vaccinations || [];
  s.trips = extra.trips || [];
  s.overrides = extra.overrides || {};
  return s;
}
const run = (s, t = today) => evaluateAll(makeContext(s, t));

test('Tetanus: Auffrischung nach 10 Jahren, bald fällig innerhalb Vorlauf', () => {
  const r = run(state({ vaccinations: [v('2016-12-01', 'tdap', ['tetanus', 'diphtherie', 'pertussis'])] }));
  assert.equal(r.tetanus.validUntil, '2026-12-01');
  assert.equal(r.tetanus.status, 'soon');
  assert.equal(r.pertussis.status, 'ok'); // Tdap als Erwachsener
});

test('Tetanus überfällig, Pertussis folgt', () => {
  const r = run(state({ vaccinations: [v('2010-01-01', 'td', ['tetanus', 'diphtherie'])] }));
  assert.equal(r.tetanus.status, 'overdue');
  assert.equal(r.pertussis.status, 'overdue');
});

test('Pertussis ausstehend, wenn Td noch lange gültig', () => {
  const r = run(state({ vaccinations: [v('2024-01-01', 'td', ['tetanus', 'diphtherie'])] }));
  assert.equal(r.pertussis.status, 'planned');
  assert.equal(r.pertussis.nextDue, '2034-01-01');
});

test('Masern: nach 1970 geboren, 1 Kinderimpfung -> unvollständig; 2 -> ok; vor 1971 -> nicht nötig', () => {
  let r = run(state({ vaccinations: [v('1991-06-01', 'mmr', ['masern', 'mumps', 'roeteln'])] }));
  assert.equal(r.masern.status, 'incomplete');
  r = run(state({ vaccinations: [v('1991-06-01', 'mmr', ['masern']), v('1995-06-01', 'mmr', ['masern'])] }));
  assert.equal(r.masern.status, 'ok');
  r = run(state({ profile: { birthdate: '1965-01-01' } }));
  assert.equal(r.masern.status, 'none');
});

test('Röteln: Frauen im gebärfähigen Alter brauchen 2 Dosen', () => {
  const r = run(state({ profile: { sex: 'f' }, vaccinations: [v('2020-01-01', 'mmr', ['masern', 'mumps', 'roeteln'])] }));
  assert.equal(r.roeteln.status, 'incomplete');
  assert.equal(r.masern.status, 'ok');
});

test('Ab 60: Grippe, Pneumokokken, Zoster, COVID relevant', () => {
  const r = run(state({ profile: { birthdate: '1960-01-01' } }));
  assert.equal(r.influenza.status, 'overdue');
  assert.equal(r.pneumo.status, 'missing');
  assert.equal(r.zoster.status, 'missing');
  assert.equal(r.covid.status, 'missing');
  assert.equal(r.rsv.status, 'none');
});

test('Grippe in aktueller Saison -> ok, nächste Okt. 2027', () => {
  const r = run(state({ profile: { birthdate: '1960-01-01' }, vaccinations: [v('2026-10-15', 'flu', ['influenza'])] }));
  assert.equal(r.influenza.status, 'ok');
  assert.equal(r.influenza.nextDue, '2027-10-01');
});

test('FSME-Schema', () => {
  const doses = [v('2020-03-01', 'fsme-immun', ['fsme']), v('2020-04-01', 'fsme-immun', ['fsme']), v('2020-12-01', 'fsme-immun', ['fsme'])];
  let r = run(state({ profile: { fsmeArea: true }, vaccinations: doses }));
  assert.equal(r.fsme.validUntil, '2023-12-01');
  assert.equal(r.fsme.status, 'overdue');
  r = run(state({ profile: { fsmeArea: true }, vaccinations: [...doses, v('2024-01-01', 'fsme-immun', ['fsme'])] }));
  assert.equal(r.fsme.validUntil, '2029-01-01');
});

test('Immun-Markierung überschreibt', () => {
  const r = run(state({ overrides: { varizellen: { immune: true }, tetanus: { immune: true } } }));
  assert.equal(r.varizellen.status, 'immune');
  assert.equal(r.tetanus.status, 'immune');
});

test('Reise Kenia: Gelbfieber, Hep A, Typhus situativ', () => {
  const s = state({ vaccinations: [v('2020-01-01', 'tdap-ipv', ['tetanus', 'diphtherie', 'pertussis', 'polio'])] });
  const ev = evaluateTrip({ id: 'x', countries: ['KE'], start: '2027-02-01', end: '2027-02-20' }, makeContext(s, today));
  const by = Object.fromEntries(ev.items.map((i) => [i.id, i]));
  assert.equal(by.gelbfieber.level, 'recommended');
  assert.equal(by.gelbfieber.state, 'missing');
  assert.equal(by.hepa.level, 'recommended');
  assert.equal(by.typhus.level, 'situational');
  assert.equal(by.tetanus.state, 'ok');
  assert.ok(by.polio); // Polio-Auffrischung (Kenia P)
  assert.equal(by.polio.state, 'incomplete'); // nur 1 Dosis eingetragen
});

test('Reise: Impfung läuft während der Reise ab', () => {
  const s = state({ vaccinations: [v('2017-03-01', 'td', ['tetanus', 'diphtherie'])] });
  const ev = evaluateTrip({ id: 'x', countries: ['ES'], start: '2027-02-15', end: '2027-03-15' }, makeContext(s, today));
  const t = ev.items.find((i) => i.id === 'tetanus');
  assert.equal(t.state, 'expires');
});

test('Reise Ghana: Gelbfieber Pflicht + Hinweis', () => {
  const ev = evaluateTrip({ id: 'x', countries: ['GH'], start: '2027-02-01', end: '2027-02-20' }, makeContext(state(), today));
  assert.equal(ev.items.find((i) => i.id === 'gelbfieber').level, 'required');
  assert.ok(ev.notes.some((n) => n.includes('Ghana')));
});

test('Erinnerungen + ICS', () => {
  const s = state({ vaccinations: [v('2017-03-01', 'td', ['tetanus', 'diphtherie'])], trips: [{ id: 't1', name: 'Thailand', countries: ['TH'], start: '2027-03-01', end: '2027-03-20' }] });
  const rem = buildReminders(s, today);
  const td = rem.find((r) => r.date === '2027-03-01' && r.kind === 'vaccine');
  assert.ok(td, 'Td-Erinnerung');
  assert.ok(td.diseases.includes('Tetanus') && td.diseases.includes('Diphtherie') && td.diseases.includes('Pertussis'));
  assert.ok(rem.some((r) => r.kind === 'trip'));
  const ics = buildICS(rem, { leadDays: 30, today });
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /TRIGGER:-P30D/);
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
});

test('Summary zählt', () => {
  const sum = summarize(run(state()));
  assert.ok(sum.overdue > 0);
});

test('Länder-Codes eindeutig', () => {
  const codes = COUNTRIES.map((c) => c.code);
  assert.equal(new Set(codes).size, codes.length);
});

import { parseDateInput, formatDateTyping } from '../js/dates.js';
import { suggestVaccines, detectProduct } from '../js/search.js';

test('Datumseingabe ohne Kalender', () => {
  const t = '2026-11-20';
  assert.equal(parseDateInput('05.12.2016', t), '2016-12-05');
  assert.equal(parseDateInput('5.12.16', t), '2016-12-05');
  assert.equal(parseDateInput('05122016', t), '2016-12-05');
  assert.equal(parseDateInput('051216', t), '2016-12-05');
  assert.equal(parseDateInput('5,12,2016', t), '2016-12-05');
  assert.equal(parseDateInput('14.4.92', t), '1992-04-14');
  assert.equal(parseDateInput('2016-12-05', t), '2016-12-05');
  assert.equal(parseDateInput('31.02.2020', t), null);
  assert.equal(parseDateInput('abc', t), null);
  assert.equal(formatDateTyping('05'), '05.');
  assert.equal(formatDateTyping('0512'), '05.12.');
  assert.equal(formatDateTyping('05122016'), '05.12.2016');
  assert.equal(formatDateTyping('5,12,'), '5.12.');
  assert.equal(formatDateTyping('05.1', true), '05.1');
  assert.equal(formatDateTyping('051220161'), '05.12.2016');
});

test('Namenssuche schlägt Impfstoff vor', () => {
  assert.equal(suggestVaccines('boos')[0].productId, 'tdap');
  assert.equal(suggestVaccines('Boostrix Polio')[0].productId, 'tdap-ipv');
  assert.equal(suggestVaccines('comirnaty')[0].productId, 'covid');
  assert.equal(suggestVaccines('Comirnati')[0].productId, 'covid'); // Tippfehler
  assert.equal(suggestVaccines('fsme immun')[0].productId, 'fsme-immun');
  assert.equal(suggestVaccines('zecken')[0].productId, 'fsme-immun');
  assert.equal(suggestVaccines('grippe')[0].productId, 'flu');
  assert.equal(suggestVaccines('Priorix')[0].productId, 'mmr');
  assert.equal(suggestVaccines('Twinrix')[0].productId, 'twinrix');
  assert.equal(detectProduct('Repevax').productId, 'tdap-ipv');
  assert.equal(detectProduct('xyz'), null);
  assert.deepEqual(suggestVaccines(''), []);
});

test('Zostavax zählt nicht als Shingrix', () => {
  const s = state({ profile: { birthdate: '1955-01-01' }, vaccinations: [v('2015-01-01', 'zostavax', ['zoster'])] });
  const r = run(s);
  assert.equal(r.zoster.status, 'missing');
  assert.ok(r.zoster.hints.length);
});

import { parseImport } from '../js/importer.js';

test('Import-Code: Namen erkennen, Duplikate und Fehler markieren', () => {
  const existing = [{ id: 'a', date: '2016-12-05', productId: 'tdap-ipv', diseases: ['tetanus', 'diphtherie', 'pertussis', 'polio'] }];
  const code = '```json\n' + JSON.stringify({ impfbuch: 'import', vaccinations: [
    { date: '05.12.2016', name: 'Boostrix Polio' },
    { date: '14.03.1993', name: 'Priorix', doctor: 'Dr. Kim' },
    { date: '2021-05-20', name: 'Comirnaty', batch: 'EX1234' },
    { date: '', name: 'Havrix' },
    { date: '01.01.2000', name: 'Unbekanntix' },
    { date: '01.06.1995', diseases: ['polio'], name: 'Polio oral' },
  ] }) + '\n```';
  const { items, error } = parseImport(code, existing, '2026-11-20');
  assert.equal(error, null);
  assert.equal(items[0].duplicate, true);
  assert.equal(items[1].productId, 'mmr');
  assert.deepEqual(items[1].diseases, ['masern', 'mumps', 'roeteln']);
  assert.equal(items[2].productId, 'covid');
  assert.equal(items[3].ok, false);
  assert.equal(items[4].ok, false);
  assert.equal(items[5].ok, true);
  assert.deepEqual(items[5].diseases, ['polio']);
  assert.ok(parseImport('quatsch').error);
});
