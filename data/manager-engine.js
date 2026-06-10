// ─── MANAGER ENGINE ───
// Maps FM24 manager attributes to tactical decisions.
// No AI — all template-based.

// ─── SECTION 1: ATTRIBUTE NORMALIZATION ───

function normalizeAttr(value, max) {
  if (max === undefined) max = 20;
  var clamped = Math.max(1, Math.min(max, value === undefined || value === null ? 1 : value));
  return clamped / max;
}

function isAntiMetaRole(roleId) {
  var antiMeta = {
    "Enganche_S": true,
    "Trequartista_A": true,
    "TQ_WA_A": true,
    "NCB_D": true,
    "NCB_ST": true,
    "NCB_CO": true,
    "WTM_S": true,
    "WTM_A": true,
    "Poacher_A": true,
    "TF_S": true,
    "TF_A": true,
    "CD_ST": true,
    "BPD_ST": true,
    "WCB_ST": true,
    "NFB_D": true
  };
  return !!antiMeta[roleId];
}

function isMetaRole(roleId) {
  var meta = {
    "AF_A": true,
    "SV_A": true,
    "IF_S": true,
    "IF_A": true,
    "IW_S": true,
    "IW_A": true,
    "IW_WM_S": true,
    "IW_WM_A": true,
    "Anchor_D": true,
    "IWB_S": true,
    "IWB_A": true,
    "IWB_D": true,
    "IFB_D": true
  };
  return !!meta[roleId];
}

// ─── SECTION 2: PLAYING MENTALITY → TACTIC MENTALITY ───

var MENTALITY_MAP = {
  "Very Cautious": "Defensive",
  "Cautious": "Cautious",
  "Balanced": "Balanced",
  "Attacking": "Positive",
  "Adventurous": "Attacking"
};

function resolveMentality(manager) {
  var raw = manager["Playing Mentality"];
  if (raw && MENTALITY_MAP[raw]) return MENTALITY_MAP[raw];
  var att = normalizeAttr(manager.Att);
  if (att >= 0.7) return "Positive";
  if (att >= 0.5) return "Balanced";
  if (att >= 0.3) return "Cautious";
  return "Defensive";
}

// ─── SECTION 3: PREFERRED FORMATION → APP FORMATION ───

var FM_FORMATION_MAP = {
  "4-2-3-1 DM AM Wide": "4-2-3-1",
  "4-3-3 DM Wide": "4-3-3 DM",
  "4-4-2": "4-4-2",
  "4-4-2 Diamond Narrow": "4-4-2",
  "5-3-2 DM WB": "5-3-2",
  "5-2-1-2 DM AM": "4-1-4-1",
  "4-3-2-1 DM AM Narrow": "4-3-2-1",
  "4-2-4 DM Wide": "4-2-4 DM",
  "5-2-3 DM Wide": "3-4-3",
  "5-2-2-1 DM AM": "5-3-2",
  "4-5-1": "4-5-1",
  "4-1-4-1": "4-1-4-1",
  "3-4-3 DM Wide": "3-4-3",
  "3-4-2-1 DM AM": "3-4-2-1"
};

var VALID_FORMATIONS = {
  "4-4-2": true, "3-5-2": true,
  "4-2-3-1": true, "5-3-2": true, "4-1-4-1": true, "4-3-3 DM": true,
  "4-2-4 DM": true, "3-4-3": true, "4-5-1": true, "4-3-2-1": true, "3-4-2-1": true
};

// Modern Game formation popularity rankings (1 = most popular, 10 = least popular)
var FORMATION_POPULARITY_RANKS = {
  "4-3-3 DM": 1, // treated as 4-3-3 variant (dominant at club level)
  "4-2-3-1": 2,
  "4-4-2": 3,
  "3-4-3": 4,
  "3-5-2": 5,
  "4-1-4-1": 6,
  "3-4-2-1": 7,
  "4-5-1": 8,
  "5-3-2": 9,
  "4-3-2-1": 10
};

// ─── FORMATION FAMILIES (fuzzy matching + squad adaptation) ───

var FORMATION_FAMILIES = {
  "back-three": ["3-5-2", "5-3-2", "3-4-3", "3-4-2-1"],
  "flat-four": ["4-4-2", "4-5-1"],
  "dm-single": ["4-3-3 DM", "4-1-4-1", "4-3-2-1"],
  "cm-three": [],
  "dm-double": ["4-2-3-1", "4-2-4 DM", "3-4-3", "3-4-2-1"]
};

// Philosophy ↔ formation compatibility (0 = incoherent, 1 = ideal)
var FORMATION_PHILOSOPHY_FIT = {
  "4-3-3 DM":        { pos: 0.95, press: 1.00, def: 0.20, ctr: 0.25, bal: 0.80, psa: 0.75 },
  "4-2-3-1":         { pos: 0.95, press: 0.30, def: 0.75, ctr: 0.75, bal: 0.95, psa: 0.95 },
  "4-4-2":           { pos: 0.20, press: 0.70, def: 0.95, ctr: 0.95, bal: 0.95, psa: 0.30 },
  "4-1-4-1":         { pos: 0.20, press: 0.20, def: 0.95, ctr: 0.75, bal: 0.95, psa: 0.95 },
  "3-5-2":           { pos: 0.95, press: 0.20, def: 0.95, ctr: 0.25, bal: 0.75, psa: 0.95 },
  "5-3-2":           { pos: 0.20, press: 0.20, def: 0.95, ctr: 0.95, bal: 0.75, psa: 0.20 },
  "4-2-4 DM":        { pos: 0.95, press: 0.95, def: 0.20, ctr: 0.95, bal: 0.20, psa: 0.75 },
  "3-4-3":           { pos: 0.95, press: 0.95, def: 0.20, ctr: 0.25, bal: 0.75, psa: 0.95 },
  "4-5-1":           { pos: 0.20, press: 0.20, def: 0.95, ctr: 0.75, bal: 0.75, psa: 0.95 },
  "4-3-2-1":         { pos: 0.95, press: 0.20, def: 0.20, ctr: 0.20, bal: 0.95, psa: 0.75 },
  "3-4-2-1":         { pos: 0.95, press: 0.75, def: 0.20, ctr: 0.25, bal: 0.75, psa: 0.95 }
};

function getPhilosophyFormationKey(philosophy) {
  if (philosophy === "possession-oriented tactician") return "pos";
  if (philosophy === "aggressive high-press tactician") return "press";
  if (philosophy === "disciplined defensive organiser") return "def";
  if (philosophy === "direct counter-attacker") return "ctr";
  if (philosophy === "pragmatic system-adapter") return "psa";
  return "bal";
}

function getFormationPhilosophyFit(formation, philosophy) {
  var row = FORMATION_PHILOSOPHY_FIT[formation];
  if (!row) return 0.6;
  var key = getPhilosophyFormationKey(philosophy);
  return row[key] !== undefined ? row[key] : 0.6;
}

function getFormationFamily(formation) {
  if (!formation) return null;
  for (var fam in FORMATION_FAMILIES) {
    if (FORMATION_FAMILIES.hasOwnProperty(fam) && FORMATION_FAMILIES[fam].indexOf(formation) !== -1) {
      return fam;
    }
  }
  return null;
}

function scoreSquadForFormationFamily(squad, family) {
  if (!family || !FORMATION_FAMILIES[family]) return 0;
  var members = FORMATION_FAMILIES[family];
  var bestScore = 0;
  for (var f = 0; f < members.length; f++) {
    var formDef = FORMATIONS[members[f]];
    if (!formDef) continue;
    var total = 0;
    var count = 0;
    formDef.slots.forEach(function (sid) {
      var def = GLOBAL_PITCH_SLOTS[sid];
      if (!def) return;
      var strata = def.strata;
      var strataCount = 0;
      for (var i = 0; i < squad.length; i++) {
        if (squad[i].strata && squad[i].strata.indexOf(strata) !== -1) strataCount++;
      }
      total += Math.min(1, strataCount / 2);
      count++;
    });
    var familyScore = count > 0 ? total / count : 0;
    if (familyScore > bestScore) bestScore = familyScore;
  }
  return bestScore;
}

function resolveFormation(manager, squad, dna, philosophy) {
  if (!dna) dna = getManagerDNA(manager.Name, manager);
  if (!philosophy) philosophy = deriveManagerPhilosophy(manager);
  var ada = normalizeAttr(manager.Ada || 0);
  var preferred = manager["Preferred Formation"];
  var mappedPreferred = (preferred && FM_FORMATION_MAP[preferred]) || null;

  // PREFERRED FORMATION SAFEGUARD: If the preferred formation is compatible and squad plays it comfortably (>= 0.40), stick to it
  if (mappedPreferred && VALID_FORMATIONS[mappedPreferred]) {
    var prefCompat = getFormationPhilosophyFit(mappedPreferred, philosophy);
    if (prefCompat >= 0.45) {
      if (squad && squad.length > 0) {
        var prefFamily = getFormationFamily(mappedPreferred);
        var prefFit = scoreSquadForFormationFamily(squad, prefFamily);
        if (prefFit >= 0.40) {
          return mappedPreferred;
        }
      } else {
        return mappedPreferred;
      }
    }
  }

  // LOW ADAPTABILITY (< 0.5): Force preferred formation if philosophy-compatible
  if (ada < 0.5 && mappedPreferred && VALID_FORMATIONS[mappedPreferred]) {
    if (getFormationPhilosophyFit(mappedPreferred, philosophy) >= 0.45) {
      return mappedPreferred;
    }
  }

  // Score formations from attributes
  var att = manager.Att || 0;
  var tacKnw = manager["Tac Knw"] || 0;
  var dis = manager.Dis || 0;
  var pressing = manager["Pressing Style"] || "";
  var pressingNum = pressing === "More Often" ? 1 : pressing === "Less Often" ? 0 : 0.5;
  var aggression = getAggressionPropensity(manager);

  var disNorm = dis / 20;
  var attNorm = att / 20;
  var tacNorm = tacKnw / 20;
  var adaNorm = ada / 20;
  var tecNorm = normalizeAttr(manager.Tec);

  var scores = {
    "4-3-3 DM": (pressingNum * 0.28 + attNorm * 0.28 + tacNorm * 0.24) * (0.85 + aggression * 0.15),
    "4-2-3-1": (attNorm * 0.35 + tacNorm * 0.35 + adaNorm * 0.3) * (0.85 + aggression * 0.3),
    "4-4-2": (disNorm * 0.25 + tacNorm * 0.25 + (1 - attNorm) * 0.25 + adaNorm * 0.25) * (1.0 - aggression * 0.1),
    "5-3-2": (disNorm * 0.5 + (1 - attNorm) * 0.3 + tacNorm * 0.2) * (1.15 - aggression * 0.3),
    "3-5-2": (pressingNum * 0.25 + tacNorm * 0.25 + attNorm * 0.2 + disNorm * 0.2 + adaNorm * 0.1) * (0.9 + aggression * 0.08),
    "4-1-4-1": (disNorm * 0.35 + tacNorm * 0.25 + (1 - attNorm) * 0.4) * (1.15 - aggression * 0.3),
    "4-2-4 DM": (pressingNum * 0.3 + attNorm * 0.35 + (1 - disNorm) * 0.2 + tacNorm * 0.15) * (0.9 + aggression * 0.2),
    "3-4-3": (pressingNum * 0.35 + attNorm * 0.3 + tacNorm * 0.2 + adaNorm * 0.15) * (0.95 + aggression * 0.15),
    "4-5-1": (disNorm * 0.45 + (1 - attNorm) * 0.35 + tacNorm * 0.2) * (1.1 - aggression * 0.25),
    "4-3-2-1": (tecNorm * 0.35 + tacNorm * 0.35 + disNorm * 0.15 + adaNorm * 0.15) * (0.9 + aggression * 0.05),
    "3-4-2-1": (tecNorm * 0.3 + tacNorm * 0.3 + attNorm * 0.2 + adaNorm * 0.2) * (0.9 + aggression * 0.1)
  };

  // Apply philosophy compatibility — blocks e.g. possession + 4-4-2
  for (var formName in scores) {
    if (!scores.hasOwnProperty(formName)) continue;
    var philFit = getFormationPhilosophyFit(formName, philosophy);
    scores[formName] *= philFit;
    if (philFit < 0.4) scores[formName] *= 0.5;
  }

  // Apply Modern Game Popularity and CA-based tactical trends
  var caNum = parseInt(manager.CA || manager.ca || 0, 10);
  var isElite = caNum >= 140;
  var isGrassroots = caNum < 120;

  for (var formName in scores) {
    if (!scores.hasOwnProperty(formName)) continue;
    var rank = FORMATION_POPULARITY_RANKS[formName] || 11;
    // Baseline popularity multiplier: higher popularity (lower rank) gets a slight boost
    // Rank 1: 1.12, Rank 2: 1.10, ..., Rank 10: 0.94, Rank 11+: 0.80
    var baseMult = rank <= 10 ? (1.14 - rank * 0.02) : 0.80;
    
    // CA-specific tactical trend adjustments
    var trendMult = 1.0;
    if (isElite) {
      // Back-threes are resurgent/growing in popularity at elite level
      if (formName === "3-4-3" || formName === "3-5-2" || formName === "3-4-2-1") {
        trendMult = 1.15;
      }
      // Pure 4-4-2 has faded significantly at elite level
      if (formName === "4-4-2") {
        trendMult = 0.70;
      }
    } else if (isGrassroots) {
      // 4-4-2 is the bread-and-butter of grassroots/lower-league
      if (formName === "4-4-2") {
        trendMult = 1.25;
      }
      // Back-threes are rarely implemented well in lower leagues
      if (formName === "3-4-3" || formName === "3-5-2" || formName === "3-4-2-1") {
        trendMult = 0.85;
      }
    }
    scores[formName] *= (baseMult * trendMult);
  }

  // DNA-driven formation variety
  var formKeys = Object.keys(scores);
  var jitterIdx = Math.floor(dna.seed * formKeys.length) % formKeys.length;
  scores[formKeys[jitterIdx]] *= 1.06;
  if (dna.formationLoyalty > 0.65 && mappedPreferred && VALID_FORMATIONS[mappedPreferred]) {
    var prefPhilFit = getFormationPhilosophyFit(mappedPreferred, philosophy);
    if (prefPhilFit >= 0.45) {
      scores[mappedPreferred] = (scores[mappedPreferred] || 0.4) * (1.0 + dna.formationLoyalty * 0.15);
    }
  }

  // MEDIUM ADAPTABILITY (0.5-0.74): Prefer preferred formation when compatible
  if (ada >= 0.5 && ada < 0.75 && mappedPreferred && VALID_FORMATIONS[mappedPreferred]) {
    var prefCompat = getFormationPhilosophyFit(mappedPreferred, philosophy);
    if (prefCompat >= 0.45) {
      if (squad && squad.length > 0) {
        var prefFamily = getFormationFamily(mappedPreferred);
        var prefFit = scoreSquadForFormationFamily(squad, prefFamily);
        if (prefFit >= 0.3) return mappedPreferred;
      } else {
        return mappedPreferred;
      }
    }
  }

  var bestForm = "4-2-3-1";
  var bestScore = 0.35;
  for (var form in scores) {
    if (scores.hasOwnProperty(form) && scores[form] > bestScore) {
      bestScore = scores[form];
      bestForm = form;
    }
  }

  // HIGH ADAPTABILITY (>= 0.75): Check if another formation family fits squad better
  if (ada >= 0.75 && squad && squad.length > 0) {
    var currentFamily = getFormationFamily(bestForm);
    var currentScore = scoreSquadForFormationFamily(squad, currentFamily);
    var bestFamily = currentFamily;
    var bestSquadScore = currentScore;

    for (var fam in FORMATION_FAMILIES) {
      if (!FORMATION_FAMILIES.hasOwnProperty(fam)) continue;
      var s = scoreSquadForFormationFamily(squad, fam);
      if (s > bestSquadScore) { bestSquadScore = s; bestFamily = fam; }
    }

    if (bestFamily && bestFamily !== currentFamily && bestSquadScore > currentScore + 0.15) {
      var candidates = FORMATION_FAMILIES[bestFamily];
      for (var f = 0; f < candidates.length; f++) {
        var cand = candidates[f];
        if (FORMATIONS[cand] && getFormationPhilosophyFit(cand, philosophy) >= 0.45) {
          bestForm = cand;
          break;
        }
      }
    }
  }

  return bestForm;
}

// ─── SECTION 4: ROLE PROFILES ───
// 4-dim vectors {att, tec, dis, press} (0-5 scale) describing
// "what kind of manager picks this role"
// Replaces old ROLE_BIASES system.

var ROLE_PROFILES = {
  // Goalkeepers
  GK_D: { att: 1, tec: 2, dis: 4, press: 1 },
  SK_D: { att: 2, tec: 3, dis: 3, press: 2 },
  SK_S: { att: 3, tec: 4, dis: 2, press: 2 },
  SK_A: { att: 5, tec: 4, dis: 1, press: 3 },

  // Centre-Backs
  CD_D: { att: 1, tec: 1, dis: 5, press: 2 },
  CD_ST: { att: 3, tec: 1, dis: 4, press: 3 },
  CD_CO: { att: 1, tec: 2, dis: 4, press: 1 },
  BPD_D: { att: 2, tec: 4, dis: 3, press: 2 },
  BPD_ST: { att: 3, tec: 3, dis: 3, press: 3 },
  BPD_CO: { att: 2, tec: 4, dis: 3, press: 1 },
  NCB_D: { att: 1, tec: 1, dis: 5, press: 1 },
  NCB_ST: { att: 1, tec: 1, dis: 5, press: 2 },
  NCB_CO: { att: 1, tec: 1, dis: 5, press: 1 },
  Libero_S: { att: 3, tec: 4, dis: 2, press: 2 },
  Libero_A: { att: 5, tec: 4, dis: 1, press: 3 },
  WCB_D: { att: 1, tec: 2, dis: 4, press: 2 },
  WCB_S: { att: 2, tec: 3, dis: 3, press: 2 },
  WCB_A: { att: 4, tec: 3, dis: 2, press: 3 },

  // Wide Defenders
  FB_D: { att: 1, tec: 2, dis: 4, press: 2 },
  FB_S: { att: 2, tec: 3, dis: 3, press: 2 },
  FB_A: { att: 4, tec: 3, dis: 2, press: 3 },
  NFB_D: { att: 1, tec: 1, dis: 5, press: 2 },
  WB_D: { att: 2, tec: 2, dis: 4, press: 3 },
  WB_S: { att: 3, tec: 3, dis: 2, press: 3 },
  WB_A: { att: 4, tec: 3, dis: 1, press: 4 },
  CWB_S: { att: 4, tec: 4, dis: 1, press: 3 },
  CWB_A: { att: 5, tec: 4, dis: 1, press: 4 },
  IWB_D: { att: 2, tec: 3, dis: 4, press: 2 },
  IWB_S: { att: 3, tec: 4, dis: 3, press: 3 },
  IWB_A: { att: 4, tec: 4, dis: 2, press: 4 },
  IFB_D: { att: 1, tec: 2, dis: 5, press: 2 },

  // Defensive Midfielders
  DM_D: { att: 1, tec: 2, dis: 5, press: 3 },
  DM_S: { att: 2, tec: 3, dis: 4, press: 3 },
  DLP_D: { att: 2, tec: 5, dis: 3, press: 2 },
  DLP_S: { att: 3, tec: 5, dis: 2, press: 2 },
  BWM_D: { att: 1, tec: 1, dis: 4, press: 5 },
  BWM_S: { att: 2, tec: 1, dis: 3, press: 5 },
  Anchor_D: { att: 1, tec: 2, dis: 5, press: 2 },
  HB_D: { att: 1, tec: 3, dis: 5, press: 2 },
  Regista_S: { att: 4, tec: 5, dis: 1, press: 2 },
  RPM_S: { att: 3, tec: 4, dis: 2, press: 4 },
  SV_S: { att: 3, tec: 2, dis: 3, press: 3 },
  SV_A: { att: 5, tec: 2, dis: 2, press: 4 },

  // Central Midfielders
  CM_D: { att: 1, tec: 2, dis: 4, press: 3 },
  CM_S: { att: 2, tec: 3, dis: 3, press: 3 },
  CM_A: { att: 4, tec: 3, dis: 2, press: 3 },
  BBM_S: { att: 3, tec: 2, dis: 3, press: 4 },
  AP_S: { att: 3, tec: 5, dis: 1, press: 1 },
  AP_A: { att: 4, tec: 5, dis: 1, press: 2 },
  Mezzala_S: { att: 3, tec: 4, dis: 2, press: 3 },
  Mezzala_A: { att: 5, tec: 4, dis: 1, press: 3 },
  Carrilero_S: { att: 2, tec: 3, dis: 4, press: 3 },
  DLP_CM_D: { att: 2, tec: 5, dis: 3, press: 2 },
  DLP_CM_S: { att: 2, tec: 5, dis: 2, press: 2 },
  BWM_CM_D: { att: 1, tec: 1, dis: 4, press: 5 },
  BWM_CM_S: { att: 2, tec: 1, dis: 3, press: 5 },
  RPM_CM_S: { att: 3, tec: 4, dis: 2, press: 4 },

  // Wide Midfielders
  WM_D: { att: 1, tec: 2, dis: 4, press: 3 },
  WM_S: { att: 2, tec: 3, dis: 3, press: 2 },
  WM_A: { att: 4, tec: 3, dis: 2, press: 3 },
  WM_Aut: { att: 2, tec: 3, dis: 3, press: 2 },
  DW_D: { att: 1, tec: 2, dis: 4, press: 5 },
  DW_S: { att: 2, tec: 2, dis: 3, press: 4 },
  Winger_WM_S: { att: 3, tec: 3, dis: 2, press: 2 },
  Winger_WM_A: { att: 5, tec: 3, dis: 1, press: 3 },
  IW_WM_S: { att: 3, tec: 4, dis: 2, press: 2 },
  IW_WM_A: { att: 5, tec: 4, dis: 1, press: 3 },
  WP_WM_S: { att: 2, tec: 5, dis: 2, press: 1 },
  WP_WM_A: { att: 3, tec: 5, dis: 1, press: 2 },

  // Wide Attackers
  Winger_S: { att: 3, tec: 3, dis: 2, press: 2 },
  Winger_A: { att: 5, tec: 3, dis: 1, press: 3 },
  IW_S: { att: 3, tec: 4, dis: 2, press: 2 },
  IW_A: { att: 5, tec: 4, dis: 1, press: 3 },
  IF_S: { att: 3, tec: 3, dis: 2, press: 3 },
  IF_A: { att: 5, tec: 3, dis: 1, press: 4 },
  RMD_A: { att: 4, tec: 2, dis: 1, press: 1 },
  WTM_S: { att: 1, tec: 1, dis: 4, press: 2 },
  WTM_A: { att: 2, tec: 1, dis: 3, press: 3 },
  AP_WA_S: { att: 3, tec: 5, dis: 1, press: 1 },
  AP_WA_A: { att: 4, tec: 5, dis: 1, press: 2 },
  TQ_WA_A: { att: 4, tec: 5, dis: 0, press: 0 },

  // Attacking Midfielders & Strikers
  AM_S: { att: 3, tec: 4, dis: 2, press: 2 },
  AM_A: { att: 5, tec: 4, dis: 1, press: 3 },
  Trequartista_A: { att: 4, tec: 5, dis: 0, press: 0 },
  Enganche_S: { att: 2, tec: 5, dis: 2, press: 1 },
  SS_A: { att: 5, tec: 3, dis: 1, press: 4 },
  AP_AMC_S: { att: 3, tec: 5, dis: 1, press: 1 },
  AP_AMC_A: { att: 4, tec: 5, dis: 1, press: 2 },
  DLF_S: { att: 2, tec: 4, dis: 2, press: 1 },
  DLF_A: { att: 4, tec: 4, dis: 1, press: 2 },
  AF_A: { att: 5, tec: 1, dis: 1, press: 2 },
  TF_S: { att: 1, tec: 1, dis: 4, press: 2 },
  TF_A: { att: 2, tec: 1, dis: 3, press: 3 },
  Poacher_A: { att: 5, tec: 1, dis: 2, press: 1 },
  CF_S: { att: 3, tec: 4, dis: 2, press: 2 },
  CF_A: { att: 4, tec: 4, dis: 1, press: 3 },
  PF_D: { att: 1, tec: 1, dis: 4, press: 5 },
  PF_S: { att: 2, tec: 2, dis: 3, press: 4 },
  PF_A: { att: 3, tec: 2, dis: 2, press: 5 },
  F9_S: { att: 3, tec: 5, dis: 1, press: 2 }
};

function decorateRoleProfiles() {
  Object.keys(ROLE_PROFILES).forEach(function (rid) {
    var base = ROLE_PROFILES[rid];

    // Default sub-categories
    var movement = { vertical: 0, width_drift: 0, roam: 0.2, hold_position: false, run_beyond_striker: false };
    var defensive = { track_back: 0.5, press_intensity: 0.5, cover_wide: false, cover_central: true };
    var attacking = { crosses: "mixed", through_balls: "mixed", dribble: 0.5, shot_frequency: 0, early_cross: false };
    var build_up = { short_pass_tendency: 0.5, ball_carry: 0.4, switch_play: false };
    var special = {
      inverted: false, drops_into_backline: false, static_creator: false,
      second_ball_runner: false, target_man: false, sweeper_keeper: false,
      press_monster: false, roaming: false, holder: false, distributor: false
    };

    // Apply rules based on role ID
    var isGK = rid.indexOf("GK") !== -1 || rid.indexOf("SK") !== -1;
    var isCB = rid.indexOf("CD") !== -1 || rid.indexOf("BPD") !== -1 || rid.indexOf("NCB") !== -1 || rid.indexOf("Libero") !== -1 || rid.indexOf("WCB") !== -1;
    var isWideDef = rid === "FB_D" || rid === "FB_S" || rid === "FB_A" || rid === "NFB_D" || rid === "WB_D" || rid === "WB_S" || rid === "WB_A" || rid.indexOf("CWB") !== -1 || rid.indexOf("IWB") !== -1 || rid === "IFB_D";
    var isDM = rid === "DM_D" || rid === "DM_S" || rid.indexOf("DLP_D") !== -1 || rid.indexOf("BWM_D") !== -1 || rid === "Anchor_D" || rid === "HB_D" || rid === "Regista_S" || rid === "RPM_S" || rid.indexOf("SV") !== -1;
    var isCM = rid.indexOf("CM") !== -1 || rid === "BBM_S" || rid.indexOf("AP_S") !== -1 || rid.indexOf("AP_A") !== -1 || rid.indexOf("Mezzala") !== -1 || rid === "Carrilero_S";
    var isWideAtt = rid.indexOf("Winger") !== -1 || rid.indexOf("IW") !== -1 || rid.indexOf("IF") !== -1 || rid === "RMD_A" || rid.indexOf("WTM") !== -1 || rid.indexOf("AP_WA") !== -1 || rid.indexOf("TQ_WA") !== -1;
    var isAM = rid === "AM_S" || rid === "AM_A" || rid.indexOf("Trequartista") !== -1 || rid.indexOf("Enganche") !== -1 || rid === "SS_A" || rid.indexOf("AP_AMC") !== -1;
    var isST = rid.indexOf("DLF") !== -1 || rid === "AF_A" || rid.indexOf("TF") !== -1 || rid === "Poacher_A" || rid.indexOf("CF") !== -1 || rid.indexOf("PF") !== -1 || rid === "F9_S";

    // 1. Goalkeepers
    if (isGK) {
      movement.vertical = -1.0;
      defensive.cover_central = true;
      if (rid.indexOf("SK") !== -1) {
        special.sweeper_keeper = true;
        build_up.short_pass_tendency = 0.8;
      }
    }

    // 2. Centre-Backs
    if (isCB) {
      movement.vertical = -0.8;
      movement.hold_position = true;
      defensive.track_back = 0.9;
      if (rid.indexOf("BPD") !== -1) {
        build_up.short_pass_tendency = 0.7;
        build_up.ball_carry = 0.6;
        special.distributor = true;
      }
      if (rid.indexOf("NCB") !== -1) {
        build_up.short_pass_tendency = 0.1;
        attacking.through_balls = "rare";
      }
      if (rid.indexOf("WCB") !== -1) {
        defensive.cover_wide = true;
        movement.width_drift = 0.4;
      }
      if (rid.indexOf("Libero") !== -1) {
        movement.vertical = -0.2;
        special.drops_into_backline = true;
        build_up.ball_carry = 0.8;
        movement.roam = 0.5;
      }
    }

    // 3. Wide Defenders
    if (isWideDef) {
      movement.vertical = -0.2;
      defensive.cover_wide = true;
      defensive.cover_central = false;
      movement.width_drift = 0.5;
      if (rid.indexOf("IWB") !== -1) {
        movement.width_drift = -0.8;
        special.inverted = true;
      }
      if (rid.indexOf("CWB") !== -1) {
        movement.width_drift = 0.8;
        movement.roam = 0.6;
        attacking.dribble = 0.8;
      }
      if (rid.indexOf("_A") !== -1) {
        movement.vertical = 0.3;
        movement.run_beyond_striker = true;
      }
      if (rid === "IFB_D") {
        movement.width_drift = -0.3;
        movement.hold_position = true;
      }
    }

    // 4. Defensive Midfielders
    if (isDM) {
      movement.vertical = -0.4;
      defensive.track_back = 0.8;
      if (rid.indexOf("_D") !== -1 || rid === "Anchor_D" || rid === "HB_D") {
        movement.hold_position = true;
        special.holder = true;
      }
      if (rid === "HB_D") {
        special.drops_into_backline = true;
      }
      if (rid === "Regista_S" || rid.indexOf("DLP") !== -1 || rid === "RPM_S") {
        build_up.short_pass_tendency = 0.9;
        build_up.switch_play = true;
        attacking.through_balls = "often";
      }
      if (rid.indexOf("BWM") !== -1) {
        defensive.press_intensity = 0.95;
        special.press_monster = true;
        build_up.short_pass_tendency = 0.3;
      }
    }

    // 5. Central Midfielders
    if (isCM) {
      movement.vertical = 0.0;
      if (rid.indexOf("_A") !== -1 || rid.indexOf("Mezzala_A") !== -1) {
        movement.vertical = 0.5;
        movement.run_beyond_striker = true;
      }
      if (rid.indexOf("Mezzala") !== -1) {
        movement.width_drift = -0.5;
        attacking.dribble = 0.7;
        defensive.cover_wide = true;
      }
      if (rid === "Carrilero_S") {
        movement.width_drift = 0.4;
        movement.hold_position = true;
      }
      if (rid.indexOf("AP") !== -1 || rid.indexOf("DLP") !== -1) {
        build_up.short_pass_tendency = 0.95;
        attacking.through_balls = "often";
      }
    }

    // 6. Wide Attackers
    if (isWideAtt) {
      movement.vertical = 0.4;
      movement.width_drift = 0.8;
      defensive.cover_wide = true;
      defensive.cover_central = false;
      if (rid.indexOf("IW") !== -1 || rid.indexOf("IF") !== -1 || rid === "RMD_A") {
        movement.width_drift = -0.8;
        special.inverted = true;
      }
      if (rid.indexOf("_A") !== -1 || rid === "RMD_A") {
        movement.run_beyond_striker = true;
      }
      if (rid.indexOf("WTM") !== -1) {
        special.target_man = true;
      }
    }

    // 7. Attacking Midfielders
    if (isAM) {
      movement.vertical = 0.4;
      if (rid.indexOf("Trequartista") !== -1) {
        movement.roam = 0.9;
        defensive.track_back = 0.1;
        defensive.press_intensity = 0.1;
      }
      if (rid.indexOf("Enganche") !== -1) {
        movement.hold_position = true;
        special.static_creator = true;
        defensive.track_back = 0.15;
      }
      if (rid === "SS_A") {
        movement.run_beyond_striker = true;
        special.second_ball_runner = true;
      }
    }

    // 8. Strikers
    if (isST) {
      movement.vertical = 0.8;
      defensive.track_back = 0.2;
      if (rid.indexOf("PF") !== -1) {
        defensive.press_intensity = 0.95;
        special.press_monster = true;
        defensive.track_back = 0.7;
      }
      if (rid.indexOf("TF") !== -1) {
        special.target_man = true;
        movement.hold_position = true;
      }
      if (rid === "F9_S" || rid.indexOf("DLF") !== -1) {
        movement.vertical = 0.3;
        movement.roam = 0.6;
        build_up.short_pass_tendency = 0.8;
        attacking.through_balls = "often";
      }
      if (rid === "Poacher_A") {
        movement.hold_position = true;
        attacking.through_balls = "rare";
        defensive.press_intensity = 0.25;
      }
    }

    // Duties overrides
    if (rid.indexOf("_D") !== -1) {
      movement.hold_position = true;
      defensive.track_back = Math.min(1.0, defensive.track_back + 0.15);
    }
    if (rid.indexOf("_A") !== -1) {
      movement.run_beyond_striker = true;
      defensive.track_back = Math.max(0.0, defensive.track_back - 0.2);
    }

    // Assign to profiles
    base.movement = movement;
    base.defensive = defensive;
    base.attacking = attacking;
    base.build_up = build_up;
    base.special = special;
  });
}

decorateRoleProfiles();

// ─── SECTION 5: ROLE SCORING & SELECTION ───
// Continuous weighted dot-product against manager's 4-dim vector.
// Replaces old getApplicableBiases / getBiasStrength / getPreferredRoleForStrata.

function getManagerDNA(managerName, manager) {
  if (!managerName) return { seed: 0.5, metaPreference: 0.5, riskTolerance: 0.5, formationLoyalty: 0.5, roleExperimentation: 0.5, flankBias: 0.5, intensityBias: 0.5 };
  var nameHash = 0;
  for (var i = 0; i < managerName.length; i++) {
    nameHash = managerName.charCodeAt(i) + ((nameHash << 6) - nameHash);
  }

  var contextHash = 0;
  if (manager) {
    var salt = (manager.Nat || "") + (manager.Club || "") + String(manager.Age || manager["D.O.B"] || 0) + (manager["Preferred Formation"] || "");
    for (var j = 0; j < salt.length; j++) {
      contextHash = salt.charCodeAt(j) + ((contextHash << 6) - contextHash);
    }
  }

  function mix(shiftName, shiftCtx) {
    var v1 = (nameHash >> shiftName) & 0xFF;
    var v2 = (contextHash >> shiftCtx) & 0xFF;
    return (v1 ^ v2) / 255;
  }

  var seedInt = (nameHash & 0x7FFFFFFF) ^ ((contextHash << 16) & 0x7FFFFFFF);

  return {
    seed: Math.abs(seedInt) / 0x7FFFFFFF,
    metaPreference: mix(4, 8),
    riskTolerance: mix(12, 20),
    formationLoyalty: mix(20, 4),
    roleExperimentation: mix(24, 0),
    flankBias: mix(8, 12),
    intensityBias: mix(16, 24)
  };
}

function getAggressionPropensity(manager) {
  var att = normalizeAttr(manager.Att || 10);
  var dis = normalizeAttr(manager.Dis || 10);
  var ment = manager["Playing Mentality"] || "Balanced";
  var mentMap = {
    "Very Cautious": 0.0, "Cautious": 0.25, "Balanced": 0.5,
    "Attacking": 0.75, "Adventurous": 1.0
  };
  var mentVal = mentMap[ment] !== undefined ? mentMap[ment] : 0.5;
  return Math.max(0, Math.min(1, att * 0.4 + (1 - dis) * 0.3 + mentVal * 0.3));
}

function roleScoreForManager(roleId, manager) {
  var profile = ROLE_PROFILES[roleId];
  if (!profile) return 0.5;

  var att = normalizeAttr(manager.Att);
  var tec = normalizeAttr(manager.Tec);
  var dis = normalizeAttr(manager.Dis);

  var raw = profile.att * att + profile.tec * tec + profile.dis * dis;
  var maxPossible = profile.att + profile.tec + profile.dis;
  var baseAffinity = maxPossible > 0 ? (raw / maxPossible) : 0.5;

  var pressing = manager["Pressing Style"] || "";
  var mgrPress = pressing === "More Often" ? 1.0 : pressing === "Less Often" ? 0.0 : 0.5;
  var rolePressNeed = (profile.press - 1) / 4;
  var pressDiff = Math.abs(mgrPress - rolePressNeed);
  var pressCompat = 1.0 - (pressDiff * 0.25);

  var aggression = getAggressionPropensity(manager);
  var roleAttShare = Math.min(1, profile.att / Math.max(1, profile.att + profile.dis));
  var propMod = 0.85 + aggression * roleAttShare * 0.3 + (1 - aggression) * (1 - roleAttShare) * 0.3;
  propMod = Math.max(0.7, Math.min(1.3, propMod));

  return baseAffinity * pressCompat * propMod;
}


