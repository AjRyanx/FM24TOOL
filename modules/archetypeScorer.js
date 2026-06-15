(function (global) {
  "use strict";

  var PASSING_SCALE = [
    "Extremely Short", "Much Shorter", "Shorter", "Mixed",
    "More Direct", "Much More Direct", "Extremely Direct"
  ];

  // ════════════════════════════════════════════════════════════════
  // ARCHETYPE COMPLIANCE SCORER (Layer 4)
  // ════════════════════════════════════════════════════════════════

  function scoreArchetypeCompliance(slots, instructions, archetype) {
    var violations = [];

    if (archetype === "pragmatic system-adapter") {
      return { score: 100, violations: violations };
    }
    if (archetype === "balanced tactician") {
      var balScore = computeBalancedScore(slots, instructions);
      return { score: balScore, violations: violations };
    }

    var phiProfiles = global.PHILOSOPHY_PROFILES || {};
    var profile = phiProfiles[archetype];
    if (!profile) return { score: 50, violations: violations };

    var raw = 1.0;
    var penaltyDetails = [];

    // ─── Step 1: Boosted roles ───
    var boostedCount = 0;
    Object.keys(slots).forEach(function(sid) {
      if (!slots[sid] || !slots[sid].roleId) return;
      var rid = slots[sid].roleId;
      if (profile.roleBoost && profile.roleBoost[rid]) {
        boostedCount++;
      }
    });
    if (boostedCount < 2) {
      penaltyDetails.push({ id: "L4_MIN_BOOST", severity: "WARNING",
        description: "Fewer than 2 archetype-boosted roles in the lineup." });
    }

    // ─── Step 2: Suppressed roles ───
    var suppressedFound = [];
    Object.keys(slots).forEach(function(sid) {
      if (!slots[sid] || !slots[sid].roleId) return;
      var rid = slots[sid].roleId;
      if (profile.roleSuppression && profile.roleSuppression[rid]) {
        suppressedFound.push(rid);
      }
    });
    suppressedFound.forEach(function(rid) {
      penaltyDetails.push({ id: "L4_SUPPRESSED", severity: "SUGGESTION",
        description: rid + " is suppressed for " + archetype + "." });
    });

    // ─── Step 3: Instruction vetoes ───
    if (instructions && profile.instructionVetoes) {
      profile.instructionVetoes.forEach(function(vetoKey) {
        if (instructions[vetoKey] !== undefined && instructions[vetoKey] !== false && instructions[vetoKey] !== "Standard") {
          penaltyDetails.push({ id: "L4_VETO", severity: "WARNING",
            description: "Instruction '" + vetoKey + "' is vetoed by " + archetype + "." });
        }
      });
    }

    // ─── Step 4: Archetype-specific structural checks ───
    if (archetype === "possession-oriented tactician") {
      if (instructions && instructions.passingDirectness) {
        var pdIdx = PASSING_SCALE.indexOf(instructions.passingDirectness);
        if (pdIdx > 2) {
          penaltyDetails.push({ id: "L4_POSSESSION_DIRECT", severity: "WARNING",
            description: "Passing directness '" + instructions.passingDirectness + "' exceeds 'Shorter' — possession archetype prefers shorter passing." });
        }
      }
      if (typeof countPlaymakers === "function" && countPlaymakers(slots) < 2) {
        penaltyDetails.push({ id: "L4_POSSESSION_PLAYMAKERS", severity: "WARNING",
          description: "Fewer than 2 playmakers — possession archetype needs multiple distributors." });
      }

    } else if (archetype === "aggressive high-press tactician") {
      if (instructions && instructions.triggerPress) {
        var urgentLevels = ["Much More Often", "More Often", "Standard", "Less Often", "Much Less Often"];
        var tpIdx = urgentLevels.indexOf(instructions.triggerPress);
        if (tpIdx > 0) {
          penaltyDetails.push({ id: "L4_PRESS_INTENSITY", severity: "WARNING",
            description: "Trigger press '" + instructions.triggerPress + "' is not maximum — high-press archetype needs 'Much More Often'." });
        }
      }
      if (instructions && instructions.lineOfEngagement && instructions.lineOfEngagement !== "High") {
        penaltyDetails.push({ id: "L4_PRESS_LOE", severity: "WARNING",
          description: "Line of engagement '" + instructions.lineOfEngagement + "' — high-press archetype needs 'High'." });
      }

    } else if (archetype === "disciplined defensive organiser") {
      var dlScale = ["Much Higher", "Higher", "Standard", "Lower", "Much Lower"];
      var loeScale = ["High", "Mid block", "Low", "Very Low"];
      if (instructions && instructions.defensiveLine) {
        var dlIdx = dlScale.indexOf(instructions.defensiveLine);
        if (dlIdx >= 0 && dlIdx < 3) {
          penaltyDetails.push({ id: "L4_DEFENSIVE_LINE", severity: "WARNING",
            description: "Defensive line '" + instructions.defensiveLine + "' is too high — defensive organiser prefers 'Lower' or deeper." });
        }
      }
      if (instructions && instructions.lineOfEngagement) {
        var loeIdx = loeScale.indexOf(instructions.lineOfEngagement);
        if (loeIdx >= 0 && loeIdx < 1) {
          penaltyDetails.push({ id: "L4_LOE", severity: "WARNING",
            description: "Line of engagement '" + instructions.lineOfEngagement + "' is too high — defensive organiser prefers 'Mid block' or deeper." });
        }
      }
      // Count physical/defensive roles (CD, DM, Anchor, BWM, etc.)
      var physCount = 0;
      Object.keys(slots).forEach(function(sid) {
        if (!slots[sid] || !slots[sid].roleId) return;
        var rid = slots[sid].roleId;
        if (rid.indexOf("CD_") === 0 || rid.indexOf("BWM") === 0 || rid.indexOf("Anchor") === 0 ||
            rid.indexOf("DM_D") === 0 || rid.indexOf("NFB") === 0 || rid.indexOf("TF_") === 0 ||
            rid.indexOf("PF_D") === 0 || rid.indexOf("NCB") === 0) physCount++;
      });
      if (physCount < 2) {
        penaltyDetails.push({ id: "L4_DEFENSIVE_PHYSICAL", severity: "WARNING",
          description: "Only " + physCount + " physical/defensive roles — defensive organiser needs at least 2." });
      }

    } else if (archetype === "direct counter-attacker") {
      if (typeof countDirectRunners === "function") {
        var runners = countDirectRunners(slots);
        if (runners < 2) {
          penaltyDetails.push({ id: "L4_COUNTER_RUNNERS", severity: "WARNING",
            description: "Only " + runners + " direct runners — counter archetype needs at least 2." });
        }
      }
      if (typeof countPlaymakers === "function") {
        var pms = countPlaymakers(slots);
        if (pms > 2) {
          penaltyDetails.push({ id: "L4_COUNTER_PLAYMAKERS", severity: "WARNING",
            description: pms + " playmakers — counter archetype works best with at most 2." });
        }
      }
    } else if (archetype === "positional play specialist") {
      if (instructions && instructions.passingDirectness) {
        var pdIdx = PASSING_SCALE.indexOf(instructions.passingDirectness);
        if (pdIdx > 1) {
          penaltyDetails.push({ id: "L4_POS_SPECIALIST_DIRECT", severity: "WARNING",
            description: "Passing directness '" + instructions.passingDirectness + "' exceeds 'Much Shorter' — positional play specialist requires extremely/much shorter passing." });
        }
      }
      if (instructions && instructions.defensiveLine && instructions.defensiveLine !== "Higher" && instructions.defensiveLine !== "Much Higher") {
        penaltyDetails.push({ id: "L4_POS_SPECIALIST_DLINE", severity: "WARNING",
          description: "Defensive line '" + instructions.defensiveLine + "' is not high enough — positional play specialist requires 'Higher' or 'Much Higher'." });
      }
      if (typeof countPlaymakers === "function" && countPlaymakers(slots) < 2) {
        penaltyDetails.push({ id: "L4_POS_SPECIALIST_PLAYMAKERS", severity: "WARNING",
          description: "Fewer than 2 playmakers — positional play specialist requires at least 2 playmakers for fluid build-up." });
      }
    } else if (archetype === "wide-oriented direct play") {
      if (typeof countDirectRunners === "function") {
        var runners = countDirectRunners(slots);
        if (runners < 1) {
          penaltyDetails.push({ id: "L4_WIDE_DIRECT_RUNNERS", severity: "WARNING",
            description: "No direct runners found — wide-oriented direct play requires at least 1 direct runner." });
        }
      }
      if (instructions && instructions.passingDirectness) {
        var pdIdx = PASSING_SCALE.indexOf(instructions.passingDirectness);
        if (pdIdx < 4) { // 4 is "More Direct"
          penaltyDetails.push({ id: "L4_WIDE_DIRECT_PASSING", severity: "WARNING",
            description: "Passing directness '" + instructions.passingDirectness + "' is too short — wide direct play requires 'More Direct' or longer." });
        }
      }
      var wideRoleCount = 0;
      Object.keys(slots).forEach(function(sid) {
        if (!slots[sid] || !slots[sid].roleId) return;
        var rid = slots[sid].roleId;
        if (rid.indexOf("Winger_") === 0 || rid.indexOf("WTM_") === 0 || rid.indexOf("FB_") === 0 || rid.indexOf("WB_") === 0 || rid.indexOf("CWB_") === 0) {
          wideRoleCount++;
        }
      });
      if (wideRoleCount < 2) {
        penaltyDetails.push({ id: "L4_WIDE_DIRECT_OUTLETS", severity: "WARNING",
          description: "Only " + wideRoleCount + " wide outlets — wide direct play needs at least 2 wide options (Wingers, Full Backs, Wing Backs, or Wide Target Men)." });
      }
    }

    // ─── Convert penalties to score ───
    var totalDeduction = 0;
    penaltyDetails.forEach(function(p) {
      if (p.severity === "CRITICAL") totalDeduction += 20;
      else if (p.severity === "WARNING") totalDeduction += 10;
      else totalDeduction += 3;
    });
    // Apply boosted/suppressed raw adjustments
    if (boostedCount >= 2) raw += 0.08 * Math.min(boostedCount, 3);
    if (suppressedFound.length > 0) raw -= 0.05 * suppressedFound.length;

    var archetypeScore = Math.round(Math.max(0, Math.min(100, raw * 100 - totalDeduction)));

    penaltyDetails.forEach(function(v) { violations.push(v); });

    return { score: archetypeScore, violations: violations };
  }

  function computeBalancedScore(slots, instructions) {
    // Balanced archetype — mild preference for variety, no hard rules
    var score = 85;
    var variety = {};
    Object.keys(slots).forEach(function(sid) {
      if (!slots[sid] || !slots[sid].roleId) return;
      var abbr = (global.getRoleById ? global.getRoleById(slots[sid].roleId) : null);
      if (abbr) variety[abbr.abbreviation] = (variety[abbr.abbreviation] || 0) + 1;
    });
    // Penalise role duplication
    Object.keys(variety).forEach(function(abbr) {
      if (variety[abbr] > 2) score -= 10;
    });
    return Math.max(0, score);
  }

  // ─── EXPORT ───

  global.scoreArchetypeCompliance = scoreArchetypeCompliance;

})(typeof window !== "undefined" ? window : global);
