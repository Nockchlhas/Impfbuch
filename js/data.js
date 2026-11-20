// Stammdaten: Krankheiten, Impfstoffe, Länder.
// Grundlage: STIKO-Empfehlungen (Epid. Bull. 4/2025 ff.) und STIKO/DTG-Reiseimpfempfehlungen.
// Vereinfachte Darstellung – ersetzt keine ärztliche bzw. reisemedizinische Beratung.

export const DATA_STAND = 'Stand der hinterlegten Empfehlungen: 2025/2026';

// group: 'standard' = STIKO-Standardimpfung (alters-/indikationsabhängig),
//        'travel'   = vor allem Reiseimpfung, 'other' = nur zur Dokumentation
export const DISEASES = [
  { id: 'tetanus', name: 'Tetanus', group: 'standard', short: 'Wundstarrkrampf' },
  { id: 'diphtherie', name: 'Diphtherie', group: 'standard' },
  { id: 'pertussis', name: 'Pertussis', group: 'standard', short: 'Keuchhusten' },
  { id: 'polio', name: 'Poliomyelitis', group: 'standard', short: 'Kinderlähmung' },
  { id: 'masern', name: 'Masern', group: 'standard' },
  { id: 'mumps', name: 'Mumps', group: 'standard' },
  { id: 'roeteln', name: 'Röteln', group: 'standard' },
  { id: 'varizellen', name: 'Varizellen', group: 'standard', short: 'Windpocken' },
  { id: 'hpv', name: 'HPV', group: 'standard', short: 'Humane Papillomviren' },
  { id: 'hepb', name: 'Hepatitis B', group: 'standard' },
  { id: 'hib', name: 'Hib', group: 'standard', short: 'Haemophilus influenzae Typ b' },
  { id: 'menc', name: 'Meningokokken C', group: 'standard' },
  { id: 'menb', name: 'Meningokokken B', group: 'standard' },
  { id: 'pneumo', name: 'Pneumokokken', group: 'standard' },
  { id: 'influenza', name: 'Influenza', group: 'standard', short: 'Grippe' },
  { id: 'covid', name: 'COVID-19', group: 'standard' },
  { id: 'zoster', name: 'Herpes zoster', group: 'standard', short: 'Gürtelrose' },
  { id: 'rsv', name: 'RSV', group: 'standard', short: 'Respiratorisches Synzytial-Virus' },
  { id: 'fsme', name: 'FSME', group: 'travel', short: 'Frühsommer-Meningoenzephalitis' },
  { id: 'hepa', name: 'Hepatitis A', group: 'travel' },
  { id: 'typhus', name: 'Typhus', group: 'travel' },
  { id: 'gelbfieber', name: 'Gelbfieber', group: 'travel' },
  { id: 'tollwut', name: 'Tollwut', group: 'travel' },
  { id: 'je', name: 'Japanische Enzephalitis', group: 'travel' },
  { id: 'menacwy', name: 'Meningokokken ACWY', group: 'travel' },
  { id: 'cholera', name: 'Cholera', group: 'travel' },
  { id: 'dengue', name: 'Dengue', group: 'other' },
  { id: 'chikungunya', name: 'Chikungunya', group: 'other' },
  { id: 'mpox', name: 'Mpox', group: 'other' },
];

export const DISEASE_BY_ID = Object.fromEntries(DISEASES.map((d) => [d.id, d]));

