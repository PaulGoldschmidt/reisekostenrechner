import { Ortsfeld } from './ui/ortsfeld.js';
import { erstelleKarte } from './ui/karte.js';
import { zeigeVeranstaltung, zeigeAuslandsvorhaben, hinweis } from './ui/ergebnis.js';
import { h } from './ui/dom.js';
import { konfetti } from './ui/konfetti.js';
import { zeigeAdressTipp, versteckeClippy } from './ui/clippy.js';
import { km } from './ui/format.js';
import { berechneRoute } from './geo/route.js';
import { bestimmeGebiet } from './geo/gebiet.js';
import { bereiteVor, sucheHochschulen, alsVorschlag } from './geo/hochschulsuche.js';
import { berechneVeranstaltung } from './rules/veranstaltung.js';
import { berechneAuslandsvorhaben } from './rules/auslandsvorhaben.js';
import { werteZeitraumAus, zeitraumUngueltig, zeitraumNoetig } from './rules/zeitraum.js';

const $ = (sel) => document.querySelector(sel);

const el = {
  anlass: [...document.querySelectorAll('input[name="anlass"]')],
  anlassHilfe: $('#anlass-hilfe'),
  start: $('#start'),
  startListe: $('#start-liste'),
  ziel: $('#ziel'),
  zielListe: $('#ziel-liste'),
  zielLabel: $('#ziel-label'),
  zielHilfe: $('#ziel-hilfe'),
  von: $('#von'),
  bis: $('#bis'),
  zeitraum: $('#zeitraum'),
  zeitraumOptional: $('#zeitraum-optional'),
  zeitraumHilfe: $('#zeitraum-hilfe'),
  karte: $('#karte'),
  strecke: $('#strecke'),
  ergebnis: $('#ergebnis'),
};

const TEXTE = {
  veranstaltung: {
    anlassHilfe: 'Seminare, Akademien und andere Bildungsveranstaltungen der Studienstiftung.',
    zielLabel: 'Veranstaltungsort',
    zielPlatzhalter: 'z. B. Hattingen',
    zielHilfe: 'Ort oder, falls bekannt, die genaue Adresse. Bei einem Bustransfer der Studienstiftung den Abfahrtsort des Busses eingeben.',
    zeitraumHilfe: 'Für den Flugzuschuss gilt eine Mindestdauer vor Ort. Auslandsaufenthalte direkt davor oder danach zählen mit.',
  },
  ausland: {
    anlassHilfe: 'Studium, Forschung, Praktikum, Sprachkurs und andere geförderte Vorhaben im Ausland.',
    zielLabel: 'Zielort im Ausland',
    zielPlatzhalter: 'z. B. Lyon',
    zielHilfe: 'Ort oder, falls bekannt, die genaue Adresse. Maßgeblich für den Zuschuss ist das Zielland.',
    zeitraumHilfe: 'Entscheidet über die Mindestdauer bei Flugreisen und darüber, ob Hin- und Rückreise getrennt gezahlt werden.',
  },
};

const zustand = {
  anlass: 'veranstaltung',
  start: null,
  ziel: null,
  von: '',
  bis: '',
  mitfahrende: 0,
  bahnUeber12h: false,
  route: null,
  routeSchluessel: null,
  routeLaedt: false,
};

let routeAbbruch = null;
const gefeiert = new Set();
const karte = erstelleKarte(el.karte);

// URL

function ortZuText(ort) {
  return [ort.lat.toFixed(5), ort.lon.toFixed(5), ort.land, ort.label].join(',');
}

function textZuOrt(text) {
  if (!text) return null;
  const teile = text.split(',');
  if (teile.length < 4) return null;
  const [lat, lon, land] = teile;
  const label = teile.slice(3).join(',').trim();
  // Kurzname für die Streckenangabe: bei Adressen mit Ort, z. B. "Jägerstraße 22, Berlin"
  const [erster, zweiter = ''] = label.split(',').map((t) => t.trim());
  const plzOrt = /^\d{4,5} (.+)$/.exec(zweiter);
  const name = plzOrt ? `${erster}, ${plzOrt[1]}` : erster;
  const ort = { lat: Number(lat), lon: Number(lon), land: String(land).toUpperCase(), label, name };
  if (!Number.isFinite(ort.lat) || !Number.isFinite(ort.lon) || !/^[A-Z]{2}$/.test(ort.land) || !label) return null;
  return ort;
}

