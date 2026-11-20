// Namenssuche: Handelsname (z. B. "Boostrix") → Impfstoff-Typ aus PRODUCTS.
// Toleriert Groß-/Kleinschreibung, Bindestriche, Umlaute und kleine Tippfehler.

import { PRODUCT_BY_ID } from './data.js';

// [Handelsname, productId]
export const TRADE_NAMES = [
  // Tetanus / Diphtherie / Keuchhusten / Polio
  ['Td-pur', 'td'], ['Td-Impfstoff Mérieux', 'td'], ['Td-Rix', 'td'], ['Td-Impfstoff', 'td'], ['Diftavax', 'td'],
  ['Boostrix', 'tdap'], ['Covaxis', 'tdap'], ['Triaxis', 'tdap'], ['Adacel', 'tdap'],
  ['Boostrix Polio', 'tdap-ipv'], ['Repevax', 'tdap-ipv'], ['Adacel Polio', 'tdap-ipv'], ['Tetravac', 'tdap-ipv'], ['Infanrix-IPV', 'tdap-ipv'],
  ['Revaxis', 'td-ipv'], ['Dultavax', 'td-ipv'],
  ['Tetanol pur', 't'], ['Tetanol', 't'], ['Tetavax', 't'], ['Tetanus-Impfstoff Mérieux', 't'],
  ['IPV Mérieux', 'ipv'], ['IPV-Virelon', 'ipv'], ['Imovax Polio', 'ipv'],
  ['Polio-Schluckimpfung', 'opv'], ['Sabin', 'opv'], ['OPV', 'opv'], ['Oral-Virelon', 'opv'],
  ['Hexyon', 'hexa'], ['Hexacima', 'hexa'], ['Infanrix hexa', 'hexa'], ['Vaxelis', 'hexa'],
  ['Infanrix-IPV+Hib', 'penta'], ['Pentavac', 'penta'], ['Pentaxim', 'penta'],
  ['Infanrix', 'dtap'], ['DTaP-Impfstoff', 'dtap'], ['DT-Impfstoff', 'td'],
  // MMR / Varizellen
  ['M-M-RvaxPro', 'mmr'], ['M-M-R II', 'mmr'], ['Priorix', 'mmr'], ['MMR Triplovax', 'mmr'], ['MMR-Vax', 'mmr'],
  ['Priorix-Tetra', 'mmrv'], ['ProQuad', 'mmrv'],
  ['Varivax', 'var'], ['Varilrix', 'var'],
  // Hepatitis
  ['Havrix', 'hepa'], ['Havrix 1440', 'hepa'], ['Havrix 720', 'hepa'], ['Vaqta', 'hepa'], ['Avaxim', 'hepa'], ['Epaxal', 'hepa'],
  ['Engerix-B', 'hepb'], ['HBVaxPro', 'hepb'], ['Fendrix', 'hepb'], ['Gen H-B-Vax', 'hepb'], ['PreHevbri', 'hepb'],
  ['Heplisav B', 'heplisav'],
  ['Twinrix', 'twinrix'], ['Twinrix Erwachsene', 'twinrix'], ['Twinrix Kinder', 'twinrix'],
  ['Viatim', 'hepa-typhus'], ['Vivaxim', 'hepa-typhus'], ['Hepatyrix', 'hepa-typhus'],
  // Weitere Standardimpfungen
  ['Gardasil', 'hpv'], ['Gardasil 9', 'hpv'], ['Cervarix', 'hpv'],
  ['NeisVac-C', 'menc'], ['Menjugate', 'menc'], ['Meningitec', 'menc'],
  ['Nimenrix', 'menacwy'], ['Menveo', 'menacwy'], ['MenQuadfi', 'menacwy'], ['Mencevax ACWY', 'menacwy'],
  ['Bexsero', 'menb'], ['Trumenba', 'menb'],
  ['Act-HIB', 'hib'], ['Hiberix', 'hib'],
  ['Prevenar 20', 'pcv20'], ['Apexxnar', 'pcv20'], ['Capvaxive', 'pcv20'],
  ['Prevenar 13', 'pcv-other'], ['Prevenar', 'pcv-other'], ['Vaxneuvance', 'pcv-other'], ['Synflorix', 'pcv-other'],
  ['Pneumovax 23', 'ppsv23'], ['Pneumovax', 'ppsv23'],
  ['Vaxigrip', 'flu'], ['Vaxigrip Tetra', 'flu'], ['Influvac', 'flu'], ['Influvac Tetra', 'flu'], ['Fluad', 'flu'], ['Fluad Tetra', 'flu'],
  ['Efluelda', 'flu'], ['Efluelda Tetra', 'flu'], ['Flucelvax', 'flu'], ['Flucelvax Tetra', 'flu'], ['Fluenz', 'flu'], ['Fluenz Tetra', 'flu'],
  ['Fluarix', 'flu'], ['Fluarix Tetra', 'flu'], ['Xanaflu', 'flu'], ['Afluria Tetra', 'flu'], ['Influsplit', 'flu'], ['Begrivac', 'flu'],
  ['Inflexal', 'flu'], ['Mutagrip', 'flu'], ['Supemtek', 'flu'], ['Afluria', 'flu'],
  ['Comirnaty', 'covid'], ['Spikevax', 'covid'], ['Nuvaxovid', 'covid'], ['Vaxzevria', 'covid'], ['Jcovden', 'covid'],
  ['COVID-19 Vaccine Janssen', 'covid'], ['Bimervax', 'covid'], ['VidPrevtyn Beta', 'covid'], ['Valneva COVID-19', 'covid'], ['Kostaive', 'covid'],
  ['BioNTech', 'covid'], ['Moderna', 'covid'], ['AstraZeneca', 'covid'], ['Novavax', 'covid'], ['Johnson & Johnson', 'covid'],
  ['Shingrix', 'shingrix'], ['Zostavax', 'zostavax'],
  ['Arexvy', 'rsv'], ['Abrysvo', 'rsv'], ['mResvia', 'rsv'],
  // Reiseimpfungen
  ['FSME-Immun', 'fsme-immun'], ['FSME-Immun Erwachsene', 'fsme-immun'], ['FSME-Immun Junior', 'fsme-immun'], ['TicoVac', 'fsme-immun'],
  ['Encepur', 'encepur'], ['Encepur Erwachsene', 'encepur'], ['Encepur Kinder', 'encepur'],
  ['Typhim Vi', 'typhim'], ['Typherix', 'typhim'], ['Vivotif', 'vivotif'],
  ['Stamaril', 'yf'], ['YF-Vax', 'yf'],
  ['Rabipur', 'rabies'], ['Verorab', 'rabies'], ['Tollwut-Impfstoff (HDC)', 'rabies'],
  ['Ixiaro', 'je'], ['Jespect', 'je'],
  ['Dukoral', 'cholera'], ['Vaxchora', 'cholera'],
  ['Qdenga', 'dengue'], ['Dengvaxia', 'dengue'],
  ['Ixchiq', 'chik'], ['Vimkunya', 'chik'],
  ['Imvanex', 'mpox'], ['Jynneos', 'mpox'],
];

