// ─── WONDERKID SYSTEM ───

var PEAK_AGE = {
  GK: 28, DC: 27, WD: 27, DM: 26, CM: 26,
  WM: 25, WA: 25, AMC: 25, ST: 25
};

var PERSONALITY_MULTIPLIERS = {
  "model professional":  1.20,
  "model citizen":       1.18,
  "perfectionist":       1.15,
  "born leader":         1.15,
  "resolute":            1.14,
  "professional":        1.12,
  "driven":              1.10,
  "determined":          1.08,
  "resilient":           1.08,
  "iron willed":         1.07,
  "spirited":            1.06,
  "charismatic leader":  1.05,
  "leader":              1.05,
  "fairly professional": 1.00,
  "fairly determined":   0.98,
  "devoted":             0.97,
  "very loyal":          0.97,
  "very ambitious":      0.96,
  "ambitious":           0.95,
  "unambitious":         0.93,
  "fairly ambitious":    0.92,
  "light-hearted":       0.90,
  "jovial":              0.90,
  "balanced":            0.90,
  "loyal":               0.90,
  "fairly loyal":        0.88,
  "sporting":            0.88,
  "fairly sporting":     0.87,
  "honest":              0.87,
  "realist":             0.86,
  "fickle":              0.82,
  "mercenary":           0.80,
  "unsporting":          0.80,
  "temperamental":       0.78,
  "spineless":           0.76,
  "low self-belief":     0.75,
  "easily discouraged":  0.74,
  "low determination":   0.70,
  "casual":              0.65,
  "slack":               0.62,
  "_default":            1.00
};

function computeSquadBaseline() {
  var state = window.FM24State.wonderkidUI;
  var squad = window.FM24State.squad || [];

  var valid = squad.filter(function (p) { return p.CA > 0; });

  // If proven-only mode, filter to players with 900+ mins (starter/rotation)
  if (state.provenOnly && typeof PlayerUtils !== "undefined" && PlayerUtils.getMinutesLoad) {
    valid = valid.filter(function (p) {
      var ml = PlayerUtils.getMinutesLoad(p);
      return ml.tier === 'starter' || ml.tier === 'rotation';
    });
  }

  if (valid.length < 5) {
    state.squadBaseline = null;
    return;
  }

  valid.sort(function (a, b) { return b.CA - a.CA; });
  var slice = valid.slice(0, 14);
  var sortedCA = slice.map(function (p) { return p.CA; }).sort(function (a, b) { return a - b; });
  var n = sortedCA.length;
  var medianCA;
  if (n % 2 === 0) {
    medianCA = Math.round((sortedCA[n / 2 - 1] + sortedCA[n / 2]) / 2);
  } else {
    medianCA = sortedCA[Math.floor(n / 2)];
  }

  state.squadBaseline = {
    medianCA: medianCA,
    minPA: medianCA + 10,
    minGap: Math.max(15, Math.round(medianCA * 0.15)),
    topN: slice.length,
    isDynamic: true
  };
}

function resolveWonderkidThresholds() {
  var ui = window.FM24State.wonderkidUI;
  var base = ui.squadBaseline;
  return {
    minPA: ui.userOverride.minPA ? ui.minPA : (base ? base.minPA : 130),
    minGap: ui.userOverride.minGap ? ui.minGap : (base ? base.minGap : 20)
  };
}

function resetWonderkidOverrides() {
  var state = window.FM24State.wonderkidUI;
  state.userOverride = { minPA: false, minGap: false };
  renderWonderkidView();
}

// ─── FULFILMENT PREDICTION ───

