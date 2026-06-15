(function (global) {
  "use strict";

  var isWonderkid = null;
  var paAvailable = null;
  var candidateScores = {};

  // ══════════════════════════════════════════════════════════════════
  // TRANSFER WINDOW SIMULATION v3
  // All mechanics from FM24 HTML export columns only.
  // ══════════════════════════════════════════════════════════════════

  // ─── ATTRIBUTE ACCESS HELPERS ───

  function getMgrAttr(manager, key) {
    if (!manager) return 0;
    var mappings = {
      Judge_P: ["Judge P", "Judge_P", "Judging Player Potential", "JudgingPlayerPotential"],
      Judge_A: ["Judge A", "Judge_A", "Judging Player Ability", "JudgingPlayerAbility"],
      Youth: ["Youth", "Working with Youngsters", "WorkingWithYoungsters"],
      Amb: ["Amb", "Ambition"],
      Det: ["Det", "Determination"],
      Prof: ["Prof", "Professionalism"],
      Temp: ["Temp", "Temperament"],
      Loy: ["Loy", "Loyalty"],
      Pres: ["Pres", "Pressure Handling", "PressureHandling"],
      Tac_Knw: ["Tac Knw", "Tac_Knw", "Tactical Knowledge", "TacticalKnowledge"]
    };
    var candidates = mappings[key] || [key];
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (manager[c] !== undefined && manager[c] !== null && manager[c] !== "") {
        var val = parseInt(manager[c], 10);
        if (!isNaN(val)) return val;
      }
    }
    return 0;
  }

  function getPlayerAttr(player, key) {
    if (!player) return 0;
    var mappings = {
      Cons: ["Cons", "Consistency"],
      Prof: ["Prof", "Professionalism"],
      Imp_M: ["Imp M", "Imp_M", "Important Matches", "ImportantMatches"],
      Det: ["Det", "Determination"],
      Ldr: ["Ldr", "Leadership"],
      Amb: ["Amb", "Ambition"]
    };
    var candidates = mappings[key] || [key];
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (player[c] !== undefined && player[c] !== null && player[c] !== "") {
        var val = parseInt(player[c], 10);
        if (!isNaN(val)) return val;
      }
    }
    return 0;
  }

  // ─── PHASE 1: RELIABILITY RATING ───

  function reliabilityRating(player) {
    return typeof PlayerUtils !== "undefined" ? PlayerUtils.reliabilityRating(player) : 0;
  }

  // ─── MANAGER ARCHETYPE & HYBRID RESOLUTION ───

  function resolveArchetype(manager) {
    var Tac_Knw = getMgrAttr(manager, "Tac_Knw");
    var Det = getMgrAttr(manager, "Det");
    var Youth = getMgrAttr(manager, "Youth");
    var Judge_P = getMgrAttr(manager, "Judge_P");
    var Prof = getMgrAttr(manager, "Prof");
    var Temp = getMgrAttr(manager, "Temp");
    var Judge_A = getMgrAttr(manager, "Judge_A");
    var Pres = getMgrAttr(manager, "Pres");
    var Amb = getMgrAttr(manager, "Amb");
    var Loy = getMgrAttr(manager, "Loy");

    if (Tac_Knw >= 15 && Det >= 14) return 'IDENTITY_ARCHITECT';
    if (Youth >= 15 && Judge_P >= 14) return 'DEVELOPER';
    if (Prof >= 15 && Temp >= 14 && Judge_A >= 13) return 'PHILOSOPHER';
    if (Judge_A >= 15 && Pres >= 13 && Youth <= 10) return 'RECYCLER';
    if (Amb >= 15 && Pres >= 14) return 'OPPORTUNIST';
    if (Loy >= 15 && Prof >= 14) return 'STATESMAN';
    if (Amb >= 14 && Pres <= 8) return 'PRESSURE_BUYER';
    if (Det >= 15 && Judge_A >= 13 && Loy <= 9) return 'SELL_TO_BUY';

    return 'OPPORTUNIST';
  }

  function resolveHybridTags(manager) {
    var Amb = getMgrAttr(manager, "Amb");
    var Loy = getMgrAttr(manager, "Loy");
    var Pres = getMgrAttr(manager, "Pres");
    var Prof = getMgrAttr(manager, "Prof");

    var tags = [];
    if (Amb >= 15)           tags.push('AGGRESSIVE');
    if (Loy >= 15 && Amb <= 8) tags.push('FRUGAL');
    if (Pres >= 15)          tags.push('RISK_TOLERANT');
    if (Prof >= 16)          tags.push('CONSERVATIVE');
    return tags;
  }

  function getArchetypeModifiers(archetype, tags) {
    var base = {
      scoutNoiseMultiplier:   1.00,  // multiplies base ±15% noise
      paWeightInShortlist:    false, // whether PA factors into candidate ranking
      characterFilterEnabled: false, // Prof/Det floor on candidates
      youngsterProtection:    false, // prevents young high-PA surplus being sold
      agePrefMin:             16,    // minimum candidate age preference
      agePrefMax:             35,    // maximum candidate age preference
      bidOpenMultiplier:      0.90,  // starting bid as % of AP
      bidGrowthRate:          1.07,  // bid growth per round
      bidCeilingPct:          0.65,  // max % of transferBudget on one player
      sellerCounterBase:      1.02,  // seller's round-0 counter as % of AP
      sellerCounterDecay:     0.03,  // seller softens by this % per round
      collapseChanceBase:     0.07,  // base deal collapse probability
      surplusThresholdBonus:  0.0,   // how far below threshold before listing
      saleFloorMultiplier:    0.80,  // minimum accepted sale price as % of AP
      shortlistSize:          5,     // candidates queued per gap
      panicBudgetCeiling:     0.65   // same as bidCeilingPct unless overridden
    };

    var archetypeOverrides = {
      IDENTITY_ARCHITECT: {
        scoutNoiseMultiplier:  0.80,
        bidOpenMultiplier:     0.88,
        bidCeilingPct:         0.60,
        collapseChanceBase:    0.12,
        surplusThresholdBonus: 0.0
      },
      DEVELOPER: {
        scoutNoiseMultiplier:  0.60,
        paWeightInShortlist:   true,
        youngsterProtection:   true,
        agePrefMax:            24,
        bidOpenMultiplier:     0.87,
        bidCeilingPct:         0.55,
        saleFloorMultiplier:   0.85
      },
      PHILOSOPHER: {
        characterFilterEnabled: true,
        scoutNoiseMultiplier:   0.85,
        shortlistSize:          4,
        bidOpenMultiplier:      0.88,
        collapseChanceBase:     0.10,
        saleFloorMultiplier:    0.82
      },
      RECYCLER: {
        scoutNoiseMultiplier:   0.50,
        agePrefMin:             27,
        paWeightInShortlist:    false,
        bidOpenMultiplier:      0.82,
        bidCeilingPct:          0.55,
        saleFloorMultiplier:    0.75
      },
      OPPORTUNIST: {
        shortlistSize:          1,
        scoutNoiseMultiplier:   1.20,
        bidOpenMultiplier:      0.95,
        bidCeilingPct:          0.70,
        collapseChanceBase:     0.04,
        surplusThresholdBonus:  0.5
      },
      STATESMAN: {
        surplusThresholdBonus: -1.0,
        saleFloorMultiplier:    0.88,
        bidOpenMultiplier:      0.88,
        bidCeilingPct:          0.55,
        bidGrowthRate:          1.04,
        collapseChanceBase:     0.06,
        shortlistSize:          6
      },
      PRESSURE_BUYER: {
        scoutNoiseMultiplier:   1.35,
        bidOpenMultiplier:      0.93,
        bidCeilingPct:          0.75,
        collapseChanceBase:     0.03,
        shortlistSize:          3,
        surplusThresholdBonus:  0.5
      },
      SELL_TO_BUY: {
        surplusThresholdBonus:  0.5,
        saleFloorMultiplier:    0.72,
        bidOpenMultiplier:      0.91,
        bidCeilingPct:          0.68,
        collapseChanceBase:     0.06
      }
    };

    var tagOverrides = {
      AGGRESSIVE: {
        bidOpenMultiplier:  0.95,
        collapseChanceBase: function (mod) { return mod.collapseChanceBase * 0.50; }
      },
      FRUGAL: {
        bidCeilingPct:      0.50,
        bidOpenMultiplier:  function (mod) { return Math.min(mod.bidOpenMultiplier, 0.88); }
      },
      RISK_TOLERANT: {
        characterFilterEnabled: false,
        scoutNoiseMultiplier:   function (mod) { return mod.scoutNoiseMultiplier * 1.10; }
      },
      CONSERVATIVE: {
        bidCeilingPct:      function (mod) { return mod.bidCeilingPct * 0.90; }
      }
    };

    var mods = Object.assign({}, base, archetypeOverrides[archetype] || {});

    tags.forEach(function (tag) {
      var overrides = tagOverrides[tag];
      if (overrides) {
        Object.keys(overrides).forEach(function (key) {
          var val = overrides[key];
          mods[key] = typeof val === 'function' ? val(mods) : val;
        });
      }
    });

    if (mods.panicBudgetCeiling === undefined || mods.panicBudgetCeiling === base.panicBudgetCeiling) {
      mods.panicBudgetCeiling = mods.bidCeilingPct;
    }

    // 4.3 Contract dispute degradation: reduce all numeric modifiers by 15%
    if (window.FM24State && window.FM24State.manager && window.FM24State.manager.contractDispute) {
      Object.keys(mods).forEach(function (k) {
        if (typeof mods[k] === 'number') {
          mods[k] = mods[k] * 0.85;
        }
      });
    }

    return mods;
  }

  // ─── SQUAD AUDIT: SOLVER + DYNAMIC THRESHOLDS ───

  function runSquadAudit(squad, tactic, mods, manager, archetype) {
    if (!tactic || !tactic.slots) return null;
    paAvailable = typeof PlayerUtils !== "undefined"
      ? PlayerUtils.paAvailableCheck(squad)
      : squad.some(function (p) { return p.PA && p.PA > 0; });
    var instructions = tactic.instructions || {};
    var slotKeys = Object.keys(tactic.slots);
    var playerSlotScores = [];

    for (var pi = 0; pi < squad.length; pi++) {
      var p = squad[pi];
      for (var si = 0; si < slotKeys.length; si++) {
        var sid = slotKeys[si];
        var slot = tactic.slots[sid];
        if (!slot || !slot.roleId) continue;
        if (typeof isFlankEligible === "function" && !isFlankEligible(p, sid)) continue;
        if (typeof scorePlayerForRole !== "function") continue;
        var sc = scorePlayerForRole(p, slot.roleId, instructions);
        if (sc) {
          playerSlotScores.push({ player: p, slotId: sid, roleId: slot.roleId, score: sc.total });
        }
      }
    }

    playerSlotScores.sort(function (a, b) { return b.score - a.score; });

    // Pre-pass: Identify senior players to force sell
    var forceSellPlayers = {};
    if (typeof PlayerUtils !== "undefined") {
      squad.forEach(function (player) {
        var pd = PlayerUtils.getPTDelta ? PlayerUtils.getPTDelta(player) : { direction: 'on-track', delta: 0 };
        var age = player.Age || 0;
        if (pd.direction === 'underperforming' && typeof pd.delta === 'number' && pd.delta <= -2 && age >= 24) {
          forceSellPlayers[player.Name] = true;
        }
      });
    }

    // Pass 1: Assign Starting XI
    var startersMap = {};
    var assignedStarters = {};
    for (var i = 0; i < playerSlotScores.length; i++) {
      var entry = playerSlotScores[i];
      if (startersMap[entry.slotId]) continue;
      if (assignedStarters[entry.player.Name]) continue;
      if (forceSellPlayers[entry.player.Name]) continue; // Skip force sell players
      startersMap[entry.slotId] = { player: entry.player, score: entry.score };
      assignedStarters[entry.player.Name] = true;
    }

    // Squad quality
    var totalStarterScore = 0;
    var starterCount = 0;
    for (var sid in startersMap) {
      totalStarterScore += startersMap[sid].score;
      starterCount++;
    }
    var squadQuality = starterCount > 0 ? (totalStarterScore / starterCount) : 13.0;

    var dynamicThreshold = Math.max(11.0, Math.min(15.0, squadQuality - 0.5));

    // Manager attribute nudges
    var tacKnw = getMgrAttr(manager, "Tac_Knw");
    var judgeA = getMgrAttr(manager, "Judge_A");
    var tacKnwBonus = (tacKnw - 10) / 10 * 0.5;
    var judgeABonus = (judgeA - 10) / 10 * 0.3;

    dynamicThreshold = Math.max(11.0, Math.min(15.5, dynamicThreshold + tacKnwBonus));
    dynamicThreshold = Math.round(dynamicThreshold * 10) / 10;

    var dynamicBackupThreshold = dynamicThreshold - 2.5;
    dynamicBackupThreshold = Math.round(dynamicBackupThreshold * 10) / 10;

    var candidateMinScore = Math.max(10.5, Math.min(14.5, (dynamicThreshold - 1.0) + judgeABonus));
    candidateMinScore = Math.round(candidateMinScore * 10) / 10;

    // Pass 2: Backup depth
    var backupsMap = {};
    var assignedBackups = {};
    for (var i = 0; i < playerSlotScores.length; i++) {
      var entry = playerSlotScores[i];
      if (assignedStarters[entry.player.Name]) continue;
      if (backupsMap[entry.slotId]) continue;
      if (assignedBackups[entry.player.Name]) continue;
      if (forceSellPlayers[entry.player.Name]) continue; // Skip force sell players
      if (entry.score >= dynamicBackupThreshold) {
        backupsMap[entry.slotId] = { player: entry.player, score: entry.score };
        assignedBackups[entry.player.Name] = true;
      }
    }

    // Reset status fields so they don't carry over stale/previous run values
    squad.forEach(function (player) {
      if (player.status === 'PROTECTED' || player.status === 'FORCE_SELL') {
        player.status = undefined;
      }
      player.protectedByPT = undefined;
    });

    // Unconditional youngster protection pre-pass (before surplus designation)
    squad.forEach(function (player) {
      if (assignedStarters[player.Name] || assignedBackups[player.Name]) return;
      if (isWonderkid && isWonderkid(player)) {
        player.status = 'PROTECTED';
      }
    });

    // DEVELOPER archetype enhancement pass
    if (archetype === 'DEVELOPER') {
      squad.forEach(function (player) {
        if (assignedStarters[player.Name] || assignedBackups[player.Name]) return;
        if (player.status !== 'PROTECTED') {
          var matchesDev = false;
          if (paAvailable) {
            matchesDev = player.Age <= 25 && player.PA && player.PA > player.CA + 15;
          } else {
            matchesDev = player.Age <= 21;
          }
          if (matchesDev) {
            player.status = 'PROTECTED';
          }
        }
      });
    }

    // New playing time protection / force sell rules
    if (typeof PlayerUtils !== "undefined") {
      squad.forEach(function (player) {
        var ml = PlayerUtils.getMinutesLoad ? PlayerUtils.getMinutesLoad(player) : { tier: 'absent' };
        var pb = PlayerUtils.getPerformanceBand ? PlayerUtils.getPerformanceBand(player) : { band: 'no-data' };
        
        // Rule 1: tier == 'starter' && band in ['elite', 'strong'] -> PROTECT
        if (ml.tier === 'starter' && (pb.band === 'elite' || pb.band === 'strong')) {
          player.status = 'PROTECTED';
          player.protectedByPT = true;
        }

        // Rule 2: force sell
        if (forceSellPlayers[player.Name]) {
          player.status = 'FORCE_SELL';
        }
      });
    }

    // Designations + flags
    var designations = [];
    var unreliableStarters = [];
    var surplusPool = [];

    for (var pi = 0; pi < squad.length; pi++) {
      var p = squad[pi];
      var isStarter = assignedStarters[p.Name];
      var isBackup = assignedBackups[p.Name];

      if (isStarter) {
        var slotId = null;
        var score = 0;
        for (var sid in startersMap) {
          if (startersMap[sid].player.Name === p.Name) {
            slotId = sid;
            score = startersMap[sid].score;
            break;
          }
        }
        var rel = reliabilityRating(p);
        var unreliable = rel < 9;
        designations.push({
          player: p,
          designation: "Keep",
          slotId: slotId,
          score: score,
          reason: "Starting XI (" + slotId + ")",
          reliability: rel,
          unreliable: unreliable
        });
        if (unreliable) {
          unreliableStarters.push({ player: p, slotId: slotId, score: score, reliability: rel });
        }
      } else if (isBackup) {
        var slotId = null;
        var score = 0;
        for (var sid in backupsMap) {
          if (backupsMap[sid].player.Name === p.Name) {
            slotId = sid;
            score = backupsMap[sid].score;
            break;
          }
        }
        designations.push({
          player: p,
          designation: "Depth",
          slotId: slotId,
          score: score,
          reason: "Squad Depth (" + slotId + ")",
          reliability: reliabilityRating(p)
        });
      } else {
        var bestScore = 0;
        var bestSlot = null;
        for (var i = 0; i < playerSlotScores.length; i++) {
          if (playerSlotScores[i].player.Name === p.Name && playerSlotScores[i].score > bestScore) {
            bestScore = playerSlotScores[i].score;
            bestSlot = playerSlotScores[i].slotId;
          }
        }

        if (p.status === 'FORCE_SELL') {
          p.status = 'Sell';
          designations.push({
            player: p,
            designation: "Sell",
            slotId: bestSlot,
            score: bestScore,
            reason: "Underperforming senior player",
            reliability: reliabilityRating(p)
          });
          surplusPool.push({ player: p, fitScore: bestScore });
        } else if (p.status === 'PROTECTED') {
          var protectReason = p.protectedByPT ? "Key Player Retention" : "Young Prospect";
          designations.push({
            player: p,
            designation: "Keep",
            slotId: bestSlot,
            score: bestScore,
            reason: protectReason,
            reliability: reliabilityRating(p)
          });
        } else {
          var effectiveSurplusThreshold = dynamicThreshold - (mods ? mods.surplusThresholdBonus : 0);
          // Playing time evidence booster
          var ptBoost = 0;
          var ptReasons = [];
          if (typeof PlayerUtils !== "undefined" && PlayerUtils.getMinutesLoad) {
            var ptLoad = PlayerUtils.getMinutesLoad(p);
            var ptDelta = PlayerUtils.getPTDelta(p);
            var ptBand = PlayerUtils.getPerformanceBand(p);
            if (ptLoad.tier === 'absent' && p.AgreedPT && p.AgreedPT !== 'Backup') { ptBoost += 2; ptReasons.push('Played only ' + (p.Mins || 0) + ' mins vs agreed role: ' + (p.AgreedPT || 'none')); }
            if (ptDelta.delta <= -2) { ptBoost += 2; ptReasons.push('Agreed: ' + (p.AgreedPT || 'none') + ' · Actual: ' + (p.ActualPT || 'none') + ' (' + ptDelta.delta + ' tiers)'); }
            if (ptDelta.delta === -1) { ptBoost += 1; ptReasons.push(ptDelta.label); }
            if (ptBand.band === 'poor' && p.Mins >= 600) { ptBoost += 1; ptReasons.push('Average rating ' + p.AvRat + ' in ' + p.Mins + ' minutes'); }
            if (ptLoad.tier === 'starter' && (ptBand.band === 'elite' || ptBand.band === 'strong')) { ptBoost -= 2; }
          }
          var boostedThreshold = effectiveSurplusThreshold - ptBoost;
          if (bestScore < boostedThreshold) {
            p.status = 'Sell';
            var reasonText = bestScore < dynamicBackupThreshold ? "Poor tactical fit" : "Surplus to requirements";
            if (ptReasons.length > 0) reasonText += ' · ' + ptReasons[0];
            designations.push({
              player: p,
              designation: "Sell",
              slotId: bestSlot,
              score: bestScore,
              reason: reasonText,
              reliability: reliabilityRating(p)
            });
            surplusPool.push({ player: p, fitScore: bestScore });
          } else {
            p.status = 'Keep';
            designations.push({
              player: p,
              designation: "Keep",
              slotId: bestSlot,
              score: bestScore,
              reason: "Tactical fit backup",
              reliability: reliabilityRating(p)
            });
          }
        }
      }
    }

    // Unresolved gaps: slots without starter, starter score < dynamicThreshold, OR starter reliabilityRating < 9
    var unresolved = [];
    for (var si = 0; si < slotKeys.length; si++) {
      var sid = slotKeys[si];
      var slot = tactic.slots[sid];
      if (!slot || !slot.roleId) continue;
      var starter = startersMap[sid];
      var starterScore = starter ? starter.score : -1;
      var isUnreliable = starter ? (reliabilityRating(starter.player) < 9) : false;

      if (starterScore < dynamicThreshold || isUnreliable) {
        var priority = typeof getSlotPriority !== "undefined" ? getSlotPriority(sid) : "Depth";
        unresolved.push({
          slotId: sid,
          priority: priority,
          currentBest: starterScore,
          buyThreshold: candidateMinScore,
          starter: starter || null,
          softGap: isUnreliable && starterScore >= dynamicThreshold
        });
      }
    }

    unresolved.sort(function (a, b) {
      var order = { Critical: 0, Important: 1, Depth: 2 };
      return (order[a.priority] || 3) - (order[b.priority] || 3);
    });

    var starters = [];
    for (var sid in startersMap) {
      var st = startersMap[sid];
      starters.push({
        slot: tactic.slots[sid],
        player: st.player,
        fitScore: st.score,
        reliable: reliabilityRating(st.player) >= 9
      });
    }

    // 5.2 Fit decay projection for aging starters
    var successionFlags = [];
    if (typeof PlayerUtils !== "undefined" && PlayerUtils.projectFitDecay) {
      for (var fsi = 0; fsi < starters.length; fsi++) {
        var st = starters[fsi];
        var decay = PlayerUtils.projectFitDecay(st.player, st.fitScore, dynamicThreshold);
        if (decay) {
          successionFlags.push({
            player: st.player,
            slot: st.slot,
            fitScore: st.fitScore,
            projectedScore: decay.projectedScore,
            urgency: decay.urgency,
            flag: decay.flag
          });
        }
      }
    }

    return {
      designations: designations,
      starters: starters,
      startersMap: startersMap,
      backupsMap: backupsMap,
      unresolved: unresolved,
      surplusPool: surplusPool,
      unreliableStarters: unreliableStarters,
      dynamicThreshold: dynamicThreshold,
      dynamicBackupThreshold: dynamicBackupThreshold,
      candidateMinScore: candidateMinScore,
      squadQuality: squadQuality,
      successionFlags: successionFlags
    };
  }

  // ─── PHASE 2: OUTGOING PIPELINE ───

  function getAgeDecay(age) {
    if (age <= 28) return 0;
    if (age <= 32) return (age - 28) * 0.4;
    return 1.6 + (age - 32) * 0.8;
  }

  function getNegotiatedWage(candidate) {
    var baseWage = candidate.Wage || 0;
    var amb = getPlayerAttr(candidate, "Amb");
    var prof = getPlayerAttr(candidate, "Prof");
    var premium = 1.0;
    if (amb >= 14) premium += (amb - 13) * 0.03;
    if (prof >= 14) premium -= (prof - 13) * 0.02;
    return Math.round(baseWage * premium);
  }

  function classifyTier(player, fitScore, mods, dynamicThreshold, isWonderkidFn) {
    if (player.status === 'FORCE_SELL')
      return 'SELL';

    var isW = false;
    if (typeof isWonderkidFn === "function") {
      isW = isWonderkidFn(player);
    } else if (typeof PlayerUtils !== "undefined" && PlayerUtils.isWonderkid) {
      var paAvail = player.PA && player.PA > 0;
      isW = PlayerUtils.isWonderkid(player, paAvail);
    } else {
      isW = player.Age <= 23 && (player.PA || 0) > (player.CA || 0) + 20;
    }

    if (player.status === 'PROTECTED') {
      if (player.protectedByPT) {
        return 'KEEP';
      }
      if (isW) {
        var ml = (typeof PlayerUtils !== "undefined" && PlayerUtils.getMinutesLoad) ? PlayerUtils.getMinutesLoad(player) : { tier: 'absent' };
        var agreed = player.AgreedPT || '';
        if ((ml.tier === 'fringe' || ml.tier === 'absent' || ml.tier === 'unused') &&
            (agreed === 'Youngster' || agreed === 'Squad Player' || agreed === 'Hot Prospect' || agreed === 'Fringe Player' || !agreed)) {
          return 'LOAN';
        }
      }
      return 'KEEP';
    }

    var decayedFitScore = fitScore - getAgeDecay(player.Age);

    if (player.Age >= 29 && (player.CA || 0) < 130)
      return 'RELEASE';

    if (isW) {
      var ml = (typeof PlayerUtils !== "undefined" && PlayerUtils.getMinutesLoad) ? PlayerUtils.getMinutesLoad(player) : { tier: 'absent' };
      var agreed = player.AgreedPT || '';
      if ((ml.tier === 'fringe' || ml.tier === 'absent' || ml.tier === 'unused') &&
          (agreed === 'Youngster' || agreed === 'Squad Player' || agreed === 'Hot Prospect' || agreed === 'Fringe Player' || !agreed)) {
        return 'LOAN';
      } else {
        return 'KEEP';
      }
    }

    var effectiveThreshold = dynamicThreshold - mods.surplusThresholdBonus;
    if (decayedFitScore < effectiveThreshold)
      return 'SELL';

    return 'KEEP';
  }

  function refusesListing(player) {
    var det = getPlayerAttr(player, "Det");
    return det >= 15 && Math.random() < 0.25;
  }

  function negotiateSale(player, mods) {
    var apMult = typeof PlayerUtils !== "undefined" && PlayerUtils.getApMultiplier ? PlayerUtils.getApMultiplier(player) : 1.0;
    var askingPrice = (player.AP || 0) * apMult;
    var sold = false;
    var saleRevenue = 0;
    var det = getPlayerAttr(player, "Det");
    var prof = getPlayerAttr(player, "Prof");
    var amb = getPlayerAttr(player, "Amb");
    var round = 0;

    for (round = 0; round < 3; round++) {
      var buyerOffer = askingPrice * (0.72 + Math.random() * 0.22 + (prof / 20) * 0.02);
      var floorPrice = (player.AP || 0) * mods.saleFloorMultiplier * apMult;

      if (buyerOffer >= floorPrice) {
        sold = true;
        saleRevenue = buyerOffer;
        break;
      }

      askingPrice *= (0.94 - (amb / 20) * 0.02);

      var walkAwayChance = 0.08 + (det / 20) * 0.06 - (prof / 20) * 0.04;
      if (Math.random() < walkAwayChance) break;
    }

    var buyerClub = "Unknown Club";
    if (sold) {
      buyerClub = typeof getRealisticClubForPlayer === "function"
        ? getRealisticClubForPlayer(player, "sale")
        : "Unknown Club";
    }

    return sold
      ? { outcome: 'SOLD', revenue: saleRevenue, rounds: Math.min(3, round + 1), buyerClub: buyerClub }
      : { outcome: 'UNSOLD', rounds: Math.min(3, round + 1) };
  }

  // ─── PHASE 3: SCOUTING NOISE ───

  function adjustedNoise(candidate, mods) {
    var prof = getPlayerAttr(candidate, "Prof");
    var baseProfFactor = prof / 20;
    var baseNoise = 0.15 * (1.5 - baseProfFactor);
    return baseNoise * mods.scoutNoiseMultiplier;
  }

  function scoutedScore(candidate, mods) {
    var noise = adjustedNoise(candidate, mods);
    var multiplier = 1 - noise + Math.random() * (noise * 2);
    return candidate.fitScore * multiplier;
  }

  // ─── SHORTLIST BUILDER ───

  function buildShortlist(gap, marketPlayers, signedNames, currentSquadNames, mods, archetype, instructions, slot) {
    var pool = marketPlayers.filter(function (p) {
      return !currentSquadNames[p.Name] && !signedNames[p.Name];
    });

    pool = pool.filter(function (p) {
      return p.Age >= mods.agePrefMin && p.Age <= mods.agePrefMax;
    });

    if (typeof isFlankEligible === "function") {
      pool = pool.filter(function (p) {
        return isFlankEligible(p, gap.slotId);
      });
    }

    pool = pool.map(function (p) {
      var sc = scorePlayerForRole(p, slot.roleId, instructions);
      var clone = Object.assign({}, p);
      clone.fitScore = sc ? sc.total : 0;
      return clone;
    });

    if (mods.characterFilterEnabled) {
      pool = pool.filter(function (p) {
        var prof = getPlayerAttr(p, "Prof");
        var det = getPlayerAttr(p, "Det");
        return prof >= 10 && det >= 8;
      });
    }

    var fitFloor = archetype === 'IDENTITY_ARCHITECT'
      ? gap.buyThreshold + 1.5
      : gap.buyThreshold;

    pool = pool.filter(function (p) {
      return scoutedScore(p, mods) >= fitFloor;
    });

    pool.sort(function (a, b) {
      var scoreA = mods.paWeightInShortlist
        ? scoutedScore(a, mods) * 0.70 + ((a.PA || 0) / 200) * 20 * 0.30
        : scoutedScore(a, mods);
      var scoreB = mods.paWeightInShortlist
        ? scoutedScore(b, mods) * 0.70 + ((b.PA || 0) / 200) * 20 * 0.30
        : scoutedScore(b, mods);
      return scoreB - scoreA;
    });

    return pool.slice(0, mods.shortlistSize).map(function (p) {
      var noise = adjustedNoise(p, mods);
      var sScore = scoutedScore(p, mods);
      return {
        player: p,
        rawFitScore: p.fitScore,
        scoutedScore: sScore,
        noise: noise,
        slotId: gap.slotId,
        roleId: slot.roleId
      };
    });
  }

  // ─── PHASE 4: WILLINGNESS SCORE ───

  function willingnessScore(candidate, ledger) {
    var score = 0;
    var prof = getPlayerAttr(candidate, "Prof");
    var det = getPlayerAttr(candidate, "Det");

    if (prof >= 14) score += 30;

    if (isWonderkid && isWonderkid(candidate)) score += 25;

    if (candidate.Age >= 28 && det >= 14) score -= 25;

    // 5.5 Effective wage demand
    var effectiveWage = typeof PlayerUtils !== "undefined"
      ? PlayerUtils.getEffectiveWageDemand(candidate)
      : (candidate.Wage || 0);
    var wageAffordable = (ledger.wageBudget - ledger.weeklyWageBill) >= effectiveWage;
    if (wageAffordable) score += 30;
    else score -= 20;

    score += 15; // base openness

    return score;
  }

  // ─── PHASE 5: BID LOOP ───

  function attemptTransfer(candidate, ledger, mods) {
    // 5.1 Apply candidate negotiation profile — overrides collapse and seller counter
    var profile = typeof PlayerUtils !== "undefined"
      ? PlayerUtils.getCandidateNegotiationProfile(candidate)
      : { style: 'STANDARD', collapseModifier: 1.0, sellerCounterBase: 1.02, wageFlexibility: 1.0 };

    var effectiveCollapseBase = mods.collapseChanceBase * profile.collapseModifier;
    var effectiveCounterBase = profile.sellerCounterBase;

    // 5.3 Stale market pricing — use effective AP
    var signingHistory = window.FM24State && window.FM24State.signingHistory ? window.FM24State.signingHistory : [];
    var effectiveAP = typeof PlayerUtils !== "undefined"
      ? PlayerUtils.getEffectiveAP(candidate, signingHistory)
      : (candidate.AP || 0);
    // Playing time performance multiplier
    if (typeof PlayerUtils !== "undefined" && PlayerUtils.getApMultiplier) {
      effectiveAP *= PlayerUtils.getApMultiplier(candidate);
    }

    var hardCeiling = ledger.transferBudget * mods.bidCeilingPct;
    var bid = effectiveAP * mods.bidOpenMultiplier;

    if (bid > hardCeiling) {
      return { outcome: 'WITHDREW', reason: 'budget_ceiling', rounds: 1 };
    }

    var det = getPlayerAttr(candidate, "Det");
    var amb = getPlayerAttr(candidate, "Amb");
    var prof = getPlayerAttr(candidate, "Prof");
    var round = 0;

    for (round = 0; round < 3; round++) {
      var agitationDecayBonus = (amb / 20) * 0.03;
      var sellerCounter = effectiveAP * (effectiveCounterBase - round * (mods.sellerCounterDecay + agitationDecayBonus));

      if (bid >= sellerCounter) {
        return { outcome: 'SIGNED', fee: bid, rounds: Math.min(3, round + 1) };
      }

      if (bid >= hardCeiling) {
        return { outcome: 'WITHDREW', reason: 'budget_ceiling', rounds: Math.min(3, round + 1) };
      }

      var collapseChance = effectiveCollapseBase + (det / 20) * 0.08 + (amb / 20) * 0.06 - (prof / 20) * 0.05;
      collapseChance = Math.max(0.01, Math.min(collapseChance, 0.45));
      if (Math.random() < collapseChance) {
        // 5.1 VOLATILE renegotiates after collapse
        if (profile.renegotiates && round < 2) {
          effectiveCounterBase = 1.10;
          bid = Math.min(bid * 0.85, hardCeiling);
          continue;
        }
        return { outcome: 'COLLAPSED', reason: 'seller_held_firm', rounds: Math.min(3, round + 1) };
      }

      bid = Math.min(bid * mods.bidGrowthRate, hardCeiling);
      if (bid >= sellerCounter) {
        return { outcome: 'SIGNED', fee: bid, rounds: Math.min(3, round + 1) };
      }
    }

    return { outcome: 'COLLAPSED', reason: 'max_rounds_reached', rounds: 3 };
  }

  // ─── PHASE 6: DUAL BUDGET LEDGER ───

  function canAfford(candidate, ledger, mods) {
    // 5.3 Stale market pricing
    var signingHistory = window.FM24State && window.FM24State.signingHistory ? window.FM24State.signingHistory : [];
    var effectiveAP = typeof PlayerUtils !== "undefined"
      ? PlayerUtils.getEffectiveAP(candidate, signingHistory)
      : (candidate.AP || 0);
    var transferOk = effectiveAP <= ledger.transferBudget * mods.bidCeilingPct;
    // 5.5 Effective wage demand
    var effectiveWage = typeof PlayerUtils !== "undefined"
      ? PlayerUtils.getEffectiveWageDemand(candidate)
      : getNegotiatedWage(candidate);
    var wageOk = (ledger.weeklyWageBill + effectiveWage) <= ledger.wageBudget;
    return { transferOk: transferOk, wageOk: wageOk, canSign: transferOk && wageOk, negotiatedWage: effectiveWage, effectiveAP: effectiveAP };
  }

  function triggerEmergencySale(ledger, unsoldSurplus) {
    var victims = unsoldSurplus.filter(function (p) {
      return p.status !== 'REFUSES_LEAVE' && p.status !== 'PROTECTED' && (!p.player || p.player.status !== 'PROTECTED');
    });
    if (victims.length === 0) return null;

    victims.sort(function (a, b) {
      return (a.CA || 0) - (b.CA || 0);
    });

    var victim = victims[0];
    var distressedFee = (victim.AP || 0) * 0.75;
    var buyerClub = typeof getRealisticClubForPlayer === "function"
      ? getRealisticClubForPlayer(victim.player || victim, "emergency")
      : "Unknown Club";
    ledger.transferBudget += distressedFee;
    ledger.weeklyWageBill -= (victim.Wage || 0);
    victim.status = 'EMERGENCY_SOLD';
    victim.buyerClub = buyerClub;
    if (victim.player) {
      victim.player.status = 'EMERGENCY_SOLD';
      victim.player.buyerClub = buyerClub;
    }

    var idx = unsoldSurplus.indexOf(victim);
    if (idx !== -1) {
      unsoldSurplus.splice(idx, 1);
    }

    return {
      name: victim.name || victim.Name,
      player: victim.player || victim,
      distressedFee: distressedFee,
      fee: distressedFee, // backward compatibility
      normalAP: victim.AP,
      buyerClub: buyerClub
    };
  }

  // ─── PHASE 7: SLOT QUALITY ───

  function slotQuality(player, fitScore) {
    return typeof PlayerUtils !== "undefined" ? PlayerUtils.slotQuality(player, fitScore) : 0;
  }

  // ══════════════════════════════════════════════════════════════════
  // MAIN ENTRY POINT
  // ══════════════════════════════════════════════════════════════════

  function simulateTransferWindowV2(manager, squad, market, transferBudget, wageBudget, tactic) {
    // PA availability guard — using PlayerUtils
    paAvailable = typeof PlayerUtils !== "undefined"
      ? PlayerUtils.paAvailableCheck(squad)
      : squad.some(function (p) { return p.PA && p.PA > 0; });
    if (!paAvailable) {
      console.warn(
        '[TransferV2] PA column not detected in squad data. ' +
        'Youngster protection falling back to age-only mode.'
      );
    }
    var archetype = resolveArchetype(manager);
    isWonderkid = typeof PlayerUtils !== "undefined"
      ? PlayerUtils.wonderkidChecker(archetype, paAvailable)
      : function (player) {
          if (paAvailable) {
            var ca = player.CA || 0;
            var paGapThreshold = ca >= 150 ? 10 : ca >= 130 ? 15 : 20;
            return player.Age <= 23 && (player.PA || 0) > ca + paGapThreshold;
          }
          return player.Age <= 19;
        };

    // Reset status/fees on players
    squad.forEach(function (p) {
      delete p.status;
      delete p.saleFee;
    });

    // Archetype + Tags resolution
    var hybridTags = resolveHybridTags(manager);
    var mods = getArchetypeModifiers(archetype, hybridTags);

    // Phase 1: Squad Audit
    var audit = runSquadAudit(squad, tactic, mods, manager, archetype);
    if (!audit) return null;

    // Init ledger
    var ledger = {
      transferBudget: transferBudget,
      wageBudget: wageBudget,
      weeklyWageBill: squad.reduce(function (sum, p) { return sum + (p.Wage || 0); }, 0)
    };

    var eventLog = [];
    var currentDay = 1;

    // Tracking lists
    var soldPlayers = [];
    var releasedPlayers = [];
    var loanedPlayers = [];
    var refusedListings = [];
    var unsoldSurplus = [];
    var signedPlayers = [];
    var dealsCollapsed = [];
    var scoutingBusts = [];
    var emergencySales = [];
    var rivalInflatedDeals = [];
    var protectedLoanees = [];
    var signedNames = {};
    var totalSaleRevenue = 0;

    // Phase 2: Outgoing Pipeline
    for (var si = 0; si < audit.surplusPool.length; si++) {
      var surplusItem = audit.surplusPool[si];
      var player = surplusItem.player;
      var fitScore = surplusItem.fitScore;

      var tier = classifyTier(player, fitScore, mods, audit.dynamicThreshold, isWonderkid);

      if (tier === "RELEASE") {
        player.status = "RELEASED";
        releasedPlayers.push(player);
        ledger.weeklyWageBill -= (player.Wage || 0);
        eventLog.push({ day: currentDay, type: 'RELEASE', player: player.Name, detail: player.Name + ' released on free transfer' });
        currentDay += 1;
      } else if (tier === "LOAN") {
        player.status = "LOANED";
        player.buyerClub = typeof getRealisticClubForPlayer === "function"
          ? getRealisticClubForPlayer(player, "loan")
          : "Unknown Club";
        loanedPlayers.push(player);
        ledger.weeklyWageBill -= (player.Wage || 0);
        eventLog.push({ day: currentDay, type: 'LOAN', player: player.Name, detail: player.Name + ' loaned out to ' + player.buyerClub + ' for development' });
        currentDay += 1;
      } else if (tier === "SELL") {
        if (refusesListing(player)) {
          player.status = "REFUSES_LEAVE";
          refusedListings.push({
            name: player.Name,
            Det: getPlayerAttr(player, "Det"),
            Name: player.Name,
            Age: player.Age,
            Wage: player.Wage
          });
          eventLog.push({ day: currentDay, type: 'LIST_REFUSED', player: player.Name, detail: player.Name + ' refused to be transfer listed' });
          currentDay += 1;
          continue;
        }

        eventLog.push({ day: currentDay, type: 'SALE_OPENED', player: player.Name, detail: player.Name + ' listed — negotiation opened' });
        var saleOutcome = negotiateSale(player, mods);
        if (saleOutcome.outcome === "SOLD") {
          player.status = "SOLD";
          player.saleFee = saleOutcome.revenue;
          player.buyerClub = saleOutcome.buyerClub || "Unknown Club";
          soldPlayers.push(player);
          totalSaleRevenue += saleOutcome.revenue;

          if (archetype === 'SELL_TO_BUY') {
            ledger.transferBudget += saleOutcome.revenue * 0.90;
          }
          ledger.weeklyWageBill -= (player.Wage || 0);
          currentDay += saleOutcome.rounds * 2;
          eventLog.push({ day: currentDay, type: 'SOLD', player: player.Name, detail: player.Name + ' SOLD to ' + player.buyerClub + ' — £' + formatCurrency(saleOutcome.revenue) + ' (' + saleOutcome.rounds + '-round negotiation)' });
          currentDay += 1;
        } else {
          player.status = "UNSOLD";
          unsoldSurplus.push({
            name: player.Name,
            Wage: player.Wage,
            Name: player.Name,
            Age: player.Age,
            CA: player.CA || 0,
            AP: player.AP || 0,
            status: player.status,
            player: player
          });
          currentDay += saleOutcome.rounds * 2 + 1;
          eventLog.push({ day: currentDay, type: 'COLLAPSED', player: player.Name, detail: player.Name + ' negotiation COLLAPSED — buyer withdrew' });
          currentDay += 1;
        }
      } else {
        player.status = "KEPT";
      }
    }

    // LOAN PASS (after outgoing pipeline)
    squad
      .filter(function (p) { return p.status === 'PROTECTED'; })
      .forEach(function (p) {
        p.buyerClub = typeof getRealisticClubForPlayer === 'function' ? getRealisticClubForPlayer(p, "loan") : "Unknown Club";
        if (mods.youngsterProtection) {
          p.status = "PROTECTED_LOAN";
          protectedLoanees.push({
            name: p.Name,
            Age: p.Age,
            PA: p.PA || 0,
            CA: p.CA || 0,
            buyerClub: p.buyerClub
          });
          eventLog.push({ day: currentDay, type: 'LOAN', player: p.Name, detail: p.Name + ' protected — loaned out to ' + p.buyerClub + ' for development' });
        } else {
          p.status = "LOANED";
          loanedPlayers.push(p);
          eventLog.push({ day: currentDay, type: 'LOAN', player: p.Name, detail: p.Name + ' loaned out to ' + p.buyerClub });
        }
        ledger.weeklyWageBill -= (p.Wage || 0);
        currentDay += 1;
      });

    // Sync designations table to reflect final Phase 2 statuses
    audit.designations.forEach(function (d) {
      var p = d.player;
      if (p.status === "SOLD") {
        d.designation = "Sell";
        d.reason = "Sold";
      } else if (p.status === "RELEASED") {
        d.designation = "Sell";
        d.reason = "Released on Free Transfer";
      } else if (p.status === "LOANED" || p.status === "LOAN") {
        d.designation = "Keep";
        d.reason = "Loaned Out";
      } else if (p.status === "PROTECTED_LOAN") {
        d.designation = "Keep";
        d.reason = "Young Prospect";
      } else if (p.status === "REFUSES_LEAVE") {
        d.designation = "Sell";
        d.reason = "Transfer Listed (Refused to leave)";
      } else if (p.status === "UNSOLD") {
        d.designation = "Sell";
        d.reason = "Transfer Listed (No bids)";
      } else if (p.status === "EMERGENCY_SOLD") {
        d.designation = "Sell";
        d.reason = "Emergency Sale";
      }
    });

    // Get active current squad names (post-outgoing)
    var currentSquadNames = {};
    for (var i = 0; i < squad.length; i++) {
      if (squad[i].status !== "SOLD" && squad[i].status !== "RELEASED" && squad[i].status !== "LOANED" && squad[i].status !== "PROTECTED_LOAN" && squad[i].status !== "EMERGENCY_SOLD") {
        currentSquadNames[squad[i].Name] = true;
      }
    }

    // Phase 2.5: Rival Price Inflation (runs once over entire market before shortlisting)
    var marketClones = market.map(function (p) {
      return Object.assign({}, p);
    });

    var instructions = tactic.instructions || {};

    marketClones.forEach(function (p) {
      var bestScore = 0;
      for (var sid in tactic.slots) {
        var slot = tactic.slots[sid];
        if (!slot || !slot.roleId) continue;
        if (typeof isFlankEligible === "function" && !isFlankEligible(p, sid)) continue;
        var sc = scorePlayerForRole(p, slot.roleId, instructions);
        if (sc && sc.total > bestScore) {
          bestScore = sc.total;
        }
      }
      p.fitScore = bestScore;
    });

    marketClones.forEach(function (p) {
      var isDesirable = p.fitScore > audit.candidateMinScore + 2.0 && (p.CA || 0) > 140;
      if (isDesirable && Math.random() < 0.35) {
        var inflation = 1.10 + Math.random() * 0.18;
        p._originalAP = p.AP;
        p.AP = Math.round(p.AP * inflation);
        p.rivalBid = true;
        p.rivalClubName = typeof getRealisticClubForPlayer === "function"
          ? getRealisticClubForPlayer(p, "rival-inflator")
          : "Unknown Club";
      } else {
        p.rivalBid = false;
        p._originalAP = p.AP;
      }
    });

    // Phase 4: Per-gap loop
    for (var gi = 0; gi < audit.unresolved.length; gi++) {
      var gap = audit.unresolved[gi];
      var slot = tactic.slots[gap.slotId];
      if (!slot || !slot.roleId) continue;

      // Build shortlist
      var shortlist = buildShortlist(gap, marketClones, signedNames, currentSquadNames, mods, archetype, instructions, slot);
      if (shortlist.length === 0) continue;

      // Try each shortlist target
      for (var ti = 0; ti < shortlist.length; ti++) {
        var target = shortlist[ti];
        var candidate = target.player;

        if (candidate.rivalBid) {
          var exists = rivalInflatedDeals.some(function(x) { return x.name === candidate.Name; });
          if (!exists) {
            rivalInflatedDeals.push({
              name: candidate.Name,
              player: candidate,
              originalAP: candidate._originalAP,
              finalAP: candidate.AP,
              inflatedAP: candidate.AP,
              premium: candidate.AP - candidate._originalAP,
              rivalClubName: candidate.rivalClubName
            });
            eventLog.push({ day: currentDay, type: 'RIVAL_INTEREST', player: candidate.Name, detail: 'Rival interest detected from ' + (candidate.rivalClubName || 'Rival Club') + ' for ' + candidate.Name + ' — price inflated by £' + formatCurrency(candidate.AP - candidate._originalAP) });
            currentDay += 1;
          }
        }

        eventLog.push({ day: currentDay, type: 'BID_SUBMITTED', player: candidate.Name, detail: 'Target: ' + candidate.Name + ' (' + gap.slotId + ') — bid submitted £' + formatCurrency(candidate.AP) });

        // Willingness check
        var wScore = willingnessScore(candidate, ledger);
        if (wScore < 30) {
          eventLog.push({ day: currentDay, type: 'COLLAPSED', player: candidate.Name, detail: candidate.Name + ' deal COLLAPSED — low player willingness' });
          currentDay += 1;
          continue;
        }

        if (wScore < 60) {
          candidate.AP = Math.round(candidate.AP * 1.05);
        }

        // Budget check
        var aff = canAfford(candidate, ledger, mods);
        if (!aff.transferOk || !aff.wageOk) {
          if (!aff.wageOk) {
            var emergencyResult = triggerEmergencySale(ledger, unsoldSurplus);
            if (emergencyResult) {
              emergencySales.push(emergencyResult);
              eventLog.push({ day: currentDay, type: 'EMERGENCY_SALE', player: emergencyResult.player.Name, detail: 'Emergency sale triggered: ' + emergencyResult.player.Name + ' sold to ' + emergencyResult.buyerClub + ' for £' + formatCurrency(emergencyResult.fee) + ' to free up wage room' });
              currentDay += 1;
              aff = canAfford(candidate, ledger, mods);
            }
          }
          if (!aff.transferOk || !aff.wageOk) {
            dealsCollapsed.push({
              name: candidate.Name,
              player: candidate,
              reason: "budget_ceiling",
              slotId: gap.slotId
            });
            eventLog.push({ day: currentDay, type: 'COLLAPSED', player: candidate.Name, detail: candidate.Name + ' deal COLLAPSED — budget ceiling' });
            currentDay += 1;
            continue;
          }
        }

        // Bid loop
        var bidResult = attemptTransfer(candidate, ledger, mods);
        if (bidResult.outcome === "SIGNED") {
          var sc = scorePlayerForRole(candidate, slot.roleId, instructions);
          var trueFitScore = sc ? sc.total : target.rawFitScore;

          if (trueFitScore < target.scoutedScore - 1.5) {
            scoutingBusts.push({
              name: candidate.Name,
              player: candidate,
              scoutedScore: target.scoutedScore,
              trueScore: trueFitScore,
              trueFitScore: trueFitScore,
              delta: target.scoutedScore - trueFitScore,
              difference: target.scoutedScore - trueFitScore
            });
          }

          signedPlayers.push({
            name: candidate.Name,
            player: candidate,
            slot: gap.slotId,
            slotId: gap.slotId,
            roleId: slot.roleId,
            scoutedScore: target.scoutedScore,
            trueScore: trueFitScore,
            trueFitScore: trueFitScore,
            fee: bidResult.fee,
            rivalBid: candidate.rivalBid,
            wage: aff.negotiatedWage,
            adjustedScore: target.scoutedScore,
            slotQualityAtSigning: candidateScores[candidate.Name || candidate.name] ? candidateScores[candidate.Name || candidate.name].slotQualityAtSigning : (typeof PlayerUtils !== "undefined" ? PlayerUtils.slotQuality(candidate, target.scoutedScore) : target.scoutedScore)
          });

          signedNames[candidate.Name] = true;
          ledger.transferBudget -= bidResult.fee;
          ledger.weeklyWageBill += aff.negotiatedWage;

          currentSquadNames[candidate.Name] = true;
          currentDay += bidResult.rounds * 2;
          eventLog.push({ day: currentDay, type: 'SIGNED', player: candidate.Name, detail: candidate.Name + ' SIGNED — £' + formatCurrency(bidResult.fee) + ' (' + bidResult.rounds + '-round negotiation)' });
          currentDay += 1;
          break;
        } else {
          dealsCollapsed.push({
            name: candidate.Name,
            player: candidate,
            reason: bidResult.reason,
            slotId: gap.slotId
          });
          currentDay += bidResult.rounds * 2 + 1;
          var detail = candidate.Name + ' deal COLLAPSED — ' + (bidResult.reason === 'budget_ceiling' ? 'budget ceiling reached' : 'seller held firm');
          eventLog.push({ day: currentDay, type: 'COLLAPSED', player: candidate.Name, detail: detail });
          currentDay += 1;
        }
      }
    }

    // Phase 7: Slot Quality Scoring
    var allStarters = {};
    var starterList = [];

    for (var sid in audit.startersMap) {
      var st = audit.startersMap[sid];
      var sq = slotQuality(st.player, st.score);
      allStarters[sid] = {
        slot: sid,
        player: st.player,
        fitScore: st.score,
        slotQuality: sq,
        reliable: reliabilityRating(st.player) >= 9
      };
    }

    for (var spi = 0; spi < signedPlayers.length; spi++) {
      var sg = signedPlayers[spi];
      if (!allStarters[sg.slot] || allStarters[sg.slot].fitScore < audit.dynamicThreshold || !allStarters[sg.slot].reliable) {
        var sq = slotQuality(sg.player, sg.trueScore);
        allStarters[sg.slot] = {
          slot: sg.slot,
          player: sg.player,
          fitScore: sg.trueScore,
          slotQuality: sq,
          reliable: reliabilityRating(sg.player) >= 9
        };
      }
    }

    var slotList = [];
    for (var sid in allStarters) {
      slotList.push(allStarters[sid]);
    }

    var captain = null;
    var highestLdr = -1;
    for (var sli = 0; sli < slotList.length; sli++) {
      var p = slotList[sli].player;
      var ldr = getPlayerAttr(p, "Ldr");
      if (ldr > highestLdr) {
        highestLdr = ldr;
        captain = slotList[sli];
      }
    }
    if (captain && highestLdr >= 14) {
      var unrestCount = window.FM24State && window.FM24State.manager && window.FM24State.manager.unrestPlayers ? window.FM24State.manager.unrestPlayers.length : 0;
      var capBonus = Math.max(0.1, 0.3 - unrestCount * 0.2);
      slotList.forEach(function (s) {
        if (s !== captain) {
          s.slotQuality += capBonus;
        }
      });
    }

    var slotQualityTable = slotList.map(function(s) {
      return {
        slot: s.slot,
        player: s.player,
        fitScore: Math.round(s.fitScore * 10) / 10,
        slotQuality: Math.round(s.slotQuality * 10) / 10,
        reliable: s.reliable
      };
    });

    var startSlotQualitySum = 0;
    var startSlotCount = 0;
    for (var sid in audit.startersMap) {
      var st = audit.startersMap[sid];
      var sq = slotQuality(st.player, st.score);
      startSlotQualitySum += sq;
      startSlotCount++;
    }
    var startSquadAvgQuality = startSlotCount > 0 ? (startSlotQualitySum / startSlotCount) : 0;

    var endSlotQualitySum = 0;
    var endSlotCount = 0;
    slotQualityTable.forEach(function (s) {
      endSlotQualitySum += s.slotQuality;
      endSlotCount++;
    });
    var endSquadAvgQuality = endSlotCount > 0 ? (endSlotQualitySum / endSlotCount) : 0;

    // Playing time unrest population
    if (typeof PlayerUtils !== "undefined" && PlayerUtils.getPlayingTimeUnrestRisk && squad) {
      for (var ptui = 0; ptui < squad.length; ptui++) {
        var ptu = squad[ptui];
        var ptRisk = PlayerUtils.getPlayingTimeUnrestRisk(ptu);
        if (ptRisk.risk === 'HIGH' || ptRisk.risk === 'MEDIUM') {
          var existing = window.FM24State.manager.unrestPlayers || [];
          var found = false;
          for (var exi = 0; exi < existing.length; exi++) {
            if (existing[exi].player && existing[exi].player.Name === ptu.Name) { found = true; break; }
          }
          if (!found) {
            if (!window.FM24State.manager.unrestPlayers) window.FM24State.manager.unrestPlayers = [];
            window.FM24State.manager.unrestPlayers.push({
              player: ptu,
              risk: ptRisk.risk,
              reasons: ptRisk.reasons,
              source: 'playing-time'
            });
          }
        }
      }
    }

    return {
      archetype: archetype,
      hybridTags: hybridTags,
      startSquadAvgQuality: Math.round(startSquadAvgQuality * 10) / 10,
      endSquadAvgQuality: Math.round(endSquadAvgQuality * 10) / 10,

      signedPlayers: signedPlayers,
      scoutingBusts: scoutingBusts,
      dealsCollapsed: dealsCollapsed,
      refusedListings: refusedListings,
      unsoldSurplus: unsoldSurplus,
      emergencySales: emergencySales,
      rivalInflatedDeals: rivalInflatedDeals,
      protectedLoanees: protectedLoanees,
      slotQualityTable: slotQualityTable,
      eventLog: eventLog,

      transferBudgetRemaining: ledger.transferBudget,
      wageBudgetRemaining: ledger.wageBudget - ledger.weeklyWageBill,
      wageBudgetTotal: ledger.wageBudget,
      weeklyWageBill: ledger.weeklyWageBill,

      // UI compatible fields
      releasedPlayers: releasedPlayers,
      soldPlayers: soldPlayers,
      loanedPlayers: loanedPlayers,
      totalSaleRevenue: totalSaleRevenue,
      totalSpent: signedPlayers.reduce(function (s, p) { return s + p.fee; }, 0),
      designations: audit.designations,
      thresholds: {
        squadQuality: Math.round(audit.squadQuality * 10) / 10,
        satisfaction: audit.dynamicThreshold,
        backup: audit.dynamicBackupThreshold,
        candidate: audit.candidateMinScore
      },
      unreliableStarters: audit.unreliableStarters
    };

    // Manager Evolution — triggered after transfer window processing
    if (window.FM24State && typeof computeEvolutionSignal === 'function' && typeof applyEvolution === 'function') {
      window.FM24State.manager.windowCount = (window.FM24State.manager.windowCount || 0) + 1;
      var evoResult = computeEvolutionSignal(window.FM24State, window.FM24State.manager, window.FM24State.squad);
      applyEvolution(evoResult, window.FM24State);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // DOF FEATURE — REASON GENERATION & PART A / PART B SPLIT
  // ══════════════════════════════════════════════════════════════════

  function formatCurrency(val) {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + "M";
    if (val >= 1000) return (val / 1000).toFixed(0) + "K";
    return String(val);
  }

  function buildReason(type, player, context) {
    if (!player) return "";
    if (type === 'SALE_PROPOSED') {
      var gap = (context.dynamicThreshold || 11) - (player.fitScore || 0);
      if (gap > 2.0) return 'Tactical misfit \u2014 ' + gap.toFixed(1) + ' pts below threshold';
      if ((player.Age || 0) >= 29 && (player.CA || 0) < 130) return 'Ageing asset \u2014 limited resale value window';
      return 'Surplus to requirements \u2014 no backup slot available';
    }
    if (type === 'LOAN_PROPOSED') {
      if ((player.Age || 0) <= 21) return 'Young prospect needs first-team football';
      return 'Development loan \u2014 not yet ready for starting duties';
    }
    if (type === 'RELEASE_PROPOSED') {
      return 'Surplus to requirements \u2014 wage bill relief';
    }
    if (type === 'TARGET_PROPOSED') {
      var scouted = context.scoutedScore || player.fitScore || 0;
      return (player.Name || 'Player') + ' (' + (player.Age || 0) + 'y) \u2014 scouted fit ' + scouted.toFixed(1) + ', fills ' + (context.gapSlot || 'unknown') + ' gap, fee \u00a3' + formatCurrency(player.AP || 0);
    }
    if (type === 'BUDGET_OVERRUN') {
      return (player.Name || 'Player') + ' costs \u00a3' + formatCurrency(player.AP || 0) + ' \u2014 exceeds ceiling by \u00a3' + formatCurrency(context.overage || 0);
    }
    return '';
  }

  function runPartA(manager, squad, market, transferBudget, wageBudget, tactic) {
    paAvailable = typeof PlayerUtils !== "undefined"
      ? PlayerUtils.paAvailableCheck(squad)
      : squad.some(function (p) { return p.PA && p.PA > 0; });
    if (!paAvailable) {
      console.warn('[TransferV2] PA column not detected in squad data. Youngster protection falling back to age-only mode.');
    }
    var archetype = resolveArchetype(manager);
    isWonderkid = typeof PlayerUtils !== "undefined"
      ? PlayerUtils.wonderkidChecker(archetype, paAvailable)
      : function (player) {
          if (paAvailable) {
            var ca = player.CA || 0;
            var paGapThreshold = ca >= 150 ? 10 : ca >= 130 ? 15 : 20;
            return player.Age <= 23 && (player.PA || 0) > ca + paGapThreshold;
          }
          return player.Age <= 19;
        };

    squad.forEach(function (p) {
      delete p.status;
      delete p.saleFee;
    });

    // Step 0: Pre-evaluate market candidates for signing quality
    candidateScores = {};
    if (market && market.length > 0 && tactic && tactic.slots) {
      var slotKeys = Object.keys(tactic.slots);
      market.forEach(function (candidate) {
        var bestSlot = null;
        var bestScore = -1;
        slotKeys.forEach(function (slotId) {
          var slot = tactic.slots[slotId];
          if (!slot || !slot.roleId) return;
          if (typeof isFlankEligible === "function" && !isFlankEligible(candidate, slotId)) return;
          var sc = typeof scorePlayerForRole === "function"
            ? scorePlayerForRole(candidate, slot.roleId, tactic.instructions || {})
            : null;
          var score = sc ? sc.total : 0;
          if (score > bestScore) {
            bestScore = score;
            bestSlot = slotId;
          }
        });
        var slotQual = typeof PlayerUtils !== "undefined"
          ? PlayerUtils.slotQuality(candidate, bestScore)
          : bestScore;
        candidateScores[candidate.Name || candidate.name] = {
          slotQualityAtSigning: slotQual,
          bestSlot: bestSlot
        };
      });
    }

    var hybridTags = resolveHybridTags(manager);
    var mods = getArchetypeModifiers(archetype, hybridTags);

    var audit = runSquadAudit(squad, tactic, mods, manager, archetype);
    if (!audit) return null;

    var ledger = {
      transferBudget: transferBudget,
      wageBudget: wageBudget,
      weeklyWageBill: squad.reduce(function (sum, p) { return sum + (p.Wage || 0); }, 0)
    };

    var pendingDecisions = [];
    var soldPlayers = [];
    var releasedPlayers = [];
    var loanedPlayers = [];
    var refusedListings = [];
    var unsoldSurplus = [];
    var signedPlayers = [];
    var totalSaleRevenue = 0;

    var disableCoachRecs = window.FM24State && window.FM24State.manager && window.FM24State.manager.disableCoachRecs;

    if (!disableCoachRecs) {
      for (var si = 0; si < audit.surplusPool.length; si++) {
        var surplusItem = audit.surplusPool[si];
        var player = surplusItem.player;
        var fitScore = surplusItem.fitScore;

        var tier = classifyTier(player, fitScore, mods, audit.dynamicThreshold, isWonderkid);

        if (tier === "RELEASE") {
          pendingDecisions.push({
            type: 'RELEASE_PROPOSED',
            player: player,
            manager: manager,
            reason: buildReason('RELEASE_PROPOSED', player, { dynamicThreshold: audit.dynamicThreshold }),
            financials: { fee: 0, wage: player.Wage || 0, budgetRemaining: ledger.transferBudget },
            dofDecision: 'APPROVE'
          });
        } else if (tier === "LOAN") {
          pendingDecisions.push({
            type: 'LOAN_PROPOSED',
            player: player,
            manager: manager,
            reason: buildReason('LOAN_PROPOSED', player, { dynamicThreshold: audit.dynamicThreshold }),
            financials: { fee: 0, wage: -(player.Wage || 0), budgetRemaining: ledger.transferBudget },
            dofDecision: 'APPROVE'
          });
        } else if (tier === "SELL") {
          if (refusesListing(player)) {
            player.status = "REFUSES_LEAVE";
            refusedListings.push({ name: player.Name, Det: getPlayerAttr(player, "Det"), Name: player.Name, Age: player.Age, Wage: player.Wage });
            continue;
          }
          var askingPrice = player.AP || 0;
          var floorPrice = askingPrice * mods.saleFloorMultiplier;
          pendingDecisions.push({
            type: 'SALE_PROPOSED',
            player: player,
            manager: manager,
            reason: buildReason('SALE_PROPOSED', player, { dynamicThreshold: audit.dynamicThreshold }),
            financials: { fee: Math.round(floorPrice), wage: -(player.Wage || 0), budgetRemaining: ledger.transferBudget },
            dofDecision: 'APPROVE'
          });
        }
      }
    }

    // Loan pass for protected players
    if (!disableCoachRecs) {
      squad.filter(function (p) { return p.status === 'PROTECTED'; }).forEach(function (p) {
        pendingDecisions.push({
          type: 'LOAN_PROPOSED',
          player: p,
          manager: manager,
          reason: 'Young prospect \u2014 ' + (p.Age || 0) + 'y, PA ' + (p.PA || 0) + ', needs game time',
          financials: { fee: 0, wage: -(p.Wage || 0), budgetRemaining: ledger.transferBudget },
          dofDecision: 'APPROVE'
        });
      });
    }

    // 5.4 Loan recall mechanic — check CRITICAL gaps for recallable loaned wonderkids
    var recallablePlayers = [];
    var loanedSource = (window.FM24State && window.FM24State.manager && window.FM24State.manager.loanedOutPlayers) || [];
    var allRecallable = squad.concat(loanedSource);
    allRecallable.forEach(function (p) {
      if (p.status === 'LOANED' || p.status === 'PROTECTED_LOAN' || p.loanStatus === 'LOANED') {
        if (typeof PlayerUtils !== "undefined" && PlayerUtils.wonderkidChecker) {
          if (PlayerUtils.wonderkidChecker(archetype, paAvailable)(p)) {
            var bestRecallFit = 0;
            for (var rk in tactic.slots) {
              var rslot = tactic.slots[rk];
              if (!rslot || !rslot.roleId) continue;
              if (typeof isFlankEligible === "function" && !isFlankEligible(p, rk)) continue;
              var rsc = typeof scorePlayerForRole === "function" ? scorePlayerForRole(p, rslot.roleId, instructions) : null;
              var rfit = rsc ? rsc.total : 0;
              if (rfit > bestRecallFit) bestRecallFit = rfit;
            }
            if (bestRecallFit >= audit.candidateMinScore) {
              recallablePlayers.push({ player: p, fitScore: bestRecallFit });
            }
          }
        } else {
          if (p.Age <= 23) {
            recallablePlayers.push({ player: p, fitScore: 0 });
          }
        }
      }
    });

    if (!disableCoachRecs) {
      for (var ri = 0; ri < audit.unresolved.length; ri++) {
        var rGap = audit.unresolved[ri];
        if (rGap.priority !== 'Critical') continue;
        if (recallablePlayers.length === 0) break;
        var bestRecall = recallablePlayers[0];
        for (var rj = 1; rj < recallablePlayers.length; rj++) {
          if (recallablePlayers[rj].fitScore > bestRecall.fitScore) bestRecall = recallablePlayers[rj];
        }
        pendingDecisions.push({
          type: 'RECALL_OPTION',
          player: bestRecall.player,
          manager: manager,
          reason: 'Critical gap — ' + bestRecall.player.Name + ' available on loan recall (no fee)',
          contextGapSlot: rGap.slotId,
          recallFitScore: bestRecall.fitScore,
          dofDecision: null
        });
        // Remove from recallable list so each recall goes to a separate gap
        recallablePlayers.splice(recallablePlayers.indexOf(bestRecall), 1);
      }
    }

    // Gap-based TARGET proposals
    var currentSquadNames = {};
    for (var i = 0; i < squad.length; i++) {
      if (squad[i].status !== "SOLD" && squad[i].status !== "RELEASED" && squad[i].status !== "LOANED" && squad[i].status !== "PROTECTED_LOAN" && squad[i].status !== "EMERGENCY_SOLD") {
        currentSquadNames[squad[i].Name] = true;
      }
    }

    var marketClones = market.map(function (p) { return Object.assign({}, p); });
    var instructions = tactic.instructions || {};

    marketClones.forEach(function (p) {
      var bestScore = 0;
      for (var sid in tactic.slots) {
        var slot = tactic.slots[sid];
        if (!slot || !slot.roleId) continue;
        if (typeof isFlankEligible === "function" && !isFlankEligible(p, sid)) continue;
        var sc = scorePlayerForRole(p, slot.roleId, instructions);
        if (sc && sc.total > bestScore) bestScore = sc.total;
      }
      p.fitScore = bestScore;
    });

    marketClones.forEach(function (p) {
      var isDesirable = p.fitScore > audit.candidateMinScore + 2.0 && (p.CA || 0) > 140;
      if (isDesirable && Math.random() < 0.35) {
        var inflation = 1.10 + Math.random() * 0.18;
        p._originalAP = p.AP;
        p.AP = Math.round(p.AP * inflation);
        p.rivalBid = true;
      } else {
        p.rivalBid = false;
        p._originalAP = p.AP;
      }
    });

    if (!disableCoachRecs) {
      for (var gi = 0; gi < audit.unresolved.length; gi++) {
        var gap = audit.unresolved[gi];
        var slot = tactic.slots[gap.slotId];
        if (!slot || !slot.roleId) continue;

        var shortlist = buildShortlist(gap, marketClones, {}, currentSquadNames, mods, archetype, instructions, slot);
        if (shortlist.length === 0) continue;

        var topTarget = shortlist[0];
        var candidate = topTarget.player;
        var wScore = willingnessScore(candidate, ledger);

        if (wScore < 30) continue;

        var aff = canAfford(candidate, ledger, mods);
        var isOverBudget = !aff.transferOk || !aff.wageOk;

        if (isOverBudget) {
          var overage = (candidate.AP || 0) - (ledger.transferBudget * mods.bidCeilingPct);
          pendingDecisions.push({
            type: 'BUDGET_OVERRUN',
            player: candidate,
            manager: manager,
            reason: buildReason('BUDGET_OVERRUN', candidate, { overage: Math.max(0, overage) }),
            financials: { fee: candidate.AP || 0, wage: candidate.Wage || 0, budgetRemaining: ledger.transferBudget },
            dofDecision: 'APPROVE'
          });
        } else {
          pendingDecisions.push({
            type: 'TARGET_PROPOSED',
            player: candidate,
            manager: manager,
            reason: buildReason('TARGET_PROPOSED', candidate, { scoutedScore: topTarget.scoutedScore, gapSlot: gap.slotId }),
            financials: { fee: candidate.AP || 0, wage: candidate.Wage || 0, budgetRemaining: ledger.transferBudget },
            dofDecision: 'APPROVE'
          });
        }
      }
    }

    var saleRevenueFromDecisions = 0;
    pendingDecisions.forEach(function (d) {
      if (d.type === 'SALE_PROPOSED' && d.dofDecision === 'APPROVE') {
        saleRevenueFromDecisions += d.financials.fee || 0;
      }
    });

    return {
      pendingDecisions: pendingDecisions,
      audit: audit,
      archetype: archetype,
      hybridTags: hybridTags,
      mods: mods,
      ledger: ledger,
      marketClones: marketClones,
      refusedListings: refusedListings,
      unsoldSurplus: unsoldSurplus,
      saleRevenueFromDecisions: saleRevenueFromDecisions,
      currentSquadNames: currentSquadNames,
      archetype: archetype,
      instructions: instructions,
      squad: squad,
      candidateScores: candidateScores
    };
  }

  function runPartB(partAResult, resolvedDecisions) {
    if (!partAResult) return null;
    var audit = partAResult.audit;
    var mods = partAResult.mods;
    var archetype = partAResult.archetype;
    var ledger = partAResult.ledger;
    var marketClones = partAResult.marketClones;
    var squad = partAResult.squad;
    var instructions = partAResult.instructions;
    var tactic = window.FM24State && window.FM24State.tactic ? window.FM24State.tactic : { slots: {}, instructions: {} };

    var soldPlayers = [];
    var releasedPlayers = [];
    var loanedPlayers = [];
    var refusedListings = partAResult.refusedListings || [];
    var unsoldSurplus = partAResult.unsoldSurplus || [];
    var signedPlayers = [];
    var dealsCollapsed = [];
    var scoutingBusts = [];
    var emergencySales = [];
    var rivalInflatedDeals = [];
    var protectedLoanees = [];
    var signedNames = {};
    var totalSaleRevenue = 0;
    var candidateScores = partAResult.candidateScores || {};

    var eventLog = [];
    var currentDay = 1;

    // Apply DOF decisions
    resolvedDecisions = resolvedDecisions || partAResult.pendingDecisions || [];

    resolvedDecisions.forEach(function (decision) {
      if (!decision || decision.dofDecision === 'BLOCK' || decision.dofDecision === 'BLOCK_AND_LEAVE_GAP' || decision.dofDecision === 'LEAVE_GAP') return;

      var player = decision.player;
      if (!player) return;

      switch (decision.type) {
        case 'SALE_PROPOSED': {
          if (player.status === 'REFUSES_LEAVE') break;
          if (decision.dofDecision === 'APPROVE' || decision.dofDecision === 'COUNTER') {
            eventLog.push({ day: currentDay, type: 'SALE_OPENED', player: player.Name, detail: player.Name + ' listed — negotiation opened' });
            var minFee = decision.dofDecision === 'COUNTER' ? (decision.dofMinimumFee || player.AP * 0.85) : player.AP * mods.saleFloorMultiplier;
            var saleOutcome = negotiateSaleWithFloor(player, mods, minFee);
            if (saleOutcome.outcome === "SOLD" && player.status !== 'REFUSES_LEAVE') {
              player.status = "SOLD";
              player.saleFee = saleOutcome.revenue;
              player.buyerClub = saleOutcome.buyerClub || "Unknown Club";
              soldPlayers.push(player);
              totalSaleRevenue += saleOutcome.revenue;
              if (archetype === 'SELL_TO_BUY') {
                ledger.transferBudget += saleOutcome.revenue * 0.90;
              }
              ledger.weeklyWageBill -= (player.Wage || 0);
              currentDay += saleOutcome.rounds * 2;
              eventLog.push({ day: currentDay, type: 'SOLD', player: player.Name, detail: player.Name + ' SOLD to ' + player.buyerClub + ' — £' + formatCurrency(saleOutcome.revenue) + ' (' + saleOutcome.rounds + '-round negotiation)' });
              currentDay += 1;
            } else {
              player.status = "UNSOLD";
              unsoldSurplus.push({
                name: player.Name,
                Wage: player.Wage,
                Name: player.Name,
                Age: player.Age,
                CA: player.CA || 0,
                AP: player.AP || 0,
                status: player.status,
                player: player
              });
              currentDay += saleOutcome.rounds * 2 + 1;
              eventLog.push({ day: currentDay, type: 'COLLAPSED', player: player.Name, detail: player.Name + ' negotiation COLLAPSED — buyer withdrew' });
              currentDay += 1;
            }
          }
          break;
        }
        case 'LOAN_PROPOSED': {
          if (decision.dofDecision === 'APPROVE') {
            player.status = "LOANED";
            player.buyerClub = typeof getRealisticClubForPlayer === "function"
              ? getRealisticClubForPlayer(player, "loan")
              : "Unknown Club";
            loanedPlayers.push(player);
            ledger.weeklyWageBill -= (player.Wage || 0);
            eventLog.push({ day: currentDay, type: 'LOAN', player: player.Name, detail: player.Name + ' loaned out to ' + player.buyerClub + ' for development' });
            currentDay += 1;
          }
          break;
        }
        case 'RELEASE_PROPOSED': {
          if (decision.dofDecision === 'APPROVE') {
            player.status = "RELEASED";
            releasedPlayers.push(player);
            ledger.weeklyWageBill -= (player.Wage || 0);
            eventLog.push({ day: currentDay, type: 'RELEASE', player: player.Name, detail: player.Name + ' released on free transfer' });
            currentDay += 1;
          }
          break;
        }
        case 'TARGET_PROPOSED': {
          if (decision.dofDecision === 'APPROVE' || decision.dofDecision === 'REDIRECT') {
            var targetPlayer = decision.dofDecision === 'REDIRECT' ? decision.dofRedirectTarget : player;
            if (!targetPlayer) break;
            var gapSlot = decision.contextGapSlot || '';
            var roleId = null;
            if (gapSlot && tactic.slots && tactic.slots[gapSlot]) {
              roleId = tactic.slots[gapSlot].roleId;
            } else {
              var bestFit = typeof findBestTacticFitForPlayer === "function" ? findBestTacticFitForPlayer(targetPlayer) : [];
              if (bestFit && bestFit.length > 0) {
                gapSlot = bestFit[0].slotId;
                roleId = bestFit[0].roleId;
              } else if (tactic.slots) {
                var slotIds = Object.keys(tactic.slots);
                if (slotIds.length > 0) {
                  gapSlot = slotIds[0];
                  roleId = tactic.slots[gapSlot].roleId;
                }
              }
            }
            if (!roleId) break;

            if (decision.dofDecision === 'REDIRECT') {
              eventLog.push({ day: currentDay, type: 'REDIRECT', player: targetPlayer.Name, detail: 'Redirected to fallback target: ' + targetPlayer.Name });
            }

            if (targetPlayer.rivalBid) {
              eventLog.push({ day: currentDay, type: 'RIVAL_INTEREST', player: targetPlayer.Name, detail: 'Rival interest detected from ' + (targetPlayer.rivalClubName || 'Rival Club') + ' for ' + targetPlayer.Name + ' — price inflated' });
              currentDay += 1;
            }

            eventLog.push({ day: currentDay, type: 'BID_SUBMITTED', player: targetPlayer.Name, detail: 'Target: ' + targetPlayer.Name + ' (' + gapSlot + ') — bid submitted £' + formatCurrency(targetPlayer.AP) });

            var wScore = willingnessScore(targetPlayer, ledger);
            if (wScore < 30) {
              dealsCollapsed.push({ name: targetPlayer.Name, player: targetPlayer, reason: 'low_willingness', slotId: gapSlot });
              eventLog.push({ day: currentDay, type: 'COLLAPSED', player: targetPlayer.Name, detail: targetPlayer.Name + ' deal COLLAPSED — low player willingness' });
              currentDay += 1;
              break;
            }

            var aff = canAfford(targetPlayer, ledger, mods);
            if (!aff.transferOk || !aff.wageOk) {
              var emergencyResult = triggerEmergencySale(ledger, unsoldSurplus);
              if (emergencyResult) {
                emergencySales.push(emergencyResult);
                eventLog.push({ day: currentDay, type: 'EMERGENCY_SALE', player: emergencyResult.player.Name, detail: 'Emergency sale triggered: ' + emergencyResult.player.Name + ' sold to ' + emergencyResult.buyerClub + ' for £' + formatCurrency(emergencyResult.fee) + ' to free up wage room' });
                currentDay += 1;
                aff = canAfford(targetPlayer, ledger, mods);
              }
              if (!aff.transferOk || !aff.wageOk) {
                dealsCollapsed.push({ name: targetPlayer.Name, player: targetPlayer, reason: 'budget_ceiling', slotId: gapSlot });
                eventLog.push({ day: currentDay, type: 'COLLAPSED', player: targetPlayer.Name, detail: targetPlayer.Name + ' deal COLLAPSED — budget ceiling' });
                currentDay += 1;
                break;
              }
            }

            var bidResult = attemptTransfer(targetPlayer, ledger, mods);
            if (bidResult.outcome === "SIGNED") {
              var sc = scorePlayerForRole(targetPlayer, roleId, instructions);
              var trueFitScore = sc ? sc.total : (targetPlayer.fitScore || 0);

              if (trueFitScore < (targetPlayer.scoutedScore || trueFitScore) - 1.5) {
                scoutingBusts.push({
                  name: targetPlayer.Name, player: targetPlayer,
                  scoutedScore: targetPlayer.fitScore || trueFitScore,
                  trueScore: trueFitScore, trueFitScore: trueFitScore,
                  delta: (targetPlayer.fitScore || trueFitScore) - trueFitScore,
                  difference: (targetPlayer.fitScore || trueFitScore) - trueFitScore
                });
              }

              signedPlayers.push({
                name: targetPlayer.Name, player: targetPlayer, slot: gapSlot, slotId: gapSlot,
                roleId: roleId, scoutedScore: targetPlayer.fitScore || trueFitScore,
                trueScore: trueFitScore, trueFitScore: trueFitScore, fee: bidResult.fee,
                rivalBid: targetPlayer.rivalBid || false, wage: aff.negotiatedWage,
                adjustedScore: targetPlayer.fitScore || trueFitScore,
                slotQualityAtSigning: candidateScores[targetPlayer.Name || targetPlayer.name] ? candidateScores[targetPlayer.Name || targetPlayer.name].slotQualityAtSigning : (typeof PlayerUtils !== "undefined" ? PlayerUtils.slotQuality(targetPlayer, targetPlayer.fitScore || trueFitScore) : (targetPlayer.fitScore || trueFitScore))
              });

              signedNames[targetPlayer.Name] = true;
              ledger.transferBudget -= bidResult.fee;
              ledger.weeklyWageBill += aff.negotiatedWage;

              currentDay += bidResult.rounds * 2;
              eventLog.push({ day: currentDay, type: 'SIGNED', player: targetPlayer.Name, detail: targetPlayer.Name + ' SIGNED — £' + formatCurrency(bidResult.fee) + ' (' + bidResult.rounds + '-round negotiation)' });
              currentDay += 1;
            } else {
              dealsCollapsed.push({ name: targetPlayer.Name, player: targetPlayer, reason: bidResult.reason, slotId: gapSlot });
              currentDay += bidResult.rounds * 2 + 1;
              var detail = targetPlayer.Name + ' deal COLLAPSED — ' + (bidResult.reason === 'budget_ceiling' ? 'budget ceiling reached' : 'seller held firm');
              eventLog.push({ day: currentDay, type: 'COLLAPSED', player: targetPlayer.Name, detail: detail });
              currentDay += 1;
            }
          }
          break;
        }
        case 'RECALL_OPTION': {
          if (decision.dofDecision === 'RECALL') {
            var recallPlayer = decision.player;
            if (recallPlayer) {
              recallPlayer.status = 'RECALLED';
              ledger.weeklyWageBill += (recallPlayer.Wage || 0);
              eventLog.push({ day: currentDay, type: 'RECALL', player: recallPlayer.Name, detail: recallPlayer.Name + ' recalled from loan — no fee, wage back on bill' });
              currentDay += 1;
              // Mark as if signed — fills the gap without fee
              signedPlayers.push({
                name: recallPlayer.Name, player: recallPlayer, slot: decision.contextGapSlot || '', slotId: decision.contextGapSlot || '',
                roleId: null, scoutedScore: decision.recallFitScore || 0,
                trueScore: decision.recallFitScore || 0, trueFitScore: decision.recallFitScore || 0, fee: 0,
                rivalBid: false, wage: recallPlayer.Wage || 0, adjustedScore: decision.recallFitScore || 0,
                slotQualityAtSigning: typeof PlayerUtils !== "undefined" ? PlayerUtils.slotQuality(recallPlayer, decision.recallFitScore || 0) : (decision.recallFitScore || 0),
                isRecall: true
              });
              signedNames[recallPlayer.Name] = true;
            }
          }
          break;
        }
        case 'BUDGET_OVERRUN': {
          if (decision.dofDecision === 'AUTHORISE_OVERSPEND') {
            var extraBudget = Math.round(ledger.transferBudget * 0.15);
            ledger.transferBudget += extraBudget;
            var gapSlot = decision.contextGapSlot || '';
            var roleId = null;
            if (gapSlot && tactic.slots && tactic.slots[gapSlot]) {
              roleId = tactic.slots[gapSlot].roleId;
            } else {
              var bestFit = typeof findBestTacticFitForPlayer === "function" ? findBestTacticFitForPlayer(player) : [];
              if (bestFit && bestFit.length > 0) {
                gapSlot = bestFit[0].slotId;
                roleId = bestFit[0].roleId;
              } else if (tactic.slots) {
                var slotIds = Object.keys(tactic.slots);
                if (slotIds.length > 0) {
                  gapSlot = slotIds[0];
                  roleId = tactic.slots[gapSlot].roleId;
                }
              }
            }
            if (!roleId) break;

            eventLog.push({ day: currentDay, type: 'BUDGET_OVERRUN', player: player.Name, detail: 'Budget overrun authorised for target: ' + player.Name });

            if (player.rivalBid) {
              eventLog.push({ day: currentDay, type: 'RIVAL_INTEREST', player: player.Name, detail: 'Rival interest detected for ' + player.Name + ' — price inflated' });
              currentDay += 1;
            }

            eventLog.push({ day: currentDay, type: 'BID_SUBMITTED', player: player.Name, detail: 'Target: ' + player.Name + ' (' + gapSlot + ') — bid submitted £' + formatCurrency(player.AP) });

            var wScore = willingnessScore(player, ledger);
            if (wScore < 30) {
              dealsCollapsed.push({ name: player.Name, player: player, reason: 'low_willingness', slotId: gapSlot });
              eventLog.push({ day: currentDay, type: 'COLLAPSED', player: player.Name, detail: player.Name + ' deal COLLAPSED — low player willingness' });
              currentDay += 1;
              break;
            }

            var aff = canAfford(player, ledger, mods);
            if (!aff.transferOk || !aff.wageOk) {
              eventLog.push({ day: currentDay, type: 'COLLAPSED', player: player.Name, detail: player.Name + ' deal COLLAPSED — budget ceiling' });
              currentDay += 1;
              break;
            }

            var bidResult = attemptTransfer(player, ledger, mods);
            if (bidResult.outcome === "SIGNED") {
              var sc = scorePlayerForRole(player, roleId, instructions);
              var trueFitScore = sc ? sc.total : (player.fitScore || 0);
              signedPlayers.push({
                name: player.Name, player: player, slot: gapSlot, slotId: gapSlot,
                roleId: roleId, scoutedScore: player.fitScore || trueFitScore,
                trueScore: trueFitScore, trueFitScore: trueFitScore, fee: bidResult.fee,
                rivalBid: player.rivalBid || false, wage: aff.negotiatedWage, adjustedScore: player.fitScore || trueFitScore,
                slotQualityAtSigning: candidateScores[player.Name || player.name] ? candidateScores[player.Name || player.name].slotQualityAtSigning : (typeof PlayerUtils !== "undefined" ? PlayerUtils.slotQuality(player, player.fitScore || trueFitScore) : (player.fitScore || trueFitScore))
              });
              signedNames[player.Name] = true;
              ledger.transferBudget -= bidResult.fee;
              ledger.weeklyWageBill += aff.negotiatedWage;

              currentDay += bidResult.rounds * 2;
              eventLog.push({ day: currentDay, type: 'SIGNED', player: player.Name, detail: player.Name + ' SIGNED — £' + formatCurrency(bidResult.fee) + ' (' + bidResult.rounds + '-round negotiation)' });
              currentDay += 1;
            } else {
              dealsCollapsed.push({ name: player.Name, player: player, reason: bidResult.reason, slotId: gapSlot });
              currentDay += bidResult.rounds * 2 + 1;
              var detail = player.Name + ' deal COLLAPSED — ' + (bidResult.reason === 'budget_ceiling' ? 'budget ceiling reached' : 'seller held firm');
              eventLog.push({ day: currentDay, type: 'COLLAPSED', player: player.Name, detail: detail });
              currentDay += 1;
            }
          } else if (decision.dofDecision === 'REDIRECT' && decision.dofRedirectTarget) {
            var redirectGapSlot = decision.contextGapSlot || '';
            var redirectRoleId = null;
            if (tactic.slots && tactic.slots[redirectGapSlot]) {
              redirectRoleId = tactic.slots[redirectGapSlot].roleId;
            }
            if (!redirectRoleId) break;
            var target = decision.dofRedirectTarget;
            var targetNegotiatedWage = getNegotiatedWage(target);

            eventLog.push({ day: currentDay, type: 'REDIRECT', player: target.Name, detail: 'Redirected to fallback target: ' + target.Name });

            if (target.rivalBid) {
              eventLog.push({ day: currentDay, type: 'RIVAL_INTEREST', player: target.Name, detail: 'Rival interest detected for ' + target.Name + ' — price inflated' });
              currentDay += 1;
            }

            eventLog.push({ day: currentDay, type: 'BID_SUBMITTED', player: target.Name, detail: 'Target: ' + target.Name + ' (' + redirectGapSlot + ') — bid submitted £' + formatCurrency(target.AP) });

            var bidResult = attemptTransfer(target, ledger, mods);
            if (bidResult.outcome === "SIGNED") {
              var sc = scorePlayerForRole(target, redirectRoleId, instructions);
              var trueFitScore = sc ? sc.total : (target.fitScore || 0);
              signedPlayers.push({
                name: target.Name, player: target, slot: redirectGapSlot, slotId: redirectGapSlot,
                roleId: redirectRoleId, scoutedScore: target.fitScore || trueFitScore,
                trueScore: trueFitScore, trueFitScore: trueFitScore, fee: bidResult.fee,
                rivalBid: target.rivalBid || false, wage: targetNegotiatedWage, adjustedScore: target.fitScore || trueFitScore,
                slotQualityAtSigning: candidateScores[target.Name || target.name] ? candidateScores[target.Name || target.name].slotQualityAtSigning : (typeof PlayerUtils !== "undefined" ? PlayerUtils.slotQuality(target, target.fitScore || trueFitScore) : (target.fitScore || trueFitScore))
              });
              signedNames[target.Name] = true;
              ledger.transferBudget -= bidResult.fee;
              ledger.weeklyWageBill += targetNegotiatedWage;

              currentDay += bidResult.rounds * 2;
              eventLog.push({ day: currentDay, type: 'SIGNED', player: target.Name, detail: target.Name + ' SIGNED — £' + formatCurrency(bidResult.fee) + ' (' + bidResult.rounds + '-round negotiation)' });
              currentDay += 1;
            } else {
              dealsCollapsed.push({ name: target.Name, player: target, reason: bidResult.reason, slotId: redirectGapSlot });
              currentDay += bidResult.rounds * 2 + 1;
              var detail = target.Name + ' deal COLLAPSED — ' + (bidResult.reason === 'budget_ceiling' ? 'budget ceiling reached' : 'seller held firm');
              eventLog.push({ day: currentDay, type: 'COLLAPSED', player: target.Name, detail: detail });
              currentDay += 1;
            }
          }
          break;
        }
      }
    });

    // Process incoming bids
    var incomingBids = window.FM24State && window.FM24State.manager && window.FM24State.manager.incomingBids ? window.FM24State.manager.incomingBids : [];
    incomingBids.forEach(function (bid) {
      if (!bid) return;
      if (bid.dofDecision === 'REJECT') {
        eventLog.push({ day: currentDay, type: 'BID_REJECTED', player: bid.player.Name, detail: 'Incoming bid: ' + bid.clubName + ' → ' + bid.player.Name + ' £' + formatCurrency(bid.bidAmount) + ' (REJECTED by DoF)' });
        currentDay += 1;
        return;
      }
      if (bid.player && bid.player.status === 'REFUSES_LEAVE') return;
      if (bid.dofDecision === 'PASS_TO_MANAGER') {
        var mgrArch = archetype;
        var mgrAccept = false;
        if (mgrArch === 'SELL_TO_BUY' || mgrArch === 'OPPORTUNIST') mgrAccept = true;
        if (mgrArch === 'STATESMAN' || mgrArch === 'DEVELOPER') mgrAccept = bid.bidAmount >= (bid.player.AP || 0) * 0.90;

        eventLog.push({ day: currentDay, type: 'BID_PASSED', player: bid.player.Name, detail: 'Incoming bid: ' + bid.clubName + ' → ' + bid.player.Name + ' £' + formatCurrency(bid.bidAmount) + ' passed to manager' });
        currentDay += 1;

        if (mgrAccept) {
          var floor = (bid.player.AP || 0) * (mods ? mods.saleFloorMultiplier : 0.80);
          if (bid.bidAmount >= floor) {
            bid.player.saleFee = bid.bidAmount;
            bid.player.status = "SOLD";
            bid.player.buyerClub = bid.clubName;
            soldPlayers.push(bid.player);
            totalSaleRevenue += bid.bidAmount;
            ledger.weeklyWageBill -= (bid.player.Wage || 0);

            eventLog.push({ day: currentDay, type: 'SOLD', player: bid.player.Name, detail: bid.player.Name + ' SOLD to ' + bid.clubName + ' — £' + formatCurrency(bid.bidAmount) });
            currentDay += 1;
          }
        }
      } else if (bid.dofDecision === 'NEGOTIATE') {
        eventLog.push({ day: currentDay, type: 'BID_NEGOTIATE', player: bid.player.Name, detail: 'Incoming bid: ' + bid.clubName + ' → ' + bid.player.Name + ' £' + formatCurrency(bid.bidAmount) + ' counter-negotiation opened' });
        var negResult = typeof global.dofNegotiate === 'function' ? global.dofNegotiate(bid, bid.player) : { outcome: 'REJECTED' };
        if (negResult.outcome === 'SOLD') {
          bid.player.saleFee = negResult.fee;
          bid.player.status = "SOLD";
          bid.player.buyerClub = bid.clubName;
          soldPlayers.push(bid.player);
          totalSaleRevenue += negResult.fee;
          ledger.weeklyWageBill -= (bid.player.Wage || 0);

          currentDay += 4;
          eventLog.push({ day: currentDay, type: 'SOLD', player: bid.player.Name, detail: bid.player.Name + ' SOLD to ' + bid.clubName + ' — £' + formatCurrency(negResult.fee) + ' (negotiated)' });
          currentDay += 1;
        } else {
          currentDay += 4;
          eventLog.push({ day: currentDay, type: 'COLLAPSED', player: bid.player.Name, detail: bid.player.Name + ' negotiation COLLAPSED with ' + bid.clubName });
          currentDay += 1;
        }
      } else if (bid.dofDecision === 'APPROVE') {
        bid.player.saleFee = bid.bidAmount;
        bid.player.status = "SOLD";
        bid.player.buyerClub = bid.clubName;
        soldPlayers.push(bid.player);
        totalSaleRevenue += bid.bidAmount;
        ledger.weeklyWageBill -= (bid.player.Wage || 0);

        eventLog.push({ day: currentDay, type: 'SOLD', player: bid.player.Name, detail: bid.player.Name + ' SOLD to ' + bid.clubName + ' — £' + formatCurrency(bid.bidAmount) + ' (APPROVED by DoF)' });
        currentDay += 1;
      }
    });

    // 4.4 Free agent signing pass: after all paid signings, sign free agents
    var freeAgentPool = window.FM24State && window.FM24State.freeAgentPool || [];
    if (freeAgentPool.length > 0 && tactic && tactic.slots) {
      freeAgentPool.forEach(function (fa) {
        if (!fa || fa.status !== 'RELEASED') return;
        // Already signed check
        if (signedNames[fa.Name]) return;
        // Wage budget check — free agents have no fee, just wage
        var faWage = fa.Wage || 0;
        if (faWage > 0 && ledger.weeklyWageBill + faWage > (ledger.wageBudget || 500000)) return;

        // Find a gap slot for the free agent
        var bestGapFit = null;
        var bestGapScore = -1;
        for (var gs in audit.gapsMap) {
          var gapSlotDef = tactic.slots[gs];
          if (!gapSlotDef) continue;
          var sc = scorePlayerForRole(fa, gapSlotDef.roleId, instructions);
          var fs = sc ? sc.total : 0;
          if (fs > bestGapScore) {
            bestGapScore = fs;
            bestGapFit = { slot: gs, roleId: gapSlotDef.roleId };
          }
        }
        if (!bestGapFit || bestGapScore < audit.dynamicThreshold - 2) return;

        // Willingness check
        var wScore = willingnessScore(fa, ledger);
        if (wScore < 30) {
          eventLog.push({ day: currentDay, type: 'FA_REJECTED', player: fa.Name, detail: fa.Name + ' (free agent) unwilling to join' });
          return;
        }

        // Sign the free agent
        fa.status = 'SIGNED';
        var trueFitScore = bestGapScore;
        signedPlayers.push({
          name: fa.Name, player: fa, slot: bestGapFit.slot, slotId: bestGapFit.slot,
          roleId: bestGapFit.roleId, scoutedScore: trueFitScore,
          trueScore: trueFitScore, trueFitScore: trueFitScore, fee: 0,
          rivalBid: false, wage: faWage, adjustedScore: trueFitScore,
          slotQualityAtSigning: candidateScores[fa.Name] ? candidateScores[fa.Name].slotQualityAtSigning : trueFitScore,
          isFreeAgent: true
        });
        signedNames[fa.Name] = true;
        ledger.weeklyWageBill += faWage;
        eventLog.push({ day: currentDay, type: 'FA_SIGNED', player: fa.Name, detail: fa.Name + ' signed on a free transfer — £' + formatCurrency(faWage) + '/wk' });
        currentDay += 1;
      });
    }

    // Slot quality scoring
    var allStarters = {};
    for (var sid in audit.startersMap) {
      var st = audit.startersMap[sid];
      var sq = slotQuality(st.player, st.score);
      allStarters[sid] = { slot: sid, player: st.player, fitScore: st.score, slotQuality: sq, reliable: reliabilityRating(st.player) >= 9 };
    }

    for (var spi = 0; spi < signedPlayers.length; spi++) {
      var sg = signedPlayers[spi];
      if (!allStarters[sg.slot] || allStarters[sg.slot].fitScore < audit.dynamicThreshold || !allStarters[sg.slot].reliable) {
        var sq = slotQuality(sg.player, sg.trueScore);
        allStarters[sg.slot] = { slot: sg.slot, player: sg.player, fitScore: sg.trueScore, slotQuality: sq, reliable: reliabilityRating(sg.player) >= 9 };
      }
    }

    var slotList = [];
    for (var sid in allStarters) { slotList.push(allStarters[sid]); }

    var captain = null;
    var highestLdr = -1;
    for (var sli = 0; sli < slotList.length; sli++) {
      var p = slotList[sli].player;
      var ldr = getPlayerAttr(p, "Ldr");
      if (ldr > highestLdr) { highestLdr = ldr; captain = slotList[sli]; }
    }
    if (captain && highestLdr >= 14) {
      var unrestCount = window.FM24State && window.FM24State.manager && window.FM24State.manager.unrestPlayers ? window.FM24State.manager.unrestPlayers.length : 0;
      var capBonus = Math.max(0.1, 0.3 - unrestCount * 0.2);
      slotList.forEach(function (s) { if (s !== captain) s.slotQuality += capBonus; });
    }

    var slotQualityTable = slotList.map(function (s) {
      return { slot: s.slot, player: s.player, fitScore: Math.round(s.fitScore * 10) / 10, slotQuality: Math.round(s.slotQuality * 10) / 10, reliable: s.reliable };
    });

    // Sync designations
    var designations = audit.designations || [];
    designations.forEach(function (d) {
      var p = d.player;
      if (p.status === "SOLD") { d.designation = "Sell"; d.reason = "Sold"; }
      else if (p.status === "RELEASED") { d.designation = "Sell"; d.reason = "Released on Free Transfer"; }
      else if (p.status === "LOANED" || p.status === "LOAN") { d.designation = "Keep"; d.reason = "Loaned Out"; }
      else if (p.status === "PROTECTED_LOAN") { d.designation = "Keep"; d.reason = "Young Prospect"; }
      else if (p.status === "REFUSES_LEAVE") { d.designation = "Sell"; d.reason = "Transfer Listed (Refused to leave)"; }
      else if (p.status === "UNSOLD") { d.designation = "Sell"; d.reason = "Transfer Listed (No bids)"; }
      else if (p.status === "EMERGENCY_SOLD") { d.designation = "Sell"; d.reason = "Emergency Sale"; }
    });

    var startSlotQualitySum = 0;
    var startSlotCount = 0;
    for (var sid in audit.startersMap) {
      var st = audit.startersMap[sid];
      var sq = slotQuality(st.player, st.score);
      startSlotQualitySum += sq;
      startSlotCount++;
    }
    var startSquadAvgQuality = startSlotCount > 0 ? (startSlotQualitySum / startSlotCount) : 0;

    var endSlotQualitySum = 0;
    var endSlotCount = 0;
    slotQualityTable.forEach(function (s) {
      endSlotQualitySum += s.slotQuality;
      endSlotCount++;
    });
    var endSquadAvgQuality = endSlotCount > 0 ? (endSlotQualitySum / endSlotCount) : 0;

    // SIGN_ROLE promise breach check
    var negState = window.FM24State.manager.negotiation || {};
    var promises = negState.promises || [];
    var windowCount = window.FM24State.manager.windowCount || 0;
    for (var pmi = 0; pmi < promises.length; pmi++) {
      var pr = promises[pmi];
      if (pr.type === 'SIGN_ROLE' && pr.deadline <= windowCount && !pr.fulfilled && !pr.broken) {
        pr.broken = true;
        eventLog.push({ day: currentDay, type: 'PROMISE_BREACH', player: null, detail: 'Promise broken: ' + (pr.detail || pr.type) + ' — no player signed' });
        window.FM24State.manager.relationshipIndex = (window.FM24State.manager.relationshipIndex || 60) - 10;
      }
    }

    return {
      archetype: archetype,
      hybridTags: partAResult.hybridTags,
      startSquadAvgQuality: Math.round(startSquadAvgQuality * 10) / 10,
      endSquadAvgQuality: Math.round(endSquadAvgQuality * 10) / 10,
      signedPlayers: signedPlayers,
      scoutingBusts: scoutingBusts,
      dealsCollapsed: dealsCollapsed,
      refusedListings: refusedListings,
      unsoldSurplus: unsoldSurplus,
      emergencySales: emergencySales,
      rivalInflatedDeals: rivalInflatedDeals,
      protectedLoanees: protectedLoanees,
      slotQualityTable: slotQualityTable,
      eventLog: eventLog,
      transferBudgetRemaining: ledger.transferBudget,
      wageBudgetRemaining: ledger.wageBudget - ledger.weeklyWageBill,
      weeklyWageBill: ledger.weeklyWageBill,
      releasedPlayers: releasedPlayers,
      soldPlayers: soldPlayers,
      loanedPlayers: loanedPlayers,
      totalSaleRevenue: totalSaleRevenue,
      totalSpent: signedPlayers.reduce(function (s, p) { return s + p.fee; }, 0),
      designations: designations,
      thresholds: {
        squadQuality: Math.round(audit.squadQuality * 10) / 10,
        satisfaction: audit.dynamicThreshold,
        backup: audit.dynamicBackupThreshold,
        candidate: audit.candidateMinScore
      },
      unreliableStarters: audit.unreliableStarters
    };
  }

  function negotiateSaleWithFloor(player, mods, minFee) {
    var askingPrice = player.AP || 0;
    var sold = false;
    var saleRevenue = 0;
    var det = getPlayerAttr(player, "Det");
    var prof = getPlayerAttr(player, "Prof");
    var amb = getPlayerAttr(player, "Amb");
    var round = 0;

    for (round = 0; round < 3; round++) {
      var buyerOffer = askingPrice * (0.72 + Math.random() * 0.22 + (prof / 20) * 0.02);
      if (buyerOffer >= minFee) {
        sold = true;
        saleRevenue = buyerOffer;
        break;
      }
      var factor = (0.94 - (amb / 20) * 0.02);
      askingPrice *= factor;
      minFee *= factor;
      var walkAwayChance = 0.08 + (det / 20) * 0.06 - (prof / 20) * 0.04;
      if (Math.random() < walkAwayChance) break;
    }

    var buyerClub = "Unknown Club";
    if (sold) {
      buyerClub = typeof getRealisticClubForPlayer === "function"
        ? getRealisticClubForPlayer(player, "sale")
        : "Unknown Club";
    }

    return sold 
      ? { outcome: 'SOLD', revenue: saleRevenue, rounds: Math.min(3, round + 1), buyerClub: buyerClub } 
      : { outcome: 'UNSOLD', rounds: Math.min(3, round + 1) };
  }

  // ─── EXPORT ───
  global.simulateTransferWindowV2 = simulateTransferWindowV2;
  global.reliabilityRating = typeof PlayerUtils !== "undefined" ? PlayerUtils.reliabilityRating : reliabilityRating;
  global.slotQuality = typeof PlayerUtils !== "undefined" ? PlayerUtils.slotQuality : slotQuality;
  global.resolveTransferArchetype = resolveArchetype;
  global.runPartA = runPartA;
  global.runPartB = runPartB;
  global.buildReason = buildReason;

  global.testAPI = {
    getAgeDecay: getAgeDecay,
    getNegotiatedWage: getNegotiatedWage,
    classifyTier: classifyTier,
    negotiateSale: negotiateSale,
    negotiateSaleWithFloor: negotiateSaleWithFloor,
    attemptTransfer: attemptTransfer,
    canAfford: canAfford
  };

})(typeof window !== "undefined" ? window : global);
