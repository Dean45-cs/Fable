# ⚡ IchApp – Deine persönliche Schaltzentrale

Eine App, mit der du dein komplettes Leben trackst und deine Fortschritte siehst.
Morgens draufschauen – und du weißt sofort, wo du stehst.

![Dunkel, modern, motivierend](https://img.shields.io/badge/Design-dunkel%20%26%20modern-7c6cff)
![Keine Installation](https://img.shields.io/badge/Setup-keine%20Installation-2dd4a7)
![Daten lokal](https://img.shields.io/badge/Daten-100%25%20lokal-38bdf8)

## 🚀 So startest du die App

**Es gibt nichts zu installieren.** Einfach:

1. Diesen Ordner herunterladen (oder das Repo klonen)
2. Die Datei **`index.html`** doppelklicken → öffnet sich im Browser
3. Fertig. Die App läuft komplett offline.

> Tipp fürs Handy: Seite im Browser öffnen → „Zum Startbildschirm hinzufügen" → fühlt sich an wie eine echte App.

## 📱 Was die App kann

| Modul | Was du trackst |
|---|---|
| 🏠 **Dashboard** | Dein Morgen-Überblick: Kalorien, Wasser, Schlaf, Habits, Ziele, Kontostand, Stimmung, **anstehende Deadlines** und dein **Wochen-Review** – alles auf einen Blick. Plus Schnellaktionen und täglicher Motivationsspruch. |
| 💪 **Gym** | Workouts mit Übungen, Sätzen & Gewichten, „Letztes wiederholen" als Vorlage, **Übungs-Fortschritt pro Übung** mit geschätztem 1RM, Körpergewicht & Maße, Trainingsvolumen und automatische **persönliche Rekorde**. |
| 🏃 **Laufen** | **Knopf drücken, loslaufen**: Live-GPS-Tracking mit Distanz, Pace und Zeit. **Routen vorab auf der Karte planen** (OpenStreetMap), Kilometer-Splits, Wochen-Kilometer und **GPX-Import für Apple-Watch-Workouts** (siehe unten). |
| 🎯 **Ziele** | Kurz- und langfristige Ziele mit messbarem Fortschritt, **Meilenstein-Checklisten**, Deadlines mit Countdown und Erfolgsquote. |
| 💶 **Finanzen** | Kontostand, Einnahmen & Ausgaben, Monatsbudget, Kategorien-Auswertung mit **Monatsfilter**, Buchungen bearbeiten. Mit **Revolut-CSV-Import** (siehe unten). |
| 🍎 **Ernährung** | Kalorien, Protein und Wasser mit Tageszielen, **eigene ⭐ Favoriten**, rückwirkend eintragen per Tages-Navigation und 7-Tage-Charts. |
| 😴 **Schlaf** | Einschlaf-/Aufwachzeit, Dauer, Qualität und **Ø Bettzeit** – mit 14-Nächte-Übersicht. |
| 🔁 **Habits** | Tägliche Gewohnheiten abhaken, **Streaks** 🔥, Erfolgsquote & Rekord pro Habit, **perfekte Tage** und 16-Wochen-Heatmap. |
| 📓 **Tagebuch** | Einträge mit Stimmung (😞–🤩), Highlight, **Dankbarkeit**, Volltextsuche und „Vor einem Monat"-Rückblick. |
| 🎓 **Ausbildung** | Lernthemen mit Fortschritt, **Lernzeit-Tracking** mit Wochen-Chart, durchsuchbare Notizen, Projekte und Prüfungen mit Notenschnitt. |
| 📂 **Obsidian** | Verbindet deinen lokalen **Obsidian-Schulordner** (.md-Dateien): Volltextsuche nach **Themen, Lernfeldern & Lehrern**, Tag-Filter, schöne Markdown-Anzeige inkl. [[Wikilinks]] und Bearbeiten direkt in der App. |
| 🤖 **KI-Coach** | Ein KI-Agent (Claude), der **einmal über alles rübergeht**: Komplett-Analyse mit konkreten Empfehlungen, automatische **Kategorisierung deiner Finanzbuchungen** und Auswertung deiner Schulnotizen inkl. **Lernplan**. |

### ⚡ Level-System

Für alles, was dich weiterbringt, gibt's XP: Workouts (+50), Tagebuch (+20), Habits (+8),
Ernährungstage (+12), erreichte Ziele (+150) … Dein Level siehst du oben rechts –
vom **Frischling** bis zur **Legende**.

## 💳 Revolut anbinden

Revolut bietet für Privatkonten keine offene Schnittstelle – aber der CSV-Export geht in 30 Sekunden:

1. Revolut-App öffnen → **Konto → Auszug/Kontoauszug → Excel (CSV)** exportieren
2. In der IchApp: **Finanzen → 📥 Revolut-CSV importieren**
3. Buchungen werden automatisch kategorisiert (REWE → Lebensmittel, Spotify → Abos, …),
   Duplikate übersprungen und dein Kontostand aktualisiert

Alternativ kannst du den Kontostand auch einfach manuell setzen – neue Buchungen rechnen ihn automatisch weiter.

## 🏃 Laufen & Apple Watch

- **Live-Tracking:** Auf 🏃 Laufen → großer **START**-Knopf → Handy einstecken und loslaufen. Distanz, Pace und Zeit kommen live per GPS. (Browser-Regel: GPS funktioniert nur über HTTPS oder localhost.)
- **Routen planen:** „🗺️ Route planen" öffnet eine OpenStreetMap-Karte – Wegpunkte antippen, Distanz wird live berechnet, Route speichern und beim Start auswählen.
- **Apple Watch:** Webseiten dürfen nicht direkt auf Apple Health zugreifen. Der einfache Weg: Lauf mit der **Watch-Trainings-App** aufzeichnen → auf dem iPhone mit **HealthFit** oder **RunGap** (oder via Strava) als **GPX** exportieren → in der App über „📥 GPX importieren" einlesen. Splits & Pace werden automatisch berechnet. Eigene Läufe kannst du ebenfalls als GPX exportieren.

## 📂 Obsidian verbinden

Auf **📂 Obsidian** → „Ordner wählen" → deinen Vault auswählen (Chrome/Edge). Die App liest alle .md-Dateien direkt von deinem PC – **nichts wird hochgeladen**. Danach: Volltextsuche über alle Notizen (z. B. nach einem Lernfeld oder Lehrer), Tag-Filter, gerenderte Markdown-Ansicht mit klickbaren [[Wikilinks]] und #Tags, und Bearbeiten mit Speichern zurück in den Ordner. Der Ordner wird gemerkt – beim nächsten Besuch reicht ein Klick auf „Wieder öffnen".

## 🤖 KI-Coach einrichten

1. Auf **console.anthropic.com** ein Konto anlegen und einen API-Key erstellen (beginnt mit `sk-ant-…`)
2. In der App unter **🤖 KI-Coach** den Key einfügen – er wird nur lokal gespeichert und landet **nicht** im Backup
3. Drei Aktionen: **Komplett-Analyse** (geht über alle deine Daten und gibt konkrete Wochen-Empfehlungen), **Finanzen kategorisieren** (sortiert „Sonstiges"-Buchungen automatisch ein) und **Schul-Coach** (kategorisiert deine Obsidian-Notizen nach Lernfeldern, findet Lücken und baut einen 2-Wochen-Lernplan)

Eine Analyse kostet nur wenige Cent. Beim Ausführen werden die jeweiligen Daten an die Claude-API gesendet – sonst verlässt nichts dein Gerät.

## 🔒 Deine Daten

- Alles wird **nur lokal in deinem Browser** gespeichert (localStorage) – nichts verlässt dein Gerät
- Backup: **Einstellungen → ⬇️ Backup herunterladen** (JSON-Datei)
- Wiederherstellen: **Einstellungen → ⬆️ Backup einspielen**
- ⚠️ Wichtig: Wenn du im Browser „Website-Daten löschen" auswählst, sind die Daten weg – mach also regelmäßig ein Backup!

## ⚙️ Einstellungen

Unter **⚙️ Einstellungen** passt du alles an dich an: Kalorien-, Protein-, Wasser- und Schlafziel,
Workouts pro Woche, Zielgewicht und dein Monatsbudget.

## 🛠️ Technik

- Pures HTML, CSS und JavaScript – **keine Abhängigkeiten, kein Build, kein Server**
- Eigene, leichte SVG-Charts
- Responsive: Desktop (Sidebar) und Handy (Bottom-Navigation)

---

*„Disziplin schlägt Motivation. Jeden. Einzelnen. Tag."* ⚡
