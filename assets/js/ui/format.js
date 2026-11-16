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
 * Whole euros, 50 cents round up: 254.8 becomes "255 €", 867.5 becomes "868 €".
 * Only the display is rounded, calculations keep the cents.
 */
export const euro = (betrag) => EURO_GANZ.format(Math.round(betrag));

/** Rate per km, e.g. 0.125 becomes "0,125 €". */
export const satz = (betrag) => SATZ.format(betrag);

export const km = (wert) => `${ZAHL.format(Math.round(wert))} km`;

export const zahl = (wert) => ZAHL.format(wert);

const FAKTOR = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

/**
 * Based on the displayed, rounded amount so the factor matches what the user sees, with one decimal:
 * 56.2 (shown as 56 €) becomes "Das sind 0,2-mal Büchergeld", 900 becomes "Das sind 3-mal Büchergeld".
 */
export const buechergeld = (betrag) => `Das sind ${FAKTOR.format(Math.round(betrag) / BUECHERGELD)}-mal Büchergeld`;

export const stundenMinuten = (stunden) => {
  const minuten = Math.round(stunden * 60);
  return `${Math.floor(minuten / 60)} Std. ${minuten % 60} Min.`;
};

/** Nominative and accusative: "1 Tag" or "8 Tage". */
export const tage = (n) => `${zahl(n)} ${n === 1 ? 'Tag' : 'Tage'}`;

/** Dative, e.g. after "von", "ab" or "mit": "1 Tag" or "8 Tagen". */
export const tagen = (n) => `${zahl(n)} ${n === 1 ? 'Tag' : 'Tagen'}`;
