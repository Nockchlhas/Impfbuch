// Lokale Datenhaltung (bleibt auf dem iPhone, keine Cloud).

const KEY = 'impfbuch.v1';

export function emptyState() {
  return {
    version: 1,
    profile: { name: '', birthdate: '', sex: '', chronic: false, healthcare: false, fsmeArea: false },
    settings: { leadDays: 30, notify: false, lastNotified: '', icsExportedAt: '', icsHash: '' },
    vaccinations: [],
    overrides: {},
    trips: [],
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    return migrate(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

export function migrate(data) {
  const base = emptyState();
  return {
    ...base,
    ...data,
    profile: { ...base.profile, ...(data.profile || {}) },
    settings: { ...base.settings, ...(data.settings || {}) },
    vaccinations: Array.isArray(data.vaccinations) ? data.vaccinations : [],
    overrides: data.overrides && typeof data.overrides === 'object' ? data.overrides : {},
    trips: Array.isArray(data.trips) ? data.trips : [],
  };
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function requestPersistence() {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch { /* ignore */ }
  return false;
}
