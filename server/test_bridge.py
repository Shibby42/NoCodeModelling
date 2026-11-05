import ctypes as C
import tempfile
import time
import unittest
from pathlib import Path

from app import validated_config
from export_structure import export_structure
from native import NativeRemote, ValueID, validate_value
from structure import NATIVE_TYPES, normalize_catalog


def example_catalog():
    return normalize_catalog({"projectName": "Example_1", "root": {
        "id": "root", "name": "Block Diagram", "pathParts": ["Block Diagram"], "type": "Submodel", "ports": [],
        "children": [{"id": "axis", "name": "Axis", "pathParts": ["Block Diagram", "Axis"], "type": "Axis", "children": [],
                      "ports": [{"id": "port-uuid", "name": "ActualValue", "direction": "OUT", "nativeType": "VReal64"},
                                {"id": "ref-uuid", "name": "AxisRef", "direction": "IN", "nativeType": "VAxis"}]}]}})


class FakeDLL:
    def __init__(self):
        self.events = [2016, 0, 1]
        self.calls = []
        self.forces = []
        self.live_value = 123.5
        self.write_result = 0
        self.connection_result = 0

    def connected(self): return self.connection_result

    def getProjectName(self, buffer, size):
        buffer.value = b"Example_1"
        return 0

    def updateCurrentSet(self, remaining, fill):
        remaining._obj.value = 0
        return self.events.pop(0) if self.events else 1

    def getValueID(self, address, datatype, access, output):
        self.calls.append((address, access))
        if not address.startswith(b"[Block Diagram]"):
            return -1
        output._obj.value = 100 + access
        return 0

    def readReal64Value(self, native_id, output):
        output._obj.value = self.live_value
        return 0

    def setForced(self, native_id, mode):
        self.forces.append((native_id.value, mode))
        return 0

    def writeReal64Value(self, native_id, value):
        self.calls.append(("write", value))
        return self.write_result


