// ─── MANAGER EVALUATION MODULE ───
// "Maximum Compatibility" Manager Rating (0-100)
// 5 pillars when tactic available: TacticalCoverage(25), StyleCapacity(15),
//   LockerRoom(30), Development(15), GapSeverity(15)
// 5 pillars when no tactic: TacticalCoverage(25), StyleCapacity(15),
//   LockerRoom(30), Development(15), Baseline(15)

// ─── FORMATION FAMILIES (fuzzy matching) ───

var FORMATION_FAMILIES = {
  "back-three": ["3-5-2", "5-3-2", "3-4-3", "3-4-2-1"],
  "flat-four": ["4-4-2", "4-5-1"],
  "dm-single": ["4-3-3 DM", "4-1-4-1", "4-3-2-1"],
  "cm-three": [],
  "dm-double": ["4-2-3-1", "4-2-4 DM", "3-4-3", "3-4-2-1"]
};

function getFormationFamily(formation) {
  if (!formation) return null;
  for (var fam in FORMATION_FAMILIES) {
    if (FORMATION_FAMILIES.hasOwnProperty(fam) && FORMATION_FAMILIES[fam].indexOf(formation) !== -1) {
      return fam;
    }
  }
  return null;
}

// ─── SQUAD STRENGTH CLASSIFICATION (dynamic CA scaling) ───

function classifySquadStrength(squad) {
  var minCA = Infinity, maxCA = -Infinity, sumCA = 0, count = 0;
  for (var i = 0; i < squad.length; i++) {
    var ca = parseInt(squad[i].CA || 0, 10);
    if (isNaN(ca) || ca <= 0) continue;
    if (ca < minCA) minCA = ca;
    if (ca > maxCA) maxCA = ca;
    sumCA += ca;
    count++;
  }
  var avgCA = count > 0 ? sumCA / count : 0;
  var normAvg = maxCA > 0 ? avgCA / maxCA : 0.5;
  var norm200 = avgCA / 200;
  var tier = "Low";
  if (norm200 >= 0.65) tier = "Elite";
  else if (norm200 >= 0.50) tier = "Strong";
  else if (norm200 >= 0.35) tier = "Developing";
  return { tier: tier, avgCA: avgCA, maxCA: maxCA, minCA: minCA, normAvg: normAvg, norm200: norm200, count: count };
}

