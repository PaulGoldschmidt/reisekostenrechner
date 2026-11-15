// Ordnet einen Ort (Ländercode aus der Ortssuche plus Koordinaten) einem
// Gebiet mit DAAD-Satz, Region und Kontinent zu.

import { LAENDER, WEITERE_GEBIETE } from '../data/laender.js';

// Gebiete, die in OpenStreetMap zu einem anderen Staat gehören, in der
// DAAD-Liste aber eigene Sätze haben. Grenzen grob als Rechteck
// [Süd, West, Nord, Ost].
const UEBERSEE = [
  { staat: 'FR', code: 'GP', box: [15.8, -61.9, 16.6, -60.9] },
  { staat: 'FR', code: 'MQ', box: [14.3, -61.3, 14.95, -60.75] },
  { staat: 'FR', code: 'GF', box: [2.0, -55.0, 6.0, -51.0] },
  { staat: 'FR', code: 'RE', box: [-21.5, 55.1, -20.8, 55.9] },
  { staat: 'FR', code: 'YT', box: [-13.1, 44.9, -12.6, 45.4] },
  { staat: 'FR', code: 'PF', box: [-28.0, -155.0, -7.0, -134.0] },
  { staat: 'FR', code: 'NC', box: [-23.0, 163.0, -19.0, 169.0] },
  { staat: 'FR', code: 'PM', box: [46.7, -56.5, 47.2, -56.0] },
  { staat: 'FR', code: 'WF', box: [-14.5, -178.5, -13.0, -176.0] },
  { staat: 'FR', code: 'BL', box: [17.85, -62.95, 17.97, -62.75] },
  { staat: 'FR', code: 'MF', box: [18.0, -63.2, 18.13, -62.95] },
  { staat: 'CN', code: 'HK', box: [22.13, 113.8, 22.57, 114.45] },
  { staat: 'CN', code: 'MO', box: [22.1, 113.52, 22.22, 113.62] },
];

// Ostgrenze des europäischen Teils Russlands (Ural, grob).
const URAL_LAENGE = 60;

const inBox = ([s, w, n, o], lat, lon) => lat >= s && lat <= n && lon >= w && lon <= o;

/**
 * @param {string} laendercode ISO-3166-1-Code aus der Ortssuche (z. B. "DE")
 * @param {number} lat
 * @param {number} lon
 * @returns {{code: string, name: string, region: string|null, kontinent: string|null,
 *            satz: {hinRueck: number, einfach: number}|null, inland: boolean}}
 */
export function bestimmeGebiet(laendercode, lat, lon) {
  let code = String(laendercode || '').toUpperCase();

  const uebersee = UEBERSEE.find((u) => u.staat === code && inBox(u.box, lat, lon));
  if (uebersee) code = uebersee.code;

  const eintrag = LAENDER[code] || WEITERE_GEBIETE[code] || null;
  let region = eintrag ? eintrag.region : null;
  let kontinent = eintrag ? eintrag.kontinent : null;

  if (code === 'RU' && lon >= URAL_LAENGE) {
    region = 'ZSA';
    kontinent = 'AS';
  }

  const satz = LAENDER[code] ? { hinRueck: LAENDER[code].hinRueck, einfach: LAENDER[code].einfach } : null;

  return {
    code,
    name: eintrag ? eintrag.name : code,
    region,
    kontinent,
    satz,
    inland: code === 'DE',
  };
}
