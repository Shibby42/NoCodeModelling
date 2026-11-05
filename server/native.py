"""Serialized ctypes binding, based on VirtuosCloudConnectApp's VirtuosNative,
NativeVirtuosApi and VirtuosSource. No model lifecycle commands are invoked.
"""
import ctypes as C
import math
import os
from pathlib import Path
import threading
import time
import re

from structure import NATIVE_TYPES


class ValueID(C.Structure):
    _fields_ = [("value", C.c_int32), ("interface", C.c_int32), ("interface2", C.c_int32),
                ("dataType", C.c_int32), ("access", C.c_uint32)]


def check(result, operation):
    if result != 0:
        raise RuntimeError("{}: VRESULT {}".format(operation, result))


class NativeRemote:
    def __init__(self):
        self.lock = threading.RLock()
        self.dll = None
        self.dll_directory = None
        self.initialized = False
        self.connected = False
        self.ready = False
        self.message = "Nicht verbunden"
        self.catalog = None
        self.values = {}
        self.errors = {}
        self.access = {}
        self.ids = {}
        self.write_ids = {}
        self.forces = {}
        self.generation = 0
        self.updated_at = None
        self.needs_resolve = False
        self.last_resolve = 0
        self.project_name = ""
        self.last_project_check = 0
        self.model_changed = False
        self.config = {"binDirectory": r"C:\ISG\ISG-virtuos_3_8\bin_x64", "host": "127.0.0.1",
                       "port": "54322", "objectName": "Visualization", "processId": 0}

    def _bind(self, name, arguments, result=C.c_int32):
        function = getattr(self.dll, name)
        function.argtypes = arguments
        function.restype = result
        return function

    def _load(self, directory):
        if os.name != "nt" or C.sizeof(C.c_void_p) != 8:
            raise RuntimeError("Die RemoteAPI benötigt Windows und 64-Bit-Python.")
        directory = str(Path(directory).resolve())
        if self.dll:
            if os.path.normcase(directory) != os.path.normcase(self.dll_directory):
                raise RuntimeError("Bei einem Wechsel des SDK-Verzeichnisses den lokalen Dienst neu starten.")
            return
        path = Path(directory) / "virtuos_interface_x64.dll"
        if not path.is_file():
            raise RuntimeError("virtuos_interface_x64.dll fehlt im konfigurierten bin_x64-Verzeichnis.")
        if C.sizeof(ValueID) != 20:
            raise RuntimeError("Ungültige ValueID-ABI.")
        self.dll = C.CDLL(str(path), winmode=0x100 | 0x1000)
        self.dll_directory = directory
        self._bind("initDLL", [], None)
        self._bind("detachDLL", [], None)
        self._bind("setCorbaRPCTimeOut", [C.c_uint32])
        self._bind("setCorbaInfo", [C.c_char_p, C.c_char_p, C.c_char_p])
        for name in ("startConnection", "stopConnection", "connected", "stopCyclicUpdate"):
            self._bind(name, [])
        self._bind("startCyclicUpdate", [C.c_int32])
        self._bind("updateCurrentSet", [C.POINTER(C.c_int32), C.POINTER(C.c_double)])
        self._bind("getProjectName", [C.c_void_p, C.POINTER(C.c_uint32)])
        self._bind("getValueID", [C.c_char_p, C.c_int32, C.c_uint32, C.POINTER(ValueID)])
        self._bind("setForced", [ValueID, C.c_int32])
        for _, (_, _, suffix, ctype) in NATIVE_TYPES.items():
            if suffix == "String":
                self._bind("readStringValue", [ValueID, C.c_void_p, C.POINTER(C.c_uint32)])
                self._bind("writeStringValue", [ValueID, C.c_char_p])
            else:
                scalar = getattr(C, ctype)
                self._bind("read" + suffix + "Value", [ValueID, C.POINTER(scalar)])
                self._bind("write" + suffix + "Value", [ValueID, scalar])

    def set_catalog(self, catalog):
        with self.lock:
            self.release_forces()
            self.catalog = catalog
            self.model_changed = False
            self._invalidate("Port registriert; warte auf nächsten Datensatz.")
            self.needs_resolve = True

    def _invalidate(self, reason):
        # Native handles are invalid after an interface change. Retain ownership
        # by logical port ID and release through a newly resolved handle later.
        self.forces = {identifier: None for identifier in self.forces}
        self.ids.clear()
        self.write_ids.clear()
        self.values.clear()
        self.access.clear()
        self.ready = False
        self.updated_at = None
        self.errors = {s["id"]: reason for s in self.catalog["signals"]} if self.catalog else {}

    def connect(self, config):
        with self.lock:
            self.disconnect()
            self.config = config.copy()
            self._load(config["binDirectory"])
            try:
                self.dll.initDLL()
                self.initialized = True
                check(self.dll.setCorbaRPCTimeOut(2000), "RPC-Timeout")
                check(self.dll.setCorbaInfo(config["host"].encode("mbcs"), config["port"].encode("ascii"), config["objectName"].encode("mbcs")), "CORBA-Konfiguration")
                check(self.dll.startConnection(), "Verbindung fehlgeschlagen (CORBA-Server in virtuos aktiv?)")
                check(self.dll.startCyclicUpdate(100), "Zyklischer Empfang")
                self.connected = True
                self.message = "Verbunden · warte auf Simulation und Datensatz"
                self.needs_resolve = True
                self.last_project_check = 0
            except Exception:
                self.disconnect()
                raise

    def release_forces(self):
        with self.lock:
            failures = []
            for identifier, native_id in list(self.forces.items()):
                try:
                    if native_id is None:
                        raise RuntimeError("Force-Handle nach Modelländerung nicht gültig: " + identifier)
                    check(self.dll.setForced(native_id, 2), "Force freigeben")
                    del self.forces[identifier]
                except Exception as exc:
                    failures.append(str(exc))
            if failures:
                raise RuntimeError("Eigene Forces konnten nicht vollständig freigegeben werden: " + "; ".join(failures))

    def disconnect(self):
        with self.lock:
            failures = []
            try:
                self.release_forces()
            except Exception as exc:
                failures.append(str(exc))
            if self.initialized:
                for name in ("stopCyclicUpdate", "stopConnection", "detachDLL"):
                    try:
                        result = getattr(self.dll, name)()
                        if name != "detachDLL":
                            check(result, name)
                    except Exception as exc:
                        failures.append(str(exc))
            self.initialized = False
            self.connected = False
            self.message = "Nicht verbunden" if not failures else "; ".join(failures)
            self._invalidate("Nicht verbunden")
            if failures:
                raise RuntimeError(self.message)

    def _resolve(self):
        if not self.catalog or self.model_changed:
            return
        self.last_resolve = time.monotonic()
        for signal in self.catalog["signals"]:
            identifier = signal["id"]
            metadata = NATIVE_TYPES.get(signal["nativeType"])
            if not metadata:
                self.errors[identifier] = "Kein skalarer RemoteAPI-Typ: " + signal["nativeType"]
                self.access[identifier] = {"readable": False, "writable": False}
                continue
            # The SDK accepts the actual pin UUID, avoiding guessed/escaped paths.
            address = identifier.encode("ascii")
            if identifier not in self.ids:
                native_id = ValueID()
                result = self.dll.getValueID(address, metadata[1], 1, C.byref(native_id))
                if result != 0:
                    # Exact hierarchical names from OVA, not reconstructed slash paths.
                    result = self.dll.getValueID(signal["path"].encode("mbcs"), metadata[1], 1, C.byref(native_id))
                if result == 0:
                    self.ids[identifier] = (native_id, self.generation)
                    self.errors[identifier] = "Registriert; warte auf nächsten Remote-Datensatz"
                else:
                    self.errors[identifier] = "Port nicht bereit / Typ nicht verfügbar (VRESULT {})".format(result)
            if identifier not in self.write_ids:
                write_id = ValueID()
                result = self.dll.getValueID(address, metadata[1], 2, C.byref(write_id))
                if result != 0:
                    result = self.dll.getValueID(signal["path"].encode("mbcs"), metadata[1], 2, C.byref(write_id))
                if result == 0:
                    self.write_ids[identifier] = write_id
            if identifier in self.forces and self.forces[identifier] is None and identifier in self.write_ids:
                check(self.dll.setForced(self.write_ids[identifier], 2), "Eigene Force nach Neuinitialisierung freigeben")
                del self.forces[identifier]
            self.access[identifier] = {"readable": identifier in self.ids, "writable": identifier in self.write_ids}
        self.needs_resolve = False

    def _read(self, signal, native_id):
        metadata = NATIVE_TYPES[signal["nativeType"]]
        if metadata[2] == "String":
            buffer = C.create_string_buffer(65536)
            size = C.c_uint32(len(buffer))
            check(self.dll.readStringValue(native_id, buffer, C.byref(size)), "String lesen")
            return buffer.value.decode("utf-8", errors="replace")
        value = getattr(C, metadata[3])()
        check(getattr(self.dll, "read" + metadata[2] + "Value")(native_id, C.byref(value)), "Signal lesen")
        if isinstance(value.value, float) and not math.isfinite(value.value):
            raise RuntimeError("Signalwert ist nicht endlich")
        return str(value.value) if metadata[2] in ("Int64", "UInt64") else value.value

    def _check_project(self):
        if time.monotonic() - self.last_project_check < 2:
            return
        self.last_project_check = time.monotonic()
        buffer = C.create_string_buffer(32768)
        size = C.c_uint32(len(buffer))
        check(self.dll.getProjectName(buffer, C.byref(size)), "Projektname lesen")
        self.project_name = buffer.value.decode("mbcs", errors="replace")
        if self.catalog:
            expected = Path(self.catalog.get("projectName", "")).stem.casefold()
            actual = Path(self.project_name).stem.casefold()
            if expected != actual:
                self.model_changed = True
                self._invalidate("Modell gewechselt · Get Model Structure erneut ausführen")

    def poll(self):
        with self.lock:
            if not self.connected:
                return
            try:
                check(self.dll.connected(), "Verbindung unterbrochen")
                self._check_project()
                for _ in range(32):
                    remaining, fill = C.c_int32(), C.c_double()
                    result = self.dll.updateCurrentSet(C.byref(remaining), C.byref(fill))
                    if result in (2007, 2013, 2016):
                        self._invalidate("Simulation initialisiert; warte auf nächsten Datensatz")
                        self.needs_resolve = True
                    elif result in (2000, 2010):
                        self._invalidate("Simulation nicht bereit · Ramp-up abwarten")
                    elif result == 0:
                        self.generation += 1
                        if self.catalog and not self.model_changed:
                            for signal in self.catalog["signals"]:
                                registration = self.ids.get(signal["id"])
                                if not registration or self.generation <= registration[1]:
                                    continue
                                try:
                                    self.values[signal["id"]] = self._read(signal, registration[0])
                                    self.errors.pop(signal["id"], None)
                                except Exception as exc:
                                    self.values.pop(signal["id"], None)
                                    self.errors[signal["id"]] = str(exc)
                        self.updated_at = time.time() * 1000
                        self.ready = bool(self.values) and not self.model_changed
                    elif result not in (1, 2001):
                        check(result, "updateCurrentSet")
                    if (self.needs_resolve or (result == 0 and time.monotonic() - self.last_resolve > 2)) and not self.model_changed:
                        self._resolve()
                    if result in (1, 2001) or remaining.value <= 0:
                        break
                self.message = "Modell gewechselt · Get Model Structure erneut ausführen" if self.model_changed else "Live-Werte werden gelesen" if self.ready else "Verbunden · warte auf Ramp-up / gültige Ports"
            except Exception as exc:
                self.connected = False
                self.message = str(exc)
                self._invalidate(str(exc))

    def write(self, identifier, value):
        with self.lock:
            if not self.connected or not self.ready or self.model_changed or self.updated_at is None or time.time() * 1000 - self.updated_at > 2000:
                raise RuntimeError("Keine schreibbereite Verbindung. Modellstruktur laden und gültigen Datensatz abwarten.")
            signal = next((s for s in self.catalog["signals"] if s["id"] == identifier), None)
            native_id = self.write_ids.get(identifier)
            if not signal or native_id is None:
                raise RuntimeError("Kein bestätigter Schreibzugriff auf diesen Port.")
            metadata = NATIVE_TYPES[signal["nativeType"]]
            converted = validate_value(metadata, value)
            check(self.dll.setForced(native_id, 1), "Force aktivieren")
            self.forces[identifier] = native_id
            try:
                check(getattr(self.dll, "write" + metadata[2] + "Value")(native_id, converted), "Signal schreiben")
            except Exception:
                if self.dll.setForced(native_id, 2) == 0:
                    self.forces.pop(identifier, None)
                raise

    def snapshot(self):
        with self.lock:
            return {"connected": self.connected, "ready": self.ready,
                    "message": self.message, "values": self.values.copy(), "errors": self.errors.copy(),
                    "access": self.access.copy(), "forcedIds": list(self.forces),
                    "updatedAt": self.updated_at, "generation": self.generation,
                    "stale": self.updated_at is None or time.time() * 1000 - self.updated_at > 2000,
                    "projectName": self.project_name, "modelChanged": self.model_changed, "config": self.config.copy()}


