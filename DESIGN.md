---
name: Fourcast Zeiterfassung
description: Zeiterfassung, Kalender und Tasks für ein kleines Hobby-Game-Studio. Dunkel, ruhig, mit einem Maskottchen, das zuschaut.
colors:
  polarlicht-blau: "#8ec5ff"
  polarlicht-tief: "#5b8def"
  polarlicht-hell: "#c2e0ff"
  nachtgrund: "#131318"
  werkbank: "#1c1c23"
  ablage: "#26262f"
  naht: "#33333e"
  kreide: "#ececf1"
  schnee: "#ffffff"
  staub: "#9a9aa7"
  schleier: "rgb(0 0 0 / 0.4)"
  schleier-dicht: "rgb(0 0 0 / 0.6)"
  signalrot: "#f06a7e"
  pausengelb: "#f5df8a"
  demo-bernstein: "#f0a202"
  kategorie-design: "#e879f9"
  kategorie-code: "#4169e1"
  kategorie-admin: "#cbd5e1"
  kategorie-testing: "#a3e635"
  meilenstein-rose: "#f5a9cb"
  meilenstein-flieder: "#c4a7f5"
  meilenstein-mint: "#a8f0d8"
typography:
  wordmark:
    fontFamily: "Unbounded, system-ui, sans-serif"
    fontWeight: 600
    letterSpacing: "-0.02em"
  display:
    fontFamily: "Unbounded, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.25
  headline:
    fontFamily: "Unbounded, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 500
    lineHeight: 1.25
  title:
    fontFamily: "Unbounded, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  timer:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "2.6rem"
    fontWeight: 600
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 500
  chip:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 500
  micro:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
rounded:
  hair: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  field: "14px"
  lg: "16px"
  card: "20px"
  page: "24px"
components:
  button-primary:
    backgroundColor: "{colors.polarlicht-blau}"
    textColor: "{colors.nachtgrund}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.ablage}"
    textColor: "{colors.kreide}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-ghost:
    textColor: "{colors.kreide}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-danger:
    textColor: "{colors.signalrot}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  input:
    backgroundColor: "{colors.werkbank}"
    textColor: "{colors.kreide}"
    rounded: "{rounded.sm}"
    padding: "8px 10px"
    height: "40px"
  card:
    backgroundColor: "{colors.werkbank}"
    rounded: "{rounded.md}"
    padding: "20px"
  chip:
    textColor: "{colors.kreide}"
    typography: "{typography.chip}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  nav-tab:
    textColor: "{colors.kreide}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  nav-tab-active:
    backgroundColor: "{colors.polarlicht-blau}"
    textColor: "{colors.nachtgrund}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  kanban-card:
    backgroundColor: "{colors.ablage}"
    rounded: "{rounded.sm}"
    padding: "10px"
---

# Design System: Fourcast Zeiterfassung

## Overview

**Creative North Star: "Die Werkstatt bei Nacht"**

Fourcast ist ein dunkler, ruhiger Arbeitsplatz, an dem man abends noch an seinem Spiel bastelt. Die Werkzeuge liegen griffbereit, nichts blinkt und nichts drängt. Das Licht kommt von einer einzigen Stelle, dem Polarlicht-Blau, und es fällt genau dorthin, wo gerade gearbeitet wird: auf den Hauptknopf, den aktiven Reiter und die laufende Zeit. Alles andere bleibt im Halbdunkel der Werkbank.

In der Ecke sitzt das Logo-Wesen, ein gezeichnetes, dunkles Geschöpf mit grossen Augen. Es ist der einzige verspielte Mitbewohner der Werkstatt. Es döst blass, solange nichts läuft, schaukelt wie ein Metronom, wenn der Timer tickt, und taucht bei Meldungen und leeren Listen auf. Mehr Verspieltheit braucht die Oberfläche nicht; Charakter entsteht durch diese wenigen, gezielten Momente und durch präzise Details.

