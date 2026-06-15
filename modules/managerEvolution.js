// ─── MANAGER EVOLUTION SYSTEM ───
// Evaluates four pressure signals after transfer windows and squad imports
// to determine whether the manager's tactic, philosophy, or recruitment
// should drift in response to squad changes, player development,
// board confidence, and the DoF-manager relationship.

var THRESHOLDS = {
  TACTIC_SQUAD:         35,
  TACTIC_GROWTH:        40,
  TACTIC_SCORE_GRACE:    5,
  TACTIC_MIN_SLOT_DIFF:  3,
  PHILOSOPHY:           50,
  PHILOSOPHY_BOARD:     65
};

var PHILOSOPHY_FAMILIES = {
  'gegenpress':     'high-intensity',
  'counter-press':  'high-intensity',
  'tiki-taka':      'possession',
  'possession':     'possession',
  'route one':      'direct',
  'counter':        'direct',
  'low-block':      'defensive',
  'park-the-bus':   'defensive'
};

var BOARD_PRESSURE_MAP = {
  NORMAL:           0,
  SCRUTINY:        30,
  PRESSURE:        65,
  DISMISSAL_RISK:  90
};

// ─── HELPERS ───

function _diffTactics(oldTactic, newTactic) {
  var result = {
    formationChanged: false,
    slotsChanged: [],
    instructionsChanged: [],
    slotDeltaCount: 0
  };

  if (!oldTactic || !newTactic) return result;
  if (oldTactic.formation !== newTactic.formation) {
    result.formationChanged = true;
  }

  if (newTactic.slots) {
    var slotIds = Object.keys(newTactic.slots);
    for (var i = 0; i < slotIds.length; i++) {
      var sid = slotIds[i];
      var oldSlot = oldTactic.slots && oldTactic.slots[sid];
      var newSlot = newTactic.slots[sid];
      if (!oldSlot || !newSlot) {
        result.slotsChanged.push(sid);
      } else if (oldSlot.roleId !== newSlot.roleId || oldSlot.duty !== newSlot.duty) {
        result.slotsChanged.push(sid);
      }
    }
  }

  if (newTactic.instructions && oldTactic.instructions) {
    var allKeys = Object.keys(newTactic.instructions);
    for (var ki = 0; ki < allKeys.length; ki++) {
      var k = allKeys[ki];
      if (newTactic.instructions[k] !== oldTactic.instructions[k]) {
        result.instructionsChanged.push(k);
      }
    }
  }

  result.slotDeltaCount = result.slotsChanged.length;
  return result;
}

function _recsAreDifferent(oldRecs, newRecs) {
  if (!oldRecs || !newRecs) return true;
  if (oldRecs.length !== newRecs.length) return true;
  for (var i = 0; i < newRecs.length; i++) {
    if (newRecs[i].playerName !== oldRecs[i].playerName) return true;
  }
  return false;
}

function _meetsThreshold(diff, thresholds) {
  if (diff.formationChanged) return true;
  if (diff.slotDeltaCount >= (thresholds.TACTIC_MIN_SLOT_DIFF || 3)) return true;
  return false;
}

function _buildEvolutionLogEntry(windowIndex, signals, drifts) {
  return {
    windowIndex: windowIndex,
    timestamp: new Date().toISOString(),
    signals: {
      squadPressure: signals.squadPressure || 0,
      growthPressure: signals.growthPressure || 0,
      boardPressure: signals.boardPressure || 0,
      relationshipDamper: signals.relationshipDamper || 1.0
    },
    changes: drifts.map(function (d) {
      var summary = '';
      if (d.type === 'tactic') {
        summary = d.diff.formationChanged
          ? 'Manager shifted to ' + d.newTactic.formation + ' (' + d.diff.slotDeltaCount + ' role changes)'
          : 'Manager adjusted ' + d.diff.slotDeltaCount + ' roles';
      } else if (d.type === 'philosophy') {
        summary = 'Philosophy shifted toward ' + d.to;
      } else if (d.type === 'recruitment') {
        summary = 'Transfer priorities updated (' + d.newRecommendations.length + ' targets)';
      }
      return {
        type: d.type,
        summary: summary,
        detail: JSON.parse(JSON.stringify(d))
      };
    })
  };
}

