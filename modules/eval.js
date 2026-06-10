// ─── Foot Preference Map ───

var FOOT_PREF_BY_ABBR = {
  "FB": "same",  "WB": "same",  "CWB": "same", "IFB": "same",
  "WM": "same",  "W":  "same",
  "IW": "opposite",  "IF": "opposite",  "WP": "opposite",
  "RMD": "opposite", "IWB": "opposite"
};

var FOOT_ELIGIBLE_SLOTS = ["DL","DR","WBL","WBR","ML","MR","AML","AMR","DCL","DCR"];

function getFootBonus(player, slotId, slotDef, roleId) {
  if (FOOT_ELIGIBLE_SLOTS.indexOf(slotId) === -1) return 0;

  var role = getRoleById(roleId);
  if (!role) return 0;
  var pref = FOOT_PREF_BY_ABBR[role.abbreviation];
  if (!pref || pref === "none") return 0;

  var flank = slotDef.flank;
  var diff = player.LeftFootScore - player.RightFootScore;
  var strongSide = diff > 0 ? "L" : diff < 0 ? "R" : null;
  var strongScore = strongSide === "L" ? player.LeftFootScore : player.RightFootScore;

  var expected = pref === "same" ? flank : (flank === "L" ? "R" : "L");

  if (strongSide === null) return 0.15;
  if (strongSide !== expected) return 0;

  var bonus = 0.2 + strongScore * 0.04;
  return Math.min(bonus, 0.5);
}

// ─── STEP 0: Flank Eligibility Gate ───

function isFlankEligible(player, slotId) {
  var slotDef = getSlotDef(slotId);
  if (!slotDef) return true;

  // Strata check: player must be able to play in this position line
  var pStrata = player.strata;
  if (!pStrata || !Array.isArray(pStrata) || pStrata.indexOf(slotDef.strata) === -1) return false;

  var slotFlank = slotDef.flank;
  if (!slotFlank) return true;

  var playerFlanks = player.flanks;
  if (!playerFlanks || !Array.isArray(playerFlanks) || playerFlanks.length === 0) return false;

  // Direct flank match (handles multi-flank players, order-independent)
  if (slotFlank === "L" && playerFlanks.indexOf("L") !== -1) return true;
  if (slotFlank === "R" && playerFlanks.indexOf("R") !== -1) return true;
  if (slotFlank === "C" && playerFlanks.indexOf("C") !== -1) return true;

  // Offset-central: pure central players can play directional-central slots
  if (playerFlanks.indexOf("C") !== -1) {
    if (["DCL","DCR","MCL","MCR"].indexOf(slotId) !== -1) return true;
  }

  return false;
}

// ─── STEP 1: Compute Tactic-Contextual Weights ───

function computeTacticWeights(roleId, tacticInstructions) {
  var role = null;
  for (var i = 0; i < FM24_ROLES.length; i++) {
    if (FM24_ROLES[i].id === roleId) { role = FM24_ROLES[i]; break; }
  }
  if (!role) return {};

  var weights = {};
  Object.keys(role.baseWeights).forEach(function (k) {
    weights[k] = role.baseWeights[k];
  });

  Object.keys(tacticInstructions).forEach(function (settingKey) {
    var value = tacticInstructions[settingKey];
    if (value === null || value === undefined) return;
    if (typeof value === "boolean" && !value) return;

    var lookupKey = settingKey + ":" + (typeof value === "boolean" ? "true" : value);
    var modifier = INSTRUCTION_WEIGHT_MODIFIERS[lookupKey];
    if (!modifier) return;

    Object.keys(modifier).forEach(function (attr) {
      var delta = modifier[attr];
      if (weights[attr] === undefined) weights[attr] = 0;
      weights[attr] += delta;
    });
  });

  // Prevent instruction stacking from eroding role identity:
  // an attribute's weight cannot exceed base × 2 (or 3 for instruction-introduced attrs)
  Object.keys(weights).forEach(function (k) {
    var base = role.baseWeights[k] || 0;
    var maxInstr = base > 0 ? base * 2 : 3;
    weights[k] = Math.min(weights[k], maxInstr);
  });

  Object.keys(weights).forEach(function (k) {
    weights[k] = Math.max(0, Math.min(5, weights[k]));
  });

  // Enforce role-identity maxWeights anchors (e.g. Trequartista Wor never exceeds 2)
  if (role.maxWeights) {
    Object.keys(role.maxWeights).forEach(function (k) {
      if (weights[k] !== undefined) {
        weights[k] = Math.min(weights[k], role.maxWeights[k]);
      }
    });
  }

  return weights;
}