// Impfstoffe / Kombinationen. "examples" sind Handelsnamen zur Orientierung.
export const PRODUCTS = [
  { id: 'td', cat: 'Tetanus / Diphtherie / Keuchhusten / Polio', name: 'Td (Tetanus, Diphtherie)', examples: 'Td-pur, Td-Impfstoff Mérieux', diseases: ['tetanus', 'diphtherie'] },
  { id: 'tdap', cat: 'Tetanus / Diphtherie / Keuchhusten / Polio', name: 'Tdap (+ Keuchhusten)', examples: 'Boostrix, Covaxis', diseases: ['tetanus', 'diphtherie', 'pertussis'] },
  { id: 'tdap-ipv', cat: 'Tetanus / Diphtherie / Keuchhusten / Polio', name: 'Tdap-IPV (+ Keuchhusten + Polio)', examples: 'Boostrix Polio, Repevax', diseases: ['tetanus', 'diphtherie', 'pertussis', 'polio'] },
  { id: 'td-ipv', cat: 'Tetanus / Diphtherie / Keuchhusten / Polio', name: 'Td-IPV (+ Polio)', examples: 'Revaxis', diseases: ['tetanus', 'diphtherie', 'polio'] },
  { id: 't', cat: 'Tetanus / Diphtherie / Keuchhusten / Polio', name: 'Tetanus (einzeln)', examples: 'Tetanol pur', diseases: ['tetanus'] },
  { id: 'ipv', cat: 'Tetanus / Diphtherie / Keuchhusten / Polio', name: 'Polio (IPV, einzeln)', examples: 'IPV Mérieux', diseases: ['polio'] },
  { id: 'hexa', cat: 'Tetanus / Diphtherie / Keuchhusten / Polio', name: '6-fach (Säuglinge)', examples: 'Hexyon, Infanrix hexa, Vaxelis', diseases: ['tetanus', 'diphtherie', 'pertussis', 'polio', 'hib', 'hepb'] },
  { id: 'penta', cat: 'Tetanus / Diphtherie / Keuchhusten / Polio', name: '5-fach (Säuglinge)', examples: 'Infanrix-IPV+Hib, Pentavac', diseases: ['tetanus', 'diphtherie', 'pertussis', 'polio', 'hib'] },
  { id: 'dtap', cat: 'Tetanus / Diphtherie / Keuchhusten / Polio', name: 'DTaP (Kinder)', examples: 'Infanrix', diseases: ['tetanus', 'diphtherie', 'pertussis'] },

  { id: 'mmr', cat: 'Masern / Mumps / Röteln / Windpocken', name: 'MMR (Masern, Mumps, Röteln)', examples: 'M-M-RvaxPro, Priorix', diseases: ['masern', 'mumps', 'roeteln'] },
  { id: 'mmrv', cat: 'Masern / Mumps / Röteln / Windpocken', name: 'MMRV (+ Windpocken)', examples: 'Priorix-Tetra, ProQuad', diseases: ['masern', 'mumps', 'roeteln', 'varizellen'] },
  { id: 'masern-mono', cat: 'Masern / Mumps / Röteln / Windpocken', name: 'Masern (einzeln, historisch)', examples: '', diseases: ['masern'] },
  { id: 'var', cat: 'Masern / Mumps / Röteln / Windpocken', name: 'Varizellen (Windpocken)', examples: 'Varivax, Varilrix', diseases: ['varizellen'] },

  { id: 'hepa', cat: 'Hepatitis', name: 'Hepatitis A', examples: 'Havrix, Vaqta, Avaxim', diseases: ['hepa'] },
  { id: 'hepb', cat: 'Hepatitis', name: 'Hepatitis B', examples: 'Engerix-B, HBVaxPro', diseases: ['hepb'] },
  { id: 'heplisav', cat: 'Hepatitis', name: 'Hepatitis B (2-Dosen-Schema)', examples: 'Heplisav B', diseases: ['hepb'] },
  { id: 'twinrix', cat: 'Hepatitis', name: 'Hepatitis A + B', examples: 'Twinrix', diseases: ['hepa', 'hepb'] },
  { id: 'hepa-typhus', cat: 'Hepatitis', name: 'Hepatitis A + Typhus', examples: 'Viatim / Vivaxim', diseases: ['hepa', 'typhus'] },

  { id: 'hpv', cat: 'Weitere Standardimpfungen', name: 'HPV', examples: 'Gardasil 9, Cervarix', diseases: ['hpv'] },
  { id: 'menc', cat: 'Weitere Standardimpfungen', name: 'Meningokokken C', examples: 'NeisVac-C, Menjugate', diseases: ['menc'] },
  { id: 'menacwy', cat: 'Weitere Standardimpfungen', name: 'Meningokokken ACWY', examples: 'Nimenrix, Menveo, MenQuadfi', diseases: ['menacwy', 'menc'] },
  { id: 'menb', cat: 'Weitere Standardimpfungen', name: 'Meningokokken B', examples: 'Bexsero, Trumenba', diseases: ['menb'] },
  { id: 'hib', cat: 'Weitere Standardimpfungen', name: 'Hib (einzeln)', examples: 'Act-HIB', diseases: ['hib'] },
  { id: 'pcv20', cat: 'Weitere Standardimpfungen', name: 'Pneumokokken-Konjugat (PCV20/PCV21)', examples: 'Prevenar 20, Capvaxive', diseases: ['pneumo'] },
  { id: 'pcv-other', cat: 'Weitere Standardimpfungen', name: 'Pneumokokken-Konjugat (PCV13/15, älter)', examples: 'Prevenar 13, Vaxneuvance', diseases: ['pneumo'] },
  { id: 'ppsv23', cat: 'Weitere Standardimpfungen', name: 'Pneumokokken-Polysaccharid (PPSV23)', examples: 'Pneumovax 23', diseases: ['pneumo'] },
  { id: 'flu', cat: 'Weitere Standardimpfungen', name: 'Influenza (Grippe)', examples: 'Vaxigrip Tetra, Influvac, Efluelda, Fluad', diseases: ['influenza'] },
  { id: 'covid', cat: 'Weitere Standardimpfungen', name: 'COVID-19', examples: 'Comirnaty, Spikevax, Nuvaxovid', diseases: ['covid'] },
  { id: 'shingrix', cat: 'Weitere Standardimpfungen', name: 'Herpes zoster (Totimpfstoff)', examples: 'Shingrix', diseases: ['zoster'] },
  { id: 'rsv', cat: 'Weitere Standardimpfungen', name: 'RSV', examples: 'Arexvy, Abrysvo, mResvia', diseases: ['rsv'] },

  { id: 'fsme-immun', cat: 'Reiseimpfungen', name: 'FSME (FSME-Immun)', examples: 'FSME-Immun Erwachsene', diseases: ['fsme'] },
  { id: 'encepur', cat: 'Reiseimpfungen', name: 'FSME (Encepur)', examples: 'Encepur Erwachsene', diseases: ['fsme'] },
  { id: 'typhim', cat: 'Reiseimpfungen', name: 'Typhus (Spritze)', examples: 'Typhim Vi', diseases: ['typhus'] },
  { id: 'vivotif', cat: 'Reiseimpfungen', name: 'Typhus (Schluckimpfung)', examples: 'Vivotif', diseases: ['typhus'] },
  { id: 'yf', cat: 'Reiseimpfungen', name: 'Gelbfieber', examples: 'Stamaril', diseases: ['gelbfieber'] },
  { id: 'rabies', cat: 'Reiseimpfungen', name: 'Tollwut', examples: 'Rabipur, Verorab', diseases: ['tollwut'] },
  { id: 'je', cat: 'Reiseimpfungen', name: 'Japanische Enzephalitis', examples: 'Ixiaro', diseases: ['je'] },
  { id: 'cholera', cat: 'Reiseimpfungen', name: 'Cholera (Schluckimpfung)', examples: 'Dukoral', diseases: ['cholera'] },
  { id: 'dengue', cat: 'Reiseimpfungen', name: 'Dengue', examples: 'Qdenga', diseases: ['dengue'] },
  { id: 'chik', cat: 'Reiseimpfungen', name: 'Chikungunya', examples: 'Vimkunya, Ixchiq', diseases: ['chikungunya'] },
  { id: 'mpox', cat: 'Reiseimpfungen', name: 'Mpox', examples: 'Imvanex', diseases: ['mpox'] },

  { id: 'other', cat: 'Sonstiges', name: 'Anderer Impfstoff …', examples: '', diseases: [] },
];

