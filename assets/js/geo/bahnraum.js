// Interrail- und Fernbus-Raum: Ziele in Europa, die ohne Flugzeug erreichbar sind.
// Liegt das Ziel eines Auslandsvorhabens außerhalb, darf geflogen werden (Regelung zur
// nachhaltigen Auslandsmobilität ab 1. Juli 2025).

// Länder des Interrail Global Pass
const INTERRAIL = [
  'AT', 'BE', 'BA', 'BG', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GB', 'GR', 'HU', 'IE', 'IT', 'LV',
  'LT', 'LU', 'ME', 'NL', 'MK', 'NO', 'PL', 'PT', 'RO', 'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'TR',
];
// Zusätzlich mit Fernbus erreichbar
const FERNBUS = ['AL', 'XK', 'MD', 'UA', 'LI', 'AD', 'MC', 'SM', 'VA', 'GI', 'AX'];

const RAUM = new Set([...INTERRAIL, ...FERNBUS]);

/**
 * Ob ein Ziel in Europa außerhalb des Interrail- und Fernbus-Raums liegt, etwa Island, Malta,
 * Zypern oder die Kanaren. Für Ziele außerhalb Europas gilt die Regel nicht (false).
 * @param {{code: string, region: string|null}} gebiet aus bestimmeGebiet
 */
export function ausserhalbBahnRaum(gebiet, lat, lon) {
  if (gebiet.region !== 'EU') return false;
  if (!RAUM.has(gebiet.code)) return true;
  // Inseln weit vor dem Festland
  if (gebiet.code === 'ES' && lat < 30) return true; // Kanaren
  if (gebiet.code === 'PT' && lon < -12) return true; // Azoren, Madeira
  return false;
}
