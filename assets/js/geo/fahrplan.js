// Fastest train or bus connection via Transitous (https://transitous.org), a free timetable
// service for Europe. Used for the flight subsidy rule "train or long-distance bus would take
// longer than 12 hours".

import { mitZeitlimit } from './route.js';

// Terms of use: open source, non-commercial, and a visible link to
// https://transitous.org/sources/ (in the page footer). The browser sends the page address
// as Referer; contact details are in the imprint (Impressum).
const TRANSITOUS_URL = 'https://api.transitous.org/api/v1/plan';
const ANSICHT_URL = new URL('/', TRANSITOUS_URL).href;
// Starting at 06:00 UTC (stichtag), this covers morning departures, about 7 to 13 o'clock in Germany.
const SUCHFENSTER_S = 6 * 3600;
const ZEITLIMIT_MS = 30000;

/** A typical travel day: the next Wednesday at least two days ahead, 06:00 UTC. */
export function stichtag(jetzt = new Date()) {
  const tag = new Date(Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth(), jetzt.getUTCDate() + 2, 6));
  while (tag.getUTCDay() !== 3) tag.setUTCDate(tag.getUTCDate() + 1);
  return tag;
}

/** Fastest itinerary in a Transitous plan response that uses transit (walking-only ones do not count), or null. */
export function schnellsteAus(antwort) {
  return (antwort.itineraries || [])
    .filter((weg) => (weg.legs || []).some((abschnitt) => abschnitt.mode && abschnitt.mode !== 'WALK'))
    .reduce((a, b) => (!a || b.duration < a.duration ? b : a), null);
}

/** Search parameters shared by the API request and the web UI link. */
function suche(a, b) {
  return { fromPlace: `${a.lat},${a.lon}`, toPlace: `${b.lat},${b.lon}`, time: stichtag().toISOString() };
}

/**
 * Link to the connection in the Transitous web UI. MOTIS marks itineraryId as experimental,
 * so start, destination and time are in the link too: the page then at least shows the same search.
 */
export function ansichtLink(weg, anfrage, vonName, nachName) {
  const url = new URL(ANSICHT_URL);
  const parameter = { ...anfrage, fromName: vonName, toName: nachName, itineraryId: weg.id };
  for (const [name, wert] of Object.entries(parameter)) if (wert) url.searchParams.set(name, wert);
  return url.href;
}

/**
 * @param {{lat: number, lon: number, name?: string}} a
 * @param {{lat: number, lon: number, name?: string}} b
 * @param {{signal?: AbortSignal}} [optionen]
 * @returns {Promise<{stunden: number, link: string}|null>} null if there is no train or bus connection
 */
export async function schnellsteVerbindung(a, b, { signal } = {}) {
  const anfrage = suche(a, b);
  const url = new URL(TRANSITOUS_URL);
  for (const [name, wert] of Object.entries(anfrage)) url.searchParams.set(name, wert);
  url.searchParams.set('searchWindow', String(SUCHFENSTER_S));
  const zeit = mitZeitlimit(signal, ZEITLIMIT_MS);
  try {
    const antwort = await fetch(url, { signal: zeit.signal });
    if (!antwort.ok) throw new Error(`Transitous: ${antwort.status}`);
    const weg = schnellsteAus(await antwort.json());
    return weg && { stunden: weg.duration / 3600, link: ansichtLink(weg, anfrage, a.name, b.name) };
  } finally {
    zeit.fertig();
  }
}
