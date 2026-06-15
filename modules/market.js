// ─── SLOT DISPLAY LABEL (Flank-Explicit) ───

function slotPositionLabel(slotId) {
  if (slotId === "GK") return "GK";
  if (slotId === "DL" || slotId === "DR") return "FB";
  if (slotId.indexOf("DC") === 0) return "CB";
  if (slotId.indexOf("WB") === 0) return "WB";
  if (slotId.indexOf("FB") === 0) return "FB";
  if (slotId.indexOf("DM") === 0) return "DM";
  if (slotId === "ML" || slotId === "MR") return "M";
  if (slotId.indexOf("MC") === 0) return "CM";
  if (slotId === "AML" || slotId === "AMR") return "W";
  if (slotId.indexOf("AM") === 0) return "AM";
  if (slotId.indexOf("ST") === 0) return "ST";
  return slotId;
}

function slotPositionOrder(slotId) {
  if (slotId === "GK") return 0;
  if (slotId === "DL" || slotId === "DR") return 2;
  if (slotId.indexOf("DC") === 0) return 1;
  if (slotId.indexOf("WB") === 0 || slotId.indexOf("FB") === 0) return 2;
  if (slotId.indexOf("DM") === 0) return 3;
  if (slotId === "ML" || slotId === "MR") return 4;
  if (slotId.indexOf("MC") === 0) return 4;
  if (slotId === "AML" || slotId === "AMR") return 5;
  if (slotId.indexOf("AM") === 0) return 6;
  if (slotId.indexOf("ST") === 0) return 7;
  return 99;
}

function slotDisplayLabel(slotId) {
  var slot = window.FM24State.tactic.slots[slotId];
  var slotDef = getSlotDef(slotId);
  var posLabel = slotPositionLabel(slotId);
  if (!slot || !slotDef) return posLabel;

  var prefix = "";
  if (slotDef.flank === "L") prefix = "Left ";
  else if (slotDef.flank === "R") prefix = "Right ";

  if (!slot.roleId) return prefix + posLabel + " \u2014 (unassigned)";

  var role = getRoleById(slot.roleId);
  var roleName = role ? role.name : "?";
  var duty = role ? role.duty : "?";
  return prefix + posLabel + " \u2014 " + roleName + " (" + duty + ")";
}

function slotShortLabel(slotId) {
  var slot = window.FM24State.tactic.slots[slotId];
  var slotDef = getSlotDef(slotId);
  var posLabel = slotPositionLabel(slotId);
  if (!slot || !slotDef) return posLabel;
  var prefix = "";
  if (slotDef.flank === "L") prefix = "L";
  else if (slotDef.flank === "R") prefix = "R";
  return prefix + posLabel;
}

function slotMatrixLabel(slotId) {
  var slot = window.FM24State.tactic.slots[slotId];
  if (!slot || !slot.roleId) return slotShortLabel(slotId);
  var display = getSlotDisplay(slot);
  return display ? display.full : slotShortLabel(slotId);
}

function computeMarketScores(player, tactic) {
  if (!tactic || !tactic.isComplete) return null;
  if (player._marketScores) return player._marketScores;

  var scores = {};
  var slotIds = Object.keys(tactic.slots);
  var bestScore = -1;
  var bestSlotId = null;

  for (var i = 0; i < slotIds.length; i++) {
    var sid = slotIds[i];
    var slot = tactic.slots[sid];
    if (!slot.roleId) { scores[sid] = null; continue; }
    var result = scorePlayerForTacticSlot(player, sid);
    scores[sid] = result;
    if (result !== null && result.total > bestScore) {
      bestScore = result.total;
      bestSlotId = sid;
    }
  }

  scores._bestScore = bestScore;
  scores._bestSlotId = bestSlotId;
  player._marketScores = scores;
  return scores;
}

// ─── SHORTLIST HELPERS ───

var _shortlistIdxMap = null;

function isShortlistedIdx(player) {
  if (_shortlistIdxMap === null) {
    _shortlistIdxMap = new WeakMap();
    var sl = window.FM24State.shortlist;
    for (var i = 0; i < sl.length; i++) {
      _shortlistIdxMap.set(sl[i].player, i);
    }
  }
  var idx = _shortlistIdxMap.get(player);
  return idx !== undefined ? idx : -1;
}

function _invalidateShortlistCache() {
  _shortlistIdxMap = null;
}

