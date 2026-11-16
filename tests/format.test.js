import { test } from 'node:test';
import assert from 'node:assert/strict';
import { euro, km, buechergeld, tage, tagen } from '../assets/js/ui/format.js';

// Intl trennt Zahl und Währung mit einem geschützten Leerzeichen
const ohneNbsp = (t) => t.replace(/ /g, ' ');

test('Beträge und Kilometer', () => {
  assert.equal(ohneNbsp(euro(80)), '80 €');
  assert.equal(ohneNbsp(euro(20.4)), '20,40 €');
  assert.equal(ohneNbsp(euro(1735)), '1.735 €');
  assert.equal(km(1273.4), '1.273 km');
});

test('Büchergeld: wie oft 300 Euro in den Betrag passen', () => {
  assert.equal(buechergeld(56.2), 'Das sind 0,19-mal Büchergeld');
  assert.equal(buechergeld(300), 'Das sind 1-mal Büchergeld');
  assert.equal(buechergeld(1735), 'Das sind 5,78-mal Büchergeld');
  assert.equal(buechergeld(900), 'Das sind 3-mal Büchergeld');
  assert.equal(buechergeld(0), 'Das sind 0-mal Büchergeld');
});

test('Tage im Nominativ und Dativ', () => {
  assert.equal(tage(1), '1 Tag');
  assert.equal(tage(8), '8 Tage');
  assert.equal(tagen(8), '8 Tagen');
});
