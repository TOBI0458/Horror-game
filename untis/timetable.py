"""Baut aus Untis-Stunden das normale Wochenraster.

Es zaehlt nur der Standard-Stundenplan: Vertretungen werden auf die
regulaere Stunde zurueckgefuehrt. Zusammenhaengende Stunden desselben
Unterrichts werden - wie in der Untis-App - zu einem Block verbunden.
"""

import datetime as dt
from collections import defaultdict
from dataclasses import dataclass, field

from untis_client import parse_date

WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
DAY_KEYS = {"mo": 0, "di": 1, "mi": 2, "do": 3, "fr": 4, "sa": 5, "so": 6}

DEFAULT_ORDER = ("teacher", "subject", "room")


@dataclass(frozen=True)
class Cell:
    """Eine Stunde: die Textzeilen in der Reihenfolge, die Untis anzeigt."""
    lines: tuple

    @property
    def head(self):
        return self.lines[0] if self.lines else ""

    @property
    def rest(self):
        return self.lines[1:]


@dataclass
class Entry:
    """Was in einer Rasterzelle steht, plus die Hoehe des Blocks in Stunden."""
    cells: list
    span: int = 1


@dataclass
class Grid:
    """Raster ueber (Wochentag, Stundenindex)."""
    entries: dict = field(default_factory=dict)
    covered: set = field(default_factory=set)

    def get(self, day, index):
        return self.entries.get((day, index))

    def is_covered(self, day, index):
        """True, wenn die Zelle von einem Block darueber verdeckt wird."""
        return (day, index) in self.covered

    def has_any(self, day=None, index=None):
        return any((day is None or d == day) and (index is None or i == index)
                   for d, i in self.entries)


def make_cell(parts, order=DEFAULT_ORDER):
    """parts: dict mit teacher/subject/room; leere Werte fallen weg."""
    lines = tuple(parts[key].strip() for key in order if parts.get(key, "").strip())
    return Cell(lines or ("—",))


def build_grid(slots, period_count, days):
    """slots: {(tag, stundenindex): [Cell, ...]} -> Grid mit verbundenen Bloecken."""
    grid = Grid()
    for day in days:
        index = 0
        while index < period_count:
            cells = slots.get((day, index))
            if not cells:
                index += 1
                continue
            span = 1
            while (index + span < period_count
                   and slots.get((day, index + span)) == cells):
                span += 1
            grid.entries[(day, index)] = Entry(cells, span)
            for offset in range(1, span):
                grid.covered.add((day, index + offset))
            index += span
    return grid


def _regular(elements, lookup, style):
    """Namen der regulaeren Elemente; bei Vertretung zaehlt das Original (`orgid`)."""
    names = []
    for e in elements or []:
        entry = lookup.get(e.get("orgid") or e["id"], {})
        name = entry.get(style) or entry.get("short") or ""
        if name and name not in names:
            names.append(name)
    return ", ".join(names)


def from_untis(lessons, units, subjects, rooms, teachers, days,
               style="short", order=DEFAULT_ORDER):
    """Rechnet die WebUntis-Antwort in ein Grid um."""
    index_of = {unit["startTime"]: i for i, unit in enumerate(units)}
    slots = defaultdict(list)
    for lesson in lessons:
        index = index_of.get(lesson["startTime"])
        if index is None:
            continue
        day = parse_date(lesson["date"]).weekday()
        cell = make_cell({"subject": _regular(lesson.get("su"), subjects, style),
                          "teacher": _regular(lesson.get("te"), teachers, style),
                          "room": _regular(lesson.get("ro"), rooms, style)}, order)
        if cell not in slots[(day, index)]:
            slots[(day, index)].append(cell)
    return build_grid(slots, len(units), days)


def trim(units, days, grid):
    """Leere Randstunden und unterrichtsfreie Tage weglassen."""
    kept_days = [d for d in days if grid.has_any(day=d)] or list(days)
    kept = [i for i in range(len(units))
            if any(grid.get(d, i) or grid.is_covered(d, i) for d in kept_days)]
    if not kept:
        return units, kept_days, grid, list(range(len(units)))
    first, last = kept[0], kept[-1]
    indices = list(range(first, last + 1))
    return [units[i] for i in indices], kept_days, grid, indices


def monday_of(date):
    return date - dt.timedelta(days=date.weekday())
