(function (global) {
  "use strict";

  function getRole(roleId) {
    if (typeof getRoleById === "function") return getRoleById(roleId);
    if (global.FM24_ROLES) {
      for (var i = 0; i < global.FM24_ROLES.length; i++)
        if (global.FM24_ROLES[i].id === roleId) return global.FM24_ROLES[i];
    }
    return null;
  }

  function getRoleName(roleId) {
    var role = getRole(roleId);
    return role ? role.name : roleId;
  }

  // ─── PAIR EXTRACTION ───

  function extractAllPairs(slots) {
    var pairs = [];
    if (!slots) return pairs;
    var slotDefs = global.GLOBAL_PITCH_SLOTS || {};
    var slotIds = Object.keys(slots).filter(function(s) { return slots[s] && slots[s].roleId; });
    var roleMap = {};
    for (var si = 0; si < slotIds.length; si++) roleMap[slotIds[si]] = slots[slotIds[si]].roleId;
    var byStrata = {};
    for (var si2 = 0; si2 < slotIds.length; si2++) {
      var sid = slotIds[si2];
      var def = slotDefs[sid];
      if (!def) continue;
      if (!byStrata[def.strata]) byStrata[def.strata] = [];
      byStrata[def.strata].push(sid);
    }

    function addPair(sa, sb, type) {
      if (!roleMap[sa] || !roleMap[sb]) return;
      if (roleMap[sa] === roleMap[sb]) return;
      pairs.push({ roleA: roleMap[sa], roleB: roleMap[sb], slotA: sa, slotB: sb, pairType: type });
    }

    // Spine chain: GK -> DC -> DM -> CM -> AMC -> ST
    var spineStrata = ["GK", "DC", "DM", "CM", "AMC", "ST"];
    for (var s = 0; s < spineStrata.length - 1; s++) {
      var lower = byStrata[spineStrata[s]] || [];
      var upper = byStrata[spineStrata[s + 1]] || [];
      for (var li = 0; li < lower.length; li++) {
        for (var ui = 0; ui < upper.length; ui++) {
          var lDef = slotDefs[lower[li]], uDef = slotDefs[upper[ui]];
          if (!lDef || !uDef) continue;
          if (lDef.flank === uDef.flank || lDef.flank === "C" || uDef.flank === "C") {
            addPair(lower[li], upper[ui], "spine");
          }
        }
      }
    }

    // CB internal pairings
    var dcSlots = byStrata["DC"] || [];
    for (var di = 0; di < dcSlots.length; di++)
      for (var dj = di + 1; dj < dcSlots.length; dj++)
        addPair(dcSlots[di], dcSlots[dj], "cb_pair");

    // GK-DC
    var gkSlots = byStrata["GK"] || [];
    for (var gi = 0; gi < gkSlots.length; gi++)
      for (var dk = 0; dk < dcSlots.length; dk++)
        addPair(gkSlots[gi], dcSlots[dk], "gk_dc");

    // Flank chain per side — pair adjacent strata
    var sides = ["L", "R"];
    var chain = ["DC","WD","WB","DM","CM","WM","WA","AMC","ST"];
    for (var si3 = 0; si3 < sides.length; si3++) {
      var side = sides[si3];
      for (var ci = 0; ci < chain.length - 1; ci++) {
        var s1 = chain[ci], s2 = chain[ci + 1];
        var s1Slots = byStrata[s1] || [], s2Slots = byStrata[s2] || [];
        for (var i = 0; i < s1Slots.length; i++) {
          var d1 = slotDefs[s1Slots[i]];
          if (!d1 || d1.flank !== side) continue;
          for (var j = 0; j < s2Slots.length; j++) {
            var d2 = slotDefs[s2Slots[j]];
            if (!d2 || d2.flank !== side) continue;
            var pt = s1 + "_" + s2;
            if (s1 === "DC" && (s2 === "WD" || s2 === "WB")) pt = "cb_fb";
            else if (s1 === "DM" && s2 === "WD") pt = "dm_fb";
            else if (s1 === "CM" && s2 === "WA") pt = "cm_wa";
            else if (s1 === "CM" && s2 === "AMC") pt = "cm_am";
            else if (s1 === "WA" && s2 === "CM") pt = "wa_cm";
            else if (s1 === "WA" && s2 === "WD") pt = "fb_wa";
            addPair(s1Slots[i], s2Slots[j], pt);
          }
        }
      }
    }

    // Also pair CM ↔ WA directly (skip WM when no wide midfielder exists in formation)
    for (var si5 = 0; si5 < sides.length; si5++) {
      var s = sides[si5];
      var cmOnSide = (byStrata["CM"] || []).filter(function(sid) { return slotDefs[sid] && slotDefs[sid].flank === s; });
      var waOnSide = (byStrata["WA"] || []).filter(function(sid) { return slotDefs[sid] && slotDefs[sid].flank === s; });
      for (var ci5 = 0; ci5 < cmOnSide.length; ci5++) {
        for (var cj5 = 0; cj5 < waOnSide.length; cj5++) {
          addPair(cmOnSide[ci5], waOnSide[cj5], "cm_wa");
        }
      }
    }

    // Direct WD ↔ WA and WB ↔ WA on same side (fb_wa)
    for (var si6 = 0; si6 < sides.length; si6++) {
      var s2 = sides[si6];
      var fbSlots = (byStrata["WD"] || []).concat(byStrata["WB"] || []).filter(function(sid) { return slotDefs[sid] && slotDefs[sid].flank === s2; });
      var waSlots = (byStrata["WA"] || []).filter(function(sid) { return slotDefs[sid] && slotDefs[sid].flank === s2; });
      for (var fi = 0; fi < fbSlots.length; fi++) {
        for (var wj = 0; wj < waSlots.length; wj++) {
          addPair(fbSlots[fi], waSlots[wj], "fb_wa");
        }
      }
    }

    // Midfield internal pairings (DM-CM)
    var dmSlots = byStrata["DM"] || [];
    var cmSlots = byStrata["CM"] || [];
    for (var di2 = 0; di2 < dmSlots.length; di2++) {
      for (var dk2 = di2 + 1; dk2 < dmSlots.length; dk2++) addPair(dmSlots[di2], dmSlots[dk2], "mid_pair");
      for (var ci2 = 0; ci2 < cmSlots.length; ci2++) addPair(dmSlots[di2], cmSlots[ci2], "mid_pair");
    }
    for (var ci3 = 0; ci3 < cmSlots.length; ci3++)
      for (var ci4 = ci3 + 1; ci4 < cmSlots.length; ci4++)
        addPair(cmSlots[ci3], cmSlots[ci4], "mid_pair");

    // Double AM
    var amSlots = byStrata["AMC"] || [];
    for (var ai = 0; ai < amSlots.length; ai++)
      for (var aj = ai + 1; aj < amSlots.length; aj++)
        addPair(amSlots[ai], amSlots[aj], "double_am");

    // ST pairings
    var stSlots = byStrata["ST"] || [];
    for (var si4 = 0; si4 < stSlots.length; si4++)
      for (var sj = si4 + 1; sj < stSlots.length; sj++)
        addPair(stSlots[si4], stSlots[sj], "st_pair");

    return pairs;
  }

  // ─── MAIN EVALUATION ───

  function evaluatePairings(slots, instructions, archetype) {
    if (!slots) {
      return {
        pairingScore: 0,
        violations: [{ id:"ENGINE_ERR", severity:"CRITICAL", description:"No tactic slots provided.", suggestion:"Build a valid tactic first." }],
        criticalReject: true,
        rawScore: 0, pairResults: [], pairCount: 0
      };
    }

    var matrix = global.PAIRING_MATRIX;
    if (!matrix && typeof global.buildPairingMatrix === "function") {
      matrix = global.buildPairingMatrix();
      global.PAIRING_MATRIX = matrix;
    }

    var NP_RULES = global.NP_RULES || [];
    var NP_INSTRUCTION_PAIRS = global.NP_INSTRUCTION_PAIRS || [];
    var SEVERITY_WEIGHTS = global.SEVERITY_WEIGHTS || { GOOD:1, WARNING:-3, BAD:-8, CRITICAL:-20 };
    var lookupPairScore = global.lookupPairScore || function() { return { score: 0, severity: null, archetypes: [] }; };
    var lookupNPRules = global.lookupNPRules || function() { return []; };

    var violations = [];
    var pairResults = [];
    var dLine = (instructions && instructions.defensiveLine) || "Standard";

    var pairs = extractAllPairs(slots);

    for (var pi = 0; pi < pairs.length; pi++) {
      var p = pairs[pi];
      var result = lookupPairScore(matrix, p.roleA, p.roleB);

      // Check NP-specific rules
      var npMatches = lookupNPRules(p.roleA, p.roleB);
      for (var npi = 0; npi < npMatches.length; npi++) {
        var npRule = npMatches[npi];
        var npScoreVal = SEVERITY_WEIGHTS[npRule.validity] || 0;
        if (npScoreVal < (result.score || 0) || (npRule.validity === "CRITICAL" && result.severity !== "CRITICAL")) {
          result = {
            score: npScoreVal,
            archetypes: npRule.archetype_fit || [],
            npId: npRule.id,
            severity: npRule.validity,
            explanation: npRule.explanation
          };
        }
      }

      pairResults.push({
        roleA: p.roleA, roleB: p.roleB,
        slotA: p.slotA, slotB: p.slotB,
        pairType: p.pairType,
        score: result.score || 0,
        severity: result.severity || null,
        npId: result.npId || null,
        explanation: result.explanation || null,
        archetypes: result.archetypes || []
      });

      if (result.severity && result.severity !== "GOOD" && (result.score === undefined || result.score < 0)) {
        violations.push({
          id: result.npId || ("PAIR_" + p.pairType + "_" + p.roleA + "_" + p.roleB),
          severity: result.severity,
          description: result.explanation || (getRoleName(p.roleA) + " + " + getRoleName(p.roleB) + " pairing issue (" + p.pairType + ")."),
          suggestion: result.severity === "CRITICAL" || result.severity === "BAD"
            ? "Swap " + getRoleName(p.roleA) + " or " + getRoleName(p.roleB) + " for a compatible alternative."
            : "Consider adjusting " + getRoleName(p.roleA) + " or " + getRoleName(p.roleB) + " duty to improve compatibility.",
          roleA: p.roleA, roleB: p.roleB, slotA: p.slotA, slotB: p.slotB
        });
      }
    }

    // NP-21 to NP-25: striker + defensive line instructions
    if (instructions && NP_INSTRUCTION_PAIRS.length > 0) {
      var isDeepDL = (dLine === "Lower" || dLine === "Much Lower");
      var isHighDL = (dLine === "Higher" || dLine === "Much Higher");
      var stRoleIds = [], stSlots = [];
      var allSlotIds = Object.keys(slots);
      for (var si = 0; si < allSlotIds.length; si++) {
        var def = global.GLOBAL_PITCH_SLOTS ? global.GLOBAL_PITCH_SLOTS[allSlotIds[si]] : null;
        if (def && def.strata === "ST" && slots[allSlotIds[si]] && slots[allSlotIds[si]].roleId) {
          stRoleIds.push(slots[allSlotIds[si]].roleId);
          stSlots.push(allSlotIds[si]);
        }
      }
      for (var ni = 0; ni < NP_INSTRUCTION_PAIRS.length; ni++) {
        var npr = NP_INSTRUCTION_PAIRS[ni];
        for (var si2 = 0; si2 < stRoleIds.length; si2++) {
          if (stRoleIds[si2] !== npr.role) continue;
          if ((npr.checkLowDL && isDeepDL) || (npr.checkHighDL && isHighDL) || (npr.checkDeepBlock && isDeepDL) || (npr.checkHighLine && isHighDL)) {
            var npRule2 = null;
            for (var rui = 0; rui < NP_RULES.length; rui++) {
              if (NP_RULES[rui].id === npr.rule) { npRule2 = NP_RULES[rui]; break; }
            }
            if (npRule2) {
              violations.push({
                id: npRule2.id,
                severity: npRule2.validity,
                description: npRule2.explanation,
                suggestion: "Adjust defensive line or change striker role.",
                roleA: npr.role,
                roleB: "DL_" + (isDeepDL ? "DEEP" : "HIGH"),
                slotA: stSlots[si2],
                slotB: "defensive_line"
              });
            }
          }
        }
      }
    }

    // Deduplicate violations: same NP rule for same role pair should appear once
    var seen = {};
    violations = violations.filter(function(v) {
      var key = v.id + "_" + (v.roleA || "") + "_" + (v.roleB || "");
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });

    // Check for critical rejection
    var criticalReject = false;
    for (var vi = 0; vi < violations.length; vi++) {
      if (violations[vi].severity === "CRITICAL") { criticalReject = true; break; }
    }

    // Calculate pairing score (normalised 0.0-1.0)
    var totalScore = 0;
    var pairCount = pairResults.length;
    var scoreCap = Math.max(1, pairCount) * 10;
    for (var pri = 0; pri < pairResults.length; pri++) {
      totalScore += Math.max(-20, Math.min(10, pairResults[pri].score));
    }
    var rawScore = totalScore;
    var adjusted = totalScore;
    var maxAdjusted = scoreCap;
    var pairingScore = maxAdjusted > 0 ? Math.max(0, Math.min(1, 0.7 + adjusted / maxAdjusted * 0.3)) : 0;

    return {
      pairingScore: pairingScore,
      violations: violations,
      criticalReject: criticalReject,
      rawScore: rawScore,
      pairResults: pairResults,
      pairCount: pairCount
    };
  }

  global.evaluatePairings = evaluatePairings;
  global.extractAllPairsForDebug = extractAllPairs;

})(typeof window !== "undefined" ? window : global);
