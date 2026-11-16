import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bereinige, ohneUntereinheiten } from '../scripts/hochschulen.mjs';

test('Namen ohne Gedankenstriche und Mittelpunkte', () => {
  assert.equal(bereinige('HFH · Hamburger Fern-Hochschule'), 'HFH Hamburger Fern-Hochschule');
  assert.equal(
    bereinige('MSH Medical School Hamburg – Fachhochschule für Gesundheit und Medizin'),
    'MSH Medical School Hamburg, Fachhochschule für Gesundheit und Medizin',
  );
  assert.equal(bereinige('  Universität   Bonn '), 'Universität Bonn');
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
