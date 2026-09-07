"""PDF-Ausgabe des Stundenplans (A4 quer, eine Seite)."""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from timetable import WEEKDAYS
from untis_client import hhmm

HEADER_BG = colors.HexColor("#2b3a55")
GRID_LINE = colors.HexColor("#c3cad6")
UNIT_BG = colors.HexColor("#eef1f6")
LESSON_BG = colors.HexColor("#dfe6f2")

_TITLE = ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=16, leading=19,
                        textColor=colors.HexColor("#1a1a1a"))
_SUBTITLE = ParagraphStyle("subtitle", fontName="Helvetica", fontSize=9.5, leading=12,
                           textColor=colors.HexColor("#666666"))
_HEAD = ParagraphStyle("head", fontName="Helvetica-Bold", fontSize=10.5, leading=12.5,
                       alignment=1, textColor=colors.white)
_UNIT = ParagraphStyle("unit", fontName="Helvetica", fontSize=8, leading=10, alignment=1)
_HEADLINE = ParagraphStyle("headline", fontName="Helvetica-Bold", fontSize=10, leading=12,
                           alignment=1, textColor=colors.HexColor("#16283f"))
_DETAIL = ParagraphStyle("detail", fontName="Helvetica", fontSize=8.5, leading=10,
                         alignment=1, textColor=colors.HexColor("#41506b"))


def _escape(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _content(entry):
    out = []
    for cell in entry.cells:
        out.append(Paragraph(_escape(cell.head), _HEADLINE))
        for line in cell.rest:
            out.append(Paragraph(_escape(line), _DETAIL))
    return out


def _unit_label(unit):
    return Paragraph(
        f"<font size=6.5 color='#666666'>{hhmm(unit['startTime'])}</font><br/>"
        f"<b>{_escape(str(unit['name']))}</b><br/>"
        f"<font size=6.5 color='#666666'>{hhmm(unit['endTime'])}</font>", _UNIT)


def _table(units, rows, days, grid):
    data = [[Paragraph("Stunde", _HEAD)] + [Paragraph(WEEKDAYS[d], _HEAD) for d in days]]
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("BACKGROUND", (0, 1), (0, -1), UNIT_BG),
        ("GRID", (0, 0), (-1, -1), 0.5, GRID_LINE),
        ("BOX", (0, 0), (-1, -1), 1.1, HEADER_BG),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 1), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
    ]

    for row, (unit, index) in enumerate(zip(units, rows), start=1):
        line = [_unit_label(unit)]
        for column, day in enumerate(days, start=1):
            entry = grid.get(day, index)
            if entry:
                line.append(_content(entry))
                last = row + entry.span - 1
                style.append(("BACKGROUND", (column, row), (column, last), LESSON_BG))
                if entry.span > 1:
                    style.append(("SPAN", (column, row), (column, last)))
            else:
                line.append("")
        data.append(line)

    usable = landscape(A4)[0] - 24 * mm
    first = 18 * mm
    column_width = (usable - first) / len(days)
    height = min(16 * mm, (landscape(A4)[1] - 60 * mm) / max(len(rows), 1))
    table = Table(data, colWidths=[first] + [column_width] * len(days),
                  rowHeights=[9 * mm] + [height] * len(rows), repeatRows=1)
    table.setStyle(TableStyle(style))
    return table


def render(path, units, rows, days, grid, title, subtitle):
    doc = SimpleDocTemplate(path, pagesize=landscape(A4),
                            leftMargin=12 * mm, rightMargin=12 * mm,
                            topMargin=12 * mm, bottomMargin=12 * mm,
                            title=title, author="untis_export")
    doc.build([Paragraph(_escape(title), _TITLE), Paragraph(_escape(subtitle), _SUBTITLE),
               Spacer(1, 4 * mm), _table(units, rows, days, grid)])
