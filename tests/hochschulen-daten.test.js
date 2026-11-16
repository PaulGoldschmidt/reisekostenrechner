// Prüft das erzeugte Hochschulverzeichnis (assets/js/data/hochschulen.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOCHSCHULEN } from '../assets/js/data/hochschulen.js';
import { bereiteVor, sucheHochschulen } from '../assets/js/geo/hochschulsuche.js';

test('Verzeichnis ist vollständig und liegt in Deutschland', () => {
  assert.ok(HOCHSCHULEN.length > 400, `nur ${HOCHSCHULEN.length} Einträge`);
  assert.ok(HOCHSCHULEN.filter((h) => h.hrk).length > 200);
  const ids = new Set();
  for (const h of HOCHSCHULEN) {
    assert.ok(h.name && h.anschrift, h.id);
    assert.ok(h.lat >= 47.2 && h.lat <= 55.1 && h.lon >= 5.8 && h.lon <= 15.1, `${h.name}: ${h.lat},${h.lon}`);
    assert.ok(!ids.has(h.id), `doppelt: ${h.id}`);
    ids.add(h.id);
  }
});

test('Typische Suchen finden die richtige Hochschule', () => {
  const v = bereiteVor(HOCHSCHULEN);
  const erste = (q) => sucheHochschulen(v, q, 4).map((h) => h.name);
  assert.ok(erste('Hamburg').includes('Universität Hamburg'));
  assert.ok(erste('Hamburg').includes('Hochschule für Angewandte Wissenschaften Hamburg'));
  assert.equal(erste('TUM')[0], 'Technische Universität München');
  assert.equal(erste('Uni Bonn')[0], 'Rheinische Friedrich-Wilhelms-Universität Bonn');
  assert.equal(erste('KIT')[0], 'Karlsruher Institut für Technologie');
});
