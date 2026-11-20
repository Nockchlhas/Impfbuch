import { DISEASES, DISEASE_BY_ID, PRODUCTS, PRODUCT_BY_ID, COUNTRIES, COUNTRY_BY_CODE, REGIONS, DATA_STAND } from './data.js';
import { STATUS, LEVEL_LABEL, makeContext, evaluateAll, evaluateTrip, buildReminders, summarize, isRelevant } from './rules.js';
import { addDays, de, deLong, diffDays, relative, todayISO, ageAt, parseDateInput, formatDateTyping } from './dates.js';
import { buildICS } from './ics.js';
import { suggestVaccines, detectProduct } from './search.js';
import { parseImport } from './importer.js';
import { load, save, uid, migrate, emptyState, requestPersistence } from './store.js';

let state = load();
let today = todayISO();
const view = document.getElementById('view');

// ------------------------------------------------------------ Helfer

const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const flag = (code) => (code.length === 2 ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '');
const chev = '<svg class="chev" viewBox="0 0 8 14" aria-hidden="true"><path d="m1 1 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ICON = {
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20.5c1.2-3.8 4.2-5.5 8-5.5s6.8 1.7 8 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v7.5h14V12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  plane: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15.5v-1.7l-7.5-4.6V4.3a1.5 1.5 0 0 0-3 0v4.9L3 13.8v1.7l7.5-2.3v4.9l-2 1.5V21l3.5-1 3.5 1v-1.4l-2-1.5v-4.9z" fill="currentColor"/></svg>',
};

function ctx(at = today) { return makeContext(state, at); }

function persist() {
  if (!save(state)) toast('Speichern fehlgeschlagen – Speicher voll?');
  updateBadge();
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}

function pill(statusKey, label) {
  const s = STATUS[statusKey];
  return `<span class="pill tone-${s.tone}">${h(label || s.label)}</span>`;
}

function dateBadge(iso, tone = '') {
  const [y, m, d] = iso.split('-').map(Number);
  return `<div class="date-badge ${tone}"><div class="m">${MONTHS_SHORT[m - 1]}</div><div class="d">${d}</div><div class="y">${y}</div></div>`;
}

function remindersHash() {
  const r = buildReminders(state, today);
  return r.map((x) => `${x.uid}:${x.date}`).join('|') + `#${state.settings.leadDays}`;
}

function icsOutdated() {
  return !!state.settings.icsExportedAt && state.settings.icsHash !== remindersHash();
}

// ------------------------------------------------------------ Router

const TABS = { status: renderStatus, pass: renderPass, reisen: renderTrips, mehr: renderSettings };

function currentTab() {
  const t = location.hash.replace('#', '');
  return TABS[t] ? t : 'status';
}

