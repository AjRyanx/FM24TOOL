// ─── BID & TRANSFER CONSULTATION MODULE ───

function renderBidConsultation(containerId) {
  var container = document.getElementById(containerId || "bid-consultation-container");
  if (!container) return;

  var state = window.FM24State;
  var manager = state.manager.hired;
  var squad = state.squad;
  var market = state.market;

  if (!manager) {
    container.innerHTML = "";
    return;
  }

  // Active mode state
  if (window.FM24ConsultMode === undefined) {
    window.FM24ConsultMode = 'sale';
  }

  var html = "";
  html += '<div class="bg-surface border border-border/60 rounded-xl p-5 mt-6 relative">';
  html += '  <h3 class="text-xs font-bold text-white uppercase tracking-wider mb-1">Bid & Transfer Consultation</h3>';
  html += '  <p class="text-[11px] text-text-muted mb-4">Consult your manager on potential signings or squad listings to make manual transfer choices.</p>';

  // Tab Header
  html += '  <div class="flex gap-2 mb-4 border-b border-border/40 pb-2">';
  html += '    <button id="consult-tab-sale" class="text-xs px-3 py-1 font-bold rounded ' + (window.FM24ConsultMode === 'sale' ? 'bg-blue-600 text-white' : 'bg-transparent text-text-muted hover:text-white') + ' border border-transparent transition-all">Consult Sale (Squad)</button>';
  html += '    <button id="consult-tab-sign" class="text-xs px-3 py-1 font-bold rounded ' + (window.FM24ConsultMode === 'sign' ? 'bg-blue-600 text-white' : 'bg-transparent text-text-muted hover:text-white') + ' border border-transparent transition-all">Consult Sign (Market)</button>';
  html += '  </div>';

  // Sub-panel Container
  html += '  <div id="consult-subpanel-content"></div>';
  html += '  <div id="consult-result" class="hidden mt-4"></div>';
  html += '</div>';

  container.innerHTML = html;

  var subpanel = document.getElementById("consult-subpanel-content");
  var resultEl = document.getElementById("consult-result");

  function switchTab(mode) {
    window.FM24ConsultMode = mode;
    var tabSale = document.getElementById("consult-tab-sale");
    var tabSign = document.getElementById("consult-tab-sign");
    if (tabSale && tabSign) {
      if (mode === 'sale') {
        tabSale.className = "text-xs px-3 py-1 font-bold rounded bg-blue-600 text-white border border-transparent transition-all";
        tabSign.className = "text-xs px-3 py-1 font-bold rounded bg-transparent text-text-muted hover:text-white border border-transparent transition-all";
      } else {
        tabSale.className = "text-xs px-3 py-1 font-bold rounded bg-transparent text-text-muted hover:text-white border border-transparent transition-all";
        tabSign.className = "text-xs px-3 py-1 font-bold rounded bg-blue-600 text-white border border-transparent transition-all";
      }
    }
    resultEl.innerHTML = "";
    resultEl.classList.add("hidden");
    renderSubpanel();
  }

  document.getElementById("consult-tab-sale").addEventListener("click", function() { switchTab('sale'); });
  document.getElementById("consult-tab-sign").addEventListener("click", function() { switchTab('sign'); });

  function renderSubpanel() {
    if (window.FM24ConsultMode === 'sale') {
      var sHtml = "";
      sHtml += '  <div class="flex flex-col md:flex-row gap-3">';
      sHtml += '    <div class="flex-1">';
      sHtml += '      <label class="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Squad Player</label>';
      sHtml += '      <select id="consult-player-select" class="w-full text-xs bg-backdrop border border-border rounded px-3 py-2 text-white">';
      sHtml += '        <option value="">\u2014 Select player \u2014</option>';
      if (squad) {
        for (var i = 0; i < squad.length; i++) {
          var p = squad[i];
          var label = (p.Name || "Unknown") + " \u00b7 " + (p.Age || "?") + " \u00b7 " + (p.Position || "");
          sHtml += '        <option value="' + i + '">' + escHtml(label) + '</option>';
        }
      }
      sHtml += '      </select>';
      sHtml += '    </div>';
      sHtml += '    <div class="w-full md:w-44">';
      sHtml += '      <label class="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Expected Offer (\u00a3)</label>';
      sHtml += '      <input type="number" id="consult-bid-amount" class="w-full text-xs bg-backdrop border border-border rounded px-3 py-2 text-white" placeholder="e.g. 15000000" min="0">';
      sHtml += '    </div>';
      sHtml += '    <div class="flex items-end">';
      sHtml += '      <button id="consult-submit-btn" class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed" disabled>Consult Manager</button>';
      sHtml += '    </div>';
      sHtml += '  </div>';

      subpanel.innerHTML = sHtml;

      var select = document.getElementById("consult-player-select");
      var bidInput = document.getElementById("consult-bid-amount");
      var submitBtn = document.getElementById("consult-submit-btn");

      function updateButton() {
        submitBtn.disabled = !(select.value !== "" && bidInput.value && parseInt(bidInput.value, 10) > 0);
      }

      select.addEventListener("change", function() {
        var idx = parseInt(select.value, 10);
        var player = squad[idx];
        if (player) {
          bidInput.value = player.AP || player.Value || "";
        }
        updateButton();
      });
      bidInput.addEventListener("input", updateButton);

      submitBtn.addEventListener("click", function () {
        var idx = parseInt(select.value, 10);
        var player = squad[idx];
        var bidAmount = parseInt(bidInput.value, 10);
        if (!player || !bidAmount) return;
        var rec = getManagerRecommendation(player, bidAmount, manager, market);
        renderConsultationResult(resultEl, rec, player, bidAmount, manager);
        resultEl.classList.remove("hidden");
      });
    } else {
      // Sign mode
      var sHtml = "";
      sHtml += '  <div class="relative">';
      sHtml += '    <label class="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Search Market Player</label>';
      sHtml += '    <input type="text" id="consult-search-market" placeholder="Type player name to search..." class="w-full text-xs bg-backdrop border border-border rounded px-3 py-2 text-white" autocomplete="off">';
      sHtml += '    <div id="consult-search-results" class="hidden absolute left-0 right-0 z-50 bg-surface border border-border rounded mt-1 max-h-48 overflow-y-auto shadow-lg"></div>';
      sHtml += '  </div>';

      subpanel.innerHTML = sHtml;

      var searchInput = document.getElementById("consult-search-market");
      var searchResults = document.getElementById("consult-search-results");

      searchInput.addEventListener("input", function() {
        var val = searchInput.value.toLowerCase().trim();
        if (!val || !market) {
          searchResults.classList.add("hidden");
          return;
        }

        var matches = market.filter(function(p) {
          return p.Name && p.Name.toLowerCase().indexOf(val) !== -1;
        }).slice(0, 10);

        if (matches.length === 0) {
          searchResults.innerHTML = '<div class="p-2 text-xs text-text-muted">No players found</div>';
        } else {
          var itemsHtml = "";
          matches.forEach(function(p) {
            var label = (p.Name || "Unknown") + " \u00b7 " + (p.Age || "?") + "y \u00b7 CA " + (p.CA || "?") + " \u00b7 " + (p.Position || "");
            itemsHtml += '<div class="p-2 text-xs text-white hover:bg-blue-600/20 cursor-pointer border-b border-border/20 last:border-b-0" data-name="' + escHtml(p.Name) + '">' + escHtml(label) + '</div>';
          });
          searchResults.innerHTML = itemsHtml;
        }
        searchResults.classList.remove("hidden");
      });

      // Hide results on click outside
      var outsideClick = function(e) {
        if (e.target !== searchInput && e.target !== searchResults) {
          searchResults.classList.add("hidden");
          document.removeEventListener("click", outsideClick);
        }
      };
      
      searchInput.addEventListener("focus", function() {
        document.addEventListener("click", outsideClick);
      });

      searchResults.addEventListener("click", function(e) {
        var target = e.target;
        if (target.hasAttribute("data-name")) {
          var name = target.getAttribute("data-name");
          var player = market.find(function(p) { return p.Name === name; });
          if (player) {
            searchInput.value = player.Name;
            searchResults.classList.add("hidden");
            var rec = getManagerSigningAdvice(player, manager);
            renderSigningResult(resultEl, rec, player, manager);
            resultEl.classList.remove("hidden");
          }
        }
      });
    }
  }

  renderSubpanel();
}