var getStrataRoleIdsManagerOnly = (function () {
  return function (manager, strata, count, tacticInstructions, formation, philosophy, dna) {
    if (count < 1) return [];
    if (!philosophy) philosophy = deriveManagerPhilosophy(manager);
    if (!dna) dna = getManagerDNA(manager.Name, manager);

    var instr = tacticInstructions || {};
    var scored = [];
    for (var i = 0; i < FM24_ROLES.length; i++) {
      if (!roleHasStrata(FM24_ROLES[i], strata)) continue;
      if (isAntiMetaRole(FM24_ROLES[i].id)) continue;
      if (!isRoleAllowedForTactic(FM24_ROLES[i].id, null, formation)) continue;

      var affinity = roleScoreForManager(FM24_ROLES[i].id, manager);
      var managerWeight = 0.3 + affinity * 0.7;
      var roleVariety = 0.85 + dna.roleExperimentation * 0.3;
      var context = contextMultiplier(FM24_ROLES[i].id, manager, instr, formation);
      var metaPref = isMetaRole(FM24_ROLES[i].id) ? (0.85 + dna.metaPreference * 0.3) : 1.0;
      var philMult = philosophy ? philosophyRoleMultiplier(FM24_ROLES[i].id, philosophy) : 1.0;
      var realismMult = 1.0;
      if (strata === "WM") {
        realismMult = wmRealismMultiplier(FM24_ROLES[i].id);
      } else if (strata === "WA") {
        realismMult = waRealismMultiplier(FM24_ROLES[i].id);
      }
      scored.push({ roleId: FM24_ROLES[i].id, score: managerWeight * roleVariety * context * metaPref * philMult * realismMult });
    }
    scored.sort(function (a, b) { return b.score - a.score; });

    if (scored.length === 0) return [];
    if (count === 1) return [scored[0].roleId];

    // Uniqueness: weighted random pick for the first slot (encourages variety)
    var firstPoolSize = Math.min(scored.length, dna.roleExperimentation >= 0.7 ? 5 : dna.roleExperimentation >= 0.4 ? 3 : 2);
    var firstPool = scored.slice(0, firstPoolSize);
    var firstWeights = firstPool.map(function (_, i) { return firstPool.length - i; });
    var firstChoice = weightedPick(firstPool.map(function (s) { return s.roleId; }), firstWeights);
    var result = [firstChoice];
    var firstRole = getRoleById(firstChoice);
    var firstAbbr = firstRole ? firstRole.abbreviation : "";
    var firstDuty = firstRole ? firstRole.duty : "";

    var bestComplement = null;
    var bestComplementScore = -1;
    for (var j = 0; j < scored.length; j++) {
      var rid = scored[j].roleId;
      if (rid === firstChoice) continue;
      var role = getRoleById(rid);
      if (!role) continue;
      var s = scored[j].score;
      if (role.abbreviation === firstAbbr) s *= 0.5;
      if (role.duty === firstDuty) s *= 0.8;
      if (s > bestComplementScore) {
        bestComplementScore = s;
        bestComplement = rid;
      }
    }

    // Uniqueness for complement: weighted random pick from top 2-3 complements
    var complementPool = scored.filter(function (s) {
      return s.roleId !== firstChoice;
    });
    if (complementPool.length > 1 && dna.roleExperimentation > 0.3) {
      var compSize = Math.min(complementPool.length, dna.roleExperimentation >= 0.7 ? 4 : 2);
      var compCandidates = complementPool.slice(0, compSize).map(function (s) {
        var r = getRoleById(s.roleId);
        var sc = s.score;
        if (r && r.abbreviation === firstAbbr) sc *= 0.5;
        if (r && r.duty === firstDuty) sc *= 0.8;
        return { roleId: s.roleId, score: sc };
      });
      compCandidates.sort(function (a, b) { return b.score - a.score; });
      var compWeights = compCandidates.map(function (_, i) { return compCandidates.length - i; });
      bestComplement = weightedPick(compCandidates.map(function (c) { return c.roleId; }), compWeights);
    }

    result.push(bestComplement);
    return result;
  };
})();

// ─── CONTEXT-RESTRICTED ROLE SUPPRESSION ───

function contextMultiplier(roleId, manager, instructions, formation) {
  var mentality = instructions.mentality || "Balanced";
  var pressingStyle = manager["Pressing Style"] || "";
  var passingDirectness = instructions.passingDirectness || "";
  var triggerPress = instructions.triggerPress || "";
  var whenLost = instructions.whenPossessionLost || "";
  var whenWon = instructions.whenPossessionWon || "";
  var playOut = instructions.playOutOfDefence === true;
  var tempo = instructions.tempo || "";

  var isBackThree = formation &&
    (formation.indexOf("3-") === 0 || formation.indexOf("5-") === 0);

  var isDefCautious = mentality === "Defensive" || mentality === "Cautious";
  var isPosiAttack = mentality === "Positive" || mentality === "Attacking";
  var isHighPress = triggerPress === "Much More Often" || triggerPress === "More Often";
  var isCounterPress = whenLost === "Counter-Press";
  var isDirect = passingDirectness === "Much More Direct" || passingDirectness === "More Direct";
  var isShort = passingDirectness === "Shorter";

  switch (roleId) {

    case "NFB_D":
      if (isDefCautious && pressingStyle === "Less Often" && !isCounterPress) return 1.0;
      if (isDefCautious) return 0.4;
      return 0.1;

    case "NCB_D": case "NCB_ST": case "NCB_CO":
      if (passingDirectness === "Much More Direct") return 1.0;
      if (isDirect && !playOut) return 1.0;
      if (isDirect && playOut) return 0.5;
      return 0.2;

    case "WCB_D": case "WCB_S": case "WCB_A":
    case "HB_D":
    case "Libero_S": case "Libero_A":
      return isBackThree ? 1.0 : 0.05;

    case "Regista_S":
      if (isPosiAttack && !isCounterPress && pressingStyle !== "More Often") return 1.0;
      if (isPosiAttack && isCounterPress) return 0.5;
      return 0.2;

    case "Trequartista_A": case "TQ_WA_A":
    case "Enganche_S":
      if (!isHighPress && !isCounterPress && !isDefCautious) return 1.0;
      if (isCounterPress && isPosiAttack) return 0.4;
      return 0.1;

    case "PF_D":
      if (isDefCautious && whenWon === "Counter") return 1.0;
      if (isDefCautious) return 0.4;
      return 0.15;

    case "WTM_S": case "WTM_A":
    case "TF_S": case "TF_A":
      return isDirect ? 1.0 : 0.1;

    case "RMD_A":
      return 0.08;

    case "IFB_D":
      if (playOut || isShort || tempo === "Lower") return 1.0;
      return 0.3;

    case "DLP_D": case "DLP_S": case "DLP_CM_D": case "DLP_CM_S":
      if (whenWon === "Counter" && isDirect) return 0.15;
      if (isCounterPress && isDirect) return 0.25;
      if (playOut && isCounterPress) return 0.4;
      return 1.0;

    case "PF_A": case "PF_S":
      if (isPosiAttack && !isHighPress && !isCounterPress) return 0.7;
      return 1.0;

    case "IF_A": case "IF_S":
      if (isDirect && whenWon === "Counter") return 1.0;
      if (isHighPress || isCounterPress) return 1.1;
      return 1.05;

    case "IW_A": case "IW_S":
      if (playOut && !isDirect) return 1.1;
      return 1.0;

    case "Winger_A": case "Winger_S":
      return 0.8;

    case "AP_WA_S": case "AP_WA_A":
      return 0.05;

    default:
      return 1.0;
  }
}

// ─── MIDFIELD COMBINATION SELECTOR ───
// Picks a pre-validated DM+CM role combo from MIDFIELD_COMBOS based on
// the manager's philosophy, attribute profile, and formation shape.

function getMidfieldCombination(manager, dmCount, cmCount, instructions, philosophy, formation, dna) {
  if (!MIDFIELD_COMBOS) return null;
  var instr = instructions || {};
  if (!dna) dna = getManagerDNA(manager.Name, manager);

  // Filter to combos that match this formation's DM+CM slot counts
  var valid = MIDFIELD_COMBOS.filter(function (c) {
    return c.dm.length === dmCount && c.cm.length === cmCount;
  });
  if (valid.length === 0) return null;

  // Score each combo
  var att = normalizeAttr(manager.Att);
  var tec = normalizeAttr(manager.Tec);
  var dis = normalizeAttr(manager.Dis);
  var press = manager["Pressing Style"] || "";
  var pNum = press === "More Often" ? 1 : press === "Less Often" ? 0 : 0.5;

  // Manager archetype affinities (0–1)
  var philAffinities = {
    "pos": tec * 0.4 + (1 - att) * 0.2 + dis * 0.2 + (1 - pNum) * 0.2,
    "press": pNum * 0.4 + att * 0.3 + (1 - dis) * 0.3,
    "def": dis * 0.4 + (1 - att) * 0.4 + (1 - pNum) * 0.2,
    "ctr": att * 0.35 + pNum * 0.25 + (1 - tec) * 0.2 + (1 - dis) * 0.2,
    "bal": 0.35  // baseline for all managers
  };
  // Boost affinity for the manager's primary philosophy
  var philMap = { "pos": "possession-oriented tactician", "press": "aggressive high-press tactician", "def": "disciplined defensive organiser", "ctr": "direct counter-attacker", "bal": "pragmatic system-adapter" };
  for (var tag in philMap) {
    if (philMap[tag] === philosophy) {
      philAffinities[tag] = Math.min(1, philAffinities[tag] + 0.12);
    }
  }

  var scored = valid.map(function (combo) {
    // Archetype match score
    var archScore = 0;
    combo.archetypes.forEach(function (tag) {
      archScore += philAffinities[tag] || 0;
    });
    archScore /= Math.max(1, combo.archetypes.length);

    // Per-role affinity from ROLE_PROFILES
    var allRoles = combo.dm.concat(combo.cm);
    var roleScore = 0;
    allRoles.forEach(function (rid) {
      var mult = philosophy ? philosophyRoleMultiplier(rid, philosophy) : 1.0;
      roleScore += roleScoreForManager(rid, manager) * mult;
    });
    if (allRoles.length > 0) roleScore /= allRoles.length;

    // DNA-based variety
    var variety = 0.85 + dna.roleExperimentation * 0.3;

    // SV gate: if only 1 DM slot, SV should not appear (safety check)
    var hasSV = allRoles.some(function (r) { return r === "SV_S" || r === "SV_A"; });
    var svPenalty = (hasSV && dmCount < 2) ? 0 : 1;

    return {
      combo: combo,
      score: archScore * 0.5 + roleScore * 0.4 + (variety - 0.85) * 0.5,
      svPenalty: svPenalty
    };
  });

  scored = scored.filter(function (s) { return s.svPenalty === 1; });
  scored.sort(function (a, b) { return b.score - a.score; });

  if (scored.length === 0) return null;

  // Uniqueness: weighted random pick from top candidates (scales with roleExperimentation)
  var poolSize = Math.min(scored.length, dna.roleExperimentation >= 0.7 ? 6 : dna.roleExperimentation >= 0.4 ? 4 : 3);
  var pool = scored.slice(0, poolSize);
  var weights = pool.map(function (_, i) { return pool.length - i; });
  return weightedPick(pool.map(function (s) { return s.combo; }), weights);
}

// AML/AMR realism: IF/IW dominate; W on one flank max; no AP/RMD in wide attack
function waRealismMultiplier(waRoleId, otherWaRoleId) {
  var role = getRoleById(waRoleId);
  if (!role) return 1.0;
  var abbr = role.abbreviation;
  var mult = 1.0;

  if (abbr === "IF") mult = 1.4;
  else if (abbr === "IW") mult = 1.35;
  else if (abbr === "W") mult = 0.7;
  else if (abbr === "AP" || abbr === "RMD") mult = 0.05;

  if (otherWaRoleId) {
    var other = getRoleById(otherWaRoleId);
    if (other) {
      if (abbr === "W" && other.abbreviation === "W") mult *= 0.1;
      if ((abbr === "IF" || abbr === "IW") && (other.abbreviation === "IF" || other.abbreviation === "IW")) {
        mult *= 0.85;
      }
    }
  }
  return mult;
}

function wmRealismMultiplier(wmRoleId) {
  var role = getRoleById(wmRoleId);
  if (!role) return 1.0;
  var abbr = role.abbreviation;
  if (abbr === "W") return 1.3;
  if (abbr === "IW") return 1.35;
  if (abbr === "WM") return 1.1;
  if (abbr === "DW") return 0.85;
  if (abbr === "WP") return 0.3;
  return 1.0;
}

var WD_WA_COMBOS = [
  // ── Possession: IW/IF + FB/IWB (W rare, one flank only) ──
  { wd: "FB_S", wa: "IW_A", isWB: false, ratings: { pos: 1.0, press: 0.85, def: 0.7, ctr: 0.6, bt: 0.95 } },
  { wd: "FB_S", wa: "IW_S", isWB: false, ratings: { pos: 1.0, press: 0.8, def: 0.75, ctr: 0.6, bt: 0.95 } },
  { wd: "FB_S", wa: "IF_S", isWB: false, ratings: { pos: 0.95, press: 0.85, def: 0.7, ctr: 0.65, bt: 0.9 } },
  { wd: "IWB_S", wa: "IW_S", isWB: false, ratings: { pos: 1.0, press: 0.8, def: 0.5, ctr: 0.5, bt: 0.85 } },
  { wd: "IWB_D", wa: "IW_A", isWB: false, ratings: { pos: 1.0, press: 0.8, def: 0.55, ctr: 0.5, bt: 0.85 } },
  { wd: "FB_S", wa: "Winger_S", isWB: false, ratings: { pos: 0.85, press: 0.75, def: 0.7, ctr: 0.7, bt: 0.9 } },

  { wd: "WB_S", wa: "IW_A", isWB: true, ratings: { pos: 1.0, press: 0.85, def: 0.6, ctr: 0.6, bt: 0.9 } },
  { wd: "IWB_A", wa: "IW_S", isWB: true, ratings: { pos: 0.95, press: 0.85, def: 0.5, ctr: 0.55, bt: 0.85 } },
  { wd: "WB_S", wa: "IF_S", isWB: true, ratings: { pos: 0.9, press: 0.85, def: 0.55, ctr: 0.65, bt: 0.85 } },

  // ── High press: IF/IW + overlapping FB/WB ──
  { wd: "FB_A", wa: "IF_A", isWB: false, ratings: { pos: 0.75, press: 1.0, def: 0.25, ctr: 0.85, bt: 0.85 } },
  { wd: "FB_A", wa: "IF_S", isWB: false, ratings: { pos: 0.8, press: 0.95, def: 0.3, ctr: 0.8, bt: 0.9 } },
  { wd: "FB_A", wa: "IW_A", isWB: false, ratings: { pos: 0.85, press: 0.95, def: 0.3, ctr: 0.75, bt: 0.85 } },
  { wd: "FB_S", wa: "IF_A", isWB: false, ratings: { pos: 0.7, press: 0.9, def: 0.45, ctr: 0.8, bt: 0.85 } },

  { wd: "WB_A", wa: "IF_A", isWB: true, ratings: { pos: 0.8, press: 1.0, def: 0.2, ctr: 0.85, bt: 0.8 } },
  { wd: "WB_A", wa: "IF_S", isWB: true, ratings: { pos: 0.85, press: 0.95, def: 0.25, ctr: 0.8, bt: 0.85 } },
  { wd: "WB_A", wa: "IW_S", isWB: true, ratings: { pos: 0.9, press: 0.95, def: 0.2, ctr: 0.75, bt: 0.8 } },
  { wd: "CWB_A", wa: "IF_A", isWB: true, ratings: { pos: 0.75, press: 0.95, def: 0.15, ctr: 0.8, bt: 0.75 } },
  { wd: "CWB_S", wa: "IW_A", isWB: true, ratings: { pos: 0.85, press: 0.9, def: 0.2, ctr: 0.7, bt: 0.75 } },

  // ── Defensive: IF/IW + conservative FB ──
  { wd: "FB_D", wa: "IF_S", isWB: false, ratings: { pos: 0.55, press: 0.5, def: 1.0, ctr: 0.8, bt: 0.85 } },
  { wd: "FB_D", wa: "IW_S", isWB: false, ratings: { pos: 0.6, press: 0.55, def: 0.95, ctr: 0.75, bt: 0.85 } },
  { wd: "IFB_D", wa: "IF_S", isWB: false, ratings: { pos: 0.5, press: 0.4, def: 1.0, ctr: 0.8, bt: 0.8 } },
  { wd: "NFB_D", wa: "IW_S", isWB: false, ratings: { pos: 0.35, press: 0.35, def: 1.0, ctr: 0.85, bt: 0.75 } },

  { wd: "WB_D", wa: "IF_S", isWB: true, ratings: { pos: 0.6, press: 0.55, def: 0.95, ctr: 0.75, bt: 0.8 } },
  { wd: "WB_D", wa: "IW_S", isWB: true, ratings: { pos: 0.65, press: 0.6, def: 0.9, ctr: 0.7, bt: 0.8 } },

  // ── Counter: IF + FB/WB, occasional W on one side ──
  { wd: "FB_S", wa: "IF_A", isWB: false, ratings: { pos: 0.6, press: 0.85, def: 0.55, ctr: 1.0, bt: 0.85 } },
  { wd: "FB_A", wa: "IF_S", isWB: false, ratings: { pos: 0.55, press: 0.85, def: 0.45, ctr: 1.0, bt: 0.8 } },
  { wd: "FB_S", wa: "IW_A", isWB: false, ratings: { pos: 0.65, press: 0.8, def: 0.5, ctr: 0.95, bt: 0.85 } },
  { wd: "FB_A", wa: "Winger_A", isWB: false, ratings: { pos: 0.5, press: 0.8, def: 0.4, ctr: 1.0, bt: 0.75 } },

  { wd: "WB_S", wa: "IF_A", isWB: true, ratings: { pos: 0.7, press: 0.9, def: 0.45, ctr: 1.0, bt: 0.85 } },
  { wd: "WB_A", wa: "IF_A", isWB: true, ratings: { pos: 0.65, press: 0.9, def: 0.35, ctr: 0.95, bt: 0.8 } },
  { wd: "WB_S", wa: "IW_S", isWB: true, ratings: { pos: 0.7, press: 0.85, def: 0.5, ctr: 0.9, bt: 0.8 } },

  // ── Balanced ──
  { wd: "FB_S", wa: "IF_S", isWB: false, ratings: { pos: 0.8, press: 0.8, def: 0.7, ctr: 0.8, bt: 1.0 } },
  { wd: "FB_S", wa: "IW_S", isWB: false, ratings: { pos: 0.85, press: 0.8, def: 0.7, ctr: 0.75, bt: 1.0 } },
  { wd: "FB_S", wa: "IF_A", isWB: false, ratings: { pos: 0.75, press: 0.85, def: 0.65, ctr: 0.8, bt: 0.95 } },
  { wd: "FB_S", wa: "Winger_S", isWB: false, ratings: { pos: 0.7, press: 0.75, def: 0.7, ctr: 0.8, bt: 0.95 } },

  { wd: "WB_S", wa: "IF_S", isWB: true, ratings: { pos: 0.8, press: 0.8, def: 0.6, ctr: 0.8, bt: 1.0 } },
  { wd: "WB_S", wa: "IW_A", isWB: true, ratings: { pos: 0.85, press: 0.8, def: 0.55, ctr: 0.75, bt: 0.95 } },
  { wd: "WB_S", wa: "IF_A", isWB: true, ratings: { pos: 0.75, press: 0.85, def: 0.55, ctr: 0.8, bt: 0.9 } }
];

var ST_COMBOS = [
  // ── Creative + Runner ──
  { roles: ["DLF_S", "AF_A"], ratings: { pos: 1.0, press: 0.8, def: 0.5, ctr: 0.8, bt: 1.0 } },
  { roles: ["F9_S", "AF_A"], ratings: { pos: 1.0, press: 0.8, def: 0.4, ctr: 0.7, bt: 0.9 } },
  { roles: ["F9_S", "CF_A"], ratings: { pos: 1.0, press: 0.7, def: 0.3, ctr: 0.7, bt: 0.8 } },
  { roles: ["DLF_S", "CF_A"], ratings: { pos: 0.9, press: 0.8, def: 0.5, ctr: 0.8, bt: 0.9 } },
  { roles: ["TQ_A", "AF_A"], ratings: { pos: 0.9, press: 0.4, def: 0.2, ctr: 0.8, bt: 0.7 } },
  
  // ── Target Forward ──
  { roles: ["TF_S", "AF_A"], ratings: { pos: 0.5, press: 0.6, def: 0.7, ctr: 1.0, bt: 0.8 } },
  { roles: ["TF_S", "Poacher_A"], ratings: { pos: 0.3, press: 0.5, def: 0.8, ctr: 1.0, bt: 0.7 } },
  { roles: ["TF_A", "DLF_S"], ratings: { pos: 0.6, press: 0.6, def: 0.7, ctr: 0.9, bt: 0.8 } },
  
  // ── High Pressing ──
  { roles: ["PF_S", "AF_A"], ratings: { pos: 0.7, press: 0.95, def: 0.6, ctr: 0.8, bt: 0.9 } },
  { roles: ["PF_D", "AF_A"], ratings: { pos: 0.5, press: 0.9, def: 0.8, ctr: 0.7, bt: 0.8 } },
  { roles: ["PF_A", "Poacher_A"], ratings: { pos: 0.4, press: 0.85, def: 0.6, ctr: 0.8, bt: 0.8 } },
  { roles: ["PF_A", "DLF_S"], ratings: { pos: 0.8, press: 0.9, def: 0.6, ctr: 0.8, bt: 0.9 } },
  { roles: ["AF_A", "DLF_S"], ratings: { pos: 0.75, press: 0.9, def: 0.5, ctr: 0.8, bt: 0.95 } },
  { roles: ["CF_A", "Poacher_A"], ratings: { pos: 0.6, press: 0.85, def: 0.5, ctr: 0.75, bt: 0.85 } },
  
  // ── Direct / Counter ──
  { roles: ["AF_A", "Poacher_A"], ratings: { pos: 0.4, press: 0.7, def: 0.5, ctr: 1.0, bt: 0.8 } },
  { roles: ["CF_S", "AF_A"], ratings: { pos: 0.8, press: 0.8, def: 0.5, ctr: 1.0, bt: 0.9 } },
  { roles: ["DLF_A", "AF_A"], ratings: { pos: 0.8, press: 0.8, def: 0.5, ctr: 0.9, bt: 0.9 } },
  
  // ── Balanced ──
  { roles: ["AF_A", "AF_A"], ratings: { pos: 0.3, press: 0.7, def: 0.4, ctr: 0.8, bt: 0.7 } },
  { roles: ["DLF_S", "DLF_A"], ratings: { pos: 0.8, press: 0.6, def: 0.6, ctr: 0.6, bt: 0.8 } }
];

function getWDWACombination(manager, formation, instructions, philosophy, dna, flank, otherWaRoleId) {
  if (!dna) dna = getManagerDNA(manager.Name, manager);
  if (!philosophy) philosophy = deriveManagerPhilosophy(manager);

  // Check if the slot is a WB or WD slot in the formation
  var isWB = false;
  var formDef = FORMATIONS[formation];
  if (formDef) {
    var flankSlots = formDef.slots.filter(function(s) {
      var def = GLOBAL_PITCH_SLOTS[s];
      return def && def.flank === flank && (def.strata === "WB" || def.strata === "WD");
    });
    if (flankSlots.length > 0) {
      isWB = GLOBAL_PITCH_SLOTS[flankSlots[0]].strata === "WB";
    }
  }

  var valid = WD_WA_COMBOS.filter(function (c) {
    return c.isWB === isWB;
  });
  if (valid.length === 0) return null;

  var philKey = "bt";
  if (philosophy === "possession-oriented tactician") philKey = "pos";
  else if (philosophy === "aggressive high-press tactician") philKey = "press";
  else if (philosophy === "disciplined defensive organiser") philKey = "def";
  else if (philosophy === "direct counter-attacker") philKey = "ctr";
  else if (philosophy === "balanced tactician") philKey = "bt";
  else if (philosophy === "pragmatic system-adapter") philKey = "psa";

  var scored = valid.map(function (combo) {
    var archScore = 1.0;
    if (philKey === "psa") {
      archScore = 1.0;
    } else {
      archScore = combo.ratings[philKey] !== undefined ? combo.ratings[philKey] : 0.6;
    }

    var wdm = philosophy ? philosophyRoleMultiplier(combo.wd, philosophy) : 1.0;
    var wam = philosophy ? philosophyRoleMultiplier(combo.wa, philosophy) : 1.0;
    var realism = waRealismMultiplier(combo.wa, otherWaRoleId);
    var roleScore = roleScoreForManager(combo.wd, manager) * wdm * 0.5 + roleScoreForManager(combo.wa, manager) * wam * 0.5;
    var variety = 0.85 + dna.roleExperimentation * 0.3;

    return {
      combo: combo,
      score: (archScore * 0.5 + roleScore * 0.4 + (variety - 0.85) * 0.5) * realism
    };
  });

  scored.sort(function (a, b) { return b.score - a.score; });

  if (scored.length === 0) return null;

  var poolSize = Math.min(scored.length, dna.roleExperimentation >= 0.7 ? 6 : dna.roleExperimentation >= 0.4 ? 4 : 3);
  var pool = scored.slice(0, poolSize);
  var weights = pool.map(function (_, i) { return pool.length - i; });
  return weightedPick(pool.map(function (s) { return s.combo; }), weights);
}

// Flat-four formations (4-4-2, 4-5-1): FB + ML/MR — W/IW > WM > DW > WP
var FB_WM_COMBOS = [
  { wd: "FB_S", wm: "Winger_WM_S", ratings: { pos: 0.7, press: 0.75, def: 0.75, ctr: 0.85, bt: 0.95 } },
  { wd: "FB_S", wm: "Winger_WM_A", ratings: { pos: 0.65, press: 0.8, def: 0.65, ctr: 0.9, bt: 0.9 } },
  { wd: "FB_S", wm: "IW_WM_S", ratings: { pos: 0.8, press: 0.75, def: 0.7, ctr: 0.8, bt: 0.95 } },
  { wd: "FB_S", wm: "IW_WM_A", ratings: { pos: 0.75, press: 0.8, def: 0.65, ctr: 0.85, bt: 0.9 } },
  { wd: "FB_A", wm: "Winger_WM_S", ratings: { pos: 0.6, press: 0.85, def: 0.55, ctr: 0.9, bt: 0.85 } },
  { wd: "FB_S", wm: "WM_S", ratings: { pos: 0.6, press: 0.65, def: 0.8, ctr: 0.9, bt: 1.0 } },
  { wd: "FB_S", wm: "WM_A", ratings: { pos: 0.55, press: 0.75, def: 0.7, ctr: 0.95, bt: 0.9 } },
  { wd: "FB_D", wm: "WM_S", ratings: { pos: 0.5, press: 0.45, def: 1.0, ctr: 0.85, bt: 0.9 } },
  { wd: "FB_D", wm: "DW_S", ratings: { pos: 0.55, press: 0.5, def: 0.95, ctr: 0.8, bt: 0.85 } },
  { wd: "FB_S", wm: "DW_S", ratings: { pos: 0.6, press: 0.6, def: 0.8, ctr: 0.75, bt: 0.9 } },
  { wd: "FB_S", wm: "WP_WM_S", ratings: { pos: 0.5, press: 0.55, def: 0.75, ctr: 0.7, bt: 0.8 } },
  { wd: "NFB_D", wm: "WM_S", ratings: { pos: 0.35, press: 0.35, def: 1.0, ctr: 0.9, bt: 0.85 } }
];

function getFBWMCombination(manager, formation, instructions, philosophy, dna, flank) {
  if (!dna) dna = getManagerDNA(manager.Name, manager);
  if (!philosophy) philosophy = deriveManagerPhilosophy(manager);

  var philKey = getPhilosophyFormationKey(philosophy);
  if (philKey === "bal") philKey = "bt";

  var scored = FB_WM_COMBOS.map(function (combo) {
    var archScore = combo.ratings[philKey] !== undefined ? combo.ratings[philKey] : 0.6;
    var wdm = philosophy ? philosophyRoleMultiplier(combo.wd, philosophy) : 1.0;
    var wmm = philosophy ? philosophyRoleMultiplier(combo.wm, philosophy) : 1.0;
    var realism = wmRealismMultiplier(combo.wm);
    var roleScore = roleScoreForManager(combo.wd, manager) * wdm * 0.5 +
      roleScoreForManager(combo.wm, manager) * wmm * 0.5;
    var variety = 0.85 + dna.roleExperimentation * 0.3;
    return { combo: combo, score: (archScore * 0.5 + roleScore * 0.4 + (variety - 0.85) * 0.5) * realism };
  });

  scored.sort(function (a, b) { return b.score - a.score; });
  if (scored.length === 0) return null;

  var poolSize = Math.min(scored.length, dna.roleExperimentation >= 0.7 ? 5 : dna.roleExperimentation >= 0.4 ? 3 : 2);
  var pool = scored.slice(0, poolSize);
  var weights = pool.map(function (_, i) { return pool.length - i; });
  return weightedPick(pool.map(function (s) { return s.combo; }), weights);
}

function getSTCombination(manager, count, philosophy, dna) {
  if (count !== 2) return null;
  if (!dna) dna = getManagerDNA(manager.Name, manager);
  if (!philosophy) philosophy = deriveManagerPhilosophy(manager);

  var philKey = "bt";
  if (philosophy === "possession-oriented tactician") philKey = "pos";
  else if (philosophy === "aggressive high-press tactician") philKey = "press";
  else if (philosophy === "disciplined defensive organiser") philKey = "def";
  else if (philosophy === "direct counter-attacker") philKey = "ctr";
  else if (philosophy === "balanced tactician") philKey = "bt";
  else if (philosophy === "pragmatic system-adapter") philKey = "psa";

  var scored = ST_COMBOS.map(function (combo) {
    var archScore = 1.0;
    if (philKey === "psa") {
      archScore = 1.0;
    } else {
      archScore = combo.ratings[philKey] !== undefined ? combo.ratings[philKey] : 0.6;
    }

    var r1m = philosophy ? philosophyRoleMultiplier(combo.roles[0], philosophy) : 1.0;
    var r2m = philosophy ? philosophyRoleMultiplier(combo.roles[1], philosophy) : 1.0;
    var roleScore = roleScoreForManager(combo.roles[0], manager) * r1m * 0.5 + roleScoreForManager(combo.roles[1], manager) * r2m * 0.5;
    var variety = 0.85 + dna.roleExperimentation * 0.3;

    return {
      combo: combo,
      score: archScore * 0.5 + roleScore * 0.4 + (variety - 0.85) * 0.5
    };
  });

  scored.sort(function (a, b) { return b.score - a.score; });

  if (scored.length === 0) return null;

  var poolSize = Math.min(scored.length, dna.roleExperimentation >= 0.7 ? 6 : dna.roleExperimentation >= 0.4 ? 4 : 3);
  var pool = scored.slice(0, poolSize);
  var weights = pool.map(function (_, i) { return pool.length - i; });
  return weightedPick(pool.map(function (s) { return s.combo; }), weights);
}

function getCBCombination(manager, count, philosophy, dna, formation) {
  if (typeof CB_COMBOS === "undefined" || !CB_COMBOS) return null;
  if (count !== 2 && count !== 3) return null;
  if (!dna) dna = getManagerDNA(manager.Name, manager);

  var valid = CB_COMBOS.filter(function (c) {
    if (c.roles.length !== count) return false;
    for (var i = 0; i < c.roles.length; i++) {
      if (!isRoleAllowedForTactic(c.roles[i], null, formation)) {
        return false;
      }
    }
    if (count === 3) {
      var r0 = getRoleById(c.roles[0]);
      var r1 = getRoleById(c.roles[1]);
      var r2 = getRoleById(c.roles[2]);
      if (r0 && r0.abbreviation === "Libero") return false;
      if (r1 && r1.abbreviation === "WCB") return false;
      if (r2 && r2.abbreviation === "Libero") return false;
    }
    return true;
  });
  if (valid.length === 0) return null;

  var philKey = "bt";
  if (philosophy === "possession-oriented tactician") philKey = "pos";
  else if (philosophy === "aggressive high-press tactician") philKey = "press";
  else if (philosophy === "disciplined defensive organiser") philKey = "def";
  else if (philosophy === "direct counter-attacker") philKey = "ctr";
  else if (philosophy === "balanced tactician") philKey = "bt";
  else if (philosophy === "pragmatic system-adapter") philKey = "psa";

  var scored = valid.map(function (combo) {
    var archScore = 1.0;
    if (philKey === "psa") {
      archScore = 1.0;
    } else {
      archScore = combo.ratings[philKey] !== undefined ? combo.ratings[philKey] : 0.6;
    }

    var roleScore = 0;
    combo.roles.forEach(function (rid) {
      var mult = philosophy ? philosophyRoleMultiplier(rid, philosophy) : 1.0;
      roleScore += roleScoreForManager(rid, manager) * mult;
    });
    if (combo.roles.length > 0) roleScore /= combo.roles.length;

    var variety = 0.85 + dna.roleExperimentation * 0.3;

    return {
      combo: combo,
      score: archScore * 0.5 + roleScore * 0.4 + (variety - 0.85) * 0.5
    };
  });

  scored.sort(function (a, b) { return b.score - a.score; });

  if (scored.length === 0) return null;

  // Uniqueness: weighted random pick from top candidates
  var poolSize = Math.min(scored.length, dna.roleExperimentation >= 0.7 ? 6 : dna.roleExperimentation >= 0.4 ? 4 : 3);
  var pool = scored.slice(0, poolSize);
  var weights = pool.map(function (_, i) { return pool.length - i; });
  return weightedPick(pool.map(function (s) { return s.combo; }), weights);
}

function getStrataRoleIds(manager, strata, count, squad, tacticInstructions, formation, philosophy, dna) {
  if (count < 1) return [];
  var instr = tacticInstructions || {};
  if (!dna) dna = getManagerDNA(manager.Name, manager);
  var ada = normalizeAttr(manager.Ada || 0);
  var isPlayerCentric = ada >= 0.75 && squad && squad.length > 0;

  if (isPlayerCentric) {
    return _getStrataRoleIdsPlayerCentric(manager, strata, count, squad, instr, formation, philosophy, dna);
  }

  if (!squad || squad.length === 0) {
    return getStrataRoleIdsManagerOnly(manager, strata, count, instr, formation, philosophy, dna);
  }

  var eligiblePlayers = squad.filter(function (p) {
    return p.strata && Array.isArray(p.strata) && p.strata.indexOf(strata) !== -1;
  });

  if (eligiblePlayers.length === 0) {
    return getStrataRoleIdsManagerOnly(manager, strata, count, instr, formation, philosophy, dna);
  }

  var strataRoles = FM24_ROLES.filter(function (r) { return roleHasStrata(r, strata) && !isAntiMetaRole(r.id) && isRoleAllowedForTactic(r.id, null, formation); });
  if (strataRoles.length === 0) return [];

  var scored = strataRoles.map(function (role) {
    var bestPlayerScore = 0;
    for (var i = 0; i < eligiblePlayers.length; i++) {
      var result = scorePlayerForRole(eligiblePlayers[i], role.id, instr, strata);
      if (result && result.total > bestPlayerScore) {
        bestPlayerScore = result.total;
      }
    }
    var normPlayerScore = bestPlayerScore / 20;

    var rawAffinity = roleScoreForManager(role.id, manager);
    var managerWeight = 0.3 + rawAffinity * 0.7;
    var roleVariety = 0.85 + dna.roleExperimentation * 0.3;

    var isGeneric = ["GK_D", "GK_S", "CD_D", "FB_D", "FB_S", "FB_A", "WB_D", "WB_S", "WB_A", "DM_D", "DM_S", "CM_D", "CM_S", "CM_A", "Winger_S", "Winger_A"].indexOf(role.id) !== -1;
    var specBoost = 1.0;
    if (!isGeneric && bestPlayerScore >= 13.5) {
      specBoost = 1.15;
    }

    var context = contextMultiplier(role.id, manager, instr, formation);
    var philMult = philosophy ? philosophyRoleMultiplier(role.id, philosophy) : 1.0;
    var metaPref = isMetaRole(role.id) ? (0.85 + dna.metaPreference * 0.3) : 1.0;
    var realismMult = 1.0;
    if (strata === "WM") {
      realismMult = wmRealismMultiplier(role.id);
    } else if (strata === "WA") {
      realismMult = waRealismMultiplier(role.id);
    }

    return {
      roleId: role.id,
      score: normPlayerScore * managerWeight * roleVariety * specBoost * context * philMult * metaPref * realismMult,
      playerScore: normPlayerScore,
      affinity: rawAffinity
    };
  });

  scored.sort(function (a, b) { return b.score - a.score; });

  if (count === 1) return [scored[0].roleId];

  var result = [scored[0].roleId];
  var firstRole = getRoleById(scored[0].roleId);
  var firstAbbr = firstRole ? firstRole.abbreviation : "";

  var bestComplement = null;
  var bestComplementScore = -1;
  for (var j = 1; j < scored.length; j++) {
    var rid = scored[j].roleId;
    var role = getRoleById(rid);
    if (!role) continue;
    var s = scored[j].score;
    if (role.abbreviation === firstAbbr) s *= 0.5;
    if (s > bestComplementScore) {
      bestComplementScore = s;
      bestComplement = rid;
    }
  }

  if (bestComplement) result.push(bestComplement);
  return result;
}

function _getStrataRoleIdsPlayerCentric(manager, strata, count, squad, instr, formation, philosophy, dna) {
  var eligiblePlayers = squad.filter(function (p) {
    return p.strata && Array.isArray(p.strata) && p.strata.indexOf(strata) !== -1;
  });
  if (eligiblePlayers.length === 0) {
    return getStrataRoleIdsManagerOnly(manager, strata, count, instr, formation, philosophy, dna);
  }

  var strataRoles = FM24_ROLES.filter(function (r) {
    return roleHasStrata(r, strata) && !isAntiMetaRole(r.id) && isRoleAllowedForTactic(r.id, null, formation);
  });
  if (strataRoles.length === 0) return [];

  var playerBestRoles = eligiblePlayers.map(function (p) {
    var bestRole = null, bestScore = -1;
    strataRoles.forEach(function (r) {
      var s = scorePlayerForRole(p, r.id, instr, strata);
      if (s && s.total > bestScore) { bestScore = s.total; bestRole = r.id; }
    });
    return { player: p, roleId: bestRole, score: bestScore };
  });
  playerBestRoles.sort(function (a, b) { return b.score - a.score; });

  var result = [];
  var usedAbbr = {};
  for (var i = 0; i < playerBestRoles.length && result.length < count; i++) {
    var pbr = playerBestRoles[i];
    var role = getRoleById(pbr.roleId);
    if (!role) continue;
    if (usedAbbr[role.abbreviation] && result.length >= 1) continue;
    usedAbbr[role.abbreviation] = true;
    result.push(pbr.roleId);
  }

  if (result.length < count) {
    var fallback = getStrataRoleIdsManagerOnly(manager, strata, count, instr, formation, philosophy, dna);
    for (var fi = 0; fi < fallback.length && result.length < count; fi++) {
      if (result.indexOf(fallback[fi]) === -1) result.push(fallback[fi]);
    }
  }
  return result;
}

