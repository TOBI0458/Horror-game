"""Minimaler Client fuer die WebUntis-JSON-RPC-Schnittstelle."""

import datetime as dt

import requests


class UntisError(RuntimeError):
    pass


# personType laut Untis-API
TYPE_CLASS = 1
TYPE_TEACHER = 2
TYPE_SUBJECT = 3
TYPE_ROOM = 4
TYPE_STUDENT = 5


class Untis:
    def __init__(self, server, school):
        server = server.replace("https://", "").replace("http://", "").strip("/")
        self.url = f"https://{server}/WebUntis/jsonrpc.do"
        self.school = school
        self.session = requests.Session()
        self.person_type = None
        self.person_id = None

    def _rpc(self, method, params=None):
        payload = {"id": "untis_export", "method": method, "params": params or {}, "jsonrpc": "2.0"}
        r = self.session.post(self.url, json=payload, params={"school": self.school}, timeout=30)
        r.raise_for_status()
        data = r.json()
        if "error" in data:
            err = data["error"]
            raise UntisError(f"{method}: {err.get('message', err)} (Code {err.get('code')})")
        return data["result"]

    def login(self, user, password):
        res = self._rpc("authenticate", {"user": user, "password": password, "client": "untis_export"})
        self.person_type = res.get("personType")
        self.person_id = res.get("personId")
        return res

    def logout(self):
        try:
            self._rpc("logout")
        except Exception:
            pass

    def timegrid(self):
        return self._rpc("getTimegridUnits")

    def timetable(self, element_id, element_type, start, end):
        return self._rpc("getTimetable", {
            "id": element_id,
            "type": element_type,
            "startDate": int(start.strftime("%Y%m%d")),
            "endDate": int(end.strftime("%Y%m%d")),
        })

    def elements(self, method):
        """{id: {'short': Kurzname, 'long': Langname}} fuer Faecher/Raeume/Lehrer/Klassen."""
        out = {}
        for e in self._rpc(method):
            short = e.get("name", "")
            long = e.get("longName") or " ".join(x for x in (e.get("foreName"), e.get("longName")) if x) or short
            out[e["id"]] = {"short": short, "long": long}
        return out

    def teachers(self):
        out = {}
        for e in self._rpc("getTeachers"):
            full = " ".join(x for x in (e.get("foreName"), e.get("longName")) if x)
            out[e["id"]] = {"short": e.get("name", ""), "long": full or e.get("name", "")}
        return out

    def classes(self, school_year_id=None):
        params = {"schoolyearId": school_year_id} if school_year_id else {}
        return self._rpc("getKlassen", params)


def parse_date(value):
    return dt.datetime.strptime(str(value), "%Y%m%d").date()


def hhmm(value):
    """800 -> '08:00'"""
    s = f"{int(value):04d}"
    return f"{s[:2]}:{s[2:]}"
