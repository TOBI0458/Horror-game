# WebUntis → Stundenplan als PDF und Word

Holt den Stundenplan direkt über die WebUntis-JSON-RPC-API und erzeugt daraus
druckfertige Dateien im DIN-A4-Querformat – eine Seite pro Woche.
Die Zellen sind genauso beschriftet wie im Untis-Raster.

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
  --weeks 4 \
  --format beides \
  -o stundenplan
```

| Option | Bedeutung |
|---|---|
| `--server` | Host aus deiner WebUntis-URL, z. B. `mese.webuntis.com` |
| `--school` | Schulname genau wie im WebUntis-Login |
| `--user` / `--password` | deine WebUntis-Zugangsdaten |
| `--week` | ein Datum in der ersten Woche (Standard: heute) |
| `--weeks` | Anzahl Wochen, je eine Seite (Standard 1) |
| `--days` | Wochentage pro Seite (Standard 5 = Mo–Fr) |
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

## Darstellung wie in Untis

Jede Zelle folgt der Untis-Zeilenfolge:

```
Fach            (fett, Kurzname – z. B. "M")
Lehrkraft       ("MUE")
Raum            ("A101")
Hinweis         (Vertretungstext, kursivierter Zusatz)
```

* **Entfall** – graue Zelle, Text durchgestrichen, Hinweis „Entfall“
* **Vertretung / Verlegung** – violette Zelle; der ersetzte Wert steht
  durchgestrichen vor dem neuen (`~~MUE~~ SCH`, `~~A101~~ TH`), genau wie Untis es anzeigt
* **Klausur** – rote Zelle
* mehrere Stunden zur selben Zeit (geteilte Gruppen) stehen untereinander in derselben Zelle
* leere Randstunden werden weggelassen, damit der Ausdruck kompakt bleibt

## Dateien

| Datei | Zweck |
|---|---|
| `untis_export.py` | Kommandozeile: anmelden, holen, schreiben |
| `untis_client.py` | JSON-RPC-Client für WebUntis |
| `timetable.py` | rechnet Untis-Stunden in das Zellenraster um |
| `render_pdf.py` | PDF-Ausgabe (ReportLab) |
| `render_docx.py` | Word-Ausgabe (python-docx) |
| `test_render.py` | erzeugt Beispieldateien ohne WebUntis-Zugang |

Layout ohne Zugangsdaten ansehen:

```bash
python3 test_render.py demo     # schreibt demo.pdf und demo.docx
```

## Hinweis

Manche Schulen sperren den JSON-RPC-Zugang für Schüleraccounts. Meldet der Login
`personId = 0`, hilft `--class-id`; die passende ID zeigt `--list-classes`.
