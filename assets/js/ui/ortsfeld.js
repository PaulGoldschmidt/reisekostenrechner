// Eingabefeld mit Ortsvorschlägen (Combobox nach WAI-ARIA).

import { sucheOrte } from '../geo/suche.js';
import { h } from './dom.js';

const VERZOEGERUNG_MS = 250;

export class Ortsfeld {
  /**
   * @param {HTMLInputElement} eingabe
   * @param {HTMLUListElement} liste
   * @param {{onWahl: (ort: object) => void, onLeeren: () => void}} rueckrufe
   */
  constructor(eingabe, liste, { onWahl, onLeeren }) {
    this.eingabe = eingabe;
    this.liste = liste;
    this.onWahl = onWahl;
    this.onLeeren = onLeeren;
    this.vorschlaege = [];
    this.aktiv = -1;
    this.gewaehlt = null;
    this.timer = null;
    this.abbruch = null;

    eingabe.addEventListener('input', () => this.beiEingabe());
    eingabe.addEventListener('keydown', (e) => this.beiTaste(e));
    eingabe.addEventListener('blur', () => setTimeout(() => this.schliessen(), 120));
    eingabe.addEventListener('focus', () => {
      if (!this.gewaehlt && this.vorschlaege.length) this.oeffnen();
    });
  }

  /** Ort von außen setzen, z. B. aus der URL. */
  setze(ort) {
    this.gewaehlt = ort;
    this.eingabe.value = ort ? ort.label : '';
  }

  beiEingabe() {
    if (this.gewaehlt) {
      this.gewaehlt = null;
      this.onLeeren();
    }
    clearTimeout(this.timer);
    const text = this.eingabe.value.trim();
    if (text.length < 2) {
      this.vorschlaege = [];
      this.schliessen();
      return;
    }
    this.timer = setTimeout(() => this.suche(text), VERZOEGERUNG_MS);
  }

  async suche(text) {
    if (this.abbruch) this.abbruch.abort();
    this.abbruch = new AbortController();
    try {
      this.vorschlaege = await sucheOrte(text, { signal: this.abbruch.signal });
      this.aktiv = this.vorschlaege.length ? 0 : -1;
      this.zeichne(this.vorschlaege.length ? null : 'Keine passenden Orte gefunden.');
    } catch (fehler) {
      if (fehler.name === 'AbortError') return;
      this.vorschlaege = [];
      this.zeichne('Die Ortssuche ist gerade nicht erreichbar.');
    }
  }

  zeichne(meldung) {
    const id = this.liste.id;
    this.liste.replaceChildren(
      ...(meldung
        ? [h('li', { class: 'vorschlag-meldung', role: 'presentation' }, meldung)]
        : this.vorschlaege.map((ort, i) =>
            h(
              'li',
              {
                id: `${id}-${i}`,
                role: 'option',
                class: 'vorschlag',
                'aria-selected': i === this.aktiv ? 'true' : 'false',
                onmousedown: (e) => {
                  e.preventDefault();
                  this.waehle(i);
                },
              },
              h('span', { class: 'vorschlag-name' }, ort.name),
              h('span', { class: 'vorschlag-zusatz' }, ort.label.slice(ort.name.length).replace(/^,\s*/, '')),
            ),
          )),
    );
    if (this.aktiv >= 0) this.eingabe.setAttribute('aria-activedescendant', `${id}-${this.aktiv}`);
    else this.eingabe.removeAttribute('aria-activedescendant');
    if (document.activeElement === this.eingabe) this.oeffnen();
  }

  oeffnen() {
    this.liste.hidden = false;
    this.eingabe.setAttribute('aria-expanded', 'true');
  }

  schliessen() {
    this.liste.hidden = true;
    this.eingabe.setAttribute('aria-expanded', 'false');
  }

  beiTaste(e) {
    const offen = !this.liste.hidden && this.vorschlaege.length > 0;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!this.vorschlaege.length) return;
      e.preventDefault();
      if (!offen) this.oeffnen();
      const n = this.vorschlaege.length;
      this.aktiv = e.key === 'ArrowDown' ? (this.aktiv + 1) % n : (this.aktiv - 1 + n) % n;
      this.zeichne(null);
    } else if (e.key === 'Enter') {
      if (offen) {
        e.preventDefault();
        this.waehle(Math.max(0, this.aktiv));
      }
    } else if (e.key === 'Escape') {
      if (offen) {
        e.preventDefault();
        this.schliessen();
      }
    }
  }

  waehle(i) {
    const ort = this.vorschlaege[i];
    if (!ort) return;
    this.gewaehlt = ort;
    this.eingabe.value = ort.label;
    this.vorschlaege = [];
    this.aktiv = -1;
    this.liste.replaceChildren();
    this.eingabe.removeAttribute('aria-activedescendant');
    this.schliessen();
    this.onWahl(ort);
  }
}
