# Impfbuch – Hinweise für Claude

## Kommunikation
- Antworte immer auf **Deutsch**.
- Der Nutzer ist kein Entwickler: **Erkläre jeden Schritt in einfachen Worten** – was du tust, warum, und was dabei herauskam.

## Projekt
- iPhone-Web-App (PWA) ohne Build-Schritt: `index.html`, `css/`, `js/`, `sw.js`, `manifest.webmanifest`, `icons/`.
- Medizinische Logik: `js/data.js` (Impfstoffe, Länder), `js/rules.js` (STIKO-Regeln, Reise-Check), `js/search.js` (Namenssuche).
- Tests: `npm test` (Node 22) – vor jedem Push ausführen.
- Wenn sich App-Dateien ändern, in `sw.js` die Konstante `VERSION` erhöhen, damit das iPhone die neue Version lädt.
- Veröffentlichung: Push auf `main` → GitHub Actions (`.github/workflows/pages.yml`) → https://nockchlhas.github.io/Impfbuch/
- Der Nutzer hat erlaubt, Änderungen direkt nach `main` zu pushen.

## Fehler
- Bei Fehlermeldungen von GitHub (Mails über fehlgeschlagene Läufe): Skill `/fehler-beheben` verwenden.
