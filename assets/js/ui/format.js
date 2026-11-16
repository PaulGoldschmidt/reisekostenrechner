import { BUECHERGELD } from '../rules/geld.js';

const EURO_GANZ = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const SATZ = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});
const ZAHL = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

/**
 * Betrag in vollen Euro, ab 50 Cent aufwärts gerundet: 254.8 wird zu "255 €", 867.5 zu "868 €".
 * Gerechnet wird weiter in Cent, nur die Anzeige ist gerundet.
 */
export const euro = (betrag) => EURO_GANZ.format(Math.round(betrag));

/** Kilometersatz, z. B. 0.125 wird zu "0,125 €". */
export const satz = (betrag) => SATZ.format(betrag);

/** 1273.4 wird zu "1.273 km". */
export const km = (wert) => `${ZAHL.format(Math.round(wert))} km`;

export const zahl = (wert) => ZAHL.format(wert);

const FAKTOR = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

/**
 * Bezogen auf den angezeigten, gerundeten Betrag mit einer Nachkommastelle:
 * 56.2 (angezeigt 56 €) wird zu "Das sind 0,2-mal Büchergeld", 900 zu "Das sind 3-mal Büchergeld".
 */
export const buechergeld = (betrag) => `Das sind ${FAKTOR.format(Math.round(betrag) / BUECHERGELD)}-mal Büchergeld`;

/** 14.1 wird zu "14 Std. 6 Min.". */
export const stundenMinuten = (stunden) => {
  const minuten = Math.round(stunden * 60);
  return `${Math.floor(minuten / 60)} Std. ${minuten % 60} Min.`;
};

/** Nominativ und Akkusativ: "1 Tag" oder "8 Tage". */
export const tage = (n) => `${zahl(n)} ${n === 1 ? 'Tag' : 'Tage'}`;

/** Dativ, etwa nach "von", "ab" oder "mit": "1 Tag" oder "8 Tagen". */
export const tagen = (n) => `${zahl(n)} ${n === 1 ? 'Tag' : 'Tagen'}`;
