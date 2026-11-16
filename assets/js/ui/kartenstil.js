// Palette for OpenFreeMap's "dark" style. Keep in sync with style.css: hintergrund and halo
// match --hintergrund, akzent matches --akzent, land matches the .karte background.
export const FARBEN = Object.freeze({
  hintergrund: '#0e1013',
  akzent: '#c8f169',
  land: '#111418',
  wasser: '#0c1e2b',
  wasserLinie: '#10283a',
  wald: '#121b17',
  wohngebiet: '#14181d',
  eis: '#161b21',
  gebaeude: '#171b21',
  gebaeudeRand: '#1d2229',
  flughafen: '#191d23',
  weg: '#1a1f26',
  strasseKlein: '#1d2229',
  strasseRand: '#2a303a',
  strasse: '#232931',
  autobahnRand: '#39404c',
  autobahn: '#2d343f',
  bahn: '#262c34',
  grenzeLand: '#4a5260',
  grenzeRegion: '#2c323b',
  textOrt: '#bcc2cb',
  textOrtKlein: '#7f8794',
  textLand: '#d6dae0',
  textStrasse: '#5c6470',
  textWasser: '#4f7a95',
  halo: '#0e1013',
});

const F = FARBEN;

const EBENEN = {
  background: { 'background-color': F.land },
  water: { 'fill-color': F.wasser },
  waterway: { 'line-color': F.wasserLinie },
  landcover_ice_shelf: { 'fill-color': F.eis },
  landcover_glacier: { 'fill-color': F.eis },
  landuse_residential: { 'fill-color': F.wohngebiet },
  landcover_wood: { 'fill-color': F.wald },
  landuse_park: { 'fill-color': F.wald },
  water_name: { 'text-color': F.textWasser, 'text-halo-color': F.wasser },
  building: { 'fill-color': F.gebaeude, 'fill-outline-color': F.gebaeudeRand },
  'aeroway-taxiway': { 'line-color': F.flughafen },
  'aeroway-runway-casing': { 'line-color': F.strasseRand },
  'aeroway-area': { 'fill-color': F.flughafen },
  'aeroway-runway': { 'line-color': F.flughafen },
  road_area_pier: { 'fill-color': F.land },
  road_pier: { 'line-color': F.land },
  highway_path: { 'line-color': F.weg },
  highway_minor: { 'line-color': F.strasseKlein },
  highway_major_casing: { 'line-color': F.strasseRand },
  highway_major_inner: { 'line-color': F.strasse },
  highway_major_subtle: { 'line-color': F.strasse },
  highway_motorway_casing: { 'line-color': F.autobahnRand },
  highway_motorway_inner: { 'line-color': F.autobahn },
  highway_motorway_subtle: { 'line-color': F.autobahn },
  railway_transit: { 'line-color': F.bahn },
  railway_transit_dashline: { 'line-color': F.land },
  railway_minor: { 'line-color': F.bahn },
  railway_minor_dashline: { 'line-color': F.land },
  railway: { 'line-color': F.bahn },
  railway_dashline: { 'line-color': F.land },
  highway_name_other: { 'text-color': F.textStrasse, 'text-halo-color': F.halo },
  highway_name_motorway: { 'text-color': F.textStrasse, 'text-halo-color': F.halo },
  boundary_state: { 'line-color': F.grenzeRegion },
  'boundary_country_z0-4': { 'line-color': F.grenzeLand },
  'boundary_country_z5-': { 'line-color': F.grenzeLand },
  place_other: { 'text-color': F.textOrtKlein, 'text-halo-color': F.halo },
  place_suburb: { 'text-color': F.textOrtKlein, 'text-halo-color': F.halo },
  place_village: { 'text-color': F.textOrtKlein, 'text-halo-color': F.halo },
  place_town: { 'text-color': F.textOrt, 'text-halo-color': F.halo },
  place_city: { 'text-color': F.textOrt, 'text-halo-color': F.halo },
  place_city_large: { 'text-color': F.textOrt, 'text-halo-color': F.halo },
  place_state: { 'text-color': F.textOrtKlein, 'text-halo-color': F.halo },
  place_country_other: { 'text-color': F.textLand, 'text-halo-color': F.halo },
  place_country_minor: { 'text-color': F.textLand, 'text-halo-color': F.halo },
  place_country_major: { 'text-color': F.textLand, 'text-halo-color': F.halo },
};

// Fallback by layer type for layers OpenFreeMap may add to the style later.
const STANDARD = {
  background: { 'background-color': F.land },
  fill: { 'fill-color': F.land },
  line: { 'line-color': F.strasse },
  symbol: { 'text-color': F.textOrtKlein, 'text-halo-color': F.halo },
};

const DEUTSCHER_NAME = ['coalesce', ['get', 'name:de'], ['get', 'name:latin'], ['get', 'name']];

// The style sets all place and street labels in capitals; only regions and countries keep that.
const NORMALE_SCHREIBUNG = new Set([
  'highway_name_other', 'place_other', 'place_suburb', 'place_village',
  'place_town', 'place_city', 'place_city_large',
]);

/**
 * City dot ("circle-11") that is missing from the style's sprite.
 * @returns {{width: number, height: number, data: Uint8ClampedArray}} RGBA image for map.addImage()
 */
export function stadtpunkt(groesse = 11) {
  const data = new Uint8ClampedArray(groesse * groesse * 4);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(FARBEN.textOrtKlein.slice(i, i + 2), 16));
  const mitte = (groesse - 1) / 2;
  for (let y = 0; y < groesse; y++) {
    for (let x = 0; x < groesse; x++) {
      const abstand = Math.hypot(x - mitte, y - mitte);
      // Radius about 3 px with a 1 px soft edge
      const deckung = Math.max(0, Math.min(1, 3.5 - abstand));
      const i = (y * groesse + x) * 4;
      data.set([r, g, b, Math.round(deckung * 255)], i);
    }
  }
  return { width: groesse, height: groesse, data };
}

/** Recolors a MapLibre style and switches labels to German names. Returns a copy, the input stays unchanged. */
export function faerbeStil(stil) {
  const neu = structuredClone(stil);
  neu.layers = neu.layers.map((ebene) => {
    const farben = EBENEN[ebene.id] || STANDARD[ebene.type];
    if (!farben) return ebene;
    const paint = { ...(ebene.paint || {}) };
    // Patterns such as "wood-pattern" are missing from the style's sprite and would hide the fill color.
    delete paint['fill-pattern'];
    for (const [name, wert] of Object.entries(farben)) {
      if (ebene.type === 'symbol' && !(ebene.layout && ebene.layout['text-field'])) continue;
      paint[name] = wert;
    }
    const layout = { ...(ebene.layout || {}) };
    if (ebene.type === 'symbol' && JSON.stringify(layout['text-field'] || '').includes('name')) {
      layout['text-field'] = DEUTSCHER_NAME;
    }
    if (NORMALE_SCHREIBUNG.has(ebene.id)) layout['text-transform'] = 'none';
    return { ...ebene, paint, layout };
  });
  return neu;
}
