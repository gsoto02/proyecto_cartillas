#!/usr/bin/env python3
"""OOXML-preserving writer for draft official-export maps.

This module writes only destinations resolved from an approved map contract.
It never modifies the source workbook and copies every unrelated ZIP part verbatim.
"""
from __future__ import annotations

import base64
import hashlib
import json
import re
import shutil
import tempfile
import zipfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Any

NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
ET.register_namespace("", NS)
ET.register_namespace("r", REL_NS)

CELL = re.compile(r"^[A-Z]+[1-9][0-9]*$")


class MapValidationError(ValueError):
    """Raised when input data attempts to write outside a map contract."""


@dataclass(frozen=True)
class WriteResult:
    written_cells: tuple[str, ...]
    input_hashes: dict[str, str]
    output_hashes: dict[str, str]
    unchanged_parts: tuple[str, ...]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def package_hashes(path: Path) -> dict[str, str]:
    with zipfile.ZipFile(path, "r") as archive:
        return {entry.filename: hashlib.sha256(archive.read(entry.filename)).hexdigest() for entry in archive.infolist()}


def cell_parts(address: str) -> tuple[int, int]:
    match = re.fullmatch(r"([A-Z]+)([1-9][0-9]*)", address)
    if not match:
        raise MapValidationError(f"Celda inválida: {address}")
    letters, row = match.groups()
    column = 0
    for letter in letters:
        column = column * 26 + ord(letter) - 64
    return int(row), column


def range_parts(value: str) -> tuple[tuple[int, int], tuple[int, int]]:
    start, separator, end = value.partition(":")
    if not separator:
        raise MapValidationError(f"Rango inválido: {value}")
    start_parts, end_parts = cell_parts(start), cell_parts(end)
    if start_parts[0] > end_parts[0] or start_parts[1] > end_parts[1]:
        raise MapValidationError(f"Rango invertido: {value}")
    return start_parts, end_parts


def inside_range(address: str, value: str) -> bool:
    (start_row, start_column), (end_row, end_column) = range_parts(value)
    row, column = cell_parts(address)
    return start_row <= row <= end_row and start_column <= column <= end_column


def sheet_path(archive: zipfile.ZipFile, sheet_name: str) -> str:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    relationship_id = next((sheet.attrib.get(f"{{{REL_NS}}}id") for sheet in workbook.findall(f"{{{NS}}}sheets/{{{NS}}}sheet") if sheet.attrib.get("name") == sheet_name), None)
    if not relationship_id:
        raise MapValidationError(f"Hoja no encontrada: {sheet_name}")
    relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    target = next((relationship.attrib.get("Target") for relationship in relationships if relationship.attrib.get("Id") == relationship_id), None)
    if not target:
        raise MapValidationError(f"Relación de hoja no encontrada: {sheet_name}")
    return "xl/" + target.lstrip("/") if not target.startswith("xl/") else target


def merged_ranges(worksheet: ET.Element) -> set[str]:
    return {merge.attrib["ref"] for merge in worksheet.findall(f"{{{NS}}}mergeCells/{{{NS}}}mergeCell") if "ref" in merge.attrib}


def merge_anchor(address: str, merges: set[str]) -> None:
    for merged in merges:
        if inside_range(address, merged) and address != merged.split(":", 1)[0]:
            raise MapValidationError(f"La celda {address} es secundaria en la combinación {merged}.")


def map_destinations(document_map: dict[str, Any]) -> dict[str, tuple[str, str]]:
    destinations: dict[str, tuple[str, str]] = {}
    for field, target in document_map.get("cells", {}).items():
        cell = target.get("cell")
        if not isinstance(cell, str) or not CELL.fullmatch(cell):
            raise MapValidationError(f"Destino de campo inválido: {field}")
        destinations[cell] = (field, target.get("type", "texto"))
    for table in document_map.get("tables", []):
        field = table.get("field")
        if not isinstance(field, str):
            raise MapValidationError("Tabla sin campo de origen.")
        for row in table.get("rows", []):
            source_index, excel_row = row.get("sourceIndex"), row.get("excelRow")
            if not isinstance(source_index, int) or not isinstance(excel_row, int):
                raise MapValidationError(f"Fila inválida en {field}.")
            for column, target in table.get("columns", {}).items():
                template = target.get("cellTemplate")
                if not isinstance(template, str):
                    raise MapValidationError(f"Columna sin destino en {field}.{column}.")
                cell = template.replace("{row}", str(excel_row))
                if not CELL.fullmatch(cell):
                    raise MapValidationError(f"Destino inválido: {cell}")
                if cell in destinations:
                    raise MapValidationError(f"Destino duplicado: {cell}")
                destinations[cell] = (f"{field}[{source_index}].{column}", target.get("type", "texto"))
    return destinations


