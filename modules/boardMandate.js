(function (global) {
  "use strict";

  function formatCurrency(val) {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + "M";
    if (val >= 1000) return (val / 1000).toFixed(0) + "K";
    return String(val);
  }

  var STAGE_THRESHOLDS = {
    SCRUTINY: 40,
    PRESSURE: 20,
    DISMISSAL_RISK: 0
  };

  function resolveStage(confidence) {
    if (confidence <= 0) return 'DISMISSAL_RISK';
    if (confidence < 20) return 'PRESSURE';
    if (confidence < 40) return 'SCRUTINY';
    return 'NORMAL';
  }

  function applyBoardConstraint(squad, board) {
    if (!squad || !board) return [];
    var constraints = [];
    var stage = board.stage || 'NORMAL';
    if (stage === 'SCRUTINY') {
      squad.forEach(function (p) {
        if (p.status === 'LOAN' && (p.CA || 0) >= 140) {
          p.status = 'KEEP';
          constraints.push('SCRUTINY: ' + (p.Name || 'Player') + ' (CA ' + p.CA + ') retained — board scrutiny prevents loaning key players');
        }
      });
    }
    if (stage === 'PRESSURE') {
      squad.forEach(function (p) {
        if (p.status === 'LOAN' && (p.CA || 0) >= 130) {
          p.status = 'KEEP';
          constraints.push('PRESSURE: ' + (p.Name || 'Player') + ' (CA ' + p.CA + ') retained — board pressure restricts loans');
        }
        if (p.status !== 'SELL' && p.status !== 'RELEASE') {
          var priority = p.rolePriority || '';
          if ((priority === 'STARTER' || priority === 'KEY_PLAYER') && (p.Age || 0) >= 30) {
            p.delaySale = true;
            constraints.push('PRESSURE: ' + (p.Name || 'Player') + ' flagged for delayed sale — board requires replacement first');
          }
        }
      });
    }
    if (stage === 'DISMISSAL_RISK') {
      constraints.push('DISMISSAL_RISK: Board confidence is critically low — dismissal pending. All non-essential sales frozen.');
      squad.forEach(function (p) {
        if (p.status === 'SELL' && (p.rolePriority || '') === 'STARTER') {
          p.status = 'KEEP';
          constraints.push('DISMISSAL_RISK: ' + (p.Name || 'Player') + ' sale blocked — starter retention mandated');
        }
      });
    }
    return constraints;
  }

  function checkDismissalCondition(board) {
    if (!board) return { dismissed: false };
    board.stage = resolveStage(board.confidence);
    if (board.stage === 'DISMISSAL_RISK' && !board.dismissalPending) {
      board.dismissalPending = true;
      return { dismissed: true, message: 'Board confidence has collapsed. A dismissal vote is pending.' };
    }
    if (board.stage === 'DISMISSAL_RISK' && !board.reprieverActive && board.mandateHistory.length >= 3) {
      board.reprieverActive = true;
      board.reprieveMandates = generateReprieveMandates(board);
      return { dismissed: false, reprieve: true, message: 'Final reprieve granted — meet reprieve mandates to save your position.' };
    }
    return { dismissed: false };
  }

  function generateReprieveMandates(board) {
    return [
      { type: 'REPRIEVE_WIN', target: 3, description: 'Win ' + 3 + ' of the next ' + 5 + ' matches', met: false },
      { type: 'REPRIEVE_SIGNING', target: 1, description: 'Sign at least 1 player with CA >= 140 before next window', met: false },
      { type: 'REPRIEVE_SALE', target: 7500000, description: 'Generate at least \u00a3' + formatCurrency(7500000) + ' in player sales', met: false }
    ];
  }

  function applyReprieve(squad, board) {
    if (!board || !board.reprieverActive || !board.reprieveMandates) return [];
    var results = [];
    board.reprieveMandates.forEach(function (m) {
      switch (m.type) {
        case 'REPRIEVE_SIGNING':
          m.met = board.signingHistory ? board.signingHistory.some(function (s) { return (s.ca || s.CA || 0) >= 140; }) : false;
          if (m.met) results.push('Reprieve mandate met: signed a player with CA >= 140');
          break;
        case 'REPRIEVE_SALE':
          var totalSold = board.saleProceeds || 0;
          m.met = totalSold >= (m.target || 7500000);
          if (m.met) results.push('Reprieve mandate met: generated \u00a3' + formatCurrency(totalSold) + ' in sales');
          break;
      }
    });
    var allMet = board.reprieveMandates.every(function (m) { return m.met; });
    if (allMet) {
      board.reprieverActive = false;
      board.reprieveMandates = [];
      board.dismissalPending = false;
      board.confidence = Math.min(100, board.confidence + 30);
      board.stage = resolveStage(board.confidence);
      results.push('All reprieve mandates met. Dismissal cancelled. Confidence restored to ' + board.confidence + '.');
    }
    return results;
  }

  function generateBoardMandate(squad, ledger, gaps) {
    var mandates = [];
    if (!squad || squad.length === 0) return mandates;

    var avgAge = squad.reduce(function (s, p) { return s + (p.Age || 0); }, 0) / squad.length;
    var wagePressure = (ledger.weeklyWageBill || 0) / (ledger.wageBudget || 1);
    var highPACount = squad.filter(function (p) {
      return (p.PA || 0) > (p.CA || 0) + 15 && (p.Age || 0) <= 23;
    }).length;
    var criticalGaps = gaps ? gaps.filter(function (g) { return g.priority === 'CRITICAL' || g.priority === 'Critical'; }).length : 0;

    if (criticalGaps >= 2) {
      mandates.push({ type: 'ADDRESS_GAPS', target: criticalGaps, description: 'Fill at least ' + criticalGaps + ' critical positional gaps', met: false });
    } else if (wagePressure >= 0.88) {
      var targetWage = Math.round((ledger.wageBudget || 500000) * 0.80);
      mandates.push({ type: 'REDUCE_WAGE_BILL', target: targetWage, description: 'Reduce weekly wage bill below \u00a3' + formatCurrency(targetWage) + '/w', met: false });
    } else if (avgAge >= 28) {
      var targetAge = avgAge - 1.5;
      mandates.push({ type: 'REDUCE_AVERAGE_AGE', target: targetAge, description: 'Lower squad average age below ' + targetAge.toFixed(1), met: false });
    } else {
      mandates.push({ type: 'STRENGTHEN_SQUAD', description: 'Improve overall squad quality \u2014 sign at least one player above candidateMinScore + 2.0', met: false });
    }

    if (highPACount >= 3 && mandates[0].type !== 'ADDRESS_GAPS') {
      var targetCount = Math.ceil(highPACount / 2);
      mandates.push({ type: 'PROMOTE_YOUTH', target: targetCount, description: 'Ensure ' + targetCount + ' high-PA youngsters have starting or depth roles', met: false });
    }

    return mandates;
  }

  // 6.3 Board Objective Arcs — multi-window strategic objectives
  function generateObjectiveArc(squad, board, windowCount) {
    if (!squad || squad.length === 0) return null;
    if (board.objectiveArcs) {
      var activeArc = board.objectiveArcs.find(function (a) { return a.status === 'ACTIVE'; });
      if (activeArc) return null;
      var recent = board.objectiveArcs.filter(function (a) { return a.status === 'COMPLETED'; });
      if (recent.length > 0 && recent[recent.length - 1].completedWindow >= windowCount - 1) return null;
    }
    var avgAge = squad.reduce(function (s, p) { return s + (p.Age || 0); }, 0) / squad.length;
    var possibleArcs = [];
    if (avgAge >= 27) {
      var targetAge = Math.max(24, avgAge - 3);
      possibleArcs.push({
        type: 'REDUCE_AGE',
        description: 'Reduce squad average age from ' + avgAge.toFixed(1) + ' to under ' + targetAge.toFixed(1) + ' within 3 windows',
        target: targetAge,
        startAge: avgAge,
        windowsRemaining: 3,
        status: 'ACTIVE',
        createdWindow: windowCount
      });
    }
    var qualityArc = {
      type: 'IMPROVE_QUALITY',
      description: 'Improve overall squad slot quality by at least 2.0 points within 3 windows',
      target: 2.0,
      startQuality: null,
      windowsRemaining: 3,
      status: 'ACTIVE',
      createdWindow: windowCount
    };
    possibleArcs.push(qualityArc);
    var salaryArc = {
      type: 'CONTROL_WAGES',
      description: 'Keep weekly wage bill under ' + formatCurrency((board.wageBaseline || 500000) * 1.10) + ' for 3 consecutive windows',
      target: (board.wageBaseline || 500000) * 1.10,
      windowsRemaining: 3,
      status: 'ACTIVE',
      createdWindow: windowCount
    };
    possibleArcs.push(salaryArc);
    var pickIdx = 0;
    if (avgAge < 27) pickIdx = 1;
    var chosen = possibleArcs[pickIdx] || possibleArcs[0];
    if (!board.objectiveArcs) board.objectiveArcs = [];
    board.objectiveArcs.push(chosen);
    return chosen;
  }

  function evaluateObjectiveArc(board, squad, windowCount, startSquadAvgQuality, endSquadAvgQuality, weeklyWageBill) {
    if (!board.objectiveArcs) return null;
    var active = board.objectiveArcs.find(function (a) { return a.status === 'ACTIVE'; });
    if (!active) return null;
    active.windowsRemaining = Math.max(0, active.windowsRemaining - 1);
    switch (active.type) {
      case 'REDUCE_AGE':
        var currentAvg = squad.reduce(function (s, p) { return s + (p.Age || 0); }, 0) / squad.length;
        if (currentAvg < active.target || active.windowsRemaining <= 0) {
          active.status = currentAvg < active.target ? 'COMPLETED' : 'FAILED';
          active.completedWindow = windowCount;
        }
        break;
      case 'IMPROVE_QUALITY':
        var qualityDelta = endSquadAvgQuality - startSquadAvgQuality;
        active.progress = (active.progress || 0) + qualityDelta;
        if ((active.progress || 0) >= active.target || active.windowsRemaining <= 0) {
          active.status = (active.progress || 0) >= active.target ? 'COMPLETED' : 'FAILED';
          active.completedWindow = windowCount;
        }
        break;
      case 'CONTROL_WAGES':
        if (weeklyWageBill <= active.target) {
          active.consecutiveOk = (active.consecutiveOk || 0) + 1;
        } else {
          active.consecutiveOk = 0;
        }
        if (active.consecutiveOk >= 3 || active.windowsRemaining <= 0) {
          active.status = active.consecutiveOk >= 3 ? 'COMPLETED' : 'FAILED';
          active.completedWindow = windowCount;
        }
        break;
    }
    if (active.status === 'COMPLETED') return { arc: active, boost: 20 };
    if (active.status === 'FAILED') return { arc: active, boost: -5 };
    return { arc: active, boost: 0 };
  }

  function evaluateMandates(mandates, finalState, ledger) {
    if (!mandates || !finalState) return mandates;
    var squad = finalState.squad || [];
    var signedPlayers = finalState.signedPlayers || [];
    var gaps = finalState.gaps || [];
    var starters = finalState.starters || [];
    var depth = finalState.depth || [];
    var protectedPlayers = finalState.protectedPlayers || [];
    var candidateMinScore = finalState.candidateMinScore || 11;

    mandates.forEach(function (mandate) {
      switch (mandate.type) {
        case 'ADDRESS_GAPS':
          mandate.met = gaps.filter(function (g) { return g.priority === 'CRITICAL' || g.priority === 'Critical'; }).length === 0;
          break;
        case 'REDUCE_WAGE_BILL':
          mandate.met = (ledger.weeklyWageBill || 0) <= (mandate.target || 0);
          break;
        case 'REDUCE_AVERAGE_AGE':
          var newAvg = squad.reduce(function (s, p) { return s + (p.Age || 0); }, 0) / Math.max(1, squad.length);
          mandate.met = newAvg <= (mandate.target || 99);
          break;
        case 'STRENGTHEN_SQUAD':
          mandate.met = signedPlayers.some(function (p) { return (p.trueScore || p.trueFitScore || 0) >= candidateMinScore + 2.0; });
          break;
        case 'PROMOTE_YOUTH':
          var targetCount = mandate.target || 1;
          var inSquad = starters.concat(depth).filter(function (s) {
            return (s.player.Age || 0) <= 23 && ((s.player.PA || 0) > (s.player.CA || 0) + 15);
          }).length;
          mandate.met = inSquad >= targetCount;
          break;
      }
    });
    return mandates;
  }

  function updateBoardConfidence(mandates, currentConfidence, extraEvents) {
    var delta = 0;
    if (mandates) {
      mandates.forEach(function (m) {
        delta += m.met ? 8 : -6;
      });
    }
    if (extraEvents) {
      extraEvents.forEach(function (e) {
        delta += e.delta || 0;
      });
    }
    var newConfidence = Math.max(0, Math.min(100, currentConfidence + delta));
    return { newConfidence: newConfidence, delta: delta };
  }

  // 6.1 Squad DNA Evolution: compute how well squad fits manager's tactical system
  function computeDnaScore(squad, tactic) {
    if (!squad || !tactic || !tactic.slots) return { score: 0, details: [] };
    var slotKeys = Object.keys(tactic.slots);
    if (slotKeys.length === 0) return { score: 0, details: [] };

    var totalMatchSlots = 0;
    var details = [];

    slotKeys.forEach(function (sid) {
      var slot = tactic.slots[sid];
      if (!slot || !slot.roleId) return;
      var playerName = slot.playerName;
      if (!playerName) {
        details.push({ slot: sid, role: slot.roleId, status: 'UNFILLED', match: 0 });
        return;
      }
      var player = null;
      for (var i = 0; i < squad.length; i++) {
        if (squad[i].Name === playerName) { player = squad[i]; break; }
      }
      if (!player) {
        details.push({ slot: sid, role: slot.roleId, status: 'MISSING', match: 0 });
        return;
      }
      // Compute attribute alignment for this role
      var sc = typeof scorePlayerForRole === "function"
        ? scorePlayerForRole(player, slot.roleId, tactic.instructions || {})
        : null;
      var fitScore = sc ? sc.total : 0;
      // role-specific attributes: Det, Cons, and role-driven fit score
      var det = typeof getPlayerAttr === "function" ? getPlayerAttr(player, "Det") : (player.Det || 0);
      var cons = typeof getPlayerAttr === "function" ? getPlayerAttr(player, "Cons") : (player.Cons || 0);
      var prof = typeof getPlayerAttr === "function" ? getPlayerAttr(player, "Prof") : (player.Prof || 0);

      // Composite DNA match: fitScore (scaled to 0-20) + Det + Cons + Prof vs ideal
      var idealFit = 20;
      var fitNorm = Math.min(fitScore / idealFit, 1);
      var detNorm = Math.min(det / 20, 1);
      var consNorm = Math.min(cons / 20, 1);
      var profNorm = Math.min(prof / 20, 1);
      var matchScore = (fitNorm * 0.40 + detNorm * 0.25 + consNorm * 0.20 + profNorm * 0.15) * 100;

      totalMatchSlots += matchScore;
      details.push({
        slot: sid,
        role: slot.roleId,
        player: playerName,
        fitScore: fitScore,
        det: det,
        cons: cons,
        prof: prof,
        match: Math.round(matchScore * 10) / 10
      });
    });

    var overall = details.length > 0 ? Math.round((totalMatchSlots / details.length) * 10) / 10 : 0;
    return { score: overall, details: details };
  }

  global.generateBoardMandate = generateBoardMandate;
  global.evaluateMandates = evaluateMandates;
  global.updateBoardConfidence = updateBoardConfidence;
  global.applyBoardConstraint = applyBoardConstraint;
  global.checkDismissalCondition = checkDismissalCondition;
  global.applyReprieve = applyReprieve;
  global.resolveStage = resolveStage;
  global.computeDnaScore = computeDnaScore;
  global.generateObjectiveArc = generateObjectiveArc;
  global.evaluateObjectiveArc = evaluateObjectiveArc;

})(typeof window !== "undefined" ? window : global);
