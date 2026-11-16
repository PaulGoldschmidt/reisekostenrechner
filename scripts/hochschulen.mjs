// Erzeugt assets/js/data/hochschulen.js, das Verzeichnis der Hochschulen in Deutschland.
//
// 1. Wikidata (CC0): Name, Kurznamen, Koordinaten, Ort, Studierendenzahl, HRK-Mitgliedschaft
// 2. OpenStreetMap über Photon (ODbL): Postanschrift, gesucht über den Namen in der Nähe
//    der Wikidata-Koordinate
//
// Aufruf: npm run hochschulen   (dauert wegen der Pause zwischen Photon-Anfragen einige Minuten)
// Probelauf: NUR="Universität Hamburg,KIT" npm run hochschulen gibt nur passende Einträge aus
//
// Die Hochschulliste der HRK (Hochschulkompass) ist nur für den persönlichen Gebrauch frei
// und wird deshalb nicht verwendet.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { luftlinieKm } from '../assets/js/geo/route.js';
import { normal, woerter } from '../assets/js/geo/hochschulsuche.js';
import { PHOTON_URL } from '../assets/js/geo/suche.js';

const ZIEL = fileURLToPath(new URL('../assets/js/data/hochschulen.js', import.meta.url));
const KENNUNG = 'reisekostenrechner (https://github.com/PaulGoldschmidt/reisekostenrechner)';
const PAUSE_MS = 1100;
const MAX_ABSTAND_KM = 3;
export const DEUTSCHLAND = [5.8, 47.2, 15.1, 55.1]; // West, Süd, Ost, Nord

// Arten von Hochschulen in Wikidata (Fakultäten, Akademien der Wissenschaften usw. bewusst nicht)
const ARTEN = [
  'Q1365560', // Fachhochschule (Deutschland)
  'Q875538', // staatliche Universität
  'Q902104', // Privatuniversität
  'Q38723', // Hochschule
  'Q21028957', // Hochschule
  'Q1743327', // kirchliche Hochschule
  'Q963908', // private Hochschule
  'Q383092', // Kunstakademie
  'Q1767829', // Volluniversität
  'Q3918', // Universität
  'Q184644', // Konservatorium
  'Q3889692', // Musikhochschule
  'Q1384955', // Veterinärmedizinische Hochschule
  'Q115427560', // Exzellenzuniversität
  'Q62078547', // staatliche Forschungsuniversität
  'Q380093', // Filmhochschule
  'Q1371037', // technische Universität
  'Q2120173', // pädagogische Hochschule
  'Q5028741', // Campusuniversität
  'Q1262595', // Duale Hochschule
  'Q2349320', // Stiftungshochschule
  'Q1669605', // Philosophisch-theologische Hochschule
  'Q17028020', // Fachhochschule
];
const HRK = 'Q880981';

const ABFRAGE = `
SELECT ?h ?name ?alias ?kurz ?coord ?strasse ?plz ?ortName ?studis ?hrk WHERE {
  { VALUES ?typ { ${ARTEN.map((a) => `wd:${a}`).join(' ')} } ?h wdt:P31 ?typ ; wdt:P17 wd:Q183 . }
  UNION { ?h wdt:P463 wd:${HRK} . }
  FILTER NOT EXISTS { ?h wdt:P576 [] }
  FILTER NOT EXISTS { ?h wdt:P1366 [] }
  ?h rdfs:label ?name . FILTER(LANG(?name) = "de")
  OPTIONAL { ?h skos:altLabel ?alias . FILTER(LANG(?alias) = "de") }
  OPTIONAL { ?h wdt:P1813 ?kurz . FILTER(LANG(?kurz) IN ("de", "mul")) }
  OPTIONAL { ?h wdt:P625 ?coord }
  OPTIONAL { ?h wdt:P6375 ?strasse }
  OPTIONAL { ?h wdt:P281 ?plz }
  OPTIONAL { ?h wdt:P131 ?ort . ?ort rdfs:label ?ortName . FILTER(LANG(?ortName) = "de") }
  OPTIONAL { ?h wdt:P2196 ?studis }
  BIND(EXISTS { ?h wdt:P463 wd:${HRK} } AS ?hrk)
}`;

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** Gedankenstriche und Mittelpunkte aus Namen entfernen, Leerzeichen bereinigen. */
export function bereinige(text) {
  return String(text || '')
    .replace(/\s*[\u2013\u2014]\s*/g, ', ')
    .replace(/\s*[\u00B7\u2022\u22C5]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^,\s*|,\s*$/g, '')
    .trim();
}

