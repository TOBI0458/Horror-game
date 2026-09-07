"""Word-Ausgabe des Stundenplans (.docx, A4 quer)."""

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

from timetable import WEEKDAYS
from untis_client import hhmm

HEADER_BG = "2B3A55"
UNIT_BG = "EEF1F6"
LESSON_BG = "DFE6F2"


def _shade(cell, hex_color):
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:fill"), hex_color)
    cell._tc.get_or_add_tcPr().append(shd)


def _landscape(section):
    section.orientation = WD_ORIENT.LANDSCAPE
    section.page_width, section.page_height = section.page_height, section.page_width
    for attr in ("left_margin", "right_margin", "top_margin", "bottom_margin"):
        setattr(section, attr, Pt(34))


def _para(cell, first=True):
    p = cell.paragraphs[0] if first and cell.paragraphs else cell.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    return p


def _run(paragraph, text, size, color, bold=False):
    run = paragraph.add_run(text)
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = RGBColor.from_string(color)
    return run


def _fill(doc_cell, entry):
    doc_cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    _shade(doc_cell, LESSON_BG)
    first = True
    for cell in entry.cells:
        _run(_para(doc_cell, first), cell.head, 10.5, "16283F", bold=True)
        first = False
        for line in cell.rest:
            _run(_para(doc_cell, False), line, 9, "41506B")


def render(path, units, rows, days, grid, title, subtitle):
    doc = Document()
    _landscape(doc.sections[0])
    doc.styles["Normal"].font.name = "Calibri"

    _run(doc.add_paragraph(), title, 16, "1A1A1A", bold=True)
    sub = doc.add_paragraph()
    _run(sub, subtitle, 9.5, "666666")
    sub.paragraph_format.space_after = Pt(8)

    table = doc.add_table(rows=len(rows) + 1, cols=len(days) + 1)
    table.style = "Table Grid"

    for idx, text in enumerate(["Stunde"] + [WEEKDAYS[d] for d in days]):
        cell = table.rows[0].cells[idx]
        _shade(cell, HEADER_BG)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        _run(_para(cell), text, 10.5, "FFFFFF", bold=True)

    for row_idx, (unit, index) in enumerate(zip(units, rows), start=1):
        row = table.rows[row_idx]
        row.height = Cm(1.5)
        label = row.cells[0]
        _shade(label, UNIT_BG)
        label.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        _run(_para(label), hhmm(unit["startTime"]), 7, "666666")
        _run(_para(label, False), str(unit["name"]), 10, "1A1A1A", bold=True)
        _run(_para(label, False), hhmm(unit["endTime"]), 7, "666666")

        for col_idx, day in enumerate(days, start=1):
            entry = grid.get(day, index)
            if not entry:
                if not grid.is_covered(day, index):
                    _para(row.cells[col_idx])
                continue
            target = row.cells[col_idx]
            if entry.span > 1:
                bottom = table.rows[row_idx + entry.span - 1].cells[col_idx]
                target = target.merge(bottom)
            _fill(target, entry)

    doc.save(path)
