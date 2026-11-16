// Reisekostenzuschuss im Rahmen der Auslandsförderung der Studienstiftung.
// Grundlagen:
// - Stipendienleistungen der Auslandsförderung (Reisekostenzuschuss)
// - Regelungen und Bedingungen für Auslandsvorhaben ab 1. Juli 2025
//   (Nachhaltige Auslandsmobilität)
// - DAAD-Reisekostenzuschüsse, gültig ab 01.01.2026

import { REGIONEN } from '../data/regionen.js';
import { euro, milli } from './geld.js';

export const AUSLANDSVORHABEN = Object.freeze({
  europaFlug: Object.freeze({ mitKompensation: 100, ohneKompensation: 80 }),
  europaFlugMindestBahnStunden: 12,
  nichtNachhaltigFaktor: 0.5,
  achtWochenTage: 56,
});

/**
 * @param {object} p
 * @param {{hinRueck: number, einfach: number}|null} p.satz DAAD-Satz des Ziellands
 * @param {string} p.zielRegion       Region des Ziels (Schlüssel aus REGIONEN)
 * @param {string|null} p.startRegion Region des Studienorts
 * @param {string|null} p.zielKontinent
 * @param {string|null} p.startKontinent
 * @param {string} p.startCode        Ländercode des Studienorts
 * @param {string} p.zielCode         Ländercode des Ziels
 * @param {boolean|null} p.landweg    Straßenverbindung vorhanden (null: unbekannt)
 * @param {{tage: number, mehrAlsEinJahr: boolean}|null} p.zeitraum
 * @param {boolean} [p.bahnUeber12h]  innereuropäisch: Bahn/Fernbus dauert länger als 12 h
 *                                    oder Ziel liegt außerhalb des Interrail-/Fernbus-Raums
 */
export function berechneAuslandsvorhaben({
  satz,
  zielRegion,
  startRegion,
  zielKontinent,
  startKontinent,
  startCode,
  zielCode,
  landweg,
  zeitraum,
  bahnUeber12h = false,
}) {
  const A = AUSLANDSVORHABEN;
  const region = REGIONEN[zielRegion] || null;
  const europa = zielRegion === 'EU' && startRegion === 'EU';

  // Anreise aus einem anderen Land desselben außereuropäischen Kontinents:
  // nur Hinreisezuschuss.
  const nurHinreise =
    zielKontinent !== null &&
    zielKontinent !== 'EU' &&
    zielKontinent === startKontinent &&
    startCode !== zielCode;

  const mehrAlsEinJahr = Boolean(zeitraum && zeitraum.mehrAlsEinJahr);
  const auszahlung = nurHinreise ? 'nur-hinreise' : mehrAlsEinJahr ? 'getrennt' : 'gesamt';

  const teileAus = (gesamt, einfach) => {
    if (auszahlung === 'nur-hinreise') return [{ art: 'hinreise', betrag: einfach }];
    if (auszahlung === 'getrennt') {
      return [
        { art: 'hinreise', betrag: einfach },
        { art: 'rueckreise', betrag: einfach },
      ];
    }
    return [{ art: 'hin-und-rueck', betrag: gesamt }];
  };
  const summe = (teile) => euro(teile.reduce((s, t) => s + milli(t.betrag), 0));

  // Anreise ohne Flugzeug (Bahn, Bus, Auto, Fahrrad): voller DAAD-Satz
  const landTeile = satz ? teileAus(satz.hinRueck, satz.einfach) : [];
  const land = {
    verfuegbar: landweg !== false,
    teile: landTeile,
    betrag: summe(landTeile),
  };

  // Flugzeug
  const mindestTage = europa ? REGIONEN.EU.mindestTage : region ? region.mindestTage : null;
  const tage = zeitraum ? zeitraum.tage : null;
  const dauerOk = tage === null || mindestTage === null ? null : tage >= mindestTage;

  let flug;
  if (europa) {
    // Innereuropäisch: pauschal 100/80 Euro für Hin- und Rückreise zusammen.
    // Annahme: Bei getrennter Auszahlung (mehr als ein Jahr) je zur Hälfte.
    const { mitKompensation, ohneKompensation } = A.europaFlug;
    const teileMit = auszahlung === 'getrennt'
      ? [{ art: 'hinreise', betrag: mitKompensation / 2 }, { art: 'rueckreise', betrag: mitKompensation / 2 }]
      : [{ art: 'hin-und-rueck', betrag: mitKompensation }];
    const teileOhne = auszahlung === 'getrennt'
      ? [{ art: 'hinreise', betrag: ohneKompensation / 2 }, { art: 'rueckreise', betrag: ohneKompensation / 2 }]
      : [{ art: 'hin-und-rueck', betrag: ohneKompensation }];

    let status;
    if (dauerOk === false) status = 'keine-foerderung';
    else if (!bahnUeber12h) status = 'bahn-unter-12h';
    else if (dauerOk === null) status = 'dauer-unbekannt';
    else status = 'moeglich';
    const zahlt = status === 'moeglich' || status === 'dauer-unbekannt';

    flug = {
      art: 'europa',
      status,
      mindestTage,
      tage,
      teileMit,
      teileOhne,
      mitKompensation: zahlt ? summe(teileMit) : 0,
      ohneKompensation: zahlt ? summe(teileOhne) : 0,
      moeglichMit: summe(teileMit),
      moeglichOhne: summe(teileOhne),
    };
  } else {
    // Interkontinental: voller Satz bei nachhaltiger Flugreise, sonst 50 Prozent.
    const teileVoll = satz ? teileAus(satz.hinRueck, satz.einfach) : [];
    const teileReduziert = teileVoll.map((t) => ({
      art: t.art,
      betrag: euro(milli(t.betrag) * A.nichtNachhaltigFaktor),
    }));

    let status;
    if (!satz) status = 'kein-satz';
    else if (dauerOk === false) status = 'keine-foerderung';
    else if (dauerOk === null) status = 'dauer-unbekannt';
    else status = 'moeglich';
    const zahlt = status === 'moeglich' || status === 'dauer-unbekannt';

    flug = {
      art: 'interkontinental',
      status,
      mindestTage,
      tage,
      teileVoll,
      teileReduziert,
      voll: zahlt ? summe(teileVoll) : 0,
      reduziert: zahlt ? summe(teileReduziert) : 0,
      moeglichVoll: summe(teileVoll),
      moeglichReduziert: summe(teileReduziert),
    };
  }

  return {
    satz,
    europa,
    region: zielRegion,
    regionName: region ? region.name : null,
    auszahlung,
    tage,
    unterAchtWochen: tage !== null && tage < A.achtWochenTage,
    land,
    flug,
    hoechsterZuschuss: Math.max(
      land.verfuegbar ? land.betrag : 0,
      flug.art === 'europa' ? flug.mitKompensation : flug.voll,
    ),
  };
}
