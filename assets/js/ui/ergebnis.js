// Darstellung der Ergebnisse als Karten je Verkehrsmittel.

import { h } from './dom.js';
import { euro, satz, km, tage, tagen } from './format.js';
import { VERANSTALTUNG } from '../rules/veranstaltung.js';
import { AUSLANDSVORHABEN } from '../rules/auslandsvorhaben.js';

const CO2 = 'CO₂';

const OHNE_LANDWEG = () =>
  hinweis('Keine Straßenverbindung.', 'Bahn, Bus, Auto und Fahrrad kommen nicht in Frage, bezuschusst werden kann nur ein Flug.');

function posten({ titel, betrag, vorsatz = null, neben = null, texte = [], steuerung = null, gedimmt = false }) {
  return h(
    'article',
    { class: `posten${gedimmt ? ' posten-gedimmt' : ''}` },
    h('h3', { class: 'posten-titel' }, titel),
    h('p', { class: 'posten-betrag' }, vorsatz ? h('span', { class: 'posten-vorsatz' }, vorsatz) : null, betrag),
    neben ? h('p', { class: 'posten-neben' }, neben) : null,
    steuerung,
    texte.filter(Boolean).map((t) => h('p', { class: 'posten-text' }, t)),
  );
}

function hinweis(titel, text, art = 'info') {
  return h('div', { class: `meldung meldung-${art}`, role: art === 'warnung' ? 'alert' : null }, h('strong', {}, titel), ' ', text);
}

function schalter({ id, beschriftung, an, onAendern }) {
  return h(
    'label',
    { class: 'schalter', for: id },
    h('input', {
      type: 'checkbox',
      id,
      checked: an,
      'data-fokus': id,
      onchange: (e) => onAendern(e.target.checked),
    }),
    h('span', {}, beschriftung),
  );
}

function zaehler({ wert, max = 8, onAendern }) {
  return h(
    'div',
    { class: 'zaehler', role: 'group', 'aria-labelledby': 'mitfahrende-label' },
    h('span', { class: 'zaehler-label', id: 'mitfahrende-label' }, 'Mitfahrende'),
    h(
      'button',
      {
        type: 'button',
        class: 'zaehler-knopf',
        'aria-label': 'Eine mitfahrende Person weniger',
        'data-fokus': 'mit-minus',
        'data-fokus-alt': 'mit-plus',
        disabled: wert <= 0,
        onclick: () => onAendern(wert - 1),
      },
      '−',
    ),
    h('output', { class: 'zaehler-wert', 'aria-live': 'polite' }, String(wert)),
    h(
      'button',
      {
        type: 'button',
        class: 'zaehler-knopf',
        'aria-label': 'Eine mitfahrende Person mehr',
        'data-fokus': 'mit-plus',
        'data-fokus-alt': 'mit-minus',
        disabled: wert >= max,
        onclick: () => onAendern(wert + 1),
      },
      '+',
    ),
  );
}

const teilText = (t) =>
  ({ 'hin-und-rueck': 'Hin- und Rückreise', hinreise: 'Hinreise', rueckreise: 'Rückreise' })[t.art];

const teileText = (teile) => teile.map((t) => `${teilText(t)} ${euro(t.betrag)}`).join(', ');

// Veranstaltung

/**
 * @param {object} r Ergebnis von berechneVeranstaltung
 * @param {object} z Zustand mit mitfahrende und bahnUeber12h
 * @param {object} aktionen onMitfahrende, onBahnUeber12h
 */