function buildNewFitBaseline(squad, tactic) {
  var baseline = {};
  if (!squad || !tactic || !tactic.slots) return baseline;
  for (var pi = 0; pi < squad.length; pi++) {
    var player = squad[pi];
    var slotEntries = Object.entries(tactic.slots);
    var found = null;
    for (var si = 0; si < slotEntries.length; si++) {
      var assignment = slotEntries[si][1];
      if (assignment.playerName === player.Name) { found = slotEntries[si]; break; }
    }
    if (!found) continue;
    var slotAssignment = found[1];
    if (!slotAssignment.roleId) continue;
    var score = scorePlayerForRole(player, slotAssignment.roleId, tactic.instructions);
    baseline[player.Name] = score ? score.total : 0;
  }
  return baseline;
}

// ─── PRESSURE VECTOR ───

function buildPressureVector(state, manager, squad) {
  var signals = {
    squadPressure: 0,
    growthPressure: 0,
    relationshipDamper: 1.0,
    boardPressure: 0
  };

  if (!state || !manager) return signals;

  // Squad pressure: transfers in/out that mismatch the current tactic
  var tactic = state.tactic;
  var transfers = manager.transfers || { in: [], out: [] };
  var mismatchCount = 0;
  var keyDepartureCount = 0;

  // Count new signings whose best fit is outside the current formation
  if (tactic && tactic.isComplete && tactic.slots) {
    for (var ti = 0; ti < transfers.in.length; ti++) {
      var signing = transfers.in[ti];
      if (!signing || !signing.player) continue;
      var fits = findBestTacticFitForPlayer(signing.player);
      if (!fits || fits.length === 0) mismatchCount++;
    }

    // Count key departures — players who were top-ranked for a slot
    for (var to = 0; to < transfers.out.length; to++) {
      var departure = transfers.out[to];
      if (!departure || !departure.player) continue;
      var slotIds = Object.keys(tactic.slots);
      for (var si = 0; si < slotIds.length; si++) {
        var sid = slotIds[si];
        var slot = tactic.slots[sid];
        if (!slot || !slot.roleId) continue;
        var ranked = rankPlayersForSlot(squad, sid);
        if (ranked.length > 0 && ranked[0].player.Name === departure.player.Name) {
          keyDepartureCount++;
        }
      }
    }
  }

  signals.squadPressure = Math.min(100, mismatchCount * 15 + keyDepartureCount * 20);

  // Growth pressure: average fit score delta vs baseline
  if (tactic && tactic.isComplete && manager.lastFitBaseline) {
    var assigned = [];
    var slotEntries = tactic.slots ? Object.entries(tactic.slots) : [];
    for (var pi = 0; pi < squad.length; pi++) {
      var p = squad[pi];
      for (var ei = 0; ei < slotEntries.length; ei++) {
        if (slotEntries[ei][1].playerName === p.Name) {
          assigned.push({ player: p, slotId: slotEntries[ei][0], assignment: slotEntries[ei][1] });
          break;
        }
      }
    }

    var totalDelta = 0;
    var count = 0;
    for (var ai = 0; ai < assigned.length; ai++) {
      var a = assigned[ai];
      if (!a.assignment.roleId) continue;
      var currentScore = scorePlayerForRole(a.player, a.assignment.roleId, tactic.instructions);
      var cs = currentScore ? currentScore.total : 0;
      var baselineScore = manager.lastFitBaseline[a.player.Name];
      if (baselineScore !== undefined) {
        totalDelta += (cs - baselineScore);
        count++;
      }
    }
    var avgDelta = count > 0 ? totalDelta / count : 0;
    signals.growthPressure = Math.min(100, Math.abs(avgDelta) * 4);
  }

  // Relationship damper
  var rel = manager.relationshipIndex !== undefined ? manager.relationshipIndex : 60;
  if (rel >= 85) signals.relationshipDamper = 1.3;
  else if (rel >= 70) signals.relationshipDamper = 1.0;
  else if (rel >= 50) signals.relationshipDamper = 0.8;
  else if (rel >= 30) signals.relationshipDamper = 0.4;
  else signals.relationshipDamper = 0.0;

  // Board pressure
  var boardStage = (state.board && state.board.stage) || 'NORMAL';
  signals.boardPressure = BOARD_PRESSURE_MAP[boardStage] || 0;

  // Broken promise penalty
  var negState = state.negotiation || {};
  var promises = negState.promises || [];
  var brokenCount = 0;
  for (var ppi = 0; ppi < promises.length; ppi++) {
    if (promises[ppi].broken) brokenCount++;
  }
  signals.brokenPromisePenalty = brokenCount * 8;
  signals.relationshipSignal = (signals.relationshipSignal || 0) + signals.brokenPromisePenalty;

  // Alignment baseline signal
  var alignmentScore = negState.alignmentScore || 50;
  if (alignmentScore < 50) {
    var alignPenalty = (50 - alignmentScore) * 0.3;
    signals.relationshipSignal = (signals.relationshipSignal || 0) + alignPenalty;
  }

  // ─── PLAYING TIME ALIGNMENT SIGNAL ───
  // Compares AgreedPT vs ActualPT across squad; mismatches generate squad pressure
  if (squad && typeof PlayerUtils !== "undefined") {
    var ptMismatchCount = 0;
    var ptSeveritySum = 0;
    for (var pti = 0; pti < squad.length; pti++) {
      var p = squad[pti];
      if (!p.AgreedPT || !p.ActualPT) continue;
      var agreedRank = PlayerUtils.getPTRank ? PlayerUtils.getPTRank(p.AgreedPT) : 0;
      var actualRank = PlayerUtils.getPTRank ? PlayerUtils.getPTRank(p.ActualPT) : 0;
      var delta = agreedRank - actualRank;
      if (delta >= 2) {
        ptMismatchCount++;
        ptSeveritySum += delta;
      }
    }
    signals.playingTimePressure = Math.min(100, ptMismatchCount * 8 + ptSeveritySum * 4);
    signals.squadPressure = Math.min(100, signals.squadPressure + signals.playingTimePressure);
  } else {
    signals.playingTimePressure = 0;
  }

  // ─── AVERAGE RATING DRIFT SIGNAL ───
  // Tracks average AvRat across squad vs stored baseline; generates growth pressure on decline
  if (squad) {
    var ratedPlayers = [];
    for (var rdi = 0; rdi < squad.length; rdi++) {
      var rp = squad[rdi];
      if (rp.AvRat != null && !isNaN(rp.AvRat) && rp.AvRat > 0) {
        ratedPlayers.push(rp.AvRat);
      }
    }
    var currentAvgRating = ratedPlayers.length > 0
      ? ratedPlayers.reduce(function(a, b) { return a + b; }, 0) / ratedPlayers.length
      : 0;
    var lastAvgRating = manager.lastAvgRating || 0;
    if (lastAvgRating > 0 && currentAvgRating > 0) {
      var ratingDelta = currentAvgRating - lastAvgRating;
      if (ratingDelta < -0.1) {
        signals.avgRatingDecline = Math.min(100, Math.abs(ratingDelta) * 50);
        signals.growthPressure = Math.min(100, signals.growthPressure + signals.avgRatingDecline);
      } else {
        signals.avgRatingDecline = 0;
      }
    } else {
      signals.avgRatingDecline = 0;
    }
    // Store for next cycle
    manager.lastAvgRating = currentAvgRating;
  } else {
    signals.avgRatingDecline = 0;
  }

  return signals;
}

