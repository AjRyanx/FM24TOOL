(function (global) {
  "use strict";

  var profiles = global.ROLE_PROFILES || {};
  var slotDefs = global.GLOBAL_PITCH_SLOTS || {};
  var SEVERITY_WEIGHTS = global.SEVERITY_WEIGHTS || { GOOD:1, WARNING:-3, BAD:-8, CRITICAL:-20 };

  function getProfile(roleId) { return profiles[roleId] || null; }

  // ════════════════════════════════════════════════════════
  // 2a. SPINE COHERENCE VALIDATOR
  // ════════════════════════════════════════════════════════

  function validateSpine(slots) {
    var violations = [];
    if (!slots) return violations;

    // Build spine chain: GK → DC(primary) → DM(primary) → CM(primary) → ST(primary)
    var spine = [];
    var chain = ["GK", "DC", "DM", "CM", "ST"];

    for (var ci = 0; ci < chain.length; ci++) {
      var s = chain[ci];
      var candidates = [];
      Object.keys(slots).forEach(function(sid) {
        var def = slotDefs[sid];
        if (def && def.strata === s && slots[sid].roleId) {
          // Prefer central slots for spine
          candidates.push({ sid: sid, roleId: slots[sid].roleId, flank: def.flank, x: def.x });
        }
      });
      if (candidates.length === 0) continue;
      // Pick most central
      candidates.sort(function(a, b) {
        if (a.flank === "C" && b.flank !== "C") return -1;
        if (a.flank !== "C" && b.flank === "C") return 1;
        return Math.abs(a.x - 340) - Math.abs(b.x - 340);
      });
      spine.push(candidates[0]);
    }

    if (spine.length < 3) return violations;

    // Compute cosine similarity along spine
    function styleVec(roleId) {
      var p = getProfile(roleId);
      if (!p) return [0,0,0,0];
      return [
        p.movement.vertical || 0,
        p.defensive.press_intensity || 0,
        p.build_up.short_pass_tendency || 0,
        p.defensive.track_back || 0
      ];
    }

    function cosineSim(a, b) {
      var dot = 0, na = 0, nb = 0;
      for (var i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
      var denom = Math.sqrt(na) * Math.sqrt(nb);
      return denom === 0 ? 0 : dot / denom;
    }

    var sims = [];
    for (var i = 0; i < spine.length - 1; i++) {
      var va = styleVec(spine[i].roleId);
      var vb = styleVec(spine[i + 1].roleId);
      sims.push(cosineSim(va, vb));
    }
    var meanSim = sims.length > 0 ? sims.reduce(function(a,b){return a+b;}, 0) / sims.length : 0;

    if (meanSim < 0.5 && spine.length >= 4) {
      violations.push({
        id: "S2A_SPINE_MISMATCH", severity: "WARNING",
        description: "Spine coherence low (" + meanSim.toFixed(2) + "). Roles along the vertical axis have contrasting styles.",
        suggestion: "Align GK/DC/DM/CM roles to a shared tempo and press philosophy."
      });
    }

    // Tempo/tendency mismatches
    for (var si = 0; si < spine.length - 1; si++) {
      var a = spine[si], b = spine[si + 1];
      var pa = getProfile(a.roleId), pb = getProfile(b.roleId);
      if (!pa || !pb) continue;
      // GK + DC: line height contradiction
      if (a.flank === "GK" || b.flank === "GK") {
        var gkRole = a.flank === "GK" ? a.roleId : b.roleId;
        var dcRole = a.flank === "GK" ? b.roleId : a.roleId;
        var pg = getProfile(gkRole), pd = getProfile(dcRole);
        if (pg && pd) {
          var gkVert = pg.movement.vertical || 0;
          var dcTrack = pd.defensive.track_back || 0;
          if (gkVert > 0.4 && dcTrack > 0.8) {
            violations.push({
              id: "S2A_LINE_HEIGHT", severity: "WARNING",
              description: "Sweeper keeper wants high line but DC sits deep.",
              suggestion: "Change GK to GK_D or DC to CD_ST/NCB_ST for line height alignment.",
              roleA: gkRole, roleB: dcRole
            });
          }
        }
      }
      // DM + ST: build-up vs runner
      if (a.flank === "DM" || b.flank === "DM") {
        var dmRole = a.flank === "DM" ? a.roleId : b.roleId;
        var stRole = a.flank === "DM" ? b.roleId : a.roleId;
        var pdm = getProfile(dmRole), pst = getProfile(stRole);
        if (pdm && pst) {
          if ((pdm.build_up.short_pass_tendency || 0) > 0.7 && (pst.movement.vertical || 0) > 0.8) {
            violations.push({
              id: "S2A_TEMPO_MISMATCH", severity: "WARNING",
              description: "Slow builder behind a pure runner; no link player between DM and ST.",
              suggestion: "Add a CM with roaming/through-ball tendency or change striker to DLF/CF.",
              roleA: dmRole, roleB: stRole
            });
          }
        }
      }
    }

    return violations;
  }

  // ════════════════════════════════════════════════════════
  // 2b. REST DEFENCE CALCULATOR
  // ════════════════════════════════════════════════════════

  function calculateRestDefence(slots, instructions) {
    var violations = [];
    if (!slots) return { score: 0, violations: violations };

    var score = 0;
    var shapeLines = {};
    var slotIds = Object.keys(slots);

    slotIds.forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || def.strata === "GK" || def.strata === "ST" || def.strata === "AMC" || def.strata === "WA" || !slots[sid].roleId) return;
      var roleId = slots[sid].roleId;
      var profile = getProfile(roleId);
      if (!profile) return;

      var add = 0;
      var duty = slots[sid].duty;
      if (duty === "Defend" || duty === "Stopper" || duty === "Cover") add = 1.0;
      else if (profile.special.holder) add = 1.0;
      else if (duty === "Attack") add = 0.0;
      else add = 0.5;

      // Roamers reduce rest defence
      if (profile.special.roaming && duty !== "Defend") add -= 0.5;
      if (profile.special.second_ball_runner) add -= 0.2;

      score += Math.max(0, add);

      // Track shape lines for gap detection
      if (def.strata === "DC" || def.strata === "WD" || def.strata === "WB") {
        if (!shapeLines[def.strata]) shapeLines[def.strata] = [];
        shapeLines[def.strata].push({ sid: sid, x: def.x, roleId: roleId });
      }
    });

    // Validate score
    var mentality = (instructions && instructions.mentality) || "";
    var isCautious = mentality === "Cautious" || mentality === "Defensive" || mentality === "Very Defensive";
    var isAttacking = mentality === "Attacking" || mentality === "Very Attacking" || mentality === "Positive";

    var minLimit = isAttacking ? 3.0 : 3.5;
    var maxLimit = isCautious ? 7.8 : 6.8;

    if (score < 2.5) {
      violations.push({
        id: "S2B_REST_DEFENCE_CRITICAL", severity: "CRITICAL",
        description: "Rest defence score " + score.toFixed(1) + " — dangerously low. Fewer than 2.5 stay-at-home players.",
        suggestion: "Change at least 2 roaming roles to defend or holding duties."
      });
    } else if (score < minLimit) {
      violations.push({
        id: "S2B_REST_DEFENCE_LOW", severity: "WARNING",
        description: "Rest defence score " + score.toFixed(1) + " — below " + minLimit.toFixed(1) + " threshold.",
        suggestion: "Consider a defend-duty DM or FB to shore up defensive shape."
      });
    } else if (score > maxLimit) {
      violations.push({
        id: "S2B_OVERLY_CAUTIOUS", severity: "SUGGESTION",
        description: "Rest defence score " + score.toFixed(1) + " — many players staying back, may limit attacking numbers.",
        suggestion: "Consider freeing one FB or CM to support duty for better transitional threat."
      });
    }

    // Shape: Central corridor exposed (gap between DCs > 1 zone)
    var dcLine = shapeLines["DC"] || [];
    if (dcLine.length >= 2) {
      var hasCoverCB = false;
      var hasDefensiveDM = false;
      Object.keys(slots).forEach(function(sid) {
        var def = slotDefs[sid];
        if (!def || !slots[sid].roleId) return;
        if (def.strata === "DC") {
          var role = getRoleById ? getRoleById(slots[sid].roleId) : null;
          if (role && role.duty === "Cover") hasCoverCB = true;
        }
        if (def.strata === "DM") {
          var rid = slots[sid].roleId;
          if (rid === "Anchor_D" || rid === "HB_D" || rid === "DM_D" || rid === "DLP_D") hasDefensiveDM = true;
        }
      });
      if (!hasCoverCB && !hasDefensiveDM) {
        dcLine.sort(function(a,b) { return a.x - b.x; });
        for (var dci = 0; dci < dcLine.length - 1; dci++) {
          var gap = Math.abs(dcLine[dci + 1].x - dcLine[dci].x);
          if (gap > 160) {
            violations.push({
              id: "S2B_CENTRAL_CORRIDOR", severity: "WARNING",
              description: "Gap between DCs spans " + gap + " units — central corridor exposed.",
              suggestion: "Add a covering CB or screen with a defend-duty DM."
            });
          }
        }
      }
    }

    return { score: score, violations: violations };
  }

  // ════════════════════════════════════════════════════════
  // 2c. PRESSING COHESION ENGINE
  // ════════════════════════════════════════════════════════

  function evaluatePressingCohesion(slots, instructions) {
    var violations = [];
    if (!slots) return violations;

    var dLine = (instructions && instructions.defensiveLine) || "Standard";
    var loe = (instructions && instructions.lineOfEngagement) || "Standard";

    // Determine front press level
    var frontRoles = [];
    var midRoles = [];
    var dmRoles = [];

    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || !slots[sid].roleId) return;
      var roleId = slots[sid].roleId;
      var prof = getProfile(roleId);
      if (!prof) return;
      var item = { roleId: roleId, profile: prof, slotId: sid };

      if (def.strata === "ST" || def.strata === "AMC" || def.strata === "WA") {
        frontRoles.push(item);
      } else if (def.strata === "CM" || def.strata === "WM") {
        midRoles.push(item);
      } else if (def.strata === "DM") {
        dmRoles.push(item);
      }
    });

    var frontAggressive = 0, frontPassive = 0;
    frontRoles.forEach(function(r) {
      if (r.profile.defensive.press_intensity > 0.6) frontAggressive++;
      else frontPassive++;
    });
    var frontPress = (frontAggressive >= 2) ? "Aggressive" : "Passive";

    var midAggressive = 0;
    midRoles.forEach(function(r) {
      if (r.profile.defensive.press_intensity > 0.6) midAggressive++;
    });
    var midPress = (midAggressive >= 1) ? "Aggressive" : "Passive";

    var dmRole = dmRoles.length > 0 ? dmRoles[0].roleId : null;
    var dmProfile = dmRole ? getProfile(dmRole) : null;

    // Front × Mid × DM matrix
    if (frontPress === "Aggressive" && midPress === "Passive") {
      if (dmProfile && dmProfile.special.holder) {
        violations.push({
          id: "S2C_PRESS_GAP", severity: "WARNING",
          description: "Aggressive front press with passive midfield. Gap between lines when pressing.",
          suggestion: "Change one CM to BBM/BWM or push DM to support duty to compress lines."
        });
      } else if (!dmProfile || dmProfile.special.drops_into_backline) {
        violations.push({
          id: "S2C_BROKEN_PRESS", severity: "CRITICAL",
          description: "Broken press chain: front presses hard but midfield and DM are passive. Ball moves through midfield uncontested.",
          suggestion: "Add a BWM/BBM in midfield or change front to a containing role (DLF/CF)."
        });
      }
    }

    if (frontPress === "Aggressive" && midPress === "Aggressive") {
      violations.push({
        id: "S2C_HIGH_FATIGUE", severity: "SUGGESTION",
        description: "High fatigue warning: both front and midfield press aggressively.",
        suggestion: "Consider one containing role (DLF_S / AM_S) to manage stamina."
      });
    }

    // Line height validator
    var isHighDL = (dLine === "Higher" || dLine === "Much Higher");
    var isHighLOE = (loe === "High" || loe === "Much Higher");
    var isDeepDL = (dLine === "Lower" || dLine === "Much Lower");

    if (isHighDL && isHighLOE) {
      var dmRoams = dmProfile && dmProfile.special.roaming;
      var hasCover = false;
      Object.keys(slots).forEach(function(sid) {
        var def = slotDefs[sid];
        if (def && def.strata === "DC" && slots[sid].roleId) {
          var prof = getProfile(slots[sid].roleId);
          if (prof && prof.special.holder) hasCover = true;
        }
      });
      if (dmRoams && !hasCover) {
        violations.push({
          id: "S2C_EXPOSED_TRANSITION", severity: "CRITICAL",
          description: "High line + high LOE with roaming DM and no CB cover. Exposed to counter-attacks.",
          suggestion: "Change DM to a holding role (DM_D/Anchor/HB) or add CD_CO to back line."
        });
      }
    }

    if (isDeepDL && isHighLOE) {
      violations.push({
        id: "S2C_UNREACHABLE_TRIGGERS", severity: "WARNING",
        description: "Deep defensive line with high LOE — pressing triggers unreachable for defenders.",
        suggestion: "Lower LOE to Standard to keep lines compact, or push defensive line higher."
      });
    }

    return violations;
  }

  // ════════════════════════════════════════════════════════
  // 2d. BUILD-UP SHAPE TRANSFORMER
  // ════════════════════════════════════════════════════════

  function transformAndCheckShape(slots, instructions) {
    var violations = [];
    if (!slots) return violations;

    var hasHB = false, hasIWBA = false, hasIWBS = false, hasLibero = false;
    var iwbSids = [];

    Object.keys(slots).forEach(function(sid) {
      var roleId = slots[sid] && slots[sid].roleId;
      if (!roleId) return;
      if (roleId === "HB_D") hasHB = true;
      if (roleId === "IWB_A" || roleId === "IWB_S") { hasIWBA = hasIWBA || roleId === "IWB_A"; hasIWBS = hasIWBS || roleId === "IWB_S"; iwbSids.push(sid); }
      if (roleId === "Libero_S" || roleId === "Libero_A") hasLibero = true;
    });

    // HB_D transform
    if (hasHB) {
      var hasWBAttack = false, hasCover = false, hasStopper = false;
      Object.keys(slots).forEach(function(sid) {
        var def = slotDefs[sid];
        var roleId = slots[sid] && slots[sid].roleId;
        if (!def || !roleId) return;
        var prof = getProfile(roleId);
        if (def.strata === "WB" || def.strata === "WD") {
          if (slots[sid].duty === "Attack" || slots[sid].duty === "Support") hasWBAttack = true;
        }
        if (def.strata === "DC") {
          if (prof && prof.defensive.track_back > 0.6) hasCover = true;
        }
      });
      if (!hasWBAttack) {
        violations.push({
          id: "S2D_HB_NO_WB_ATTACK", severity: "WARNING",
          description: "HB_D drops into backline but WBs are not attacking — buildup shape is flat.",
          suggestion: "Set at least one WB to Attack/Support duty to provide width in buildup."
        });
      }
    }

    // IWB transform
    if (hasIWBA || hasIWBS) {
      var hasCentralHolder = false;
      var hasWidthProvider = false;
      Object.keys(slots).forEach(function(sid) {
        var def = slotDefs[sid];
        var roleId = slots[sid] && slots[sid].roleId;
        if (!def || !roleId || iwbSids.indexOf(sid) !== -1) return;
        var prof = getProfile(roleId);
        if (prof && (prof.special.holder || (prof.movement.hold_position || 0) > 0.7)) hasCentralHolder = true;
        if (prof && prof.movement.width_drift >= 0.7) hasWidthProvider = true;
      });
      if (!hasCentralHolder) {
        violations.push({
          id: "S2D_IWB_NO_COVER", severity: "WARNING",
          description: "IWB inverts to midfield but no CM/DM stays central to cover.",
          suggestion: "Add a holding CM or defend-duty DM to maintain central stability."
        });
      }
      if (!hasWidthProvider) {
        violations.push({
          id: "S2D_IWB_NO_WIDTH", severity: "WARNING",
          description: "IWB vacates wide channel with no wide provider to replace width.",
          suggestion: "Add a wide attacker (Winger/WM) on the IWB side or use CWB on the opposite flank."
        });
      }

      // Double IWB
      if (iwbSids.length >= 2) {
        violations.push({
          id: "S2D_DOUBLE_IWB", severity: "WARNING",
          description: "Double IWB creates very narrow shape — both fullbacks invert into midfield.",
          suggestion: "Consider WCB or HB to provide defensive width, or switch one IWB to WB/FB."
        });
      }
    }

    // Libero transform
    if (hasLibero) {
      // Count DC slots to detect back 4 vs back 3/5
      var dcCount = 0;
      Object.keys(slots).forEach(function(sid) {
        var def = slotDefs[sid];
        if (def && def.strata === "DC") dcCount++;
      });
      if (dcCount === 2) {
        violations.push({
          id: "S2D_LIBERO_IN_BACK_4", severity: "ERROR",
          description: "Libero in a back-4 formation is unrealistic — most teams never use this.",
          suggestion: "Change Libero to CD_De or BPD_De to maintain a conventional back four."
        });
      }

      var hasDeepCover = false;
      Object.keys(slots).forEach(function(sid) {
        var def = slotDefs[sid];
        var roleId = slots[sid] && slots[sid].roleId;
        if (!def || !roleId) return;
        if (def.strata === "DM" && roleId !== "Libero_S" && roleId !== "Libero_A") {
          var prof = getProfile(roleId);
          if (prof && prof.special.holder) hasDeepCover = true;
        }
        if (def.strata === "DC") {
          var prof = getProfile(roleId);
          if (prof && (roleId.indexOf("Libero") === -1) && prof.defensive.track_back > 0.6) hasDeepCover = true;
        }
      });
      if (!hasDeepCover) {
        violations.push({
          id: "S2D_LIBERO_NO_COVER", severity: "WARNING",
          description: "Libero steps into midfield but no DM or CD_CO provides deep cover.",
          suggestion: "Add HB/DM_D behind Libero or use CD_CO in the DC line."
        });
      }

      // Libero + IWB on same flank is wrong — should be IFB-De
      Object.keys(slots).forEach(function(sid) {
        var def = slotDefs[sid];
        var roleId = slots[sid] && slots[sid].roleId;
        if (!def || !roleId) return;
        if ((def.strata === "WD" || def.strata === "WB") && roleId.indexOf("IWB") !== -1) {
          violations.push({
            id: "S2D_LIBERO_IWB_CONFLICT", severity: "WARNING",
            description: "Libero + IWB on the same flank leaves the flank exposed — IWB inverts inside while Libero steps into midfield.",
            suggestion: "Change IWB to IFB_De on the same side as the Libero to provide defensive cover."
          });
        }
      });
    }

    // Wide Centre-Back in back 4 check
    var hasWcb = false;
    var dcCount = 0;
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (def && def.strata === "DC") {
        dcCount++;
        var roleId = slots[sid].roleId;
        if (roleId && (roleId.indexOf("WCB") !== -1 || roleId.indexOf("Wide Centre") !== -1)) {
          hasWcb = true;
        }
      }
    });
    if (hasWcb && dcCount === 2) {
      violations.push({
        id: "S2D_WCB_IN_BACK_4", severity: "ERROR",
        description: "Wide Centre-Back in a back-4 formation is unrealistic — wide center backs require a 3-atb system.",
        suggestion: "Change Wide Centre-Back to CD_De or BPD_De to maintain a conventional back four."
      });
    }

    // Mezzala_A + IF_A same side half-space stack
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || def.strata !== "CM") return;
      var roleId = slots[sid] && slots[sid].roleId;
      if (roleId !== "Mezzala_A") return;
      var flank = def.flank;
      // Check WA on same flank
      Object.keys(slots).forEach(function(sid2) {
        var def2 = slotDefs[sid2];
        if (!def2 || def2.strata !== "WA") return;
        if (def2.flank !== flank) return;
        var roleId2 = slots[sid2] && slots[sid2].roleId;
        if (!roleId2) return;
        var prof2 = getProfile(roleId2);
        if (prof2 && prof2.special.inverted && slots[sid2].duty === "Attack") {
          violations.push({
            id: "S2D_HALF_SPACE_STACK", severity: "WARNING",
            description: "Mezzala_A and " + roleId2 + " on same " + flank + " flank — half-space stack.",
            suggestion: "Check if WB/FB provides width compensation on this side."
          });
        }
      });
    });

    return violations;
  }

  // ════════════════════════════════════════════════════════
  // 2e. WIDTH & FLANK BALANCE
  // ════════════════════════════════════════════════════════

  function checkWidthBalance(slots) {
    var violations = [];
    if (!slots) return violations;

    var widthProviders = 0;
    var leftWidth = 0, rightWidth = 0;
    var leftOvercommit = 0, rightOvercommit = 0;

    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def || def.strata === "GK" || !slots[sid].roleId) return;
      var roleId = slots[sid].roleId;
      var prof = getProfile(roleId);
      if (!prof) return;
      var wd = prof.movement.width_drift || 0;

      if (wd >= 0.7) {
        widthProviders++;
        if (def.flank === "L") leftOvercommit++;
        else if (def.flank === "R") rightOvercommit++;
      }

      // Count by flank
      if (def.flank === "L" && wd > 0.4) leftWidth++;
      if (def.flank === "R" && wd > 0.4) rightWidth++;
    });

    // Total width check
    if (widthProviders < 2) {
      violations.push({
        id: "S2E_NO_WIDTH", severity: "WARNING",
        description: "Only " + widthProviders + " natural width provider" + (widthProviders === 1 ? "" : "s") + " in the formation.",
        suggestion: "Add a Winger/WB/WM to stretch the opposition defensively."
      });
    }

    // Flank overcommit
    if (leftOvercommit >= 3 && rightOvercommit === 0) {
      violations.push({
        id: "S2E_LEFT_OVERCOMMIT", severity: "WARNING",
        description: "Left flank overcommit (" + leftOvercommit + " wide roles) with no right-side holder.",
        suggestion: "Balance wide roles or add a holding mid to cover transitions."
      });
    }
    if (rightOvercommit >= 3 && leftOvercommit === 0) {
      violations.push({
        id: "S2E_RIGHT_OVERCOMMIT", severity: "WARNING",
        description: "Right flank overcommit (" + rightOvercommit + " wide roles) with no left-side holder.",
        suggestion: "Balance wide roles or add a holding mid to cover transitions."
      });
    }

    // Attacking phase wide vacancy
    var amVacantL = true, amVacantR = true;
    Object.keys(slots).forEach(function(sid) {
      var def = slotDefs[sid];
      if (!def) return;
      if (def.flank === "L" && (def.strata === "WA" || def.strata === "WM" || def.strata === "WD" || def.strata === "WB")) amVacantL = false;
      if (def.flank === "R" && (def.strata === "WA" || def.strata === "WM" || def.strata === "WD" || def.strata === "WB")) amVacantR = false;
    });
    if (amVacantL && amVacantR) {
      violations.push({
        id: "S2E_TUNNEL_VISION", severity: "WARNING",
        description: "Both wide channels vacated in attacking phase — no natural width.",
        suggestion: "Assign at least one wide attacker or overlapping fullback."
      });
    }

    return violations;
  }

  // ════════════════════════════════════════════════════════
  // MAIN ENTRY: runs all 5 structural validators
  // ════════════════════════════════════════════════════════

  function runStructuralValidators(slots, instructions) {
    var results = {
      spine:       { violations: [] },
      restDefence: { score: 0, violations: [] },
      pressing:    { violations: [] },
      shape:       { violations: [] },
      width:       { violations: [] }
    };

    results.spine.violations = validateSpine(slots);
    results.restDefence = calculateRestDefence(slots, instructions);
    results.pressing.violations = evaluatePressingCohesion(slots, instructions);
    results.shape.violations = transformAndCheckShape(slots, instructions);
    results.width.violations = checkWidthBalance(slots);

    // Aggregate
    var allViolations = [];
    Object.keys(results).forEach(function(k) {
      var v = results[k].violations || [];
      for (var i = 0; i < v.length; i++) allViolations.push(v[i]);
    });

    // Calculate structure score (0.0-1.0)
    var score = 1.0;
    for (var vi = 0; vi < allViolations.length; vi++) {
      var sev = allViolations[vi].severity;
      if (sev === "CRITICAL") score -= 0.3;
      else if (sev === "WARNING") score -= 0.1;
      else if (sev === "ERROR") score -= 0.15;
      else if (sev === "SUGGESTION") score -= 0.02;
    }
    score = Math.max(0, Math.min(1, score));

    return {
      score: score,
      violations: allViolations,
      subResults: results
    };
  }

  // ─── EXPORT ───
  global.runStructuralValidators = runStructuralValidators;
  global.validateSpine = validateSpine;
  global.calculateRestDefence = calculateRestDefence;
  global.evaluatePressingCohesion = evaluatePressingCohesion;
  global.transformAndCheckShape = transformAndCheckShape;
  global.checkWidthBalance = checkWidthBalance;

})(typeof window !== "undefined" ? window : global);
