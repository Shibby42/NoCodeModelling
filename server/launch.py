"""Portable Windows entry point. Starts the built UI and bridge on one origin."""
import argparse
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import shutil
import socket
import struct
import subprocess
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import build_opener, ProxyHandler
import webbrowser

ROOT = Path(__file__).resolve().parent.parent
SERVICE = "virtuos-signal-studio"
# Local readiness checks must never travel through an environment/system proxy.
HTTP = build_opener(ProxyHandler({}))


class AssetParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "script" and attributes.get("src"):
            self.paths.append(attributes["src"])
        if tag == "link" and attributes.get("rel") == "stylesheet" and attributes.get("href"):
            self.paths.append(attributes["href"])


def frontend_ready(root):
    base = (root / "dist").resolve()
    index = base / "index.html"
    if not index.is_file():
        return False
    parser = AssetParser()
    parser.feed(index.read_text(encoding="utf-8"))
    if not parser.paths:
        return False
    for asset in parser.paths:
        filename = (base / asset.lstrip("/").split("?")[0]).resolve()
        if not filename.is_relative_to(base) or not filename.is_file():
            return False
    return True


def ensure_frontend(root, rebuild=False):
    for relative in ("server/app.py", "server/native.py", "server/structure.py",
                     "server/export_structure.py", "server/vendor/VirtuosTerminalBridge.ps1"):
        if not (root / relative).is_file():
            raise RuntimeError("App-Datei fehlt: {}. Bitte den vollstaendigen App-Ordner kopieren.".format(relative))
    if not rebuild and frontend_ready(root):
        return
    npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
    if not npm or not (root / "package.json").is_file() or not (root / "src").is_dir():
        raise RuntimeError("Der UI-Build (dist) fehlt oder ist unvollstaendig. Den Ordner inklusive dist kopieren. "
                           "Alternativ Node.js und den vollstaendigen Quellcode bereitstellen und erneut starten.")
    print("UI-Build wird erstellt ...", flush=True)
    if not (root / "node_modules/typescript/bin/tsc").is_file() or not (root / "node_modules/vite/bin/vite.js").is_file():
        command = "ci" if (root / "package-lock.json").is_file() else "install"
        subprocess.run([npm, command, "--no-audit", "--no-fund"], cwd=root, check=True)
    subprocess.run([npm, "run", "build"], cwd=root, check=True)
    if not frontend_ready(root):
        raise RuntimeError("Der Build hat keine vollstaendige UI erzeugt.")


def probe(url):
    """Return 'ready', 'starting', 'foreign' or 'absent' without changing a session."""
    try:
        with HTTP.open(url + "/api/health", timeout=0.8) as response:
            health = json.loads(response.read(65536))
        if not isinstance(health, dict) or health.get("service") != SERVICE:
            return "foreign"
        with HTTP.open(url + "/", timeout=0.8) as response:
            html = response.read(131072).decode("utf-8", errors="replace")
        return "ready" if '<div id="root"></div>' in html and "Signal Studio" in html else "starting"
    except HTTPError:
        return "foreign"
    except (URLError, OSError, ValueError):
        try:
            with socket.create_connection(("127.0.0.1", int(url.rsplit(":", 1)[1])), timeout=0.3):
                return "foreign"
        except OSError:
            return "absent"


def wait_ready(process, url, timeout=25):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("Der lokale Dienst wurde beim Start beendet (Exitcode {}).".format(process.returncode))
        if probe(url) == "ready":
            return
        time.sleep(0.15)
    raise RuntimeError("Der lokale Dienst ist nach {} Sekunden nicht bereit. Port und Meldungen pruefen.".format(timeout))


def open_ui(url, no_browser):
    print("UI bereit: " + url, flush=True)
    if not no_browser:
        try:
            opened = webbrowser.open(url, new=2)
        except Exception as exc:
            opened = False
            print("Browser konnte nicht geoeffnet werden: " + str(exc), flush=True)
        if not opened:
            print("Die URL bitte manuell im Standardbrowser oeffnen: " + url, flush=True)


def run(root, port=8765, no_browser=False, rebuild=False):
    ensure_frontend(root, rebuild)
    url = "http://127.0.0.1:{}".format(port)
    state = probe(url)
    if state == "ready":
        print("Signal Studio laeuft bereits. Die vorhandene Verbindung wird weiterverwendet.", flush=True)
        open_ui(url, no_browser)
        return 0
    if state != "absent":
        raise RuntimeError("Port {} ist belegt oder liefert keine fertige Signal-Studio-UI. "
                           "Andere Anwendung pruefen oder StartApp.cmd --port 8766 verwenden.".format(port))
    print("ISG-virtuos Signal Studio wird gestartet ...", flush=True)
    process = subprocess.Popen([sys.executable, "-u", str(root / "server/app.py"), "--port", str(port)], cwd=root)
    try:
        wait_ready(process, url)
        open_ui(url, no_browser)
        print("Dieses Fenster offen lassen. Strg+C beendet den lokalen Dienst.", flush=True)
        return process.wait()
    except KeyboardInterrupt:
        print("\nSignal Studio wird beendet ...", flush=True)
        # The foreground console delivers Ctrl+C to the Python server too.
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            print("Der Dienst reagiert nicht. Prozess wird beendet.", flush=True)
        return 0
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


def main():
    parser = argparse.ArgumentParser(description="Signal Studio lokal starten und die UI im Standardbrowser oeffnen.")
    parser.add_argument("--port", type=int, default=8765, help="Lokaler HTTP-Port (Standard: 8765)")
    parser.add_argument("--no-browser", action="store_true", help="UI nicht automatisch im Browser oeffnen")
    parser.add_argument("--rebuild", action="store_true", help="UI mit npm neu bauen, auch wenn dist vorhanden ist")
    args = parser.parse_args()
    try:
        if sys.version_info < (3, 9) or struct.calcsize("P") != 8:
            raise RuntimeError("Python 3.9 oder neuer in der 64-Bit-Version ist erforderlich.")
        if not 1 <= args.port <= 65535:
            raise RuntimeError("Der Port muss zwischen 1 und 65535 liegen.")
        return run(ROOT, args.port, args.no_browser, args.rebuild)
    except (OSError, RuntimeError, subprocess.CalledProcessError) as exc:
        print("\nFEHLER: " + str(exc), file=sys.stderr, flush=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
