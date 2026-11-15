const EURO_CENT = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
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

/** 80 wird zu "80 €", 20.4 zu "20,40 €". */
export const euro = (betrag) => (Number.isInteger(betrag) ? EURO_GANZ : EURO_CENT).format(betrag);

/** Kilometersatz, z. B. 0.125 wird zu "0,125 €". */
export const satz = (betrag) => SATZ.format(betrag);

/** 1273.4 wird zu "1.273 km". */
export const km = (wert) => `${ZAHL.format(Math.round(wert))} km`;

export const zahl = (wert) => ZAHL.format(wert);

/** Nominativ und Akkusativ: "1 Tag" oder "8 Tage". */
export const tage = (n) => `${zahl(n)} ${n === 1 ? 'Tag' : 'Tage'}`;

/** Dativ, etwa nach "von", "ab" oder "mit": "1 Tag" oder "8 Tagen". */
export const tagen = (n) => `${zahl(n)} ${n === 1 ? 'Tag' : 'Tagen'}`;