// Wörter ab drei Buchstaben, damit "der", "für" und Ähnliches den Namensvergleich nicht verfälschen
const langeWoerter = (t) => woerter(bereinige(t)).filter((w) => w.length > 2);

/**
 * Entfernt doppelte Teile einer Anschrift, etwa wenn die Straßenangabe aus Wikidata den Ort
 * schon enthält: "Grabengasse 1, 69117 Heidelberg, Heidelberg" wird zu "Grabengasse 1, 69117 Heidelberg".
 */
export function ohneDoppelteTeile(anschrift) {
  const doppelt = (teil, vorher) =>
    vorher.some((v) => normal(v) === normal(teil) || normal(v).replace(/^\d{4,5}\s+/, '') === normal(teil));
  return anschrift
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .reduce((liste, teil) => (doppelt(teil, liste) ? liste : [...liste, teil]), [])
    .join(', ');
}

async function holeWikidata() {
  const url = new URL('https://query.wikidata.org/sparql');
  url.searchParams.set('query', ABFRAGE);
  const antwort = await fetch(url, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': KENNUNG },
  });
  if (!antwort.ok) throw new Error(`Wikidata: ${antwort.status}`);
  const zeilen = (await antwort.json()).results.bindings;

  const eintraege = new Map();
  for (const z of zeilen) {
    const id = z.h.value.split('/').pop();
    if (!eintraege.has(id)) {
      eintraege.set(id, { id, name: '', aliase: new Set(), kurz: new Set(), coord: null, strasse: null, plz: null, orte: new Set(), studis: 0, hrk: false });
    }
    const e = eintraege.get(id);
    e.name = bereinige(z.name.value);
    if (z.alias) e.aliase.add(bereinige(z.alias.value));
    if (z.kurz) e.kurz.add(bereinige(z.kurz.value));
    if (z.coord && !e.coord) {
      const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(z.coord.value);
      if (m) e.coord = { lon: Number(m[1]), lat: Number(m[2]) };
    }
    if (z.strasse) e.strasse = bereinige(z.strasse.value);
    if (z.plz) e.plz = z.plz.value;
    if (z.ortName) e.orte.add(bereinige(z.ortName.value));
    if (z.studis) e.studis = Math.max(e.studis, Math.round(Number(z.studis.value)) || 0);
    if (z.hrk && z.hrk.value === 'true') e.hrk = true;
  }
  return [...eintraege.values()];
}

async function photon(name, nahe) {
  const url = new URL(PHOTON_URL);
  url.searchParams.set('q', name);
  url.searchParams.set('limit', '8');
  url.searchParams.set('lang', 'de');
  for (const tag of ['amenity:university', 'amenity:college', 'building:university', 'building:college']) {
    url.searchParams.append('osm_tag', tag);
  }
  if (nahe) {
    url.searchParams.set('lat', String(nahe.lat));
    url.searchParams.set('lon', String(nahe.lon));
  } else {
    url.searchParams.set('bbox', DEUTSCHLAND.join(','));
  }
  const antwort = await fetch(url, { headers: { 'User-Agent': KENNUNG } });
  if (!antwort.ok) throw new Error(`Photon: ${antwort.status}`);
  return (await antwort.json()).features || [];
}

