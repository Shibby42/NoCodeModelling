"""Executed in the *existing* Virtuos terminal, with globals ova/output_file.

Uses the traversal API from VirtuosCloudConnectApp/resources/list_virtuos_hierarchy.py.
Unlike that diagram exporter this intentionally applies NO block or port filters
and never queries geometry, opens a project, starts a solver or changes the model.
Compatible with the embedded Python 3.7 shipped with Virtuos 3.8.
"""
import json


def export_structure(session, destination):
    project = session.getProjectInterface()
    if not project.isProjectOpen():
        raise RuntimeError("Bitte zuerst ein Projekt in ISG-virtuos oeffnen.")
    assembly = session.getBlockDiagramInterface().getAssembly()
    if assembly is None:
        raise RuntimeError("Das geoeffnete Modell hat kein Blockdiagramm-Assembly.")
    groups = (
        ("IN", "getNumInputPorts", "getInputPortsAt"),
        ("OUT", "getNumOutputPorts", "getOutputPortsAt"),
        ("EXT-IN", "getNumExternalInputPorts", "getExternalInputPortsAt"),
        ("EXT-OUT", "getNumExternalOutputPorts", "getExternalOutputPortsAt"),
    )

    def block_data(block, parents):
        name = str(block.getName())
        parts = parents + [name]
        return {"id": str(block.getInstanceUuid()), "name": name,
                "pathParts": parts, "type": str(block.getModTypeName()),
                "ports": [], "children": []}

    root = block_data(assembly, [])
    stack = [(assembly, root)]
    while stack:
        block, node = stack.pop()
        for direction, count_method, get_method in groups:
            for index in range(int(getattr(block, count_method)())):
                port = getattr(block, get_method)(index)
                if port is None:
                    raise RuntimeError("Leerer Port in " + node["name"])
                node["ports"].append({"id": str(port.getInstanceUuid()),
                    "name": str(port.getName()), "direction": direction,
                    "nativeType": str(port.getTypeNameOfDataValues())})
        for index in range(int(block.getNumSubModels())):
            child = block.getSubModelsAt(index)
            if child is None:
                raise RuntimeError("Leerer Unterbaustein in " + node["name"])
            data = block_data(child, node["pathParts"])
            node["children"].append(data)
            stack.append((child, data))
    result = {"projectName": str(project.getProjectName()),
              "projectDirectory": str(project.getProjectDirectory()), "root": root}
    with open(destination, "w", encoding="utf-8") as output:
        json.dump(result, output, ensure_ascii=False, separators=(",", ":"))
    print("Signal Studio: Modellstruktur und alle Ports exportiert.")


if "ova" in globals() and "output_file" in globals():
    export_structure(ova, output_file)
