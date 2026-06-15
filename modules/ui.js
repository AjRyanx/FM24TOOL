function showToast(message, type) {
  var container = document.getElementById("toast-container");
  if (!container) return;
  var toast = document.createElement("div");
  var bg = type === "error" ? "bg-[#1F1F1F] border-red-700" : "bg-[#1F1F1F] border-[#666666]";
  toast.className = "px-4 py-2 border-l-4 text-sm text-white font-mono " + bg + " shadow-lg";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(function () {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
}

function buildUploadZone(container, label, stateKey, eventName) {
  container.innerHTML = "";
  var zone = document.createElement("div");
  zone.className = "border-2 border-dashed border-border rounded p-8 text-center cursor-pointer transition-colors hover:border-text-secondary bg-surface";

  var p = document.createElement("p");
  p.className = "text-sm text-text-secondary mb-3";
  p.textContent = label;
  zone.appendChild(p);

  var input = document.createElement("input");
  input.type = "file";
  input.accept = ".html,.htm";
  input.className = "block mx-auto mb-2 text-xs text-text-secondary file:mr-3 file:py-1 file:px-3 file:border file:border-border file:rounded file:text-xs file:bg-surface file:text-white hover:file:bg-surface-hover";
  zone.appendChild(input);

  var dropHint = document.createElement("span");
  dropHint.className = "text-xs text-text-muted";
  dropHint.textContent = "or drag & drop here";
  zone.appendChild(dropHint);

  var progressBar = document.createElement("div");
  progressBar.className = "import-progress hidden";
  progressBar.innerHTML = '<div class="import-progress-bar" style="width:0%"></div>';
  zone.appendChild(progressBar);

  function handleFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var text = e.target.result;
      if (
        text.indexOf("<html") === -1 &&
        text.indexOf("<!DOCTYPE") === -1 &&
        text.indexOf("<table") === -1
      ) {
        showToast(
          "This doesn't look like an FM24 HTML export. Export from FM24 using the HTML export option.",
          "error"
        );
        return;
      }
      progressBar.classList.remove("hidden");
      var parser = stateKey === "market" && typeof parseMarketHTML !== "undefined" ? parseMarketHTML : parseSquadHTML;
      parser(text, function (cur, total) {
        var pct = Math.round((cur / total) * 100);
        progressBar.querySelector(".import-progress-bar").style.width = pct + "%";
      }).then(function (players) {
        validateSquadData(players, stateKey);
        window.FM24State[stateKey] = players;
        window.dispatchEvent(new CustomEvent(eventName, { detail: { count: players.length } }));
        showToast("Loaded " + players.length + " players", "success");
        progressBar.classList.add("hidden");
        progressBar.querySelector(".import-progress-bar").style.width = "0%";
      }).catch(function (err) {
        showToast(err.message || "Failed to parse file", "error");
        progressBar.classList.add("hidden");
        progressBar.querySelector(".import-progress-bar").style.width = "0%";
      });
    };
    reader.readAsText(file);
  }

  input.addEventListener("change", function () {
    if (input.files && input.files[0]) {
      handleFile(input.files[0]);
    }
  });

  zone.addEventListener("dragover", function (e) {
    e.preventDefault();
    zone.classList.add("drag-over");
  });
  zone.addEventListener("dragleave", function () {
    zone.classList.remove("drag-over");
  });
  zone.addEventListener("drop", function (e) {
    e.preventDefault();
    zone.classList.remove("drag-over");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  container.appendChild(zone);
}

function renderDepthUpload() {
  var container = document.getElementById("depth-upload");
  if (container) {
    buildUploadZone(container, "Upload Squad HTML (FM24 export)", "squad", "fm24:squad-loaded");
  }
}

function renderMarketUpload() {
  var container = document.getElementById("market-upload");
  if (container) {
    buildUploadZone(container, "Upload Market HTML (FM24 export)", "market", "fm24:market-loaded");
  }
}

/* ── HELPERS ── */

function _renderASCIIBar(score, maxChars) {
  if (score === undefined || score === null || score < 0) return "[---]  -";
  maxChars = maxChars || 10;
  var filled = Math.round((score / 20) * maxChars);
  filled = Math.max(0, Math.min(maxChars, filled));
  var empty = maxChars - filled;
  var bar = "[";
  for (var i = 0; i < filled; i++) bar += "\u2588";
  for (var i = 0; i < empty; i++) bar += "-";
  bar += "]";
  return '<span class="text-text-muted">' + bar + '</span> <span class="text-white font-bold">' + score + '</span>';
}

function _renderFitBadge(fitLabel) {
  if (!fitLabel) return "";
  var label = fitLabel.toUpperCase();
  var cls = "text-xs";
  if (label === "ELITE FIT" || label === "STRONG FIT") cls += " text-white font-bold";
  else if (label === "DECENT FIT") cls += " text-text-secondary";
  else cls += " text-text-muted";
  return '<span class="' + cls + '">[' + label + ']</span>';
}

function _renderShortlistCheckbox(player) {
  var idx = isShortlistedIdx ? isShortlistedIdx(player) : -1;
  if (idx !== -1 && idx !== undefined) {
    return '<span class="text-white cursor-pointer select-none shortlist-toggle" data-player-idx="' + window.FM24State.squad.indexOf(player) + '">[X]</span>';
  }
  return '<span class="text-text-muted cursor-pointer select-none shortlist-toggle" data-player-idx="' + window.FM24State.squad.indexOf(player) + '">[ ]</span>';
}

/* ── SQUAD VIEW (DEPTH CHART) ── */

var STRATA_ORDER = ["All", "GK", "DC", "WD", "DM", "CM", "WM", "AMC", "WA", "ST"];

function invalidateSquadFitCache() {
  var squad = window.FM24State.squad;
  if (squad) {
    for (var i = 0; i < squad.length; i++) {
      delete squad[i]._bestFit;
      delete squad[i]._bestFitScore;
      delete squad[i]._bestFitPerStrata;
      delete squad[i]._evalScores;
    }
  }
  var market = window.FM24State.market;
  if (market) {
    for (var i = 0; i < market.length; i++) {
      delete market[i]._marketScores;
    }
  }
  if (typeof invalidateDNACache === 'function') invalidateDNACache();
}

function renderDepthView() {
  var squad = window.FM24State.squad;
  var uploadC = document.getElementById("depth-upload");
  var contentC = document.getElementById("depth-content");
  var isDof = window.FM24State.appMode === 'dof';

  if (!squad || squad.length === 0) {
    renderDepthUpload();
    if (contentC) contentC.innerHTML = '<p class="text-text-muted text-sm text-center py-8">Load a squad above to get started.</p>';
    return;
  }

  if (uploadC) uploadC.innerHTML = "";
  if (!contentC) return;
  contentC.innerHTML = "";

  // ── Modern panel header ──
  var header = document.createElement('div');
  header.className = 'depth-panel-header';
  header.innerHTML =
    '<div class="depth-panel-title">' +
      '<span class="depth-panel-icon">▦</span>' +
      '<span>Squad Depth</span>' +
    '</div>' +
    (isDof ? '<span class="depth-mode-chip">DOF View</span>' : '<span class="depth-mode-chip depth-mode-chip--normal">Normal</span>');
  contentC.appendChild(header);

  // Squad DNA & Coherence bar — DOF mode only
  if (isDof && typeof computeSquadDNA === 'function' && squad.length > 0) {
    var dna = computeSquadDNA(squad);
    var tact = window.FM24State.tactic;
    var mgr = window.FM24State.manager && window.FM24State.manager.hired;
    var coherenceResult = (mgr && tact && tact.isComplete && typeof computeCoherenceScore === 'function')
      ? computeCoherenceScore(dna, mgr, tact) : null;
    var currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

    var dnaBar = document.createElement('div');
    dnaBar.className = 'dna-depth-bar';
    dnaBar.innerHTML =
      '<div class="dna-depth-badge">' +
        (typeof renderDNABadge === 'function' ? renderDNABadge(dna, 80, currentTheme) : '') +
        '<div class="dna-depth-profile">' + dna.profile + '</div>' +
      '</div>' +
      (coherenceResult ? (
        '<div class="dna-depth-divider"></div>' +
        (typeof renderCoherenceBadge === 'function' ? renderCoherenceBadge(coherenceResult, true) : '')
      ) : '');
    contentC.appendChild(dnaBar);
  }

  var state = window.FM24State.depthUI;
  var tactic = window.FM24State.tactic;

  // Compute best fits if tactic is complete
  if (tactic.isComplete) {
    for (var i = 0; i < squad.length; i++) {
      if (!squad[i]._bestFitPerStrata) {
        var fits = findBestTacticFitForPlayer(squad[i]);
        var bestPerStrata = {};
        var bestFit = null;
        fits.forEach(function (fit) {
          var strata = getSlotDef(fit.slotId).strata;
          if (!bestPerStrata[strata]) bestPerStrata[strata] = fit;
          if (!bestFit) bestFit = fit;
        });
        squad[i]._bestFitPerStrata = bestPerStrata;
        squad[i]._bestFit = bestFit || null;
        squad[i]._bestFitScore = bestFit ? bestFit.score.total : undefined;
      }
    }
  }

  // ── Controls bar ──
  var ctrls = document.createElement("div");
  ctrls.className = "depth-controls-bar";

  // Search
  var srch = document.createElement("input");
  srch.type = "text";
  srch.className = "depth-search-input";
  srch.placeholder = "Search player or position…";
  srch.value = state.search || "";
  srch.addEventListener("input", function () {
    state.search = this.value;
    _renderDepthChart();
  });
  ctrls.appendChild(srch);

  // Position filter — compact select dropdown
  var strataSelect = document.createElement("select");
  strataSelect.className = "depth-strata-select";
  STRATA_ORDER.forEach(function (s) {
    var opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s === "All" ? "All Positions" : s;
    opt.selected = s === (state.strata || "All");
    strataSelect.appendChild(opt);
  });
  strataSelect.addEventListener("change", function () {
    state.strata = this.value;
    _renderDepthChart();
  });
  ctrls.appendChild(strataSelect);

  // View toggle
  var viewBtn = document.createElement("button");
  viewBtn.className = "depth-ctrl-btn" + (state.viewMode === "slots" ? " depth-ctrl-btn--active" : "");
  viewBtn.id = "depth-view-toggle";
  viewBtn.title = state.viewMode === "slots" ? "Switch to Stratified view" : "Switch to Slot Coverage view";
  viewBtn.textContent = state.viewMode === "slots" ? "Stratified" : "Slot Coverage";
  viewBtn.addEventListener("click", function () {
    state.viewMode = state.viewMode === "slots" ? "strata" : "slots";
    renderDepthView();
  });
  ctrls.appendChild(viewBtn);

  // Proven starters toggle — only relevant in DOF mode
  if (isDof) {
    var provenBtn = document.createElement("button");
    provenBtn.className = "depth-ctrl-btn" + (state.provenOnly ? " depth-ctrl-btn--proven" : "");
    provenBtn.textContent = state.provenOnly ? "Proven" : "All";
    provenBtn.title = "Toggle proven starters mode — ranks players by fit × minutes weight";
    provenBtn.addEventListener("click", function () {
      state.provenOnly = !state.provenOnly;
      renderDepthView();
    });
    ctrls.appendChild(provenBtn);
  }

  // Player count
  var hiddenPlayers = window.FM24State.depthHidden || [];
  var hiddenNames = {};
  hiddenPlayers.forEach(function (h) { hiddenNames[h.name] = true; });
  var visibleCount = squad.filter(function (p) { return !hiddenNames[p.Name]; }).length;
  var cnt = document.createElement("span");
  cnt.id = "depth-player-count";
  cnt.className = "depth-count-label";
  cnt.textContent = visibleCount + " / " + squad.length + " players";
  ctrls.appendChild(cnt);

  if ((window.FM24State.depthHidden || []).length > 0) {
    var resetBtn = document.createElement("button");
    resetBtn.className = "depth-reset-btn";
    resetBtn.textContent = "Reset hidden";
    resetBtn.addEventListener("click", function () {
      window.FM24State.depthHidden = [];
      saveDepthHidden();
      _renderDepthChart();
    });
    ctrls.appendChild(resetBtn);
  }
  contentC.appendChild(ctrls);

  // Depth chart container
  var chartDiv = document.createElement("div");
  chartDiv.id = "depth-chart";
  chartDiv.className = "space-y-3";
  contentC.appendChild(chartDiv);

  _renderDepthChart();
}

function _renderDepthChart() {
  var state = window.FM24State.depthUI;
  var tactic = window.FM24State.tactic;
  var chartDiv = document.getElementById("depth-chart");
  if (!chartDiv) return;

  if (state.viewMode === "slots") {
    _renderSlotCoverage(chartDiv);
    updateDepthPlayerCount();
    return;
  }

  var squad = window.FM24State.squad;

  var search = (state.search || "").toLowerCase();
  var strata = state.strata || "All";

  // Group players by strata
  var groups = {};
  STRATA_ORDER.forEach(function (s) {
    if (s === "All") return;
    groups[s] = [];
  });

  for (var i = 0; i < squad.length; i++) {
    var p = squad[i];

    // Search filter
    if (search) {
      var name = (p.Name || "").toLowerCase();
      var pos = (p.Position || "").toLowerCase();
      if (name.indexOf(search) === -1 && pos.indexOf(search) === -1) continue;
    }

    var pStrata = p.strata || [];
    var added = false;
    STRATA_ORDER.forEach(function (s) {
      if (s === "All") return;
      if (strata !== "All" && strata !== s) return;
      if (pStrata.indexOf(s) !== -1) {
        groups[s].push(p);
        added = true;
      }
    });

    // If player has no recognized strata or strata filter selected but no match
    if (!added && strata !== "All") {
      // For "All" strata, we still show them if they don't match any group
    }
  }

  // If specific strata selected, only show that one
  var displayStrata = STRATA_ORDER.filter(function (s) {
    if (s === "All") return false;
    if (strata !== "All" && strata !== s) return false;
    return true;
  });

  // Hide strata groups with no active tactic slot
  if (strata === "All") {
    var activeStrata = {};
    var slots = window.FM24State.tactic.slots || {};
    Object.keys(slots).forEach(function (id) {
      var def = getSlotDef(id);
      if (def) activeStrata[def.strata] = true;
    });
    displayStrata = displayStrata.filter(function (s) {
      return activeStrata[s] === true;
    });
  }

  var html = "";
  var hasAny = false;

  displayStrata.forEach(function (s) {
    var players = groups[s] || [];

    // Filter out players hidden from this strata
    var dh = window.FM24State.depthHidden || [];
    players = players.filter(function (pl) {
      return !dh.some(function (h) { return h.name === pl.Name && h.strata === s; });
    });

    if (players.length === 0) return;
    hasAny = true;

    // Sort by per-strata fit score descending
    players.sort(function (a, b) {
      var sa = a._bestFitPerStrata && a._bestFitPerStrata[s] ? a._bestFitPerStrata[s].score.total : -1;
      var sb = b._bestFitPerStrata && b._bestFitPerStrata[s] ? b._bestFitPerStrata[s].score.total : -1;
      return sb - sa;
    });

    // Compute average (per-strata)
    var sum = 0;
    var scored = 0;
    players.forEach(function (pl) {
      var f = pl._bestFitPerStrata && pl._bestFitPerStrata[s];
      if (f) { sum += f.score.total; scored++; }
    });
    var avg = scored > 0 ? (sum / scored).toFixed(1) : "-";

    html += '<div class="border border-border rounded bg-surface overflow-hidden">';

    // Header
    html += '<div class="flex items-center justify-between px-3 py-2 border-b border-border">' +
      '<span class="text-xs font-bold tracking-wider text-white">' + s + ' <span class="text-text-muted font-normal">(' + players.length + ' players)</span></span>' +
      '<span class="text-xs text-text-secondary">Avg Fit: ' + avg + '</span>' +
    '</div>';

    // Players
    html += '<div class="divide-y divide-border">';
    players.forEach(function (pl) {
      var flankStr = "";
      var fl = pl.flanks || [];
      if (fl.indexOf("L") !== -1 && fl.indexOf("R") !== -1) flankStr = " \u25C0\u25B6";
      else if (fl.indexOf("L") !== -1) flankStr = " \u25C0";
      else if (fl.indexOf("R") !== -1) flankStr = " \u25B6";

      var bestFit = pl._bestFitPerStrata ? pl._bestFitPerStrata[s] || null : null;
      var score = bestFit ? bestFit.score.total : undefined;
      if (score === undefined && tactic.isComplete) {
        var fits = findBestTacticFitForPlayer(pl);
        var bestPerStrata = {};
        var bestFitAll = null;
        fits.forEach(function (fit) {
          var strata = getSlotDef(fit.slotId).strata;
          if (!bestPerStrata[strata]) bestPerStrata[strata] = fit;
          if (!bestFitAll) bestFitAll = fit;
        });
        pl._bestFitPerStrata = bestPerStrata;
        pl._bestFit = bestFitAll || null;
        pl._bestFitScore = bestFitAll ? bestFitAll.score.total : undefined;
        bestFit = bestPerStrata[s] || null;
        score = bestFit ? bestFit.score.total : undefined;
      }
      var roleStr = "";
      if (bestFit) {
        roleStr = bestFit.roleName + " (" + bestFit.duty + ")";
      }

      var footStr = "";
      if (pl.Foot) {
        footStr = "\u25C0\u25B6 " + pl.Foot;
      }

      html += '<div class="px-3 py-2 hover:bg-surface-hover cursor-pointer depth-player-row" data-player-idx="' + squad.indexOf(pl) + '">' +
        '<div class="flex items-center gap-2">' +
          '<span class="text-xs text-text-muted font-mono">' + _renderShortlistCheckbox(pl) + '</span>' +
          '<span class="hide-btn text-xs text-[#666666] hover:text-white cursor-pointer mr-1" data-idx="' + squad.indexOf(pl) + '" data-strata="' + s + '">\u2212</span>' +
          '<span class="text-sm text-white font-bold flex-1 min-w-0 truncate">' + escHtml(pl.Name) + '</span>';

      if (tactic.isComplete && score !== undefined) {
        html += '<div class="hidden md:block text-xs text-text-secondary text-right min-w-[100px]">' +
          (roleStr ? escHtml(roleStr) : "") +
        '</div>' +
        '<div class="text-right flex-shrink-0">' +
          _renderASCIIBar(score) + ' ' + _renderFitBadge(bestFit ? bestFit.score.fitLabel : "") +
        '</div>';
      } else if (!tactic.isComplete) {
        html += '<span class="text-xs text-text-muted">' + escHtml(pl.Position || "") + '</span>';
      }

      html += '</div>';

      // Meta row
      var isDofMode = window.FM24State.appMode === 'dof';
      html += '<div class="flex items-center gap-3 mt-0.5 text-xs text-text-muted flex-wrap">' +
        '<span>' + (pl.Age || "-") + 'y</span>' +
        '<span>' + escHtml(pl.Nation || pl.Nationality || pl.Nat || "") + '</span>' +
        '<span>' + escHtml(pl.Club || "") + '</span>' +
        '<span>' + escHtml(pl.Position || "") + flankStr + '</span>' +
        (footStr ? '<span>' + footStr + '</span>' : "") +
        // DOF-only: playing time & performance analytics
        (isDofMode && typeof PlayerUtils !== "undefined" && PlayerUtils.getMinutesLoad ? (function() {
          var ml = PlayerUtils.getMinutesLoad(pl);
          var mlColors = {starter: 'text-emerald-400', rotation: 'text-sky-400', fringe: 'text-amber-400', unused: 'text-gray-500', absent: 'text-red-400'};
          var mlC = mlColors[ml.tier] || 'text-gray-500';
          return '<span class="depth-analytics-pill ' + mlC + '">' + ml.tier + ' (' + ml.raw + 'm)</span>';
        })() : '') +
        (isDofMode && typeof PlayerUtils !== "undefined" && PlayerUtils.getPerformanceBand ? (function() {
          var pb = PlayerUtils.getPerformanceBand(pl);
          var pbColors = {elite: 'text-purple-400', strong: 'text-blue-400', decent: 'text-green-400', marginal: 'text-amber-400', poor: 'text-red-400', 'no-data': 'text-gray-600'};
          var pbC = pbColors[pb.band] || 'text-gray-500';
          return pb.band === 'no-data' ? '' : '<span class="depth-analytics-pill ' + pbC + '">' + pb.band + (pl.AvRat != null ? ' ' + pl.AvRat.toFixed(2) : '') + '</span>';
        })() : '') +
        (isDofMode && typeof PlayerUtils !== "undefined" && PlayerUtils.getPTDelta ? (function() {
          var d = PlayerUtils.getPTDelta(pl);
          if (!d.label || d.direction === 'unknown' || d.direction === 'on-track') return '';
          var dirColors = {overperforming: 'text-green-400', underperforming: 'text-red-400'};
          var dC = dirColors[d.direction] || 'text-gray-500';
          return '<span class="depth-analytics-pill ' + dC + '" title="' + escHtml(d.label) + '">' + escHtml(d.label) + '</span>';
        })() : '') +
      '</div>';

      html += '</div>';
    });
    html += '</div></div>';
  });

  if (!hasAny && strata !== "All") {
    html = '<div class="text-text-muted text-xs text-center py-8">No players match the position filter.</div>';
  } else if (!hasAny) {
    html = '<div class="text-text-muted text-xs text-center py-8">No players with recognized positions.</div>';
  }

  chartDiv.innerHTML = html;

  // Row clicks
  chartDiv.querySelectorAll(".depth-player-row").forEach(function (row) {
    row.addEventListener("click", function () {
      var idx = parseInt(this.dataset.playerIdx, 10);
      if (!isNaN(idx) && squad[idx]) {
        renderPlayerCard(squad[idx]);
      }
    });
  });

  // Shortlist toggle clicks
  chartDiv.querySelectorAll(".shortlist-toggle").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.stopPropagation();
      var idx = parseInt(this.dataset.playerIdx, 10);
      if (isNaN(idx) || !squad[idx]) return;
      var player = squad[idx];
      var slIdx = typeof isShortlistedIdx === "function" ? isShortlistedIdx(player) : -1;
      if (slIdx !== -1) {
        window.FM24State.shortlist.splice(slIdx, 1);
      } else {
        var bestSlot = player._bestFit ? player._bestFit.slotId : null;
        var bestScore = player._bestFitScore;
        window.FM24State.shortlist.push({
          player: player,
          targetSlotId: bestSlot,
          scoreAtShortlist: bestScore,
          bestSlotId: bestSlot
        });
      }
      _renderDepthChart();
    });
  });

  // Hide button clicks
  chartDiv.querySelectorAll(".hide-btn").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.stopPropagation();
      var idx = parseInt(this.dataset.idx, 10);
      var strata = this.dataset.strata;
      if (isNaN(idx) || !squad[idx]) return;
      window.FM24State.depthHidden.push({ name: squad[idx].Name, strata: strata });
      saveDepthHidden();
      _renderDepthChart();
    });
  });

  // Update player count in the controls bar
  updateDepthPlayerCount();
}