// ─── STEP 2: Score Player For Role ───

function scorePlayerForRole(player, roleId, tacticInstructions) {
  var weights = computeTacticWeights(roleId, tacticInstructions);

  var sumContrib = 0;
  var sumPossible = 0;
  var breakdown = [];
  var missingAttrCount = 0;
  var r = getRoleById(roleId);
  var baseWeights = r ? r.baseWeights : {};

  var attrKeys = Object.keys(weights);
  for (var i = 0; i < attrKeys.length; i++) {
    var attr = attrKeys[i];
    var w = weights[attr];
    if (w === 0) continue;

    var playerVal = player[attr];
    var isFallback = false;
    if (playerVal === undefined || playerVal === null || isNaN(playerVal)) {
      playerVal = 5;
      isFallback = true;
      missingAttrCount++;
    }

    // Floor: any positive weight under 2 is treated as 2 for scoring
    var scoringWeight = w > 0 && w < 2 ? 2 : w;
    var contribution = (playerVal / 20) * scoringWeight;
    sumContrib += contribution;
    sumPossible += scoringWeight;

    breakdown.push({
      attr: attr,
      value: playerVal,
      weight: w,
      scoringWeight: scoringWeight,
      contribution: contribution,
      _fallback: isFallback
    });
  }

  var rawScore = sumPossible > 0 ? (sumContrib / sumPossible) * 20 : 0;

  // Elite check uses base weights so tactic modifiers can't disable it
  var eliteCount = 0;
  for (var b = 0; b < breakdown.length; b++) {
    var baseW = baseWeights[breakdown[b].attr] || 0;
    if (breakdown[b].value >= 18 && baseW >= 4) eliteCount++;
  }
  var preEliteScore = rawScore;
  rawScore += Math.min(eliteCount * 0.2, 0.6);

  rawScore = Math.max(0, Math.min(20, rawScore));

  // Hidden-attribute post-score multipliers
  var consM = 1 + ((player["Cons"] || 10) - 10) * 0.01;
  var detM  = 1 + ((player["Det"]  || 10) - 10) * 0.008;
  var impM  = 1 + ((player["Imp M"]|| 10) - 10) * 0.005;
  rawScore = Math.max(0, Math.min(20, rawScore * consM * detM * impM));

  var total = Math.round(rawScore * 10) / 10;
  var eliteBonusApplied = Math.round((rawScore - Math.min(preEliteScore, 20)) * 10) / 10;

  var fitLabel = "Poor Fit";
  if (total >= 17) fitLabel = "Elite Fit";
  else if (total >= 14) fitLabel = "Strong Fit";
  else if (total >= 11) fitLabel = "Decent Fit";
  else if (total >= 8) fitLabel = "Marginal Fit";

  // If the player has none of the role's attributes (all fell back to 5), return 0
  if (missingAttrCount > 0 && missingAttrCount === breakdown.length) {
    return {
      total: 0,
      fitLabel: "N/A",
      weightedBreakdown: breakdown,
      tacticBoosts: [],
      tacticPenalties: [],
      missingAttrCount: missingAttrCount,
      weightedAttrCount: attrKeys.filter(function (k) { return weights[k] > 0; }).length,
      eliteBonusApplied: 0,
      sumPossible: sumPossible
    };
  }

  var boosts = [];
  var penalties = [];
  Object.keys(weights).forEach(function (attr) {
    if (weights[attr] <= 0) return;
    var base = baseWeights[attr] || 0;
    if (base === 0) return;
    var delta = weights[attr] - base;
    if (delta > 0) {
      boosts.push(attr + " +" + delta);
    } else if (delta < 0) {
      penalties.push(attr + " " + delta);
    }
  });

  return {
    total: total,
    fitLabel: fitLabel,
    weightedBreakdown: breakdown,
    tacticBoosts: boosts,
    tacticPenalties: penalties,
    missingAttrCount: missingAttrCount,
    weightedAttrCount: attrKeys.filter(function (k) { return weights[k] > 0; }).length,
    eliteBonusApplied: eliteBonusApplied,
    sumPossible: sumPossible
  };
}

