// Clippy weist darauf hin, dass statt eines Ortes auch die genaue Adresse möglich ist.
//
// Nur auf dem Desktop, nur einmal pro Besuch und nicht bei reduzierter Bewegung.
// Bibliothek und Figur werden erst bei Bedarf von jsDelivr geladen (clippyjs, MIT, ohne
// weitere Abhängigkeiten). Die Prüfsummen stehen in der Import-Map in index.html.
// Clippy, der Name und alle Grafiken gehören Microsoft.

import { istDesktop, mitMaus, reduzierteBewegung } from './medien.js';

// Version und Prüfsummen müssen zur Import-Map in index.html passen (siehe tests/seite.test.js)
export const BASIS = 'https://cdn.jsdelivr.net/npm/clippyjs@0.1.0/dist/';
const SCHLUESSEL = 'reisekostenrechner:clippy';
const SICHTBAR_MS = 14000;
// Größe eines Einzelbilds von Clippy in Pixeln
const BREITE = 124;
const HOEHE = 93;
// So weit ragt Clippy von oben rechts in das Eingabefeld hinein
const UEBERLAPPUNG = { x: 20, y: 26 };
// Wird so weit gescrollt, hat sich Clippy vom Feld gelöst und verschwindet
const MAX_SCROLL_PX = 80;
const TEXT =
  'Es sieht so aus, als hättest du nur einen Ort eingegeben. ' +
  'Mit der genauen Adresse, etwa „Jägerstraße 22, Berlin“, wird die Berechnung genauer.';

let agent = null;
let gestartet = false;
// Wird während des Ladens auf false gesetzt, wenn Clippy doch nicht mehr erscheinen soll
let erwuenscht = false;
let beiScroll = null;

function schonGezeigt() {
  try {
    return sessionStorage.getItem(SCHLUESSEL) === '1';
  } catch {
    return false;
  }
}

function merkeGezeigt() {
  try {
    sessionStorage.setItem(SCHLUESSEL, '1');
  } catch {
    // ohne Speicher erscheint Clippy höchstens einmal pro Seitenaufruf
  }
}

/**
 * Zeigt Clippy am Eingabefeld mit dem Hinweis auf die genaue Adresse.
 * @param {HTMLElement} feld Eingabefeld des Veranstaltungsorts
 */
export async function zeigeAdressTipp(feld) {
  if (gestartet || schonGezeigt() || !istDesktop() || !mitMaus() || reduzierteBewegung()) return;
  gestartet = true;
  erwuenscht = true;
  merkeGezeigt();

  let geladen;
  try {
    // Alle drei Dateien gleichzeitig anfordern statt nacheinander
    const [bibliothek, daten, karte] = [
      import(`${BASIS}index.mjs`),
      import(`${BASIS}agents/clippy/agent.mjs`),
      import(`${BASIS}agents/clippy/map.mjs`),
    ];
    const { initAgent } = await bibliothek;
    geladen = await initAgent({
      agent: () => daten,
      map: () => karte,
      // stumm: keine Töne laden und abspielen
      sound: async () => ({ default: {} }),
    });
  } catch {
    // CDN nicht erreichbar oder Prüfsumme falsch: dann eben ohne Clippy
    return;
  }
  if (!erwuenscht) {
    geladen.dispose();
    return;
  }
  agent = geladen;

  // Oben rechts auf dem Feld sitzend, leicht überlappend und noch in der linken Spalte.
  // Clippy ist fest im Fenster positioniert, deshalb verschwindet er beim Scrollen.
  const r = feld.getBoundingClientRect();
  agent.moveTo(r.right - BREITE + UEBERLAPPUNG.x, Math.max(8, r.top - HOEHE + UEBERLAPPUNG.y), 0);
  const startY = window.scrollY;
  beiScroll = () => Math.abs(window.scrollY - startY) > MAX_SCROLL_PX && versteckeClippy();
  window.addEventListener('scroll', beiScroll, { passive: true });
  agent.show();
  if (agent.hasAnimation('GetAttention')) agent.play('GetAttention');
  agent.speak(TEXT);
  window.setTimeout(versteckeClippy, SICHTBAR_MS);
}

/** Lässt Clippy verschwinden, etwa wenn das Feld erneut bearbeitet wird. */
export function versteckeClippy() {
  erwuenscht = false;
  if (beiScroll) window.removeEventListener('scroll', beiScroll);
  beiScroll = null;
  if (!agent) return;
  const a = agent;
  agent = null;
  a.hide(false, () => a.dispose());
}
