# Zeiterfassungstool
Ein Excel on crack für Fourcast ⏱️

Ein schlankes Web-Tool, mit dem unser 5-köpfiges Indie-Game-Team Arbeitszeit, Termine und Aufgaben an einem Ort festhält, damit spätere Einnahmen fair und nachvollziehbar nach Arbeitsanteil verteilt werden können.

**👉 https://justraika.github.io/Zeiterfassungstool/** – IHR MÜSST EUCH MIT DEM EUREM GitHub-KONTO ANMELDEN

## Funktionen
- **Erfassen:** Start/Stop-Timer (läuft auch weiter, wenn der Browser zu ist) oder Stunden + Minuten
  manuell eintragen. Dazu mindestens ein Tag (mehrere möglich) und ein kurzer Kommentar (Pflicht, mind. 3 Zeichen, damit wir einen Überblick haben).
- **Übersicht:** alle Einträge als Tabelle, filterbar nach Zeitraum, Person und Tag.
  „Wer hat woran gearbeitet“ (Stunden und Hauptbereiche pro Person, ohne Rangliste), Zeit nach Tags und CSV-Export für Excel als Backup.
- **Tasks:** Kanban-Board mit Zeilen pro Kategorie oder als Liste, Umschalter „Nur meine“.
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
Übersicht: Filter, wer woran gearbeitet hat (Stunden, Anteil und Hauptbereiche pro Person, bewusst ohne Rangliste), Zeit nach Tags und CSV-Export als Backup.
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

## UX/UI Audit
Nachdem die Grundfunktionen liefen, habe ich die App systematisch auf Usability und Gestaltung geprüft und in kleinen, überprüfbaren Schritten verbessert. Werkzeug war Claude Code mit dem Design-Skill **Impeccable** (Heuristik-Critique, automatischer Design-Scanner, Polish). Jede Runde lief gleich ab: bewerten → priorisieren → umsetzen → im Demo-Modus testen → Code-Review → committen.

### Ergebnis in Zahlen
- **Usability-Score (Nielsen-Heuristiken):** 26/40 → 28/40 zwischen der ersten und zweiten Critique. Alle 5 Probleme der ersten Critique sind gelöst.
- **Design-Scanner:** von 5 Befunden auf 0 offene. Die 3 verbleibenden Meldungen sind bewusste Entscheidungen und dokumentiert.
- **Code-Review mit Sicherheitsfokus:** 8 Befunde, alle behoben, inklusive Datenbank-Migration.

### Die wichtigsten Änderungen
**Erfassen**
- Fehlermeldungen erscheinen alle gleichzeitig direkt am Feld statt einzeln als Pop-up, das nach 6 Sekunden verschwindet.
- Die eigenen meistgenutzten Tags stehen vorne; die letzten Kommentare lassen sich mit einem Klick übernehmen.
- Timer mit klarer Knopf-Hierarchie: „Stop & eintragen“ ist die Hauptaktion, Pause und Verwerfen treten zurück.

**Übersicht: von der Rangliste zu „Wer hat woran gearbeitet“**
- Die Critique zeigte, dass die nach Stunden sortierten Prozente wie eine Rangliste wirken. Für ein Hobby-Team, das kein Wettrennen will, ist das falsch, und Stunden sagen wenig über das Ergebnis (12 h Concept Art können ein Bild sein, 2 h Bugfixing fünf Fixes).
- Neu: feste Reihenfolge nach Namen, Stunden im Vordergrund, darunter die Hauptbereiche jeder Person. Standard-Zeitraum „Dieser Monat“, die Tabelle zeigt zuerst 50 Einträge.

**Tasks**
- Kategorie direkt an jeder Swimlane statt in einer leicht übersehenen Legende, Umschalter „Nur meine“.
- Board per Tastatur bedienbar.

**Gestaltung und Charakter**
- Farbsemantik bereinigt: Rot heisst nur noch Gefahr (vorher waren auch „+ Task“ und „Stop“ rot).
- Das Logo-Wesen ist jetzt Maskottchen: es döst, solange der Timer steht, schaukelt, wenn er läuft, und taucht bei Erfolgsmeldungen und leeren Listen auf.
- Emojis durch einheitliche Icons ersetzt, eigener Bestätigungsdialog statt Browser-Standard, Dialoge fragen vor dem Verwerfen ungespeicherter Änderungen.
- Designsystem dokumentiert in [DESIGN.md](DESIGN.md) unter dem Leitbild **„Die Werkstatt bei Nacht“**: Farben, Schriften, Bausteine und feste Regeln, damit die App bei weiteren Änderungen aus einem Guss bleibt.

**Sicherheit**
- Login über die unveränderliche GitHub-ID statt über den Usernamen, der nach einer Umbenennung von Fremden übernommen werden könnte.
- Datenbank-Regeln für Farben und Anzeigenamen, damit niemand CSS einschleusen oder sich als andere Person ausgeben kann.
- Prüfsummen (SRI) für die extern geladenen Bibliotheken.

### Was ich entschieden habe und was Claude gemacht hat
**Meine Rolle:** Ich habe die Richtung und alle Produkt- und Geschmacksentscheide verantwortet, die Ergebnisse jeder Runde geprüft und live mit dem Team getestet. Konkret:
- Produktkontext geliefert, der die Übersicht neu definiert hat: Hobby-Projekt, kein Wettbewerb, Art des Beitrags statt Menge.
- Priorisiert, was jetzt wichtig ist (Grundfunktionen und Workflow) und was bewusst später kommt (Screenreader-Optimierung, solange niemand im Team sie braucht).
- Gestalterische Leitplanken gesetzt: Pastell-Verlauf nur für Meilensteine, Standard-Blau für die Navigation, gemischte Sprache auf dem Board beibehalten (aus unserem alten Kanban), Leitbild und Farbnamen gewählt.
- Nutzer-Feedback eingebracht, z. B. dass die „Nochmal“-Funktion unten übersehen wird und wie Tag-Chips verwirren. Daraus wurden die Kommentar-Vorschläge.

**Rolle von Claude Code:** Durchführung der Critiques (zwei unabhängige Prüfer plus automatischer Scanner), Umsetzung der Änderungen, Tests im Demo-Modus im Browser, Code-Reviews nach jeder Runde und die Datenbank-Migration im Supabase-Dashboard. Gepusht wurde nur nach meiner Freigabe.

### Was als Nächstes kommt
- Feedback aus dem Team sammeln und daraus die nächste Runde ableiten.
- Mehr Eigenständigkeit im Layout (weniger gleichförmige Kästen), mit der DESIGN.md als Leitplanke.
- Weitere Posen für das Maskottchen.

<img width="3838" height="2038" alt="Screenshot 2026-10-21 022813" src="https://github.com/user-attachments/assets/a538efbd-fa16-4531-a999-5c2e67d43c83" />
<img width="3838" height="2029" alt="Screenshot 2026-10-21 022831" src="https://github.com/user-attachments/assets/a16ff4be-3222-4d32-abdf-ee61bbf11b81" />
<img width="3836" height="2022" alt="image" src="https://github.com/user-attachments/assets/8e074937-663b-48f6-91a6-3721366f5a80" />
