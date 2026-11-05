#!/usr/bin/env python3
"""Fill a mapped official XLSX template without rebuilding its workbook package.

Only XML parts that contain values are touched.  Drawings, media, styles, merged
cells, page setup, print areas and every unrelated worksheet are copied verbatim.
"""
from __future__ import annotations

import json
import re
import shutil
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
ET.register_namespace("", NS)
ET.register_namespace("r", REL_NS)


def cell_parts(address: str) -> tuple[int, int]:
    match = re.fullmatch(r"([A-Z]+)([1-9][0-9]*)", address)
    if not match:
        raise ValueError(f"Invalid Excel cell: {address}")
    letters, row = match.groups()
    col = 0
    for char in letters:
        col = col * 26 + ord(char) - 64
    return int(row), col


def sheet_path(archive: zipfile.ZipFile, wanted: str) -> str:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    relationship_id = None
    sheets = workbook.find(f"{{{NS}}}sheets")
    for sheet in list(sheets) if sheets is not None else []:
        if sheet.attrib.get("name") == wanted:
            relationship_id = sheet.attrib.get(f"{{{REL_NS}}}id")
            break
    if not relationship_id:
        raise ValueError(f"Sheet not found: {wanted}")
    rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    for rel in rels:
        if rel.attrib.get("Id") == relationship_id:
            target = rel.attrib["Target"]
            return "xl/" + target.lstrip("/") if not target.startswith("xl/") else target
    raise ValueError(f"Sheet relationship missing: {wanted}")


def shared_strings(archive: zipfile.ZipFile) -> tuple[ET.Element, dict[str, int]]:
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    values: dict[str, int] = {}
    for index, item in enumerate(root.findall(f"{{{NS}}}si")):
        values["".join(item.itertext())] = index
    return root, values


def shared_index(root: ET.Element, index: dict[str, int], value: str) -> int:
    if value in index:
        return index[value]
    item = ET.SubElement(root, f"{{{NS}}}si")
    text = ET.SubElement(item, f"{{{NS}}}t")
    if value.startswith(" ") or value.endswith(" ") or "\n" in value:
        text.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    text.text = value
    position = len(root.findall(f"{{{NS}}}si")) - 1
    index[value] = position
    root.set("count", str(position + 1))
    root.set("uniqueCount", str(position + 1))
    return position


def set_cell(sheet: ET.Element, address: str, value: object, strings: ET.Element, index: dict[str, int]) -> None:
    row_number, target_column = cell_parts(address)
    sheet_data = sheet.find(f"{{{NS}}}sheetData")
    if sheet_data is None:
        raise ValueError("Worksheet has no sheetData")
    row = next((candidate for candidate in sheet_data.findall(f"{{{NS}}}row") if int(candidate.attrib.get("r", "0")) == row_number), None)
    if row is None:
        row = ET.Element(f"{{{NS}}}row", {"r": str(row_number)})
        children = list(sheet_data)
        position = next((i for i, candidate in enumerate(children) if int(candidate.attrib.get("r", "0")) > row_number), len(children))
        sheet_data.insert(position, row)
    cell = next((candidate for candidate in row.findall(f"{{{NS}}}c") if candidate.attrib.get("r") == address), None)
    if cell is None:
        cell = ET.Element(f"{{{NS}}}c", {"r": address})
        cells = list(row)
        position = next((i for i, candidate in enumerate(cells) if cell_parts(candidate.attrib.get("r", "A1"))[1] > target_column), len(cells))
        row.insert(position, cell)
    for child in list(cell):
        cell.remove(child)
    if value is None or value == "":
        cell.attrib.pop("t", None)
        return
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        cell.attrib.pop("t", None)
        ET.SubElement(cell, f"{{{NS}}}v").text = str(value)
    else:
        cell.set("t", "s")
        ET.SubElement(cell, f"{{{NS}}}v").text = str(shared_index(strings, index, str(value)))


def set_visibility(workbook: ET.Element, visible_sheet: str) -> None:
    sheets = workbook.find(f"{{{NS}}}sheets")
    for sheet in list(sheets) if sheets is not None else []:
        if sheet.attrib.get("name") == visible_sheet:
            sheet.attrib.pop("state", None)
        else:
            sheet.set("state", "hidden")


def main() -> None:
    if len(sys.argv) != 5:
        raise SystemExit("Usage: export-official.py source.xlsx output.xlsx sheet values.json")
    source, output, values_file = map(Path, (sys.argv[1], sys.argv[2], sys.argv[4]))
    target_sheet = sys.argv[3]
    values = json.loads(values_file.read_text(encoding="utf-8"))
    with zipfile.ZipFile(source, "r") as original:
        target_path = sheet_path(original, target_sheet)
        strings, string_index = shared_strings(original)
        worksheet = ET.fromstring(original.read(target_path))
        for address, value in values.get("cells", {}).items():
            set_cell(worksheet, address, value, strings, string_index)
        workbook = ET.fromstring(original.read("xl/workbook.xml"))
        if values.get("solo_hoja"):
            set_visibility(workbook, target_sheet)
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as destination:
            for entry in original.infolist():
                if entry.filename == target_path:
                    destination.writestr(entry, ET.tostring(worksheet, encoding="utf-8", xml_declaration=True))
                elif entry.filename == "xl/sharedStrings.xml":
                    destination.writestr(entry, ET.tostring(strings, encoding="utf-8", xml_declaration=True))
                elif entry.filename == "xl/workbook.xml" and values.get("solo_hoja"):
                    destination.writestr(entry, ET.tostring(workbook, encoding="utf-8", xml_declaration=True))
                else:
                    destination.writestr(entry, original.read(entry.filename))


if __name__ == "__main__":
    main()