// Umgangssprachliche Begriffe / Abkürzungen → Typ
const KEYWORDS = [
  ['Tetanus', 't'], ['Wundstarrkrampf', 't'], ['Diphtherie', 'td'], ['Td', 'td'], ['Tdap', 'tdap'], ['Keuchhusten', 'tdap'], ['Pertussis', 'tdap'],
  ['Tdap-IPV', 'tdap-ipv'], ['Td-IPV', 'td-ipv'], ['Polio', 'ipv'], ['Kinderlähmung', 'ipv'], ['IPV', 'ipv'], ['6-fach', 'hexa'], ['Sechsfach', 'hexa'],
  ['5-fach', 'penta'], ['Fünffach', 'penta'], ['DTaP', 'dtap'],
  ['MMR', 'mmr'], ['Masern', 'mmr'], ['Mumps', 'mmr'], ['Röteln', 'mmr'], ['MMRV', 'mmrv'], ['Windpocken', 'var'], ['Varizellen', 'var'],
  ['Hepatitis A', 'hepa'], ['Hepatitis B', 'hepb'], ['Hepatitis A+B', 'twinrix'], ['HPV', 'hpv'], ['Gebärmutterhalskrebs', 'hpv'],
  ['Meningokokken C', 'menc'], ['Meningokokken ACWY', 'menacwy'], ['Meningokokken B', 'menb'], ['Hib', 'hib'],
  ['Pneumokokken', 'pcv20'], ['PCV20', 'pcv20'], ['PPSV23', 'ppsv23'], ['Lungenentzündung', 'pcv20'],
  ['Grippe', 'flu'], ['Influenza', 'flu'], ['Corona', 'covid'], ['COVID', 'covid'], ['Gürtelrose', 'shingrix'], ['Herpes zoster', 'shingrix'],
  ['RSV', 'rsv'], ['FSME', 'fsme-immun'], ['Zecken', 'fsme-immun'], ['Zeckenimpfung', 'fsme-immun'], ['Typhus', 'typhim'], ['Gelbfieber', 'yf'],
  ['Tollwut', 'rabies'], ['Japanische Enzephalitis', 'je'], ['Cholera', 'cholera'], ['Dengue', 'dengue'], ['Chikungunya', 'chik'], ['Mpox', 'mpox'], ['Affenpocken', 'mpox'],
];