function csvEscape(s) {
  if (s === null || s === undefined) return "";
  s = String(s);
  if (s.indexOf(",") !== -1 || s.indexOf('"') !== -1 || s.indexOf("\n") !== -1) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function exportShortlistCSV() {
  var sl = window.FM24State.shortlist;
  if (sl.length === 0) { showToast("Shortlist is empty", "error"); return; }

  var headers = ["Name","Age","Nation","Club","Position","AP","Wage","Tactic Score","Target Slot","Personality"];
  var rows = [headers.join(",")];

  for (var i = 0; i < sl.length; i++) {
    var e = sl[i];
    var p = e.player;
    var targetSlot = e.targetSlotId ? slotDisplayLabel(e.targetSlotId) : "";
    rows.push([
      csvEscape(p.Name), p.Age || "", csvEscape(p.Nation || ""), csvEscape(p.Club || ""),
      csvEscape(p.Position || ""), p.AP || "", p.Wage || "",
      e.scoreAtShortlist !== undefined ? e.scoreAtShortlist : "",
      csvEscape(targetSlot), csvEscape(p.Personality || "")
    ].join(","));
  }

  var blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "fm24_shortlist.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── MARKET VIEW ───



function renderMarketView() {
  var uploadC = document.getElementById("market-upload");
  var playersC = document.getElementById("market-players");
  var locked = document.getElementById("locked-market");
  if (locked) locked.style.display = window.FM24State.tactic.isComplete ? "none" : "flex";

  if (!window.FM24State.tactic.isComplete) {
    renderMarketUpload();
    if (playersC) playersC.innerHTML = "<div class='market-status-banner'>Your tactic is incomplete. Assign all 11 roles to enable tactic-based screening.</div>";
    return;
  }

  var market = window.FM24State.market;
  if (!market || market.length === 0) {
    renderMarketUpload();
    if (playersC) playersC.innerHTML = "<div class='market-status-banner'>Upload your FM24 transfer market HTML export to start screening players for your tactic.</div>";
    return;
  }

  if (uploadC) uploadC.innerHTML = "";
  if (!playersC) return;
  playersC.innerHTML = "";

  _marketBuildView(playersC, market);
}

function _marketBuildView(container, market) {
  var state = window.FM24State.marketUI || {};
  var summary = getTacticContextSummary();

  // Context banner
  var banner = document.createElement("div");
  banner.className = "market-context-banner";
  banner.innerHTML = "<span class='ctx-headline'>Screening for: " + summary.headline + "</span>" +
    (summary.keyDemands.length > 0 ? " | <span class='ctx-demands'>Key demands: " + summary.keyDemands.slice(0, 4).join(", ") + "</span>" : "");
  container.appendChild(banner);

  // Filters
  var filtersDiv = document.createElement("div");
  filtersDiv.className = "market-filters";
  _marketBuildFilters(filtersDiv, state, market);
  container.appendChild(filtersDiv);

  // Results header
  var resHead = document.createElement("div");
  resHead.className = "market-results-header";
  resHead.id = "market-results-header";
  container.appendChild(resHead);

  // Table wrapper
  var tblWrap = document.createElement("div");
  tblWrap.className = "market-table-wrapper";
  tblWrap.id = "market-table-wrapper";
  tblWrap.style.overflowX = "auto";
  tblWrap.style.overflowY = "hidden";
  tblWrap.style.maxWidth = "100%";
  container.appendChild(tblWrap);

  _marketRenderResults();
}

var MARKET_STRATA_LIST = ["All","GK","DC","WD","DM","CM","WA","AMC","ST"];

var _natCache = null;
window.addEventListener("fm24:market-loaded", function () { _natCache = null; });

function getUniqueNationalities() {
  if (_natCache !== null) return _natCache;
  var market = window.FM24State.market || [];
  var set = {};
  for (var i = 0; i < market.length; i++) {
    var n = market[i].Nation || market[i].Nationality || market[i].Nat || "";
    if (n) set[n] = true;
  }
  var list = Object.keys(set);
  list.sort();
  _natCache = list;
  return list;
}

function _marketBuildFilters(container, state, market) {
  container.innerHTML = "";
  // Strata pills
  var strataRow = document.createElement("div");
  strataRow.className = "flex flex-wrap gap-1 mb-3";
  MARKET_STRATA_LIST.forEach(function (s) {
    var btn = document.createElement("button");
    var active = s === (state.strata || "All");
    btn.className = "px-2.5 py-1 text-xs border rounded transition-colors " +
      (active ? "bg-white text-black border-white" : "bg-transparent text-text-muted border-border hover:text-text-secondary hover:border-text-secondary");
    btn.textContent = s;
    btn.addEventListener("click", function () {
      state.strata = s;
      strataRow.querySelectorAll("button").forEach(function (x) { x.className = "px-2.5 py-1 text-xs border rounded bg-transparent text-text-muted border-border hover:text-text-secondary hover:border-text-secondary"; });
      btn.className = "px-2.5 py-1 text-xs border rounded bg-white text-black border-white";
      state.currentPage = 0; _marketRenderResults();
    });
    strataRow.appendChild(btn);
  });
  container.appendChild(strataRow);

  // Flank pills
  var flankRow = document.createElement("div");
  flankRow.className = "flex flex-wrap gap-1 mb-3";
  var flankLabels = ["All", "L", "R", "C"];
  flankLabels.forEach(function (f) {
    var btn = document.createElement("button");
    var active = f === (state.flank || "All");
    btn.className = "px-2.5 py-1 text-xs border rounded transition-colors " +
      (active ? "bg-white text-black border-white" : "bg-transparent text-text-muted border-border hover:text-text-secondary hover:border-text-secondary");
    btn.textContent = f;
    btn.dataset.flank = f;
    btn.addEventListener("click", function () {
      state.flank = f;
      flankRow.querySelectorAll("button").forEach(function (x) { x.className = "px-2.5 py-1 text-xs border rounded bg-transparent text-text-muted border-border hover:text-text-secondary hover:border-text-secondary"; });
      btn.className = "px-2.5 py-1 text-xs border rounded bg-white text-black border-white";
      state.currentPage = 0; _marketRenderResults();
    });
    flankRow.appendChild(btn);
  });
  container.appendChild(flankRow);

  var row = document.createElement("div");
  row.className = "flex flex-wrap gap-3 items-end";

  // Age
  var ageDiv = document.createElement("div");
  ageDiv.className = "flex flex-col gap-0.5";
  var ageL = document.createElement("label");
  ageL.className = "text-xs text-text-muted tracking-wider";
  ageL.textContent = "AGE";
  ageDiv.appendChild(ageL);
  var ageRow = document.createElement("div");
  ageRow.className = "flex items-center gap-1";
  var ageMin = document.createElement("input");
  ageMin.type = "number"; ageMin.min = "15"; ageMin.max = "40";
  ageMin.className = "w-14 px-2 py-1 text-xs bg-surface border border-border rounded text-white focus:border-white focus:outline-none";
  ageMin.value = state.minAge !== undefined ? state.minAge : 15;
  var ageDash = document.createElement("span");
  ageDash.className = "text-text-muted text-xs";
  ageDash.textContent = "-";
  var ageMax = document.createElement("input");
  ageMax.type = "number"; ageMax.min = "15"; ageMax.max = "40";
  ageMax.className = "w-14 px-2 py-1 text-xs bg-surface border border-border rounded text-white focus:border-white focus:outline-none";
  ageMax.value = state.maxAge !== undefined ? state.maxAge : 40;
  ageRow.appendChild(ageMin);
  ageRow.appendChild(ageDash);
  ageRow.appendChild(ageMax);
  ageDiv.appendChild(ageRow);
  row.appendChild(ageDiv);

  // Min Score
  var scoreDiv = document.createElement("div");
  scoreDiv.className = "flex flex-col gap-0.5";
  var scoreL = document.createElement("label");
  scoreL.className = "text-xs text-text-muted tracking-wider";
  scoreL.textContent = "MIN FIT";
  scoreDiv.appendChild(scoreL);
  var scoreInp = document.createElement("input");
  scoreInp.type = "number"; scoreInp.min = "0"; scoreInp.max = "20";
  scoreInp.className = "w-14 px-2 py-1 text-xs bg-surface border border-border rounded text-white focus:border-white focus:outline-none";
  scoreInp.value = state.minScore !== undefined ? state.minScore : 11;
  scoreDiv.appendChild(scoreInp);
  row.appendChild(scoreDiv);

  // Nationality
  var natDiv = document.createElement("div");
  natDiv.className = "flex flex-col gap-0.5";
  var natL = document.createElement("label");
  natL.className = "text-xs text-text-muted tracking-wider";
  natL.textContent = "NAT";
  natDiv.appendChild(natL);
  var natInp = document.createElement("input");
  natInp.type = "text"; natInp.placeholder = "Any";
  natInp.className = "w-24 px-2 py-1 text-xs bg-surface border border-border rounded text-white placeholder-text-muted focus:border-white focus:outline-none";
  natInp.value = state.nationality || "";
  natInp.setAttribute("list", "nat-datalist");
  natDiv.appendChild(natInp);
  var natList = document.createElement("datalist");
  natList.id = "nat-datalist";
  var nations = getUniqueNationalities();
  for (var ni = 0; ni < nations.length; ni++) {
    var opt = document.createElement("option");
    opt.value = nations[ni];
    natList.appendChild(opt);
  }
  natDiv.appendChild(natList);
  row.appendChild(natDiv);

  // Max AP
  var apDiv = document.createElement("div");
  apDiv.className = "flex flex-col gap-0.5";
  var apL = document.createElement("label");
  apL.className = "text-xs text-text-muted tracking-wider";
  apL.textContent = "MAX AP";
  apDiv.appendChild(apL);
  var apInp = document.createElement("input");
  apInp.type = "text"; apInp.placeholder = "50000000";
  apInp.className = "w-28 px-2 py-1 text-xs bg-surface border border-border rounded text-white placeholder-text-muted focus:border-white focus:outline-none";
  apInp.value = state.maxAP || "";
  apDiv.appendChild(apInp);
  row.appendChild(apDiv);

  // Max Wage
  var wageDiv = document.createElement("div");
  wageDiv.className = "flex flex-col gap-0.5";
  var wageL = document.createElement("label");
  wageL.className = "text-xs text-text-muted tracking-wider";
  wageL.textContent = "MAX WAGE";
  wageDiv.appendChild(wageL);
  var wageInp = document.createElement("input");
  wageInp.type = "text"; wageInp.placeholder = "100000";
  wageInp.className = "w-28 px-2 py-1 text-xs bg-surface border border-border rounded text-white placeholder-text-muted focus:border-white focus:outline-none";
  wageInp.value = state.maxWage || "";
  wageDiv.appendChild(wageInp);
  row.appendChild(wageDiv);

  // Min Minutes
  var minsDiv = document.createElement("div");
  minsDiv.className = "flex flex-col gap-1 w-36";
  var minsL = document.createElement("label");
  minsL.className = "text-xs text-text-muted tracking-wider flex justify-between";
  var minsVal = state.minMins !== undefined ? state.minMins : 0;
  minsL.innerHTML = "MIN MINS: <span class='text-white font-bold font-mono'>" + (minsVal === 0 ? "Any" : minsVal + "m") + "</span>";
  minsDiv.appendChild(minsL);
  var minsInp = document.createElement("input");
  minsInp.type = "range"; minsInp.min = "0"; minsInp.max = "3000"; minsInp.step = "100";
  minsInp.className = "w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-white";
  minsInp.value = minsVal;
  minsInp.addEventListener("input", function () {
    var v = parseInt(minsInp.value, 10) || 0;
    minsL.innerHTML = "MIN MINS: <span class='text-white font-bold font-mono'>" + (v === 0 ? "Any" : v + "m") + "</span>";
  });
  minsDiv.appendChild(minsInp);
  row.appendChild(minsDiv);

  // Min Rating
  var ratDiv = document.createElement("div");
  ratDiv.className = "flex flex-col gap-1 w-36";
  var ratL = document.createElement("label");
  ratL.className = "text-xs text-text-muted tracking-wider flex justify-between";
  var ratVal = (state.minRat !== undefined && state.minRat >= 6.0) ? state.minRat : 6.0;
  ratL.innerHTML = "MIN RAT: <span class='text-white font-bold font-mono'>" + (ratVal <= 6.0 ? "Any" : ratVal.toFixed(2)) + "</span>";
  ratDiv.appendChild(ratL);
  var ratInp = document.createElement("input");
  ratInp.type = "range"; ratInp.min = "6.0"; ratInp.max = "8.0"; ratInp.step = "0.05";
  ratInp.className = "w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-white";
  ratInp.value = ratVal;
  ratInp.addEventListener("input", function () {
    var v = parseFloat(ratInp.value) || 6.0;
    ratL.innerHTML = "MIN RAT: <span class='text-white font-bold font-mono'>" + (v <= 6.0 ? "Any" : v.toFixed(2)) + "</span>";
  });
  ratDiv.appendChild(ratInp);
  row.appendChild(ratDiv);

  // Buttons
  var btnDiv = document.createElement("div");
  btnDiv.className = "flex gap-2 items-end pb-0.5";

  var applyBtn = document.createElement("button");
  applyBtn.className = "px-3 py-1.5 text-xs border border-white bg-white text-black rounded hover:bg-text-secondary transition-colors";
  applyBtn.textContent = "Apply";
  applyBtn.addEventListener("click", function () {
    state.minAge = parseInt(ageMin.value, 10) || 15;
    state.maxAge = parseInt(ageMax.value, 10) || 40;
    state.minScore = parseInt(scoreInp.value, 10) || 0;
    state.nationality = natInp.value || "";
    state.maxAP = apInp.value || "";
    state.maxWage = wageInp.value || "";
    state.minMins = parseInt(minsInp.value, 10) || 0;
    var rawRat = parseFloat(ratInp.value) || 6.0;
    state.minRat = rawRat <= 6.0 ? 0 : rawRat;
    state.currentPage = 0; _marketRenderResults();
  });
  btnDiv.appendChild(applyBtn);

  var resetBtn = document.createElement("button");
  resetBtn.className = "px-3 py-1.5 text-xs border border-border text-text-secondary rounded hover:bg-surface-hover hover:text-white transition-colors";
  resetBtn.textContent = "Reset";
  resetBtn.addEventListener("click", function () {
    state.minAge = 15; state.maxAge = 40; state.minScore = 11;
    state.nationality = ""; state.maxAP = ""; state.maxWage = "";
    state.minMins = 0; state.minRat = 0;
    state.strata = "All"; state.flank = "All";
    state.currentPage = 0;
    _marketBuildFilters(container, state, market);
    _marketRenderResults();
  });
  btnDiv.appendChild(resetBtn);

  row.appendChild(btnDiv);
  container.appendChild(row);
}

function _marketRenderResults() {
  var state = window.FM24State.marketUI;
  var market = window.FM24State.market;
  var tactic = window.FM24State.tactic;
  _invalidateShortlistCache();
  var marketIndexMap = new Map();
  for (var mii = 0; mii < market.length; mii++) {
    marketIndexMap.set(market[mii], mii);
  }
  var allSlotIds = Object.keys(tactic.slots);
  var slotGroups = [];
  var groupMap = {};
  for (var gi = 0; gi < allSlotIds.length; gi++) {
    var gsid = allSlotIds[gi];
    var gslot = tactic.slots[gsid];
    var gkey = gslot.roleId ? (gslot.roleId + "|" + gslot.duty) : gsid;
    if (!groupMap[gkey]) {
      groupMap[gkey] = { key: gkey, slotIds: [gsid] };
      slotGroups.push(groupMap[gkey]);
    } else {
      groupMap[gkey].slotIds.push(gsid);
    }
  }
  slotGroups.sort(function (a, b) {
    var aPos = slotPositionOrder(a.slotIds[0]);
    var bPos = slotPositionOrder(b.slotIds[0]);
    if (aPos !== bPos) return aPos - bPos;
    return a.slotIds[0].localeCompare(b.slotIds[0]);
  });
  var slotGroupMap = {};
  for (var gi = 0; gi < slotGroups.length; gi++) {
    for (var gji = 0; gji < slotGroups[gi].slotIds.length; gji++) {
      slotGroupMap[slotGroups[gi].slotIds[gji]] = slotGroups[gi].slotIds;
    }
  }
  var resHeader = document.getElementById("market-results-header");
  var tblWrap = document.getElementById("market-table-wrapper");

  // Compute scores & filter
  var filtered = [];
  for (var i = 0; i < market.length; i++) {
    var p = market[i];
    var scores = computeMarketScores(p, tactic);
    if (!scores) continue;

    if (state.minAge !== undefined && (p.Age < state.minAge)) continue;
    if (state.maxAge !== undefined && (p.Age > state.maxAge)) continue;
    if (state.nationality) {
      var natQ = state.nationality.toLowerCase();
      var pNat = (p.Nation || p.Nationality || p.Nat || "").toLowerCase();
      if (pNat.indexOf(natQ) === -1) continue;
    }
    if (state.maxAP) {
      var maxApVal = parseFloat(state.maxAP);
      if (!isNaN(maxApVal) && (p.AP || 0) > maxApVal) continue;
    }
    if (state.maxWage) {
      var maxWageVal = parseFloat(state.maxWage);
      if (!isNaN(maxWageVal) && (p.Wage || 0) > maxWageVal) continue;
    }
    if (state.strata && state.strata !== "All") {
      var pStrA = p.strata;
      if (!pStrA || !Array.isArray(pStrA) || pStrA.indexOf(state.strata) === -1) continue;
    }
    if (state.flank && state.flank !== "All") {
      var pFl = p.flanks;
      if (!pFl || !Array.isArray(pFl) || pFl.indexOf(state.flank) === -1) continue;
    }
    if (state.minScore !== undefined && (scores._bestScore === -1 || scores._bestScore < state.minScore)) continue;

    if (state.minMins) {
      var mMins = parseInt(p.Mins, 10);
      if (isNaN(mMins) || mMins < state.minMins) continue;
    }
    if (state.minRat) {
      var mRat = parseFloat(p.AvRat);
      if (isNaN(mRat) || mRat < state.minRat) continue;
    }

    if (state.onlyShortlisted) {
      if (isShortlistedIdx(p) === -1) continue;
    }

    filtered.push({ player: p, scores: scores });
  }

  // Sort
  var sortBy = state.sortBy || "best_score";
  var sortAsc = state.sortAsc === true;
  filtered.sort(function (a, b) {
    var va, vb;
    if (sortBy === "name") {
      va = (a.player.Name || "").toLowerCase();
      vb = (b.player.Name || "").toLowerCase();
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    if (sortBy === "age") { va = a.player.Age || 0; vb = b.player.Age || 0; }
    else if (sortBy === "club") {
      va = (a.player.Club || "").toLowerCase();
      vb = (b.player.Club || "").toLowerCase();
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    else if (sortBy === "nat") {
      va = (a.player.Nation || "").toLowerCase();
      vb = (b.player.Nation || "").toLowerCase();
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    else if (sortBy === "pos") {
      var order = STRATA_ORDER;
      var sa = a.player.strata;
      var sb = b.player.strata;
      va = order.indexOf(sa && sa.length ? sa[0] : "");
      vb = order.indexOf(sb && sb.length ? sb[0] : "");
      if (va === -1) va = 999;
      if (vb === -1) vb = 999;
    }
    else if (sortBy === "ap") { va = a.player.AP || 0; vb = b.player.AP || 0; }
    else if (sortBy === "wage") { va = a.player.Wage || 0; vb = b.player.Wage || 0; }
    else if (sortBy === "best_score") { va = a.scores._bestScore || 0; vb = b.scores._bestScore || 0; }
    else if (sortBy === "best_role") {
      va = (a.scores._bestSlotId ? slotDisplayLabel(a.scores._bestSlotId) : "");
      vb = (b.scores._bestSlotId ? slotDisplayLabel(b.scores._bestSlotId) : "");
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    else {
      var sa = a.scores[sortBy];
      var sb = b.scores[sortBy];
      va = sa && sa.total !== undefined ? sa.total : -1;
      vb = sb && sb.total !== undefined ? sb.total : -1;
    }
    return sortAsc ? va - vb : vb - va;
  });

  // Pagination
  var pageSize = 200;
  var totalFiltered = filtered.length;
  var maxPage = Math.ceil(totalFiltered / pageSize) - 1;
  if (maxPage < 0) maxPage = 0;
  if (state.currentPage === undefined) state.currentPage = 0;
  state.currentPage = Math.min(state.currentPage, maxPage);
  var pageStart = state.currentPage * pageSize;
  filtered = filtered.slice(pageStart, pageStart + pageSize);

  // Update results header
  if (resHeader) {
    var shortlistCount = window.FM24State.shortlist.length;
    var slBtnLabel = state.onlyShortlisted ? "Show All" : "View Shortlist (" + shortlistCount + ")";
    resHeader.innerHTML = "<div class='flex items-center gap-3 mb-3 flex-wrap'>" +
      "<span class='text-xs tracking-wider text-[#666666]'>Results: " + totalFiltered + " players</span>" +
      (totalFiltered > pageSize ? "<span class='text-xs text-text-muted'>Page " + (state.currentPage + 1) + " of " + (maxPage + 1) + " <button class='page-prev-btn px-2 py-0.5 text-xs border border-[#333] rounded text-text-secondary hover:text-white hover:border-[#666] transition-colors' " + (state.currentPage === 0 ? "disabled style='opacity:0.4;cursor:default'" : "") + ">\u25C0 Prev</button><button class='page-next-btn px-2 py-0.5 text-xs border border-[#333] rounded text-text-secondary hover:text-white hover:border-[#666] transition-colors' " + (state.currentPage >= maxPage ? "disabled style='opacity:0.4;cursor:default'" : "") + ">Next \u25B6</button></span>" : "") +
      "<button class='shortlist-view-btn px-2.5 py-1 text-xs border border-[#1F1F1F] text-[#CCCCCC] rounded hover:bg-[#1A1A1A] hover:text-white transition-colors' id='shortlist-view-btn'>" + slBtnLabel + "</button>" +
      "<button class='shortlist-export-btn px-2.5 py-1 text-xs border border-[#1F1F1F] text-[#CCCCCC] rounded hover:bg-[#1A1A1A] hover:text-white transition-colors' id='shortlist-export-btn'>Export Shortlist</button>" +
    "</div>";
    document.getElementById("shortlist-view-btn").addEventListener("click", function () {
      state.onlyShortlisted = !state.onlyShortlisted;
      state.currentPage = 0;
      _marketRenderResults();
    });
    document.getElementById("shortlist-export-btn").addEventListener("click", exportShortlistCSV);
    var prevBtn = resHeader.querySelector(".page-prev-btn");
    var nextBtn = resHeader.querySelector(".page-next-btn");
    if (prevBtn) prevBtn.addEventListener("click", function () { if (state.currentPage > 0) { state.currentPage--; _marketRenderResults(); } });
    if (nextBtn) nextBtn.addEventListener("click", function () { if (state.currentPage < maxPage) { state.currentPage++; _marketRenderResults(); } });
  }

  if (!tblWrap) return;
  if (filtered.length === 0) {
    tblWrap.innerHTML = "<div class='text-xs text-[#666666] text-center py-8'>No players match the current filters.</div>";
    return;
  }

  // Column configs
  var stickyCols = [
    { key: "star", label: "", width: 30, sortable: false, align: "center" },
    { key: "name", label: "Name", width: 160, sortable: true },
    { key: "age", label: "Age", width: 55, sortable: true, align: "right", title: "Age" },
    { key: "club", label: "Club", width: 130, sortable: true },
    { key: "nat", label: "Nat", width: 80, sortable: true },
    { key: "pos", label: "Pos", width: 100, sortable: true },
    { key: "ap", label: "AP", width: 90, sortable: true, align: "right", title: "Average Price" },
    { key: "wage", label: "Wage", width: 90, sortable: true, align: "right", title: "Weekly Wage" },
  ];
  var slotColWidth = 80;
  var bestScoreWidth = 80;
  var bestRoleWidth = 130;

  // Calculate accumulated left offsets for sticky columns
  var leftAccum = 0;
  var stickyColsWithLeft = stickyCols.map(function (col) {
    var offset = leftAccum;
    leftAccum += col.width;
    return { key: col.key, label: col.label, width: col.width, sortable: col.sortable, align: col.align, title: col.title, left: offset };
  });

  // Slot column headers (grouped by role+duty, ordered by strata)
  var slotHeaders = slotGroups.map(function (g) {
    return { slotId: g.slotIds[0], title: slotDisplayLabel(g.slotIds[0]), label: slotMatrixLabel(g.slotIds[0]) };
  });

  // Build table
  var html = "<table class='w-full text-xs'><thead><tr class='bg-[#0A0A0A] border-b border-[#1F1F1F]'>";

  // Sticky headers
  for (var si = 0; si < stickyColsWithLeft.length; si++) {
    var col = stickyColsWithLeft[si];
    var sortClass = col.sortable ? " mm-sort-th" : "";
    var sortDir = "";
    if (state.sortBy === col.key) {
      sortDir = state.sortAsc ? " \u25B2" : " \u25BC";
    }
    html += "<th class='sticky z-10 bg-[#0A0A0A] text-white font-semibold tracking-tight whitespace-nowrap" + sortClass + "' style='left:" + col.left + "px;width:" + col.width + "px;min-width:" + col.width + "px;z-index:3'" +
      (col.title ? " title='" + col.title + "'" : "") + " data-sort-key='" + col.key + "'>" + col.label + sortDir + "</th>";
  }

  // Slot headers
  for (var shi = 0; shi < slotHeaders.length; shi++) {
    var sh = slotHeaders[shi];
    var shSortDir = "";
    if (state.sortBy === sh.slotId) {
      shSortDir = state.sortAsc ? " \u25B2" : " \u25BC";
    }
    html += "<th class='mm-sort-th text-white font-semibold tracking-tight whitespace-nowrap text-center' style='width:" + slotColWidth + "px;min-width:" + slotColWidth + "px' title='" + escHtml(sh.title) + "' data-sort-key='" + sh.slotId + "'>" + escHtml(sh.label) + shSortDir + "</th>";
  }

  // Summary headers
  var bsSortDir = state.sortBy === "best_score" ? (state.sortAsc ? " \u25B2" : " \u25BC") : "";
  html += "<th class='mm-sort-th text-white font-semibold tracking-tight whitespace-nowrap text-right pr-2' style='width:" + bestScoreWidth + "px;min-width:" + bestScoreWidth + "px' data-sort-key='best_score'>Best" + bsSortDir + "</th>";
  var brSortDir = state.sortBy === "best_role" ? (state.sortAsc ? " \u25B2" : " \u25BC") : "";
  html += "<th class='mm-sort-th text-white font-semibold tracking-tight whitespace-nowrap text-left pl-3 border-l border-[#1F1F1F]' style='width:" + bestRoleWidth + "px;min-width:" + bestRoleWidth + "px' data-sort-key='best_role'>Best Role" + brSortDir + "</th>";

  html += "</tr></thead><tbody>";

  // Player rows
  for (var ri = 0; ri < filtered.length; ri++) {
    var f = filtered[ri];
    var pl = f.player;
    var sc = f.scores;

    var flankStr = "";
    var fl = pl.flanks || [];
    if (fl.indexOf("L") !== -1 && fl.indexOf("R") !== -1) flankStr = " <span class='text-[#666666] text-[10px]'>\u25C0\u25B6</span>";
    else if (fl.indexOf("L") !== -1) flankStr = " <span class='text-[#666666] text-[10px]'>\u25C0</span>";
    else if (fl.indexOf("R") !== -1) flankStr = " <span class='text-[#666666] text-[10px]'>\u25B6</span>";

    var slIdx = isShortlistedIdx(pl);
    var starClass = slIdx !== -1 ? "star-filled" : "star-empty";
    var starSymbol = slIdx !== -1 ? "\u2605" : "\u2606";

    html += "<tr class='market-row cursor-pointer' data-mkt-idx='" + marketIndexMap.get(pl) + "'>";

    // Sticky cells
    for (var sci = 0; sci < stickyColsWithLeft.length; sci++) {
      var scCol = stickyColsWithLeft[sci];
      var val = "";
      var cls = "sticky z-10 bg-[#000000]";
      var alignCls = "";
      if (scCol.align === "center") alignCls = " text-center";
      else if (scCol.align === "right") alignCls = " text-right pr-2 font-mono tabular-nums";
      if (scCol.key === "name") alignCls = " text-left whitespace-nowrap";

      if (scCol.key === "star") {
        val = "<span class='star-toggle cursor-pointer " + starClass + "' data-star-idx='" + marketIndexMap.get(pl) + "'>" + starSymbol + "</span>";
      } else if (scCol.key === "name") {
        val = escHtml(pl.Name);
      } else if (scCol.key === "age") {
        val = pl.Age || "-";
      } else if (scCol.key === "club") {
        val = escHtml(pl.Club || "");
      } else if (scCol.key === "nat") {
        val = escHtml(pl.Nation || pl.Nationality || pl.Nat || "");
      } else if (scCol.key === "pos") {
        val = escHtml(pl.Position || "") + flankStr;
      } else if (scCol.key === "ap") {
        val = escHtml(pl.APDisplay || (pl.AP || "-"));
      } else if (scCol.key === "wage") {
        val = escHtml(pl.WageDisplay || (pl.Wage || "-"));
      }

      html += "<td class='" + cls + alignCls + "' style='left:" + scCol.left + "px;width:" + scCol.width + "px;min-width:" + scCol.width + "px'" +
        (scCol.title ? " title='" + scCol.title + "'" : "") + ">" + val + "</td>";
    }

    // Slot cells (best score across grouped slots)
    for (var sgi = 0; sgi < slotGroups.length; sgi++) {
      var g = slotGroups[sgi];
      var bestRes = null;
      for (var gji = 0; gji < g.slotIds.length; gji++) {
        var r = sc[g.slotIds[gji]];
        if (r !== null && (bestRes === null || r.total > bestRes.total)) {
          bestRes = r;
        }
      }
      if (bestRes === null) {
        html += "<td class='text-center text-[#666666]'>\u2014</td>";
      } else {
        html += "<td class='text-center'>" +
          "<span class='inline-block px-2 py-0.5 text-xs leading-tight bg-[#222222] text-white rounded font-mono tabular-nums'>" + bestRes.total + "</span>" +
        "</td>";
      }
    }

    // Summary cells
    if (sc._bestScore !== null && sc._bestScore !== -1) {
      html += "<td class='text-right pr-2 font-mono tabular-nums font-bold text-white'>" + sc._bestScore + "</td>";
      html += "<td class='text-left text-white truncate' style='max-width:130px'>" + (sc._bestSlotId ? slotDisplayLabel(sc._bestSlotId) : "") + "</td>";
    } else {
      html += "<td class='text-right pr-2 text-[#666666]'>\u2014</td>";
      html += "<td class='text-center text-[#666666]'>\u2014</td>";
    }

    html += "</tr>";
  }

  html += "</tbody></table>";
  tblWrap.innerHTML = html;

  // Sort click handlers
  tblWrap.querySelectorAll(".mm-sort-th").forEach(function (el) {
    el.addEventListener("click", function () {
      var key = this.dataset.sortKey;
      if (!key) return;
      if (state.sortBy === key) {
        state.sortAsc = !state.sortAsc;
      } else {
        state.sortBy = key;
        state.sortAsc = (key === "name" || key === "club" || key === "nat" || key === "pos" || key === "best_role");
      }
      state.currentPage = 0; _marketRenderResults();
    });
  });

  // Star toggle handlers
  tblWrap.querySelectorAll(".star-toggle").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.stopPropagation();
      var idx = parseInt(this.dataset.starIdx, 10);
      if (isNaN(idx)) return;
      var player = market[idx];
      if (!player) return;
      var slIdx = isShortlistedIdx(player);
      if (slIdx !== -1) {
        window.FM24State.shortlist.splice(slIdx, 1);
      } else {
        var pScores = player._marketScores;
        window.FM24State.shortlist.push({
          player: player,
          targetSlotId: pScores._bestSlotId,
          scoreAtShortlist: pScores._bestScore,
          bestSlotId: pScores._bestSlotId
        });
      }
      _invalidateShortlistCache();
      _marketRenderResults();
    });
  });

  // Row click -> player card
  tblWrap.querySelectorAll(".market-row").forEach(function (row) {
    row.addEventListener("click", function () {
      var idx = parseInt(this.dataset.mktIdx, 10);
      if (!isNaN(idx) && market[idx]) {
        renderPlayerCard(market[idx]);
      }
    });
  });

  // If a selectedSlotId is set, scroll to that column (or its group)
  if (state.selectedSlotId) {
    var targetKey = state.selectedSlotId;
    for (var si = 0; si < slotGroups.length; si++) {
      if (slotGroups[si].slotIds.indexOf(state.selectedSlotId) !== -1) {
        targetKey = slotGroups[si].slotIds[0];
        break;
      }
    }
    var targetTh = tblWrap.querySelector("th[data-sort-key='" + targetKey + "']");
    if (targetTh) {
      targetTh.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      targetTh.style.borderBottom = "1px solid #FFFFFF";
    }
  }
}
