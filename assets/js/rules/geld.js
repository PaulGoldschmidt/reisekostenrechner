// Beträge werden intern in Zehntelcent (1/1000 Euro) gerechnet. So bleiben
// Kilometersätze wie 0,025 Euro ganzzahlig und es entstehen keine Rundungsfehler.

/** Studienkostenpauschale der Studienstiftung pro Monat, umgangssprachlich "Büchergeld". */
export const BUECHERGELD = 300;

/** Euro (Zahl) in Zehntelcent umrechnen. */
export const milli = (euro) => Math.round(euro * 1000);

/** Zehntelcent in Euro umrechnen, kaufmännisch auf Cent gerundet. */
export const euro = (milliBetrag) => Math.round(milliBetrag / 10) / 100;
