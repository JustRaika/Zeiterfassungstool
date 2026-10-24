# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Das Team von Fourcast, einem kleinen Unternehmen bzw. Startup. Alle Mitglieder nutzen das Tool intern, überwiegend am Laptop während der Arbeit; das Handy ist die Ausnahme. Eine Person (Nika, GitHub `JustRaika`) ist Admin und pflegt Tags und Zugänge.

## Product Purpose

Gemeinsame Zeiterfassung, Kalender und Aufgabenboard für das Team, als Ersatz für eine Excel-Tabelle. Fourcast entwickelt (Spiele-)Projekte als Hobby. Die Zeiten werden erfasst, damit ein möglicher späterer Erlös gerecht aufgeteilt werden kann; im Alltag spielen sie kaum eine Rolle. Es ist ausdrücklich **kein Wettbewerb**, wer am meisten Zeit investiert. Stunden sind nicht gleich Ergebnis (12 h Concept Art können ein Bild sein, 2 h Bugfixing fünf Fixes), deshalb zeigt die Übersicht, wer **woran** gearbeitet hat, nicht wer vorne liegt. Erfolg heißt, dass Zeit schnell und vollständig erfasst wird und alle jederzeit ein ehrliches Bild haben.

## Positioning

Ein schlankes, selbst gebautes Teamwerkzeug statt eines generischen SaaS-Produkts: genau auf die Abläufe von Fourcast zugeschnitten, ohne Lizenzkosten, ohne Ballast.

## Operating Context

- Login mit dem eigenen GitHub-Konto; nur freigeschaltete Mitglieder kommen hinein.
- Typischer Ablauf: Timer starten, arbeiten, Timer stoppen und Eintrag speichern (der Timer läuft weiter, auch wenn der Browser zu ist), oder Stunden und Minuten nachträglich manuell eintragen.
- Jeder Eintrag braucht mindestens einen Tag und einen Kommentar (mind. 3 Zeichen).
- Backup: In der Übersicht Zeitraum „Alles“ wählen, als CSV exportieren und in Google Drive ablegen.

## Capabilities and Constraints

- **Erfassen:** Start/Stop-Timer oder manuelle Eingabe, Tags (mehrere möglich), Pflichtkommentar, letzte eigene Einträge.
- **Übersicht:** alle Einträge als Tabelle, filterbar nach Zeitraum, Person und Tag; Anteile pro Person; Zeit nach Tags; CSV-Export.
- **Kalender:** gemeinsame Termine in Monats-, Wochen- und Listenansicht; neue Termine per Klick auf einen Tag, verschieben per Drag & Drop.
- **Tasks:** Kanban-Board und Listenansicht; Kategorien code, design, admin, testing (Pflicht); Bilder anhängen.
- Rechte: Alle sehen alle Einträge; ändern und löschen dürfen nur die eigenen, der Admin darf alle.
- Technik: Statische Seite (HTML, CSS, JavaScript ohne Build-Schritt) auf GitHub Pages; Daten, Login und Bild-Speicher über Supabase. Ohne Zugangsdaten in `js/config.js` läuft lokal ein Demo-Modus mit Beispieldaten. Diese Einfachheit (kein Build, kein Framework) ist gewollt.
- Sprache der Oberfläche: Deutsch.

## Brand Commitments

- Name: „Fourcast Zeiterfassung“, Wortmarke „Fourcast“; Logo unter `img/logo.png`, eigener Cursor unter `img/cursor.png`.
- Tonfall in der App: locker, aber sachlich. Freundlich und klar; Witze und Augenzwinkern bleiben eher im README.
- Das Logo-Wesen (dunkles, gezeichnetes Wesen mit grossen Augen) ist das Maskottchen und darf an ausgewählten Stellen auftauchen (leere Zustände, Erfolg, laufender Timer). Weitere Posen/Ausdrücke müsste das Team selbst zeichnen; nicht erfinden.
- Der Pastell-Verlauf (inkl. Leuchten) gehört ausschliesslich den Meilensteinen und wird nirgends sonst verwendet. Der laufende Timer hat einen fliessenden Blau-Verlauf rund um die Akzentfarbe; Reiter und Knöpfe bleiben im einfarbigen Standard-Blau.
- Gemischte Sprache auf dem Board (Backlog, To Do) ist gewollt.

## Evidence on Hand

- Echte Funktionen und Texte im Code (`index.html`, `js/`), Screenshots im README.
- Keine Kundenstimmen, Kennzahlen oder externen Belege; nichts davon erfinden.

## Product Principles

1. **Erfassen muss schneller sein als Vergessen.** Der Weg vom Arbeitsbeginn zum gespeicherten Eintrag ist so kurz wie möglich.
2. **Fairness durch Transparenz, ohne Rangliste.** Alle sehen dieselben Zahlen; die Übersicht erklärt die Verteilung ehrlich, in fester Reihenfolge und mit dem Fokus auf Art des Beitrags statt Menge.
3. **Eigene Daten schützen, fremde respektieren.** Klar erkennbar, was man selbst ändern darf und was nicht.
4. **Einfach bleiben.** Kein Build, kein Framework, keine Funktion, die das Team nicht wirklich braucht.
