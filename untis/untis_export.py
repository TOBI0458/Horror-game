#!/usr/bin/env python3
"""Holt den Stundenplan aus WebUntis und schreibt ihn als PDF und/oder Word-Datei.

Beispiel:
    python3 untis_export.py --server mese.webuntis.com --school "Meine Schule" \
        --user max.mustermann --password geheim --weeks 4 --format beides
"""

import argparse
import datetime as dt
import os
import sys

import render_docx
import render_pdf
import timetable as tt
from untis_client import TYPE_CLASS, Untis, UntisError


def monday_of(date):
    return date - dt.timedelta(days=date.weekday())


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="WebUntis-Stundenplan als PDF/Word exportieren.")
    p.add_argument("--server", default=os.environ.get("UNTIS_SERVER"),
                   help="Host aus der WebUntis-URL, z.B. mese.webuntis.com")
    p.add_argument("--school", default=os.environ.get("UNTIS_SCHOOL"),
                   help="Schulname wie im WebUntis-Login")
    p.add_argument("--user", default=os.environ.get("UNTIS_USER"))
    p.add_argument("--password", default=os.environ.get("UNTIS_PASSWORD"))
    p.add_argument("--week", help="Datum in der ersten Woche (JJJJ-MM-TT), Standard: heute")
    p.add_argument("--weeks", type=int, default=1, help="Anzahl Wochen, je eine Seite")
    p.add_argument("--days", type=int, default=5, help="Wochentage pro Seite (5 = Mo-Fr)")
    p.add_argument("--class-id", type=int, help="Klassenplan statt persoenlichem Plan")
    p.add_argument("--names", choices=("short", "long"), default="short",
                   help="Kurznamen wie im Untis-Raster (Standard) oder Langnamen")
    p.add_argument("--format", choices=("pdf", "word", "beides"), default="pdf")
    p.add_argument("-o", "--output", default="stundenplan",
                   help="Dateiname ohne Endung (Endung ergibt sich aus --format)")
    p.add_argument("--list-classes", action="store_true",
                   help="Nur die Klassen samt ID ausgeben und beenden")
    args = p.parse_args(argv)

    missing = [n for n in ("server", "school", "user", "password") if not getattr(args, n)]
    if missing:
        p.error("Fehlende Angaben: " + ", ".join("--" + m.replace("_", "-") for m in missing))
    if args.weeks < 1:
        p.error("--weeks muss mindestens 1 sein")
    if not 1 <= args.days <= 7:
        p.error("--days muss zwischen 1 und 7 liegen")
    return args


def fetch(args):
    """Meldet sich an und liefert (wochen, anzeigename)."""
    untis = Untis(args.server, args.school)
    try:
        untis.login(args.user, args.password)

        if args.list_classes:
            for k in untis.classes():
                print(f"{k['id']:>6}  {k.get('name','')}  {k.get('longName','')}")
            return None, None

        if args.class_id:
            element_id, element_type = args.class_id, TYPE_CLASS
        else:
            element_id, element_type = untis.person_id, untis.person_type
            if not element_id:
                raise UntisError(
                    "Der Account hat keinen persoenlichen Stundenplan (personId = 0). "
                    "Bitte --class-id verwenden; die IDs zeigt --list-classes.")

        subjects = untis.elements("getSubjects")
        rooms = untis.elements("getRooms")
        teachers = untis.teachers()
        units_by_day = untis.timegrid()

        first_monday = monday_of(dt.date.fromisoformat(args.week) if args.week else dt.date.today())
        weeks = []
        for i in range(args.weeks):
            monday = first_monday + dt.timedelta(weeks=i)
            dates = tt.week_dates(monday, args.days)
            lessons = untis.timetable(element_id, element_type, dates[0], dates[-1])
            grid = tt.build_grid(lessons, subjects, rooms, teachers, args.names)
            weeks.append((units_by_day, dates, grid))

        name = args.user if not args.class_id else f"Klasse {args.class_id}"
        return weeks, name
    finally:
        untis.logout()


def normalise(weeks):
    """Zeitraster auf die tatsaechlich belegten Stunden kuerzen."""
    out = []
    for units_by_day, dates, grid in weeks:
        units = next((d["timeUnits"] for d in units_by_day if d.get("timeUnits")), [])
        if not units:
            raise UntisError("WebUntis hat kein Zeitraster geliefert.")
        out.append((tt.used_units(units, grid, dates), dates, grid))
    return out


def write(args, weeks, name):
    title = f"Stundenplan – {name}"
    footer = f"erstellt am {dt.date.today().strftime('%d.%m.%Y')}"
    written = []
    if args.format in ("pdf", "beides"):
        path = f"{args.output}.pdf"
        render_pdf.render(path, weeks, title, footer)
        written.append(path)
    if args.format in ("word", "beides"):
        path = f"{args.output}.docx"
        render_docx.render(path, weeks, title, footer)
        written.append(path)
    return written


def main():
    args = parse_args()
    try:
        weeks, name = fetch(args)
    except UntisError as exc:
        sys.exit(f"WebUntis-Fehler: {exc}")
    if weeks is None:
        return
    for path in write(args, normalise(weeks), name):
        print(f"Geschrieben: {path}")


if __name__ == "__main__":
    main()
