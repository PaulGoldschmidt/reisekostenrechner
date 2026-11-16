// The travel examples from the Studienstiftung Merkblatt (as of December 2025) as test cases.
// The distances are taken directly from the Merkblatt.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { berechneVeranstaltung, autoSatzProKm } from '../assets/js/rules/veranstaltung.js';

const inland = (kmEinfach, extra = {}) =>
  berechneVeranstaltung({ kmEinfach, ausland: false, innereuropaeisch: true, landweg: true, ...extra });

const ausland = (kmEinfach, extra = {}) =>
  berechneVeranstaltung({ kmEinfach, ausland: true, innereuropaeisch: true, landweg: true, ...extra });

test('Autosatz pro km je nach Mitfahrenden', () => {
  assert.equal(autoSatzProKm(0), 0.05);
  assert.equal(autoSatzProKm(1), 0.1);
  assert.equal(autoSatzProKm(2), 0.125);
  assert.equal(autoSatzProKm(3), 0.15);
  assert.equal(autoSatzProKm(4), 0.175);
});

test('München nach Augsburg (68 km): kein Zuschuss', () => {
  const r = inland(68, { mitfahrende: 2 });
  assert.equal(r.unterMindestdistanz, true);
  assert.equal(r.bahn.betrag, 0);
  assert.equal(r.auto.betrag, 0);
  assert.equal(r.rad.max, 0);
  assert.equal(r.flug.status, 'inland');
});

test('Bonn nach Hattingen (102 km): Bahn 20,40 Euro, Auto allein 10,20 Euro', () => {
  const r = inland(102);
  assert.equal(r.kmGesamt, 204);
  assert.equal(r.bahn.betrag, 20.4);
  assert.equal(r.auto.betrag, 10.2);
  assert.equal(r.bahn.gedeckelt, false);
});

test('Genau 100 km einfach werden bezuschusst, 99 km nicht', () => {
  assert.equal(inland(100).bahn.betrag, 20);
  assert.equal(inland(99.4).bahn.betrag, 0);
  assert.equal(inland(99.6).bahn.betrag, 20);
});

test('München nach Hamburg (792 km): Bahn 80 Euro, Auto mit 2 Mitfahrenden 198 Euro, Flug 0', () => {
  const r = inland(792, { mitfahrende: 2 });
  assert.equal(r.kmGesamt, 1584);
  assert.equal(r.bahn.betrag, 80);
  assert.equal(r.bahn.gedeckelt, true);
  assert.equal(r.auto.betrag, 198);
  assert.equal(r.auto.gedeckelt, false);
  assert.equal(r.flug.status, 'inland');
  assert.equal(r.flug.mitKompensation, 0);
});

test('Inland: Auto ist auf 80 Euro je Person gedeckelt', () => {
  const allein = inland(792);
  assert.equal(allein.auto.betrag, 79.2);
  const lang = inland(900);
  assert.equal(lang.auto.betrag, 80);
  assert.equal(lang.auto.gedeckelt, true);
  const zuZweit = inland(900, { mitfahrende: 1 });
  assert.equal(zuZweit.auto.betrag, 160);
});

test('Leipzig nach Brüssel (680 km): Bahn 136 Euro, Auto mit 1 Mitfahrenden 136 Euro, Flug 0', () => {
  const r = ausland(680, { mitfahrende: 1 });
  assert.equal(r.kmGesamt, 1360);
  assert.equal(r.bahn.betrag, 136);
  assert.equal(r.auto.betrag, 136);
  assert.equal(r.flug.status, 'bahn-unter-12h');
  assert.equal(r.flug.mitKompensation, 0);
});

test('Greifswald nach Leysin (1280 km): Bahn 256, Auto mit 3 Mitfahrenden 384, Flug 80 ab 3 Tagen', () => {
  const r = ausland(1280, { mitfahrende: 3, bahnUeber12h: true, aufenthaltTage: 10 });
  assert.equal(r.kmGesamt, 2560);
  assert.equal(r.bahn.betrag, 256);
  assert.equal(r.auto.betrag, 384);
  assert.equal(r.flug.status, 'moeglich');
  assert.equal(r.flug.mindestTage, 3);
  assert.equal(r.flug.mitKompensation, 80);
  assert.equal(r.flug.ohneKompensation, 70);
});

test('Greifswald nach Leysin: Flug bei zu kurzem Aufenthalt nicht bezuschusst', () => {
  const r = ausland(1280, { bahnUeber12h: true, aufenthaltTage: 2 });
  assert.equal(r.flug.status, 'aufenthalt-zu-kurz');
  assert.equal(r.flug.mitKompensation, 0);
});

test('Greifswald nach Leysin: ohne Zeitraum wird der Flug unter Vorbehalt angezeigt', () => {
  const r = ausland(1280, { bahnUeber12h: true });
  assert.equal(r.flug.status, 'aufenthalt-unbekannt');
  assert.equal(r.flug.mitKompensation, 80);
});

test('Frankfurt nach Berkeley (9114 km): Flug 400 Euro, Aufenthalt mind. 19 Tage', () => {
  const r = berechneVeranstaltung({
    kmEinfach: 9114,
    ausland: true,
    innereuropaeisch: false,
    landweg: false,
    aufenthaltTage: 19,
  });
  assert.equal(r.bahn.verfuegbar, false);
  assert.equal(r.auto.verfuegbar, false);
  assert.equal(r.flug.status, 'moeglich');
  assert.equal(r.flug.mindestTage, 19);
  assert.equal(r.flug.mitKompensation, 400);
  assert.equal(r.flug.ohneKompensation, 375);
  assert.equal(berechneVeranstaltung({ kmEinfach: 9114, ausland: true, innereuropaeisch: false, landweg: false, aufenthaltTage: 18 }).flug.status, 'aufenthalt-zu-kurz');
});

test('Ausland: keine 100-km-Grenze und kein Deckel', () => {
  const kurz = ausland(30);
  assert.equal(kurz.unterMindestdistanz, false);
  assert.equal(kurz.bahn.betrag, 6);
  const lang = ausland(1500);
  assert.equal(lang.bahn.betrag, 300);
  assert.equal(lang.bahn.deckel, null);
});

test('Höchster Zuschuss über alle Verkehrsmittel', () => {
  assert.equal(inland(68).hoechsterZuschuss, 0);
  assert.equal(inland(792, { mitfahrende: 2 }).hoechsterZuschuss, 198);
  assert.equal(ausland(1280, { bahnUeber12h: true }).hoechsterZuschuss, 256);
  assert.equal(
    berechneVeranstaltung({ kmEinfach: 9114, ausland: true, innereuropaeisch: false, landweg: false }).hoechsterZuschuss,
    400,
  );
});

test('Fahrrad: Übernachtungskosten im Inland und im Ausland', () => {
  const i = inland(300);
  assert.equal(i.rad.max, 80);
  assert.equal(i.rad.eineNacht, 50);
  const a = ausland(300);
  assert.equal(a.rad.proNacht, 50);
  assert.equal(a.rad.maxGesamt, 60);
});