function updateDepthPlayerCount() {
  var cntEl = document.getElementById("depth-player-count");
  if (!cntEl) return;
  var squad = window.FM24State.squad;
  if (!squad) { cntEl.textContent = "0 players"; return; }
  var hiddenPlayers = window.FM24State.depthHidden || [];
  var hiddenNames = {};
  hiddenPlayers.forEach(function (h) { hiddenNames[h.name] = true; });
  var visibleCount = squad.filter(function (p) { return !hiddenNames[p.Name]; }).length;
  cntEl.textContent = visibleCount + " / " + squad.length + " players";
}

/* ── SLOT COVERAGE VIEW ── */

/* ── SLOT COVERAGE VIEW ── */

function _getSlotDisplayName(slotId) {
  var names = {
    GK: "Goalkeeper",
    DL: "Left Back", DR: "Right Back",
    DCL: "CB (Left)", DC: "Centre-Back", DCR: "CB (Right)",
    WBL: "Left Wing-Back", WBR: "Right Wing-Back",
    DMCL: "DM (Left)", DMC: "Def. Midfielder", DMCR: "DM (Right)",
    ML: "Left Midfielder", MR: "Right Midfielder",
    MCL: "CM (Left)", MC: "Centre Midfielder", MCR: "CM (Right)",
    AML: "Left Winger", AMR: "Right Winger",
    AMCL: "AM (Left)", AMC: "Att. Midfielder", AMCR: "AM (Right)",
    STCL: "ST (Left)", STC: "Striker", STCR: "ST (Right)"
  };
  return names[slotId] || slotId;
}

function _getSlotCoverageTarget(slotId) {
  return slotId === "GK" ? 3 : 2;
}

function buildGlobalDepthAssignments(squad) {
  var tactic = window.FM24State.tactic;
  if (!tactic.isComplete || !squad || squad.length === 0) return null;

  var slotIds = Object.keys(tactic.slots);
  var assignments = {};
  for (var si = 0; si < slotIds.length; si++) {
    assignments[slotIds[si]] = [];
  }

  // Generate all valid player-slot combinations
  var combos = [];
  for (var pi = 0; pi < squad.length; pi++) {
    var player = squad[pi];
    for (var si = 0; si < slotIds.length; si++) {
      var slotId = slotIds[si];
      var scoreObj = scorePlayerForTacticSlot(player, slotId);
      if (scoreObj === null) continue;
      var slot = tactic.slots[slotId];
      var role = getRoleById(slot.roleId);
      combos.push({
        player: player,
        slotId: slotId,
        score: scoreObj.total,
        fitLabel: scoreObj.fitLabel,
        roleName: role ? role.name : "Unknown",
        duty: role ? role.duty : slot.duty
      });
    }
  }

  if (combos.length === 0) return assignments;

  // Sort globally by score descending (NaN-safe)
  // Apply proven starters weight when depthUI.provenOnly is active
  var depthState = window.FM24State.depthUI || {};
  var useProvenWeight = depthState.provenOnly && typeof PlayerUtils !== "undefined" && PlayerUtils.getMinutesLoadWeight;
  combos.sort(function (a, b) {
    var sa = a.score;
    var sb = b.score;
    if (useProvenWeight) {
      sa *= PlayerUtils.getMinutesLoadWeight(a.player);
      sb *= PlayerUtils.getMinutesLoadWeight(b.player);
    }
    if (isNaN(sa) && isNaN(sb)) return 0;
    if (isNaN(sb)) return -1;
    if (isNaN(sa)) return 1;
    return sb - sa;
  });

  // Build player → best combo map (first in sorted order = highest score)
  var playerBestCombo = new Map();
  for (var ci = 0; ci < combos.length; ci++) {
    var c = combos[ci];
    if (!playerBestCombo.has(c.player)) {
      playerBestCombo.set(c.player, c);
    }
  }

  // PASS 0: Apply forced placements — tactic slot assignments + manual overrides
  var assignedPlayers = new Set();
  var forcedMap = {};
  for (var si = 0; si < slotIds.length; si++) {
    var sid = slotIds[si];
    if (tactic.slots[sid] && tactic.slots[sid].playerName) {
      forcedMap[tactic.slots[sid].playerName] = sid;
    }
  }
  var overrides = window.FM24State.depthOverrides || {};
  for (var pn in overrides) {
    if (overrides.hasOwnProperty(pn)) forcedMap[pn] = overrides[pn];
  }
  for (var pi = 0; pi < squad.length; pi++) {
    var player = squad[pi];
    var targetSlotId = forcedMap[player.Name];
    if (!targetSlotId || !assignments[targetSlotId]) continue;
    for (var ci = 0; ci < combos.length; ci++) {
      if (combos[ci].player === player && combos[ci].slotId === targetSlotId) {
        assignments[targetSlotId].push({ player: combos[ci].player, score: combos[ci].score, fitLabel: combos[ci].fitLabel, roleName: combos[ci].roleName, duty: combos[ci].duty });
        assignedPlayers.add(player);
        break;
      }
    }
  }

  // PASS 1: Fill core depth — capped at target (3 GK, 2 outfield)
  for (var ci = 0; ci < combos.length; ci++) {
    var c = combos[ci];
    if (assignedPlayers.has(c.player)) continue;
    var depth = assignments[c.slotId];
    var target = _getSlotCoverageTarget(c.slotId);
    if (depth.length >= target) continue;
    depth.push({ player: c.player, score: c.score, fitLabel: c.fitLabel, roleName: c.roleName, duty: c.duty });
    assignedPlayers.add(c.player);
  }

  // PASS 2: Remaining players — first-fit into slots with room, overflow to personal best
  var playerCombos = {};
  for (var ci = 0; ci < combos.length; ci++) {
    var c = combos[ci];
    var pn = c.player.Name;
    if (!playerCombos[pn]) playerCombos[pn] = [];
    playerCombos[pn].push(c);
  }
  for (var pi = 0; pi < squad.length; pi++) {
    var player = squad[pi];
    if (assignedPlayers.has(player)) continue;
    var pn = player.Name;
    var pCombos = playerCombos[pn] || [];
    var placed = false;
    for (var ci = 0; ci < pCombos.length; ci++) {
      var pc = pCombos[ci];
      var depth = assignments[pc.slotId];
      var target = _getSlotCoverageTarget(pc.slotId);
      if (depth.length < target) {
        depth.push({ player: pc.player, score: pc.score, fitLabel: pc.fitLabel, roleName: pc.roleName, duty: pc.duty });
        assignedPlayers.add(player);
        placed = true;
        break;
      }
    }
    if (!placed) {
      var bc = playerBestCombo.get(player);
      if (bc) {
        assignments[bc.slotId].push({ player: bc.player, score: bc.score, fitLabel: bc.fitLabel, roleName: bc.roleName, duty: bc.duty });
        assignedPlayers.add(player);
      }
    }
  }

  // Sort each slot's players by score descending
  for (var si = 0; si < slotIds.length; si++) {
    assignments[slotIds[si]].sort(function (a, b) { return b.score - a.score; });
  }

  // Verification pass: move overflow players to under-target slots
  // (even forced players can move if their current slot stays above target)
  for (var si = 0; si < slotIds.length; si++) {
    var sid = slotIds[si];
    var players = assignments[sid];
    for (var pi = 0; pi < players.length; pi++) {
      var entry = players[pi];
      var pn = entry.player.Name;
      var minStay = _getSlotCoverageTarget(sid);
      // Only move if source slot stays at or above target after the move
      if (players.length <= minStay) continue;
      var pCombos = playerCombos[pn] || [];
      for (var ci = 0; ci < pCombos.length; ci++) {
        var pc = pCombos[ci];
        if (pc.slotId === sid) break;
        var bestSlot = assignments[pc.slotId];
        var bestTarget = _getSlotCoverageTarget(pc.slotId);
        if (bestSlot.length < bestTarget) {
          bestSlot.push({ player: entry.player, score: pc.score, fitLabel: pc.fitLabel, roleName: pc.roleName, duty: pc.duty });
          players.splice(pi, 1);
          pi--;
          break;
        }
      }
    }
  }

  return assignments;
}

function _renderSlotCoverage(container) {
  var squad = window.FM24State.squad;
  var state = window.FM24State.depthUI;
  var tactic = window.FM24State.tactic;

  if (!tactic.isComplete) {
    container.innerHTML = '<p class="text-text-muted text-xs text-center py-8">Complete your tactic to see slot coverage.</p>';
    return;
  }

  var assignments = buildGlobalDepthAssignments(squad);
  if (!assignments) {
    container.innerHTML = '<p class="text-text-muted text-xs text-center py-8">Load a squad first.</p>';
    return;
  }

  var cnt = container.parentElement.querySelector("span.text-xs.text-text-muted.ml-auto");
  if (cnt) {
    cnt.textContent = squad.length + " players";
  }

  var search = (state.search || "").toLowerCase();
  var strataFilter = state.strata || "All";
  var dh = window.FM24State.depthHidden || [];
  var slotIds = Object.keys(assignments).sort(function (a, b) {
    var da = getSlotDef(a), db = getSlotDef(b);
    if (!da) return 1; if (!db) return -1;
    if (db.y !== da.y) return db.y - da.y;
    return da.x - db.x;
  });

  var html = "";

  for (var si = 0; si < slotIds.length; si++) {
    var slotId = slotIds[si];
    var slotDetail = tactic.slots[slotId];
    var slotDef = getSlotDef(slotId);
    if (!slotDef) continue;
    if (strataFilter !== "All" && slotDef.strata !== strataFilter) continue;

    var target = _getSlotCoverageTarget(slotId);
    var allAssigned = assignments[slotId] || [];

    // Apply search + hidden filters for display
    var displayList = [];
    var visibleCount = 0;
    for (var ai = 0; ai < allAssigned.length; ai++) {
      var entry = allAssigned[ai];
      var isHidden = false;
      for (var hi = 0; hi < dh.length; hi++) {
        if (dh[hi].name === entry.player.Name && dh[hi].strata === slotDef.strata) { isHidden = true; break; }
      }
      if (!isHidden) visibleCount++;
      if (isHidden) continue;
      if (search) {
        var pname = (entry.player.Name || "").toLowerCase();
        var ppos = (entry.player.Position || "").toLowerCase();
        if (pname.indexOf(search) === -1 && ppos.indexOf(search) === -1) continue;
      }
      displayList.push(entry);
    }

    var statusClass, statusLabel;
    if (visibleCount >= target) {
      statusClass = "text-green-400 border-green-700";
      statusLabel = visibleCount + "/" + target;
    } else if (visibleCount >= Math.max(1, target - 1)) {
      statusClass = "text-amber-400 border-amber-700";
      statusLabel = visibleCount + "/" + target;
    } else {
      statusClass = "text-red-400 border-red-700";
      statusLabel = visibleCount + "/" + target;
    }

    var roleDisplay = "";
    if (slotDetail.roleId) {
      var role = getRoleById(slotDetail.roleId);
      if (role && slotDetail.duty) {
        var dutyAbbr = slotDetail.duty === "Defend" ? "D" : slotDetail.duty === "Support" ? "S" : "A";
        roleDisplay = role.abbreviation + "-" + dutyAbbr;
      }
    }

    html += '<div class="border border-border rounded bg-surface overflow-hidden mb-3">';
    html += '<div class="flex items-center justify-between px-3 py-2 border-b border-border">' +
      '<span class="text-xs font-bold tracking-wider text-white">' + slotId + ' <span class="text-text-muted font-normal">' + _getSlotDisplayName(slotId) + '</span></span>' +
      '<div class="flex items-center gap-2">' +
        (roleDisplay ? '<span class="text-xs text-text-secondary">' + escHtml(roleDisplay) + '</span>' : '') +
        '<span class="text-xs font-bold px-2 py-0.5 border rounded ' + statusClass + '">' + statusLabel + '</span>' +
      '</div>' +
    '</div>';

    if (displayList.length > 0) {
      html += '<div class="divide-y divide-border">';
      for (var di = 0; di < displayList.length; di++) {
        var entry = displayList[di];
        var pl = entry.player;
        var flankStr = "";
        var fl = pl.flanks || [];
        if (fl.indexOf("L") !== -1 && fl.indexOf("R") !== -1) flankStr = " \u25C0\u25B6";
        else if (fl.indexOf("L") !== -1) flankStr = " \u25C0";
        else if (fl.indexOf("R") !== -1) flankStr = " \u25B6";

        var isDofSlot = window.FM24State.appMode === 'dof';
        html += '<div class="px-3 py-2 hover:bg-surface-hover cursor-pointer depth-player-row' + (di === 0 ? ' starter-row' : '') + '" data-player-idx="' + squad.indexOf(pl) + '">' +
          '<div class="flex items-center gap-2">' +
            '<span class="text-xs text-text-muted font-mono">' + _renderShortlistCheckbox(pl) + '</span>' +
            '<span class="hide-btn text-xs text-[#666666] hover:text-white cursor-pointer mr-1" data-idx="' + squad.indexOf(pl) + '" data-strata="' + slotDef.strata + '">\u2212</span>' +
            '<span class="text-sm text-white font-bold flex-1 min-w-0 truncate">' + escHtml(pl.Name) + '</span>' +
            (entry.score !== null ? '<div class="text-right flex-shrink-0">' + (isDofSlot ? _renderASCIIBar(entry.score) : '') + ' ' + _renderFitBadge(entry.fitLabel) + '</div>' : '') +
          '</div>' +
          '<div class="flex items-center gap-3 mt-0.5 text-xs text-text-muted flex-wrap">' +
            '<span>' + (pl.Age || "-") + 'y</span>' +
            '<span>' + escHtml(pl.Nation || pl.Nationality || pl.Nat || "") + '</span>' +
            '<span>' + escHtml(pl.Club || "") + '</span>' +
            '<span>' + escHtml(pl.Position || "") + flankStr + '</span>' +
            (isDofSlot && typeof PlayerUtils !== "undefined" && PlayerUtils.getMinutesLoad ? (function() {
              var ml = PlayerUtils.getMinutesLoad(pl);
              var mlColors = {starter: 'text-emerald-400', rotation: 'text-sky-400', fringe: 'text-amber-400', unused: 'text-gray-500', absent: 'text-red-400'};
              var mlC = mlColors[ml.tier] || 'text-gray-500';
              return '<span class="depth-analytics-pill ' + mlC + '">' + ml.tier + ' (' + ml.raw + 'm)</span>';
            })() : '') +
            (isDofSlot && typeof PlayerUtils !== "undefined" && PlayerUtils.getPerformanceBand ? (function() {
              var pb = PlayerUtils.getPerformanceBand(pl);
              var pbColors = {elite: 'text-purple-400', strong: 'text-blue-400', decent: 'text-green-400', marginal: 'text-amber-400', poor: 'text-red-400', 'no-data': 'text-gray-600'};
              var pbC = pbColors[pb.band] || 'text-gray-500';
              return pb.band === 'no-data' ? '' : '<span class="depth-analytics-pill ' + pbC + '">' + pb.band + (pl.AvRat != null ? ' ' + pl.AvRat.toFixed(2) : '') + '</span>';
            })() : '') +
            (isDofSlot && typeof PlayerUtils !== "undefined" && PlayerUtils.getPTDelta ? (function() {
              var d = PlayerUtils.getPTDelta(pl);
              if (!d.label || d.direction === 'unknown' || d.direction === 'on-track') return '';
              var dirColors = {overperforming: 'text-green-400', underperforming: 'text-red-400'};
              var dC = dirColors[d.direction] || 'text-gray-500';
              return '<span class="depth-analytics-pill ' + dC + '" title="' + escHtml(d.label) + '">' + escHtml(d.label) + '</span>';
            })() : '') +
            (entry.roleName ? '<span class="text-text-secondary">' + escHtml(entry.roleName + " (" + entry.duty + ")") + '</span>' : '') +
            '<span class="depth-slot-badge cursor-pointer text-[#888888] hover:text-white ml-2 font-mono text-[10px] border border-[#333] rounded px-1.5 py-0.5" data-player-idx="' + squad.indexOf(pl) + '" data-current-slot="' + slotId + '">' + slotId + '</span>' +
          '</div>' +
        '</div>';
      }
      html += '</div>';
    }

    html += '</div>';
  }



  if (html === "") {
    html = '<div class="text-text-muted text-xs text-center py-8">No tactic slots match the current filter.</div>';
  }

  container.innerHTML = html;

  // Row clicks
  container.querySelectorAll(".depth-player-row").forEach(function (row) {
    row.addEventListener("click", function () {
      var idx = parseInt(this.dataset.playerIdx, 10);
      if (!isNaN(idx) && squad[idx]) {
        renderPlayerCard(squad[idx]);
      }
    });
  });

  // Shortlist toggle clicks
  container.querySelectorAll(".shortlist-toggle").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.stopPropagation();
      var idx = parseInt(this.dataset.playerIdx, 10);
      if (isNaN(idx) || !squad[idx]) return;
      var player = squad[idx];
      var slIdx = typeof isShortlistedIdx === "function" ? isShortlistedIdx(player) : -1;
      if (slIdx !== -1) {
        window.FM24State.shortlist.splice(slIdx, 1);
      } else {
        var bestSlot = player._bestFit ? player._bestFit.slotId : null;
        var bestScore = player._bestFitScore;
        window.FM24State.shortlist.push({
          player: player,
          targetSlotId: bestSlot,
          scoreAtShortlist: bestScore,
          bestSlotId: bestSlot
        });
      }
      _renderDepthChart();
    });
  });

  // Hide button clicks
  container.querySelectorAll(".hide-btn").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.stopPropagation();
      var idx = parseInt(this.dataset.idx, 10);
      var strata = this.dataset.strata;
      if (isNaN(idx) || !squad[idx]) return;
      window.FM24State.depthHidden.push({ name: squad[idx].Name, strata: strata });
      saveDepthHidden();
      _renderDepthChart();
    });
  });

  // Slot badge clicks — open slot picker dropdown
  container.querySelectorAll(".depth-slot-badge").forEach(function (badge) {
    badge.addEventListener("click", function (e) {
      e.stopPropagation();
      var idx = parseInt(this.dataset.playerIdx, 10);
      var player = squad[idx];
      var currentSlot = this.dataset.currentSlot;
      if (!player) return;

      // Close any existing dropdown
      var existing = document.querySelector(".depth-slot-picker");
      if (existing) existing.remove();

      // Build the list of compatible slots for this player
      var overrides = window.FM24State.depthOverrides || {};
      var tactic = window.FM24State.tactic;
      var slotIds = Object.keys(tactic.slots);
      var options = [];
      for (var si = 0; si < slotIds.length; si++) {
        var sid = slotIds[si];
        if (!tactic.slots[sid] || !tactic.slots[sid].roleId) continue;
        var scoreObj = scorePlayerForTacticSlot(player, sid);
        if (scoreObj === null) continue;
        var role = getRoleById(tactic.slots[sid].roleId);
        options.push({
          slotId: sid,
          label: sid + " " + _getSlotDisplayName(sid),
          roleName: role ? role.name + " (" + role.duty + ")" : "",
          score: scoreObj.total,
          fitLabel: scoreObj.fitLabel
        });
      }
      options.sort(function (a, b) { return b.score - a.score; });

      var dropdown = document.createElement("div");
      dropdown.className = "depth-slot-picker";
      dropdown.style.cssText = "position:fixed;z-index:9999;background:#111;border:1px solid #333;border-radius:4px;padding:4px 0;min-width:200px;font-size:11px;font-family:monospace;box-shadow:0 4px 12px rgba(0,0,0,0.5)";

      options.forEach(function (opt) {
        var item = document.createElement("div");
        var isCurrent = opt.slotId === currentSlot;
        var isOverridden = overrides[player.Name] === opt.slotId;
        var cls = "px-3 py-1.5 cursor-pointer flex items-center justify-between gap-3 " +
          (isOverridden ? "text-white bg-white/10" : isCurrent ? "text-white bg-white/10" : "text-[#888888] hover:text-white hover:bg-white/5");
        item.className = cls;
        item.innerHTML = '<span>' + escHtml(opt.label) + '</span><span class="text-right">' + opt.score.toFixed(1) + ' <span class="text-[9px]">' + escHtml(opt.fitLabel) + '</span></span>';
        item.addEventListener("click", function (e) {
          e.stopPropagation();
          window.FM24State.depthOverrides[player.Name] = opt.slotId;
          saveDepthOverrides();
          dropdown.remove();
          _renderDepthChart();
        });
        dropdown.appendChild(item);
      });

      // Auto option to clear override
      var autoItem = document.createElement("div");
      autoItem.className = "px-3 py-1.5 cursor-pointer text-[#666666] hover:text-white border-t border-[#222] mt-1 pt-1";
      autoItem.textContent = overrides[player.Name] ? "[Auto — clear manual slot]" : "[Auto]";
      autoItem.addEventListener("click", function (e) {
        e.stopPropagation();
        delete window.FM24State.depthOverrides[player.Name];
        saveDepthOverrides();
        dropdown.remove();
        _renderDepthChart();
      });
      dropdown.appendChild(autoItem);

      var rect = badge.getBoundingClientRect();
      dropdown.style.left = rect.left + "px";
      dropdown.style.top = (rect.bottom + 2) + "px";

      document.body.appendChild(dropdown);
    });
  });

  // Close slot picker on outside click (one-time setup)
  if (!window._depthSlotPickerListener) {
    window._depthSlotPickerListener = true;
    document.addEventListener("click", function (e) {
      var dp = document.querySelector(".depth-slot-picker");
      if (dp && !dp.contains(e.target) && !e.target.closest(".depth-slot-badge")) {
        dp.remove();
      }
    });
  }
}
/* ── TACTIC BUILDER ── */

