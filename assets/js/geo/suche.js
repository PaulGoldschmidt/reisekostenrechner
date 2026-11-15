// Ortssuche über Photon (komoot), basierend auf OpenStreetMap-Daten.
// Photon ist für die Suche während der Eingabe gedacht; Nominatim erlaubt das nicht.

const PHOTON_URL = 'https://photon.komoot.io/api/';

// Nur Orte, keine Straßen, Gebäude oder Verwaltungsgrenzen.
const ORTSARTEN = new Set([
  'city', 'town', 'village', 'hamlet', 'municipality', 'borough',
  'suburb', 'quarter', 'locality', 'island', 'islet',
]);

/** Aufbereiteter Anzeigetext, z. B. "Hattingen, Nordrhein-Westfalen, Deutschland". */
function beschriftung(p) {
  const teile = [p.name];
  if (p.city && p.city !== p.name) teile.push(p.city);
  if (p.state && p.state !== p.name) teile.push(p.state);
  if (p.country && p.country !== p.state) teile.push(p.country);
  return teile.filter(Boolean).join(', ');
}

/**
 * @param {string} anfrage
 * @param {{signal?: AbortSignal}} [optionen]
 * @returns {Promise<Array<{name: string, label: string, lat: number, lon: number, land: string}>>}
 */
export async function sucheOrte(anfrage, { signal } = {}) {
  const q = anfrage.trim();
  if (q.length < 2) return [];

  const url = new URL(PHOTON_URL);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '10');
  url.searchParams.set('lang', 'de');
  url.searchParams.set('osm_tag', 'place');
  // Leichte Bevorzugung von Orten in Deutschland
  url.searchParams.set('lat', '51.1');
  url.searchParams.set('lon', '10.4');
  url.searchParams.set('location_bias_scale', '0.3');

  const antwort = await fetch(url, { signal });
  if (!antwort.ok) throw new Error(`Ortssuche fehlgeschlagen (${antwort.status})`);
  const daten = await antwort.json();

  const gesehen = new Set();
  const orte = [];
  for (const f of daten.features || []) {
    const p = f.properties || {};
    if (!ORTSARTEN.has(p.osm_value) || !p.countrycode || !p.name) continue;
    const label = beschriftung(p);
    if (gesehen.has(label)) continue;
    gesehen.add(label);
    const [lon, lat] = f.geometry.coordinates;
    orte.push({ name: p.name, label, lat, lon, land: p.countrycode.toUpperCase() });
    if (orte.length >= 6) break;
  }
  return orte;
}
