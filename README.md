# ISG-virtuos Signal Studio

Lokale Engineering-Oberfläche zum Vergleichen signalbasierter NoCode-/LowCode-Ansätze. React/TypeScript/Vite und React Flow, Gestaltung nach [STYLEGUIDE.md](STYLEGUIDE.md). Der erste Tab enthält einen Ablaufgraphen und Modellreferenzen mit Live-Ports.

## Starten

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

- Einen **Bausteinnamen** aus dem Baum auf die mittlere Fläche ziehen: Es entsteht eine Modellreferenz mit allen direkten Ports und deren Werten. Unterbausteine können separat gezogen werden. Ein Portklick öffnet dessen Eigenschaften. Die Referenz ändert das virtuos-Modell nicht.
- Ein **skalares Signal** ziehen: Eingänge werden als „Signal setzen“, Ausgänge als „Auf Signal warten“ eingefügt. Die Richtung steuert nur die Vorgabe im Editor; RemoteAPI-Schreibrechte werden davon unabhängig ermittelt.
- Über **Ablaufschritte** weitere Setz-, Warte- und Zeitschritte nach dem ausgewählten Schritt einfügen. Jede Aktion lässt sich rechts konfigurieren. Das MVP führt genau einen linearen Pfad zwischen Start und Ende aus; Modellreferenzen gehören nicht zu diesem Ausführungspfad.
- Signale über das Augensymbol in den Monitor aufnehmen. Dort kann ein beobachtetes numerisches Signal für den Verlauf gewählt werden. Die Zeitachse verwendet **Empfangszeit**, keine behauptete Solverzeit.
- **Starten** führt den Ablauf aus. **Pause**, **Stop** und **Ablauf zurücksetzen** betreffen nur die Ablaufsteuerung; virtuos und seine Simulation laufen weiter. Signalwerte und eigene Forces bleiben bis zur Freigabe erhalten.
- Wartebedingungen unterstützen Wertevergleiche und Bool-Flanken sowie einen Timeout (`0` = unbegrenzt). Eine Flanke zählt erst nach Aktivierung des Warteschritts. Pulse zwischen Abtastungen können verloren gehen. Fachlich digitale Ports, die OVA als `VReal64` meldet, bleiben numerische Signale und können etwa auf `= 1` geprüft werden.

**Schreiben / Force:** Wie im Referenzprojekt erfolgt der native Schreibzugriff mit `setForced(writeId, 1)` und anschließender typspezifischer Schreibfunktion. Die App zeigt eigene aktive Forces an. Über **Schnittstellen → eigene Schreibzugriffe / Forces freigeben** werden ausschließlich diese mit `setForced(id, 2)` aufgehoben. Beim regulären Trennen wird dies ebenfalls versucht; Fehler werden sichtbar gemeldet. Es gibt keinen globalen `unforceAll`-Aufruf. Eine Freigabe schreibt keinen Ersatzwert. Vor dem Beenden des Diensts eigene Forces freigeben; ein gewaltsam beendeter Prozess kann kein zuverlässiges Cleanup leisten.

**Speichern:** Das Projekt inklusive Modellreferenzen und Positionen wird im Browser lokal gespeichert. **Exportieren / Öffnen** tauscht versioniertes JSON aus. Modellkatalog und native ValueIDs werden nicht dauerhaft gespeichert. Alte Demo-Projekte werden nicht automatisch geladen.

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

## Prüfungen

```powershell
npm.cmd test
npm.cmd run test:bridge
npm.cmd run build
```

Die Tests prüfen unter anderem Ablauf/Flanken/Timeouts, den leeren GUI-Start, den Projektimport mit Modellreferenzen, OVA-Vollständigkeit, UUID-/Pfadauflösung, Registrierung vor dem nächsten Datensatz, getrennte Read-/Write-IDs, veraltete Daten, Ramp-down, Verbindungsverlust, Integergrenzen und eigene Force-Freigaben. Native Schreibtests verwenden einen Fake, keine laufende Anlage.

Ein echter Lesetest wurde mit dem geöffneten Modell `Example_1` in ISG-virtuos 3.8 durchgeführt: **91 OVA-Ports**, davon **39 aktuell über die skalare RemoteAPI lesbare Werte**. Die übrigen Ports bleiben mit Typ-/Verfügbarkeitsstatus sichtbar. Dabei wurden keine Signale geschrieben und die Simulation nicht durch die App gesteuert.

Weitere Ansatz-Tabs (Bausteine, Schritttabelle, Timeline), Verzweigungen und parallele Abläufe sind noch nicht umgesetzt.