function renderTacticBuilder() {
  var sidebar = document.getElementById("tactic-sidebar");
  var main = document.getElementById("tactic-main");
  if (!sidebar || !main) return;

  sidebar.innerHTML = "";
  main.innerHTML = "";

  _buildSidebar(sidebar);
  _buildMainContent(main);
  renderRolePopover();
  updateNavBadge();
}

/* ── NEW SIDEBAR ── */

function _buildSidebar(container) {
  var inner = document.createElement("div");
  inner.className = "tactic-sidebar-inner";

  var PHASE_ICONS = {
    in_possession: "[O]",
    in_transition: "[~]",
    out_of_possession: "[x]"
  };

  /* ── MENTALITY ── */
  var mentLabel = document.createElement("div");
  mentLabel.className = "text-xs text-[#666666] uppercase tracking-wider mb-1 font-mono";
  mentLabel.textContent = "Mentality";
  inner.appendChild(mentLabel);

  var mentSelect = document.createElement("select");
  mentSelect.className = "mentality-select";
  var mentSchema = TACTIC_SCHEMA.mentality;
  mentSchema.values.forEach(function (v) {
    var opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    var cur = window.FM24State.tactic.instructions.mentality;
    if ((cur && cur === v) || (!cur && mentSchema.default === v)) opt.selected = true;
    mentSelect.appendChild(opt);
  });
  mentSelect.addEventListener("change", function () {
    updateInstruction("mentality", mentSelect.value);
    _updateSidebarSummaries();
  });
  inner.appendChild(mentSelect);

  /* ── SAVED TACTICS SLOTS (hidden in DOF mode) ── */

  if (window.FM24State.appMode !== "dof") {
    var slotsSection = document.createElement("div");
    slotsSection.className = "mb-4";

    var slotsLabel = document.createElement("div");
    slotsLabel.className = "text-xs text-[#666666] uppercase tracking-wider mb-1 font-mono";
    slotsLabel.textContent = "Saved Tactics";
    slotsSection.appendChild(slotsLabel);

    var ts = window.FM24State.tacticSlots;
    var renaming = window.FM24State.tacticUI.renamingSlot;

    var tabsRow = document.createElement("div");
    tabsRow.className = "flex flex-wrap gap-[3px]";

    ts.slots.forEach(function (slot, i) {
      var isActive = i === ts.activeIndex;
      var btn = document.createElement("button");
      btn.className = "px-[5px] py-[2px] text-[9px] font-mono border border-[#333333] rounded-sm transition-colors " +
        (isActive ? "bg-white text-black font-bold border-white" : "bg-transparent text-[#888888] hover:text-white hover:border-[#666666]");
      btn.dataset.index = i;

      if (isActive && renaming === i) {
        var inp = document.createElement("input");
        inp.type = "text";
        inp.value = slot.name;
        inp.className = "w-[70px] px-[4px] py-[2px] text-[9px] font-mono bg-[#111111] text-white border border-[#666666] rounded-sm outline-none";
        inp.dataset.index = i;
        tabsRow.appendChild(inp);

        (function (input, idx) {
          function finishRename() {
            var v = input.value;
            renameSlot(idx, v);
            window.FM24State.tacticUI.renamingSlot = -1;
            renderTacticBuilder();
          }
          setTimeout(function () { input.focus(); input.select(); }, 0);
          input.addEventListener("blur", finishRename);
          input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") { input.blur(); }
          });
        })(inp, i);
      } else {
        btn.textContent = (isActive ? "\u25B8 " : "") + slot.name;
        btn.addEventListener("click", function () {
          loadSlot(parseInt(this.dataset.index));
        });
        tabsRow.appendChild(btn);
      }
    });

    slotsSection.appendChild(tabsRow);

    var actionsRow = document.createElement("div");
    actionsRow.className = "flex gap-2 mt-[5px]";

    var renameBtn = document.createElement("button");
    renameBtn.className = "text-[9px] text-[#666666] font-mono hover:text-white transition-colors";
    renameBtn.textContent = "[Rename]";
    renameBtn.addEventListener("click", function () {
      window.FM24State.tacticUI.renamingSlot = ts.activeIndex;
      renderTacticBuilder();
    });
    actionsRow.appendChild(renameBtn);

    var clearBtn = document.createElement("button");
    clearBtn.className = "text-[9px] text-[#666666] font-mono hover:text-[#f87171] transition-colors";
    clearBtn.textContent = "[Clear Slot]";
    clearBtn.addEventListener("click", function () {
      clearSlot(ts.activeIndex);
    });
    actionsRow.appendChild(clearBtn);

    slotsSection.appendChild(actionsRow);
    inner.appendChild(slotsSection);
  }

  /* ── PHASE CARDS ── */
  var phases = [
    { key: "in_possession", label: "In Possession" },
    { key: "in_transition", label: "In Transition" },
    { key: "out_of_possession", label: "Out of Possession" }
  ];

  var activeTab = window.FM24State.tacticUI.activeTab;

  phases.forEach(function (p) {
    var card = document.createElement("div");
    card.className = "phase-card" + (activeTab === p.key ? " active" : "");
    card.dataset.tab = p.key;

    card.addEventListener("click", function () {
      window.setActiveTab(p.key);
    });

    // Header: icon + name
    var header = document.createElement("div");
    header.className = "text-white text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center justify-center gap-2";
    header.textContent = PHASE_ICONS[p.key] + " " + p.label;
    card.appendChild(header);

    // Vertical summary list
    var list = document.createElement("div");
    list.className = "flex flex-col gap-[2px] text-[10px] text-[#888888] font-mono w-full";
    list.id = "phase-list-" + p.key;
    card.appendChild(list);

    // Action label
    var action = document.createElement("div");
    action.className = "text-white text-[10px] font-bold mt-3";
    action.textContent = ">> CHANGE";
    card.appendChild(action);

    inner.appendChild(card);
  });

  var spacer = document.createElement("div");
  spacer.style.flex = "1";
  inner.appendChild(spacer);

  var doneBtn = document.createElement("button");
  doneBtn.className = "sidebar-done-btn" + (activeTab === "pitch" ? " hidden" : "");
  doneBtn.id = "sidebar-done-btn";
  doneBtn.textContent = "\u00AB DONE";
  doneBtn.addEventListener("click", function () {
    window.setActiveTab("pitch");
  });
  inner.appendChild(doneBtn);

  container.appendChild(inner);

  // Populate vertical lists (must be after DOM attachment so getElementById works)
  _updateSidebarSummaries();
}

function _updateSidebarSummaries() {
  var phases = ["in_possession", "in_transition", "out_of_possession"];
  phases.forEach(function (key) {
    var list = document.getElementById("phase-list-" + key);
    if (!list) return;
    list.innerHTML = "";
    var items = _getActiveInstructionList(key);
    if (items.length === 0) {
      var span = document.createElement("span");
      span.className = "text-[10px] text-[#555555] font-mono italic";
      span.textContent = "Default";
      list.appendChild(span);
    } else {
      items.forEach(function (item) {
        var span = document.createElement("span");
        span.className = "text-[10px] text-[#888888] font-mono";
        span.textContent = item;
        list.appendChild(span);
      });
    }
  });

  var doneBtn = document.getElementById("sidebar-done-btn");
  if (doneBtn) {
    doneBtn.classList.toggle("hidden", window.FM24State.tacticUI.activeTab === "pitch");
  }

  document.querySelectorAll(".phase-card").forEach(function (card) {
    var isActive = card.dataset.tab === window.FM24State.tacticUI.activeTab;
    card.classList.toggle("active", isActive);
  });
}

function _getActiveInstructionList(phaseKey) {
  var keys = _getPhaseInstructionKeys(phaseKey);
  var instrs = window.FM24State.tactic.instructions;
  var items = [];
  keys.forEach(function (k) {
    var v = instrs[k];
    if (v !== undefined && v !== null) {
      var schema = TACTIC_SCHEMA[k];
      if (schema) {
        var display;
        if (typeof v === "boolean") {
          display = v ? schema.label : schema.label + " (OFF)";
        } else {
          display = v;
        }
        items.push(display);
      }
    }
  });
  return items;
}

/* ── MAIN CONTENT (conditional) ── */

function _buildMainContent(container) {
  var tab = window.FM24State.tacticUI.activeTab || "pitch";
  if (tab === "pitch") {
    _buildPitchView(container);
  } else if (tab === "out_of_possession") {
    _buildOutOfPossessionPhase(container);
  } else {
    _buildInstructionPhase(container, tab);
  }
}

function _buildPitchView(container) {
  var split = document.createElement("div");
  split.className = "flex gap-6 w-full";

  /* ── LEFT COLUMN (45%): Formation + Pitch + Summary ── */
  var leftCol = document.createElement("div");
  leftCol.className = "w-[45%] flex flex-col gap-4 min-h-0";

  var formRow = document.createElement("div");
  formRow.className = "flex items-center gap-3";
  var formLabel = document.createElement("label");
  formLabel.className = "text-sm text-[#CCCCCC] font-mono uppercase tracking-wider";
  formLabel.textContent = "Formation:";
  formRow.appendChild(formLabel);
  var formSelect = document.createElement("select");
  formSelect.id = "formation-select";
  formSelect.className = "bg-[#0A0A0A] text-white border border-[#1F1F1F] rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-[#666666]";
  var formationNames = Object.keys(FORMATIONS);
  formationNames.forEach(function (name) {
    var opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    if (window.FM24State.tactic.formation === name) opt.selected = true;
    formSelect.appendChild(opt);
  });
  formSelect.addEventListener("change", function () {
    setFormation(formSelect.value);
  });
  formRow.appendChild(formSelect);
  leftCol.appendChild(formRow);

  var pitchWrapper = document.createElement("div");
  pitchWrapper.id = "pitch-wrapper";
  leftCol.appendChild(pitchWrapper);

  var summarySection = document.createElement("div");
  summarySection.id = "tactic-summary-section";
  leftCol.appendChild(summarySection);

  var squadFitSection = document.createElement("div");
  squadFitSection.id = "squad-fit-section";
  squadFitSection.style.display = "none";
  leftCol.appendChild(squadFitSection);

  split.appendChild(leftCol);

  /* ── RIGHT COLUMN (55%): Auto Pick + Roster Table ── */
  var rightCol = document.createElement("div");
  rightCol.className = "w-[55%] flex flex-col min-h-0 overflow-y-auto";
  rightCol.appendChild(_makeAutoPickBtn());
  rightCol.appendChild(_renderRosterTable());
  split.appendChild(rightCol);

  container.appendChild(split);

  renderPitch();
  renderSummary();
}

/* ── ROSTER TABLE ── */