export const PRODUCT_BY_ID = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

// Länder-Flags (Reiseimpfungen):
//  A  Hepatitis A empfohlen
//  T  Typhus empfohlen            t  Typhus je nach Reiseart (einfache Bedingungen / länger)
//  Y  Gelbfieber empfohlen        Y! Gelbfieber-Impfnachweis bei Einreise verlangt
//  P  Polio-Auffrischung (letzte Impfung > 10 Jahre)
//  M! Meningokokken ACWY Pflicht (Pilgerreise)   m  Meningokokken ACWY je nach Reiseart (Meningitisgürtel)
//  r  Tollwut je nach Reiseart    j  Japanische Enzephalitis je nach Reiseart
//  b  Hepatitis B je nach Reiseart f  FSME je nach Reiseart (Aufenthalt in der Natur)
export const REGIONS = ['Europa', 'Naher Osten & Nordafrika', 'Afrika (südlich der Sahara)', 'Asien', 'Nord- & Mittelamerika, Karibik', 'Südamerika', 'Ozeanien'];

const C = (code, name, region, flags = '') => ({ code, name, region, flags: flags.split(' ').filter(Boolean) });
const EU = REGIONS[0], ME = REGIONS[1], AF = REGIONS[2], AS = REGIONS[3], NA = REGIONS[4], SA = REGIONS[5], OC = REGIONS[6];