function getManagerRecommendation(player, bidAmount, manager, market) {
  if (!player || !manager) return null;

  var archetype = typeof resolveTransferArchetype === "function" ? resolveTransferArchetype(manager) : "OPPORTUNIST";
  var tacticalArch = typeof deriveArchetype === "function" ? deriveArchetype(manager) : "";

  var age = player.Age || 0;
  var ca = player.CA || 0;
  var pa = player.PA || 0;
  var ap = player.AP || player.Value || 0;
  var fitScore = getPlayerFitScore(player);
  var squadStatus = getSquadStatus(player);

  var decision = "REJECT";
  var reasons = [];
  var wantsReplacement = false;
  var replacementPrefs = {};

  switch (archetype) {
    case "DEVELOPER": {
      var isYoung = age <= 21;
      var hasUpside = pa > ca + 10;
      var isOld = age >= 25;
      var isSurplus = squadStatus === "surplus";
      var isStarter = squadStatus === "starter";

      if (isYoung && hasUpside) {
        decision = "REJECT";
        if (age <= 20) reasons.push("Exceptional young talent with room to grow");
        else reasons.push("Significant development potential still to unlock");
        if (isStarter) reasons.push("Already contributing at first-team level");
      } else if (isOld && isSurplus) {
        decision = "SELL";
        wantsReplacement = true;
        replacementPrefs = { maxAge: 24, prioritizePA: true };
        reasons.push("Ageing non-starter with limited upside");
        if (bidAmount >= ap * 0.85) reasons.push("Strong offer for a player past his peak");
      } else if (isSurplus && age >= 22 && fitScore < 13) {
        decision = "SELL";
        wantsReplacement = true;
        replacementPrefs = { maxAge: 24, prioritizePA: true };
        reasons.push("Below threshold and not getting younger \u2014 time to reinvest");
      } else if (isStarter && age >= 28) {
        decision = "SELL";
        wantsReplacement = true;
        replacementPrefs = { maxAge: 24, prioritizePA: true };
        reasons.push("Starter approaching decline \u2014 sell while value holds");
      } else {
        decision = "REJECT";
        if (isStarter) reasons.push("Key squad member with strong tactical fit");
        else if (!hasUpside) reasons.push("Better to develop than sell at this stage");
        else reasons.push("Worth keeping for squad depth");
      }
      break;
    }

    case "RECYCLER": {
      var isVeteran = age >= 30;
      var isLowCA = ca < 140;

      if (isVeteran || (isLowCA && squadStatus !== "starter")) {
        decision = "SELL";
        wantsReplacement = squadStatus === "starter";
        replacementPrefs = { minAge: 27, prioritizeCA: true };
        reasons.push(isVeteran ? "Veteran at the tail end of his career" : "Limited quality for this level");
        if (bidAmount >= ap * 0.8) reasons.push("Fair value for a player of his vintage");
      } else if (isLowCA && squadStatus === "starter") {
        decision = "SELL";
        wantsReplacement = true;
        replacementPrefs = { minAge: 27, prioritizeCA: true };
        reasons.push("A stopgap at best \u2014 upgrade needed");
      } else {
        decision = "REJECT";
        reasons.push("Still has productive years left in him");
        if (squadStatus === "starter") reasons.push("Reliable starter doing the job");
      }
      break;
    }

    case "STATESMAN": {
      if (squadStatus === "surplus" && age >= 30 && ca < 140) {
        decision = "SELL";
        wantsReplacement = false;
        reasons.push("Clear surplus \u2014 no room for sentiment");
      } else {
        decision = "REJECT";
        if (squadStatus === "starter") reasons.push("Core member of the squad \u2014 I value loyalty");
        else if (age <= 26) reasons.push("Young \u2014 worth persisting with");
        else reasons.push("I value stability over short-term gain");
      }
      break;
    }

    case "SELL_TO_BUY": {
      if (squadStatus !== "starter" || bidAmount >= ap * 0.8) {
        decision = "SELL";
        wantsReplacement = true;
        replacementPrefs = { bestValue: true };
        reasons.push("Funds needed to strengthen the squad elsewhere");
      } else {
        decision = "REJECT";
        reasons.push("Too important without a replacement lined up");
      }
      break;
    }

    case "IDENTITY_ARCHITECT": {
      if (fitScore < 12 || squadStatus === "surplus") {
        decision = "SELL";
        wantsReplacement = true;
        replacementPrefs = { prioritizeFit: true };
        reasons.push("Doesn't fit our tactical identity");
      } else {
        decision = "REJECT";
        reasons.push("Fits the system \u2014 hard to replace that");
      }
      break;
    }

    case "OPPORTUNIST": {
      if (bidAmount >= ap * 0.9) {
        decision = "SELL";
        wantsReplacement = bidAmount >= ap * 1.1 && squadStatus === "starter";
        replacementPrefs = { bestValue: true };
        reasons.push("Excellent profit \u2014 too good to turn down");
      } else if (bidAmount >= ap * 0.7) {
        decision = "SELL";
        reasons.push("Decent offer \u2014 I'd take it");
      } else {
        decision = "REJECT";
        reasons.push("Below market value \u2014 we can do better");
      }
      break;
    }

    case "PHILOSOPHER": {
      var prof = player.Prof || player.Professionalism || 10;
      var det = player.Det || player.Determination || 10;
      var hasCharacter = prof >= 14 || det >= 14;

      if (!hasCharacter && (squadStatus === "surplus" || fitScore < 12)) {
        decision = "SELL";
        wantsReplacement = true;
        replacementPrefs = { highCharacter: true };
        reasons.push("Doesn't meet our character standards");
      } else if (!hasCharacter) {
        decision = "SELL";
        wantsReplacement = true;
        replacementPrefs = { highCharacter: true };
        reasons.push("Wrong mentality \u2014 replace with a model professional");
      } else {
        decision = "REJECT";
        reasons.push("High character player \u2014 exactly what we need");
      }
      break;
    }

    case "PRESSURE_BUYER": {
      if (squadStatus === "surplus") {
        decision = "SELL";
        reasons.push("Surplus \u2014 frees up budget for other moves");
      } else if (squadStatus === "backup" && bidAmount >= ap * 0.85) {
        decision = "SELL";
        wantsReplacement = true;
        replacementPrefs = { urgent: true };
        reasons.push("Good offer for a backup \u2014 we can cover");
      } else {
        decision = "REJECT";
        reasons.push("Creates too big a gap in the squad");
      }
      break;
    }

    default: {
      if (squadStatus === "surplus" && bidAmount >= ap * 0.75) {
        decision = "SELL";
        reasons.push("Surplus player, fair offer");
      } else {
        decision = "REJECT";
        reasons.push("Better to keep for squad depth");
      }
    }
  }

  // Find replacement if applicable
  var replacement = null;
  if (decision === "SELL" && wantsReplacement && market && market.length > 0) {
    replacement = findReplacement(player, market, replacementPrefs, manager);
  }

  return {
    decision: decision,
    reasons: reasons,
    archetype: archetype,
    tacticalArch: tacticalArch,
    squadStatus: squadStatus,
    fitScore: fitScore,
    wantsReplacement: wantsReplacement,
    replacement: replacement,
    ca: ca,
    pa: pa,
    ap: ap,
    age: age
  };
}