// ─── SECTION 5B: MANAGER PHILOSOPHY SYSTEM ───
// Scoring-based archetype derivation + constraint profiles.
// The philosophy constrains both instructions AND role selection,
// ensuring the generated tactic is coherent with the manager's identity.

function deriveManagerPhilosophy(manager) {
  var att = normalizeAttr(manager.Att);
  var tec = normalizeAttr(manager.Tec);
  var dis = normalizeAttr(manager.Dis);
  var tacKnw = normalizeAttr(manager["Tac Knw"]);
  var ada = normalizeAttr(manager.Ada);
  var men = normalizeAttr(manager.Men);
  var pressing = manager["Pressing Style"] || "";
  var pNum = pressing === "More Often" ? 1 : pressing === "Less Often" ? 0 : 0.5;

  var scores = {};
  // Possession: needs high Tec + TacKnw — discipline alone must not trigger this
  scores["possession-oriented tactician"] =
    tec * 0.40 + tacKnw * 0.30 + (1 - pNum) * 0.10 + att * 0.05 + (1 - att) * 0.05 + dis * 0.10;
  if (tec < 0.55 || tacKnw < 0.45) {
    scores["possession-oriented tactician"] *= 0.75;
  }
  if (dis >= 0.80 && tec < 0.65) {
    scores["possession-oriented tactician"] *= 0.6;
  }
  // High-press: needs pressing + att — penalised by high discipline
  scores["aggressive high-press tactician"] =
    pNum * 0.35 + att * 0.25 + (1 - dis) * 0.15 + tacKnw * 0.15 + men * 0.10;
  if (dis >= 0.70) {
    scores["aggressive high-press tactician"] *= Math.max(0.45, 1 - (dis - 0.70) * 2.0);
  }
  // Defensive: needs discipline + low attack
  scores["disciplined defensive organiser"] =
    dis * 0.35 + (1 - att) * 0.25 + tacKnw * 0.15 + (1 - men) * 0.10 + (1 - pNum) * 0.15;
  if (dis >= 0.75 && att < 0.55) {
    scores["disciplined defensive organiser"] += 0.12;
  }
  // Direct counter: needs att + low tec + speed priority
  scores["direct counter-attacker"] =
    att * 0.25 + (1 - tec) * 0.20 + pNum * 0.15 + men * 0.15 + (1 - dis) * 0.15 + ada * 0.10;
  // Pragmatic: needs adaptability + broad competence
  scores["pragmatic system-adapter"] =
    ada * 0.35 + tacKnw * 0.25 + dis * 0.15 + tec * 0.15 + men * 0.10;

  var specializedScores = [
    scores["possession-oriented tactician"],
    scores["aggressive high-press tactician"],
    scores["disciplined defensive organiser"],
    scores["direct counter-attacker"]
  ];
  var maxSpecialized = Math.max.apply(null, specializedScores);
  scores["pragmatic system-adapter"] -= (maxSpecialized * 0.2);

  var best = "balanced tactician";
  var bestScore = 0.52; // threshold — must clearly beat balanced default
  for (var key in scores) {
    if (scores.hasOwnProperty(key) && scores[key] > bestScore) {
      bestScore = scores[key];
      best = key;
    }
  }
  return best;
}

// ─── PHILOSOPHY CONSTRAINT PROFILES ───
// Each profile defines:
//   instructionOverrides: hard overrides applied after generateInstructions
//   instructionVetoes: instructions that must be deleted
//   roleSuppression: roleId → multiplier (0.05–0.3 = near-kill)
//   roleBoost: roleId → multiplier (1.2–1.5 = strong preference)

var PHILOSOPHY_PROFILES = {
  "possession-oriented tactician": {
    instructionOverrides: {
      playOutOfDefence: true,
      workBallIntoBox: true,
      defensiveLineBehavior: "Standard",
      preventShortGKDistribution: true
    },
    instructionVetoes: [
      "shootOnSight", "hitEarlyCrosses", "playForSetPieces", "shootFromDistance"
    ],
    passingDirectnessMax: 2, // Max is "Shorter" (0=Extremely Short, 1=Much Shorter, 2=Shorter)
    tempoMax: 3, // Max is "Normal" (0=Extremely Low, 1=Much Lower, 2=Lower, 3=Normal)
    roleSuppression: {
      TF_S: 0.05, TF_A: 0.05,
      WTM_S: 0.08, WTM_A: 0.08,
      NCB_D: 0.15, NCB_ST: 0.15, NCB_CO: 0.15,
      NFB_D: 0.15,
      Poacher_A: 0.25,
      PF_D: 0.20
    },
    roleBoost: {
      BPD_D: 1.4, BPD_ST: 1.3, BPD_CO: 1.3,
      DLP_D: 1.4, DLP_S: 1.4, DLP_CM_D: 1.3, DLP_CM_S: 1.3,
      Regista_S: 1.3,
      SK_S: 1.3, SK_A: 1.2,
      F9_S: 1.3,
      DLF_S: 1.25, DLF_A: 1.2,
      CF_S: 1.2, CF_A: 1.2,
      IWB_S: 1.2, IWB_A: 1.15,
      IF_S: 1.15, IF_A: 1.1, IW_S: 1.2, IW_A: 1.15,
      IW_WM_S: 1.2, IW_WM_A: 1.15, WP_WM_S: 1.25, WP_WM_A: 1.2
    }
  },
  "aggressive high-press tactician": {
    instructionOverrides: {
      whenPossessionLost: "Counter-Press",
      whenPossessionWon: "Counter",
      triggerPress: "Much More Often",
      lineOfEngagement: "High",
      defensiveLine: "Higher",
      defensiveLineBehavior: "Step Up More"
    },
    instructionVetoes: ["playForSetPieces", "dribbleLess"],
    passingDirectnessMax: 5,
    tempoMax: 6,
    roleSuppression: {
      Enganche_S: 0.05, Trequartista_A: 0.10, TQ_WA_A: 0.10,
      RMD_A: 0.15,
      Anchor_D: 0.25
    },
    roleBoost: {
      PF_A: 1.2, PF_S: 1.15, PF_D: 1.1,
      BWM_D: 1.3, BWM_S: 1.3, BWM_CM_D: 1.2, BWM_CM_S: 1.2,
      IF_A: 1.3, IF_S: 1.25, IW_A: 1.2, IW_S: 1.15,
      Winger_A: 1.0, Winger_S: 0.95,
      CD_ST: 1.2, BPD_ST: 1.2,
      IW_WM_A: 1.2, IW_WM_S: 1.15, Winger_WM_A: 1.0, Winger_WM_S: 0.95
    }
  },
  "disciplined defensive organiser": {
    instructionOverrides: {
      whenPossessionLost: "Regroup",
      whenPossessionWon: "Hold Shape",
      lineOfEngagement: "Mid block",
      defensiveLine: "Standard",
      defensiveLineBehavior: "Step Up More",
      creativeFreedom: "More Disciplined",
      defensiveWidth: "Standard",
      crossEngagement: "Stop Crosses",
      triggerPress: "More Often",
      tackling: "Get Stuck In"
    },
    instructionVetoes: [
      "runAtDefence", "shootOnSight", "shootFromDistance", "passIntoSpace", "playOutOfDefence"
    ],
    passingDirectnessMax: 6,
    tempoMax: 3,
    roleSuppression: {
      Trequartista_A: 0.05, TQ_WA_A: 0.05,
      Enganche_S: 0.10,
      Regista_S: 0.15,
      SK_A: 0.15,
      Mezzala_A: 0.20,
      CWB_A: 0.20
    },
    roleBoost: {
      CD_D: 1.3, CD_CO: 1.3,
      DM_D: 1.3, Anchor_D: 1.4,
      FB_D: 1.25, NFB_D: 1.2,
      CM_D: 1.2,
      TF_S: 1.2, TF_A: 1.15,
      DW_D: 1.2, DW_S: 1.15,
      WM_D: 1.2, WM_S: 1.15
    }
  },
  "direct counter-attacker": {
    instructionOverrides: {
      whenPossessionLost: "Regroup",
      whenPossessionWon: "Counter",
      passingDirectness: "More Direct",
      tempo: "Higher",
      passIntoSpace: true,
      lineOfEngagement: "Mid block",
      defensiveLine: "Standard",
      tackling: "Get Stuck In"
    },
    instructionVetoes: [
      "workBallIntoBox", "playForSetPieces", "dribbleLess", "stayOnFeet", "playOutOfDefence"
    ],
    passingDirectnessMax: 6,
    tempoMax: 6,
    roleSuppression: {
      Enganche_S: 0.10,
      F9_S: 0.20,
      DLF_S: 0.25,
      Regista_S: 0.20,
      DLP_D: 0.15, DLP_S: 0.15, DLP_CM_D: 0.15, DLP_CM_S: 0.15
    },
    roleBoost: {
      AF_A: 1.4, Poacher_A: 1.3,
      TF_S: 1.25, TF_A: 1.3,
      WTM_S: 1.2, WTM_A: 1.25,
      IF_A: 1.25, IF_S: 1.2, IW_A: 1.15,
      Winger_A: 1.05,
      WB_A: 1.2, CWB_A: 1.15,
      BWM_D: 1.15, BWM_S: 1.15,
      IW_WM_A: 1.15, Winger_WM_A: 1.05
    }
  },
  "pragmatic system-adapter": {
    instructionOverrides: {},
    instructionVetoes: [],
    passingDirectnessMax: 6,
    tempoMax: 6,
    roleSuppression: {},
    roleBoost: {}
  },
  "balanced tactician": {
    instructionOverrides: {},
    instructionVetoes: [],
    passingDirectnessMax: 5,
    tempoMax: 5,
    roleSuppression: {
      Trequartista_A: 0.30, TQ_WA_A: 0.30,
      Enganche_S: 0.30,
      Libero_A: 0.30
    },
    roleBoost: {}
  }
};

// Ordered scale lookups for ceiling enforcement
var PASSING_SCALE = [
  "Extremely Short", "Much Shorter", "Shorter", "Mixed",
  "More Direct", "Much More Direct", "Extremely Direct"
];
var TEMPO_SCALE = [
  "Extremely Low", "Much Lower", "Lower", "Normal",
  "Higher", "Much Higher", "Extremely High"
];

function clampEnumToMax(currentValue, scale, maxIndex) {
  var idx = scale.indexOf(currentValue);
  if (idx === -1) return currentValue; // not in scale, leave alone
  if (idx <= maxIndex) return currentValue; // within bounds
  return scale[maxIndex]; // clamp down
}

var INSTRUCTION_STYLE_VECTORS = {
  // Positional/Passing Styles
  playOutOfDefence: { att: 2, tec: 5, dis: 4, press: 2 },
  workBallIntoBox: { att: 2, tec: 5, dis: 4, press: 1 },
  passIntoSpace: { att: 5, tec: 3, dis: 2, press: 2 },
  runAtDefence: { att: 5, tec: 4, dis: 1, press: 2 },
  shootOnSight: { att: 5, tec: 1, dis: 2, press: 2 },
  hitEarlyCrosses: { att: 4, tec: 2, dis: 3, press: 2 },
  playForSetPieces: { att: 1, tec: 1, dis: 5, press: 2 },
  shootFromDistance: { att: 4, tec: 1, dis: 2, press: 2 },
  dribbleLess: { att: 1, tec: 2, dis: 5, press: 2 },

  // Transitions
  "whenPossessionLost_Counter-Press": { att: 4, tec: 2, dis: 2, press: 5 },
  "whenPossessionLost_Regroup": { att: 1, tec: 2, dis: 5, press: 1 },
  "whenPossessionWon_Counter": { att: 5, tec: 2, dis: 2, press: 4 },
  "whenPossessionWon_Hold Shape": { att: 1, tec: 3, dis: 5, press: 2 },

  // Passing directness values
  "passingDirectness_Much More Direct": { att: 5, tec: 1, dis: 3, press: 2 },
  "passingDirectness_More Direct": { att: 4, tec: 2, dis: 3, press: 2 },
  "passingDirectness_Shorter": { att: 2, tec: 5, dis: 4, press: 2 },
  "passingDirectness_Much Shorter": { att: 1, tec: 5, dis: 4, press: 2 },

  // Tempo values
  "tempo_Much Higher": { att: 5, tec: 2, dis: 2, press: 4 },
  "tempo_Higher": { att: 4, tec: 3, dis: 3, press: 3 },
  "tempo_Lower": { att: 2, tec: 4, dis: 4, press: 2 },
  "tempo_Much Lower": { att: 1, tec: 5, dis: 5, press: 1 }
};

function applyPhilosophyConstraints(instructions, philosophy, manager) {
  var profile = PHILOSOPHY_PROFILES[philosophy];
  var archetypeVec = ARCHETYPE_STYLE_VECTORS[philosophy];
  if (!profile) return instructions;

  var adaptability = manager ? normalizeAttr(manager.Ada || manager.Adaptability || 10) : 0.5;
  var discipline = manager ? normalizeAttr(manager.Dis || manager.Discipline || 10) : 0.5;
  var dna = getManagerDNA(manager ? manager.Name : "", manager);

  // A manager's "rigidity" to their philosophy guidelines.
  // High discipline and low adaptability make them follow the philosophy rigidly.
  // High roleExperimentation reduces rigidity.
  var rigidity = 0.5 + 0.3 * discipline - 0.3 * adaptability - 0.2 * dna.roleExperimentation;
  rigidity = Math.max(0.1, Math.min(0.9, rigidity));

  // Helper function for deterministic float [0, 1) based on DNA seed and string key
  function getDeterministicFloat(seed, salt, manager) {
    var str = seed.toString() + salt;
    if (manager) str += (manager.Nat || "") + String(manager.Age || 0);
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash & 0x7FFFFFFF) / 0x7FFFFFFF;
  }

  // 1. Dynamic Attribute-Driven Vetoes via style vector similarity
  if (instructions && archetypeVec) {
    var vetoThreshold = 0.25 + 0.15 * discipline - 0.20 * adaptability;
    Object.keys(instructions).forEach(function (key) {
      var val = instructions[key];
      var vec = null;
      if (val === true) {
        vec = INSTRUCTION_STYLE_VECTORS[key];
      } else if (typeof val === "string") {
        vec = INSTRUCTION_STYLE_VECTORS[key + "_" + val];
      }
      if (vec) {
        var sim = cosineSimilarity(vec, archetypeVec);
        if (sim < vetoThreshold) {
          delete instructions[key];
        }
      }
    });
  }

  // 2. Fallback to hard overrides (probabilistic or skipped based on rigidity)
  var overrides = profile.instructionOverrides;
  for (var key in overrides) {
    if (overrides.hasOwnProperty(key)) {
      var roll = getDeterministicFloat(dna.seed, key, manager);
      if (roll < rigidity || instructions[key] === undefined) {
        instructions[key] = overrides[key];
      }
    }
  }

  // 3. Fallback to hard vetoes
  var vetoes = profile.instructionVetoes;
  for (var vi = 0; vi < vetoes.length; vi++) {
    var vkey = vetoes[vi];
    var roll = getDeterministicFloat(dna.seed, vkey, manager);
    if (roll < rigidity) {
      delete instructions[vkey];
    }
  }

  // 4. Ceilings
  if (instructions.passingDirectness) {
    instructions.passingDirectness = clampEnumToMax(
      instructions.passingDirectness, PASSING_SCALE, profile.passingDirectnessMax
    );
  }

  // Tempo ceiling
  if (instructions.tempo) {
    instructions.tempo = clampEnumToMax(
      instructions.tempo, TEMPO_SCALE, profile.tempoMax
    );
  }

  return instructions;
}

function philosophyRoleMultiplier(roleId, philosophy) {
  var profile = PHILOSOPHY_PROFILES[philosophy];
  if (!profile) return 1.0;
  if (profile.roleSuppression[roleId] !== undefined) return profile.roleSuppression[roleId];
  if (profile.roleBoost[roleId] !== undefined) return profile.roleBoost[roleId];
  return 1.0;
}

// ─── SECTION 6: INSTRUCTION GENERATION ───
// All instructions derived from attribute-weighted formulas.
// Replaces old resolvePressing / derivePassingStyle / MARKING_MAP.

function generateInstructions(manager) {
  var inst = {};

  var att = normalizeAttr(manager.Att);
  var tec = normalizeAttr(manager.Tec);
  var dis = normalizeAttr(manager.Dis);
  var men = normalizeAttr(manager.Men);
  var tacKnw = normalizeAttr(manager["Tac Knw"]);
  var ada = normalizeAttr(manager.Ada);
  var pressing = manager["Pressing Style"] || "";
  var pNum = pressing === "More Often" ? 1 : pressing === "Less Often" ? 0 : 0.5;
  var marking = manager["Marking Style"] || "";
  var mNum = marking === "Man" ? 0.7 : marking === "Zonal" ? 0.4 : marking === "Mixed" ? 0.5 : 0.45;
  var sta = normalizeAttr(manager.Sta || 10);
  var dna = getManagerDNA(manager ? manager.Name : "", manager);

  // Mentality (unchanged from old system)
  inst.mentality = resolveMentality(manager);

  // Attacking Width
  var widthScore = att * 0.4 + dis * 0.2 + (1 - tacKnw) * 0.2 + ada * 0.2;
  if (widthScore > 0.7) inst.attackingWidth = "Wide";
  else if (widthScore > 0.55) inst.attackingWidth = "Fairly Wide";
  else if (widthScore < 0.3) inst.attackingWidth = "Narrow";
  else if (widthScore < 0.45) inst.attackingWidth = "Fairly Narrow";

  // Passing Directness
  var passScore = (1 - tec) * 0.35 + (1 - att) * 0.25 + dis * 0.25 + ada * 0.15;
  if (passScore > 0.5) inst.passingDirectness = "Much More Direct";
  else if (passScore > 0.35) inst.passingDirectness = "More Direct";
  else if (passScore < 0.25) inst.passingDirectness = "Shorter";

  // Tempo
  var tempoScore = att * 0.35 + tacKnw * 0.25 + (1 - dis) * 0.2 + ada * 0.2;
  if (tempoScore > 0.65) inst.tempo = "Much Higher";
  else if (tempoScore > 0.5) inst.tempo = "Higher";
  else if (tempoScore < 0.35) inst.tempo = "Lower";

  // Pass Into Space
  if (att * 0.4 + men * 0.3 + ada * 0.3 > 0.5) inst.passIntoSpace = true;

  // Work Ball Into Box
  if (tec * 0.4 + tacKnw * 0.3 + dis * 0.3 > 0.5) inst.workBallIntoBox = true;

  // Play Out of Defence
  if (tec * 0.5 + tacKnw * 0.3 + att * 0.2 > 0.45) inst.playOutOfDefence = true;

  // Run At Defence
  if (att * 0.5 + men * 0.3 + (1 - tacKnw) * 0.2 > 0.5) inst.runAtDefence = true;

  // Creative Freedom
  var cfScore = men * 0.4 - dis * 0.3 + tec * 0.2 + 0.3;
  if (cfScore > 0.6) inst.creativeFreedom = "More Expressive";
  else if (cfScore < 0.4) inst.creativeFreedom = "More Disciplined";

  // Line of Engagement
  var mentVal = inst.mentality === "Attacking" ? 1.0 : inst.mentality === "Positive" ? 0.8 : inst.mentality === "Balanced" ? 0.5 : inst.mentality === "Cautious" ? 0.2 : 0.0;

  var loeScore = att * 0.2 + mentVal * 0.3 + pNum * 0.3 + tacKnw * 0.2;
  loeScore += (dna.intensityBias - 0.5) * 0.08;
  if (loeScore > 0.55) inst.lineOfEngagement = "High";
  else inst.lineOfEngagement = "Mid block";

  // Defensive Line
  var dlScore = att * 0.2 + mentVal * 0.3 + pNum * 0.3 + tacKnw * 0.2;
  dlScore += (dna.intensityBias - 0.5) * 0.08;
  if (dlScore > 0.55) inst.defensiveLine = "Higher";
  else inst.defensiveLine = "Standard";

  // Trigger Press
  var tpScore = pNum * 0.5 + att * 0.25 + tacKnw * 0.25;
  tpScore += (dna.intensityBias - 0.5) * 0.08;
  if (tpScore > 0.7) inst.triggerPress = "Much More Often";
  else if (tpScore > 0.5) inst.triggerPress = "More Often";
  else inst.triggerPress = "Standard";

  // Counter-Press (whenPossessionLost)
  // Weighting: 40% Pressing Style, 30% Mentality, 20% Attacking instinct, 10% Tactical Knowledge
  var cpScore = pNum * 0.4 + mentVal * 0.3 + att * 0.2 + tacKnw * 0.1;
  cpScore += (dna.intensityBias - 0.5) * 0.05;
  if (mentVal >= 0.5 && pNum >= 0.5) {
    // Mentality is not defensive or cautious (Balanced, Positive, Attacking)
    // and pressing style is not passive (Balanced, More Often, Much More Often)
    inst.whenPossessionLost = "Counter-Press";
  } else if (cpScore > 0.5) {
    inst.whenPossessionLost = "Counter-Press";
  } else {
    inst.whenPossessionLost = "Regroup";
  }

  // Counter (whenPossessionWon)
  // Weighting: 40% Attacking instinct, 30% Mentality, 30% Pressing Style
  var cScore = att * 0.4 + mentVal * 0.3 + pNum * 0.3;
  cScore += (dna.intensityBias - 0.5) * 0.05;
  if (cScore > 0.5) {
    inst.whenPossessionWon = "Counter";
  } else {
    inst.whenPossessionWon = "Hold Shape";
  }

  // Tackling
  if ((1 - dis) * 0.4 + att * 0.3 + pNum * 0.3 > 0.4) inst.tackling = "Get Stuck In";

  // Cross Engagement
  var ceScore = mNum * 0.5 + (1 - sta) * 0.3 + dis * 0.2;
  if (ceScore > 0.6) inst.crossEngagement = "Stop Crosses";
  else inst.crossEngagement = "Normal";

  // Prevent Short GK Distribution
  if (pNum * 0.4 + att * 0.3 + tacKnw * 0.3 > 0.55) inst.preventShortGKDistribution = true;

  // Defensive Width
  var dwScore = (1 - pNum) * 0.4 + dis * 0.3 + (1 - att) * 0.3;
  if (dwScore > 0.55) inst.defensiveWidth = "Narrower";
  else if (dwScore < 0.35) inst.defensiveWidth = "Wider";

  // ── Pressing Geometry (no roles needed) ──
  if (pNum > 0.6 && men * 0.5 + tacKnw * 0.5 > 0.5) {
    inst.pressingTrap = "Trap Outside";
  }
  var pressVariation = att * 0.3 + (1 - tacKnw) * 0.3 + ada * 0.4;
  if (pressVariation > 0.6) inst.useOffsideTrap = true;

  // ── Shooting Philosophy ──
  var shootScore = (1 - tec) * 0.3 + att * 0.3 + (1 - tacKnw) * 0.2 + men * 0.2;
  if (shootScore > 0.55) inst.shootOnSight = true;
  var longShotScore = men * 0.4 + (1 - dis) * 0.3 + att * 0.3;
  if (longShotScore > 0.5) inst.shootFromDistance = true;
  var beMoreDisciplinedScore = dis * 0.5 + (1 - men) * 0.3 + (1 - att) * 0.2;
  if (beMoreDisciplinedScore > 0.55) inst.beMoreDisciplined = true;
  var stayOnFeetScore = (1 - att) * 0.4 + dis * 0.3 + tacKnw * 0.3;
  if (stayOnFeetScore > 0.55) inst.stayOnFeet = true;
  var dribbleLessScore = (1 - men) * 0.4 + dis * 0.3 + (1 - att) * 0.3;
  if (dribbleLessScore > 0.5) inst.dribbleLess = true;

  return inst;
}

// ─── SECTION 7: VALIDATION & BALANCE ───

function validateInstructions(inst, manager) {
  // Existing guards
  if (inst.playOutOfDefence) {
    if (inst.passingDirectness === "Much More Direct") inst.passingDirectness = "More Direct";
    else if (inst.passingDirectness === "More Direct") inst.passingDirectness = "Mixed";
  }
  if (inst.lineOfEngagement === "High" &&
    inst.defensiveLine !== "Higher" &&
    inst.defensiveLine !== "Much Higher") {
    inst.defensiveLine = "Higher";
  }
  // High engagement + Regroup is incoherent — if pressing high, you counter-press
  if (inst.lineOfEngagement === "High" && inst.whenPossessionLost === "Regroup") {
    inst.whenPossessionLost = "Counter-Press";
  }
  // Direct passing + Work Ball Into Box is contradictory
  if (inst.workBallIntoBox &&
    (inst.passingDirectness === "Much More Direct" || inst.passingDirectness === "Extremely Direct")) {
    inst.passingDirectness = "More Direct";
  }
  // Pass Into Space with very low tempo is incoherent
  if (inst.passIntoSpace && (inst.tempo === "Much Lower" || inst.tempo === "Extremely Low")) {
    delete inst.passIntoSpace;
  }
  if (inst.runAtDefence && inst.passIntoSpace &&
    (inst.mentality === "Defensive" || inst.mentality === "Cautious")) {
    delete inst.runAtDefence;
    delete inst.passIntoSpace;
  }
  if (inst.whenPossessionLost === "Counter-Press" && inst.lineOfEngagement === "Low") {
    inst.whenPossessionLost = "Regroup";
  }
  if (inst.creativeFreedom === "More Expressive" && (manager.Dis || 0) >= 14) {
    inst.creativeFreedom = "Balanced";
  }

  // ── Contradiction guards ──
  if (inst.shootOnSight && inst.workBallIntoBox) {
    delete inst.shootOnSight;
  }
  if (inst.hitEarlyCrosses && inst.workBallIntoBox) {
    delete inst.hitEarlyCrosses;
  }
  if (inst.overlapLeft && inst.underlapLeft) {
    delete inst.overlapLeft;
    delete inst.underlapLeft;
  }
  if (inst.overlapRight && inst.underlapRight) {
    delete inst.overlapRight;
    delete inst.underlapRight;
  }
  if (inst.preventShortGKDistribution && inst.playOutOfDefence) {
    delete inst.preventShortGKDistribution;
  }
  if (inst.runAtDefence && inst.workBallIntoBox) {
    delete inst.runAtDefence;
  }
  if (inst.tempo === "Much Higher" && inst.passingDirectness === "Shorter") {
    inst.tempo = "Higher";
  }
  if (inst.useOffsideTrap && inst.defensiveLine === "Lower") {
    delete inst.useOffsideTrap;
  }

  // ── FM24 Match Engine Meta Hardening ──

  // Never allow Invite Crosses (unviable in match engine)
  if (inst.crossEngagement === "Invite Crosses") {
    inst.crossEngagement = "Normal";
  }

  // Never allow Drop Off More (breaks offside traps, invites pressure)
  if (inst.defensiveLineBehavior === "Drop Off More") {
    inst.defensiveLineBehavior = "Step Up More";
  }

  // Regroup is viable with mid/high block but suicidal with deep block
  if (inst.whenPossessionLost === "Regroup") {
    if (inst.lineOfEngagement === "Low" || inst.lineOfEngagement === "Very Low") {
      inst.lineOfEngagement = "Mid block";
    }
    if (inst.defensiveLine === "Lower" || inst.defensiveLine === "Much Lower") {
      inst.defensiveLine = "Standard";
    }
  }

  // Compound passive-safety net (catches edge cases that slip through)
  var isPassiveLoE = (inst.lineOfEngagement === "Low" || inst.lineOfEngagement === "Very Low");
  var isPassiveDL = (inst.defensiveLine === "Lower" || inst.defensiveLine === "Much Lower");
  if (isPassiveLoE && isPassiveDL) {
    inst.lineOfEngagement = "Mid block";
    inst.defensiveLine = "Standard";
    if (inst.crossEngagement === "Invite Crosses") inst.crossEngagement = "Normal";
    if (inst.defensiveLineBehavior === "Drop Off More") inst.defensiveLineBehavior = "Step Up More";
  }

  return inst;
}

function getCounterpartRole(roleId, targetDuty) {
  var role = getRoleById(roleId);
  if (!role) return null;
  for (var i = 0; i < FM24_ROLES.length; i++) {
    var r = FM24_ROLES[i];
    if (r.abbreviation === role.abbreviation && r.duty === targetDuty && roleHasStrata(r, role.strata)) {
      if (isAntiMetaRole(r.id)) continue;
      return r;
    }
  }
  return null;
}

function isRoleAllowedForTactic(roleId, slots, formationName) {
  var role = getRoleById(roleId);
  if (!role) return true;

  if (role.abbreviation === "WCB" || role.abbreviation === "Libero") {
    var dcCount = 0;
    if (slots && Object.keys(slots).length > 0) {
      Object.keys(slots).forEach(function (sid) {
        var def = GLOBAL_PITCH_SLOTS[sid];
        if (def && def.strata === "DC") {
          dcCount++;
        }
      });
    } else if (formationName) {
      var preset = FORMATIONS[formationName];
      if (preset && preset.slots) {
        preset.slots.forEach(function (sid) {
          var def = GLOBAL_PITCH_SLOTS[sid];
          if (def && def.strata === "DC") {
            dcCount++;
          }
        });
      }
    }
    return dcCount >= 3;
  }

  if (role.abbreviation !== "SV") return true;

  // For Segundo Volante, we must have two or more DM slots in the tactic/formation
  var dmCount = 0;
  if (slots && Object.keys(slots).length > 0) {
    Object.keys(slots).forEach(function (sid) {
      var def = GLOBAL_PITCH_SLOTS[sid];
      if (def && def.strata === "DM") {
        dmCount++;
      }
    });
  } else if (formationName) {
    var preset = FORMATIONS[formationName];
    if (preset && preset.slots) {
      preset.slots.forEach(function (sid) {
        var def = GLOBAL_PITCH_SLOTS[sid];
        if (def && def.strata === "DM") {
          dmCount++;
        }
      });
    }
  }
  return dmCount >= 2;
}

function isRoleAllowedForSlot(roleId, slotId, slots, formationName) {
  if (!isRoleAllowedForTactic(roleId, slots, formationName)) return false;
  var role = getRoleById(roleId);
  if (!role) return true;
  if (role.abbreviation === "WCB" && slotId === "DC") return false;
  if (role.abbreviation === "Libero" && slotId !== "DC") return false;
  return true;
}

function isFlankRoleCompatible(slotId, roleId, slots) {
  var role = getRoleById(roleId);
  if (!role) return true;
  var abbr = role.abbreviation;
  if (abbr !== "IWB" && abbr !== "IFB") return true;

  var isLeft = (slotId === "DL" || slotId === "WBL");
  var isRight = (slotId === "DR" || slotId === "WBR");
  if (!isLeft && !isRight) return true;

  var waSid = isLeft ?
    ((slots["AML"] && slots["AML"].roleId) ? "AML" : ((slots["ML"] && slots["ML"].roleId) ? "ML" : null)) :
    ((slots["AMR"] && slots["AMR"].roleId) ? "AMR" : ((slots["MR"] && slots["MR"].roleId) ? "MR" : null));

  if (!waSid) {
    return false;
  }

  var waRole = getRoleById(slots[waSid].roleId);
  if (waRole) {
    var waCuts = waRole.abbreviation === "IF" || waRole.abbreviation === "IW" ||
      waRole.abbreviation === "WP" || waRole.abbreviation === "TQ" ||
      waRole.abbreviation === "Trequartista" || waRole.abbreviation === "RMD";
    if (waCuts && abbr === "IWB") {
      return false;
    }
  }

  return true;
}

function changeRoleDuty(slotId, newDuty, slots, manager) {
  var slot = slots[slotId];
  if (!slot || !slot.roleId) return false;
  var role = getRoleById(slot.roleId);
  if (!role) return false;
  var def = GLOBAL_PITCH_SLOTS[slotId];
  var strata = def ? def.strata : "";
  var newRoleId = getRoleId(role.abbreviation, newDuty, strata);
  if (newRoleId) {
    slot.roleId = newRoleId;
    slot.duty = newDuty;
    return true;
  }
  return false;
}

function balanceDuties(slots, manager, instructions, philosophy) {
  var mentality = (instructions && instructions.mentality) || resolveMentality(manager);

  // GK is excluded from outfield counts.
  var outfieldSlots = [];
  var duties = { Defend: 0, Support: 0, Attack: 0 };

  Object.keys(slots).forEach(function (sid) {
    var def = GLOBAL_PITCH_SLOTS[sid];
    if (!def || def.strata === "GK") return; // exclude GK

    var s = slots[sid];
    if (!s || !s.roleId || !s.duty) return;

    var duty = s.duty;
    // Map Stopper and Cover to Defend for counting purposes
    if (duty === "Stopper" || duty === "Cover") {
      duty = "Defend";
    }

    duties[duty] = (duties[duty] || 0) + 1;
    outfieldSlots.push({ slotId: sid, duty: duty, strata: def.strata, roleId: s.roleId });
  });

  // Determine target bounds for outfield players (total 10)
  var minAttack = 2;
  var maxAttack = 4;
  var minDefend = 3;
  var maxDefend = 4;

  if (mentality === "Very Defensive" || mentality === "Defensive") {
    minAttack = 1;
    maxAttack = 2;
    minDefend = 4;
    maxDefend = 5;
  } else if (mentality === "Cautious") {
    minAttack = 1;
    maxAttack = 3;
    minDefend = 3;
    maxDefend = 4;
  } else if (mentality === "Balanced") {
    minAttack = 2;
    maxAttack = 4;
    minDefend = 3;
    maxDefend = 4;
  } else if (mentality === "Positive") {
    minAttack = 3;
    maxAttack = 4;
    minDefend = 2;
    maxDefend = 3;
  } else if (mentality === "Attacking" || mentality === "Very Attacking") {
    minAttack = 3;
    maxAttack = 5;
    minDefend = 2;
    maxDefend = 3;
  }

  var aggression = getAggressionPropensity(manager);
  if (aggression >= 0.66) {
    minAttack = Math.min(minAttack + 1, 5);
    maxDefend = Math.max(2, maxDefend - 1);
  } else if (aggression <= 0.33) {
    minAttack = Math.max(0, minAttack - 1);
    maxAttack = Math.max(1, maxAttack - 1);
  }

  var isHighPressPhil = philosophy === "aggressive high-press tactician";
  var isCounterPress = instructions && instructions.whenPossessionLost === "Counter-Press";
  var isHighLoe = instructions && (instructions.lineOfEngagement === "High" ||
    instructions.triggerPress === "Much More Often");
  if (isHighPressPhil || (isCounterPress && isHighLoe)) {
    minAttack = Math.min(5, minAttack + 1);
    maxAttack = Math.min(5, maxAttack + 1);
    minDefend = Math.max(2, minDefend - 1);
    maxDefend = Math.max(2, maxDefend - 1);
  }

  // --- ADJUST ATTACK DUTIES (UPGRADE) ---
  // If Attack duties are too low, upgrade Support/Defend slots to Attack.
  // Strata priority for Attack: WA > ST > AMC > WB > WM > CM > WD
  var attackPriority = ["WA", "ST", "AMC", "WB", "WM", "CM", "WD"];

  while (duties.Attack < minAttack) {
    var upgraded = false;
    for (var i = 0; i < attackPriority.length && !upgraded; i++) {
      var strata = attackPriority[i];
      // Find a slot in this strata that is NOT already Attack
      var targetSlot = outfieldSlots.find(function (item) {
        return item.strata === strata && item.duty !== "Attack";
      });
      if (targetSlot) {
        var oldDuty = targetSlot.duty;
        if (changeRoleDuty(targetSlot.slotId, "Attack", slots, manager)) {
          duties[oldDuty]--;
          duties.Attack++;
          targetSlot.duty = "Attack";
          upgraded = true;
        }
      }
    }
    if (!upgraded) break;
  }

  // --- ADJUST ATTACK DUTIES (DOWNGRADE) ---
  // If Attack duties are too high, demote some Attack slots to Support.
  // Strata priority for demoting: WD > CM > WM > WB > AMC > ST > WA
  var attackDemotionPriority = ["WD", "CM", "WM", "WB", "AMC", "ST", "WA"];

  while (duties.Attack > maxAttack) {
    var demoted = false;
    for (var i = 0; i < attackDemotionPriority.length && !demoted; i++) {
      var strata = attackDemotionPriority[i];
      var targetSlot = outfieldSlots.find(function (item) {
        return item.strata === strata && item.duty === "Attack";
      });
      if (targetSlot) {
        if (changeRoleDuty(targetSlot.slotId, "Support", slots, manager)) {
          duties.Attack--;
          duties.Support++;
          targetSlot.duty = "Support";
          demoted = true;
        }
      }
    }
    if (!demoted) break;
  }

  // --- ADJUST DEFEND DUTIES (DOWNGRADE) ---
  // If Defend duties are too high, demote some Defend slots to Support.
  // Strata priority for demoting: WB > WD > CM > DM > DC
  var defendDemotionPriority = ["WB", "WD", "CM", "DM", "DC"];

  while (duties.Defend > maxDefend) {
    var demoted = false;
    for (var i = 0; i < defendDemotionPriority.length && !demoted; i++) {
      var strata = defendDemotionPriority[i];
      var targetSlot = outfieldSlots.find(function (item) {
        return item.strata === strata && item.duty === "Defend";
      });
      if (targetSlot) {
        if (changeRoleDuty(targetSlot.slotId, "Support", slots, manager)) {
          duties.Defend--;
          duties.Support++;
          targetSlot.duty = "Support";
          demoted = true;
        }
      }
    }
    if (!demoted) break;
  }

  // --- ADJUST DEFEND DUTIES (UPGRADE) ---
  // If Defend duties are too low, promote some Support/Attack slots to Defend.
  // Strata priority for promoting: DC > DM > WD > WB > CM
  var defendPromotionPriority = ["DC", "DM", "WD", "WB", "CM"];

  while (duties.Defend < minDefend) {
    var promoted = false;
    for (var i = 0; i < defendPromotionPriority.length && !promoted; i++) {
      var strata = defendPromotionPriority[i];
      var targetSlot = outfieldSlots.find(function (item) {
        return item.strata === strata && item.duty !== "Defend";
      });
      if (targetSlot) {
        var oldDuty = targetSlot.duty;
        if (changeRoleDuty(targetSlot.slotId, "Defend", slots, manager)) {
          duties[oldDuty]--;
          duties.Defend++;
          targetSlot.duty = "Defend";
          promoted = true;
        }
      }
    }
    if (!promoted) break;
  }

  return slots;
}