function render() {
  today = todayISO();
  const tab = currentTab();
  document.querySelectorAll('.tabbar a').forEach((a) => {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  view.innerHTML = TABS[tab]();
  bindView();
}

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

// Event-Delegation für die Hauptansicht
function bindView() {
  view.querySelectorAll('[data-action]').forEach((el) => el.addEventListener('click', onAction));
}

function onAction(e) {
  const el = e.currentTarget;
  const { action, id } = el.dataset;
  switch (action) {
    case 'disease': return openDisease(id);
    case 'add-vacc': return openVaccForm(null, id ? { diseases: id.split(',') } : {});
    case 'edit-vacc': return openVaccForm(id);
    case 'add-trip': return openTripForm(null);
    case 'trip': return openTrip(id);
    case 'profile': return openProfile();
    case 'export-ics': return exportICS();
    case 'enable-notify': return enableNotifications();
    case 'goto': location.hash = id; return;
    case 'backup': return exportBackup();
    case 'import': return document.getElementById('import-file').click();
    case 'import-code': return openImport();
    case 'reset': return resetAll();
    case 'install-help': return openInstallHelp();
    default:
  }
}

// ------------------------------------------------------------ Übersicht

function renderStatus() {
  const p = state.profile;
  const res = evaluateAll(ctx());
  const sum = summarize(res);
  const age = p.birthdate ? ageAt(p.birthdate, today) : null;
  const all = Object.values(res);
  const sorter = (a, b) => STATUS[a.status].rank - STATUS[b.status].rank || DISEASES.indexOf(a.disease) - DISEASES.indexOf(b.disease);

  const relevant = all.filter((r) => isRelevant(r) && !r.hidden).sort(sorter);
  const travel = all.filter((r) => !isRelevant(r) && !r.hidden && r.relevance === 'travel' && (r.doses.length || r.status === 'immune')).sort(sorter);
  const rest = all.filter((r) => !relevant.includes(r) && !travel.includes(r));
  const reminders = buildReminders(state, today).slice(0, 4);

  const greet = p.name ? `Hallo ${h(p.name)}` : 'Dein Impfstatus';
  let out = `<header class="head"><div><h1>Impfstatus</h1><p class="sub">${greet}${age !== null ? ` · ${age} Jahre` : ''} · nach STIKO</p></div>
    <button class="icon-btn" data-action="add-vacc" aria-label="Impfung eintragen">${ICON.plus}</button></header>`;

  if (!p.birthdate) {
    out += `<div class="card"><div class="banner"><div class="ico">${ICON.user}</div><div><div class="t">Profil anlegen</div>
      <p>Mit deinem Geburtsdatum kann die App prüfen, welche Impfungen die STIKO für dein Alter empfiehlt.</p>
      <div class="actions"><button class="btn small" data-action="profile">Profil anlegen</button></div></div></div></div>`;
  }

  out += `<div class="card summary" style="margin-top:12px">
    <div class="tone-red"><b>${sum.overdue}</b><span>Fällig / fehlt</span></div>
    <div class="tone-orange"><b>${sum.attention}</b><span>Bald / offen</span></div>
    <div class="tone-green"><b>${sum.ok}</b><span>Aktuell</span></div></div>`;

  if (!state.settings.icsExportedAt && state.vaccinations.length) {
    out += `<div class="card" style="margin-top:12px"><div class="banner tone-blue"><div class="ico">${ICON.bell}</div><div>
      <div class="t">Erinnerungen einrichten</div><p>Übernimm die Fälligkeiten in den iPhone-Kalender – dann meldet sich dein iPhone ${state.settings.leadDays} Tage vorher.</p>
      <div class="actions"><button class="btn small" data-action="export-ics">In Kalender übernehmen</button></div></div></div></div>`;
  } else if (icsOutdated()) {
    out += `<div class="card" style="margin-top:12px"><div class="banner tone-orange"><div class="ico">${ICON.cal}</div><div>
      <div class="t">Kalender aktualisieren</div><p>Seit dem letzten Export haben sich Fälligkeiten geändert.</p>
      <div class="actions"><button class="btn small" data-action="export-ics">Erneut übernehmen</button></div></div></div></div>`;
  }

  if (reminders.length) {
    out += `<h2 class="section-title">Als Nächstes</h2><div class="card list">`;
    for (const r of reminders) {
      const tone = r.date < today || r.overdue ? 'tone-red' : diffDays(today, r.date) <= state.settings.leadDays ? 'tone-orange' : '';
      const target = r.kind === 'trip' ? `data-action="trip" data-id="${h(r.uid.slice(6))}"` : `data-action="disease" data-id="${h(r.ids[0])}"`;
      out += `<button class="row" ${target}>${dateBadge(r.date <= today ? today : r.date, tone)}<div class="main"><div class="title">${h(r.title)}</div>
        <div class="meta">${h(r.diseases.join(', '))}${r.kind === 'trip' && r.deadline ? ` · impfen bis ${de(r.deadline)}` : ''}</div></div>
        <div class="end">${r.overdue || r.date < today ? 'fällig' : h(relative(today, r.date))}</div></button>`;
    }
    out += `</div>`;
  }

  out += `<h2 class="section-title">Empfohlen für dich</h2>`;
  out += relevant.length ? `<div class="card list">${relevant.map(diseaseRow).join('')}</div>`
    : `<div class="card pad" style="color:var(--muted)">Lege dein Profil an, um Empfehlungen zu sehen.</div>`;
  out += `<p class="section-foot">Grundlage: STIKO-Standard- und Indikationsimpfungen für dein Alter und deine Angaben im Profil.</p>`;

  if (travel.length) {
    out += `<h2 class="section-title">Reiseimpfungen</h2><div class="card list">${travel.map(diseaseRow).join('')}</div>`;
  }
  out += `<div class="card" style="margin-top:12px"><button class="row" data-action="goto" data-id="reisen"><div class="dot tone-blue"></div><div class="main"><div class="title">Reise planen</div><div class="meta">Welche Impfungen brauchst du für dein Reiseziel?</div></div>${chev}</button></div>`;

  out += `<details class="more"><summary class="section-title" style="display:flex;justify-content:space-between;align-items:center"><span>Weitere Impfungen (${rest.length})</span>${chev}</summary>
    <div class="card list">${rest.sort(sorter).map(diseaseRow).join('')}</div></details>`;
  out += `<p class="small-print">Diese App ersetzt keine ärztliche Beratung. Die Auswertung ist eine vereinfachte Darstellung der STIKO-Empfehlungen (${DATA_STAND}).</p>`;
  return out;
}

function diseaseRow(r) {
  const s = STATUS[r.status];
  const sub = r.disease.short ? ` <span style="color:var(--muted);font-weight:400">· ${h(r.disease.short)}</span>` : '';
  return `<button class="row" data-action="disease" data-id="${r.id}"><span class="dot tone-${s.tone}"></span>
    <div class="main"><div class="title">${h(r.disease.name)}${sub}</div><div class="meta">${h(r.headline)}</div></div>
    ${r.hidden ? '<span class="pill tone-gray">ausgeblendet</span>' : pill(r.status)}${chev}</button>`;
}

// ------------------------------------------------------------ Impfpass

function renderPass() {
  const list = state.vaccinations.slice().sort((a, b) => b.date.localeCompare(a.date));
  let out = `<header class="head"><div><h1>Impfpass</h1><p class="sub">${list.length} Impfung${list.length === 1 ? '' : 'en'} eingetragen</p></div>
    <button class="icon-btn" data-action="add-vacc" aria-label="Impfung eintragen">${ICON.plus}</button></header>`;
  const scanRow = `<div class="card" style="margin-top:18px"><button class="row" data-action="import-code"><span style="font-size:22px">📷</span>
    <div class="main"><div class="title">Weitere Seiten scannen lassen</div><div class="meta">Fotos an Claude schicken, Import-Code hier einfügen</div></div>${chev}</button></div>`;
  if (!list.length) {
    return out + `<div class="card"><div class="empty"><div class="big">💉</div><h3>Noch keine Impfungen</h3>
      <p>Nimm deinen gelben Impfausweis zur Hand und trage deine Impfungen ein – am besten die neuesten zuerst.</p>
      <div class="btn-stack" style="max-width:320px;margin:0 auto"><button class="btn" data-action="import-code">📷 Impfpass scannen lassen</button>
      <button class="btn secondary" data-action="add-vacc">Selbst eintragen</button></div></div></div>`;
  }
  let year = null;
  for (const v of list) {
    const y = v.date.slice(0, 4);
    if (y !== year) {
      if (year !== null) out += `</div>`;
      out += `<h2 class="section-title">${y}</h2><div class="card list">`;
      year = y;
    }
    const prod = PRODUCT_BY_ID[v.productId];
    const name = v.productName || prod?.name || 'Impfung';
    const meta = [prod && v.productName ? prod.name : '', v.batch ? `Ch.-B. ${v.batch}` : '', v.doctor].filter(Boolean).join(' · ');
    out += `<button class="row" data-action="edit-vacc" data-id="${h(v.id)}">${dateBadge(v.date)}<div class="main">
      <div class="title">${h(name)}</div>${meta ? `<div class="meta">${h(meta)}</div>` : ''}
      <div class="chips" style="margin-top:6px">${(v.diseases || []).map((d) => `<span class="chip">${h(DISEASE_BY_ID[d]?.name || d)}</span>`).join('')}</div>
      </div>${chev}</button>`;
  }
  out += `</div>${scanRow}`;
  return out;
}

// ------------------------------------------------------------ Reisen

function renderTrips() {
  const trips = state.trips.slice().sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  const upcoming = trips.filter((t) => !t.end || t.end >= today);
  const past = trips.filter((t) => t.end && t.end < today).reverse();
  let out = `<header class="head"><div><h1>Reisen</h1><p class="sub">Reiseimpfungen nach STIKO/DTG</p></div>
    <button class="icon-btn" data-action="add-trip" aria-label="Reise hinzufügen">${ICON.plus}</button></header>`;
  if (!trips.length) {
    return out + `<div class="card"><div class="empty"><div class="big">🌍</div><h3>Wohin geht's?</h3>
      <p>Wähle ein oder mehrere Reiseländer und deinen Reisezeitraum. Die App prüft, welche Impfungen du brauchst und ob sie bis zur Rückkehr gültig sind.</p>
      <button class="btn" data-action="add-trip">Reise planen</button></div></div>`;
  }
  const card = (t) => {
    const ev = evaluateTrip(t, ctx());
    const status = ev.open ? pill('incomplete', `${ev.open} offen`) : pill('ok', 'Bereit');
    const when = t.start ? `${de(t.start)}${t.end && t.end !== t.start ? ` – ${de(t.end)}` : ''}` : 'ohne Datum';
    const countdown = t.start && t.start >= today ? ` · ${relative(today, t.start)}` : '';
    return `<button class="row" data-action="trip" data-id="${h(t.id)}"><div class="main">
      <div class="flags">${t.countries.map(flag).join('')}</div>
      <div class="title">${h(t.name || t.countries.map((c) => COUNTRY_BY_CODE[c]?.name).join(', '))}</div>
      <div class="meta">${when}${countdown}</div></div>${status}${chev}</button>`;
  };
  if (upcoming.length) out += `<h2 class="section-title">Geplant</h2><div class="card list">${upcoming.map(card).join('')}</div>`;
  if (past.length) out += `<h2 class="section-title">Vergangen</h2><div class="card list" style="opacity:.75">${past.map(card).join('')}</div>`;
  out += `<p class="small-print">Reiseempfehlungen sind eine vereinfachte Übersicht. Lass dich 6–8 Wochen vor Abreise reisemedizinisch beraten und prüfe die Einreisebestimmungen beim Auswärtigen Amt.</p>`;
  return out;
}

// ------------------------------------------------------------ Einstellungen

function renderSettings() {
  const p = state.profile, s = state.settings;
  const notifSupported = 'Notification' in window;
  const notifState = notifSupported ? Notification.permission : 'unsupported';
  const leadOpts = [7, 14, 30, 60, 90].map((d) => `<option value="${d}" ${Number(s.leadDays) === d ? 'selected' : ''}>${d} Tage vorher</option>`).join('');
  let out = `<header class="head"><div><h1>Einstellungen</h1></div></header>`;

  out += `<h2 class="section-title">Profil</h2><div class="card list">
    <button class="row" data-action="profile"><div class="dot tone-blue"></div><div class="main"><div class="title">${h(p.name || 'Profil')}</div>
    <div class="meta">${p.birthdate ? `geboren ${de(p.birthdate)}` : 'Geburtsdatum fehlt'}${[p.chronic && 'Grunderkrankung', p.healthcare && 'Gesundheitswesen', p.fsmeArea && 'FSME-Gebiet'].filter(Boolean).map((x) => ` · ${x}`).join('')}</div></div>${chev}</button></div>`;

  out += `<h2 class="section-title">Erinnerungen</h2><div class="card list">
    <div class="field"><label for="lead">Vorlauf</label><select id="lead">${leadOpts}</select></div>
    <button class="row" data-action="export-ics"><div class="dot tone-green"></div><div class="main"><div class="title">In iPhone-Kalender übernehmen</div>
      <div class="meta">${s.icsExportedAt ? `Zuletzt am ${de(s.icsExportedAt)}${icsOutdated() ? ' – Aktualisierung empfohlen' : ''}` : 'Noch nicht eingerichtet'}</div></div>${chev}</button>
    <button class="row" data-action="enable-notify"><div class="dot tone-${notifState === 'granted' ? 'green' : 'gray'}"></div><div class="main"><div class="title">Mitteilungen der App</div>
      <div class="meta">${notifState === 'granted' ? 'Aktiv – Hinweis & App-Symbol-Zähler beim Öffnen' : notifState === 'denied' ? 'In iOS-Einstellungen blockiert' : isStandalone() ? 'Tippen zum Aktivieren' : 'Erst nach „Zum Home-Bildschirm“ verfügbar'}</div></div>${chev}</button>
  </div>
  <p class="section-foot">Die Kalender-Erinnerungen funktionieren auch, wenn die App geschlossen ist: Du bekommst ${s.leadDays} Tage vorher und am Fälligkeitstag eine Mitteilung. Tipp: Wähle beim Hinzufügen einen eigenen Kalender „Impfbuch“. Nach Änderungen kannst du ihn in der Kalender-App löschen und neu übernehmen – so entstehen keine doppelten Termine.</p>`;

  out += `<h2 class="section-title">Daten</h2><div class="card list">
    <button class="row" data-action="backup"><div class="dot tone-blue"></div><div class="main"><div class="title">Backup sichern</div><div class="meta">Als Datei, z. B. in iCloud Drive</div></div>${chev}</button>
    <button class="row" data-action="import-code"><div class="dot tone-green"></div><div class="main"><div class="title">Impfungen importieren</div><div class="meta">Import-Code aus eingescannten Impfpass-Fotos</div></div>${chev}</button>
    <button class="row" data-action="import"><div class="dot tone-blue"></div><div class="main"><div class="title">Backup wiederherstellen</div><div class="meta">Ersetzt alle aktuellen Daten</div></div>${chev}</button>
    <button class="row" data-action="reset"><div class="dot tone-red"></div><div class="main"><div class="title" style="color:var(--red)">Alle Daten löschen</div></div></button>
  </div><input type="file" id="import-file" accept="application/json,.json" hidden>
  <p class="section-foot">Deine Daten bleiben ausschließlich auf diesem iPhone. Sichere regelmäßig ein Backup.</p>`;

  out += `<h2 class="section-title">App</h2><div class="card list">
    ${isStandalone() ? '' : `<button class="row" data-action="install-help"><div class="dot tone-green"></div><div class="main"><div class="title">Zum Home-Bildschirm hinzufügen</div><div class="meta">So wird das Impfbuch zur App</div></div>${chev}</button>`}
    <a class="row" href="https://www.rki.de/stiko" target="_blank" rel="noopener"><div class="dot"></div><div class="main"><div class="title">STIKO-Empfehlungen (RKI)</div></div>${chev}</a>
    <a class="row" href="https://www.auswaertiges-amt.de/de/ReiseUndSicherheit" target="_blank" rel="noopener"><div class="dot"></div><div class="main"><div class="title">Reise- und Sicherheitshinweise</div><div class="meta">Auswärtiges Amt – Einreisebestimmungen</div></div>${chev}</a>
    <a class="row" href="https://www.dtg.org" target="_blank" rel="noopener"><div class="dot"></div><div class="main"><div class="title">Reisemedizin (DTG)</div></div>${chev}</a>
  </div>
  <p class="small-print">Impfbuch ersetzt weder den offiziellen Impfausweis noch eine ärztliche Beratung. Hinterlegt ist eine vereinfachte Auswertung der STIKO-Standard-, Indikations- und Reiseimpfempfehlungen (${DATA_STAND}). Empfehlungen ändern sich – prüfe Details mit deiner Ärztin bzw. deinem Arzt.</p>`;
  setTimeout(() => {
    document.getElementById('lead')?.addEventListener('change', (e) => { state.settings.leadDays = Number(e.target.value); persist(); render(); toast('Vorlauf gespeichert – Kalender bitte erneut übernehmen'); });
    document.getElementById('import-file')?.addEventListener('change', importBackup);
  });
  return out;
}

// ------------------------------------------------------------ Sheets

const sheetsRoot = document.getElementById('sheets');
const stack = [];

function openSheet({ title, left = 'Schließen', right = null, body, onRight, onMount, onClose }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  const el = document.createElement('section');
  el.className = 'sheet';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', title);
  el.innerHTML = `<div class="sheet-bar"><div class="l"><button data-sheet="close">${h(left)}</button></div><h2>${h(title)}</h2>
    <div class="r">${right ? `<button class="strong" data-sheet="right">${h(right)}</button>` : ''}</div></div><div class="sheet-body">${body}</div>`;
  sheetsRoot.append(backdrop, el);
  document.body.classList.add('locked');
  const entry = { el, backdrop, onClose };
  stack.push(entry);
  requestAnimationFrame(() => { backdrop.classList.add('open'); el.classList.add('open'); });
  backdrop.addEventListener('click', () => closeSheet(entry));
  el.querySelector('[data-sheet="close"]').addEventListener('click', () => closeSheet(entry));
  if (right) el.querySelector('[data-sheet="right"]').addEventListener('click', () => onRight?.(el, entry));
  // Wischen nach unten an der Leiste schließt
  let y0 = null;
  const bar = el.querySelector('.sheet-bar');
  bar.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
  bar.addEventListener('touchmove', (e) => { if (y0 !== null) { const dy = Math.max(0, e.touches[0].clientY - y0); el.style.transform = `translateY(${dy}px)`; } }, { passive: true });
  bar.addEventListener('touchend', (e) => {
    const dy = (e.changedTouches[0].clientY - (y0 ?? 0));
    el.style.transform = '';
    y0 = null;
    if (dy > 90) closeSheet(entry);
  });
  bindDateInputs(el);
  onMount?.(el, entry);
  return entry;
}

function closeSheet(entry = stack[stack.length - 1]) {
  if (!entry) return;
  const i = stack.indexOf(entry);
  if (i >= 0) stack.splice(i, 1);
  entry.el.classList.remove('open');
  entry.backdrop.classList.remove('open');
  setTimeout(() => { entry.el.remove(); entry.backdrop.remove(); }, 320);
  if (!stack.length) document.body.classList.remove('locked');
  entry.onClose?.();
}

function closeAllSheets() { [...stack].reverse().forEach((e) => closeSheet(e)); }

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

// ------------------------------------------------------------ Krankheit / Detail

function openDisease(id) {
  const res = evaluateAll(ctx());
  const r = res[id];
  if (!r) return;
  const d = r.disease;
  const ov = state.overrides[id] || {};
  let body = `<div class="detail-hero"><h3>${h(d.name)}</h3>${d.short ? `<div class="short">${h(d.short)}</div>` : ''}
    ${pill(r.status)}<div class="headline">${h(r.headline)}</div></div>`;

  const kv = [];
  if (r.doses.length) kv.push(['Letzte Impfung', de(r.doses[r.doses.length - 1].date)]);
  if (r.validUntil && r.status !== 'immune') kv.push(['Gültig bis', de(r.validUntil)]);
  if (r.nextDue && r.status !== 'immune') kv.push([r.nextLabel || 'Nächste Impfung', r.nextDue <= today ? 'jetzt' : `${de(r.nextDue)} (${relative(today, r.nextDue)})`]);
  if (kv.length) body += `<div class="card list" style="margin-top:16px">${kv.map(([k, v]) => `<div class="kv"><span>${h(k)}</span><span>${h(v)}</span></div>`).join('')}</div>`;

  if (r.hints.length) body += `<div class="card" style="margin-top:12px">${r.hints.map((x) => `<div class="hint-box">${h(x)}</div>`).join('')}</div>`;

  body += `<h2 class="section-title">Empfehlung</h2><div class="card"><div class="prose"><p>${h(r.detail)}</p></div></div>`;

  body += `<h2 class="section-title">Eingetragene Impfungen (${r.doses.length})</h2><div class="card list">`;
  body += r.doses.length ? r.doses.slice().reverse().map((v) => {
    const prod = PRODUCT_BY_ID[v.productId];
    return `<button class="row" data-edit="${h(v.id)}">${dateBadge(v.date)}<div class="main"><div class="title">${h(v.productName || prod?.name || 'Impfung')}</div>
      <div class="meta">${h([v.batch && `Ch.-B. ${v.batch}`, v.doctor].filter(Boolean).join(' · ') || prod?.name || '')}</div></div>${chev}</button>`;
  }).join('') : `<div class="prose muted"><p>Noch keine Impfung eingetragen.</p></div>`;
  body += `</div>`;

  body += `<div class="btn-stack"><button class="btn block" data-add>Impfung eintragen</button></div>`;

  body += `<h2 class="section-title">Optionen</h2><div class="card list">
    <label class="toggle-row"><div class="main"><div>Ich bin immun</div><div class="meta">z. B. Erkrankung durchgemacht oder Antikörper nachgewiesen</div></div>
      <span class="switch"><input type="checkbox" data-ov="immune" ${ov.immune ? 'checked' : ''}><span></span></span></label>
    <label class="toggle-row"><div class="main"><div>In der Übersicht ausblenden</div><div class="meta">Keine Erinnerungen für diese Impfung</div></div>
      <span class="switch"><input type="checkbox" data-ov="hidden" ${ov.hidden ? 'checked' : ''}><span></span></span></label></div>`;

  openSheet({
    title: d.name,
    left: 'Fertig',
    body,
    onMount(el, entry) {
      el.querySelector('[data-add]').addEventListener('click', () => openVaccForm(null, { productId: suggestProduct(id), diseases: PRODUCT_BY_ID[suggestProduct(id)]?.diseases || [id] }, () => { closeSheet(entry); openDisease(id); }));
      el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openVaccForm(b.dataset.edit, {}, () => { closeSheet(entry); openDisease(id); })));
      el.querySelectorAll('[data-ov]').forEach((inp) => inp.addEventListener('change', () => {
        const o = { ...(state.overrides[id] || {}), [inp.dataset.ov]: inp.checked };
        if (!o.immune && !o.hidden) delete state.overrides[id]; else state.overrides[id] = o;
        persist();
        render();
        const hero = evaluateAll(ctx())[id];
        el.querySelector('.detail-hero .pill').outerHTML = pill(hero.status);
        el.querySelector('.detail-hero .headline').textContent = hero.headline;
      }));
    },
  });
}

