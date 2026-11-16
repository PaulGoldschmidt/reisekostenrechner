// Country groups with the minimum stay in days (mindestTage) for a subsidised flight.
// Sources: "Regelungen und Bedingungen für Auslandsvorhaben ab 1. Juli 2025"
// (Nachhaltige Auslandsmobilität) and the Reise-Flowchart of the Studienstiftung.

export const REGIONEN = Object.freeze({
  EU: { name: 'Europa', mindestTage: 8 },
  MENA: { name: 'Naher Osten und Nordafrika (MENA)', mindestTage: 15 },
  ZSA: { name: 'Zentral- und Südasien', mindestTage: 15 },
  OSA: { name: 'Ost- und Südostasien', mindestTage: 22 },
  SSA: { name: 'Subsahara-Afrika', mindestTage: 22 },
  NAM: { name: 'Nordamerika', mindestTage: 15 },
  LAC: { name: 'Mittel- und Südamerika, Karibik', mindestTage: 22 },
  OZ: { name: 'Australien und Ozeanien', mindestTage: 36 },
});

// Continents are separate from the regions above. They are only used for the rule that
// coming from another country on the same non-European continent is subsidised one way only.
export const KONTINENTE = Object.freeze({
  EU: 'Europa',
  AF: 'Afrika',
  AS: 'Asien',
  NA: 'Nordamerika',
  SA: 'Südamerika',
  OC: 'Ozeanien',
});