function schreibeUrl() {
  const p = new URLSearchParams();
  if (zustand.anlass === 'ausland') p.set('anlass', 'ausland');
  if (zustand.start) p.set('start', ortZuText(zustand.start));
  if (zustand.ziel) p.set('ziel', ortZuText(zustand.ziel));
  if (zustand.von) p.set('von', zustand.von);
  if (zustand.bis) p.set('bis', zustand.bis);
  if (zustand.mitfahrende) p.set('mitfahrende', String(zustand.mitfahrende));
  if (zustand.bahnUeber12h) p.set('bahn12', '1');
  const query = p.toString();
  history.replaceState(null, '', query ? `?${query}` : location.pathname);
}

function leseUrl() {
  const p = new URLSearchParams(location.search);
  zustand.anlass = p.get('anlass') === 'ausland' ? 'ausland' : 'veranstaltung';
  zustand.start = textZuOrt(p.get('start'));
  zustand.ziel = textZuOrt(p.get('ziel'));
  const datum = (w) => (/^\d{4}-\d{2}-\d{2}$/.test(w || '') ? w : '');
  zustand.von = datum(p.get('von'));
  zustand.bis = datum(p.get('bis'));
  zustand.mitfahrende = Math.min(8, Math.max(0, Number.parseInt(p.get('mitfahrende'), 10) || 0));
  zustand.bahnUeber12h = p.get('bahn12') === '1';
}

// Route

async function ladeRoute() {
  const { start, ziel } = zustand;
  if (!start || !ziel) {
    if (routeAbbruch) routeAbbruch.abort();
    zustand.route = null;
    zustand.routeSchluessel = null;
    zustand.routeLaedt = false;
    return;
  }
  const schluessel = `${start.lat},${start.lon}|${ziel.lat},${ziel.lon}`;
  if (schluessel === zustand.routeSchluessel && zustand.route && zustand.route.art !== 'fehler') return;

  if (routeAbbruch) routeAbbruch.abort();
  routeAbbruch = new AbortController();
  zustand.routeSchluessel = schluessel;
  zustand.route = null;
  zustand.routeLaedt = true;
  zeichne();
  try {
    const route = await berechneRoute(start, ziel, { signal: routeAbbruch.signal });
    if (zustand.routeSchluessel !== schluessel) return;
    zustand.route = route;
  } catch (fehler) {
    if (fehler.name === 'AbortError') return;
    zustand.route = { art: 'fehler', km: null, geometrie: [] };
  }
  zustand.routeLaedt = false;
  zeichne();
}

// Darstellung

function zeichneStrecke(startG, zielG) {
  const { start, ziel, route, routeLaedt } = zustand;
  if (!start || !ziel) {
    el.strecke.textContent = 'Studienort und Ziel eingeben, dann erscheinen Strecke und Zuschuss.';
    return;
  }
  if (routeLaedt) {
    el.strecke.textContent = 'Strecke wird berechnet …';
    return;
  }
  if (!route) return;
  const lage = startG.inland && zielG.inland ? 'Inland' : 'Ausland';
  const von = h('strong', {}, start.name);
  const nach = h('strong', {}, ziel.name);
  if (route.art === 'strasse') {
    el.strecke.replaceChildren(von, ' nach ', nach, `: ${km(route.km)} einfache Strecke mit dem Auto (schnellste Route), ${lage}.`);
  } else if (route.art === 'keine') {
    el.strecke.replaceChildren(von, ' nach ', nach, `: keine Straßenverbindung, Luftlinie ${km(route.km)}, ${lage}.`);
  } else {
    el.strecke.replaceChildren(
      von, ' nach ', nach, ': Die Strecke konnte nicht berechnet werden. ',
      h('button', { type: 'button', class: 'link-knopf', onclick: () => { zustand.routeSchluessel = null; ladeRoute(); } }, 'Erneut versuchen'),
    );
  }
}

