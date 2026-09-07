# WebUntis → Stundenplan als PDF und Word

Holt den Stundenplan über die WebUntis-JSON-RPC-API und erzeugt daraus ein
druckfertiges Dokument im DIN-A4-Querformat – eine Seite, das normale
Wochenraster.

Ausgegeben wird der **Standard-Stundenplan**: Vertretungen, Entfälle und
Sondertermine der abgerufenen Woche werden auf die reguläre Stunde
zurückgeführt. Im Plan steht also immer das Fach mit der Lehrkraft und dem
Raum, wie sie normalerweise stattfinden.

## Installation

```bash
pip install -r requirements.txt
```

## Verwendung

```bash
python3 untis_export.py \
  --server mese.webuntis.com \
  --school "Meine Schule" \
  --user max.mustermann \
  --password geheim \
  --format beides \
  -o stundenplan
```

| Option | Bedeutung |
|---|---|
| `--server` | Host aus deiner WebUntis-URL, z. B. `mese.webuntis.com` |
| `--school` | Schulname genau wie im WebUntis-Login |
| `--user` / `--password` | deine WebUntis-Zugangsdaten |
| `--week` | Datum einer normalen Unterrichtswoche (Standard: aktuelle Woche) |
| `--days` | Wochentage, Standard 5 (Mo–Fr) |
| `--names` | `short` = Kurznamen wie im Untis-Raster (Standard), `long` = Langnamen |
| `--format` | `pdf`, `word` oder `beides` |
| `--class-id` | Klassenplan statt persönlichem Plan |
| `--list-classes` | listet nur die Klassen samt ID auf |
| `-o` | Dateiname **ohne** Endung |

Zugangsdaten lassen sich auch als Umgebungsvariablen setzen, damit sie nicht in
der Shell-History landen:

```bash
export UNTIS_SERVER=mese.webuntis.com UNTIS_SCHOOL="Meine Schule"
export UNTIS_USER=max.mustermann UNTIS_PASSWORD=geheim
python3 untis_export.py --format beides
```

## Darstellung

Jede Zelle folgt der Untis-Zeilenfolge:

```
M         Fach, fett (Kurzname; mit --names long "Mathematik")
MUE       Lehrkraft
A101      Raum
```

Kopfzeile mit den Wochentagen, linke Spalte mit Stundennummer und Uhrzeit,
Zeilen abwechselnd hell hinterlegt. Leere Randstunden und unterrichtsfreie Tage
fallen weg, damit der Ausdruck kompakt bleibt.

## Dateien

| Datei | Zweck |
|---|---|
| `untis_export.py` | Kommandozeile: anmelden, holen, schreiben |
| `untis_client.py` | JSON-RPC-Client für WebUntis |
| `timetable.py` | rechnet die Untis-Stunden in das Wochenraster um |
| `render_pdf.py` | PDF-Ausgabe (ReportLab) |
| `render_docx.py` | Word-Ausgabe (python-docx) |
| `test_render.py` | erzeugt Beispieldateien ohne WebUntis-Zugang |

Layout ohne Zugangsdaten ansehen:

```bash
python3 test_render.py demo     # schreibt demo.pdf und demo.docx
```

## Hinweise

* Fällt die abgerufene Woche in die Ferien, liefert WebUntis keine Stunden.
  Dann mit `--week` eine normale Unterrichtswoche angeben.
* Manche Schulen sperren den JSON-RPC-Zugang für Schüleraccounts. Meldet der
  Login `personId = 0`, hilft `--class-id`; die ID zeigt `--list-classes`.