// ─── SQUAD FIT DELTA ───

function scoreSquadFitDelta(squad, tactic) {
  if (!tactic || !tactic.isComplete) return 0;
  var manager = window.FM24State && window.FM24State.manager;
  var baseline = (manager && manager.lastFitBaseline) || {};

  var totalDelta = 0;
  var count = 0;
  var slotEntries = tactic.slots ? Object.entries(tactic.slots) : [];

  for (var pi = 0; pi < squad.length; pi++) {
    var player = squad[pi];
    for (var si = 0; si < slotEntries.length; si++) {
      var entry = slotEntries[si];
      if (entry[1].playerName === player.Name) {
        var slotAssignment = entry[1];
        if (!slotAssignment.roleId) continue;
        var currentScore = scorePlayerForRole(player, slotAssignment.roleId, tactic.instructions);
        var cs = currentScore ? currentScore.total : 0;
        var bl = baseline[player.Name];
        if (bl !== undefined) {
          totalDelta += (cs - bl);
          count++;
        }
        break;
      }
    }
  }

  return count > 0 ? totalDelta / count : 0;
}

// ─── EVOLUTION SUMMARY ───

function getEvolutionSummary(manager) {
  if (!manager || !manager.evolutionHistory || manager.evolutionHistory.length === 0) {
    return 'No evolution events recorded.';
  }
  var last = manager.evolutionHistory[manager.evolutionHistory.length - 1];
  var changeText = last.changes.map(function (c) { return c.summary; }).join('; ');
  return 'Window ' + last.windowIndex + ': ' + changeText;
}

// ─── MAIN ENGINE ───

