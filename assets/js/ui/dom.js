// Kleiner Helfer zum Erzeugen von DOM-Elementen ohne innerHTML.
// Texte werden immer als Textknoten eingefügt.

export function h(tag, attribute = {}, ...kinder) {
  const el = document.createElement(tag);
  for (const [name, wert] of Object.entries(attribute || {})) {
    if (wert === false || wert === null || wert === undefined) continue;
    if (name === 'class') el.className = wert;
    else if (name.startsWith('on') && typeof wert === 'function') el.addEventListener(name.slice(2), wert);
    else el.setAttribute(name, wert === true ? '' : String(wert));
  }
  for (const kind of kinder.flat(Infinity)) {
    if (kind === null || kind === undefined || kind === false) continue;
    el.append(kind instanceof Node ? kind : String(kind));
  }
  return el;
}