function _renderRosterTable() {
  var table = document.createElement("table");
  table.className = "w-full text-left border-collapse";

  function cell(tag, text, cls) {
    var el = document.createElement(tag);
    el.className = "py-2 px-2 font-mono text-[10px] " + cls;
    el.textContent = text;
    return el;
  }

  function getPlayerField(p, fallbacks) {
    for (var j = 0; j < fallbacks.length; j++) {
      var v = p[fallbacks[j]];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return "\u2014";
  }

  function _getAsciiBar(score) {
    var s = parseFloat(score) || 0;
    var filledCount = Math.max(0, Math.min(10, Math.round(s / 2)));
    var emptyCount = 10 - filledCount;
    var bar = "[";
    for (var i = 0; i < filledCount; i++) bar += "\u2588";
    for (var i = 0; i < emptyCount; i++) bar += "-";
    bar += "]";
    return bar + " " + s.toFixed(1);
  }

  function _getFitLabel(score) {
    var s = parseFloat(score) || 0;
    if (s >= 14) return "[NATURAL]";
    if (s >= 12) return "[GOOD FIT]";
    if (s >= 9) return "[MARGINAL]";
    return "[POOR FIT]";
  }

  function _getFitColor(score) {
    var s = parseFloat(score) || 0;
    if (s >= 14) return "text-[#4ade80]";
    if (s >= 12) return "text-[#fbbf24]";
    if (s >= 9) return "text-[#f87171]";
    return "text-[#555555]";
  }

  /* ── HEADER ── */
  var thead = document.createElement("thead");
  var hr = document.createElement("tr");
  var headers = [
    { text: "POS", cls: "text-[#555555] uppercase tracking-wider border-b border-[#333333] text-left" },
    { text: "ROLE", cls: "text-[#555555] uppercase tracking-wider border-b border-[#333333] text-left" },
    { text: "PLAYER", cls: "text-[#555555] uppercase tracking-wider border-b border-[#333333] text-left" },
    { text: "NAT", cls: "text-[#555555] uppercase tracking-wider border-b border-[#333333] text-right" },
    { text: "AGE", cls: "text-[#555555] uppercase tracking-wider border-b border-[#333333] text-right" },
    { text: "SCORE", cls: "text-[#555555] uppercase tracking-wider border-b border-[#333333] text-right" },
    { text: "FIT", cls: "text-[#555555] uppercase tracking-wider border-b border-[#333333] text-right" }
  ];
  headers.forEach(function (h) { hr.appendChild(cell("th", h.text, h.cls)); });
  thead.appendChild(hr);
  table.appendChild(thead);

  /* ── BODY ── */
  var tbody = document.createElement("tbody");
  var slots = window.FM24State.tactic.slots;
  var slotIds = Object.keys(slots).filter(function(id) {
    return !/^S\d/.test(id);
  });
  slotIds.sort(function(a, b) {
    var defA = GLOBAL_PITCH_SLOTS[a] || { y: 0, x: 0 };
    var defB = GLOBAL_PITCH_SLOTS[b] || { y: 0, x: 0 };
    if (defB.y !== defA.y) return defB.y - defA.y;
    return defA.x - defB.x;
  });
  var squad = window.FM24State.squad;
  var isComplete = window.FM24State.tactic.isComplete;

  // Collect assigned player names
  var usedNames = {};
  slotIds.forEach(function (slotId) {
    var s = slots[slotId];
    if (s && s.playerName) usedNames[s.playerName] = true;
  });

  // Pre-compute best fit for each slot (for unassigned slots and fallback)
  var bestPerSlot = {};
  if (squad && squad.length > 0 && isComplete) {
    slotIds.forEach(function (slotId) {
      var eligible = squad.filter(function (p) { return isFlankEligible(p, slotId); });
      var ranked = rankPlayersForSlot(eligible, slotId);
      bestPerSlot[slotId] = ranked;
    });
  }

  // Helper to find a player by name in squad
  function findPlayerByName(name) {
    for (var i = 0; i < squad.length; i++) {
      if (squad[i].Name === name) return squad[i];
    }
    return null;
  }

  // Starting 11
  slotIds.forEach(function (slotId) {
    var tr = document.createElement("tr");
    tr.className = "border-b border-[#111111] hover:bg-[#111111] transition-colors";
    var slot = slots[slotId] || {};
    var d = slot.roleId ? getSlotDisplay(slot) : null;
    tr.appendChild(cell("td", slotId, "text-white font-bold"));
    tr.appendChild(cell("td", d ? d.full : "\u2014", d ? "text-[#CCCCCC]" : "text-[#555555] italic"));

    var assignedPlayer = slot.playerName ? findPlayerByName(slot.playerName) : null;

    if (assignedPlayer) {
      var assignedRanked = bestPerSlot[slotId];
      var assignedScore = assignedRanked ? assignedRanked.filter(function (r) { return r.player.Name === slot.playerName; }) : [];
      var s = assignedScore.length > 0 ? assignedScore[0].score.total : 0;
      tr.className += " cursor-pointer";
      tr.dataset.playerIdx = squad.indexOf(assignedPlayer);
      tr.addEventListener("click", function () {
        var idx = parseInt(this.dataset.playerIdx, 10);
        if (!isNaN(idx) && squad[idx]) renderPlayerCard(squad[idx]);
      });
      tr.appendChild(cell("td", escHtml(assignedPlayer.Name), "text-white font-bold"));
      tr.appendChild(cell("td", assignedPlayer.Nat || assignedPlayer.Nationality || "-", "text-right text-[#888888]"));
      tr.appendChild(cell("td", assignedPlayer.Age ? assignedPlayer.Age + "y" : "-", "text-right text-[#888888]"));
      tr.appendChild(cell("td", _getAsciiBar(s), "font-mono text-right " + _getFitColor(s)));
      tr.appendChild(cell("td", _getFitLabel(s), "font-mono text-right " + _getFitColor(s)));
    } else {
      var bestRanked = bestPerSlot[slotId];
      var bestPlayer = bestRanked && bestRanked.length > 0 ? bestRanked[0].player : null;

      if (bestPlayer) {
        var s = bestRanked[0].score.total;
        tr.appendChild(cell("td", escHtml(bestPlayer.Name), "text-[#CCCCCC]"));
        tr.appendChild(cell("td", bestPlayer.Nat || bestPlayer.Nationality || "-", "text-right text-[#888888]"));
        tr.appendChild(cell("td", bestPlayer.Age ? bestPlayer.Age + "y" : "-", "text-right text-[#888888]"));
        tr.appendChild(cell("td", _getAsciiBar(s), "font-mono text-right " + _getFitColor(s)));
        tr.appendChild(cell("td", _getFitLabel(s), "font-mono text-right " + _getFitColor(s)));
      } else if (!squad || squad.length === 0) {
        tr.appendChild(cell("td", "Load squad...", "text-[#555555] italic"));
        tr.appendChild(cell("td", "-", "text-right text-[#555555]"));
        tr.appendChild(cell("td", "-", "text-right text-[#555555]"));
        tr.appendChild(cell("td", "-", "text-right text-[#555555]"));
        tr.appendChild(cell("td", "-", "text-right text-[#555555]"));
      } else if (!isComplete) {
        tr.appendChild(cell("td", "Complete tactic", "text-[#555555] italic"));
        tr.appendChild(cell("td", "-", "text-right text-[#555555]"));
        tr.appendChild(cell("td", "-", "text-right text-[#555555]"));
        tr.appendChild(cell("td", "-", "text-right text-[#555555]"));
        tr.appendChild(cell("td", "-", "text-right text-[#555555]"));
      } else {
        tr.appendChild(cell("td", "No eligible", "text-[#555555] italic"));
        tr.appendChild(cell("td", "-", "text-right text-[#555555]"));
        tr.appendChild(cell("td", "-", "text-right text-[#555555]"));
        tr.appendChild(cell("td", "-", "text-right text-[#555555]"));
        tr.appendChild(cell("td", "-", "text-right text-[#555555]"));
      }
    }

    tbody.appendChild(tr);
  });

  // Substitutes S1–S12: assign _bestFit for unused players (needed by assigned subs)
  if (squad && squad.length > 0 && isComplete) {
    var unused = squad.filter(function (p) { return !usedNames[p.Name]; });
    unused.forEach(function (p) {
      var fits = findBestTacticFitForPlayer(p);
      if (fits.length > 0) p._bestFit = fits[0];
    });
  }

  var tacticSubs = window.FM24State.tactic.subs || {};
  for (var i = 1; i <= 12; i++) {
    var subSlotId = "S" + i;
    var tr = document.createElement("tr");
    tr.className = "border-b border-[#111111] hover:bg-[#111111] transition-colors opacity-60";
    tr.appendChild(cell("td", subSlotId, "text-[#555555]"));

    var assignedSubName = tacticSubs[subSlotId] || null;
    var assignedSubPlayer = assignedSubName ? findPlayerByName(assignedSubName) : null;

    if (assignedSubPlayer) {
      // ROLE: best-fit role
      var bf = assignedSubPlayer._bestFit || null;
      if (bf) {
        tr.appendChild(cell("td", bf.roleName + " (" + bf.duty + ")", "text-[#555555]"));
      } else {
        tr.appendChild(cell("td", "\u2014", "text-[#555555] italic"));
      }

      // PLAYER
      var playerCell = document.createElement("td");
      playerCell.className = "py-2 px-2 font-mono text-[10px] text-white cursor-pointer hover:text-[#CCCCCC] transition-colors";
      playerCell.textContent = escHtml(assignedSubPlayer.Name);
      playerCell.addEventListener("click", (function (sid, fsid) {
        return function (e) {
          e.stopPropagation();
          _showPlayerPicker(sid, e.currentTarget, fsid);
        };
      })(subSlotId, bf ? bf.slotId : null));
      tr.appendChild(playerCell);

      // NAT, AGE, SCORE, FIT
      var s = bf ? bf.score.total : 0;
      tr.appendChild(cell("td", assignedSubPlayer.Nat || assignedSubPlayer.Nationality || "-", "text-right text-[#CCCCCC]"));
      tr.appendChild(cell("td", assignedSubPlayer.Age ? assignedSubPlayer.Age + "y" : "-", "text-right text-[#CCCCCC]"));
      tr.appendChild(cell("td", _getAsciiBar(s), "font-mono text-right " + _getFitColor(s)));
      tr.appendChild(cell("td", _getFitLabel(s), "font-mono text-right " + _getFitColor(s)));
    } else {
      // ROLE: placeholder
      tr.appendChild(cell("td", "\u2014", "text-[#555555] italic"));

      // PLAYER: [ PICK PLAYER ]
      var playerCell = document.createElement("td");
      playerCell.className = "py-2 px-2 font-mono text-[10px] text-[#555555] cursor-pointer hover:text-white transition-colors";
      playerCell.textContent = "[ PICK PLAYER ]";
      playerCell.addEventListener("click", (function (sid) {
        return function (e) {
          e.stopPropagation();
          _showPlayerPicker(sid, e.currentTarget);
        };
      })(subSlotId));
      tr.appendChild(playerCell);

      // NAT, AGE, SCORE, FIT: all dashes
      tr.appendChild(cell("td", "-", "text-right text-[#555555]"));
      tr.appendChild(cell("td", "-", "text-right text-[#555555]"));
      tr.appendChild(cell("td", "-", "text-right text-[#555555]"));
      tr.appendChild(cell("td", "-", "text-right text-[#555555]"));
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  return table;
}

/* ── INSTRUCTION PHASE PANELS ── */

function _getPhaseInstructionKeys(phaseKey) {
  var map = {
    in_possession: [
      "attackingWidth", "passingDirectness", "tempo",
      "playOutOfDefence", "passIntoSpace", "focusPlayLeft", "focusPlayCentre", "focusPlayRight",
      "creativeFreedom", "crossType", "aimCrossesAt",
      "workBallIntoBox", "hitEarlyCrosses", "runAtDefence",
      "shootOnSight", "overlapLeft", "overlapRight",
      "underlapLeft", "underlapRight", "playForSetPieces"
    ],
    in_transition: [
      "whenPossessionLost", "whenPossessionWon",
      "gkDistributionPace", "gkDistributionMethod", "gkDistributionTarget"
    ],
    out_of_possession: [
      "lineOfEngagement", "defensiveLine", "defensiveWidth",
      "triggerPress", "tackling",
      "pressingTrap", "crossEngagement"
    ]
  };
  return map[phaseKey] || [];
}

function _getPhaseColumns(phaseKey) {
  var cols = {
    in_possession: [
      {
        title: "Attacking Width",
        keys: ["attackingWidth"],
        miniPitch: true
      },
      {
        title: "Approach Play",
        keys: ["passingDirectness", "tempo", "playOutOfDefence", "passIntoSpace", "focusPlayDown"],
        miniPitch: true
      },
      {
        title: "Final Third",
        keys: ["creativeFreedom", "crossType", "aimCrossesAt", "workBallIntoBox", "hitEarlyCrosses", "runAtDefence", "shootOnSight", "overlapLeft", "overlapRight", "underlapLeft", "underlapRight"],
        miniPitch: false
      }
    ],
    in_transition: [],
    out_of_possession: []
  };
  return cols[phaseKey] || [];
}

function _buildInstructionPhase(container, phaseKey) {
  if (phaseKey === "in_transition") {
    _buildTransitionPhase(container);
    return;
  }
  if (phaseKey === "in_possession") {
    _buildPossessionPhase(container);
    return;
  }

  var panel = document.createElement("div");
  panel.className = "instr-panel";

  var cols = _getPhaseColumns(phaseKey);
  var instrs = window.FM24State.tactic.instructions;

  cols.forEach(function (col, idx) {
    var colDiv = document.createElement("div");
    colDiv.className = "instr-column" + (col.wide ? " wide" : "");

    if (col.miniPitch) {
      var mpWrapper = document.createElement("div");
      mpWrapper.className = "mini-pitch-wrapper" + (col.wide ? " wide" : "");
      mpWrapper.appendChild(_renderMiniPitch(
        window.FM24State.tactic.formation,
        instrs,
        phaseKey,
        idx
      ));
      colDiv.appendChild(mpWrapper);
    }

    var title = document.createElement("div");
    title.className = "instr-column-title";
    title.textContent = col.title;
    colDiv.appendChild(title);

    col.keys.forEach(function (key) {
      var schema = TACTIC_SCHEMA[key];
      if (!schema) return;

      var row = document.createElement("div");
      row.className = "instr-row";

      var label = document.createElement("span");
      label.className = "instr-label";
      label.textContent = schema.label;
      row.appendChild(label);

      var controlWrapper = document.createElement("div");
      controlWrapper.className = "instr-control";
      controlWrapper.appendChild(_renderControl(key, schema, phaseKey));
      row.appendChild(controlWrapper);

      colDiv.appendChild(row);
    });

    panel.appendChild(colDiv);
  });

  container.appendChild(panel);
}

/* ── IN TRANSITION — CUSTOM 3-COLUMN LAYOUT ── */

function _buildTransitionPhase(container) {
  var panel = document.createElement("div");
  panel.className = "instr-panel";

  var instrs = window.FM24State.tactic.instructions;
  var formation = window.FM24State.tactic.formation;

  /* ── COLUMN 1: WHEN POSSESSION LOST ── */
  var col1 = document.createElement("div");
  col1.className = "instr-column";

  var title1 = document.createElement("div");
  title1.className = "instr-column-title";
  title1.textContent = "When Possession Lost";
  col1.appendChild(title1);

  // Toggle pair — Counter-Press / Regroup
  var wplSchema = TACTIC_SCHEMA.whenPossessionLost;
  col1.appendChild(_renderEnumBtnGroup("whenPossessionLost", wplSchema, instrs.whenPossessionLost, "in_transition"));

  // Portrait pitch with arrows (no shape lines)
  var pitchWrapper1 = document.createElement("div");
  pitchWrapper1.className = "mini-pitch-wrapper";
  var arrowMode1 = (instrs.whenPossessionLost === "Counter-Press") ? "counterpress" : "regroup";
  pitchWrapper1.appendChild(_renderDefensiveShapePitch(formation, instrs, { arrowMode: arrowMode1, showShapeLines: false }));
  col1.appendChild(pitchWrapper1);

  panel.appendChild(col1);

  /* ── COLUMN 2: WHEN POSSESSION WON ── */
  var col2 = document.createElement("div");
  col2.className = "instr-column";

  var title2 = document.createElement("div");
  title2.className = "instr-column-title";
  title2.textContent = "When Possession Won";
  col2.appendChild(title2);

  // Toggle pair — Counter / Hold Shape
  var wpwSchema = TACTIC_SCHEMA.whenPossessionWon;
  col2.appendChild(_renderEnumBtnGroup("whenPossessionWon", wpwSchema, instrs.whenPossessionWon, "in_transition"));

  // Portrait pitch with arrows (no shape lines)
  var pitchWrapper2 = document.createElement("div");
  pitchWrapper2.className = "mini-pitch-wrapper";
  var arrowMode2 = (instrs.whenPossessionWon === "Counter") ? "counter" : null;
  pitchWrapper2.appendChild(_renderDefensiveShapePitch(formation, instrs, { arrowMode: arrowMode2, showShapeLines: false }));
  col2.appendChild(pitchWrapper2);

  panel.appendChild(col2);

  /* ── COLUMN 3: GK DISTRIBUTION ── */
  var col3 = document.createElement("div");
  col3.className = "instr-column";

  var title3 = document.createElement("div");
  title3.className = "instr-column-title";
  title3.textContent = "GK Distribution";
  col3.appendChild(title3);

  // A. GK Distribution Pace
  var paceSchema = TACTIC_SCHEMA.gkDistributionPace;
  col3.appendChild(_renderEnumBtnGroup("gkDistributionPace", paceSchema, instrs.gkDistributionPace, "in_transition"));

  // B. Distribute To Area/Player — Grid Map
  var gridSchema = TACTIC_SCHEMA.gkDistributionTarget;
  col3.appendChild(_renderGKDistributionGrid("gkDistributionTarget", gridSchema, instrs.gkDistributionTarget, "in_transition"));

  // C. Distribution Type — flush vertical button stack
  var methodSchema = TACTIC_SCHEMA.gkDistributionMethod;
  var methodGroup = _renderEnumBtnGroup("gkDistributionMethod", methodSchema, instrs.gkDistributionMethod, "in_transition");
  methodGroup.className = "toggle-group vertical flush";
  col3.appendChild(methodGroup);

  panel.appendChild(col3);

  container.appendChild(panel);
}

/* ── IN POSSESSION — CUSTOM 3-COLUMN LAYOUT ── */

function _buildPossessionPhase(container) {
  var panel = document.createElement("div");
  panel.className = "instr-panel";

  var instrs = window.FM24State.tactic.instructions;
  var formation = window.FM24State.tactic.formation;

  /* ── COLUMN 1: ATTACKING WIDTH ── */
  var col1 = document.createElement("div");
  col1.className = "instr-column";

  var title1 = document.createElement("div");
  title1.className = "instr-column-title";
  title1.textContent = "Attacking Width";
  col1.appendChild(title1);

  // Attacking Width block slider
  var awSchema = TACTIC_SCHEMA.attackingWidth;
  var awCurrent = instrs.attackingWidth;
  var awVal = (awCurrent !== undefined && awCurrent !== null) ? awCurrent : awSchema.default;
  col1.appendChild(_renderBlockSlider("attackingWidth", awSchema, awVal, "in_possession"));

  // Portrait pitch with dynamic width
  var widthMap = {
    "Extremely Wide": 1.4,
    "Wide": 1.3,
    "Fairly Wide": 1.15,
    "Normal": 1.0,
    "Fairly Narrow": 0.85,
    "Narrow": 0.7,
    "Extremely Narrow": 0.6
  };
  var xMultiplier = widthMap[awVal] || 1.0;
  var pitchWrapper = document.createElement("div");
  pitchWrapper.className = "mini-pitch-wrapper";
  pitchWrapper.appendChild(_renderDefensiveShapePitch(formation, instrs, {
    xMultiplier: xMultiplier,
    arrowMode: "width",
    showShapeLines: false
  }));
  col1.appendChild(pitchWrapper);

  panel.appendChild(col1);

  /* ── COLUMN 2: APPROACH PLAY ── */
  var col2 = document.createElement("div");
  col2.className = "instr-column";

  var title2 = document.createElement("div");
  title2.className = "instr-column-title";
  title2.textContent = "Approach Play";
  col2.appendChild(title2);

  // Pass Into Space toggle
  var pasRow = document.createElement("div");
  pasRow.className = "instr-row";
  var pasLabel = document.createElement("span");
  pasLabel.className = "instr-label";
  pasLabel.textContent = "Pass Into Space";
  pasRow.appendChild(pasLabel);
  var pasControl = document.createElement("div");
  pasControl.className = "instr-control";
  var pisSchema = TACTIC_SCHEMA.passIntoSpace;
  pasControl.appendChild(_renderToggleGroup("passIntoSpace", pisSchema, instrs.passIntoSpace, "in_possession"));
  pasRow.appendChild(pasControl);
  col2.appendChild(pasRow);

  // Approach Play grid map
  col2.appendChild(_renderApproachPlayGrid(instrs));

  // Passing Directness
  var pdRow = document.createElement("div");
  pdRow.className = "instr-row";
  var pdLabel = document.createElement("span");
  pdLabel.className = "instr-label";
  pdLabel.textContent = "Passing Directness";
  pdRow.appendChild(pdLabel);
  var pdControl = document.createElement("div");
  pdControl.className = "instr-control";
  var pdSchema = TACTIC_SCHEMA.passingDirectness;
  var pdCurrent = instrs.passingDirectness;
  var pdVal = (pdCurrent !== undefined && pdCurrent !== null) ? pdCurrent : pdSchema.default;
  pdControl.appendChild(_renderBlockSlider("passingDirectness", pdSchema, pdVal, "in_possession"));
  pdRow.appendChild(pdControl);
  col2.appendChild(pdRow);

  // Tempo
  var tempoRow = document.createElement("div");
  tempoRow.className = "instr-row";
  var tempoLabel = document.createElement("span");
  tempoLabel.className = "instr-label";
  tempoLabel.textContent = "Tempo";
  tempoRow.appendChild(tempoLabel);
  var tempoControl = document.createElement("div");
  tempoControl.className = "instr-control";
  var tempoSchema = TACTIC_SCHEMA.tempo;
  var tempoCurrent = instrs.tempo;
  var tempoVal = (tempoCurrent !== undefined && tempoCurrent !== null) ? tempoCurrent : tempoSchema.default;
  tempoControl.appendChild(_renderBlockSlider("tempo", tempoSchema, tempoVal, "in_possession"));
  tempoRow.appendChild(tempoControl);
  col2.appendChild(tempoRow);

  panel.appendChild(col2);

  /* ── COLUMN 3: FINAL THIRD ── */
  var col3 = document.createElement("div");
  col3.className = "instr-column";

  var title3 = document.createElement("div");
  title3.className = "instr-column-title";
  title3.textContent = "Final Third";
  col3.appendChild(title3);

  // Cross Type
  var ctRow = document.createElement("div");
  ctRow.className = "instr-row";
  var ctLabel = document.createElement("span");
  ctLabel.className = "instr-label";
  ctLabel.textContent = "Cross Type";
  ctRow.appendChild(ctLabel);
  var ctControl = document.createElement("div");
  ctControl.className = "instr-control";
  var ctSchema = TACTIC_SCHEMA.crossType;
  var ctCurrent = instrs.crossType;
  var ctVal = (ctCurrent !== undefined && ctCurrent !== null) ? ctCurrent : ctSchema.default;
  ctControl.appendChild(_renderBlockSlider("crossType", ctSchema, ctVal, "in_possession"));
  ctRow.appendChild(ctControl);
  col3.appendChild(ctRow);

  // Final Third grid map
  col3.appendChild(_renderFinalThirdGrid(instrs));

  // Dribbling — paired toggle: Run At Defence / Dribble Less
  var dribblingRow = document.createElement("div");
  dribblingRow.className = "instr-row";
  var dribblingLabel = document.createElement("span");
  dribblingLabel.className = "instr-label";
  dribblingLabel.textContent = "Dribbling";
  dribblingRow.appendChild(dribblingLabel);
  var dribblingControl = document.createElement("div");
  dribblingControl.className = "instr-control";
  var dribblingGroup = document.createElement("div");
  dribblingGroup.className = "toggle-group";
  var radVal = instrs.runAtDefence;
  var runBtn = document.createElement("button");
  runBtn.className = "toggle-btn" + (radVal === true ? " active" : "");
  runBtn.textContent = "Run At Defence";
  runBtn.addEventListener("click", function () {
    _updateAndSync("runAtDefence", radVal === true ? null : true, "in_possession");
  });
  dribblingGroup.appendChild(runBtn);
  var dLessBtn = document.createElement("button");
  dLessBtn.className = "toggle-btn" + (radVal === false ? " active" : "");
  dLessBtn.textContent = "Dribble Less";
  dLessBtn.addEventListener("click", function () {
    _updateAndSync("runAtDefence", radVal === false ? null : false, "in_possession");
  });
  dribblingGroup.appendChild(dLessBtn);
  dribblingControl.appendChild(dribblingGroup);
  dribblingRow.appendChild(dribblingControl);
  col3.appendChild(dribblingRow);

  // Creative Freedom
  var cfRow = document.createElement("div");
  cfRow.className = "instr-row";
  var cfLabel = document.createElement("span");
  cfLabel.className = "instr-label";
  cfLabel.textContent = "Creative Freedom";
  cfRow.appendChild(cfLabel);
  var cfControl = document.createElement("div");
  cfControl.className = "instr-control";
  var cfSchema = TACTIC_SCHEMA.creativeFreedom;
  cfControl.appendChild(_renderEnumBtnGroup("creativeFreedom", cfSchema, instrs.creativeFreedom, "in_possession"));
  cfRow.appendChild(cfControl);
  col3.appendChild(cfRow);

  // Play For Set Pieces
  var pfsRow = document.createElement("div");
  pfsRow.className = "instr-row";
  var pfsLabel = document.createElement("span");
  pfsLabel.className = "instr-label";
  pfsLabel.textContent = "Play For Set Pieces";
  pfsRow.appendChild(pfsLabel);
  var pfsControl = document.createElement("div");
  pfsControl.className = "instr-control";
  var pfsSchema = TACTIC_SCHEMA.playForSetPieces;
  pfsControl.appendChild(_renderToggleGroup("playForSetPieces", pfsSchema, instrs.playForSetPieces, "in_possession"));
  pfsRow.appendChild(pfsControl);
  col3.appendChild(pfsRow);

  panel.appendChild(col3);

  container.appendChild(panel);
}

function _renderApproachPlayGrid(instrs) {
  var container = document.createElement("div");
  container.className = "ap-grid-container";

  // Pitch background SVG — landscape thirds
  var bgSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  bgSvg.setAttribute("class", "grid-pitch-bg");
  bgSvg.setAttribute("viewBox", "0 0 100 100");
  bgSvg.setAttribute("preserveAspectRatio", "none");
  var bgHtml = '<rect x="0" y="0" width="100" height="100" stroke="#333333" fill="none"/>';
  bgHtml += '<line x1="33.33" y1="0" x2="33.33" y2="100" stroke="#333333" stroke-width="0.5"/>';
  bgHtml += '<line x1="66.67" y1="0" x2="66.67" y2="100" stroke="#333333" stroke-width="0.5"/>';
  bgSvg.innerHTML = bgHtml;
  container.appendChild(bgSvg);

  function toggleBtn(key, label, placementClass, current, exclusiveKeys) {
    var btn = document.createElement("button");
    var isActive = current === true;
    btn.className = "gk-grid-btn" + (isActive ? " active" : "") + " " + placementClass;
    btn.textContent = label;
    btn.addEventListener("click", function () {
      var state = window.FM24State.tactic.instructions;
      var newVal = isActive ? null : true;
      state[key] = newVal;
      if (exclusiveKeys && newVal) {
        exclusiveKeys.forEach(function (ek) { state[ek] = null; });
      }
      _updateAndSync(key, newVal, "in_possession");
    });
    return btn;
  }

  // Row 1: Overlap/Underlap (mutually exclusive per side)
  container.appendChild(toggleBtn("overlapLeft", "Overlap Left", "ap-ol", instrs.overlapLeft, ["underlapLeft"]));
  container.appendChild(toggleBtn("underlapLeft", "Underlap Left", "ap-ul", instrs.underlapLeft, ["overlapLeft"]));
  container.appendChild(toggleBtn("underlapRight", "Underlap Right", "ap-ur", instrs.underlapRight, ["overlapRight"]));
  container.appendChild(toggleBtn("overlapRight", "Overlap Right", "ap-or", instrs.overlapRight, ["underlapRight"]));

  // Row 2: Focus Play — Left/Right independent, Centre exclusive with both
  container.appendChild(toggleBtn("focusPlayLeft", "Left Flank", "ap-fl", instrs.focusPlayLeft, ["focusPlayCentre"]));
  container.appendChild(toggleBtn("focusPlayCentre", "Centre", "ap-fm", instrs.focusPlayCentre, ["focusPlayLeft", "focusPlayRight"]));
  container.appendChild(toggleBtn("focusPlayRight", "Right Flank", "ap-fr", instrs.focusPlayRight, ["focusPlayCentre"]));

  // Row 3: Play Out of Defence (toggle)
  container.appendChild(toggleBtn("playOutOfDefence", "Play Out of Defence", "ap-pod", instrs.playOutOfDefence));

  return container;
}

function _renderFinalThirdGrid(instrs) {
  var container = document.createElement("div");
  container.className = "ft-grid-container";

  // Pitch background SVG — penalty box + goal area
  var bgSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  bgSvg.setAttribute("class", "grid-pitch-bg");
  bgSvg.setAttribute("viewBox", "0 0 100 100");
  bgSvg.setAttribute("preserveAspectRatio", "none");
  var bgHtml = '<rect x="0" y="0" width="100" height="100" stroke="#333333" fill="none"/>';
  bgHtml += '<rect x="5" y="5" width="90" height="90" stroke="#333333" fill="none" stroke-width="0.5"/>';  // penalty box
  bgSvg.innerHTML = bgHtml;
  container.appendChild(bgSvg);

  function toggleBtn(key, label, placementClass, current) {
    var btn = document.createElement("button");
    var isActive = current === true;
    btn.className = "gk-grid-btn" + (isActive ? " active" : "") + " " + placementClass;
    btn.textContent = label;
    btn.addEventListener("click", function () {
      _updateAndSync(key, isActive ? null : true, "in_possession");
    });
    return btn;
  }

  // Left + Right both toggle hitEarlyCrosses
  container.appendChild(toggleBtn("hitEarlyCrosses", "Hit Early Crosses", "ft-hec", instrs.hitEarlyCrosses));
  container.appendChild(toggleBtn("workBallIntoBox", "Work Ball Into Box", "ft-wbib", instrs.workBallIntoBox));
  container.appendChild(toggleBtn("shootOnSight", "Shoot On Sight", "ft-sos", instrs.shootOnSight));
  container.appendChild(toggleBtn("hitEarlyCrosses", "Hit Early Crosses", "ft-hecr", instrs.hitEarlyCrosses));

  return container;
}

/* ── GK DISTRIBUTION GRID MAP ── */

function _renderGKDistributionGrid(key, schema, current, phaseKey) {
  var valueMap = {
    "Over Opposition Defence": "Over Opposition Defence",
    "Flanks": "Wide Players",
    "Target": "Target Forward",
    "Playmaker": "Playmaker",
    "Full-Backs": "Full-Backs",
    "Centre-Backs": "Centre-Backs"
  };

  var container = document.createElement("div");
  container.className = "gk-grid-container";

  function makeBtn(displayLabel, schemaValue, placementClass) {
    var btn = document.createElement("button");
    var isActive = (current === schemaValue) || ((current === undefined || current === null) && schema.default === schemaValue);
    btn.className = "gk-grid-btn" + (isActive ? " active" : "") + " " + placementClass;
    btn.textContent = displayLabel;
    btn.addEventListener("click", function () {
      _updateAndSync(key, schemaValue, phaseKey);
    });
    return btn;
  }

  container.appendChild(makeBtn("Over Opposition Defence", "Over Opposition Defence", "g-o"));
  container.appendChild(makeBtn("Flanks", "Wide Players", "g-fl"));
  container.appendChild(makeBtn("Target", "Target Forward", "g-t"));
  container.appendChild(makeBtn("Playmaker", "Playmaker", "g-p"));
  container.appendChild(makeBtn("Flanks", "Wide Players", "g-fr"));
  container.appendChild(makeBtn("Full-Backs", "Full-Backs", "g-fbl"));
  container.appendChild(makeBtn("Centre-Backs", "Centre-Backs", "g-cb"));
  container.appendChild(makeBtn("Full-Backs", "Full-Backs", "g-fbr"));

  return container;
}

/* ── INSTRUCTION CONTROL RENDERERS ── */

function _renderControl(key, schema, phaseKey) {
  var current = window.FM24State.tactic.instructions[key];
  var val = (current !== undefined && current !== null) ? current : schema.default;

  if (schema.type === "toggle") {
    return _renderToggleGroup(key, schema, current, phaseKey);
  }

  if (schema.type === "enum") {
    if (_isOrdinalEnum(schema)) {
      return _renderBlockSlider(key, schema, val, phaseKey);
    }
    return _renderEnumBtnGroup(key, schema, current, phaseKey);
  }

  var fallback = document.createElement("span");
  fallback.className = "text-xs text-[#666666]";
  fallback.textContent = String(val);
  return fallback;
}

function _isOrdinalEnum(schema) {
  var ordinals = [
    "attackingwidth", "passingdirectness", "tempo",
    "defensiveline", "lineofengagement", "triggerpress",
    "defensivewidth", "creativefreedom"
  ];
  return ordinals.indexOf(schema.label.toLowerCase().replace(/\s+/g, '')) !== -1 ||
    (schema.values && schema.values.length >= 4);
}

function _renderBlockSlider(key, schema, currentValue, phaseKey) {
  var wrapper = document.createElement("div");
  wrapper.className = "flex flex-col items-end gap-1";

  var valueLabel = document.createElement("span");
  valueLabel.className = "text-[10px] text-white font-bold uppercase tracking-wider";
  valueLabel.textContent = currentValue || schema.default || schema.values[Math.floor(schema.values.length / 2)];
  wrapper.appendChild(valueLabel);

  var track = document.createElement("div");
  track.className = "flex gap-1";

  var vals = schema.values;
  var curIdx = vals.indexOf(currentValue);
  if (curIdx === -1) {
    curIdx = vals.indexOf(schema.default);
    if (curIdx === -1) curIdx = Math.floor(vals.length / 2);
  }

  vals.forEach(function (v, i) {
    var btn = document.createElement("button");
    btn.className = "block-slider-btn" +
      (i <= curIdx ? " filled" : "") +
      (i === curIdx ? " active-value" : "");
    btn.textContent = "\u25A0";
    btn.title = v;
    btn.addEventListener("click", function () {
      _updateAndSync(key, v, phaseKey);
    });
    track.appendChild(btn);
  });

  wrapper.appendChild(track);
  return wrapper;
}

function _renderEnumBtnGroup(key, schema, current, phaseKey) {
  var group = document.createElement("div");
  group.className = "toggle-group";

  schema.values.forEach(function (v) {
    var btn = document.createElement("button");
    var isActive = (current === v) || ((current === undefined || current === null) && schema.default === v);
    btn.className = "toggle-btn" + (isActive ? " active" : "");
    btn.textContent = v;
    btn.addEventListener("click", function () {
      var newVal = (current === v) ? null : v;
      _updateAndSync(key, newVal, phaseKey);
    });
    group.appendChild(btn);
  });

  return group;
}

function _renderToggleGroup(key, schema, current, phaseKey) {
  var group = document.createElement("div");
  group.className = "toggle-group";

  var states = [
    { label: "ON", value: true },
    { label: "OFF", value: false },
    { label: "Default", value: null }
  ];

  states.forEach(function (s) {
    var btn = document.createElement("button");
    var isActive = (current === s.value) || ((current === undefined) && s.value === null);
    btn.className = "toggle-btn" + (isActive ? " active" : "");
    btn.textContent = s.label;
    btn.addEventListener("click", function () {
      _updateAndSync(key, s.value, phaseKey);
    });
    group.appendChild(btn);
  });

  return group;
}

function _updateAndSync(key, newVal, phaseKey) {
  updateInstruction(key, newVal);
  var main = document.getElementById("tactic-main");
  if (main && window.FM24State.tacticUI.activeTab !== "pitch") {
    main.innerHTML = "";
    if (window.FM24State.tacticUI.activeTab === "out_of_possession") {
      _buildOutOfPossessionPhase(main);
    } else {
      _buildInstructionPhase(main, window.FM24State.tacticUI.activeTab);
    }
  }
  _updateSidebarSummaries();
}

/* ── MINI PITCH SVG ── */

function _renderMiniPitch(formationId, instrValues, phaseKey, columnIdx) {
  var slot = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  slot.setAttribute("viewBox", "0 0 240 160");
  slot.setAttribute("preserveAspectRatio", "xMidYMid meet");
  slot.style.display = "block";
  slot.style.width = "100%";
  slot.style.height = "auto";

  var parts = [
    '<rect x="10" y="6" width="220" height="148" fill="#000000" stroke="#333333" stroke-width="1.5"/>',
    '<line x1="120" y1="6" x2="120" y2="154" stroke="#1F1F1F" stroke-width="1"/>',
    '<circle cx="120" cy="80" r="18" fill="none" stroke="#1F1F1F" stroke-width="1"/>',
    '<circle cx="120" cy="80" r="1.5" fill="#666666"/>',
    '<rect x="10" y="33" width="44" height="94" fill="none" stroke="#1F1F1F" stroke-width="1"/>',
    '<rect x="186" y="33" width="44" height="94" fill="none" stroke="#1F1F1F" stroke-width="1"/>'
  ];

  // Player tokens based on formation
  if (formationId && FORMATIONS[formationId]) {
    var slotIds = FORMATIONS[formationId].slots;
    slotIds.forEach(function (id) {
      var def = GLOBAL_PITCH_SLOTS[id];
      if (!def) return;
      var sx = 10 + (def.x / 680) * 220;
      var sy = 6 + (def.y / 440) * 148;
      parts.push(
        '<circle cx="' + sx + '" cy="' + sy + '" r="3" fill="#FFFFFF" opacity="0.85"/>'
      );
    });
  }

  // Defensive line visualization (Out of Possession wide mini-pitch only)
  if (phaseKey === "out_of_possession" && columnIdx === 0 && instrValues) {
    var dlVal = instrValues.defensiveLine || TACTIC_SCHEMA.defensiveLine.default;
    var dlIdx = TACTIC_SCHEMA.defensiveLine.values.indexOf(dlVal);
    if (dlIdx === -1) dlIdx = 2;
    var maxIdx = TACTIC_SCHEMA.defensiveLine.values.length - 1;
    var dlY = 20 + (dlIdx / maxIdx) * 120;
    parts.push(
      '<line x1="10" y1="' + dlY + '" x2="230" y2="' + dlY + '" stroke="#FFFFFF" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.6"/>',
      '<text x="12" y="' + (dlY - 4) + '" fill="#888888" font-size="7" font-family="monospace">' + escHtml(dlVal) + '</text>'
    );
  }

  slot.innerHTML = parts.join("");
  return slot;
}

/* ── OUT OF POSSESSION — PORTRAIT DEFENSIVE SHAPE PITCH ── */

function _renderDefensiveShapePitch(formationId, instrValues, options) {
  options = options || {};
  var arrowMode = options.arrowMode || null;
  var showShapeLines = options.showShapeLines !== false;
  var slot = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  slot.setAttribute("viewBox", "0 0 300 450");
  slot.setAttribute("preserveAspectRatio", "xMidYMid meet");
  slot.style.display = "block";
  slot.style.width = "100%";
  slot.style.height = "auto";

  var PW = 240, PH = 390;
  var OX = 30, OY = 30;

  var parts = [
    // Outer pitch
    '<rect x="' + OX + '" y="' + OY + '" width="' + PW + '" height="' + PH + '" fill="#000000" stroke="#333333" stroke-width="1.5"/>',
    // Halfway line (horizontal across middle)
    '<line x1="' + OX + '" y1="225" x2="' + (OX + PW) + '" y2="225" stroke="#1F1F1F" stroke-width="1"/>',
    // Center circle
    '<circle cx="150" cy="225" r="35" fill="none" stroke="#1F1F1F" stroke-width="1"/>',
    '<circle cx="150" cy="225" r="2" fill="#666666"/>',
    // Top penalty box (opposition goal)
    '<rect x="50" y="30" width="200" height="80" fill="none" stroke="#1F1F1F" stroke-width="1"/>',
    // Bottom penalty box (our goal)
    '<rect x="50" y="340" width="200" height="80" fill="none" stroke="#1F1F1F" stroke-width="1"/>',
    // Top goal
    '<rect x="120" y="24" width="60" height="10" fill="none" stroke="#1F1F1F" stroke-width="1"/>',
    // Bottom goal
    '<rect x="120" y="416" width="60" height="10" fill="none" stroke="#1F1F1F" stroke-width="1"/>'
  ];

  // SVG marker defs for transition arrows
  if (arrowMode) {
    parts.push(
      '<defs>',
      '<marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">',
      '<path d="M 0 0 L 10 5 L 0 10 Z" fill="#666666" />',
      '</marker>',
      '</defs>'
    );
  }

  // Compute dynamic LOE and DL Y-coordinates
  var loeY = 60, dlY = 300;
  if (showShapeLines) {
    var loeVal = instrValues.lineOfEngagement || TACTIC_SCHEMA.lineOfEngagement.default;
    var loeVals = TACTIC_SCHEMA.lineOfEngagement.values;
    var loeIdx = loeVals.indexOf(loeVal);
    if (loeIdx === -1) loeIdx = 1;
    loeY = 60 + (loeIdx / (loeVals.length - 1)) * 120;

    var dlVal = instrValues.defensiveLine || TACTIC_SCHEMA.defensiveLine.default;
    var dlVals = TACTIC_SCHEMA.defensiveLine.values;
    var dlIdx = dlVals.indexOf(dlVal);
    if (dlIdx === -1) dlIdx = 2;
    dlY = 210 + (dlIdx / (dlVals.length - 1)) * 180;

    // LOE thick solid line + label + arrow
    parts.push(
      '<line x1="10" y1="' + loeY + '" x2="290" y2="' + loeY + '" stroke="#FFFFFF" stroke-width="3"/>',
      '<text x="16" y="' + (loeY - 8) + '" fill="#AAAAAA" font-size="8" font-family="monospace">LINE OF ENGAGEMENT: ' + escHtml(loeVal) + '</text>',
      '<path d="M 280 ' + (loeY - 4) + ' L 285 ' + (loeY - 9) + ' L 290 ' + (loeY - 4) + ' M 285 ' + (loeY - 9) + ' L 285 ' + (loeY + 9) + ' M 280 ' + (loeY + 4) + ' L 285 ' + (loeY + 9) + ' L 290 ' + (loeY + 4) + '" stroke="#FFFFFF" fill="none"/>'
    );

    // DL thick solid line + label + arrow
    parts.push(
      '<line x1="10" y1="' + dlY + '" x2="290" y2="' + dlY + '" stroke="#FFFFFF" stroke-width="3"/>',
      '<text x="16" y="' + (dlY - 8) + '" fill="#AAAAAA" font-size="8" font-family="monospace">DEFENSIVE LINE: ' + escHtml(dlVal) + '</text>',
      '<path d="M 280 ' + (dlY - 4) + ' L 285 ' + (dlY - 9) + ' L 290 ' + (dlY - 4) + ' M 285 ' + (dlY - 9) + ' L 285 ' + (dlY + 9) + ' M 280 ' + (dlY + 4) + ' L 285 ' + (dlY + 9) + ' L 290 ' + (dlY + 4) + '" stroke="#FFFFFF" fill="none"/>'
    );
  }

  // Player tokens with dynamic squeeze/stretch between LOE and DL
  var RAW_ATTACK_DEPTH = 55;
  var RAW_DEFENSE_DEPTH = 380;

  if (formationId && FORMATIONS[formationId]) {
    var slotIds = FORMATIONS[formationId].slots;
    slotIds.forEach(function (id) {
      var def = GLOBAL_PITCH_SLOTS[id];
      if (!def) return;

      // Horizontal position (with xMultiplier support)
      var mappedX = options.xMultiplier && options.xMultiplier !== 1
        ? 340 + (def.x - 340) * options.xMultiplier
        : def.x;
      var px = OX + (mappedX / 680) * PW;

      // Vertical: interpolate between LOE and DL based on natural depth
      var rawDepth = def.y;
      var depthRatio = (rawDepth - RAW_ATTACK_DEPTH) / (RAW_DEFENSE_DEPTH - RAW_ATTACK_DEPTH);
      depthRatio = Math.max(0, Math.min(1, depthRatio));
      var py = loeY + depthRatio * (dlY - loeY);

      parts.push(
        '<circle cx="' + px + '" cy="' + py + '" r="3.5" fill="#f87171" opacity="0.85"/>'
      );

      // Movement arrows using SVG <line> + marker arrowhead
      var lineStr = '';
      if (arrowMode) {
        var x1 = px, y1 = py, x2 = px, y2 = py;
        if (arrowMode === "counter") {
          y1 = py - 5; y2 = py - 20;
        } else if (arrowMode === "regroup") {
          y1 = py + 5; y2 = py + 20;
        } else if (arrowMode === "counterpress") {
          if (px < 100) { x1 = px - 4; x2 = px - 15; y1 = py - 4; y2 = py - 15; }
          else if (px > 200) { x1 = px + 4; x2 = px + 15; y1 = py - 4; y2 = py - 15; }
          else { y1 = py - 5; y2 = py - 20; }
        } else if (arrowMode === "width") {
          if (px < 100) { x1 = px - 4; x2 = px - 20; y1 = py; y2 = py; }
          else if (px > 200) { x1 = px + 4; x2 = px + 20; y1 = py; y2 = py; }
        }
        lineStr = '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#666666" stroke-width="1.5" marker-end="url(#arr)"/>';
      }
      parts.push(lineStr);
    });
  }

  slot.innerHTML = parts.join("");
  return slot;
}

/* ── OUT OF POSSESSION — ASYMMETRICAL LAYOUT ── */

function _buildOutOfPossessionPhase(container) {
  var panel = document.createElement("div");
  panel.className = "oop-panel";

  var instrs = window.FM24State.tactic.instructions;
  var phaseKey = "out_of_possession";

  // ── LEFT AREA (col-span-2) — centered portrait pitch only ──
  var left = document.createElement("div");
  left.className = "oop-left";

  var pitchWrapper = document.createElement("div");
  pitchWrapper.className = "oop-defensive-pitch";
  pitchWrapper.appendChild(_renderDefensiveShapePitch(
    window.FM24State.tactic.formation,
    instrs
  ));
  left.appendChild(pitchWrapper);
  panel.appendChild(left);

  // ── RIGHT AREA (col-span-1) — all instruction controls stacked ──
  var right = document.createElement("div");
  right.className = "oop-right";

  var allRightControls = [
    "lineOfEngagement",
    "defensiveLine",
    "defensiveWidth",
    "triggerPress",
    "preventShortGKDistribution",
    "tackling",
    "defensiveLineBehavior",
    "pressingTrap",
    "crossEngagement"
  ];

  allRightControls.forEach(function (key) {
    var schema = TACTIC_SCHEMA[key];
    if (!schema) return;

    var row = document.createElement("div");
    row.className = "instr-row";

    var label = document.createElement("span");
    label.className = "instr-label";
    label.textContent = schema.label;
    row.appendChild(label);

    var controlWrapper = document.createElement("div");
    controlWrapper.className = "instr-control";
    controlWrapper.appendChild(_renderControl(key, schema, phaseKey));
    row.appendChild(controlWrapper);

    right.appendChild(row);
  });

  panel.appendChild(right);
  container.appendChild(panel);
}

function renderPitch() {
  var wrapper = document.getElementById("pitch-wrapper");
  if (!wrapper) return;
  wrapper.innerHTML = "";

  var container = document.createElement("div");
  container.id = "pitch-container";

  var pitchSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  pitchSvg.setAttribute("viewBox", "0 0 400 550");
  pitchSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  pitchSvg.setAttribute("class", "pitch-svg");
  pitchSvg.innerHTML = [
    '<rect x="0" y="0" width="400" height="550" fill="transparent"/>',
    '<rect x="20" y="20" width="360" height="510" fill="none" stroke="#333333" stroke-width="1.5"/>',
    '<line x1="20" y1="275" x2="380" y2="275" stroke="#333333" stroke-width="1.5"/>',
    '<circle cx="200" cy="275" r="45" fill="none" stroke="#333333" stroke-width="1.5"/>',
    '<rect x="100" y="20" width="200" height="90" fill="none" stroke="#333333" stroke-width="1.5"/>',
    '<rect x="150" y="20" width="100" height="30" fill="none" stroke="#333333" stroke-width="1.5"/>',
    '<rect x="100" y="440" width="200" height="90" fill="none" stroke="#333333" stroke-width="1.5"/>',
    '<rect x="150" y="500" width="100" height="30" fill="none" stroke="#333333" stroke-width="1.5"/>',
    '<text x="25" y="515" fill="#666666" font-size="8" font-family="monospace">TEAM FLUIDITY</text>',
    '<text x="25" y="528" fill="#FFFFFF" font-size="10" font-weight="bold" font-family="monospace">[+] Flexible</text>'
  ].join("");
  container.appendChild(pitchSvg);

  var activeSlots = window.FM24State.tactic.slots;
  var allSlotIds = Object.keys(GLOBAL_PITCH_SLOTS);

  allSlotIds.forEach(function (slotId) {
    var def = GLOBAL_PITCH_SLOTS[slotId];
    var isActive = !!activeSlots[slotId];

    /* ── PLAYER NODE WRAPPER ── */
    var node = document.createElement("div");
    node.className = "player-node";
    node.dataset.slot = slotId;
    node.style.left = ((def.x / 680) * 100) + "%";
    node.style.top = ((def.y / 440) * 100) + "%";
    node.style.transform = "translate(-50%, -50%)";

    /* ── JERSEY SVG ── */
    var slotData = activeSlots[slotId];
    var hasPlayer = slotData && slotData.playerName;
    var jerseyFill = hasPlayer ? "#FFFFFF" : "#1A1A1A";
    var jerseyStroke = hasPlayer ? "#000000" : "#555555";
    var jerseySvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    jerseySvg.setAttribute("width", "32");
    jerseySvg.setAttribute("height", "32");
    jerseySvg.setAttribute("viewBox", "0 0 40 40");
    jerseySvg.setAttribute("class", "jersey-svg");
    jerseySvg.innerHTML = '<path d="M10 5 L15 0 L25 0 L30 5 L35 15 L28 15 L28 35 L12 35 L12 15 L5 15 Z" fill="' + jerseyFill + '" stroke="' + jerseyStroke + '" stroke-width="1.5"/>';
    node.appendChild(jerseySvg);

    /* ── SLOT BADGE ── */
    var badge = document.createElement("div");
    badge.className = "slot-badge";
    badge.dataset.slot = slotId;

    var roleLine = document.createElement("div");

    if (isActive) {
      var display = getSlotDisplay(activeSlots[slotId]);
      if (display) {
        badge.classList.add("filled");
        var roleBg = "bg-duty-" + display.duty.toLowerCase();
        roleLine.className = "slot-role " + roleBg;
        var dutyLetter = display.duty ? " - " + display.duty.charAt(0).toUpperCase() : "";
        roleLine.innerHTML = escHtml(display.abbr) + dutyLetter + ' <span class="text-[7px] ml-1 opacity-70">&#9660;</span>';
        badge.appendChild(roleLine);

        var playerLine = document.createElement("div");
        playerLine.className = "slot-player";
        if (hasPlayer) {
          playerLine.innerHTML = escHtml(slotData.playerName) + ' <span class="text-[7px] ml-1">&#9660;</span>';
        } else {
          playerLine.innerHTML = 'Pick Player <span class="text-[7px] ml-1">&#9660;</span>';
        }
        badge.appendChild(playerLine);

        roleLine.addEventListener("click", function (e) {
          e.stopPropagation();
          showRolePopover(slotId, roleLine);
        });

        playerLine.addEventListener("click", function (e) {
          e.stopPropagation();
          _showPlayerPicker(slotId, playerLine);
        });
      } else {
        roleLine.className = "slot-role";
        roleLine.textContent = slotId;
        badge.classList.add("slot-empty");
        badge.appendChild(roleLine);

        badge.addEventListener("click", function (e) {
          e.stopPropagation();
          showRolePopover(slotId, badge);
        });
      }

      node.draggable = true;

      node.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/plain", this.dataset.slot);
        e.dataTransfer.effectAllowed = "move";
        setIsDragging(true);
        container.classList.add("dragging-active");
      });

      node.addEventListener("dragend", function () {
        setIsDragging(false);
        container.classList.remove("dragging-active");
      });

      /* ── Active slot DnD: swap on drop ── */
      node.addEventListener("dragover", function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });

      node.addEventListener("drop", function (e) {
        e.preventDefault();
        var oldSlotId = e.dataTransfer.getData("text/plain");
        var newSlotId = this.dataset.slot;
        if (oldSlotId && newSlotId && oldSlotId !== newSlotId) {
          var src = activeSlots[oldSlotId];
          var dst = activeSlots[newSlotId];
          if (src && dst) {
            // Only swap playerName — roles stay in place
            var tmpPlayer = src.playerName;
            src.playerName = dst.playerName;
            dst.playerName = tmpPlayer;
            persistTactic();
            window.dispatchEvent(new CustomEvent("fm24:slot-moved"));
          }
        }
        setIsDragging(false);
        container.classList.remove("dragging-active");
      });

      node.addEventListener("dragenter", function (e) {
        e.preventDefault();
        this.classList.add("drop-zone-active");
      });

      node.addEventListener("dragleave", function () {
        this.classList.remove("drop-zone-active");
      });
    } else {
      roleLine.className = "slot-role";
      roleLine.textContent = "[+]";
      badge.classList.add("inactive");
      node.classList.add("inactive");
      node.classList.add("drop-zone");
      badge.appendChild(roleLine);

      node.addEventListener("dragover", function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });

      node.addEventListener("drop", function (e) {
        e.preventDefault();
        var oldSlotId = e.dataTransfer.getData("text/plain");
        var newSlotId = this.dataset.slot;
        if (oldSlotId && newSlotId && oldSlotId !== newSlotId) {
          moveSlotRole(oldSlotId, newSlotId);
        }
        setIsDragging(false);
        container.classList.remove("dragging-active");
      });

      node.addEventListener("dragenter", function (e) {
        e.preventDefault();
        this.classList.add("drop-zone-active");
      });

      node.addEventListener("dragleave", function () {
        this.classList.remove("drop-zone-active");
      });
    }

    node.appendChild(badge);
    container.appendChild(node);
  });

  wrapper.appendChild(container);
}

