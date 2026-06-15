// ─── PLAYER UTILITIES — SHARED ACROSS TRANSFER ENGINES ───
// No dependencies on other modules. Pure functions only.

(function (global) {
  "use strict";

  var PT_RANK = {
    "Star Player": 6,
    "First-Choice Goalkeeper": 6,
    "Important Player": 5,
    "Regular Starter": 4,
    "Rotation Player": 3,
    "Squad Player": 2,
    "Impact Sub": 2,
    "Backup": 1,
    "Youngster": 1
  };

  var PlayerUtils = (function () {

    function isWonderkid(player, paAvailable) {
      if (!paAvailable || !player.PA || player.PA === 0) {
        return player.Age <= 19;
      }
      var gap = (player.CA >= 150 ? 10 : player.CA >= 130 ? 15 : 20);
      return player.Age <= 23 && player.PA > player.CA + gap;
    }

    function isWonderkidDeveloper(player, paAvailable) {
      if (!paAvailable || !player.PA || player.PA === 0) {
        return player.Age <= 21;
      }
      var gap = (player.CA >= 150 ? 8 : player.CA >= 130 ? 12 : 15);
      return player.Age <= 25 && player.PA > player.CA + gap;
    }

    function wonderkidChecker(archetype, paAvailable) {
      return archetype === 'DEVELOPER'
        ? function (p) { return isWonderkidDeveloper(p, paAvailable); }
        : function (p) { return isWonderkid(p, paAvailable); };
    }

    function reliabilityRating(player) {
      if (!player) return 0;
      var cons = getAttr(player, "Cons");
      var prof = getAttr(player, "Prof");
      var impM = getAttr(player, "Imp_M");
      return (cons + prof + impM) / 3;
    }

    function slotQuality(player, fitScore) {
      if (!player) return 0;
      var cons = getAttr(player, "Cons");
      var impM = getAttr(player, "Imp_M");
      var fs = (fitScore === undefined || fitScore === null || isNaN(fitScore)) ? 0 : fitScore;
      return (
        fs * 0.55 +
        ((cons / 20) * 20) * 0.25 +
        ((impM / 20) * 20) * 0.20
      );
    }

    function paAvailableCheck(squad) {
      if (!squad || squad.length === 0) return false;
      for (var i = 0; i < squad.length; i++) {
        if (squad[i].PA && squad[i].PA > 0) return true;
      }
      return false;
    }

    function getBestFitScore(player, tactic) {
      if (!player || !tactic || !tactic.slots) return 0;
      var best = 0;
      var slotKeys = Object.keys(tactic.slots);
      for (var i = 0; i < slotKeys.length; i++) {
        var slot = tactic.slots[slotKeys[i]];
        if (!slot || !slot.roleId) continue;
        if (typeof isFlankEligible === "function" && !isFlankEligible(player, slotKeys[i])) continue;
        if (typeof scorePlayerForRole === "function") {
          var sc = scorePlayerForRole(player, slot.roleId, tactic.instructions || {});
          if (sc && sc.total > best) best = sc.total;
        }
      }
      return best;
    }

    function getCandidateNegotiationProfile(candidate) {
      var det = getAttr(candidate, "Det");
      var prof = getAttr(candidate, "Prof");
      var amb = getAttr(candidate, "Amb");
      var ldr = getAttr(candidate, "Ldr");

      if (det >= 14 && prof >= 14)
        return { style: 'HARD_PROFESSIONAL', collapseModifier: 0.6, sellerCounterBase: 1.04, renegotiates: false };

      if (det >= 14 && prof < 10)
        return { style: 'VOLATILE', collapseModifier: 1.8, sellerCounterBase: 1.06, renegotiates: true };

      if (candidate.Age <= 23 && amb >= 14)
        return { style: 'AMBITIOUS_MOVER', collapseModifier: 0.5, sellerCounterBase: 0.97, wageFlexibility: 0.90 };

      if (candidate.Age >= 28 && det >= 14)
        return { style: 'SETTLED_VETERAN', collapseModifier: 0.9, sellerCounterBase: 1.05, wageFlexibility: 1.05 };

      if (ldr >= 14)
        return { style: 'HIGH_VALUE_ASSET', collapseModifier: 0.8, sellerCounterBase: 1.04 };

      return { style: 'STANDARD', collapseModifier: 1.0, sellerCounterBase: 1.02, wageFlexibility: 1.0 };
    }

    function projectFitDecay(player, fitScore, dynamicThreshold) {
      if (!player || player.Age < 30) return null;
      var decayRate = (player.Age - 29) * 0.3;
      var projectedScore = fitScore - decayRate;
      if (projectedScore < dynamicThreshold) {
        return { flag: 'SUCCESSION_NEEDED', projectedScore: projectedScore, urgency: player.Age >= 33 ? 'HIGH' : 'ADVISORY' };
      }
      return null;
    }

    function getEffectiveAP(player, signingHistory) {
      if (!player || !signingHistory) return player ? (player.AP || 0) : 0;
      var record = null;
      for (var i = 0; i < signingHistory.length; i++) {
        var sh = signingHistory[i];
        if (sh.name === player.Name && sh.status === 'UNSOLD') {
          record = sh;
          break;
        }
      }
      if (!record) return player.AP || 0;
      if (record.unsoldWindows >= 2) return Math.round((player.AP || 0) * 0.78);
      if (record.unsoldWindows >= 1) return Math.round((player.AP || 0) * 0.88);
      return player.AP || 0;
    }

    function getEffectiveWageDemand(candidate) {
      if (!candidate) return 0;
      var profile = getCandidateNegotiationProfile(candidate);
      var flexibility = profile.wageFlexibility || 1.0;
      return Math.round((candidate.Wage || 0) * flexibility);
    }

    // ─── PLAYING TIME UTILITIES ───

    function getPTRank(ptString) {
      if (!ptString) return 0;
      return PT_RANK[ptString] || 0;
    }

    function getPTDelta(player) {
      if (!player) return { delta: 0, direction: 'unknown', label: '' };
      var agreed = getPTRank(player.AgreedPT);
      var actual = getPTRank(player.ActualPT);
      var delta = actual - agreed;
      var direction, label;
      if (!player.AgreedPT || !player.ActualPT) {
        direction = 'unknown';
        label = '';
      } else if (delta >= 2) {
        direction = 'overperforming';
        label = 'Playing above agreed role (+' + delta + ' tiers)';
      } else if (delta === 1) {
        direction = 'overperforming';
        label = 'Playing slightly above agreed role (+1 tier)';
      } else if (delta === 0) {
        direction = 'on-track';
        label = 'Playing at agreed role';
      } else if (delta === -1) {
        direction = 'underperforming';
        label = 'Playing below agreed role (-1 tier)';
      } else {
        direction = 'underperforming';
        label = 'Playing below agreed role (' + delta + ' tiers)';
      }
      return { delta: delta, direction: direction, label: label };
    }

    function getMinutesLoad(player) {
      if (!player) return { tier: 'absent', raw: 0 };
      var raw = player.Mins || 0;
      var pct = raw / 3240;
      var tier;
      if (pct >= 0.75) tier = 'starter';
      else if (pct >= 0.45) tier = 'rotation';
      else if (pct >= 0.20) tier = 'fringe';
      else if (pct > 0) tier = 'unused';
      else tier = 'absent';
      return { tier: tier, raw: raw };
    }

    function getPerformanceBand(player) {
      if (!player) return { band: 'no-data', label: 'No rating' };
      var av = player.AvRat;
      if (av === null || av === undefined) return { band: 'no-data', label: 'No rating' };
      if ((player.Mins || 0) < 270) return { band: 'no-data', label: 'Insufficient minutes (<3 games)' };
      if (av >= 7.50) return { band: 'elite', label: 'Elite performer' };
      if (av >= 7.10) return { band: 'strong', label: 'Strong performer' };
      if (av >= 6.75) return { band: 'decent', label: 'Decent performer' };
      if (av >= 6.40) return { band: 'marginal', label: 'Marginal performer' };
      return { band: 'poor', label: 'Poor performer' };
    }

    function getPlayingTimeUnrestRisk(player) {
      if (!player) return { risk: 'NONE', reasons: [] };
      var reasons = [];
      var delta = getPTDelta(player);
      var load = getMinutesLoad(player);
      var agreedRank = getPTRank(player.AgreedPT);

      if (player.Inf && (player.Inf.indexOf('Inj') !== -1 || player.Inf.indexOf('Int') !== -1)) {
        return { risk: 'NONE', reasons: ['Injury/International duty — minutes not actionable'] };
      }

      if (delta.direction === 'underperforming' && delta.delta <= -2) {
        reasons.push('Agreed: ' + (player.AgreedPT || 'none') + ' · Actual: ' + (player.ActualPT || 'none') + ' (' + delta.delta + ' tiers)');
        return { risk: 'HIGH', reasons: reasons };
      }
      if (delta.direction === 'underperforming' && delta.delta === -1) {
        reasons.push(delta.label);
        return { risk: 'MEDIUM', reasons: reasons };
      }
      if (load.tier === 'absent' && agreedRank >= 3) {
        reasons.push('Only ' + load.raw + ' minutes played despite being agreed a ' + (player.AgreedPT || 'playing') + ' role');
        return { risk: 'HIGH', reasons: reasons };
      }
      if (load.tier === 'fringe' && (player.AgreedPT === 'Star Player' || player.AgreedPT === 'First-Choice Goalkeeper' || player.AgreedPT === 'Important Player')) {
        reasons.push('Only ' + load.raw + ' minutes played despite agreed role: ' + player.AgreedPT);
        return { risk: 'MEDIUM', reasons: reasons };
      }

      return { risk: 'NONE', reasons: [] };
    }

    function getApMultiplier(player) {
      var base = 1.0;
      var band = getPerformanceBand(player);
      var load = getMinutesLoad(player);
      var delta = getPTDelta(player);
      if (band.band === 'elite') base += 0.25;
      else if (band.band === 'strong') base += 0.12;
      else if (band.band === 'poor') base -= 0.15;
      if (load.tier === 'absent') base -= 0.20;
      if (load.tier === 'starter' && delta.direction === 'overperforming') base += 0.10;
      return Math.max(0.6, Math.min(1.5, base));
    }

    function getMinutesLoadWeight(player) {
      var load = getMinutesLoad(player);
      switch (load.tier) {
        case 'starter': return 1.0;
        case 'rotation': return 0.75;
        case 'fringe': return 0.5;
        case 'unused': return 0.25;
        default: return 0.25;
      }
    }

    function getPlayingTimeHarmony(squad) {
      if (!squad || squad.length === 0) return { score: 8, unrestHigh: 0, unrestMedium: 0 };
      var high = 0, medium = 0;
      for (var i = 0; i < squad.length; i++) {
        if (isInLoanedOutPlayers(squad[i])) continue;
        var risk = getPlayingTimeUnrestRisk(squad[i]);
        if (risk.risk === 'HIGH') high++;
        else if (risk.risk === 'MEDIUM') medium++;
      }
      var harmony;
      if (high + medium === 0) harmony = 8;
      else if (high + medium === 1) harmony = 6;
      else if (high + medium === 2) harmony = 4;
      else if (high + medium === 3) harmony = 2;
      else harmony = 0;
      return { score: harmony, unrestHigh: high, unrestMedium: medium };
    }

    function getSquadPlayingTimeAudit(squad) {
      if (!squad || squad.length === 0) return null;
      var total = squad.length, starters = 0, ratingSum = 0, ratedCount = 0;
      var bands = { elite: 0, strong: 0, decent: 0, marginal: 0, poor: 0, noData: 0 };
      var loansRec = 0;

      for (var i = 0; i < squad.length; i++) {
        var p = squad[i];
        var load = getMinutesLoad(p);
        var band = getPerformanceBand(p);
        bands[band.band] = (bands[band.band] || 0) + 1;
        if (load.tier === 'starter') {
          starters++;
          if (p.AvRat !== null) { ratingSum += p.AvRat; ratedCount++; }
        }
        if (!isInLoanedOutPlayers(p) && isWonderkid(p, false) && (load.tier === 'fringe' || load.tier === 'absent') && (p.AgreedPT === 'Youngster' || p.AgreedPT === 'Squad Player' || !p.AgreedPT)) {
          loansRec++;
        }
      }

      var harmony = getPlayingTimeHarmony(squad);

      return {
        totalPlayers: total,
        startersRated: starters,
        avgRatingStarters: ratedCount > 0 ? Math.round((ratingSum / ratedCount) * 100) / 100 : null,
        unrestHigh: harmony.unrestHigh,
        unrestMedium: harmony.unrestMedium,
        loansRecommended: loansRec,
        performanceBands: bands
      };
    }

    function isInLoanedOutPlayers(player) {
      if (!player || !window.FM24State || !window.FM24State.manager || !window.FM24State.manager.loanedOutPlayers) return false;
      return window.FM24State.manager.loanedOutPlayers.indexOf(player.Name) !== -1;
    }

    function getAttr(player, key) {
      if (!player) return 0;
      var mappings = {
        Cons: ["Cons", "Consistency"],
        Prof: ["Prof", "Professionalism"],
        Imp_M: ["Imp M", "Imp_M", "Important Matches", "ImportantMatches"],
        Det: ["Det", "Determination"],
        Ldr: ["Ldr", "Leadership"],
        Age: ["Age"],
        CA: ["CA"],
        PA: ["PA"],
        AP: ["AP"],
        Name: ["Name"],
        Wage: ["Wage"]
      };
      var aliases = mappings[key] || [key];
      for (var i = 0; i < aliases.length; i++) {
        var v = player[aliases[i]];
        if (v !== undefined && v !== null && v !== "") {
          var n = parseInt(v, 10);
          if (!isNaN(n)) return n;
        }
      }
      return 0;
    }

    return {
      isWonderkid: isWonderkid,
      isWonderkidDeveloper: isWonderkidDeveloper,
      wonderkidChecker: wonderkidChecker,
      reliabilityRating: reliabilityRating,
      slotQuality: slotQuality,
      paAvailableCheck: paAvailableCheck,
      getBestFitScore: getBestFitScore,
      getCandidateNegotiationProfile: getCandidateNegotiationProfile,
      projectFitDecay: projectFitDecay,
      getEffectiveAP: getEffectiveAP,
      getEffectiveWageDemand: getEffectiveWageDemand,
      getPTRank: getPTRank,
      getPTDelta: getPTDelta,
      getMinutesLoad: getMinutesLoad,
      getPerformanceBand: getPerformanceBand,
      getPlayingTimeUnrestRisk: getPlayingTimeUnrestRisk,
      getApMultiplier: getApMultiplier,
      getMinutesLoadWeight: getMinutesLoadWeight,
      getPlayingTimeHarmony: getPlayingTimeHarmony,
      getSquadPlayingTimeAudit: getSquadPlayingTimeAudit
    };

  })();

  global.PlayerUtils = PlayerUtils;

})(typeof window !== "undefined" ? window : global);
