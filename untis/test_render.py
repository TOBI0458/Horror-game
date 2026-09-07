"""Rendert PDF und Word aus Beispieldaten - prueft die Ausgabe ohne WebUntis-Zugang."""

import datetime as dt

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
         {"name": "4", "startTime": 1045, "endTime": 1130}]


def sample_lessons(monday):
    lessons = []
    for day in range(5):
        date = int((monday + dt.timedelta(days=day)).strftime("%Y%m%d"))
        for i, unit in enumerate(UNITS):
            lesson = {"date": date, "startTime": unit["startTime"], "endTime": unit["endTime"],
                      "su": [{"id": (i % 4) + 1}], "ro": [{"id": 9}], "te": [{"id": 5}]}
            if day == 2 and i == 1:
                lesson["code"] = "cancelled"
            if day == 3 and i == 0:                       # Vertretung mit altem Lehrer/Raum
                lesson["code"] = "irregular"
                lesson["te"] = [{"id": 6, "orgid": 5}]
                lesson["ro"] = [{"id": 10, "orgid": 9}]
                lesson["substText"] = "Raumtausch"
            if day == 4 and i == 3:
                lesson["activityType"] = "Klausur"
            lessons.append(lesson)
    # zwei Stunden zur gleichen Zeit (geteilte Gruppe)
    lessons.append({"date": int((monday + dt.timedelta(days=1)).strftime("%Y%m%d")),
                    "startTime": 955, "endTime": 1040,
                    "su": [{"id": 4}], "ro": [{"id": 10}], "te": [{"id": 6}]})
    return lessons


def build(style="short", weeks=2):
    monday = dt.date(2026, 9, 7)
    out = []
    for w in range(weeks):
        start = monday + dt.timedelta(weeks=w)
        dates = tt.week_dates(start, 5)
        grid = tt.build_grid(sample_lessons(start), SUBJECTS, ROOMS, TEACHERS, style)
        out.append((tt.used_units(UNITS, grid, dates), dates, grid))
    return out


if __name__ == "__main__":
    import sys
    target = sys.argv[1] if len(sys.argv) > 1 else "demo"
    weeks = build()
    render_pdf.render(f"{target}.pdf", weeks, "Stundenplan – Demo", "Beispieldaten")
    render_docx.render(f"{target}.docx", weeks, "Stundenplan – Demo", "Beispieldaten")
    print(f"Geschrieben: {target}.pdf, {target}.docx")