export const COUNTRIES = [
  // Europa
  C('DE', 'Deutschland', EU, 'f'), C('AT', 'Österreich', EU, 'f'), C('CH', 'Schweiz', EU, 'f'), C('LI', 'Liechtenstein', EU, 'f'),
  C('FR', 'Frankreich', EU, 'f'), C('IT', 'Italien', EU, 'f'), C('ES', 'Spanien', EU), C('PT', 'Portugal', EU),
  C('NL', 'Niederlande', EU), C('BE', 'Belgien', EU), C('LU', 'Luxemburg', EU), C('DK', 'Dänemark', EU, 'f'),
  C('NO', 'Norwegen', EU, 'f'), C('SE', 'Schweden', EU, 'f'), C('FI', 'Finnland', EU, 'f'), C('IS', 'Island', EU),
  C('IE', 'Irland', EU), C('GB', 'Vereinigtes Königreich', EU), C('PL', 'Polen', EU, 'f'), C('CZ', 'Tschechien', EU, 'f'),
  C('SK', 'Slowakei', EU, 'f'), C('HU', 'Ungarn', EU, 'f'), C('SI', 'Slowenien', EU, 'f'), C('HR', 'Kroatien', EU, 'f'),
  C('GR', 'Griechenland', EU), C('CY', 'Zypern', EU), C('MT', 'Malta', EU), C('EE', 'Estland', EU, 'f'),
  C('LV', 'Lettland', EU, 'f'), C('LT', 'Litauen', EU, 'f'), C('RO', 'Rumänien', EU, 'A f'), C('BG', 'Bulgarien', EU, 'A'),
  C('RS', 'Serbien', EU, 'A f'), C('BA', 'Bosnien und Herzegowina', EU, 'A f'), C('ME', 'Montenegro', EU, 'A'),
  C('MK', 'Nordmazedonien', EU, 'A'), C('AL', 'Albanien', EU, 'A'), C('XK', 'Kosovo', EU, 'A'), C('MD', 'Moldau', EU, 'A f'),
  C('UA', 'Ukraine', EU, 'A f r'), C('BY', 'Belarus', EU, 'A f r'), C('RU', 'Russland', EU, 'A f r b'),
  C('TR', 'Türkei', EU, 'A t r'), C('GE', 'Georgien', EU, 'A t r'), C('AM', 'Armenien', EU, 'A t r'), C('AZ', 'Aserbaidschan', EU, 'A t r'),
  // Naher Osten & Nordafrika
  C('EG', 'Ägypten', ME, 'A t r b'), C('MA', 'Marokko', ME, 'A t r b'), C('TN', 'Tunesien', ME, 'A t r'), C('DZ', 'Algerien', ME, 'A t r b'),
  C('LY', 'Libyen', ME, 'A t r b'), C('JO', 'Jordanien', ME, 'A t r'), C('IL', 'Israel', ME, 'A'), C('LB', 'Libanon', ME, 'A t r'),
  C('AE', 'Vereinigte Arabische Emirate', ME, 'A'), C('QA', 'Katar', ME, 'A'), C('BH', 'Bahrain', ME, 'A'), C('KW', 'Kuwait', ME, 'A'),
  C('OM', 'Oman', ME, 'A t r'), C('SA', 'Saudi-Arabien', ME, 'A t r b M!'), C('IR', 'Iran', ME, 'A t r b'), C('IQ', 'Irak', ME, 'A T r b'),
  C('YE', 'Jemen', ME, 'A T r b P'),
  // Afrika südlich der Sahara
  C('SN', 'Senegal', AF, 'A t r b Y m'), C('GM', 'Gambia', AF, 'A t r b Y m'), C('GN', 'Guinea', AF, 'A t r b Y m P'),
  C('GW', 'Guinea-Bissau', AF, 'A t r b Y! m'), C('SL', 'Sierra Leone', AF, 'A t r b Y!'), C('LR', 'Liberia', AF, 'A t r b Y!'),
  C('CI', 'Elfenbeinküste', AF, 'A t r b Y! m'), C('GH', 'Ghana', AF, 'A t r b Y! m'), C('TG', 'Togo', AF, 'A t r b Y! m'),
  C('BJ', 'Benin', AF, 'A t r b Y! m'), C('BF', 'Burkina Faso', AF, 'A t r b Y! m'), C('ML', 'Mali', AF, 'A t r b Y! m'),
  C('NE', 'Niger', AF, 'A t r b Y! m P'), C('NG', 'Nigeria', AF, 'A t r b Y m P'), C('MR', 'Mauretanien', AF, 'A t r b Y m'),
  C('CV', 'Kap Verde', AF, 'A t'), C('CM', 'Kamerun', AF, 'A t r b Y! m P'), C('TD', 'Tschad', AF, 'A t r b Y m P'),
  C('CF', 'Zentralafrikanische Republik', AF, 'A t r b Y! m P'), C('GA', 'Gabun', AF, 'A t r b Y!'), C('CG', 'Republik Kongo', AF, 'A t r b Y! P'),
  C('CD', 'DR Kongo', AF, 'A t r b Y! P'), C('GQ', 'Äquatorialguinea', AF, 'A t r b Y'), C('AO', 'Angola', AF, 'A t r b Y! P'),
  C('ET', 'Äthiopien', AF, 'A t r b Y m P'), C('ER', 'Eritrea', AF, 'A t r b m'), C('SD', 'Sudan', AF, 'A t r b Y m P'),
  C('SS', 'Südsudan', AF, 'A t r b Y! m'), C('KE', 'Kenia', AF, 'A t r b Y P'), C('UG', 'Uganda', AF, 'A t r b Y! m'),
  C('RW', 'Ruanda', AF, 'A t r b Y'), C('BI', 'Burundi', AF, 'A t r b Y!'), C('TZ', 'Tansania', AF, 'A t r b'),
  C('SO', 'Somalia', AF, 'A t r b P'), C('DJ', 'Dschibuti', AF, 'A t r b'), C('MG', 'Madagaskar', AF, 'A t r b P'),
  C('MZ', 'Mosambik', AF, 'A t r b P'), C('MW', 'Malawi', AF, 'A t r b P'), C('ZM', 'Sambia', AF, 'A t r b P'),
  C('ZW', 'Simbabwe', AF, 'A t r b P'), C('BW', 'Botswana', AF, 'A t r b'), C('NA', 'Namibia', AF, 'A t r b'),
  C('ZA', 'Südafrika', AF, 'A t r b'), C('LS', 'Lesotho', AF, 'A t r b'), C('SZ', 'Eswatini', AF, 'A t r b'),
  C('MU', 'Mauritius', AF, 'A t'), C('SC', 'Seychellen', AF, 'A t'), C('ST', 'São Tomé und Príncipe', AF, 'A t r b'),
  // Asien
  C('IN', 'Indien', AS, 'A T r j b'), C('NP', 'Nepal', AS, 'A T r j b'), C('LK', 'Sri Lanka', AS, 'A T r j b'),
  C('BD', 'Bangladesch', AS, 'A T r j b'), C('PK', 'Pakistan', AS, 'A T r b P'), C('AF', 'Afghanistan', AS, 'A T r b P'),
  C('BT', 'Bhutan', AS, 'A T r j b'), C('MV', 'Malediven', AS, 'A t'), C('MM', 'Myanmar', AS, 'A t r j b'),
  C('TH', 'Thailand', AS, 'A t r j b'), C('VN', 'Vietnam', AS, 'A t r j b'), C('KH', 'Kambodscha', AS, 'A t r j b'),
  C('LA', 'Laos', AS, 'A t r j b'), C('MY', 'Malaysia', AS, 'A t r j b'), C('SG', 'Singapur', AS, 'A'),
  C('ID', 'Indonesien', AS, 'A t r j b P'), C('PH', 'Philippinen', AS, 'A t r j b'), C('TL', 'Timor-Leste', AS, 'A t r j b'),
  C('CN', 'China', AS, 'A t r j b f'), C('HK', 'Hongkong', AS, 'A'), C('TW', 'Taiwan', AS, 'A j'), C('KR', 'Südkorea', AS, 'A j'),
  C('JP', 'Japan', AS, 'j f'), C('MN', 'Mongolei', AS, 'A t r b f'), C('KZ', 'Kasachstan', AS, 'A t r b f'),
  C('UZ', 'Usbekistan', AS, 'A t r b'), C('KG', 'Kirgisistan', AS, 'A t r b f'), C('TJ', 'Tadschikistan', AS, 'A t r b'),
  C('TM', 'Turkmenistan', AS, 'A t r b'),
  // Nord- & Mittelamerika, Karibik
  C('US', 'USA', NA), C('CA', 'Kanada', NA), C('MX', 'Mexiko', NA, 'A t r b'), C('GT', 'Guatemala', NA, 'A t r b'),
  C('BZ', 'Belize', NA, 'A t r'), C('HN', 'Honduras', NA, 'A t r'), C('SV', 'El Salvador', NA, 'A t r'), C('NI', 'Nicaragua', NA, 'A t r'),
  C('CR', 'Costa Rica', NA, 'A t r'), C('PA', 'Panama', NA, 'A t r Y'), C('CU', 'Kuba', NA, 'A t r'), C('DO', 'Dominikanische Republik', NA, 'A t r'),
  C('HT', 'Haiti', NA, 'A t r b'), C('JM', 'Jamaika', NA, 'A t'), C('BS', 'Bahamas', NA, 'A'), C('BB', 'Barbados', NA, 'A'),
  C('TT', 'Trinidad und Tobago', NA, 'A t Y'), C('PR', 'Puerto Rico', NA, 'A'),
  // Südamerika
  C('CO', 'Kolumbien', SA, 'A t r b Y'), C('VE', 'Venezuela', SA, 'A t r b Y'), C('EC', 'Ecuador', SA, 'A t r b Y'),
  C('PE', 'Peru', SA, 'A t r b Y'), C('BO', 'Bolivien', SA, 'A t r b Y'), C('BR', 'Brasilien', SA, 'A t r b Y'),
  C('AR', 'Argentinien', SA, 'A t r Y'), C('CL', 'Chile', SA, 'A t'), C('UY', 'Uruguay', SA, 'A'),
  C('PY', 'Paraguay', SA, 'A t r Y'), C('GY', 'Guyana', SA, 'A t r b Y'), C('SR', 'Suriname', SA, 'A t r b Y'),
  C('GF', 'Französisch-Guayana', SA, 'A t r b Y!'),
  // Ozeanien
  C('AU', 'Australien', OC), C('NZ', 'Neuseeland', OC), C('PG', 'Papua-Neuguinea', OC, 'A t r j b P'),
  C('FJ', 'Fidschi', OC, 'A t b'), C('PF', 'Französisch-Polynesien', OC, 'A'), C('WS', 'Samoa', OC, 'A t b'),
].sort((a, b) => a.name.localeCompare(b.name, 'de'));

export const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));

// Mindestvorlauf (Tage vor Abreise), um mit dem schnellsten zugelassenen Schema geschützt zu sein.
export const TRAVEL_LEAD_DAYS = {
  hepa: 14, hepb: 28, typhus: 14, gelbfieber: 10, tollwut: 14, je: 14, menacwy: 10,
  polio: 14, tetanus: 14, diphtherie: 14, pertussis: 14, masern: 14, fsme: 28, cholera: 21,
};
