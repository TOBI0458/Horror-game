"""Word-Ausgabe des Stundenplans (.docx, A4 quer)."""

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

import theme
from timetable import WEEKDAYS
from untis_client import hhmm

ROW_HEIGHT = Cm(1.45)
HEAD_HEIGHT = Cm(0.9)


def _shade(cell, hex_color):
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:fill"), hex_color)
    cell._tc.get_or_add_tcPr().append(shd)


def _border(cell, edge, hex_color, eighths):
    """Eine Zellkante faerben; `eighths` sind Achtelpunkte (Word-Einheit)."""
    properties = cell._tc.get_or_add_tcPr()
    borders = properties.find(qn("w:tcBorders"))
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        properties.append(borders)
    existing = borders.find(qn(f"w:{edge}"))
    if existing is not None:
        borders.remove(existing)
    element = OxmlElement(f"w:{edge}")
    element.set(qn("w:val"), "single")
    element.set(qn("w:sz"), str(eighths))
    element.set(qn("w:color"), hex_color)
    borders.append(element)


def _landscape(section):
    section.orientation = WD_ORIENT.LANDSCAPE
    section.page_width, section.page_height = section.page_height, section.page_width
    for attr in ("left_margin", "right_margin", "top_margin", "bottom_margin"):
        setattr(section, attr, Pt(37))


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


def _fill(doc_cell, entry, palette):
    background, accent = palette.of(entry.cells[0].key)
    doc_cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    _shade(doc_cell, background)
    _border(doc_cell, "left", accent, 18)      # Akzentstreifen wie im PDF
    first = True
    for cell in entry.cells:
        _run(_para(doc_cell, first), cell.head, 12, theme.INK, bold=True)
        first = False
        for line in cell.rest:
            _run(_para(doc_cell, False), line, 9, palette.of(cell.key)[1])


def _head_row(table, days):
    for idx, text in enumerate([""] + [WEEKDAYS[d] for d in days]):
        cell = table.rows[0].cells[idx]
        _shade(cell, theme.HEADER_BG)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        _run(_para(cell), text, 11.5, theme.HEADER_INK, bold=True)
    table.rows[0].height = HEAD_HEIGHT


def _unit_cell(cell, unit):
    _shade(cell, theme.UNIT_BG)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    _run(_para(cell), str(unit["name"]), 11, theme.INK, bold=True)
    _run(_para(cell, False), f"{hhmm(unit['startTime'])}\n{hhmm(unit['endTime'])}",
         6.8, theme.INK_SOFT)


def render(path, units, rows, days, grid, title, subtitle):
    palette = theme.Colors()
    doc = Document()
    _landscape(doc.sections[0])
    doc.styles["Normal"].font.name = "Calibri"

    _run(doc.add_paragraph(), title, 19, theme.INK, bold=True)
    sub = doc.add_paragraph()
    _run(sub, subtitle, 9.5, theme.INK_SOFT)
    sub.paragraph_format.space_after = Pt(8)

    table = doc.add_table(rows=len(rows) + 1, cols=len(days) + 1)
    table.style = "Table Grid"
    _head_row(table, days)

    for row_idx, (unit, index) in enumerate(zip(units, rows), start=1):
        row = table.rows[row_idx]
        row.height = ROW_HEIGHT
        _unit_cell(row.cells[0], unit)

        for col_idx, day in enumerate(days, start=1):
            entry = grid.get(day, index)
            if not entry:
                if not grid.is_covered(day, index):
                    _para(row.cells[col_idx])
                continue
            target = row.cells[col_idx]
            if entry.span > 1:
                target = target.merge(table.rows[row_idx + entry.span - 1].cells[col_idx])
            _fill(target, entry, palette)

        following = units[row_idx] if row_idx < len(units) else None
        if theme.is_break_after(unit, following):
            for cell in row.cells:
                _border(cell, "bottom", theme.BREAK_LINE, 12)

    doc.save(path)
