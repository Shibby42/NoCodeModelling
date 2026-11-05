# TerminalBridge

`VirtuosTerminalBridge.ps1` wurde unverändert aus
`G:\07_Laufende_Projekte\VirtuosCloudConnectApp\resources\VirtuosTerminalBridge.ps1`
übernommen (05.11.2026), auf ausdrücklichen Wunsch des Nutzers.

Der Dienst verwendet ausschließlich den festen, lesenden Export in
`../export_structure.py`. Es gibt keinen HTTP-Endpunkt für beliebigen Python-
oder PowerShell-Code. Die Bridge nutzt die vorhandene `ova`-Sitzung im sichtbaren
Python-Terminal und verlangt vor Ausführung einen leeren `>>>`-Prompt.

Native RemoteAPI-Signaturen und Empfangslogik basieren auf `VirtuosNative.cs`,
`IVirtuosApi.cs`, `VirtuosSource.cs` und `VirtuosRemoteAPI.md` desselben Projekts
und wurden mit `C:\ISG\ISG-virtuos_3_8\sdk\incl\VCmdInterface.h` abgeglichen.
Hersteller-DLLs werden nicht kopiert oder mitgeliefert.
