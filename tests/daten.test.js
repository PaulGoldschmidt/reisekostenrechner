import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAENDER, WEITERE_GEBIETE } from '../assets/js/data/laender.js';
import { REGIONEN, KONTINENTE } from '../assets/js/data/regionen.js';
import { bestimmeGebiet } from '../assets/js/geo/gebiet.js';

test('DAAD-Liste: 194 Länder (198 Zeilen, 4 Länder mit zwei Teilgebieten)', () => {
  assert.equal(Object.keys(LAENDER).length, 194);
});

test('Jeder Eintrag hat gültige Region, Kontinent und plausible Sätze', () => {
  for (const [code, l] of Object.entries(LAENDER)) {
    assert.match(code, /^[A-Z]{2}$/, code);
    assert.ok(REGIONEN[l.region], `${code}: Region ${l.region}`);
    assert.ok(KONTINENTE[l.kontinent], `${code}: Kontinent ${l.kontinent}`);
    assert.ok([211, 309, 395, 580, 1188, 1735].includes(l.hinRueck), `${code}: ${l.hinRueck}`);
    assert.equal(l.einfach, Math.round(l.hinRueck / 2), `${code}: einfach`);
  }
  for (const [code, g] of Object.entries(WEITERE_GEBIETE)) {
    assert.ok(!LAENDER[code], `${code} doppelt`);
    assert.ok(REGIONEN[g.region], `${code}: Region ${g.region}`);
    assert.ok(KONTINENTE[g.kontinent], `${code}: Kontinent ${g.kontinent}`);
  }
});

test('Stichproben aus der DAAD-Liste', () => {
  const s = (c) => [LAENDER[c].hinRueck, LAENDER[c].einfach];
  assert.deepEqual(s('AF'), [1188, 594]);
  assert.deepEqual(s('DK'), [211, 106]);
  assert.deepEqual(s('CZ'), [211, 106]);
  assert.deepEqual(s('CH'), [309, 155]);
  assert.deepEqual(s('PT'), [395, 198]);
  assert.deepEqual(s('AZ'), [580, 290]);
  assert.deepEqual(s('JP'), [1735, 868]);
  assert.deepEqual(s('US'), [1188, 594]);
  assert.deepEqual(s('ZA'), [1735, 868]);
  assert.deepEqual(s('CY'), [395, 198]);
});

test('Gebiet: Deutschland ist Inland ohne DAAD-Satz', () => {
  const g = bestimmeGebiet('de', 50.73, 7.1);
  assert.equal(g.inland, true);
  assert.equal(g.satz, null);
  assert.equal(g.region, 'EU');
});

test('Gebiet: französische Überseegebiete und Sonderverwaltungszonen', () => {
  assert.equal(bestimmeGebiet('FR', -20.88, 55.45).code, 'RE');
  assert.equal(bestimmeGebiet('FR', 16.24, -61.53).code, 'GP');
  assert.equal(bestimmeGebiet('FR', -17.54, -149.57).code, 'PF');
  assert.equal(bestimmeGebiet('FR', 48.85, 2.35).code, 'FR');
  assert.equal(bestimmeGebiet('FR', 42.0, 9.0).code, 'FR');
  assert.equal(bestimmeGebiet('CN', 22.3, 114.17).code, 'HK');
  assert.equal(bestimmeGebiet('CN', 39.9, 116.4).code, 'CN');
});

test('Gebiet: Russland wird am Ural geteilt', () => {
  assert.equal(bestimmeGebiet('RU', 55.75, 37.62).region, 'EU');
  const sib = bestimmeGebiet('RU', 55.03, 82.92);
  assert.equal(sib.region, 'ZSA');
  assert.equal(sib.kontinent, 'AS');
  assert.equal(sib.satz.hinRueck, 309);
});

test('Gebiet: unbekannter Code liefert keinen Satz und keine Region', () => {
  const g = bestimmeGebiet('ZZ', 0, 0);
  assert.equal(g.satz, null);
  assert.equal(g.region, null);
});