/* ── ROLE POPOVER ── */

var _activePopover = null;

function renderRolePopover() {
  if (document.getElementById("role-popover")) return;
  var pop = document.createElement("div");
  pop.id = "role-popover";
  pop.className = "fixed z-50 bg-[#0A0A0A] border border-[#333333] p-2 text-[10px] font-mono min-w-[240px] shadow-lg hidden";

  var header = document.createElement("div");
  header.className = "flex justify-between items-center mb-1";
  var title = document.createElement("span");
  title.className = "text-[10px] text-[#888888] uppercase tracking-wider";
  title.textContent = "ROLE SELECTION";
  header.appendChild(title);
  var clearBtn = document.createElement("button");
  clearBtn.id = "popover-clear-btn";
  clearBtn.className = "text-[10px] text-[#888888] hover:text-white transition-colors";
  clearBtn.textContent = "[ CLEAR ]";
  header.appendChild(clearBtn);
  pop.appendChild(header);

  var list = document.createElement("div");
  list.id = "role-popover-list";
  list.className = "flex flex-col gap-[2px] mt-1";
  pop.appendChild(list);

  document.body.appendChild(pop);

  document.addEventListener("click", function (e) {
    if (_activePopover && !pop.classList.contains("hidden") &&
        !pop.contains(e.target) && !e.target.closest(".slot-badge")) {
      hideRolePopover();
    }
  });
}