// ─── STEP 3: Score Player For Tactic Slot (Flank-Aware) ───

function scorePlayerForTacticSlot(player, slotId) {
  var slot = window.FM24State.tactic.slots[slotId];
  if (!slot) return null;

  if (!isFlankEligible(player, slotId)) return null;

  var slotDef = getSlotDef(slotId);
  if (!slotDef) return null;

  var pStrata = player.strata;
  if (!pStrata || !Array.isArray(pStrata) || pStrata.indexOf(slotDef.strata) === -1) return null;

  if (!slot.roleId) return null;

  var result = scorePlayerForRole(player, slot.roleId, window.FM24State.tactic.instructions);

  var footBonus = getFootBonus(player, slotId, slotDef, slot.roleId);
  if (footBonus > 0) {
    result.total = Math.round((result.total + footBonus) * 10) / 10;
    result.footBonus = footBonus;
    if (result.total >= 17) result.fitLabel = "Elite Fit";
    else if (result.total >= 14) result.fitLabel = "Strong Fit";
    else if (result.total >= 11) result.fitLabel = "Decent Fit";
    else if (result.total >= 8) result.fitLabel = "Marginal Fit";
  }

  return result;
}

// ─── STEP 4: Rank Players For Slot ───

function rankPlayersForSlot(players, slotId) {
  var results = [];

  for (var i = 0; i < players.length; i++) {
    var score = scorePlayerForTacticSlot(players[i], slotId);
    if (score === null) continue;
    results.push({ player: players[i], score: score });
  }

  results.sort(function (a, b) {
    var d = b.score.total - a.score.total;
    if (d !== 0) return d;
    return b.score.sumPossible - a.score.sumPossible;
  });

  return results;
}

// ─── STEP 5: Find Best Tactic Fit For Player ───

function findBestTacticFitForPlayer(player) {
  if (!window.FM24State.tactic.isComplete) return [];

  var results = [];
  var slots = window.FM24State.tactic.slots;
  var slotIds = Object.keys(slots);

  for (var i = 0; i < slotIds.length; i++) {
    var slotId = slotIds[i];
    var score = scorePlayerForTacticSlot(player, slotId);
    if (score === null) continue;

    var slot = slots[slotId];
    var role = null;
    for (var j = 0; j < FM24_ROLES.length; j++) {
      if (FM24_ROLES[j].id === slot.roleId) { role = FM24_ROLES[j]; break; }
    }

    var slotDef = getSlotDef(slotId);

    results.push({
      slotId: slotId,
      roleId: slot.roleId,
      roleName: role ? role.name : "Unknown",
      duty: role ? role.duty : slot.duty,
      flank: slotDef ? slotDef.flank : "",
      score: score
    });
  }

  results.sort(function (a, b) { return b.score.total - a.score.total; });

  // Deduplicate by roleId: keep only the highest-scoring entry per role
  var seenRole = {};
  results = results.filter(function (r) {
    if (seenRole[r.roleId]) return false;
    seenRole[r.roleId] = true;
    return true;
  });

  return results;
}

// ─── STEP 6: Get Tactic Context Summary ───

