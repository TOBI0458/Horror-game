"""Rendert PDF und Word aus Beispieldaten - prueft die Ausgabe ohne WebUntis-Zugang."""

import datetime as dt
import sys

import render_docx
import render_pdf
import timetable as tt

SUBJECTS = {1: {"short": "M", "long": "Mathematik"},
            2: {"short": "D", "long": "Deutsch"},
            3: {"short": "E", "long": "Englisch"},
            4: {"short": "SP", "long": "Sport"}}
ROOMS = {9: {"short": "A101", "long": "Altbau 101"},
         10: {"short": "TH", "long": "Turnhalle"}}
TEACHERS = {5: {"short": "MUE", "long": "Anna Mueller"},
            6: {"short": "SCH", "long": "Ben Schmidt"}}

UNITS = [{"name": "1", "startTime": 800, "endTime": 845},
         {"name": "2", "startTime": 850, "endTime": 935},
         {"name": "3", "startTime": 955, "endTime": 1040},
         {"name": "4", "startTime": 1045, "endTime": 1130},
         {"name": "5", "startTime": 1140, "endTime": 1225}]


def sample_lessons(monday):
    lessons = []
    for day in range(5):
        date = int((monday + dt.timedelta(days=day)).strftime("%Y%m%d"))
        for i, unit in enumerate(UNITS[:4]):
            lesson = {"date": date, "startTime": unit["startTime"], "endTime": unit["endTime"],
                      "su": [{"id": (i + day) % 4 + 1}], "ro": [{"id": 9}], "te": [{"id": 5}]}
            if day == 2 and i == 1:                    # Entfall -> zaehlt trotzdem als normal
                lesson["code"] = "cancelled"
            if day == 3 and i == 0:                    # Vertretung -> Originalwerte gewinnen
                lesson["code"] = "irregular"
                lesson["te"] = [{"id": 6, "orgid": 5}]
                lesson["ro"] = [{"id": 10, "orgid": 9}]
            lessons.append(lesson)
    # Doppelstunde Sport am Dienstag, 5. Stunde
    lessons.append({"date": int((monday + dt.timedelta(days=1)).strftime("%Y%m%d")),
                    "startTime": 1140, "endTime": 1225,
                    "su": [{"id": 4}], "ro": [{"id": 10}], "te": [{"id": 6}]})
    return lessons


def main(target="demo", style="short"):
    monday = dt.date(2026, 9, 7)
    grid = tt.build_grid(sample_lessons(monday), SUBJECTS, ROOMS, TEACHERS, style)
    days = list(range(5))
    units = tt.used_units(UNITS, grid, days)
    days = tt.used_days(grid, units, days)
    render_pdf.render(f"{target}.pdf", units, days, grid, "Stundenplan – Demo", "Beispieldaten")
    render_docx.render(f"{target}.docx", units, days, grid, "Stundenplan – Demo", "Beispieldaten")
    print(f"Geschrieben: {target}.pdf, {target}.docx")


if __name__ == "__main__":
    main(*sys.argv[1:])
