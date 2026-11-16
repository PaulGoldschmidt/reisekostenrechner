// Schnellste Verbindung mit Bahn oder Bus über Transitous (https://transitous.org),
// einen freien Fahrplandienst für Europa. Grundlage für die Bedingung "Bahn oder Fernbus
// bräuchten länger als 12 Stunden" beim Flugzuschuss.
//
// Nutzungsbedingungen: Open Source, nicht kommerziell, sichtbarer Link auf
// https://transitous.org/sources/ (steht im Fuß der Seite). Der Browser schickt die
// Adresse der Seite als Referer mit, Kontaktdaten stehen im Impressum.

import { mitZeitlimit } from './route.js';

const TRANSITOUS_URL = 'https://api.transitous.org/api/v1/plan';
// Weboberfläche von Transitous, öffnet eine Verbindung über ihre itineraryId
const ANSICHT_URL = 'https://api.transitous.org/';
// Suchfenster ab 6 Uhr UTC: Abfahrten am Vormittag (7 bis 13 Uhr deutscher Zeit)
const SUCHFENSTER_S = 6 * 3600;
const ZEITLIMIT_MS = 30000;

/** Typischer Reisetag: nächster Mittwoch, mindestens zwei Tage voraus, 6 Uhr UTC. */
export function stichtag(jetzt = new Date()) {
  const tag = new Date(Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth(), jetzt.getUTCDate() + 2, 6));
  while (tag.getUTCDay() !== 3) tag.setUTCDate(tag.getUTCDate() + 1);
  return tag;
}

/** Schnellste Verbindung mit Bahn oder Bus aus einer Antwort von Transitous, null wenn es keine gibt. */
export function schnellsteAus(antwort) {
  const wege = (antwort.itineraries || []).filter((weg) =>
    (weg.legs || []).some((abschnitt) => abschnitt.mode && abschnitt.mode !== 'WALK'),
  );
  if (!wege.length) return null;
  const schnellster = wege.reduce((a, b) => (b.duration < a.duration ? b : a));
  return { stunden: schnellster.duration / 3600, id: schnellster.id };
}

/** Link auf die Verbindung in der Weboberfläche von Transitous. */
export function ansichtLink(id, vonName, nachName) {
  const url = new URL(ANSICHT_URL);
  url.searchParams.set('itineraryId', id);
  if (vonName) url.searchParams.set('fromName', vonName);
  if (nachName) url.searchParams.set('toName', nachName);
  return url.href;
}

/**
 * @param {{lat: number, lon: number, name?: string}} a
 * @param {{lat: number, lon: number, name?: string}} b
 * @param {{signal?: AbortSignal}} [optionen]
 * @returns {Promise<{stunden: number, link: string}|null>} schnellste Verbindung oder null
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
    const schnellste = schnellsteAus(await antwort.json());
    return schnellste && { stunden: schnellste.stunden, link: ansichtLink(schnellste.id, a.name, b.name) };
  } finally {
    zeit.fertig();
  }
}