function computeEvolutionSignal(state, manager, squad) {
  if (!state || !manager || !squad) {
    return { changed: false, drifts: [], signals: null };
  }

  // Auto-set evolutionLocked based on relationshipIndex with hysteresis band
  var rel = manager.relationshipIndex !== undefined ? manager.relationshipIndex : 60;
  if (rel < 30 && !manager.evolutionLocked) {
    manager.evolutionLocked = true;
  } else if (rel > 35 && manager.evolutionLocked) {
    manager.evolutionLocked = false;
  }

  if (manager.evolutionLocked) {
    return { changed: false, drifts: [], signals: null };
  }

  var signals = buildPressureVector(state, manager, squad);
  var drifts = [];

  // Apply relationship damper to squad and growth pressure
  var damper = signals.relationshipDamper;
  var dampedSquadPressure = Math.round(signals.squadPressure * damper);
  var dampedGrowthPressure = Math.round(signals.growthPressure * damper);

  // ─── TACTIC DRIFT ───
  if (dampedSquadPressure > THRESHOLDS.TACTIC_SQUAD ||
      dampedGrowthPressure > THRESHOLDS.TACTIC_GROWTH) {

    // Board pressure can suppress tactic drift at DISMISSAL_RISK
    if (signals.boardPressure < 90) {
      var hired = manager.hired;
      var newTactic = (typeof generateTacticFromManager === 'function')
        ? generateTacticFromManager(hired, squad)
        : null;

      if (newTactic && newTactic.formation && newTactic.slots) {
        var currentTactic = manager.generatedTactic || state.tactic;
        var tacticDiff = _diffTactics(currentTactic, newTactic);

        if (_meetsThreshold(tacticDiff, THRESHOLDS)) {
          var currentScore = 0;
          var newScore = 0;
          if (typeof evaluateTacticFeasibility === 'function') {
            currentScore = evaluateTacticFeasibility(state.tactic).overallScore;
            newScore = evaluateTacticFeasibility(newTactic).overallScore;
          }
          if (newScore >= currentScore - THRESHOLDS.TACTIC_SCORE_GRACE) {
            drifts.push({ type: 'tactic', newTactic: newTactic, diff: tacticDiff });
          }
        }
      }
    }
  }

  // ─── PHILOSOPHY DRIFT ───
  var philosophyTrigger = false;
  if (dampedSquadPressure > THRESHOLDS.PHILOSOPHY) philosophyTrigger = true;
  if (signals.boardPressure > THRESHOLDS.PHILOSOPHY_BOARD) philosophyTrigger = true;

  if (philosophyTrigger && hired && typeof deriveManagerPhilosophy === 'function') {
    var newPhilosophy = deriveManagerPhilosophy(hired, squad);
    var currentPhilosophy = hired.philosophy || 'balanced';
    var normalizedNew = (newPhilosophy || 'balanced').toLowerCase();
    var normalizedCurrent = currentPhilosophy.toLowerCase();

    if (normalizedNew !== normalizedCurrent) {
      // Board pressure bias toward conservative archetypes
      var effectivePhilosophy = normalizedNew;
      if (signals.boardPressure >= 65) {
        var safeMap = {
          'gegenpress': 'counter-press',
          'counter-press': 'counter',
          'tiki-taka': 'possession',
          'possession': 'possession'
        };
        effectivePhilosophy = safeMap[normalizedNew] || normalizedNew;
      }

      if (effectivePhilosophy !== normalizedCurrent) {
        var oldFam = PHILOSOPHY_FAMILIES[normalizedCurrent] || '';
        var newFam = PHILOSOPHY_FAMILIES[effectivePhilosophy] || '';
        if (oldFam !== newFam) {
          drifts.push({ type: 'philosophy', from: normalizedCurrent, to: effectivePhilosophy });
        }
      }
    }
  }

  // ─── RECRUITMENT DRIFT (always recomputed) ───
  if (typeof generateTransferRecommendations === 'function') {
    var newRecs = generateTransferRecommendations(hired, squad, state.tactic);
    var oldRecs = manager.recommendations || [];
    if (_recsAreDifferent(oldRecs, newRecs)) {
      // Determine what drove this evolution cycle
      var drivenBy = 'squad_change';
      if (signals.boardPressure > THRESHOLDS.PHILOSOPHY_BOARD) {
        drivenBy = 'board_pressure';
      } else if (dampedSquadPressure > THRESHOLDS.TACTIC_SQUAD) {
        drivenBy = 'squad_change';
      } else if (dampedGrowthPressure > THRESHOLDS.TACTIC_GROWTH) {
        drivenBy = 'growth';
      }
      // If philosophy also changed, upgrade to philosophy_shift
      for (var di = 0; di < drifts.length; di++) {
        if (drifts[di].type === 'philosophy') { drivenBy = 'philosophy_shift'; break; }
      }
      drifts.push({ type: 'recruitment', newRecommendations: newRecs, drivenBy: drivenBy });
    }
  }

  return {
    changed: drifts.length > 0,
    drifts: drifts,
    signals: signals
  };
}

