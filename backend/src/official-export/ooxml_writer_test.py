from __future__ import annotations

import shutil
import subprocess
import tempfile
import unittest
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

from ooxml_writer import MapValidationError, write_official_copy

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "frontend/public/plantillas-oficiales/CARTILLAS_EN_GENERAL.xlsx"
MAP = Path(__file__).with_name("maps") / "control-apriete-01-v1.json"
NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"


def read_cell_text(path: Path, sheet_path: str, address: str) -> str:
    with zipfile.ZipFile(path, "r") as archive:
        strings = ET.fromstring(archive.read("xl/sharedStrings.xml"))
        values = ["".join(item.itertext()) for item in strings.findall(f"{{{NS}}}si")]
        worksheet = ET.fromstring(archive.read(sheet_path))
        cell = next(item for item in worksheet.findall(f".//{{{NS}}}c") if item.attrib.get("r") == address)
        value = cell.findtext(f"{{{NS}}}v")
        return values[int(value)] if cell.attrib.get("t") == "s" else value or ""


class OOXMLWriterTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory(prefix="unna-ooxml-qa-")
        self.output = Path(self.temp.name) / "control-apriete-01-qa.xlsx"
        self.qa_values = {
            "puntos_apriete": [
                {"biela_pos_3a": "QA-N12", "biela_320nm": "QA-O12"},
                {"longitud_biela_mm": "QA-P13", "suspension_primaria": "QA-AA13"}
            ],
            "instrumentos": [
                {"codigo": "QA-INS-01", "descripcion": "Instrumento QA", "fecha_calibracion": "2026-11-05"},
                {"modelo": "Modelo QA", "observaciones": "Solo prueba temporal"}
            ]
        }

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_writes_only_declared_cells_and_preserves_ooxml_parts(self) -> None:
        result = write_official_copy(SOURCE, self.output, MAP, self.qa_values)
        self.assertTrue(self.output.exists())
        self.assertEqual(set(result.written_cells), {"N12", "O12", "P13", "AA13", "A45", "F45", "Q45", "N46", "AA46"})
        self.assertEqual(read_cell_text(self.output, "xl/worksheets/sheet6.xml", "N12"), "QA-N12")
        self.assertEqual(read_cell_text(self.output, "xl/worksheets/sheet6.xml", "AA46"), "Solo prueba temporal")
        self.assertNotEqual(result.input_hashes["xl/worksheets/sheet6.xml"], result.output_hashes["xl/worksheets/sheet6.xml"])
        self.assertNotEqual(result.input_hashes["xl/sharedStrings.xml"], result.output_hashes["xl/sharedStrings.xml"])
        for part in ("xl/drawings/drawing6.xml", "xl/drawings/_rels/drawing6.xml.rels", "xl/media/image1.png", "xl/media/image5.png", "xl/media/image10.png"):
            self.assertEqual(result.input_hashes[part], result.output_hashes[part], part)

    def test_preserves_print_configuration_and_merges(self) -> None:
        write_official_copy(SOURCE, self.output, MAP, self.qa_values)
        with zipfile.ZipFile(SOURCE, "r") as before, zipfile.ZipFile(self.output, "r") as after:
            first = ET.fromstring(before.read("xl/worksheets/sheet6.xml"))
            second = ET.fromstring(after.read("xl/worksheets/sheet6.xml"))
            for tag in ("mergeCells", "pageMargins", "pageSetup", "printOptions", "rowBreaks", "drawing"):
                self.assertEqual(ET.tostring(first.find(f"{{{NS}}}{tag}")), ET.tostring(second.find(f"{{{NS}}}{tag}")), tag)

    def test_rejects_columns_without_documentary_destination(self) -> None:
        with self.assertRaisesRegex(MapValidationError, "Columnas no declaradas"):
            write_official_copy(SOURCE, self.output, MAP, {"puntos_apriete": [{"amortiguador_vertical_1": "QA"}]})

    def test_rejects_write_to_secondary_merged_cell(self) -> None:
        with self.assertRaisesRegex(MapValidationError, "secundaria"):
            write_official_copy(SOURCE, self.output, MAP, {"instrumentos": [{"codigo": "QA"}]})

    def test_opens_with_libreoffice_using_a_temporary_copy(self) -> None:
        write_official_copy(SOURCE, self.output, MAP, self.qa_values)
        soffice = shutil.which("soffice") or "/Applications/LibreOffice.app/Contents/MacOS/soffice"
        self.assertTrue(Path(soffice).exists(), "LibreOffice no está disponible para la prueba de apertura.")
        converted = Path(self.temp.name) / "libreoffice-open"
        converted.mkdir()
        profile = Path(self.temp.name) / "libreoffice-profile"
        process = subprocess.run([soffice, f"-env:UserInstallation=file://{profile}", "--headless", "--convert-to", "xlsx", "--outdir", str(converted), str(self.output)], capture_output=True, text=True, timeout=60)
        self.assertEqual(process.returncode, 0, process.stderr or process.stdout)
        self.assertTrue((converted / self.output.name).exists())


if __name__ == "__main__":
    unittest.main()
