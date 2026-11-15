// Hilfsfunktionen für Zeiträume im Format JJJJ-MM-TT (wie <input type="date">).

const TAG_MS = 24 * 60 * 60 * 1000;

function parse(datum) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datum || '');
  if (!m) return null;
  const [j, mo, t] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(j, mo - 1, t));
  // Ungültige Daten wie 2026-02-30 abfangen
  if (d.getUTCFullYear() !== j || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== t) return null;
  return d;
}

/**
 * Wertet einen Zeitraum aus. An- und Abreisetag zählen mit.
 * @returns {null | {tage: number, wochen: number, mehrAlsEinJahr: boolean}}
 */
export function werteZeitraumAus(von, bis) {
  const a = parse(von);
  const b = parse(bis);
  if (!a || !b || b < a) return null;
  const tage = Math.round((b - a) / TAG_MS) + 1;
  // Mehr als ein Jahr: Ende liegt am oder nach dem gleichen Kalendertag im Folgejahr.
  const einJahrSpaeter = new Date(Date.UTC(a.getUTCFullYear() + 1, a.getUTCMonth(), a.getUTCDate()));
  return { tage, wochen: tage / 7, mehrAlsEinJahr: b >= einJahrSpaeter };
}

/** Prüft, ob beide Daten gesetzt sind, das Ende aber vor dem Beginn liegt. */
export function zeitraumUngueltig(von, bis) {
  const a = parse(von);
  const b = parse(bis);
  return Boolean(a && b && b < a);
}