export function zeigeVeranstaltung(r, z, aktionen) {
  const V = VERANSTALTUNG;
  const elemente = [];

  if (r.unterMindestdistanz) {
    elemente.push(
      hinweis('Kein Zuschuss.', `Die einfache Strecke ist kürzer als ${km(V.mindestKmEinfachInland)}. Innerdeutsche Strecken unter ${km(V.mindestKmEinfachInland)} werden nicht bezuschusst.`, 'warnung'),
    );
  }

  if (!r.landweg) elemente.push(OHNE_LANDWEG());

  // Bahn/Bus
  let bahn = null;
  if (!r.bahn.verfuegbar) {
    // keine Karte, siehe Hinweis oben
  } else if (r.unterMindestdistanz) bahn = posten({ titel: 'Bahn/Bus', betrag: euro(0), gedimmt: true });
  else {
    bahn = posten({
      titel: 'Bahn/Bus',
      vorsatz: 'bis zu',
      betrag: euro(r.bahn.betrag),
      texte: [
        `${satz(V.bahnProKm)} pro km für ${km(r.kmGesamt)} hin und zurück` +
          (r.ausland ? '.' : `, höchstens ${euro(V.bahnDeckelInland)}.`) +
          (r.bahn.gedeckelt ? ' Der Höchstbetrag ist erreicht.' : ''),
        r.ausland
          ? `Übernachtungskosten bis ${euro(V.uebernachtungAusland.proStrecke)} pro Strecke können im Rahmen dieses Betrags geltend gemacht werden.`
          : 'Erstattet werden nur die tatsächlichen Ticketkosten.',
      ],
    });
  }

  // Auto
  let auto = null;
  if (r.auto.verfuegbar) {
    auto = posten({
      titel: 'Auto',
      vorsatz: r.unterMindestdistanz ? null : 'bis zu',
      betrag: euro(r.auto.betrag),
      gedimmt: r.unterMindestdistanz,
      steuerung: zaehler({ wert: z.mitfahrende, onAendern: aktionen.onMitfahrende }),
      texte: r.unterMindestdistanz
        ? []
        : [
            `${satz(r.auto.satzProKm)} pro km für ${km(r.kmGesamt)} hin und zurück` +
              (r.ausland ? '.' : `, höchstens ${euro(V.autoDeckelInlandProPerson)} je Person.`) +
              (r.auto.gedeckelt ? ' Der Höchstbetrag ist erreicht.' : ''),
            `Grundsatz ${satz(V.autoProKm)}, für die erste mitfahrende Person ${satz(V.autoErsteMitfahrt)} und für jede weitere ${satz(V.autoWeitereMitfahrt)} pro km zusätzlich. Den Zuschuss erhält die fahrende Person.`,
          ],
    });
  }

  // Flugzeug
  const f = r.flug;
  let flug;
  if (f.status === 'inland') {
    flug = posten({ titel: 'Flugzeug', betrag: euro(0), gedimmt: true, texte: ['Flüge innerhalb Deutschlands werden leider nicht bezuschusst.'] });
  } else {
    const steuerung = f.bahnPflicht
      ? schalter({
          id: 'bahn-12h-veranstaltung',
          beschriftung: `Die einfache Bahn- oder Busfahrt dauert länger als ${V.flug.mindestBahnStunden} Stunden`,
          an: z.bahnUeber12h,
          onAendern: aktionen.onBahnUeber12h,
        })
      : null;
    const dauerText = `Pro Veranstaltungstag höchstens ${km(V.flug.kmProTag)}: Für ${km(r.kmEinfach)} ist ein Aufenthalt von mindestens ${tagen(f.mindestTage)} nötig.`;
    const zahlt = f.status === 'moeglich' || f.status === 'aufenthalt-unbekannt';
    const texte = [];
    if (f.status === 'bahn-unter-12h') {
      texte.push(`Ein Flug wird nur bezuschusst, wenn die Bahn- oder Busfahrt länger als ${V.flug.mindestBahnStunden} Stunden dauert. Dann wären es bis zu ${euro(f.moeglichMit)} (${euro(f.moeglichOhne)} ohne ${CO2}-Kompensation).`);
      texte.push(dauerText);
    } else if (f.status === 'aufenthalt-zu-kurz') {
      texte.push(`${dauerText} Angegeben ${f.aufenthaltTage === 1 ? 'ist' : 'sind'} ${tage(f.aufenthaltTage)}.`);
    } else if (f.status === 'aufenthalt-unbekannt') {
      texte.push(`${dauerText} Mit einem Zeitraum oben prüft der Rechner das.`);
    } else {
      texte.push(`${dauerText} Mit ${tagen(f.aufenthaltTage)} ist das erfüllt.`);
    }
    texte.push(f.innereuropaeisch ? 'Pauschale für innereuropäische Flüge, für Hin- und Rückreise zusammen.' : 'Pauschale für außereuropäische Flüge, für Hin- und Rückreise zusammen.');
    flug = posten({
      titel: 'Flugzeug',
      vorsatz: zahlt ? 'bis zu' : null,
      betrag: euro(zahlt ? f.mitKompensation : 0),
      neben: zahlt ? `mit ${CO2}-Kompensation, sonst ${euro(f.ohneKompensation)}` : null,
      gedimmt: !zahlt,
      steuerung,
      texte,
    });
  }

  // Fahrrad / zu Fuß
  let rad = null;
  if (!r.rad.verfuegbar) {
    // keine Karte, siehe Hinweis oben
  } else if (r.unterMindestdistanz) rad = posten({ titel: 'Fahrrad oder zu Fuß', betrag: euro(0), gedimmt: true });
  else if (r.rad.ausland) {
    rad = posten({
      titel: 'Fahrrad oder zu Fuß',
      vorsatz: 'bis zu',
      betrag: euro(r.rad.maxGesamt),
      neben: `für Übernachtungen, höchstens ${euro(r.rad.proNacht)} pro Nacht`,
      texte: [`Notwendige und nachgewiesene Übernachtungskosten bis ${euro(r.rad.proNacht)} je Nacht, insgesamt höchstens ${satz(V.bahnProKm)} pro km.`],
    });
  } else {
    rad = posten({
      titel: 'Fahrrad oder zu Fuß',
      vorsatz: 'bis zu',
      betrag: euro(r.rad.max),
      neben: `für Übernachtungen, bei nur einer Nacht ${euro(r.rad.eineNacht)}`,
      texte: ['Bezuschusst werden notwendige und nachgewiesene Übernachtungskosten.'],
    });
  }

  elemente.push(h('div', { class: 'posten-raster' }, bahn, auto, flug, rad));
  return elemente;
}

