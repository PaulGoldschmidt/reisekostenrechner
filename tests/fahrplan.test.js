import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stichtag, schnellsteAus, ansichtLink } from '../assets/js/geo/fahrplan.js';
import { ausserhalbBahnRaum } from '../assets/js/geo/bahnraum.js';
import { bestimmeGebiet } from '../assets/js/geo/gebiet.js';

test('Stichtag ist ein Mittwoch mindestens zwei Tage voraus, 6 Uhr UTC', () => {
  // Montag 16.11.2026: Mittwoch 18.11. ist genau zwei Tage voraus
  assert.equal(stichtag(new Date('2026-11-16T12:00:00Z')).toISOString(), '2026-11-18T06:00:00.000Z');
  // Dienstag 17.11.: der 18.11. ist zu nah, also der 25.11.
  assert.equal(stichtag(new Date('2026-11-17T12:00:00Z')).toISOString(), '2026-11-25T06:00:00.000Z');
});

test('Schnellste Verbindung ignoriert reine Fußwege', () => {
  const antwort = {
    itineraries: [
      { id: 'lang', duration: 50760, legs: [{ mode: 'WALK' }, { mode: 'HIGHSPEED_RAIL' }, { mode: 'WALK' }] },
      { id: 'schnell', duration: 25560, legs: [{ mode: 'HIGHSPEED_RAIL' }, { mode: 'BUS' }] },
      { id: 'zu-fuss', duration: 3600, legs: [{ mode: 'WALK' }] },
    ],
  };
  assert.deepEqual(schnellsteAus(antwort), { stunden: 7.1, id: 'schnell' });
  assert.equal(schnellsteAus({ itineraries: [] }), null);
  assert.equal(schnellsteAus({}), null);
});

test('Link auf die Verbindung bei Transitous', () => {
  assert.equal(
    ansichtLink('Ab/c+d=', 'Leipzig', 'Brüssel'),
    'https://api.transitous.org/?itineraryId=Ab%2Fc%2Bd%3D&fromName=Leipzig&toName=Br%C3%BCssel',
  );
});

test('Interrail- und Fernbus-Raum', () => {
  const ziel = (code, lat, lon) => ausserhalbBahnRaum(bestimmeGebiet(code, lat, lon), lat, lon);
  assert.equal(ziel('CH', 46.34, 7.01), false);
  assert.equal(ziel('ES', 40.42, -3.7), false);
  assert.equal(ziel('IS', 64.15, -21.94), true);
  assert.equal(ziel('MT', 35.9, 14.51), true);
  assert.equal(ziel('CY', 35.17, 33.36), true);
  assert.equal(ziel('ES', 28.12, -15.43), true); // Gran Canaria
  assert.equal(ziel('PT', 32.65, -16.91), true); // Madeira
  assert.equal(ziel('RU', 55.75, 37.62), true);
  // Außerhalb Europas gilt die Regel nicht
  assert.equal(ziel('JP', 35.68, 139.69), false);
});