function zeichneErgebnis(startG, zielG, mitZeitraum) {
  const { start, ziel, route, anlass } = zustand;
  const aktionen = {
    onMitfahrende: (n) => {
      zustand.mitfahrende = Math.min(8, Math.max(0, n));
      zeichne();
    },
    onBahnUeber12h: (an) => {
      zustand.bahnUeber12h = an;
      zeichne();
    },
  };
  // Ein ausgeblendeter Zeitraum fließt nicht in die Berechnung ein.
  const zeitraum = mitZeitraum ? werteZeitraumAus(zustand.von, zustand.bis) : null;
  const kopf = h('h2', { class: 'ergebnis-titel' }, 'Zuschuss je Verkehrsmittel');
  const meldungen = [];
  if (mitZeitraum && zeitraumUngueltig(zustand.von, zustand.bis)) {
    meldungen.push(hinweis('Zeitraum prüfen.', 'Das Ende liegt vor dem Beginn.', 'warnung'));
  }

  if (!start || !ziel) return { elemente: [], hoechster: 0 };

  if (anlass === 'veranstaltung') {
    if (!route || route.art === 'fehler') return { elemente: [], hoechster: 0 };
    const r = berechneVeranstaltung({
      kmEinfach: route.km,
      ausland: !(startG.inland && zielG.inland),
      innereuropaeisch: startG.region === 'EU' && zielG.region === 'EU',
      landweg: route.art === 'strasse',
      mitfahrende: zustand.mitfahrende,
      bahnUeber12h: zustand.bahnUeber12h,
      aufenthaltTage: zeitraum ? zeitraum.tage : null,
    });
    return {
      elemente: [kopf, ...meldungen, ...zeigeVeranstaltung(r, zustand, aktionen)],
      hoechster: Math.max(r.bahn.verfuegbar ? r.bahn.betrag : 0, r.auto.verfuegbar ? r.auto.betrag : 0, r.flug.mitKompensation),
    };
  }

  // Auslandsvorhaben
  if (zielG.inland) {
    return { hoechster: 0, elemente: [kopf, hinweis('Ziel im Inland.', 'Ein Auslandsvorhaben braucht einen Zielort außerhalb Deutschlands. Für Veranstaltungen oben auf „Veranstaltung“ umschalten.', 'warnung')] };
  }
  if (!zielG.satz) {
    return { hoechster: 0, elemente: [kopf, hinweis('Kein Satz hinterlegt.', `Für ${zielG.name} enthält die DAAD-Liste keinen Reisekostenzuschuss. Bitte bei der Studienstiftung nachfragen.`, 'warnung')] };
  }
  const r = berechneAuslandsvorhaben({
    satz: zielG.satz,
    zielRegion: zielG.region,
    startRegion: startG.region,
    zielKontinent: zielG.kontinent,
    startKontinent: startG.kontinent,
    startCode: startG.code,
    zielCode: zielG.code,
    landweg: route ? (route.art === 'fehler' ? null : route.art === 'strasse') : null,
    zeitraum,
    bahnUeber12h: zustand.bahnUeber12h,
  });
  return {
    elemente: [kopf, ...meldungen, ...zeigeAuslandsvorhaben(r, zielG, zustand, aktionen)],
    hoechster: Math.max(r.land.verfuegbar ? r.land.betrag : 0, r.flug.art === 'europa' ? r.flug.mitKompensation : r.flug.voll),
  };
}

// Konfetti, sobald für eine neue Strecke ein Zuschuss berechnet ist.
// Nicht bei Änderungen an Mitfahrenden oder Haken, nur einmal je Strecke und Anlass.
function feiere(hoechster) {
  const { route, routeLaedt, routeSchluessel, anlass } = zustand;
  if (routeLaedt || !route || route.art === 'fehler' || !(hoechster > 0)) return;
  const schluessel = `${anlass}|${routeSchluessel}`;
  if (gefeiert.has(schluessel)) return;
  gefeiert.add(schluessel);
  const titel = el.ergebnis.querySelector('.ergebnis-titel');
  const box = titel ? titel.getBoundingClientRect() : null;
  const imBild = box && box.top > 40 && box.top < window.innerHeight * 0.85;
  konfetti(imBild
    ? { x: box.left + Math.min(box.width, 560) / 2, y: box.top }
    : { x: window.innerWidth / 2, y: window.innerHeight * 0.45 });
}

