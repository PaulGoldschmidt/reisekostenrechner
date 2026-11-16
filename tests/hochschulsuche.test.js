import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bereiteVor, sucheHochschulen, alsVorschlag } from '../assets/js/geo/hochschulsuche.js';

// Kleines, festes Verzeichnis, damit die Tests nicht vom erzeugten Datensatz abhängen
const LISTE = [
  { name: 'Universität Hamburg', kurz: 'UHH', aliase: ['Uni Hamburg'], orte: ['Hamburg'], anschrift: 'Edmund-Siemers-Allee 1, 20146 Hamburg', lat: 53.563, lon: 9.988, hrk: true, studierende: 43957 },
  { name: 'Hochschule für Angewandte Wissenschaften Hamburg', kurz: null, aliase: ['HAW Hamburg'], orte: ['Hamburg'], anschrift: 'Alexanderstraße 1, 20099 Hamburg', lat: 53.555, lon: 10.018, hrk: true, studierende: 17125 },
  { name: 'HFH Hamburger Fern-Hochschule', kurz: null, aliase: [], orte: ['Hamburg'], anschrift: 'Hamburg', lat: 53.55, lon: 10.0, hrk: false, studierende: 10000 },
  { name: 'Technische Universität München', kurz: 'TUM', aliase: ['TU München', 'TH München'], orte: ['München'], anschrift: 'Arcisstraße 21, 80333 München', lat: 48.149, lon: 11.567, hrk: true, studierende: 44000 },
  { name: 'Ludwig-Maximilians-Universität München', kurz: 'LMU', aliase: ['LMU München'], orte: ['München'], anschrift: '80539 München', lat: 48.151, lon: 11.58, hrk: true, studierende: 52418 },
  { name: 'Rheinische Friedrich-Wilhelms-Universität Bonn', kurz: null, aliase: ['Uni Bonn', 'Universität Bonn'], orte: ['Bonn'], anschrift: '53113 Bonn', lat: 50.734, lon: 7.102, hrk: true, studierende: 38043 },
  { name: 'Hochschule Bonn-Rhein-Sieg', kurz: 'H-BRS', aliase: [], orte: ['Sankt Augustin'], anschrift: 'Grantham-Allee 20, 53757 Sankt Augustin', lat: 50.78, lon: 7.18, hrk: true, studierende: 9000 },
];
const V = bereiteVor(LISTE);
const namen = (q, max) => sucheHochschulen(V, q, max).map((h) => h.name);

test('Ort findet die Hochschulen der Stadt, große HRK-Mitglieder zuerst', () => {
  assert.deepEqual(namen('Hamburg'), [
    'Universität Hamburg',
    'Hochschule für Angewandte Wissenschaften Hamburg',
    'HFH Hamburger Fern-Hochschule',
  ]);
  assert.deepEqual(namen('münch').slice(0, 2), ['Ludwig-Maximilians-Universität München', 'Technische Universität München']);
});

test('Kurznamen und Aliase', () => {
  assert.equal(namen('TUM')[0], 'Technische Universität München');
  assert.equal(namen('lmu')[0], 'Ludwig-Maximilians-Universität München');
  assert.equal(namen('HAW')[0], 'Hochschule für Angewandte Wissenschaften Hamburg');
  assert.equal(namen('HAW Hamburg')[0], 'Hochschule für Angewandte Wissenschaften Hamburg');
});

test('Mehrere Wörter müssen alle passen', () => {
  assert.deepEqual(namen('Uni Bonn'), ['Rheinische Friedrich-Wilhelms-Universität Bonn']);
  assert.deepEqual(namen('Bonn').sort(), ['Hochschule Bonn-Rhein-Sieg', 'Rheinische Friedrich-Wilhelms-Universität Bonn'].sort());
  assert.equal(namen('Bonn')[0], 'Rheinische Friedrich-Wilhelms-Universität Bonn');
});

test('Zu kurze oder unpassende Eingaben liefern nichts', () => {
  assert.deepEqual(namen('H'), []);
  assert.deepEqual(namen('Leysin'), []);
});

test('Höchstzahl der Treffer', () => {
  assert.equal(namen('Hamburg', 2).length, 2);
});

test('Vorschlag nutzt Kurznamen für die Anzeige der Strecke', () => {
  const v = alsVorschlag(LISTE[3]);
  assert.equal(v.name, 'TUM');
  assert.equal(v.titel, 'Technische Universität München');
  assert.equal(v.label, 'Technische Universität München, Arcisstraße 21, 80333 München');
  assert.equal(v.land, 'DE');
});