// ─── DM PIVOT BALL-CARRIER GUARANTEE ───

var DM_BALL_PLAYING = {
  "DLP_D": true, "DLP_S": true, "Regista_S": true, "RPM_S": true
};

var DM_DEFENSIVE_ONLY = {
  "DM_D": true, "BWM_D": true, "BWM_S": true, "BWM_CM_D": true, "BWM_CM_S": true,
  "Anchor_D": true, "HB_D": true
};

var CM_BALL_PLAYING = {
  "AP_S": true, "AP_A": true,
  "Mezzala_S": true, "Mezzala_A": true,
  "RPM_CM_S": true,
  "DLP_CM_D": true, "DLP_CM_S": true,
  "BBM_S": true
};

var CM_DEFENSIVE_ONLY = {
  "CM_D": true,
  "BWM_CM_D": true, "BWM_CM_S": true,
  "Carrilero_S": true
};

// ─── PLAYMAKER ADJACENCY & DEMOTION ───

var PLAYMAKER_ADJACENCY = [
  ["GK", "DC"], ["DC", "DM"], ["DM", "CM"], ["CM", "AMC"],
  ["CM", "WM"], ["AMC", "ST"], ["WM", "WA"]
];

function strataAreAdjacent(s1, s2) {
  for (var i = 0; i < PLAYMAKER_ADJACENCY.length; i++) {
    if ((PLAYMAKER_ADJACENCY[i][0] === s1 && PLAYMAKER_ADJACENCY[i][1] === s2) ||
      (PLAYMAKER_ADJACENCY[i][0] === s2 && PLAYMAKER_ADJACENCY[i][1] === s1)) {
      return true;
    }
  }
  return false;
}

var PLAYMAKER_DEMOTION = {
  "AP_S": "CM_S", "AP_A": "CM_A",
  "DLP_S": "DM_S", "DLP_D": "DM_D",
  "DLP_CM_S": "CM_S", "DLP_CM_D": "CM_D",
  "Regista_S": "DM_S",
  "Enganche_S": "AM_S",
  "Trequartista_A": "AM_A",
  "WP_WM_S": "WM_S", "WP_WM_A": "WM_A",
  "AP_WA_S": "Winger_S", "AP_WA_A": "Winger_A",
  "TQ_WA_A": "IW_A",
  "AP_AMC_S": "AM_S", "AP_AMC_A": "AM_A",
  "RPM_S": "DM_S", "RPM_CM_S": "CM_S"
};

// ─── STRIKER PARTNERSHIPS ───

var COMPLEMENTARY_ST_PAIRS = [
  ["TF", "AF"], ["DLF", "AF"], ["DLF", "Poacher"],
  ["CF", "PF"], ["CF", "AF"], ["PF", "DLF"], ["PF", "AF"]
];

function enforcePivotBalance(slots, manager, squad, instructions) {
  function enforceStrataBalance(strata, ballPlayingMap, defensiveOnlyMap) {
    var pivotSlots = [];
    Object.keys(slots).forEach(function (sid) {
      var def = GLOBAL_PITCH_SLOTS[sid];
      if (def && def.strata === strata) pivotSlots.push(sid);
    });

    if (pivotSlots.length < 2) return;

    var hasBallCarrier = pivotSlots.some(function (sid) {
      return slots[sid] && ballPlayingMap[slots[sid].roleId];
    });

    if (hasBallCarrier) return;

    var worstSid = null;
    pivotSlots.forEach(function (sid) {
      var slotDef = slots[sid];
      if (!slotDef || slotDef.playerName) return;
      if (!defensiveOnlyMap[slotDef.roleId]) return;
      if (worstSid === null) worstSid = sid;
    });

    if (!worstSid) return;

    var usedNames = {};
    Object.keys(slots).forEach(function (sid) {
      if (sid !== worstSid && slots[sid] && slots[sid].playerName) {
        usedNames[slots[sid].playerName] = true;
      }
    });

    var bestRoleId = null;
    var bestPlayerId = null;
    var bestCombined = -1;

    Object.keys(ballPlayingMap).forEach(function (roleId) {
      var role = getRoleById(roleId);
      if (!role || role.strata !== strata) return;
      var affinity = roleScoreForManager(roleId, manager);
      var managerWeight = 0.7 + affinity * 0.3;

      squad.forEach(function (player) {
        if (usedNames[player.Name]) return;
        if (!player.strata || player.strata.indexOf(strata) === -1) return;
        if (!isFlankEligible(player, worstSid)) return;
        var result = scorePlayerForRole(player, roleId, instructions);
        if (!result) return;
        var combined = (result.total / 20) * managerWeight;
        if (combined > bestCombined) {
          bestCombined = combined;
          bestRoleId = roleId;
          bestPlayerId = player.Name;
        }
      });
    });

    if (bestRoleId && bestPlayerId) {
      var newRole = getRoleById(bestRoleId);
      slots[worstSid].roleId = bestRoleId;
      slots[worstSid].duty = newRole ? newRole.duty : "Support";
      slots[worstSid].playerName = bestPlayerId;
    }
  }

  enforceStrataBalance("DM", DM_BALL_PLAYING, DM_DEFENSIVE_ONLY);
  enforceStrataBalance("CM", CM_BALL_PLAYING, CM_DEFENSIVE_ONLY);
  return slots;
}

// ─── PHASE D: ROLE MUTATION PASSES ───

function findAlternativeFlankRole(slotId, currentRole, manager) {
  var def = GLOBAL_PITCH_SLOTS[slotId];
  if (!def) return null;
  var strata = def.strata;
  var currentAbbr = currentRole.abbreviation;
  var currentDuty = currentRole.duty;
  var alternatives = FM24_ROLES.filter(function (r) {
    return roleHasStrata(r, strata) && r.duty === currentDuty && r.abbreviation !== currentAbbr && !isAntiMetaRole(r.id);
  });
  if (alternatives.length === 0) {
    alternatives = FM24_ROLES.filter(function (r) {
      return roleHasStrata(r, strata) && r.abbreviation !== currentAbbr &&
        (r.duty === "Support" || r.duty === "Attack") && !isAntiMetaRole(r.id);
    });
  }
  if (alternatives.length === 0) return null;

  var scored = [];
  alternatives.forEach(function (r) {
    var s = roleScoreForManager(r.id, manager);
    scored.push({ role: r, score: s });
  });
  scored.sort(function (a, b) { return b.score - a.score; });

  var dna = getManagerDNA(manager ? manager.Name : "");
  if (scored.length > 1 && dna.roleExperimentation > 0.3) {
    var margin = 0.05 + 0.15 * dna.roleExperimentation;
    if (scored[0].score - scored[1].score < margin) {
      var hash = 0;
      var salt = currentRole.id + slotId;
      for (var i = 0; i < salt.length; i++) {
        hash = salt.charCodeAt(i) + ((hash << 5) - hash);
      }
      var val = Math.abs((dna.seed * 1000 + hash) % 100) / 100;
      var pSwap = 0.1 + 0.4 * dna.roleExperimentation;
      if (val < pSwap) {
        return scored[1].role;
      }
    }
  }

  return scored[0].role;
}

function enforceFlankAsymmetry(slots, formation, instructions, manager) {
  var att = normalizeAttr(manager.Att);
  var tacKnw = normalizeAttr(manager["Tac Knw"]);
  var ada = normalizeAttr(manager.Ada);
  var asymmetryScore = att * 0.4 + tacKnw * 0.3 + ada * 0.3;
  if (asymmetryScore < 0.5) return slots;

  var flankPairs = {
    "WD": { left: ["DL", "WBL"], right: ["DR", "WBR"] },
    "WM": { left: ["ML"], right: ["MR"] },
    "WA": { left: ["AML"], right: ["AMR"] }
  };

  Object.keys(flankPairs).forEach(function (strata) {
    var pair = flankPairs[strata];
    var leftSlot = null, rightSlot = null;
    pair.left.forEach(function (sid) {
      if (slots[sid] && slots[sid].roleId) leftSlot = sid;
    });
    pair.right.forEach(function (sid) {
      if (slots[sid] && slots[sid].roleId) rightSlot = sid;
    });
    if (!leftSlot || !rightSlot) return;

    var leftRole = getRoleById(slots[leftSlot].roleId);
    var rightRole = getRoleById(slots[rightSlot].roleId);
    if (!leftRole || !rightRole) return;

    if (leftRole.abbreviation === rightRole.abbreviation &&
      leftRole.duty === rightRole.duty) {
      var side = asymmetryScore > 0.65 ? "left" : "right";
      var targetSid = side === "left" ? leftSlot : rightSlot;
      var keepSid = side === "left" ? rightSlot : leftSlot;
      var keepRole = getRoleById(slots[keepSid].roleId);
      var alternative = findAlternativeFlankRole(targetSid, keepRole, manager);
      if (alternative) {
        slots[targetSid].roleId = alternative.id;
        slots[targetSid].duty = alternative.duty;
      }
    } else if ((leftRole.duty === "Attack" && rightRole.duty === "Defend") ||
      (leftRole.duty === "Defend" && rightRole.duty === "Attack")) {
      var total = { Attack: 0, Support: 0, Defend: 0 };
      Object.keys(slots).forEach(function (sid) {
        var r = getRoleById(slots[sid].roleId);
        if (r) total[r.duty] = (total[r.duty] || 0) + 1;
      });
      if (asymmetryScore < 0.5 && (total.Attack || 0) >= 5) {
        var defSid = leftRole.duty === "Defend" ? leftSlot : rightSlot;
        var defRole = getRoleById(slots[defSid].roleId);
        var alternative = findAlternativeFlankRole(defSid, defRole, manager);
        if (alternative) {
          slots[defSid].roleId = alternative.id;
          slots[defSid].duty = alternative.duty;
        }
      }
    }
  });
  return slots;
}

function enforceFlankCompatibility(slots, formation, instructions, manager) {
  function roleCutsInside(roleId) {
    if (!roleId) return false;
    var role = getRoleById(roleId);
    if (!role) return false;
    var abbr = role.abbreviation;
    return abbr === "IF" || abbr === "IW" || abbr === "WP" || abbr === "TQ" || abbr === "Trequartista" || abbr === "RMD";
  }

  function getAlternativeWideRoleId(slotId, duty) {
    var def = GLOBAL_PITCH_SLOTS[slotId];
    var strata = def ? def.strata : "WD";
    if (strata === "WB") {
      return getRoleId("WB", duty || "Support", "WB");
    } else {
      return getRoleId("FB", duty || "Support", "WD");
    }
  }

  // Left flank
  var leftWASid = (slots["AML"] && slots["AML"].roleId) ? "AML" : ((slots["ML"] && slots["ML"].roleId) ? "ML" : null);
  var leftWDSid = (slots["DL"] && slots["DL"].roleId) ? "DL" : ((slots["WBL"] && slots["WBL"].roleId) ? "WBL" : null);

  if (leftWDSid) {
    var wdRole = getRoleById(slots[leftWDSid].roleId);
    if (wdRole) {
      var isIWB = wdRole.abbreviation === "IWB";
      var isIFB = wdRole.abbreviation === "IFB";

      if (!leftWASid) {
        if (isIWB || isIFB) {
          var newId = getAlternativeWideRoleId(leftWDSid, wdRole.duty);
          if (newId) {
            slots[leftWDSid].roleId = newId;
            slots[leftWDSid].duty = getRoleById(newId).duty;
            slots[leftWDSid].playerName = null;
          }
        }
      } else {
        var waCuts = roleCutsInside(slots[leftWASid].roleId);
        if (waCuts && isIWB) {
          var newId = getAlternativeWideRoleId(leftWDSid, wdRole.duty);
          if (newId) {
            slots[leftWDSid].roleId = newId;
            slots[leftWDSid].duty = getRoleById(newId).duty;
            slots[leftWDSid].playerName = null;
          }
        }
      }
    }
  }

  // Right flank
  var rightWASid = (slots["AMR"] && slots["AMR"].roleId) ? "AMR" : ((slots["MR"] && slots["MR"].roleId) ? "MR" : null);
  var rightWDSid = (slots["DR"] && slots["DR"].roleId) ? "DR" : ((slots["WBR"] && slots["WBR"].roleId) ? "WBR" : null);

  if (rightWDSid) {
    var wdRole = getRoleById(slots[rightWDSid].roleId);
    if (wdRole) {
      var isIWB = wdRole.abbreviation === "IWB";
      var isIFB = wdRole.abbreviation === "IFB";

      if (!rightWASid) {
        if (isIWB || isIFB) {
          var newId = getAlternativeWideRoleId(rightWDSid, wdRole.duty);
          if (newId) {
            slots[rightWDSid].roleId = newId;
            slots[rightWDSid].duty = getRoleById(newId).duty;
            slots[rightWDSid].playerName = null;
          }
        }
      } else {
        var waCuts = roleCutsInside(slots[rightWASid].roleId);
        if (waCuts && isIWB) {
          var newId = getAlternativeWideRoleId(rightWDSid, wdRole.duty);
          if (newId) {
            slots[rightWDSid].roleId = newId;
            slots[rightWDSid].duty = getRoleById(newId).duty;
            slots[rightWDSid].playerName = null;
          }
        }
      }
    }
  }

  return slots;
}

function enforceStrikerPartnership(slots, manager) {
  var stSlots = [];
  Object.keys(slots).forEach(function (sid) {
    var def = GLOBAL_PITCH_SLOTS[sid];
    if (def && def.strata === "ST") stSlots.push(sid);
  });
  if (stSlots.length < 2) return slots;

  var role1 = getRoleById(slots[stSlots[0]].roleId);
  var role2 = getRoleById(slots[stSlots[1]].roleId);
  if (!role1 || !role2) return slots;

  if (role1.abbreviation === role2.abbreviation && role1.duty === role2.duty) {
    var score1 = roleScoreForManager(slots[stSlots[0]].roleId, manager);
    var score2 = roleScoreForManager(slots[stSlots[1]].roleId, manager);
    var lowerSid, keepRole;
    if (score1 <= score2) {
      lowerSid = stSlots[0];
      keepRole = role2;
    } else {
      lowerSid = stSlots[1];
      keepRole = role1;
    }
    var keepAbbr = keepRole.abbreviation;
    var duty = keepRole.duty;
    var candidates = [];
    for (var i = 0; i < COMPLEMENTARY_ST_PAIRS.length; i++) {
      var pair = COMPLEMENTARY_ST_PAIRS[i];
      var partner = (pair[0] === keepAbbr) ? pair[1] : (pair[1] === keepAbbr) ? pair[0] : null;
      if (partner) {
        var rid = getRoleId(partner, duty, "ST");
        if (rid && !isAntiMetaRole(rid)) candidates.push(rid);
      }
    }
    if (candidates.length === 0) {
      FM24_ROLES.forEach(function (r) {
        if (r.strata === "ST" && r.duty === duty && r.abbreviation !== keepAbbr && !isAntiMetaRole(r.id)) {
          candidates.push(r.id);
        }
      });
    }
    if (candidates.length > 0) {
      var best = null, bestScore = -1;
      candidates.forEach(function (rid) {
        var s = roleScoreForManager(rid, manager);
        if (s > bestScore) { bestScore = s; best = rid; }
      });
      if (best) {
        var newRole = getRoleById(best);
        slots[lowerSid].roleId = best;
        slots[lowerSid].duty = newRole ? newRole.duty : duty;
      }
    }
  }
  return slots;
}

function demotePlaymakerSlot(slots, pmSlot, manager) {
  var demotedId = PLAYMAKER_DEMOTION[pmSlot.roleId];
  if (demotedId && !isAntiMetaRole(demotedId)) {
    var newRole = getRoleById(demotedId);
    if (newRole) {
      slots[pmSlot.slotId].roleId = demotedId;
      slots[pmSlot.slotId].duty = newRole.duty;
      return;
    }
  }
  var def = GLOBAL_PITCH_SLOTS[pmSlot.slotId];
  if (def) {
    var strata = def.strata;
    var currentRole = getRoleById(pmSlot.roleId);
    var duty = currentRole ? currentRole.duty : "Support";
    var candidates = FM24_ROLES.filter(function (r) {
      return roleHasStrata(r, strata) && r.duty === duty && !r.isPlaymaker && !isAntiMetaRole(r.id);
    });
    if (candidates.length > 0) {
      var best = null, bestScore = -1;
      candidates.forEach(function (r) {
        var s = roleScoreForManager(r.id, manager);
        if (s > bestScore) { bestScore = s; best = r.id; }
      });
      if (best) {
        var nr = getRoleById(best);
        slots[pmSlot.slotId].roleId = best;
        slots[pmSlot.slotId].duty = nr ? nr.duty : duty;
      }
    }
  }
}

function enforcePlaymakerLimit(slots, manager, squad, instructions) {
  var playmakerSlots = [];
  Object.keys(slots).forEach(function (sid) {
    var role = getRoleById(slots[sid].roleId);
    if (role && role.isPlaymaker) {
      playmakerSlots.push({ slotId: sid, roleId: role.id, strata: GLOBAL_PITCH_SLOTS[sid].strata });
    }
  });
  if (playmakerSlots.length <= 1) return slots;

  // Sort by manager affinity (descending)
  playmakerSlots.sort(function (a, b) {
    return roleScoreForManager(b.roleId, manager) - roleScoreForManager(a.roleId, manager);
  });

  var changed = false;
  while (playmakerSlots.length > 2) {
    var worst = playmakerSlots.pop();
    demotePlaymakerSlot(slots, worst, manager);
    changed = true;
  }

  function checkPair(idxA, idxB) {
    var a = playmakerSlots[idxA], b = playmakerSlots[idxB];
    if (a.strata === b.strata) {
      var demoteIdx = roleScoreForManager(a.roleId, manager) <= roleScoreForManager(b.roleId, manager) ? idxA : idxB;
      demotePlaymakerSlot(slots, playmakerSlots[demoteIdx], manager);
      playmakerSlots.splice(demoteIdx, 1);
      return true;
    }
    if (strataAreAdjacent(a.strata, b.strata)) {
      var demoteIdx = roleScoreForManager(a.roleId, manager) <= roleScoreForManager(b.roleId, manager) ? idxA : idxB;
      demotePlaymakerSlot(slots, playmakerSlots[demoteIdx], manager);
      playmakerSlots.splice(demoteIdx, 1);
      return true;
    }
    return false;
  }

  checkPair(0, 1);

  return slots;
}

function enforceCenterbackDuties(slots, manager) {
  var dcSlots = [];
  ["DC", "DCL", "DCR"].forEach(function (sid) {
    if (slots[sid] && slots[sid].roleId) {
      dcSlots.push(sid);
    }
  });

  if (dcSlots.length < 2) return slots;

  // 1. Enforce max 1 Stopper
  var stopperSlots = [];
  dcSlots.forEach(function (sid) {
    var role = getRoleById(slots[sid].roleId);
    if (role && role.duty === "Stopper") {
      stopperSlots.push({ slotId: sid, roleId: role.id });
    }
  });

  if (stopperSlots.length > 1) {
    stopperSlots.sort(function (a, b) {
      return roleScoreForManager(b.roleId, manager) - roleScoreForManager(a.roleId, manager);
    });
    for (var i = 1; i < stopperSlots.length; i++) {
      var slotId = stopperSlots[i].slotId;
      var roleId = stopperSlots[i].roleId;
      var demotedId = roleId.replace("_ST", "_D");
      var newRole = getRoleById(demotedId);
      if (newRole) {
        slots[slotId].roleId = demotedId;
        slots[slotId].duty = newRole.duty;
      }
    }
  }

  // 2. Enforce max 1 Cover
  var coverSlots = [];
  dcSlots.forEach(function (sid) {
    var role = getRoleById(slots[sid].roleId);
    if (role && role.duty === "Cover") {
      coverSlots.push({ slotId: sid, roleId: role.id });
    }
  });

  if (coverSlots.length > 1) {
    coverSlots.sort(function (a, b) {
      return roleScoreForManager(b.roleId, manager) - roleScoreForManager(a.roleId, manager);
    });
    for (var j = 1; j < coverSlots.length; j++) {
      var slotId = coverSlots[j].slotId;
      var roleId = coverSlots[j].roleId;
      var demotedId = roleId.replace("_CO", "_D");
      var newRole = getRoleById(demotedId);
      if (newRole) {
        slots[slotId].roleId = demotedId;
        slots[slotId].duty = newRole.duty;
      }
    }
  }

  // 3. Wide Centre-Backs (WCB) can only play in wide CB slots (DCL/DCR). Libero can only play in the central CB slot (DC).
  dcSlots.forEach(function (sid) {
    var role = getRoleById(slots[sid].roleId);
    if (!role) return;
    if (role.abbreviation === "WCB" && sid === "DC") {
      var isBpdPreferred = manager && normalizeAttr(manager.Tec) >= 0.5;
      var newRoleId = isBpdPreferred ? "BPD_D" : "CD_D";
      var newRole = getRoleById(newRoleId);
      if (newRole) {
        slots[sid].roleId = newRoleId;
        slots[sid].duty = newRole.duty;
      }
    } else if (role.abbreviation === "Libero" && sid !== "DC") {
      var isBpdPreferred = manager && normalizeAttr(manager.Tec) >= 0.5;
      var newRoleId = isBpdPreferred ? "BPD_D" : "CD_D";
      var newRole = getRoleById(newRoleId);
      if (newRole) {
        slots[sid].roleId = newRoleId;
        slots[sid].duty = newRole.duty;
      }
    }
  });

  return slots;
}

function enforceMidfieldStructure(slots, manager, squad, instructions) {
  var midSlots = [];
  Object.keys(slots).forEach(function (sid) {
    var def = GLOBAL_PITCH_SLOTS[sid];
    if (def && (def.strata === "DM" || def.strata === "CM")) {
      midSlots.push(sid);
    }
  });

  if (midSlots.length === 0) return slots;

  // 1. Enforce max 1 BWM in midfield
  var bwmSlots = [];
  midSlots.forEach(function (sid) {
    var role = getRoleById(slots[sid].roleId);
    if (role && role.abbreviation === "BWM") {
      bwmSlots.push(sid);
    }
  });

  if (bwmSlots.length > 1) {
    // Sort by role score/affinity, keep the best one, demote others
    bwmSlots.sort(function (a, b) {
      return roleScoreForManager(slots[b].roleId, manager) - roleScoreForManager(slots[a].roleId, manager);
    });
    // Keep index 0, demote index 1, 2, ...
    for (var i = 1; i < bwmSlots.length; i++) {
      var sid = bwmSlots[i];
      var def = GLOBAL_PITCH_SLOTS[sid];
      var currentRole = getRoleById(slots[sid].roleId);
      var targetDuty = currentRole ? currentRole.duty : "Support";
      // Demote BWM to CM/DM standard role
      if (def.strata === "DM") {
        slots[sid].roleId = targetDuty === "Defend" ? "DM_D" : "DM_S";
        slots[sid].duty = targetDuty;
      } else {
        slots[sid].roleId = targetDuty === "Defend" ? "CM_D" : "CM_S";
        slots[sid].duty = targetDuty;
      }
      slots[sid].playerName = null; // Let Phase H reassign
    }
  }

  // 2. Ensure at least one playmaker or holding role if midfield has 2+ slots
  if (midSlots.length >= 2) {
    var hasPlaymakerOrHolder = false;
    midSlots.forEach(function (sid) {
      var role = getRoleById(slots[sid].roleId);
      if (!role) return;
      if (role.isPlaymaker) {
        hasPlaymakerOrHolder = true;
      }
      // Holding roles: DLP, Anchor, Half-Back, DM(Defend), CM(Defend)
      if (role.abbreviation === "DLP" || role.abbreviation === "Anchor" || role.abbreviation === "HB" ||
        (role.abbreviation === "DM" && role.duty === "Defend") ||
        (role.abbreviation === "CM" && role.duty === "Defend")) {
        hasPlaymakerOrHolder = true;
      }
    });

    if (!hasPlaymakerOrHolder) {
      // Find the deepest slot to convert to a playmaker or holder
      // Deepest strata priority: DM > CM
      var bestSlotId = null;
      var bestStrata = null;

      // Check if we have a DM slot
      midSlots.forEach(function (sid) {
        var def = GLOBAL_PITCH_SLOTS[sid];
        if (def && def.strata === "DM") {
          bestSlotId = sid;
          bestStrata = "DM";
        }
      });

      // Fallback to CM if no DM slot
      if (!bestSlotId) {
        midSlots.forEach(function (sid) {
          var def = GLOBAL_PITCH_SLOTS[sid];
          if (def && def.strata === "CM") {
            bestSlotId = sid;
            bestStrata = "CM";
          }
        });
      }

      if (bestSlotId) {
        // Convert to DLP or DM_D
        var currentRole = getRoleById(slots[bestSlotId].roleId);
        var currentDuty = currentRole ? currentRole.duty : "Support";
        if (bestStrata === "DM") {
          var att = normalizeAttr(manager.Att || 10);
          if (att >= 0.5) {
            slots[bestSlotId].roleId = currentDuty === "Defend" ? "DLP_D" : "DLP_S";
          } else {
            slots[bestSlotId].roleId = "DM_D";
          }
        } else {
          // CM slot: convert to DLP_CM or CM_D
          var att = normalizeAttr(manager.Att || 10);
          if (att >= 0.5) {
            slots[bestSlotId].roleId = currentDuty === "Defend" ? "DLP_CM_D" : "DLP_CM_S";
          } else {
            slots[bestSlotId].roleId = "CM_D";
          }
        }
        var newRole = getRoleById(slots[bestSlotId].roleId);
        slots[bestSlotId].duty = newRole ? newRole.duty : currentDuty;
        slots[bestSlotId].playerName = null; // Let Phase H reassign
      }
    }
  }

  // 3. Prevent lone DM from being a BWM or SV
  var dmSlots = [];
  Object.keys(slots).forEach(function (sid) {
    var def = GLOBAL_PITCH_SLOTS[sid];
    if (def && def.strata === "DM") dmSlots.push(sid);
  });
  if (dmSlots.length === 1) {
    var loneDmSid = dmSlots[0];
    var loneDmRole = getRoleById(slots[loneDmSid].roleId);
    if (loneDmRole && loneDmRole.abbreviation === "BWM") {
      var targetDuty = loneDmRole.duty || "Defend";
      if (targetDuty === "Defend") {
        var att = normalizeAttr(manager.Att || 10);
        slots[loneDmSid].roleId = (att < 0.4) ? "Anchor_D" : "DM_D";
        slots[loneDmSid].duty = "Defend";
      } else {
        slots[loneDmSid].roleId = "DM_S";
        slots[loneDmSid].duty = "Support";
      }
      slots[loneDmSid].playerName = null;
    } else if (loneDmRole && loneDmRole.abbreviation === "SV") {
      slots[loneDmSid].roleId = "DM_S";
      slots[loneDmSid].duty = "Support";
      slots[loneDmSid].playerName = null;
    }
  }

  return slots;
}

function enforceSweeperKeeper(slots, manager, instructions) {
  if (!slots.GK) return slots;
  var gkRole = getRoleById(slots.GK.roleId);
  if (!gkRole) return slots;

  var dl = instructions ? instructions.defensiveLine : null;
  var isHighLine = (dl === "Higher" || dl === "Much Higher");

  if (isHighLine && gkRole.abbreviation === "GK") {
    var skRoles = ["SK_D", "SK_S", "SK_A"];
    var bestSk = "SK_S";
    var bestScore = -1;
    skRoles.forEach(function (skId) {
      var s = roleScoreForManager(skId, manager);
      if (s > bestScore) {
        bestScore = s;
        bestSk = skId;
      }
    });
    var newRole = getRoleById(bestSk);
    if (newRole) {
      slots.GK.roleId = bestSk;
      slots.GK.duty = newRole.duty;
    }
  }
  return slots;
}

function enforceTacticalFeasibility(slots, manager, instructions, formation) {
  // 1. FLANK WIDTH ENFORCEMENT
  function providesWidth(roleId) {
    if (!roleId) return false;
    var role = getRoleById(roleId);
    if (!role) return false;
    var abbr = role.abbreviation;
    if (abbr === "W" || abbr === "WM" || abbr === "DW" || abbr === "WB" || abbr === "CWB" || abbr === "FB") {
      return true;
    }
    return false;
  }

  // Check Left Flank
  var hasLeftFlank = ["DL", "WBL", "ML", "AML"].some(function (sid) { return slots[sid] && slots[sid].roleId; });
  if (hasLeftFlank) {
    var leftWidth = ["DL", "WBL", "ML", "AML"].some(function (sid) {
      return slots[sid] && slots[sid].roleId && providesWidth(slots[sid].roleId);
    });
    if (!leftWidth) {
      if (slots["WBL"]) {
        slots["WBL"].roleId = "WB_S";
        slots["WBL"].duty = "Support";
        slots["WBL"].playerName = null;
      } else if (slots["DL"]) {
        slots["DL"].roleId = "FB_S";
        slots["DL"].duty = "Support";
        slots["DL"].playerName = null;
      } else if (slots["ML"]) {
        slots["ML"].roleId = "Winger_WM_S";
        slots["ML"].duty = "Support";
        slots["ML"].playerName = null;
      } else if (slots["AML"]) {
        slots["AML"].roleId = "IF_S";
        slots["AML"].duty = "Support";
        slots["AML"].playerName = null;
      }
    }
  }

  // Check Right Flank
  var hasRightFlank = ["DR", "WBR", "MR", "AMR"].some(function (sid) { return slots[sid] && slots[sid].roleId; });
  if (hasRightFlank) {
    var rightWidth = ["DR", "WBR", "MR", "AMR"].some(function (sid) {
      return slots[sid] && slots[sid].roleId && providesWidth(slots[sid].roleId);
    });
    if (!rightWidth) {
      if (slots["WBR"]) {
        slots["WBR"].roleId = "WB_S";
        slots["WBR"].duty = "Support";
        slots["WBR"].playerName = null;
      } else if (slots["DR"]) {
        slots["DR"].roleId = "FB_S";
        slots["DR"].duty = "Support";
        slots["DR"].playerName = null;
      } else if (slots["MR"]) {
        slots["MR"].roleId = "Winger_WM_S";
        slots["MR"].duty = "Support";
        slots["MR"].playerName = null;
      } else if (slots["AMR"]) {
        slots["AMR"].roleId = "IF_S";
        slots["AMR"].duty = "Support";
        slots["AMR"].playerName = null;
      }
    }
  }

  // 2. MIDFIELD DEFENSIVE SHIELD ENFORCEMENT
  var midSlots = [];
  Object.keys(slots).forEach(function (sid) {
    var def = GLOBAL_PITCH_SLOTS[sid];
    if (def && (def.strata === "DM" || def.strata === "CM")) {
      midSlots.push(sid);
    }
  });

  if (midSlots.length >= 2) {
    var hasShield = false;
    midSlots.forEach(function (sid) {
      var role = getRoleById(slots[sid].roleId);
      if (!role) return;
      var abbr = role.abbreviation;
      if (abbr === "Anchor" || abbr === "HB" ||
        (abbr === "DM" && role.duty === "Defend") ||
        (abbr === "BWM" && role.duty === "Defend") ||
        (abbr === "DLP" && role.duty === "Defend") ||
        (abbr === "CM" && role.duty === "Defend")) {
        hasShield = true;
      }
    });

    if (!hasShield) {
      var targetSid = null;
      var targetStrata = null;

      midSlots.forEach(function (sid) {
        var def = GLOBAL_PITCH_SLOTS[sid];
        if (def && def.strata === "DM") {
          targetSid = sid;
          targetStrata = "DM";
        }
      });
      if (!targetSid) {
        midSlots.forEach(function (sid) {
          var def = GLOBAL_PITCH_SLOTS[sid];
          if (def && def.strata === "CM") {
            targetSid = sid;
            targetStrata = "CM";
          }
        });
      }

      if (targetSid) {
        var currentRole = getRoleById(slots[targetSid].roleId);
        var currentDuty = currentRole ? currentRole.duty : "Support";
        var managerAtt = normalizeAttr(manager.Att || 10);

        if (targetStrata === "DM") {
          slots[targetSid].roleId = (managerAtt >= 0.5) ? "DLP_D" : "DM_D";
        } else {
          slots[targetSid].roleId = (managerAtt >= 0.5) ? "DLP_CM_D" : "CM_D";
        }
        var newRole = getRoleById(slots[targetSid].roleId);
        slots[targetSid].duty = newRole ? newRole.duty : "Defend";
        slots[targetSid].playerName = null;
      }
    }
  }

  // 3. REST DEFENCE ENFORCEMENT
  function getRestDefenceCount() {
    var rdCount = 0;
    Object.keys(slots).forEach(function (sid) {
      var def = GLOBAL_PITCH_SLOTS[sid];
      if (!def || def.strata === "GK") return;

      var slot = slots[sid];
      if (!slot || !slot.roleId) return;

      var role = getRoleById(slot.roleId);
      if (!role) return;

      if (def.strata === "DC" && slot.roleId !== "WCB_A") {
        rdCount++;
        return;
      }

      var abbr = role.abbreviation;
      var isHolder = (abbr === "Anchor" || abbr === "HB" ||
        abbr === "IFB" ||
        (abbr === "DM" && role.duty === "Defend") ||
        (abbr === "BWM" && role.duty === "Defend") ||
        (abbr === "DLP" && role.duty === "Defend") ||
        (abbr === "CM" && role.duty === "Defend") ||
        (abbr === "FB" && role.duty === "Defend") ||
        (abbr === "NFB" && role.duty === "Defend") ||
        (abbr === "WB" && role.duty === "Defend") ||
        (abbr === "IWB" && role.duty === "Defend"));
      if (isHolder) {
        rdCount++;
      }
    });
    return rdCount;
  }

  var safetyIter = 0;
  while (getRestDefenceCount() < 3 && safetyIter < 3) {
    safetyIter++;
    var converted = false;
    var strataPriority = ["DM", "CM", "DL", "DR", "WBL", "WBR"];

    for (var i = 0; i < strataPriority.length && !converted; i++) {
      var strata = strataPriority[i];
      var candidateSids = [];
      Object.keys(slots).forEach(function (sid) {
        var def = GLOBAL_PITCH_SLOTS[sid];
        if (def && def.strata === strata && slots[sid] && slots[sid].duty === "Support") {
          candidateSids.push(sid);
        }
      });

      if (candidateSids.length > 0) {
        var sid = candidateSids[0];
        var role = getRoleById(slots[sid].roleId);
        if (role) {
          if (strata === "DM") {
            slots[sid].roleId = "DM_D";
            slots[sid].duty = "Defend";
          } else if (strata === "CM") {
            slots[sid].roleId = "CM_D";
            slots[sid].duty = "Defend";
          } else if (strata === "DL" || strata === "DR") {
            slots[sid].roleId = "FB_D";
            slots[sid].duty = "Defend";
          } else if (strata === "WBL" || strata === "WBR") {
            slots[sid].roleId = "WB_D";
            slots[sid].duty = "Defend";
          }
          slots[sid].playerName = null;
          converted = true;
        }
      }
    }
    if (!converted) break;
  }

  // 4. BOX THREAT / ATTACKING RUNNER ENFORCEMENT
  var hasStrikerSlot = Object.keys(slots).some(function (sid) {
    var def = GLOBAL_PITCH_SLOTS[sid];
    return def && def.strata === "ST";
  });

  function hasAttackingBoxThreat() {
    return Object.keys(slots).some(function (sid) {
      var slot = slots[sid];
      if (!slot || !slot.roleId) return false;
      var role = getRoleById(slot.roleId);
      if (!role) return false;
      var abbr = role.abbreviation;

      if (role.strata === "ST" && abbr !== "F9" && slot.roleId !== "DLF_S") {
        return true;
      }
      if (role.duty === "Attack" && (abbr === "IF" || abbr === "IW" || abbr === "RMD" || abbr === "SS" || abbr === "AM" || abbr === "Mezzala" || abbr === "CM")) {
        return true;
      }
      return false;
    });
  }

  if (!hasAttackingBoxThreat()) {
    if (hasStrikerSlot) {
      var stSlot = Object.keys(slots).find(function (sid) {
        var def = GLOBAL_PITCH_SLOTS[sid];
        return def && def.strata === "ST";
      });
      if (stSlot) {
        slots[stSlot].roleId = "AF_A";
        slots[stSlot].duty = "Attack";
        slots[stSlot].playerName = null;
      }
    } else {
      var candidates = ["AMC", "AML", "AMR"];
      var targetSid = null;
      for (var i = 0; i < candidates.length; i++) {
        if (slots[candidates[i]] && slots[candidates[i]].roleId) {
          targetSid = candidates[i];
          break;
        }
      }
      if (targetSid) {
        if (targetSid === "AMC") {
          slots[targetSid].roleId = "SS_A";
          slots[targetSid].duty = "Attack";
        } else {
          slots[targetSid].roleId = "IF_A";
          slots[targetSid].duty = "Attack";
        }
        slots[targetSid].playerName = null;
      }
    }
  }

  return slots;
}

// ─── PHASE E2: RELATIONSHIP ENFORCEMENT (cross-strata pairing validation) ───
// Uses RELATIONSHIP_PAIRINGS data tables to detect and fix role conflicts.
// All functions read from the global RELATIONSHIP_PAIRINGS variable.

