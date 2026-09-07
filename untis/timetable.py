"""Wandelt die rohen Untis-Stunden in das normale Wochenraster um.

Es zaehlt nur der Standard-Stundenplan: Vertretungen, Entfaelle und
Sondertermine werden auf die regulaere Stunde zurueckgefuehrt, also auf
Fach, Lehrkraft und Raum, wie sie normalerweise stattfinden.
"""

import datetime as dt
from collections import defaultdict
from dataclasses import dataclass

from untis_client import parse_date

WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]


@dataclass(frozen=True)
class Cell:
    """Eine Stunde im Raster: Fach, Lehrkraft, Raum - wie im Untis-Plan."""
    subject: str
    teacher: str
    room: str

    @property
    def lines(self):
        return [x for x in (self.subject, self.teacher, self.room) if x]


def _name(lookup, element_id, style):
    entry = lookup.get(element_id)
    if not entry:
        return ""
    return entry.get(style) or entry.get("short") or ""


def _names(elements, lookup, style):
    """Namen der regulaeren Elemente; bei Vertretung zaehlt das Original (`orgid`)."""
    names = []
    for e in elements or []:
        name = _name(lookup, e.get("orgid") or e["id"], style)
        if name and name not in names:
            names.append(name)
    return ", ".join(names)


def build_cell(lesson, subjects, rooms, teachers, style="short"):
    return Cell(
        subject=_names(lesson.get("su"), subjects, style) or "—",
        teacher=_names(lesson.get("te"), teachers, style),
        room=_names(lesson.get("ro"), rooms, style),
    )


def build_grid(lessons, subjects, rooms, teachers, style="short"):
    """{(wochentag, startzeit): [Cell, ...]} - Wochentag 0 = Montag.

    Der Plan gilt fuer jede Woche gleich, deshalb wird nach Wochentag
    statt nach Datum abgelegt und jede Stunde nur einmal aufgenommen.
    """
    grid = defaultdict(list)
    for lesson in lessons:
        weekday = parse_date(lesson["date"]).weekday()
        cell = build_cell(lesson, subjects, rooms, teachers, style)
        slot = grid[(weekday, lesson["startTime"])]
        if cell not in slot:
            slot.append(cell)
    return dict(grid)


def used_units(units, grid, days):
    """Nur die Zeitraster-Zeilen, in denen ueberhaupt Unterricht liegt."""
    used = [u for u in units if any((d, u["startTime"]) in grid for d in days)]
    return used or units


def used_days(grid, units, days):
    """Nur die Wochentage mit Unterricht (z.B. kein leerer Freitag)."""
    used = [d for d in days if any((d, u["startTime"]) in grid for u in units)]
    return used or days


def monday_of(date):
    return date - dt.timedelta(days=date.weekday())
