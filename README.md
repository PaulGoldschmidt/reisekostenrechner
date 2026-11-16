# Reisekostenrechner

Inoffizieller Rechner für Reisekostenzuschüsse der Studienstiftung des deutschen Volkes.
Studienort und Ziel eingeben, der Zuschuss für jedes Verkehrsmittel wird sofort berechnet
und die Strecke auf einer Karte angezeigt.

## Was berechnet wird

**Veranstaltung:** Fahrtkostenzuschuss zu Bildungsveranstaltungen nach dem Merkblatt der
Studienstiftung (Stand Dezember 2025). Bahn/Bus, Auto mit Mitfahrenden, Flugzeug und
Fahrrad oder zu Fuß, jeweils für Inland und Ausland.

**Auslandsvorhaben:** Reisekostenzuschuss der Auslandsförderung nach den DAAD-Sätzen
(gültig ab 1. Januar 2026) und den Regelungen zur nachhaltigen Auslandsmobilität
(ab 1. Juli 2025), inklusive Mindestvorhabendauer bei Flugreisen. Weitere Leistungen wie
die Auslandspauschale werden nicht berechnet.

Die Regeln stehen in `assets/js/rules/`, die Länderdaten in `assets/js/data/`.

## Entfernung

Grundlage ist die Pkw-Strecke. Der Rechner nutzt die schnellste Route, weil deren Länge
am besten zu den Beispielen im Merkblatt passt (München nach Hamburg: 793 km statt 792 km).

1. [Valhalla](https://github.com/valhalla/valhalla) auf dem Server der FOSSGIS für Strecken bis etwa 1.400 km Luftlinie
2. [OSRM](https://project-osrm.org/) auf dem Server der FOSSGIS für längere Strecken oder als Ersatz
3. Luftlinie, wenn es keine Straßenverbindung gibt

Die Ortssuche läuft über [Photon](https://photon.komoot.io/), die Karte über
[MapLibre GL JS](https://maplibre.org/) mit Kacheln von [OpenFreeMap](https://openfreemap.org/).
Kartendaten © OpenStreetMap-Mitwirkende.
Die Karte ist im eigenen dunklen Farbschema eingefärbt (`assets/js/ui/kartenstil.js`).
Schrift: [Bricolage Grotesque](https://github.com/ateliertriay/bricolage) unter der SIL Open Font License, lokal eingebunden.

## Hochschulverzeichnis

Beim Studienort schlägt der Rechner zuerst passende Hochschulen vor, etwa für „Hamburg“,
„Uni Bonn“ oder „TUM“. Eine genaue Adresse kann zusätzlich eingegeben werden, ist aber optional.

Das Verzeichnis in `assets/js/data/hochschulen.js` wird mit `npm run hochschulen` erzeugt:

- [Wikidata](https://www.wikidata.org/) (CC0): Namen, Kurznamen, Koordinaten, Studierendenzahlen, HRK-Mitgliedschaft
- OpenStreetMap über Photon: Anschriften, © OpenStreetMap-Mitwirkende, [ODbL](https://www.openstreetmap.org/copyright)

## Entwicklung

```sh
npm test     # Tests mit dem Test-Runner von Node.js (ab Version 22)
npm start    # lokaler Server auf http://localhost:8000
npm run hochschulen   # Hochschulverzeichnis neu erzeugen (dauert einige Minuten)
```

Bei jedem Push auf `main` laufen die Tests, danach wird die Seite über GitHub Actions auf
GitHub Pages veröffentlicht.

Ein Projekt von [Paul Goldschmidt](https://paul-goldschmidt.de/).
[Impressum](https://paul-goldschmidt.de/imprint/), [Datenschutz](https://paul-goldschmidt.de/privacy).