/** Bewertet einen Photon-Treffer als Anschrift für eine Hochschule. Höher ist besser. */
function bewerte(hochschule, treffer, nahe) {
  const p = treffer.properties || {};
  const [lon, lat] = treffer.geometry.coordinates;
  if ((p.countrycode || '').toUpperCase() !== 'DE') return -Infinity;
  const abstand = nahe ? luftlinieKm(nahe, { lat, lon }) : 0;
  if (abstand > MAX_ABSTAND_KM) return -Infinity;

  const gesucht = new Set(langeWoerter([hochschule.name, ...hochschule.aliase].join(' ')));
  const gefunden = langeWoerter(p.name);
  const passend = gefunden.filter((w) => gesucht.has(w)).length / Math.max(1, gefunden.length);
  if (!nahe && passend < 0.6) return -Infinity;

  let punkte = passend * 4;
  if (p.street) punkte += 2;
  if (p.housenumber) punkte += 2;
  if (p.postcode) punkte += 1;
  punkte -= abstand;
  return punkte;
}

// Nur offizielle Kurznamen (Wikidata P1813). Aliase enthalten auch historische Namen
// wie "KMU Leipzig" und dienen deshalb nur der Suche.
function waehleKurzname(e) {
  // Mindestens drei Zeichen: "TU" oder "HM" allein sind nicht eindeutig
  const kandidaten = [...e.kurz].filter((k) => k.length >= 3 && k.length <= 28 && k !== e.name);
  kandidaten.sort((a, b) => a.length - b.length);
  return kandidaten[0] || null;
}

const UNTEREINHEIT = /\b(Klinik|Lehrstuhl|Fachbereich|Abteilung|Didaktik|Fakultät|Institut für|Seminar für)\b/i;

/**
 * Entfernt Untereinheiten wie "Universität Leipzig, Klinik für Vögel und Reptilien":
 * Einträge, deren Name mit dem Namen einer anderen Hochschule beginnt oder die nach
 * Instituten und Kliniken klingen. HRK-Mitglieder bleiben immer erhalten.
 */
export function ohneUntereinheiten(liste) {
  const namen = liste.map((h) => h.name);
  return liste.filter((h) => {
    if (h.hrk) return true;
    if (UNTEREINHEIT.test(h.name)) return false;
    return !namen.some((n) => n !== h.name && h.name.startsWith(n) && /^[\s,-]/.test(h.name.slice(n.length)));
  });
}

/** Ein Eintrag pro Zeile: kompakt und mit gut lesbaren Unterschieden in Git. */
function alsModul(liste) {
  return `export const HOCHSCHULEN = [\n${liste.map((h) => JSON.stringify(h)).join(',\n')}\n];\n`;
}