function suggestProduct(diseaseId) {
  const pref = { tetanus: 'tdap', diphtherie: 'tdap', pertussis: 'tdap', polio: 'ipv', masern: 'mmr', mumps: 'mmr', roeteln: 'mmr', fsme: 'fsme-immun', typhus: 'typhim', pneumo: 'pcv20', influenza: 'flu', zoster: 'shingrix', gelbfieber: 'yf', tollwut: 'rabies', chikungunya: 'chik', varizellen: 'var' };
  return pref[diseaseId] || PRODUCTS.find((p) => p.diseases.length && p.diseases[0] === diseaseId)?.id || PRODUCTS.find((p) => p.diseases.includes(diseaseId))?.id || 'other';
}

// ------------------------------------------------------------ Impfung erfassen

function productOptions(selected) {
  const cats = [...new Set(PRODUCTS.map((p) => p.cat))];
  return `<option value="" ${!selected ? 'selected' : ''} disabled>Bitte wählen …</option>` + cats.map((c) => `<optgroup label="${h(c)}">${PRODUCTS.filter((p) => p.cat === c)
    .map((p) => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${h(p.name)}</option>`).join('')}</optgroup>`).join('');
}

// ------------------------------------------------------------ Datumsfelder
// Eintippen statt Kalender: Zifferntastatur, automatische Punkte, Kalender optional über das Symbol.

function dateInput(id, iso, max) {
  return `<span class="date-wrap"><input id="${id}" class="date-text" data-date value="${iso ? de(iso) : ''}" inputmode="decimal"
      placeholder="TT.MM.JJJJ" autocomplete="off" autocorrect="off" spellcheck="false" maxlength="10" enterkeyhint="done">
    <span class="date-cal" title="Kalender">${ICON.cal}<input type="date" tabindex="-1" aria-label="Im Kalender wählen" value="${h(iso || '')}" ${max ? `max="${max}"` : ''}></span></span>`;
}

function bindDateInputs(root) {
  root.querySelectorAll('input[data-date]').forEach((inp) => {
    const nat = inp.parentElement.querySelector('input[type="date"]');
    // Vorhandenes Datum markieren, damit neues Tippen es ersetzt (leeres Feld: nichts tun)
    inp.addEventListener('focus', () => { if (inp.value) inp.setSelectionRange(0, inp.value.length); });
    inp.addEventListener('mouseup', (e) => { if (inp.value && inp.selectionStart === inp.selectionEnd && inp.dataset.fresh !== '0') { e.preventDefault(); inp.setSelectionRange(0, inp.value.length); } inp.dataset.fresh = '0'; });
    inp.addEventListener('blur', () => { inp.dataset.fresh = '1'; });
    inp.addEventListener('input', (e) => {
      const deleting = (e.inputType || '').startsWith('delete');
      const v = formatDateTyping(inp.value, deleting);
      if (v !== inp.value) inp.value = v;
      inp.classList.remove('invalid');
    });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
    inp.addEventListener('blur', () => {
      if (!inp.value.trim()) return;
      const iso = parseDateInput(inp.value, today);
      if (iso) { inp.value = de(iso); if (nat) nat.value = iso; }
      inp.classList.toggle('invalid', !iso);
    });
    nat?.addEventListener('change', () => { if (nat.value) { inp.value = de(nat.value); inp.classList.remove('invalid'); } });
  });
}

// '' = leer, null = ungültig, sonst ISO-Datum
function readDate(root, id) {
  const raw = root.querySelector(`#${id}`).value.trim();
  if (!raw) return '';
  return parseDateInput(raw, today);
}

