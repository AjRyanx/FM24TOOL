// ─── PAIRING RULES — LAYER 1 ───
// Unified rule schema for all role-to-role pairing evaluations.
// Three sections:
//   SECTION A — The 30 New Critical Pairs (NP-01 to NP-30)
//   SECTION B — Pairing Matrix Builder (O(1) lookup from all sources)
//   SECTION C — Helpers for attribute-derived rules
//
// Compatibility scale:  +10 GOOD, -3 to -5 WARNING, -8 BAD, -20 CRITICAL

var VALIDITY = { GOOD: "GOOD", WARNING: "WARNING", BAD: "BAD", CRITICAL: "CRITICAL" };
var SEVERITY_WEIGHTS = { GOOD: 1, WARNING: -3, BAD: -8, CRITICAL: -20 };

// ════════════════════════════════════════════════════════════════════
// SECTION A — THE 30 NEW CRITICAL PAIRS
// ════════════════════════════════════════════════════════════════════

var NP_RULES = [
  // ── VERTICAL AXIS: AM <-> DM (NP-01 to NP-05) ──
  {
    id: "NP-01", type: "am_dm", relationship: "vertical_press",
    pair: ["Anchor_D", "Trequartista_A"],
    archetype_fit: [],
    validity: "CRITICAL", score: -20,
    explanation: "Static mismatch: Anchor_D never leaves the CDM line and Treq_A never presses. No press link between DM and AM."
  },
  {
    id: "NP-02", type: "am_dm", relationship: "double_roam",
    pair: ["Regista_S", "SS_A"],
    archetype_fit: [],
    validity: "WARNING", score: -5,
    explanation: "Double roam overload: Regista_S roams from deep while SS_A roams from AM. Central shape disintegrates."
  },
  {
    id: "NP-03", type: "am_dm", relationship: "space_conflict",
    pair: ["HB_D", "Enganche_S"],
    archetype_fit: [],
    validity: "WARNING", score: -4,
    explanation: "Space conflict: HB_D drops into backline and Enganche_S holds the hole. Both vacate midfield centre."
  },
  {
    id: "NP-04", type: "am_dm", relationship: "press_compensation",
    pair: ["BWM_D", "Trequartista_A"],
    archetype_fit: ["Aggressive_High_Press", "Balanced"],
    validity: "GOOD", score: 10,
    explanation: "Press compensation: BWM_D covers the press load while Treq_A focuses on creation."
  },
  {
    id: "NP-05", type: "am_dm", relationship: "classic_balance",
    pair: ["DM_D", "AM_A"],
    archetype_fit: ["Balanced", "Pragmatic_System_Adapter"],
    validity: "GOOD", score: 10,
    explanation: "Classic 4-2-3-1 balance: DM_D holds while AM_A attacks the 10 space."
  },

  // ── WIDE FORWARD <-> CM SAME SIDE (NP-06 to NP-10) ──
  {
    id: "NP-06", type: "wa_cm_sameside", relationship: "half_space_collision",
    pair: ["Mezzala_A", "IF_A"],
    archetype_fit: [],
    validity: "CRITICAL", score: -20,
    explanation: "Half-space collision: Mezzala_A and IF_A both attack the left half-space on attack duty. Channel congestion."
  },
  {
    id: "NP-07", type: "wa_cm_sameside", relationship: "cover_provided",
    pair: ["CM_D", "IF_A"],
    archetype_fit: ["Balanced", "Defensive_Organiser"],
    validity: "GOOD", score: 10,
    explanation: "Cover provided: CM_D stays deep and provides defensive cover for IF_A's attacking runs."
  },
  {
    id: "NP-08", type: "wa_cm_sameside", relationship: "run_timing",
    pair: ["BBM_S", "IW_A"],
    archetype_fit: ["Aggressive_High_Press", "Balanced"],
    validity: "GOOD", score: 10,
    explanation: "Complementary run timing: BBM_S arrives late while IW_A cuts inside early."
  },
  {
    id: "NP-09", type: "wa_cm_sameside", relationship: "width_protected",
    pair: ["Carrilero_S", "Winger_S"],
    archetype_fit: ["Defensive_Organiser", "Balanced"],
    validity: "GOOD", score: 10,
    explanation: "Width protected: Carrilero_S covers the flank channel while Winger_S stays wide."
  },
  {
    id: "NP-10", type: "wa_cm_sameside", relationship: "creative_overload",
    pair: ["AP_S", "IF_S"],
    archetype_fit: [],
    validity: "WARNING", score: -4,
    explanation: "Creative overload with no runner: AP_S and IF_S both create from the half-space with no penetrating run."
  },

  // ── FB <-> WINGER INTERACTIONS (NP-11 to NP-15) ──
  {
    id: "NP-11", type: "fb_wa", relationship: "overlap_balance",
    pair: ["WB_A", "Winger_S"],
    archetype_fit: ["Balanced", "Counter_Attacker"],
    validity: "GOOD", score: 10,
    explanation: "Overlap balance: WB_A overlaps while Winger_S holds width on support duty."
  },
  {
    id: "NP-12", type: "fb_wa", relationship: "exposed_channel",
    pair: ["CWB_A", "IF_A"],
    archetype_fit: [],
    validity: "CRITICAL", score: -20,
    explanation: "Both attack: CWB_A bombs forward and IF_A cuts inside. Full flank channel left exposed."
  },
  {
    id: "NP-13", type: "fb_wa", relationship: "narrow_stack",
    pair: ["IWB_A", "IW_A"],
    archetype_fit: [],
    validity: "CRITICAL", score: -20,
    explanation: "Narrow stack: IWB_A inverts to midfield while IW_A cuts inside. No flank cover whatsoever."
  },
  {
    id: "NP-14", type: "fb_wa", relationship: "conservative_support",
    pair: ["FB_D", "Winger_A"],
    archetype_fit: ["Defensive_Organiser", "Counter_Attacker"],
    validity: "GOOD", score: 10,
    explanation: "Conservative support: FB_D stays deep providing defensive base for Winger_A's attacking runs."
  },
  {
    id: "NP-15", type: "fb_wa", relationship: "width_absent",
    pair: ["NFB_D", "WTM_S"],
    archetype_fit: [],
    validity: "WARNING", score: -3,
    explanation: "Width absent: NFB_D never overlaps and WTM_S doesn't drift wide. No natural width on this flank."
  },

  // ── DOUBLE AM LOGIC (NP-16 to NP-20) ──
  {
    id: "NP-16", type: "double_am", relationship: "double_roam_no_shape",
    pair: ["SS_A", "Trequartista_A"],
    archetype_fit: [],
    validity: "CRITICAL", score: -20,
    explanation: "Both roam: SS_A and Trequartista_A both roam freely. No shape retained in AM strata."
  },
  {
    id: "NP-17", type: "double_am", relationship: "double_static",
    pair: ["AM_S", "Enganche_S"],
    archetype_fit: [],
    validity: "WARNING", score: -5,
    explanation: "Double static creator: AM_S and Enganche_S both hold position. No runner from AM to stretch defence."
  },
  {
    id: "NP-18", type: "double_am", relationship: "runner_creator",
    pair: ["SS_A", "AP_AMC_S"],
    archetype_fit: ["Possession_Tactician", "Aggressive_High_Press"],
    validity: "GOOD", score: 10,
    explanation: "Runner + creator balance: SS_A provides runs in behind while AP_AMC_S orchestrates."
  },
  {
    id: "NP-19", type: "double_am", relationship: "broken_press",
    pair: ["Trequartista_A", "Enganche_S"],
    archetype_fit: [],
    validity: "BAD", score: -8,
    explanation: "Double static with broken press: neither Treq_A nor Enganche_S presses. AM line is a defensive sieve."
  },
  {
    id: "NP-20", type: "double_am", relationship: "no_defensive_am",
    pair: ["AM_A", "AM_A"],
    archetype_fit: [],
    validity: "BAD", score: -8,
    explanation: "No defensive AM coverage: both AMs on attack duty. No one tracks back to support midfield."
  },

  // ── STRIKER <-> DEFENSIVE LINE (NP-21 to NP-25) ──
  // Note: these combine role + instruction. Low_DL/Deep_Block = defensiveLine "Lower"/"Much Lower"
  // High_DL/High_Line = defensiveLine "Higher"/"Much Higher". Evaluated in pairingEngine.
  {
    id: "NP-21", type: "st_dl", relationship: "no_space_to_run",
    pair: ["AF_A", "DL_LOW"],
    archetype_fit: [],
    validity: "BAD", score: -8,
    explanation: "AF_A needs space to run into but the defensive line is deep. No space behind for through balls."
  },
  {
    id: "NP-22", type: "st_dl", relationship: "offside_trap_risk",
    pair: ["Poacher_A", "DL_HIGH"],
    archetype_fit: [],
    validity: "WARNING", score: -3,
    explanation: "Poacher_A depends on quick breaks from deep; a high line compresses space and risks offside."
  },
  {
    id: "NP-23", type: "st_dl", relationship: "no_drop_space",
    pair: ["F9_S", "DL_DEEP"],
    archetype_fit: [],
    validity: "WARNING", score: -4,
    explanation: "F9_S needs space to drop into between the lines. A deep defensive block eliminates that space."
  },
  {
    id: "NP-24", type: "st_dl", relationship: "aerial_isolation",
    pair: ["TF_A", "DL_HIGH"],
    archetype_fit: [],
    validity: "WARNING", score: -3,
    explanation: "TF_A is isolated aerially when the line pushes high. No midfield support close enough for knockdowns."
  },
  {
    id: "NP-25", type: "st_dl", relationship: "pressing_wasted",
    pair: ["PF_D", "DL_DEEP"],
    archetype_fit: [],
    validity: "BAD", score: -8,
    explanation: "PF_D's pressing is wasted in a deep block. The team sits deep so there's no pressing trigger."
  },

  // ── GK <-> FIRST DEFENDER (NP-26 to NP-30) ──
  {
    id: "NP-26", type: "gk_dc", relationship: "line_height_contradiction",
    pair: ["SK_A", "NCB_D"],
    archetype_fit: [],
    validity: "CRITICAL", score: -20,
    explanation: "Line height contradiction: SK_A wants to sweep high while NCB_D sits deep. Defensive line is torn."
  },
  {
    id: "NP-27", type: "gk_dc", relationship: "distribution_mismatch",
    pair: ["GK_D", "BPD_ST"],
    archetype_fit: [],
    validity: "WARNING", score: -4,
    explanation: "Distribution mismatch: BPD_ST wants to play out from the back but GK_D punts long."
  },
  {
    id: "NP-28", type: "gk_dc", relationship: "controlled_sweep",
    pair: ["SK_S", "CD_CO"],
    archetype_fit: ["Possession_Tactician", "Balanced"],
    validity: "GOOD", score: 10,
    explanation: "Controlled risk: SK_S sweeps when safe and CD_CO provides deep cover. Balanced high-line pairing."
  },
  {
    id: "NP-29", type: "gk_dc", relationship: "gap_behind",
    pair: ["GK_D", "Libero_S"],
    archetype_fit: [],
    validity: "WARNING", score: -4,
    explanation: "Gap behind: Libero_S steps into midfield, GK_D stays on line. Vacant space between them."
  },
  {
    id: "NP-30", type: "gk_dc", relationship: "aggressive_high_line",
    pair: ["SK_A", "CD_ST"],
    archetype_fit: ["Aggressive_High_Press", "Possession_Tactician"],
    validity: "GOOD", score: 10,
    explanation: "Aggressive high-line pairing: SK_A sweeps aggressively behind CD_ST who steps out to engage."
  }
];

