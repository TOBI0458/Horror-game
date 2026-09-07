"""PDF-Ausgabe des Stundenplans (A4 quer, eine Seite)."""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

import theme
from timetable import WEEKDAYS
from untis_client import hhmm

PAGE = landscape(A4)
MARGIN = 13 * mm


def _c(hex_value):
    return colors.HexColor("#" + hex_value)


_TITLE = ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=19, leading=22,
                        textColor=_c(theme.INK))
_SUBTITLE = ParagraphStyle("subtitle", fontName="Helvetica", fontSize=9.5, leading=12,
                           textColor=_c(theme.INK_SOFT))
_DAY = ParagraphStyle("day", fontName="Helvetica-Bold", fontSize=11.5, leading=13.5,
                      alignment=1, textColor=_c(theme.HEADER_INK))
_UNIT_NO = ParagraphStyle("unitno", fontName="Helvetica-Bold", fontSize=11, leading=13,
                          alignment=1, textColor=_c(theme.INK))
_UNIT_TIME = ParagraphStyle("unittime", fontName="Helvetica", fontSize=6.8, leading=8.4,
                            alignment=1, textColor=_c(theme.INK_SOFT))

def _escape(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _content(entry, palette):
    """Fach gross und fett, die uebrigen Zeilen kleiner darunter."""
    out = []
    for cell in entry.cells:
        accent = palette.of(cell.key)[1]
        head = ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=11.5, leading=13,
                              alignment=1, textColor=_c(theme.INK))
        detail = ParagraphStyle("d", fontName="Helvetica", fontSize=8.5, leading=10.5,
                                alignment=1, textColor=_c(accent))
        out.append(Paragraph(_escape(cell.head), head))
        for line in cell.rest:
            out.append(Paragraph(_escape(line), detail))
    return out


def _unit_label(unit):
    return [Paragraph(str(unit["name"]), _UNIT_NO),
            Paragraph(f"{hhmm(unit['startTime'])}<br/>{hhmm(unit['endTime'])}", _UNIT_TIME)]


TITLE_BLOCK = 30 * mm
HEAD_ROW = 10 * mm
SPACERS = 6 * mm


def _row_height(row_count):
    """Zeilenhoehe, bei der das Raster genau eine Seite fuellt."""
    budget = PAGE[1] - 2 * MARGIN - TITLE_BLOCK - SPACERS - HEAD_ROW
    return max(8 * mm, budget / max(row_count, 1))


def _table(units, rows, days, grid, palette, height):
    data = [[""] + [Paragraph(WEEKDAYS[d], _DAY) for d in days]]
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), _c(theme.HEADER_BG)),
        ("BACKGROUND", (0, 1), (0, -1), _c(theme.UNIT_BG)),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, _c(theme.GRID_LINE)),
        ("BOX", (0, 0), (-1, -1), 0.9, _c(theme.HEADER_BG)),
        ("LINEBELOW", (0, 0), (-1, 0), 0.9, _c(theme.HEADER_BG)),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 1), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 3),
        ("LEFTPADDING", (1, 1), (-1, -1), 5),
        ("RIGHTPADDING", (1, 1), (-1, -1), 3),
    ]

    for row, (unit, index) in enumerate(zip(units, rows), start=1):
        line = [_unit_label(unit)]
        for column, day in enumerate(days, start=1):
            entry = grid.get(day, index)
            if not entry:
                line.append("")
                continue
            line.append(_content(entry, palette))
            last = row + entry.span - 1
            background, accent = palette.of(entry.cells[0].key)
            style += [
                ("BACKGROUND", (column, row), (column, last), _c(background)),
                # kraeftiger Streifen links wie in der Untis-App
                ("LINEBEFORE", (column, row), (column, last), 2.6, _c(accent)),
            ]
            if entry.span > 1:
                style.append(("SPAN", (column, row), (column, last)))
        data.append(line)

        following = units[row] if row < len(units) else None
        if theme.is_break_after(unit, following):
            style.append(("LINEBELOW", (0, row), (-1, row), 1.1, _c(theme.BREAK_LINE)))

    usable = PAGE[0] - 2 * MARGIN
    first = 15 * mm
    column_width = (usable - first) / len(days)
    table = Table(data, colWidths=[first] + [column_width] * len(days),
                  rowHeights=[HEAD_ROW] + [height] * len(rows), repeatRows=1)
    table.setStyle(TableStyle(style))
    return table



def render(path, units, rows, days, grid, title, subtitle):
    palette = theme.Colors()
    doc = SimpleDocTemplate(path, pagesize=PAGE,
                            leftMargin=MARGIN, rightMargin=MARGIN,
                            topMargin=MARGIN, bottomMargin=MARGIN,
                            title=title, author="untis_export")
    table = _table(units, rows, days, grid, palette, _row_height(len(rows)))
    doc.build([Paragraph(_escape(title), _TITLE), Paragraph(_escape(subtitle), _SUBTITLE),
               Spacer(1, 4 * mm), table])
