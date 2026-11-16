// Interrail-/Fernbus-Raum: destinations in Europe that can be reached without a plane.
// If the destination of an Auslandsvorhaben lies outside it, flying is allowed (rules for
// sustainable mobility abroad from 1 July 2025).

// Countries covered by the Interrail Global Pass
const INTERRAIL = [
  'AT', 'BE', 'BA', 'BG', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GB', 'GR', 'HU', 'IE', 'IT', 'LV',
  'LT', 'LU', 'ME', 'NL', 'MK', 'NO', 'PL', 'PT', 'RO', 'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'TR',
];
const FERNBUS = ['AL', 'XK', 'MD', 'UA', 'LI', 'AD', 'MC', 'SM', 'VA', 'GI', 'AX'];

const RAUM = new Set([...INTERRAIL, ...FERNBUS]);

/**
 * Whether a destination in Europe lies outside the Interrail-/Fernbus-Raum, such as Iceland,
 * Malta, Cyprus or the Canary Islands. The rule does not apply outside Europe (false).
 * @param {{code: string, region: string|null}} gebiet from bestimmeGebiet
 */
export function ausserhalbBahnRaum(gebiet, lat, lon) {
  if (gebiet.region !== 'EU') return false;
  if (!RAUM.has(gebiet.code)) return true;
  if (gebiet.code === 'ES' && lat < 30) return true; // Canary Islands
  if (gebiet.code === 'PT' && lon < -12) return true; // Azores, Madeira
  return false;
}