function getStrataSlots(slots, strata) {
  var result = {};
  Object.keys(slots).forEach(function (sid) {
    var def = GLOBAL_PITCH_SLOTS[sid];
    if (def && (def.strata === strata || (Array.isArray(def.strata) && def.strata.indexOf(strata) !== -1))) {
      result[sid] = slots[sid];
    }
  });
  return result;
}

function getSlotRoleId(slot) {
  return slot && slot.roleId ? slot.roleId : null;
}

function findCompatibleRole(strata, currentRoleId, targetRoleId, table, manager) {
  var currentRole = getRoleById(currentRoleId);
  var currentAbbr = currentRole ? currentRole.abbreviation : "";
  var currentDuty = currentRole ? currentRole.duty : "";
  var candidates = FM24_ROLES.filter(function (r) {
    if (!roleHasStrata(r, strata)) return false;
    if (r.id === currentRoleId) return false;
    if (isAntiMetaRole(r.id)) return false;
    return true;
  });

  var scored = [];
  candidates.forEach(function (r) {
    var compat = getPairingCompatibility(r.id, targetRoleId, table);
    var aff = roleScoreForManager(r.id, manager);
    var sameAbbr = r.abbreviation === currentAbbr ? 0.8 : 1.0;
    var sameDuty = r.duty === currentDuty ? 0.9 : 1.0;
    var total = compat * 0.6 + aff * 0.3 * sameAbbr * sameDuty;
    scored.push({ id: r.id, score: total });
  });

  if (scored.length === 0) return null;
  scored.sort(function (a, b) { return b.score - a.score; });

  // DNA-based variety/entropy
  var dna = getManagerDNA(manager ? manager.Name : "");
  if (scored.length > 1 && dna.roleExperimentation > 0.3) {
    var margin = 0.05 + 0.15 * dna.roleExperimentation;
    if (scored[0].score - scored[1].score < margin) {
      var hash = 0;
      var salt = currentRoleId + strata;
      for (var i = 0; i < salt.length; i++) {
        hash = salt.charCodeAt(i) + ((hash << 5) - hash);
      }
      var val = Math.abs((dna.seed * 1000 + hash) % 100) / 100;
      var pSwap = 0.1 + 0.4 * dna.roleExperimentation;
      if (val < pSwap) {
        return scored[1].id;
      }
    }
  }

  return scored[0].id;
}

// #6 — CB + FB CHANNEL COVER
function enforceCBcoverage(slots, manager, formation) {
  var table = RELATIONSHIP_PAIRINGS && RELATIONSHIP_PAIRINGS.CB_FB_channel;
  if (!table) return slots;

  var cbSlots = getStrataSlots(slots, "DC");
  var wdSlots = getStrataSlots(slots, "WD");
  var wbSlots = getStrataSlots(slots, "WB");

  var fbRole = null, fbSid = null;
  Object.keys(wdSlots).forEach(function (sid) { if (!fbRole) { fbRole = getSlotRoleId(wdSlots[sid]); fbSid = sid; } });
  Object.keys(wbSlots).forEach(function (sid) { if (!fbRole) { fbRole = getSlotRoleId(wbSlots[sid]); fbSid = sid; } });

  if (!fbRole || Object.keys(cbSlots).length === 0) return slots;

  var cbSids = Object.keys(cbSlots);
  var worstCompat = 1.0, worstCbSid = null;
  cbSids.forEach(function (sid) {
    var cbRole = getSlotRoleId(cbSlots[sid]);
    if (!cbRole) return;
    var compat = getPairingCompatibility(cbRole, fbRole, table);
    if (compat < worstCompat) { worstCompat = compat; worstCbSid = sid; }
  });

  // If any CB pair has very poor compatibility with the FB, try to fix the worst offender
  if (worstCompat < 0.3 && worstCbSid) {
    var worstRole = getSlotRoleId(cbSlots[worstCbSid]);
    // Find the other CB roles on the field (for context on which role to change to)
    var otherCbRoles = [];
    cbSids.forEach(function (sid) {
      if (sid !== worstCbSid) {
        var r = getSlotRoleId(cbSlots[sid]);
        if (r) otherCbRoles.push(r);
      }
    });
    // Try to find a better CB that complements both the FB and other CBs
    var currentRole = getRoleById(worstRole);
    var currentAbbr = currentRole ? currentRole.abbreviation : "";
    var candidates = FM24_ROLES.filter(function (r) {
      if (!roleHasStrata(r, "DC")) return false;
      if (!isRoleAllowedForSlot(r.id, worstCbSid, slots, formation)) return false;
      if (r.id === worstRole) return false;
      if (isAntiMetaRole(r.id)) return false;
      // Prefer same duty
      if (r.duty !== (currentRole ? currentRole.duty : "Defend")) return false;
      // Avoid same abbreviation (don't want CD_ST if we already have CD_D)
      for (var oi = 0; oi < otherCbRoles.length; oi++) {
        var oc = getRoleById(otherCbRoles[oi]);
        if (oc && oc.abbreviation === r.abbreviation) return false;
      }
      return true;
    });
    var best = null, bestScore = -1;
    candidates.forEach(function (r) {
      var fbCompat = getPairingCompatibility(r.id, fbRole, table);
      var cbCompat = 1.0;
      otherCbRoles.forEach(function (ocr) {
        var c = getPairingCompatibility(r.id, ocr, table);
        if (c < cbCompat) cbCompat = c;
      });
      var aff = roleScoreForManager(r.id, manager);
      var archetypeMatch = 0.5;
      var entry = getPairingEntry(r.id, fbRole, table);
      if (entry && entry.archetypes) {
        var phil = manager._philosophy || "";
        for (var ai = 0; ai < entry.archetypes.length; ai++) {
          var map = { "pos": "possession-oriented tactician", "press": "aggressive high-press tactician", "def": "disciplined defensive organiser", "ctr": "direct counter-attacker", "bal": "pragmatic system-adapter" };
          if (map[entry.archetypes[ai]] === phil) { archetypeMatch = 1.0; break; }
        }
      }
      var total = fbCompat * 0.4 + cbCompat * 0.3 + aff * 0.2 + archetypeMatch * 0.1;
      if (total > bestScore) { bestScore = total; best = r.id; }
    });
    if (best && bestScore > 0.3) {
      var newRole = getRoleById(best);
      cbSlots[worstCbSid].roleId = best;
      cbSlots[worstCbSid].duty = newRole ? newRole.duty : "Defend";
      cbSlots[worstCbSid].playerName = null;
    }
  }
  return slots;
}

// #8 — DM + FB FLANK COVER
function enforceDMflankCover(slots, manager, formation) {
  var table = RELATIONSHIP_PAIRINGS && RELATIONSHIP_PAIRINGS.DM_FB_flank;
  if (!table) return slots;

  var dmSlots = getStrataSlots(slots, "DM");
  var wdSlots = getStrataSlots(slots, "WD");
  var wbSlots = getStrataSlots(slots, "WB");

  if (Object.keys(dmSlots).length === 0) return slots;

  var fbRole = null, fbSid = null;
  Object.keys(wdSlots).forEach(function (sid) { if (!fbRole) { fbRole = getSlotRoleId(wdSlots[sid]); fbSid = sid; } });
  Object.keys(wbSlots).forEach(function (sid) { if (!fbRole) { fbRole = getSlotRoleId(wbSlots[sid]); fbSid = sid; } });
  if (!fbRole) return slots;

  var dmSids = Object.keys(dmSlots);
  var worstCompat = 1.0, worstDmSid = null;
  dmSids.forEach(function (sid) {
    var dmRole = getSlotRoleId(dmSlots[sid]);
    if (!dmRole) return;
    var compat = getPairingCompatibility(dmRole, fbRole, table);
    if (compat < worstCompat) { worstCompat = compat; worstDmSid = sid; }
  });

  if (worstCompat < 0.3 && worstDmSid) {
    var worstRole = getSlotRoleId(dmSlots[worstDmSid]);
    var currentRole = getRoleById(worstRole);
    var currentDuty = currentRole ? currentRole.duty : "Defend";
    var candidates = FM24_ROLES.filter(function (r) {
      if (!roleHasStrata(r, "DM")) return false;
      if (r.id === worstRole) return false;
      if (isAntiMetaRole(r.id)) return false;
      if (r.duty !== currentDuty) return false;
      return true;
    });
    var best = null, bestScore = -1;
    candidates.forEach(function (r) {
      var compat = getPairingCompatibility(r.id, fbRole, table);
      var aff = roleScoreForManager(r.id, manager);
      var total = compat * 0.6 + aff * 0.4;
      if (total > bestScore) { bestScore = total; best = r.id; }
    });
    if (best && bestScore > 0.3) {
      var newRole = getRoleById(best);
      dmSlots[worstDmSid].roleId = best;
      dmSlots[worstDmSid].duty = newRole ? newRole.duty : currentDuty;
      dmSlots[worstDmSid].playerName = null;
    }
  }
  return slots;
}

// #9 — DM + CB PRESSING COORDINATION
function enforceDMCBpressing(slots, manager) {
  var table = RELATIONSHIP_PAIRINGS && RELATIONSHIP_PAIRINGS.DM_CB_press;
  if (!table) return slots;

  var dmSlots = getStrataSlots(slots, "DM");
  var cbSlots = getStrataSlots(slots, "DC");

  if (Object.keys(dmSlots).length === 0 || Object.keys(cbSlots).length === 0) return slots;

  var dmSids = Object.keys(dmSlots);
  var cbSids = Object.keys(cbSlots);

  dmSids.forEach(function (dmSid) {
    var dmRole = getSlotRoleId(dmSlots[dmSid]);
    if (!dmRole) return;

    cbSids.forEach(function (cbSid) {
      var cbRole = getSlotRoleId(cbSlots[cbSid]);
      if (!cbRole) return;

      var compat = getPairingCompatibility(dmRole, cbRole, table);
      if (compat >= 0.3) return; // acceptable

      // BWM + CD_ST or BPD_ST = double-step conflict. Demote the CB to CD_D
      var dmRoleObj = getRoleById(dmRole);
      var cbRoleObj = getRoleById(cbRole);
      if (dmRoleObj && cbRoleObj) {
        var dmAbbr = dmRoleObj.abbreviation;
        var cbAbbr = cbRoleObj.abbreviation;
        if ((dmAbbr === "BWM" || dmAbbr === "RPM") && (cbAbbr === "BPD" || cbAbbr === "CD") && cbRoleObj.duty !== "Defend") {
          var newId = cbAbbr === "BPD" ? "BPD_D" : "CD_D";
          if (!isAntiMetaRole(newId)) {
            cbSlots[cbSid].roleId = newId;
            cbSlots[cbSid].duty = "Defend";
            cbSlots[cbSid].playerName = null;
          }
        }
      }
    });
  });
  return slots;
}

function getBestFixDirection(slotA_id, slotB_id, slots, strata_A, strata_B, table, manager, philosophy) {
  var roleA = slots[slotA_id] && slots[slotA_id].roleId;
  var roleB = slots[slotB_id] && slots[slotB_id].roleId;
  if (!roleA || !roleB) return "B";

  var altA = findCompatibleRole(strata_A, roleA, roleB, table, manager);
  var altB = findCompatibleRole(strata_B, roleB, roleA, table, manager);

  if (!altA) return "B";
  if (!altB) return "A";

  var scoreAlt_A = roleScoreForManager(altA, manager) * philosophyRoleMultiplier(altA, philosophy);
  var scoreAlt_B = roleScoreForManager(altB, manager) * philosophyRoleMultiplier(altB, philosophy);

  return scoreAlt_A > scoreAlt_B ? "A" : "B";
}

// #14 — MEZZALA + OPPOSITE CM COVER
function enforceMezzalaCover(slots, manager) {
  var table = RELATIONSHIP_PAIRINGS && RELATIONSHIP_PAIRINGS.Mezzala_CM_cover;
  if (!table) return slots;

  var cmSlots = getStrataSlots(slots, "CM");
  var dmSlots = getStrataSlots(slots, "DM");

  if (Object.keys(cmSlots).length < 2 && Object.keys(dmSlots).length === 0) return slots;

  var cmSids = Object.keys(cmSlots);
  var mezzSid = null, mezzRole = null;
  cmSids.forEach(function (sid) {
    var role = getRoleById(getSlotRoleId(cmSlots[sid]));
    if (role && role.abbreviation === "Mezzala") { mezzSid = sid; mezzRole = role.id; }
  });

  if (!mezzRole) return slots; // no Mezzala in the formation

  // Find opposite CM or DM to check coverage
  var coverSid = null, coverRole = null;
  cmSids.forEach(function (sid) {
    if (sid !== mezzSid && !coverRole) { coverRole = getSlotRoleId(cmSlots[sid]); coverSid = sid; }
  });

  if (!coverRole) {
    // Check DM as cover spine
    var dmSids = Object.keys(dmSlots);
    if (dmSids.length > 0) { coverRole = getSlotRoleId(dmSlots[dmSids[0]]); }
  }

  if (!coverRole) return slots;

  var compat = getPairingCompatibility(mezzRole, coverRole, table);
  if (compat >= 0.3) return slots; // fine

  var fixDir = getBestFixDirection(mezzSid, coverSid, slots, "CM", GLOBAL_PITCH_SLOTS[coverSid].strata, table, manager, null);
  if (fixDir === "A") {
    var altA = findCompatibleRole("CM", mezzRole, coverRole, table, manager);
    if (altA) {
      var newRole = getRoleById(altA);
      cmSlots[mezzSid].roleId = altA;
      cmSlots[mezzSid].duty = newRole ? newRole.duty : "Support";
    }
  } else {
    var altB = findCompatibleRole(GLOBAL_PITCH_SLOTS[coverSid].strata, coverRole, mezzRole, table, manager);
    if (altB) {
      var newRole = getRoleById(altB);
      if (cmSlots[coverSid]) {
        cmSlots[coverSid].roleId = altB;
        cmSlots[coverSid].duty = newRole ? newRole.duty : "Defend";
      } else if (dmSlots[coverSid]) {
        dmSlots[coverSid].roleId = altB;
        dmSlots[coverSid].duty = newRole ? newRole.duty : "Defend";
      }
    }
  }
  return slots;
}

// #18 — AM + CM BALANCE
function enforceAMCMBalance(slots, manager) {
  var table = RELATIONSHIP_PAIRINGS && RELATIONSHIP_PAIRINGS.AM_CM_balance;
  if (!table) return slots;

  var amSlots = getStrataSlots(slots, "AMC");
  var cmSlots = getStrataSlots(slots, "CM");

  if (Object.keys(amSlots).length === 0 || Object.keys(cmSlots).length === 0) return slots;

  var amSid = null, amRole = null;
  Object.keys(amSlots).forEach(function (sid) { if (!amRole) { amRole = getSlotRoleId(amSlots[sid]); amSid = sid; } });
  if (!amRole) return slots;

  // Find a CM partner (prefer central CM)
  var cmSids = Object.keys(cmSlots);
  var worstCompat = 1.0, worstCmSid = null, worstCmRole = null;
  cmSids.forEach(function (sid) {
    var cmRole = getSlotRoleId(cmSlots[sid]);
    if (!cmRole) return;
    var compat = getPairingCompatibility(amRole, cmRole, table);
    if (compat < worstCompat) { worstCompat = compat; worstCmSid = sid; worstCmRole = cmRole; }
  });

  if (worstCompat >= 0.3 || !worstCmSid) return slots;

  var fixDir = getBestFixDirection(amSid, worstCmSid, slots, "AMC", "CM", table, manager, null);
  if (fixDir === "A") {
    var altA = findCompatibleRole("AMC", amRole, worstCmRole, table, manager);
    if (altA) {
      var newRole = getRoleById(altA);
      amSlots[amSid].roleId = altA;
      amSlots[amSid].duty = newRole ? newRole.duty : "Support";
    }
  } else {
    var altB = findCompatibleRole("CM", worstCmRole, amRole, table, manager);
    if (altB) {
      var newRole = getRoleById(altB);
      cmSlots[worstCmSid].roleId = altB;
      cmSlots[worstCmSid].duty = newRole ? newRole.duty : "Support";
    }
  }
  return slots;
}

// #21 — FALSE 9 + SURROUNDS
function enforceF9Surrounds(slots, manager) {
  var table = RELATIONSHIP_PAIRINGS && RELATIONSHIP_PAIRINGS.F9_surrounds;
  if (!table) return slots;

  // Check if there's an F9
  var hasF9 = false, f9Sid = null, f9Role = null;
  var stSlots = getStrataSlots(slots, "ST");
  Object.keys(stSlots).forEach(function (sid) {
    var role = getRoleById(getSlotRoleId(stSlots[sid]));
    if (role && role.abbreviation === "F9") { hasF9 = true; f9Sid = sid; f9Role = role.id; }
  });
  if (!hasF9) return slots;

  // Check WA and AMC slots for box-filling roles
  var waSlots = getStrataSlots(slots, "WA");
  var amSlots = getStrataSlots(slots, "AMC");

  var hasBoxFiller = false;
  Object.keys(waSlots).forEach(function (sid) {
    var role = getRoleById(getSlotRoleId(waSlots[sid]));
    if (!role) return;
    if (role.abbreviation === "IF" || role.abbreviation === "IW") {
      var compat = getPairingCompatibility("F9_S", role.id, table);
      if (compat >= 0.7) hasBoxFiller = true;
    }
  });
  Object.keys(amSlots).forEach(function (sid) {
    var role = getRoleById(getSlotRoleId(amSlots[sid]));
    if (!role) return;
    if (role.abbreviation === "SS" || role.abbreviation === "AM") {
      hasBoxFiller = true;
    }
  });

  if (!hasBoxFiller) {
    var waKeys = Object.keys(waSlots);
    var targetWaSid = waKeys.length > 0 ? waKeys[0] : null;
    if (targetWaSid) {
      var fixDir = getBestFixDirection(f9Sid, targetWaSid, slots, "ST", "WA", table, manager, null);
      if (fixDir === "A") {
        var altA = findCompatibleRole("ST", f9Role, getSlotRoleId(waSlots[targetWaSid]), table, manager);
        if (altA) {
          var newRole = getRoleById(altA);
          stSlots[f9Sid].roleId = altA;
          stSlots[f9Sid].duty = newRole ? newRole.duty : "Support";
        }
      } else {
        var waRole = getSlotRoleId(waSlots[targetWaSid]);
        var altB = findCompatibleRole("WA", waRole, f9Role, table, manager);
        if (altB) {
          var newRole = getRoleById(altB);
          waSlots[targetWaSid].roleId = altB;
          waSlots[targetWaSid].duty = newRole ? newRole.duty : "Support";
        }
      }
    }
  }
  return slots;
}

// #22 — TARGET MAN + SUPPORT CAST
function enforceTMSupport(slots, manager) {
  var table = RELATIONSHIP_PAIRINGS && RELATIONSHIP_PAIRINGS.TM_support;
  if (!table) return slots;

  // Check if there's a Target Man
  var hasTM = false, tmRole = null, tmSid = null;
  var stSlots = getStrataSlots(slots, "ST");
  Object.keys(stSlots).forEach(function (sid) {
    var role = getRoleById(getSlotRoleId(stSlots[sid]));
    if (role && role.abbreviation === "TF") { hasTM = true; tmRole = role.id; tmSid = sid; }
  });
  if (!hasTM || !tmRole) return slots;

  // Check for cross suppliers: W, WB_A, CWB, WM, WTM on WA/WM/WB strata
  var waSlots = getStrataSlots(slots, "WA");
  var wmSlots = getStrataSlots(slots, "WM");
  var wbSlots = getStrataSlots(slots, "WB");
  var wdSlots = getStrataSlots(slots, "WD");

  var hasCrosser = false;
  var hasRunner = false;

  function checkCrosser(roleId) {
    var r = getRoleById(roleId);
    if (!r) return false;
    var a = r.abbreviation;
    return a === "W" || a === "WM" || a === "WB" || a === "CWB" || a === "WTM";
  }
  function checkRunner(roleId) {
    var r = getRoleById(roleId);
    if (!r) return false;
    var a = r.abbreviation;
    return a === "BBM" || a === "CM" || a === "Mezzala" || a === "SS" || a === "AM" || a === "BBM";
  }

  [waSlots, wmSlots, wbSlots, wdSlots].forEach(function (slotSet) {
    Object.keys(slotSet).forEach(function (sid) {
      var rid = getSlotRoleId(slotSet[sid]);
      if (rid && checkCrosser(rid)) hasCrosser = true;
    });
  });

  // Check CM/AM for second-ball runners
  var cmSlots = getStrataSlots(slots, "CM");
  var amSlots = getStrataSlots(slots, "AMC");
  [cmSlots, amSlots].forEach(function (slotSet) {
    Object.keys(slotSet).forEach(function (sid) {
      var rid = getSlotRoleId(slotSet[sid]);
      if (rid && checkRunner(rid)) hasRunner = true;
    });
  });

  // If no cross supplier and there's an inverted FB or IWB, try to promote a WB to WB_A
  if (!hasCrosser) {
    var targetWd = Object.keys(wdSlots)[0];
    if (targetWd) {
      var fixDir = getBestFixDirection(tmSid, targetWd, slots, "ST", "WD", table, manager, null);
      if (fixDir === "A") {
        var altA = findCompatibleRole("ST", tmRole, getSlotRoleId(wdSlots[targetWd]), table, manager);
        if (altA) {
          var newRole = getRoleById(altA);
          stSlots[tmSid].roleId = altA;
          stSlots[tmSid].duty = newRole ? newRole.duty : "Support";
          hasCrosser = true;
        }
      } else {
        var rid = getSlotRoleId(wdSlots[targetWd]);
        var altB = findCompatibleRole("WD", rid, tmRole, table, manager);
        if (altB) {
          var newRole = getRoleById(altB);
          wdSlots[targetWd].roleId = altB;
          wdSlots[targetWd].duty = newRole ? newRole.duty : "Support";
          hasCrosser = true;
        }
      }
    }
  }
  // If still no crosser, try WA or WM strata
  if (!hasCrosser) {
    Object.keys(waSlots).forEach(function (sid) {
      var rid = getSlotRoleId(waSlots[sid]);
      var r = getRoleById(rid);
      if (r && r.abbreviation === "IW") {
        var newId = r.duty === "Attack" ? "W_A" : "W_S";
        if (!isAntiMetaRole(newId)) {
          waSlots[sid].roleId = newId;
          waSlots[sid].duty = r.duty;
          hasCrosser = true;
        }
      }
    });
  }

  // If no second-ball runner, promote a CM_S to BBM_S
  if (!hasRunner) {
    Object.keys(cmSlots).forEach(function (sid) {
      var rid = getSlotRoleId(cmSlots[sid]);
      var r = getRoleById(rid);
      if (r && r.abbreviation === "CM" && r.duty === "Support") {
        var newId = "BBM_S";
        if (!isAntiMetaRole(newId)) {
          cmSlots[sid].roleId = newId;
          cmSlots[sid].duty = "Support";
          hasRunner = true;
        }
      }
    });
  }

  return slots;
}

// #24b — WIDTH BALANCE CHECK
function enforceWidthBalance(slots, formation, manager) {
  function isWidthRole(roleId) {
    if (!roleId) return false;
    var role = getRoleById(roleId);
    if (!role) return false;
    var abbr = role.abbreviation;
    if (abbr === "W" || abbr === "WM" || abbr === "DW" || abbr === "WB" || abbr === "CWB") return true;
    if (abbr === "FB" && (role.duty === "Support" || role.duty === "Attack")) return true;
    return false;
  }

  function isCuttingInside(roleId) {
    if (!roleId) return false;
    var role = getRoleById(roleId);
    if (!role) return false;
    var abbr = role.abbreviation;
    return abbr === "IF" || abbr === "IW";
  }

  function countWidthOnFlank(slots, flankSlots) {
    var count = 0;
    flankSlots.forEach(function (sid) {
      if (slots[sid] && slots[sid].roleId && isWidthRole(slots[sid].roleId)) count++;
    });
    return count;
  }

  // Check A: Flank overcommit — 3+ width on one side, 0 on the other
  var leftFlankSlots = ["DL", "WBL", "ML", "AML"];
  var rightFlankSlots = ["DR", "WBR", "MR", "AMR"];
  var leftWidthCount = countWidthOnFlank(slots, leftFlankSlots);
  var rightWidthCount = countWidthOnFlank(slots, rightFlankSlots);
  var overloadedSide = null;
  if (leftWidthCount >= 3 && rightWidthCount === 0) overloadedSide = "L";
  if (rightWidthCount >= 3 && leftWidthCount === 0) overloadedSide = "R";
  if (overloadedSide) {
    var waSlot = overloadedSide === "L" ? "AML" : "AMR";
    if (slots[waSlot] && slots[waSlot].roleId && isWidthRole(slots[waSlot].roleId)) {
      var if_s = getRoleId("IF", "Support", "WA") || getRoleId("IW", "Support", "WA");
      if (if_s) {
        slots[waSlot].roleId = if_s;
        slots[waSlot].duty = "Support";
        slots[waSlot].playerName = null;
      }
    }
  }

  // Check B: Tunnel vision — both WA cutting inside with no deep width
  if (slots["AML"] && slots["AML"].roleId && slots["AMR"] && slots["AMR"].roleId) {
    if (isCuttingInside(slots["AML"].roleId) && isCuttingInside(slots["AMR"].roleId)) {
      var leftDeep = false;
      if (slots["DL"] && slots["DL"].roleId && isWidthRole(slots["DL"].roleId)) leftDeep = true;
      if (slots["WBL"] && slots["WBL"].roleId && isWidthRole(slots["WBL"].roleId)) leftDeep = true;
      var rightDeep = false;
      if (slots["DR"] && slots["DR"].roleId && isWidthRole(slots["DR"].roleId)) rightDeep = true;
      if (slots["WBR"] && slots["WBR"].roleId && isWidthRole(slots["WBR"].roleId)) rightDeep = true;
      if (!leftDeep && !rightDeep) {
        if (slots["DL"] && slots["DL"].roleId) {
          var fb_s = getRoleId("FB", "Support", "WD");
          if (fb_s) {
            slots["DL"].roleId = fb_s;
            slots["DL"].duty = "Support";
            slots["DL"].playerName = null;
          }
        } else if (slots["DR"] && slots["DR"].roleId) {
          var fb_s_r = getRoleId("FB", "Support", "WD");
          if (fb_s_r) {
            slots["DR"].roleId = fb_s_r;
            slots["DR"].duty = "Support";
            slots["DR"].playerName = null;
          }
        }
      }
    }
  }

  return slots;
}

// ════════════════════════════════════════════════════════════════
// Phase E3: Zone Collision Detector
// ════════════════════════════════════════════════════════════════

function inferRoleZoneMap(roleId, slotId, phase) {
  if (!roleId || !slotId) return "3_2";
  var zone = ZONE_GRID.slotToZone[slotId];
  if (!zone) return "3_2";
  var role = getRoleById(roleId);
  if (!role) return zone;

  var zp = ZONE_GRID.parseZone(zone);
  var row = zp.row, col = zp.col;
  var abbr = role.abbreviation;
  var duty = role.duty;

  // Phase row shift
  if (phase === "Attack") {
    if (row > 0) row--;
  } else if (phase === "Defence") {
    if (row < 3) row++;
  } else if (phase === "BuildUp") {
    if (row < 2) row = Math.min(3, row + 1);
  }

  // Role abbreviation column shifts
  if (abbr === "IF" || abbr === "IW") {
    if (col < 2) col = 1;
    else if (col > 2) col = 3;
  }
  if (abbr === "IWB") {
    col = 2;
  }
  if (abbr === "Mezzala") {
    if (col === 0 || col === 1) col = 1;
    else if (col === 3 || col === 4) col = 3;
  }
  if (abbr === "W" || abbr === "WM" || abbr === "DW") {
    if (col < 2) col = 0;
    else if (col > 2) col = 4;
  }
  if (abbr === "WB" || abbr === "CWB") {
    if (col < 2) col = 0;
    else if (col > 2) col = 4;
  }
  if (abbr === "FB" && (duty === "Attack" || duty === "Support")) {
    if (col < 2) col = 0;
    else if (col > 2) col = 4;
  }
  if (abbr === "HB" && phase !== "Attack") {
    if (row < 3) row++;
  }
  if (abbr === "Libero" && phase !== "Defence") {
    if (row > 1) row--;
  }
  if (abbr === "F9" && (phase === "BuildUp" || phase === "Attack")) {
    if (row < 2) row++;
  }

  // Duty-based vertical adjustment
  if (duty === "Attack" && phase !== "Defence" && row > 0) {
    row--;
  } else if (duty === "Defend" && phase !== "Attack" && row < 3) {
    row++;
  }

  row = Math.max(0, Math.min(3, row));
  col = Math.max(0, Math.min(4, col));
  return ZONE_GRID.zoneId(row, col);
}

function enforceZoneCollisions(slots, formation, manager, resultOut) {
  var phases = ["BuildUp", "Attack", "Defence"];
  var allViolations = [];

  function fixFlankDepthWidth(waSlotId) {
    var flank = GLOBAL_PITCH_SLOTS[waSlotId] ? GLOBAL_PITCH_SLOTS[waSlotId].flank : null;
    if (!flank) return false;
    var wdSid = flank === "L" ? "DL" : "DR";
    var wbSid = flank === "L" ? "WBL" : "WBR";
    var targetSid = (slots[wbSid] && slots[wbSid].roleId) ? wbSid : wdSid;
    if (!slots[targetSid] || !slots[targetSid].roleId) return false;
    var wdRole = getRoleById(slots[targetSid].roleId);
    if (!wdRole) return false;
    var strata = GLOBAL_PITCH_SLOTS[targetSid] ? GLOBAL_PITCH_SLOTS[targetSid].strata : "WD";
    if (wdRole.abbreviation === "IWB" || wdRole.abbreviation === "IFB") {
      var wb_s = getRoleId("WB", "Support", strata);
      if (wb_s) {
        slots[targetSid].roleId = wb_s;
        slots[targetSid].duty = "Support";
        slots[targetSid].playerName = null;
        return true;
      }
    }
    if (wdRole.duty === "Defend" || wdRole.abbreviation === "NFB") {
      var fb_s = getRoleId("FB", "Support", strata);
      if (fb_s) {
        slots[targetSid].roleId = fb_s;
        slots[targetSid].duty = "Support";
        slots[targetSid].playerName = null;
        return true;
      }
    }
    if (wdRole.duty === "Support" && (wdRole.abbreviation === "FB" || wdRole.abbreviation === "WB")) {
      var fb_a = getRoleId(wdRole.abbreviation, "Attack", strata);
      if (fb_a) {
        slots[targetSid].roleId = fb_a;
        slots[targetSid].duty = "Attack";
        slots[targetSid].playerName = null;
        return true;
      }
    }
    return false;
  }

  function fixToWide(slotId, strata, originalAbbr) {
    if (strata === "WA") {
      // AML/AMR IF/IW are realistic — restore width via FB/WB, not Winger
      if (originalAbbr === "IF" || originalAbbr === "IW") {
        return fixFlankDepthWidth(slotId);
      }
      var iid = getRoleId("IF", "Support", "WA") || getRoleId("IW", "Support", "WA");
      if (iid) {
        slots[slotId].roleId = iid;
        slots[slotId].duty = "Support";
        slots[slotId].playerName = null;
        return true;
      }
    } else if (strata === "WM") {
      var wid = getRoleId("WM", "Support", "WM");
      if (wid) { slots[slotId].roleId = wid; slots[slotId].duty = "Support"; slots[slotId].playerName = null; return true; }
    } else if (strata === "WD") {
      var wid = getRoleId("FB", "Support", "WD");
      if (wid) { slots[slotId].roleId = wid; slots[slotId].duty = "Support"; slots[slotId].playerName = null; return true; }
    } else if (strata === "WB") {
      var wid = getRoleId("WB", "Support", "WB");
      if (wid) { slots[slotId].roleId = wid; slots[slotId].duty = "Support"; slots[slotId].playerName = null; return true; }
    }
    return false;
  }

  function fixToCentre(slotId, strata) {
    if (strata === "WA") {
      var iid = getRoleId("IF", "Support", "WA");
      if (iid) { slots[slotId].roleId = iid; slots[slotId].duty = "Support"; slots[slotId].playerName = null; return true; }
    }
    return false;
  }

  phases.forEach(function (phase) {
    var zoneMap = {};

    Object.keys(slots).forEach(function (sid) {
      if (!slots[sid] || !slots[sid].roleId) return;
      if (sid === "GK") return;
      var zone = inferRoleZoneMap(slots[sid].roleId, sid, phase);
      if (ZONE_GRID.isGoalZone(zone)) return;
      if (!zoneMap[zone]) zoneMap[zone] = [];
      zoneMap[zone].push({ slotId: sid, roleId: slots[sid].roleId });
    });

    // Check A: Zone overload (>2 occupants)
    Object.keys(zoneMap).forEach(function (zone) {
      var occs = zoneMap[zone];
      if (occs.length <= 2) return;
      allViolations.push({ phase: phase, zone: zone, type: "overload", count: occs.length });
      for (var i = 0; i < occs.length; i++) {
        var occ = occs[i];
        var role = getRoleById(occ.roleId);
        if (!role) continue;
        var abbr = role.abbreviation;
        var zp = ZONE_GRID.parseZone(zone);
        if ((abbr === "IF" || abbr === "IW") && role.strata === "WA") {
          continue;
        }
        if ((abbr === "IF" || abbr === "IW") && zp.col <= 1) {
          if (fixToWide(occ.slotId, role.strata, abbr)) break;
        }
        if (abbr === "Mezzala" && (zp.col === 1 || zp.col === 3)) {
          var nd = role.duty === "Attack" ? "Attack" : "Support";
          var cid = getRoleId("CM", nd, "CM");
          if (cid) { slots[occ.slotId].roleId = cid; slots[occ.slotId].duty = nd; slots[occ.slotId].playerName = null; break; }
        }
      }
    });

    // Check B: Half-space stack (col 1 or col 3)
    var halfCount = { 1: 0, 3: 0 };
    var halfRoles = { 1: [], 3: [] };
    Object.keys(zoneMap).forEach(function (zone) {
      var zp = ZONE_GRID.parseZone(zone);
      if (zp.col === 1 || zp.col === 3) {
        halfCount[zp.col] = (halfCount[zp.col] || 0) + zoneMap[zone].length;
        halfRoles[zp.col] = halfRoles[zp.col] || [];
        zoneMap[zone].forEach(function (o) { halfRoles[zp.col].push(o); });
      }
    });

    [1, 3].forEach(function (col) {
      if (halfCount[col] < 3) return;
      var side = col === 1 ? "left" : "right";
      allViolations.push({ phase: phase, type: side + "_half_stack", count: halfCount[col] });
      for (var i = 0; i < halfRoles[col].length; i++) {
        var occ = halfRoles[col][i];
        var role = getRoleById(occ.roleId);
        if (!role) continue;
        if ((role.abbreviation === "IF" || role.abbreviation === "IW") && role.strata === "WA") {
          continue;
        }
        if (role.abbreviation === "IF" || role.abbreviation === "IW") {
          if (fixToWide(occ.slotId, role.strata, role.abbreviation)) break;
        }
        if (role.abbreviation === "Mezzala") {
          var nd = role.duty === "Attack" ? "Attack" : "Support";
          var cid = getRoleId("CM", nd, "CM");
          if (cid) { slots[occ.slotId].roleId = cid; slots[occ.slotId].duty = nd; slots[occ.slotId].playerName = null; break; }
        }
      }
    });

    // Check C: Width void (both wide cols empty)
    var wideCount = { 0: 0, 4: 0 };
    Object.keys(zoneMap).forEach(function (zone) {
      var zp = ZONE_GRID.parseZone(zone);
      if (zp.col === 0 || zp.col === 4) wideCount[zp.col] = (wideCount[zp.col] || 0) + zoneMap[zone].length;
    });

    if (wideCount[0] === 0 && wideCount[4] === 0) {
      allViolations.push({ phase: phase, type: "width_void" });
      for (var z in zoneMap) {
        var zp = ZONE_GRID.parseZone(z);
        if (zp.col !== 1 && zp.col !== 3) continue;
        for (var i = 0; i < zoneMap[z].length; i++) {
          var occ = zoneMap[z][i];
          var role = getRoleById(occ.roleId);
          if (!role) continue;
          if (role.strata === "WA" && (role.abbreviation === "IF" || role.abbreviation === "IW")) {
            if (fixFlankDepthWidth(occ.slotId)) { break; }
            continue;
          }
          if (fixToWide(occ.slotId, role.strata, role.abbreviation)) { break; }
        }
        if (i < zoneMap[z].length) break;
      }
    }
  });

  var score = 1.0;
  allViolations.forEach(function (v) {
    score -= 0.08;
  });
  score = Math.max(0, score);

  if (resultOut) {
    resultOut.score = score;
    resultOut.violations = allViolations;
  }
  return slots;
}

// ════════════════════════════════════════════════════════════════
// Phase E4: Rest Defence Calculator + Pressing Cohesion Engine
// ════════════════════════════════════════════════════════════════

var PRESS_INTENSITY = {
  PF: 0.9, BWM: 0.9, BBM: 0.8, SS: 0.8,
  DW: 0.7, IF: 0.7, IW: 0.7, WB: 0.7, CWB: 0.7,
  CM: 0.5, DM: 0.5, FB: 0.5, WM: 0.5,
  DLP: 0.4, AP: 0.4, RPM: 0.4, Mezzala: 0.4,
  AF: 0.3, TM: 0.3, CD: 0.3,
  Treq: 0.2, Enganche: 0.2, DLF: 0.2,
  Regista: 0.2, RMD: 0.2, F9: 0.2, SK: 0.2,
  GK: 0.1
};

