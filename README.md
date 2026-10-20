# Zeiterfassungstool
Ein Excel on crack für Fourcast ⏱️

Zeiterfassung und gemeinsamer Kalender für das Fourcast-Team.

**👉 https://justraika.github.io/Zeiterfassungstool/** – IHR MÜSST EUCH MIT DEM EUREM GitHub-KONTO ANMELDEN

## Funktionen
- **Erfassen:** Start/Stop-Timer (läuft auch weiter, wenn der Browser zu ist) oder Stunden + Minuten
  manuell eintragen. Dazu Tags (mehrere möglich) und ein optionaler Kommentar (bitte macht den, damit wir einen Überblick haben.)
- **Übersicht:** alle Einträge als Tabelle, filterbar nach Zeitraum, Person und Tag.
  Anteile in Prozent pro Person, Zeit nach Tags und CSV-Export für Excel als Backup. 
- **Kalender:** gemeinsame Termine (Monat / Woche / Liste). Neue Termine per Klick auf einen Tag,
  verschieben per Drag & Drop.

Jede Person kann nur ihre eigenen Zeiteinträge ändern oder löschen, mit Ausnahme vom Admin (Big Brother is watching you).

## Feature Requests?
- **Ein Tag fehlt** oder **du kommst nicht rein:** bei Nika melden.
- **Backup:** In der Übersicht Zeitraum „Alles“ wählen und **CSV exportieren**, dann im Google Drive ablegen. Lässt sich agentisch Automatisieren, sobald der Ordner steht, let me cook later.

## Tech Stack
Statische Seite (HTML, CSS, JavaScript ohne Build) auf GitHub Pages, Daten und Login über Supabase.
Ohne Zugangsdaten in `js/config.js` läuft die App lokal im Demo-Modus mit Beispieldaten:

```bash
npx serve -l 8000
```