function calculateManagerFit(manager, squad, existingTactic) {
  if (!squad || squad.length === 0) {
    return {
      overallScore: 0,
      pillars: {
        tacticalCoverage: { score: 0, max: 25 },
        styleCapacity: { score: 0, max: 15 },
        lockerRoom: { score: 0, max: 30 },
        development: { score: 0, max: 15 },
        gapSeverity: { score: 0, max: 15 }
      },
      insights: ["No squad data available for fit analysis."]
    };
  }

  var insights = [];
  var strength = classifySquadStrength(squad);

  function squadAvg(attr) {
    var sum = 0, count = 0;
    for (var i = 0; i < squad.length; i++) {
      var v = squad[i][attr];
      var num = parseInt(v, 10);
      if (!isNaN(num)) { sum += num; count++; }
    }
    return count > 0 ? sum / count : 0;
  }

  function norm(v, max) {
    max = max || 20;
    var n = parseInt(v, 10);
    return isNaN(n) ? 0 : Math.max(0, Math.min(1, n / max));
  }

  function getBestPlayerScore(sid, roleId, tactInst) {
    var best = 0;
    for (var i = 0; i < squad.length; i++) {
      if (!isFlankEligible(squad[i], sid)) continue;
      var so = scorePlayerForRole(squad[i], roleId, tactInst);
      if (so && so.total > best) best = so.total;
    }
    return best;
  }

  function getAssignedPlayerScore(playerName, roleId, tactInst) {
    for (var i = 0; i < squad.length; i++) {
      if (squad[i].Name === playerName) {
        var so = scorePlayerForRole(squad[i], roleId, tactInst);
        return so ? so.total : 0;
      }
    }
    return 0;
  }

  // Determine context: assigned players vs best-available
  var hasTactic = !!existingTactic;
  var tactic = existingTactic || generateTacticFromManager(manager, squad);
  var useAssigned = hasTactic; // callers pass tactic only when they want assigned players

  // ─── PILLAR 1: TACTICAL COVERAGE (25) ───

  function calcTacticalCoverage() {
    var formDef = FORMATIONS[tactic.formation];
    if (!formDef || !tactic.slots) return 0;

    var mentality = tactic.instructions ? tactic.instructions.mentality || "Balanced" : "Balanced";
    var isAttacking = mentality === "Attacking" || mentality === "Positive" || mentality === "Very Attacking";
    var isDefensive = mentality === "Defensive" || mentality === "Cautious" || mentality === "Very Defensive";

    var POS_WEIGHTS = {
      GK: 3.0, DC: 2.5, DM: 2.0, WD: 1.5, CM: 1.5, ST: 2.0, WA: 1.0, AMC: 0.8
    };

    var weightedSum = 0;
    var maxPossible = 0;

    formDef.slots.forEach(function(sid) {
      var def = GLOBAL_PITCH_SLOTS[sid];
      if (!def) return;
      var strata = def.strata;
      var slot = tactic.slots[sid];
      if (!slot || !slot.roleId) return;

      var w = POS_WEIGHTS[strata] || 1.0;
      if (isAttacking && (strata === "ST" || strata === "WA" || strata === "AMC")) w *= 1.2;
      if (isDefensive && (strata === "DC" || strata === "GK" || strata === "DM")) w *= 1.2;

      var bestScore = 0;
      if (useAssigned && slot.playerName) {
        bestScore = getAssignedPlayerScore(slot.playerName, slot.roleId, tactic.instructions);
      } else {
        bestScore = getBestPlayerScore(sid, slot.roleId, tactic.instructions);
      }

      weightedSum += bestScore * w;
      maxPossible += 20 * w;
    });

    if (weightedSum < maxPossible * 0.3) {
      insights.push("Squad is a poor tactical match for this manager's system.");
    } else if (weightedSum > maxPossible * 0.75) {
      insights.push("Squad personnel align well with the manager's tactical setup.");
    }

    var baseResult = maxPossible > 0 ? (weightedSum / maxPossible) * 25 : 0;

    // Formation family boost
    var pref = manager["Preferred Formation"];
    if (pref && FM_FORMATION_MAP[pref]) {
      var prefFam = getFormationFamily(FM_FORMATION_MAP[pref]);
      var tactFam = getFormationFamily(tactic.formation);
      if (prefFam && tactFam && prefFam === tactFam) {
        var ada = norm(manager.Ada || 0);
        var flex = ada >= 0.75 ? 1.5 : ada <= 0.4 ? 0.5 : 1.0;
        var boost = Math.min(2, 1.5 * flex);
        baseResult = Math.min(25, baseResult + boost);
      }
    }

    return baseResult;
  }

  // ─── PILLAR 2: STYLE CAPACITY (15) ───

  function calcStyleCapacity() {
    var formDef = FORMATIONS[tactic.formation];
    if (!formDef || !tactic.slots) return 0;

    var pressingStyle = manager["Pressing Style"] || "";
    var playingMentality = manager["Playing Mentality"] || "";
    var markingStyle = manager["Marking Style"] || "";

    var totalChecks = 0;
    var passedChecks = 0;

    formDef.slots.forEach(function(sid) {
      var def = GLOBAL_PITCH_SLOTS[sid];
      if (!def) return;
      var strata = def.strata;
      var slot = tactic.slots[sid];
      if (!slot || !slot.roleId) return;

      var player = null;
      if (useAssigned && slot.playerName) {
        for (var i = 0; i < squad.length; i++) {
          if (squad[i].Name === slot.playerName) { player = squad[i]; break; }
        }
      } else {
        var bestScore = -1;
        for (var i = 0; i < squad.length; i++) {
          if (!isFlankEligible(squad[i], sid)) continue;
          var so = scorePlayerForRole(squad[i], slot.roleId, tactic.instructions);
          if (so && so.total > bestScore) { bestScore = so.total; player = squad[i]; }
        }
      }
      if (!player) return;

      if (pressingStyle === "More Often" && (strata === "DM" || strata === "CM")) {
        totalChecks++;
        if ((player.Wor || 0) >= 13 && (player.Sta || 0) >= 12) passedChecks++;
      }
      if ((playingMentality === "Attacking" || playingMentality === "Adventurous") && (strata === "WA" || strata === "ST")) {
        totalChecks++;
        if ((player.Pac || 0) >= 13 && (player.OtB || 0) >= 12) passedChecks++;
      }
      if ((playingMentality === "Cautious" || playingMentality === "Very Cautious") && (strata === "DC" || strata === "DM")) {
        totalChecks++;
        if ((player.Pos || 0) >= 13 && (player.Cnt || 0) >= 11) passedChecks++;
      }
      if (markingStyle === "Man" && (strata === "DC" || strata === "WD" || strata === "WB")) {
        totalChecks++;
        if ((player.Mar || 0) >= 12 && (player.Pac || 0) >= 11) passedChecks++;
      }
      if (markingStyle === "Zonal" && strata === "DC") {
        totalChecks++;
        if ((player.Ant || 0) >= 12 && (player.Pos || 0) >= 12) passedChecks++;
      }
    });

    if (totalChecks > 0 && passedChecks < totalChecks * 0.4) {
      insights.push("Squad lacks the physical/mental attributes needed for the manager's style.");
    } else if (totalChecks > 0 && passedChecks >= totalChecks * 0.8) {
      insights.push("Squad has the right attributes to execute the manager's preferred style.");
    }

    return totalChecks > 0 ? (passedChecks / totalChecks) * 15 : 7.5;
  }

  // ─── PILLAR 3: LOCKER ROOM MATRIX (30) ───

  function calcLockerRoom() {
    var score = 0;

    // 3a: Authority (15)
    var highCA = 0;
    for (var i = 0; i < squad.length; i++) {
      var ca = parseInt(squad[i].CA || 0, 10);
      if (ca > highCA) highCA = ca;
    }

    var mgm = parseInt(manager.Mgm || 0, 10);
    var dis = parseInt(manager.Dis || 0, 10);
    var authorityRaw = (norm(mgm) + norm(dis)) / 2;
    var penalty = 0;

    if (authorityRaw < 0.5 && strength.normMax > 0.6) {
      penalty = Math.min(0.5, (0.5 - authorityRaw) * strength.normMax);
      insights.push("Squad reputation may exceed manager's authority \u2014 risk of losing the dressing room.");
    }

    var lowProfCount = 0;
    for (i = 0; i < squad.length; i++) {
      if (parseInt(squad[i].Prof || 0, 10) <= 8) lowProfCount++;
    }
    if (lowProfCount > squad.length * 0.2 && dis < 12) {
      var extraPenalty = (lowProfCount / squad.length) * 0.3;
      penalty = Math.max(penalty, extraPenalty);
      insights.push("Multiple unprofessional players may undermine a low-discipline manager.");
    }

    score += Math.max(0, authorityRaw - penalty) * 15;

    // 3b: Motivation (10)
    var mot = parseInt(manager.Mot || 0, 10);
    var motScore = norm(mot);
    var avgDet = squadAvg("Det");
    if (avgDet < 10) {
      motScore = Math.min(1, motScore + 0.2);
      insights.push("Low squad determination \u2014 a strong motivator is valuable here.");
    }
    if (strength.tier === "Low" || strength.tier === "Developing") {
      motScore = Math.min(1, motScore + 0.15);
      insights.push("Squad operates below top-tier level \u2014 motivation can extract more from limited talent.");
    }
    score += motScore * 10;

    // 3c: Cultural Alignment (5)
    var prof = parseInt(manager.Prof || 0, 10);
    var avgProf = squadAvg("Prof");
    var cultureScore = 0;

    if (prof > 0 && avgProf > 0) {
      var gap = prof - avgProf;
      if (gap < 0) {
        cultureScore = Math.max(0, 5 - (Math.abs(gap) / 20) * 3);
        if (Math.abs(gap) >= 5) {
          insights.push("Manager professionalism falls short of squad culture \u2014 potential friction.");
        }
      } else {
        cultureScore = Math.min(5, 2.5 + Math.min(gap / 20, 1) * 2.5);
        if (gap >= 5) {
          insights.push("Manager's strong professionalism could raise the squad's standards.");
        }
      }
    } else {
      cultureScore = 2.5;
    }

    var mgrPersonality = manager.Personality || "";
    var squadPersonalityCounts = {};
    for (i = 0; i < squad.length; i++) {
      var sp = squad[i].Personality || "";
      if (sp) squadPersonalityCounts[sp] = (squadPersonalityCounts[sp] || 0) + 1;
    }
    var dominantPersonality = "";
    var dominantCount = 0;
    for (var spKey in squadPersonalityCounts) {
      if (squadPersonalityCounts.hasOwnProperty(spKey) && squadPersonalityCounts[spKey] > dominantCount) {
        dominantCount = squadPersonalityCounts[spKey];
        dominantPersonality = spKey;
      }
    }

    if (mgrPersonality && dominantPersonality && mgrPersonality !== dominantPersonality) {
      cultureScore = Math.max(0, cultureScore - 1);
    }

    score += cultureScore;
    return Math.min(score, 30);
  }

  // ─── PILLAR 4: SQUAD TIMELINE & DEVELOPMENT (15) ───

  function calcDevelopment() {
    var avgPA = squadAvg("PA");
    var avgCA = squadAvg("CA");
    var avgAge = squadAvg("Age");
    var headroom = avgPA - avgCA;

    var transitionCount = 0;
    for (var i = 0; i < squad.length; i++) {
      var age = parseInt(squad[i].Age || 0, 10);
      var pa = parseInt(squad[i].PA || 0, 10);
      var ca = parseInt(squad[i].CA || 0, 10);
      if (age > 27 && (pa - ca) > 15) transitionCount++;
    }
    var isTransitional = transitionCount >= 3;

    var isYoungProject = avgAge < 23 && headroom > 20;
    var isMixed = avgAge >= 23 && avgAge <= 26 && headroom >= 10 && headroom <= 20;
    var isWinNow = avgAge > 26 && headroom < 10;

    var youth = norm(manager.Youth || 0);
    var ada = norm(manager.Ada || 0);
    var tacKnw = norm(manager["Tac Knw"] || 0);
    var judgeP = norm(manager["Judge P"] || 0);
    var judgeA = norm(manager["Judge A"] || 0);
    var result;

    if (isTransitional) {
      result = (judgeA * 0.7 + tacKnw * 0.3) * 15 - youth * 5;
      if (youth >= 0.6) {
        insights.push("Squad has an aging core with unrealised potential \u2014 high Youth focus may waste development on the wrong age group.");
      }
    } else if (isYoungProject) {
      result = youth * 15;
      if (youth >= 0.6) {
        insights.push("Young, high-potential squad \u2014 manager's work with youngsters is a major asset.");
      } else if (youth < 0.3) {
        insights.push("Squad is young and developing, but manager lacks youth-development focus.");
      }
    } else if (isMixed) {
      result = ((tacKnw + judgeP) / 2) * 15;
    } else if (isWinNow) {
      result = ((ada + tacKnw) / 2) * 15 - youth * 3;
      if (youth >= 0.5) {
        insights.push("Win-now squad \u2014 manager's high Youth focus may waste game time on fringe youngsters.");
      }
    } else {
      result = ((tacKnw + judgeP) / 2) * 15;
    }

    return Math.max(0, Math.min(15, result));
  }

  // ─── PILLAR 5: GAP SEVERITY (15) or BASELINE (15) ───

  var POS_WEIGHTS = {
    GK: 3.0, DC: 2.5, DM: 2.0, WD: 1.5, CM: 1.5, ST: 2.0, WA: 1.0, AMC: 0.8
  };

  function calcGapSeverity() {
    if (!tactic.gaps || tactic.gaps.length === 0) return 15;

    var gapPenalty = 0;
    var maxPenalty = 0;

    tactic.gaps.forEach(function(gap) {
      var def = GLOBAL_PITCH_SLOTS[gap.slotId];
      var strata = def ? def.strata : "";
      var w = POS_WEIGHTS[strata] || 1.0;
      var gapScore = 0;
      var match = gap.reason ? gap.reason.match(/scores (\d+)/) : null;
      if (match) gapScore = parseInt(match[1], 10);
      gapPenalty += w * Math.max(0, 8 - gapScore);
    });

    var formDef = FORMATIONS[tactic.formation];
    if (formDef && formDef.slots) {
      formDef.slots.forEach(function(sid) {
        var def = GLOBAL_PITCH_SLOTS[sid];
        var strata = def ? def.strata : "";
        var w = POS_WEIGHTS[strata] || 1.0;
        maxPenalty += w * 8;
      });
    } else {
      maxPenalty = 100;
    }

    if (gapPenalty > 0) {
      insights.push("Tactical gaps weighted by positional criticality suggest vulnerability in key areas.");
    }

    return maxPenalty > 0 ? Math.max(0, (1 - gapPenalty / maxPenalty)) * 15 : 0;
  }

  function calcBaseline() {
    var avgCA = squadAvg("CA");
    var mgrCA = parseInt(manager.CA || 0, 10);
    var caTierDiff = Math.abs(mgrCA - avgCA) / 20;
    var caFit = 1;
    if (caTierDiff > 2) {
      caFit = Math.max(0, 1 - (caTierDiff - 2) * 0.2);
      if (mgrCA < avgCA - 30) {
        insights.push("Manager's ability (" + mgrCA + ") is well below squad average (" + Math.round(avgCA) + "). May struggle to command respect.");
      }
    }
    return caFit * 15;
  }

  // ─── COMPUTE PILLARS ───

  var tacticalCoverage = calcTacticalCoverage();
  var styleCapacity = calcStyleCapacity();
  var lockerRoom = calcLockerRoom();
  var development = calcDevelopment();
  var gapSeverity = hasTactic ? calcGapSeverity() : calcBaseline();

  // ─── OVERALL ───

  var overallScore = Math.round(tacticalCoverage + styleCapacity + lockerRoom + development + gapSeverity);

  var pillars = {
    tacticalCoverage: { score: round1(tacticalCoverage), max: 25 },
    styleCapacity: { score: round1(styleCapacity), max: 15 },
    lockerRoom: { score: round1(lockerRoom), max: 30 },
    development: { score: round1(development), max: 15 }
  };
  if (hasTactic) {
    pillars.gapSeverity = { score: round1(gapSeverity), max: 15 };
  } else {
    pillars.baseline = { score: round1(gapSeverity), max: 15 };
  }

  return {
    overallScore: overallScore,
    pillars: pillars,
    insights: insights
  };

  function round1(v) { return Math.round(v * 10) / 10; }
}
