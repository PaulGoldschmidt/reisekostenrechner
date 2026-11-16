// Prüft Texte und Pflichtangaben der Seite.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { BASIS as CLIPPY_BASIS } from '../assets/js/ui/clippy.js';

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
  ...dateien(join(wurzel, 'scripts')),
  ...dateien(join(wurzel, 'tests')).filter((p) => p.endsWith('.js')),
];

// Gedankenstriche und Mittelpunkte sollen nirgends vorkommen.
const VERBOTEN = {
  '\u2014': 'Geviertstrich',
  '\u2013': 'Halbgeviertstrich',
  '\u00B7': 'Mittelpunkt',
  '\u2022': 'Aufzählungspunkt',
  '\u22C5': 'Multiplikationspunkt',
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
    'Keine Verbindung zur Studienstiftung',
    'ohne Gewähr',
    'Stand: Mitte November 2026',
    'https://github.com/PaulGoldschmidt/reisekostenrechner',
    'https://paul-goldschmidt.de/imprint/',
    'https://paul-goldschmidt.de/privacy',
    // Pflicht laut Nutzungsbedingungen von Transitous
    'https://transitous.org/sources/',
    'OpenStreetMap',
  ]) {
    assert.ok(html.includes(teil), `fehlt: ${teil}`);
  }
});

test('Import-Map enthält Prüfsummen für genau die Clippy-Dateien, die clippy.js lädt', () => {
  const html = readFileSync(join(wurzel, 'index.html'), 'utf8');
  const karte = JSON.parse(/<script type="importmap">([\s\S]*?)<\/script>/.exec(html)[1]);
  const erwartet = ['index.mjs', 'agents/clippy/agent.mjs', 'agents/clippy/map.mjs'].map((d) => CLIPPY_BASIS + d);
  assert.deepEqual(Object.keys(karte.integrity).sort(), erwartet.sort());
  for (const pruefsumme of Object.values(karte.integrity)) assert.match(pruefsumme, /^sha384-[A-Za-z0-9+/]{64}$/);
});

test('Alle Skripte der Seite sind syntaktisch gültig', () => {
  // Fängt Fehler in Dateien ab, die nur im Browser laufen und sonst nicht getestet werden
  for (const pfad of eigeneDateien.filter((p) => p.endsWith('.js'))) {
    const ergebnis = spawnSync(process.execPath, ['--check', pfad], { encoding: 'utf8' });
    assert.equal(ergebnis.status, 0, `${relative(wurzel, pfad)}: ${ergebnis.stderr}`);
  }
});
