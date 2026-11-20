---
name: fehler-beheben
description: Fehlgeschlagene GitHub-Actions-Läufe (z. B. „Run failed“-Mails von GitHub) im Impfbuch-Repository selbst finden, verständlich erklären und beheben. Verwenden, wenn der Nutzer eine Fehlermeldung per Mail bekommt, „/fehler-beheben“ eingibt oder fragt, warum die Veröffentlichung nicht klappt.
---

# Fehler in GitHub Actions finden und beheben

Der Nutzer ist kein Entwickler. Erkläre **jeden Schritt auf Deutsch in einfachen Worten**: was du gerade tust, was du gefunden hast und warum du es so löst. Keine Fachbegriffe ohne kurze Erklärung.

## Ablauf

1. **Läufe ansehen** – mit dem GitHub-Tool `actions_list` (`list_workflow_runs`) für `Nockchlhas/Impfbuch` die letzten Läufe holen.
   Dem Nutzer kurz sagen: welche Läufe es gab, welche rot (fehlgeschlagen) und welche grün sind, und ob die App gerade trotzdem aktuell ist
   (ein späterer grüner Lauf für denselben Commit bedeutet: die App ist online aktuell).
2. **Ursache lesen** – mit `get_job_logs` (`run_id`, `failed_only: true`, `return_content: true`) die Logs der fehlgeschlagenen Jobs lesen.
   Die eigentliche Fehlerzeile zitieren und in einem Satz übersetzen, was sie bedeutet.
3. **Einordnen** und dem Nutzer sagen, welcher Fall vorliegt:
   - **Tests rot (Job `test`)**: ein Fehler im App-Code → Code reparieren.
   - **Veröffentlichung rot (Job `build`/`deploy`)**: meist ein Problem bei GitHub selbst (Timing, Störung) oder in `.github/workflows/pages.yml`.
     Bei vorübergehenden GitHub-Störungen nichts am Code ändern, sondern erklären und den Lauf neu starten lassen (`actions_run_trigger`, nur nach Rückfrage).
   - **Einstellungen** (z. B. Pages nicht aktiviert, Repository privat): Schritt-für-Schritt-Anleitung geben, was der Nutzer in GitHub klicken muss.
4. **Beheben** – Änderung vornehmen, lokal `npm test` ausführen und das Ergebnis nennen.
5. **Hochladen** – committen und nach `main` pushen (der Nutzer hat erlaubt, direkt nach `main` zu pushen; zusätzlich auf den aktuellen Arbeits-Branch).
6. **Kontrollieren** – den neuen Lauf mit `actions_list` prüfen. Läuft er noch, das sagen und später erneut nachsehen. Erst bei grünem Lauf „behoben“ melden.
7. **Zusammenfassen** – in 3–5 Sätzen: Was war kaputt, warum, was wurde geändert, muss der Nutzer etwas tun (z. B. App einmal neu öffnen)?

Niemals Tests deaktivieren oder überspringen, um einen Lauf grün zu bekommen.
