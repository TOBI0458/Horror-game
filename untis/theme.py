"""Farben und Abstaende fuer den Ausdruck.

Jedes Fach bekommt eine eigene, dauerhaft gleiche Farbe: einen hellen
Zellhintergrund und einen kraeftigen Akzentstreifen am linken Rand.
Die Palette ist auf Papier abgestimmt - hell genug zum Beschriften,
kraeftig genug, um die Faecher auf einen Blick zu unterscheiden.
"""

INK = "1F2430"          # Haupttext
INK_SOFT = "5A6478"     # Nebentext
HEADER_BG = "273349"    # Kopfzeile
HEADER_INK = "FFFFFF"
UNIT_BG = "F2F4F8"      # Stundenspalte links
GRID_LINE = "D3D9E3"
BREAK_LINE = "9AA5B8"   # dickere Linie vor einer laengeren Pause
PAGE_INK = "8A93A5"     # Fusszeile

# (Hintergrund, Akzent) - bewusst in dieser Reihenfolge vergeben
PALETTE = [
    ("E3EDFB", "3B76C9"),   # blau
    ("E6F4EA", "3E9B62"),   # gruen
    ("FBEAE6", "C85A3C"),   # ziegelrot
    ("F1E9F8", "7E57B5"),   # violett
    ("FDF3DC", "C9992B"),   # gelb
    ("E2F2F4", "2F8C9B"),   # tuerkis
    ("FCE8F1", "BC4A7E"),   # magenta
    ("EDEFE4", "78873F"),   # oliv
    ("E9E9F5", "5A5FA8"),   # indigo
    ("FBEDE1", "B5733A"),   # orange
    ("E5F0E2", "5F8C46"),   # moosgruen
    ("F3E8EA", "9B5060"),   # altrosa
    ("E4EEF0", "44788A"),   # stahlblau
    ("F6EDE0", "94703B"),   # sand
    ("EAEAF0", "6B6F86"),   # schiefer
    ("E8F3EC", "417F5E"),   # tanne
]

NEUTRAL = ("EDF0F5", "8A93A5")


class Colors:
    """Vergibt jedem Fach eine feste Farbe, in der Reihenfolge des Auftretens."""

    def __init__(self):
        self._assigned = {}

    def of(self, key):
        if not key:
            return NEUTRAL
        if key not in self._assigned:
            self._assigned[key] = PALETTE[len(self._assigned) % len(PALETTE)]
        return self._assigned[key]

    @property
    def legend(self):
        """[(fach, (hintergrund, akzent)), ...] in Vergabereihenfolge."""
        return list(self._assigned.items())


def is_break_after(unit, following, minutes=10):
    """True, wenn zwischen zwei Stunden eine echte Pause liegt."""
    if not following:
        return False
    return _minutes(following["startTime"]) - _minutes(unit["endTime"]) >= minutes


def _minutes(value):
    value = int(value)
    return value // 100 * 60 + value % 100
