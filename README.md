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
| 🏠 **Dashboard** | Dein Morgen-Überblick: Kalorien, Wasser, Schlaf, Habits, Ziele, Kontostand, Stimmung – alles auf einen Blick. Plus Schnellaktionen und ein täglicher Motivationsspruch. |
| 💪 **Gym** | Workouts mit Übungen, Sätzen & Gewichten. Körpergewicht mit Verlaufskurve, Körpermaße, Trainingsvolumen pro Woche und automatische **persönliche Rekorde**. |
| 🎯 **Ziele** | Kurz- und langfristige Ziele mit messbarem Fortschritt, Deadlines mit Countdown und Erfolgsquote. |
| 💶 **Finanzen** | Kontostand, Einnahmen & Ausgaben, Monatsbudget, Ausgaben nach Kategorie und Monatsvergleich. Mit **Revolut-CSV-Import** (siehe unten). |
| 🍎 **Ernährung** | Kalorien, Protein und Wasser mit Tageszielen, Schnellauswahl für typische Lebensmittel und 7-Tage-Charts. |
| 😴 **Schlaf** | Einschlaf-/Aufwachzeit, Dauer und Qualität – mit 14-Nächte-Übersicht. |
| 🔁 **Habits** | Tägliche Gewohnheiten abhaken, **Streaks** 🔥 aufbauen und deine Konstanz auf einer 16-Wochen-Heatmap sehen. |
| 📓 **Tagebuch** | Kurze Einträge mit Stimmung (😞–🤩), Highlight des Tages und Stimmungsverlauf über 30 Tage. |
| 🎓 **Ausbildung** | Lernthemen mit Fortschritt, Notizen aus Berufsschule & Betrieb, Projekte und Prüfungen mit Notenschnitt. |

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
