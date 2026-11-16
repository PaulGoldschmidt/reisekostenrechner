const TAG_MS = 24 * 60 * 60 * 1000;

function parse(datum) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datum || '');
  if (!m) return null;
  const [j, mo, t] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(j, mo - 1, t));
  // Date.UTC silently rolls invalid dates like 2026-02-30 over into the next month.
  if (d.getUTCFullYear() !== j || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== t) return null;
  return d;
}

/**
 * Both the arrival and the departure day count as full days.
 * @returns {null | {tage: number, wochen: number, mehrAlsEinJahr: boolean}}
 */
export function werteZeitraumAus(von, bis) {
  const a = parse(von);
  const b = parse(bis);
  if (!a || !b || b < a) return null;
  const tage = Math.round((b - a) / TAG_MS) + 1;
  // Because both end days count, ending on the same calendar day a year later is
  // already more than a year.
  const einJahrSpaeter = new Date(Date.UTC(a.getUTCFullYear() + 1, a.getUTCMonth(), a.getUTCDate()));
  return { tage, wochen: tage / 7, mehrAlsEinJahr: b >= einJahrSpaeter };
}

/**
 * Whether the calculation needs the dates of the stay.
 * Auslandsvorhaben: always (minimum stay for flights, separate payout for more than a year).
 * Veranstaltung: only if a flight abroad can be subsidised, that is if there is no road
 * connection or the train takes longer than 12 hours. The stay must then be long enough
 * that there are at most 500 km of travel per event day.
 *
 * @param {object} p
 * @param {'veranstaltung'|'ausland'} p.anlass
 * @param {boolean|null} p.ausland  trip to or from another country (null: places not known yet)
 * @param {'strasse'|'keine'|'fehler'|null} p.routenArt
 * @param {boolean} p.bahnUeber12h
 */
export function zeitraumNoetig({ anlass, ausland, routenArt, bahnUeber12h }) {
  if (anlass === 'ausland') return true;
  if (!ausland) return false;
  if (routenArt === 'keine') return true;
  return routenArt === 'strasse' && bahnUeber12h;
}

export function zeitraumUngueltig(von, bis) {
  const a = parse(von);
  const b = parse(bis);
  return Boolean(a && b && b < a);
}
