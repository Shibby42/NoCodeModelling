"""Fixed, read-only OVA export through the explicitly requested TerminalBridge."""
import json
import os
from pathlib import Path
import subprocess
import tempfile

HERE = Path(__file__).resolve().parent

# Native constants checked against 3.8 sdk/incl/VBasicEnums.h and VCmdInterface.h.
NATIVE_TYPES = {
    "VBoolean": ("Bool", 1, "Boolean", "c_bool"),
    "VReal32": ("Double", 2, "Real32", "c_float"),
    "VReal64": ("Double", 4, "Real64", "c_double"),
    "VString": ("String", 8, "String", None),
    "VInt8": ("Double", 16, "Int8", "c_int8"),
    "VInt16": ("Double", 32, "Int16", "c_int16"),
    "VInt32": ("Double", 64, "Int32", "c_int32"),
    # 64-bit integers remain decimal strings in JSON to preserve every bit in JS.
    "VInt64": ("String", 128, "Int64", "c_int64"),
    "VUInt8": ("Double", 256, "UInt8", "c_uint8"),
    "VUInt16": ("Double", 512, "UInt16", "c_uint16"),
    "VUInt32": ("Double", 1024, "UInt32", "c_uint32"),
    "VUInt64": ("String", 2048, "UInt64", "c_uint64"),
}


def normalize_catalog(raw):
    signals = {}

    def visit(node):
        ids = []
        for port in node["ports"]:
            identifier = port["id"]
            if identifier not in ids:
                ids.append(identifier)
            native = port["nativeType"]
            metadata = NATIVE_TYPES.get(native)
            path = ".".join("[{}]".format(p) for p in node["pathParts"] + [port["name"]])
            if identifier not in signals:
                signals[identifier] = {
                    "id": identifier, "name": port["name"], "path": path,
                    "type": metadata[0] if metadata else "Unsupported",
                    "nativeType": native, "direction": port["direction"],
                    "blockId": node["id"], "readable": metadata is not None,
                    # API access is resolved independently of IN/OUT direction.
                    "writable": metadata is not None, "writeAccess": "unverified",
                    "description": "{} · {} · {}".format(node["name"], port["direction"], native),
                }
        return {"id": node["id"], "name": node["name"], "path": ".".join("[{}]".format(p) for p in node["pathParts"]),
                "modelType": node["type"], "signalIds": ids,
                "children": [visit(child) for child in node["children"]]}

    root = visit(raw["root"])
    return {"id": root["id"], "name": raw["projectName"] or root["name"],
            "projectName": raw["projectName"], "source": "ova", "root": root,
            "signals": list(signals.values())}


def pull_structure(process_id=0):
    if os.name != "nt":
        raise RuntimeError("Die TerminalBridge benötigt Windows und eine sichtbare virtuos-Instanz.")
    with tempfile.TemporaryDirectory(prefix="signal-studio-ova-") as temporary:
        directory = Path(temporary)
        destination = directory / "structure.json"
        exporter = HERE / "export_structure.py"
        command = "exec(compile(open({0}, encoding='utf-8-sig').read(), {0}, 'exec'), {{'ova': ova, 'output_file': {1}}})\n".format(
            json.dumps(str(exporter)), json.dumps(str(destination)))
        code = directory / "read_structure.py"
        code.write_text(command, encoding="utf-8")
        driver = directory / "run.ps1"
        driver.write_text("""param([string]$Bridge,[string]$CodeFile,[int]$TargetPid)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
& $Bridge -Action Execute -InputMode Wrapped -CodeFile $CodeFile -VirtuosProcessId $TargetPid -TimeoutSeconds 120 -RequireReadyPrompt -Json
exit $LASTEXITCODE
""", encoding="utf-8-sig")
        powershell = Path(os.environ.get("SystemRoot", r"C:\Windows")) / "System32/WindowsPowerShell/v1.0/powershell.exe"
        result = subprocess.run([str(powershell), "-NoProfile", "-NonInteractive", "-STA", "-ExecutionPolicy", "Bypass",
            "-File", str(driver), "-Bridge", str(HERE / "vendor/VirtuosTerminalBridge.ps1"),
            "-CodeFile", str(code), "-TargetPid", str(process_id)],
            capture_output=True, encoding="utf-8-sig", errors="replace", timeout=135,
            creationflags=subprocess.CREATE_NO_WINDOW)
        help_text = " Das virtuos-Python-Terminal muss sichtbar und an einem leeren >>>-Prompt sein. Bei mehreren Instanzen eine PID auswählen. Beide Programme benötigen dieselben Windows-Rechte."
        if result.returncode != 0:
            raise RuntimeError((result.stdout + "\n" + result.stderr).strip()[-5000:] + help_text)
        try:
            response = json.loads(result.stdout.strip())
        except ValueError as exc:
            raise RuntimeError("Ungültige TerminalBridge-Antwort: " + result.stdout[-1500:] + help_text) from exc
        if response.get("Success") is not True or response.get("TimedOut") is not False:
            raise RuntimeError("Die TerminalBridge hat den Export nicht bestätigt." + help_text)
        if not destination.is_file():
            raise RuntimeError("OVA hat keine Modellstruktur geliefert." + help_text)
        return normalize_catalog(json.loads(destination.read_text(encoding="utf-8")))
