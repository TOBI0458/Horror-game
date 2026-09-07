#!/usr/bin/env python3
"""Stundenplan als druckfertiges PDF oder Word-Dokument.

Die Stunden kommen entweder aus einer JSON-Datei oder direkt aus WebUntis:

    python3 untis_export.py --file plan.json --format beides
    python3 untis_export.py --server mese.webuntis.com --school "Meine Schule" \
        --user max.mustermann --password geheim
"""

import argparse
import datetime as dt
import os
import sys

import plan_file
import render_docx
import render_pdf
import timetable as tt
from untis_client import TYPE_CLASS, Untis, UntisError


def parse_args(argv=None):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--file", help="JSON-Datei mit dem Stundenplan (statt WebUntis-Abruf)")
    p.add_argument("--server", default=os.environ.get("UNTIS_SERVER"),
                   help="Host aus der WebUntis-URL, z.B. mese.webuntis.com")
    p.add_argument("--school", default=os.environ.get("UNTIS_SCHOOL"),
                   help="Schulname wie im WebUntis-Login")
    p.add_argument("--user", default=os.environ.get("UNTIS_USER"))
    p.add_argument("--password", default=os.environ.get("UNTIS_PASSWORD"))
    p.add_argument("--week", help="Datum einer normalen Unterrichtswoche (JJJJ-MM-TT)")
    p.add_argument("--days", type=int, default=5, help="Wochentage (5 = Mo-Fr)")
    p.add_argument("--class-id", type=int, help="Klassenplan statt persoenlichem Plan")
    p.add_argument("--names", choices=("short", "long"), default="short",
                   help="Kurznamen wie im Untis-Raster (Standard) oder Langnamen")
    p.add_argument("--format", choices=("pdf", "word", "beides"), default="pdf")
    p.add_argument("-o", "--output", default="stundenplan", help="Dateiname ohne Endung")
    p.add_argument("--list-classes", action="store_true",
                   help="Nur die Klassen samt ID ausgeben und beenden")
    args = p.parse_args(argv)

    if not args.file:
        missing = [n for n in ("server", "school", "user", "password") if not getattr(args, n)]
        if missing:
            p.error("Entweder --file angeben oder die WebUntis-Zugangsdaten: "
                    + ", ".join("--" + m for m in missing))
    if not 1 <= args.days <= 7:
        p.error("--days muss zwischen 1 und 7 liegen")
    return args


def from_webuntis(args):
    """Meldet sich an und liefert (units, days, grid, name)."""
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
        lessons = untis.timetable(element_id, element_type, monday,
                                  monday + dt.timedelta(days=args.days - 1))
        if not lessons:
            raise UntisError(
                f"Fuer die Woche ab {monday:%d.%m.%Y} liefert WebUntis keine Stunden "
                "(Ferien?). Bitte mit --week eine normale Unterrichtswoche angeben.")

        units = next((d["timeUnits"] for d in untis.timegrid() if d.get("timeUnits")), [])
        if not units:
            raise UntisError("WebUntis hat kein Zeitraster geliefert.")

        days = list(range(args.days))
        grid = tt.from_untis(lessons, units, untis.elements("getSubjects"),
                             untis.elements("getRooms"), untis.teachers(), days, args.names)
        return units, days, grid, name
    finally:
        untis.logout()


def write(args, units, days, grid, name):
    units, days, grid, rows = tt.trim(units, days, grid)
    title = f"Stundenplan – {name}" if name else "Stundenplan"
    subtitle = f"Stand {dt.date.today():%d.%m.%Y}"

    written = []
    if args.format in ("pdf", "beides"):
        path = f"{args.output}.pdf"
        render_pdf.render(path, units, rows, days, grid, title, subtitle)
        written.append(path)
    if args.format in ("word", "beides"):
        path = f"{args.output}.docx"
        render_docx.render(path, units, rows, days, grid, title, subtitle)
        written.append(path)
    return written


def main():
    args = parse_args()
    try:
        result = plan_file.load(args.file) if args.file else from_webuntis(args)
    except UntisError as exc:
        sys.exit(f"WebUntis-Fehler: {exc}")
    except (OSError, ValueError, KeyError) as exc:
        sys.exit(f"Fehler in {args.file}: {exc}")
    if result is None:
        return
    for path in write(args, *result):
        print(f"Geschrieben: {path}")


if __name__ == "__main__":
    main()