function productHint(p) {
  return h(`${p.name}${p.examples ? ` (z. B. ${p.examples})` : ''}`);
}

function openVaccForm(editId, preset = {}, afterSave) {
  const existing = editId ? state.vaccinations.find((v) => v.id === editId) : null;
  const v = existing ? { ...existing } : { date: today, productId: preset.productId || '', productName: '', diseases: preset.diseases || [], batch: '', doctor: '', note: '' };
  if (!existing && !preset.productId && preset.diseases?.length === 1) v.productId = suggestProduct(preset.diseases[0]);
  if (!existing && v.productId && !preset.diseases) v.diseases = PRODUCT_BY_ID[v.productId]?.diseases || [];
  const prod = PRODUCT_BY_ID[v.productId];

  const diseaseChecks = DISEASES.map((d) => `<label><input type="checkbox" value="${d.id}" ${v.diseases.includes(d.id) ? 'checked' : ''}><span>${h(d.name)}</span></label>`).join('');
  const body = `
    <h2 class="section-title">Impfung</h2>
    <div class="card list">
      <div class="field"><label for="f-date">Datum</label>${dateInput('f-date', v.date, today)}</div>
      <div class="field stack"><label for="f-name">Name des Impfstoffs</label>
        <input id="f-name" value="${h(v.productName)}" placeholder="z. B. Boostrix, Comirnaty, FSME-Immun" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done">
        <div class="hint">Steht im Impfausweis meist auf dem Aufkleber. Auch Begriffe wie „Grippe“ oder „Zecken“ gehen.</div></div>
      <div class="sugg" id="f-sugg" hidden></div>
      <div class="field stack"><label for="f-prod">Impfstoff-Typ</label><select id="f-prod">${productOptions(v.productId)}</select>
        <div class="hint" id="f-ex">${prod ? productHint(prod) : 'Wird beim Tippen des Namens vorgeschlagen.'}</div></div>
    </div>
    <h2 class="section-title">Schützt gegen</h2>
    <div class="card"><div class="disease-grid" id="f-dis">${diseaseChecks}</div></div>
    <p class="section-foot">Wird durch den Impfstoff automatisch ausgefüllt – bei Bedarf anpassen.</p>
    <h2 class="section-title">Details (optional)</h2>
    <div class="card list">
      <div class="field"><label for="f-batch">Chargen-Nr.</label><input id="f-batch" value="${h(v.batch)}" placeholder="z. B. AB1234" autocomplete="off" autocapitalize="characters"></div>
      <div class="field"><label for="f-doc">Arzt / Praxis</label><input id="f-doc" value="${h(v.doctor)}" placeholder="optional" autocomplete="off"></div>
      <div class="field stack"><label for="f-note">Notiz</label><textarea id="f-note" rows="2" placeholder="z. B. Reaktionen">${h(v.note)}</textarea></div>
    </div>
    ${existing ? '<div class="btn-stack"><button class="btn danger block" id="f-del">Impfung löschen</button></div>' : ''}`;

  openSheet({
    title: existing ? 'Impfung bearbeiten' : 'Neue Impfung',
    left: 'Abbrechen',
    right: 'Sichern',
    body,
    onMount(el, entry) {
      const sel = el.querySelector('#f-prod');
      const nameInp = el.querySelector('#f-name');
      const sugg = el.querySelector('#f-sugg');
      const hint = el.querySelector('#f-ex');
      // Typ wurde von Hand gewählt → nicht mehr automatisch überschreiben
      let manual = !!existing;

      const applyProduct = (pid, how) => {
        const p = PRODUCT_BY_ID[pid];
        sel.value = pid;
        if (p?.diseases.length) el.querySelectorAll('#f-dis input').forEach((i) => { i.checked = p.diseases.includes(i.value); });
        hint.innerHTML = p ? `${how ? `<span class="ok-mark">✓ ${h(how)}:</span> ` : ''}${productHint(p)}` : '';
      };

      const showSuggestions = () => {
        const q = nameInp.value.trim();
        const list = q ? suggestVaccines(q) : [];
        if (!q) { sugg.hidden = true; sugg.innerHTML = ''; return; }
        sugg.hidden = false;
        sugg.innerHTML = list.length ? list.map((x, i) => `<button type="button" class="sugg-row" data-i="${i}">
            <div class="main"><div class="title">${h(x.label)}${x.kind === 'keyword' ? ' <span class="chip">Begriff</span>' : ''}</div>
            <div class="meta">${h(x.product.name)} · ${h(x.product.diseases.map((d) => DISEASE_BY_ID[d].name).join(', ') || 'Krankheiten selbst wählen')}</div></div>
            <span class="pick">Übernehmen</span></button>`).join('')
          : `<div class="sugg-empty">Kein Impfstoff mit diesem Namen bekannt – wähle den Typ unten aus oder „Anderer Impfstoff …“.</div>`;
        sugg.querySelectorAll('.sugg-row').forEach((b) => {
          b.addEventListener('pointerdown', (e) => e.preventDefault());
          b.addEventListener('click', () => {
            const x = list[Number(b.dataset.i)];
            if (x.kind === 'brand') nameInp.value = x.label;
            manual = true;
            applyProduct(x.productId, 'Übernommen');
            sugg.hidden = true;
            nameInp.blur();
          });
        });
        // Eindeutiger Treffer → Typ schon mal automatisch setzen
        const auto = detectProduct(q);
        if (auto && !manual) applyProduct(auto.productId, 'Erkannt');
      };

      nameInp.addEventListener('input', showSuggestions);
      nameInp.addEventListener('focus', () => { if (nameInp.value.trim()) showSuggestions(); });
      nameInp.addEventListener('blur', () => setTimeout(() => { sugg.hidden = true; }, 150));
      nameInp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); nameInp.blur(); } });

      sel.addEventListener('change', () => {
        manual = true;
        applyProduct(sel.value, '');
        if (sel.value === 'other') hint.textContent = 'Wähle unten, wogegen der Impfstoff schützt.';
      });
      el.querySelector('#f-del')?.addEventListener('click', () => {
        if (!confirm('Diese Impfung wirklich löschen?')) return;
        state.vaccinations = state.vaccinations.filter((x) => x.id !== editId);
        persist(); closeSheet(entry); render(); toast('Impfung gelöscht'); afterSave?.();
      });
    },
    onRight(el, entry) {
      const date = readDate(el, 'f-date');
      if (date === null) return toast('Datum bitte als TT.MM.JJJJ eingeben');
      let productId = el.querySelector('#f-prod').value;
      if (!productId) {
        const auto = detectProduct(el.querySelector('#f-name').value);
        if (auto) {
          productId = auto.productId;
          el.querySelectorAll('#f-dis input').forEach((i) => { i.checked = auto.product.diseases.includes(i.value); });
        }
      }
      const diseases = [...el.querySelectorAll('#f-dis input:checked')].map((i) => i.value);
      if (!date) return toast('Bitte ein Datum angeben');
      if (date > today) return toast('Das Datum liegt in der Zukunft');
      if (!productId) return toast('Bitte Namen eingeben oder Impfstoff-Typ wählen');
      if (!diseases.length) return toast('Bitte mindestens eine Krankheit wählen');
      const rec = {
        id: existing?.id || uid(), date, productId, diseases,
        productName: el.querySelector('#f-name').value.trim(),
        batch: el.querySelector('#f-batch').value.trim(),
        doctor: el.querySelector('#f-doc').value.trim(),
        note: el.querySelector('#f-note').value.trim(),
      };
      if (existing) state.vaccinations = state.vaccinations.map((x) => (x.id === rec.id ? rec : x));
      else state.vaccinations.push(rec);
      persist();
      closeSheet(entry);
      render();
      toast(existing ? 'Änderung gespeichert' : 'Impfung eingetragen');
      afterSave?.();
    },
  });
}

