# WebUntis → PDF Stundenplan

Holt den Stundenplan direkt über die WebUntis-JSON-RPC-API und erzeugt ein
druckfertiges PDF (DIN A4 quer, eine Woche pro Seite).

## Installation

```bash
pip install -r requirements.txt
```

## Verwendung

```bash
python3 untis_pdf.py \
  --server mese.webuntis.com \
  --school "Meine Schule" \
  --user max.mustermann \
  --password geheim \
  --week 2026-09-07 \
  -o stundenplan.pdf
```

| Option | Bedeutung |
|---|---|
| `--server` | Host aus deiner WebUntis-URL, z. B. `mese.webuntis.com` |
| `--school` | Schulname genau wie im WebUntis-Login |
| `--user` / `--password` | deine WebUntis-Zugangsdaten |
| `--week` | ein Datum in der gewünschten Woche (Standard: heute) |
| `--class-id` | Klassenplan statt persönlichem Plan |
| `--days` | Anzahl Wochentage, Standard 5 (Mo–Fr) |
| `-o` | Ausgabedatei |

Zugangsdaten lassen sich auch als Umgebungsvariablen setzen, damit sie nicht
in der Shell-History landen:

```bash
export UNTIS_SERVER=mese.webuntis.com UNTIS_SCHOOL="Meine Schule"
export UNTIS_USER=max.mustermann UNTIS_PASSWORD=geheim
python3 untis_pdf.py -o stundenplan.pdf
```

## Darstellung

* Kopfzeile mit Wochentagen, linke Spalte mit Stundennummer und Uhrzeit
* pro Zelle: Fach (fett), darunter Raum · Lehrkraft
* entfallene Stunden werden grau durchgestrichen dargestellt
* Zeilen abwechselnd hell hinterlegt, damit der Ausdruck gut lesbar bleibt

## Hinweis

Manche Schulen sperren den JSON-RPC-Zugang für Schüleraccounts. Kommt beim
Login `personId = 0` oder ein Rechte-Fehler, hilft `--class-id` mit der ID
deiner Klasse (abrufbar über `getKlassen`).