function getSquadStatus(player) {
  var state = window.FM24State;
  var name = player.Name || "";

  var trV2 = state.manager.transferResultV2;
  if (trV2 && trV2.designations) {
    for (var i = 0; i < trV2.designations.length; i++) {
      var d = trV2.designations[i];
      if ((d.player.Name || "") === name) {
        if (d.designation === "Keep" && d.reason && d.reason.indexOf("Starting XI") !== -1) return "starter";
        if (d.designation === "Depth") return "backup";
        if (d.designation === "Sell") return "surplus";
        if (d.designation === "Keep") return "backup";
      }
    }
  }

  if (state.manager.squadDesignations && state.manager.squadDesignations.length > 0) {
    for (var j = 0; j < state.manager.squadDesignations.length; j++) {
      var sd = state.manager.squadDesignations[j];
      if ((sd.player.Name || "") === name) {
        if (sd.designation === "Keep" && sd.reason && sd.reason.indexOf("Starting XI") !== -1) return "starter";
        if (sd.designation === "Depth") return "backup";
        if (sd.designation === "Sell") return "surplus";
        if (sd.designation === "Keep") return "backup";
      }
    }
  }

  return "unknown";
}

function getPlayerFitScore(player) {
  var state = window.FM24State;
  var name = player.Name || "";

  var trV2 = state.manager.transferResultV2;
  if (trV2 && trV2.designations) {
    for (var i = 0; i < trV2.designations.length; i++) {
      var d = trV2.designations[i];
      if ((d.player.Name || "") === name && d.score) return d.score;
    }
  }

  if (state.manager.squadDesignations && state.manager.squadDesignations.length > 0) {
    for (var j = 0; j < state.manager.squadDesignations.length; j++) {
      var sd = state.manager.squadDesignations[j];
      if ((sd.player.Name || "") === name && sd.score) return sd.score;
    }
  }

  var ca = player.CA || 0;
  if (ca > 0) return Math.round((ca / 200) * 20 * 10) / 10;
  return null;
}

