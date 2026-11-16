import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bereinige, ohneDoppelteTeile, ohneUntereinheiten } from '../scripts/hochschulen.mjs';

test('Namen ohne Gedankenstriche und Mittelpunkte', () => {
  assert.equal(bereinige('HFH \u00B7 Hamburger Fern-Hochschule'), 'HFH Hamburger Fern-Hochschule');
  assert.equal(
    bereinige('MSH Medical School Hamburg \u2013 Fachhochschule für Gesundheit und Medizin'),
    'MSH Medical School Hamburg, Fachhochschule für Gesundheit und Medizin',
  );
  assert.equal(bereinige('  Universität   Bonn '), 'Universität Bonn');
});

test('Doppelte Teile einer Anschrift werden entfernt', () => {
  assert.equal(ohneDoppelteTeile('Grabengasse 1, 69117 Heidelberg, Heidelberg'), 'Grabengasse 1, 69117 Heidelberg');
  assert.equal(ohneDoppelteTeile('Hermannswerder 7, 14473 Potsdam, 14473 Potsdam'), 'Hermannswerder 7, 14473 Potsdam');
  assert.equal(ohneDoppelteTeile('Berliner Straße 5, 10115 Berlin'), 'Berliner Straße 5, 10115 Berlin');
  assert.equal(ohneDoppelteTeile('Karlsruhe'), 'Karlsruhe');
});

test('Untereinheiten werden entfernt, HRK-Mitglieder bleiben', () => {
  const liste = [
    { name: 'Universität Leipzig', hrk: true },
    { name: 'Universität Leipzig, Klinik für Vögel und Reptilien', hrk: false },
    { name: 'Universität Leipzig - Didaktik der Physik', hrk: false },
    { name: 'Karlsruher Institut für Technologie', hrk: true },
    { name: 'Institut für Kulturmanagement', hrk: false },
    { name: 'Hochschule Bremen', hrk: true },
    { name: 'Hochschule Bremerhaven', hrk: true },
  ];
  assert.deepEqual(
    ohneUntereinheiten(liste).map((h) => h.name),
    ['Universität Leipzig', 'Karlsruher Institut für Technologie', 'Hochschule Bremen', 'Hochschule Bremerhaven'],
  );
});
