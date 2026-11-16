import { faerbeStil, FARBEN, stadtpunkt } from './kartenstil.js';
import { istDesktop } from './medien.js';

const STIL_URL = 'https://tiles.openfreemap.org/styles/dark';
// Centered on Bonn
const START = { center: [7.149, 50.707], zoom: 10 };

const DEUTSCH = {
  'Map.Title': 'Karte',
  'NavigationControl.ZoomIn': 'Vergrößern',
  'NavigationControl.ZoomOut': 'Verkleinern',
  'NavigationControl.ResetBearing': 'Nach Norden ausrichten',
  'AttributionControl.ToggleAttribution': 'Quellenangaben ein- oder ausblenden',
  'AttributionControl.MapFeedback': 'Fehler in der Karte melden',
  'CooperativeGesturesHandler.WindowsHelpText': 'Zum Zoomen Strg gedrückt halten und scrollen',
  'CooperativeGesturesHandler.MacHelpText': 'Zum Zoomen ⌘ gedrückt halten und scrollen',
  'CooperativeGesturesHandler.MobileHelpText': 'Karte mit zwei Fingern bewegen',
};

const LEER = { type: 'FeatureCollection', features: [] };

function markerElement(art) {
  const el = document.createElement('div');
  el.className = `marker marker-${art}`;
  return el;
}

/**
 * @param {HTMLElement} container
 * @returns {{zeige: (start: object|null, ziel: object|null, route: object|null) => void}}
 *   start and ziel are places with lat and lon, route is a result of berechneRoute() (geo/route.js).
 *   zeige() may be called before the map has loaded; the last call is replayed on load.
 */
export function erstelleKarte(container) {
  const maplibregl = window.maplibregl;
  if (!maplibregl) {
    container.classList.add('karte-fehlt');
    container.textContent = 'Die Karte konnte nicht geladen werden.';
    return { zeige() {} };
  }

  const karte = new maplibregl.Map({
    container,
    ...START,
    attributionControl: { compact: true },
    cooperativeGestures: true,
    dragRotate: false,
    pitchWithRotate: false,
    locale: DEUTSCH,
  });
  karte.touchZoomRotate.disableRotation();
  karte.setStyle(STIL_URL, { transformStyle: (_vorher, stil) => faerbeStil(stil) });
  // The OpenFreeMap sprite has no "circle-11" image for city dots, so we draw our own.
  karte.on('styleimagemissing', (e) => {
    if (e.id === 'circle-11' && !karte.hasImage(e.id)) karte.addImage(e.id, stadtpunkt(11));
  });
  karte.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  const marker = {
    start: new maplibregl.Marker({ element: markerElement('start') }),
    ziel: new maplibregl.Marker({ element: markerElement('ziel') }),
  };

  let geladen = false;
  let wartend = null;

  karte.on('load', () => {
    const akzent = FARBEN.akzent;
    karte.addSource('route', { type: 'geojson', data: LEER });
    karte.addLayer({
      id: 'route-rand',
      type: 'line',
      source: 'route',
      filter: ['==', ['get', 'art'], 'strasse'],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': FARBEN.hintergrund, 'line-width': 9 },
    });
    karte.addLayer({
      id: 'route-linie',
      type: 'line',
      source: 'route',
      filter: ['==', ['get', 'art'], 'strasse'],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': akzent, 'line-width': 4 },
    });
    karte.addLayer({
      id: 'route-luftlinie',
      type: 'line',
      source: 'route',
      filter: ['!=', ['get', 'art'], 'strasse'],
      layout: { 'line-cap': 'round' },
      paint: { 'line-color': akzent, 'line-width': 2.5, 'line-dasharray': [2, 2] },
    });
    geladen = true;
    if (wartend) {
      zeige(...wartend);
      wartend = null;
    }
  });

  function setzeMarker(m, ort) {
    if (ort) m.setLngLat([ort.lon, ort.lat]).addTo(karte);
    else m.remove();
  }

  function zeige(start, ziel, route) {
    if (!geladen) {
      wartend = [start, ziel, route];
      return;
    }
    setzeMarker(marker.start, start);
    setzeMarker(marker.ziel, ziel);

    const quelle = karte.getSource('route');
    if (route && route.geometrie && route.geometrie.length > 1) {
      quelle.setData({
        type: 'Feature',
        properties: { art: route.art },
        geometry: { type: 'LineString', coordinates: route.geometrie },
      });
      // The line keeps longitudes continuous across the date line, so its end can differ from
      // ziel by 360 degrees. Put the marker on the line end to keep both together.
      const ende = route.geometrie[route.geometrie.length - 1];
      if (ziel) marker.ziel.setLngLat(ende);
      const grenzen = route.geometrie.reduce(
        (b, p) => b.extend(p),
        new maplibregl.LngLatBounds(route.geometrie[0], route.geometrie[0]),
      );
      // On desktop the route summary (.strecke in style.css) overlays the top left of the map.
      const abstand = istDesktop()
        ? { top: 110, right: 70, bottom: 60, left: 60 }
        : { top: 36, right: 48, bottom: 36, left: 36 };
      karte.fitBounds(grenzen, { padding: abstand, maxZoom: 11, duration: 600 });
    } else {
      quelle.setData(LEER);
      const ort = ziel || start;
      if (ort) karte.easeTo({ center: [ort.lon, ort.lat], zoom: Math.max(karte.getZoom(), 6), duration: 600 });
    }
  }

  return { zeige };
}