function getPressIntensity(roleId) {
  if (!roleId) return 0.5;
  var role = getRoleById(roleId);
  if (!role) return 0.5;
  var base = PRESS_INTENSITY[role.abbreviation];
  if (base === undefined) base = 0.5;
  if (role.duty === "Attack") return Math.min(1, base + 0.1);
  if (role.duty === "Defend") return Math.max(0, base - 0.1);
  return base;
}

function calculateRestDefence(slots, instructions, manager, philosophy) {
  var score = 0;
  var highRoamers = [];
  var flags = [];
  var autoFixed = false;

  Object.keys(slots).forEach(function (sid) {
    var def = GLOBAL_PITCH_SLOTS[sid];
    if (!def || def.strata === "GK") return;
    var slot = slots[sid];
    if (!slot || !slot.roleId) return;
    var role = getRoleById(slot.roleId);
    if (!role) return;
    var abbr = role.abbreviation;
    var strata = def.strata;

    // High roamers (negative contribution)
    if ((abbr === "Regista" || abbr === "RPM" || abbr === "CWB") ||
      (abbr === "Mezzala" && role.duty === "Attack")) {
      score -= 0.5;
      highRoamers.push(sid);
      return;
    }

    // DC strata (all except WCB_A)
    if (strata === "DC") {
      if (slot.roleId !== "WCB_A") { score += 1.0; return; }
      else { score += 0.0; return; }
    }

    // Specific defensive screening roles
    if (abbr === "Anchor" || abbr === "HB" || abbr === "NCB" || abbr === "NFB") {
      score += 1.0; return;
    }
    if (abbr === "CD" && role.duty === "Cover") {
      score += 1.0; return;
    }

    // Defend duty roles
    if (role.duty === "Defend") {
      if (abbr === "DM" || abbr === "BWM" || abbr === "DLP" || abbr === "CM") {
        score += 0.75; return;
      } else if (abbr === "FB" || abbr === "WB") {
        score += 0.5; return;
      } else if (abbr === "IWB" || abbr === "IFB") {
        score += 0.3; return;
      } else {
        score += 1.0; return;
      }
    }

    // Attack duty
    if (role.duty === "Attack") {
      score += 0.0; return;
    }
  });

  // Vulnerability checks
  var isConcerning = score < 2.5;
  var isOverCautious = score > 4.5 && philosophy !== "disciplined defensive organiser";

  if (isConcerning) {
    var isCounterPress = instructions && instructions.whenPossessionLost === "Counter-Press";
    if (isCounterPress) {
      flags.push({ type: "vulnerable_to_counter", severity: "WARNING" });
    }
    var isAggressivePress = philosophy === "aggressive high-press tactician";
    if (!isAggressivePress) {
      flags.push({ type: "low_rest_defence", severity: "WARNING" });
      // Auto-fix: convert first Support-duty DM or CM to Defend
      var convertOrder = ["DM", "CM"];
      var found = false;
      convertOrder.forEach(function (convStrata) {
        if (found) return;
        Object.keys(slots).forEach(function (sid) {
          if (found) return;
          var def = GLOBAL_PITCH_SLOTS[sid];
          if (!def || def.strata !== convStrata) return;
          if (!slots[sid] || slots[sid].duty !== "Support") return;
          var role = getRoleById(slots[sid].roleId);
          if (!role) return;
          if (convStrata === "DM") {
            slots[sid].roleId = "DM_D"; slots[sid].duty = "Defend"; slots[sid].playerName = null;
          } else {
            slots[sid].roleId = "CM_D"; slots[sid].duty = "Defend"; slots[sid].playerName = null;
          }
          found = true; autoFixed = true;
        });
      });
    }
  } else if (isOverCautious) {
    flags.push({ type: "overly_cautious", severity: "SUGGESTION" });
    var isAggressivePress = philosophy === "aggressive high-press tactician" ||
      (instructions && instructions.whenPossessionLost === "Counter-Press");
    if (isAggressivePress) {
      var demoteOrder = ["WB", "WD", "CM", "WM"];
      var demoted = false;
      demoteOrder.forEach(function (strata) {
        if (demoted) return;
        Object.keys(slots).forEach(function (sid) {
          if (demoted) return;
          var def = GLOBAL_PITCH_SLOTS[sid];
          if (!def || def.strata !== strata) return;
          if (!slots[sid] || slots[sid].duty !== "Defend") return;
          if (changeRoleDuty(sid, "Support", slots, manager)) {
            demoted = true;
            autoFixed = true;
          }
        });
      });
    }
  }

  // Shape-specific: check if rest defence forms a line of 2
  var deepDefenders = 0;
  Object.keys(slots).forEach(function (sid) {
    var def = GLOBAL_PITCH_SLOTS[sid];
    if (!def || def.strata !== "DC" && def.strata !== "WD") return;
    if (!slots[sid] || !slots[sid].roleId) return;
    if (sid === "GK") return;
    deepDefenders++;
  });
  if (deepDefenders <= 2) {
    flags.push({ type: "line_of_2_exposed", severity: "WARNING" });
  }

  return {
    score: score,
    flags: flags,
    isConcerning: isConcerning,
    isOverCautious: isOverCautious,
    autoFixed: autoFixed
  };
}

function evaluatePressingCohesion(slots, instructions, manager) {
  var frontSlots = [];
  var midSlots = [];
  var dmSlots = [];
  var flags = [];
  var autoFixed = false;

  Object.keys(slots).forEach(function (sid) {
    var def = GLOBAL_PITCH_SLOTS[sid];
    if (!def || !slots[sid] || !slots[sid].roleId) return;
    if (def.strata === "ST" || def.strata === "WA" || def.strata === "AMC") frontSlots.push(sid);
    if (def.strata === "DM") dmSlots.push(sid);
    if (def.strata === "CM") midSlots.push(sid);
  });
  midSlots = midSlots.concat(dmSlots);

  // Front press level
  var frontAggressive = 0;
  frontSlots.forEach(function (sid) {
    if (getPressIntensity(slots[sid].roleId) > 0.6) frontAggressive++;
  });
  var frontLevel = frontAggressive >= 2 ? "Aggressive" : "Passive";

  // Midfield press level
  var midAggressive = 0;
  midSlots.forEach(function (sid) {
    if (getPressIntensity(slots[sid].roleId) > 0.6) midAggressive++;
  });
  var midLevel = midAggressive >= 1 ? "Aggressive" : "Passive";

  // DM role classification
  var dmType = "None";
  if (dmSlots.length > 0) {
    var dmRole = getRoleById(slots[dmSlots[0]].roleId);
    if (dmRole) {
      if (dmRole.abbreviation === "Anchor" || dmRole.abbreviation === "HB") dmType = "Anchor";
      else if (dmRole.abbreviation === "BWM") dmType = "BWM";
      else dmType = "Other";
    }
  }

  // Matrix check
  if (frontLevel === "Aggressive" && midLevel === "Passive") {
    if (dmType === "Anchor" || dmType === "None") {
      flags.push({ type: "broken_press_chain", severity: "WARNING" });
      // Auto-fix: change DM to BWM if available
      if (dmSlots.length > 0 && dmType === "Anchor") {
        var bwmDef = getRoleId("BWM", "Defend", "DM");
        if (bwmDef) {
          slots[dmSlots[0]].roleId = bwmDef;
          slots[dmSlots[0]].duty = "Defend";
          slots[dmSlots[0]].playerName = null;
          autoFixed = true;
        }
      }
    }
  }

  // Line height validator
  var defLine = instructions ? instructions.defensiveLine : null;
  var loe = instructions ? instructions.lineOfEngagement : null;

  if (defLine === "Much Higher" && loe === "High") {
    var dmRoaming = false;
    var hasCoverCB = false;
    dmSlots.forEach(function (sid) {
      var role = getRoleById(slots[sid].roleId);
      if (role && (role.abbreviation === "Regista" || role.abbreviation === "RPM")) dmRoaming = true;
    });
    Object.keys(slots).forEach(function (sid) {
      var def = GLOBAL_PITCH_SLOTS[sid];
      if (!def || def.strata !== "DC") return;
      var role = getRoleById(slots[sid].roleId);
      if (role && role.abbreviation === "CD" && role.duty === "Cover") hasCoverCB = true;
    });
    if (dmRoaming && !hasCoverCB) {
      flags.push({ type: "exposed_transition_space", severity: "WARNING" });
    }
  }

  if (defLine === "Much Lower" && loe === "High") {
    // Compute vertical spacing
    var yVals = [];
    Object.keys(slots).forEach(function (sid) {
      var def = GLOBAL_PITCH_SLOTS[sid];
      if (def) yVals.push(def.y);
    });
    if (yVals.length > 0) {
      var maxY = Math.max.apply(null, yVals);
      var minY = Math.min.apply(null, yVals);
      var verticalSpacing = maxY - minY;
      if (verticalSpacing > 250) {
        flags.push({ type: "unreachable_pressing_triggers", severity: "WARNING" });
      }
    }
  }

  var isCoherent = flags.length === 0;

  return {
    frontLevel: frontLevel,
    midLevel: midLevel,
    dmType: dmType,
    isCoherent: isCoherent,
    autoFixed: autoFixed,
    flags: flags
  };
}

// ════════════════════════════════════════════════════════════════
// Phase E5: Archetype Compliance Scorer (Layer 4)
// ════════════════════════════════════════════════════════════════

var ARCHETYPE_STYLE_VECTORS = {
  "possession-oriented tactician": { att: 2, tec: 5, dis: 3, press: 2 },
  "aggressive high-press tactician": { att: 4, tec: 2, dis: 2, press: 5 },
  "disciplined defensive organiser": { att: 1, tec: 2, dis: 5, press: 3 },
  "direct counter-attacker": { att: 5, tec: 2, dis: 3, press: 3 },
  "pragmatic system-adapter": { att: 3, tec: 3, dis: 3, press: 3 },
  "balanced tactician": { att: 3, tec: 3, dis: 3, press: 3 }
};