function showRolePopover(slotId, triggerEl) {
  var pop = document.getElementById("role-popover");
  if (!pop) return;

  _activePopover = slotId;

  var slot = window.FM24State.tactic.slots[slotId];
  var slotDef = getSlotDef(slotId);
  if (!slot || !slotDef) return;

  var groups = getRoleGroupsForStrata(slotDef.strata);
  var list = document.getElementById("role-popover-list");
  list.innerHTML = "";

  var currentRoleId = slot.roleId;
  var rows = [];

  groups.forEach(function (group) {
    var row = document.createElement("div");
    row.className = "role-row flex justify-between items-center cursor-pointer p-1 text-[#888888] hover:text-white hover:bg-[#111111] transition-colors border border-transparent";

    var leftArea = document.createElement("div");
    leftArea.className = "flex items-center gap-2";
    var nameSpan = document.createElement("span");
    nameSpan.textContent = group.name;
    leftArea.appendChild(nameSpan);
    var arrow = document.createElement("span");
    arrow.className = "arrow text-[8px] text-[#555555]";
    arrow.textContent = "\u25B8";
    leftArea.appendChild(arrow);
    row.appendChild(leftArea);

    var dutiesDiv = document.createElement("div");
    dutiesDiv.className = "duties-container hidden flex gap-1";

    group.duties.forEach(function (duty) {
      var roleId = getRoleId(group.abbreviation, duty, slotDef.strata);
      if (!roleId) return;

      var dutyColor = "";
      if (duty === "Attack") dutyColor = "text-[#fbbf24]";
      else if (duty === "Support") dutyColor = "text-[#60a5fa]";
      else if (duty === "Defend") dutyColor = "text-[#f87171]";
      else if (duty === "Stopper") dutyColor = "text-[#a78bfa]";
      else if (duty === "Cover") dutyColor = "text-[#2dd4bf]";

      var btn = document.createElement("button");
      btn.className = "px-1 py-[2px] text-[9px] uppercase border border-[#333333] hover:bg-[#1A1A1A] " + dutyColor;
      btn.textContent = duty;

      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        assignSlotRole(slotId, roleId, duty);
        hideRolePopover();
      });

      dutiesDiv.appendChild(btn);
    });

    row.appendChild(dutiesDiv);

    row.addEventListener("click", function () {
      var isOpen = !dutiesDiv.classList.contains("hidden");

      list.querySelectorAll(".role-row").forEach(function (r) {
        r.className = "role-row flex justify-between items-center cursor-pointer p-1 text-[#888888] hover:text-white hover:bg-[#111111] transition-colors border border-transparent";
      });
      list.querySelectorAll(".duties-container").forEach(function (d) {
        d.classList.add("hidden");
      });
      list.querySelectorAll(".arrow").forEach(function (a) {
        a.textContent = "\u25B8";
      });

      if (!isOpen) {
        dutiesDiv.classList.remove("hidden");
        row.className = "role-row flex justify-between items-center cursor-pointer p-1 text-white transition-colors bg-[#111111] border border-[#333333]";
        arrow.textContent = "\u25BE";
      }
    });

    list.appendChild(row);

    rows.push({ row: row, dutiesDiv: dutiesDiv, arrow: arrow, abbreviation: group.abbreviation });
  });

  if (currentRoleId) {
    var currentRole = getRoleById(currentRoleId);
    if (currentRole) {
      rows.forEach(function (r) {
        if (r.abbreviation === currentRole.abbreviation) {
          r.dutiesDiv.classList.remove("hidden");
          r.row.className = "role-row flex justify-between items-center cursor-pointer p-1 text-white transition-colors bg-[#111111] border border-[#333333]";
          r.arrow.textContent = "\u25BE";
        }
      });
    }
  }

  var clearBtn = document.getElementById("popover-clear-btn");
  clearBtn.onclick = function () {
    clearPitchSlot(slotId);
    hideRolePopover();
  };

  var rect = triggerEl.getBoundingClientRect();
  var popWidth = 240;
  var left = rect.left + rect.width / 2 - Math.round(popWidth / 2);
  var top = rect.bottom + 6;

  var estimatedHeight = 36 + groups.length * 26;
  if (top + estimatedHeight > window.innerHeight && rect.top - estimatedHeight > 0) {
    top = rect.top - estimatedHeight - 6;
  }

  if (left < 10) left = 10;
  if (left + popWidth > window.innerWidth) left = window.innerWidth - popWidth - 10;

  pop.style.left = left + "px";
  pop.style.top = top + "px";
  pop.classList.remove("hidden");
}

function hideRolePopover() {
  var pop = document.getElementById("role-popover");
  if (pop) pop.classList.add("hidden");
  _activePopover = null;
}

function _refreshRosterTable() {
  var table = document.querySelector("#panel-tactic table");
  if (!table) return;
  var rightCol = table.parentNode;
  var autoBtn = rightCol.querySelector("#auto-pick-btn");
  if (autoBtn) {
    var parent = autoBtn.parentNode;
    if (parent && parent.classList.contains("flex")) {
      parent.remove();
    } else {
      autoBtn.remove();
    }
  }
  table.remove();
  rightCol.insertBefore(_makeAutoPickBtn(), rightCol.firstChild);
  rightCol.appendChild(_renderRosterTable());
}

function _makeAutoPickBtn() {
  var container = document.createElement("div");
  container.className = "flex gap-2 mb-4 w-full";

  var pickBtn = document.createElement("button");
  pickBtn.id = "auto-pick-btn";
  pickBtn.className = "flex-1 bg-[#111111] hover:bg-[#1A1A1A] text-white text-[10px] uppercase font-bold tracking-wider border border-[#333333] py-2 rounded-sm";
  pickBtn.textContent = "Auto Pick Squad";
  pickBtn.addEventListener("click", _handleAutoPick);
  container.appendChild(pickBtn);

  if (window.FM24State && window.FM24State.appMode === "dof") {
    var styleBtn = document.createElement("button");
    styleBtn.id = "apply-manager-style-btn";
    styleBtn.className = "flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] uppercase font-bold tracking-wider border border-blue-600 py-2 rounded-sm transition-colors";
    styleBtn.textContent = "Apply Manager Style";
    styleBtn.addEventListener("click", function () {
      var s = window.FM24State;
      if (!s.manager || !s.manager.hired) {
        if (typeof showToast === "function") {
          showToast("Please hire a manager first.", "error");
        } else {
          alert("Please hire a manager first.");
        }
        return;
      }
      if (typeof applyGeneratedTactic === "function") {
        applyGeneratedTactic();
        if (typeof renderTacticView === "function") {
          renderTacticView();
        }
      }
    });
    container.appendChild(styleBtn);
  }

  return container;
}

function _showPlayerPicker(slotId, anchorEl, filterSlotId) {
  try {
    var existing = document.getElementById("player-picker");
    if (existing) existing.remove();

    var squad = window.FM24State.squad;
    if (!squad || squad.length === 0) return;

    var isSubSlot = slotId && slotId.charAt(0) === 'S';
    var slot = window.FM24State.tactic.slots[slotId];

    // For regular slots, require a role
    if (!isSubSlot && (!slot || !slot.roleId)) return;

    // Use filterSlotId for positional awareness on subs, fall back to slotId
    var posSlotId = (isSubSlot && filterSlotId) ? filterSlotId : slotId;

    // Build player list
    var usedNames = {};
    var allSlotIds = Object.keys(window.FM24State.tactic.slots);
    allSlotIds.forEach(function (sid) {
      var s = window.FM24State.tactic.slots[sid];
      if (s && s.playerName) usedNames[s.playerName] = true;
    });
    // Also include subs assigned via tactic.subs
    var subs = window.FM24State.tactic.subs || {};
    Object.keys(subs).forEach(function (sid) {
      if (subs[sid]) usedNames[subs[sid]] = true;
    });
    // Don't exclude current slot's own player
    var currentPlayer = isSubSlot ? (subs[slotId] || null) : (slot ? slot.playerName : null);
    if (currentPlayer) delete usedNames[currentPlayer];

    var eligible = [];
    if (isSubSlot) {
      // Subs: position-aware filtering using filterSlotId
      squad.forEach(function (p) {
        if (usedNames[p.Name]) return;
        if (!isFlankEligible(p, posSlotId)) return;
        var score = 0;
        var slotForScore = window.FM24State.tactic.slots[posSlotId];
        if (slotForScore && slotForScore.roleId) {
          var s = scorePlayerForTacticSlot(p, posSlotId);
          if (s) score = s.total;
        } else {
          var fits = findBestTacticFitForPlayer(p);
          if (fits.length > 0) score = fits[0].score.total;
        }
        eligible.push({ player: p, score: { total: score } });
      });
      eligible.sort(function (a, b) { return b.score.total - a.score.total; });
    } else {
      // Regular slot: positional filtering
      var filtered = squad.filter(function (p) {
        return isFlankEligible(p, slotId);
      });
      eligible = rankPlayersForSlot(filtered, slotId);
    }

    var picker = document.createElement("div");
    picker.id = "player-picker";
    picker.className = "fixed z-50 bg-[#0A0A0A] border border-[#333333] rounded shadow-lg font-mono";
    picker.style.minWidth = "200px";

    var header = document.createElement("div");
    header.className = "px-3 py-2 text-[10px] text-[#666666] uppercase tracking-wider border-b border-[#333333]";
    header.textContent = "Select Player";
    picker.appendChild(header);

    if (currentPlayer) {
      var clearRow = document.createElement("div");
      clearRow.className = "px-3 py-1.5 text-[10px] text-[#f87171] cursor-pointer hover:bg-[#1A1A1A] border-b border-[#333333]";
      clearRow.textContent = "[x] Clear selection";
      clearRow.addEventListener("click", function () {
        if (isSubSlot) {
          delete window.FM24State.tactic.subs[slotId];
        } else {
          delete slot.playerName;
          assignPlayerToSlot(slotId, null);
        }
        persistTactic();
        picker.remove();
        _refreshRosterTable();
      });
      picker.appendChild(clearRow);
    }

    if (eligible.length === 0) {
      var empty = document.createElement("div");
      empty.className = "px-3 py-4 text-[10px] text-[#555555] italic text-center";
      empty.textContent = "No eligible players";
      picker.appendChild(empty);
    } else {
      eligible.forEach(function (r, idx) {
        var p = r.player;
        var isCurrent = p.Name === currentPlayer;
        var row = document.createElement("div");
        row.className = "px-3 py-1.5 text-[10px] cursor-pointer hover:bg-[#1A1A1A] flex items-center justify-between gap-2 border-b border-[#111111] " + (isCurrent ? "text-white font-bold" : (idx === 0 ? "text-white font-bold" : "text-[#CCCCCC]"));

        var nameSpan = document.createElement("span");
        nameSpan.textContent = p.Name + (isCurrent ? " (Current)" : "");
        row.appendChild(nameSpan);

        var statsSpan = document.createElement("span");
        statsSpan.className = "text-[9px] flex items-center gap-1";
        statsSpan.innerHTML = _renderASCIIBar(r.score.total) + ' ' + _renderFitBadge(r.score.fitLabel || "");
        row.appendChild(statsSpan);

        if (!isCurrent) {
          row.addEventListener("click", function () {
            if (isSubSlot) {
              window.FM24State.tactic.subs[slotId] = p.Name;
            } else {
              slot.playerName = p.Name;
              assignPlayerToSlot(slotId, p.Name);
            }
            persistTactic();
            picker.remove();
            _refreshRosterTable();
          });
        }
        picker.appendChild(row);
      });
    }

    document.body.appendChild(picker);

    if (anchorEl) {
      var rect = anchorEl.getBoundingClientRect();
      var pickerRect = picker.getBoundingClientRect();
      var left = rect.left;
      var top = rect.bottom + 4;
      if (top + pickerRect.height > window.innerHeight) {
        top = rect.top - pickerRect.height - 4;
      }
      if (left + pickerRect.width > window.innerWidth) {
        left = window.innerWidth - pickerRect.width - 8;
      }
      if (left < 4) left = 4;
      picker.style.left = left + "px";
      picker.style.top = top + "px";
    } else {
      picker.style.left = "50%";
      picker.style.top = "40%";
      picker.style.transform = "translate(-50%, -50%)";
    }

    function closeOnOutside(e) {
      if (!picker.contains(e.target)) {
        picker.remove();
        document.removeEventListener("click", closeOnOutside);
      }
    }
    setTimeout(function () {
      document.addEventListener("click", closeOnOutside);
    }, 0);
  } catch (err) {
    console.error("_showPlayerPicker error:", err);
  }
}

function _handleAutoPick(preserveExisting) {
  var slots = window.FM24State.tactic.slots;
  var slotIds = Object.keys(slots).filter(function(id) {
    return !/^S\d/.test(id);
  });
  var squad = window.FM24State.squad;
  if (!squad || squad.length === 0) return;
  if (!window.FM24State.tactic.isComplete) return;

  var used = {};
  var filled = {};

  if (preserveExisting === true) {
    for (var si = 0; si < slotIds.length; si++) {
      var slotId = slotIds[si];
      if (slots[slotId] && slots[slotId].playerName) {
        used[slots[slotId].playerName] = true;
        filled[slotId] = true;
      }
    }
  } else {
    // Clear starting lineup
    for (var si = 0; si < slotIds.length; si++) {
      if (slots[slotIds[si]]) {
        slots[slotIds[si]].playerName = null;
      }
    }
  }

  // 1. Generate all player × starting-slot combos (global, all-vs-all)
  var combos = [];
  for (var pi = 0; pi < squad.length; pi++) {
    var player = squad[pi];
    for (var si = 0; si < slotIds.length; si++) {
      var slotId = slotIds[si];
      if (!slots[slotId] || !slots[slotId].roleId) continue;
      if (!isFlankEligible(player, slotId)) continue;
      var score = scorePlayerForTacticSlot(player, slotId);
      if (score === null) continue;
      combos.push({ player: player, slotId: slotId, score: score.total });
    }
  }

  // 2. Sort by score descending (global ranking)
  combos.sort(function (a, b) { return b.score - a.score; });

  // 3. Greedy assignment — globally best fit first, no duplicates
  for (var ci = 0; ci < combos.length; ci++) {
    var c = combos[ci];
    if (used[c.player.Name]) continue;
    if (filled[c.slotId]) continue;
    used[c.player.Name] = true;
    filled[c.slotId] = true;
    slots[c.slotId].playerName = c.player.Name;
  }

  // 4. Fill bench S1–S12 with best remaining unused players
  var unused = squad.filter(function (p) { return !used[p.Name]; });
  var rankedBench = unused.map(function (p) {
    var fits = findBestTacticFitForPlayer(p);
    return { player: p, fit: fits.length > 0 ? fits[0] : null, score: fits.length > 0 ? fits[0].score.total : 0 };
  });
  rankedBench.sort(function (a, b) { return b.score - a.score; });
  var tacticSubs = window.FM24State.tactic.subs || {};
  for (var si = 1; si <= 12; si++) {
    var entry = rankedBench[si - 1];
    if (entry && entry.fit) {
      tacticSubs["S" + si] = entry.player.Name;
      entry.player._bestFit = entry.fit;
    } else {
      delete tacticSubs["S" + si];
    }
  }
  window.FM24State.tactic.subs = tacticSubs;
  persistTactic();
  renderPitch();
  _refreshRosterTable();
}

/* ── INSTRUCTIONS ACCORDION ── */

function buildInstructionsAccordion() {
  var accordion = document.createElement("div");
  accordion.className = "font-mono";

  var groups = [
    {
      title: "In Possession",
      keys: [
        "mentality", "attackingWidth", "passingDirectness", "tempo",
        "focusPlayDown", "creativeFreedom", "crossType", "aimCrossesAt",
        "passIntoSpace", "workBallIntoBox", "playOutOfDefence",
        "runAtDefence", "shootOnSight", "hitEarlyCrosses",
        "overlapLeft", "overlapRight", "underlapLeft", "underlapRight"
      ]
    },
    {
      title: "In Transition",
      keys: ["whenPossessionLost", "whenPossessionWon", "preventShortGKDistribution"]
    },
    {
      title: "Out of Possession",
      keys: [
        "lineOfEngagement", "defensiveLine", "tackling", "triggerPress",
        "defensiveWidth", "crossEngagement", "defensiveLineBehavior",
        "pressingTrap", "gkDistributionPace", "gkDistributionMethod",
        "gkDistributionTarget"
      ]
    }
  ];

  groups.forEach(function (group) {
    var section = document.createElement("div");
    section.className = "border border-[#1F1F1F] rounded mb-2 overflow-hidden";

    var header = document.createElement("div");
    header.className = "bg-[#0A0A0A] px-4 py-2 text-sm text-[#CCCCCC] font-mono cursor-pointer select-none hover:text-white transition-colors";
    header.textContent = group.title;

    var body = document.createElement("div");
    body.className = "bg-black px-4 py-3 hidden";

    group.keys.forEach(function (key) {
      var schema = TACTIC_SCHEMA[key];
      if (!schema) return;
      var row = document.createElement("div");
      row.className = "flex items-center justify-between py-1.5 border-b border-[#1F1F1F] last:border-b-0";

      var label = document.createElement("span");
      label.className = "text-xs text-[#CCCCCC]";
      label.textContent = schema.label;
      row.appendChild(label);

      if (schema.type === "enum") {
        var btnGroup = document.createElement("div");
        btnGroup.className = "flex gap-0.5";
        schema.values.forEach(function (v) {
          var btn = document.createElement("button");
          btn.className = "text-xs px-2 py-0.5 border border-[#1F1F1F] text-[#666666] hover:text-white hover:border-[#666666] transition-colors first:rounded-l last:rounded-r";
          btn.textContent = v;
          var current = window.FM24State.tactic.instructions[key];
          if (current === v || (!current && schema.default === v)) {
            btn.className = "text-xs px-2 py-0.5 border border-white bg-white text-black font-bold first:rounded-l last:rounded-r";
          }
          btn.addEventListener("click", function () {
            var newVal = current === v ? null : v;
            updateInstruction(key, newVal);
            var siblings = btn.parentNode.querySelectorAll("button");
            siblings.forEach(function (b) {
              b.className = "text-xs px-2 py-0.5 border border-[#1F1F1F] text-[#666666] hover:text-white hover:border-[#666666] transition-colors first:rounded-l last:rounded-r";
            });
            if (newVal) {
              btn.className = "text-xs px-2 py-0.5 border border-white bg-white text-black font-bold first:rounded-l last:rounded-r";
            } else if (schema.default) {
              siblings.forEach(function (b) {
                if (b.textContent === schema.default) {
                  b.className = "text-xs px-2 py-0.5 border border-white bg-white text-black font-bold first:rounded-l last:rounded-r";
                }
              });
            }
          });
          btnGroup.appendChild(btn);
        });
        row.appendChild(btnGroup);
      } else if (schema.type === "toggle") {
        var toggleGroup = document.createElement("div");
        toggleGroup.className = "flex gap-0.5";

        var states = [
          { label: "ON", value: true },
          { label: "OFF", value: false },
          { label: "Default", value: null }
        ];
        states.forEach(function (s) {
          var btn = document.createElement("button");
          btn.className = "text-xs px-2 py-0.5 border border-[#1F1F1F] text-[#666666] hover:text-white hover:border-[#666666] transition-colors first:rounded-l last:rounded-r";
          btn.textContent = s.label;
          var current = window.FM24State.tactic.instructions[key];
          if (current === s.value || (current === undefined && s.value === null)) {
            btn.className = "text-xs px-2 py-0.5 border border-white bg-white text-black font-bold first:rounded-l last:rounded-r";
          }
          btn.addEventListener("click", function () {
            updateInstruction(key, s.value);
            var siblings = btn.parentNode.querySelectorAll("button");
            siblings.forEach(function (b) {
              b.className = "text-xs px-2 py-0.5 border border-[#1F1F1F] text-[#666666] hover:text-white hover:border-[#666666] transition-colors first:rounded-l last:rounded-r";
            });
            btn.className = "text-xs px-2 py-0.5 border border-white bg-white text-black font-bold first:rounded-l last:rounded-r";
          });
          toggleGroup.appendChild(btn);
        });
        row.appendChild(toggleGroup);
      }

      body.appendChild(row);
    });

    section.appendChild(header);
    section.appendChild(body);
    accordion.appendChild(section);

    header.addEventListener("click", function () {
      body.classList.toggle("hidden");
    });

    if (group.keys.some(function (k) {
      var v = window.FM24State.tactic.instructions[k];
      return v !== undefined && v !== null;
    })) {
      body.classList.remove("hidden");
    }
  });

  return accordion;
}

/* ── TACTICAL ANALYSIS ── */