class NativeTests(unittest.TestCase):
    def create_remote(self):
        remote = NativeRemote()
        remote.set_catalog(example_catalog())
        remote.dll = FakeDLL()
        remote.connected = True
        return remote

    def test_value_id_abi(self):
        self.assertEqual(C.sizeof(ValueID), 20)

    def test_ova_ports_are_complete_including_unsupported_reference_ports(self):
        catalog = example_catalog()
        self.assertEqual(len(catalog["signals"]), 2)
        self.assertEqual(catalog["signals"][1]["nativeType"], "VAxis")
        self.assertFalse(catalog["signals"][1]["readable"])
        self.assertEqual(catalog["root"]["children"][0]["signalIds"], ["port-uuid", "ref-uuid"])

    def test_exact_ova_path_fallback_and_wait_for_next_dataset(self):
        remote = self.create_remote()
        remote.poll()
        self.assertEqual(remote.values, {})
        self.assertIn((b"port-uuid", 1), remote.dll.calls)
        self.assertIn((b"[Block Diagram].[Axis].[ActualValue]", 1), remote.dll.calls)
        remote.poll()
        self.assertEqual(remote.values, {"port-uuid": 123.5})
        self.assertTrue(remote.ready)
        self.assertIn("ref-uuid", remote.errors)

    def test_repeat_does_not_generate_fresh_measurement(self):
        remote = self.create_remote()
        remote.poll(); remote.poll()
        timestamp = remote.updated_at
        remote.poll()
        self.assertEqual(remote.updated_at, timestamp)

    def test_read_and_write_ids_are_independent_and_release_is_owned(self):
        remote = self.create_remote()
        remote.poll(); remote.poll()
        remote.write("port-uuid", 10)
        self.assertEqual(remote.dll.forces, [(102, 1)])
        remote.release_forces()
        self.assertEqual(remote.dll.forces[-1], (102, 2))
        self.assertEqual(remote.forces, {})

    def test_failed_write_releases_own_force(self):
        remote = self.create_remote()
        remote.poll(); remote.poll()
        remote.dll.write_result = -5
        with self.assertRaisesRegex(RuntimeError, "Signal schreiben"):
            remote.write("port-uuid", 10)
        self.assertEqual(remote.forces, {})
        self.assertEqual(remote.dll.forces[-1][1], 2)

    def test_stale_dataset_cannot_be_written(self):
        remote = self.create_remote()
        remote.poll(); remote.poll()
        remote.updated_at = time.time() * 1000 - 3000
        with self.assertRaisesRegex(RuntimeError, "schreibbereite"):
            remote.write("port-uuid", 10)
        self.assertEqual(remote.dll.forces, [])

    def test_rampdown_clears_values_and_invalidates_force_handles(self):
        remote = self.create_remote()
        remote.poll(); remote.poll()
        remote.write("port-uuid", 10)
        remote.dll.events = [2010]
        remote.poll()
        self.assertFalse(remote.ready)
        self.assertEqual(remote.values, {})
        self.assertIsNone(remote.forces["port-uuid"])

    def test_new_interface_releases_forces_through_fresh_ids(self):
        remote = self.create_remote()
        remote.poll(); remote.poll()
        remote.write("port-uuid", 10)
        remote.dll.events = [2016, 0]
        remote.poll()
        self.assertEqual(remote.forces, {})
        self.assertEqual(remote.dll.forces[-1], (102, 2))
        self.assertEqual(remote.values, {})
        remote.poll()
        self.assertTrue(remote.ready)

    def test_disconnect_does_not_display_old_values_as_live(self):
        remote = self.create_remote()
        remote.poll(); remote.poll()
        remote.dll.connection_result = -1
        remote.poll()
        self.assertFalse(remote.connected)
        self.assertEqual(remote.values, {})
        self.assertTrue(remote.snapshot()["stale"])

    def test_scalar_validation_preserves_64_bit_integers(self):
        self.assertEqual(validate_value(NATIVE_TYPES["VUInt64"], "18446744073709551615"), 2**64 - 1)
        for value in ("18446744073709551616", "1_000", 123):
            with self.assertRaises(ValueError): validate_value(NATIVE_TYPES["VUInt64"], value)
        with self.assertRaises(ValueError): validate_value(NATIVE_TYPES["VInt8"], 128)
        with self.assertRaises(ValueError): validate_value(NATIVE_TYPES["VReal64"], float('nan'))
        with self.assertRaises(ValueError): validate_value(NATIVE_TYPES["VBoolean"], 1)

    def test_rejects_invalid_connection_configuration(self):
        config = NativeRemote().config
        self.assertEqual(validated_config(config), config)
        for patch in ({"port": "99999"}, {"processId": -1}, {"objectName": "A\0B"}):
            with self.assertRaises(ValueError): validated_config({**config, **patch})


class ExportTests(unittest.TestCase):
    def test_export_reads_the_existing_session_without_filters_or_model_changes(self):
        class Port:
            def getInstanceUuid(self): return "port"
            def getName(self): return "time"
            def getTypeNameOfDataValues(self): return "VReal64"

        class Block:
            def __init__(self, root=False): self.root = root
            def getName(self): return "Block Diagram" if self.root else "Default View"
            def getInstanceUuid(self): return "root" if self.root else "view"
            def getModTypeName(self): return "Submodel" if self.root else "VControlConnectionInterface"
            def getNumInputPorts(self): return 0
            def getNumOutputPorts(self): return 1
            def getOutputPortsAt(self, index): return Port()
            def getNumExternalInputPorts(self): return 0
            def getNumExternalOutputPorts(self): return 0
            def getNumSubModels(self): return 1 if self.root else 0
            def getSubModelsAt(self, index): return Block()

        class Project:
            def isProjectOpen(self): return True
            def getProjectName(self): return "unsaved"
            def getProjectDirectory(self): return ""

        class Session:
            def getProjectInterface(self): return Project()
            def getBlockDiagramInterface(self): return self
            def getAssembly(self): return Block(True)

        import json
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "structure.json"
            export_structure(Session(), str(path))
            result = json.loads(path.read_text(encoding='utf-8'))
            self.assertEqual(result["root"]["ports"][0]["name"], "time")
            self.assertEqual(result["root"]["children"][0]["name"], "Default View")


if __name__ == '__main__':
    unittest.main()