function getTacticContextSummary() {
  var instr = window.FM24State.tactic.instructions;
  var activeKeys = Object.keys(instr);
  var active = [];

  for (var k = 0; k < activeKeys.length; k++) {
    var key = activeKeys[k];
    var val = instr[key];
    if (val === null || val === undefined) continue;
    if (typeof val === "boolean" && !val) continue;
    var lookupKey = key + ":" + (typeof val === "boolean" ? "true" : val);
    var mod = INSTRUCTION_WEIGHT_MODIFIERS[lookupKey];
    if (mod) {
      active.push({ key: key, value: val, modifiers: mod });
    }
  }

  if (active.length === 0) {
    return {
      headline: "No instructions set \u2014 using base role weights.",
      keyDemands: [],
      reduced: []
    };
  }

  var tags = [];

  if (instr.triggerPress === "Much More Often" || instr.triggerPress === "More Often") tags.push("High Press");
  if (instr.lineOfEngagement === "High") tags.push("High Line of Engagement");
  if (instr.defensiveLine === "Much Higher" || instr.defensiveLine === "Higher") tags.push("High Defensive Line");
  if (instr.defensiveLine === "Much Lower" || instr.defensiveLine === "Lower") tags.push("Deep Defensive Line");
  if (instr.whenPossessionLost === "Counter-Press") tags.push("Counter-Press");
  if (instr.whenPossessionWon === "Counter") tags.push("Counter-Attacking");
  if (instr.passingDirectness === "Extremely Direct" || instr.passingDirectness === "Much More Direct") tags.push("Direct");
  if (instr.passingDirectness === "Extremely Short" || instr.passingDirectness === "Much Shorter") tags.push("Short Passing");
  if (instr.tempo === "Extremely High" || instr.tempo === "Much Higher") tags.push("Fast Tempo");
  if (instr.tempo === "Extremely Low" || instr.tempo === "Much Lower") tags.push("Slow Tempo");
  if (instr.playOutOfDefence === true) tags.push("Build from Back");
  if (instr.passIntoSpace === true) tags.push("Pass into Space");
  if (instr.runAtDefence === true) tags.push("Run at Defence");
  if (instr.shootOnSight === true) tags.push("Shoot on Sight");
  if (instr.creativeFreedom === "More Expressive") tags.push("Expressive");
  if (instr.creativeFreedom === "More Disciplined") tags.push("Disciplined");
  if (instr.tackling === "Get Stuck In") tags.push("Aggressive Tackling");

  var headline = tags.length > 0 ? tags.join(", ") : "Custom tactic";

  var demandMap = {};
  var reducedMap = {};

  for (var a = 0; a < active.length; a++) {
    var modKeys = Object.keys(active[a].modifiers);
    for (var m = 0; m < modKeys.length; m++) {
      var attr = modKeys[m];
      var delta = active[a].modifiers[attr];
      if (delta >= 1) {
        demandMap[attr] = (demandMap[attr] || 0) + delta;
      } else if (delta <= -1) {
        reducedMap[attr] = (reducedMap[attr] || 0) + Math.abs(delta);
      }
    }
  }

  var demandKeys = Object.keys(demandMap);
  demandKeys.sort(function (a, b) { return demandMap[b] - demandMap[a]; });
  var keyDemands = [];
  for (var d = 0; d < demandKeys.length; d++) {
    var displayed = Math.min(demandMap[demandKeys[d]] || 0, 5);
    if (displayed > 0) keyDemands.push(demandKeys[d] + " (bonus +" + displayed + ")");
  }

  var reducedKeys = Object.keys(reducedMap);
  reducedKeys.sort(function (a, b) { return reducedMap[b] - reducedMap[a]; });
  var reduced = [];
  for (var r = 0; r < reducedKeys.length; r++) {
    var displayed = Math.min(reducedMap[reducedKeys[r]] || 0, 5);
    if (displayed > 0) reduced.push(reducedKeys[r] + " (reduced -" + displayed + ")");
  }

  return {
    headline: headline,
    keyDemands: keyDemands,
    reduced: reduced
  };
}