function findReplacement(player, market, prefs, manager) {
  if (!market || market.length === 0) return null;

  var posStr = player.Position || "";
  var playerPositions = null;
  if (typeof parsePositions === "function") {
    playerPositions = parsePositions(posStr);
  }

  var scored = [];
  for (var i = 0; i < market.length; i++) {
    var m = market[i];
    var mPos = m.Position || "";
    var mAge = m.Age || 99;
    var mCA = m.CA || 0;
    var mPA = m.PA || 0;

    // Filter by age preferences
    if (prefs.maxAge && mAge > prefs.maxAge) continue;
    if (prefs.minAge && mAge < prefs.minAge) continue;

    // Check position overlap
    if (playerPositions && typeof parsePositions === "function") {
      var mPositions = parsePositions(mPos);
      var overlap = false;
      for (var s = 0; s < playerPositions.strata.length; s++) {
        if (mPositions.strata.indexOf(playerPositions.strata[s]) !== -1) {
          overlap = true;
          break;
        }
      }
      if (!overlap) continue;
    }

    // Score
    var score = 0;
    if (prefs.prioritizeFit && typeof scorePlayerForRole === "function") {
      var tactic = window.FM24State.tactic;
      if (tactic && tactic.formation) {
        var slots = tactic.slots || {};
        for (var slotId in slots) {
          var roleId = slots[slotId] && slots[slotId].roleId;
          if (roleId) {
            score = Math.max(score, scorePlayerForRole(m, roleId, tactic.instructions));
          }
        }
      }
    }
    if (prefs.prioritizePA) score += mPA * 0.05;
    if (prefs.prioritizeCA) score += mCA * 0.05;
    if (prefs.bestValue) score += mCA * 0.03;

    var ap = m.AP || m.Value || 0;
    scored.push({ player: m, score: score, ap: ap, age: mAge, ca: mCA });
  }

  if (scored.length === 0) return null;

  scored.sort(function (a, b) { return b.score - a.score; });
  var best = scored[0];

  return {
    name: best.player.Name || best.player.name || "Unknown",
    age: best.age,
    ca: best.ca,
    ap: best.ap,
    position: best.player.Position || "",
    fitScore: prefs.prioritizeFit && best.score > 0 ? Math.round(best.score * 10) / 10 : null
  };
}

