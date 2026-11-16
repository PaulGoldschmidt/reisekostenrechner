// Clippy weist darauf hin, dass statt eines Ortes auch die genaue Adresse möglich ist.
//
// Nur auf dem Desktop, nur einmal pro Besuch und nicht bei reduzierter Bewegung.
// Bibliothek und Figur werden erst bei Bedarf von jsDelivr geladen (clippyjs, MIT, ohne
// weitere Abhängigkeiten). Die Prüfsummen stehen in der Import-Map in index.html.
// Clippy, der Name und alle Grafiken gehören Microsoft.

const BASIS = 'https://cdn.jsdelivr.net/npm/clippyjs@0.1.0/dist/';
const DESKTOP = '(min-width: 1024px) and (hover: hover)';
const SCHLUESSEL = 'reisekostenrechner:clippy';
const SICHTBAR_MS = 14000;
const TEXT =
  'Es sieht so aus, als hätten Sie nur einen Ort eingegeben. ' +
  'Mit der genauen Adresse, etwa „Jägerstraße 22, Berlin“, wird die Berechnung genauer.';

let agent = null;
let gestartet = false;

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
 * Zeigt Clippy neben dem Eingabefeld mit dem Hinweis auf die genaue Adresse.
 * @param {HTMLElement} feld Eingabefeld des Veranstaltungsorts
 */
export async function zeigeAdressTipp(feld) {
  if (gestartet || schonGezeigt()) return;
  if (!window.matchMedia(DESKTOP).matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gestartet = true;
  merkeGezeigt();

  try {
    const { initAgent } = await import(`${BASIS}index.mjs`);
    agent = await initAgent({
      agent: () => import(`${BASIS}agents/clippy/agent.mjs`),
      map: () => import(`${BASIS}agents/clippy/map.mjs`),
      // stumm: keine Töne laden und abspielen
      sound: async () => ({ default: {} }),
    });
  } catch {
    // CDN nicht erreichbar oder Prüfsumme falsch: dann eben ohne Clippy
    return;
  }

  // Rechts neben dem Feld, etwas höher, am Übergang zur Karte
  const r = feld.getBoundingClientRect();
  agent.moveTo(r.right + 16, Math.max(16, r.top - 40), 0);
  agent.show();
  if (agent.hasAnimation('GetAttention')) agent.play('GetAttention');
  agent.speak(TEXT);
  window.setTimeout(versteckeClippy, SICHTBAR_MS);
}

/** Lässt Clippy verschwinden, etwa wenn das Feld erneut bearbeitet wird. */
export function versteckeClippy() {
  if (!agent) return;
  const a = agent;
  agent = null;
  a.hide(false, () => a.dispose());
}
