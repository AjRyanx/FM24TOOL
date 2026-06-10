// ════════════════════════════════════════════════════════════════
// Zone Grid: 5 columns × 4 rows = 20 zones
// Columns: 0=LWide, 1=LHalf, 2=Centre, 3=RHalf, 4=RWide
// Rows:    0=Final3rd, 1=MidAtt, 2=MidDef, 3=Def3rd
// ════════════════════════════════════════════════════════════════

var ZONE_GRID = {
  // Each pitch slot → primary zone
  slotToZone: {
    GK:   "3_2",
    DL:   "3_0", DCL: "3_1", DC: "3_2", DCR: "3_3", DR: "3_4",
    WBL:  "2_0", DMCL:"2_1", DMC: "2_2", DMCR:"2_3", WBR: "2_4",
    ML:   "2_0", MCL: "2_1", MC:  "2_2", MCR: "2_3", MR:  "2_4",
    AML:  "1_0", AMCL:"1_1", AMC: "1_2", AMCR:"1_3", AMR: "1_4",
    STCL: "0_1", STC: "0_2", STCR:"0_3"
  },

  zoneLabel: {
    "0_1": "Final_LHalf",    "0_2": "Final_Centre",    "0_3": "Final_RHalf",
    "1_0": "MidAtt_LWide",   "1_1": "MidAtt_LHalf",    "1_2": "MidAtt_Centre",
    "1_3": "MidAtt_RHalf",   "1_4": "MidAtt_RWide",
    "2_0": "MidDef_LWide",   "2_1": "MidDef_LHalf",    "2_2": "MidDef_Centre",
    "2_3": "MidDef_RHalf",   "2_4": "MidDef_RWide",
    "3_0": "Def_LWide",      "3_1": "Def_LHalf",       "3_2": "Def_Centre",
    "3_3": "Def_RHalf",      "3_4": "Def_RWide"
  },

  isGoalZone: function(z) {
    return z === "0_2" || z === "3_2";
  },

  isWideCol: function(c) {
    return c === 0 || c === 4;
  },

  isHalfCol: function(c) {
    return c === 1 || c === 3;
  },

  parseZone: function(z) {
    var p = z.split("_");
    return { row: parseInt(p[0], 10), col: parseInt(p[1], 10) };
  },

  zoneId: function(row, col) {
    return row + "_" + col;
  }
};