function cosineSimilarity(a, b) {
  if (!a || !b) return 0;
  var dot = a.att * b.att + a.tec * b.tec + a.dis * b.dis + a.press * b.press;
  var magA = Math.sqrt(a.att * a.att + a.tec * a.tec + a.dis * a.dis + a.press * a.press);
  var magB = Math.sqrt(b.att * b.att + b.tec * b.tec + b.dis * b.dis + b.press * b.press);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

function countPlaymakers(slots) {
  var count = 0;
  Object.keys(slots).forEach(function (sid) {
    if (!slots[sid] || !slots[sid].roleId) return;
    var role = getRoleById(slots[sid].roleId);
    if (role && role.isPlaymaker) count++;
  });
  return count;
}

function countDirectRunners(slots) {
  var count = 0;
  Object.keys(slots).forEach(function (sid) {
    if (!slots[sid] || !slots[sid].roleId) return;
    var profile = ROLE_PROFILES[slots[sid].roleId];
    if (profile && profile.att >= 4) count++;
  });
  return count;
}

function computeArchetypeFit(slots, instructions, philosophy) {
  if (philosophy === "pragmatic system-adapter") {
    return { score: 1.0, flags: [] };
  }

  var profile = PHILOSOPHY_PROFILES[philosophy];
  var archetypeVec = ARCHETYPE_STYLE_VECTORS[philosophy];
  if (!profile || !archetypeVec) return { score: 0.5, flags: [] };

  var baseScore = 0.5;
  var totalPenalty = 0;
  var flags = [];

  // Step 1: Soft cosine baseline for neutral roles
  Object.keys(slots).forEach(function (sid) {
    if (!slots[sid] || !slots[sid].roleId) return;
    var rid = slots[sid].roleId;
    var roleProfile = ROLE_PROFILES[rid];
    if (!roleProfile) return;
    if (profile.roleBoost[rid] || profile.roleSuppression[rid]) return;
    var sim = cosineSimilarity(roleProfile, archetypeVec);
    if (sim < 0.3) totalPenalty += 0.05;
  });
  totalPenalty = Math.min(totalPenalty, 0.2);

  // Step 2: Boosted / Suppressed adjustments
  Object.keys(slots).forEach(function (sid) {
    if (!slots[sid] || !slots[sid].roleId) return;
    var rid = slots[sid].roleId;
    if (profile.roleBoost[rid]) baseScore += 0.08;
    if (profile.roleSuppression[rid]) totalPenalty += 0.15;
  });

  // Step 3: Minimum boosted role count
  if (philosophy !== "balanced tactician") {
    var boostedCount = 0;
    Object.keys(slots).forEach(function (sid) {
      if (!slots[sid] || !slots[sid].roleId) return;
      if (profile.roleBoost[slots[sid].roleId]) boostedCount++;
    });
    if (boostedCount < 2) totalPenalty += 0.10;
  }

  // Step 4: Instruction vetoes
  if (instructions) {
    profile.instructionVetoes.forEach(function (vetoKey) {
      if (instructions[vetoKey] !== undefined) totalPenalty += 0.20;
    });
  }

  // Step 5: Archetype-specific structural checks
  if (philosophy === "possession-oriented tactician") {
    if (countPlaymakers(slots) < 2) totalPenalty += 0.10;
  } else if (philosophy === "aggressive high-press tactician") {
    if (instructions && instructions.lineOfEngagement !== "High") totalPenalty += 0.15;
  } else if (philosophy === "direct counter-attacker") {
    if (countDirectRunners(slots) < 2) totalPenalty += 0.10;
    if (countPlaymakers(slots) > 2) totalPenalty += 0.10;
  }

  var finalScore = Math.max(0, Math.min(1, baseScore - totalPenalty));
  if (finalScore < 0.6) flags.push({ type: "archetype_mismatch", severity: "WARNING" });

  return { score: finalScore, flags: flags };
}

// ════════════════════════════════════════════════════════════════
// Layer 5: Global Coherence Aggregator
// ════════════════════════════════════════════════════════════════

function computePairingScore(slots) {
  var tables = RELATIONSHIP_PAIRINGS;
  var axisScores = [];

  function getRoles(s) {
    var r = [];
    var sl = getStrataSlots(slots, s);
    Object.keys(sl).forEach(function (sid) { if (sl[sid] && sl[sid].roleId) r.push(sl[sid].roleId); });
    return r;
  }
  function getRolesMulti(ss) {
    var r = [];
    ss.forEach(function (s) { r = r.concat(getRoles(s)); });
    return r;
  }
  function xAvg(a, b, t) {
    if (!a.length || !b.length || !t) return null;
    var total = 0, cnt = 0;
    a.forEach(function (ai) { b.forEach(function (bi) { total += getPairingCompatibility(ai, bi, t); cnt++; }); });
    return cnt > 0 ? total / cnt : null;
  }
  function sameFlankAvg(slA, slB, t) {
    if (!t) return null;
    var total = 0, cnt = 0;
    Object.keys(slA).forEach(function (sidA) {
      if (!slA[sidA] || !slA[sidA].roleId) return;
      var fA = GLOBAL_PITCH_SLOTS[sidA] && GLOBAL_PITCH_SLOTS[sidA].flank;
      if (!fA) return;
      Object.keys(slB).forEach(function (sidB) {
        if (!slB[sidB] || !slB[sidB].roleId) return;
        if ((GLOBAL_PITCH_SLOTS[sidB] && GLOBAL_PITCH_SLOTS[sidB].flank) !== fA) return;
        total += getPairingCompatibility(slA[sidA].roleId, slB[sidB].roleId, t);
        cnt++;
      });
    });
    return cnt > 0 ? total / cnt : null;
  }

  // 1 — CB + FB channel
  var cbR = getRoles("DC");
  var wdSl = getStrataSlots(slots, "WD");
  var wbSl = getStrataSlots(slots, "WB");
  var fbSl = {};
  Object.keys(wdSl).forEach(function (sid) { fbSl[sid] = wdSl[sid]; });
  Object.keys(wbSl).forEach(function (sid) { fbSl[sid] = wbSl[sid]; });
  var fbR = getRolesMulti(["WD", "WB"]);
  var s1 = xAvg(cbR, fbR, tables && tables.CB_FB_channel);
  if (s1 !== null) axisScores.push(s1);

  // 2 — DM + FB flank
  var dmR = getRoles("DM");
  var s2 = xAvg(dmR, fbR, tables && tables.DM_FB_flank);
  if (s2 !== null) axisScores.push(s2);

  // 3 — DM + CB pressing
  var s3 = xAvg(dmR, cbR, tables && tables.DM_CB_press);
  if (s3 !== null) axisScores.push(s3);

  // 4 — Mezzala + CM cover
  var cmSl = getStrataSlots(slots, "CM");
  var dmSl = getStrataSlots(slots, "DM");
  var mId = null;
  Object.keys(cmSl).forEach(function (sid) {
    if (!mId && cmSl[sid] && cmSl[sid].roleId) {
      var ro = getRoleById(cmSl[sid].roleId);
      if (ro && ro.abbreviation === "Mezzala") mId = cmSl[sid].roleId;
    }
  });
  if (!mId) {
    Object.keys(dmSl).forEach(function (sid) {
      if (!mId && dmSl[sid] && dmSl[sid].roleId) {
        var ro = getRoleById(dmSl[sid].roleId);
        if (ro && ro.abbreviation === "Mezzala") mId = dmSl[sid].roleId;
      }
    });
  }
  if (mId) {
    var cv = [];
    Object.keys(cmSl).forEach(function (sid) { if (cmSl[sid] && cmSl[sid].roleId && cmSl[sid].roleId !== mId) cv.push(cmSl[sid].roleId); });
    if (!cv.length) { Object.keys(dmSl).forEach(function (sid) { if (dmSl[sid] && dmSl[sid].roleId) cv.push(dmSl[sid].roleId); }); }
    var s4 = xAvg([mId], cv, tables && tables.Mezzala_CM_cover);
    if (s4 !== null) axisScores.push(s4);
  }

  // 5 — AM + CM balance
  var amR = getRoles("AMC");
  var cmR = getRoles("CM");
  var s5 = xAvg(amR, cmR, tables && tables.AM_CM_balance);
  if (s5 !== null) axisScores.push(s5);

  // 6 — F9 + surrounds
  var stR = getRoles("ST");
  var f9Id = null;
  stR.forEach(function (rid) {
    if (!f9Id) { var ro = getRoleById(rid); if (ro && ro.abbreviation === "F9") f9Id = rid; }
  });
  if (f9Id) {
    var surR = getRolesMulti(["WA", "AMC"]);
    var s6 = xAvg([f9Id], surR, tables && tables.F9_surrounds);
    if (s6 !== null) axisScores.push(s6);
  }

  // 7 — TM + support
  var tmId = null;
  stR.forEach(function (rid) {
    if (!tmId) { var ro = getRoleById(rid); if (ro && ro.abbreviation === "TF") tmId = rid; }
  });
  if (tmId) {
    var supR = getRolesMulti(["WA", "WM", "WB", "WD", "CM", "AMC"]);
    var s7 = xAvg([tmId], supR, tables && tables.TM_support);
    if (s7 !== null) axisScores.push(s7);
  }

  // 8 — Spine (exact-match profiles)
  var prof = tables && tables.spine_profiles;
  if (prof) {
    var sp = {};
    var gkSl = getStrataSlots(slots, "GK");
    var cbSl = getStrataSlots(slots, "DC");
    var dmSl2 = getStrataSlots(slots, "DM");
    var cmSl2 = getStrataSlots(slots, "CM");
    var stSl = getStrataSlots(slots, "ST");
    Object.keys(gkSl).forEach(function (sid) { if (!sp.GK && gkSl[sid]) sp.GK = gkSl[sid].roleId; });
    Object.keys(cbSl).forEach(function (sid) {
      var rid = cbSl[sid] && cbSl[sid].roleId; var ro = rid ? getRoleById(rid) : null;
      if (ro && (ro.abbreviation !== "CD" || !sp.DC)) sp.DC = rid;
    });
    if (!sp.DC) sp.DC = "CD_D";
    Object.keys(dmSl2).forEach(function (sid) { if (!sp.DM && dmSl2[sid]) sp.DM = dmSl2[sid].roleId; });
    Object.keys(cmSl2).forEach(function (sid) { if (!sp.CM && cmSl2[sid]) sp.CM = cmSl2[sid].roleId; });
    Object.keys(stSl).forEach(function (sid) { if (!sp.ST && stSl[sid]) sp.ST = stSl[sid].roleId; });
    axisScores.push(getSpineScore(sp, prof));
  }

  // 9 — DM + AM vertical
  var s9 = xAvg(dmR, amR, tables && tables.DM_AM_vertical);
  if (s9 !== null) axisScores.push(s9);

  // 10 — WF + CM same-side
  var s10 = sameFlankAvg(getStrataSlots(slots, "WA"), cmSl, tables && tables.WF_CM_sides);
  if (s10 !== null) axisScores.push(s10);

  // 11 — FB + Winger same-side
  var wmSl = getStrataSlots(slots, "WM");
  var waSl = getStrataSlots(slots, "WA");
  var wfSl = {};
  Object.keys(waSl).forEach(function (sid) { wfSl[sid] = waSl[sid]; });
  Object.keys(wmSl).forEach(function (sid) { wfSl[sid] = wmSl[sid]; });
  var s11 = sameFlankAvg(fbSl, wfSl, tables && tables.FB_winger);
  if (s11 !== null) axisScores.push(s11);

  // 12 — Double AM
  if (amR.length >= 2 && tables && tables.AM_double) {
    var t12 = 0, c12 = 0;
    for (var i = 0; i < amR.length; i++) {
      for (var j = i + 1; j < amR.length; j++) {
        t12 += getPairingCompatibility(amR[i], amR[j], tables.AM_double);
        c12++;
      }
    }
    axisScores.push(c12 > 0 ? t12 / c12 : 0.5);
  }

  // 13 — GK + DC
  var gkR = getRoles("GK");
  var dcR = getRoles("DC");
  if (gkR.length > 0 && dcR.length > 0 && tables && tables.GK_DC) {
    axisScores.push(getPairingCompatibility(gkR[0], dcR[0], tables.GK_DC));
  }

  var avg = axisScores.length > 0 ? axisScores.reduce(function (a, b) { return a + b; }) / axisScores.length : 0.5;
  return { pairingScore: avg, axes: axisScores.length };
}

function computeGlobalCoherence(zoneCollisionContext, pressResult, archetypeResult, gaps, formation, slots) {
  // 1 — Pairing score (13-axis)
  var pairingResult = computePairingScore(slots);
  var pairingScore = pairingResult.pairingScore;

  // 2 — Structural score
  var dmSlots = getStrataSlots(slots, "DM");
  var dmOccupied = false;
  Object.keys(dmSlots).forEach(function (sid) {
    if (dmSlots[sid] && dmSlots[sid].roleId) dmOccupied = true;
  });
  var dmPenalty = (Object.keys(dmSlots).length > 0 && !dmOccupied) ? 0.15 : 0;
  var gapPenalty = Math.min(4, gaps && gaps.length || 0) * 0.10;
  var structuralScore = Math.max(0, 1.0 - gapPenalty - dmPenalty);

  // 3 — Zone score
  var zoneScore = zoneCollisionContext ? zoneCollisionContext.score : 1.0;

  // 4 — Press score
  var pressScore = pressResult && pressResult.isCoherent ? 1.0 : Math.max(0, 1.0 - 0.15 * (pressResult && pressResult.flags ? pressResult.flags.length : 1));

  // 5 — Archetype score
  var archetypeScore = archetypeResult && archetypeResult.score ? archetypeResult.score : 0.5;

  // Weighted aggregate
  var aggregate = pairingScore * 0.30 + structuralScore * 0.20 + zoneScore * 0.20 + pressScore * 0.15 + archetypeScore * 0.15;

  // Threshold penalties (no double-dip — derived from aggregate itself)
  var penalties = [];
  if (aggregate < 0.3) penalties.push({ type: "critical_flaws", severity: "CRITICAL", amount: 0.15 });
  else if (aggregate < 0.5) penalties.push({ type: "significant_flaws", severity: "ERROR", amount: 0.10 });
  else if (aggregate < 0.7) penalties.push({ type: "minor_flaws", severity: "WARNING", amount: 0.05 });

  var finalScore = aggregate;
  penalties.forEach(function (p) { finalScore = Math.max(0, finalScore - p.amount); });

  var ratingLabel = finalScore >= 0.85 ? "Elite"
    : finalScore >= 0.70 ? "Solid"
      : finalScore >= 0.55 ? "Functional"
        : finalScore >= 0.40 ? "Risky"
          : "Broken";

  return {
    aggregate: aggregate,
    final: finalScore,
    pairingScore: pairingScore,
    structuralScore: structuralScore,
    zoneScore: zoneScore,
    pressScore: pressScore,
    archetypeScore: archetypeScore,
    penalties: penalties,
    ratingLabel: ratingLabel
  };
}

// #25 — SPINE COHERENCE CHECK
function enforceSpineCoherence(slots, instructions, manager) {
  var profiles = RELATIONSHIP_PAIRINGS && RELATIONSHIP_PAIRINGS.spine_profiles;
  if (!profiles) return { score: 0.5 };

  var spine = {};
  var gkSlots = getStrataSlots(slots, "GK");
  var cbSlots = getStrataSlots(slots, "DC");
  var dmSlots = getStrataSlots(slots, "DM");
  var cmSlots = getStrataSlots(slots, "CM");
  var stSlots = getStrataSlots(slots, "ST");

  Object.keys(gkSlots).forEach(function (sid) { if (!spine.GK) spine.GK = getSlotRoleId(gkSlots[sid]); });
  // For CBs, pick the first one with a non-standard role (prefer BPD over CD)
  Object.keys(cbSlots).forEach(function (sid) {
    var rid = getSlotRoleId(cbSlots[sid]);
    var r = getRoleById(rid);
    if (r && (r.abbreviation !== "CD" || !spine.DC)) spine.DC = rid;
  });
  if (!spine.DC) spine.DC = "CD_D";
  // For DM, pick the first DM if available
  Object.keys(dmSlots).forEach(function (sid) { if (!spine.DM) spine.DM = getSlotRoleId(dmSlots[sid]); });
  // For CM, pick the first non-winger CM
  Object.keys(cmSlots).forEach(function (sid) { if (!spine.CM) spine.CM = getSlotRoleId(cmSlots[sid]); });
  // For ST, pick the first striker
  Object.keys(stSlots).forEach(function (sid) { if (!spine.ST) spine.ST = getSlotRoleId(stSlots[sid]); });

  var score = getSpineScore(spine, profiles);
  spine._score = score;

  // If spine score is very poor (< 0.3), try to identify which layer needs change
  if (score < 0.3 && manager) {
    // Try swapping GK to match the rest of the spine
    if (spine.GK && spine.DC) {
      var gkRole = getRoleById(spine.GK);
      if (gkRole && gkRole.duty === "Attack") {
        // SK_A with low-line CBs → demote to SK_S or GK_D
        var cbAbbr = getRoleById(spine.DC) ? getRoleById(spine.DC).abbreviation : "";
        if (cbAbbr === "NCB" || cbAbbr === "CD") {
          var gkAlt = "GK_D";
          if (!isAntiMetaRole(gkAlt)) {
            Object.keys(gkSlots).forEach(function (sid) { gkSlots[sid].roleId = gkAlt; gkSlots[sid].duty = "Defend"; });
            spine.GK = gkAlt;
            score = getSpineScore(spine, profiles);
          }
        }
      }
    }
  }

  return { score: score, spine: spine };
}

// NP-01 to NP-05 — Vertical Axis: DM + AM vertical compatibility
function enforceVerticalMidfield(slots, manager) {
  var table = RELATIONSHIP_PAIRINGS && RELATIONSHIP_PAIRINGS.DM_AM_vertical;
  if (!table) return slots;
  var dmSlots = getStrataSlots(slots, "DM");
  var amSlots = getStrataSlots(slots, "AMC");
  if (Object.keys(dmSlots).length === 0 || Object.keys(amSlots).length === 0) return slots;
  var worstCompat = 1.0, worstDmSid = null, worstAmSid = null;
  Object.keys(dmSlots).forEach(function (dmSid) {
    var dmRole = getSlotRoleId(dmSlots[dmSid]);
    if (!dmRole) return;
    Object.keys(amSlots).forEach(function (amSid) {
      var amRole = getSlotRoleId(amSlots[amSid]);
      if (!amRole) return;
      var compat = getPairingCompatibility(dmRole, amRole, table);
      if (compat < worstCompat) { worstCompat = compat; worstDmSid = dmSid; worstAmSid = amSid; }
    });
  });
  if (worstCompat < 0.15 && worstAmSid) {
    var dmRole = getSlotRoleId(dmSlots[worstDmSid]);
    var amRole = getSlotRoleId(amSlots[worstAmSid]);
    var amAlt = findCompatibleRole("AMC", amRole, dmRole, table, manager);
    if (amAlt) {
      var newRole = getRoleById(amAlt);
      amSlots[worstAmSid].roleId = amAlt;
      amSlots[worstAmSid].duty = newRole ? newRole.duty : "Support";
      amSlots[worstAmSid].playerName = null;
    }
  }
  return slots;
}

// NP-06 to NP-10 — Wide Forward + CM on same flank
function enforceWideForwardCMSide(slots, manager, formation) {
  var table = RELATIONSHIP_PAIRINGS && RELATIONSHIP_PAIRINGS.WF_CM_sides;
  if (!table) return slots;
  var cmSlots = getStrataSlots(slots, "CM");
  var waSlots = getStrataSlots(slots, "WA");
  if (Object.keys(cmSlots).length === 0 || Object.keys(waSlots).length === 0) return slots;
  var worstCompat = 1.0, worstCmSid = null, worstWaSid = null;
  Object.keys(cmSlots).forEach(function (cmSid) {
    var cmFlank = GLOBAL_PITCH_SLOTS[cmSid] ? GLOBAL_PITCH_SLOTS[cmSid].flank : "C";
    if (cmFlank === "C") return;
    var cmRole = getSlotRoleId(cmSlots[cmSid]);
    if (!cmRole) return;
    Object.keys(waSlots).forEach(function (waSid) {
      var waFlank = GLOBAL_PITCH_SLOTS[waSid] ? GLOBAL_PITCH_SLOTS[waSid].flank : "C";
      if (waFlank !== cmFlank) return;
      var waRole = getSlotRoleId(waSlots[waSid]);
      if (!waRole) return;
      var compat = getPairingCompatibility(cmRole, waRole, table);
      if (compat < worstCompat) { worstCompat = compat; worstCmSid = cmSid; worstWaSid = waSid; }
    });
  });
  if (worstCompat < 0.15 && worstWaSid) {
    var cmRole = getSlotRoleId(cmSlots[worstCmSid]);
    var waRole = getSlotRoleId(waSlots[worstWaSid]);
    var waAlt = findCompatibleRole("WA", waRole, cmRole, table, manager);
    if (waAlt) {
      var newRole = getRoleById(waAlt);
      waSlots[worstWaSid].roleId = waAlt;
      waSlots[worstWaSid].duty = newRole ? newRole.duty : "Support";
      waSlots[worstWaSid].playerName = null;
    }
  }
  return slots;
}

// NP-11 to NP-15 — FB/WB + Wide Forward/ Midfielder on same flank
function enforceFBWingerRelationship(slots, manager, formation) {
  var table = RELATIONSHIP_PAIRINGS && RELATIONSHIP_PAIRINGS.FB_winger;
  if (!table) return slots;
  var fbSlots = {};
  var wdS = getStrataSlots(slots, "WD"); Object.keys(wdS).forEach(function (s) { fbSlots[s] = wdS[s]; });
  var wbS = getStrataSlots(slots, "WB"); Object.keys(wbS).forEach(function (s) { fbSlots[s] = wbS[s]; });
  var waSlots = getStrataSlots(slots, "WA");
  var wmSlots = getStrataSlots(slots, "WM");
  var wfSlots = {}; Object.keys(waSlots).forEach(function (s) { wfSlots[s] = waSlots[s]; });
  Object.keys(wmSlots).forEach(function (s) { wfSlots[s] = wmSlots[s]; });
  if (Object.keys(fbSlots).length === 0 || Object.keys(wfSlots).length === 0) return slots;
  var worstCompat = 1.0, worstFbSid = null, worstWfSid = null;
  Object.keys(fbSlots).forEach(function (fbSid) {
    var fbFlank = GLOBAL_PITCH_SLOTS[fbSid] ? GLOBAL_PITCH_SLOTS[fbSid].flank : "C";
    var fbRole = getSlotRoleId(fbSlots[fbSid]);
    if (!fbRole) return;
    Object.keys(wfSlots).forEach(function (wfSid) {
      var wfFlank = GLOBAL_PITCH_SLOTS[wfSid] ? GLOBAL_PITCH_SLOTS[wfSid].flank : "C";
      if (wfFlank !== fbFlank) return;
      var wfRole = getSlotRoleId(wfSlots[wfSid]);
      if (!wfRole) return;
      var compat = getPairingCompatibility(fbRole, wfRole, table);
      if (compat < worstCompat) { worstCompat = compat; worstFbSid = fbSid; worstWfSid = wfSid; }
    });
  });
  if (worstCompat < 0.15 && worstWfSid) {
    var fbRole = getSlotRoleId(fbSlots[worstFbSid]);
    var wfRole = getSlotRoleId(wfSlots[worstWfSid]);
    var wfStrata = GLOBAL_PITCH_SLOTS[worstWfSid] ? GLOBAL_PITCH_SLOTS[worstWfSid].strata : "WA";
    var wfRoleObj = getRoleById(wfRole);
    // Never downgrade AML/AMR inside forwards to Winger — IF/IW are intentional
    if (wfStrata === "WA" && wfRoleObj &&
      (wfRoleObj.abbreviation === "IF" || wfRoleObj.abbreviation === "IW")) {
      return slots;
    }
    var wfAlt = findCompatibleRole(wfStrata, wfRole, fbRole, table, manager);
    if (wfAlt) {
      var altObj = getRoleById(wfAlt);
      if (wfStrata === "WA" && altObj && altObj.abbreviation === "W" &&
        wfRoleObj && (wfRoleObj.abbreviation === "IF" || wfRoleObj.abbreviation === "IW")) {
        return slots;
      }
      var newRole = altObj;
      wfSlots[worstWfSid].roleId = wfAlt;
      wfSlots[worstWfSid].duty = newRole ? newRole.duty : "Support";
      wfSlots[worstWfSid].playerName = null;
    }
  }
  return slots;
}

// NP-16 to NP-20 — Double AM compatibility
function enforceDoubleAMBalance(slots, manager) {
  var table = RELATIONSHIP_PAIRINGS && RELATIONSHIP_PAIRINGS.AM_double;
  if (!table) return slots;
  var amSlots = getStrataSlots(slots, "AMC");
  var amSids = Object.keys(amSlots);
  if (amSids.length < 2) return slots;
  var worstCompat = 1.0, worstAmA = null, worstAmB = null;
  for (var i = 0; i < amSids.length; i++) {
    var roleA = getSlotRoleId(amSlots[amSids[i]]);
    if (!roleA) continue;
    for (var j = i + 1; j < amSids.length; j++) {
      var roleB = getSlotRoleId(amSlots[amSids[j]]);
      if (!roleB) continue;
      var compat = getPairingCompatibility(roleA, roleB, table);
      if (compat < worstCompat) { worstCompat = compat; worstAmA = amSids[i]; worstAmB = amSids[j]; }
    }
  }
  if (worstCompat < 0.25 && worstAmB) {
    var otherRole = getSlotRoleId(amSlots[worstAmA]);
    var badRole = getSlotRoleId(amSlots[worstAmB]);
    var alt = findCompatibleRole("AMC", badRole, otherRole, table, manager);
    if (alt) {
      var newRole = getRoleById(alt);
      amSlots[worstAmB].roleId = alt;
      amSlots[worstAmB].duty = newRole ? newRole.duty : "Support";
      amSlots[worstAmB].playerName = null;
    }
  }
  return slots;
}

// NP-21 to NP-25 — Striker vs Defensive Line mismatch
function enforceStrikerDefensiveLine(slots, instructions, manager) {
  var stSlots = getStrataSlots(slots, "ST");
  if (Object.keys(stSlots).length === 0 || !instructions) return slots;
  var dl = instructions.defensiveLine || "Standard";
  var loe = instructions.lineOfEngagement || "Mid block";
  var isLowDL = dl !== "Higher" && dl.indexOf("Higher") === -1;
  var isHighDL = dl === "Higher" || dl.indexOf("Higher") !== -1;
  var isLowBlock = loe !== "High" && loe.indexOf("High") === -1;
  var isDeepBlock = isLowDL && isLowBlock;
  Object.keys(stSlots).forEach(function (stSid) {
    var stRole = getSlotRoleId(stSlots[stSid]);
    if (!stRole) return;
    var r = getRoleById(stRole);
    var abbr = r ? r.abbreviation : "";
    // NP-21: AF_A + Low DL — no space to run into
    if (abbr === "AF" && isLowDL) {
      var alt = findCompatibleRole("ST", stRole, "DLF_S", null, manager);
      if (alt) { var nr = getRoleById(alt); stSlots[stSid].roleId = alt; stSlots[stSid].duty = nr ? nr.duty : "Support"; stSlots[stSid].playerName = null; }
      return;
    }
    // NP-25: PF_D + Low Block — pressing wasted in deep shape
    if (stRole === "PF_D" && isDeepBlock) {
      var alt = findCompatibleRole("ST", stRole, "TF_S", null, manager);
      if (alt) { var nr = getRoleById(alt); stSlots[stSid].roleId = alt; stSlots[stSid].duty = nr ? nr.duty : "Support"; stSlots[stSid].playerName = null; }
      return;
    }
  });
  return slots;
}

// NP-26 to NP-30 — Goalkeeper + First Defender pairing
function enforceGKDCpairing(slots, manager, instructions) {
  var table = RELATIONSHIP_PAIRINGS && RELATIONSHIP_PAIRINGS.GK_DC;
  if (!table) return slots;
  var gkSlots = getStrataSlots(slots, "GK");
  var cbSlots = getStrataSlots(slots, "DC");
  if (Object.keys(gkSlots).length === 0 || Object.keys(cbSlots).length === 0) return slots;
  var gkSid = Object.keys(gkSlots)[0];
  var gkRole = getSlotRoleId(gkSlots[gkSid]);
  var cbSid = Object.keys(cbSlots)[0];
  var cbRole = getSlotRoleId(cbSlots[cbSid]);
  if (!gkRole || !cbRole) return slots;
  var compat = getPairingCompatibility(gkRole, cbRole, table);
  if (compat < 0.15) {
    // NP-26: SK_A + NCB_D — demote SK to GK_D
    var gkAlt = findCompatibleRole("GK", gkRole, cbRole, table, manager);
    if (gkAlt) {
      var newRole = getRoleById(gkAlt);
      gkSlots[gkSid].roleId = gkAlt;
      gkSlots[gkSid].duty = newRole ? newRole.duty : "Defend";
      gkSlots[gkSid].playerName = null;
    }
  }
  return slots;
}

// Build-Up Shape Transformer — HB drop, IWB invert, Libero advance detection
function transformBuildUpShape(slots, formation, instructions, manager) {
  var isBackThree = formation && (formation.indexOf("3-") === 0 || formation.indexOf("5-") === 0);
  var hasHB = false, hasLibero = false, iwbSids = [];
  Object.keys(slots).forEach(function (sid) {
    var role = getRoleById(getSlotRoleId(slots[sid]));
    if (!role) return;
    if (role.abbreviation === "HB") hasHB = true;
    if (role.abbreviation === "IWB") iwbSids.push(sid);
    if (role.abbreviation === "Libero") hasLibero = true;
  });

  // HB in non-back-three: drops between CBs → WBs must provide width
  if (hasHB && !isBackThree) {
    var wbSlots = getStrataSlots(slots, "WB");
    Object.keys(wbSlots).forEach(function (sid) {
      var r = getRoleById(getSlotRoleId(wbSlots[sid]));
      if (r && r.duty === "Defend") changeRoleDuty(sid, "Support", slots, manager);
    });
  }

  // IWB: inverts to midfield → needs holding mid + wide player on same flank
  if (iwbSids.length > 0) {
    var hasHolder = false;
    ["DM", "CM"].forEach(function (s) {
      var pool = getStrataSlots(slots, s);
      Object.keys(pool).forEach(function (sid) {
        var r = getRoleById(getSlotRoleId(pool[sid]));
        if (r && r.duty === "Defend") hasHolder = true;
      });
    });
    if (!hasHolder) {
      var dmPool = getStrataSlots(slots, "DM");
      if (Object.keys(dmPool).length > 0) changeRoleDuty(Object.keys(dmPool)[0], "Defend", slots, manager);
    }

    iwbSids.forEach(function (sid) {
      var flank = GLOBAL_PITCH_SLOTS[sid] ? GLOBAL_PITCH_SLOTS[sid].flank : null;
      if (!flank) return;
      var waSid = flank === "L" ? "AML" : "AMR";
      var wmSid = flank === "L" ? "ML" : "MR";
      var hasWide = (slots[waSid] && slots[waSid].roleId) || (slots[wmSid] && slots[wmSid].roleId);
      if (hasWide) return;
      var slotStrata = GLOBAL_PITCH_SLOTS[sid] ? GLOBAL_PITCH_SLOTS[sid].strata : "WD";
      var iwbDuty = "Support";
      var iwbRole = getRoleById(getSlotRoleId(slots[sid]));
      if (iwbRole) iwbDuty = iwbRole.duty;
      var altId = getRoleId("WB", iwbDuty, slotStrata === "WB" ? "WB" : "WD");
      if (altId) {
        var altRole = getRoleById(altId);
        if (altRole && isFlankRoleCompatible(sid, altId, slots) && isRoleAllowedForTactic(altId, slots, formation)) {
          slots[sid].roleId = altId;
          slots[sid].duty = altRole.duty;
          slots[sid].playerName = null;
        }
      }
    });
  }

  // Libero: steps into midfield → needs DM cover
  if (hasLibero) {
    var dmPool = getStrataSlots(slots, "DM");
    var hasCover = false;
    Object.keys(dmPool).forEach(function (sid) {
      var r = getRoleById(getSlotRoleId(dmPool[sid]));
      if (r && r.duty === "Defend") hasCover = true;
    });
    if (!hasCover && Object.keys(dmPool).length > 0) changeRoleDuty(Object.keys(dmPool)[0], "Defend", slots, manager);
  }

  return slots;
}

// ─── PHASE F: SECOND INSTRUCTION PASS (needs assigned roles) ───

function countSlowPivots(slots) {
  var count = 0;
  Object.keys(slots).forEach(function (sid) {
    if (!slots[sid] || !slots[sid].roleId) return;
    var role = getRoleById(slots[sid].roleId);
    if (!role) return;
    var abbr = role.abbreviation;
    if (abbr === "DLP" || abbr === "Regista" || abbr === "Enganche" || abbr === "AP") count++;
  });
  return count;
}

function countPressingForwards(slots) {
  var count = 0;
  Object.keys(slots).forEach(function (sid) {
    if (!slots[sid] || !slots[sid].roleId) return;
    var role = getRoleById(slots[sid].roleId);
    if (!role) return;
    if (role.abbreviation === "PF" || (role.abbreviation === "BWM" && getPressIntensity(slots[sid].roleId) > 0.6)) {
      count++;
    }
  });
  return count;
}

function reconcileInstructionsWithRoles(slots, instructions, philosophy, manager) {
  if (!instructions) return instructions;
  var slowPivots = countSlowPivots(slots);
  var pressForwards = countPressingForwards(slots);
  var directRunners = countDirectRunners(slots);

  if (philosophy === "possession-oriented tactician") {
    if (instructions.whenPossessionLost === undefined) {
      instructions.whenPossessionLost = "Regroup";
    }
    if (instructions.whenPossessionWon === undefined) {
      instructions.whenPossessionWon = "Hold Shape";
    }
    if (slowPivots >= 1) {
      instructions.lineOfEngagement = "Mid block";
      instructions.defensiveLine = "Standard";
    }
  } else if (philosophy === "direct counter-attacker") {
    instructions.whenPossessionLost = "Regroup";
    instructions.whenPossessionWon = "Counter";
    delete instructions.playOutOfDefence;
    if (slowPivots >= 1) {
      instructions.passingDirectness = "More Direct";
      instructions.tempo = instructions.tempo || "Higher";
    }
  } else if (philosophy === "aggressive high-press tactician") {
    if (pressForwards >= 1 || getAggressionPropensity(manager) >= 0.55) {
      instructions.whenPossessionLost = "Counter-Press";
      instructions.whenPossessionWon = "Counter";
      instructions.triggerPress = instructions.triggerPress || "Much More Often";
    }
  } else if (philosophy === "disciplined defensive organiser") {
    instructions.whenPossessionLost = "Regroup";
    instructions.whenPossessionWon = "Hold Shape";
  }

  // Role-driven corrections that transcend philosophy
  if (slowPivots >= 2 && instructions.whenPossessionLost === "Counter-Press" &&
    philosophy !== "aggressive high-press tactician") {
    instructions.whenPossessionLost = "Regroup";
  }
  if (directRunners >= 2 && instructions.whenPossessionWon === "Hold Shape" &&
    philosophy === "direct counter-attacker") {
    instructions.whenPossessionWon = "Counter";
  }
  if (slowPivots >= 1 && philosophy === "direct counter-attacker" &&
    instructions.passingDirectness === "Shorter") {
    instructions.passingDirectness = "Mixed";
  }

  return instructions;
}

function enforceCounterRunners(slots, philosophy, manager) {
  if (philosophy !== "direct counter-attacker") return slots;
  if (countDirectRunners(slots) >= 2) return slots;

  var upgradeOrder = ["ST", "WA", "WM", "AMC"];
  for (var oi = 0; oi < upgradeOrder.length; oi++) {
    if (countDirectRunners(slots) >= 2) break;
    var strata = upgradeOrder[oi];
    Object.keys(slots).forEach(function (sid) {
      if (countDirectRunners(slots) >= 2) return;
      var def = GLOBAL_PITCH_SLOTS[sid];
      if (!def || def.strata !== strata) return;
      if (!slots[sid] || !slots[sid].roleId) return;
      var role = getRoleById(slots[sid].roleId);
      if (!role || role.duty === "Attack") return;
      var abbr = role.abbreviation;
      if (abbr === "DLP" || abbr === "Regista" || abbr === "Enganche" || abbr === "DLF") return;
      var newId = strata === "ST" ? "AF_A" : getRoleId("W", "Attack", strata);
      if (!newId) newId = getRoleId("AF", "Attack", strata);
      if (newId && !isAntiMetaRole(newId)) {
        slots[sid].roleId = newId;
        slots[sid].duty = "Attack";
        slots[sid].playerName = null;
      }
    });
  }
  return slots;
}

function enforceWideRoleVariety(slots, philosophy, dna) {
  if (!dna) dna = { flankBias: 0.5, seed: 0.5 };

  function pickWaRole(strata, preferAbbr, duty, avoidAbbr) {
    var duties = duty ? [duty] : ["Attack", "Support"];
    var abbrs = preferAbbr ? [preferAbbr] : ["IF", "IW", "W"];
    for (var ai = 0; ai < abbrs.length; ai++) {
      for (var di = 0; di < duties.length; di++) {
        var rid = getRoleId(abbrs[ai], duties[di], strata);
        if (!rid || isAntiMetaRole(rid)) continue;
        var r = getRoleById(rid);
        if (avoidAbbr && r && r.abbreviation === avoidAbbr) continue;
        return rid;
      }
    }
    return null;
  }

  function convertSlot(sid, strata, preferAbbr, avoidAbbr) {
    if (!slots[sid]) return;
    var role = slots[sid].roleId ? getRoleById(slots[sid].roleId) : null;
    if (!role) return;
    if (role.abbreviation === "AP" || role.abbreviation === "RMD") {
      preferAbbr = preferAbbr || "IF";
    } else if (avoidAbbr && role.abbreviation === avoidAbbr) {
      // e.g. convert away from double Winger
    } else if (preferAbbr && role.abbreviation !== preferAbbr &&
      role.abbreviation !== "IF" && role.abbreviation !== "IW") {
      // e.g. WP/WM on AML -> IF/IW
    } else {
      return;
    }
    var repl = pickWaRole(strata, preferAbbr || "IF", null, avoidAbbr);
    if (repl) {
      var nr = getRoleById(repl);
      slots[sid].roleId = repl;
      slots[sid].duty = nr ? nr.duty : slots[sid].duty;
      slots[sid].playerName = null;
    }
  }

  // AML/AMR: IF/IW dominate; AP/RMD banned; max one Winger across both flanks
  function preferInsideRole(strata) {
    if (philosophy === "possession-oriented tactician") return "IW";
    return dna.flankBias > 0.55 ? "IF" : "IW";
  }

  ["AML", "AMR"].forEach(function (sid) {
    if (!slots[sid] || !slots[sid].roleId) return;
    var role = getRoleById(slots[sid].roleId);
    if (!role) return;
    if (role.abbreviation === "AP" || role.abbreviation === "RMD") {
      var repl = pickWaRole("WA", preferInsideRole("WA"), null, null);
      if (repl) {
        var nr = getRoleById(repl);
        slots[sid].roleId = repl;
        slots[sid].duty = nr ? nr.duty : slots[sid].duty;
        slots[sid].playerName = null;
      }
    }
  });

  if (slots["AML"] && slots["AMR"] && slots["AML"].roleId && slots["AMR"].roleId) {
    var amlRole = getRoleById(slots["AML"].roleId);
    var amrRole = getRoleById(slots["AMR"].roleId);
    if (amlRole && amrRole) {
      var amlIn = amlRole.abbreviation === "IF" || amlRole.abbreviation === "IW";
      var amrIn = amrRole.abbreviation === "IF" || amrRole.abbreviation === "IW";
      var amlW = amlRole.abbreviation === "W";
      var amrW = amrRole.abbreviation === "W";

      if (amlW && amrW) {
        convertSlot("AMR", "WA", preferInsideRole("WA"), "W");
      } else if (amlW && !amrIn && !amrW) {
        convertSlot("AML", "WA", preferInsideRole("WA"), "W");
      } else if (amrW && !amlIn && !amlW) {
        convertSlot("AMR", "WA", preferInsideRole("WA"), "W");
      } else if (!amlIn && !amlW) {
        convertSlot("AML", "WA", preferInsideRole("WA"), null);
      } else if (!amrIn && !amrW) {
        convertSlot("AMR", "WA", preferInsideRole("WA"), null);
      } else if (amlIn && amrIn && amlRole.abbreviation === amrRole.abbreviation &&
        amlRole.duty === amrRole.duty) {
        convertSlot("AMR", "WA", amrRole.abbreviation === "IF" ? "IW" : "IF", amrRole.abbreviation);
      }
    }
  } else if (slots["AML"] && slots["AML"].roleId) {
    var loneAml = getRoleById(slots["AML"].roleId);
    if (loneAml && loneAml.abbreviation === "W") {
      convertSlot("AML", "WA", preferInsideRole("WA"), "W");
    }
  } else if (slots["AMR"] && slots["AMR"].roleId) {
    var loneAmr = getRoleById(slots["AMR"].roleId);
    if (loneAmr && loneAmr.abbreviation === "W") {
      convertSlot("AMR", "WA", preferInsideRole("WA"), "W");
    }
  }

  // ML/MR: W/IW preferred over duplicate generic WM; WP rare
  if (slots["ML"] && slots["MR"]) {
    ["ML", "MR"].forEach(function (sid) {
      var role = slots[sid].roleId ? getRoleById(slots[sid].roleId) : null;
      if (role && role.abbreviation === "WP") {
        var repl = getRoleId("IW", "Support", "WM") || getRoleId("W", "Support", "WM") || getRoleId("WM", "Support", "WM");
        if (repl) {
          var nr = getRoleById(repl);
          slots[sid].roleId = repl;
          slots[sid].duty = nr ? nr.duty : slots[sid].duty;
          slots[sid].playerName = null;
        }
      }
    });
    var mlRole = slots["ML"].roleId ? getRoleById(slots["ML"].roleId) : null;
    var mrRole = slots["MR"].roleId ? getRoleById(slots["MR"].roleId) : null;
    if (mlRole && mrRole && mlRole.abbreviation === "WM" && mrRole.abbreviation === "WM" &&
      mlRole.duty === mrRole.duty) {
      var altWm = getRoleId("W", mrRole.duty, "WM") || getRoleId("IW", mrRole.duty, "WM");
      if (altWm) {
        var aw = getRoleById(altWm);
        slots["MR"].roleId = altWm;
        slots["MR"].duty = aw ? aw.duty : slots["MR"].duty;
        slots["MR"].playerName = null;
      }
    }
  }

  return slots;
}

function enforceMinimumWidth(slots, formation) {
  function isNaturalWidth(roleId) {
    if (!roleId) return false;
    var role = getRoleById(roleId);
    if (!role) return false;
    var abbr = role.abbreviation;
    return abbr === "W" || abbr === "WM" || abbr === "DW" ||
      abbr === "WB" || abbr === "CWB" ||
      (abbr === "FB" && (role.duty === "Support" || role.duty === "Attack"));
  }

  function isInwardRole(roleId) {
    if (!roleId) return false;
    var role = getRoleById(roleId);
    if (!role) return false;
    var abbr = role.abbreviation;
    return abbr === "IF" || abbr === "IW" || abbr === "IWB";
  }

  ["L", "R"].forEach(function (flank) {
    var waSid = flank === "L" ? "AML" : "AMR";
    var wdSid = flank === "L" ? "DL" : "DR";
    var wbSid = flank === "L" ? "WBL" : "WBR";
    var waRole = slots[waSid] ? slots[waSid].roleId : null;
    var wdRole = (slots[wdSid] && slots[wdSid].roleId) || (slots[wbSid] && slots[wbSid].roleId);
    if (!waRole) return;
    if (!isInwardRole(waRole)) return;
    if (isNaturalWidth(wdRole)) return;
    if (isInwardRole(wdRole)) {
      var strata = slots[wbSid] && slots[wbSid].roleId ? "WB" : "WD";
      var targetSid = slots[wbSid] && slots[wbSid].roleId ? wbSid : wdSid;
      var fb_s = getRoleId("FB", "Support", strata);
      if (fb_s && slots[targetSid]) {
        slots[targetSid].roleId = fb_s;
        slots[targetSid].duty = "Support";
        slots[targetSid].playerName = null;
      }
    }
  });

  return slots;
}

function deriveFlankStrategy(manager, formation, squad, slots, instructions) {
  var att = normalizeAttr(manager.Att);
  var tacKnw = normalizeAttr(manager["Tac Knw"]);

  var leftAttackScore = 0, rightAttackScore = 0;
  ["DL", "WBL"].forEach(function (sid) {
    if (slots[sid]) {
      var role = getRoleById(slots[sid].roleId);
      if (role) {
        if (role.duty === "Attack") leftAttackScore += 2;
        else if (role.duty === "Support") leftAttackScore += 1;
      }
    }
  });
  ["DR", "WBR"].forEach(function (sid) {
    if (slots[sid]) {
      var role = getRoleById(slots[sid].roleId);
      if (role) {
        if (role.duty === "Attack") rightAttackScore += 2;
        else if (role.duty === "Support") rightAttackScore += 1;
      }
    }
  });
  if (slots["AML"]) {
    var lr = getRoleById(slots["AML"].roleId);
    if (lr) {
      if (lr.duty === "Attack") leftAttackScore += 2;
      else if (lr.duty === "Support") leftAttackScore += 1;
    }
  }
  if (slots["AMR"]) {
    var rr = getRoleById(slots["AMR"].roleId);
    if (rr) {
      if (rr.duty === "Attack") rightAttackScore += 2;
      else if (rr.duty === "Support") rightAttackScore += 1;
    }
  }

  var diff = leftAttackScore - rightAttackScore;
  if (diff > 1) instructions.focusPlayLeft = true;
  else if (diff < -1) instructions.focusPlayRight = true;
  var flankScore = att * 0.4 + tacKnw * 0.3;
  if (flankScore < 0.35) instructions.focusPlayCentre = true;

  var leftWARole = slots["AML"] ? getRoleById(slots["AML"].roleId) : null;
  var rightWARole = slots["AMR"] ? getRoleById(slots["AMR"].roleId) : null;
  var leftWDRole = null;
  ["DL", "WBL"].forEach(function (sid) {
    if (slots[sid] && !leftWDRole) leftWDRole = getRoleById(slots[sid].roleId);
  });
  var rightWDRole = null;
  ["DR", "WBR"].forEach(function (sid) {
    if (slots[sid] && !rightWDRole) rightWDRole = getRoleById(slots[sid].roleId);
  });

  var leftMidRole = slots["MCL"] ? getRoleById(slots["MCL"].roleId) : null;
  var rightMidRole = slots["MCR"] ? getRoleById(slots["MCR"].roleId) : null;

  var attScore = att * 0.5 + tacKnw * 0.5;

  function shouldOverlap(waRole, wdRole) {
    if (!waRole || !wdRole) return false;

    // Fullback must be a wide, attacking/supporting fullback role
    var overlappingFBRoles = ["FB", "WB", "CWB"];
    var isOverlappingFB = overlappingFBRoles.indexOf(wdRole.abbreviation) !== -1;
    var isAttackingWD = wdRole.duty === "Attack" || wdRole.duty === "Support";

    if (!isOverlappingFB || !isAttackingWD) return false;
    return attScore > 0.5;
  }

  function shouldUnderlap(waRole, wdRole, midRole) {
    if (!waRole) return false;

    // Winger must stay wide to create the inside space (Winger or Wide Midfielder)
    // If the winger is an Inverted Winger (IW), Inside Forward (IF), etc. they cut inside and clog the space.
    var staysWideWinger = ["W", "WM"].indexOf(waRole.abbreviation) !== -1;
    if (!staysWideWinger) return false;

    // We need a runner to underlap:
    // 1. Either the fullback is an Inverted Wing-Back on Support or Attack
    var isUnderlappingFB = wdRole && wdRole.abbreviation === "IWB" && (wdRole.duty === "Support" || wdRole.duty === "Attack");

    // 2. Or the central midfielder on this side is a forward-running role (Mezzala, BBM, RPM, or CM Support/Attack)
    var isUnderlappingMid = false;
    if (midRole) {
      var isForwardMid = midRole.abbreviation === "Mezzala" ||
        midRole.abbreviation === "BBM" ||
        midRole.abbreviation === "RPM" ||
        (midRole.abbreviation === "CM" && (midRole.duty === "Attack" || midRole.duty === "Support"));
      if (isForwardMid) isUnderlappingMid = true;
    }

    if ((isUnderlappingFB || isUnderlappingMid) && attScore > 0.5) {
      return true;
    }
    return false;
  }

  if (shouldOverlap(leftWARole, leftWDRole)) {
    instructions.overlapLeft = true;
  } else if (shouldUnderlap(leftWARole, leftWDRole, leftMidRole)) {
    instructions.underlapLeft = true;
  }

  if (shouldOverlap(rightWARole, rightWDRole)) {
    instructions.overlapRight = true;
  } else if (shouldUnderlap(rightWARole, rightWDRole, rightMidRole)) {
    instructions.underlapRight = true;
  }

  return instructions;
}

function deriveCrossingProfile(manager, squad, slots, instructions) {
  var att = normalizeAttr(manager.Att);
  var tec = normalizeAttr(manager.Tec);
  var men = normalizeAttr(manager.Men);
  var tacKnw = normalizeAttr(manager["Tac Knw"]);

  var crossScore = att * 0.3 + (1 - tec) * 0.3 + men * 0.2 + tacKnw * 0.2;
  if (crossScore > 0.6) instructions.crossType = "Whipped";
  else if (crossScore < 0.35) instructions.crossType = "Low";

  if (att * 0.5 + (1 - tacKnw) * 0.5 > 0.5) instructions.hitEarlyCrosses = true;

  return instructions;
}

function deriveGKDistribution(manager, instructions, slots, philosophy) {
  var att = normalizeAttr(manager.Att);
  var tec = normalizeAttr(manager.Tec);
  var dis = normalizeAttr(manager.Dis);
  var tacKnw = normalizeAttr(manager["Tac Knw"]);
  var dna = getManagerDNA(manager.Name, manager);

  var gkSlot = null;
  Object.keys(slots).forEach(function (sid) {
    var def = GLOBAL_PITCH_SLOTS[sid];
    if (def && def.strata === "GK") gkSlot = sid;
  });
  if (!gkSlot || !slots[gkSlot]) return instructions;
  var gkRole = getRoleById(slots[gkSlot].roleId);

  if (!philosophy) philosophy = deriveManagerPhilosophy(manager);

  // Philosophy-first distribution profiles
  if (philosophy === "direct counter-attacker") {
    instructions.gkDistributionPace = "Distribute Quickly";
    instructions.gkDistributionMethod = dna.seed > 0.5 ? "Mixed" : "Take Long Kicks";
    instructions.gkDistributionTarget = dna.seed > 0.66 ? "Target Forward" : "Wide Players";
  } else if (philosophy === "possession-oriented tactician") {
    instructions.gkDistributionMethod = "Take Short Kicks";
    instructions.gkDistributionPace = dis > 0.55 ? "Distribute Slowly" : "Normal";
    instructions.gkDistributionTarget = dna.seed > 0.5 ? "Centre-Backs" : "Full-Backs";
  } else if (philosophy === "disciplined defensive organiser") {
    instructions.gkDistributionMethod = "Roll It Out";
    instructions.gkDistributionPace = "Normal";
    instructions.gkDistributionTarget = dna.seed > 0.5 ? "Centre-Backs" : "Full-Backs";
  } else if (philosophy === "aggressive high-press tactician") {
    instructions.gkDistributionPace = "Distribute Quickly";
    instructions.gkDistributionMethod = dna.seed > 0.4 ? "Take Short Kicks" : "Mixed";
    instructions.gkDistributionTarget = dna.seed > 0.5 ? "Wide Players" : "Central Defenders";
  } else {
    // Balanced / pragmatic — attribute-driven with DNA variety
    if (instructions.playOutOfDefence) {
      instructions.gkDistributionMethod = "Take Short Kicks";
    } else if (dis * 0.5 + (1 - att) * 0.5 > 0.5) {
      instructions.gkDistributionMethod = "Roll It Out";
    } else {
      instructions.gkDistributionMethod = dna.seed > 0.5 ? "Mixed" : "Take Short Kicks";
    }
    if (att * 0.4 + tec * 0.3 + tacKnw * 0.3 > 0.55) {
      instructions.gkDistributionPace = "Distribute Quickly";
    } else if (dis > 0.6) {
      instructions.gkDistributionPace = "Distribute Slowly";
    } else {
      instructions.gkDistributionPace = "Normal";
    }
    var targets = ["Wide Players", "Full-Backs", "Centre-Backs", "Target Forward"];
    instructions.gkDistributionTarget = targets[Math.floor(dna.seed * targets.length) % targets.length];
  }

  // SK Attack pushes quick distribution; other SK duties keep philosophy pace
  if (gkRole && gkRole.abbreviation === "SK" && gkRole.duty === "Attack") {
    instructions.gkDistributionPace = "Distribute Quickly";
    if (!instructions.gkDistributionTarget) {
      instructions.gkDistributionTarget = "Wide Players";
    }
  }

  return instructions;
}

function deriveSetPieceAwareness(manager, squad) {
  var att = normalizeAttr(manager.Att);
  var dis = normalizeAttr(manager.Dis);
  var setPieceScore = (1 - att) * 0.4 + dis * 0.3;
  return setPieceScore > 0.45;
}

// ─── SECTION 8: FULL TACTIC GENERATION ENTRY POINT ───

var DEFAULT_ABBREV = {
  GK: "GK", DC: "CD", WD: "FB", WB: "WB",
  DM: "DM", CM: "CM", WM: "WM",
  WA: "W", AMC: "AM", ST: "AF"
};

var DEFAULT_DUTY = {
  GK: "Defend", DC: "Defend", WD: "Support", WB: "Support",
  DM: "Support", CM: "Support", WM: "Support",
  WA: "Support", AMC: "Support", ST: "Attack"
};

function weightedPick(items, weights) {
  if (!items || items.length === 0) return null;
  if (items.length === 1) return items[0];
  var total = 0;
  for (var i = 0; i < weights.length; i++) total += weights[i];
  var r = Math.random() * total;
  var accumulated = 0;
  for (var j = 0; j < items.length; j++) {
    accumulated += weights[j];
    if (r <= accumulated) return items[j];
  }
  return items[items.length - 1];
}

function adjustInstructionsForSquad(instructions, squad, dna) {
  if (!squad || squad.length === 0) return instructions;
  var out = {};
  for (var k in instructions) { if (instructions.hasOwnProperty(k)) out[k] = instructions[k]; }

  var paceSum = 0, paceCount = 0;
  var headSum = 0, headCount = 0;
  var dribbleSum = 0, dribbleCount = 0;
  var passSum = 0, passCount = 0;
  var aggSum = 0, aggCount = 0;
  var workSum = 0, workCount = 0;

  squad.forEach(function (p) {
    if (p.Pace) { paceSum += (typeof p.Pace === "number" ? p.Pace : parseInt(p.Pace, 10) || 0); paceCount++; }
    if (p.Jump || p.Heading) {
      var h = (typeof (p.Jump || 0) === "number" ? (p.Jump || 0) : parseInt(p.Jump || 0, 10)) +
        (typeof (p.Heading || 0) === "number" ? (p.Heading || 0) : parseInt(p.Heading || 0, 10));
      headSum += h / 2; headCount++;
    }
    if (p.Drib) { dribbleSum += (typeof p.Drib === "number" ? p.Drib : parseInt(p.Drib, 10) || 0); dribbleCount++; }
    if (p.Pas) { passSum += (typeof p.Pas === "number" ? p.Pas : parseInt(p.Pas, 10) || 0); passCount++; }
    if (p.Agg) { aggSum += (typeof p.Agg === "number" ? p.Agg : parseInt(p.Agg, 10) || 0); aggCount++; }
    if (p.Wor) { workSum += (typeof p.Wor === "number" ? p.Wor : parseInt(p.Wor, 10) || 0); workCount++; }
  });

  var avgPace = paceCount > 0 ? paceSum / paceCount : 10;
  var avgHeading = headCount > 0 ? headSum / headCount : 10;
  var avgDribble = dribbleCount > 0 ? dribbleSum / dribbleCount : 10;
  var avgPass = passCount > 0 ? passSum / passCount : 10;
  var avgAgg = aggCount > 0 ? aggSum / aggCount : 10;
  var avgWork = workCount > 0 ? workSum / workCount : 10;

  if (avgPace >= 14 && dna.roleExperimentation > 0.3) {
    out.tempo = "Higher";
    out.passingDirectness = "More Direct";
  }
  if (avgHeading >= 14) {
    out.crossType = "Flood Box";
    out.focusPlay = "Down Both Flanks";
  }
  if (avgDribble <= 10 && dna.roleExperimentation < 0.7) {
    out.dribbleLess = true;
  }
  if (avgPass >= 15) {
    out.passingDirectness = "Shorter";
    out.playOutOfDefence = true;
  }
  if (avgAgg >= 14) {
    out.tackling = "Get Stuck In";
  } else if (avgAgg <= 8) {
    out.stayOnFeet = true;
  }
  if (avgWork >= 15) {
    out.triggerPress = "More Often";
  } else if (avgWork <= 9) {
    out.triggerPress = "Standard";
  }

  return out;
}

function generateTacticFromManager(manager, squad) {
  // ══════════════════════════════════════════════
  // Phase A: Formation selection + philosophy derivation
  // ══════════════════════════════════════════════
  var dna = getManagerDNA(manager.Name, manager);
  var philosophy = deriveManagerPhilosophy(manager);
  var formation = resolveFormation(manager, squad, dna, philosophy);

  var formDef = FORMATIONS[formation];
  if (!formDef) return null;

  // Look for matching pre-defined template
  var matchingTemplate = null;
  if (typeof TACTIC_TEMPLATES !== "undefined") {
    matchingTemplate = TACTIC_TEMPLATES.find(function (t) {
      return t.formation === formation && t.philosophy === philosophy;
    });
  }

  if (matchingTemplate && typeof findBestTacticFromTemplate === "function") {
    return findBestTacticFromTemplate(matchingTemplate, manager, squad);
  }

  // ══════════════════════════════════════════════
  // Phase B: First instruction pass + philosophy constraints
  // ══════════════════════════════════════════════
  var instructions = generateInstructions(manager);
  instructions = applyPhilosophyConstraints(instructions, philosophy, manager);
  instructions = validateInstructions(instructions, manager);

  // ══════════════════════════════════════════════
  // Phase B2: Squad-optimized instruction overrides
  // ══════════════════════════════════════════════
  if (squad && squad.length > 0) {
    instructions = adjustInstructionsForSquad(instructions, squad, dna);
  }

  // ══════════════════════════════════════════════
  // Phase C: Role assignment per strata (philosophy-aware)
  // ══════════════════════════════════════════════
  var strataSlots = {};
  formDef.slots.forEach(function (sid) {
    var def = GLOBAL_PITCH_SLOTS[sid];
    if (!def) return;
    if (!strataSlots[def.strata]) strataSlots[def.strata] = [];
    strataSlots[def.strata].push(sid);
  });

  var slots = {};

  // ── WD + WA combo path (per flank) ──
  var wdSlotIds = strataSlots["WD"] || [];
  var waSlotIds = strataSlots["WA"] || [];
  var wbSlotIds = strataSlots["WB"] || [];

  var leftWD = wdSlotIds.filter(function (s) { return GLOBAL_PITCH_SLOTS[s].flank === "L"; });
  var leftWB = wbSlotIds.filter(function (s) { return GLOBAL_PITCH_SLOTS[s].flank === "L"; });
  var leftWDslot = leftWD[0] || leftWB[0] || null;
  var leftWA = waSlotIds.filter(function (s) { return GLOBAL_PITCH_SLOTS[s].flank === "L"; });

  if (leftWDslot && leftWA.length > 0) {
    var leftCombo = getWDWACombination(manager, formation, instructions, philosophy, dna, "L");
    if (leftCombo) {
      var wdRole = getRoleById(leftCombo.wd);
      slots[leftWDslot] = { roleId: leftCombo.wd, duty: wdRole ? wdRole.duty : null, playerName: null };
      var waRole = getRoleById(leftCombo.wa);
      slots[leftWA[0]] = { roleId: leftCombo.wa, duty: waRole ? waRole.duty : null, playerName: null };
    }
  }

  var rightWD = wdSlotIds.filter(function (s) { return GLOBAL_PITCH_SLOTS[s].flank === "R"; });
  var rightWB = wbSlotIds.filter(function (s) { return GLOBAL_PITCH_SLOTS[s].flank === "R"; });
  var rightWDslot = rightWD[0] || rightWB[0] || null;
  var rightWA = waSlotIds.filter(function (s) { return GLOBAL_PITCH_SLOTS[s].flank === "R"; });

  if (rightWDslot && rightWA.length > 0) {
    var otherWaLeft = (leftWA.length > 0 && slots[leftWA[0]]) ? slots[leftWA[0]].roleId : null;
    var rightCombo = getWDWACombination(manager, formation, instructions, philosophy, dna, "R", otherWaLeft);
    if (rightCombo) {
      var wdRole = getRoleById(rightCombo.wd);
      slots[rightWDslot] = { roleId: rightCombo.wd, duty: wdRole ? wdRole.duty : null, playerName: null };
      var waRole = getRoleById(rightCombo.wa);
      slots[rightWA[0]] = { roleId: rightCombo.wa, duty: waRole ? waRole.duty : null, playerName: null };
    }
  }

  // ── FB + WM combo path (4-4-2, 4-5-1 flat formations) ──
  var wmSlotIds = strataSlots["WM"] || [];
  if (wmSlotIds.length > 0 && wdSlotIds.length > 0) {
    var leftWM = wmSlotIds.filter(function (s) { return GLOBAL_PITCH_SLOTS[s].flank === "L"; });
    var rightWM = wmSlotIds.filter(function (s) { return GLOBAL_PITCH_SLOTS[s].flank === "R"; });
    var leftFB = leftWD[0] || null;
    var rightFB = rightWD[0] || null;

    if (leftFB && leftWM.length > 0 && !slots[leftWM[0]]) {
      var leftFbWm = getFBWMCombination(manager, formation, instructions, philosophy, dna, "L");
      if (leftFbWm) {
        if (!slots[leftFB]) {
          var lfbRole = getRoleById(leftFbWm.wd);
          slots[leftFB] = { roleId: leftFbWm.wd, duty: lfbRole ? lfbRole.duty : null, playerName: null };
        }
        var lwmRole = getRoleById(leftFbWm.wm);
        slots[leftWM[0]] = { roleId: leftFbWm.wm, duty: lwmRole ? lwmRole.duty : null, playerName: null };
      }
    }
    if (rightFB && rightWM.length > 0 && !slots[rightWM[0]]) {
      var rightFbWm = getFBWMCombination(manager, formation, instructions, philosophy, dna, "R");
      if (rightFbWm) {
        if (!slots[rightFB]) {
          var rfbRole = getRoleById(rightFbWm.wd);
          slots[rightFB] = { roleId: rightFbWm.wd, duty: rfbRole ? rfbRole.duty : null, playerName: null };
        }
        var rwmRole = getRoleById(rightFbWm.wm);
        slots[rightWM[0]] = { roleId: rightFbWm.wm, duty: rwmRole ? rwmRole.duty : null, playerName: null };
      }
    }
  }

  // ── ST combo path ──
  var stSlotIds = strataSlots["ST"] || [];
  if (stSlotIds.length === 2) {
    var stCombo = getSTCombination(manager, 2, philosophy, dna);
    if (stCombo) {
      stSlotIds.forEach(function (sid, idx) {
        var rid = stCombo.roles[idx];
        var role = getRoleById(rid);
        slots[sid] = { roleId: rid, duty: role ? role.duty : null, playerName: null };
      });
    }
  }

  // ── Midfield combo path (DM + CM strata assigned together) ──
  var dmSlotIds = strataSlots["DM"] || [];
  var cmSlotIds = strataSlots["CM"] || [];
  var hasMidfield = dmSlotIds.length > 0 || cmSlotIds.length > 0;

  if (hasMidfield) {
    var combo = getMidfieldCombination(manager, dmSlotIds.length, cmSlotIds.length, instructions, philosophy, formation, dna);
    if (combo) {
      // Assign DM roles
      dmSlotIds.forEach(function (sid, idx) {
        var rid = combo.dm[idx] || null;
        if (!rid) return;
        var role = getRoleById(rid);
        slots[sid] = { roleId: rid, duty: role ? role.duty : null, playerName: null };
      });
      // Assign CM roles
      cmSlotIds.forEach(function (sid, idx) {
        var rid = combo.cm[idx] || null;
        if (!rid) return;
        var role = getRoleById(rid);
        slots[sid] = { roleId: rid, duty: role ? role.duty : null, playerName: null };
      });
    } else {
      // Fallback: use per-strata selection if no combo matched
      [{ strata: "DM", sids: dmSlotIds }, { strata: "CM", sids: cmSlotIds }].forEach(function (g) {
        if (g.sids.length === 0) return;
        var roleIds = getStrataRoleIds(manager, g.strata, g.sids.length, squad, instructions, formation, philosophy, dna) || [];
        g.sids.forEach(function (sid, idx) {
          if (idx < roleIds.length) {
            var rid = roleIds[idx];
            var role = getRoleById(rid);
            slots[sid] = { roleId: rid, duty: role ? role.duty : null, playerName: null };
          }
        });
      });
    }
  }

  // ── CB combo path (DC strata assigned together) ──
  var dcSlotIds = strataSlots["DC"] || [];
  if (dcSlotIds.length > 0) {
    // Sort left-to-right (DCL -> DC -> DCR)
    dcSlotIds.sort(function (a, b) {
      return (GLOBAL_PITCH_SLOTS[a] ? GLOBAL_PITCH_SLOTS[a].x : 0) - (GLOBAL_PITCH_SLOTS[b] ? GLOBAL_PITCH_SLOTS[b].x : 0);
    });

    var cbCombo = getCBCombination(manager, dcSlotIds.length, philosophy, dna, formation);
    if (cbCombo) {
      dcSlotIds.forEach(function (sid, idx) {
        var rid = cbCombo.roles[idx];
        var role = getRoleById(rid);
        slots[sid] = { roleId: rid, duty: role ? role.duty : null, playerName: null };
      });
    } else {
      // Fallback: use per-strata selection if no combo matched
      var roleIds = getStrataRoleIds(manager, "DC", dcSlotIds.length, squad, instructions, formation, philosophy, dna) || [];
      dcSlotIds.forEach(function (sid, idx) {
        if (idx < roleIds.length) {
          var rid = roleIds[idx];
          var role = getRoleById(rid);
          slots[sid] = { roleId: rid, duty: role ? role.duty : null, playerName: null };
        }
      });
    }
  }

  // ── All other strata: independent per-strata selection ──
  Object.keys(strataSlots).forEach(function (strata) {
    if (["DM", "CM", "DC"].indexOf(strata) !== -1) return; // already handled above
    if (strata === "WD" || strata === "WB" || strata === "WA" || strata === "ST" || strata === "WM") {
      var allAssigned = strataSlots[strata].every(function (sid) { return slots[sid] && slots[sid].roleId; });
      if (allAssigned) return;
    }
    var slotIds = strataSlots[strata];
    var roleIds = getStrataRoleIds(manager, strata, slotIds.length, squad, instructions, formation, philosophy, dna);
    roleIds = roleIds || [];
    slotIds.forEach(function (sid, idx) {
      if (idx < roleIds.length) {
        var rid = roleIds[idx];
        var role = getRoleById(rid);
        slots[sid] = { roleId: rid, duty: role ? role.duty : null, playerName: null };
      }
    });
  });

  // Fill unassigned slots (edge case)
  slots = fillUnassignedSlots(slots, formDef);

  // Construct synthetic template for the standard generated slots, ensuring it runs through the optimization loop
  var syntheticTemplate = {
    id: "synthetic-" + formation + "-" + philosophy.replace(/\s+/g, "-"),
    name: "Synthetic " + formation,
    formation: formation,
    philosophy: philosophy,
    slots: slots
  };

  if (typeof findBestTacticFromTemplate === "function") {
    return findBestTacticFromTemplate(syntheticTemplate, manager, squad);
  }

  return runFullPipeline(slots, manager, squad, formation, instructions, philosophy, dna);
}

// ─── UTILITIES & HELPER FUNCTIONS FOR TEMPLATE MODE ───

function fillUnassignedSlots(slots, formDef) {
  formDef.slots.forEach(function (sid) {
    if (slots[sid] && slots[sid].roleId) return;
    var def = GLOBAL_PITCH_SLOTS[sid];
    var strata = def ? def.strata : "?";
    var dr = DEFAULT_ROLE_STRATA[strata];
    var roleId = dr ? getRoleId(dr.abbreviation, dr.duty, strata) : null;
    if (!roleId && formDef.defaultRoles[sid]) roleId = formDef.defaultRoles[sid];
    if (!roleId) {
      var abbr = DEFAULT_ABBREV[strata] || "CM";
      var duty = DEFAULT_DUTY[strata] || "Support";
      roleId = getRoleId(abbr, duty, strata);
    }
    var role = roleId ? getRoleById(roleId) : null;
    slots[sid] = { roleId: roleId, duty: role ? role.duty : null, playerName: null };
  });
  return slots;
}

function runFullPipeline(slots, manager, squad, formation, instructions, philosophy, dna) {
  var formDef = FORMATIONS[formation];
  if (!formDef) return null;

  // Ensure slots are completely filled
  slots = fillUnassignedSlots(slots, formDef);

  // ══════════════════════════════════════════════
  // Phase D: Role mutation passes (pre-duty-balance)
  // ══════════════════════════════════════════════
  slots = enforceFlankAsymmetry(slots, formation, instructions, manager);
  slots = enforceFlankCompatibility(slots, formation, instructions, manager);
  slots = enforceStrikerPartnership(slots, manager);
  slots = enforcePlaymakerLimit(slots, manager, squad, instructions);
  slots = enforceCenterbackDuties(slots, manager);

  // ══════════════════════════════════════════════
  // Phase E: Balance passes
  // ══════════════════════════════════════════════
  slots = balanceDuties(slots, manager, instructions, philosophy);
  slots = enforcePivotBalance(slots, manager, squad, instructions);
  slots = enforceMidfieldStructure(slots, manager, squad, instructions);
  slots = enforceFlankCompatibility(slots, formation, instructions, manager);
  slots = enforceTacticalFeasibility(slots, manager, instructions, formation);

  // ══════════════════════════════════════════════
  // Phase E2: Cross-strata relationship enforcement
  // ══════════════════════════════════════════════
  slots = enforceCBcoverage(slots, manager, formation);
  slots = enforceDMflankCover(slots, manager, formation);
  slots = enforceDMCBpressing(slots, manager);
  slots = enforceMezzalaCover(slots, manager);
  slots = enforceAMCMBalance(slots, manager);
  slots = enforceF9Surrounds(slots, manager);
  slots = enforceTMSupport(slots, manager);
  slots = enforceVerticalMidfield(slots, manager);
  slots = enforceWideForwardCMSide(slots, manager, formation);
  slots = enforceFBWingerRelationship(slots, manager, formation);
  slots = enforceDoubleAMBalance(slots, manager);
  slots = enforceStrikerDefensiveLine(slots, instructions, manager);
  slots = enforceGKDCpairing(slots, manager, instructions);
  slots = transformBuildUpShape(slots, formation, instructions, manager);
  slots = enforceWidthBalance(slots, formation, manager);
  slots = enforceMinimumWidth(slots, formation);
  slots = enforceCounterRunners(slots, philosophy, manager);
  slots = enforcePlaymakerLimit(slots, manager, squad, instructions);
  var zoneCollisionContext = { score: 1.0, violations: [] };
  slots = enforceZoneCollisions(slots, formation, manager, zoneCollisionContext);
  slots = enforceWideRoleVariety(slots, philosophy, dna);
  var restDefenceResult = calculateRestDefence(slots, instructions, manager, philosophy);
  if (restDefenceResult.autoFixed) {
    zoneCollisionContext = { score: 1.0, violations: [] };
    slots = enforceZoneCollisions(slots, formation, manager, zoneCollisionContext);
  }
  var pressResult = evaluatePressingCohesion(slots, instructions, manager);
  var archetypeResult = computeArchetypeFit(slots, instructions, philosophy);
  var spineResult = enforceSpineCoherence(slots, instructions, manager);

  // ══════════════════════════════════════════════
  // Phase F: Second instruction pass (needs roles)
  // ══════════════════════════════════════════════
  instructions = reconcileInstructionsWithRoles(slots, instructions, philosophy, manager);
  instructions = deriveFlankStrategy(manager, formation, squad, slots, instructions);
  instructions = deriveCrossingProfile(manager, squad, slots, instructions);
  instructions = deriveGKDistribution(manager, instructions, slots, philosophy);
  var playForSetPieces = deriveSetPieceAwareness(manager, squad);
  if (playForSetPieces) instructions.playForSetPieces = true;

  // ══════════════════════════════════════════════
  // Phase G: Final validation (re-apply philosophy after Phase F additions)
  // ══════════════════════════════════════════════
  instructions = applyPhilosophyConstraints(instructions, philosophy, manager);
  instructions = validateInstructions(instructions, manager);
  slots = enforceSweeperKeeper(slots, manager, instructions);
  slots = enforceCenterbackDuties(slots, manager);

  // ══════════════════════════════════════════════
  // Phase H: Player assignment + refinement
  // ══════════════════════════════════════════════
  var usedPlayers = {};
  Object.keys(slots).forEach(function (sid) {
    if (slots[sid] && slots[sid].playerName) {
      usedPlayers[slots[sid].playerName] = true;
    }
  });

  // Global Priority Assignment
  var pairings = [];
  var unassignedSlots = formDef.slots.filter(function (sid) {
    return !slots[sid] || !slots[sid].playerName;
  });

  unassignedSlots.forEach(function (sid) {
    var slotDef = slots[sid];
    if (!slotDef || !slotDef.roleId) return;

    var role = getRoleById(slotDef.roleId);
    if (!role) return;

    var slotPitchDef = GLOBAL_PITCH_SLOTS[sid];
    var strata = slotPitchDef ? slotPitchDef.strata : "";

    squad.forEach(function (player) {
      if (usedPlayers[player.Name]) return;
      if (!isFlankEligible(player, sid)) return;

      var pStrata = player.strata;
      if (!pStrata || !Array.isArray(pStrata) || pStrata.indexOf(strata) === -1) return;

      var scoreObj = scorePlayerForRole(player, slotDef.roleId, instructions, sid);
      if (scoreObj) {
        pairings.push({
          player: player,
          slotId: sid,
          score: scoreObj.total
        });
      }
    });
  });

  // Sort pairings by score descending
  pairings.sort(function (a, b) {
    return b.score - a.score;
  });

  var slotAssigned = {};
  pairings.forEach(function (p) {
    if (usedPlayers[p.player.Name] || slotAssigned[p.slotId]) return;

    slots[p.slotId].playerName = p.player.Name;
    usedPlayers[p.player.Name] = true;
    slotAssigned[p.slotId] = true;
  });

  var gaps = [];
  var playerMap = {};
  for (var pi = 0; pi < squad.length; pi++) {
    playerMap[squad[pi].Name] = squad[pi];
  }

  formDef.slots.forEach(function (sid) {
    var slotDef = slots[sid];
    if (!slotDef || !slotDef.roleId) {
      gaps.push({ slotId: sid, roleId: null, reason: "No role assigned" });
      return;
    }
    var role = getRoleById(slotDef.roleId);
    if (!role) {
      gaps.push({ slotId: sid, roleId: slotDef.roleId, reason: "Invalid role" });
      return;
    }
    if (!slotDef.playerName) {
      gaps.push({ slotId: sid, roleId: slotDef.roleId, reason: "No player assigned" });
      return;
    }
    var player = playerMap[slotDef.playerName];
    var scoreObj = player ? scorePlayerForRole(player, slotDef.roleId, instructions, sid) : null;
    var finalScore = scoreObj ? scoreObj.total : 0;
    if (finalScore < 8) {
      gaps.push({
        slotId: sid,
        roleId: slotDef.roleId,
        reason: finalScore > 0 ? "Best fit scores " + finalScore + "/20" : "No eligible player found"
      });
    }
  });

  var strataOrder = { GK: 0, DC: 1, WD: 2, WB: 3, DM: 4, CM: 5, WM: 6, WA: 7, AMC: 8, ST: 9 };
  var orderedSlots = formDef.slots.slice().sort(function (a, b) {
    var sa = GLOBAL_PITCH_SLOTS[a] ? GLOBAL_PITCH_SLOTS[a].strata : "";
    var sb = GLOBAL_PITCH_SLOTS[b] ? GLOBAL_PITCH_SLOTS[b].strata : "";
    var oa = strataOrder[sa] !== undefined ? strataOrder[sa] : 99;
    var ob = strataOrder[sb] !== undefined ? strataOrder[sb] : 99;
    if (oa !== ob) return oa - ob;
    return (GLOBAL_PITCH_SLOTS[a] ? GLOBAL_PITCH_SLOTS[a].x : 0) - (GLOBAL_PITCH_SLOTS[b] ? GLOBAL_PITCH_SLOTS[b].x : 0);
  });

  // Refinement pass
  for (var pass = 0; pass < 3; pass++) {
    var madeSwap = false;
    for (var ai = 0; ai < orderedSlots.length && !madeSwap; ai++) {
      var sidA = orderedSlots[ai];
      var slotA = slots[sidA];
      if (!slotA || !slotA.roleId || !slotA.playerName) continue;
      var playerA = playerMap[slotA.playerName];
      if (!playerA) continue;

      for (var bi = ai + 1; bi < orderedSlots.length && !madeSwap; bi++) {
        var sidB = orderedSlots[bi];
        var slotB = slots[sidB];
        if (!slotB || !slotB.roleId || !slotB.playerName) continue;
        var playerB = playerMap[slotB.playerName];
        if (!playerB) continue;

        if (!isFlankEligible(playerA, sidB)) continue;
        if (!isFlankEligible(playerB, sidA)) continue;

        var scoreAA = scorePlayerForRole(playerA, slotA.roleId, instructions, sidA);
        var scoreAB = scorePlayerForRole(playerA, slotB.roleId, instructions, sidB);
        var scoreBA = scorePlayerForRole(playerB, slotA.roleId, instructions, sidA);
        var scoreBB = scorePlayerForRole(playerB, slotB.roleId, instructions, sidB);
        if (!scoreAA || !scoreAB || !scoreBA || !scoreBB) continue;

        var currentMin = Math.min(scoreAA.total, scoreBB.total);
        var swappedMin = Math.min(scoreAB.total, scoreBA.total);

        if (swappedMin > currentMin + 0.5) {
          slotA.playerName = playerB.Name;
          slotB.playerName = playerA.Name;
          madeSwap = true;
        }
      }
    }
    if (!madeSwap) break;
  }

  // Recalculate gaps
  gaps = [];
  orderedSlots.forEach(function (sid) {
    var slotDef = slots[sid];
    if (!slotDef || !slotDef.roleId || !slotDef.playerName) {
      gaps.push({ slotId: sid, roleId: slotDef ? slotDef.roleId : null, reason: "No player assigned" });
      return;
    }
    var player = playerMap[slotDef.playerName];
    var scoreObj = player ? scorePlayerForRole(player, slotDef.roleId, instructions, sid) : null;
    var finalScore = scoreObj ? scoreObj.total : 0;
    if (finalScore < 8) {
      gaps.push({
        slotId: sid,
        roleId: slotDef.roleId,
        reason: finalScore > 0 ? "Best fit scores " + finalScore + "/20" : "No eligible player found"
      });
    }
  });

  var filledSlots = orderedSlots.length;
  var baseConfidence = filledSlots > 0 ? (filledSlots - gaps.length) / filledSlots : 0;
  var coherenceResult = computeGlobalCoherence(zoneCollisionContext, pressResult, archetypeResult, gaps, formation, slots);
  var confidence = baseConfidence * coherenceResult.final;

  return {
    formation: formation,
    slots: slots,
    instructions: instructions,
    philosophy: philosophy,
    isComplete: true,
    confidence: confidence,
    coherence: coherenceResult,
    gaps: gaps,
    spineCoherence: spineResult
  };
}

function getValidRolesForStrata(strata, philosophy) {
  var allowed = [];
  var profile = PHILOSOPHY_PROFILES[philosophy] || {};
  var roleSuppression = profile.roleSuppression || {};

  for (var i = 0; i < FM24_ROLES.length; i++) {
    var r = FM24_ROLES[i];
    if (roleHasStrata(r, strata) && !isAntiMetaRole(r.id)) {
      if (roleSuppression[r.id] !== undefined && roleSuppression[r.id] < 0.15) {
        continue;
      }
      allowed.push(r);
    }
  }
  if (allowed.length === 0) {
    for (var i = 0; i < FM24_ROLES.length; i++) {
      var r = FM24_ROLES[i];
      if (roleHasStrata(r, strata)) allowed.push(r);
    }
  }
  return allowed;
}

function mutateSlotRole(slots, slotId, philosophy, formation) {
  var slotDef = slots[slotId];
  if (!slotDef) return;
  var def = GLOBAL_PITCH_SLOTS[slotId];
  var strata = def ? def.strata : "CM";

  var candidates = getValidRolesForStrata(strata, philosophy);
  if (formation) {
    candidates = candidates.filter(function (r) {
      return isRoleAllowedForSlot(r.id, slotId, slots, formation);
    });
  }
  var otherCandidates = candidates.filter(function (r) { return r.id !== slotDef.roleId; });
  if (otherCandidates.length === 0) otherCandidates = candidates;

  if (otherCandidates.length > 0) {
    var profile = PHILOSOPHY_PROFILES[philosophy] || {};
    var roleBoost = profile.roleBoost || {};

    var weights = otherCandidates.map(function (r) {
      return roleBoost[r.id] || 1.0;
    });

    var picked = weightedPick(otherCandidates, weights);
    if (picked) {
      slots[slotId].roleId = picked.id;
      slots[slotId].duty = picked.duty;
    }
  }
}

function createTemplateVariant(slots, coherenceResult, formation, philosophy, dna, iteration) {
  var newSlots = {};
  Object.keys(slots).forEach(function (sid) {
    newSlots[sid] = {
      roleId: slots[sid].roleId,
      duty: slots[sid].duty,
      playerName: slots[sid].playerName
    };
  });

  var dimensions = [
    { name: "pairing", score: coherenceResult.pairingScore || 0 },
    { name: "structural", score: coherenceResult.structuralScore || 0 },
    { name: "zone", score: coherenceResult.zoneScore || 0 },
    { name: "press", score: coherenceResult.pressScore || 0 },
    { name: "archetype", score: coherenceResult.archetypeScore || 0 }
  ];
  dimensions.sort(function (a, b) { return a.score - b.score; });
  var worst = dimensions[0].name;

  var mutated = false;

  if (worst === "pairing") {
    var pmSlots = [];
    Object.keys(newSlots).forEach(function (sid) {
      var prof = ROLE_PROFILES[newSlots[sid].roleId];
      if (prof && prof.special && prof.special.distributor) pmSlots.push(sid);
    });
    if (pmSlots.length > 1) {
      mutateSlotRole(newSlots, pmSlots[0], philosophy, formation);
      mutated = true;
    }

    if (!mutated) {
      var cbSlots = [];
      Object.keys(newSlots).forEach(function (sid) {
        var def = GLOBAL_PITCH_SLOTS[sid];
        if (def && def.strata === "DC") cbSlots.push(sid);
      });
      if (cbSlots.length >= 2) {
        var roleId0 = newSlots[cbSlots[0]].roleId;
        var roleId1 = newSlots[cbSlots[1]].roleId;
        if (roleId0 === roleId1) {
          var altRole = "CD_D";
          if (roleId0 === "CD_D") altRole = "BPD_D";
          var role = ROLE_PROFILES[altRole];
          newSlots[cbSlots[0]].roleId = altRole;
          newSlots[cbSlots[0]].duty = (role && role.duty) ? role.duty : "Defend";
          mutated = true;
        }
      }
    }
  }

  // Structural (Rest Defence cover issues)
  if (!mutated && worst === "structural") {
    // Find DM or CM slots
    var holdingCandidates = [];
    Object.keys(newSlots).forEach(function (sid) {
      var def = GLOBAL_PITCH_SLOTS[sid];
      if (def && (def.strata === "DM" || def.strata === "CM")) {
        holdingCandidates.push(sid);
      }
    });

    if (holdingCandidates.length > 0) {
      // Find one that isn't holding, and mutate it to a holding role
      var targetSlot = null;
      for (var i = 0; i < holdingCandidates.length; i++) {
        var sid = holdingCandidates[i];
        var prof = ROLE_PROFILES[newSlots[sid].roleId];
        if (prof && !prof.movement.hold_position) {
          targetSlot = sid;
          break;
        }
      }
      if (!targetSlot) targetSlot = holdingCandidates[0];

      var def = GLOBAL_PITCH_SLOTS[targetSlot];
      var candidates = getValidRolesForStrata(def.strata, philosophy).filter(function (r) {
        return isRoleAllowedForTactic(r.id, newSlots, formation);
      });
      var holdRole = candidates.find(function (r) {
        var rp = ROLE_PROFILES[r.id];
        return rp && rp.movement.hold_position;
      });
      if (holdRole) {
        newSlots[targetSlot].roleId = holdRole.id;
        newSlots[targetSlot].duty = holdRole.duty || "Defend";
        mutated = true;
      }
    }
  }

  // Zone Collisions (overlapping width drifts)
  if (!mutated && worst === "zone") {
    // Check left side collision (DL and AML)
    var dlRole = newSlots["DL"] ? ROLE_PROFILES[newSlots["DL"].roleId] : null;
    var amlRole = newSlots["AML"] ? ROLE_PROFILES[newSlots["AML"].roleId] : null;
    if (dlRole && amlRole && dlRole.movement.width_drift < 0 && amlRole.movement.width_drift < 0) {
      // Mutate DL to a role with width_drift >= 0 (e.g. standard fullback/wingback)
      var candidates = getValidRolesForStrata("DL", philosophy).filter(function (r) {
        return isRoleAllowedForTactic(r.id, newSlots, formation);
      });
      var wideRole = candidates.find(function (r) {
        var rp = ROLE_PROFILES[r.id];
        return rp && rp.movement.width_drift >= 0;
      });
      if (wideRole) {
        newSlots["DL"].roleId = wideRole.id;
        newSlots["DL"].duty = wideRole.duty || "Support";
        mutated = true;
      }
    }

    // Check right side collision (DR and AMR)
    if (!mutated) {
      var drRole = newSlots["DR"] ? ROLE_PROFILES[newSlots["DR"].roleId] : null;
      var amrRole = newSlots["AMR"] ? ROLE_PROFILES[newSlots["AMR"].roleId] : null;
      if (drRole && amrRole && drRole.movement.width_drift < 0 && amrRole.movement.width_drift < 0) {
        // Mutate DR to a role with width_drift >= 0
        var candidates = getValidRolesForStrata("DR", philosophy).filter(function (r) {
          return isRoleAllowedForTactic(r.id, newSlots, formation);
        });
        var wideRole = candidates.find(function (r) {
          var rp = ROLE_PROFILES[r.id];
          return rp && rp.movement.width_drift >= 0;
        });
        if (wideRole) {
          newSlots["DR"].roleId = wideRole.id;
          newSlots["DR"].duty = wideRole.duty || "Support";
          mutated = true;
        }
      }
    }
  }

  // Pressing Cohesion (low press intensity)
  if (!mutated && worst === "press") {
    var pressingCandidates = [];
    Object.keys(newSlots).forEach(function (sid) {
      var def = GLOBAL_PITCH_SLOTS[sid];
      if (def && (def.strata === "ST" || def.strata === "AM" || def.strata === "AML" || def.strata === "AMR")) {
        pressingCandidates.push(sid);
      }
    });

    if (pressingCandidates.length > 0) {
      var targetSlot = null;
      var minPress = 999;
      pressingCandidates.forEach(function (sid) {
        var prof = ROLE_PROFILES[newSlots[sid].roleId];
        if (prof && prof.defensive.press_intensity < minPress) {
          minPress = prof.defensive.press_intensity;
          targetSlot = sid;
        }
      });

      if (targetSlot) {
        var def = GLOBAL_PITCH_SLOTS[targetSlot];
        var candidates = getValidRolesForStrata(def.strata, philosophy).filter(function (r) {
          return isRoleAllowedForTactic(r.id, newSlots, formation);
        });
        var highPressRole = candidates.find(function (r) {
          var rp = ROLE_PROFILES[r.id];
          return rp && rp.defensive.press_intensity > minPress;
        });
        if (highPressRole) {
          newSlots[targetSlot].roleId = highPressRole.id;
          newSlots[targetSlot].duty = highPressRole.duty || "Attack";
          mutated = true;
        }
      }
    }
  }

  if (!mutated && worst === "archetype") {
    var profile = PHILOSOPHY_PROFILES[philosophy] || {};
    var roleSuppression = profile.roleSuppression || {};
    var suppressedSlots = [];
    Object.keys(newSlots).forEach(function (sid) {
      var rid = newSlots[sid].roleId;
      if (rid && roleSuppression[rid] !== undefined && roleSuppression[rid] < 0.5) {
        suppressedSlots.push(sid);
      }
    });
    if (suppressedSlots.length > 0) {
      mutateSlotRole(newSlots, suppressedSlots[0], philosophy, formation);
      mutated = true;
    }
  }

  if (!mutated) {
    var allSlots = Object.keys(newSlots);
    if (allSlots.length > 0) {
      var seedInt = Math.floor(dna.seed * 1000) + iteration;
      var randomSlot = allSlots[seedInt % allSlots.length];
      mutateSlotRole(newSlots, randomSlot, philosophy, formation);
    }
  }

  return newSlots;
}

function customizeTemplateSlots(templateSlots, manager, instructions, formation, philosophy, dna, squad) {
  var slots = {};
  if (!dna) dna = getManagerDNA(manager.Name, manager);
  var ada = normalizeAttr(manager.Ada || manager.Adaptability || 10);

  // Variance weight determines how much we deviate from the template.
  // We use manager's roleExperimentation DNA and adaptability to scale it.
  var varianceWeight = 0.10 + 0.30 * dna.roleExperimentation + 0.15 * ada;
  varianceWeight = Math.max(0.05, Math.min(0.60, varianceWeight));

  Object.keys(templateSlots).forEach(function (sid) {
    var slotData = templateSlots[sid];
    if (!slotData || !slotData.roleId) return;

    var defaultRoleId = slotData.roleId;
    var defaultRole = getRoleById(defaultRoleId);
    if (!defaultRole) {
      slots[sid] = { roleId: defaultRoleId, duty: slotData.duty, playerName: null };
      return;
    }

    var defaultDuty = slotData.duty || defaultRole.duty;
    var defSlot = GLOBAL_PITCH_SLOTS[sid];
    var strata = defSlot ? defSlot.strata : "CM";

    var candidates = getValidRolesForStrata(strata, philosophy).filter(function (r) {
      return isRoleAllowedForTactic(r.id, null, formation);
    });

    var dutyMatches = candidates.filter(function (r) { return r.duty === defaultDuty; });
    if (dutyMatches.length > 0) {
      candidates = dutyMatches;
    }

    if (candidates.length <= 1) {
      slots[sid] = { roleId: defaultRoleId, duty: defaultDuty, playerName: null };
      return;
    }

    var scoredCandidates = [];
    var defaultProfile = ROLE_PROFILES[defaultRoleId];

    for (var i = 0; i < candidates.length; i++) {
      var cand = candidates[i];
      var candProfile = ROLE_PROFILES[cand.id];
      if (!candProfile || !defaultProfile) continue;

      // 1. Template similarity (cosine similarity of style profiles)
      var sim = cosineSimilarity(candProfile, defaultProfile);
      sim = Math.max(0, sim); // Clamp to 0..1

      // 2. Manager affinity score
      var affinity = roleScoreForManager(cand.id, manager);
      var managerWeight = 0.3 + affinity * 0.7;
      var context = contextMultiplier(cand.id, manager, instructions, formation);
      var philMult = philosophy ? philosophyRoleMultiplier(cand.id, philosophy) : 1.0;
      var metaPref = isMetaRole(cand.id) ? (0.85 + dna.metaPreference * 0.3) : 1.0;
      var mgrPref = managerWeight * context * philMult * metaPref;

      // 3. Player suitability (if squad is loaded and manager is adaptable)
      var bestPlayerScore = 0;
      if (squad && squad.length > 0) {
        var eligiblePlayers = squad.filter(function (p) {
          return p.strata && Array.isArray(p.strata) && p.strata.indexOf(strata) !== -1;
        });
        for (var pi = 0; pi < eligiblePlayers.length; pi++) {
          var result = scorePlayerForRole(eligiblePlayers[pi], cand.id, instructions, sid);
          if (result && result.total > bestPlayerScore) {
            bestPlayerScore = result.total;
          }
        }
      }
      var normPlayerScore = bestPlayerScore / 20;

      // 4. Blending formula
      var blendScore;
      if (squad && squad.length > 0 && ada >= 0.5) {
        var squadWeight = 0.15 + 0.3 * ada; // 0.225 to 0.45
        var mgrWeight = 0.10 + 0.2 * dna.roleExperimentation; // 0.10 to 0.30
        var templWeight = 1.0 - squadWeight - mgrWeight;

        blendScore = templWeight * sim + mgrWeight * mgrPref + squadWeight * normPlayerScore;
      } else {
        blendScore = (1.0 - varianceWeight) * sim + varianceWeight * mgrPref;
      }

      scoredCandidates.push({
        roleId: cand.id,
        duty: cand.duty,
        score: blendScore
      });
    }

    if (scoredCandidates.length === 0) {
      slots[sid] = { roleId: defaultRoleId, duty: defaultDuty, playerName: null };
      return;
    }

    scoredCandidates.sort(function (a, b) { return b.score - a.score; });
    var best = scoredCandidates[0];
    slots[sid] = {
      roleId: best.roleId,
      duty: best.duty || defaultDuty,
      playerName: null
    };
  });

  return slots;
}

function generateTacticFromTemplate(template, manager, squad) {
  var formation = template.formation || "4-3-3 DM";
  var philosophy = template.philosophy || "possession-oriented tactician";
  var dna = getManagerDNA(manager.Name, manager);

  var instructions = generateInstructions(manager);
  instructions = applyPhilosophyConstraints(instructions, philosophy, manager);
  instructions = validateInstructions(instructions, manager);

  if (squad && squad.length > 0) {
    instructions = adjustInstructionsForSquad(instructions, squad, dna);
  }

  var slots = {};
  var formDef = FORMATIONS[formation];
  if (!formDef) return null;

  if (template.slots) {
    Object.keys(template.slots).forEach(function (sid) {
      var slotData = template.slots[sid];
      if (slotData && slotData.roleId) {
        var role = getRoleById(slotData.roleId);
        slots[sid] = {
          roleId: slotData.roleId,
          duty: slotData.duty || (role ? role.duty : null),
          playerName: null
        };
      }
    });

    var isSynthetic = template.id && template.id.indexOf("synthetic-") === 0;
    if (!isSynthetic) {
      slots = customizeTemplateSlots(slots, manager, instructions, formation, philosophy, dna, squad);
    }
  }

  var hasTemplateSlots = template.slots && Object.keys(template.slots).length > 0;
  if (!hasTemplateSlots) {
    var strataSlots = {};
    formDef.slots.forEach(function (sid) {
      var def = GLOBAL_PITCH_SLOTS[sid];
      if (!def) return;
      if (!strataSlots[def.strata]) strataSlots[def.strata] = [];
      strataSlots[def.strata].push(sid);
    });

    // ── WD + WA combo path (per flank) ──
    var wdSlotIds = strataSlots["WD"] || [];
    var waSlotIds = strataSlots["WA"] || [];
    var wbSlotIds = strataSlots["WB"] || [];

    var leftWD = wdSlotIds.filter(function (s) { return GLOBAL_PITCH_SLOTS[s].flank === "L"; });
    var leftWB = wbSlotIds.filter(function (s) { return GLOBAL_PITCH_SLOTS[s].flank === "L"; });
    var leftWDslot = leftWD[0] || leftWB[0] || null;
    var leftWA = waSlotIds.filter(function (s) { return GLOBAL_PITCH_SLOTS[s].flank === "L"; });

    if (leftWDslot && leftWA.length > 0) {
      var leftCombo = getWDWACombination(manager, formation, instructions, philosophy, dna, "L");
      if (leftCombo) {
        var wdRole = getRoleById(leftCombo.wd);
        slots[leftWDslot] = { roleId: leftCombo.wd, duty: wdRole ? wdRole.duty : null, playerName: null };
        var waRole = getRoleById(leftCombo.wa);
        slots[leftWA[0]] = { roleId: leftCombo.wa, duty: waRole ? waRole.duty : null, playerName: null };
      }
    }

    var rightWD = wdSlotIds.filter(function (s) { return GLOBAL_PITCH_SLOTS[s].flank === "R"; });
    var rightWB = wbSlotIds.filter(function (s) { return GLOBAL_PITCH_SLOTS[s].flank === "R"; });
    var rightWDslot = rightWD[0] || rightWB[0] || null;
    var rightWA = waSlotIds.filter(function (s) { return GLOBAL_PITCH_SLOTS[s].flank === "R"; });

    if (rightWDslot && rightWA.length > 0) {
      var otherWaLeftT = (leftWA.length > 0 && slots[leftWA[0]]) ? slots[leftWA[0]].roleId : null;
      var rightCombo = getWDWACombination(manager, formation, instructions, philosophy, dna, "R", otherWaLeftT);
      if (rightCombo) {
        var wdRole = getRoleById(rightCombo.wd);
        slots[rightWDslot] = { roleId: rightCombo.wd, duty: wdRole ? wdRole.duty : null, playerName: null };
        var waRole = getRoleById(rightCombo.wa);
        slots[rightWA[0]] = { roleId: rightCombo.wa, duty: waRole ? waRole.duty : null, playerName: null };
      }
    }

    // ── ST combo path ──
    var stSlotIds = strataSlots["ST"] || [];
    if (stSlotIds.length === 2) {
      var stCombo = getSTCombination(manager, 2, philosophy, dna);
      if (stCombo) {
        stSlotIds.forEach(function (sid, idx) {
          var rid = stCombo.roles[idx];
          var role = getRoleById(rid);
          slots[sid] = { roleId: rid, duty: role ? role.duty : null, playerName: null };
        });
      }
    }

    var dmSlotIds = strataSlots["DM"] || [];
    var cmSlotIds = strataSlots["CM"] || [];
    var hasMidfield = dmSlotIds.length > 0 || cmSlotIds.length > 0;
    if (hasMidfield) {
      var combo = getMidfieldCombination(manager, dmSlotIds.length, cmSlotIds.length, instructions, philosophy, formation, dna);
      if (combo) {
        dmSlotIds.forEach(function (sid, idx) {
          var rid = combo.dm[idx];
          if (rid) slots[sid] = { roleId: rid, duty: getRoleById(rid) ? getRoleById(rid).duty : null, playerName: null };
        });
        cmSlotIds.forEach(function (sid, idx) {
          var rid = combo.cm[idx];
          if (rid) slots[sid] = { roleId: rid, duty: getRoleById(rid) ? getRoleById(rid).duty : null, playerName: null };
        });
      } else {
        [{ strata: "DM", sids: dmSlotIds }, { strata: "CM", sids: cmSlotIds }].forEach(function (g) {
          if (g.sids.length === 0) return;
          var roleIds = getStrataRoleIds(manager, g.strata, g.sids.length, squad, instructions, formation, philosophy, dna) || [];
          g.sids.forEach(function (sid, idx) {
            if (idx < roleIds.length) {
              var rid = roleIds[idx];
              slots[sid] = { roleId: rid, duty: getRoleById(rid) ? getRoleById(rid).duty : null, playerName: null };
            }
          });
        });
      }
    }

    var dcSlotIds = strataSlots["DC"] || [];
    if (dcSlotIds.length > 0) {
      dcSlotIds.sort(function (a, b) {
        return (GLOBAL_PITCH_SLOTS[a] ? GLOBAL_PITCH_SLOTS[a].x : 0) - (GLOBAL_PITCH_SLOTS[b] ? GLOBAL_PITCH_SLOTS[b].x : 0);
      });
      var cbCombo = getCBCombination(manager, dcSlotIds.length, philosophy, dna, formation);
      if (cbCombo) {
        dcSlotIds.forEach(function (sid, idx) {
          var rid = cbCombo.roles[idx];
          slots[sid] = { roleId: rid, duty: getRoleById(rid) ? getRoleById(rid).duty : null, playerName: null };
        });
      } else {
        var roleIds = getStrataRoleIds(manager, "DC", dcSlotIds.length, squad, instructions, formation, philosophy, dna) || [];
        dcSlotIds.forEach(function (sid, idx) {
          if (idx < roleIds.length) {
            var rid = roleIds[idx];
            slots[sid] = { roleId: rid, duty: getRoleById(rid) ? getRoleById(rid).duty : null, playerName: null };
          }
        });
      }
    }

    Object.keys(strataSlots).forEach(function (strata) {
      if (["DM", "CM", "DC"].indexOf(strata) !== -1) return;
      if (strata === "WD" || strata === "WB" || strata === "WA" || strata === "ST") {
        var allAssigned = strataSlots[strata].every(function (sid) { return slots[sid] && slots[sid].roleId; });
        if (allAssigned) return;
      }
      var slotIds = strataSlots[strata];
      var roleIds = getStrataRoleIds(manager, strata, slotIds.length, squad, instructions, formation, philosophy, dna) || [];
      slotIds.forEach(function (sid, idx) {
        if (idx < roleIds.length) {
          var rid = roleIds[idx];
          slots[sid] = { roleId: rid, duty: getRoleById(rid) ? getRoleById(rid).duty : null, playerName: null };
        }
      });
    });
  }

  slots = fillUnassignedSlots(slots, formDef);

  return runFullPipeline(slots, manager, squad, formation, instructions, philosophy, dna);
}

function findBestTacticFromTemplate(template, manager, squad) {
  var bestTactic = generateTacticFromTemplate(template, manager, squad);
  if (!bestTactic) return null;

  var currentCoherence = bestTactic.coherence ? bestTactic.coherence.final : 0;
  if (currentCoherence >= 0.80) {
    return bestTactic;
  }

  var iteration = 0;
  var maxIterations = 15;
  if (currentCoherence >= 0.65) {
    maxIterations = 5;
  } else if (currentCoherence >= 0.55) {
    maxIterations = 10;
  }

  var philosophy = template.philosophy || "possession-oriented tactician";
  var formation = template.formation || "4-3-3 DM";
  var dna = getManagerDNA(manager.Name, manager);

  var currentSlots = bestTactic.slots;
  var bestSlots = currentSlots;
  var bestScore = currentCoherence;

  while (iteration < maxIterations) {
    iteration++;
    var mutatedSlots = createTemplateVariant(currentSlots, bestTactic.coherence, formation, philosophy, dna, iteration);

    var result = runFullPipeline(mutatedSlots, manager, squad, formation, bestTactic.instructions, philosophy, dna);
    if (!result) continue;

    var newScore = result.coherence ? result.coherence.final : 0;

    if (newScore > bestScore) {
      bestScore = newScore;
      bestSlots = mutatedSlots;
      bestTactic = result;
      currentSlots = mutatedSlots;

      if (newScore >= 0.80) {
        break;
      }
    } else {
      currentSlots = bestSlots;
    }
  }

  return bestTactic;
}