def resolve_writes(document_map: dict[str, Any], values: dict[str, Any]) -> dict[str, object]:
    area = document_map.get("authorizedArea")
    if not isinstance(area, str):
        raise MapValidationError("El mapa no declara un área autorizada.")
    destinations = map_destinations(document_map)
    writes: dict[str, object] = {}
    fields = {table["field"]: table for table in document_map.get("tables", [])}
    known_cells = set(document_map.get("cells", {}))
    unknown = set(values) - set(fields) - known_cells
    if unknown:
        raise MapValidationError(f"Campos no declarados en el mapa: {', '.join(sorted(unknown))}")
    for field, target in document_map.get("cells", {}).items():
        if field in values:
            writes[target["cell"]] = values[field]
    for field, rows in values.items():
        table = fields.get(field)
        if not table:
            continue
        if not isinstance(rows, list):
            raise MapValidationError(f"El campo {field} debe ser una tabla.")
        row_destinations = {row["sourceIndex"]: row["excelRow"] for row in table["rows"]}
        if len(rows) > len(row_destinations):
            raise MapValidationError(f"La tabla {field} excede las filas autorizadas.")
        for index, item in enumerate(rows):
            if not isinstance(item, dict):
                raise MapValidationError(f"La fila {index} de {field} no es un objeto.")
            if index not in row_destinations:
                raise MapValidationError(f"La fila {index} de {field} no tiene destino autorizado.")
            columns = table["columns"]
            unsupported = set(item) - set(columns)
            if unsupported:
                raise MapValidationError(f"Columnas no declaradas en {field}[{index}]: {', '.join(sorted(unsupported))}")
            for column, value in item.items():
                target = columns[column]
                cell = target["cellTemplate"].replace("{row}", str(row_destinations[index]))
                writes[cell] = value
    for cell in writes:
        if cell not in destinations:
            raise MapValidationError(f"Destino no declarado: {cell}")
        if not inside_range(cell, area):
            raise MapValidationError(f"Destino fuera del área autorizada: {cell}")
    return writes


def shared_strings(archive: zipfile.ZipFile) -> tuple[ET.Element, dict[str, int]]:
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    values = {"".join(item.itertext()): index for index, item in enumerate(root.findall(f"{{{NS}}}si"))}
    return root, values


def shared_index(root: ET.Element, values: dict[str, int], value: str) -> int:
    if value in values:
        return values[value]
    item = ET.SubElement(root, f"{{{NS}}}si")
    text = ET.SubElement(item, f"{{{NS}}}t")
    if value.startswith(" ") or value.endswith(" ") or "\n" in value:
        text.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    text.text = value
    position = len(root.findall(f"{{{NS}}}si")) - 1
    values[value] = position
    root.set("count", str(position + 1))
    root.set("uniqueCount", str(position + 1))
    return position


