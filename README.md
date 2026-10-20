# Zeiterfassungstool
Ein Excel on crack für Fourcast ⏱️

Zeiterfassung und gemeinsamer Kalender für das Fourcast-Team. Die Seite läuft auf
GitHub Pages, die Daten liegen in einer kostenlosen [Supabase](https://supabase.com)-Datenbank.
Login mit dem eigenen GitHub-Account.

**Funktionen**
- **Erfassen:** Start/Stop-Timer (läuft auch weiter, wenn der Browser zu ist) oder Stunden + Minuten
  manuell eintragen. Dazu Tags (mehrere möglich) und ein optionaler Kommentar.
- **Übersicht:** alle Einträge als Tabelle, filterbar nach Zeitraum, Person und Tag.
  **Anteile in Prozent pro Person** (Grundlage für eine spätere Auszahlung), Zeit nach Tags, CSV-Export für Excel.
- **Kalender:** gemeinsame Termine (Monat / Woche / Liste). Neue Termine per Klick auf einen Tag,
  verschieben per Drag & Drop.

Jede Person kann nur ihre **eigenen** Zeiteinträge ändern oder löschen. Sehen können alle alles.

---

## Lokal anschauen (Demo-Modus)

Solange in `js/config.js` nichts eingetragen ist, läuft die App mit Beispieldaten, die nur im
eigenen Browser gespeichert werden. Oben rechts kann man zwischen Demo-Personen wechseln.

Weil die Seite JavaScript-Module nutzt, muss sie über einen kleinen lokalen Server laufen.
Ein Doppelklick auf `index.html` reicht nicht. Zum Beispiel im Projektordner:

```bash
npx serve -l 8000
```

Danach http://localhost:8000 öffnen.

---

## Einrichtung (einmalig, ca. 20 Minuten)

Das macht **eine Person** aus dem Team. Die Schritte 1–5 passieren auf supabase.com und github.com.

### 1. Supabase-Projekt anlegen
1. Auf [supabase.com](https://supabase.com) → **Start your project** → mit GitHub anmelden.
2. **New project**:
   - Name: `fourcast-zeiterfassung`
   - Database Password: auf **Generate** klicken und das Passwort irgendwo sicher ablegen.
     Ihr braucht es im Alltag nicht.
   - Region: **Central EU (Frankfurt)**
   - Plan: **Free**
3. Ca. 2 Minuten warten, bis das Projekt bereit ist.

### 2. Datenbank-Tabellen anlegen
1. In `supabase/schema.sql` ganz unten bei **TEAM** die 5 GitHub-Usernamen (genau wie auf github.com)
   und eure Anzeigenamen eintragen.
2. In Supabase links **SQL Editor** öffnen → **New query**.
3. Den kompletten Inhalt von `supabase/schema.sql` einfügen → **Run**.
   Unten sollte „Success. No rows returned“ stehen.

Unter **Table Editor** seht ihr jetzt die Tabellen `members`, `tags`, `time_entries` und `events`.

> Später jemanden hinzufügen oder einen Namen ändern: **Table Editor → members** → Zeile bearbeiten
> oder **Insert row**. Das Script kann man auch gefahrlos nochmal ausführen.

### 3. Login mit GitHub einrichten
Supabase braucht eine „OAuth App“ auf GitHub, damit „Mit GitHub anmelden“ funktioniert.

1. In Supabase: **Authentication → Sign In / Providers → GitHub** öffnen.
   Dort die **Callback URL** kopieren. Sie sieht so aus: `https://xxxxxxxx.supabase.co/auth/v1/callback`
2. Auf GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**
   (direkt: https://github.com/settings/applications/new)
   - Application name: `Fourcast Zeiterfassung`
   - Homepage URL: `https://justraika.github.io/Zeiterfassungstool/`
   - Authorization callback URL: die kopierte Callback URL aus Supabase
   - → **Register application**
3. Auf der neuen Seite die **Client ID** kopieren und auf **Generate a new client secret** klicken.
   Das Secret wird nur einmal angezeigt, also sofort kopieren.
4. Zurück in Supabase (GitHub-Provider): **Enable** einschalten, Client ID und Client Secret
   einfügen → **Save**.

### 4. Adresse der Seite in Supabase eintragen
In Supabase: **Authentication → URL Configuration**
- **Site URL:** `https://justraika.github.io/Zeiterfassungstool/`
- **Redirect URLs** → **Add URL**:
  - `https://justraika.github.io/Zeiterfassungstool/`
  - `http://localhost:8000/` (optional, zum lokalen Testen)

### 5. Zugangsdaten in die App eintragen
1. In Supabase: **Project Settings → API Keys** (bzw. oben auf **Connect**).
2. Die **Project URL** und den **publishable key** (beginnt mit `sb_publishable_`) kopieren.
   Bei älteren Projekten heisst er **anon public** (unter „Legacy API Keys“).
   Den **secret** / **service_role** Key **niemals** verwenden!
3. In `js/config.js` eintragen:
   ```js
   export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
   export const SUPABASE_ANON_KEY = 'sb_publishable_...';
   ```
   Dieser Key darf öffentlich im Repo stehen. Die Daten schützen die Regeln in `schema.sql`.

### 6. Auf GitHub Pages veröffentlichen
1. In **GitHub Desktop** die Änderungen committen und pushen. Den Branch dann in `main` mergen,
   z. B. über einen Pull Request auf github.com.
2. Auf github.com im Repo: **Settings → Pages**
   - Source: **Deploy from a branch**
   - Branch: **main**, Ordner **/ (root)** → **Save**
3. Nach 1–2 Minuten ist die Seite erreichbar unter
   **https://justraika.github.io/Zeiterfassungstool/**

### 7. Testen
- [ ] Seite öffnen → „Mit GitHub anmelden“ → ihr landet in der App mit eurem Namen oben rechts.
- [ ] Eine Zeit eintragen, Timer starten und stoppen.
- [ ] Eine zweite Person meldet sich an: Sie sieht euren Eintrag in der Übersicht,
      aber ohne „Bearbeiten“/„Löschen“.
- [ ] Ein GitHub-Account, der nicht in `members` steht, bekommt „nicht im Team eingetragen“.
- [ ] Termin im Kalender anlegen → alle sehen ihn.

---

## Gut zu wissen
- **Supabase Free pausiert Projekte nach 7 Tagen ohne Nutzung.** Damit das nicht passiert, ruft der
  GitHub-Workflow `.github/workflows/keep-alive.yml` jeden Montag und Donnerstag die Funktion
  `keep_alive()` in der Datenbank auf. Sie liest keine Daten und ändert nichts.
  - Ob er läuft: im Repo unter **Actions → Supabase wach halten**. Dort kann man ihn mit
    **Run workflow** auch von Hand starten.
  - GitHub schaltet zeitgesteuerte Workflows in öffentlichen Repos ab, wenn 60 Tage lang niemand
    etwas committet. Vorher kommt eine Mail. Dann unter **Actions** auf **Enable workflow** klicken.
  - Falls das Projekt doch einmal pausiert: im Supabase-Dashboard auf **Restore** klicken.
    Die Daten bleiben erhalten.
- **Backup:** In der Übersicht Zeitraum „Alles“ wählen → **CSV exportieren**. Oder in Supabase
  im **Table Editor** → `time_entries` → **Export to CSV**.
- **Tags** können in der App nicht selbst angelegt werden, damit die Liste übersichtlich bleibt.
  Neue Tags legt Nika im Supabase **Table Editor** an: Tabelle `tags` → **Insert row** → Name und
  Farbe (z. B. `#8ec5ff`). Umbenennen oder löschen geht dort auch, bestehende Einträge behalten
  dabei aber ihren alten Tag-Namen.
- **Farben und Namen** der Personen stehen in der Tabelle `members` und lassen sich dort ändern.

## Aufbau
```
index.html            Seite mit Login und den drei Tabs
css/style.css         Aussehen (hell/dunkel, auch fürs Handy)
js/config.js          Supabase-Zugangsdaten (leer = Demo-Modus)
js/db.js              Datenzugriff (Supabase + Demo)
js/app.js             Login, Tabs, gemeinsame Daten
js/erfassen.js        Timer, Formular, eigene Einträge
js/uebersicht.js      Tabelle, Filter, Anteile, CSV
js/kalender.js        Kalender (FullCalendar)
js/util.js            kleine Helfer (Formatierung etc.)
supabase/schema.sql   Datenbank-Tabellen + Zugriffsregeln
```
Keine Installation, kein Build: einfach Dateien ändern, pushen, fertig.
