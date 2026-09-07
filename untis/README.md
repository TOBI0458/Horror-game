# Stundenplan als PDF und Word

Erzeugt aus dem Stundenplan ein druckfertiges Dokument im DIN-A4-Querformat –
eine Seite, das normale Wochenraster. Die Stunden kommen entweder aus der
mitgelieferten Datei `plan.json` oder direkt aus WebUntis.

Ausgegeben wird immer der **Standard-Stundenplan**: Beim WebUntis-Abruf werden
Vertretungen und Entfälle auf die reguläre Stunde zurückgeführt, im Plan steht
also stets der Unterricht, wie er normalerweise stattfindet.

## Installation

```bash
pip install -r requirements.txt
```

## Verwendung

Der eigene Plan liegt als `plan.json` bei – daraus direkt drucken:

```bash
python3 untis_export.py --file plan.json --format beides -o stundenplan
```

Ändert sich etwas, einfach `plan.json` bearbeiten und den Befehl erneut ausführen.
Ein Eintrag sieht so aus:

```json
{"day": "Mo", "periods": [1, 2], "teacher": "NEUS", "subject": "E1"}
```

`day` ist `Mo`–`Fr`, `periods` sind die Stundennummern (mehrere = zusammenhängender
Block), `room` kann zusätzlich angegeben werden. Die Zeiten stehen oben unter
`periods`, die Zeilenreihenfolge in der Zelle unter `order`.

### Direkt aus WebUntis

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
| `--file` | JSON-Datei mit dem Plan, statt WebUntis abzufragen |
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

Jede Zelle ist wie in der Untis-App beschriftet:

```
NEUS      Lehrkraft, fett
E1        Fach
```

Kopfzeile mit den Wochentagen, linke Spalte mit Uhrzeit und Stundennummer.
Zusammenhängende Stunden desselben Unterrichts werden zu einem durchgehenden
Block verbunden, genau wie in der App. Leere Randstunden und unterrichtsfreie
Tage fallen weg, damit der Ausdruck kompakt bleibt.

Die Zeilenreihenfolge in der Zelle steuert `order` in `plan.json`, standardmäßig
`["teacher", "subject", "room"]`.

## Dateien

| Datei | Zweck |
|---|---|
| `plan.json` | der eigene Stundenplan als bearbeitbare Datei |
| `untis_export.py` | Kommandozeile: laden bzw. abrufen und schreiben |
| `plan_file.py` | liest `plan.json` ein |
| `untis_client.py` | JSON-RPC-Client für WebUntis |
| `timetable.py` | rechnet die Untis-Stunden in das Wochenraster um |
| `render_pdf.py` | PDF-Ausgabe (ReportLab) |
| `render_docx.py` | Word-Ausgabe (python-docx) |

## Hinweise

* Fällt die abgerufene Woche in die Ferien, liefert WebUntis keine Stunden.
  Dann mit `--week` eine normale Unterrichtswoche angeben.
* Manche Schulen sperren den JSON-RPC-Zugang für Schüleraccounts. Meldet der
  Login `personId = 0`, hilft `--class-id`; die ID zeigt `--list-classes`.
