# ISG-virtuos Signal Studio

Lokale Engineering-Oberfläche zum Vergleichen signalbasierter NoCode-/LowCode-Ansätze. React/TypeScript/Vite und React Flow, Gestaltung nach [STYLEGUIDE.md](STYLEGUIDE.md). Der erste Tab enthält einen Ablaufgraphen und Modellreferenzen mit Live-Ports.

## Starten

### Per Doppelklick / auf einem anderen Rechner

**`StartApp.cmd` doppelklicken.** Der Starter findet Python, startet den lokalen Dienst, wartet auf dessen Bereitschaft und öffnet danach die UI im **Standardbrowser** unter **http://127.0.0.1:8765**. Eine bereits laufende Signal-Studio-Instanz auf diesem Port wird wiederverwendet; deren Verbindung bleibt erhalten. Fremde Anwendungen auf dem Port werden nicht beendet.

Zum Kopieren auf einen anderen Windows-Rechner werden diese Bestandteile zusammen benötigt:

```text
StartApp.cmd
dist/                 (vollstaendiger UI-Build mit assets/)
server/               (einschliesslich vendor/)
```

Auf dem Zielrechner sind **Python 3.9+ x64** und für die Modellanbindung eine passende **ISG-virtuos-Installation** erforderlich. Node.js ist bei mitkopiertem `dist` nicht nötig. Der Python-Interpreter wird über `SIGNAL_STUDIO_PYTHON`, `py -3`, `python` oder `python3` gefunden. Eine abweichende virtuos-Installation kann in der UI unter „Schnittstellen“ eingestellt werden.

Fehlt `dist` (etwa nach einem Git-Klon), baut der Starter die UI automatisch aus dem vorhandenen Quellcode. Dafür werden Node.js/npm und beim ersten Bezug der npm-Pakete ein Internetzugang benötigt. Fehlende Betriebssystemprogramme werden nicht automatisch installiert. Fehlermeldungen bleiben im Startfenster sichtbar.

Das Startfenster während der Nutzung offen lassen; **Strg+C** beendet den vom Starter gestarteten Dienst. Zum Aktualisieren des Builds nach Quellcodeänderungen: `StartApp.cmd --rebuild`. Für einen anderen lokalen Port: `StartApp.cmd --port 8766`. `--no-browser` unterdrückt die automatische Browseröffnung.

### Entwicklung

Voraussetzungen: Windows x64, Node.js 22.11+ mit Vite-6-Unterstützung, Python 3.9+ x64 (`py -3`), passende lokale virtuos-Installation. Es werden keine zusätzlichen Python-Pakete benötigt.

```powershell
npm.cmd install
npm.cmd run dev
```

Das startet die GUI unter **http://127.0.0.1:5173** und die lokale Bridge unter **http://127.0.0.1:8765**. Mit `SIGNAL_STUDIO_PYTHON` lässt sich alternativ der Pfad zu einem 64-Bit-Python-Interpreter festlegen. `npm.cmd` funktioniert unter Windows auch bei deaktivierten PowerShell-Skripten.

Getrennt starten: `npm.cmd run bridge` und `npm.cmd run dev:ui`. Ein bereits auf diesen Ports laufender Entwicklungsserver muss vorher beendet werden.

Nach `npm.cmd run build` kann `npm.cmd run bridge` die gebaute Oberfläche direkt auf http://127.0.0.1:8765 ausliefern. `npm.cmd run preview` benötigt zusätzlich den Bridge-Dienst.

## Modellstruktur und Live-Werte laden

1. Das gewünschte Modell in der normalen ISG-virtuos-GUI öffnen. Im **Python-Terminal** einen leeren `>>>`-Prompt bereitstellen. Der Client und virtuos benötigen dieselben Windows-Rechte. Das Terminal nicht gleichzeitig manuell bedienen, während der Strukturabruf läuft.
2. Den CORBA-Server in virtuos aktivieren. Für aktuelle Laufzeitwerte muss die Simulation initialisiert beziehungsweise gestartet sein. Die App selbst startet, stoppt oder lädt kein virtuos-Modell.
3. Unter **Schnittstellen** die Verbindung prüfen: Standard `C:\ISG\ISG-virtuos_3_8\bin_x64`, Host `127.0.0.1`, Port `54322`, Objektname `Visualization`. Bei mehreren sichtbaren Instanzen die gewünschte virtuos-Prozess-ID angeben; `0` wählt automatisch die eindeutig sichtbare Instanz. OVA-Zielinstanz und CORBA-Ziel müssen dasselbe Modell verwenden.
4. Links **Get Model Structure** anklicken. Der Baum ist vorher leer. Die TerminalBridge liest die bestehende OVA-Sitzung und exportiert die vollständige Baustein-/Porthierarchie. Es gibt keine Filter für Viewports, Materialdefinitionen oder den `time`-Port. Es werden keine Modelldateien geöffnet, verändert oder gespeichert.
5. Die App verbindet die RemoteAPI automatisch mit der konfigurierten Instanz. Struktur und Live-Verbindung sind unabhängig: Scheitert CORBA, bleibt die erfolgreich geladene Struktur sichtbar. Nach Korrektur unter **Schnittstellen → Verbinden** erneut verbinden.
6. Im Baum werden die laufenden Portwerte auch ohne gestarteten Ablauf aktualisiert. Einträge mit nicht lesbarem Wert zeigen `—`; Details enthalten die Ursache. Veraltete Daten werden als letzte Werte gekennzeichnet. Bei Verbindungsverlust werden Live-Werte entfernt.

