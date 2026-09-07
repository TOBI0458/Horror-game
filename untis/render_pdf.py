"""PDF-Ausgabe (A4 quer, eine Seite pro Woche)."""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from timetable import STATE_COLORS, WEEKDAYS
from untis_client import hhmm

HEADER_BG = colors.HexColor("#2b3a55")

_H1 = ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=16, leading=19,
                     textColor=colors.HexColor("#1a1a1a"))
_H2 = ParagraphStyle("h2", fontName="Helvetica", fontSize=9.5, leading=12,
                     textColor=colors.HexColor("#666666"))
_UNIT = ParagraphStyle("unit", fontName="Helvetica", fontSize=8, leading=10, alignment=1)


def _escape(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _line_markup(segments, bold=False):
    parts = []
    for seg in segments:
        t = _escape(seg.text)
        if seg.struck:
            t = f"<strike>{t}</strike>"
        if bold:
            t = f"<b>{t}</b>"
        parts.append(t)
    return " ".join(parts)


def _cell_flowable(cells):
    if not cells:
        return ""
    out = []
    for cell in cells:
        color = STATE_COLORS[cell.state]["text"]
        style = ParagraphStyle("c", fontName="Helvetica", fontSize=8.5, leading=10.5,
                               alignment=1, textColor=colors.HexColor(color))
        small = ParagraphStyle("cs", parent=style, fontSize=7)
        lines = cell.lines
        out.append(Paragraph(_line_markup(lines[0], bold=True), style))
        for line in lines[1:]:
            out.append(Paragraph(_line_markup(line), small))
    return out


def _week_table(units, dates, grid):
    head = [""] + [f"{WEEKDAYS[d.weekday()]}<br/>"
                   f"<font size=7 color='#c9d2e2'>{d.strftime('%d.%m.')}</font>" for d in dates]
    head_style = ParagraphStyle("hd", fontName="Helvetica-Bold", fontSize=9.5, leading=11.5,
                                alignment=1, textColor=colors.white)
    data = [[Paragraph("Stunde", head_style)] + [Paragraph(h, head_style) for h in head[1:]]]

    for unit in units:
        label = Paragraph(
            f"<b>{_escape(str(unit['name']))}</b><br/>"
            f"<font size=6.5 color='#666666'>{hhmm(unit['startTime'])}<br/>{hhmm(unit['endTime'])}</font>",
            _UNIT)
        data.append([label] + [_cell_flowable(grid.get((d, unit["startTime"]), [])) for d in dates])

    usable = landscape(A4)[0] - 24 * mm
    first = 20 * mm
    col = (usable - first) / len(dates)
    table = Table(data, colWidths=[first] + [col] * len(dates),
                  rowHeights=[10 * mm] + [None] * len(units), repeatRows=1)

    style = [
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#eef1f6")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#b9c2d0")),
        ("BOX", (0, 0), (-1, -1), 1.1, HEADER_BG),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 1), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 3),
    ]
    for row, unit in enumerate(units, start=1):
        for col_i, date in enumerate(dates, start=1):
            cells = grid.get((date, unit["startTime"]), [])
            if cells:
                fill = STATE_COLORS[cells[0].state]["fill"]
                if fill != "#ffffff":
                    style.append(("BACKGROUND", (col_i, row), (col_i, row), colors.HexColor(fill)))
    table.setStyle(TableStyle(style))
    return table


def render(path, weeks, title, footer):
    """weeks: Liste von (units, dates, grid)."""
    doc = SimpleDocTemplate(path, pagesize=landscape(A4),
                            leftMargin=12 * mm, rightMargin=12 * mm,
                            topMargin=12 * mm, bottomMargin=12 * mm,
                            title=title, author="untis_export")
    story = []
    for i, (units, dates, grid) in enumerate(weeks):
        if i:
            story.append(PageBreak())
        subtitle = (f"Woche {dates[0].strftime('%d.%m.%Y')} – {dates[-1].strftime('%d.%m.%Y')}"
                    f"  ·  {footer}")
        story += [Paragraph(_escape(title), _H1), Paragraph(subtitle, _H2), Spacer(1, 5 * mm),
                  _week_table(units, dates, grid)]
    doc.build(story)
