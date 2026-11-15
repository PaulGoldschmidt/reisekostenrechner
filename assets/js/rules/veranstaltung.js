// Fahrtkostenzuschuss zu Bildungsveranstaltungen der Studienstiftung.
// Grundlage: Merkblatt "Fahrtkostenzuschüsse zu Bildungsveranstaltungen der
// Studienstiftung", gültig ab Juni 2023, zuletzt aktualisiert Dezember 2025.

import { euro, milli } from './geld.js';

export const VERANSTALTUNG = Object.freeze({
  // Innerdeutsche Strecken mit einfacher Distanz unter 100 km: kein Zuschuss.
  mindestKmEinfachInland: 100,
  bahnProKm: 0.1,
  bahnDeckelInland: 80,
  autoProKm: 0.05,
  autoErsteMitfahrt: 0.05,
  autoWeitereMitfahrt: 0.025,
  autoDeckelInlandProPerson: 80,
  uebernachtungInland: Object.freeze({ max: 80, eineNacht: 50 }),
  uebernachtungAusland: Object.freeze({ proNacht: 50, proStrecke: 50 }),
  flug: Object.freeze({
    kmProTag: 500,
    mindestBahnStunden: 12,
    innereuropaeisch: Object.freeze({ mitKompensation: 80, ohneKompensation: 70 }),
    aussereuropaeisch: Object.freeze({ mitKompensation: 400, ohneKompensation: 375 }),
  }),
});

/** Kilometersatz in Euro für ein Auto mit der angegebenen Zahl an Mitfahrenden. */
export function autoSatzProKm(mitfahrende) {
  const n = Math.max(0, Math.floor(mitfahrende));
  const zehntelcent =
    milli(VERANSTALTUNG.autoProKm) +
    (n >= 1 ? milli(VERANSTALTUNG.autoErsteMitfahrt) : 0) +
    Math.max(0, n - 1) * milli(VERANSTALTUNG.autoWeitereMitfahrt);
  return zehntelcent / 1000;
}

/**
 * Berechnet alle Verkehrsmittel für eine Veranstaltung.
 *
 * @param {object} p
 * @param {number} p.kmEinfach         einfache Strecke in km (Pkw-Strecke, sonst Luftlinie)
 * @param {boolean} p.ausland          Reise im, ins oder aus dem Ausland
 * @param {boolean} p.innereuropaeisch beide Orte liegen in Europa
 * @param {boolean} p.landweg          es gibt eine Straßenverbindung
 * @param {number} [p.mitfahrende]     Mitfahrende im Auto (ohne fahrende Person)
 * @param {boolean} [p.bahnUeber12h]   einfache Bahn/Bus-Anreise dauert länger als 12 h
 * @param {number|null} [p.aufenthaltTage] Tage vor Ort, falls bekannt
 */
export function berechneVeranstaltung({
  kmEinfach,
  ausland,
  innereuropaeisch,
  landweg,
  mitfahrende = 0,
  bahnUeber12h = false,
  aufenthaltTage = null,
}) {
  const V = VERANSTALTUNG;
  const kmEinfachGerundet = Math.round(kmEinfach);
  const kmGesamt = kmEinfachGerundet * 2;
  const unterMindestdistanz = !ausland && kmEinfachGerundet < V.mindestKmEinfachInland;
  const personen = 1 + Math.max(0, Math.floor(mitfahrende));

  // Bahn/Bus
  const bahnRoh = milli(V.bahnProKm) * kmGesamt;
  const bahnDeckel = ausland ? null : milli(V.bahnDeckelInland);
  const bahnMilli = unterMindestdistanz ? 0 : bahnDeckel === null ? bahnRoh : Math.min(bahnRoh, bahnDeckel);
  const bahn = {
    verfuegbar: landweg,
    betrag: landweg ? euro(bahnMilli) : 0,
    satzProKm: V.bahnProKm,
    deckel: ausland ? null : V.bahnDeckelInland,
    gedeckelt: !unterMindestdistanz && bahnDeckel !== null && bahnRoh > bahnDeckel,
  };

  // Auto
  const satz = autoSatzProKm(mitfahrende);
  const autoRoh = milli(satz) * kmGesamt;
  const autoDeckel = ausland ? null : milli(V.autoDeckelInlandProPerson) * personen;
  const autoMilli = unterMindestdistanz ? 0 : autoDeckel === null ? autoRoh : Math.min(autoRoh, autoDeckel);
  const auto = {
    verfuegbar: landweg,
    betrag: landweg ? euro(autoMilli) : 0,
    satzProKm: satz,
    personen,
    mitfahrende: personen - 1,
    deckel: ausland ? null : V.autoDeckelInlandProPerson * personen,
    gedeckelt: !unterMindestdistanz && autoDeckel !== null && autoRoh > autoDeckel,
  };

  // Fahrrad / zu Fuß: nur Übernachtungskosten
  const rad = ausland
    ? {
        verfuegbar: landweg,
        ausland: true,
        proNacht: V.uebernachtungAusland.proNacht,
        maxGesamt: euro(milli(V.bahnProKm) * kmGesamt),
      }
    : {
        verfuegbar: landweg,
        ausland: false,
        max: unterMindestdistanz ? 0 : V.uebernachtungInland.max,
        eineNacht: unterMindestdistanz ? 0 : V.uebernachtungInland.eineNacht,
      };

  // Flugzeug: im Inland nie, im Ausland nur unter Bedingungen
  const flugSaetze = innereuropaeisch ? V.flug.innereuropaeisch : V.flug.aussereuropaeisch;
  const mindestTage = Math.ceil(kmEinfachGerundet / V.flug.kmProTag);
  let flugStatus;
  if (!ausland) flugStatus = 'inland';
  else if (landweg && !bahnUeber12h) flugStatus = 'bahn-unter-12h';
  else if (aufenthaltTage !== null && aufenthaltTage < mindestTage) flugStatus = 'aufenthalt-zu-kurz';
  else if (aufenthaltTage === null) flugStatus = 'aufenthalt-unbekannt';
  else flugStatus = 'moeglich';

  const flugZahlt = flugStatus === 'moeglich' || flugStatus === 'aufenthalt-unbekannt';
  const flug = {
    status: flugStatus,
    innereuropaeisch,
    mindestTage: ausland ? mindestTage : null,
    aufenthaltTage,
    bahnPflicht: landweg,
    mitKompensation: ausland && flugZahlt ? flugSaetze.mitKompensation : 0,
    ohneKompensation: ausland && flugZahlt ? flugSaetze.ohneKompensation : 0,
    moeglichMit: ausland ? flugSaetze.mitKompensation : 0,
    moeglichOhne: ausland ? flugSaetze.ohneKompensation : 0,
  };

  return {
    kmEinfach: kmEinfachGerundet,
    kmGesamt,
    ausland,
    landweg,
    unterMindestdistanz,
    bahn,
    auto,
    rad,
    flug,
  };
}