function computeDevLikelihood(player) {
  if (!player || player.PA <= 0 || player.CA <= 0) return null;

  var strata = player.strata || [];
  var peakAge = 26;
  for (var si = 0; si < strata.length; si++) {
    if (PEAK_AGE[strata[si]] > peakAge) peakAge = PEAK_AGE[strata[si]];
  }

  var yearsRemaining = peakAge - player.Age;
  if (yearsRemaining < 0) return 20;
  if (yearsRemaining === 0) return 40;

  var caToPA = player.PA - player.CA;
  if (caToPA <= 0) return 95;

  var growthPerYear = caToPA / yearsRemaining;
  var baseDevScore;
  if (growthPerYear <= 4) baseDevScore = 95;
  else if (growthPerYear <= 6) baseDevScore = 88;
  else if (growthPerYear <= 8) baseDevScore = 78;
  else if (growthPerYear <= 10) baseDevScore = 65;
  else if (growthPerYear <= 13) baseDevScore = 50;
  else if (growthPerYear <= 16) baseDevScore = 35;
  else baseDevScore = 20;

  var ageBonus = player.Age <= 17 ? 5 : player.Age === 18 ? 3 : player.Age === 19 ? 1 : 0;
  return Math.min(98, baseDevScore + ageBonus);
}

function computePersonalityRisk(player) {
  var prof = player.Prof || 0;
  var det = player.Det || 0;
  var cons = player.Cons || 0;

  var rawMentals = (prof * 0.45) + (det * 0.45) + (cons * 0.10);
  var normalised = (rawMentals / 20) * 100;

  var pers = (player.Personality || "").toLowerCase().trim();
  var multiplier = PERSONALITY_MULTIPLIERS[pers] !== undefined ? PERSONALITY_MULTIPLIERS[pers] : PERSONALITY_MULTIPLIERS["_default"];

  return { score: Math.min(100, Math.round(normalised * multiplier)), multiplier: multiplier, personalityTier: pers };
}

function computeFulfilmentScore(player) {
  if (player._fulfilment) return player._fulfilment;

  if (player.PA === -1 || player.PA === undefined || player.PA === null) {
    player._fulfilment = null;
    return null;
  }

  var devScore = computeDevLikelihood(player);
  var persResult = computePersonalityRisk(player);

  if (devScore === null) {
    player._fulfilment = null;
    return null;
  }

  var raw = (devScore * 0.45) + (persResult.score * 0.55);
  var score = Math.round(raw);

  var label, labelColor;
  if (score >= 85) { label = "High Confidence"; labelColor = "text-white"; }
  else if (score >= 70) { label = "Likely"; labelColor = "text-green-400"; }
  else if (score >= 55) { label = "Uncertain"; labelColor = "text-yellow-400"; }
  else if (score >= 40) { label = "Risky"; labelColor = "text-orange-400"; }
  else { label = "Avoid"; labelColor = "text-red-400"; }

  player._fulfilment = {
    score: score,
    label: label,
    labelColor: labelColor,
    devLikelihood: devScore,
    personalityRisk: persResult.score,
    multiplier: persResult.multiplier,
    personalityTier: persResult.personalityTier
  };
  return player._fulfilment;
}

function computeSquadInfluenceWarning(player) {
  var squad = window.FM24State.squad || [];
  var state = window.FM24State.wonderkidUI;
  if (squad.length === 0 || !player || player.Age > 24) return null;

  var base = state.squadBaseline;
  if (!base || !base.isDynamic) return null;

  var top14 = squad.filter(function (p) { return p.CA > 0; }).sort(function (a, b) { return b.CA - a.CA; }).slice(0, 14);
  if (top14.length < 5) return null;

  var sumProf = 0, sumDet = 0, count = 0;
  top14.forEach(function (p) {
    if (p.Prof > 0) { sumProf += p.Prof; count++; }
  });
  var squadAvgProf = count > 0 ? sumProf / count : 0;
  count = 0;
  top14.forEach(function (p) {
    if (p.Det > 0) { sumDet += p.Det; count++; }
  });
  var squadAvgDet = count > 0 ? sumDet / count : 0;

  var profDelta = squadAvgProf - (player.Prof || 10);
  var detDelta = squadAvgDet - (player.Det || 10);

  if (profDelta > 3 && detDelta > 3) {
    return { type: "positive", text: "Your squad\u2019s strong mentality should lift this player\u2019s development." };
  }
  if (profDelta < -3 && detDelta < -3) {
    return { type: "negative", text: "Your squad\u2019s weak mentality may hold this player back. Signing higher risk." };
  }
  return { type: "neutral", text: "Squad Influence: Neutral" };
}

