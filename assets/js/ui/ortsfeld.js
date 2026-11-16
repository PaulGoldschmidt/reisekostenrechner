// Input with place suggestions, following the WAI-ARIA combobox pattern.
// An optional local source (the university directory) shows its matches immediately and first;
// places and addresses from the remote place search follow below.

import { sucheOrte } from '../geo/suche.js';
import { h } from './dom.js';

const VERZOEGERUNG_MS = 250;
// Mirrors the rotation duration of .lade-kreis in style.css
const DREHUNG_MS = 800;
// Keeps the list short when there are local matches as well
const MAX_ENTFERNTE_NEBEN_LOKALEN = 3;

export class Ortsfeld {
  /**
   * @param {HTMLInputElement} eingabe
   * @param {HTMLUListElement} liste
   * @param {object} optionen
   * @param {(ort: object) => void} optionen.onWahl
   * @param {() => void} optionen.onLeeren called as soon as a chosen place is edited or cleared
   * @param {(text: string) => Promise<object[]>|object[]} [optionen.lokal] local suggestions, sync or async
   * @param {string} [optionen.lokalTitel] group heading for the local suggestions
   */
  constructor(eingabe, liste, { onWahl, onLeeren, lokal = null, lokalTitel = 'Vorschläge' }) {
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
    // True while a remote search is running or still waiting for the debounce timer
    this.sucht = false;

    // The clear button must directly follow the input: style.css hides it via
    // input:placeholder-shown + .feld-leeren, so it only shows while the field has text.
    eingabe.after(
      h('button', { type: 'button', class: 'feld-leeren', 'aria-label': 'Eingabe löschen', onclick: () => this.loesche() }, '×'),
    );

    // Local matches (university names) are long, so the list may grow wider than the field.
    if (lokal) liste.classList.add('vorschlaege-breit');

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

  /** Sets a place from outside (e.g. from the URL) without calling onWahl. */
  setze(ort) {
    this.gewaehlt = ort;
    this.eingabe.value = ort ? ort.label : '';
  }

  /** Clears the field just like deleting by keyboard, then moves focus back from the clear button. */
  loesche() {
    this.eingabe.value = '';
    this.beiEingabe();
    this.eingabe.focus();
  }

  abbrechen() {
    this.nummer++;
    clearTimeout(this.timer);
    if (this.abbruch) this.abbruch.abort();
    this.entfernte = [];
    this.meldung = null;
    this.aktiv = -1;
    this.sucht = false;
  }

  markiereErsten() {
    if (this.aktiv < 0 && this.vorschlaege.length) this.aktiv = 0;
  }

  async beiEingabe() {
    if (this.gewaehlt) {
      this.gewaehlt = null;
      this.onLeeren();
    }
    this.abbrechen();
    const nummer = this.nummer;
    const text = this.eingabe.value.trim();
    if (text.length < 2) {
      this.lokale = [];
      this.schliessen();
      return;
    }
    this.timer = setTimeout(() => this.suche(text), VERZOEGERUNG_MS);
    this.sucht = true;

    if (this.lokal) {
      const lokale = await this.lokal(text);
      // The user kept typing in the meantime: drop these stale local matches.
      if (nummer !== this.nummer) return;
      this.lokale = lokale;
      this.markiereErsten();
    }
    // Render now so the spinner (below any local matches) shows before the debounced search starts.
    this.zeichne();
  }

  async suche(text) {
    this.abbruch = new AbortController();
    try {
      this.entfernte = await sucheOrte(text, { signal: this.abbruch.signal });
      this.meldung = this.vorschlaege.length ? null : 'Keine passenden Orte gefunden.';
    } catch (fehler) {
      // Aborted because the user kept typing or picked a suggestion
      if (fehler.name === 'AbortError') return;
      this.entfernte = [];
      this.meldung = 'Die Ortssuche ist gerade nicht erreichbar.';
    }
    this.sucht = false;
    this.markiereErsten();
    this.zeichne();
  }

  zeichne() {
    const id = this.liste.id;
    const gruppe = (text) => h('li', { class: 'vorschlag-gruppe', role: 'presentation' }, text);
    const option = (ort, i) =>
      h(
        'li',
        {
          id: `${id}-${i}`,
          role: 'option',
          class: 'vorschlag',
          'aria-selected': String(i === this.aktiv),
          onmousedown: (e) => {
            e.preventDefault();
            this.waehle(i);
          },
        },
        h('span', { class: 'vorschlag-name' }, ort.titel),
        ort.zusatz ? h('span', { class: 'vorschlag-zusatz' }, ort.zusatz) : null,
      );

    // The negative animation-delay keeps the spinner's phase across re-renders instead of
    // restarting the rotation on every keystroke.
    const ladekreis = () =>
      h('span', {
        class: 'lade-kreis',
        'aria-hidden': 'true',
        style: `animation-delay: -${Math.round(performance.now() % DREHUNG_MS)}ms`,
      });
    const status = this.sucht ? [ladekreis(), 'Suche passende Orte …'] : this.meldung;

    const entfernte = this.sichtbareEntfernte;
    const mitGruppen = this.lokale.length > 0 && entfernte.length > 0;
    const eintraege = [
      mitGruppen && gruppe(this.lokalTitel),
      ...this.lokale.map((ort, i) => option(ort, i)),
      mitGruppen && gruppe('Orte und Adressen'),
      ...entfernte.map((ort, i) => option(ort, this.lokale.length + i)),
      status && h('li', { class: 'vorschlag-meldung', role: 'presentation' }, status),
    ].filter(Boolean);

    this.liste.replaceChildren(...eintraege);
    this.liste.setAttribute('aria-busy', String(this.sucht));
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
    this.abbrechen();
    this.lokale = [];
    this.gewaehlt = ort;
    this.eingabe.value = ort.label;
    this.liste.replaceChildren();
    this.eingabe.removeAttribute('aria-activedescendant');
    this.schliessen();
    this.onWahl(ort);
  }
}
