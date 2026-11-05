"""Loopback HTTP boundary for the Windows TerminalBridge and native RemoteAPI.
Only stdlib dependencies. Start with `py -3 server/app.py`.
"""
import argparse
import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re
import threading
from urllib.parse import urlparse, unquote

from native import NativeRemote
from structure import pull_structure

ROOT = Path(__file__).resolve().parent.parent
remote = NativeRemote()
export_lock = threading.Lock()
quit_event = threading.Event()


def validated_config(value):
    if not isinstance(value, dict):
        raise ValueError("Verbindungsparameter fehlen.")
    result = {}
    for key in ("binDirectory", "host", "port", "objectName"):
        item = value.get(key)
        if not isinstance(item, str) or not item.strip() or len(item) > 1024 or "\0" in item:
            raise ValueError("Ungültiger Verbindungsparameter: " + key)
        result[key] = item.strip()
    if not result["port"].isdigit() or not 1 <= int(result["port"]) <= 65535:
        raise ValueError("CORBA-Port muss zwischen 1 und 65535 liegen.")
    if not re.fullmatch(r"[a-zA-Z0-9_.:\-]+", result["host"]):
        raise ValueError("Ungültiger CORBA-Hostname.")
    pid = value.get("processId", 0)
    if isinstance(pid, bool) or not isinstance(pid, int) or not 0 <= pid <= 2 ** 31 - 1:
        raise ValueError("Ungültige virtuos-Prozess-ID.")
    result["processId"] = pid
    return result


class Handler(BaseHTTPRequestHandler):
    server_version = "SignalStudio/0.2"

    def log_message(self, *_):
        pass

    def allowed(self):
        # No wildcard CORS; deny foreign origins, cross-site requests and rebinding.
        allowed_hosts = {"127.0.0.1", "localhost"}
        try:
            host = urlparse("http://" + self.headers.get("Host", ""))
            if host.hostname not in allowed_hosts or host.port != self.server.server_port:
                return False
            origin = self.headers.get("Origin")
            if origin:
                parsed = urlparse(origin)
                if parsed.scheme != "http" or parsed.hostname not in allowed_hosts or parsed.port not in (5173, 4173, self.server.server_port):
                    return False
            return self.headers.get("Sec-Fetch-Site") != "cross-site"
        except ValueError:
            return False

    def send_json(self, value, status=200):
        data = json.dumps(value, ensure_ascii=False, allow_nan=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def body(self):
        if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
            raise ValueError("Content-Type application/json erforderlich.")
        length = int(self.headers.get("Content-Length", "0"))
        if not 0 < length <= 1_000_000:
            raise ValueError("Ungültige Anfragegröße.")
        data = json.loads(self.rfile.read(length))
        if not isinstance(data, dict):
            raise ValueError("Ein JSON-Objekt ist erforderlich.")
        return data

    def do_GET(self):
        if not self.allowed():
            self.send_json({"error": "Nur lokale Anfragen sind erlaubt."}, 403)
            return
        path = urlparse(self.path).path
        if path == "/api/health":
            self.send_json({"service": "virtuos-signal-studio", "version": "0.2", "config": remote.config})
        elif path == "/api/state":
            self.send_json(remote.snapshot())
        elif path == "/api/catalog":
            self.send_json({"catalog": remote.catalog})
        elif path.startswith("/api/"):
            self.send_json({"error": "Unbekannter Endpunkt."}, 404)
        else:
            self.serve_static(path)

    def do_POST(self):
        if not self.allowed():
            self.send_json({"error": "Nur lokale Anfragen sind erlaubt."}, 403)
            return
        path = urlparse(self.path).path
        try:
            data = self.body()
            if path == "/api/connect":
                if export_lock.locked():
                    raise RuntimeError("Modellstruktur wird gerade gelesen. Bitte warten.")
                remote.connect(validated_config(data))
                self.send_json(remote.snapshot())
            elif path == "/api/disconnect":
                remote.disconnect()
                self.send_json(remote.snapshot())
            elif path == "/api/model/structure":
                config = validated_config(data)
                if not export_lock.acquire(blocking=False):
                    raise RuntimeError("Ein Struktur-Export läuft bereits.")
                try:
                    catalog = pull_structure(config["processId"])
                    remote.set_catalog(catalog)
                    connection_error = None
                    if not remote.connected or remote.config != config:
                        try:
                            remote.connect(config)
                        except Exception as exc:
                            connection_error = str(exc)
                    self.send_json({"catalog": catalog, "state": remote.snapshot(), "connectionError": connection_error})
                finally:
                    export_lock.release()
            elif path == "/api/signals/write":
                if export_lock.locked():
                    raise RuntimeError("Während des Struktur-Exports kann nicht geschrieben werden.")
                if not isinstance(data.get("id"), str) or "value" not in data:
                    raise ValueError("Signal-ID und Wert fehlen.")
                remote.write(data["id"], data["value"])
                self.send_json({"success": True, "state": remote.snapshot()})
            elif path == "/api/signals/release":
                remote.release_forces()
                self.send_json(remote.snapshot())
            else:
                self.send_json({"error": "Unbekannter Endpunkt."}, 404)
        except ValueError as exc:
            self.send_json({"error": str(exc)}, 400)
        except Exception as exc:
            self.send_json({"error": str(exc)}, 503)

    def serve_static(self, path):
        base = (ROOT / "dist").resolve()
        filename = (base / unquote(path).lstrip("/")).resolve()
        if not filename.is_relative_to(base):
            self.send_json({"error": "Ungültiger Pfad."}, 403)
            return
        if filename.is_dir():
            filename = filename / "index.html"
        if not filename.is_file():
            self.send_json({"error": "Kein Build vorhanden. npm run build ausführen oder npm run dev verwenden."}, 404)
            return
        content = filename.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(filename)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


def poll_loop():
    while not quit_event.wait(0.1):
        remote.poll()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    threading.Thread(target=poll_loop, daemon=True).start()
    print("Signal Studio Bridge: http://127.0.0.1:{}".format(args.port), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        quit_event.set()
        server.server_close()
        try:
            remote.disconnect()
        except Exception as exc:
            print("Cleanup: " + str(exc), flush=True)