export function norm(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9+]/g, '');
}

function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function score(query, name) {
  const q = norm(query), n = norm(name);
  if (!q) return 0;
  if (n === q) return 100;
  if (n.startsWith(q)) return 90 - Math.min(20, n.length - q.length);
  const words = String(name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[\s\-/()+]+/).map(norm);
  if (words.some((w) => w.startsWith(q))) return 70;
  if (q.length >= 3 && n.includes(q)) return 60;
  // Tippfehler: Anfang des Namens in gleicher Länge vergleichen
  if (q.length >= 4) {
    const max = q.length >= 7 ? 2 : 1;
    const d = Math.min(lev(q, n.slice(0, q.length), max), lev(q, n, max));
    if (d <= max) return 45 - d * 5;
  }
  return 0;
}

// Liefert sortierte Vorschläge: { label, productId, product, kind: 'brand' | 'keyword', score }
export function suggestVaccines(query, limit = 6) {
  if (!norm(query)) return [];
  const best = new Map();
  const consider = (label, productId, kind, bonus) => {
    const s = score(query, label);
    if (!s) return;
    const key = `${label}|${productId}`;
    const total = s + bonus;
    if (!best.has(key) || best.get(key).score < total) best.set(key, { label, productId, product: PRODUCT_BY_ID[productId], kind, score: total });
  };
  for (const [label, pid] of TRADE_NAMES) consider(label, pid, 'brand', 2);
  for (const [label, pid] of KEYWORDS) consider(label, pid, 'keyword', 0);
  const list = [...best.values()].filter((x) => x.product).sort((a, b) => b.score - a.score || a.label.length - b.label.length);
  // Pro Impfstoff-Typ höchstens zwei Treffer, damit die Liste abwechslungsreich bleibt
  const perType = {};
  return list.filter((x) => (perType[x.productId] = (perType[x.productId] || 0) + 1) <= 2).slice(0, limit);
}

// Eindeutige automatische Erkennung (für Speichern ohne Auswahl)
export function detectProduct(query) {
  const [top, second] = suggestVaccines(query, 2);
  if (!top || top.score < 80) return null;
  if (second && second.score >= top.score - 5 && second.productId !== top.productId) return null;
  return top;
}
