// Schnellste Verbindung mit Bahn oder Bus über Transitous (https://transitous.org),
// einen freien Fahrplandienst für Europa. Grundlage für die Bedingung "Bahn oder Fernbus
// bräuchten länger als 12 Stunden" beim Flugzuschuss.
//
// Nutzungsbedingungen: Open Source, nicht kommerziell, sichtbarer Link auf
// https://transitous.org/sources/ (steht im Fuß der Seite). Der Browser schickt die
// Adresse der Seite als Referer mit, Kontaktdaten stehen im Impressum.

import { mitZeitlimit } from './route.js';

const TRANSITOUS_URL = 'https://api.transitous.org/api/v1/plan';
// Weboberfläche von Transitous auf demselben Server
const ANSICHT_URL = new URL('/', TRANSITOUS_URL).href;
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
  return (antwort.itineraries || [])
    .filter((weg) => (weg.legs || []).some((abschnitt) => abschnitt.mode && abschnitt.mode !== 'WALK'))
    .reduce((a, b) => (!a || b.duration < a.duration ? b : a), null);
}

/** Suchanfrage von a nach b, gemeinsam für die Abfrage und den Link auf die Weboberfläche. */
function suche(a, b) {
  return { fromPlace: `${a.lat},${a.lon}`, toPlace: `${b.lat},${b.lon}`, time: stichtag().toISOString() };
}

/**
 * Link auf die Verbindung in der Weboberfläche von Transitous. Die itineraryId ist laut
 * MOTIS experimentell; Start, Ziel und Zeit stehen mit im Link, damit die Seite notfalls
 * wenigstens dieselbe Suche zeigt.
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
 * @returns {Promise<{stunden: number, link: string}|null>} schnellste Verbindung oder null
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