// Also include striker-DL pairs that reference instruction context
var NP_INSTRUCTION_PAIRS = [
  { rule: "NP-21", role: "AF_A", checkLowDL: true },
  { rule: "NP-22", role: "Poacher_A", checkHighDL: true },
  { rule: "NP-23", role: "F9_S", checkDeepBlock: true },
  { rule: "NP-24", role: "TF_A", checkHighLine: true },
  { rule: "NP-25", role: "PF_D", checkDeepBlock: true }
];

// ════════════════════════════════════════════════════════════════════
// SECTION B — PAIRING MATRIX BUILDER
// ════════════════════════════════════════════════════════════════════

// Builds an O(1) compatibility lookup:  comp_matrix[type][roleA][roleB]
// from RELATIONSHIP_PAIRINGS + CB_COMBOS + NP_RULES.
// Output is exposed globally as PAIRING_MATRIX.

function buildPairingMatrix() {
  var matrix = {};

  // 1. Seed from RELATIONSHIP_PAIRINGS (compat 0.0-1.0 mapped to scores)
  if (typeof RELATIONSHIP_PAIRINGS !== "undefined") {
    var relTypes = Object.keys(RELATIONSHIP_PAIRINGS);
    for (var ri = 0; ri < relTypes.length; ri++) {
      var type = relTypes[ri];
      var pairs = RELATIONSHIP_PAIRINGS[type];
      if (!Array.isArray(pairs)) continue;
      ensureType(matrix, type);
      for (var pi = 0; pi < pairs.length; pi++) {
        var p = pairs[pi];
        if (!p.a || !p.b || p.compat === undefined) continue;
        var score = compatToScore(p.compat, p.archetypes);
        if (!matrix[type][p.a]) matrix[type][p.a] = {};
        if (!matrix[type][p.b]) matrix[type][p.b] = {};
        matrix[type][p.a][p.b] = { score: score, archetypes: p.archetypes || [] };
        matrix[type][p.b][p.a] = { score: score, archetypes: p.archetypes || [] };
      }
    }
  }

  // 2. Convert CB_COMBOS into cb_pair type
  if (typeof CB_COMBOS !== "undefined") {
    ensureType(matrix, "cb_pair");
    for (var ci = 0; ci < CB_COMBOS.length; ci++) {
      var combo = CB_COMBOS[ci];
      if (!Array.isArray(combo.roles) || combo.roles.length < 2) continue;
      // Add all pairwise combinations within the CB unit
      for (var ai = 0; ai < combo.roles.length; ai++) {
        for (var bi = ai + 1; bi < combo.roles.length; bi++) {
          var a = combo.roles[ai], b = combo.roles[bi];
          if (!matrix["cb_pair"][a]) matrix["cb_pair"][a] = {};
          if (!matrix["cb_pair"][b]) matrix["cb_pair"][b] = {};
          // Derive score from ratings average
          var ratings = combo.ratings || {};
          var avgRating = 0, count = 0;
          for (var rk in ratings) { avgRating += ratings[rk]; count++; }
          avgRating = count > 0 ? avgRating / count : 0.5;
          var score = compatToScore(avgRating, []);
          matrix["cb_pair"][a][b] = { score: score, archetypes: [] };
          matrix["cb_pair"][b][a] = { score: score, archetypes: [] };
        }
      }
    }
  }

  // 3. Convert MIDFIELD_COMBOS into mid_pair type
  if (typeof MIDFIELD_COMBOS !== "undefined") {
    ensureType(matrix, "mid_pair");
    for (var mi = 0; mi < MIDFIELD_COMBOS.length; mi++) {
      var mcombo = MIDFIELD_COMBOS[mi];
      var allMidRoles = (mcombo.dm || []).concat(mcombo.cm || []);
      if (allMidRoles.length < 2) continue;
      for (var mi_a = 0; mi_a < allMidRoles.length; mi_a++) {
        for (var mi_b = mi_a + 1; mi_b < allMidRoles.length; mi_b++) {
          var ma = allMidRoles[mi_a], mb = allMidRoles[mi_b];
          if (!matrix["mid_pair"][ma]) matrix["mid_pair"][ma] = {};
          if (!matrix["mid_pair"][mb]) matrix["mid_pair"][mb] = {};
          // Score from archetype tag count (more tags = more flexible = higher base compat)
          var archTags = mcombo.archetypes || [];
          var tagScore = Math.min(1, 0.5 + archTags.length * 0.1);
          matrix["mid_pair"][ma][mb] = { score: compatToScore(tagScore, archTags), archetypes: archTags };
          matrix["mid_pair"][mb][ma] = { score: compatToScore(tagScore, archTags), archetypes: archTags };
        }
      }
    }
  }

  // 4. Overlay NP_RULES into matrix (these take priority)
  for (var npi = 0; npi < NP_RULES.length; npi++) {
    var rule = NP_RULES[npi];
    if (!rule.pair || rule.pair.length < 2) continue;
    var a = rule.pair[0], b = rule.pair[1];
    // Skip instruction-level pairs (DL_HIGH, DL_LOW etc)
    if (a.indexOf("DL_") === 0 || b.indexOf("DL_") === 0) continue;
    var type = rule.type;
    ensureType(matrix, type);
    if (!matrix[type][a]) matrix[type][a] = {};
    if (!matrix[type][b]) matrix[type][b] = {};
    var npScore = SEVERITY_WEIGHTS[rule.validity] || 0;
    matrix[type][a][b] = { score: npScore, archetypes: rule.archetype_fit || [], npId: rule.id, severity: rule.validity, explanation: rule.explanation };
    matrix[type][b][a] = { score: npScore, archetypes: rule.archetype_fit || [], npId: rule.id, severity: rule.validity, explanation: rule.explanation };
  }

  return matrix;
}