Die Modellstruktur wird **nur auf Knopfdruck** geladen. Nach einem Modellwechsel „Get Model Structure“ erneut ausführen. Bei einem anderen Modell können bestehende Schrittzuordnungen ungültig sein; sie werden bei **Prüfen** erkannt. **Neuer Ablauf** erstellt einen Ablauf für das gerade geladene Modell.

## Drag & Drop und Ablaufsteuerung

Die **Bausteinbibliothek** ist ein eigenes Panel über die volle Höhe, getrennt vom Modellbaum. Über „Bibliothek“ im Header lässt sie sich ein- und ausblenden. Auf schmalen Bildschirmen öffnet sie als seitliche Schublade. Der Header verwendet die mitgelieferte Datei `ISG_Logo_klein.png`; der UI-Build enthält das Bild und benötigt dafür keinen externen Zugriff.

- Einen **Bausteinnamen** aus dem Baum auf die mittlere Fläche ziehen: Es entsteht eine Modellreferenz mit allen direkten Ports und deren Werten. Unterbausteine können separat gezogen werden. Ein Portklick öffnet dessen Eigenschaften. Die Referenz ändert das virtuos-Modell nicht.
- Modell- und Portreferenzen am **Kopf der Karte** verschieben. Die Bewegung wird direkt im Graphen dargestellt und beim Loslassen in das Projekt übernommen.
- Ein **skalares Signal** ziehen: Eingänge werden als „Signal setzen“, Ausgänge als „Auf Signal warten“ eingefügt. Die Richtung steuert nur die Vorgabe im Editor; RemoteAPI-Schreibrechte werden davon unabhängig ermittelt.
- Ein **Referenzsignal** (z. B. `VAxis`, `rfActors` oder `rfElements`) ziehen: Es entsteht eine einzelne Portreferenz mit Name, Pfad, Richtung und nativem Typ. Sie lässt sich verschieben, inspizieren, entfernen und im Projekt speichern. Referenzports werden nicht als Setz-/Warteschritte ausgeführt; ihre nicht skalaren Werte werden entsprechend gekennzeichnet.
- Das MVP führt genau einen linearen Pfad zwischen Start und Ende aus. Modell- und Portreferenzen gehören nicht zu diesem Ausführungspfad.
- Über die Bibliothek weitere Signalquellen oder Warteschritte per Klick oder Drag & Drop einfügen. Generatoren übernehmen ein zuvor im Modellbaum ausgewähltes Signal nur, wenn dessen Typ passt. Andernfalls wird das Ausgangssignal rechts bewusst ausgewählt; der Ablauf kann erst mit einer gültigen Zuordnung starten.
- Signale über das Augensymbol in den Monitor aufnehmen. Dort kann ein beobachtetes numerisches Signal für den Verlauf gewählt werden. Die Zeitachse verwendet **Empfangszeit**, keine behauptete Solverzeit.
- **Starten** führt den Ablauf aus. **Pause**, **Stop** und **Ablauf zurücksetzen** betreffen nur die Ablaufsteuerung; virtuos und seine Simulation laufen weiter. Signalwerte und eigene Forces bleiben bis zur Freigabe erhalten.
- Wartebedingungen unterstützen Wertevergleiche und Bool-Flanken sowie einen Timeout (`0` = unbegrenzt). Eine Flanke zählt erst nach Aktivierung des Warteschritts. Pulse zwischen Abtastungen können verloren gehen. Fachlich digitale Ports, die OVA als `VReal64` meldet, bleiben numerische Signale und können etwa auf `= 1` geprüft werden.