function _analyzeTactic() {
  var instrs = window.FM24State.tactic.instructions || {};
  var i = function (k) { return instrs[k]; };
  var positives = [];
  var negatives = [];

  function isActive(k) { return i(k) === true; }
  function isInactive(k) { return i(k) === false; }

  var mentality = i("mentality") || "Balanced";
  var attWidth = i("attackingWidth") || "Normal";
  var passDir = i("passingDirectness") || "Mixed";
  var tempo = i("tempo") || "Normal";
  var lineOfEng = i("lineOfEngagement") || "Mid block";
  var defLine = i("defensiveLine") || "Standard";
  var defWidth = i("defensiveWidth") || "Standard";
  var triggerPress = i("triggerPress") || "Standard";
  var tackling = i("tackling") || "Stay on feet";
  var creatFreedom = i("creativeFreedom") || "Balanced";
  var crossType = i("crossType") || "Mixed";

  var isAggressiveMentality = mentality === "Very Attacking" || mentality === "Attacking";
  var isDefensiveMentality = mentality === "Very Defensive" || mentality === "Defensive";
  var isPositiveMentality = mentality === "Positive";
  var isDirectPass = passDir === "More Direct" || passDir === "Much More Direct" || passDir === "Extremely Direct";
  var isShortPass = passDir === "Shorter" || passDir === "Much Shorter" || passDir === "Extremely Short";
  var isHighTempo = tempo === "Higher" || tempo === "Much Higher" || tempo === "Extremely High";
  var isLowTempo = tempo === "Lower" || tempo === "Much Lower" || tempo === "Extremely Low";
  var isHighLine = defLine === "Much Higher" || defLine === "Higher";
  var isDeepLine = defLine === "Much Lower" || defLine === "Lower";

  // ── POSITIVES ──

  if (mentality) {
    if (isAggressiveMentality) positives.push("Aggressive " + mentality.toLowerCase() + " mentality pushing forward");
    else if (isPositiveMentality) positives.push("Positive mentality with balanced risk-taking");
    else if (isDefensiveMentality) positives.push("Solid " + mentality.toLowerCase() + " base with defensive discipline");
    else positives.push("Balanced " + mentality.toLowerCase() + " approach");
  }

  if (i("whenPossessionLost") === "Counter-Press") {
    positives.push("Immediate counter-press after possession loss");
  }
  if (i("whenPossessionWon") === "Counter") {
    positives.push("Rapid counter-attacking transitions");
  }
  if (i("whenPossessionWon") === "Hold Shape") {
    positives.push("Patient build-up maintaining defensive shape");
  }

  if (isDirectPass) {
    if (isHighTempo) {
      positives.push("Quick direct transitions bypassing midfield");
    } else {
      positives.push("Direct vertical passing stretching opposition");
    }
  }
  if (isShortPass) {
    if (isLowTempo) {
      positives.push("Patient short-passing control retaining possession");
    } else {
      positives.push("Short-passing approach maintaining possession");
    }
  }

  if (isActive("playOutOfDefence")) {
    positives.push("Composed build-up from the back under pressure");
  }
  if (isActive("passIntoSpace")) {
    positives.push("Penetrative passing into space behind defence");
  }

  if (isActive("workBallIntoBox")) {
    positives.push("Disciplined final-third entry creating high-quality chances");
  }
  if (isActive("shootOnSight")) {
    positives.push("Shooting-on-sight mentality creating goal threats");
  }
  if (isActive("runAtDefence")) {
    positives.push("Direct dribbling runs committing defenders");
  }
  if (isActive("hitEarlyCrosses")) {
    positives.push("Early crosses catching defence out of position");
  }

  if (i("whenPossessionLost") === "Regroup") {
    positives.push("Structured regrouping maintaining defensive organisation");
  }

  if (lineOfEng === "High") {
    if (triggerPress === "Much More Often" || triggerPress === "More Often") {
      positives.push("Intense high press forcing errors in opposition half");
    } else {
      positives.push("High line of engagement compressing play");
    }
  }

  if (isHighLine) {
    if (tackling === "Get Stuck In") {
      positives.push("Aggressive high defensive line with strong tackling");
    } else {
      positives.push("High defensive line squeezing the pitch");
    }
  }

  if (i("pressingTrap") === "Trap Inside" || i("pressingTrap") === "Trap Outside") {
    positives.push("Organised pressing trap channelling play into favourable zones");
  }

  if (crossType === "Low") {
    positives.push("Low hard crosses into dangerous areas");
  }
  if (crossType === "Floated") {
    positives.push("Floated crosses targeting aerial advantage");
  }

  if (isActive("overlapLeft") || isActive("overlapRight")) {
    positives.push("Wide overlapping runs creating overloads");
  }

  if (creatFreedom === "More Expressive") {
    positives.push("Expressive creative freedom unlocking defences");
  }

  // ── NEGATIVES ──

  if (isAggressiveMentality) {
    negatives.push("Exposed defensive structure — vulnerable to counters");
  }
  if (isDefensiveMentality) {
    negatives.push("Lack of attacking impetus — limited goal threat");
  }

  if (isActive("playForSetPieces")) {
    negatives.push("Over-reliance on set-piece situations");
  }
  if (isInactive("passIntoSpace") && isInactive("playOutOfDefence") && !isDirectPass) {
    negatives.push("Conservative build-up risks predictability");
  }
  if (creatFreedom === "More Disciplined") {
    negatives.push("Rigid positional structure limiting creativity");
  }

  if (isHighLine) {
    if (lineOfEng !== "High") {
      negatives.push("Split defensive and midfield lines — gaps through centre");
    }
    if (defWidth === "Wider") {
      negatives.push("High and wide defensive shape — vulnerable to through balls");
    } else if (defWidth === "Narrower") {
      negatives.push("High narrow defence — exploited by wide switches");
    }
  }

  if (isDeepLine) {
    if (i("whenPossessionLost") !== "Counter-Press") {
      negatives.push("Deep passive block inviting opposition pressure");
    }
  }

  if (isActive("overlapLeft") && isActive("overlapRight")) {
    negatives.push("Both fullbacks overlapping — exposed to wide counters");
  }
  if (isActive("hitEarlyCrosses") && crossType === "Floated") {
    negatives.push("Early floated crosses — easy for defence to read");
  }

  if (isLowTempo) {
    if (isShortPass) {
      negatives.push("Slow short build-up allows defence to reorganise");
    }
  }

  if (i("whenPossessionLost") === "Regroup" && isHighLine) {
    negatives.push("Regroup with high defensive line — confusion in transition");
  }

  if (attWidth === "Narrow" || attWidth === "Extremely Narrow") {
    negatives.push("Narrow attacking width — predictable central play");
  }
  if (attWidth === "Wide" || attWidth === "Extremely Wide") {
    if (isInactive("overlapLeft") && isInactive("overlapRight") && isInactive("underlapLeft") && isInactive("underlapRight")) {
      negatives.push("Wide shape without overlapping support");
    }
  }

  if (isActive("runAtDefence") && creatFreedom === "More Disciplined") {
    negatives.push("Dribbling with rigid structure — easy to predict");
  }

  if (i("whenPossessionWon") === "Hold Shape" && i("whenPossessionLost") === "Regroup") {
    negatives.push("Defensive double-think — no transition intent");
  }

  return { positives: positives, negatives: negatives };
}

function renderSummary() {
  var section = document.getElementById("tactic-summary-section");
  if (!section) return;
  section.innerHTML = "";

  var h3 = document.createElement("h3");
  h3.className = "text-[10px] text-white font-bold uppercase tracking-wider mb-3 border-b border-[#333333] pb-1 font-mono";
  h3.textContent = "Tactical Analysis >";
  section.appendChild(h3);

  var grid = document.createElement("div");
  grid.className = "grid grid-cols-2 gap-4 w-full";

  function bulletCol(color, title, bullets) {
    var col = document.createElement("div");
    var heading = document.createElement("div");
    heading.className = "text-[" + color + "] text-[9px] font-mono uppercase tracking-wider mb-2";
    heading.textContent = title;
    col.appendChild(heading);

    if (bullets.length === 0) {
      var emptyRow = document.createElement("div");
      emptyRow.className = "text-[9px] text-[#555555] font-mono italic";
      emptyRow.textContent = "No observations — configure instructions";
      col.appendChild(emptyRow);
    }

    bullets.forEach(function (b) {
      var row = document.createElement("div");
      row.className = "flex gap-2 items-start";
      var icon = document.createElement("span");
      icon.className = "text-[" + color + "] shrink-0 text-[10px] font-mono";
      icon.textContent = title === "Positives" ? "[+]" : "[-]";
      row.appendChild(icon);
      var text = document.createElement("span");
      text.className = "text-[10px] text-[#CCCCCC] font-mono";
      text.textContent = b;
      row.appendChild(text);
      col.appendChild(row);
    });

    return col;
  }

  var analysis = _analyzeTactic();

  grid.appendChild(bulletCol("#fbbf24", "Positives", analysis.positives));
  grid.appendChild(bulletCol("#f87171", "Negatives", analysis.negatives));

  section.appendChild(grid);

  // Keep export/import/squad-fit buttons below the analysis
  var btnRow = document.createElement("div");
  btnRow.className = "flex gap-2 mt-4";

  var exportBtn = document.createElement("button");
  exportBtn.className = "bg-[#1F1F1F] text-white text-xs font-mono px-3 py-1.5 rounded hover:bg-[#333333] transition-colors";
  exportBtn.textContent = "Export Tactic JSON";
  exportBtn.addEventListener("click", exportTacticJSON);
  btnRow.appendChild(exportBtn);

  var importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = ".json";
  importInput.style.display = "none";
  importInput.addEventListener("change", function () {
    if (importInput.files && importInput.files[0]) {
      var reader = new FileReader();
      reader.onload = function (e) {
        importTacticJSON(e.target.result);
      };
      reader.readAsText(importInput.files[0]);
    }
  });
  btnRow.appendChild(importInput);

  var importBtn = document.createElement("button");
  importBtn.className = "bg-[#1F1F1F] text-white text-xs font-mono px-3 py-1.5 rounded hover:bg-[#333333] transition-colors";
  importBtn.textContent = "Load Tactic JSON";
  importBtn.addEventListener("click", function () {
    importInput.click();
  });
  btnRow.appendChild(importBtn);

  section.appendChild(btnRow);

  var fitRow = document.createElement("div");
  fitRow.className = "mt-2";
  var fitBtn = document.createElement("button");
  fitBtn.className = "bg-white text-black text-xs font-bold font-mono px-3 py-1.5 rounded hover:bg-[#CCCCCC] transition-colors";
  fitBtn.textContent = "Check Squad Fit";
  fitBtn.addEventListener("click", function () {
    var squad = window.FM24State.squad;
    if (!squad || squad.length === 0) {
      showToast("Load a squad first", "error");
      return;
    }
    if (!window.FM24State.tactic.isComplete) {
      showToast("Complete your tactic before checking squad fit.", "error");
      return;
    }
    var sd = document.getElementById("squad-fit-section");
    if (sd) {
      sd.style.display = sd.style.display === "none" ? "block" : "none";
      if (sd.style.display === "block") renderSquadFitPanel();
    }
  });
  fitRow.appendChild(fitBtn);
  section.appendChild(fitRow);
}

/* ── NAV BADGE ── */

function updateNavBadge() {
  var badge = document.getElementById("tactic-badge");
  if (!badge) return;
  var slots = window.FM24State.tactic.slots;
  var count = 0;
  Object.keys(slots).forEach(function (k) { if (slots[k].roleId) count++; });
  badge.textContent = count + "/11";
  if (count === 11) {
    badge.className = "ml-2 text-xs font-mono bg-white text-black px-1.5 py-0.5 font-bold";
  } else {
    badge.className = "ml-2 text-xs font-mono border border-[#1F1F1F] text-[#666666] px-1.5 py-0.5";
  }
}

/* ── RE-RENDER HELPERS (called from events) ── */

function onTacticChanged() {
  invalidateSquadFitCache();
  renderPitch();
  renderRolePopover();
  renderSummary();
  _refreshRosterTable();
  updateNavBadge();
  _updateSidebarSummaries();
}

/* ── SQUAD FIT PANEL (Tactic Builder Sub-Panel) ── */

function goToMarketForSlot(slotId) {
  window.FM24State.marketUI.selectedSlotId = slotId;
  window.FM24State.marketUI.minScore = 65;
  var sq = document.getElementById("squad-fit-section");
  if (sq) sq.style.display = "none";
  window.FM24SwitchTab("market");
}

function renderSquadFitPanel() {
  var section = document.getElementById("squad-fit-section");
  if (!section) return;

  var squad = window.FM24State.squad;
  var slots = window.FM24State.tactic.slots;
  var slotIds = Object.keys(slots);

  var allScores = [];
  var flankGaps = [];

  var html = "<div class='font-mono'>";
  html += "<h3 class='text-sm text-[#CCCCCC] uppercase tracking-wider mb-3'>Squad Fit &amp; Gap Analysis</h3>";
  html += "<div class='bg-[#0A0A0A] border border-[#1F1F1F] rounded overflow-x-auto'>";
  html += "<table class='w-full text-xs'><thead><tr class='border-b border-[#1F1F1F]'>" +
    "<th class='text-left px-3 py-2 text-[#666666] uppercase tracking-wider'>Slot</th>" +
    "<th class='text-left px-3 py-2 text-[#666666] uppercase tracking-wider'>Role-Duty</th>" +
    "<th class='text-left px-3 py-2 text-[#666666] uppercase tracking-wider'>Best Player</th>" +
    "<th class='text-left px-3 py-2 text-[#666666] uppercase tracking-wider'>Score</th>" +
    "<th class='text-left px-3 py-2 text-[#666666] uppercase tracking-wider'>2nd Best</th>" +
    "<th class='text-left px-3 py-2 text-[#666666] uppercase tracking-wider'>Score</th>" +
    "<th class='text-left px-3 py-2 text-[#666666] uppercase tracking-wider'>Status</th>" +
    "<th class='text-left px-3 py-2 text-[#666666] uppercase tracking-wider'></th>" +
  "</tr></thead><tbody>";

  for (var si = 0; si < slotIds.length; si++) {
    var slotId = slotIds[si];
    var slot = slots[slotId];
    var slotDef = getSlotDef(slotId);
    var label = slotDisplayLabel(slotId);

    var display = getSlotDisplay(slot);
    var roleDuty = display ? display.full : "\u2014";

    var eligible = [];
    for (var pi = 0; pi < squad.length; pi++) {
      if (isFlankEligible(squad[pi], slotId)) {
        eligible.push(squad[pi]);
      }
    }

    var ranked = rankPlayersForSlot(eligible, slotId);

    var best = ranked.length > 0 ? ranked[0] : null;
    var second = ranked.length > 1 ? ranked[1] : null;

    var bestName = best ? escHtml(best.player.Name) : "<span class='text-[#666666]'>\u2014</span>";
    var bestScore = best ? Math.round(best.score.total) : "\u2014";
    var bestScoreDisplay = best ? _renderASCIIBar(best.score.total) : "";
    var secondName = second ? escHtml(second.player.Name) : "<span class='text-[#666666]'>\u2014</span>";
    var secondScore = second ? Math.round(second.score.total) : "\u2014";
    var secondScoreDisplay = second ? _renderASCIIBar(second.score.total) : "";

    var bestScoreNum = best ? best.score.total : 0;
    allScores.push(bestScoreNum);

    var statusClass = "";
    var statusLabel = "";
    if (best === null) {
      statusClass = "text-[#666666]";
      statusLabel = "Recruit";
    } else if (bestScoreNum >= 70) {
      statusClass = "text-white font-bold";
      statusLabel = "Covered";
    } else if (bestScoreNum >= 55) {
      statusClass = "text-[#CCCCCC]";
      statusLabel = "Adequate";
    } else {
      statusClass = "text-[#666666]";
      statusLabel = "Recruit";
    }

    var noEligible = eligible.length === 0;
    if (noEligible) {
      statusClass = "text-[#666666]";
      statusLabel = "No eligible";
    }

    if (slotDef && slotDef.flank && slotDef.flank !== "C" && noEligible) {
      var oppFlank = slotDef.flank === "L" ? "R" : "L";
      var oppCount = 0;
      for (var ci = 0; ci < squad.length; ci++) {
        var f = squad[ci].flanks || [];
        if (f.indexOf(oppFlank) !== -1) oppCount++;
      }
      flankGaps.push({ slotId: slotId, label: label, flank: slotDef.flank, oppCount: oppCount });
    }

    var marketLink = "";
    if (best === null || bestScoreNum < 65) {
      marketLink = "<button class='sf-market-btn text-xs text-[#666666] hover:text-white transition-colors font-mono' data-slot='" + slotId + "'>[Find]</button>";
    }

    var rowBg = noEligible || bestScoreNum < 55 ? "bg-[#0A0A0A]" : (bestScoreNum < 70 ? "" : "");

    html += "<tr class='" + rowBg + " border-b border-[#1F1F1F] last:border-b-0'>" +
      "<td class='px-3 py-2 text-white font-mono'>" + label + "</td>" +
      "<td class='px-3 py-2 text-[#CCCCCC] font-mono'>" + roleDuty + "</td>" +
      "<td class='px-3 py-2 text-white font-mono'>" + bestName + "</td>" +
      "<td class='px-3 py-2 font-mono'>" + bestScoreDisplay + "</td>" +
      "<td class='px-3 py-2 text-white font-mono'>" + secondName + "</td>" +
      "<td class='px-3 py-2 font-mono'>" + secondScoreDisplay + "</td>" +
      "<td class='px-3 py-2 font-mono'><span class='" + statusClass + "'>[" + statusLabel.toUpperCase() + "]</span></td>" +
      "<td class='px-3 py-2 font-mono'>" + marketLink + "</td>" +
    "</tr>";
  }

  html += "</tbody></table>";

  var avg = allScores.reduce(function (a, b) { return a + b; }, 0) / allScores.length;
  var overallLabel = "";
  if (avg >= 80) { overallLabel = "TACTICALLY STRONG"; }
  else if (avg >= 65) { overallLabel = "GOOD COVERAGE"; }
  else if (avg >= 50) { overallLabel = "GAPS EXIST"; }
  else { overallLabel = "MAJOR WEAKNESSES"; }

  html += "<div class='px-3 py-2 border-t border-[#1F1F1F] flex items-center gap-3'>" +
    "<span class='text-xs text-[#666666] font-mono'>Overall:</span>" +
    "<span class='text-sm text-white font-bold font-mono'>" + _renderASCIIBar(avg) + "</span>" +
    "<span class='text-xs text-white font-mono'>" + overallLabel + "</span>" +
  "</div>";

  if (flankGaps.length > 0) {
    html += "<div class='px-3 py-2 border-t border-[#1F1F1F]'>" +
      "<div class='text-xs text-[#CCCCCC] font-mono mb-1'>Flank Coverage Alert</div>";
    for (var gi = 0; gi < flankGaps.length; gi++) {
      var gap = flankGaps[gi];
      var opp = gap.flank === "L" ? "right" : "left";
      var oppSide = gap.flank === "L" ? "left" : "right";
      html += "<div class='text-xs text-[#666666] font-mono'>\u2022 " + gap.label + " \u2014 No " + oppSide + "-eligible player. " +
        gap.oppCount + " " + opp + "-side players found but none can cover the " + oppSide + ".</div>";
    }
    html += "</div>";
  }

  var mgr = window.FM24State.manager;
  if (mgr.hired && mgr.generatedTactic && mgr.report) {
    html += "<div class='px-3 py-2 border-t border-[#1F1F1F]'>" +
      "<div class='text-xs text-[#666666] font-mono'>Analysed by: <span class='text-white'>" +
      escHtml(mgr.hired.Name) + "</span> \u2014 " + escHtml(mgr.report.archetype) + "</div></div>";
  }

  var ctx = getTacticContextSummary();
  html += "<div class='px-3 py-2 border-t border-[#1F1F1F]'>" +
    "<div class='text-xs text-[#666666] font-mono cursor-pointer hover:text-white transition-colors' id='sf-context-toggle'>Why these attributes matter <span class='sf-toggle-icon'>\u25BC</span></div>" +
    "<div class='text-xs text-[#CCCCCC] font-mono mt-2 hidden' id='sf-context-body'>" +
    "<div class='mb-2'>" + ctx.headline + "</div>";

  if (ctx.keyDemands.length > 0) {
    html += "<div class='mb-1'><span class='text-[#666666] uppercase tracking-wider'>Key Demands (boosted):</span><ul class='list-disc list-inside text-[#CCCCCC] mt-1'>";
    for (var kdi = 0; kdi < ctx.keyDemands.length; kdi++) {
      html += "<li>" + ctx.keyDemands[kdi] + "</li>";
    }
    html += "</ul></div>";
  }
  if (ctx.reduced.length > 0) {
    html += "<div><span class='text-[#666666] uppercase tracking-wider'>Reduced Attributes (penalised):</span><ul class='list-disc list-inside text-[#CCCCCC] mt-1'>";
    for (var ri = 0; ri < ctx.reduced.length; ri++) {
      html += "<li>" + ctx.reduced[ri] + "</li>";
    }
    html += "</ul></div>";
  }

  html += "</div></div>";
  html += "</div></div>";

  section.innerHTML = html;

  section.querySelectorAll(".sf-market-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      goToMarketForSlot(this.dataset.slot);
    });
  });

  var ctxToggle = document.getElementById("sf-context-toggle");
  var ctxBody = document.getElementById("sf-context-body");
  if (ctxToggle && ctxBody) {
    ctxToggle.addEventListener("click", function () {
      var isOpen = ctxBody.style.display !== "none";
      ctxBody.style.display = isOpen ? "none" : "block";
      ctxToggle.querySelector(".sf-toggle-icon").textContent = isOpen ? "\u25BC" : "\u25B2";
    });
  }
}

/* ── PLAYER DETAIL CARD ── */

var FOOT_LABELS = ["", "Weak", "Reasonable", "Fairly Strong", "Strong", "Very Strong"];

var ATTR_GROUPS = {
  Mental: ["Agg","Ant","Bra","Cmp","Cnt","Dec","Det","Fla","Ldr","OtB","Pos","Tea","Vis","Wor"],
  Physical: ["Acc","Aer","Agi","Bal","Jum","Pac","Sta","Str"],
  Technical: ["Cor","Cro","Dri","Fin","Fir","Fre","Hea","Mar","Pas","Tck","Tec"],
  Goalkeeping: ["1v1","Cmd","Com","Ecc","Han","Kic","Pun","Ref","Thr","TRO"]
};

