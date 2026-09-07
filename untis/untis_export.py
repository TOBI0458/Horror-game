#!/usr/bin/env python3
"""Holt den Standard-Stundenplan aus WebUntis und schreibt ihn als PDF und/oder Word-Datei.

Beispiel:
    python3 untis_export.py --server mese.webuntis.com --school "Meine Schule" \
        --user max.mustermann --password geheim --format beides
"""

import argparse
import datetime as dt
import os
import sys

import render_docx
import render_pdf
import timetable as tt
from untis_client import TYPE_CLASS, Untis, UntisError


def parse_args(argv=None):
    p = argparse.ArgumentParser(
        description="WebUntis-Stundenplan als druckfertiges PDF oder Word-Dokument.")
    p.add_argument("--server", default=os.environ.get("UNTIS_SERVER"),
                   help="Host aus der WebUntis-URL, z.B. mese.webuntis.com")
    p.add_argument("--school", default=os.environ.get("UNTIS_SCHOOL"),
                   help="Schulname wie im WebUntis-Login")
    p.add_argument("--user", default=os.environ.get("UNTIS_USER"))
    p.add_argument("--password", default=os.environ.get("UNTIS_PASSWORD"))
    p.add_argument("--week", help="Datum einer normalen Unterrichtswoche (JJJJ-MM-TT), "
                                  "Standard: aktuelle Woche")
    p.add_argument("--days", type=int, default=5, help="Wochentage (5 = Mo-Fr)")
    p.add_argument("--class-id", type=int, help="Klassenplan statt persoenlichem Plan")
    p.add_argument("--names", choices=("short", "long"), default="short",
                   help="Kurznamen wie im Untis-Raster (Standard) oder Langnamen")
    p.add_argument("--format", choices=("pdf", "word", "beides"), default="pdf")
    p.add_argument("-o", "--output", default="stundenplan",
                   help="Dateiname ohne Endung")
    p.add_argument("--list-classes", action="store_true",
                   help="Nur die Klassen samt ID ausgeben und beenden")
    args = p.parse_args(argv)

    missing = [n for n in ("server", "school", "user", "password") if not getattr(args, n)]
    if missing:
        p.error("Fehlende Angaben: " + ", ".join("--" + m for m in missing))
    if not 1 <= args.days <= 7:
        p.error("--days muss zwischen 1 und 7 liegen")
    return args


def fetch(args):
    """Meldet sich an und liefert (stunden, faecher, raeume, lehrer, zeitraster, name)."""
    untis = Untis(args.server, args.school)
    try:
        untis.login(args.user, args.password)

        if args.list_classes:
            for k in untis.classes():
                print(f"{k['id']:>6}  {k.get('name', '')}  {k.get('longName', '')}")
            return None

        if args.class_id:
            element_id, element_type = args.class_id, TYPE_CLASS
            name = f"Klasse {args.class_id}"
        else:
            element_id, element_type = untis.person_id, untis.person_type
            name = args.user
            if not element_id:
                raise UntisError(
                    "Der Account hat keinen persoenlichen Stundenplan (personId = 0). "
                    "Bitte --class-id verwenden; die IDs zeigt --list-classes.")

        base = dt.date.fromisoformat(args.week) if args.week else dt.date.today()
        monday = tt.monday_of(base)
        end = monday + dt.timedelta(days=args.days - 1)

        lessons = untis.timetable(element_id, element_type, monday, end)
        if not lessons:
            raise UntisError(
                f"Fuer die Woche ab {monday:%d.%m.%Y} liefert WebUntis keine Stunden "
                "(Ferien?). Bitte mit --week eine normale Unterrichtswoche angeben.")

        units_by_day = untis.timegrid()
        units = next((d["timeUnits"] for d in units_by_day if d.get("timeUnits")), [])
        if not units:
            raise UntisError("WebUntis hat kein Zeitraster geliefert.")

        grid = tt.build_grid(lessons, untis.elements("getSubjects"), untis.elements("getRooms"),
                             untis.teachers(), args.names)
        return grid, units, name
    finally:
        untis.logout()


def write(args, grid, units, name):
    days = list(range(args.days))
    units = tt.used_units(units, grid, days)
    days = tt.used_days(grid, units, days)

    title = f"Stundenplan – {name}"
    subtitle = f"Stand {dt.date.today():%d.%m.%Y}"

    written = []
    if args.format in ("pdf", "beides"):
        path = f"{args.output}.pdf"
        render_pdf.render(path, units, days, grid, title, subtitle)
        written.append(path)
    if args.format in ("word", "beides"):
        path = f"{args.output}.docx"
        render_docx.render(path, units, days, grid, title, subtitle)
        written.append(path)
    return written


def main():
    args = parse_args()
    try:
        result = fetch(args)
    except UntisError as exc:
        sys.exit(f"WebUntis-Fehler: {exc}")
    if result is None:
        return
    for path in write(args, *result):
        print(f"Geschrieben: {path}")


if __name__ == "__main__":
    main()
