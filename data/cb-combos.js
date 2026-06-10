// [ignoring loop detection]
// ─── CB ROLE PAIRINGS ───
// Pairings for 2-CB and 3-CB systems, cross-referenced with the 6 Manager Archetypes.

var CB_COMBOS = [
  // ── SECTION 1: 2-CB SYSTEMS ──
  { roles: ["CD_D", "CD_D"], ratings: { pos: 0.1, press: 0.6, def: 1.0, ctr: 1.0, bt: 1.0 } },
  { roles: ["CD_D", "CD_CO"], ratings: { pos: 0.6, press: 0.6, def: 1.0, ctr: 1.0, bt: 1.0 } },
  { roles: ["BPD_D", "CD_D"], ratings: { pos: 1.0, press: 1.0, def: 0.6, ctr: 0.6, bt: 1.0 } },
  { roles: ["BPD_D", "BPD_D"], ratings: { pos: 1.0, press: 0.6, def: 0.1, ctr: 0.1, bt: 0.6 } },
  { roles: ["BPD_CO", "CD_D"], ratings: { pos: 1.0, press: 1.0, def: 0.6, ctr: 0.6, bt: 0.6 } },
  { roles: ["BPD_CO", "BPD_D"], ratings: { pos: 1.0, press: 0.6, def: 0.1, ctr: 0.1, bt: 0.6 } },
  { roles: ["Libero_S", "CD_D"], ratings: { pos: 1.0, press: 0.6, def: 0.1, ctr: 0.1, bt: 0.6 } },
  { roles: ["Libero_S", "BPD_D"], ratings: { pos: 1.0, press: 0.1, def: 0.1, ctr: 0.1, bt: 0.6 } },
  { roles: ["Libero_A", "CD_D"], ratings: { pos: 1.0, press: 0.1, def: 0.1, ctr: 0.1, bt: 0.6 } },
  { roles: ["Libero_A", "BPD_D"], ratings: { pos: 1.0, press: 0.1, def: 0.1, ctr: 0.1, bt: 0.1 } },

  // ── SECTION 2: 3-CB SYSTEMS ──
  { roles: ["CD_D", "CD_D", "CD_D"], ratings: { pos: 0.1, press: 0.6, def: 1.0, ctr: 1.0, bt: 1.0 } },
  { roles: ["WCB_D", "CD_D", "WCB_D"], ratings: { pos: 0.6, press: 0.6, def: 1.0, ctr: 1.0, bt: 1.0 } },
  { roles: ["WCB_S", "CD_D", "WCB_S"], ratings: { pos: 1.0, press: 1.0, def: 0.6, ctr: 0.6, bt: 1.0 } },
  { roles: ["WCB_A", "CD_D", "WCB_A"], ratings: { pos: 1.0, press: 0.6, def: 0.1, ctr: 0.1, bt: 0.6 } },
  { roles: ["BPD_D", "CD_D", "BPD_D"], ratings: { pos: 1.0, press: 0.6, def: 0.6, ctr: 0.6, bt: 1.0 } },
  { roles: ["BPD_D", "BPD_D", "CD_D"], ratings: { pos: 1.0, press: 0.6, def: 0.1, ctr: 0.1, bt: 1.0 } },
  { roles: ["WCB_S", "CD_D", "CD_CO"], ratings: { pos: 0.6, press: 0.6, def: 1.0, ctr: 0.6, bt: 1.0 } },
  { roles: ["WCB_A", "CD_D", "CD_CO"], ratings: { pos: 1.0, press: 1.0, def: 0.1, ctr: 0.6, bt: 0.6 } },
  { roles: ["CD_D", "Libero_S", "CD_D"], ratings: { pos: 1.0, press: 1.0, def: 0.1, ctr: 0.1, bt: 0.6 } },
  { roles: ["BPD_D", "Libero_S", "CD_D"], ratings: { pos: 1.0, press: 0.6, def: 0.1, ctr: 0.1, bt: 0.6 } },
  { roles: ["BPD_D", "CD_D", "WCB_S"], ratings: { pos: 1.0, press: 1.0, def: 0.6, ctr: 0.6, bt: 1.0 } },
  { roles: ["WCB_S", "BPD_D", "WCB_A"], ratings: { pos: 1.0, press: 1.0, def: 0.1, ctr: 0.1, bt: 0.6 } }
];
