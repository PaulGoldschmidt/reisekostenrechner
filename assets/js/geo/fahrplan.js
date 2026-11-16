// Schnellste Verbindung mit Bahn oder Bus über Transitous (https://transitous.org),
// einen freien Fahrplandienst für Europa. Grundlage für die Bedingung "Bahn oder Fernbus
// bräuchten länger als 12 Stunden" beim Flugzuschuss.
//
// Nutzungsbedingungen: Open Source, nicht kommerziell, sichtbarer Link auf
// https://transitous.org/sources/ (steht im Fuß der Seite). Der Browser schickt die
// Adresse der Seite als Referer mit, Kontaktdaten stehen im Impressum.

import { mitZeitlimit } from './route.js';

const TRANSITOUS_URL = 'https://api.transitous.org/api/v1/plan';
// Suchfenster ab 6 Uhr UTC: Abfahrten am Vormittag (7 bis 13 Uhr deutscher Zeit)
const SUCHFENSTER_S = 6 * 3600;
const ZEITLIMIT_MS = 30000;

/** Typischer Reisetag: nächster Mittwoch, mindestens zwei Tage voraus, 6 Uhr UTC. */
export function stichtag(jetzt = new Date()) {
  const tag = new Date(Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth(), jetzt.getUTCDate() + 2, 6));
  while (tag.getUTCDay() !== 3) tag.setUTCDate(tag.getUTCDate() + 1);
  return tag;
}

/** Dauer der schnellsten Verbindung mit Bahn oder Bus in Stunden, null wenn es keine gibt. */
export function schnellsteStunden(antwort) {
  const dauern = (antwort.itineraries || [])
    .filter((weg) => (weg.legs || []).some((abschnitt) => abschnitt.mode && abschnitt.mode !== 'WALK'))
    .map((weg) => weg.duration);
  return dauern.length ? Math.min(...dauern) / 3600 : null;
}

/**
 * @param {{lat: number, lon: number}} a
 * @param {{lat: number, lon: number}} b
 * @param {{signal?: AbortSignal}} [optionen]
 * @returns {Promise<number|null>} Stunden der schnellsten Verbindung oder null
 */
export async function schnellsteVerbindung(a, b, { signal } = {}) {
  const url = new URL(TRANSITOUS_URL);
  url.searchParams.set('fromPlace', `${a.lat},${a.lon}`);
  url.searchParams.set('toPlace', `${b.lat},${b.lon}`);
  url.searchParams.set('time', stichtag().toISOString());
  url.searchParams.set('searchWindow', String(SUCHFENSTER_S));
  const zeit = mitZeitlimit(signal, ZEITLIMIT_MS);
  try {
    const antwort = await fetch(url, { signal: zeit.signal });
    if (!antwort.ok) throw new Error(`Transitous: ${antwort.status}`);
    return schnellsteStunden(await antwort.json());
  } finally {
    zeit.fertig();
  }
}
