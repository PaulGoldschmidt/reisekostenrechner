// There are no official examples for Auslandsvorhaben, so these cases are derived
// from the rule texts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { berechneAuslandsvorhaben } from '../assets/js/rules/auslandsvorhaben.js';
import { werteZeitraumAus, zeitraumUngueltig, zeitraumNoetig } from '../assets/js/rules/zeitraum.js';
import { bestimmeGebiet } from '../assets/js/geo/gebiet.js';

const ORTE = {
  bonn: ['DE', 50.73, 7.1],
  leysin: ['CH', 46.34, 7.01],
  madrid: ['ES', 40.42, -3.7],
  tokio: ['JP', 35.68, 139.69],
  boston: ['US', 42.36, -71.06],
  toronto: ['CA', 43.65, -79.38],
  paris: ['FR', 48.85, 2.35],
  sydney: ['AU', -33.87, 151.21],
};

function rechne(start, ziel, { von, bis, landweg = true, bahnUeber12h = false } = {}) {
  const s = bestimmeGebiet(...ORTE[start]);
  const z = bestimmeGebiet(...ORTE[ziel]);
  return berechneAuslandsvorhaben({
    satz: z.satz,
    zielRegion: z.region,
    startRegion: s.region,
    zielKontinent: z.kontinent,
    startKontinent: s.kontinent,
    startCode: s.code,
    zielCode: z.code,
    landweg,
    zeitraum: werteZeitraumAus(von, bis),
    bahnUeber12h,
  });
}

test('Zeitraum: An- und Abreisetag zählen mit', () => {
  assert.equal(werteZeitraumAus('2026-07-01', '2026-07-08').tage, 8);
  assert.equal(werteZeitraumAus('2026-07-01', '2026-07-01').tage, 1);
  assert.equal(werteZeitraumAus('2026-07-08', '2026-07-01'), null);
  assert.equal(werteZeitraumAus('2026-02-30', '2026-03-05'), null);
  assert.equal(zeitraumUngueltig('2026-07-08', '2026-07-01'), true);
  assert.equal(zeitraumUngueltig('', '2026-07-01'), false);
});

test('Zeitraum wird nur gebraucht, wenn er die Berechnung beeinflusst', () => {
  const v = (extra) => zeitraumNoetig({ anlass: 'veranstaltung', bahnUeber12h: false, ...extra });
  assert.equal(zeitraumNoetig({ anlass: 'ausland', ausland: null, routenArt: null, bahnUeber12h: false }), true);
  assert.equal(v({ ausland: null, routenArt: null }), false);
  assert.equal(v({ ausland: false, routenArt: 'strasse', bahnUeber12h: true }), false);
  assert.equal(v({ ausland: true, routenArt: 'strasse' }), false);
  assert.equal(v({ ausland: true, routenArt: 'strasse', bahnUeber12h: true }), true);
  // No road connection: flying is the only option
  assert.equal(v({ ausland: true, routenArt: 'keine' }), true);
  // Route not calculated yet (null) or routing failed
  assert.equal(v({ ausland: true, routenArt: null, bahnUeber12h: true }), false);
  assert.equal(v({ ausland: true, routenArt: 'fehler', bahnUeber12h: true }), false);
});

test('Zeitraum: mehr als ein Jahr', () => {
  assert.equal(werteZeitraumAus('2026-09-01', '2027-08-31').mehrAlsEinJahr, false);
  assert.equal(werteZeitraumAus('2026-09-01', '2027-09-01').mehrAlsEinJahr, true);
});

test('Schweiz mit der Bahn: voller DAAD-Satz 309 Euro', () => {
  const r = rechne('bonn', 'leysin', { von: '2026-08-01', bis: '2026-08-21' });
  assert.equal(r.europa, true);
  assert.equal(r.auszahlung, 'gesamt');
  assert.equal(r.land.betrag, 309);
  assert.equal(r.unterAchtWochen, true);
});

test('Spanien mit dem Flugzeug: 100/80 Euro ab 8 Tagen und Bahn über 12 h', () => {
  const ok = rechne('bonn', 'madrid', { von: '2026-07-01', bis: '2026-07-10', bahnUeber12h: true });
  assert.equal(ok.flug.art, 'europa');
  assert.equal(ok.flug.status, 'moeglich');
  assert.equal(ok.flug.mitKompensation, 100);
  assert.equal(ok.flug.ohneKompensation, 80);
  assert.equal(ok.land.betrag, 309);
});

test('Spanien mit dem Flugzeug: Bahn unter 12 h, kein Zuschuss', () => {
  const r = rechne('bonn', 'madrid', { von: '2026-07-01', bis: '2026-07-10', bahnUeber12h: false });
  assert.equal(r.flug.status, 'bahn-unter-12h');
  assert.equal(r.flug.mitKompensation, 0);
});

