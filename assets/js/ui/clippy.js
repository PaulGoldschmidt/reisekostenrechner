// Clippy suggests entering the exact address instead of just a town.
// The clippyjs library (MIT, no dependencies) and the Clippy assets are fetched from jsDelivr
// only when needed; their integrity hashes live in the import map in index.html.
// Clippy, the name and all artwork are owned by Microsoft.

import { istDesktop, mitMaus, reduzierteBewegung } from './medien.js';

// The version must match the import map in index.html (checked by tests/seite.test.js).
export const BASIS = 'https://cdn.jsdelivr.net/npm/clippyjs@0.1.0/dist/';
const SCHLUESSEL = 'reisekostenrechner:clippy';
const SICHTBAR_MS = 14000;
// Size of one Clippy animation frame in px
const BREITE = 124;
const HOEHE = 93;
// How far Clippy overlaps the top right corner of the field, in px (the clear button limits
// how low he goes, see zeigeAdressTipp)
const UEBERLAPPUNG = { x: 20, y: 20 };
// Clippy is fixed to the viewport, so after scrolling this far he no longer sits on the field and hides.
const MAX_SCROLL_PX = 80;
const TEXT =
  'Es sieht so aus, als hättest du nur einen Ort eingegeben. ' +
  'Mit der genauen Adresse, etwa „Jägerstraße 22, Berlin“, wird die Berechnung genauer.';

let agent = null;
let gestartet = false;
// Cleared by versteckeClippy while the scripts are still loading, so a late load gets discarded.
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
    // Without storage, the gestartet flag still limits Clippy to once per page load.
  }
}

export async function zeigeAdressTipp(feld) {
  if (gestartet || schonGezeigt() || !istDesktop() || !mitMaus() || reduzierteBewegung()) return;
  gestartet = true;
  erwuenscht = true;
  merkeGezeigt();

  let geladen;
  try {
    // Start all three imports in parallel instead of awaiting them one after another.
    const [bibliothek, daten, karte] = [
      import(`${BASIS}index.mjs`),
      import(`${BASIS}agents/clippy/agent.mjs`),
      import(`${BASIS}agents/clippy/map.mjs`),
    ];
    const { initAgent } = await bibliothek;
    geladen = await initAgent({
      agent: () => daten,
      map: () => karte,
      // Muted: this stub keeps clippyjs from loading or playing any sounds.
      sound: async () => ({ default: {} }),
    });
  } catch {
    // CDN unreachable or integrity check failed: carry on without Clippy.
    return;
  }
  if (!erwuenscht) {
    geladen.dispose();
    return;
  }
  agent = geladen;

  // Sit on the top right corner of the field, overlapping slightly but staying within the left
  // column. His lower edge stops at the top of the clear button so that button stays clickable.
  const r = feld.getBoundingClientRect();
  const knopf = feld.parentElement.querySelector('.feld-leeren')?.getBoundingClientRect();
  const unten = knopf?.height ? Math.min(r.top + UEBERLAPPUNG.y, knopf.top) : r.top + UEBERLAPPUNG.y;
  agent.moveTo(r.right - BREITE + UEBERLAPPUNG.x, Math.max(8, unten - HOEHE), 0);
  const startY = window.scrollY;
  beiScroll = () => Math.abs(window.scrollY - startY) > MAX_SCROLL_PX && versteckeClippy();
  window.addEventListener('scroll', beiScroll, { passive: true });
  agent.show();
  if (agent.hasAnimation('GetAttention')) agent.play('GetAttention');
  agent.speak(TEXT);
  window.setTimeout(versteckeClippy, SICHTBAR_MS);
}

export function versteckeClippy() {
  erwuenscht = false;
  if (beiScroll) window.removeEventListener('scroll', beiScroll);
  beiScroll = null;
  if (!agent) return;
  const a = agent;
  agent = null;
  a.hide(false, () => a.dispose());
}
