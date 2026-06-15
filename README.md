# KontaktAtlas

KontaktAtlas ist eine lokale Electron-Desktopsoftware zur Verwaltung von Personen, Beziehungen, Fahrzeugen, Gruppen, Bildern, Quellen und Import-Entwürfen. Die Oberfläche läuft mit React, TypeScript und Vite in einem Electron-Fenster. Daten bleiben lokal in einer 32-Bit-kompatiblen JSON-Datenbank im Ordner `storage/`.

KontaktAtlas ist ausdrücklich **keine** WPF-Anwendung, kein Visual-Studio-Projekt und keine klassische Webanwendung im normalen Browser.

## Installation

```bash
npm install
```

`postinstall` benötigt keine nativen Datenbank-Engines mehr. KontaktAtlas nutzt eine dateibasierte JSON-Datenbank (`storage/kontaktatlas.json`) und läuft deshalb auch mit 32-Bit-Node.js ohne Prisma-, SQLite- oder Node-API-Binaries.

Wenn eine vorherige Installation defekte oder alte Artefakte hinterlassen hat, nutze eine saubere Neuinstallation:

```bash
npm run install:clean
```

### Hinweis zu 32-Bit-Systemen

Das Projekt wurde von Prisma/SQLite auf eine reine Node.js-JSON-Datenhaltung umgestellt. Dadurch entfallen native Query-Engines, Schema-Engines und Architektur-spezifische Datenbank-Binaries. Für Windows-32-Bit-Installer gibt es einen eigenen Build-Befehl:

```bash
npm run build:win32
```

Die JSON-Datenbank schreibt Änderungen atomar über eine temporäre Datei und legt beschädigte Datenbankdateien beim Start als `.invalid-<timestamp>`-Backup ab. Für sehr große Datenmengen ist JSON weniger performant als SQLite; für die lokale Kontaktverwaltung ist die Lösung dafür deutlich robuster auf 32-Bit-Systemen.

## Start im Entwicklungsmodus

```bash
npm run dev
```

Der Befehl startet Vite und Electron mit eigenem Desktopfenster. Der Renderer nutzt keine direkten Node-APIs. Dateisystem, JSON-Datenbank und sichere lokale Operationen laufen im Electron-Main-Prozess und werden über `preload.ts`/IPC bereitgestellt.

## Build für Windows

```bash
npm run build
```

Der Build erstellt die Vite-Ausgabe und ein Electron-Builder-Verzeichnisbuild für die aktuelle Plattform. Für Windows-32-Bit nutze `npm run build:win32`.

## Projektstruktur

```text
kontakt-atlas/
├── electron/               # Electron Main, Preload und IPC
├── src/
│   ├── components/         # Layout und UI-Bausteine
│   ├── pages/              # Dashboard, Personen, Import, Smart-Zuordnung usw.
│   ├── services/           # Parser, Hashing, Vorschläge, Datenqualität
│   ├── types/              # gemeinsame TypeScript-Typen
│   └── styles/             # dunkles UI-Theme
├── storage/
│   ├── images/             # lokale Bilder
│   ├── screenshots/        # lokale Screenshots
│   └── imports/            # lokale Importdateien
└── tests/                  # Vitest-Tests
```

## Import-Assistent

Der Import-Assistent verarbeitet manuell kopierten Profiltext. Nutzer wählen einen Quellentyp, tragen optional einen Profil-Link ein und fügen sichtbaren Profiltext ein. KontaktAtlas besucht den Link nicht, automatisiert keinen Browser und führt kein Crawling durch.

Nach Klick auf **Analysieren** erstellt die App einen `ImportDraft` mit:

- `extractedJson` für erkannte Vorschläge,
- `missingInfoJson` für fehlende Informationen,
- `warningsJson` für Warnungen,
- Status `draft`.

Die App speichert keine erkannten Personen, Beziehungen oder Fahrzeuge endgültig, bevor Nutzer Felder manuell bestätigen.

## Profiltext manuell kopieren und einfügen

Der Parser erkennt typische deutsche Profiltexte, z. B. Namen, Wohnorte, Herkunftsorte, Geburtstage, Rollen, Beziehungen, Gruppen und Fahrzeuge. Jede erkannte Information enthält Feldname, Wert, Sicherheit, Original-Textstelle und optional Warnhinweise.

Sensible Felder sind standardmäßig nicht vorausgewählt:

- Adresse,
- Telefonnummer,
- E-Mail,
- Geburtsdatum,
- Kennzeichen,
- Profilbild.

Kennzeichen werden nie automatisch übernommen. Nutzer müssen sie ausdrücklich bestätigen.

## Smart-Zuordnung

Die Smart-Zuordnung importiert Bilder lokal in `storage/images`, berechnet `sha256Hash` für exakte Duplikate und einen einfachen `perceptualHash` für ähnliche Dateien. Die App erstellt nur neutrale Vorschläge, z. B.:

- „Bild stammt aus demselben Import-Entwurf.“
- „Dateiname enthält den Namen dieser Person.“
- „Bild ist identisch mit einem bereits gespeicherten Bild.“
- „Bild ähnelt einer bereits gespeicherten Datei.“
- „Diese Person hat noch kein Profilbild.“
- „Mögliche Zuordnung prüfen.“

Jede Zuordnung muss manuell bestätigt werden.

## Datenlücken-System

Der `CompletenessService` bewertet Personen, Fahrzeuge und Beziehungen mit einem Score von 0 bis 100. Er meldet fehlende Informationen, Warnungen und nächste Schritte. Dashboard und Detailseiten zeigen Kennzahlen wie Personen ohne Profilbild, Personen ohne Beziehungen, unsichere Beziehungen und offene Bildzuordnungen.

## Datenschutz-Hinweise

KontaktAtlas speichert lokal:

- JSON-Datenbank `storage/kontaktatlas.json`,
- Bilder in `storage/images`,
- Screenshots in `storage/screenshots`,
- Importdateien in `storage/imports`.

Es gibt keine Cloud-Synchronisation, keine automatische externe Datenübertragung und keine versteckte Browser-Aktivität.

## Grenzen der Automatisierung

KontaktAtlas automatisiert keine Plattformen. Es gibt:

- kein automatisches Crawling von Facebook, Instagram oder Websites,
- keinen automatischen Login,
- keinen Captcha-Bypass,
- keine Freundeslisten-Automation,
- kein verstecktes Browsing,
- keine Massenspeicherung.

## Keine automatische Gesichtserkennung

KontaktAtlas führt keine Gesichtserkennung und keine biometrische Identifikation durch. Die App vergleicht keine Gesichter mit gespeicherten Profilbildern und erzeugt keine Kandidatenlisten auf Basis von Gesichtsmerkmalen.

## Keine automatische Kennzeichenerkennung

KontaktAtlas liest Kennzeichen nicht automatisch aus Bildern aus. Kennzeichen aus Textvorschlägen gelten als sensibel, sind nicht vorausgewählt und werden nur nach ausdrücklicher Bestätigung gespeichert.

## Lokale Speicherung erklären

Alle Daten bleiben auf dem Gerät. Der Renderer kommuniziert ausschließlich über die sichere Preload-API mit dem Electron-Main-Prozess. Node.js-Zugriff, Dateisystemoperationen und Datenbankzugriffe laufen nicht direkt im Renderer.

## Qualitätssicherung

```bash
npm run test
npm run build
```

Die Tests decken Parser, ImportDraft-Logik, Smart-Zuordnung und CompletenessService ab.