def validate_value(metadata, value):
    suffix = metadata[2]
    if suffix == "Boolean":
        if not isinstance(value, bool):
            raise ValueError("Ein Bool-Wert ist erforderlich.")
        return value
    if suffix == "String":
        if not isinstance(value, str) or "\0" in value or len(value.encode("utf-8")) > 65535:
            raise ValueError("Ungültiger String (max. 65535 UTF-8-Bytes, keine NUL-Zeichen).")
        return value.encode("utf-8")
    if suffix in ("Int64", "UInt64"):
        if not isinstance(value, str) or not re.fullmatch(r'-?[0-9]+', value):
            raise ValueError("64-Bit-Ganzzahlen als Dezimaltext eingeben.")
        value = int(value, 10)
    elif isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError("Eine endliche Zahl ist erforderlich.")
    if suffix.startswith("Int") or suffix.startswith("UInt"):
        unsigned = suffix.startswith("UInt")
        bits = int(suffix[4:] if unsigned else suffix[3:])
        minimum, maximum = (0, 2 ** bits - 1) if unsigned else (-2 ** (bits - 1), 2 ** (bits - 1) - 1)
        if int(value) != value or not minimum <= value <= maximum:
            raise ValueError("Wert liegt außerhalb des {}-Bereichs.".format(suffix))
        return int(value)
    if suffix == "Real32" and abs(value) > 3.402823466e38:
        raise ValueError("Wert liegt außerhalb des Real32-Bereichs.")
    return value
