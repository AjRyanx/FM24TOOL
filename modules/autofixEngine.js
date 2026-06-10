(function (global) {
  "use strict";

  var profiles = global.ROLE_PROFILES || {};
  var slotDefs = global.GLOBAL_PITCH_SLOTS || {};

  function getProfile(r) { return profiles[r] || null; }
  function getRole(r) {
    if (typeof getRoleById === "function") return getRoleById(r);
    if (global.FM24_ROLES) {
      for (var i = 0; i < global.FM24_ROLES.length; i++)
        if (global.FM24_ROLES[i].id === r) return global.FM24_ROLES[i];
    }
    return null;
  }

  function pickWaReplacement(duty, preferWide) {
    var isAttack = duty === "Attack" || duty === "A" || duty === "Att";
    if (preferWide) {
      return isAttack ? "Winger_A" : "Winger_S";
    }
    return isAttack ? "IF_A" : "IF_S";
  }

  function isWaInsideRole(roleId) {
    if (!roleId) return false;
    return roleId.indexOf("IF_") === 0 || roleId.indexOf("IW_") === 0;
  }

  // ─── FIX STRATEGIES ───

  var FIX_TABLE = {
    // Layer 2: Structural
    "S2B_REST_DEFENCE_CRITICAL": fixRestDefence,
    "S2B_REST_DEFENCE_LOW": fixRestDefence,
    "S2C_BROKEN_PRESS": fixBrokenPress,
    "S2C_PRESS_GAP": fixPressGap,
    "S2D_IWB_NO_COVER": fixIWB,
    "S2D_IWB_NO_WIDTH": fixIWB,
    "S2E_NO_WIDTH": fixWidth,
    "S2E_TUNNEL_VISION": fixWidth,
    "S2B_OVERLY_CAUTIOUS": fixOverlyCautious,
    "S2B_CENTRAL_CORRIDOR": fixCentralCorridor,
    "S2D_LIBERO_NO_COVER": fixLiberoCover,
    "S2D_LIBERO_IWB_CONFLICT": fixLiberoIWB,
    "S2D_LIBERO_IN_BACK_4": fixLiberoBack4,
    "S2D_WCB_IN_BACK_4": fixWcbBack4,
    "S2E_LEFT_OVERCOMMIT": fixFlankOvercommit,
    "S2E_RIGHT_OVERCOMMIT": fixFlankOvercommit,
    "S2A_SPINE_MISMATCH": fixSpineMismatch,
    "S2C_EXPOSED_TRANSITION": fixExposedTransition,
    // Layer 3: Zone Collisions
    "Z3A_OVERLOAD": fixZoneOverload,
    "Z3B_HALF_STACK": fixHalfStack,
    "Z3C_WIDTH_VOID": fixWidthVoid,
    "Z3D_UNSTRUCTURED_ROAM": fixUnstructuredRoam,
    "Z3E_ZONE14_STATIC": fixZone14Static,
    // Layer 4: Archetype Compliance (slot-level)
    "L4_MIN_BOOST": fixArchetypeBoost,
    "L4_COUNTER_RUNNERS": fixArchetypeRunner,
    "L4_SUPPRESSED": fixArchetypeSuppressed,
    "L4_VETO": fixArchetypeVeto,
    "L4_POSSESSION_DIRECT": fixArchetypeDirectness,
    "L4_POSSESSION_PLAYMAKERS": fixArchetypePlaymakers,
    "L4_PRESS_INTENSITY": fixArchetypePressIntensity,
    "L4_PRESS_LOE": fixArchetypePressLOE,
    "L4_DEFENSIVE_LINE": fixArchetypeDefLine,
    "L4_LOE": fixArchetypeLOEDef,
    "L4_DEFENSIVE_PHYSICAL": fixArchetypePhysical,
    "L4_COUNTER_PLAYMAKERS": fixArchetypeReducePlaymakers,
    // Additional Layer 2 fixes
    "S2A_LINE_HEIGHT": fixLineHeight,
    "S2C_UNREACHABLE_TRIGGERS": fixUnreachableTriggers,
    "S2C_HIGH_FATIGUE": fixHighFatigue,
    "S2D_HB_NO_WB_ATTACK": fixHbNoWbAttack,
    "S2D_DOUBLE_IWB": fixDoubleIWB,
    "S2D_HALF_SPACE_STACK": fixHalfSpaceStack,
    "S2A_TEMPO_MISMATCH": fixSpineMismatch,
    // Layer 1: Pairing violation fixes
    "NP-01": fixPairingViolation, "NP-02": fixPairingViolation,
    "NP-03": fixPairingViolation, "NP-04": fixPairingViolation,
    "NP-05": fixPairingViolation, "NP-06": fixPairingViolation,
    "NP-07": fixPairingViolation, "NP-08": fixPairingViolation,
    "NP-09": fixPairingViolation, "NP-10": fixPairingViolation,
    "NP-11": fixPairingViolation, "NP-12": fixPairingViolation,
    "NP-13": fixPairingViolation, "NP-14": fixPairingViolation,
    "NP-15": fixPairingViolation, "NP-16": fixPairingViolation,
    "NP-17": fixPairingViolation, "NP-18": fixPairingViolation,
    "NP-19": fixPairingViolation, "NP-20": fixPairingViolation,
    "NP-21": fixStrikerDefensiveLine, "NP-22": fixStrikerDefensiveLine,
    "NP-23": fixStrikerDefensiveLine, "NP-24": fixStrikerDefensiveLine,
    "NP-25": fixStrikerDefensiveLine, "NP-26": fixPairingViolation,
    "NP-27": fixPairingViolation, "NP-28": fixPairingViolation,
    "NP-29": fixPairingViolation, "NP-30": fixPairingViolation
  };

  // ─── CORE AUTOFIX (Multi-Layer) ───

  function autofixTactic(slots, instructions, maxIterations, archetype) {
    if (maxIterations === undefined) maxIterations = 8;
    var allFixes = [];
    // Track slot role history to prevent ping-pong loops
    var slotHistory = {}; // slotId → Set of roleIds previously assigned

    for (var iter = 0; iter < maxIterations; iter++) {
      var allViolations = [];

      if (typeof global.runStructuralValidators === "function") {
        var sResult = global.runStructuralValidators(slots, instructions);
        sResult.violations.forEach(function(v) { allViolations.push(v); });
      }

      if (typeof global.detectZoneCollisions === "function") {
        var zResult = global.detectZoneCollisions(slots, instructions);
        zResult.violations.forEach(function(v) { allViolations.push(v); });
      }

      if (archetype && typeof global.scoreArchetypeCompliance === "function") {
        var aResult = global.scoreArchetypeCompliance(slots, instructions, archetype);
        aResult.violations.forEach(function(v) { allViolations.push(v); });
      }

      // Layer 1: Pairing violations (only non-critical, since critical rejects halt pipeline)
      if (typeof global.evaluatePairings === "function") {
        var pResult = global.evaluatePairings(slots, instructions);
        if (pResult.violations) {
          pResult.violations.forEach(function(v) {
            if (v.severity !== "GOOD") allViolations.push(v);
          });
        }
      }

      if (allViolations.length === 0) break;

      var fixed = false;
      for (var vi = 0; vi < allViolations.length; vi++) {
        var vio = allViolations[vi];
        var handler = FIX_TABLE[vio.id];
        if (!handler) {
          // Prefix match: some violation IDs have dynamic suffixes (Z3A_OVERLOAD_Z1 etc.)
          var matchKey = null;
          Object.keys(FIX_TABLE).forEach(function(k) {
            if (vio.id.indexOf(k) === 0) matchKey = k;
          });
          if (matchKey) handler = FIX_TABLE[matchKey];
        }
        if (handler) {
          var fixResult = handler(slots, instructions, vio, archetype);
          if (fixResult && (fixResult.modified || fixResult.instructions)) {
            if (fixResult.modified) slots = fixResult.slots;
            if (fixResult.instructions) instructions = fixResult.instructions;
            // Detect and prevent ping-pong: snapshot slot roles after each fix
            // and abort if this fix returns to a previously seen state
            if (fixResult.modified) {
              var stateKey = "";
              Object.keys(slots).sort().forEach(function(sid) {
                stateKey += sid + ":" + (slots[sid] ? slots[sid].roleId : "") + "|";
              });
              if (slotHistory[stateKey]) {
                // Already visited this exact slot state — break to avoid infinite loop
                fixed = true;
                break;
              }
              slotHistory[stateKey] = true;
            }
            allFixes.push({ id: vio.id, layer: vio.id.charAt(1), applied: fixResult.description });
            fixed = true;
            break;
          }
        }
      }
      if (!fixed) break;
    }

    return { slots: slots, instructions: instructions, fixes: allFixes };
  }

  // ─── LAYER 2 FIX IMPLEMENTATIONS ───

  function fixRestDefence(slots, instructions, violation) {
    var candidates = [];
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || def.strata === "GK" || !slots[sid].roleId) return;
      var roleId = slots[sid].roleId;
      var prof = getProfile(roleId);
      if (!prof) return;
      var roamScore = (prof.special.roaming ? 2 : 0) + (prof.movement.roam || 0);
      if (roamScore > 0.5 && !prof.special.holder) {
        candidates.push({ sid: sid, roleId: roleId, score: roamScore, strata: def.strata });
      }
    });

    if (candidates.length === 0) return null;
    candidates.sort(function(a, b) { return b.score - a.score; });
    var target = candidates[0];

    var replacement = findHoldingReplacement(target.sid, target.roleId, target.strata);
    if (!replacement) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    var role = getRole(replacement);
    newSlots[target.sid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };

    return { modified: true, slots: newSlots, description: "Changed " + target.strata + " from " + target.roleId + " to " + replacement };
  }

  function fixBrokenPress(slots, instructions, violation) {
    var candidates = [];
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || !slots[sid].roleId) return;
      if (def.strata !== "CM" && def.strata !== "DM" && def.strata !== "WM") return;
      var roleId = slots[sid].roleId;
      var prof = getProfile(roleId);
      if (!prof) return;
      if (prof.defensive.press_intensity <= 0.6) {
        candidates.push({ sid: sid, roleId: roleId, strata: def.strata });
      }
    });

    if (candidates.length === 0) return null;
    var target = candidates[0];
    var replacement = null;
    if (target.strata === "CM") {
      replacement = target.roleId.indexOf("_D") !== -1 ? "BWM_CM_D" : "BBM_S";
    } else if (target.strata === "DM") {
      replacement = "BWM_D";
    } else if (target.strata === "WM") {
      replacement = target.roleId.indexOf("_S") !== -1 ? "DW_S" : "DW_D";
    }
    if (!replacement) return null;
    if (replacement === target.roleId) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    var role = getRole(replacement);
    newSlots[target.sid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Changed " + target.roleId + " to " + replacement + " to restore press chain" };
  }

  function fixPressGap(slots, instructions, violation) {
    return fixBrokenPress(slots, instructions, violation);
  }

  function fixIWB(slots, instructions, violation) {
    var iwbSlot = null;
    Object.keys(slots).forEach(function(sid) {
      var roleId = slots[sid] && slots[sid].roleId;
      if (roleId === "IWB_A" || roleId === "IWB_S") iwbSlot = sid;
    });
    if (!iwbSlot) return null;

    var def = slotDefs[iwbSlot];
    var replacement = "WB_S";

    var newSlots = JSON.parse(JSON.stringify(slots));
    var role = getRole(replacement);
    newSlots[iwbSlot] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Switched " + iwbSlot + " from IWB to " + replacement };
  }

  function fixWidth(slots, instructions, violation, archetype) {
    var phiProfiles = global.PHILOSOPHY_PROFILES || {};
    var profile = archetype ? phiProfiles[archetype] : null;

    var candidates = [];
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || !slots[sid].roleId) return;
      if (["WA", "WM", "WB", "WD"].indexOf(def.strata) === -1) return;
      var roleId = slots[sid].roleId;
      var prof = getProfile(roleId);
      if (!prof) return;
      if ((prof.movement.width_drift || 0) <= 0.7) {
        var isBoosted = profile && profile.roleBoost && profile.roleBoost[roleId];
        candidates.push({
          sid: sid,
          roleId: roleId,
          strata: def.strata,
          flank: def.flank,
          duty: slots[sid].duty,
          isBoosted: !!isBoosted
        });
      }
    });

    candidates.sort(function(a, b) {
      if (a.isBoosted !== b.isBoosted) {
        return a.isBoosted ? 1 : -1;
      }
      var order = { WD: 0, WB: 1, WM: 2, WA: 3 };
      var valA = order[a.strata] !== undefined ? order[a.strata] : 9;
      var valB = order[b.strata] !== undefined ? order[b.strata] : 9;
      return valA - valB;
    });

    if (candidates.length === 0) return null;
    var target = candidates[0];
    var replacement = null;
    var isAttack = (target.duty === "Attack");

    if (target.strata === "WA") {
      replacement = isAttack ? "Winger_A" : "Winger_S";
    } else if (target.strata === "WM") {
      replacement = isAttack ? "Winger_WM_A" : "Winger_WM_S";
    } else if (target.strata === "WB") {
      replacement = isAttack ? "WB_A" : "WB_S";
    } else if (target.strata === "WD") {
      replacement = isAttack ? "FB_A" : "WB_S";
    }

    if (!replacement || replacement === target.roleId) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    var role = getRole(replacement);
    newSlots[target.sid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Changed " + target.roleId + " to " + replacement + " for more width" };
  }

  function fixFlankOvercommit(slots, instructions, violation) {
    var side = violation.id.indexOf("LEFT") !== -1 ? "L" : "R";
    var candidates = [];
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || def.flank !== side || !slots[sid].roleId) return;
      var roleId = slots[sid].roleId;
      var prof = getProfile(roleId);
      if (prof && prof.movement.width_drift > 0.7) {
        candidates.push({ sid: sid, roleId: roleId, strata: def.strata, duty: slots[sid].duty });
      }
    });
    if (candidates.length === 0) return null;

    candidates.sort(function(a, b) {
      var order = { WA: 0, CM: 1, WM: 2, WB: 3, WD: 4 };
      var valA = order[a.strata] !== undefined ? order[a.strata] : 9;
      var valB = order[b.strata] !== undefined ? order[b.strata] : 9;
      return valA - valB;
    });

    var target = candidates[0];
    var replacement = null;
    var isAttack = (target.duty === "Attack" || target.duty === "A" || target.duty === "Att");

    if (target.strata === "WA") {
      replacement = isAttack ? "IF_A" : "IF_S";
    } else if (target.strata === "CM") {
      replacement = isAttack ? "CM_A" : "CM_S";
    } else if (target.strata === "WM") {
      replacement = isAttack ? "WP_A" : "WP_S";
    } else if (target.strata === "WB") {
      replacement = "IWB_S";
    } else if (target.strata === "WD") {
      replacement = isAttack ? "FB_S" : "FB_D";
    }

    if (!replacement || replacement === target.roleId) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    var role = getRole(replacement);
    newSlots[target.sid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Narrowed " + target.roleId + " to " + replacement + " on " + side + " flank" };
  }

  function fixSpineMismatch(slots, instructions, violation) {
    var spineOrder = ["GK", "DC", "DM", "CM", "ST"];
    var spineNodes = {};
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || !slots[sid].roleId) return;
      if (spineOrder.indexOf(def.strata) !== -1) {
        if (!spineNodes[def.strata]) spineNodes[def.strata] = [];
        spineNodes[def.strata].push({ sid: sid, roleId: slots[sid].roleId });
      }
    });

    var dmNodes = spineNodes["DM"] || [];
    var stNodes = spineNodes["ST"] || [];
    if (dmNodes.length > 0 && stNodes.length > 0) {
      var dmRole = dmNodes[0].roleId;
      var dmProf = getProfile(dmRole);
      if (dmProf && dmProf.build_up.short_pass_tendency > 0.7) {
        var newSlots = JSON.parse(JSON.stringify(slots));
        var replacement = "DLP_S";
        var role = getRole(replacement);
        newSlots[dmNodes[0].sid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
        return { modified: true, slots: newSlots, description: "Changed " + dmRole + " to " + replacement + " for spine alignment" };
      }
    }
    return null;
  }

  function fixExposedTransition(slots, instructions, violation) {
    var dmSlot = null;
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (def && def.strata === "DM" && slots[sid].roleId) dmSlot = sid;
    });
    if (!dmSlot) return null;
    var roleId = slots[dmSlot].roleId;
    var prof = getProfile(roleId);
    if (prof && prof.special.roaming) {
      var newSlots = JSON.parse(JSON.stringify(slots));
      var replacement = "DM_D";
      var role = getRole(replacement);
      newSlots[dmSlot] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
      return { modified: true, slots: newSlots, description: "Changed " + roleId + " to " + replacement + " to cover transitions" };
    }
    return null;
  }

  function fixOverlyCautious(slots, instructions, violation) {
    // Find a defend-duty FB or CM to free up to support
    var priority = ["WD", "WB", "CM"];
    var target = null;
    for (var p = 0; p < priority.length && !target; p++) {
      Object.keys(slots).forEach(function(sid) {
        if (target) return;
        var def = slotDefs[sid];
        if (!def || def.strata !== priority[p] || !slots[sid].roleId) return;
        if (slots[sid].duty !== "Defend") return;
        target = { sid: sid, roleId: slots[sid].roleId };
      });
    }
    if (!target) return null;
    var role = getRole(target.roleId);
    if (!role) return null;
    var newSlots = JSON.parse(JSON.stringify(slots));
    var altId = getRoleId(role.abbreviation, "Support", slotDefs[target.sid] ? slotDefs[target.sid].strata : "");
    if (!altId) return null;
    newSlots[target.sid] = { roleId: altId, duty: "Support", playerName: null };
    return { modified: true, slots: newSlots, description: "Changed " + target.roleId + " to support duty to free up attacking numbers" };
  }

  function fixCentralCorridor(slots, instructions, violation) {
    var dcCount = 0;
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (def && def.strata === "DC" && slots[sid].roleId) dcCount++;
    });
    if (dcCount < 3) {
      var dmSid = null, dmRole = null;
      Object.keys(slots).forEach(function(sid) {
        var def = slotDefs[sid];
        if (def && def.strata === "DM" && slots[sid].roleId) {
          dmSid = sid; dmRole = slots[sid].roleId;
        }
      });
      if (dmSid) {
        var isAcceptedScreen = (dmRole === "Anchor_D" || dmRole === "HB_D" || dmRole === "DM_D" || dmRole === "DLP_D");
        if (!isAcceptedScreen) {
          var newSlots = JSON.parse(JSON.stringify(slots));
          // If current DM is a playmaker variant (DLP, RPM, AP), convert to DLP-D to preserve playmaker role while screening
          var replacement = (dmRole.indexOf("DLP") !== -1 || dmRole.indexOf("RPM") !== -1 || dmRole.indexOf("AP") !== -1) ? "DLP_D" : "Anchor_D";
          var role = getRole(replacement);
          newSlots[dmSid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
          return { modified: true, slots: newSlots, description: "Changed " + dmRole + " to " + replacement + " to screen central corridor" };
        }
      } else {
        // Fallback: Convert a DC to Cover duty to protect central corridor
        var dcSid = null;
        var dcRole = null;
        Object.keys(slots).forEach(function(sid) {
          var def = slotDefs[sid];
          if (def && def.strata === "DC" && slots[sid].roleId) {
            dcSid = sid;
            dcRole = slots[sid].roleId;
          }
        });
        if (dcSid && dcRole) {
          var base = dcRole.substring(0, dcRole.lastIndexOf("_"));
          var replacement = null;
          if (base === "CD" || base === "BPD" || base === "NCB") {
            replacement = base + "_CO";
          } else {
            replacement = "CD_CO";
          }
          var newSlots = JSON.parse(JSON.stringify(slots));
          var role = getRole(replacement);
          newSlots[dcSid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
          return { modified: true, slots: newSlots, description: "Changed " + dcRole + " to " + replacement + " (Cover) to protect central corridor" };
        }
      }
    }
    return null;
  }

  function fixLiberoCover(slots, instructions, violation) {
    var liberoSid = null;
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || !slots[sid].roleId) return;
      if (def.strata === "DC" && (slots[sid].roleId.indexOf("Libero") !== -1)) liberoSid = sid;
    });
    if (!liberoSid) return null;

    var dmSid = null;
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (def && def.strata === "DM" && slots[sid].roleId) dmSid = sid;
    });
    if (dmSid) {
      var dmRole = slots[dmSid].roleId;
      var dmProf = getProfile(dmRole);
      if (dmProf && !dmProf.special.holder) {
        var newSlots = JSON.parse(JSON.stringify(slots));
        var replacement = "Anchor_D";
        var role = getRole(replacement);
        newSlots[dmSid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
        return { modified: true, slots: newSlots, description: "Changed " + dmRole + " to " + replacement + " to cover Libero" };
      }
    }
    var newSlots = JSON.parse(JSON.stringify(slots));
    var replacement = "CD_D";
    var role = getRole(replacement);
    newSlots[liberoSid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Changed " + slots[liberoSid].roleId + " to " + replacement + " to provide deep cover" };
  }

  function fixLiberoIWB(slots, instructions, violation) {
    var liberoFlank = null;
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      var roleId = slots[sid] && slots[sid].roleId;
      if (!def || !roleId) return;
      if (def.strata === "DC" && (roleId.indexOf("Libero") !== -1)) liberoFlank = def.flank;
    });
    if (!liberoFlank) return null;

    var iwbSid = null;
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      var roleId = slots[sid] && slots[sid].roleId;
      if (!def || !roleId) return;
      if ((def.strata === "WD" || def.strata === "WB") && roleId.indexOf("IWB") !== -1) {
        if (def.flank === liberoFlank || liberoFlank === "C") iwbSid = sid;
      }
    });
    if (!iwbSid) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    newSlots[iwbSid] = { roleId: "IFB_D", duty: "Defend", playerName: null };
    return { modified: true, slots: newSlots, description: "Changed IWB on " + (liberoFlank === "L" ? "left" : "right") + " flank to IFB_D to pair with Libero" };
  }

  function fixLiberoBack4(slots, instructions, violation) {
    var liberoSid = null;
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || !slots[sid].roleId) return;
      if (def.strata === "DC" && (slots[sid].roleId.indexOf("Libero") !== -1 || slots[sid].roleId.indexOf("LIB") !== -1)) liberoSid = sid;
    });
    if (!liberoSid) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    var replacement = "CD_D";
    var role = getRole(replacement);
    newSlots[liberoSid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Changed Libero back-4 to CD_D for realistic defensive shape" };
  }

  function fixWcbBack4(slots, instructions, violation) {
    var wcbSid = null;
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || !slots[sid].roleId) return;
      if (def.strata === "DC" && (slots[sid].roleId.indexOf("WCB") !== -1 || slots[sid].roleId.indexOf("Wide Centre") !== -1)) wcbSid = sid;
    });
    if (!wcbSid) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    var replacement = "CD_D";
    var role = getRole(replacement);
    newSlots[wcbSid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Changed WCB back-4 to CD_D for realistic defensive shape" };
  }

  // ─── LAYER 3 FIX IMPLEMENTATIONS ───

  function fixZoneOverload(slots, instructions, violation) {
    // Zone has >2 occupants — move the least-essential occupant to a different role
    // Pick a role that can shift strata (e.g. CM->DM variant, AM->CM variant)
    var candidates = [];
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || !slots[sid].roleId) return;
      var roleId = slots[sid].roleId;
      var prof = getProfile(roleId);
      if (!prof) return;
      if (prof.movement.vertical > 0.6 && def.strata !== "GK" && def.strata !== "DC") {
        candidates.push({ sid: sid, roleId: roleId, strata: def.strata, vert: prof.movement.vertical });
      }
    });
    if (candidates.length === 0) return null;
    candidates.sort(function(a, b) { return b.vert - a.vert; });
    var target = candidates[0];

    var replacement = null;
    if (target.strata === "CM") replacement = "DM_S";
    else if (target.strata === "DM") replacement = "CM_S";
    else if (target.strata === "AMC") replacement = "CM_A";
    else if (target.strata === "ST") replacement = "AM_A";
    if (!replacement || replacement === target.roleId) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    var role = getRole(replacement);
    newSlots[target.sid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Relieved zone overload: changed " + target.roleId + " to " + replacement };
  }

  function fixHalfStack(slots, instructions, violation) {
    // Half-space has 3+ occupants — move one to wide
    var candidates = [];
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || !slots[sid].roleId) return;
      if (def.flank !== "L" && def.flank !== "R") return;
      var roleId = slots[sid].roleId;
      var prof = getProfile(roleId);
      if (!prof) return;
      if (prof.movement.width_drift < 0.5) {
        if (def.strata === "WA" && isWaInsideRole(roleId)) return;
        candidates.push({ sid: sid, roleId: roleId, strata: def.strata, duty: slots[sid].duty });
      }
    });
    if (candidates.length === 0) return null;
    var target = candidates[0];

    var replacement = null;
    if (target.strata === "CM") replacement = "WM_S";
    else if (target.strata === "DM") replacement = "DM_S";
    else if (target.strata === "AMC") replacement = "AM_S";
    else if (target.strata === "WA") replacement = pickWaReplacement(target.duty, false);
    if (!replacement || replacement === target.roleId) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    var role = getRole(replacement);
    newSlots[target.sid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Spread half-space stack: changed " + target.roleId + " to " + replacement };
  }

  function fixWidthVoid(slots, instructions, violation) {
    // Both wide columns empty — give someone a wide duty or wide role
    var candidates = [];
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || !slots[sid].roleId) return;
      if (def.flank !== "L" && def.flank !== "R") return;
      var roleId = slots[sid].roleId;
      var prof = getProfile(roleId);
      if (!prof) return;
      if (prof.movement.width_drift < 0.3) {
        if (def.strata === "WA" && isWaInsideRole(roleId)) return;
        candidates.push({ sid: sid, roleId: roleId, strata: def.strata, duty: slots[sid].duty });
      }
    });
    if (candidates.length === 0) return null;
    var target = candidates[0];

    var replacement = null;
    if (target.strata === "WA") replacement = pickWaReplacement(target.duty, false);
    else if (target.strata === "WM") replacement = "WM_S";
    else if (target.strata === "CM") replacement = "CM_S";
    else if (target.strata === "WD") replacement = "FB_S";
    else if (target.strata === "WB") replacement = "WB_S";
    if (!replacement || replacement === target.roleId) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    var role = getRole(replacement);
    newSlots[target.sid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Filled width void: changed " + target.roleId + " to " + replacement };
  }

  function fixUnstructuredRoam(slots, instructions, violation) {
    // >=2 roamers with no holder — find the most roaming role and make it a holder
    var candidates = [];
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || !slots[sid].roleId || def.strata === "GK") return;
      var roleId = slots[sid].roleId;
      var prof = getProfile(roleId);
      if (!prof) return;
      var roamScore = (prof.special.roaming ? 2 : 0) + (prof.movement.roam || 0);
      if (roamScore > 0.5 && !prof.special.holder) {
        candidates.push({ sid: sid, roleId: roleId, score: roamScore, strata: def.strata });
      }
    });
    if (candidates.length === 0) return null;
    candidates.sort(function(a, b) { return b.score - a.score; });
    var target = candidates[0];

    var replacement = findHoldingReplacement(target.sid, target.roleId, target.strata);
    if (!replacement) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    var role = getRole(replacement);
    newSlots[target.sid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Structured roaming: changed " + target.roleId + " to " + replacement };
  }

  function fixZone14Static(slots, instructions, violation) {
    // >=2 static creators in Zone 14 — change one to a more dynamic role
    var candidates = [];
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || !slots[sid].roleId) return;
      if (def.strata !== "AMC" && def.strata !== "CM" && def.strata !== "ST") return;
      var roleId = slots[sid].roleId;
      var prof = getProfile(roleId);
      if (!prof) return;
      if (prof.movement.roam < 0.3 && prof.special.creator) {
        candidates.push({ sid: sid, roleId: roleId, strata: def.strata });
      }
    });
    if (candidates.length === 0) return null;
    var target = candidates[0];

    var replacement = null;
    if (target.strata === "AMC") replacement = "SS_A";
    else if (target.strata === "CM") replacement = "BBM_S";
    else if (target.strata === "ST") replacement = "CF_S";
    if (!replacement || replacement === target.roleId) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    var role = getRole(replacement);
    newSlots[target.sid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Dynamised Zone 14: changed " + target.roleId + " to " + replacement };
  }

  // ─── LAYER 4 FIX IMPLEMENTATIONS ───

  function fixArchetypeBoost(slots, instructions, violation, archetype) {
    // Change a non-boosted role to a boosted role for this archetype
    var phiProfiles = global.PHILOSOPHY_PROFILES || {};
    var profile = phiProfiles[archetype];
    if (!profile || !profile.roleBoost) return null;

    var boosted = profile.roleBoost;
    var count = 0;
    Object.keys(slots).forEach(function(sid) {
      if (slots[sid] && slots[sid].roleId && boosted[slots[sid].roleId]) count++;
    });
    if (count >= 2) return null;

    // Determine if back-three based on filled DC slots
    var dcCount = 0;
    Object.keys(slots).forEach(function(sid) {
      if (slots[sid] && slots[sid].roleId) {
        var def = slotDefs[sid];
        if (def && def.strata === "DC") dcCount++;
      }
    });
    var isBackThree = dcCount >= 3;

    var target = null;
    var replacement = null;
    Object.keys(slots).forEach(function(sid) {
      if (target) return;
      var def = slotDefs[sid];
      if (!def || !slots[sid].roleId) return;
      var rid = slots[sid].roleId;
      if (boosted[rid]) return;
      // Find a boosted role in the same strata
      var boostIds = Object.keys(boosted);
      for (var i = 0; i < boostIds.length; i++) {
        var bid = boostIds[i];
        var bRole = getRole(bid);
        if (bRole) {
          // If role is a back-three role (WCB or Libero), we only allow it if isBackThree is true
          var isB3Role = bid.indexOf("WCB") === 0 || bid.indexOf("Libero") === 0;
          if (isB3Role && !isBackThree) continue;

          // If the bRole is allowed in the slot's strata
          if (roleHasStrata(bRole, def.strata)) {
            target = sid;
            replacement = bid;
            return;
          }
        }
      }
    });
    if (!target || !replacement || replacement === slots[target].roleId) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    var role = getRole(replacement);
    newSlots[target] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Boosted archetype fit: changed " + slots[target].roleId + " to " + replacement };
  }

  function fixArchetypeRunner(slots, instructions, violation, archetype) {
    // Need more direct runners — change ST/WA to AF_A or Poacher_A
    var candidates = [];
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || !slots[sid].roleId) return;
      if (def.strata !== "ST" && def.strata !== "WA") return;
      var rid = slots[sid].roleId;
      var role = getRole(rid);
      if (role && role.duty !== "A" && role.duty !== "Att") {
        candidates.push({ sid: sid, roleId: rid, strata: def.strata });
      }
    });
    if (candidates.length === 0) return null;
    var target = candidates[0];

    var replacement = target.strata === "ST" ? "AF_A" : pickWaReplacement(target.duty || "Attack", false);
    if (replacement === target.roleId) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    var role = getRole(replacement);
    newSlots[target.sid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Added direct runner: changed " + target.roleId + " to " + replacement };
  }

  function fixArchetypeSuppressed(slots, instructions, violation, archetype) {
    // Change a suppressed role to a non-suppressed alternative
    var phiProfiles = global.PHILOSOPHY_PROFILES || {};
    var profile = phiProfiles[archetype];
    if (!profile || !profile.roleSuppression) return null;
    var suppressed = profile.roleSuppression;

    var targetSid = null;
    var targetRid = null;
    Object.keys(slots).forEach(function(sid) {
      if (targetSid) return;
      if (!slots[sid] || !slots[sid].roleId) return;
      var rid = slots[sid].roleId;
      if (suppressed[rid]) {
        targetSid = sid;
        targetRid = rid;
      }
    });
    if (!targetSid) return null;

    var def = slotDefs[targetSid];
    if (!def) return null;
    var replacement = findHoldingReplacement(targetSid, targetRid, def.strata);
    if (!replacement || replacement === targetRid) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    var role = getRole(replacement);
    newSlots[targetSid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Replaced suppressed role " + targetRid + " with " + replacement };
  }

  // ─── LAYER 4 INSTRUCTION FIXES ───

  function fixArchetypeVeto(slots, instructions, violation, archetype) {
    var phiProfiles = global.PHILOSOPHY_PROFILES || {};
    var profile = phiProfiles[archetype];
    if (!profile || !profile.instructionVetoes) return null;

    var vetoKeys = profile.instructionVetoes;
    if (!instructions) return null;
    var newInst = JSON.parse(JSON.stringify(instructions));
    var changed = false;
    vetoKeys.forEach(function(key) {
      if (newInst[key] !== undefined && newInst[key] !== false && newInst[key] !== "Standard") {
        delete newInst[key];
        changed = true;
      }
    });
    if (!changed) return null;
    return { modified: false, instructions: newInst, description: "Removed vetoed instructions for " + archetype };
  }

  function fixArchetypeDirectness(slots, instructions, violation) {
    if (!instructions || !instructions.passingDirectness) return null;
    var newInst = JSON.parse(JSON.stringify(instructions));
    newInst.passingDirectness = "Shorter";
    return { modified: false, instructions: newInst, description: "Lowered passing directness to 'Shorter' for possession archetype" };
  }

  function fixArchetypePlaymakers(slots, instructions, violation) {
    // Need more playmakers — change a CM/AMC to a playmaker variant
    var candidates = [];
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || !slots[sid].roleId) return;
      var rid = slots[sid].roleId;
      var role = getRole(rid);
      if (!role || role.isPlaymaker) return;
      if (def.strata === "CM" || def.strata === "DM" || def.strata === "AMC") {
        candidates.push({ sid: sid, rid: rid, strata: def.strata });
      }
    });
    if (candidates.length === 0) return null;
    var target = candidates[0];
    var replacement = null;
    if (target.strata === "CM") replacement = "AP_S";
    else if (target.strata === "DM") replacement = "DLP_S";
    else if (target.strata === "AMC") replacement = "AP_AMC_S";
    if (!replacement || replacement === target.rid) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    var role = getRole(replacement);
    newSlots[target.sid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Added playmaker: changed " + target.rid + " to " + replacement };
  }

  function fixArchetypePressIntensity(slots, instructions, violation) {
    if (!instructions || !instructions.triggerPress) return null;
    var newInst = JSON.parse(JSON.stringify(instructions));
    newInst.triggerPress = "Much More Often";
    return { modified: false, instructions: newInst, description: "Raised trigger press to 'Much More Often' for high-press archetype" };
  }

  function fixArchetypePressLOE(slots, instructions, violation) {
    if (!instructions || !instructions.lineOfEngagement) return null;
    var newInst = JSON.parse(JSON.stringify(instructions));
    newInst.lineOfEngagement = "High";
    return { modified: false, instructions: newInst, description: "Raised line of engagement to 'High' for high-press archetype" };
  }

  function fixArchetypeDefLine(slots, instructions, violation) {
    if (!instructions || !instructions.defensiveLine) return null;
    var newInst = JSON.parse(JSON.stringify(instructions));
    newInst.defensiveLine = "Lower";
    return { modified: false, instructions: newInst, description: "Lowered defensive line to 'Lower' for defensive organiser archetype" };
  }

  function fixArchetypeLOEDef(slots, instructions, violation) {
    if (!instructions || !instructions.lineOfEngagement) return null;
    var newInst = JSON.parse(JSON.stringify(instructions));
    newInst.lineOfEngagement = "Mid block";
    return { modified: false, instructions: newInst, description: "Set line of engagement to 'Mid block' for defensive organiser archetype" };
  }

  function fixArchetypePhysical(slots, instructions, violation) {
    // Need more physical/defensive roles — change a non-physical role to a physical variant
    var candidates = [];
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || !slots[sid].roleId) return;
      var rid = slots[sid].roleId;
      if (rid.indexOf("CD_") === 0 || rid.indexOf("BWM") === 0 || rid.indexOf("Anchor") === 0 ||
          rid.indexOf("DM_D") === 0 || rid.indexOf("NFB") === 0 || rid.indexOf("TF_") === 0 ||
          rid.indexOf("PF_D") === 0 || rid.indexOf("NCB") === 0) return;
      if (def.strata === "CM" || def.strata === "DM" || def.strata === "ST") {
        candidates.push({ sid: sid, rid: rid, strata: def.strata });
      }
    });
    if (candidates.length === 0) return null;
    var target = candidates[0];
    var replacement = null;
    if (target.strata === "CM") replacement = "BWM_CM_D";
    else if (target.strata === "DM") replacement = "BWM_D";
    else if (target.strata === "ST") replacement = "PF_D";
    if (!replacement || replacement === target.rid) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    var role = getRole(replacement);
    newSlots[target.sid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Added physical role: changed " + target.rid + " to " + replacement };
  }

  function fixArchetypeReducePlaymakers(slots, instructions, violation) {
    // Too many playmakers — change one playmaker to non-playmaker
    var candidates = [];
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || !slots[sid].roleId) return;
      var rid = slots[sid].roleId;
      var role = getRole(rid);
      if (role && role.isPlaymaker) {
        candidates.push({ sid: sid, rid: rid, strata: def.strata });
      }
    });
    if (candidates.length === 0) return null;
    var target = candidates[0];
    var replacement = null;
    if (target.strata === "CM") replacement = "BBM_S";
    else if (target.strata === "DM") replacement = "DM_S";
    else if (target.strata === "AMC") replacement = "AM_A";
    else if (target.strata === "WA") replacement = pickWaReplacement(slots[target.sid].duty, false);
    if (!replacement || replacement === target.rid) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    var role = getRole(replacement);
    newSlots[target.sid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Reduced playmakers: changed " + target.rid + " to " + replacement };
  }

  // ─── ADDITIONAL LAYER 2 FIX IMPLEMENTATIONS ───

  function fixLineHeight(slots, instructions, violation) {
    // GK/DC line height contradiction — change GK to match DC or vice versa
    var gkSid = null, gkRid = null;
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (def && def.strata === "GK" && slots[sid].roleId) { gkSid = sid; gkRid = slots[sid].roleId; }
    });
    if (!gkSid) return null;
    // If GK is sweeper (SK), change to standard GK_D
    if (gkRid && (gkRid === "SK_A" || gkRid === "SK_S")) {
      var newSlots = JSON.parse(JSON.stringify(slots));
      newSlots[gkSid] = { roleId: "GK_D", duty: "Defend", playerName: null };
      return { modified: true, slots: newSlots, description: "Changed " + gkRid + " to GK_D to resolve line height conflict" };
    }
    return null;
  }

  function fixUnreachableTriggers(slots, instructions, violation) {
    // High LOE + low DL creates unreachable pressing triggers
    // Lower LOE or raise DL — we lower LOE via instruction change
    if (instructions && instructions.lineOfEngagement) {
      var newInst = JSON.parse(JSON.stringify(instructions));
      newInst.lineOfEngagement = "Mid block";
      return { modified: false, instructions: newInst, description: "Lowered LOE to 'Mid block' to make pressing triggers reachable" };
    }
    return null;
  }

  function fixHbNoWbAttack(slots, instructions, violation) {
    // HB requires WB on attack/support for width compensation
    var candidates = [];
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || !slots[sid].roleId) return;
      if ((def.strata === "WD" || def.strata === "WB") && slots[sid].roleId.indexOf("FB_D") !== -1) {
        candidates.push(sid);
      }
    });
    if (candidates.length === 0) return null;
    var newSlots = JSON.parse(JSON.stringify(slots));
    var def = slotDefs[candidates[0]];
    var replacement = def && def.flank === "R" ? "WB_S" : "WB_S";
    newSlots[candidates[0]] = { roleId: replacement, duty: "Support", playerName: null };
    return { modified: true, slots: newSlots, description: "Changed FB_D to " + replacement + " to support HB drop" };
  }

  function fixDoubleIWB(slots, instructions, violation) {
    // Double IWB: change one IWB to WB/FB to provide width
    var iwbSlots = [];
    Object.keys(slots).forEach(function(sid) {
      var roleId = slots[sid] && slots[sid].roleId;
      if (roleId === "IWB_A" || roleId === "IWB_S") iwbSlots.push(sid);
    });
    if (iwbSlots.length < 2) return null;
    var newSlots = JSON.parse(JSON.stringify(slots));
    newSlots[iwbSlots[1]] = { roleId: "WB_S", duty: "Support", playerName: null };
    return { modified: true, slots: newSlots, description: "Changed IWB on " + iwbSlots[1] + " to WB_S to restore width" };
  }

  function fixHalfSpaceStack(slots, instructions, violation) {
    // IWB + IF/Mezzala same side: change IWB to WB/FB
    var iwbSid = null;
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      var roleId = slots[sid] && slots[sid].roleId;
      if (!def || !roleId) return;
      if ((def.strata === "WD" || def.strata === "WB") && (roleId.indexOf("IWB") !== -1)) iwbSid = sid;
    });
    if (!iwbSid) return null;
    var newSlots = JSON.parse(JSON.stringify(slots));
    newSlots[iwbSid] = { roleId: "WB_S", duty: "Support", playerName: null };
    return { modified: true, slots: newSlots, description: "Changed IWB on " + iwbSid + " to WB_S to unsplit half-space stack" };
  }

  // ─── LAYER 1 FIX: PAIRING/PAIRING VIOLATIONS ───

  function fixPairingViolation(slots, instructions, violation) {
    // Violation has roleA, roleB, slotA, slotB — change one role to resolve
    var targetSid = violation.slotA || null;
    var targetRid = violation.roleA || null;
    var otherRid = violation.roleB || null;
    if (!targetSid || !targetRid || !otherRid) return null;

    var def = slotDefs[targetSid];
    if (!def) return null;

    // Try to find a compatible replacement in same strata
    var replacement = findHoldingReplacement(targetSid, targetRid, def.strata);
    if (!replacement || replacement === targetRid) {
      // Try flipping strata
      if (def.strata === "CM") replacement = "CM_S";
      else if (def.strata === "DM") replacement = "DM_D";
      else if (def.strata === "WA") replacement = pickWaReplacement(slots[targetSid].duty, false);
      else if (def.strata === "AMC") replacement = "AM_S";
      else if (def.strata === "ST") replacement = "PF_S";
      else if (def.strata === "WD" || def.strata === "WB") replacement = "FB_S";
      else if (def.strata === "DC") replacement = "CD_D";
    }
    if (!replacement || replacement === targetRid) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    var role = getRole(replacement);
    newSlots[targetSid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Resolved NP violation: changed " + targetRid + " to " + replacement };
  }

  // ─── HELPERS ───

  function findHoldingReplacement(sid, roleId, strata) {
    var holders = {
      "DM": ["Anchor_D", "HB_D", "DM_D", "BWM_D"],
      "CM": ["CM_D", "BWM_CM_D", "DLP_D"],
      "WD": ["FB_D", "NFB_D", "IFB_D"],
      "WB": ["WB_D"],
      "WM": ["WM_D", "DW_D"],
      "AMC": ["AM_S"],
      "WA": ["IF_S", "IF_A", "IW_S", "IW_A", "Winger_S", "Winger_A"],
      "ST": ["DLF_S", "PF_S", "TF_S", "PF_D"]
    };
    var opts = holders[strata] || [];
    for (var i = 0; i < opts.length; i++) {
      if (opts[i] !== roleId) return opts[i];
    }
    return null;
  }

  function fixStrikerDefensiveLine(slots, instructions, violation, archetype) {
    if (!instructions) return null;

    // If the manager is a disciplined defensive organiser, they MUST defend deep.
    // Therefore, we cannot change the defensive line to Standard. We must replace the striker instead.
    if (archetype === "disciplined defensive organiser") {
      return fixPairingViolation(slots, instructions, violation, archetype);
    }

    var newInst = JSON.parse(JSON.stringify(instructions));
    var currentDL = instructions.defensiveLine || "Standard";

    if (violation.id === "NP-21" || violation.id === "NP-23" || violation.id === "NP-25") {
      // These trigger on DL_DEEP (Lower / Much Lower)
      if (currentDL === "Lower" || currentDL === "Much Lower") {
        newInst.defensiveLine = "Standard";
        return { modified: false, instructions: newInst, description: "Adjusted defensive line to 'Standard' to suit striker role " + violation.roleA };
      }
    } else if (violation.id === "NP-22" || violation.id === "NP-24") {
      // These trigger on DL_HIGH (Higher / Much Higher)
      if (currentDL === "Higher" || currentDL === "Much Higher") {
        newInst.defensiveLine = "Standard";
        return { modified: false, instructions: newInst, description: "Adjusted defensive line to 'Standard' to suit striker role " + violation.roleA };
      }
    }
    return null;
  }

  function fixHighFatigue(slots, instructions, violation, archetype) {
    var candidates = [];
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || !slots[sid].roleId) return;
      var roleId = slots[sid].roleId;
      var prof = getProfile(roleId);
      if (!prof) return;
      if (prof.defensive && prof.defensive.press_intensity > 0.6) {
        if (def.strata === "ST" || def.strata === "AMC" || def.strata === "WA") {
          candidates.push({ sid: sid, roleId: roleId, strata: def.strata, duty: slots[sid].duty });
        }
      }
    });

    if (candidates.length === 0) return null;

    // Sort candidates: ST first, then AMC, then WA
    var strataOrder = { "ST": 0, "AMC": 1, "WA": 2 };
    candidates.sort(function(a, b) {
      return strataOrder[a.strata] - strataOrder[b.strata];
    });

    var target = candidates[0];
    var replacement = null;

    var options = [];
    if (target.strata === "ST") {
      options = ["DLF_S", "TF_S", "Poacher_A", "CF_S", "F9_S"];
    } else if (target.strata === "AMC") {
      options = ["AM_S", "AP_AMC_S", "Enganche_S"];
    } else if (target.strata === "WA") {
      options = ["Winger_S", "IW_S", "IF_S", "AP_WA_S"];
    }

    var bestOpt = null;
    var bestScore = -999;
    var phiProfiles = global.PHILOSOPHY_PROFILES || {};
    var profile = archetype ? phiProfiles[archetype] : null;

    options.forEach(function(opt) {
      var score = 1.0;
      if (profile) {
        if (profile.roleSuppression && profile.roleSuppression[opt] !== undefined) {
          score = profile.roleSuppression[opt];
        } else if (profile.roleBoost && profile.roleBoost[opt] !== undefined) {
          score = profile.roleBoost[opt];
        }
      }
      var roleObj = getRole(opt);
      if (roleObj && target.duty) {
        var optIsAttack = (roleObj.duty === "Attack" || opt.indexOf("_A") !== -1);
        var targetIsAttack = (target.duty === "Attack" || target.roleId.indexOf("_A") !== -1 || target.roleId.indexOf("_D") !== -1);
        if (optIsAttack === targetIsAttack) {
          score += 0.1;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestOpt = opt;
      }
    });

    replacement = bestOpt;
    if (!replacement || replacement === target.roleId) return null;

    var newSlots = JSON.parse(JSON.stringify(slots));
    var role = getRole(replacement);
    newSlots[target.sid] = { roleId: replacement, duty: role ? role.duty : null, playerName: null };
    return { modified: true, slots: newSlots, description: "Mitigated high fatigue: changed aggressive pressing " + target.roleId + " to containing " + replacement };
  }

  // ─── EXPORT ───

  global.autofixTactic = autofixTactic;

})(typeof window !== "undefined" ? window : global);