// ------------------------------------------------------------ Reise

function openTripForm(editId) {
  const existing = editId ? state.trips.find((t) => t.id === editId) : null;
  const t = existing ? { ...existing, countries: [...existing.countries] } : { name: '', countries: [], start: addDays(today, 30), end: addDays(today, 44), long: false, rural: false, outdoor: false, hajj: false };
  const toggles = [
    ['long', 'Länger als 4 Wochen', 'Langzeitaufenthalt, Work & Travel, Auslandssemester'],
    ['rural', 'Rucksack / ländliche Gebiete', 'Einfache Unterkünfte, Essen an Straßenständen, abseits von Städten'],
    ['outdoor', 'Outdoor & Tierkontakt', 'Wandern, Camping, Radfahren, Kontakt zu Tieren'],
    ['hajj', 'Pilgerreise (Hajj/Umrah)', 'Nur für Saudi-Arabien relevant'],
  ];
  const body = `
    <h2 class="section-title">Reiseziel</h2>
    <div class="card list">
      <div class="field"><label for="t-name">Name</label><input id="t-name" value="${h(t.name)}" placeholder="z. B. Thailand-Rundreise" autocomplete="off"></div>
      <button class="row" id="t-countries"><div class="main"><div class="title">Länder</div><div class="meta" id="t-clist"></div></div>${chev}</button>
    </div>
    <h2 class="section-title">Zeitraum</h2>
    <div class="card list">
      <div class="field"><label for="t-start">Abreise</label>${dateInput('t-start', t.start)}</div>
      <div class="field"><label for="t-end">Rückkehr</label>${dateInput('t-end', t.end)}</div>
    </div>
    <h2 class="section-title">Reiseart</h2>
    <div class="card list">${toggles.map(([k, l, m]) => `<label class="toggle-row"><div class="main"><div>${l}</div><div class="meta">${m}</div></div>
      <span class="switch"><input type="checkbox" data-k="${k}" ${t[k] ? 'checked' : ''}><span></span></span></label>`).join('')}</div>
    <p class="section-foot">Die Reiseart entscheidet, ob z. B. Tollwut, Japanische Enzephalitis oder Typhus empfohlen werden.</p>
    ${existing ? '<div class="btn-stack"><button class="btn danger block" id="t-del">Reise löschen</button></div>' : ''}`;

  openSheet({
    title: existing ? 'Reise bearbeiten' : 'Neue Reise',
    left: 'Abbrechen',
    right: 'Sichern',
    body,
    onMount(el, entry) {
      const paint = () => {
        el.querySelector('#t-clist').innerHTML = t.countries.length ? `${t.countries.map((c) => `${flag(c)} ${h(COUNTRY_BY_CODE[c]?.name)}`).join(', ')}` : '<span style="color:var(--accent)">Länder auswählen</span>';
      };
      paint();
      el.querySelector('#t-countries').addEventListener('click', () => openCountryPicker(t.countries, (list) => { t.countries = list; paint(); }));
      el.querySelector('#t-del')?.addEventListener('click', () => {
        if (!confirm('Diese Reise löschen?')) return;
        state.trips = state.trips.filter((x) => x.id !== editId);
        persist(); closeAllSheets(); render(); toast('Reise gelöscht');
      });
    },
    onRight(el, entry) {
      if (!t.countries.length) return toast('Bitte mindestens ein Land wählen');
      const start = readDate(el, 't-start');
      let end = readDate(el, 't-end');
      if (start === null || end === null) return toast('Datum bitte als TT.MM.JJJJ eingeben');
      if (start && end && end < start) return toast('Rückkehr liegt vor der Abreise');
      if (start && !end) end = start;
      const rec = { id: existing?.id || uid(), name: el.querySelector('#t-name').value.trim(), countries: t.countries, start, end };
      el.querySelectorAll('[data-k]').forEach((i) => { rec[i.dataset.k] = i.checked; });
      if (existing) state.trips = state.trips.map((x) => (x.id === rec.id ? rec : x));
      else state.trips.push(rec);
      persist();
      closeSheet(entry);
      if (existing) closeAllSheets();
      render();
      openTrip(rec.id);
    },
  });
}