function renderConsultationResult(container, rec, player, bidAmount, manager) {
  if (!rec) {
    container.innerHTML = '<p class="text-xs text-red-400">Could not generate recommendation.</p>';
    return;
  }

  var isSell = rec.decision === "SELL";
  var badgeColor = isSell ? "text-green-400 border-green-500/20 bg-green-500/10" : "text-red-400 border-red-500/20 bg-red-500/10";
  var badgeIcon = isSell ? "SELL" : "REJECT";
  var archLabel = rec.archetype.replace(/_/g, " ");

  var html = "";
  html += '<div class="border border-border/40 rounded-lg overflow-hidden animate-fade-in">';

  // Header
  html += '  <div class="bg-backdrop/40 px-4 py-3 border-b border-border/40 flex items-center justify-between">';
  html += '    <div class="flex items-center gap-2">';
  html += '      <span class="text-sm font-extrabold text-white">' + escHtml(manager.Name || "") + '</span>';
  html += '      <span class="text-[9px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">' + escHtml(archLabel) + '</span>';
  if (rec.tacticalArch) {
    html += '      <span class="text-[9px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 font-semibold border border-green-500/20">' + escHtml(rec.tacticalArch) + '</span>';
  }
  html += '    </div>';
  html += '    <span class="text-base font-black ' + (isSell ? 'text-green-400' : 'text-red-400') + ' px-3 py-1 rounded border ' + badgeColor + '">' + badgeIcon + '</span>';
  html += '  </div>';

  // Body
  html += '  <div class="p-4 space-y-3">';
  html += '    <p class="text-xs text-text-secondary leading-relaxed">"' + getManagerQuote(rec, player, bidAmount) + '"</p>';

  // Player details
  html += '    <div class="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-text-muted border-t border-border/20 pt-3">';
  html += '      <span><span class="text-text-secondary">Age:</span> ' + rec.age + '</span>';
  html += '      <span><span class="text-text-secondary">CA:</span> ' + rec.ca + '</span>';
  html += '      <span><span class="text-text-secondary">PA:</span> ' + (rec.pa || "?") + '</span>';
  html += '      <span><span class="text-text-secondary">Value:</span> \u00a3' + formatCurrency(rec.ap) + '</span>';
  if (rec.fitScore) html += '      <span><span class="text-text-secondary">Fit:</span> ' + rec.fitScore.toFixed(1) + '</span>';
  html += '      <span><span class="text-text-secondary">Status:</span> ' + rec.squadStatus.charAt(0).toUpperCase() + rec.squadStatus.slice(1) + '</span>';
  html += '      <span><span class="text-text-secondary">Bid:</span> \u00a3' + formatCurrency(bidAmount) + '</span>';
  html += '    </div>';

  // Playing time evidence block
  if (typeof PlayerUtils !== "undefined") {
    var ptEvidence = '';
    if (PlayerUtils.getPTDelta) {
      var pd = PlayerUtils.getPTDelta(player);
      if (pd.delta !== 'N/A') ptEvidence += '<span class="' + (pd.direction === 'underperforming' ? 'text-red-400' : pd.direction === 'overperforming' ? 'text-green-400' : 'text-text-muted') + '">' + escHtml(pd.label) + '</span>';
    }
    if (PlayerUtils.getMinutesLoad) {
      var ml = PlayerUtils.getMinutesLoad(player);
      ptEvidence += ptEvidence ? ' &middot; ' : '';
      ptEvidence += ml.raw + ' mins (' + ml.tier + ')';
    }
    if (PlayerUtils.getPerformanceBand) {
      var pb = PlayerUtils.getPerformanceBand(player);
      ptEvidence += ptEvidence ? ' &middot; ' : '';
      ptEvidence += pb.band + (player.AvRat != null ? ' ' + player.AvRat.toFixed(2) : '');
    }
    if (ptEvidence) {
      html += '    <div class="text-[10px] text-text-muted border-t border-border/20 pt-2 mt-1">';
      html += '      <span class="text-text-secondary uppercase tracking-wider font-bold">Playing Time:</span> ' + ptEvidence;
      html += '    </div>';
    }
  }

  // Replacement suggestion
  if (rec.replacement) {
    var r = rec.replacement;
    html += '    <div class="border border-border/30 rounded-lg bg-surface/50 p-3 mt-1">';
    html += '      <div class="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-2">\u2192 Suggested Replacement</div>';
    html += '      <div class="flex items-center justify-between">';
    html += '        <div class="flex items-center gap-2">';
    html += '          <span class="text-xs text-white font-semibold">' + escHtml(r.name) + '</span>';
    html += '          <span class="text-[10px] text-text-muted">' + escHtml(r.position) + ' \u00b7 ' + r.age + 'y</span>';
    html += '        </div>';
    html += '        <div class="flex items-center gap-3">';
    if (r.fitScore) html += '          <span class="text-xs text-green-400 font-bold">Fit: ' + r.fitScore.toFixed(1) + '</span>';
    html += '          <span class="text-xs text-text-secondary font-mono">\u00a3' + formatCurrency(r.ap) + '</span>';
    html += '        </div>';
    html += '      </div>';
    html += '    </div>';
  }

  // Add Sale button if in active window and stage is PART_A_COMPLETE
  var state = window.FM24State;
  if (isSell && state.manager.windowActive && state.manager.windowStage === 'PART_A_COMPLETE') {
    var isAlreadySale = state.manager.partAResult.pendingDecisions.some(function(d) {
      return d.player && d.player.Name === player.Name && d.type === 'SALE_PROPOSED';
    });

    html += '    <div class="flex justify-end pt-2 border-t border-border/20">';
    if (isAlreadySale) {
      html += '      <span class="text-xs text-green-400 font-semibold flex items-center gap-1"><i class="fas fa-check"></i> Already in Sale List</span>';
    } else {
      if (rec.decision === "SELL") {
        html += '      <button id="add-to-sales-btn" class="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded transition-colors">Request Sale (Add to Sales)</button>';
      } else {
        html += '      <button id="add-to-sales-btn" class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded transition-colors">Override &amp; Request Sale</button>';
      }
    }
    html += '    </div>';
  }

  html += '  </div>';
  html += '</div>';

  container.innerHTML = html;

  // Bind add button handler
  var addSaleBtn = document.getElementById("add-to-sales-btn");
  if (addSaleBtn) {
    addSaleBtn.addEventListener("click", function() {
      if (typeof window.FM24AddManualDecision === "function") {
        var mods = (state.manager.partAResult && state.manager.partAResult.mods) || { saleFloorMultiplier: 0.85 };
        var minFee = bidAmount || player.AP * mods.saleFloorMultiplier;
        var isOverride = rec.decision !== "SELL";
        var baseReason = rec.reasons.length > 0 ? rec.reasons[0] : 'Tactical surplus / age profile';
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
        renderConsultationResult(container, rec, player, bidAmount, manager);
      }
    });
  }
}

