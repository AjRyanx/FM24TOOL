// ─── FM24 TACTICAL VALIDATOR (GAFFER VALIDATOR) ───
// Evaluates tactics for Role Compatibility, Tactical Balance, and Positional Coverage.

(function (global) {
  "use strict";

  // Helper to retrieve roles safely
  function getRole(roleId) {
    if (typeof getRoleById === "function") {
      return getRoleById(roleId);
    }
    // Fallback if global is different
    if (global.FM24_ROLES) {
      for (var i = 0; i < global.FM24_ROLES.length; i++) {
        if (global.FM24_ROLES[i].id === roleId) return global.FM24_ROLES[i];
      }
    }
    return null;
  }

  function evaluateTacticFeasibility(tactic) {
    if (!tactic || !tactic.slots) {
      return {
        overallScore: 0,
        categories: { compatibility: 0, balance: 0, coverage: 0, pairing: 0 },
        breakdown: {},
        warnings: ["Invalid or empty tactic"],
        positives: [],
        pairingReject: false
      };
    }

    var slots = tactic.slots;
    var warnings = [];
    var positives = [];
    var pairingViolations = [];
    var pairingScore = 100;

    var p = tactic.philosophy || tactic.archetype || "balanced";
    if (typeof p === "string") {
      p = p.toLowerCase();
    } else {
      p = "balanced";
    }

    // Layer 1: Pairing Engine (NP-01 to NP-30)
    if (typeof global.evaluatePairings === "function") {
      var instructions = tactic.instructions || {};
      var archetype = tactic.archetype || tactic.philosophy || null;
      var pairingResult = global.evaluatePairings(slots, instructions, archetype);
      pairingScore = Math.round(pairingResult.pairingScore * 100);
      pairingViolations = pairingResult.violations;
      if (pairingResult.criticalReject) {
        // Short-circuit: tactic is invalid
        var critWarnings = ["CRITICAL: Tactic failed pairing validation"];
        for (var pvi2 = 0; pvi2 < pairingResult.violations.length; pvi2++) {
          var pv2 = pairingResult.violations[pvi2];
          critWarnings.push(pv2.severity + ": " + pv2.description + (pv2.suggestion ? " [" + pv2.suggestion + "]" : ""));
        }
        return {
          overallScore: 0,
          categories: { compatibility: 0, balance: 0, coverage: 0, pairing: 0 },
          breakdown: {
            pairingViolations: pairingResult.violations,
            pairResults: pairingResult.pairResults || [],
            pairCount: pairingResult.pairCount || 0
          },
          warnings: critWarnings,
          positives: [],
          pairingReject: true
        };
      }
      if (pairingResult.violations.length > 0) {
        for (var pvi = 0; pvi < pairingResult.violations.length; pvi++) {
          var pv = pairingResult.violations[pvi];
          warnings.push(pv.severity + ": " + pv.description + (pv.suggestion ? " [" + pv.suggestion + "]" : ""));
        }
      }
    }

    // ────────────────────────────────────────────────────────
    // 1. ROLE COMPATIBILITY SCORE (C) - 35% of Total
    // ────────────────────────────────────────────────────────
    var compScore = 100;
    var compRules = [];

    // A. Centreback Pairings (DC strata)
    var cbSlots = [];
    Object.keys(slots).forEach(function (sid) {
      var def = global.GLOBAL_PITCH_SLOTS ? global.GLOBAL_PITCH_SLOTS[sid] : null;
      if (def && def.strata === "DC" && slots[sid].roleId) {
        cbSlots.push(sid);
      }
    });

    if (cbSlots.length >= 2) {
      var stopperCount = 0;
      var coverCount = 0;
      var defendCount = 0;
      var highRiskCB = 0;

      cbSlots.forEach(function (sid) {
        var role = getRole(slots[sid].roleId);
        if (!role) return;
        if (role.duty === "Stopper") stopperCount++;
        else if (role.duty === "Cover") coverCount++;
        else if (role.duty === "Defend") defendCount++;
        
        if (slots[sid].roleId === "WCB_A" || slots[sid].roleId === "Libero_A") {
          highRiskCB++;
        }
      });

      if (stopperCount > 0 && coverCount > 0) {
        compScore += 15;
        compRules.push("Stopper + Cover pairing offers excellent coverage (+15)");
      }
      if (stopperCount >= 2) {
        compScore -= 25;
        warnings.push("Double Stopper CB pairing leaves space vulnerable behind (-25)");
      }
      if (highRiskCB >= 2) {
        compScore -= 30;
        warnings.push("No CB anchor role - too many high-risk CB progressors (-30)");
      }
    }

    // B. Flank Partnerships (Left and Right)
    function checkFlankCompatibility(side) {
      var waSlot = side === "L" ? (slots.AML || slots.ML) : (slots.AMR || slots.MR);
      var wdSlot = side === "L" ? (slots.DL || slots.WBL) : (slots.DR || slots.WBR);

      if (!waSlot || !wdSlot || !waSlot.roleId || !wdSlot.roleId) return;

      var waRole = getRole(waSlot.roleId);
      var wdRole = getRole(wdSlot.roleId);
      if (!waRole || !wdRole) return;

      var waCuts = ["IF", "IW", "WP", "TQ", "RMD"].indexOf(waRole.abbreviation) !== -1;
      var wdInverts = ["IWB", "IFB"].indexOf(wdRole.abbreviation) !== -1;
      var wdOverlaps = ["WB", "CWB"].indexOf(wdRole.abbreviation) !== -1 || (wdRole.abbreviation === "FB" && wdRole.duty !== "Defend");

      if (waCuts && wdOverlaps) {
        compScore += 15;
        compRules.push("Flank " + side + ": Inside forward + overlapping fullback pairing (+15)");
      }
      if (!waCuts && wdInverts) {
        compScore += 15;
        compRules.push("Flank " + side + ": Traditional wide winger + Inverted Wing-Back pairing (+15)");
      }
      if (waCuts && wdInverts) {
        compScore -= 15;
        warnings.push("Flank " + side + ": Double inside roles clog central channels (-15)");
      }
      if (!waCuts && !wdOverlaps && (wdRole.abbreviation === "IFB" || wdRole.abbreviation === "NFB" || wdRole.duty === "Defend")) {
        if (p === "disciplined defensive organiser") {
          compRules.push("Flank " + side + ": Defensive flank structure with non-overlapping fullback (acceptable for Defensive Organiser)");
        } else if (p === "direct counter-attacker") {
          compScore -= 5;
          warnings.push("Flank " + side + ": Lack of overlap/underlap - empty wide channels (-5)");
        } else {
          compScore -= 15;
          warnings.push("Flank " + side + ": Lack of overlap/underlap - empty wide channels (-15)");
        }
      }
    }
    checkFlankCompatibility("L");
    checkFlankCompatibility("R");

    // C. Midfield Pivots (DM/CM strata)
    var midSlots = [];
    Object.keys(slots).forEach(function (sid) {
      var def = global.GLOBAL_PITCH_SLOTS ? global.GLOBAL_PITCH_SLOTS[sid] : null;
      if (def && (def.strata === "DM" || def.strata === "CM") && slots[sid].roleId) {
        midSlots.push(sid);
      }
    });

    if (midSlots.length >= 2) {
      var playmakers = 0;
      var anchors = 0;
      var runners = 0;

      midSlots.forEach(function (sid) {
        var role = getRole(slots[sid].roleId);
        if (!role) return;
        if (role.isPlaymaker || ["DLP", "Regista", "RPM", "AP"].indexOf(role.abbreviation) !== -1) {
          playmakers++;
        }
        if (["Anchor", "HB", "BWM", "DM"].indexOf(role.abbreviation) !== -1 && role.duty === "Defend") {
          anchors++;
        }
        if (["Mezzala", "BBM", "CM"].indexOf(role.abbreviation) !== -1 && role.duty === "Attack") {
          runners++;
        }
      });

      if (playmakers > 0 && anchors > 0) {
        compScore += 20;
        compRules.push("Midfield Pivot: Playmaker + Defensive Anchor partnership (+20)");
      }
      if (playmakers >= 2 && anchors === 0) {
        compScore -= 25;
        warnings.push("Midfield Pivot: Double playmaker roles with no defensive anchor (-25)");
      }
    }

    compScore = Math.max(0, Math.min(100, compScore));

    // ────────────────────────────────────────────────────────
    // 2. TACTICAL BALANCE SCORE (B) - 35% of Total
    // ────────────────────────────────────────────────────────
    var balScore = 100;

    // A. Duty Counts
    var duties = { Defend: 0, Support: 0, Attack: 0 };
    Object.keys(slots).forEach(function (sid) {
      var def = global.GLOBAL_PITCH_SLOTS ? global.GLOBAL_PITCH_SLOTS[sid] : null;
      if (!def || def.strata === "GK") return; // exclude GK
      var duty = slots[sid].duty;
      if (duty === "Stopper" || duty === "Cover") duty = "Defend";
      if (duties[duty] !== undefined) {
        duties[duty]++;
      }
    });

    // Standard baseline goals (philosophy-aware)
    var minDefend = 3, maxDefend = 5;
    var minAttack = 2, maxAttack = 4;

    if (p === "disciplined defensive organiser" || p === "direct counter-attacker" || p === "wide-oriented direct play") {
      minDefend = 3;
      maxDefend = 6;
      minAttack = 1;
      maxAttack = 3;
    } else if (p === "possession-oriented tactician" || p === "positional play specialist") {
      minDefend = 2;
      maxDefend = 4;
      minAttack = 2;
      maxAttack = 4;
    } else if (p === "aggressive high-press tactician") {
      minDefend = 3;
      maxDefend = 4;
      minAttack = 3;
      maxAttack = 5;
    }

    if (duties.Defend < minDefend || duties.Defend > maxDefend) {
      balScore -= 10;
      warnings.push("Suboptimal defend duties for " + p + ": currently " + duties.Defend + " (recommended: " + minDefend + "-" + maxDefend + ")");
    }
    if (duties.Attack < minAttack || duties.Attack > maxAttack) {
      balScore -= 10;
      warnings.push("Suboptimal attack duties for " + p + ": currently " + duties.Attack + " (recommended: " + minAttack + "-" + maxAttack + ")");
    }

    // B. Rest Defence
    var rdCount = 0;
    Object.keys(slots).forEach(function (sid) {
      var def = global.GLOBAL_PITCH_SLOTS ? global.GLOBAL_PITCH_SLOTS[sid] : null;
      if (!def || def.strata === "GK") return;
      var slot = slots[sid];
      var role = getRole(slot.roleId);
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

    if (rdCount < 3) {
      balScore -= 30;
      warnings.push("Critical Rest Defence deficiency: only " + rdCount + " players staying back (-30)");
    } else if (rdCount >= 4) {
      balScore += 10;
      positives.push("Solid Rest Defence foundation with " + rdCount + " players back (+10)");
    }

    // C. Flank Width
    function checkWideProvider(side) {
      var ids = side === "L" ? ["DL", "WBL", "ML", "AML"] : ["DR", "WBR", "MR", "AMR"];
      var hasFlank = ids.some(function (sid) { return slots[sid] && slots[sid].roleId; });
      if (!hasFlank) return true; // flank doesn't exist in formation

      var providesWidth = ids.some(function (sid) {
        if (!slots[sid] || !slots[sid].roleId) return false;
        var r = getRole(slots[sid].roleId);
        if (!r) return false;
        var abbr = r.abbreviation;
        if (abbr === "Winger" || abbr === "Winger_WM" || abbr === "WM" || abbr === "DW" || abbr === "WB" || abbr === "CWB") {
          return true;
        }
        if (abbr === "FB" && (r.duty === "Support" || r.duty === "Attack")) {
          return true;
        }
        return false;
      });
      return providesWidth;
    }

    if (!checkWideProvider("L")) {
      balScore -= 20;
      warnings.push("Left flank lacks wide provider to stretch opposition (-20)");
    } else {
      positives.push("Left flank has proper width representation");
    }
    if (!checkWideProvider("R")) {
      balScore -= 20;
      warnings.push("Right flank lacks wide provider to stretch opposition (-20)");
    } else {
      positives.push("Right flank has proper width representation");
    }

    // D. Risk Balance
    var extremeRiskRoles = ["Libero_A", "CWB_A", "Trequartista_A", "Regista_S", "SV_A"];
    var riskCount = 0;
    Object.keys(slots).forEach(function (sid) {
      if (slots[sid].roleId && extremeRiskRoles.indexOf(slots[sid].roleId) !== -1) {
        riskCount++;
      }
    });

    if (riskCount > 3) {
      balScore -= 15;
      warnings.push("Excessive high-risk roles (" + riskCount + ") leaves team shape disorganized (-15)");
    }

    balScore = Math.max(0, Math.min(100, balScore));

    // ────────────────────────────────────────────────────────
    // 3. POSITIONAL COVERAGE SCORE (P) - 30% of Total
    // ────────────────────────────────────────────────────────
    var covScore = 0;
    var covDetails = {
      midfieldController: false,
      defensiveShield: false,
      widthL: false,
      widthR: false,
      boxThreat: false,
      chanceCreator: false
    };

    Object.keys(slots).forEach(function (sid) {
      var slot = slots[sid];
      if (!slot || !slot.roleId) return;
      var role = getRole(slot.roleId);
      if (!role) return;
      var abbr = role.abbreviation;

      // 1. Midfield Controller
      if (["DLP", "CM", "RPM", "Carrilero"].indexOf(abbr) !== -1 && slot.duty === "Support") {
        covDetails.midfieldController = true;
      }
      // 2. Defensive Shield
      if (["Anchor", "HB", "DM", "BWM", "CM"].indexOf(abbr) !== -1 && slot.duty === "Defend") {
        covDetails.defensiveShield = true;
      }
      // 3. Left Width
      if (["DL", "WBL", "ML", "AML"].indexOf(sid) !== -1) {
        if (["Winger", "Winger_WM", "WM", "DW", "WB", "CWB"].indexOf(abbr) !== -1 || (abbr === "FB" && slot.duty !== "Defend")) {
          covDetails.widthL = true;
        }
      }
      // 4. Right Width
      if (["DR", "WBR", "MR", "AMR"].indexOf(sid) !== -1) {
        if (["Winger", "Winger_WM", "WM", "DW", "WB", "CWB"].indexOf(abbr) !== -1 || (abbr === "FB" && slot.duty !== "Defend")) {
          covDetails.widthR = true;
        }
      }
      // 5. Box Threat
      if (role.strata === "ST" && abbr !== "F9" && slot.roleId !== "DLF_S") {
        covDetails.boxThreat = true;
      }
      if (slot.duty === "Attack" && ["IF", "IW", "RMD", "SS", "AM", "Mezzala", "CM"].indexOf(abbr) !== -1) {
        covDetails.boxThreat = true;
      }
      // 6. Chance Creator
      if (["AP", "Regista", "Trequartista", "Enganche", "F9"].indexOf(abbr) !== -1 || (abbr === "DLP" && slot.duty === "Support")) {
        covDetails.chanceCreator = true;
      }
    });

    if (p === "possession-oriented tactician" || p === "positional play specialist") {
      // Possession needs controller, playmaker, and wide expansion
      if (covDetails.midfieldController) {
        covScore += 25;
      } else {
        warnings.push("Possession style requires a midfield controller (e.g., DLP, CM-S) to dictate play");
      }

      if (covDetails.chanceCreator) {
        covScore += 25;
      } else {
        warnings.push("Possession style requires a creative playmaker (e.g., AP, TQ, F9) to unlock defences");
      }

      if (covDetails.defensiveShield) {
        covScore += 15;
      } else {
        warnings.push("No midfield anchor present to protect the possession block");
      }

      if (covDetails.widthL) covScore += 10;
      if (covDetails.widthR) covScore += 10;
      if (!covDetails.widthL || !covDetails.widthR) {
        warnings.push("Possession style needs wide options on both flanks to stretch the opponent");
      }

      if (covDetails.boxThreat) {
        covScore += 15;
      } else {
        warnings.push("No attacking runner/box threat present");
      }
    } else if (p === "aggressive high-press tactician") {
      // Press needs shield, box threat (runners), and wide options
      if (covDetails.defensiveShield) {
        covScore += 25;
      } else {
        warnings.push("High-press style requires a defensive anchor (e.g., BWM, DM-D) to protect against counters");
      }

      if (covDetails.boxThreat) {
        covScore += 25;
      } else {
        warnings.push("High-press style requires direct attacking runners (e.g., IF-A, IW-A, AF-A) to press and penetrate");
      }

      if (covDetails.midfieldController) covScore += 15;
      if (covDetails.chanceCreator) covScore += 15;
      if (covDetails.widthL) covScore += 10;
      if (covDetails.widthR) covScore += 10;

      if (!covDetails.widthL || !covDetails.widthR) {
        warnings.push("Wide options recommended to support pressing trap wide");
      }
    } else if (p === "disciplined defensive organiser") {
      // Defensive organiser needs defensive shield, and width for clearing, but controller/playmaker are optional
      covScore = 30; // High base for defensive stability
      if (covDetails.defensiveShield) {
        covScore += 30;
        positives.push("Midfield defensive shield is properly established");
      } else {
        warnings.push("Defensive block lacks an anchor/defensive shield");
      }

      if (covDetails.widthL) covScore += 10;
      if (covDetails.widthR) covScore += 10;
      if (covDetails.boxThreat) covScore += 10;

      // Optional (no warning if missing, but boost if present)
      if (covDetails.midfieldController) covScore += 5;
      if (covDetails.chanceCreator) covScore += 5;
    } else if (p === "direct counter-attacker") {
      // Counter-attacker needs defensive shield and box threat (runners), controller/playmaker are optional
      covScore = 20; // Medium base
      if (covDetails.defensiveShield) {
        covScore += 25;
      } else {
        warnings.push("Counter-attack style needs a defensive shield to win the ball back");
      }

      if (covDetails.boxThreat) {
        covScore += 25;
      } else {
        warnings.push("Counter-attack style needs quick runners (e.g., AF-A, W-A) to attack space on transitions");
      }

      if (covDetails.widthL) covScore += 10;
      if (covDetails.widthR) covScore += 10;

      // Playmakers / Controllers are optional (no warning if missing, but boost if present)
      if (covDetails.midfieldController) covScore += 5;
      if (covDetails.chanceCreator) covScore += 5;
    } else if (p === "wide-oriented direct play") {
      covScore = 20; // Medium base
      if (covDetails.defensiveShield) {
        covScore += 20;
      } else {
        warnings.push("Wide direct play style needs a defensive shield or anchor to secure possession transitions");
      }

      if (covDetails.boxThreat) {
        covScore += 25;
      } else {
        warnings.push("Wide direct play style needs an attacking target/runner in the box");
      }

      if (covDetails.widthL && covDetails.widthR) {
        covScore += 25;
      } else {
        warnings.push("Wide direct play requires active wide options on both flanks (Wingers, Full Backs, or Wing Backs)");
      }

      if (covDetails.midfieldController) covScore += 5;
      if (covDetails.chanceCreator) covScore += 5;
    } else {
      // Balanced / Pragmatic / Other (Original logic)
      if (covDetails.midfieldController) {
        covScore += 20;
      } else {
        warnings.push("Lack of midfield controller to maintain possession and tempo");
      }

      if (covDetails.defensiveShield) {
        covScore += 20;
        positives.push("Midfield defensive shield is properly established");
      } else {
        warnings.push("No dedicated defensive shield/anchor in midfield");
      }

      if (covDetails.widthL) covScore += 10;
      if (covDetails.widthR) covScore += 10;
      if (!covDetails.widthL || !covDetails.widthR) {
        warnings.push("Flank penetration width is unbalanced or missing");
      }

      if (covDetails.boxThreat) {
        covScore += 20;
        positives.push("Excellent box threat/attacking runner options");
      } else {
        warnings.push("No direct attacking runner/box threat targeting the box");
      }

      if (covDetails.chanceCreator) {
        covScore += 20;
        positives.push("Dedicated chance creator / playmaker role present");
      } else {
        warnings.push("No standard creative outlet/playmaker present");
      }
    }

    covScore = Math.max(0, Math.min(100, covScore));

    // ────────────────────────────────────────────────────────
    // 4. ZONE COLLISION SCORE (Layer 3) - 15% of Total
    // ────────────────────────────────────────────────────────
    var zoneScore = 100;
    var zoneViolations = [];
    var zoneDetails = {};
    if (typeof global.detectZoneCollisions === "function") {
      var zoneResult = global.detectZoneCollisions(slots, tactic.instructions || {});
      zoneScore = Math.round(zoneResult.score * 100);
      zoneViolations = zoneResult.violations;
      zoneDetails = zoneResult.phaseResults;
      zoneViolations.forEach(function(v) {
        warnings.push("[" + v.severity + "] " + v.id + ": " + v.description);
      });
    }

    // ────────────────────────────────────────────────────────
    // 4b. STRUCTURAL VIOLATIONS (Layer 2) - captured for Layer 5
    // ────────────────────────────────────────────────────────
    var structuralViolations = [];
    if (typeof global.runStructuralValidators === "function") {
      var structResult = global.runStructuralValidators(slots, tactic.instructions || {});
      structuralViolations = structResult.violations || [];
      structuralViolations.forEach(function(v) {
        warnings.push("[" + v.severity + "] " + v.id + ": " + v.description);
      });
    }

    // ────────────────────────────────────────────────────────
    // 5. ARCHETYPE COMPLIANCE SCORE (Layer 4) - 5% of Total
    // ────────────────────────────────────────────────────────
    var archetypeScore = 100;
    var archetypeViolations = [];
    if (archetype && typeof global.scoreArchetypeCompliance === "function") {
      var archResult = global.scoreArchetypeCompliance(slots, tactic.instructions || {}, archetype);
      archetypeScore = archResult.score;
      archetypeViolations = archResult.violations;
      archetypeViolations.forEach(function(v) {
        warnings.push("[" + v.severity + "] " + v.id + ": " + v.description);
      });
    }

    // ────────────────────────────────────────────────────────
    // 6. OVERALL SCORE CALCULATION
    // ────────────────────────────────────────────────────────
    // Dynamic weights based on philosophy
    var compWeight = 0.25;
    var balWeight = 0.20;
    var covWeight = 0.20;
    var pairingWeight = 0.15;
    var zoneWeight = 0.15;
    var archetypeWeight = 0.05;

    if (p === "possession-oriented tactician" || p === "positional play specialist") {
      compWeight = 0.20;
      balWeight = 0.20;
      covWeight = 0.25;
      pairingWeight = 0.15;
      zoneWeight = 0.15;
      archetypeWeight = 0.05;
    } else if (p === "aggressive high-press tactician") {
      compWeight = 0.20;
      balWeight = 0.20;
      covWeight = 0.20;
      pairingWeight = 0.15;
      zoneWeight = 0.15;
      archetypeWeight = 0.10;
    } else if (p === "disciplined defensive organiser") {
      compWeight = 0.25;
      balWeight = 0.30;
      covWeight = 0.10;
      pairingWeight = 0.15;
      zoneWeight = 0.15;
      archetypeWeight = 0.05;
    } else if (p === "direct counter-attacker" || p === "wide-oriented direct play") {
      compWeight = 0.25;
      balWeight = 0.25;
      covWeight = 0.15;
      pairingWeight = 0.15;
      zoneWeight = 0.15;
      archetypeWeight = 0.05;
    }

    var overallScore = Math.round(
      compWeight * compScore +
      balWeight * balScore +
      covWeight * covScore +
      pairingWeight * pairingScore +
      zoneWeight * zoneScore +
      archetypeWeight * archetypeScore
    );

    return {
      overallScore: overallScore,
      categories: {
        compatibility: compScore,
        balance: balScore,
        coverage: covScore,
        pairing: pairingScore,
        zones: zoneScore,
        archetype: archetypeScore
      },
      breakdown: {
        compatibilityRules: compRules,
        duties: duties,
        restDefence: rdCount,
        coverageMatches: covDetails,
        structuralViolations: structuralViolations,
        pairingViolations: pairingViolations,
        zoneViolations: zoneViolations,
        zoneDetails: zoneDetails,
        archetypeViolations: archetypeViolations
      },
      warnings: warnings,
      positives: positives,
      pairingReject: false
    };
  }

  // Export module globally
  global.evaluateTacticFeasibility = evaluateTacticFeasibility;

})(typeof window !== "undefined" ? window : global);
