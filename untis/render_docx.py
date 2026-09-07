"""Word-Ausgabe (.docx, A4 quer, eine Seite pro Woche)."""

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor

from timetable import STATE_COLORS, WEEKDAYS
from untis_client import hhmm

HEADER_BG = "2B3A55"
UNIT_BG = "EEF1F6"


def _hex(value):
    return value.lstrip("#").upper()


def _shade(cell, hex_color):
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:fill"), _hex(hex_color))
    cell._tc.get_or_add_tcPr().append(shd)


def _landscape(section):
    section.orientation = WD_ORIENT.LANDSCAPE
    section.page_width, section.page_height = section.page_height, section.page_width
    for attr in ("left_margin", "right_margin", "top_margin", "bottom_margin"):
        setattr(section, attr, Pt(34))


def _para(cell, first=True):
    if first and cell.paragraphs:
        p = cell.paragraphs[0]
    else:
        p = cell.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    return p


def _write_line(paragraph, segments, size, color, bold=False):
    for i, seg in enumerate(segments):
        run = paragraph.add_run(("" if i == 0 else " ") + seg.text)
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.strike = seg.struck
        run.font.color.rgb = RGBColor.from_string(_hex(color))


def _fill_cell(doc_cell, cells):
    doc_cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    if not cells:
        _para(doc_cell)
        return
    _shade(doc_cell, STATE_COLORS[cells[0].state]["fill"])
    first = True
    for entry in cells:
        color = STATE_COLORS[entry.state]["text"]
        lines = entry.lines
        p = _para(doc_cell, first)
        _write_line(p, lines[0], 9, color, bold=True)
        first = False
        for line in lines[1:]:
            _write_line(_para(doc_cell, False), line, 7.5, color)


def _week_table(doc, units, dates, grid):
    table = doc.add_table(rows=len(units) + 1, cols=len(dates) + 1)
    table.style = "Table Grid"

    head = table.rows[0]
    for idx, text in enumerate(["Stunde"] + [WEEKDAYS[d.weekday()] for d in dates]):
        cell = head.cells[idx]
        _shade(cell, HEADER_BG)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = _para(cell)
        run = p.add_run(text)
        run.font.bold = True
        run.font.size = Pt(10)
        run.font.color.rgb = RGBColor.from_string("FFFFFF")
        if idx:
            sub = _para(cell, False).add_run(dates[idx - 1].strftime("%d.%m."))
            sub.font.size = Pt(7)
            sub.font.color.rgb = RGBColor.from_string("C9D2E2")

    for row_idx, unit in enumerate(units, start=1):
        row = table.rows[row_idx]
        label = row.cells[0]
        _shade(label, UNIT_BG)
        label.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        run = _para(label).add_run(str(unit["name"]))
        run.font.bold = True
        run.font.size = Pt(9)
        time = _para(label, False).add_run(f"{hhmm(unit['startTime'])}\n{hhmm(unit['endTime'])}")
        time.font.size = Pt(6.5)
        time.font.color.rgb = RGBColor.from_string("666666")
        for col_idx, date in enumerate(dates, start=1):
            _fill_cell(row.cells[col_idx], grid.get((date, unit["startTime"]), []))
    return table


def render(path, weeks, title, footer):
    """weeks: Liste von (units, dates, grid)."""
    doc = Document()
    _landscape(doc.sections[0])
    doc.styles["Normal"].font.name = "Calibri"

    for i, (units, dates, grid) in enumerate(weeks):
        if i:
            doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
        heading = doc.add_paragraph()
        run = heading.add_run(title)
        run.font.size = Pt(16)
        run.font.bold = True
        sub = doc.add_paragraph()
        sub_run = sub.add_run(f"Woche {dates[0].strftime('%d.%m.%Y')} – "
                              f"{dates[-1].strftime('%d.%m.%Y')}  ·  {footer}")
        sub_run.font.size = Pt(9.5)
        sub_run.font.color.rgb = RGBColor.from_string("666666")
        sub.paragraph_format.space_after = Pt(10)
        _week_table(doc, units, dates, grid)

    doc.save(path)