function clearPlayerCache() {
  var pool = (window.FM24State.market || []).concat(window.FM24State.squad || []);
  pool.forEach(function (p) { p._fulfilment = undefined; });
}

// ─── MAIN RENDER ───

function renderWonderkidView() {
  computeSquadBaseline();

  var uploadC = document.getElementById("wonderkid-upload");
  var contentC = document.getElementById("wonderkid-content");
  var state = window.FM24State.wonderkidUI;
  var thresholds = resolveWonderkidThresholds();
  var market = window.FM24State.market || [];
  var squad = window.FM24State.squad || [];
  var tactic = window.FM24State.tactic;
  var pool = market.length > 0 ? market : squad;

  if (pool.length === 0) {
    if (uploadC) { buildUploadZone(uploadC, "Upload Market HTML (FM24 export)", "market", "fm24:market-loaded"); }
    if (contentC) contentC.innerHTML = '<div class="text-xs text-text-muted">No player data loaded. Upload your Transfer Market or Squad export above.</div>';
    return;
  }
  if (uploadC) uploadC.innerHTML = "";

  // Compute derived fields
  pool.forEach(function (p) {
    p._GrowthGap = p.PA > 0 && p.CA > 0 ? p.PA - p.CA : 0;
    p._GrowthRatio = p.CA > 0 && p.PA > 0 ? p.PA / p.CA : 0;
  });

  // Filter using resolved thresholds
  var candidates = pool.filter(function (p) {
    if (p.Age > state.maxAge) return false;
    if (state.minAge && p.Age < state.minAge) return false;
    if (!state.includeUnknown && (p.PA === -1 || p.PA === undefined || p.PA === null)) return false;
    if (p.PA !== -1 && p.PA < thresholds.minPA) return false;
    if (p._GrowthGap < thresholds.minGap) return false;
    if (state.nationality) {
      var nat = (p.Nation || p.Nationality || p.Nat || "").toLowerCase();
      if (nat.indexOf(state.nationality.toLowerCase()) === -1) return false;
    }
    if (state.maxAP) {
      var maxApVal = parseFloat(state.maxAP);
      if (!isNaN(maxApVal) && (p.AP || 0) > maxApVal) return false;
    }
    return true;
  });

  // Compute tactic fit scores
  if (tactic.isComplete) {
    candidates.forEach(function (p) {
      var scores = computeMarketScores(p, tactic);
      p._wkFit = scores ? scores._bestScore : -1;
      p._wkFitSlot = scores ? scores._bestSlotId : null;
    });

    // Exclude players with no fit when filter is active
    if (state.showOnlyTacticFits) {
      candidates = candidates.filter(function (p) { return p._wkFit > 0; });
    }
  }

  // Sort
  var sortBy = state.sortBy || "pa";
  var sortAsc = state.sortAsc === true;
  candidates.sort(function (a, b) {
    var va, vb;
    if (sortBy === "pa") { va = a.PA || 0; vb = b.PA || 0; }
    else if (sortBy === "ca") { va = a.CA || 0; vb = b.CA || 0; }
    else if (sortBy === "gap") { va = a._GrowthGap; vb = b._GrowthGap; }
    else if (sortBy === "age") { va = a.Age || 99; vb = b.Age || 99; }
    else if (sortBy === "ap") { va = a.AP || 0; vb = b.AP || 0; }
    else if (sortBy === "conf") { var fa = computeFulfilmentScore(a); var fb = computeFulfilmentScore(b); va = fa ? fa.score : -1; vb = fb ? fb.score : -1; }
    else if (sortBy === "name") {
      va = (a.Name || "").toLowerCase();
      vb = (b.Name || "").toLowerCase();
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    else if (sortBy === "fit") { va = a._wkFit || -1; vb = b._wkFit || -1; }
    else if (sortBy === "pos") {
      var sa = a.strata;
      var sb = b.strata;
      va = STRATA_ORDER.indexOf(sa && sa.length ? sa[0] : "");
      vb = STRATA_ORDER.indexOf(sb && sb.length ? sb[0] : "");
      if (va === -1) va = 999;
      if (vb === -1) vb = 999;
      return sortAsc ? va - vb : vb - va;
    }
    else if (sortBy === "club") {
      va = (a.Club || "").toLowerCase();
      vb = (b.Club || "").toLowerCase();
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    else if (sortBy === "nat") {
      va = (a.Nation || a.Nationality || a.Nat || "").toLowerCase();
      vb = (b.Nation || b.Nationality || b.Nat || "").toLowerCase();
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    if (va !== vb) return sortAsc ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1);
    var paA = a.PA === -1 ? -1 : a.PA || 0;
    var paB = b.PA === -1 ? -1 : b.PA || 0;
    return paB - paA;
  });

  // Limit to top N
  var limit = state.limit || 100;
  var allDisplayed = candidates.slice(0, limit);

  // Pagination
  var pageSize = 100;
  var maxPage = Math.max(0, Math.ceil(allDisplayed.length / pageSize) - 1);
  if (state.currentPage === undefined) state.currentPage = 0;
  state.currentPage = Math.min(state.currentPage, maxPage);
  var pageStart = state.currentPage * pageSize;
  var displayed = allDisplayed.slice(pageStart, pageStart + pageSize);

  // Update badge
  var badge = document.getElementById("wonderkid-badge");
  if (badge) badge.textContent = "(" + candidates.length + ")";

  // ─── BUILD HTML ───

  var html = "";
  html += "<div class='max-w-6xl mx-auto'>";

  // Squad context banner
  var base = state.squadBaseline;
  if (base && base.isDynamic) {
    html += "<div class='text-[10px] text-cyan-400/70 bg-cyan-400/5 border border-cyan-400/10 rounded px-3 py-2 mb-3'>";
    html += "Thresholds scaled to your squad \u2014 median CA <strong>" + base.medianCA + "</strong> from top <strong>" + base.topN + "</strong> players";
    if (state.provenOnly) html += " <span class='text-amber-400'>(proven starters only)</span>";
    html += "</div>";
  } else if (!squad || squad.length === 0) {
    html += "<div class='text-[10px] text-text-muted bg-surface border border-border rounded px-3 py-2 mb-3'>";
    html += "Load your squad (Squad Depth tab) to enable dynamic thresholds";
    html += "</div>";
  } else {
    var hasCA = squad.some(function (p) { return p.CA > 0; });
    var msg = hasCA ? "Too few players with CA data (need 5+). Using default thresholds." : "Could not compute squad baseline \u2014 CA column missing from export. Using default thresholds.";
    html += "<div class='text-[10px] text-amber-400/70 bg-amber-400/5 border border-amber-400/10 rounded px-3 py-2 mb-3'>" + msg + "</div>";
  }

  // Filters bar
  html += "<div class='flex flex-wrap gap-2 mb-4 items-center'>";
  html += "<label class='text-[10px] uppercase text-text-muted tracking-wider'>Max Age <input id='wk-maxage' type='number' min='15' max='23' value='" + state.maxAge + "' class='w-12 bg-surface border border-border rounded px-1 py-0.5 text-xs text-white text-center'></label>";

  // Min PA with auto-scale badge
  var paBadgeDim = state.userOverride.minPA ? " opacity-30 pointer-events-none" : "";
  html += "<label class='text-[10px] uppercase text-text-muted tracking-wider'>Min PA <span class='inline-block text-[9px] font-semibold leading-none px-1 py-0.5 rounded border border-cyan-500/40 text-cyan-400" + paBadgeDim + "' id='wk-pa-badge'>AUTO-SCALED</span> <input id='wk-minpa' type='number' min='-1' max='200' value='" + (!state.userOverride.minPA ? thresholds.minPA : state.minPA) + "' class='w-14 bg-surface border border-border rounded px-1 py-0.5 text-xs text-white text-center'></label>";

  // Min Gap with auto-scale badge
  var gapBadgeDim = state.userOverride.minGap ? " opacity-30 pointer-events-none" : "";
  html += "<label class='text-[10px] uppercase text-text-muted tracking-wider'>Min Gap <span class='inline-block text-[9px] font-semibold leading-none px-1 py-0.5 rounded border border-cyan-500/40 text-cyan-400" + gapBadgeDim + "' id='wk-gap-badge'>AUTO-SCALED</span> <input id='wk-mingap' type='number' min='0' max='100' value='" + (!state.userOverride.minGap ? thresholds.minGap : state.minGap) + "' class='w-12 bg-surface border border-border rounded px-1 py-0.5 text-xs text-white text-center'></label>";

  html += "<label class='text-[10px] uppercase text-text-muted tracking-wider'>Nationality <input id='wk-nat' type='text' value='" + escHtml(state.nationality) + "' placeholder='Any' class='w-20 bg-surface border border-border rounded px-1 py-0.5 text-xs text-white'></label>";
  html += "<label class='text-[10px] uppercase text-text-muted tracking-wider'>Max AP <input id='wk-maxap' type='text' value='" + escHtml(state.maxAP || "") + "' placeholder='\u221E' class='w-16 bg-surface border border-border rounded px-1 py-0.5 text-xs text-white'></label>";
  html += "<label class='flex items-center gap-1 text-[10px] uppercase text-text-muted tracking-wider'><input id='wk-unknown' type='checkbox'" + (state.includeUnknown ? " checked" : "") + " class='accent-cyan-500'> Show ?PA</label>";
  html += "<label class='flex items-center gap-1 text-[10px] uppercase text-text-muted tracking-wider'><input id='wk-fitfilter' type='checkbox'" + (state.showOnlyTacticFits ? " checked" : "") + " class='accent-cyan-500' " + (tactic.isComplete ? "" : "disabled") + "> Fits Tactic</label>";
  html += "<label class='flex items-center gap-1 text-[10px] uppercase text-text-muted tracking-wider'><input id='wk-proven' type='checkbox'" + (state.provenOnly ? " checked" : "") + " class='accent-cyan-500'> Proven Starters</label>";

  // Reset button
  var resetLabel = base && base.isDynamic ? "Reset to Auto" : "Reset Filters";
  html += "<button id='wk-reset-btn' class='text-[10px] uppercase tracking-wider text-text-muted hover:text-white border border-border hover:border-white rounded px-2 py-0.5 transition-colors'>" + resetLabel + "</button>";

  html += "<span class='text-[10px] text-text-muted ml-auto'>Page " + (state.currentPage + 1) + " of " + (maxPage + 1) + " (" + allDisplayed.length + " total)</span>";
  html += "</div>";

  if (allDisplayed.length === 0) {
    var emptyMsg = "No wonderkids found matching your filters.";
    if (base && base.isDynamic && !state.userOverride.minPA) {
      emptyMsg += " Your squad\u2019s threshold requires PA \u2265 " + thresholds.minPA + ". Lower Min PA or enable Show ?PA to expand results.";
    }
    html += "<div class='text-xs text-text-muted bg-surface border border-border rounded p-4 text-center'>" + emptyMsg + "</div>";
    html += "</div>";
    contentC.innerHTML = html;
    attachWonderkidListeners(state, thresholds);
    return;
  }

  // Table
  html += "<div class='overflow-x-auto'>";
  html += "<table class='w-full text-xs'><thead><tr class='border-b border-border text-text-muted'>";
  var cols = [
    { key: "name", label: "Name" },
    { key: "age", label: "Age" },
    { key: "club", label: "Club" },
    { key: "nat", label: "Nat" },
    { key: "pos", label: "Pos" },
    { key: "ca", label: "CA" },
    { key: "pa", label: "PA" },
    { key: "gap", label: "Gap" },
    { key: "ap", label: "AP" },
    { key: "conf", label: "Conf" },
  ];
  if (tactic.isComplete) cols.push({ key: "fit", label: "Fit" });
  cols.forEach(function (c) {
    var arrow = state.sortBy === c.key ? (state.sortAsc ? " \u25B2" : " \u25BC") : "";
    html += "<th class='wk-sort-th text-left py-2 px-2 font-medium cursor-pointer hover:text-white' data-sort='" + c.key + "'>" + c.label + arrow + "</th>";
  });
  html += "</tr></thead><tbody>";

  displayed.forEach(function (p) {
    var ageColor = p.Age <= 18 ? "text-green-400" : p.Age <= 21 ? "text-yellow-400" : "text-white";
    var gapColor = p._GrowthGap >= 40 ? "text-amber-400" : p._GrowthGap >= 25 ? "text-green-400" : "text-white";
    var ceilingLabel = "";
    if (p.PA >= 150) ceilingLabel = "World Class";
    else if (p.PA >= 130) ceilingLabel = "Top Flight";
    else if (p.PA >= 110) ceilingLabel = "Solid";
    else ceilingLabel = "Unknown";

    var paDisplay = (p.PA === -1 || p.PA === undefined) ? "???" : p.PA;
    var caDisplay = (p.CA === -1 || p.CA === undefined) ? "?" : p.CA;
    var gapDisplay = (p.PA === -1) ? "\u2014" : p._GrowthGap;

    html += "<tr class='border-b border-[#1A1A1A] hover:bg-[#111111] cursor-pointer' data-player-idx='" + (market.indexOf(p) !== -1 ? "m" + market.indexOf(p) : "s" + squad.indexOf(p)) + "'>";
    html += "<td class='py-1.5 px-2 text-white whitespace-nowrap'>" + escHtml(p.Name) + "</td>";
    html += "<td class='py-1.5 px-2 font-mono tabular-nums " + ageColor + "'>" + p.Age + "</td>";
    html += "<td class='py-1.5 px-2 text-text-secondary truncate max-w-[120px]'>" + escHtml(p.Club || "\u2014") + "</td>";
    html += "<td class='py-1.5 px-2 text-text-secondary'>" + escHtml(p.Nation || p.Nationality || p.Nat || "\u2014") + "</td>";
    html += "<td class='py-1.5 px-2 text-text-secondary'>" + escHtml(p.Position || "") + "</td>";
    html += "<td class='py-1.5 px-2 font-mono tabular-nums text-white'>" + caDisplay + "</td>";
    html += "<td class='py-1.5 px-2 font-mono tabular-nums font-semibold text-cyan-400' title='" + ceilingLabel + "'>" + paDisplay + "</td>";
    html += "<td class='py-1.5 px-2 font-mono tabular-nums " + gapColor + "'>" + gapDisplay + "</td>";
    html += "<td class='py-1.5 px-2 font-mono tabular-nums text-right text-text-secondary'>" + escHtml(p.APDisplay || (p.AP || "-")) + "</td>";
    var _fulfilment = computeFulfilmentScore(p);
    if (_fulfilment) {
      html += "<td class='py-1.5 px-2 font-mono tabular-nums " + _fulfilment.labelColor + " text-center' title='Dev: " + _fulfilment.devLikelihood + "% | Pers: " + _fulfilment.personalityRisk + "% (x" + _fulfilment.multiplier.toFixed(2) + ")'>" + _fulfilment.score + "%</td>";
    } else {
      html += "<td class='py-1.5 px-2 font-mono tabular-nums text-text-secondary text-center' title='PA unknown'>&mdash;</td>";
    }
    if (tactic.isComplete) {
      var fitCell, fitTitle;
      if (p._wkFit !== undefined && p._wkFit > 0 && p._wkFitSlot) {
        var fSlot = tactic.slots[p._wkFitSlot];
        var fRole = fSlot && fSlot.roleId ? getRoleById(fSlot.roleId) : null;
        if (fRole) {
          var fDisp = getSlotDisplay(fSlot);
          fitCell = p._wkFit.toFixed(1) + " (" + (fDisp ? fDisp.full : fRole.abbreviation) + ")";
          fitTitle = fRole.name + " (" + fRole.duty + ")";
        } else {
          fitCell = p._wkFit.toFixed(1) + " (" + slotShortLabel(p._wkFitSlot) + ")";
          fitTitle = "Slot: " + p._wkFitSlot;
        }
      } else {
        fitCell = "\u2014";
        fitTitle = p._wkFit === -1 ? "Player doesn\u2019t fit any tactic slot" : "Tactic not complete";
      }
      html += "<td class='py-1.5 px-2 font-mono tabular-nums text-white' title='" + fitTitle + "'>" + fitCell + "</td>";
    }
    html += "</tr>";
  });

  html += "</tbody></table></div>";

  // Pagination controls
  if (maxPage > 0) {
    html += "<div class='flex justify-center items-center gap-3 mt-3 mb-2'>";
    html += "<button class='wk-page-btn px-3 py-1 text-xs border border-[#333] rounded text-text-secondary hover:text-white hover:border-[#666] transition-colors'" + (state.currentPage === 0 ? " disabled style='opacity:0.4;cursor:default'" : "") + " data-wk-page='prev'>\u25C0 Prev</button>";
    html += "<span class='text-xs text-text-muted'>Page " + (state.currentPage + 1) + " of " + (maxPage + 1) + "</span>";
    html += "<button class='wk-page-btn px-3 py-1 text-xs border border-[#333] rounded text-text-secondary hover:text-white hover:border-[#666] transition-colors'" + (state.currentPage >= maxPage ? " disabled style='opacity:0.4;cursor:default'" : "") + " data-wk-page='next'>Next \u25B6</button>";
    html += "</div>";
  }

  html += "</div>";
  contentC.innerHTML = html;

  attachWonderkidListeners(state, thresholds);
}

// ─── EVENT ATTACHMENT ───

function attachWonderkidListeners(state, thresholds) {
  // Filter inputs (change + input for override tracking)
  var paInput = document.getElementById("wk-minpa");
  var gapInput = document.getElementById("wk-mingap");

  function onPAInput() {
    var val = parseInt(paInput.value, 10);
    state.userOverride.minPA = !isNaN(val) && val !== (state.squadBaseline ? state.squadBaseline.minPA : 130);
    if (!isNaN(val)) state.minPA = val;
    renderWonderkidView();
  }
  function onGapInput() {
    var val = parseInt(gapInput.value, 10);
    state.userOverride.minGap = !isNaN(val) && val !== (state.squadBaseline ? state.squadBaseline.minGap : 20);
    if (!isNaN(val)) state.minGap = val;
    renderWonderkidView();
  }

  if (paInput) {
    paInput.removeEventListener("input", onPAInput);
    paInput.removeEventListener("change", onPAInput);
    paInput.addEventListener("input", onPAInput);
    paInput.addEventListener("change", onPAInput);
  }
  if (gapInput) {
    gapInput.removeEventListener("input", onGapInput);
    gapInput.removeEventListener("change", onGapInput);
    gapInput.addEventListener("input", onGapInput);
    gapInput.addEventListener("change", onGapInput);
  }

  // Standard change-only inputs
  ["wk-maxage", "wk-nat", "wk-maxap"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.removeEventListener("change", applyWonderkidFilters);
      el.addEventListener("change", applyWonderkidFilters);
    }
  });
  var wkUnknown = document.getElementById("wk-unknown");
  if (wkUnknown) {
    wkUnknown.removeEventListener("change", applyWonderkidFilters);
    wkUnknown.addEventListener("change", applyWonderkidFilters);
  }
  var wkFitFilter = document.getElementById("wk-fitfilter");
  if (wkFitFilter) {
    wkFitFilter.removeEventListener("change", applyWonderkidFilters);
    wkFitFilter.addEventListener("change", applyWonderkidFilters);
  }
  var wkProven = document.getElementById("wk-proven");
  if (wkProven) {
    wkProven.removeEventListener("change", applyWonderkidFilters);
    wkProven.addEventListener("change", applyWonderkidFilters);
  }

  // Reset button
  var resetBtn = document.getElementById("wk-reset-btn");
  if (resetBtn) {
    resetBtn.removeEventListener("click", resetWonderkidOverrides);
    resetBtn.addEventListener("click", resetWonderkidOverrides);
  }

  // Sort click handlers
  var contentC = document.getElementById("wonderkid-content");
  if (contentC) {
    contentC.querySelectorAll(".wk-sort-th").forEach(function (el) {
      el.removeEventListener("click", handleWonderkidSort);
      el.addEventListener("click", handleWonderkidSort);
    });

    // Row click
    contentC.querySelectorAll("tr[data-player-idx]").forEach(function (row) {
      row.removeEventListener("click", handleWonderkidRowClick);
      row.addEventListener("click", handleWonderkidRowClick);
    });

    // Pagination buttons
    contentC.querySelectorAll(".wk-page-btn").forEach(function (btn) {
      btn.removeEventListener("click", handleWonderkidPage);
      btn.addEventListener("click", handleWonderkidPage);
    });
  }
}