**Schreiben / Force:** Wie im Referenzprojekt erfolgt der native Schreibzugriff mit `setForced(writeId, 1)` und anschließender typspezifischer Schreibfunktion. Die App zeigt eigene aktive Forces an. Über **Schnittstellen → eigene Schreibzugriffe / Forces freigeben** werden ausschließlich diese mit `setForced(id, 2)` aufgehoben. Beim regulären Trennen wird dies ebenfalls versucht; Fehler werden sichtbar gemeldet. Es gibt keinen globalen `unforceAll`-Aufruf. Eine Freigabe schreibt keinen Ersatzwert. Vor dem Beenden des Diensts eigene Forces freigeben; ein gewaltsam beendeter Prozess kann kein zuverlässiges Cleanup leisten.

**Speichern:** Das Projekt inklusive Modellreferenzen und Positionen wird im Browser lokal gespeichert. **Exportieren / Öffnen** tauscht versioniertes JSON aus. Modellkatalog und native ValueIDs werden nicht dauerhaft gespeichert. Alte Demo-Projekte werden nicht automatisch geladen.

## Standardbausteine für skalare Signale

| Baustein | Parameter | Verhalten nach Abschluss |
| --- | --- | --- |
| Konstante / Signal setzen | Ausgang, Wert | Gesetzter Wert bleibt bestehen |
| Puls | Ruhewert, Aktivwert, Startverzögerung, Pulsbreite | Kehrt zum Ruhewert zurück |
| Rechteck | Ruhewert, Aktivwert, Frequenz, Tastgrad, Laufzeit | Kehrt zum Ruhewert zurück |
| Rampe | Startwert, Endwert, Rampenzeit | Endwert bleibt bestehen |
| Sinus | Amplitude, Offset, Phase, Frequenz, Laufzeit | Kehrt zum Offset zurück |
| Dreieck | Unterer/oberer Wert, Frequenz, Laufzeit | Kehrt zum unteren Wert zurück |
| Sägezahn | Unterer/oberer Wert, Frequenz, Laufzeit | Kehrt zum unteren Wert zurück |

Puls und Rechteck unterstützen Bool- und numerische Ausgänge. Die kontinuierlichen Signalformen benötigen Real32 oder Real64; Referenzports, Strings und Integerports werden dafür nicht angeboten. Die Vorschau rechts zeigt den konfigurierten Verlauf. Auf Signal warten und Zeit warten stehen im selben Panel als Ablaufbausteine bereit.

Die Generatoren sind **zeitlich begrenzte Schritte im sequenziellen Ablauf**: Während eines solchen Schritts wird dessen Ausgang zyklisch über die RemoteAPI mit Force geschrieben. Anschließend läuft der nächste Schritt. Sie laufen nicht automatisch parallel zu nachfolgenden Warteschritten. Unveränderte Puls-/Rechteckpegel werden nicht bei jedem Poll erneut geschrieben.

Die ungefähr 100-ms-Auflösung der vorhandenen Laufzeit gilt auch für Generatoren. Pulsbreiten und Rechteckphasen müssen mindestens 100 ms, Perioden mindestens 200 ms betragen. Empfangs-/RPC-Verzögerungen beeinflussen die tatsächliche Abtastung; es besteht keine Echtzeitgarantie. Ein stark verspäteter Tick darf einen einmaligen Puls nicht vollständig überspringen: Seine Pulsbreite beginnt beim Ausgeben des Aktivwerts. Für kurze oder solvergenau getaktete Signale muss der Generator im virtuos-Modell laufen.

**Pause** friert die Generatorzeit ein und hält den letzten Wert. **Stop** beendet die Ausgabe und belässt den letzten Wert einschließlich eines möglicherweise aktiven Pulspegels. Der normale Abschluss schreibt den in den Eigenschaften angezeigten Endwert; die bestehende Force-Freigabe erfolgt weiterhin unter „Schnittstellen“.

## Unterstützte Ports

Alle OVA-Ports werden sichtbar. Die skalare RemoteAPI-Anbindung unterstützt Boolean, Real32/Real64, String sowie die im 3.8-C-Header definierten vorzeichenbehafteten und vorzeichenlosen 8-/16-/32-/64-Bit-Ganzzahlen. 64-Bit-Ganzzahlen werden als Dezimaltext übertragen, damit JavaScript keine Präzision verliert. Native Typen bleiben in der Anzeige erhalten; nicht jeder skalare Port ist vom jeweiligen Solver über die RemoteAPI erreichbar.