function openCountryPicker(selected, onDone) {
  const sel = new Set(selected);
  const groups = REGIONS.map((r) => {
    const cs = COUNTRIES.filter((c) => c.region === r);
    return `<h2 class="section-title" data-region>${h(r)}</h2><div class="card list" data-region-list>${cs.map((c) => `<label class="country" data-name="${h(c.name.toLowerCase())}">
      <span class="flag">${flag(c.code)}</span><span class="name">${h(c.name)}</span><input type="checkbox" value="${c.code}" ${sel.has(c.code) ? 'checked' : ''}><span class="check"></span></label>`).join('')}</div>`;
  }).join('');
  openSheet({
    title: 'Länder',
    left: 'Abbrechen',
    right: 'Fertig',
    body: `<div class="search"><input type="search" placeholder="Land suchen" id="c-q" autocomplete="off" enterkeyhint="search"></div>${groups}`,
    onMount(el) {
      const q = el.querySelector('#c-q');
      q.addEventListener('input', () => {
        const term = q.value.trim().toLowerCase();
        el.querySelectorAll('.country').forEach((row) => { row.style.display = !term || row.dataset.name.includes(term) ? '' : 'none'; });
        el.querySelectorAll('[data-region-list]').forEach((list) => {
          const any = [...list.children].some((c) => c.style.display !== 'none');
          list.style.display = any ? '' : 'none';
          list.previousElementSibling.style.display = any ? '' : 'none';
        });
      });
    },
    onRight(el, entry) {
      const picked = [...el.querySelectorAll('.country input:checked')].map((i) => i.value);
      // Reihenfolge der Auswahl beibehalten
      const ordered = [...selected.filter((c) => picked.includes(c)), ...picked.filter((c) => !selected.includes(c))];
      onDone(ordered);
      closeSheet(entry);
    },
  });
}

const TRIP_STATE = {
  missing: ['missing', 'Fehlt'],
  incomplete: ['incomplete', 'Unvollständig'],
  expired: ['overdue', 'Abgelaufen'],
  expires: ['soon', 'Läuft ab'],
  booster: ['soon', 'Auffrischen'],
  ok: ['ok', 'Geschützt'],
};

function openTrip(id) {
  const trip = state.trips.find((t) => t.id === id);
  if (!trip) return;
  const ev = evaluateTrip(trip, ctx());
  const multi = trip.countries.length > 1;
  const days = trip.start ? diffDays(today, trip.start) : null;

  let body = `<div class="detail-hero"><div class="flags" style="font-size:34px">${trip.countries.map(flag).join('')}</div>
    <h3 style="margin-top:6px">${h(trip.name || trip.countries.map((c) => COUNTRY_BY_CODE[c]?.name).join(', '))}</h3>
    <div class="short">${trip.start ? `${deLong(trip.start)} – ${deLong(ev.end)}` : ''}${days !== null && days >= 0 ? ` · ${relative(today, trip.start)}` : ''}</div>
    ${ev.open ? pill('incomplete', `${ev.open} Impfung${ev.open > 1 ? 'en' : ''} offen`) : pill('ok', 'Impfschutz passt')}</div>`;

  if (ev.open && ev.earliestDeadline) {
    const late = ev.earliestDeadline < today;
    body += `<div class="card" style="margin-top:14px"><div class="banner ${late ? 'tone-red' : 'tone-orange'}"><div class="ico">${ICON.cal}</div><div>
      <div class="t">${late ? 'Knapp! Möglichst sofort impfen lassen' : `Spätestens bis ${de(ev.earliestDeadline)} impfen lassen`}</div>
      <p>${late ? 'Für manche Impfungen reicht die Zeit bis zur Abreise evtl. nicht mehr für vollen Schutz – frag nach Schnellschemata.' : 'Ideal: 6–8 Wochen vor Abreise einen Termin beim Hausarzt oder in der Reisemedizin vereinbaren.'}</p></div></div></div>`;
  }

  const groups = [['required', 'Pflicht'], ['recommended', 'Empfohlen'], ['base', 'Standardimpfungen – bis zur Rückkehr gültig?'], ['situational', 'Je nach Reiseart']];
  for (const [lvl, label] of groups) {
    const items = ev.items.filter((i) => i.level === lvl);
    if (!items.length) continue;
    body += `<h2 class="section-title">${h(label)}</h2><div class="card list">`;
    body += items.map((i) => {
      const [stKey, stLabel] = lvl === 'situational' && i.state !== 'ok' ? ['optional', 'Optional'] : TRIP_STATE[i.state];
      const reasons = multi && i.reasons.length && i.reasons.length < trip.countries.length ? `${i.reasons.join(', ')} · ` : '';
      const deadline = i.state !== 'ok' && lvl !== 'situational' ? ` · impfen bis ${de(i.deadline)}` : '';
      return `<button class="row" data-dis="${i.id}"><span class="dot tone-${STATUS[stKey].tone}"></span><div class="main"><div class="title">${h(i.disease.name)}</div>
        <div class="meta">${h(reasons)}${h(i.text)}${h(deadline)}</div></div>${pill(stKey, stLabel)}${chev}</button>`;
    }).join('');
    body += `</div>`;
    if (lvl === 'situational') body += `<p class="section-foot">Werden empfohlen, wenn du unter „Reiseart“ z. B. Langzeitaufenthalt, Rucksackreise oder Outdoor/Tierkontakt aktivierst.</p>`;
  }

  body += `<h2 class="section-title">Hinweise</h2><div class="card list">${ev.notes.map((n) => `<div class="prose"><p>${h(n)}</p></div>`).join('')}</div>`;
  body += `<div class="btn-stack"><button class="btn secondary block" id="tr-edit">Reise bearbeiten</button></div>`;

  openSheet({
    title: 'Reise',
    left: 'Fertig',
    body,
    onMount(el, entry) {
      el.querySelector('#tr-edit').addEventListener('click', () => openTripForm(id));
      el.querySelectorAll('[data-dis]').forEach((b) => b.addEventListener('click', () => openDisease(b.dataset.dis)));
    },
    onClose: () => render(),
  });
}

// ------------------------------------------------------------ Profil