test('Spanien mit dem Flugzeug unter 8 Tagen: keine Auslandsförderung', () => {
  const r = rechne('bonn', 'madrid', { von: '2026-07-01', bis: '2026-07-07', bahnUeber12h: true });
  assert.equal(r.flug.tage, 7);
  assert.equal(r.flug.status, 'keine-foerderung');
  assert.equal(r.flug.mitKompensation, 0);
});

test('Japan mit dem Flugzeug, 20 Tage: unter Mindestdauer von 22 Tagen', () => {
  const r = rechne('bonn', 'tokio', { von: '2026-03-01', bis: '2026-03-20', landweg: false });
  assert.equal(r.flug.art, 'interkontinental');
  assert.equal(r.flug.mindestTage, 22);
  assert.equal(r.flug.status, 'keine-foerderung');
  assert.equal(r.flug.voll, 0);
});

test('Japan mit dem Flugzeug, 30 Tage: 1.735 Euro nachhaltig, sonst 867,50 Euro', () => {
  const r = rechne('bonn', 'tokio', { von: '2026-03-01', bis: '2026-03-30', landweg: false });
  assert.equal(r.flug.status, 'moeglich');
  assert.equal(r.flug.voll, 1735);
  assert.equal(r.flug.reduziert, 867.5);
  assert.equal(r.land.verfuegbar, false);
});

test('Australien: Mindestdauer 36 Tage', () => {
  assert.equal(rechne('bonn', 'sydney', { von: '2026-03-01', bis: '2026-04-04', landweg: false }).flug.status, 'keine-foerderung');
  assert.equal(rechne('bonn', 'sydney', { von: '2026-03-01', bis: '2026-04-05', landweg: false }).flug.status, 'moeglich');
});

test('USA länger als ein Jahr: Hinreise 594 und Rückreise 594 Euro getrennt', () => {
  const r = rechne('bonn', 'boston', { von: '2026-09-01', bis: '2027-12-31', landweg: false });
  assert.equal(r.auszahlung, 'getrennt');
  assert.deepEqual(r.flug.teileVoll, [
    { art: 'hinreise', betrag: 594 },
    { art: 'rueckreise', betrag: 594 },
  ]);
  assert.equal(r.flug.voll, 1188);
  assert.equal(r.flug.reduziert, 594);
});

test('Toronto nach Boston: gleicher außereuropäischer Kontinent, nur Hinreise', () => {
  const r = rechne('toronto', 'boston', { von: '2026-09-01', bis: '2026-12-20' });
  assert.equal(r.auszahlung, 'nur-hinreise');
  assert.equal(r.land.betrag, 594);
  assert.equal(r.flug.voll, 594);
  assert.equal(r.flug.mindestTage, 15);
});

test('Europa länger als ein Jahr mit Flug: 100/80 Euro je zur Hälfte', () => {
  const r = rechne('bonn', 'madrid', { von: '2026-09-01', bis: '2027-09-30', bahnUeber12h: true });
  assert.equal(r.auszahlung, 'getrennt');
  assert.equal(r.flug.mitKompensation, 100);
  assert.deepEqual(r.flug.teileOhne.map((t) => t.betrag), [40, 40]);
  assert.equal(r.land.betrag, 310);
});

test('Ohne Zeitraum: Flug unter Vorbehalt der Mindestdauer', () => {
  const r = rechne('bonn', 'tokio', { landweg: false });
  assert.equal(r.flug.status, 'dauer-unbekannt');
  assert.equal(r.flug.voll, 1735);
  assert.equal(r.unterAchtWochen, false);
});

test('Höchster Zuschuss: Landweg oder Flug, je nachdem was gezahlt wird', () => {
  assert.equal(rechne('bonn', 'leysin', { von: '2026-08-01', bis: '2026-08-21' }).hoechsterZuschuss, 309);
  assert.equal(rechne('bonn', 'tokio', { von: '2026-03-01', bis: '2026-03-30', landweg: false }).hoechsterZuschuss, 1735);
  assert.equal(rechne('bonn', 'tokio', { von: '2026-03-01', bis: '2026-03-20', landweg: false }).hoechsterZuschuss, 0);
});

test('Studienort außerhalb Europas, Ziel in Europa: Flug gilt als interkontinental', () => {
  const r = rechne('boston', 'paris', { von: '2026-06-01', bis: '2026-06-20', landweg: false });
  assert.equal(r.europa, false);
  assert.equal(r.flug.art, 'interkontinental');
  assert.equal(r.flug.mindestTage, 8);
  assert.equal(r.flug.voll, 309);
});