function getManagerQuote(rec, player, bidAmount) {
  var name = player.Name || "this player";
  var age = rec.age;
  var reasons = rec.reasons || [];
  var reasonText = reasons.length > 0 ? reasons[0].toLowerCase() : "";

  var quotes = {
    DEVELOPER: {
      SELL: "At " + age + ", " + name + " is " + reasonText + ". " +
            (rec.replacement ? "I'd look at a younger option to reinvest in." : "I'd let him go."),
      REJECT: name + " is " + reasonText + ". " +
            (age <= 21 ? "I want to see how he develops." : "We shouldn't rush this.") +
            (rec.squadStatus === "starter" ? " He's part of the long-term plan." : "")
    },
    RECYCLER: {
      SELL: name + " is " + reasonText + ". " +
            (rec.squadStatus === "starter" ? "We'd need a ready-made replacement." : "Time to move on."),
      REJECT: name + " " + reasonText + ". I'm not ready to let go."
    },
    STATESMAN: {
      SELL: "If the board insists, but " + name + " has been a loyal servant. " + reasonText + ".",
      REJECT: name + " is " + reasonText + ". I want to keep the core together."
    },
    SELL_TO_BUY: {
      SELL: name + " can go. " + reasonText + ". " +
            (rec.replacement ? "I've got my eye on a replacement." : "Let's free up the budget."),
      REJECT: name + " is " + reasonText + ". Not without a plan."
    },
    IDENTITY_ARCHITECT: {
      SELL: name + " " + reasonText + ". " +
            (rec.replacement ? "I've identified a better system fit." : "We need someone who fits the system."),
      REJECT: name + " " + reasonText + ". I won't disrupt the tactical balance."
    },
    OPPORTUNIST: {
      SELL: bidAmount >= (rec.ap || 0) * 0.9
        ? name + " is " + reasonText + ". Let's take the money and run."
        : name + " — " + reasonText + ". Decent business.",
      REJECT: name + " — " + reasonText + ". We'll wait for a better one."
    },
    PHILOSOPHER: {
      SELL: name + " " + reasonText + ". I want high-character individuals in this squad.",
      REJECT: name + " is " + reasonText + ". That's the kind of player I build around."
    },
    PRESSURE_BUYER: {
      SELL: name + " is " + reasonText + ". " +
            (rec.replacement ? "Let's get someone in quickly." : "We'll manage without."),
      REJECT: name + " " + reasonText + ". I can't afford to weaken the squad."
    }
  };

  var arch = rec.archetype;
  var archQuotes = quotes[arch];
  if (archQuotes && archQuotes[rec.decision]) {
    return archQuotes[rec.decision];
  }

  // Fallback
  if (rec.decision === "SELL") return name + " is " + reasonText + ". I'd accept the offer.";
  return name + " is " + reasonText + ". I'd turn it down.";
}

function getManagerSigningAdvice(player, manager) {
  if (!player || !manager) return null;

  var archetype = typeof resolveTransferArchetype === "function" ? resolveTransferArchetype(manager) : "OPPORTUNIST";
  var tacticalArch = typeof deriveArchetype === "function" ? deriveArchetype(manager) : "";

  var age = player.Age || 0;
  var ca = player.CA || 0;
  var pa = player.PA || 0;
  var ap = player.AP || player.Value || 0;

  // Find best tactic fit
  var bestFit = typeof findBestTacticFitForPlayer === "function" ? findBestTacticFitForPlayer(player) : [];
  var fitScore = (bestFit && bestFit.length > 0) ? bestFit[0].score.total : (ca > 0 ? Math.round((ca / 200) * 20 * 10) / 10 : 0);
  var slotId = (bestFit && bestFit.length > 0) ? bestFit[0].slotId : null;

  var decision = "AVOID";
  var reasons = [];

  // Determine tactical compatibility
  var hasGoodFit = fitScore >= 13;
  var isPerfectFit = fitScore >= 16;

  // Check gaps
  var squadGaps = (window.FM24State.manager && window.FM24State.manager.partAResult && window.FM24State.manager.partAResult.audit && window.FM24State.manager.partAResult.audit.unresolved) || [];
  var isFillingGap = false;
  if (slotId) {
    isFillingGap = squadGaps.some(function (g) { return g.slotId === slotId; });
  }

  switch (archetype) {
    case "DEVELOPER": {
      var isYoungProspect = age <= 22 && pa >= 145 && pa > ca + 15;
      if (isYoungProspect && fitScore >= 11) {
        decision = "SIGN";
        reasons.push("Incredible young talent with massive room for development");
      } else if (fitScore >= 14 && age <= 24) {
        decision = "SIGN";
        reasons.push("Young player who aligns nicely with our blueprint");
      } else if (age >= 28) {
        decision = "AVOID";
        reasons.push("Too old for our squad-building model");
      } else {
        decision = "AVOID";
        reasons.push("Doesn't offer the developmental upside I look for");
      }
      break;
    }
    case "RECYCLER": {
      if (ca >= 140 && age >= 25 && age <= 31 && fitScore >= 13) {
        decision = "SIGN";
        reasons.push("Experienced player in his peak years who fits our style");
      } else if (age <= 21) {
        decision = "AVOID";
        reasons.push("A bit too raw for our immediate first-team requirements");
      } else {
        decision = "AVOID";
        reasons.push("Doesn't match the profile of immediate first-team quality");
      }
      break;
    }
    case "STATESMAN": {
      if (age >= 26 && ca >= 145 && fitScore >= 12) {
        decision = "SIGN";
        reasons.push("Proven quality who will bring leadership and stability");
      } else if (age <= 20) {
        decision = "AVOID";
        reasons.push("Too young and inexperienced to rely upon right now");
      } else {
        decision = "AVOID";
        reasons.push("Doesn't fit the statesman profile of established quality");
      }
      break;
    }
    case "IDENTITY_ARCHITECT": {
      if (isPerfectFit) {
        decision = "SIGN";
        reasons.push("A perfect blueprint player who embodies our system");
      } else if (hasGoodFit) {
        decision = "SIGN";
        reasons.push("Fits our tactical identity and style of play");
      } else {
        decision = "AVOID";
        reasons.push("Does not match the tactical archetype requirements for our style");
      }
      break;
    }
    case "PHILOSOPHER": {
      var prof = player.Prof || player.Professionalism || 10;
      var det = player.Det || player.Determination || 10;
      var hasCharacter = prof >= 14 || det >= 14;
      if (hasCharacter && fitScore >= 12) {
        decision = "SIGN";
        reasons.push("Superb character and mental attributes — fits my dressing room");
      } else if (!hasCharacter) {
        decision = "AVOID";
        reasons.push("Lacks the professional character and determination I demand");
      } else {
        decision = "AVOID";
        reasons.push("Mental stats are fine, but doesn't fit the system well enough");
      }
      break;
    }
    default: { // OPPORTUNIST or SELL_TO_BUY
      if (fitScore >= 14) {
        decision = "SIGN";
        reasons.push("Solid quality at a price that makes financial sense");
      } else if (isFillingGap && fitScore >= 12) {
        decision = "SIGN";
        reasons.push("Fills a clear vacancy in our depth chart");
      } else {
        decision = "AVOID";
        reasons.push("Doesn't present a compelling upgrade for the money");
      }
    }
  }

  // Double check budget constraints
  var ledger = window.FM24State.manager.partAResult ? window.FM24State.manager.partAResult.ledger : { transferBudget: window.FM24State.manager.budget || 50000000 };
  if (ap > ledger.transferBudget) {
    reasons.push("However, the asking price of £" + formatCurrency(ap) + " exceeds our transfer budget!");
  }

  return {
    decision: decision,
    reasons: reasons,
    archetype: archetype,
    tacticalArch: tacticalArch,
    fitScore: fitScore,
    slotId: slotId,
    ca: ca,
    pa: pa,
    ap: ap,
    age: age
  };
}

