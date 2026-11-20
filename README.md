# Impfbuch

Dein gelber Impfausweis als iPhone-App (Web-App/PWA) – mit STIKO-Abgleich, Reise-Check und Erinnerungen.

## Funktionen

- **Impfpass:** Alle Impfungen mit Datum, Impfstoff, Chargen-Nr. und Arzt. Kombi-Impfstoffe (z. B. Tdap-IPV, MMR, Twinrix) werden automatisch den richtigen Krankheiten zugeordnet.
- **Impfstatus nach STIKO:** Die App zeigt, was für dein Alter empfohlen ist, was fehlt, was bald abläuft und was überfällig ist (z. B. Tetanus/Diphtherie alle 10 Jahre, einmalig Tdap, MMR für nach 1970 Geborene, ab 60 Grippe/Pneumokokken/Gürtelrose/COVID-19, ab 75 RSV, FSME im Risikogebiet).
- **Reiseplanung:** Ein oder mehrere Länder wählen (rund 170 Länder) und Reisezeitraum eintragen. Die App zeigt Pflicht- und empfohlene Impfungen (Hepatitis A/B, Typhus, Gelbfieber, Tollwut, Japanische Enzephalitis, Meningokokken ACWY, Polio-Auffrischung, FSME …), prüft, ob deine Impfungen **bis zur Rückkehr** gültig sind, und nennt das Datum, bis zu dem du spätestens geimpft sein solltest.
- **Erinnerungen:** Mit einem Tipp übernimmst du alle Fälligkeiten in den iPhone-Kalender. Das iPhone meldet sich dann **30 Tage vorher** (Vorlauf in den Einstellungen änderbar: 7/14/30/60/90 Tage) und am Fälligkeitstag – auch wenn die App geschlossen ist.
- **Privat:** Alle Daten bleiben auf dem iPhone (kein Konto, keine Cloud). Mit „Backup sichern“ kannst du sie z. B. in iCloud Drive ablegen.
- Funktioniert offline, mit Dark Mode.

## Auf das iPhone bringen

1. **GitHub Pages einschalten (einmalig):** Im Repository unter *Settings → Pages → Build and deployment → Source* „**GitHub Actions**“ wählen.
2. Den Code auf den Branch `main` bringen (Pull Request mergen). Der Workflow `.github/workflows/pages.yml` testet und veröffentlicht die App automatisch unter
   `https://<dein-github-name>.github.io/Impfbuch/`.
   *Hinweis:* GitHub Pages ist für private Repositories nur mit einem kostenpflichtigen GitHub-Tarif verfügbar. Die App enthält keine persönlichen Daten – die Daten liegen nur auf dem iPhone.
3. Die Adresse auf dem iPhone in **Safari** öffnen → **Teilen** → **„Zum Home-Bildschirm“**.
4. Impfbuch über das neue App-Symbol starten, Profil anlegen und Impfungen aus dem gelben Heft eintragen.
5. *Einstellungen → „In iPhone-Kalender übernehmen“* → „Alle hinzufügen“. Tipp: einen eigenen Kalender „Impfbuch“ wählen; nach neuen Einträgen den Kalender löschen und erneut übernehmen.

## Warum Kalender-Erinnerungen?

Web-Apps auf dem iPhone können Benachrichtigungen nur über einen Push-Server zeitgesteuert verschicken. Damit keine Daten das iPhone verlassen, nutzt die App den iPhone-Kalender – der erinnert zuverlässig. Zusätzlich zeigt die installierte App beim Öffnen eine Mitteilung und einen Zähler am App-Symbol (iOS 16.4+, unter *Einstellungen → Mitteilungen der App* aktivieren).

## Entwicklung

Reines HTML/CSS/JavaScript ohne Build-Schritt.

```bash
python3 -m http.server 8000   # http://localhost:8000
npm test                      # Tests der STIKO-/Reise-Regeln (Node 20+)
```

| Datei | Inhalt |
| --- | --- |
| `js/data.js` | Krankheiten, Impfstoffe, Länder mit Reiseimpf-Kennzeichen |
| `js/rules.js` | Regel-Engine: STIKO-Bewertung, Reise-Check, Erinnerungen |
| `js/ics.js` | Kalenderdatei (.ics) mit Weckern |
| `js/app.js` | Oberfläche |
| `sw.js` | Offline-Cache und Auslieferung der Kalenderdatei |

## Wichtiger Hinweis

Die App ist eine vereinfachte Umsetzung der STIKO-Empfehlungen (Standard-, Indikations- und Reiseimpfungen, Stand 2025/2026) und ersetzt weder den offiziellen Impfausweis noch die ärztliche bzw. reisemedizinische Beratung. Einreisebestimmungen (z. B. Gelbfieber-Nachweis) ändern sich – vor der Reise beim Auswärtigen Amt prüfen.
