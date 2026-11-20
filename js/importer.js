// Import von Impfungen aus einem Import-Code (z. B. von Claude aus Fotos des Impfpasses erstellt).
// Bewusst tolerant: Datum als ISO oder TT.MM.JJJJ, Impfstoff über Namen oder productId.
//
// Beispiel:
// {"impfbuch":"import","vaccinations":[{"date":"05.12.2016","name":"Boostrix Polio","batch":"AC52B123","doctor":"Dr. Meier"}]}

import { PRODUCT_BY_ID, DISEASE_BY_ID } from './data.js';
import { detectProduct, suggestVaccines } from './search.js';
import { parseDateInput } from './dates.js';

export function parseImport(text, existing = [], today) {
  let data;
  const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try {
    data = JSON.parse(cleaned);
  } catch {
    return { items: [], error: 'Der Code konnte nicht gelesen werden. Bitte den kompletten Import-Code kopieren.' };
  }
  const list = Array.isArray(data) ? data : data?.vaccinations;
  if (!Array.isArray(list) || !list.length) return { items: [], error: 'Im Code sind keine Impfungen enthalten.' };

  const items = list.map((raw, i) => {
    const issues = [];
    const date = parseDateInput(raw.date, today);
    if (!date) issues.push('Datum fehlt oder ist unlesbar');
    else if (today && date > today) issues.push('Datum liegt in der Zukunft');

    let productId = PRODUCT_BY_ID[raw.productId] ? raw.productId : null;
    const name = String(raw.name || raw.productName || '').trim();
    if (!productId && name) productId = detectProduct(name)?.productId || suggestVaccines(name, 1)[0]?.productId || null;
    if (!productId && Array.isArray(raw.diseases) && raw.diseases.length) productId = 'other';
    if (!productId) issues.push('Impfstoff nicht erkannt');

    let diseases = Array.isArray(raw.diseases) ? raw.diseases.filter((d) => DISEASE_BY_ID[d]) : [];
    if (!diseases.length && productId) diseases = [...(PRODUCT_BY_ID[productId]?.diseases || [])];
    if (!diseases.length) issues.push('Unklar, wogegen geimpft wurde');

    const dup = date && existing.find((v) => v.date === date && v.diseases?.some((d) => diseases.includes(d)));
    return {
      key: i,
      date,
      productId,
      productName: name,
      diseases,
      batch: String(raw.batch || '').trim(),
      doctor: String(raw.doctor || '').trim(),
      note: String(raw.note || '').trim(),
      duplicate: !!dup,
      issues,
      ok: !issues.length,
    };
  });
  return { items, error: null };
}