function handleWonderkidPage() {
  var state = window.FM24State.wonderkidUI;
  var dir = this.dataset.wkPage;
  if (dir === "prev" && state.currentPage > 0) {
    state.currentPage--;
    renderWonderkidView();
  } else if (dir === "next") {
    state.currentPage++;
    renderWonderkidView();
  }
}

function handleWonderkidSort() {
  var state = window.FM24State.wonderkidUI;
  var key = this.dataset.sort;
  if (!key) return;
  if (state.sortBy === key) {
    state.sortAsc = !state.sortAsc;
  } else {
    state.sortBy = key;
    state.sortAsc = (key === "name" || key === "club" || key === "nat" || key === "pos");
  }
  renderWonderkidView();
}

function handleWonderkidRowClick() {
  var market = window.FM24State.market || [];
  var squad = window.FM24State.squad || [];
  var idxStr = this.dataset.playerIdx;
  var player;
  if (idxStr.charAt(0) === "m") {
    var mi = parseInt(idxStr.substring(1), 10);
    if (!isNaN(mi) && market[mi]) player = market[mi];
  } else {
    var si = parseInt(idxStr.substring(1), 10);
    if (!isNaN(si) && squad[si]) player = squad[si];
  }
  if (player) renderPlayerCard(player);
}

function applyWonderkidFilters() {
  var state = window.FM24State.wonderkidUI;
  var el;
  el = document.getElementById("wk-maxage");
  if (el) state.maxAge = parseInt(el.value, 10) || 21;
  el = document.getElementById("wk-nat");
  if (el) state.nationality = el.value;
  el = document.getElementById("wk-maxap");
  if (el) state.maxAP = el.value;
  el = document.getElementById("wk-unknown");
  if (el) state.includeUnknown = el.checked;
  el = document.getElementById("wk-fitfilter");
  if (el) state.showOnlyTacticFits = el.checked;
  el = document.getElementById("wk-proven");
  if (el) state.provenOnly = el.checked;
  renderWonderkidView();
}