function renderSigningResult(container, rec, player, manager) {
  if (!rec) {
    container.innerHTML = '<p class="text-xs text-red-400">Could not generate recommendation.</p>';
    return;
  }

  var isSign = rec.decision === "SIGN";
  var badgeColor = isSign ? "text-green-400 border-green-500/20 bg-green-500/10" : "text-red-400 border-red-500/20 bg-red-500/10";
  var badgeIcon = isSign ? "SIGN" : "AVOID";
  var archLabel = (rec.archetype || "GAFFER").replace(/_/g, " ");

  var html = "";
  html += '<div class="border border-border/40 rounded-lg overflow-hidden animate-fade-in">';

  // Header
  html += '  <div class="bg-backdrop/40 px-4 py-3 border-b border-border/40 flex items-center justify-between">';
  html += '    <div class="flex items-center gap-2">';
  html += '      <span class="text-sm font-extrabold text-white">' + escHtml(manager.Name || "") + '</span>';
  html += '      <span class="text-[9px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">' + escHtml(archLabel) + '</span>';
  if (rec.tacticalArch) {
    html += '      <span class="text-[9px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 font-semibold border border-green-500/20">' + escHtml(rec.tacticalArch) + '</span>';
  }
  html += '    </div>';
  html += '    <span class="text-base font-black ' + (isSign ? 'text-green-400' : 'text-red-400') + ' px-3 py-1 rounded border ' + badgeColor + '">' + badgeIcon + '</span>';
  html += '  </div>';

  // Body
  html += '  <div class="p-4 space-y-3">';
  html += '    <p class="text-xs text-text-secondary leading-relaxed">"' + getManagerSigningQuote(rec, player) + '"</p>';

  // Player details
  html += '    <div class="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-text-muted border-t border-border/20 pt-3">';
  html += '      <span><span class="text-text-secondary">Age:</span> ' + rec.age + '</span>';
  html += '      <span><span class="text-text-secondary">CA:</span> ' + rec.ca + '</span>';
  html += '      <span><span class="text-text-secondary">PA:</span> ' + (rec.pa || "?") + '</span>';
  html += '      <span><span class="text-text-secondary">Value:</span> \u00a3' + formatCurrency(rec.ap) + '</span>';
  if (rec.fitScore !== null && rec.fitScore !== undefined) html += '      <span><span class="text-text-secondary">Fit:</span> ' + rec.fitScore.toFixed(1) + '</span>';
  html += '    </div>';

  // Playing time evidence block
  if (typeof PlayerUtils !== "undefined") {
    var ptEvidence = '';
    if (PlayerUtils.getPTDelta) {
      var pd = PlayerUtils.getPTDelta(player);
      if (pd.delta !== 'N/A') ptEvidence += '<span class="' + (pd.direction === 'underperforming' ? 'text-red-400' : pd.direction === 'overperforming' ? 'text-green-400' : 'text-text-muted') + '">' + escHtml(pd.label) + '</span>';
    }
    if (PlayerUtils.getMinutesLoad) {
      var ml = PlayerUtils.getMinutesLoad(player);
      ptEvidence += ptEvidence ? ' &middot; ' : '';
      ptEvidence += ml.raw + ' mins (' + ml.tier + ')';
    }
    if (PlayerUtils.getPerformanceBand) {
      var pb = PlayerUtils.getPerformanceBand(player);
      ptEvidence += ptEvidence ? ' &middot; ' : '';
      ptEvidence += pb.band + (player.AvRat != null ? ' ' + player.AvRat.toFixed(2) : '');
    }
    if (ptEvidence) {
      html += '    <div class="text-[10px] text-text-muted border-t border-border/20 pt-2 mt-1">';
      html += '      <span class="text-text-secondary uppercase tracking-wider font-bold">Playing Time:</span> ' + ptEvidence;
      html += '    </div>';
    }
  }

  // Add Target button if in active window and stage is PART_A_COMPLETE
  var state = window.FM24State;
  if (state.manager.windowActive && state.manager.windowStage === 'PART_A_COMPLETE') {
    var isAlreadyTarget = state.manager.partAResult.pendingDecisions.some(function(d) {
      return d.player && d.player.Name === player.Name && d.type === 'TARGET_PROPOSED';
    });

    html += '    <div class="flex justify-end pt-2 border-t border-border/20">';
    if (isAlreadyTarget) {
      html += '      <span class="text-xs text-green-400 font-semibold flex items-center gap-1"><i class="fas fa-check"></i> Already in Transfer Targets</span>';
    } else {
      if (isSign) {
        html += '      <button id="add-to-targets-btn" class="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded transition-colors">Request Signing (Add to Targets)</button>';
      } else {
        html += '      <button id="add-to-targets-btn" class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded transition-colors">Override &amp; Request Signing</button>';
      }
    }
    html += '    </div>';
  }

  html += '  </div>';
  html += '</div>';

  container.innerHTML = html;

  // Bind add button handler
  var addBtn = document.getElementById("add-to-targets-btn");
  if (addBtn) {
    addBtn.addEventListener("click", function() {
      if (typeof window.FM24AddManualDecision === "function") {
        var isOverride = rec.decision !== "SIGN";
        var baseReason = rec.reasons.length > 0 ? rec.reasons[0] : 'Tactical suitability fit';
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
          contextGapSlot: rec.slotId || ''
        };
        window.FM24AddManualDecision(dec);
        renderSigningResult(container, rec, player, manager);
      }
    });
  }
}