async function main() {
  console.log('Wikidata abfragen ...');
  let liste = await holeWikidata();
  console.log(`${liste.length} Einrichtungen`);
  const nur = process.env.NUR ? process.env.NUR.split(',') : null;
  if (nur) liste = liste.filter((e) => nur.some((n) => e.name.includes(n)));

  const ergebnis = [];
  let i = 0;
  for (const e of liste) {
    i++;
    // Die Pause läuft parallel zur Anfrage: höchstens eine Anfrage pro Sekunde, ohne Leerlauf
    const [treffer] = await Promise.all([
      photon(e.name, e.coord).catch((fehler) => {
        console.warn(`  ${e.name}: ${fehler.message}`);
        return [];
      }),
      pause(PAUSE_MS),
    ]);

    // Ohne Straße muss der Ort des Treffers zu Wikidata passen. So fallen OSM-Fehler
    // wie eine falsche Postleitzahl an einem Campusgelände (KIT) heraus.
    const ortPasst = (t) => {
      const p = t.properties || {};
      if (p.street) return true;
      if (!p.city || e.orte.size === 0) return !p.postcode;
      const stadt = normal(p.city);
      return [...e.orte].some((o) => normal(o).includes(stadt) || stadt.includes(normal(o)));
    };
    const bester = treffer
      .filter(ortPasst)
      .map((t) => ({ t, punkte: bewerte(e, t, e.coord) }))
      .filter((x) => Number.isFinite(x.punkte))
      .sort((a, b) => b.punkte - a.punkte)[0];

    const p = bester ? bester.t.properties : {};
    const osm = bester ? { lon: bester.t.geometry.coordinates[0], lat: bester.t.geometry.coordinates[1] } : null;
    const koord = e.coord || osm;
    if (!koord) {
      console.log(`  [${i}/${liste.length}] ohne Ort: ${e.name}`);
      continue;
    }

    // Anschrift: OSM bevorzugt, sonst Wikidata, sonst nur der Ort
    const strasse = p.street ? bereinige(`${p.street}${p.housenumber ? ` ${p.housenumber}` : ''}`) : e.strasse;
    const plz = p.postcode || e.plz || '';
    const ort = bereinige(p.city || [...e.orte][0] || '');
    const anschrift = ohneDoppelteTeile([strasse, [plz, ort].filter(Boolean).join(' ')].filter(Boolean).join(', '));
    // Mit vollständiger OSM-Anschrift deren Lage nutzen, damit Route und Anzeige zusammenpassen
    const lage = p.street && p.housenumber ? osm : koord;

    ergebnis.push({
      id: e.id,
      name: e.name,
      kurz: waehleKurzname(e),
      aliase: [...new Set([...e.kurz, ...e.aliase])].filter((a) => a !== e.name).slice(0, 8),
      orte: [...new Set([ort, ...e.orte])].filter(Boolean),
      anschrift: anschrift || ort,
      lat: Math.round(lage.lat * 1e5) / 1e5,
      lon: Math.round(lage.lon * 1e5) / 1e5,
      hrk: e.hrk,
      studierende: e.studis,
    });
    if (i % 25 === 0) console.log(`  [${i}/${liste.length}] ${e.name}: ${anschrift}`);
  }

  // Einträge ohne Anschrift oder außerhalb Deutschlands (falsches Land in Wikidata) entfernen
  const [west, sued, ost, nord] = DEUTSCHLAND;
  const inDeutschland = ergebnis.filter(
    (h) => h.anschrift && h.lon >= west && h.lon <= ost && h.lat >= sued && h.lat <= nord,
  );
  const fertig = ohneUntereinheiten(inDeutschland).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  console.log(`${ergebnis.length - inDeutschland.length} ohne Anschrift oder außerhalb Deutschlands entfernt`);
  console.log(`${inDeutschland.length - fertig.length} Untereinheiten entfernt`);
  if (nur) {
    for (const h of fertig) console.log(`${h.kurz || '-'} | ${h.name} | ${h.anschrift} | ${h.lat},${h.lon} | hrk=${h.hrk} | ${h.studierende}`);
    return;
  }
  const heute = new Date().toISOString().slice(0, 10);
  const kopf = [
    `// Automatisch erzeugt mit scripts/hochschulen.mjs am ${heute}. Nicht von Hand bearbeiten.`,
    '//',
    '// Quellen:',
    '// - Wikidata (CC0): Namen, Kurznamen, Koordinaten, Studierendenzahlen, HRK-Mitgliedschaft',
    '// - OpenStreetMap über Photon: die meisten Anschriften, © OpenStreetMap-Mitwirkende,',
    '//   Open Database License (ODbL) 1.0, https://www.openstreetmap.org/copyright',
    '',
  ].join('\n');
  writeFileSync(ZIEL, `${kopf}${alsModul(fertig)}`);
  console.log(`${fertig.length} Hochschulen nach ${ZIEL} geschrieben`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((fehler) => {
    console.error(fehler);
    process.exit(1);
  });
}