function openProfile(welcome = false) {
  const p = state.profile;
  const tg = (k, l, m) => `<label class="toggle-row"><div class="main"><div>${l}</div><div class="meta">${m}</div></div>
    <span class="switch"><input type="checkbox" data-k="${k}" ${p[k] ? 'checked' : ''}><span></span></span></label>`;
  const body = `${welcome ? `<div class="detail-hero"><div style="font-size:44px">💉</div><h3>Willkommen im Impfbuch</h3>
      <div class="short" style="margin-top:6px">Dein Impfausweis digital – mit STIKO-Abgleich, Reise-Check und Erinnerungen. Alle Daten bleiben auf deinem iPhone.</div></div>` : ''}
    <h2 class="section-title">Über dich</h2>
    <div class="card list">
      <div class="field"><label for="p-name">Name</label><input id="p-name" value="${h(p.name)}" placeholder="optional" autocomplete="given-name"></div>
      <div class="field"><label for="p-birth">Geburtsdatum</label>${dateInput('p-birth', p.birthdate, today)}</div>
      <div class="field"><label for="p-sex">Geschlecht</label><select id="p-sex">
        <option value="" ${!p.sex ? 'selected' : ''}>keine Angabe</option><option value="f" ${p.sex === 'f' ? 'selected' : ''}>weiblich</option>
        <option value="m" ${p.sex === 'm' ? 'selected' : ''}>männlich</option><option value="d" ${p.sex === 'd' ? 'selected' : ''}>divers</option></select></div>
    </div>
    <p class="section-foot">Das Geschlecht wird nur für die Röteln-Empfehlung (Frauen im gebärfähigen Alter) genutzt.</p>
    <h2 class="section-title">Indikationen</h2>
    <div class="card list">
      ${tg('chronic', 'Chronische Grunderkrankung', 'z. B. Herz-, Lungen-, Nierenerkrankung, Diabetes, Immunschwäche')}
      ${tg('healthcare', 'Arbeit im Gesundheitswesen', 'Oder Kita, Schule, Pflege – berufliche Impfempfehlungen')}
      ${tg('fsmeArea', 'Wohnort im FSME-Risikogebiet', 'z. B. Bayern, Baden-Württemberg, Sachsen, Südhessen, Südthüringen')}
    </div>
    <p class="section-foot">Diese Angaben aktivieren zusätzliche STIKO-Indikationsimpfungen (z. B. Grippe, COVID-19, Pneumokokken, FSME).</p>
    ${welcome ? `<h2 class="section-title">Erinnerungen</h2><div class="card list"><div class="field"><label for="p-lead">Vorlauf</label><select id="p-lead">
      ${[7, 14, 30, 60, 90].map((d) => `<option value="${d}" ${Number(state.settings.leadDays) === d ? 'selected' : ''}>${d} Tage vorher</option>`).join('')}</select></div></div>
      <p class="section-foot">So früh erinnert dich die App, bevor eine Impfung abläuft. Kannst du jederzeit ändern.</p>` : ''}`;
  openSheet({
    title: welcome ? 'Profil' : 'Profil bearbeiten',
    left: welcome ? 'Später' : 'Abbrechen',
    right: 'Sichern',
    body,
    onRight(el, entry) {
      state.profile.name = el.querySelector('#p-name').value.trim();
      const birth = readDate(el, 'p-birth');
      if (birth === null) return toast('Geburtsdatum bitte als TT.MM.JJJJ eingeben');
      if (birth > today) return toast('Das Geburtsdatum liegt in der Zukunft');
      state.profile.birthdate = birth;
      state.profile.sex = el.querySelector('#p-sex').value;
      el.querySelectorAll('[data-k]').forEach((i) => { state.profile[i.dataset.k] = i.checked; });
      const lead = el.querySelector('#p-lead');
      if (lead) state.settings.leadDays = Number(lead.value);
      persist();
      closeSheet(entry);
      render();
      toast('Profil gespeichert');
      if (welcome) requestPersistence();
    },
  });
}

// ------------------------------------------------------------ Kalender & Mitteilungen

async function exportICS() {
  const reminders = buildReminders(state, today);
  if (!reminders.length) return toast('Keine anstehenden Fälligkeiten – trage zuerst Impfungen ein');
  const ics = buildICS(reminders, { leadDays: Number(state.settings.leadDays), today });
  const filename = 'impfbuch-erinnerungen.ics';
  state.settings.icsExportedAt = today;
  state.settings.icsHash = remindersHash();
  persist();
  render();

  // Bevorzugt: Service Worker liefert die Datei unter echter URL aus → iOS zeigt "Zum Kalender hinzufügen".
  if (navigator.serviceWorker?.controller && 'caches' in window) {
    try {
      const cache = await caches.open('impfbuch-dynamic');
      await cache.put(new Request(new URL(filename, location.href)), new Response(ics, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `inline; filename="${filename}"` } }));
      showIcsHelp(reminders.length);
      setTimeout(() => { location.href = `${filename}?t=${Date.now()}`; }, 50);
      return;
    } catch { /* weiter mit Fallback */ }
  }
  const file = new File([ics], filename, { type: 'text/calendar' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Impf-Erinnerungen' }); return; } catch { /* abgebrochen */ }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  showIcsHelp(reminders.length);
}

function showIcsHelp(n) {
  toast(`${n} Erinnerung${n > 1 ? 'en' : ''} erstellt – „Alle hinzufügen“ tippen`);
}

async function enableNotifications() {
  if (!('Notification' in window)) {
    return openInstallHelp('Mitteilungen gibt es für Web-Apps auf dem iPhone erst, wenn das Impfbuch über „Zum Home-Bildschirm“ installiert wurde (iOS 16.4 oder neuer).');
  }
  if (Notification.permission === 'denied') return toast('Mitteilungen sind in den iOS-Einstellungen blockiert');
  const res = await Notification.requestPermission();
  state.settings.notify = res === 'granted';
  persist();
  render();
  if (res === 'granted') { state.settings.lastNotified = ''; await checkNotify(true); toast('Mitteilungen aktiviert'); }
}

async function updateBadge() {
  const sum = summarize(evaluateAll(ctx()));
  const n = sum.overdue + evaluateSoonCount();
  try {
    if (navigator.setAppBadge) { if (n) await navigator.setAppBadge(n); else await navigator.clearAppBadge(); }
  } catch { /* nicht unterstützt */ }
}

function evaluateSoonCount() {
  return Object.values(evaluateAll(ctx())).filter((r) => isRelevant(r) && !r.hidden && r.status === 'soon').length;
}

async function checkNotify(force = false) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!force && state.settings.lastNotified === today) return;
  const res = Object.values(evaluateAll(ctx())).filter((r) => isRelevant(r) && !r.hidden && ['overdue', 'missing', 'soon'].includes(r.status) && r.nextDue);
  state.settings.lastNotified = today;
  save(state);
  if (!res.length) return;
  const body = res.slice(0, 4).map((r) => `${r.disease.name}: ${r.headline}`).join('\n');
  try {
    const reg = await navigator.serviceWorker?.ready;
    const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'impfbuch-faellig' };
    if (reg?.showNotification) await reg.showNotification(`${res.length} Impfung${res.length > 1 ? 'en' : ''} fällig`, opts);
    else new Notification(`${res.length} Impfung${res.length > 1 ? 'en' : ''} fällig`, opts);
  } catch { /* ignorieren */ }
}

// ------------------------------------------------------------ Backup

async function exportBackup() {
  const data = JSON.stringify({ app: 'impfbuch', exportedAt: new Date().toISOString(), ...state }, null, 2);
  const file = new File([data], `impfbuch-backup-${today}.json`, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Impfbuch-Backup' }); return; } catch (e) { if (e?.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
}

function importBackup(e) {
  const f = e.target.files?.[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.vaccinations)) throw new Error('format');
      if (!confirm(`Backup mit ${data.vaccinations.length} Impfungen wiederherstellen? Aktuelle Daten werden ersetzt.`)) return;
      const { app, exportedAt, ...rest } = data;
      state = migrate(rest);
      persist();
      render();
      toast('Backup wiederhergestellt');
    } catch {
      toast('Datei konnte nicht gelesen werden');
    }
  };
  reader.readAsText(f);
  e.target.value = '';
}