function ensureType(matrix, type) {
  if (!matrix[type]) matrix[type] = {};
}

// Convert 0.0-1.0 compat to score (-20 to +20)
function compatToScore(compat, archetypes) {
  // compat 0.0 -> -15, 0.5 -> 0, 1.0 -> 10
  var score = Math.round(compat * 25 - 15);
  // Ensure min of GOOD for high compat
  if (compat >= 0.8 && score < 5) score = 5;
  if (compat <= 0.2 && score > -8) score = -8;
  return score;
}

// ════════════════════════════════════════════════════════════════════
// SECTION C — PAIRING LOOKUP HELPERS
// ════════════════════════════════════════════════════════════════════

// Get the pair score for two role IDs. Checks ALL relationship types.
function lookupPairScore(matrix, roleA, roleB) {
  if (!matrix) return 0;
  var best = null;
  var typeKeys = Object.keys(matrix);
  for (var ti = 0; ti < typeKeys.length; ti++) {
    var type = typeKeys[ti];
    var byA = matrix[type][roleA];
    if (!byA || !byA[roleB]) continue;
    var entry = byA[roleB];
    // NP entries take highest priority
    if (entry.npId && (!best || best.severity === "GOOD")) {
      best = entry;
    } else if (!best || entry.score < best.score) {
      best = entry;
    }
  }
  return best || { score: 0, archetypes: [], severity: null };
}

// Get all NP rules that apply to a pair
function lookupNPRules(roleA, roleB) {
  var results = [];
  for (var i = 0; i < NP_RULES.length; i++) {
    var rule = NP_RULES[i];
    if (!rule.pair || rule.pair.length < 2) continue;
    var a = rule.pair[0], b = rule.pair[1];
    // Skip instruction-level pairs
    if (a.indexOf("DL_") === 0 || b.indexOf("DL_") === 0) continue;
    if ((a === roleA && b === roleB) || (a === roleB && b === roleA)) {
      results.push(rule);
    }
  }
  return results;
}