function renderPlayerCard(player) {
  var existing = document.querySelector(".player-card-overlay");
  if (existing) existing.remove();

  var overlay = document.createElement("div");
  overlay.className = "player-card-overlay";

  var modal = document.createElement("div");
  modal.className = "player-card-modal";

  var closeBtn = document.createElement("button");
  closeBtn.className = "card-close";
  closeBtn.innerHTML = "&times;";

  var tabHeader = document.createElement("div");
  tabHeader.className = "flex gap-6 mb-6 text-xs font-mono border-b border-[#1F1F1F] pb-2";

  var tabDefs = [
    { key: "overview", label: "Tactic Overview" },
    { key: "fits",     label: "Tactic Slot Fits" },
    { key: "attributes", label: "Attributes" }
  ];

  var tabContent = document.createElement("div");
  tabContent.className = "card-tab-content";

  var bestFit = findBestTacticFitForPlayer(player);
  var bestResult = bestFit.length > 0 ? bestFit[0] : null;

  function showTab(key) {
    var btns = tabHeader.querySelectorAll("button");
    btns.forEach(function (b) {
      if (b.dataset.tab === key) {
        b.className = "text-white font-bold cursor-pointer";
      } else {
        b.className = "text-[#666666] hover:text-[#CCCCCC] cursor-pointer";
      }
    });
    if (key === "overview") renderOverview();
    else if (key === "fits") renderSlotFits();
    else if (key === "attributes") renderAttrTab();
  }

  tabDefs.forEach(function (def) {
    var btn = document.createElement("button");
    btn.className = def.key === "overview" ? "text-white font-bold cursor-pointer" : "text-[#666666] hover:text-[#CCCCCC] cursor-pointer";
    btn.dataset.tab = def.key;
    btn.textContent = def.label;
    btn.addEventListener("click", function () { showTab(def.key); });
    tabHeader.appendChild(btn);
  });

  function closeCard() {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  }

  function onKey(e) {
    if (e.key === "Escape") closeCard();
  }

  closeBtn.addEventListener("click", closeCard);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeCard();
  });
  document.addEventListener("keydown", onKey);

  modal.appendChild(closeBtn);
  modal.appendChild(tabHeader);
  modal.appendChild(tabContent);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  showTab("overview");

  function renderOverview() {
    var html = "<div class='font-mono p-4'>";

    if (bestResult) {
      html += "<div class='flex items-center gap-2 mb-3'>" +
        "<span class='text-lg text-white font-bold'>" + bestResult.score.total + "</span>" +
        "<span class='" + fitClass(bestResult.score.total) + "'>[" + bestResult.score.fitLabel + "]</span>" +
      "</div>";
    }

    html += "<div class='mb-3'>" +
      "<div class='text-base text-white font-bold'>" + escHtml(player.Name) + "</div>" +
      "<div class='text-xs text-[#CCCCCC] mt-0.5'>" +
        (player.Age || "?") + " yrs \u00B7 " + escHtml(player.Nation || player.Nationality || player.Nat || "") + " \u00B7 " + escHtml(player.Club || "") +
      "</div>" +
      "<div class='text-xs text-[#999999] mt-0.5'>" +
        "Wage: " + escHtml(player.WageDisplay || "\u00A30 p/w") + " \u00B7 Value: " + escHtml(player.APDisplay || "\u00A30") +
      "</div>" +
    "</div>";

    html += "<div class='flex flex-wrap gap-1 mb-3'>";
    if (player.Position) {
      html += "<span class='text-xs font-mono border border-[#1F1F1F] text-[#CCCCCC] px-1.5 py-0.5'>" + escHtml(player.Position) + "</span>";
    }
    if (player.Personality) {
      html += "<span class='text-xs font-mono border border-[#1F1F1F] text-[#666666] px-1.5 py-0.5'>" + escHtml(player.Personality) + "</span>";
    }
    if (player["Media Description"]) {
      html += "<span class='text-xs font-mono border border-[#1F1F1F] text-[#666666] px-1.5 py-0.5'>" + escHtml(player["Media Description"]) + "</span>";
    }
    html += "</div>";

    // Playing time stats row (if available)
    if (typeof PlayerUtils !== "undefined") {
      var ptParts = [];
      if (PlayerUtils.getMinutesLoad) {
        var ml = PlayerUtils.getMinutesLoad(player);
        var mlColors = {starter: 'text-emerald-400', rotation: 'text-sky-400', fringe: 'text-amber-400', unused: 'text-gray-500', absent: 'text-red-400'};
        var mlC = mlColors[ml.tier] || 'text-gray-500';
        ptParts.push("<span class='" + mlC + "'>" + ml.raw + " mins</span>");
      }
      if (PlayerUtils.getPerformanceBand && player.AvRat != null) {
        var pb = PlayerUtils.getPerformanceBand(player);
        var pbColors = {elite: 'text-purple-400', strong: 'text-blue-400', decent: 'text-green-400', marginal: 'text-amber-400', poor: 'text-red-400', 'no-data': 'text-gray-600'};
        var pbC = pbColors[pb.band] || 'text-gray-500';
        ptParts.push("<span class='" + pbC + "'>AvRat " + player.AvRat.toFixed(2) + "</span>");
      }
      if (PlayerUtils.getPTDelta) {
        var d = PlayerUtils.getPTDelta(player);
        if (d.delta !== 'N/A') {
          var dirColors = {overperforming: 'text-green-400', underperforming: 'text-red-400', 'on-track': 'text-gray-500', unknown: 'text-gray-600'};
          var dC = dirColors[d.direction] || 'text-gray-500';
          ptParts.push("<span class='" + dC + "'>" + escHtml(d.label) + "</span>");
        }
      }
      if (ptParts.length > 0) {
        html += "<div class='flex flex-wrap gap-2 text-xs mb-3'>" + ptParts.join(" &middot; ") + "</div>";
      }
    }

    html += "<div class='flex gap-4 text-xs mb-3'>" +
      "<div class='flex items-center gap-1'><span class='text-[#666666]'>\u25CB</span> Left: <span style='color:" + footColor(player.LeftFootScore) + "'>" + FOOT_LABELS[player.LeftFootScore] + "</span></div>" +
      "<div class='flex items-center gap-1'><span class='text-[#666666]'>\u25CF</span> Right: <span style='color:" + footColor(player.RightFootScore) + "'>" + FOOT_LABELS[player.RightFootScore] + "</span></div>" +
    "</div>";

    var state = window.FM24State;
    if (state.manager && state.manager.hired && state.manager.windowActive && state.manager.windowStage === 'PART_A_COMPLETE') {
      var isSquad = state.squad && state.squad.some(function(p) { return p.Name === player.Name; });
      var pending = state.manager.partAResult && state.manager.partAResult.pendingDecisions;
      if (pending) {
        if (isSquad) {
          var saleDec = pending.find(function(d) { return d.player && d.player.Name === player.Name && d.type === 'SALE_PROPOSED'; });
          if (saleDec) {
            if (saleDec.dofDecision === 'APPROVE') {
              html += "<div class='mb-3 p-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400 font-bold font-mono text-center'>Requested for Sale (Approved)</div>";
            } else {
              html += "<div class='mb-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400 font-bold font-mono text-center'>Override Sale (Blocked - Go to Ledger to Approve)</div>";
            }
          } else {
            var rec = typeof getManagerRecommendation === 'function' ? getManagerRecommendation(player, player.AP || player.Value || 10000000, state.manager.hired, state.market) : null;
            if (rec) {
              var isSell = rec.decision === 'SELL';
              var badgeColor = isSell ? 'text-green-400 border-green-500/20 bg-green-500/10' : 'text-red-400 border-red-500/20 bg-red-500/10';
              var labelText = isSell ? 'SELL' : 'KEEP';
              html += "<div class='mb-3 border border-[#1F1F1F] rounded bg-backdrop/40 p-2.5 font-mono'>";
              html += "  <div class='flex items-center justify-between mb-1.5'>";
              html += "    <span class='text-[10px] text-[#666666] uppercase font-bold tracking-wider'>Manager Opinion</span>";
              html += "    <span class='text-[10px] font-extrabold px-1.5 py-0.5 rounded border " + badgeColor + "'>" + labelText + "</span>";
              html += "  </div>";
              var reasonText = rec.reasons && rec.reasons.length > 0 ? rec.reasons[0] : 'No comment';
              html += "  <div class='text-[11px] text-[#CCCCCC] leading-relaxed mb-2'>\"" + escHtml(reasonText) + "\"</div>";
              if (isSell) {
                html += "  <button id='modal-request-sell-btn' class='w-full py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded transition-colors font-mono'>Request Transfer Listing (Sell)</button>";
              } else {
                html += "  <button id='modal-request-sell-btn' class='w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded transition-colors font-mono'>Force Transfer Listing (Override)</button>";
              }
              html += "</div>";
            } else {
              html += "<div class='mb-3 text-center'><button id='modal-request-sell-btn' class='w-full py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded transition-colors font-mono'>Request Transfer Listing (Sell)</button></div>";
            }
          }
        } else {
          var targetDec = pending.find(function(d) { return d.player && d.player.Name === player.Name && d.type === 'TARGET_PROPOSED'; });
          if (targetDec) {
            if (targetDec.dofDecision === 'APPROVE') {
              html += "<div class='mb-3 p-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400 font-bold font-mono text-center'>Requested for Signing (Approved)</div>";
            } else {
              html += "<div class='mb-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400 font-bold font-mono text-center'>Override Signing (Blocked - Go to Ledger to Approve)</div>";
            }
          } else {
            var rec = typeof getManagerSigningAdvice === 'function' ? getManagerSigningAdvice(player, state.manager.hired) : null;
            if (rec) {
              var isSign = rec.decision === 'SIGN';
              var badgeColor = isSign ? 'text-green-400 border-green-500/20 bg-green-500/10' : 'text-red-400 border-red-500/20 bg-red-500/10';
              var labelText = isSign ? 'SIGN' : 'AVOID';
              html += "<div class='mb-3 border border-[#1F1F1F] rounded bg-backdrop/40 p-2.5 font-mono'>";
              html += "  <div class='flex items-center justify-between mb-1.5'>";
              html += "    <span class='text-[10px] text-[#666666] uppercase font-bold tracking-wider'>Manager Opinion</span>";
              html += "    <span class='text-[10px] font-extrabold px-1.5 py-0.5 rounded border " + badgeColor + "'>" + labelText + "</span>";
              html += "  </div>";
              var reasonText = rec.reasons && rec.reasons.length > 0 ? rec.reasons[0] : 'No comment';
              html += "  <div class='text-[11px] text-[#CCCCCC] leading-relaxed mb-2'>\"" + escHtml(reasonText) + "\"</div>";
              if (isSign) {
                html += "  <button id='modal-request-sign-btn' class='w-full py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded transition-colors font-mono'>Request Signing (Sign)</button>";
              } else {
                html += "  <button id='modal-request-sign-btn' class='w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded transition-colors font-mono'>Force Signing (Override)</button>";
              }
              html += "</div>";
            } else {
              html += "<div class='mb-3 text-center'><button id='modal-request-sign-btn' class='w-full py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded transition-colors font-mono'>Request Signing (Sign)</button></div>";
            }
          }
        }
      }
    }

    if (bestResult) {
      html += "<div class='mb-3'>";
      var boosts = bestResult.score.tacticBoosts || [];
      var penalties = bestResult.score.tacticPenalties || [];
      var maxBullets = 3;
      var shown = 0;
      for (var bi = 0; bi < boosts.length && shown < maxBullets; bi++, shown++) {
        html += "<div class='text-xs text-[#CCCCCC] font-mono'>\u25B2 " + escHtml(boosts[bi]) + "</div>";
      }
      for (var pi = 0; pi < penalties.length && shown < maxBullets; pi++, shown++) {
        html += "<div class='text-xs text-[#666666] font-mono'>\u25BC " + escHtml(penalties[pi]) + "</div>";
      }
      html += "</div>";
    }

    html += "<div class='card-radar-wrapper'><div id='card-radar' class='card-radar'></div></div>";
    html += "</div>";

    tabContent.innerHTML = html;

    var reqSellBtn = document.getElementById('modal-request-sell-btn');
    if (reqSellBtn) {
      reqSellBtn.addEventListener('click', function() {
        var manager = state.manager.hired;
        if (typeof getManagerRecommendation === 'function' && typeof window.FM24AddManualDecision === 'function') {
          var rec = getManagerRecommendation(player, player.AP || player.Value || 10000000, manager, state.market);
          var minFee = player.AP || player.Value || 10000000;
          if (state.manager.partAResult && state.manager.partAResult.mods) {
            minFee = minFee * state.manager.partAResult.mods.saleFloorMultiplier;
          }
          var isOverride = rec && rec.decision !== 'SELL';
          var baseReason = rec && rec.reasons.length > 0 ? rec.reasons[0] : 'Requested via player card';
          var finalReason = isOverride
            ? 'Manual override: User requested sale (Manager advised keeping: ' + baseReason + ')'
            : 'Manual sale request: ' + baseReason;

          var dec = {
            type: 'SALE_PROPOSED',
            player: player,
            manager: manager,
            reason: finalReason,
            financials: { fee: Math.round(minFee), wage: -(player.Wage || 0), budgetRemaining: state.manager.partAResult.ledger.transferBudget },
            dofDecision: isOverride ? 'BLOCK' : 'APPROVE'
          };
          window.FM24AddManualDecision(dec);
        }
      });
    }

    var reqSignBtn = document.getElementById('modal-request-sign-btn');
    if (reqSignBtn) {
      reqSignBtn.addEventListener('click', function() {
        var manager = state.manager.hired;
        if (typeof getManagerSigningAdvice === 'function' && typeof window.FM24AddManualDecision === 'function') {
          var rec = getManagerSigningAdvice(player, manager);
          var isOverride = rec && rec.decision !== 'SIGN';
          var baseReason = rec && rec.reasons.length > 0 ? rec.reasons[0] : 'Requested via player card';
          var finalReason = isOverride
            ? 'Manual override: User requested signing (Manager advised avoiding: ' + baseReason + ')'
            : 'Manual signing request: ' + baseReason;

          var dec = {
            type: 'TARGET_PROPOSED',
            player: player,
            manager: manager,
            reason: finalReason,
            financials: { fee: player.AP || 0, wage: player.Wage || 0, budgetRemaining: state.manager.partAResult.ledger.transferBudget },
            dofDecision: isOverride ? 'BLOCK' : 'APPROVE',
            contextGapSlot: (rec && rec.slotId) || ''
          };
          window.FM24AddManualDecision(dec);
        }
      });
    }

    if (bestResult) {
      var weights = computeTacticWeights(bestResult.roleId, window.FM24State.tactic.instructions);
      renderRadarChart(document.getElementById("card-radar"), weights, player);
    }
  }

  function renderSlotFits() {
    if (!window.FM24State.tactic.isComplete) {
      tabContent.innerHTML = "<div class='text-xs text-[#666666] font-mono p-4'>Complete your tactic to see fits.</div>";
      return;
    }

    var html = "<div class='font-mono p-4'>";
    html += "<table class='w-full text-xs'>" +
      "<thead><tr class='text-left text-[#666666] uppercase tracking-wider border-b border-[#1F1F1F]'>" +
        "<th class='pb-2 pr-3'>Slot</th><th class='pb-2 pr-3'>Role</th><th class='pb-2 pr-3'>Duty</th><th class='pb-2 pr-3'>Score</th><th class='pb-2'>Fit</th>" +
      "</tr></thead><tbody>";

    for (var i = 0; i < bestFit.length; i++) {
      var r = bestFit[i];
      var s = r.score.total;
      html += "<tr class='border-b border-[#1F1F1F]'>" +
        "<td class='py-1.5 pr-3 text-white'>" + slotDisplayLabel(r.slotId) + "</td>" +
        "<td class='py-1.5 pr-3 text-[#CCCCCC]'>" + escHtml(r.roleName) + "</td>" +
        "<td class='py-1.5 pr-3 text-[#CCCCCC]'>" + escHtml(r.duty) + "</td>" +
        "<td class='py-1.5 pr-3'>" + _renderASCIIBar(s) + "</td>" +
        "<td class='py-1.5 font-bold " + fitClass(s) + "'>[" + r.score.fitLabel + "]</td>" +
      "</tr>";
    }
    html += "</tbody></table>";

    if (bestResult) {
      html += "<div class='mt-3 text-xs text-white font-bold font-mono'>Best Fit: " + escHtml(bestResult.roleName) + " (" + bestResult.duty + ") \u2014 [" + bestResult.score.fitLabel + "]</div>";
      html += "<div class='mt-2'>";
      (bestResult.score.tacticBoosts || []).forEach(function (b) {
        html += "<div class='text-xs text-[#CCCCCC] font-mono'>\u25B2 " + escHtml(b) + "</div>";
      });
      (bestResult.score.tacticPenalties || []).forEach(function (p) {
        html += "<div class='text-xs text-[#666666] font-mono'>\u25BC " + escHtml(p) + "</div>";
      });
      html += "</div>";
    }

    html += "</div>";
    tabContent.innerHTML = html;
  }

  function renderAttrTab() {
    var html = "<div class='font-mono p-4'>";

    var groupKeys = ["Mental", "Physical", "Technical", "Goalkeeping"];

    var highlightAttrs = {};
    if (bestResult) {
      var w = computeTacticWeights(bestResult.roleId, window.FM24State.tactic.instructions);
      Object.keys(w).forEach(function (a) { if (w[a] >= 4) highlightAttrs[a] = true; });
    }

    for (var g = 0; g < groupKeys.length; g++) {
      var groupName = groupKeys[g];
      var attrs = ATTR_GROUPS[groupName];
      html += "<div class='mb-3'><div class='text-xs text-[#666666] uppercase tracking-wider mb-1.5'>" + groupName + "</div><div class='grid grid-cols-3 gap-1'>";
      for (var a = 0; a < attrs.length; a++) {
        var attr = attrs[a];
        var val = player[attr];
        if (val === undefined || val === null || isNaN(val)) val = "-";
        var colorClass = "text-[#666666]";
        if (typeof val === "number") {
          colorClass = val >= 15 ? "text-white font-bold" : (val >= 10 ? "text-[#CCCCCC]" : "text-[#666666]");
        }
        var star = highlightAttrs[attr] ? " \u2605" : "";
        var fullName = ATTR_FULL_NAMES[attr] || attr;
        html += "<div class='flex items-center justify-between bg-[#0A0A0A] border border-[#1F1F1F] rounded px-2 py-1 " + colorClass + "' title='" + fullName + "'>" +
          "<span class='text-xs'>" + attr + "</span>" +
          "<span class='text-xs'>" + val + star + "</span>" +
        "</div>";
      }
      html += "</div></div>";
    }

    html += "</div>";
    tabContent.innerHTML = html;
  }

  function renderRadarChart(container, weights, p) {
    var keys = Object.keys(weights).filter(function (k) { return weights[k] > 0; });
    if (keys.length < 3) {
      container.innerHTML = "<div class='radar-fallback'>Not enough weighted attributes for radar.</div>";
      return;
    }

    var N = keys.length;
    var CX = 150, CY = 150, R = 100;
    var viewBox = "0 0 300 300";

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("class", "radar-svg");

    var rings = [0.2, 0.4, 0.6, 0.8, 1.0];
    for (var ri = 0; ri < rings.length; ri++) {
      var pts = [];
      for (var i = 0; i < N; i++) {
        var ang = (2 * Math.PI * i / N) - Math.PI / 2;
        var px = CX + R * rings[ri] * Math.cos(ang);
        var py = CY + R * rings[ri] * Math.sin(ang);
        pts.push(px + "," + py);
      }
      var poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      poly.setAttribute("points", pts.join(" "));
      poly.setAttribute("fill", "none");
      poly.setAttribute("stroke", "#1F1F1F");
      poly.setAttribute("stroke-width", "1");
      svg.appendChild(poly);
    }

    for (var i = 0; i < N; i++) {
      var ang = (2 * Math.PI * i / N) - Math.PI / 2;
      var ex = CX + R * Math.cos(ang);
      var ey = CY + R * Math.sin(ang);

      var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", CX);
      line.setAttribute("y1", CY);
      line.setAttribute("x2", ex);
      line.setAttribute("y2", ey);
      line.setAttribute("stroke", "#1F1F1F");
      line.setAttribute("stroke-width", "1");
      svg.appendChild(line);

      var lx = CX + (R + 18) * Math.cos(ang);
      var ly = CY + (R + 18) * Math.sin(ang);
      var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", lx);
      text.setAttribute("y", ly);
      var anchor = "middle";
      if (Math.cos(ang) > 0.15) anchor = "start";
      else if (Math.cos(ang) < -0.15) anchor = "end";
      text.setAttribute("text-anchor", anchor);
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("fill", "#CCCCCC");
      text.setAttribute("font-size", "9");
      text.textContent = keys[i];
      text.setAttribute("title", ATTR_FULL_NAMES[keys[i]] || keys[i]);
      svg.appendChild(text);
    }

    var dataPts = [];
    for (var i = 0; i < N; i++) {
      var pv = p[keys[i]];
      if (pv === undefined || pv === null || isNaN(pv)) pv = 0;
      pv = Math.max(0, Math.min(20, pv));
      var ang = (2 * Math.PI * i / N) - Math.PI / 2;
      var dr = (pv / 20) * R;
      var dx = CX + dr * Math.cos(ang);
      var dy = CY + dr * Math.sin(ang);
      dataPts.push(dx + "," + dy);
    }

    var dataPoly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    dataPoly.setAttribute("points", dataPts.join(" "));
    dataPoly.setAttribute("fill", "rgba(255,255,255,0.08)");
    dataPoly.setAttribute("stroke", "#FFFFFF");
    dataPoly.setAttribute("stroke-width", "1.5");
    svg.appendChild(dataPoly);

    for (var i = 0; i < N; i++) {
      var pv = p[keys[i]];
      if (pv === undefined || pv === null || isNaN(pv)) pv = 0;
      pv = Math.max(0, Math.min(20, pv));
      var ang = (2 * Math.PI * i / N) - Math.PI / 2;
      var dr = (pv / 20) * R;
      var dx = CX + dr * Math.cos(ang);
      var dy = CY + dr * Math.sin(ang);
      var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", dx);
      dot.setAttribute("cy", dy);
      dot.setAttribute("r", "3");
      dot.setAttribute("fill", "#FFFFFF");
      svg.appendChild(dot);
    }

    container.innerHTML = "";
    container.appendChild(svg);
  }
}



/* ── ATTRIBUTE FULL NAMES ── */

var ATTR_FULL_NAMES = {
  "1v1": "One on Ones", Acc: "Acceleration", Aer: "Aerial", Agg: "Aggression",
  Agi: "Agility", Ant: "Anticipation", Bal: "Balance", Bra: "Bravery",
  Cmd: "Command of Area", Cnt: "Concentration", Cmp: "Composure",
  Cor: "Corners", Cro: "Crossing", Dec: "Decisions", Det: "Determination",
  Dri: "Dribbling", Ecc: "Eccentricity", Fin: "Finishing", Fir: "First Touch",
  Fla: "Flair", Fre: "Free Kicks", Han: "Handling", Hea: "Heading",
  Jum: "Jumping Reach", Kic: "Kicking", Ldr: "Leadership", Lon: "Long Shots",
  Mar: "Marking", OtB: "Off the Ball", Pac: "Pace", Pas: "Passing",
  Pos: "Positioning", Pun: "Punching", Ref: "Reflexes", Sta: "Stamina",
  Str: "Strength", Tck: "Tackling", Tea: "Teamwork", Tec: "Technique",
  Thr: "Throwing", TRO: "Tendency to Rush Out", Vis: "Vision", Wor: "Work Rate",
  Com: "Composure Under Pressure", Cons: "Consistency", Prof: "Professionalism",
  "Imp M": "Important Matches"
};

/* ── HELPERS ── */

function escHtml(s) {
  if (typeof s !== "string") return s;
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function footColor(score) {
  if (score >= 4) return "#FFFFFF";
  if (score === 3) return "#CCCCCC";
  return "#666666";
}

function fitClass(score) {
  if (score >= 85) return "text-white font-bold";
  if (score >= 70) return "text-white font-bold";
  if (score >= 55) return "text-[#CCCCCC]";
  if (score >= 40) return "text-[#666666]";
  return "text-[#666666]";
}