Referenz- und Strukturtypen wie `VAxis`, `rfActors`, `rfElements`, `VFieldContainerReference` und Eventkanäle bleiben im Baum und in Modellreferenzen sichtbar. Sie werden nicht als skalare Werte interpretiert oder in Zahlen umgewandelt. Dafür wird eine nachvollziehbare Nichtverfügbarkeitsmeldung gezeigt.

## Architektur

```text
React-GUI → /api/model/structure → lokaler Python-Dienst
                                    ↓ TerminalBridge
                           virtuos-Python-Terminal / vorhandene ova
                                    ↓ vollständiger ModelCatalog
                         Modellbaum und Modellreferenzen

Signal Studio → /api/state + /api/signals/write
                       ↓ Python ctypes.CDLL (Cdecl, x64)
                virtuos_interface_x64.dll → CORBA → laufendes Modell
```

- `server/vendor/VirtuosTerminalBridge.ps1`: unverändert aus dem vom Nutzer genannten `VirtuosCloudConnectApp` übernommen; Herkunft in `server/vendor/README.md`.
- `server/export_structure.py`: fester, lesender OVA-Export ohne Modelländerungen oder Geometrieabfragen, kompatibel mit dem eingebetteten Python 3.7.
- `server/structure.py`: temporäre Exportdateien, Prozess-/Timeoutprüfung und Normalisierung von Modell- und Portmetadaten.
- `server/native.py`: geprüfte 20-Byte-ValueID-ABI, getrennte Read-/Write-Handles, Empfang über `updateCurrentSet`, Neuauflösung bei Ramp-up/Reset, Fehler- und Force-Verwaltung. UUID-Auflösung mit Fallback auf den aus OVA-Namenskomponenten gebildeten vollständigen Portpfad. Alle nativen Aufrufe werden serialisiert.
- `server/app.py`: ausschließlich an Loopback gebundene HTTP-Grenze; feste API-Aktionen, Herkunfts-/Host-Prüfung, kein Endpunkt für beliebigen Terminalcode. Hersteller-DLLs werden aus der installierten virtuos-Version geladen und nicht mitgeliefert.
- `src/adapters/live.ts`: GUI-Adapter für Struktur, Verbindung, Live-Werte und Schreiben.
- `src/core/engine.ts`: gemeinsame, editorunabhängige Ablaufsteuerung. Sie liest nur die im Ablauf verwendeten Signale; Fehler anderer Referenzports blockieren den Ablauf nicht.
- `src/adapters/mock.ts`: ausschließlich Testmodell für automatisierte Laufzeittests, kein automatischer GUI-Demomodus.

Die GUI arbeitet mit einem seriellen Polling-Zyklus von ungefähr 100 ms. Die Ablaufzeit wird am Client gemessen. Dies bietet keine deterministische Echtzeitsteuerung und ersetzt keine im Solver synchronisierte Ablaufsteuerung.

Live-Werte werden getrennt vom Graphen gespeichert. Ein Signalupdate aktualisiert nur die betroffenen Wertanzeigen; Knotengrößen, Drag-Handler und Zoom bleiben erhalten. Der Regressionstest spielt 100 Live-Updates ein und prüft, dass der Graph dabei nicht neu aufgebaut, ein fokussiertes Signalelement nicht ersetzt und unveränderte Ports nicht verändert werden. Die Prüfung verwendet jsdom mit einer instrumentierten Graph-Grenze; sie ersetzt keine Messung der Bildrate im Browser.

## Prüfungen

```powershell
npm.cmd test
npm.cmd run test:bridge
npm.cmd run build
```

Die Tests prüfen unter anderem Ablauf/Flanken/Timeouts, den leeren GUI-Start, den Projektimport mit Modellreferenzen, OVA-Vollständigkeit, UUID-/Pfadauflösung, Registrierung vor dem nächsten Datensatz, getrennte Read-/Write-IDs, veraltete Daten, Ramp-down, Verbindungsverlust, Integergrenzen und eigene Force-Freigaben. Native Schreibtests verwenden einen Fake, keine laufende Anlage.

Ein echter Lesetest wurde mit dem geöffneten Modell `Example_1` in ISG-virtuos 3.8 durchgeführt: **91 OVA-Ports**, davon **39 aktuell über die skalare RemoteAPI lesbare Werte**. Die übrigen Ports bleiben mit Typ-/Verfügbarkeitsstatus sichtbar. Dabei wurden keine Signale geschrieben und die Simulation nicht durch die App gesteuert.

Weitere Ansatz-Tabs (Bausteine, Schritttabelle, Timeline), Verzweigungen und parallele Abläufe sind noch nicht umgesetzt.
