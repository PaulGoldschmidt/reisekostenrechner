// Prüft Texte und Pflichtangaben der Seite.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const wurzel = fileURLToPath(new URL('..', import.meta.url));

function dateien(ordner) {
  return readdirSync(ordner).flatMap((name) => {
    const pfad = join(ordner, name);
    if (statSync(pfad).isDirectory()) return name === 'vendor' ? [] : dateien(pfad);
    return [pfad];
  });
}

const eigeneDateien = [
  join(wurzel, 'index.html'),
  join(wurzel, 'README.md'),
  ...dateien(join(wurzel, 'assets')).filter((p) => /\.(js|css|svg|html)$/.test(p)),
];

// Gedankenstriche und Mittelpunkte sollen nirgends vorkommen.
const VERBOTEN = {
  '—': 'Geviertstrich',
  '–': 'Halbgeviertstrich',
  '·': 'Mittelpunkt',
  '•': 'Aufzählungspunkt',
  '⋅': 'Multiplikationspunkt',
};

test('Keine Gedankenstriche oder Mittelpunkte in eigenen Dateien', () => {
  for (const pfad of eigeneDateien) {
    const text = readFileSync(pfad, 'utf8');
    for (const [zeichen, name] of Object.entries(VERBOTEN)) {
      const zeile = text.split('\n').findIndex((z) => z.includes(zeichen));
      assert.equal(zeile, -1, `${name} in ${relative(wurzel, pfad)}:${zeile + 1}`);
    }
  }
});

test('Pflichtangaben auf der Seite', () => {
  const html = readFileSync(join(wurzel, 'index.html'), 'utf8');
  for (const teil of [
    'Kein offizielles Angebot',
    'keiner Verbindung zur Studienstiftung',
    'ohne Gewähr',
    'Stand: Mitte November 2026',
    'Paul Goldschmidt',
    'https://github.com/PaulGoldschmidt/reisekostenrechner',
    'https://paul-goldschmidt.de/imprint/',
    'https://paul-goldschmidt.de/privacy',
    'OpenStreetMap',
  ]) {
    assert.ok(html.includes(teil), `fehlt: ${teil}`);
  }
});