Knöpfe, Karten und Felder sind ruhig und präzise: flache Flächen, feine Nähte statt Schatten, klare Zustände. Die App ist ein Werkzeug für ein Hobbyprojekt, kein Wettbewerb; die Gestaltung vermeidet deshalb alles, was nach Rangliste, Alarm oder Druck aussieht.

**Key Characteristics:**
- Immer dunkel, flach, getragen von Tonstufen statt Schatten.
- Ein einziger Akzent (Polarlicht-Blau) für Hauptaktion und aktuellen Zustand.
- Unbounded nur für Titel und die Wortmarke, alles andere in der Systemschrift.
- Das Maskottchen an wenigen, festen Stellen; eine einzige Dauerbewegung (der laufende Timer).
- Rot bedeutet ausschliesslich Gefahr; Pastell gehört ausschliesslich den Meilensteinen.

## Colors

Eine dunkle, leicht violettstichige Graustufen-Werkbank mit einem kühlen blauen Licht und wenigen, streng zugeteilten Signalfarben.

### Primary
- **Polarlicht-Blau** (#8ec5ff): die eine Lichtquelle. Hauptknöpfe („Speichern“, „Start“, „Stop & eintragen“, „+ Task“), aktiver Reiter, aktive Segment-Schaltfläche, laufende Timer-Zeit, Fokusrahmen, Links und Textvorschläge. Text darauf ist immer Nachtgrund.
- **Polarlicht-Tief** (#5b8def) und **Polarlicht-Hell** (#c2e0ff): nur als Enden des fliessenden Blau-Verlaufs unter dem laufenden Timer.

### Secondary
- **Pausengelb** (#f5df8a): Pausenzeit und Pausen-Stempel im Timer. Nur dort.
- **Demo-Bernstein** (#f0a202): nur als Beimischung (18 %) im Demo-Banner.

### Tertiary
- **Kategoriefarben** für Tasks: Design (#e879f9), Code (#4169e1), Admin (#cbd5e1), Testing (#a3e635). Sie beschriften die Swimlanes und färben den Kategorie-Punkt in der Task-Liste; Karten selbst bleiben neutral.
- **Meilenstein-Pastell** (#f5a9cb → #c4a7f5 → #8ec5ff → #a8f0d8): schillernder Verlauf mit leichtem Leuchten, ausschliesslich für Meilensteine im Kalender und den ★.
- **Tag- und Personenfarben** kommen aus der Datenbank und erscheinen nur als Chip-Tönung, Balken oder Punkt.

### Neutral
- **Nachtgrund** (#131318): Seitenhintergrund und Text auf hellen Flächen.
- **Werkbank** (#1c1c23): Karten, Kopfzeile, Dialoge, Eingabefelder.
- **Ablage** (#26262f): zweite Ebene: sekundäre Knöpfe, Kanban-Karten, Hover-Flächen, leere Balkenspur.
- **Naht** (#33333e): alle Rahmen und Trennlinien, 1px.
- **Kreide** (#ececf1): Haupttext.
- **Schnee** (#ffffff): höchste Betonung: Wortmarke, Reiter beim Überfahren, Text auf Signalrot und auf dunklen Bild-Knöpfen.
- **Schleier** (40 % Schwarz) und **Schleier-dicht** (60 % Schwarz): hinter Dialogen bzw. unter Knöpfen, die auf Bildern liegen.
- **Staub** (#9a9aa7): Nebentext, Beschriftungen, inaktive Chips (Kontrast 6:1 auf Werkbank).
- **Signalrot** (#f06a7e): Löschen, Fehler, Überfälliges, Jetzt-Linie im Kalender.

### Named Rules
**The One Light Rule.** Polarlicht-Blau ist die einzige Lichtquelle. Pro Bereich gibt es höchstens einen blauen Hauptknopf; alles Sekundäre ist Ablage-grau oder nur umrandet.

**The Red Means Danger Rule.** Signalrot steht nur für Löschen, Fehler und Überfälliges. Anlegen, Stoppen oder Hervorheben ist nie rot.

**The Pastel Belongs To Milestones Rule.** Der Pastell-Verlauf und sein Leuchten erscheinen nirgends ausser bei Meilensteinen. Für Bewegung anderswo gibt es den Blau-Verlauf.

## Typography

**Display Font:** Unbounded (mit system-ui)
**Body Font:** Systemschrift (system-ui, -apple-system, Segoe UI, Roboto)

**Character:** Unbounded ist breit, rund und ein bisschen eigenwillig; es trägt die Identität in Titeln und der Wortmarke. Die Systemschrift erledigt den Rest unauffällig und schnell, wie gutes Werkzeug.

### Hierarchy
- **Wortmarke** (Unbounded 600, -0.02em): das Wort „Fourcast“ in Kopfzeile und Login. „Zeiterfassung“ daneben in der Systemschrift 400.
- **Display** (Unbounded 500, 1.5rem, 1.25): Login-Titel.
- **Headline** (Unbounded 500, 1.2rem, 1.25): Dialog-Titel als randloses Eingabefeld. Der Monatstitel im Kalender nutzt dieselbe Grösse in der Systemschrift 600 (mobil 0.95rem).
- **Title** (Unbounded 500, 0.95rem, 1.25, -0.01em): Kartentitel, Spaltenköpfe, Swimlane-Beschriftungen (0.8rem).
- **Timer** (Systemschrift 600, 2.6rem, -0.02em, tabellarische Ziffern): die laufende Zeit, die grösste Zahl der App.
- **Body** (Systemschrift 400, 15px, 1.5): alle Texte.
- **Body klein** (Systemschrift 400, 0.9rem): Tabellen, Balkenzeilen, Termin-Liste, Meldungen, Kalender.
- **Label** (Systemschrift 500, 0.85rem, Staub): Feldbeschriftungen, Legenden, Statistiken.
- **Chip** (Systemschrift 500, 0.8rem): Tags, Filter-Chips.
- **Micro** (Systemschrift 600, 0.75rem): Prioritäten und Kanban-Abzeichen, Admin-Abzeichen, Tasten-Hinweise.

### Named Rules
**The Unbounded Is For Names Rule.** Unbounded nur für Titel, Spalten- und Swimlane-Namen und die Wortmarke. Nie für Fliesstext, Zahlen oder Knöpfe.

**The Tabular Numbers Rule.** Alle Zeiten, Dauern und Summen nutzen tabellarische Ziffern, damit nichts springt, wenn der Timer läuft.

## Layout

Ein zentrierter Arbeitsbereich (max. 1100px, 24px Rand) unter einer klebenden Kopfzeile mit Wortmarke links, Reitern mittig und Person rechts. Jede Ansicht ist eine senkrechte Folge von Karten mit 16px Abstand. Erfassen teilt sich in Timer (300px) und Formular; die Übersicht stellt zwei Karten nebeneinander; der Kalender hat rechts eine 280px-Spalte „Nächste Termine“. Das Kanban ist ein Raster aus vier Status-Spalten (je min. 220px) mal Kategorie-Zeilen, getrennt durch beschriftete Farblinien.

Abstände folgen einem 4px-Raster (4, 8, 12, 16, 20, 24); Formularfelder stehen 14px auseinander, Fehlermeldungen und Vorschläge rücken mit -8px an ihr Feld heran.

Responsiv: unter 1000px wandern die Reiter in eine eigene Zeile, der Kalender wird einspaltig und das Board wischt seitlich (Spalten bis 80vw, Einrasten). Unter 800px werden alle Zweispalter einspaltig, unter 640px schrumpfen Ränder auf 16px.

## Elevation & Depth

Die Werkstatt ist flach. Es gibt keine Schatten zur Erhöhung (`--shadow: none`); Tiefe entsteht nur durch Tonstufen: Nachtgrund → Werkbank → Ablage, jeweils mit einer 1px-Naht abgesetzt. Dialoge liegen über einem 40 % schwarzen Schleier.

Die einzigen Schatten sind Funktionen, keine Höhen: die 3px-Einfügemarke in Polarlicht-Blau beim Ziehen von Karten und das Leuchten der Meilensteine.

### Named Rules
**The Flat Workbench Rule.** Flächen heben sich durch Ton und Naht ab, nie durch Schatten. Ein neuer Schatten braucht eine Funktion (Zustand, Einfügemarke), keine Dekoration.

## Shapes

Weiche, aber nicht verspielte Ecken in drei Stufen: 12px für Karten und Dialoge, 8px für Knöpfe (auch Text-Knöpfe), Felder, Kanban-Karten und Meldungen, 4px für Codeschnipsel und Tasten-Hinweise. Haarlinien (Swimlane-Linien, Fokus um Link-Knöpfe) runden mit 2px. Alles, was man an- und abwählt oder was einen Zustand trägt (Reiter, Chips, Prioritäten, Admin-Abzeichen, Balken), ist eine Pille (999px). Punkte für Personen und Kategorien sind 10px-Kreise. Seitenstreifen an Karten gibt es nicht.

## Components

### Buttons
Ruhig und präzise: flach, 8px Rundung, Systemschrift 500.
- **Shape:** sanft gerundet (8px), Polsterung 8px 16px; klein 4px 10px bei 0.85rem.
- **Primary:** Polarlicht-Blau mit Nachtgrund-Text. Für die eine Hauptaktion eines Bereichs. „+ Task“ ist eine Primary mit 600 und 8px 20px.
- **Secondary:** Ablage-grau mit Kreide-Text (z. B. Pause, Weiter).
- **Ghost:** transparent mit Naht-Rahmen (Abbrechen, CSV exportieren, Verwerfen).
- **Danger:** transparent mit Signalrot-Rahmen und -Text (Löschen).
- **Text-Knöpfe:** randlos in Staub, beim Überfahren Ablage-Fläche und Kreide (Bearbeiten, Löschen in Listen).
- **Link-Knöpfe:** Polarlicht-Blau, unterstrichen (Kommentar-Vorschläge).
- **Hover / Focus:** Gefüllte Knöpfe werden beim Überfahren heller (+12 %, 0.15s), umrandete bekommen eine Ablage-Fläche, Löschen eine 12 %-Signalrot-Tönung. Fokus ist immer ein 2px-Rahmen in Polarlicht-Blau mit 1px Abstand, auch an Reitern und Text-Knöpfen. Deaktiviert = 50 % Deckkraft.

### Chips
- **Style:** Pille, 0.8rem 500, Tönung der eigenen Farbe: 12 % Fläche und 45 % Rand.
- **State:** abgewählt = transparent mit Naht-Rand und Staub-Text; gewählt = 28 % Fläche mit vollem Farbrand. Einfachauswahl (Spalte, Kategorie, Priorität) nutzt dieselbe Optik mit versteckten Radio-Feldern.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Werkbank auf Nachtgrund.
- **Shadow Strategy:** keine (siehe Elevation & Depth).
- **Border:** 1px Naht.
- **Internal Padding:** 20px (16px auf dem Handy).

### Inputs / Fields
- **Style:** Werkbank-Fläche, 1px Naht, 8px Rundung, einheitlich 40px hoch; Beschriftung darüber in Label-Schrift.
- **Focus:** 2px Polarlicht-Rahmen.
- **Error:** Signalrot-Rand am Feld, Meldung direkt darunter in Signalrot, alle Fehler gleichzeitig.

### Navigation
Pillen-Reiter mittig in der Kopfzeile, Systemschrift 500 in hellem Grau. Hover: Ablage-Fläche und Weiss. Aktiv: Polarlicht-Blau mit Nachtgrund-Text (einfarbig, kein Verlauf). Auf schmalen Bildschirmen füllen die Reiter eine eigene Zeile zu gleichen Teilen.

### Dialoge
Werkbank-Fläche mit Naht und 12px Rundung über einem 40 % schwarzen Schleier, Titel als randloses Eingabefeld in Unbounded. Die Knopfzeile (Speichern, Löschen, Abbrechen) klebt unten mit einer Naht darüber, damit „Speichern“ auch in langen Dialogen sichtbar bleibt. Esc, Abbrechen oder ein Klick daneben schliessen sofort, wenn nichts geändert wurde; sonst fragt der eigene Bestätigungsdialog „Ungespeicherte Änderungen verwerfen?“ („Abbrechen“ vorausgewählt). Löschen fragt immer im selben Bestätigungsdialog nach, nie im Browser-Standard.

### Timer-Karte (Signatur)
Die grösste Zahl der App (2.6rem, tabellarisch). Läuft der Timer, wird die Zeit Polarlicht-Blau, darunter fliesst ein 3px-Blau-Verlauf (Polarlicht-Tief → Polarlicht-Blau → Polarlicht-Hell und zurück, 6s, per transform), und das Maskottchen oben rechts (48px) erwacht und schaukelt (±7°, 2.8s). Pausiert wird die Zeit Staub-grau, Pausen erscheinen in Pausengelb. Ruht der Timer, ist das Maskottchen blass (45 %, leicht entsättigt).

### Maskottchen
Das Logo-Wesen erscheint nur an diesen Stellen: Timer-Karte (48px), vor leeren Zuständen (32px, 70 %) und vor Meldungen ausser Fehlern (24px). Weitere Posen oder Ausdrücke nur, wenn das Team sie zeichnet.

### Kanban
Spalten wirken wie hohe Karten aus Kopf, Zellen und Fuss in Werkbank; dazwischen laufen die Kategorie-Linien (2px, 75 % Deckkraft) mit dem Kategorienamen in Unbounded und Kategoriefarbe. Karten sind Ablage-Flächen mit Naht, 8px, 10px Polsterung; Kopfzeile mit Prioritäts-Pille, Unteraufgaben- und Bilder-Icons, darunter Titel (600), Tags, Zuständige und Fälligkeit (überfällig in Signalrot).

## Do's and Don'ts

### Do:
- **Do** Polarlicht-Blau (#8ec5ff) nur für die Hauptaktion, den aktuellen Zustand und den Fokus verwenden.
- **Do** Tiefe mit den drei Tonstufen (#131318, #1c1c23, #26262f) und 1px-Nähten (#33333e) erzeugen.
- **Do** Unbounded auf Titel, Spalten-, Swimlane-Namen und die Wortmarke beschränken.
- **Do** für Zeiten und Summen tabellarische Ziffern nutzen.
- **Do** Icons als einheitliche Strich-Icons (24er-Raster, Strich 2, runde Enden) zeichnen; der ★ bleibt das einzige Textzeichen, und nur beim Meilenstein.
- **Do** Bewegung für `prefers-reduced-motion` abschalten und Dauerbewegungen nur über `transform` animieren.
- **Do** Personen in fester Reihenfolge (nach Namen) zeigen, wenn Zeiten verglichen werden.

### Don't:
- **Don't** Rot für Anlegen, Stoppen oder Hervorheben verwenden; Signalrot (#f06a7e) heisst Gefahr.
- **Don't** den Meilenstein-Pastellverlauf oder sein Leuchten für irgendetwas anderes als Meilensteine einsetzen.
- **Don't** den aktiven Reiter oder Knöpfe mit Verläufen füllen; der Blau-Verlauf gehört nur dem laufenden Timer.
- **Don't** farbige Seitenstreifen an Karten, Listen oder Meldungen setzen; Kategorie und Person zeigen Punkte, Chips oder Swimlane-Linien.
- **Don't** Schatten zur Erhöhung hinzufügen.
- **Don't** Emojis oder Textzeichen als Icons verwenden.
- **Don't** Ranglisten bauen oder Zeiten nach Menge sortieren.
- **Don't** neue Maskottchen-Posen erfinden; nur gezeichnete Vorlagen des Teams verwenden.
