import { reduzierteBewegung } from './medien.js';

const FARBEN = ['#c8f169', '#ece9e1', '#ffc670', '#8cc8ff', '#ff9f8a'];
const ANZAHL = 140;
const DAUER_MS = 2800;
const SCHWERKRAFT = 0.28;
const LUFTWIDERSTAND = 0.985;

/** @param {{x: number, y: number}} ursprung launch point in viewport coordinates */
export function konfetti(ursprung) {
  if (reduzierteBewegung()) return;

  const breite = window.innerWidth;
  const hoehe = window.innerHeight;
  // No devicePixelRatio scaling: 1x is enough for small, fast-moving pieces and saves memory.
  const canvas = document.createElement('canvas');
  canvas.className = 'konfetti';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.width = breite;
  canvas.height = hoehe;
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');

  const teile = Array.from({ length: ANZAHL }, () => {
    const winkel = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.95;
    const tempo = 7 + Math.random() * 10;
    return {
      x: ursprung.x,
      y: ursprung.y,
      vx: Math.cos(winkel) * tempo,
      vy: Math.sin(winkel) * tempo,
      breite: 6 + Math.random() * 6,
      hoehe: 3 + Math.random() * 4,
      drehung: Math.random() * Math.PI,
      drehtempo: (Math.random() - 0.5) * 0.3,
      phase: Math.random() * Math.PI * 2,
      farbe: FARBEN[Math.floor(Math.random() * FARBEN.length)],
    };
  });

  const start = performance.now();
  let vorher = start;

  function bild(jetzt) {
    // Speeds, SCHWERKRAFT and LUFTWIDERSTAND are per frame at 60 fps; f scales them to the real frame time.
    const f = Math.min(3, (jetzt - vorher) / (1000 / 60));
    vorher = jetzt;
    const verlauf = (jetzt - start) / DAUER_MS;
    ctx.clearRect(0, 0, breite, hoehe);
    ctx.globalAlpha = Math.max(0, Math.min(1, (1 - verlauf) / 0.35));
    let sichtbar = 0;
    for (const t of teile) {
      t.vy += SCHWERKRAFT * f;
      t.vx *= LUFTWIDERSTAND ** f;
      t.vy *= LUFTWIDERSTAND ** f;
      t.x += t.vx * f;
      t.y += t.vy * f;
      t.drehung += t.drehtempo * f;
      t.phase += 0.12 * f;
      if (t.y > hoehe + 20) continue;
      sichtbar++;
      ctx.save();
      ctx.translate(t.x + Math.sin(t.phase) * 2, t.y);
      ctx.rotate(t.drehung);
      // Flip around the long axis like falling paper
      ctx.scale(1, Math.cos(t.phase));
      ctx.fillStyle = t.farbe;
      ctx.fillRect(-t.breite / 2, -t.hoehe / 2, t.breite, t.hoehe);
      ctx.restore();
    }
    if (verlauf < 1 && sichtbar > 0) requestAnimationFrame(bild);
    else canvas.remove();
  }
  requestAnimationFrame(bild);
}
