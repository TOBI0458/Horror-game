#!/usr/bin/env python3
"""Holt den eigenen Stundenplan aus WebUntis und erzeugt ein druckfertiges PDF (A4 quer).

Beispiel:
    python3 untis_pdf.py --server mese.webuntis.com --school "Meine Schule" \
        --user max.mustermann --password geheim --week 2026-09-07 -o plan.pdf

Zugangsdaten koennen auch als Umgebungsvariablen gesetzt werden:
    UNTIS_SERVER, UNTIS_SCHOOL, UNTIS_USER, UNTIS_PASSWORD
"""

import argparse
import datetime as dt
import os
import sys
from collections import defaultdict

import requests
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]


class UntisError(RuntimeError):
    pass


class Untis:
    """Minimaler Client fuer die WebUntis-JSON-RPC-Schnittstelle."""

    def __init__(self, server, school):
        server = server.replace("https://", "").replace("http://", "").strip("/")
        self.url = f"https://{server}/WebUntis/jsonrpc.do"
        self.school = school
        self.session = requests.Session()
        self.person_type = None
        self.person_id = None

    def _rpc(self, method, params=None):
        payload = {"id": "untis_pdf", "method": method, "params": params or {}, "jsonrpc": "2.0"}
        r = self.session.post(self.url, json=payload, params={"school": self.school}, timeout=30)
        r.raise_for_status()
        data = r.json()
        if "error" in data:
            raise UntisError(f"{method}: {data['error'].get('message', data['error'])}")
        return data["result"]

    def login(self, user, password):
        res = self._rpc("authenticate", {"user": user, "password": password, "client": "untis_pdf"})
        # personType: 1=Lehrer, 2=Klasse, 3=Betrieb, 4=Raum, 5=Schueler
        self.person_type = res.get("personType")
        self.person_id = res.get("personId")
        if not self.person_id:
            raise UntisError("Login ok, aber kein persoenlicher Stundenplan verfuegbar "
                             "(personId = 0). Bitte --class-id oder --student-id angeben.")
        return res

    def logout(self):
        try:
            self._rpc("logout")
        except Exception:
            pass

    def timegrid(self):
        return self._rpc("getTimegridUnits")

    def timetable(self, element_id, element_type, start, end):
        return self._rpc("getTimetable", {
            "id": element_id,
            "type": element_type,
            "startDate": int(start.strftime("%Y%m%d")),
            "endDate": int(end.strftime("%Y%m%d")),
        })

    def lookup(self, method):
        """Liefert {id: (kurz, lang)} fuer Faecher/Raeume/Lehrer/Klassen."""
        return {e["id"]: (e.get("name", ""), e.get("longName", e.get("name", "")))
                for e in self._rpc(method)}


def hhmm(value):
    """800 -> '08:00'"""
    s = f"{int(value):04d}"
    return f"{s[:2]}:{s[2:]}"


def monday_of(date):
    return date - dt.timedelta(days=date.weekday())


def build_grid(lessons, subjects, rooms, teachers):
    """Baut {(wochentag, startzeit): [zellentext, ...]} aus den Untis-Stunden."""
    grid = defaultdict(list)
    for l in lessons:
        if l.get("code") == "cancelled":
            state = "cancelled"
        elif l.get("code") == "irregular":
            state = "irregular"
        else:
            state = "regular"

        date = dt.datetime.strptime(str(l["date"]), "%Y%m%d").date()
        subject = ", ".join(subjects.get(s["id"], ("?", ""))[0] for s in l.get("su", [])) or "—"
        room = ", ".join(rooms.get(r["id"], ("", ""))[0] for r in l.get("ro", []))
        teacher = ", ".join(teachers.get(t["id"], ("", ""))[0] for t in l.get("te", []))
        grid[(date.weekday(), l["startTime"])].append({
            "subject": subject, "room": room, "teacher": teacher, "state": state,
        })
    return grid


def cell_paragraph(entries, styles):
    if not entries:
        return ""
    parts = []
    for e in entries:
        style = styles["cancelled"] if e["state"] == "cancelled" else styles["normal"]
        text = f"<b>{e['subject']}</b>"
        detail = " · ".join(x for x in (e["room"], e["teacher"]) if x)
        if detail:
            text += f"<br/><font size=6.5 color='#555555'>{detail}</font>"
        if e["state"] == "cancelled":
            text = f"<strike>{text}</strike>"
        parts.append(Paragraph(text, style))
    return parts if len(parts) > 1 else parts[0]