function resetAll() {
  if (!confirm('Wirklich alle Impfungen, Reisen und Einstellungen löschen? Das kann nicht rückgängig gemacht werden.')) return;
  state = emptyState();
  persist();
  render();
  toast('Alle Daten gelöscht');
}

// ------------------------------------------------------------ Import aus gescanntem Impfpass

function openImport() {
  const body = `<div class="detail-hero"><div style="font-size:44px">📷</div><h3>Impfpass scannen lassen</h3>
      <div class="short" style="margin-top:6px">Claude liest deine Impfpass-Fotos aus – auch Handschrift – und erstellt einen Import-Code.</div></div>
    <h2 class="section-title">So geht's</h2>
    <div class="card list">
      <div class="prose"><p><b>1.</b> Fotografiere die Seiten mit Impfungen – hell, gerade, ohne Spiegelung. Gern mehrere Seiten auf einmal.</p></div>
      <div class="prose"><p><b>2.</b> Schick die Fotos an Claude, z. B. mit: <i>„Lies meinen Impfpass aus und erstelle einen Import-Code für die Impfbuch-App.“</i></p></div>
      <div class="prose"><p><b>3.</b> Kopiere den Code aus der Antwort und füge ihn hier ein. Vor dem Übernehmen siehst du jede Impfung noch einmal.</p></div>
    </div>
    <h2 class="section-title">Import-Code</h2>
    <div class="card"><div class="field stack"><textarea id="imp-text" rows="6" placeholder='{"impfbuch":"import","vaccinations":[…]}' autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" style="font: 13px/1.4 ui-monospace, Menlo, monospace"></textarea></div></div>
    <div class="btn-stack">
      <button class="btn secondary block" id="imp-paste">Aus Zwischenablage einfügen</button>
      <button class="btn secondary block" id="imp-file">Datei wählen …</button>
      <input type="file" id="imp-file-input" accept="application/json,.json,.txt,text/plain" hidden>
    </div>
    <p class="section-foot">Deine Fotos gehen nur an Claude im Chat. Die App selbst schickt keine Daten weg.</p>`;
  openSheet({
    title: 'Importieren',
    left: 'Abbrechen',
    right: 'Prüfen',
    body,
    onMount(el) {
      const ta = el.querySelector('#imp-text');
      el.querySelector('#imp-paste').addEventListener('click', async () => {
        try { ta.value = await navigator.clipboard.readText(); toast('Eingefügt'); }
        catch { ta.focus(); toast('Bitte lange ins Feld tippen und „Einsetzen“ wählen'); }
      });
      const fi = el.querySelector('#imp-file-input');
      el.querySelector('#imp-file').addEventListener('click', () => fi.click());
      fi.addEventListener('change', () => {
        const f = fi.files?.[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => { ta.value = r.result; toast('Datei geladen – jetzt „Prüfen“ tippen'); };
        r.readAsText(f);
      });
    },
    onRight(el, entry) {
      const res = parseImport(el.querySelector('#imp-text').value, state.vaccinations, today);
      if (res.error) return toast(res.error);
      openImportPreview(res.items, () => closeSheet(entry));
    },
  });
}

function openImportPreview(items, onDone) {
  const sorted = items.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const okCount = items.filter((i) => i.ok && !i.duplicate).length;
  const row = (i) => {
    const prod = PRODUCT_BY_ID[i.productId];
    const flags = [
      i.duplicate ? '<span class="pill tone-gray">schon vorhanden</span>' : '',
      ...i.issues.map((x) => `<span class="pill tone-red">${h(x)}</span>`),
    ].join(' ');
    return `<label class="toggle-row" style="align-items:flex-start">
      <span class="switch" style="margin-top:4px"><input type="checkbox" data-key="${i.key}" ${i.ok && !i.duplicate ? 'checked' : ''} ${i.ok ? '' : 'disabled'}><span></span></span>
      <div class="main"><div style="font-weight:600">${i.date ? de(i.date) : '??.??.????'} · ${h(i.productName || prod?.name || 'Unbekannt')}</div>
        <div class="meta">${h(prod && i.productName ? prod.name : '')}${i.batch ? ` · Ch.-B. ${h(i.batch)}` : ''}${i.doctor ? ` · ${h(i.doctor)}` : ''}</div>
        <div class="chips" style="margin-top:6px">${i.diseases.map((d) => `<span class="chip">${h(DISEASE_BY_ID[d]?.name || d)}</span>`).join('')}</div>
        ${flags ? `<div style="margin-top:6px">${flags}</div>` : ''}</div></label>`;
  };
  openSheet({
    title: 'Vorschau',
    left: 'Zurück',
    right: 'Übernehmen',
    body: `<div class="detail-hero"><h3>${items.length} Impfung${items.length === 1 ? '' : 'en'} gefunden</h3>
      <div class="short">${okCount} neu · ${items.filter((i) => i.duplicate).length} schon vorhanden · ${items.filter((i) => !i.ok).length} unvollständig</div></div>
      <p class="section-foot" style="margin-top:12px">Bitte kurz mit deinem Impfpass vergleichen. Abgewählte Einträge werden nicht übernommen; unvollständige kannst du danach von Hand ergänzen.</p>
      <div class="card list" style="margin-top:10px">${sorted.map(row).join('')}</div>`,
    onRight(el, entry) {
      const keys = new Set([...el.querySelectorAll('input[data-key]:checked')].map((i) => Number(i.dataset.key)));
      const chosen = items.filter((i) => keys.has(i.key) && i.ok);
      if (!chosen.length) return toast('Keine Impfung ausgewählt');
      for (const i of chosen) {
        state.vaccinations.push({ id: uid(), date: i.date, productId: i.productId, productName: i.productName, diseases: i.diseases, batch: i.batch, doctor: i.doctor, note: i.note });
      }
      persist();
      closeSheet(entry);
      onDone?.();
      location.hash = 'status';
      render();
      toast(`${chosen.length} Impfung${chosen.length === 1 ? '' : 'en'} übernommen`);
    },
  });
}

// ------------------------------------------------------------ Installation

function openInstallHelp(intro) {
  openSheet({
    title: 'Als App installieren',
    left: 'Fertig',
    body: `<div class="detail-hero"><div style="font-size:44px">📲</div><h3>Zum Home-Bildschirm</h3></div>
      ${intro ? `<div class="card" style="margin-top:12px"><div class="hint-box">${h(intro)}</div></div>` : ''}
      <div class="card list" style="margin-top:16px">
        <div class="prose"><p><b>1.</b> Öffne diese Seite in <b>Safari</b>.</p></div>
        <div class="prose"><p><b>2.</b> Tippe unten auf <b>Teilen</b> <span style="display:inline-block;width:18px;vertical-align:-3px;color:var(--accent)">${ICON.share}</span>.</p></div>
        <div class="prose"><p><b>3.</b> Wähle <b>„Zum Home-Bildschirm“</b> und tippe auf <b>Hinzufügen</b>.</p></div>
        <div class="prose"><p><b>4.</b> Starte das Impfbuch ab jetzt über das Symbol auf deinem Home-Bildschirm – es läuft dann wie eine normale App, auch offline.</p></div>
      </div>
      <p class="section-foot">Erinnerungen laufen über den iPhone-Kalender (Einstellungen → „In iPhone-Kalender übernehmen“). Zusätzlich kann die installierte App beim Öffnen Mitteilungen und einen Zähler am App-Symbol anzeigen.</p>`,
  });
}

// ------------------------------------------------------------ Start

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

render();
updateBadge();
checkNotify();
if (!state.profile.birthdate && !state.vaccinations.length && !localStorage.getItem('impfbuch.welcomed')) {
  try { localStorage.setItem('impfbuch.welcomed', '1'); } catch { /* ignore */ }
  setTimeout(() => openProfile(true), 250);
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && todayISO() !== today) { render(); checkNotify(); updateBadge(); }
});