function zeichneAnlass() {
  const t = TEXTE[zustand.anlass];
  for (const r of el.anlass) r.checked = r.value === zustand.anlass;
  el.anlassHilfe.textContent = t.anlassHilfe;
  el.zielLabel.textContent = t.zielLabel;
  el.ziel.placeholder = t.zielPlatzhalter;
  el.zielHilfe.textContent = t.zielHilfe;
  el.zeitraumHilfe.textContent = t.zeitraumHilfe;
  el.zeitraumOptional.hidden = zustand.anlass !== 'veranstaltung';
  for (const block of document.querySelectorAll('[data-anlass]')) {
    block.hidden = block.dataset.anlass !== zustand.anlass;
  }
}

function zeichne() {
  const { start, ziel } = zustand;
  const startG = start ? bestimmeGebiet(start.land, start.lat, start.lon) : null;
  const zielG = ziel ? bestimmeGebiet(ziel.land, ziel.lat, ziel.lon) : null;

  zeichneAnlass();
  zeichneStrecke(startG, zielG);

  // Zeitraum nur zeigen, wenn er die Berechnung beeinflusst
  const mitZeitraum = zeitraumNoetig({
    anlass: zustand.anlass,
    ausland: startG && zielG ? !(startG.inland && zielG.inland) : null,
    routenArt: zustand.routeLaedt || !zustand.route ? null : zustand.route.art,
    bahnUeber12h: zustand.bahnUeber12h,
  });
  el.zeitraum.hidden = !mitZeitraum;

  // Fokus über das Neuzeichnen hinweg erhalten
  const fokus = document.activeElement && el.ergebnis.contains(document.activeElement) ? document.activeElement.dataset : null;
  const { elemente, hoechster } = zeichneErgebnis(startG, zielG, mitZeitraum);
  el.ergebnis.replaceChildren(...elemente);
  if (fokus && fokus.fokus) {
    let ziel2 = el.ergebnis.querySelector(`[data-fokus="${fokus.fokus}"]`);
    if (ziel2 && ziel2.disabled && fokus.fokusAlt) ziel2 = el.ergebnis.querySelector(`[data-fokus="${fokus.fokusAlt}"]`);
    if (ziel2) ziel2.focus();
  }

  karte.zeige(start, ziel, zustand.routeLaedt ? null : zustand.route);
  schreibeUrl();
  feiere(hoechster);
}

// Hochschulverzeichnis erst laden, wenn es gebraucht wird

let verzeichnis = null;
function ladeVerzeichnis() {
  verzeichnis ??= import('./data/hochschulen.js')
    .then((modul) => bereiteVor(modul.HOCHSCHULEN))
    .catch(() => []);
  return verzeichnis;
}
el.start.addEventListener('focus', ladeVerzeichnis, { once: true });

// Ereignisse

const startFeld = new Ortsfeld(el.start, el.startListe, {
  lokal: async (text) => sucheHochschulen(await ladeVerzeichnis(), text, 4).map(alsVorschlag),
  lokalTitel: 'Hochschulen',
  onWahl: (ort) => {
    zustand.start = ort;
    ladeRoute();
    zeichne();
  },
  onLeeren: () => {
    zustand.start = null;
    ladeRoute();
    zeichne();
  },
});

const zielFeld = new Ortsfeld(el.ziel, el.zielListe, {
  onWahl: (ort) => {
    zustand.ziel = ort;
    ladeRoute();
    zeichne();
    // Nur ein Ort gewählt: Clippy weist auf die genaue Adresse hin
    if (ort.art === 'ort') zeigeAdressTipp(el.ziel);
    else versteckeClippy();
  },
  onLeeren: () => {
    versteckeClippy();
    zustand.ziel = null;
    ladeRoute();
    zeichne();
  },
});

for (const r of el.anlass) {
  r.addEventListener('change', () => {
    if (r.checked) {
      zustand.anlass = r.value;
      zeichne();
    }
  });
}

for (const feld of [el.von, el.bis]) {
  feld.addEventListener('change', () => {
    zustand.von = el.von.value;
    zustand.bis = el.bis.value;
    zeichne();
  });
}

// Start

leseUrl();
startFeld.setze(zustand.start);
zielFeld.setze(zustand.ziel);
el.von.value = zustand.von;
el.bis.value = zustand.bis;
zeichne();
ladeRoute();