// ─── APPLY EVOLUTION ───

function applyEvolution(evolutionResult, state) {
  if (!evolutionResult || !evolutionResult.changed) {
    // Always update fit baseline even if no drift fired
    if (state && state.manager && typeof buildNewFitBaseline === 'function') {
      state.manager.lastFitBaseline = buildNewFitBaseline(state.squad, state.tactic);
    }
    return;
  }

  var drifts = evolutionResult.drifts;
  var manager = state.manager;
  var toasts = [];

  for (var di = 0; di < drifts.length; di++) {
    var drift = drifts[di];

    if (drift.type === 'tactic') {
      var newTactic = drift.newTactic;
      var diff = drift.diff;

      if (diff.formationChanged) {
        setFormation(newTactic.formation);
        // Apply all 11 role assignments from new tactic after setFormation
        var sids = Object.keys(newTactic.slots);
        for (var si = 0; si < sids.length; si++) {
          var sid = sids[si];
          var newRole = newTactic.slots[sid];
          if (newRole && newRole.roleId) {
            state.tactic.slots[sid] = {
              roleId: newRole.roleId,
              duty: newRole.duty,
              playerName: state.tactic.slots[sid] ? state.tactic.slots[sid].playerName : null
            };
          }
        }
        toasts.push('Your manager has shifted to ' + newTactic.formation + '. ' + diff.slotDeltaCount + ' role' + (diff.slotDeltaCount !== 1 ? 's' : '') + ' updated.');
      } else {
        // Surgical slot updates
        for (var sci = 0; sci < diff.slotsChanged.length; sci++) {
          var changedSid = diff.slotsChanged[sci];
          var changedRole = newTactic.slots[changedSid];
          if (changedRole && changedRole.roleId) {
            state.tactic.slots[changedSid].roleId = changedRole.roleId;
            state.tactic.slots[changedSid].duty = changedRole.duty;
          }
        }
        if (diff.slotDeltaCount > 0) {
          toasts.push('Your manager has adjusted ' + diff.slotDeltaCount + ' role' + (diff.slotDeltaCount !== 1 ? 's' : '') + ' to better suit the squad.');
        }
      }

      // Apply instruction changes
      for (var ici = 0; ici < diff.instructionsChanged.length; ici++) {
        var icKey = diff.instructionsChanged[ici];
        state.tactic.instructions[icKey] = newTactic.instructions[icKey];
      }

      if (diff.instructionsChanged.length > 0 && diff.slotDeltaCount === 0 && !diff.formationChanged) {
        toasts.push('Your manager has tweaked tactical instructions.');
      }

      checkTacticComplete();
      if (typeof invalidateSquadFitCache === 'function') invalidateSquadFitCache();
      window.dispatchEvent(new CustomEvent('fm24:tactic-imported'));
    }

    if (drift.type === 'philosophy') {
      manager.hired.philosophy = drift.to;
      toasts.push('Your manager\'s philosophy is drifting toward ' + drift.to + '.');
    }

    if (drift.type === 'recruitment') {
      var recsWithDriver = drift.newRecommendations.map(function (r) {
        r.drivenBy = drift.drivenBy || 'squad_change';
        return r;
      });
      manager.recommendations = recsWithDriver;
      toasts.push('Your manager has updated transfer priorities.');
    }
  }

  // Update baseline after applying changes
  manager.lastFitBaseline = buildNewFitBaseline(state.squad, state.tactic);

  // Write evolution log entry
  var logEntry = _buildEvolutionLogEntry(
    manager.windowCount || 0,
    evolutionResult.signals,
    drifts
  );
  if (!manager.evolutionHistory) manager.evolutionHistory = [];
  manager.evolutionHistory.push(logEntry);

  // Show toasts staggered
  if (toasts.length > 0) {
    if (typeof showToast === 'function') {
      showToast(toasts[0], 'info');
      for (var ti = 1; ti < toasts.length; ti++) {
        (function (msg, delay) {
          setTimeout(function () { showToast(msg, 'info'); }, delay);
        })(toasts[ti], ti * 800);
      }
    }
  }
}