function getManagerSigningQuote(rec, player) {
  var name = player.Name || "this player";
  var reasons = rec.reasons || [];
  var reasonText = reasons.length > 0 ? reasons[0] : "he fits our squad needs";

  var quotes = {
    DEVELOPER: {
      SIGN: "I'm fully behind signing " + name + ". " + reasonText + ".",
      AVOID: "I'd avoid " + name + ". " + reasonText + "."
    },
    RECYCLER: {
      SIGN: "Yes, get " + name + " in. " + reasonText + ".",
      AVOID: "No, " + name + " is not the profile we need. " + reasonText + "."
    },
    STATESMAN: {
      SIGN: name + " is a top target. " + reasonText + ".",
      AVOID: "Avoid " + name + ". " + reasonText + "."
    },
    SELL_TO_BUY: {
      SIGN: "If the finances allow, " + name + " is a great option. " + reasonText + ".",
      AVOID: "Let's pass on " + name + ". " + reasonText + "."
    },
    IDENTITY_ARCHITECT: {
      SIGN: name + " fits my tactical vision. " + reasonText + ".",
      AVOID: "Avoid " + name + ". " + reasonText + "."
    },
    OPPORTUNIST: {
      SIGN: "Sign " + name + ". " + reasonText + ".",
      AVOID: "Avoid " + name + ". " + reasonText + "."
    },
    PHILOSOPHER: {
      SIGN: name + " is exactly the kind of character I want. " + reasonText + ".",
      AVOID: "Avoid " + name + ". " + reasonText + "."
    },
    PRESSURE_BUYER: {
      SIGN: "Get " + name + " signed now. " + reasonText + ".",
      AVOID: "Avoid " + name + ". " + reasonText + "."
    }
  };

  var arch = rec.archetype;
  var archQuotes = quotes[arch];
  if (archQuotes && archQuotes[rec.decision]) {
    return archQuotes[rec.decision];
  }

  // Fallback
  if (rec.decision === "SIGN") return "I recommend signing " + name + ". " + reasonText + ".";
  return "I'd avoid " + name + ". " + reasonText + ".";
}

window.FM24AddManualDecision = function(decision) {
  var state = window.FM24State;
  if (!state.manager.partAResult || !state.manager.partAResult.pendingDecisions) return;
  
  // Remove existing pending decision for this player if it exists (to prevent conflicts)
  state.manager.partAResult.pendingDecisions = state.manager.partAResult.pendingDecisions.filter(function(d) {
    return !(d.player && d.player.Name === decision.player.Name);
  });
  
  state.manager.partAResult.pendingDecisions.push(decision);
  
  // Display toast if showToast is defined
  if (typeof showToast === "function") {
    showToast("Added " + decision.player.Name + " to the transfer decision list.", "success");
  } else {
    alert("Added " + decision.player.Name + " to the transfer decision list.");
  }
  
  // Trigger active view re-rendering to update the tables
  if (typeof renderManagerView === "function") {
    renderManagerView();
  }

  // Refresh player card overview modal in real time
  if (typeof renderPlayerCard === "function") {
    renderPlayerCard(decision.player);
  }
};

function escHtml(s) {
  if (typeof s !== "string") return s;
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
