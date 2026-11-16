// Suche im lokalen Hochschulverzeichnis, ohne Netzwerkanfragen.
// Findet Hochschulen über Ort ("Hamburg"), Namen ("Uni Bonn") oder Kurznamen ("TUM", "HAW").

const normal = (text) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss');

const woerter = (text) => normal(text).split(/[^a-z0-9]+/).filter(Boolean);

/** Bereitet das Verzeichnis einmalig für schnelle Suchen vor. */
export function bereiteVor(hochschulen) {
  return hochschulen.map((h) => ({
    h,
    woerter: new Set(woerter([h.name, h.kurz, ...(h.aliase || []), ...(h.orte || [])].join(' '))),
    name: normal(h.name),
    kurz: normal(h.kurz),
    aliase: (h.aliase || []).map(normal),
    orte: (h.orte || []).map(normal),
  }));
}

/**
 * @param {ReturnType<typeof bereiteVor>} verzeichnis
 * @param {string} anfrage
 * @param {number} [max]
 * @returns {Array<object>} passende Hochschulen, beste zuerst
 */
export function sucheHochschulen(verzeichnis, anfrage, max = 4) {
  const q = normal(anfrage).trim();
  const teile = woerter(q);
  if (q.length < 2 || teile.length === 0) return [];

  const treffer = [];
  for (const v of verzeichnis) {
    // Jedes eingegebene Wort muss Anfang eines Wortes der Hochschule sein
    const passt = teile.every((t) => {
      for (const w of v.woerter) if (w.startsWith(t)) return true;
      return false;
    });
    if (!passt) continue;

    let punkte = 0;
    if (v.orte.includes(q)) punkte += 50;
    else if (v.orte.some((o) => o.startsWith(q))) punkte += 30;
    if (v.kurz && v.kurz === q) punkte += 60;
    else if (v.kurz && v.kurz.startsWith(q)) punkte += 35;
    if (v.aliase.includes(q)) punkte += 45;
    if (v.name.startsWith(q)) punkte += 20;
    if (v.h.hrk) punkte += 15;
    punkte += Math.log10(1 + (v.h.studierende || 0)) * 4;
    treffer.push({ h: v.h, punkte });
  }
  return treffer
    .sort((a, b) => b.punkte - a.punkte || a.h.name.localeCompare(b.h.name, 'de'))
    .slice(0, max)
    .map((t) => t.h);
}

/** Vorschlag für das Ortsfeld aus einem Verzeichniseintrag. */
export function alsVorschlag(h) {
  return {
    art: 'hochschule',
    titel: h.name,
    zusatz: h.anschrift,
    name: h.kurz || h.name,
    label: h.anschrift && h.anschrift !== h.name ? `${h.name}, ${h.anschrift}` : h.name,
    lat: h.lat,
    lon: h.lon,
    land: 'DE',
  };
}
