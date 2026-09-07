"""Wandelt die rohen Untis-Stunden in eine Rasterstruktur um.

Eine Zelle wird genauso beschriftet wie in WebUntis:
Fach, darunter Lehrkraft, darunter Raum. Bei Vertretungen steht der
urspruengliche Wert durchgestrichen vor dem neuen.
"""

import datetime as dt
from collections import defaultdict
from dataclasses import dataclass, field

from untis_client import parse_date

WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
WEEKDAYS_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

# Zustaende wie in Untis, inklusive der dort ueblichen Einfaerbung
STATE_REGULAR = "regular"
STATE_CANCELLED = "cancelled"     # Entfall: grau, durchgestrichen
STATE_IRREGULAR = "irregular"     # Vertretung / Verlegung: violett
STATE_EXAM = "exam"               # Klausur / Pruefung: rot

STATE_COLORS = {
    STATE_REGULAR: {"fill": "#ffffff", "text": "#1a1a1a"},
    STATE_CANCELLED: {"fill": "#e8e8e8", "text": "#8a8a8a"},
    STATE_IRREGULAR: {"fill": "#efe0f7", "text": "#5b2d82"},
    STATE_EXAM: {"fill": "#fbdede", "text": "#9b2226"},
}

STATE_LABELS = {
    STATE_CANCELLED: "Entfall",
    STATE_IRREGULAR: "Vertretung",
    STATE_EXAM: "Klausur",
}


@dataclass
class Segment:
    """Ein Textstueck einer Zeile; `struck` markiert den ersetzten Untis-Wert."""
    text: str
    struck: bool = False


@dataclass
class Cell:
    subject: list = field(default_factory=list)   # list[Segment]
    teacher: list = field(default_factory=list)
    room: list = field(default_factory=list)
    note: str = ""
    state: str = STATE_REGULAR

    @property
    def lines(self):
        """Die Untis-Zeilenfolge: Fach / Lehrkraft / Raum / Hinweis."""
        out = [seg for seg in (self.subject, self.teacher, self.room) if seg]
        if self.note:
            out.append([Segment(self.note)])
        return out


def _name(lookup, element_id, style):
    entry = lookup.get(element_id)
    if not entry:
        return str(element_id)
    return entry.get(style) or entry.get("short") or ""


def _segments(elements, lookup, style):
    """Baut die Segmente einer Zeile; bei Vertretung `orgid` durchgestrichen davor."""
    segs = []
    for e in elements or []:
        org = e.get("orgid")
        if org:
            segs.append(Segment(_name(lookup, org, style), struck=True))
        name = _name(lookup, e["id"], style)
        if name:
            segs.append(Segment(name))
    return segs


def _state(lesson):
    code = lesson.get("code")
    if code == "cancelled":
        return STATE_CANCELLED
    if code == "irregular":
        return STATE_IRREGULAR
    if (lesson.get("activityType") or "").lower() in ("klausur", "exam", "pruefung", "prüfung"):
        return STATE_EXAM
    return STATE_REGULAR


def _note(lesson):
    parts = [lesson.get("substText"), lesson.get("lstext"), lesson.get("info")]
    return " · ".join(p.strip() for p in parts if p and p.strip())


def build_cell(lesson, subjects, rooms, teachers, style="short"):
    cell = Cell(state=_state(lesson))
    cell.subject = _segments(lesson.get("su"), subjects, style) or [Segment("—")]
    cell.teacher = _segments(lesson.get("te"), teachers, style)
    cell.room = _segments(lesson.get("ro"), rooms, style)
    note = _note(lesson)
    label = STATE_LABELS.get(cell.state)
    if label and label.lower() not in note.lower():
        note = f"{label} · {note}" if note else label
    cell.note = note
    return cell


def build_grid(lessons, subjects, rooms, teachers, style="short"):
    """{(datum, startzeit): [Cell, ...]}, nach Untis-Startzeit sortiert."""
    grid = defaultdict(list)
    for lesson in lessons:
        key = (parse_date(lesson["date"]), lesson["startTime"])
        grid[key].append(build_cell(lesson, subjects, rooms, teachers, style))
    return dict(grid)


def week_dates(monday, days):
    return [monday + dt.timedelta(days=i) for i in range(days)]


def used_units(units, grid, dates):
    """Nur die Zeitraster-Zeilen, in denen in dieser Woche etwas stattfindet."""
    used = [u for u in units if any((d, u["startTime"]) in grid for d in dates)]
    return used or units
