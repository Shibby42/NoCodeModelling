# ISG-virtuos CloudConnect — UI & Styling Guide

Dieses Dokument definiert das Farbschema, die Typografie und die UI-Komponentenrichtlinien für das CloudConnect-Ökosystem basierend auf dem ISG Corporate Design.

---

## 1. Markenidentität & Kernfarben (Palette)

| Token / Rolle | Hex-Code | Verwendung |
| :--- | :--- | :--- |
| **ISG Cyan (Primary)** | `#009FE3` | Markenfarbe, Logo, primäre Akzente, Active States, Slider-Track |
| **ISG Cyan Dark** | `#007BB0` | Hover-State für Buttons, dunklere Cyan-Elemente |
| **Dark Navy (Canvas Dark)** | `#071526` | Deep Background im Online-Dashboard |
| **Card Navy (Surface Dark)** | `#0B1E38` | Container- und Card-Hintergründe im Online-Dashboard |
| **Border Dark Blue** | `#1C355E` | Subtile Umrandungen und Trennlinien im Dashboard |
| **Light Canvas (Background Light)** | `#F8FAFC` | Hintergrund der Desktop-Applikation |
| **Card / Surface Light** | `#FFFFFF` | Formular-Container, Karten und Tabellenhintergrund Desktop |
| **Border Light Gray** | `#D1D5DB` | Trennlinien und Input-Rahmen Desktop |
| **Status Green (Online)** | `#10B981` | Live-Indikator, verbundener Status |
| **Status Red (Offline / Danger)** | `#EF4444` | Fehler, Disconnected, Destructive Actions |

---

## 2. Online Web-Dashboard (Dark Theme)

Das Web-Dashboard folgt der Optik von **Robotmonitor Online** (Screenshot 1 & 2): Ein technisches, tiefblau-dunkles UI mit klaren Kontrasten und minimalem Glühen/Akzenten in ISG Cyan.

### 2.1 Farbanwendung
* **Hintergrund (`body`):** `#071526` (Dunkles Nachtblau / Navy)
* **Karten / Cards (`surface`):** `#0B1E38`
* **Card Borders:** `1px solid #1C355E`
* **Text primär:** `#FFFFFF` (Titel, Status-Texte)
* **Text sekundär:** `#94A3B8` (Beschreibungen, Zeitstempel, Meta-Info)
* **Text gedämpft / Labels:** `#64748B`

### 2.2 Komponenten
* **Header / Branding:**
  * Subline: Kleiner Uppercase-Text `#009FE3`, z. B. `ISG CLOUDCONNECT`.
  * Haupttitel: Weiß, fett (`font-weight: 700`), große Schrift (z. B. 28px–32px).
* **Cards & Container:**
  * Abgerundete Ecken: `border-radius: 8px` bis `12px`.
  * Innenabstand: `padding: 24px`.
  * Kein Schlagschatten, sondern feine Kontur: `border: 1px solid #1C355E`.
* **Badges (Online / Offline Status):**
  * Grüner leuchtender Punkt (`#10B981`) links neben Uppercase-Label `ONLINE`.
  * Roter/Grauer Punkt (`#EF4444` / `#64748B`) für `OFFLINE`.
* **Buttons:**
  * **Sekundär / Outlined:** Hintergrund transparent oder `#0B1E38`, Border `1px solid #1C355E`, Text weiß. Hover: Border `#009FE3`, Text `#009FE3`.
  * **Primär:** Hintergrund `#009FE3`, Text `#FFFFFF`, Hover `#007BB0`.
  * **Destruktiv / Löschen:** Text `#EF4444` oder softer Rot-Ton, Border `#7F1D1D`.
* **Interaktiver Slider (Signal Control $[-1.0, 1.0]$):**
  * Track-Hintergrund: `#1C355E`.
  * Active Track (Füllung ab 0.0): `#009FE3`.
  * Daumen (Thumb): Weiß (`#FFFFFF`) mit leichtem Schatten oder Cyan-Rahmen.
  * Wertanzeige: Monospace-Schriftart (`Roboto Mono`, `Consolas`), Farbe `#009FE3`.

---

## 3. Windows Desktop App (Light Theme)

Die Windows-App orientiert sich an der hellen ISG-Dokumentations- und Engineering-Welt (Screenshot 3 & 4): Sauber, hochgradig lesbar, reduziertes Grau/Weiß mit gezielten **ISG Cyan (`#009FE3`)** Akzenten.

### 3.1 Farbanwendung
* **Hintergrund (Window):** `#F3F4F6` bis `#F8FAFC`.
* **Panels / Signal Grid Canvas:** `#FFFFFF`.
* **Trennlinien & Grenzen:** `#E2E8F0` bis `#CBD5E1`.
* **Text primär:** `#0F172A` (Fast Schwarz für maximale Lesbarkeit).
* **Text sekundär:** `#475569` (Hilfetexte, Einheiten).
* **Akzentfarbe / Selektion:** `#009FE3`.

### 3.2 Komponenten & Layout
* **Header / Titelleiste:**
  * Weißes Banner mit ISG-Logo (`#009FE3`-Kachel mit weißer Schrift).
  * App-Titel: `ISG-virtuos CloudConnect Client`.
* **Eingabeformulare & Inputs:**
  * Flaches Design (Flat Style, kein 3D-Look älterer Windows-Versionen).
  * Hintergrund: `#FFFFFF`, Border: `1px solid #CBD5E1`, Radius: `4px` bis `6px`.
  * Fokus: Border-Farbe springt auf `#009FE3` mit dezentem Focus-Ring.
* **Signaltabelle (Grid):**
  * Header: Heller Grauton (`#F1F5F9`), Schriftart fett, 12px, Text `#334155`.
  * Zeilen: Wechsellose Zeilen mit subtiler Trennlinie (`#E2E8F0`), Hover-Zeile leicht abgetönt (`#F8FAFC`).
  * Pfade: Monospace dargestellt (`[Blockdiagram].[Robot1].[Axis1]`).
  * Typen-Dropdown: Schlichtes System-Dropdown mit Werten `Double`, `Bool`, `String`.
* **Live Testwert-Display (vom Dashboard empfangen):**
  * Display-Box: Abgesetztes Panel (`#E0F2FE`, sehr helles Cyan/Blau) mit Rahmen `#009FE3`.
  * Große numerische Wertanzeige: z. B. `+0.45` in `#007BB0`, gut sichtbar aus der Distanz.

---

## 4. Typografie & UI-Konventionen

* **Schriftfamilie (Web & Desktop):**
  * Primär: Inter, Segoe UI, Roboto oder systematisches San-Serif.
  * Monospace (Signalpfade, JSON, Zahlenwerte): Consolas, Cascadia Code, JetBrains Mono.
* **Hierarchie:**
  * H1 / Page Header: 24–30px, Semibold bis Bold.
  * H2 / Section Header: 16–20px, Bold.
  * Body: 14px, Regular.
  * Labels / Metadaten: 11–12px, Uppercase mit `letter-spacing: 0.05em`.
