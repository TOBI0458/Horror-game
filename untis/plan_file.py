"""Laedt einen Stundenplan aus einer JSON-Datei statt aus WebUntis.

Aufbau der Datei siehe plan.json: Stundenzeiten unter "periods",
der Unterricht unter "lessons" mit Wochentag und Stundennummern.
"""

import json
from collections import defaultdict

from timetable import DAY_KEYS, DEFAULT_ORDER, build_grid, make_cell


def _time(value):
    """'08:00' -> 800 (das Zahlenformat der Untis-API)."""
    text = str(value).replace(":", "").strip()
    return int(text)


def load(path):
    """Liefert (units, days, grid, name)."""
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)

    order = tuple(data.get("order") or DEFAULT_ORDER)
    units = [{"name": str(p.get("name", i + 1)),
              "startTime": _time(p["start"]),
              "endTime": _time(p["end"])}
             for i, p in enumerate(data["periods"])]

    slots = defaultdict(list)
    days = set()
    for lesson in data["lessons"]:
        key = str(lesson["day"]).strip().lower()[:2]
        if key not in DAY_KEYS:
            raise ValueError(f"Unbekannter Wochentag: {lesson['day']!r}")
        day = DAY_KEYS[key]
        days.add(day)
        cell = make_cell(lesson, order)
        for number in lesson["periods"]:
            index = int(number) - 1
            if not 0 <= index < len(units):
                raise ValueError(f"Stunde {number} liegt ausserhalb der Zeiten in {path}")
            if cell not in slots[(day, index)]:
                slots[(day, index)].append(cell)

    day_list = sorted(days)
    return units, day_list, build_grid(slots, len(units), day_list), data.get("name", "")
