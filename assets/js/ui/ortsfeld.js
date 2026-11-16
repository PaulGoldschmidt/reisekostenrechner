// Eingabefeld mit Ortsvorschlägen (Combobox nach WAI-ARIA).
//
// Optional mit einer lokalen Quelle (Hochschulverzeichnis): deren Treffer erscheinen
// sofort und zuerst, die Orte und Adressen aus der Ortssuche folgen darunter.

import { sucheOrte } from '../geo/suche.js';
import { h } from './dom.js';

const VERZOEGERUNG_MS = 250;
// Neben lokalen Treffern nur wenige Orte zeigen, damit die Liste kurz bleibt
const MAX_ENTFERNTE_NEBEN_LOKALEN = 3;

export class Ortsfeld {
  /**
   * @param {HTMLInputElement} eingabe
   * @param {HTMLUListElement} liste
   * @param {object} optionen
   * @param {(ort: object) => void} optionen.onWahl
   * @param {() => void} optionen.onLeeren
   * @param {(text: string) => Promise<object[]>|object[]} [optionen.lokal] lokale Vorschläge
   * @param {string} [optionen.lokalTitel] Überschrift der lokalen Vorschläge
   */
  constructor(eingabe, liste, { onWahl, onLeeren, lokal = null, lokalTitel = '' }) {
    this.eingabe = eingabe;
    this.liste = liste;
    this.onWahl = onWahl;
    this.onLeeren = onLeeren;
    this.lokal = lokal;
    this.lokalTitel = lokalTitel;
    this.lokale = [];
    this.entfernte = [];
    this.meldung = null;
    this.aktiv = -1;
    this.gewaehlt = null;
    this.timer = null;
    this.abbruch = null;
    this.nummer = 0;

    eingabe.addEventListener('input', () => this.beiEingabe());
    eingabe.addEventListener('keydown', (e) => this.beiTaste(e));
    eingabe.addEventListener('blur', () => setTimeout(() => this.schliessen(), 120));
    eingabe.addEventListener('focus', () => {
      if (!this.gewaehlt && this.vorschlaege.length) this.oeffnen();
    });
  }

  get sichtbareEntfernte() {
    return this.lokale.length ? this.entfernte.slice(0, MAX_ENTFERNTE_NEBEN_LOKALEN) : this.entfernte;
  }

  get vorschlaege() {
    return [...this.lokale, ...this.sichtbareEntfernte];
  }

  /** Ort von außen setzen, z. B. aus der URL. */
  setze(ort) {
    this.gewaehlt = ort;
    this.eingabe.value = ort ? ort.label : '';
  }

  async beiEingabe() {
    if (this.gewaehlt) {
      this.gewaehlt = null;
      this.onLeeren();
    }
    clearTimeout(this.timer);
    if (this.abbruch) this.abbruch.abort();
    const nummer = ++this.nummer;
    const text = this.eingabe.value.trim();
    this.entfernte = [];
    this.meldung = null;
    if (text.length < 2) {
      this.lokale = [];
      this.schliessen();
      return;
    }
    this.timer = setTimeout(() => this.suche(text, nummer), VERZOEGERUNG_MS);

    if (this.lokal) {
      const lokale = await this.lokal(text);
      if (nummer !== this.nummer) return;
      this.lokale = lokale;
      this.aktiv = this.lokale.length ? 0 : -1;
      if (this.lokale.length) this.zeichne();
    }
  }

  async suche(text, nummer) {
    this.abbruch = new AbortController();
    try {
      const entfernte = await sucheOrte(text, { signal: this.abbruch.signal });
      if (nummer !== this.nummer) return;
      this.entfernte = entfernte;
      this.meldung = this.vorschlaege.length ? null : 'Keine passenden Orte gefunden.';
    } catch (fehler) {
      if (fehler.name === 'AbortError' || nummer !== this.nummer) return;
      this.entfernte = [];
      this.meldung = 'Die Ortssuche ist gerade nicht erreichbar.';
    }
    if (this.aktiv < 0 && this.vorschlaege.length) this.aktiv = 0;
    this.zeichne();
  }

  zeichne() {
    const id = this.liste.id;
    const eintraege = [];
    const option = (ort, i) =>
      h(
        'li',
        {
          id: `${id}-${i}`,
          role: 'option',
          class: `vorschlag vorschlag-${ort.art || 'ort'}`,
          'aria-selected': i === this.aktiv ? 'true' : 'false',
          onmousedown: (e) => {
            e.preventDefault();
            this.waehle(i);
          },
        },
        h('span', { class: 'vorschlag-name' }, ort.titel || ort.name),
        ort.zusatz ? h('span', { class: 'vorschlag-zusatz' }, ort.zusatz) : null,
      );

    const entfernte = this.sichtbareEntfernte;
    const mitGruppen = this.lokale.length > 0 && entfernte.length > 0;
    if (mitGruppen && this.lokalTitel) eintraege.push(h('li', { class: 'vorschlag-gruppe', role: 'presentation' }, this.lokalTitel));
    this.lokale.forEach((ort, i) => eintraege.push(option(ort, i)));
    if (mitGruppen) eintraege.push(h('li', { class: 'vorschlag-gruppe', role: 'presentation' }, 'Orte und Adressen'));
    entfernte.forEach((ort, i) => eintraege.push(option(ort, this.lokale.length + i)));
    if (this.meldung) eintraege.push(h('li', { class: 'vorschlag-meldung', role: 'presentation' }, this.meldung));

    this.liste.replaceChildren(...eintraege);
    if (this.aktiv >= 0) this.eingabe.setAttribute('aria-activedescendant', `${id}-${this.aktiv}`);
    else this.eingabe.removeAttribute('aria-activedescendant');
    if (document.activeElement === this.eingabe && eintraege.length) this.oeffnen();
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
    const n = this.vorschlaege.length;
    const offen = !this.liste.hidden && n > 0;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!n) return;
      e.preventDefault();
      if (!offen) this.oeffnen();
      this.aktiv = e.key === 'ArrowDown' ? (this.aktiv + 1) % n : (this.aktiv - 1 + n) % n;
      this.zeichne();
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
    this.nummer++;
    clearTimeout(this.timer);
    if (this.abbruch) this.abbruch.abort();
    this.gewaehlt = ort;
    this.eingabe.value = ort.label;
    this.lokale = [];
    this.entfernte = [];
    this.meldung = null;
    this.aktiv = -1;
    this.liste.replaceChildren();
    this.eingabe.removeAttribute('aria-activedescendant');
    this.schliessen();
    this.onWahl(ort);
  }
}
