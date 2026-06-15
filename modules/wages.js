// ─── WAGE BILL HEALTH DASHBOARD ───

function renderWageDashboard() {
  var uploadC = document.getElementById("wages-upload");
  var contentC = document.getElementById("wages-content");
  var locked = document.getElementById("locked-wages");
  var squad = window.FM24State.squad;
  var tactic = window.FM24State.tactic;

  if (locked) {
    locked.style.display = (!tactic.isComplete && squad && squad.length > 0) ? "flex" : "none";
  }

  if (!squad || squad.length === 0) {
    if (uploadC) {
      uploadC.style.display = "";
      buildUploadZone(uploadC, "Upload Squad HTML (FM24 export)", "squad", "fm24:squad-loaded");
    }
    if (contentC) contentC.innerHTML = "";
    return;
  }

  if (uploadC) uploadC.style.display = "none";
  if (!contentC) return;

  var state = window.FM24State.wagesUI || {};
  if (!state.sortBy) state.sortBy = "wage";

  // Compute bestFitScores inline if not cached
  if (tactic.isComplete) {
    for (var i = 0; i < squad.length; i++) {
      if (!squad[i]._bestFit) {
        var fits = findBestTacticFitForPlayer(squad[i]);
        if (fits.length > 0) {
          squad[i]._bestFit = fits[0];
          squad[i]._bestFitScore = fits[0].score.total;
        }
      }
    }
  }

  // Filter players with wage data
  var withWage = squad.filter(function (p) { return p.Wage > 0; });
  var noWageCount = squad.filter(function (p) { return !p.Wage || p.Wage <= 0; }).length;

  // Percentile helpers
  var wageSorted = withWage.slice().sort(function (a, b) { return a.Wage - b.Wage; });

  function getFitPercentile(player) {
    var val = player._bestFitScore || 0;
    var count = 0;
    for (var i = 0; i < withWage.length; i++) {
      if ((withWage[i]._bestFitScore || 0) < val) count++;
    }
    return withWage.length > 0 ? (count / withWage.length) * 100 : 50;
  }

  function getWagePercentile(player) {
    var val = player.Wage;
    var count = 0;
    for (var i = 0; i < wageSorted.length; i++) {
      if (wageSorted[i].Wage < val) count++;
    }
    return wageSorted.length > 0 ? (count / wageSorted.length) * 100 : 50;
  }

  function getWageTier(player) {
    var pct = getWagePercentile(player);
    if (pct <= 25) return { label: "LOW",  css: "text-green-400" };
    if (pct <= 50) return { label: "MID",  css: "text-blue-400" };
    if (pct <= 75) return { label: "HIGH", css: "text-amber-400" };
    return { label: "TOP",  css: "text-red-400" };
  }

  function getValueRating(player) {
    var wp = getWagePercentile(player);
    var fp = getFitPercentile(player);
    var delta = fp - wp;
    if (delta > 25) return { label: "UNDERPAID", css: "text-green-400" };
    if (delta < -25) return { label: "OVERPAID",  css: "text-red-400" };
    return { label: "FAIR",       css: "text-blue-400" };
  }

  function fmtCurrency(val) {
    if (val >= 1000000) return "\u00A3" + (val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1) + "M";
    if (val >= 1000) return "\u00A3" + (val / 1000).toFixed(val % 1000 === 0 ? 0 : 0) + "K";
    return "\u00A3" + Math.round(val);
  }

  // ─── COMPUTE SUMMARY STATS ───
  var totalWeekly = 0;
  var highestWage = 0;
  var highestName = "";
  for (var i = 0; i < squad.length; i++) {
    totalWeekly += squad[i].Wage || 0;
    if ((squad[i].Wage || 0) > highestWage) {
      highestWage = squad[i].Wage || 0;
      highestName = squad[i].Name || "";
    }
  }
  // Add manager wage to total
  var managerWage = window.FM24State.manager.managerWage || 0;
  totalWeekly += managerWage;
  var totalAnnual = totalWeekly * 52;

  // ─── STRATA WAGE DISTRIBUTION ───
  var STRATA_ORDER = ["GK", "DC", "WD", "DM", "CM", "WM", "AMC", "WA", "ST"];
  var STRATA_COLORS = {
    "GK": "bg-purple-600",  "DC": "bg-blue-600",  "WD": "bg-cyan-600",
    "DM": "bg-teal-600",    "CM": "bg-green-600", "WM": "bg-yellow-600",
    "WA": "bg-orange-600",  "AMC": "bg-pink-600", "ST": "bg-red-600",
    "N/A": "bg-gray-600"
  };

  var strataWages = {};
  var strataCount = {};
  for (var i = 0; i < withWage.length; i++) {
    var p = withWage[i];
    var strata = p.strata && p.strata.length > 0 ? p.strata[0] : "N/A";
    if (!strataWages[strata]) { strataWages[strata] = 0; strataCount[strata] = 0; }
    strataWages[strata] += p.Wage;
    strataCount[strata]++;
  }

  // ─── BUILD HTML ───
  var html = "";

  // Section 1: Squad Summary Bar
  html += "<div class='grid grid-cols-2 md:grid-cols-4 gap-3 mb-6'>";
  html += statCard("Total Weekly", fmtCurrency(totalWeekly), "text-green-400");
  html += statCard("Total Annual", fmtCurrency(totalAnnual), "text-cyan-400");
  html += statCard("Highest Earner", highestName ? highestName + " (" + fmtCurrency(highestWage) + ")" : "\u2014", "text-amber-400");
  html += budgetInputCard(state);
  html += "</div>";

  if (noWageCount > 0) {
    html += "<div class='text-xs text-text-muted mb-4'>" + noWageCount + " player" + (noWageCount > 1 ? "s" : "") + " with no wage data \u2014 excluded from distribution and ratings.</div>";
  }

  // Section 2: Wage Distribution by Strata
  html += "<div class='mb-6'>";
  html += "<h3 class='text-xs font-bold tracking-wider uppercase text-white mb-3'>Wage Distribution by Position</h3>";
  html += "<div class='space-y-1.5'>";

  for (var si = 0; si < STRATA_ORDER.length; si++) {
    var s = STRATA_ORDER[si];
    var sw = strataWages[s] || 0;
    var sc = strataCount[s] || 0;
    if (sc === 0 && sw === 0) continue;
    var pct = totalWeekly > 0 ? (sw / totalWeekly) * 100 : 0;
    var color = STRATA_COLORS[s] || "bg-gray-600";
    var avgWage = sc > 0 ? sw / sc : 0;
    html += "<div class='flex items-center gap-2'>";
    html += "<span class='text-xs text-text-secondary w-8 shrink-0'>" + s + "</span>";
    html += "<div class='flex-1 bg-[#1A1A1A] rounded h-5 overflow-hidden' title='" + fmtCurrency(sw) + " (" + pct.toFixed(1) + "%)'>";
    html += "<div class='" + color + " h-full rounded' style='width:" + pct + "%'></div></div>";
    html += "<span class='text-xs text-text-muted w-28 text-right shrink-0'>" + fmtCurrency(sw) + " (" + sc + ")</span>";
    html += "<span class='text-xs text-text-muted w-20 text-right shrink-0 hidden md:block'>avg " + fmtCurrency(avgWage) + "</span>";
    html += "</div>";
  }

  // Remaining N/A group
  if (strataCount["N/A"] && strataCount["N/A"] > 0) {
    var sw = strataWages["N/A"] || 0;
    var sc = strataCount["N/A"] || 0;
    var pct = totalWeekly > 0 ? (sw / totalWeekly) * 100 : 0;
    html += "<div class='flex items-center gap-2'>";
    html += "<span class='text-xs text-text-secondary w-8 shrink-0'>\u2014</span>";
    html += "<div class='flex-1 bg-[#1A1A1A] rounded h-5 overflow-hidden'>";
    html += "<div class='bg-gray-600 h-full rounded' style='width:" + pct + "%'></div></div>";
    html += "<span class='text-xs text-text-muted w-28 text-right shrink-0'>" + fmtCurrency(sw) + " (" + sc + ")</span>";
    html += "<span class='text-xs text-text-muted w-20 text-right shrink-0 hidden md:block'>avg " + fmtCurrency(sw / sc) + "</span>";
    html += "</div>";
  }

  html += "</div></div>";

  // Section 3: Value-for-Money Table
  html += "<div class='mb-6'>";
  html += "<h3 class='text-xs font-bold tracking-wider uppercase text-white mb-3'>Value for Money</h3>";

  if (!tactic.isComplete) {
    html += "<div class='text-xs text-text-muted text-center py-8'>Complete your tactic to see fit-based value ratings.</div>";
  } else {
    // Sort players
    var sortBy = state.sortBy || "wage";
    var sortAsc = state.sortAsc === true;
    var sorted = withWage.slice();
    sorted.sort(function (a, b) {
      var va, vb;
      if (sortBy === "name") {
        va = (a.Name || "").toLowerCase();
        vb = (b.Name || "").toLowerCase();
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      if (sortBy === "pos") {
        var order = STRATA_ORDER;
        var sa = a.strata;
        var sb = b.strata;
        var va = order.indexOf(sa && sa.length ? sa[0] : "");
        var vb = order.indexOf(sb && sb.length ? sb[0] : "");
        if (va === -1) va = 999;
        if (vb === -1) vb = 999;
        return sortAsc ? va - vb : vb - va;
      }
      if (sortBy === "wage") { va = a.Wage || 0; vb = b.Wage || 0; }
      else if (sortBy === "fit") { va = a._bestFitScore || 0; vb = b._bestFitScore || 0; }
      else if (sortBy === "wage_tier") { va = getWagePercentile(a); vb = getWagePercentile(b); }
      else if (sortBy === "value_rating") {
        va = getFitPercentile(a) - getWagePercentile(a);
        vb = getFitPercentile(b) - getWagePercentile(b);
      }
      return sortAsc ? va - vb : vb - va;
    });

    var sortArrow = function (key) {
      return state.sortBy === key ? (state.sortAsc ? " \u25B2" : " \u25BC") : "";
    };

    html += "<div class='overflow-x-auto'>";
    html += "<table class='w-full text-xs'>";
    html += "<thead><tr class='bg-[#0A0A0A] border-b border-[#1F1F1F]'>";
    html += "<th class='wh-sort-th text-white font-semibold tracking-tight text-left py-2 px-2 cursor-pointer' data-sort='name'>Name" + sortArrow("name") + "</th>";
    html += "<th class='wh-sort-th text-white font-semibold tracking-tight text-left py-2 px-2 cursor-pointer' data-sort='pos'>Position" + sortArrow("pos") + "</th>";
    html += "<th class='wh-sort-th text-white font-semibold tracking-tight text-right py-2 px-2 cursor-pointer' data-sort='wage'>Wage" + sortArrow("wage") + "</th>";
    html += "<th class='wh-sort-th text-white font-semibold tracking-tight text-right py-2 px-2 cursor-pointer' data-sort='fit'>Best Fit" + sortArrow("fit") + "</th>";
    html += "<th class='wh-sort-th text-white font-semibold tracking-tight text-center py-2 px-2 cursor-pointer' data-sort='wage_tier'>Wage Tier" + sortArrow("wage_tier") + "</th>";
    html += "<th class='wh-sort-th text-white font-semibold tracking-tight text-center py-2 px-2 cursor-pointer' data-sort='value_rating'>Value Rating" + sortArrow("value_rating") + "</th>";
    html += "</tr></thead><tbody>";

    // Manager row
    if (managerWage > 0) {
      html += "<tr class='border-b border-[#1F1F1F] bg-[#0A0A0A]/50'>";
      html += "<td class='py-1.5 px-2 text-white font-bold whitespace-nowrap'>Manager</td>";
      html += "<td class='py-1.5 px-2 text-text-secondary'>\u2014</td>";
      html += "<td class='py-1.5 px-2 text-right font-mono tabular-nums text-white font-bold'>" + fmtCurrency(managerWage) + "</td>";
      html += "<td class='py-1.5 px-2 text-right font-mono tabular-nums text-text-muted'>\u2014</td>";
      html += "<td class='py-1.5 px-2 text-center text-text-muted'>\u2014</td>";
      html += "<td class='py-1.5 px-2 text-center text-text-muted'>\u2014</td>";
      html += "</tr>";
    } else {
      html += "<tr class='border-b border-[#1F1F1F] bg-[#0A0A0A]/50'>";
      html += "<td class='py-1.5 px-2 text-text-muted italic whitespace-nowrap' colspan='6'>No manager hired</td>";
      html += "</tr>";
    }

    for (var ri = 0; ri < sorted.length; ri++) {
      var pl = sorted[ri];
      var tier = getWageTier(pl);
      var rating = getValueRating(pl);
      var fitScore = pl._bestFitScore !== undefined ? pl._bestFitScore : "\u2014";
      html += "<tr class='border-b border-[#1A1A1A] hover:bg-[#111111] cursor-pointer' data-player-idx='" + squad.indexOf(pl) + "'>";
      html += "<td class='py-1.5 px-2 text-white whitespace-nowrap'>" + escHtml(pl.Name) + "</td>";
      html += "<td class='py-1.5 px-2 text-text-secondary'>" + escHtml(pl.Position || "") + "</td>";
      html += "<td class='py-1.5 px-2 text-right font-mono tabular-nums text-text-secondary'>" + escHtml(pl.WageDisplay || fmtCurrency(pl.Wage)) + "</td>";
      html += "<td class='py-1.5 px-2 text-right font-mono tabular-nums " + (fitScore !== "\u2014" ? "text-white" : "text-text-muted") + "'>" + fitScore + "</td>";
      html += "<td class='py-1.5 px-2 text-center font-semibold " + tier.css + "'>" + tier.label + "</td>";
      html += "<td class='py-1.5 px-2 text-center font-semibold " + rating.css + "'>" + rating.label + "</td>";
      html += "</tr>";
    }

    html += "</tbody></table></div>";
  }

  html += "</div>";

  // Section 4: Budget Breakdown
  html += "<div class='mb-6'>";
  html += "<h3 class='text-xs font-bold tracking-wider uppercase text-white mb-3'>Budget Status</h3>";

  var budget = state.budget;
  if (!budget || budget <= 0) {
    html += "<div class='text-xs text-text-muted bg-[#0A0A0A] border border-[#1F1F1F] rounded p-3'>Enter your total weekly wage budget above to see budget breakdown and headroom.</div>";
  } else {
    var remaining = budget - totalWeekly;
    var pctUsed = budget > 0 ? (totalWeekly / budget) * 100 : 0;
    var barColor = remaining < 0 ? "bg-red-600" : (remaining / budget < 0.2 ? "bg-amber-600" : "bg-green-600");

    html += "<div class='bg-[#0A0A0A] border border-[#1F1F1F] rounded p-3 mb-3'>";
    html += "<div class='flex justify-between text-xs text-text-secondary mb-1'>";
    html += "<span>Used: " + fmtCurrency(totalWeekly) + "</span>";
    html += "<span>Budget: " + fmtCurrency(budget) + "/wk</span>";
    html += "<span>Remaining: " + (remaining >= 0 ? fmtCurrency(remaining) : "Over by " + fmtCurrency(Math.abs(remaining))) + "</span>";
    html += "</div>";
    html += "<div class='bg-[#1A1A1A] rounded h-3 overflow-hidden'>";
    html += "<div class='" + barColor + " h-full rounded transition-all' style='width:" + Math.min(pctUsed, 100) + "%'></div></div>";
    html += "<div class='text-right text-[10px] text-text-muted mt-1'>" + pctUsed.toFixed(1) + "% of budget used</div>";
    html += "</div>";

    // Headroom table
    html += "<div>";
    html += "<h4 class='text-[11px] font-semibold tracking-wider uppercase text-text-secondary mb-2'>Estimated Headroom by Position</h4>";
    html += "<table class='w-full text-xs'>";
    html += "<thead><tr class='text-text-muted text-[10px] tracking-wider'>";
    html += "<th class='text-left py-1'>Position</th>";
    html += "<th class='text-right py-1'>Current</th>";
    html += "<th class='text-right py-1'>% of Bill</th>";
    html += "<th class='text-right py-1'>Headroom</th>";
    html += "<th class='text-right py-1'>Max Signable</th>";
    html += "</tr></thead><tbody>";

    for (var si = 0; si < STRATA_ORDER.length; si++) {
      var s = STRATA_ORDER[si];
      var sw = strataWages[s] || 0;
      var sc = strataCount[s] || 0;
      if (sc === 0) continue;
      var pct = totalWeekly > 0 ? sw / totalWeekly : 0;
      var headroom = remaining >= 0 ? remaining * pct : remaining * pct;
      var maxSignable = (sc > 0 ? sw / sc : 0) + Math.max(headroom, 0);
      html += "<tr class='border-b border-[#1A1A1A]'>";
      html += "<td class='py-1 text-white'>" + s + "</td>";
      html += "<td class='py-1 text-right font-mono tabular-nums text-text-secondary'>" + fmtCurrency(sw) + "</td>";
      html += "<td class='py-1 text-right font-mono tabular-nums text-text-secondary'>" + (pct * 100).toFixed(1) + "%</td>";
      html += "<td class='py-1 text-right font-mono tabular-nums " + (headroom >= 0 ? "text-green-400" : "text-red-400") + "'>" + fmtCurrency(headroom) + "</td>";
      html += "<td class='py-1 text-right font-mono tabular-nums text-cyan-400'>" + fmtCurrency(maxSignable) + "</td>";
      html += "</tr>";
    }

    html += "</tbody></table></div>";
  }

  html += "</div>";

  contentC.innerHTML = html;

  // Budget input save on Enter/blur
  var budgetInput = document.getElementById("budget-input");
  if (budgetInput) {
    function saveBudget() {
      var raw = budgetInput.value.trim();
      var num = parseFloat(raw);
      if (raw === "") {
        state.budget = null;
        try { localStorage.setItem("fm24_wage_budget", ""); } catch (_) {}
      } else if (!isNaN(num) && num > 0) {
        state.budget = num;
        try { localStorage.setItem("fm24_wage_budget", String(num)); } catch (_) {}
      }
      renderWageDashboard();
    }
    budgetInput.addEventListener("change", saveBudget);
    budgetInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); saveBudget(); }
    });
  }

  // Sort click handlers
  contentC.querySelectorAll(".wh-sort-th").forEach(function (el) {
    el.addEventListener("click", function () {
      var key = this.dataset.sort;
      if (!key) return;
      if (state.sortBy === key) {
        state.sortAsc = !state.sortAsc;
      } else {
        state.sortBy = key;
        state.sortAsc = (key === "name" || key === "pos");
      }
      renderWageDashboard();
    });
  });

  // Row click -> player card
  contentC.querySelectorAll("tr[data-player-idx]").forEach(function (row) {
    row.addEventListener("click", function () {
      var idx = parseInt(this.dataset.playerIdx, 10);
      if (!isNaN(idx) && squad[idx]) {
        renderPlayerCard(squad[idx]);
      }
    });
  });
}

function statCard(label, value, color) {
  return "<div class='bg-[#0A0A0A] border border-[#1F1F1F] rounded p-3'>" +
    "<div class='text-[10px] tracking-wider uppercase text-text-muted mb-1'>" + label + "</div>" +
    "<div class='text-sm font-bold font-mono " + color + "'>" + value + "</div></div>";
}

function budgetInputCard(state) {
  return "<div class='bg-[#0A0A0A] border border-[#1F1F1F] rounded p-3'>" +
    "<div class='text-[10px] tracking-wider uppercase text-text-muted mb-1'>Budget (p/w)</div>" +
    "<input id='budget-input' type='text' inputmode='numeric' class='w-full bg-transparent text-sm font-bold font-mono text-white border-none outline-none p-0 m-0' placeholder='e.g. 2000000' value='" + (state.budget !== null && state.budget > 0 ? state.budget : "") + "'>" +
  "</div>";
}
