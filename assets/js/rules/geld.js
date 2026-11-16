// Amounts are computed internally in tenths of a cent (1/1000 euro), so per-km rates
// like 0.025 euro stay whole numbers and no floating point rounding errors creep in.

/** Monthly Studienkostenpauschale of the Studienstiftung, colloquially "Büchergeld". */
export const BUECHERGELD = 300;

export const milli = (euro) => Math.round(euro * 1000);

export const euro = (milliBetrag) => Math.round(milliBetrag / 10) / 100;
