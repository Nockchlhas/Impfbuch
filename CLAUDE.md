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

## Impfpass-Fotos auslesen
Wenn der Nutzer Fotos seines Impfpasses schickt: alle Impfungen auslesen und einen Import-Code als **ein** JSON-Codeblock ausgeben, den er in der App unter *Impfpass → Impfpass scannen lassen* einfügt (Parser: `js/importer.js`).

```json
{"impfbuch":"import","vaccinations":[
  {"date":"05.12.2016","name":"Boostrix Polio","batch":"AC52B123","doctor":"Dr. Meier"}
]}
```
- `date` als TT.MM.JJJJ; `name` = Handelsname vom Aufkleber (wird über `js/search.js` erkannt). Ohne Aufkleber stattdessen `"diseases":["tetanus",…]` mit IDs aus `js/data.js` angeben.
- `batch` (Chargen-Nr.), `doctor` (Arzt/Stempel), `note` optional.
- Unleserliches nicht raten: im Chat auflisten, was unsicher ist, und den Nutzer bitten, es zu prüfen.
- Vor dem Code kurz als Tabelle zeigen, was erkannt wurde.
