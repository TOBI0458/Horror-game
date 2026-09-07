"""Word-Ausgabe des Standard-Stundenplans (.docx, A4 quer)."""

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor

from timetable import WEEKDAYS
from untis_client import hhmm

HEADER_BG = "2B3A55"
UNIT_BG = "EEF1F6"
STRIPE_BG = "F7F9FC"


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


def _fill(doc_cell, cells, stripe):
    doc_cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    if stripe:
        _shade(doc_cell, STRIPE_BG)
    if not cells:
        _para(doc_cell)
        return
    first = True
    for entry in cells:
        lines = entry.lines
        _run(_para(doc_cell, first), lines[0], 9.5, "1A1A1A", bold=True)
        first = False
        for line in lines[1:]:
            _run(_para(doc_cell, False), line, 7.5, "555555")


def render(path, units, days, grid, title, subtitle):
    doc = Document()
    _landscape(doc.sections[0])
    doc.styles["Normal"].font.name = "Calibri"

    heading = doc.add_paragraph()
    _run(heading, title, 16, "1A1A1A", bold=True)
    sub = doc.add_paragraph()
    _run(sub, subtitle, 9.5, "666666")
    sub.paragraph_format.space_after = Pt(10)

    table = doc.add_table(rows=len(units) + 1, cols=len(days) + 1)
    table.style = "Table Grid"

    for idx, text in enumerate(["Stunde"] + [WEEKDAYS[d] for d in days]):
        cell = table.rows[0].cells[idx]
        _shade(cell, HEADER_BG)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        _run(_para(cell), text, 10, "FFFFFF", bold=True)

    for row_idx, unit in enumerate(units, start=1):
        row = table.rows[row_idx]
        label = row.cells[0]
        _shade(label, UNIT_BG)
        label.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        _run(_para(label), str(unit["name"]), 9, "1A1A1A", bold=True)
        _run(_para(label, False), f"{hhmm(unit['startTime'])}\n{hhmm(unit['endTime'])}",
             6.5, "666666")
        stripe = row_idx % 2 == 0
        for col_idx, day in enumerate(days, start=1):
            _fill(row.cells[col_idx], grid.get((day, unit["startTime"]), []), stripe)

    doc.save(path)
