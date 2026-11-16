// Gemeinsame Media Queries für Karte, Clippy und Konfetti.
// Das Desktop-Layout in style.css nutzt denselben Wert (min-width: 1024px).

export const DESKTOP = '(min-width: 1024px)';

const passt = (abfrage) => window.matchMedia(abfrage).matches;

export const istDesktop = () => passt(DESKTOP);
export const mitMaus = () => passt('(hover: hover)');
export const reduzierteBewegung = () => passt('(prefers-reduced-motion: reduce)');