def set_cell(worksheet: ET.Element, address: str, value: object, strings: ET.Element, string_index: dict[str, int]) -> None:
    row_number, target_column = cell_parts(address)
    sheet_data = worksheet.find(f"{{{NS}}}sheetData")
    if sheet_data is None:
        raise MapValidationError("La hoja no tiene sheetData.")
    row = next((candidate for candidate in sheet_data.findall(f"{{{NS}}}row") if int(candidate.attrib.get("r", "0")) == row_number), None)
    if row is None:
        row = ET.Element(f"{{{NS}}}row", {"r": str(row_number)})
        position = next((index for index, candidate in enumerate(list(sheet_data)) if int(candidate.attrib.get("r", "0")) > row_number), len(sheet_data))
        sheet_data.insert(position, row)
    cell = next((candidate for candidate in row.findall(f"{{{NS}}}c") if candidate.attrib.get("r") == address), None)
    if cell is None:
        cell = ET.Element(f"{{{NS}}}c", {"r": address})
        position = next((index for index, candidate in enumerate(list(row)) if cell_parts(candidate.attrib.get("r", "A1"))[1] > target_column), len(row))
        row.insert(position, cell)
    for child in list(cell):
        if child.tag in {f"{{{NS}}}v", f"{{{NS}}}f", f"{{{NS}}}is"}:
            cell.remove(child)
    if value is None or value == "":
        cell.attrib.pop("t", None)
        return
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        cell.attrib.pop("t", None)
        ET.SubElement(cell, f"{{{NS}}}v").text = str(value)
        return
    cell.set("t", "s")
    ET.SubElement(cell, f"{{{NS}}}v").text = str(shared_index(strings, string_index, str(value)))


def preserved_features(worksheet: ET.Element) -> dict[str, bytes]:
    names = ("mergeCells", "pageMargins", "pageSetup", "printOptions", "rowBreaks", "colBreaks", "drawing")
    return {name: ET.tostring(element, encoding="utf-8") for name in names if (element := worksheet.find(f"{{{NS}}}{name}")) is not None}


def write_official_copy(source: Path, output: Path, map_path: Path, values: dict[str, Any]) -> WriteResult:
    document_map = json.loads(map_path.read_text(encoding="utf-8"))
    if sha256_file(source) != document_map.get("sourceSha256"):
        raise MapValidationError("El hash del archivo fuente no coincide con el mapa documental.")
    if document_map.get("status") != "borrador":
        raise MapValidationError("Esta fase solo admite mapas en estado borrador.")
    writes = resolve_writes(document_map, values)
    input_hashes = package_hashes(source)
    with zipfile.ZipFile(source, "r") as original:
        worksheet_path = sheet_path(original, document_map["sheetName"])
        worksheet = ET.fromstring(original.read(worksheet_path))
        before_features = preserved_features(worksheet)
        merges = merged_ranges(worksheet)
        for address in writes:
            merge_anchor(address, merges)
        strings, string_index = shared_strings(original)
        for address, value in writes.items():
            set_cell(worksheet, address, value, strings, string_index)
        if before_features != preserved_features(worksheet):
            raise MapValidationError("La escritura alteró una estructura de impresión o combinación protegida.")
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as destination:
            for entry in original.infolist():
                if entry.filename == worksheet_path:
                    destination.writestr(entry, ET.tostring(worksheet, encoding="utf-8", xml_declaration=True))
                elif entry.filename == "xl/sharedStrings.xml":
                    destination.writestr(entry, ET.tostring(strings, encoding="utf-8", xml_declaration=True))
                else:
                    destination.writestr(entry, original.read(entry.filename))
    output_hashes = package_hashes(output)
    allowed_changes = {worksheet_path, "xl/sharedStrings.xml"}
    changed = {part for part, digest in input_hashes.items() if output_hashes.get(part) != digest}
    unauthorized = changed - allowed_changes
    if unauthorized:
        raise MapValidationError(f"Partes OOXML no autorizadas modificadas: {', '.join(sorted(unauthorized))}")
    return WriteResult(tuple(sorted(writes)), input_hashes, output_hashes, tuple(sorted(set(input_hashes) - changed)))


def main() -> None:
    import sys
    if len(sys.argv) != 5:
        raise SystemExit("Uso: ooxml_writer.py fuente.xlsx salida.xlsx mapa.json valores.json")
    source, output, map_path, values_path = map(Path, sys.argv[1:])
    values = json.loads(values_path.read_text(encoding="utf-8"))
    result = write_official_copy(source, output, map_path, values)
    print(json.dumps({"writtenCells": result.written_cells, "unchangedParts": result.unchanged_parts}, ensure_ascii=False))


if __name__ == "__main__":
    main()
