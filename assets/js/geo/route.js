// Pkw-Strecke zwischen zwei Orten.
//
// 1. Valhalla (FOSSGIS) für Strecken bis rund 1.400 km Luftlinie.
//    Der öffentliche Server lehnt längere Anfragen ab.
// 2. OSRM (FOSSGIS) für längere Strecken oder wenn Valhalla scheitert.
// 3. Gibt es keine Straßenverbindung (z. B. über den Atlantik), wird die
//    Luftlinie verwendet.
//
// Es wird jeweils die schnellste Route berechnet. Ihre Länge passt am besten
// zu den Rechenbeispielen im Merkblatt der Studienstiftung.

const VALHALLA_URL = 'https://valhalla1.openstreetmap.de/route';
const OSRM_URL = 'https://routing.openstreetmap.de/routed-car/route/v1/driving/';
const VALHALLA_MAX_LUFTLINIE_KM = 1400;
// Liegt ein Ort weiter als das vom nächsten Straßenpunkt entfernt, gilt er
// als nicht per Straße erreichbar.
const MAX_FANGRADIUS_M = 10000;
const ZEITLIMIT_MS = 12000;
const ERDRADIUS_KM = 6371.0088;

const rad = (g) => (g * Math.PI) / 180;
const grad = (r) => (r * 180) / Math.PI;

/** Luftlinie (Großkreis) in km. */
export function luftlinieKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * ERDRADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Punkte entlang des Großkreises als [lon, lat]. Die Längengrade werden
 * fortlaufend gehalten (auch über 180 hinaus), damit die Linie auf der Karte
 * nicht an der Datumsgrenze springt.
 */
export function grosskreis(a, b, schritte = 96) {
  const p1 = [rad(a.lat), rad(a.lon)];
  const p2 = [rad(b.lat), rad(b.lon)];
  const d = luftlinieKm(a, b) / ERDRADIUS_KM;
  if (d === 0) return [[a.lon, a.lat], [b.lon, b.lat]];
  const punkte = [];
  let vorher = null;
  for (let i = 0; i <= schritte; i++) {
    const f = i / schritte;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1[0]) * Math.cos(p1[1]) + B * Math.cos(p2[0]) * Math.cos(p2[1]);
    const y = A * Math.cos(p1[0]) * Math.sin(p1[1]) + B * Math.cos(p2[0]) * Math.sin(p2[1]);
    const z = A * Math.sin(p1[0]) + B * Math.sin(p2[0]);
    const lat = grad(Math.atan2(z, Math.sqrt(x * x + y * y)));
    let lon = grad(Math.atan2(y, x));
    if (vorher !== null) {
      while (lon - vorher > 180) lon -= 360;
      while (lon - vorher < -180) lon += 360;
    }
    vorher = lon;
    punkte.push([lon, lat]);
  }
  return punkte;
}

/** Dekodiert eine Polyline mit 6 Nachkommastellen (Valhalla) zu [lon, lat]. */
export function dekodierePolyline6(text) {
  const punkte = [];
  let index = 0;
  let lat = 0;
  let lon = 0;
  const naechsterWert = () => {
    let ergebnis = 0;
    let verschiebung = 0;
    let byte;
    do {
      byte = text.charCodeAt(index++) - 63;
      ergebnis |= (byte & 0x1f) << verschiebung;
      verschiebung += 5;
    } while (byte >= 0x20);
    return ergebnis & 1 ? ~(ergebnis >> 1) : ergebnis >> 1;
  };
  while (index < text.length) {
    lat += naechsterWert();
    lon += naechsterWert();
    punkte.push([lon / 1e6, lat / 1e6]);
  }
  return punkte;
}

/** Reduziert eine Linie gleichmäßig auf höchstens maxPunkte (Anfang und Ende bleiben). */
export function duenneAus(punkte, maxPunkte = 2000) {
  if (punkte.length <= maxPunkte) return punkte;
  const schritt = (punkte.length - 1) / (maxPunkte - 1);
  const ergebnis = [];
  for (let i = 0; i < maxPunkte; i++) ergebnis.push(punkte[Math.round(i * schritt)]);
  return ergebnis;
}

