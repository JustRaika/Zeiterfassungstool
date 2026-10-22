# Zeiterfassungstool
Ein Excel on crack für Fourcast ⏱️

Ein schlankes Web-Tool, mit dem unser 5-köpfiges Indie-Game-Team Arbeitszeit, Termine und Aufgaben an einem Ort festhält, damit spätere Einnahmen fair und nachvollziehbar nach Arbeitsanteil verteilt werden können.

**👉 https://justraika.github.io/Zeiterfassungstool/** – IHR MÜSST EUCH MIT DEM EUREM GitHub-KONTO ANMELDEN

## Funktionen
- **Erfassen:** Start/Stop-Timer (läuft auch weiter, wenn der Browser zu ist) oder Stunden + Minuten
  manuell eintragen. Dazu mindestens ein Tag (mehrere möglich) und ein kurzer Kommentar (Pflicht, mind. 3 Zeichen, damit wir einen Überblick haben).
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
## Recruiter Mode
Wir sind fünf Leute, die ohne Budget an einem Game arbeiten. Falls es Geld einbringt, soll jede Person den Anteil bekommen, den sie auch beigetragen hat. Dafür braucht es eine Grundlage, der alle vertrauen. Ich habe ein Tool gebaut, in dem sich alle mit ihrem GitHub-Account anmelden. Man erfasst die Zeit per Timer oder von Hand, mit Tag und kurzem Kommentar. Die Übersicht rechnet die Prozent-Anteile pro Person live aus. Dazu gibt es einen gemeinsamen Kalender mit Meilensteinen und ein Task-Board. Das Tool kostet nichts, läuft im Browser und ist bewusst schlicht gehalten, damit es auch wirklich benutzt wird.

### Kernfeatures
Zeiterfassung: Timer mit Start, Pause und Stop. Er läuft auch weiter, wenn man den Tab schliesst oder das Gerät wechselt. Alternativ trägt man Stunden und Minuten von Hand ein. Tag und Kommentar sind Pflicht.
Übersicht: Filter, Prozent-Anteile pro Person, Zeit nach Tags und CSV-Export als Backup.
Kalender: gemeinsame Termine, hervorgehobene Meilensteine, die nächsten 5 Termine und Übernahme in den Google Kalender mit einem Klick.
Tasks: Kanban-Board mit Zeilen nach Kategorie oder als Liste, mit Priorität, mehreren Zuständigen und Unteraufgaben.
Rechte: Alle sehen alles, aber jede Person kann nur ihre eigenen Einträge ändern. Nur der Admin darf alles korrigieren. Diese Regeln setzt die Datenbank selbst durch, nicht nur die Oberfläche.

### Why did it matter?
Geld ist im Team das grösste Konfliktrisiko, gerade wenn am Anfang niemand bezahlt wird. Ohne Aufzeichnungen würde man die Einnahmen am Ende aus dem Gedächtnis und nach Gefühl verteilen. Dann fühlt sich schnell jemand übergangen, oft gerade die Leute, deren Arbeit weniger sichtbar ist, z. B. Organisation oder Testing.

Das Tool schafft eine gemeinsame, transparente Datenbasis, bevor es überhaupt um Geld geht. So wird aus der Frage „Wer hat wie viel gemacht?“ ein Blick auf die Zahlen statt einer Diskussion. Nebenbei hat das Team jetzt einen zentralen Ort für Termine und Aufgaben statt verstreuter Chats.

### What did you own?
Ich habe das Projekt von der Idee bis zum Betrieb verantwortet, umgesetzt mit KI-gestützter Entwicklung (Claude Code).

Problem und Anforderungen: Was muss das Tool können, damit eine faire Verteilung möglich ist? Was lasse ich bewusst weg, damit es einfach bleibt?
Produktentscheide: z. B. Tag und Kommentar als Pflicht, damit die Einträge später nachvollziehbar sind. Login über GitHub, weil alle schon einen Account haben. Eine Admin-Rolle für Korrekturen.
Infrastruktur: Supabase als Datenbank, GitHub-Login, Hosting auf GitHub Pages und ein automatischer Keep-Alive, damit das Gratis-Projekt nicht pausiert wird. Alles läuft bei 0 Franken.
Design: visuelle Richtung, Farbsystem pro Person und Kategorie, Logo und Branding.
Iteration: Feedback aus dem Team aufnehmen und laufend verbessern.

### Who used it?
Unser Game-Dev-Team Fourcast: 5 Personen aus Concept Art, 3D, VFX, Code und Story. Alle erfassen ihre Zeit selbst, der Kalender und die Tasks werden gemeinsam gepflegt.

### What changed?
Ehrlich gesagt ist das Tool erst seit Oktober 2026 im Einsatz. Messbare Ergebnisse gibt es also noch nicht. Was sich jetzt schon verändert hat:

Vorher: Organisation über ein Miro-Board mit Kanban und Kalender und Slack.
Nachher: Zitat aus dem Team. 

<img width="3838" height="2038" alt="Screenshot 2026-10-21 022813" src="https://github.com/user-attachments/assets/a538efbd-fa16-4531-a999-5c2e67d43c83" />
<img width="3838" height="2029" alt="Screenshot 2026-10-21 022831" src="https://github.com/user-attachments/assets/a16ff4be-3222-4d32-abdf-ee61bbf11b81" />
<img width="3836" height="2022" alt="image" src="https://github.com/user-attachments/assets/8e074937-663b-48f6-91a6-3721366f5a80" />