// Auslandsvorhaben

/**
 * @param {object} r Ergebnis von berechneAuslandsvorhaben
 * @param {object} ziel Gebiet des Ziels (aus bestimmeGebiet)
 * @param {object} z Zustand mit bahnUeber12h
 * @param {object} aktionen onBahnUeber12h
 */
export function zeigeAuslandsvorhaben(r, ziel, z, aktionen) {
  const A = AUSLANDSVORHABEN;
  const elemente = [];

  elemente.push(
    h(
      'p',
      { class: 'satz-zeile' },
      `DAAD-Satz für ${ziel.name}: `,
      h('strong', {}, euro(r.satz.hinRueck)),
      ' für Hin- und Rückreise, ',
      h('strong', {}, euro(r.satz.einfach)),
      ' für eine Richtung.',
    ),
  );

  if (r.auszahlung === 'nur-hinreise') {
    elemente.push(hinweis('Nur Hinreise.', 'Das Ziel liegt auf einem außereuropäischen Kontinent und die Anreise erfolgt aus einem anderen Land desselben Kontinents. Dann gibt es nur den Hinreisezuschuss.'));
  } else if (r.auszahlung === 'getrennt') {
    elemente.push(hinweis('Länger als ein Jahr.', 'Hinreise- und Rückreisezuschuss werden getrennt gezahlt, zu Beginn und zum Ende des Aufenthalts.'));
  }

  // Ohne Flugzeug
  const land = r.land.verfuegbar
    ? posten({
        titel: 'Bahn, Bus, Auto oder Fahrrad',
        betrag: euro(r.land.betrag),
        neben: r.auszahlung === 'gesamt' ? null : teileText(r.land.teile),
        texte: ['Voller Reisekostenzuschuss bei Anreise ohne Flugzeug.'],
      })
    : null;
  if (!land) elemente.push(OHNE_LANDWEG());

  // Flugzeug
  const f = r.flug;
  let flug;
  const dauerAngabe = f.tage === null ? '' : ` Angegeben ${f.tage === 1 ? 'ist' : 'sind'} ${tage(f.tage)}.`;
  if (f.art === 'europa') {
    const zahlt = f.status === 'moeglich' || f.status === 'dauer-unbekannt';
    const texte = [];
    if (f.status === 'keine-foerderung') {
      texte.push(`Bei Anreise mit dem Flugzeug muss das Vorhaben mindestens ${tage(f.mindestTage)} dauern, sonst gibt es keine Auslandsförderung.${dauerAngabe}`);
    } else if (f.status === 'bahn-unter-12h') {
      texte.push(`Flüge werden nur bezuschusst, wenn Bahn oder Fernbus länger als ${A.europaFlugMindestBahnStunden} Stunden bräuchten oder das Ziel außerhalb des Interrail- und Fernbus-Raums liegt. Sonst entfällt der Zuschuss.`);
    } else if (f.status === 'dauer-unbekannt') {
      texte.push(`Nur bei einem Vorhaben ab ${tagen(f.mindestTage)}. Mit einem Zeitraum oben prüft der Rechner das.`);
    } else {
      texte.push(`Mindestdauer von ${tagen(f.mindestTage)} erfüllt.${dauerAngabe}`);
    }
    texte.push('Deutlich reduzierte Pauschale für Flüge innerhalb Europas.');
    flug = posten({
      titel: 'Flugzeug',
      betrag: euro(zahlt ? f.mitKompensation : 0),
      neben: zahlt ? `mit ${CO2}-Kompensation, sonst ${euro(f.ohneKompensation)}` + (r.auszahlung === 'getrennt' ? ', je zur Hälfte für Hin- und Rückreise' : '') : null,
      gedimmt: !zahlt,
      steuerung: schalter({
        id: 'bahn-12h-ausland',
        beschriftung: `Bahn oder Fernbus bräuchten länger als ${A.europaFlugMindestBahnStunden} Stunden, oder das Ziel liegt außerhalb des Interrail- und Fernbus-Raums`,
        an: z.bahnUeber12h,
        onAendern: aktionen.onBahnUeber12h,
      }),
      texte,
    });
  } else {
    const zahlt = f.status === 'moeglich' || f.status === 'dauer-unbekannt';
    const texte = [];
    const regionText = r.regionName ? `für ${r.regionName}` : 'für diese Region';
    if (f.status === 'keine-foerderung') {
      texte.push(`Bei Anreise mit dem Flugzeug gilt ${regionText} eine Mindestdauer von ${tagen(f.mindestTage)}, sonst gibt es keine Auslandsförderung.${dauerAngabe}`);
    } else if (f.status === 'dauer-unbekannt') {
      texte.push(`Mindestdauer ${regionText}: ${tage(f.mindestTage)}. Mit einem Zeitraum oben prüft der Rechner das.`);
    } else {
      texte.push(`Mindestdauer ${regionText} von ${tagen(f.mindestTage)} erfüllt.${dauerAngabe}`);
    }
    texte.push(`Voller Zuschuss nur bei nachhaltiger Flugreise: kein innereuropäischer Zubringerflug (z. B. Rail&Fly nutzen), so wenige Zwischenstopps wie möglich und ${CO2}-Kompensation. Sonst wird der Zuschuss um 50 % gekürzt.`);
    flug = posten({
      titel: 'Flugzeug',
      betrag: euro(zahlt ? f.voll : 0),
      neben: zahlt
        ? `bei nachhaltiger Flugreise, sonst ${euro(f.reduziert)}` + (r.auszahlung === 'gesamt' ? '' : ` (${teileText(f.teileVoll)})`)
        : null,
      gedimmt: !zahlt,
      texte,
    });
  }

  elemente.push(h('div', { class: 'posten-raster' }, land, flug));

  if (r.tage === null) {
    elemente.push(h('p', { class: 'fussnote' }, 'Ohne Zeitraum kann der Rechner die Mindestdauer bei Flugreisen und die Auszahlung bei Vorhaben über einem Jahr nicht prüfen.'));
  } else if (r.unterAchtWochen) {
    elemente.push(h('p', { class: 'fussnote' }, `Bei Vorhaben unter 8 Wochen gibt es ausschließlich den Reisekostenzuschuss.`));
  } else {
    elemente.push(h('p', { class: 'fussnote' }, 'Ab 8 Wochen kommen weitere Leistungen hinzu, etwa die Auslandspauschale. Diese berechnet der Rechner nicht.'));
  }
  return elemente;
}

export { hinweis };