class KeineStrasse extends Error {}

/** Verknüpft ein optionales Abbruchsignal mit einem Zeitlimit. Auch vom Fahrplan genutzt. */
export function mitZeitlimit(signal, ms = ZEITLIMIT_MS) {
  const steuerung = new AbortController();
  const timer = setTimeout(() => steuerung.abort(new DOMException('Zeitüberschreitung', 'TimeoutError')), ms);
  if (signal) {
    if (signal.aborted) steuerung.abort(signal.reason);
    else signal.addEventListener('abort', () => steuerung.abort(signal.reason), { once: true });
  }
  return { signal: steuerung.signal, fertig: () => clearTimeout(timer) };
}

async function valhalla(a, b, signal) {
  const anfrage = {
    locations: [{ lat: a.lat, lon: a.lon }, { lat: b.lat, lon: b.lon }],
    costing: 'auto',
    units: 'kilometers',
    directions_type: 'none',
  };
  const url = `${VALHALLA_URL}?json=${encodeURIComponent(JSON.stringify(anfrage))}`;
  const antwort = await fetch(url, { signal });
  const daten = await antwort.json().catch(() => ({}));
  if (!antwort.ok) {
    // 442: keine Route gefunden, 171: kein Straßenpunkt in der Nähe
    if (daten.error_code === 442 || daten.error_code === 171) throw new KeineStrasse();
    throw new Error(`Valhalla: ${daten.error || antwort.status}`);
  }
  const trip = daten.trip;
  return {
    km: trip.summary.length,
    geometrie: duenneAus(trip.legs.flatMap((l) => dekodierePolyline6(l.shape))),
    quelle: 'Valhalla',
  };
}

async function osrm(a, b, signal) {
  const url = `${OSRM_URL}${a.lon},${a.lat};${b.lon},${b.lat}?overview=simplified&geometries=geojson`;
  const antwort = await fetch(url, { signal });
  const daten = await antwort.json().catch(() => ({}));
  if (daten.code === 'NoRoute') throw new KeineStrasse();
  if (!antwort.ok || daten.code !== 'Ok') throw new Error(`OSRM: ${daten.message || antwort.status}`);
  if ((daten.waypoints || []).some((w) => w.distance > MAX_FANGRADIUS_M)) throw new KeineStrasse();
  const route = daten.routes[0];
  return { km: route.distance / 1000, geometrie: route.geometry.coordinates, quelle: 'OSRM' };
}

/**
 * @returns {Promise<{art: 'strasse'|'keine'|'fehler', km: number, luftlinieKm: number,
 *                    geometrie: Array<[number, number]>, quelle?: string}>}
 *   art "strasse": Pkw-Route gefunden, km ist die Streckenlänge
 *   art "keine":   keine Straßenverbindung, km ist die Luftlinie
 *   art "fehler":  Routendienste nicht erreichbar, km ist die Luftlinie
 */
export async function berechneRoute(a, b, { signal } = {}) {
  const luftlinie = luftlinieKm(a, b);
  const ohneStrasse = (art) => ({ art, km: luftlinie, luftlinieKm: luftlinie, geometrie: grosskreis(a, b) });

  const versuche = luftlinie <= VALHALLA_MAX_LUFTLINIE_KM ? [valhalla, osrm] : [osrm];
  let keineStrasse = false;
  for (const dienst of versuche) {
    const z = mitZeitlimit(signal);
    try {
      const r = await dienst(a, b, z.signal);
      return { art: 'strasse', luftlinieKm: luftlinie, ...r };
    } catch (fehler) {
      if (signal && signal.aborted) throw fehler;
      if (fehler instanceof KeineStrasse) keineStrasse = true;
    } finally {
      z.fertig();
    }
  }
  return ohneStrasse(keineStrasse ? 'keine' : 'fehler');
}
