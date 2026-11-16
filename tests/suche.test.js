import { test } from 'node:test';
import assert from 'node:assert/strict';
import { istAdresse, ortAusPhoton, adresseAusPhoton } from '../assets/js/geo/suche.js';

test('Adressen werden an Hausnummer oder Straßenwort erkannt', () => {
  assert.equal(istAdresse('Jägerstraße 22, Berlin'), true);
  assert.equal(istAdresse('Jägerstraße'), true);
  assert.equal(istAdresse('Edmund-Siemers-Allee'), true);
  assert.equal(istAdresse('Berliner Tor 21'), true);
  assert.equal(istAdresse('Leipzig'), false);
  assert.equal(istAdresse('Frankfurt am Main'), false);
});

test('Ort aus Photon', () => {
  const v = ortAusPhoton({ name: 'Hattingen', state: 'Nordrhein-Westfalen', country: 'Deutschland', countrycode: 'de', osm_value: 'town' }, 7.18, 51.4);
  assert.equal(v.label, 'Hattingen, Nordrhein-Westfalen, Deutschland');
  assert.equal(v.zusatz, 'Nordrhein-Westfalen, Deutschland');
  assert.equal(v.land, 'DE');
  assert.equal(ortAusPhoton({ name: 'Hamburg', countrycode: 'DE', osm_value: 'administrative' }, 0, 0), null);
});

test('Adresse aus Photon mit Postleitzahl, ohne Gebäudenamen', () => {
  const v = adresseAusPhoton({ type: 'house', name: 'ESA: Flügel Ost', street: 'Edmund-Siemers-Allee', housenumber: '1', postcode: '20146', city: 'Hamburg', countrycode: 'DE', country: 'Deutschland' }, 9.98, 53.56);
  assert.equal(v.titel, 'Edmund-Siemers-Allee 1');
  assert.equal(v.label, 'Edmund-Siemers-Allee 1, 20146 Hamburg');
  assert.equal(v.art, 'adresse');
});

test('Straße ohne Hausnummer und Adresse im Ausland', () => {
  const s = adresseAusPhoton({ type: 'street', name: 'Jägerstraße', postcode: '10117', city: 'Berlin', countrycode: 'DE' }, 13.39, 52.51);
  assert.equal(s.label, 'Jägerstraße, 10117 Berlin');
  const a = adresseAusPhoton({ type: 'house', street: 'Rämistrasse', housenumber: '101', postcode: '8092', city: 'Zürich', countrycode: 'CH', country: 'Schweiz' }, 8.55, 47.38);
  assert.equal(a.label, 'Rämistrasse 101, 8092 Zürich, Schweiz');
  assert.equal(a.land, 'CH');
});
