// Ortssuche über Photon (komoot), basierend auf OpenStreetMap-Daten.
// Photon ist für die Suche während der Eingabe gedacht; Nominatim erlaubt das nicht.
//
// Zwei Arten von Anfragen:
// - Orte ("Leipzig"): nur Städte, Dörfer und Ortsteile
// - Adressen ("Jägerstraße 22, Berlin"): sobald eine Hausnummer oder ein Straßenwort vorkommt

const PHOTON_URL = 'https://photon.komoot.io/api/';

// Nur Orte, keine Straßen, Gebäude oder Verwaltungsgrenzen.
const ORTSARTEN = new Set([
  'city', 'town', 'village', 'hamlet', 'municipality', 'borough',
  'suburb', 'quarter', 'locality', 'island', 'islet',
]);

const STRASSENWORT = /(stra(ss|ß)e|str\.|weg|platz|allee|gasse|ring|damm|ufer|chaussee|steig|pfad|promenade|berliner tor)\b/i;

/** Ob eine Eingabe wie eine Adresse aussieht. */
export function istAdresse(anfrage) {
  return /\d/.test(anfrage) || STRASSENWORT.test(anfrage);
}

/** Ortsvorschlag, z. B. "Hattingen" mit Zusatz "Nordrhein-Westfalen, Deutschland". */
export function ortAusPhoton(p, lon, lat) {
  if (!ORTSARTEN.has(p.osm_value) || !p.countrycode || !p.name) return null;
  const zusatz = [];
  if (p.city && p.city !== p.name) zusatz.push(p.city);
  if (p.state && p.state !== p.name) zusatz.push(p.state);
  if (p.country && p.country !== p.state) zusatz.push(p.country);
  return {
    art: 'ort',
    titel: p.name,
    zusatz: zusatz.join(', '),
    name: p.name,
    label: [p.name, ...zusatz].join(', '),
    lat,
    lon,
    land: p.countrycode.toUpperCase(),
  };
}

/** Adressvorschlag, z. B. "Jägerstraße 22" mit Zusatz "10117 Berlin". */
export function adresseAusPhoton(p, lon, lat) {
  if (!p.countrycode) return null;
  const strasse = p.type === 'street' ? p.name : [p.street, p.housenumber].filter(Boolean).join(' ');
  if (!strasse) return null;
  const stadt = p.city || p.locality || p.district || p.county;
  const ort = [p.postcode, stadt].filter(Boolean).join(' ');
  const land = p.countrycode.toUpperCase();
  const zusatz = [ort, land === 'DE' ? null : p.country].filter(Boolean).join(', ');
  return {
    art: 'adresse',
    titel: strasse,
    zusatz,
    name: [strasse, stadt].filter(Boolean).join(', '),
    label: [strasse, zusatz].filter(Boolean).join(', '),
    lat,
    lon,
    land,
  };
}

/**
 * @param {string} anfrage
 * @param {{signal?: AbortSignal, max?: number}} [optionen]
 * @returns {Promise<Array<{art: string, titel: string, zusatz: string, name: string, label: string,
 *                          lat: number, lon: number, land: string}>>}
 */
export async function sucheOrte(anfrage, { signal, max = 6 } = {}) {
  const q = anfrage.trim();
  if (q.length < 2) return [];
  const adresse = istAdresse(q);

  const url = new URL(PHOTON_URL);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '10');
  url.searchParams.set('lang', 'de');
  if (adresse) {
    url.searchParams.append('layer', 'house');
    url.searchParams.append('layer', 'street');
  } else {
    url.searchParams.set('osm_tag', 'place');
  }
  // Leichte Bevorzugung von Orten in Deutschland
  url.searchParams.set('lat', '51.1');
  url.searchParams.set('lon', '10.4');
  url.searchParams.set('location_bias_scale', '0.3');

  const antwort = await fetch(url, { signal });
  if (!antwort.ok) throw new Error(`Ortssuche fehlgeschlagen (${antwort.status})`);
  const daten = await antwort.json();

  const gesehen = new Set();
  const vorschlaege = [];
  for (const f of daten.features || []) {
    const [lon, lat] = f.geometry.coordinates;
    const v = adresse ? adresseAusPhoton(f.properties || {}, lon, lat) : ortAusPhoton(f.properties || {}, lon, lat);
    if (!v || gesehen.has(v.label)) continue;
    gesehen.add(v.label);
    vorschlaege.push(v);
    if (vorschlaege.length >= max) break;
  }
  return vorschlaege;
}
