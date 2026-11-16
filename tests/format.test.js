import { test } from 'node:test';
import assert from 'node:assert/strict';
import { euro, km, buechergeld, tage, tagen } from '../assets/js/ui/format.js';

// Intl trennt Zahl und Währung mit einem geschützten Leerzeichen
const ohneNbsp = (t) => t.replace(/\u00A0/g, ' ');

test('Beträge und Kilometer', () => {
  assert.equal(ohneNbsp(euro(80)), '80 €');
  assert.equal(ohneNbsp(euro(1735)), '1.735 €');
  assert.equal(km(1273.4), '1.273 km');
});

test('Beträge werden auf volle Euro gerundet, ab 50 Cent aufwärts', () => {
  assert.equal(ohneNbsp(euro(20.4)), '20 €');
  assert.equal(ohneNbsp(euro(254.8)), '255 €');
  assert.equal(ohneNbsp(euro(198.25)), '198 €');
  assert.equal(ohneNbsp(euro(867.5)), '868 €');
  assert.equal(ohneNbsp(euro(56.2)), '56 €');
});

test('Büchergeld: wie oft 300 Euro in den angezeigten Betrag passen, eine Nachkommastelle', () => {
  assert.equal(buechergeld(56.2), 'Das sind 0,2-mal Büchergeld');
  assert.equal(buechergeld(300), 'Das sind 1-mal Büchergeld');
  assert.equal(buechergeld(1735), 'Das sind 5,8-mal Büchergeld');
  assert.equal(buechergeld(867.5), 'Das sind 2,9-mal Büchergeld');
  assert.equal(buechergeld(900), 'Das sind 3-mal Büchergeld');
  assert.equal(buechergeld(0), 'Das sind 0-mal Büchergeld');
});

test('Tage im Nominativ und Dativ', () => {
  assert.equal(tage(1), '1 Tag');
  assert.equal(tage(8), '8 Tage');
  assert.equal(tagen(8), '8 Tagen');
});
