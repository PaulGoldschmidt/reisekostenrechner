import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { faerbeStil, FARBEN, stadtpunkt } from '../assets/js/ui/kartenstil.js';

// Stand des Stils "dark" von OpenFreeMap im November 2026
const stil = JSON.parse(readFileSync(new URL('./fixtures/openfreemap-dark.json', import.meta.url), 'utf8'));
const ebene = (s, id) => s.layers.find((l) => l.id === id);

test('Kartenstil wird umgefärbt, das Original bleibt unverändert', () => {
  const neu = faerbeStil(stil);
  assert.equal(ebene(neu, 'background').paint['background-color'], FARBEN.land);
  assert.equal(ebene(neu, 'water').paint['fill-color'], FARBEN.wasser);
  assert.equal(ebene(neu, 'highway_motorway_inner').paint['line-color'], FARBEN.autobahn);
  assert.equal(ebene(neu, 'place_city').paint['text-color'], FARBEN.textOrt);
  assert.notEqual(ebene(stil, 'background').paint['background-color'], FARBEN.land);
});

test('Jede Ebene des Stils hat eine eigene Farbe zugewiesen', () => {
  const neu = faerbeStil(stil);
  for (const l of neu.layers) {
    const farben = Object.entries(l.paint || {}).filter(([k]) => k.endsWith('color'));
    for (const [name, wert] of farben) {
      assert.ok(Object.values(FARBEN).includes(wert), `${l.id} ${name}: ${JSON.stringify(wert)}`);
    }
  }
});

test('Flächenmuster ohne Sprite-Bild werden entfernt', () => {
  assert.equal(ebene(stil, 'landcover_wood').paint['fill-pattern'], 'wood-pattern');
  const neu = faerbeStil(stil);
  assert.equal(ebene(neu, 'landcover_wood').paint['fill-pattern'], undefined);
  assert.equal(ebene(neu, 'landcover_wood').paint['fill-color'], FARBEN.wald);
});

test('Städte in normaler Schreibweise, Länder in Versalien', () => {
  const neu = faerbeStil(stil);
  assert.equal(ebene(neu, 'place_city').layout['text-transform'], 'none');
  assert.equal(ebene(neu, 'place_country_major').layout['text-transform'], 'uppercase');
});

test('Stadtpunkt ist ein runder Punkt mit transparentem Rand', () => {
  const p = stadtpunkt(11);
  assert.equal(p.data.length, 11 * 11 * 4);
  const alpha = (x, y) => p.data[(y * 11 + x) * 4 + 3];
  assert.equal(alpha(5, 5), 255);
  assert.equal(alpha(0, 0), 0);
});

test('Ortsnamen auf Deutsch, Autobahnnummern bleiben', () => {
  const neu = faerbeStil(stil);
  assert.deepEqual(ebene(neu, 'place_city').layout['text-field'][1], ['get', 'name:de']);
  assert.deepEqual(ebene(neu, 'highway_name_motorway').layout['text-field'], ['to-string', ['get', 'ref']]);
  assert.equal(ebene(neu, 'road_oneway').layout['text-field'], undefined);
});
