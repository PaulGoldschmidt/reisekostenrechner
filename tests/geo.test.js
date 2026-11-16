import { test } from 'node:test';
import assert from 'node:assert/strict';
import { luftlinieKm, grosskreis, dekodierePolyline6, duenneAus } from '../assets/js/geo/route.js';

test('Linie ausdünnen behält Anfang und Ende', () => {
  const linie = Array.from({ length: 10001 }, (_, i) => [i, i]);
  const kurz = duenneAus(linie, 100);
  assert.equal(kurz.length, 100);
  assert.deepEqual(kurz[0], [0, 0]);
  assert.deepEqual(kurz[99], [10000, 10000]);
  assert.equal(duenneAus(linie.slice(0, 50), 100).length, 50);
});

test('Luftlinie Frankfurt nach Berkeley liegt nahe den 9.114 km aus dem Merkblatt', () => {
  const km = luftlinieKm({ lat: 50.1106, lon: 8.6821 }, { lat: 37.8708, lon: -122.2729 });
  assert.ok(Math.abs(km - 9114) < 60, `${km}`);
});

test('Großkreis beginnt und endet an den Orten und springt nicht an der Datumsgrenze', () => {
  const a = { lat: 35.68, lon: 139.69 };
  const b = { lat: 37.77, lon: -122.42 };
  const p = grosskreis(a, b, 50);
  assert.equal(p.length, 51);
  assert.ok(Math.abs(p[0][0] - a.lon) < 1e-6 && Math.abs(p[0][1] - a.lat) < 1e-6);
  assert.ok(Math.abs(p[50][1] - b.lat) < 1e-6);
  // The end point continues past 180 degrees instead of jumping to -180
  assert.ok(Math.abs(p[50][0] - (b.lon + 360)) < 1e-6);
  for (let i = 1; i < p.length; i++) assert.ok(Math.abs(p[i][0] - p[i - 1][0]) < 180);
});

test('Polyline6 dekodieren', () => {
  // Example from the Valhalla documentation
  const punkte = dekodierePolyline6('_izlhA~rlgdF_{geC~ywl@_kwzCn`{nI');
  assert.deepEqual(punkte, [
    [-120.2, 38.5],
    [-120.95, 40.7],
    [-126.453, 43.252],
  ]);
});
