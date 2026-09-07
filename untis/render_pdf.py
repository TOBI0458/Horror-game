"""PDF-Ausgabe des Standard-Stundenplans (A4 quer, eine Seite)."""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from timetable import WEEKDAYS
from untis_client import hhmm

HEADER_BG = colors.HexColor("#2b3a55")
GRID_LINE = colors.HexColor("#b9c2d0")
UNIT_BG = colors.HexColor("#eef1f6")
STRIPE_BG = colors.HexColor("#f7f9fc")

_TITLE = ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=16, leading=19,
                        textColor=colors.HexColor("#1a1a1a"))
_SUBTITLE = ParagraphStyle("subtitle", fontName="Helvetica", fontSize=9.5, leading=12,
                           textColor=colors.HexColor("#666666"))
_HEAD = ParagraphStyle("head", fontName="Helvetica-Bold", fontSize=10, leading=12,
                       alignment=1, textColor=colors.white)
_UNIT = ParagraphStyle("unit", fontName="Helvetica", fontSize=8, leading=10, alignment=1)
_SUBJECT = ParagraphStyle("subject", fontName="Helvetica-Bold", fontSize=9, leading=11,
                          alignment=1, textColor=colors.HexColor("#1a1a1a"))
_DETAIL = ParagraphStyle("detail", fontName="Helvetica", fontSize=7, leading=8.5,
                         alignment=1, textColor=colors.HexColor("#555555"))


def _escape(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _cell(cells):
    """Fach fett, darunter Lehrkraft und Raum - die Untis-Zeilenfolge."""
    out = []
    for entry in cells:
        lines = entry.lines
        out.append(Paragraph(_escape(lines[0]), _SUBJECT))
        for line in lines[1:]:
            out.append(Paragraph(_escape(line), _DETAIL))
    return out


def _table(units, days, grid):
    head = [Paragraph("Stunde", _HEAD)] + [Paragraph(WEEKDAYS[d], _HEAD) for d in days]
    data = [head]
    for unit in units:
        label = Paragraph(
            f"<b>{_escape(str(unit['name']))}</b><br/>"
            f"<font size=6.5 color='#666666'>{hhmm(unit['startTime'])}<br/>"
            f"{hhmm(unit['endTime'])}</font>", _UNIT)
        data.append([label] + [_cell(grid.get((d, unit["startTime"]), [])) for d in days])

    usable = landscape(A4)[0] - 24 * mm
    first = 20 * mm
    col = (usable - first) / len(days)
    table = Table(data, colWidths=[first] + [col] * len(days),
                  rowHeights=[10 * mm] + [None] * len(units), repeatRows=1)

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
    for row in range(2, len(data), 2):
        style.append(("BACKGROUND", (1, row), (-1, row), STRIPE_BG))
    table.setStyle(TableStyle(style))
    return table


def render(path, units, days, grid, title, subtitle):
    doc = SimpleDocTemplate(path, pagesize=landscape(A4),
                            leftMargin=12 * mm, rightMargin=12 * mm,
                            topMargin=12 * mm, bottomMargin=12 * mm,
                            title=title, author="untis_export")
    doc.build([Paragraph(_escape(title), _TITLE), Paragraph(_escape(subtitle), _SUBTITLE),
               Spacer(1, 5 * mm), _table(units, days, grid)])