def make_pdf(path, title, subtitle, units, days, grid):
    doc = SimpleDocTemplate(path, pagesize=landscape(A4),
                            leftMargin=12 * mm, rightMargin=12 * mm,
                            topMargin=12 * mm, bottomMargin=12 * mm,
                            title=title, author="untis_pdf")

    styles = {
        "normal": ParagraphStyle("cell", fontName="Helvetica", fontSize=8, leading=9.5,
                                 alignment=1, textColor=colors.HexColor("#1a1a1a")),
        "cancelled": ParagraphStyle("cell_x", fontName="Helvetica", fontSize=8, leading=9.5,
                                    alignment=1, textColor=colors.HexColor("#999999")),
    }
    h1 = ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=16, leading=19,
                        textColor=colors.HexColor("#1a1a1a"))
    h2 = ParagraphStyle("h2", fontName="Helvetica", fontSize=9.5, leading=12,
                        textColor=colors.HexColor("#666666"))

    head = ["Stunde"] + [WEEKDAYS[d] for d in days]
    data = [head]
    for u in units:
        label = Paragraph(
            f"<b>{u['name']}</b><br/><font size=6.5 color='#666666'>"
            f"{hhmm(u['startTime'])}–{hhmm(u['endTime'])}</font>",
            ParagraphStyle("h", fontName="Helvetica", fontSize=8, leading=9.5, alignment=1))
        row = [label]
        for d in days:
            row.append(cell_paragraph(grid.get((d, u["startTime"]), []), styles))
        data.append(row)

    usable = landscape(A4)[0] - 24 * mm
    first = 22 * mm
    col = (usable - first) / len(days)
    table = Table(data, colWidths=[first] + [col] * len(days),
                  rowHeights=[9 * mm] + [None] * len(units), repeatRows=1)

    style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2b3a55")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 10),
        ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#eef1f6")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#b9c2d0")),
        ("BOX", (0, 0), (-1, -1), 1.1, colors.HexColor("#2b3a55")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 1), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 3),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style.append(("BACKGROUND", (1, i), (-1, i), colors.HexColor("#f7f9fc")))
    table.setStyle(TableStyle(style))

    doc.build([Paragraph(title, h1), Paragraph(subtitle, h2), Spacer(1, 5 * mm), table])


def main():
    p = argparse.ArgumentParser(description="WebUntis-Stundenplan als druckfertiges PDF.")
    p.add_argument("--server", default=os.environ.get("UNTIS_SERVER"),
                   help="z.B. mese.webuntis.com (steht in der WebUntis-URL)")
    p.add_argument("--school", default=os.environ.get("UNTIS_SCHOOL"),
                   help="Schulname wie im WebUntis-Login")
    p.add_argument("--user", default=os.environ.get("UNTIS_USER"))
    p.add_argument("--password", default=os.environ.get("UNTIS_PASSWORD"))
    p.add_argument("--week", help="Datum in der gewuenschten Woche (JJJJ-MM-TT), Standard: heute")
    p.add_argument("--class-id", type=int, help="Klassen-Stundenplan statt persoenlichem Plan")
    p.add_argument("--days", type=int, default=5, help="Anzahl Wochentage (5 = Mo-Fr)")
    p.add_argument("-o", "--output", default="stundenplan.pdf")
    args = p.parse_args()

    missing = [n for n in ("server", "school", "user", "password") if not getattr(args, n)]
    if missing:
        p.error("Fehlende Angaben: " + ", ".join("--" + m for m in missing))

    base = dt.date.fromisoformat(args.week) if args.week else dt.date.today()
    start = monday_of(base)
    end = start + dt.timedelta(days=args.days - 1)

    u = Untis(args.server, args.school)
    try:
        u.login(args.user, args.password)
        if args.class_id:
            element_id, element_type = args.class_id, 1  # 1 = Klasse
        else:
            element_id, element_type = u.person_id, u.person_type

        lessons = u.timetable(element_id, element_type, start, end)
        subjects = u.lookup("getSubjects")
        rooms = u.lookup("getRooms")
        teachers = u.lookup("getTeachers")
        units = u.timegrid()
    finally:
        u.logout()

    # Zeitraster des ersten geplanten Tages als Zeilenvorlage nehmen
    grid_units = next((d["timeUnits"] for d in units if d.get("timeUnits")), [])
    if not grid_units:
        sys.exit("Kein Zeitraster von WebUntis erhalten.")

    grid = build_grid(lessons, subjects, rooms, teachers)
    used_units = [x for x in grid_units
                  if any((d, x["startTime"]) in grid for d in range(args.days))]
    days = [d for d in range(args.days)
            if any((d, x["startTime"]) in grid for x in grid_units)] or list(range(args.days))

    title = f"Stundenplan – {args.user}"
    subtitle = (f"Woche {start.strftime('%d.%m.%Y')} – {end.strftime('%d.%m.%Y')}"
                f"  ·  erstellt am {dt.date.today().strftime('%d.%m.%Y')}")
    make_pdf(args.output, title, subtitle, used_units or grid_units, days, grid)
    print(f"PDF geschrieben: {args.output}  ({len(lessons)} Stunden)")


if __name__ == "__main__":
    main()
