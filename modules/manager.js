// ─── MANAGER MODULE ───

function escAttr(s) {
  if (typeof s !== "string") return s;
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── PHASE 1: Staff HTML Parser ───

function parseStaffHTML(htmlText, onProgress) {
  return new Promise(function (resolve) {
    var doc = new DOMParser().parseFromString(htmlText, "text/html");
    var allRows = doc.querySelectorAll("tr");
    var headers = [];
    var dataRows = [];

    var headerCells = doc.querySelectorAll("tr th");
    if (headerCells.length > 0) {
      headerCells.forEach(function (th) { headers.push(th.textContent.trim()); });
      allRows.forEach(function (tr) {
        if (tr.querySelector("td")) dataRows.push(tr);
      });
    } else {
      if (allRows.length > 0) {
        allRows[0].querySelectorAll("td").forEach(function (td) { headers.push(td.textContent.trim()); });
        for (var ri = 1; ri < allRows.length; ri++) {
          if (allRows[ri].querySelector("td")) dataRows.push(allRows[ri]);
        }
      }
    }

    var NUMERIC_COLS = {
      Age: true, CA: true, PA: true, Temp: true, Spor: true, Prof: true,
      Pres: true, Loy: true, Cont: true, Amb: true, Youth: true,
      Tec: true, "Tac Knw": true, SPC: true, Mot: true, Men: true,
      Dis: true, "Jud SA": true, "Judge P": true, "Judge A": true,
      Ada: true, "Ana D": true, Att: true, Mgm: true, TCo: true
    };
    var FLOAT_COLS = { "Win %": true, "Draw %": true, "Loss %": true };
    var INT_COLS = { Pld: true, For: true, Ag: true, Drn: true, GD: true };

    var staff = [];
    var CHUNK_SIZE = 50;
    var idx = 0;

    function processChunk() {
      var limit = Math.min(idx + CHUNK_SIZE, dataRows.length);
      for (; idx < limit; idx++) {
        var tr = dataRows[idx];
        var cells = tr.querySelectorAll("td");
        var entry = {};
        headers.forEach(function (h, i) {
          var raw = cells[i] ? cells[i].textContent.trim() : "";
          var val = raw === "-" || raw === "" ? "" : raw;
          if (NUMERIC_COLS[h]) {
            var n = parseInt(val, 10);
            entry[h] = isNaN(n) ? 0 : n;
          } else if (FLOAT_COLS[h]) {
            var f = parseFloat(val);
            entry[h] = isNaN(f) ? null : f;
          } else if (INT_COLS[h]) {
            var intv = parseInt(val, 10);
            entry[h] = isNaN(intv) ? null : intv;
          } else {
            entry[h] = val;
          }
        });

        if (!entry.Name) continue;

        entry.isManagerEligible = ["Head Coach", "Manager", "Sporting Director", "Technical Director"]
          .indexOf(entry["Preferred Job"]) !== -1;
        entry.displayName = entry.Name;

        staff.push(entry);
      }

      if (typeof onProgress === "function") {
        onProgress(idx, dataRows.length);
      }

      if (idx < dataRows.length) {
        setTimeout(processChunk, 0);
      } else {
        resolve(staff);
      }
    }

    setTimeout(processChunk, 0);
  });
}

function filterEligibleManagers(staffArray) {
  return staffArray.filter(function (s) { return s.isManagerEligible; })
    .sort(function (a, b) { return (b.CA || 0) - (a.CA || 0); });
}

// ─── PHASE 3: Manager Report Generator ───

function generateManagerReport(manager, tactic, squad) {
  var archetype = deriveArchetype(manager);
  var pronoun = manager.Sex === "Female" ? "she" : "he";
  var possessive = manager.Sex === "Female" ? "her" : "his";

  var managerSummary = manager.Name + " is a " + archetype + " who prefers "
    + (manager["Playing Mentality"] || "Balanced") + " football out of a "
    + (manager["Preferred Formation"] || "flexible shape") + ". With "
    + (manager["Tac Knw"] || 0) + "/20 tactical knowledge and "
    + (manager.Att || 0) + "/20 attacking instinct, " + pronoun + " will demand "
    + (manager.Dis >= 12 ? "discipline and structure" : "creativity and freedom")
    + " from the squad.";

  var playingMentality = manager["Playing Mentality"] || "";
  var att = manager.Att || 0;
  var formation = tactic.formation;

  var reason;
  var pref = manager["Preferred Formation"];
  var prefMap = pref && FM_FORMATION_MAP ? FM_FORMATION_MAP[pref] : null;
  var prefFam = prefMap ? getFormationFamily(prefMap) : null;
  var tactFam = formation ? getFormationFamily(formation) : null;
  if (prefMap && prefMap === formation) {
    reason = "it matches " + manager.Name + "'s preferred shape exactly";
  } else if (prefFam && tactFam && prefFam === tactFam) {
    reason = "this formation family aligns with " + manager.Name + "'s tactical preferences";
  } else if ((manager.Ada || 0) >= 14) {
    reason = "the squad's personnel suits this structure";
  } else if (att >= 10) {
    reason = "the attacking intent demands width and penetration";
  } else {
    reason = "the defensive priorities favour compactness and shape";
  }

  var loe = tactic.instructions.lineOfEngagement;
  var pressingDesc = (loe === "High" || loe === "Much Higher") ? "aggressive high pressing" :
                     (loe === "Low" || loe === "Very Low") ? "deep defensive blocks" : "balanced pressing";

  var pd = tactic.instructions.passingDirectness;
  var passingDesc = (pd === "Shorter" || pd === "Much Shorter" || pd === "Extremely Short") ? "short, controlled passing" :
                    (pd === "More Direct" || pd === "Much More Direct" || pd === "Extremely Direct") ? "direct, vertical passing" : "mixed passing";

  var highlights = [];
  if (tactic.instructions.workBallIntoBox) highlights.push("The team will work the ball into the box patiently.");
  if (tactic.instructions.runAtDefence) highlights.push("Players are encouraged to run at the opposition defence.");
  if (tactic.instructions.passIntoSpace) highlights.push("Passes will be directed into space for runners.");
  if (tactic.instructions.playOutOfDefence) highlights.push("The side will play out from the back.");
  if (tactic.instructions.creativeFreedom === "More Expressive") highlights.push("Players have expressive creative freedom.");
  if (tactic.instructions.creativeFreedom === "More Disciplined") highlights.push("Tactical discipline is strictly enforced.");

  if (tactic.instructions.whenPossessionLost === "Counter-Press") {
    highlights.push("They will look to counter-press immediately upon losing possession.");
  } else if (tactic.instructions.whenPossessionLost === "Regroup") {
    highlights.push("The side will regroup into a solid defensive block once possession is lost.");
  }
  if (tactic.instructions.whenPossessionWon === "Counter") {
    highlights.push("Quick counter-attacks will be launched immediately upon winning the ball.");
  } else if (tactic.instructions.whenPossessionWon === "Hold Shape") {
    highlights.push("They will look to stabilize structure and keep possession after winning the ball.");
  }

  if (tactic.instructions.gkDistributionMethod === "Roll It Out" || tactic.instructions.gkDistributionMethod === "Take Short Kicks") {
    highlights.push("The goalkeeper will build play patiently from the back.");
  } else if (tactic.instructions.gkDistributionMethod === "Take Long Kicks") {
    highlights.push("The goalkeeper will kick long to bypass initial pressing lines.");
  }

  if (tactic.instructions.playForSetPieces) {
    highlights.push("The team will actively play for set-pieces to exploit dead-ball situations.");
  }

  if (tactic.instructions.tackling === "Get Stuck In") {
    highlights.push("Players are instructed to be aggressive in their tackling to win possession.");
  }

  var tacticRationale = "The " + formation + " was selected because " + reason + ". "
    + "Team instructions reflect " + pressingDesc + " and " + passingDesc + ". "
    + (highlights.length > 0 ? highlights.join(" ") : "The system plays to the squad's strengths.");

  // Squad strengths — count eligible players per strata used in tactic
  var squadStrengths = [];
  if (tactic.slots) {
    var slotKeys = Object.keys(tactic.slots);
    var strataSlots = {};
    slotKeys.forEach(function (sid) {
      var def = GLOBAL_PITCH_SLOTS[sid];
      if (!def) return;
      if (!strataSlots[def.strata]) strataSlots[def.strata] = [];
      strataSlots[def.strata].push(sid);
    });
    for (var strata in strataSlots) {
      if (!strataSlots.hasOwnProperty(strata)) continue;
      var eligibleCount = 0;
      var topPlayerName = "";
      var topScore = 0;
      for (var pi = 0; pi < squad.length; pi++) {
        var pl = squad[pi];
        if (!pl.strata || !Array.isArray(pl.strata) || pl.strata.indexOf(strata) === -1) continue;
        eligibleCount++;
        // Score for the first slot in this strata
        var sampleSlot = strataSlots[strata][0];
        var roleId = tactic.slots[sampleSlot] ? tactic.slots[sampleSlot].roleId : null;
        if (roleId) {
          var scoreObj = scorePlayerForRole(pl, roleId, tactic.instructions);
          if (scoreObj && scoreObj.total > topScore) {
            topScore = scoreObj.total;
            topPlayerName = pl.Name;
          }
        }
      }
      var minCount = strata === "GK" ? 2 : 3;
      if (eligibleCount >= minCount && topScore >= 12) {
        squadStrengths.push("Strong " + strata + " depth \u2014 " + (topPlayerName || "multiple options") + " leads the line.");
      }
    }
  }
  if (squadStrengths.length === 0) {
    squadStrengths.push("The squad has adequate numbers across most positions.");
  }

  // Squad gaps
  var squadGaps = [];
  if (tactic.gaps) {
    for (var gi = 0; gi < tactic.gaps.length; gi++) {
      var g = tactic.gaps[gi];
      var slotDef = GLOBAL_PITCH_SLOTS[g.slotId];
      var role = getRoleById(g.roleId);
      var bestAvailableName = "";
      var bestScore = 0;
      for (var pk = 0; pk < squad.length; pk++) {
        var candidate = squad[pk];
        if (isFlankEligible(candidate, g.slotId)) {
          var cs = scorePlayerForRole(candidate, g.roleId, tactic.instructions);
          if (cs && cs.total > bestScore) { bestScore = cs.total; bestAvailableName = candidate.Name; }
        }
      }
      squadGaps.push({
        slotId: g.slotId,
        roleName: role ? role.name : "Unknown",
        reason: g.reason,
        bestAvailable: bestAvailableName || "None"
      });
    }
  }

  var filledSlots = tactic.gaps ? tactic.gaps.length : 0;
  var totalSlots = tactic.slots ? Object.keys(tactic.slots).length : 11;
  var confidence = tactic.confidence !== undefined ? tactic.confidence : 1;
  var overallFit = "";
  if (confidence >= 0.8) overallFit = "Strong squad fit. This tactic can be implemented immediately.";
  else if (confidence >= 0.6) overallFit = "Moderate fit. " + filledSlots + " positions need reinforcement.";
  else if (confidence >= 0.4) overallFit = "Significant gaps. This system requires targeted recruitment.";
  else overallFit = "Poor squad fit. Major rebuild needed to implement this style.";

  var dna = getManagerDNA(manager.Name);
  var adaNorm = normalizeAttr(manager.Ada || 0);
  var adaLabel = adaNorm < 0.5 ? "inflexible" : adaNorm < 0.75 ? "pragmatic" : "highly adaptable";
  var varietyLabel = dna.roleExperimentation >= 0.6 ? "willing to experiment" :
                     dna.roleExperimentation >= 0.3 ? "occasionally tries variations" : "prefers proven formulas";
  var metaLabel = dna.metaPreference >= 0.6 ? "favours meta roles" :
                  dna.metaPreference >= 0.3 ? "balanced on meta roles" : "avoids meta roles";
  var adaptabilityContext = manager.Name + " is " + adaLabel + " (" + manager.Ada + "/20 Adaptability), "
    + varietyLabel + " and " + metaLabel + ". "
    + (adaNorm >= 0.75 ? possessive.charAt(0).toUpperCase() + possessive.slice(1) + " tactical flexibility means the formation was chosen to fit the squad." :
       adaNorm >= 0.5 ? possessive.charAt(0).toUpperCase() + possessive.slice(1) + " pragmatic nature allows some squad-based compromises." :
       "This system is based on " + possessive + " preferred approach rather than adapting to squad strengths.");

  return {
    managerSummary: managerSummary,
    tacticRationale: tacticRationale,
    adaptabilityContext: adaptabilityContext,
    squadStrengths: squadStrengths,
    squadGaps: squadGaps,
    overallFit: overallFit,
    archetype: archetype
  };
}

function deriveArchetype(manager) {
  // Uses the engine's scoring-based philosophy derivation if available
  if (typeof deriveManagerPhilosophy === "function") {
    return deriveManagerPhilosophy(manager);
  }
  // Fallback (should not be reached once engine loads)
  return "balanced tactician";
}

// ─── PHASE 4: Transfer Recommendations (Full Manager Mode) ───

function generateTransferRecommendations(manager, gaps, marketPlayers) {
  var recommendations = [];
  if (!gaps || gaps.length === 0) return recommendations;

  var priorityMap = { GK: "Critical", DC: "Critical", STC: "Critical",
    DMCL: "Important", DMC: "Important", DMCR: "Important",
    MCL: "Important", MC: "Important", MCR: "Important",
    DL: "Important", DR: "Important", DCL: "Critical", DCR: "Critical",
    WBL: "Important", WBR: "Important",
    AML: "Depth", AMR: "Depth", AMC: "Depth", AMCL: "Depth", AMCR: "Depth",
    ML: "Depth", MR: "Depth",
    STCL: "Depth", STCR: "Depth"
  };

  for (var gi = 0; gi < gaps.length; gi++) {
    var gap = gaps[gi];
    var slotDef = GLOBAL_PITCH_SLOTS[gap.slotId];
    var role = getRoleById(gap.roleId);
    var roleName = role ? role.name : "Unknown";
    var priorityLabel = priorityMap[gap.slotId] || "Depth";

    var targets = [];
    for (var pi = 0; pi < marketPlayers.length; pi++) {
      var mp = marketPlayers[pi];
      if (targets.length >= 5) break;
      if (!isFlankEligible(mp, gap.slotId)) continue;
      var scoreObj = scorePlayerForRole(mp, gap.roleId, {});
      if (!scoreObj || scoreObj.total < 8) continue;

      var apNum = mp.AP || 0;
      if (mp.APDisplay) {
        var apMatch = mp.APDisplay.match(/[\d.]+/);
        if (apMatch) apNum = parseFloat(apMatch[0]) * 1000000;
      }
      var valueScore = apNum > 0 ? scoreObj.total / (apNum / 5000000) : 0;
      var valueRating = valueScore >= 4 ? "Elite Value" :
        valueScore >= 2 ? "Good Value" :
        valueScore >= 1 ? "Fair" : "Expensive";

      targets.push({
        player: mp,
        score: scoreObj.total,
        fitLabel: scoreObj.fitLabel,
        valueRating: valueRating,
        valueScore: valueScore
      });
    }

    targets.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return b.valueScore - a.valueScore;
    });

    recommendations.push({
      slotId: gap.slotId,
      slotLabel: slotDef ? gap.slotId + " (" + slotDef.strata + ")" : gap.slotId,
      roleId: gap.roleId,
      roleName: roleName,
      targets: targets.slice(0, 5),
      priorityLabel: priorityLabel
    });
  }

  recommendations.sort(function (a, b) {
    var p = { Critical: 0, Important: 1, Depth: 2 };
    return (p[a.priorityLabel] || 3) - (p[b.priorityLabel] || 3);
  });

  return recommendations;
}

// ─── APPLY GENERATED TACTIC ───

function applyGeneratedTactic() {
  var mgr = window.FM24State.manager;
  if (!mgr.generatedTactic) return;
  var tac = mgr.generatedTactic;

  window.FM24State.tactic.formation = tac.formation;
  window.FM24State.tactic.slots = JSON.parse(JSON.stringify(tac.slots));
  window.FM24State.tactic.instructions = JSON.parse(JSON.stringify(tac.instructions));
  window.FM24State.tactic.isComplete = true;
  window.FM24State.tactic.subs = {};

  persistTactic();
  window.dispatchEvent(new CustomEvent("fm24:tactic-imported"));
  showToast(mgr.hired ? mgr.hired.Name + "'s tactic has been applied." : "Manager tactic applied.", "success");
  window.FM24SwitchTab("tactic");
}

// ─── PHASE 5: Manager Section UI ───

function renderManagerView() {
  var container = document.getElementById("manager-content");
  if (!container) return;
  var state = window.FM24State.manager;

  var html = "";
  html += '<div class="max-w-5xl mx-auto">';
  html += '<h2 class="text-sm font-bold tracking-wider uppercase text-white mb-4">Manager</h2>';

  // Step indicators
  var step = 1;
  if (state.roster.length > 0) step = 2;
  if (state.hired) step = 3;
  if (state.generatedTactic) step = 4;

  html += '<div class="flex gap-2 mb-6 text-xs">';
  for (var si = 1; si <= 4; si++) {
    var cls = si === step ? "text-white font-bold" : si < step ? "text-green-400" : "text-text-muted";
    var label = si === 1 ? "Upload Staff" : si === 2 ? "Hire" : si === 3 ? "Analyse" : "Results";
    html += '<span class="' + cls + '">' + (si < step ? "\u2713 " : "") + si + ". " + label + "</span>";
    if (si < 4) html += '<span class="text-text-muted">\u2014</span>';
  }
  html += "</div>";

  // Hired manager card (always show if hired)
  if (state.hired) {
    html += renderManagerCard(state.hired);
  }

  if (step === 1) {
    html += renderStaffUploadStep(state);
  } else if (step === 2) {
    html += renderHireStep(state);
  } else if (step === 3) {
    html += renderAnalyseStep(state);
  } else if (step === 4) {
    html += renderResultsStep(state);
  }

  html += "</div>";
  container.innerHTML = html;

  // Wire events after render
  if (step === 2 && state.roster.length > 0) wireManagerRowClicks();
  if (step === 3 && state.hired) wireAnalyseButton();
  if (step === 4) wireResultsButtons();
  wireResetButton();
}

function renderStaffUploadStep(state) {
  var html = "";
  html += '<div class="border-2 border-dashed border-border rounded p-8 text-center cursor-pointer transition-colors hover:border-text-secondary bg-surface" id="staff-upload-zone">';
  html += '<p class="text-sm text-text-secondary mb-3">Upload Staff HTML (FM24 export)</p>';
  html += '<input type="file" accept=".html,.htm" class="block mx-auto mb-2 text-xs text-text-secondary file:mr-3 file:py-1 file:px-3 file:border file:border-border file:rounded file:text-xs file:bg-surface file:text-white hover:file:bg-surface-hover">';
  html += '<span class="text-xs text-text-muted">or drag &amp; drop here</span>';
  html += "</div>";
  return html;
}

function renderManagerCard(manager) {
  var archetype = deriveArchetype(manager);
  var html = "";
  html += '<div class="bg-surface border border-border rounded p-4 mb-4">';
  html += '<div class="flex items-start justify-between">';
  html += '<div>';
  html += '<div class="text-sm font-bold text-white">' + escHtml(manager.Name) + "</div>";
  html += '<div class="text-xs text-text-muted">' + escHtml(manager["Preferred Job"] || "") + " \u2022 CA " + (manager.CA || 0) + "</div>";
  html += '<div class="text-xs text-green-400 mt-1">' + escHtml(archetype) + "</div>";
  html += "</div>";
  html += '<button class="text-xs text-text-muted hover:text-white transition-colors" id="hire-different-btn">Hire Different</button>';
  html += "</div>";
  html += '<div class="grid grid-cols-3 gap-2 mt-3 text-xs">';
  html += '<div><span class="text-text-muted">Formation</span><br><span class="text-white">' + escHtml(manager["Preferred Formation"] || "\u2014") + "</span></div>";
  html += '<div><span class="text-text-muted">Mentality</span><br><span class="text-white">' + escHtml(manager["Playing Mentality"] || "\u2014") + "</span></div>";
  html += '<div><span class="text-text-muted">Pressing</span><br><span class="text-white">' + escHtml(manager["Pressing Style"] || "\u2014") + "</span></div>";
  html += '<div><span class="text-text-muted">Tac Knw</span><br><span class="text-white">' + (manager["Tac Knw"] || 0) + "/20</span></div>";
  html += '<div><span class="text-text-muted">Att</span><br><span class="text-white">' + (manager.Att || 0) + "/20</span></div>";
  html += '<div><span class="text-text-muted">Ada</span><br><span class="text-white">' + (manager.Ada || 0) + "/20</span></div>";
  html += "</div>";
  html += "</div>";
  return html;
}

function computeFitScoresAsync(eligible, squad, onComplete) {
  var scores = {};
  var idx = 0;
  var CHUNK = 3;

  function processChunk() {
    var limit = Math.min(idx + CHUNK, eligible.length);
    for (; idx < limit; idx++) {
      try {
        scores[eligible[idx].Name] = calculateManagerFit(eligible[idx], squad);
      } catch (_) {
        scores[eligible[idx].Name] = null;
      }
    }
    if (idx < eligible.length) {
      setTimeout(processChunk, 0);
    } else {
      onComplete(scores);
    }
  }

  setTimeout(processChunk, 0);
}

function renderHireStep(state) {
  var squad = window.FM24State.squad;
  var hasSquad = squad && squad.length > 0;
  var fitScoresReady = window.FM24State.manager.fitScoresReady;

  // Initialize filter state
  if (!window.FM24State.managerFilters) {
    window.FM24State.managerFilters = { archetype: "All", fitMin: 0, fitMax: 100, sortBy: "fit", searchQuery: "" };
  }
  var filters = window.FM24State.managerFilters;
  var fitDisabled = hasSquad && !fitScoresReady;

  var html = "";
  html += '<div class="text-xs text-text-muted mb-3">' + state.roster.length + " staff loaded, " + filterEligibleManagers(state.roster).length + " eligible managers.";
  html += ' <button id="change-staff-btn" class="text-xs text-text-muted hover:text-white underline transition-colors ml-2">[Change Staff]</button>';

  // Change squad link
  if (hasSquad) {
    html += ' <button id="change-squad-btn" class="text-xs text-text-muted hover:text-white underline transition-colors ml-2">Change Squad</button>';
  }

  var hasMarket = window.FM24State.market && window.FM24State.market.length > 0;
  if (hasMarket) {
    html += ' <button id="change-market-btn" class="text-xs text-text-muted hover:text-white underline transition-colors ml-2">Change Market</button>';
  }

  html += '</div>';

  // Filter bar
  html += '<div class="flex flex-wrap gap-2 mb-3 items-center">';
  html += '<input id="hire-search-input" type="text" placeholder="Search name\u2026" value="' + escAttr(filters.searchQuery) + '" class="w-36 text-xs bg-surface border border-border rounded px-2 py-1 text-white placeholder:text-text-muted">';
  html += '<select id="hire-archetype-filter" class="text-xs bg-surface border border-border rounded px-2 py-1 text-white">';
  var knownArchetypes = [
    "All",
    "possession-oriented tactician",
    "aggressive high-press tactician",
    "disciplined defensive organiser",
    "direct counter-attacker",
    "pragmatic system-adapter",
    "balanced tactician"
  ];
  for (var ai = 0; ai < knownArchetypes.length; ai++) {
    var selArch = knownArchetypes[ai] === filters.archetype ? "selected" : "";
    html += '<option value="' + knownArchetypes[ai] + '" ' + selArch + '>' + knownArchetypes[ai] + '</option>';
  }
  html += '</select>';
  if (hasSquad) {
    html += '<span class="text-xs text-text-muted">Fit:</span>';
    html += '<input id="hire-fit-min" type="number" min="0" max="100" placeholder="0" value="' + filters.fitMin + '" class="w-14 text-xs bg-surface border border-border rounded px-1 py-1 text-white" ' + (fitDisabled ? 'disabled style="opacity:0.5"' : "") + ">";
    html += '<span class="text-xs text-text-muted mx-1">-</span>';
    html += '<input id="hire-fit-max" type="number" min="0" max="100" placeholder="100" value="' + filters.fitMax + '" class="w-14 text-xs bg-surface border border-border rounded px-1 py-1 text-white" ' + (fitDisabled ? 'disabled style="opacity:0.5"' : "") + ">";
  }
  html += '<span class="text-xs text-text-muted ml-1">Sort:</span>';
  html += '<select id="hire-sort-select" class="text-xs bg-surface border border-border rounded px-2 py-1 text-white">';
  var sortOptions = [["fit", "Fit"], ["name", "Name"], ["age", "Age"], ["ca", "CA"], ["archetype", "Archetype"]];
  for (var si = 0; si < sortOptions.length; si++) {
    var selSort = sortOptions[si][0] === filters.sortBy ? "selected" : "";
    html += '<option value="' + sortOptions[si][0] + '" ' + selSort + '>' + sortOptions[si][1] + '</option>';
  }
  html += '</select>';

  // Show computing indicator
  if (fitDisabled) {
    html += '<span class="text-xs text-yellow-400 ml-2">Computing fit scores\u2026</span>';
  }

  html += '</div>';

  // Table
  html += '<div class="overflow-x-auto">';
  html += '<table class="w-full text-xs">';
  html += "<thead><tr class='text-text-muted border-b border-border'>";
  html += "<th class='text-left py-2 pr-2'>Name</th>";
  html += "<th class='text-left py-2 pr-2'>Age</th>";
  html += "<th class='text-left py-2 pr-2'>Job</th>";
  html += "<th class='text-left py-2 pr-2'>CA</th>";
  html += "<th class='text-left py-2 pr-2'>Archetype</th>";
  html += "<th class='text-left py-2 pr-2'>Mentality</th>";
  html += "<th class='text-left py-2 pr-2'>Pressing</th>";
  html += "<th class='text-left py-2 pr-2'>Formation</th>";
  if (hasSquad) {
    html += "<th class='text-left py-2 pr-2'>Fit</th>";
  }
  html += "</tr></thead><tbody>";

  var eligible = filterEligibleManagers(state.roster);

  // Pre-calculate archetypes (fast, synchronous)
  var archetypes = {};
  for (var fi = 0; fi < eligible.length; fi++) {
    archetypes[eligible[fi].Name] = deriveArchetype(eligible[fi]);
  }

  // Use cached fit scores or placeholders
  var fitScores = fitScoresReady ? window.FM24State.manager.fitScores : {};

  // Apply filters (skip fit range when scores not ready)
  var filtered = [];
  for (var fi2 = 0; fi2 < eligible.length; fi2++) {
    var m2 = eligible[fi2];
    var arch = archetypes[m2.Name];
    var fit = fitScoresReady && fitScores[m2.Name] ? fitScores[m2.Name].overallScore : null;
    if (filters.archetype !== "All" && arch !== filters.archetype) continue;
    if (filters.searchQuery && m2.Name.toLowerCase().indexOf(filters.searchQuery.toLowerCase()) === -1) continue;
    if (fitScoresReady && fit !== null && (fit < filters.fitMin || fit > filters.fitMax)) continue;
    filtered.push(m2);
  }

  // Sort (fall back to name sort when scores not ready and sortBy is fit)
  var effectiveSort = fitScoresReady ? filters.sortBy : (filters.sortBy === "fit" ? "name" : filters.sortBy);
  filtered.sort(function (a, b) {
    var archA = archetypes[a.Name];
    var archB = archetypes[b.Name];
    var fitA = fitScoresReady && fitScores[a.Name] ? fitScores[a.Name].overallScore : -1;
    var fitB = fitScoresReady && fitScores[b.Name] ? fitScores[b.Name].overallScore : -1;
    switch (effectiveSort) {
      case "name": return a.Name.localeCompare(b.Name);
      case "age": return (b.Age || 0) - (a.Age || 0);
      case "ca": return (b.CA || 0) - (a.CA || 0);
      case "archetype": return (archA || "").localeCompare(archB || "");
      default: return fitB - fitA;
    }
  });

  for (var i = 0; i < filtered.length; i++) {
    var m3 = filtered[i];
    var arch = archetypes[m3.Name];
    var fs = fitScoresReady && fitScores[m3.Name] ? fitScores[m3.Name].overallScore : null;

    html += "<tr class='border-b border-border hover:bg-surface-hover cursor-pointer manager-row' data-name='" + escAttr(m3.Name) + "'>";
    html += "<td class='py-2 pr-2 text-white'>" + escHtml(m3.Name) + "</td>";
    html += "<td class='py-2 pr-2 text-text-muted'>" + (m3.Age || 0) + "</td>";
    html += "<td class='py-2 pr-2 text-text-muted'>" + escHtml(m3["Preferred Job"] || "") + "</td>";
    html += "<td class='py-2 pr-2 text-white'>" + (m3.CA || 0) + "</td>";
    html += "<td class='py-2 pr-2 text-text-muted'>" + escHtml(arch) + "</td>";
    html += "<td class='py-2 pr-2 text-text-muted'>" + escHtml(m3["Playing Mentality"] || "\u2014") + "</td>";
    html += "<td class='py-2 pr-2 text-text-muted'>" + escHtml(m3["Pressing Style"] || "\u2014") + "</td>";
    html += "<td class='py-2 pr-2 text-text-muted'>" + escHtml(m3["Preferred Formation"] || "\u2014") + "</td>";
    if (hasSquad) {
      if (fs !== null) {
        var fitClass = fs >= 70 ? "fit-great" : fs >= 50 ? "fit-good" : fs >= 30 ? "fit-ok" : "fit-poor";
        html += "<td class='py-2 pr-2'><span class='fit-badge " + fitClass + "'>" + fs + "</span></td>";
      } else {
        html += "<td class='py-2 pr-2 text-text-muted'>" + (fitScoresReady ? "\u2014" : "\u2026") + "</td>";
      }
    }
    html += "</tr>";
  }
  html += "</tbody></table></div>";

  // Start async fit score computation if needed
  if (hasSquad && !fitScoresReady && !window.FM24State.manager.fitScoresComputing) {
    window.FM24State.manager.fitScoresComputing = true;
    computeFitScoresAsync(eligible, squad, function (scores) {
      window.FM24State.manager.fitScores = scores;
      window.FM24State.manager.fitScoresReady = true;
      window.FM24State.manager.fitScoresComputing = false;
      renderManagerView();
    });
  }

  return html;
}

function renderAnalyseStep(state) {
  var html = "";

  // Mode selection (appears after hire, before analyse)
  if (state.hired) {
    html += '<div class="mb-4 p-4 bg-surface border border-border rounded">';
    html += '<div class="text-xs text-text-muted mb-2">Select role for ' + escHtml(state.hired.Name) + ':</div>';
    html += '<div class="toggle-group">';
    html += '<button class="toggle-btn ' + (state.mode === "head_coach" ? "active" : "") + '" data-manager-mode="head_coach">Head Coach</button>';
    html += '<button class="toggle-btn ' + (state.mode === "full_manager" ? "active" : "") + '" data-manager-mode="full_manager">Full Manager</button>';
    html += '</div>';
    html += '</div>';
  }

  // Squad status
  var squad = window.FM24State.squad;
  var market = window.FM24State.market;
  var hasSquad = squad && squad.length > 0;
  var hasMarket = market && market.length > 0;

  html += '<div class="mb-4">';
  if (hasSquad) {
    html += '<div class="text-xs text-green-400 mb-2">\u2713 Using existing squad (' + squad.length + ' players) <button id="change-squad-analyse-btn" class="text-xs text-text-muted hover:text-white underline transition-colors ml-2">[Change]</button></div>';
  } else {
    html += '<div class="border-2 border-dashed border-border rounded p-4 text-center mb-2 bg-surface" id="manager-squad-upload">';
    html += '<p class="text-xs text-text-secondary">Upload Squad HTML</p>';
    html += '<input type="file" accept=".html,.htm" class="block mx-auto mt-1 text-xs text-text-secondary">';
    html += '</div>';
  }
  html += "</div>";

  // Market status (always show if loaded, so user can re-upload)
  if (hasMarket) {
    html += '<div class="mb-4">';
    html += '<div class="text-xs text-green-400 mb-2">\u2713 Using existing market data (' + market.length + ' players) <button id="change-market-analyse-btn" class="text-xs text-text-muted hover:text-white underline transition-colors ml-2">[Change]</button></div>';
    html += "</div>";
  }

  // Market upload (Full Manager only — needed for transfer recommendations)
  if (state.mode === "full_manager" && !hasMarket) {
    html += '<div class="mb-4">';
    html += '<div class="border-2 border-dashed border-border rounded p-4 text-center mb-2 bg-surface" id="manager-market-upload">';
    html += '<p class="text-xs text-text-secondary">Upload Market HTML (required for transfer recommendations)</p>';
    html += '<input type="file" accept=".html,.htm" class="block mx-auto mt-1 text-xs text-text-secondary">';
    html += '</div>';
    html += "</div>";
  }

  var canAnalyse = hasSquad && state.mode && (state.mode !== "full_manager" || hasMarket);
  html += '<button id="analyse-btn" class="text-xs px-4 py-2 rounded transition-colors ' + (canAnalyse ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-surface-hover text-text-muted cursor-not-allowed") + '" ' + (canAnalyse ? "" : "disabled") + ">Analyse Squad</button>";

  return html;
}

function renderResultsStep(state) {
  var report = state.report;
  var tactic = state.generatedTactic;
  var recommendations = state.recommendations;
  if (!report || !tactic) return "<p class='text-text-muted text-xs'>No results. Please analyse the squad first.</p>";

  var html = "";

  // PANEL 0: Fit Score
  var fitScore = state.fitScore;
  if (fitScore) {
    var fs = fitScore.overallScore;
    var fsColor = fs >= 80 ? "text-green-400" : fs >= 60 ? "text-yellow-400" : fs >= 40 ? "text-orange-400" : "text-red-400";

    html += '<div class="bg-surface border border-border rounded p-4 mb-4">';
    html += '<div class="flex items-center justify-between mb-3">';
    html += '<h3 class="text-xs font-bold text-white uppercase tracking-wider">Manager Fit Score</h3>';
    html += '<span class="text-2xl font-bold ' + fsColor + '">' + fs + '/100</span>';
    html += '</div>';

    // Pillar bars
    var pillars = fitScore.pillars;
    var pillarLabels = {
      tacticalCoverage: "Tactical Coverage",
      styleCapacity: "Style Capacity",
      lockerRoom: "Locker Room Matrix",
      development: "Squad Timeline & Development",
      gapSeverity: "Gap Severity",
      baseline: "Baseline Competency"
    };
    var pillarColors = {
      tacticalCoverage: "bg-blue-500",
      styleCapacity: "bg-cyan-500",
      lockerRoom: "bg-purple-500",
      development: "bg-teal-500",
      gapSeverity: "bg-red-500",
      baseline: "bg-gray-400"
    };

    for (var pk in pillars) {
      if (pillars.hasOwnProperty(pk)) {
        var p = pillars[pk];
        var pct = p.max > 0 ? Math.round((p.score / p.max) * 100) : 0;
        html += '<div class="mb-2">';
        html += '<div class="flex justify-between text-xs text-text-muted mb-1">';
        html += '<span>' + (pillarLabels[pk] || pk) + '</span>';
        html += '<span>' + pct + '%</span>';
        html += '</div>';
        html += '<div class="w-full bg-surface-hover rounded h-1.5">';
        html += '<div class="' + (pillarColors[pk] || "bg-white") + ' rounded h-1.5 transition-all" style="width:' + pct + '%"></div>';
        html += '</div>';
        html += '</div>';
      }
    }

    // Insights
    if (fitScore.insights && fitScore.insights.length > 0) {
      html += '<div class="mt-3 pt-3 border-t border-border">';
      html += '<div class="text-xs text-text-muted mb-1">Insights:</div>';
      for (var ii = 0; ii < fitScore.insights.length; ii++) {
        html += '<div class="text-xs text-text-secondary mb-0.5">\u2022 ' + escHtml(fitScore.insights[ii]) + '</div>';
      }
      html += '</div>';
    }

    html += '</div>';
  }

  // PANEL 0.5: Gaffer Feasibility Scorecard
  if (typeof evaluateTacticFeasibility === "function") {
    var feasibility = evaluateTacticFeasibility(tactic);
    var fScore = feasibility.overallScore;
    var fColor = fScore >= 80 ? "text-green-400" : fScore >= 60 ? "text-yellow-400" : fScore >= 40 ? "text-orange-400" : "text-red-400";

    html += '<div class="bg-surface border border-border rounded p-4 mb-4">';
    html += '<div class="flex items-center justify-between mb-3">';
    html += '<div>';
    html += '<h3 class="text-xs font-bold text-white uppercase tracking-wider">Tactical Feasibility Score</h3>';
    html += '<span class="text-[10px] text-text-muted">Gaffer Engine Structural Integrity Validator</span>';
    html += '</div>';
    html += '<span class="text-2xl font-bold ' + fColor + '">' + fScore + '/100</span>';
    html += '</div>';

    // Categories
    var cats = feasibility.categories;
    var catLabels = {
      compatibility: "Role Compatibility",
      balance: "Tactical Balance",
      coverage: "Positional Coverage",
      pairing: "Pairing Rules",
      zones: "Zone Collisions",
      archetype: "Archetype Fit"
    };
    var catColors = {
      compatibility: "bg-indigo-500",
      balance: "bg-orange-500",
      coverage: "bg-green-500",
      pairing: "bg-purple-500",
      zones: "bg-cyan-500",
      archetype: "bg-pink-500"
    };

    for (var ck in cats) {
      if (cats.hasOwnProperty(ck)) {
        var pct = cats[ck];
        html += '<div class="mb-2">';
        html += '<div class="flex justify-between text-xs text-text-muted mb-1">';
        html += '<span>' + catLabels[ck] + '</span>';
        html += '<span>' + pct + '%</span>';
        html += '</div>';
        html += '<div class="w-full bg-surface-hover rounded h-1.5">';
        html += '<div class="' + catColors[ck] + ' rounded h-1.5 transition-all" style="width:' + pct + '%"></div>';
        html += '</div>';
        html += '</div>';
      }
    }

    // Positives
    if (feasibility.positives && feasibility.positives.length > 0) {
      html += '<div class="mt-3 pt-3 border-t border-border">';
      html += '<div class="text-xs text-green-400 font-bold mb-1">Tactical Strengths:</div>';
      for (var pi = 0; pi < feasibility.positives.length; pi++) {
        html += '<div class="text-xs text-text-secondary mb-0.5">\u2713 ' + escHtml(feasibility.positives[pi]) + '</div>';
      }
      html += '</div>';
    }

    // Warnings
    if (feasibility.warnings && feasibility.warnings.length > 0) {
      html += '<div class="mt-2 pt-2 border-t border-border">';
      html += '<div class="text-xs text-red-400 font-bold mb-1">Potential Holes & Warnings:</div>';
      for (var wi = 0; wi < feasibility.warnings.length; wi++) {
        html += '<div class="text-xs text-text-secondary mb-0.5">\u2022 ' + escHtml(feasibility.warnings[wi]) + '</div>';
      }
      html += '</div>';
    }

    html += '</div>';
  }

  // PANEL 0.6: Global Coherence Scorecard (Layer 5)
  if (typeof aggregateCoherence === "function") {
    var coherence = aggregateCoherence(feasibility, tactic);
    html += '<div class="bg-surface border border-border rounded p-4 mb-4">';
    html += '<div class="flex items-center justify-between mb-2">';
    html += '<h3 class="text-xs font-bold text-white uppercase tracking-wider">Global Coherence Score</h3>';
    html += '<span class="text-xl font-bold ' + coherence.bandColor + '">' + coherence.score + '/100 <span class="text-xs">(' + coherence.band + ')</span></span>';
    html += '</div>';
    if (coherence.summary) {
      html += '<p class="text-xs text-text-secondary mb-2">' + escHtml(coherence.summary) + '</p>';
    }
    if (coherence.violationCounts && coherence.violationCounts.total > 0) {
      html += '<div class="flex gap-2 text-[10px]">';
      if (coherence.violationCounts.critical > 0) html += '<span class="text-red-400">' + coherence.violationCounts.critical + ' critical</span>';
      if (coherence.violationCounts.error > 0) html += '<span class="text-orange-400">' + coherence.violationCounts.error + ' errors</span>';
      if (coherence.violationCounts.warning > 0) html += '<span class="text-yellow-400">' + coherence.violationCounts.warning + ' warnings</span>';
      if (coherence.violationCounts.suggestion > 0) html += '<span class="text-text-muted">' + coherence.violationCounts.suggestion + ' suggestions</span>';
      html += '</div>';
    }
    html += '</div>';
  }

  // PANEL A: Manager Report
  html += '<div class="bg-surface border border-border rounded p-4 mb-4">';
  html += '<h3 class="text-xs font-bold text-white uppercase tracking-wider mb-2">Manager Report</h3>';
  html += '<p class="text-xs text-text-secondary mb-2">' + escHtml(report.managerSummary) + "</p>";
  html += '<p class="text-xs text-text-secondary mb-2">' + escHtml(report.tacticRationale) + "</p>";

  if (report.squadStrengths.length > 0) {
    html += '<div class="mb-2">';
    html += '<div class="text-xs text-text-muted mb-1">Squad Strengths:</div>';
    for (var si = 0; si < report.squadStrengths.length; si++) {
      html += '<div class="text-xs text-green-400">\u2713 ' + escHtml(report.squadStrengths[si]) + "</div>";
    }
    html += "</div>";
  }

  if (report.squadGaps.length > 0) {
    html += '<div class="mb-2">';
    html += '<div class="text-xs text-text-muted mb-1">Squad Gaps:</div>';
    for (var gi = 0; gi < report.squadGaps.length; gi++) {
      var g = report.squadGaps[gi];
      html += '<div class="text-xs text-red-400 mb-1">';
      html += "[" + escHtml(g.slotId) + "] " + escHtml(g.roleName) + " \u2014 " + escHtml(g.reason);
      html += " <span class='text-text-muted'>Best: " + escHtml(g.bestAvailable) + "</span>";
      html += "</div>";
    }
    html += "</div>";
  }

  // Confidence bar
  var conf = tactic.confidence || 0;
  var confPct = Math.round(conf * 100);
  var confColor = confPct >= 80 ? "bg-green-500" : confPct >= 60 ? "bg-yellow-500" : "bg-red-500";
  html += '<div class="mb-2">';
  html += '<div class="flex justify-between text-xs text-text-muted mb-1"><span>Squad Coverage</span><span>' + confPct + "%</span></div>";
  html += '<div class="w-full bg-surface-hover rounded h-2"><div class="' + confColor + ' rounded h-2 transition-all" style="width:' + confPct + '%"></div></div>';
  html += "</div>";

  html += '<p class="text-xs text-text-secondary">' + escHtml(report.overallFit) + "</p>";
  html += "</div>";

  // PANEL B: Generated Tactic
  html += '<div class="bg-surface border border-border rounded p-4 mb-4">';
  html += '<h3 class="text-xs font-bold text-white uppercase tracking-wider mb-2">Generated Tactic</h3>';
  html += '<div class="text-xs text-green-400 mb-2">Formation: ' + escHtml(tactic.formation) + "</div>";

  // Group slots by strata
  var strataGroups = {};
  if (tactic.slots) {
    var slotKeys = Object.keys(tactic.slots);
    slotKeys.sort(function (a, b) {
      var da = GLOBAL_PITCH_SLOTS[a], db = GLOBAL_PITCH_SLOTS[b];
      if (!da) return 1; if (!db) return -1;
      if (db.y !== da.y) return db.y - da.y;
      return da.x - db.x;
    });
    slotKeys.forEach(function (sid) {
      var s = tactic.slots[sid];
      if (!s || !s.roleId) return;
      var def = GLOBAL_PITCH_SLOTS[sid];
      var strata = def ? def.strata : "unknown";
      if (!strataGroups[strata]) strataGroups[strata] = [];
      var role = getRoleById(s.roleId);
      strataGroups[strata].push({ slotId: sid, roleName: role ? role.name : s.roleId, duty: s.duty, playerName: s.playerName });
    });
  }

  var strataLabels = { GK: "Goalkeeper", DC: "Centre-Back", WD: "Full-Back", WB: "Wing-Back", DM: "Defensive Mid", CM: "Central Mid", WM: "Wide Mid", WA: "Wide Attacker", AMC: "Attacking Mid", ST: "Striker" };
  for (var sg in strataGroups) {
    if (strataGroups.hasOwnProperty(sg)) {
      html += '<div class="mb-2">';
      html += '<div class="text-xs text-text-muted mb-1">' + (strataLabels[sg] || sg) + ":</div>";
      for (var si = 0; si < strataGroups[sg].length; si++) {
        var item = strataGroups[sg][si];
        html += '<div class="text-xs text-white ml-2">[' + escHtml(item.slotId) + "] " + escHtml(item.roleName) + " (" + escHtml(item.duty) + ")" + (item.playerName ? " \u2192 " + escHtml(item.playerName) : "") + "</div>";
      }
      html += "</div>";
    }
  }

  html += '<button id="apply-tactic-btn" class="text-xs px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors mt-2">Apply to Tactic Builder</button>';
  html += "</div>";

  // PANEL C: Transfer Recommendations (Full Manager only)
  if (state.mode === "full_manager" && recommendations && recommendations.length > 0) {
    html += '<div class="bg-surface border border-border rounded p-4 mb-4">';
    html += '<h3 class="text-xs font-bold text-white uppercase tracking-wider mb-2">Transfer Recommendations</h3>';

    var priorityColors = { Critical: "text-red-400", Important: "text-yellow-400", Depth: "text-blue-400" };
    for (var ri = 0; ri < recommendations.length; ri++) {
      var rec = recommendations[ri];
      html += '<div class="mb-3 border border-border rounded p-3">';
      html += '<div class="flex items-center justify-between mb-2">';
      html += '<div><span class="text-xs text-white font-bold">[' + escHtml(rec.slotId) + ']</span> <span class="text-xs text-text-muted">' + escHtml(rec.roleName) + '</span></div>';
      html += '<span class="text-xs ' + (priorityColors[rec.priorityLabel] || "text-text-muted") + '">' + rec.priorityLabel + "</span>";
      html += "</div>";
      if (rec.targets.length > 0) {
        html += '<table class="w-full text-xs">';
        html += "<thead><tr class='text-text-muted border-b border-border'><th class='text-left py-1 pr-1'>Name</th><th class='text-left py-1 pr-1'>Club</th><th class='text-left py-1 pr-1'>Age</th><th class='text-left py-1 pr-1'>AP</th><th class='text-left py-1 pr-1'>Fit</th><th class='text-left py-1'>Value</th></tr></thead><tbody>";
        for (var ti = 0; ti < rec.targets.length; ti++) {
          var t = rec.targets[ti];
          var p = t.player;
          html += "<tr class='border-b border-border hover:bg-surface-hover cursor-pointer' onclick=\"renderPlayerCard('" + escAttr(p.Name) + "')\">";
          html += "<td class='py-1 pr-1 text-white'>" + escHtml(p.Name) + "</td>";
          html += "<td class='py-1 pr-1 text-text-muted'>" + escHtml(p.Club || "") + "</td>";
          html += "<td class='py-1 pr-1 text-text-muted'>" + (p.Age || 0) + "</td>";
          html += "<td class='py-1 pr-1 text-text-muted'>" + (p.APDisplay || "\u2014") + "</td>";
          html += "<td class='py-1 pr-1 text-white'>" + t.score.toFixed(1) + "</td>";
          html += "<td class='py-1 pr-1 text-text-muted'>" + escHtml(t.valueRating) + "</td>";
          html += "</tr>";
        }
        html += "</tbody></table>";
      } else {
        html += '<div class="text-xs text-text-muted">No suitable targets found in market.</div>';
      }
      html += "</div>";
    }
    html += "</div>";
  }

  return html;
}

// ─── MANAGER PROFILE MODAL ───

function renderManagerProfile(manager) {
  var modal = document.getElementById("manager-profile-modal");
  var content = document.getElementById("profile-content");
  if (!modal || !content) return;

  var squad = window.FM24State.squad;
  var fitScore = squad && squad.length > 0 ? calculateManagerFit(manager, squad) : null;

  var archetype = deriveArchetype(manager);
  var html = "";

  // Header
  html += '<div class="flex items-start justify-between mb-3">';
  html += '<div>';
  html += '<div class="text-sm font-bold text-white">' + escHtml(manager.Name) + "</div>";
  html += '<div class="text-xs text-text-muted">' + escHtml(manager["Preferred Job"] || "") + " \u2022 CA " + (manager.CA || 0) + "</div>";
  html += '<div class="text-xs text-green-400 mt-1">' + escHtml(archetype) + "</div>";
  html += "</div>";
  html += "</div>";

  // Fit Score section
  if (fitScore) {
    var fs = fitScore.overallScore;
    var fsColor = fs >= 70 ? "text-green-400" : fs >= 50 ? "text-yellow-400" : fs >= 30 ? "text-orange-400" : "text-red-400";
    html += '<div class="bg-surface border border-border rounded p-3 mb-3">';
    html += '<div class="flex items-center justify-between mb-2">';
    html += '<span class="text-xs text-text-muted">Compatibility Score</span>';
    html += '<span class="text-lg font-bold ' + fsColor + '">' + fs + '/100</span>';
    html += '</div>';

    var pillarLabels = {
      tacticalCoverage: "Tactical Coverage",
      styleCapacity: "Style Capacity",
      lockerRoom: "Locker Room Matrix",
      development: "Squad Timeline & Development",
      gapSeverity: "Gap Severity",
      baseline: "Baseline Competency"
    };
    var pillarColors = {
      tacticalCoverage: "bg-blue-500",
      styleCapacity: "bg-cyan-500",
      lockerRoom: "bg-purple-500",
      development: "bg-teal-500",
      gapSeverity: "bg-red-500",
      baseline: "bg-gray-400"
    };

    for (var pk in fitScore.pillars) {
      if (fitScore.pillars.hasOwnProperty(pk)) {
        var p = fitScore.pillars[pk];
        var pct = p.max > 0 ? Math.round((p.score / p.max) * 100) : 0;
        html += '<div class="mb-1.5">';
        html += '<div class="flex justify-between text-xs text-text-muted">';
        html += '<span>' + (pillarLabels[pk] || pk) + '</span>';
        html += '<span>' + Math.round(p.score) + '/' + p.max + '</span>';
        html += '</div>';
        html += '<div class="w-full bg-surface-hover rounded h-1"><div class="' + (pillarColors[pk] || "bg-white") + ' rounded h-1 transition-all" style="width:' + pct + '%"></div></div>';
        html += '</div>';
      }
    }

    // Insights
    if (fitScore.insights && fitScore.insights.length > 0) {
      html += '<div class="mt-2 pt-2 border-t border-border">';
      html += '<div class="text-xs text-text-muted mb-1">Insights:</div>';
      for (var ii = 0; ii < fitScore.insights.length; ii++) {
        html += '<div class="text-xs text-text-secondary mb-0.5">\u2022 ' + escHtml(fitScore.insights[ii]) + '</div>';
      }
      html += '</div>';
    }

    html += '</div>';
  } else {
    html += '<div class="bg-surface border border-border rounded p-3 mb-3">';
    html += '<p class="text-xs text-text-muted">Load a squad to calculate compatibility.</p>';
    html += '</div>';
  }

  // Key Attributes
  html += '<div class="bg-surface border border-border rounded p-3 mb-3">';
  html += '<div class="text-xs text-text-muted mb-2">Key Attributes</div>';
  html += '<div class="profile-attr-grid">';
  var attrs = [
    { label: "Tac Knw", key: "Tac Knw" },
    { label: "Att", key: "Att" },
    { label: "Ada", key: "Ada" },
    { label: "Dis", key: "Dis" },
    { label: "Mgm", key: "Mgm" },
    { label: "Mot", key: "Mot" },
    { label: "Men", key: "Men" },
    { label: "Tec", key: "Tec" },
    { label: "TCo", key: "TCo" },
    { label: "Youth", key: "Youth" },
    { label: "Judge P", key: "Judge P" },
    { label: "Judge A", key: "Judge A" },
    { label: "Prof", key: "Prof" },
    { label: "Personality", key: "Personality" }
  ];
  for (var ai = 0; ai < attrs.length; ai++) {
    var a = attrs[ai];
    var val = manager[a.key];
    if (typeof val === "string" && !parseInt(val, 10)) {
      html += '<div class="profile-attr-row"><span class="profile-attr-label">' + a.label + '</span><span class="profile-attr-value">' + escHtml(val || "\u2014") + '</span></div>';
    } else {
      var num = parseInt(val, 10) || 0;
      var cls = num >= 14 ? "good" : num <= 5 ? "bad" : "";
      html += '<div class="profile-attr-row"><span class="profile-attr-label">' + a.label + '</span><span class="profile-attr-value ' + cls + '">' + num + '/20</span></div>';
    }
  }
  html += '</div></div>';

  // Style summary
  html += '<div class="bg-surface border border-border rounded p-3 mb-3">';
  html += '<div class="text-xs text-text-muted mb-1">Style</div>';
  html += '<div class="text-xs text-text-secondary">';
  html += 'Formation: ' + escHtml(manager["Preferred Formation"] || "\u2014") + "<br>";
  html += 'Mentality: ' + escHtml(manager["Playing Mentality"] || "\u2014") + "<br>";
  html += 'Pressing: ' + escHtml(manager["Pressing Style"] || "\u2014") + "<br>";
  html += 'Marking: ' + escHtml(manager["Marking Style"] || "\u2014");
  html += '</div></div>';

  // Hire button
  html += '<button class="text-xs px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors w-full" id="profile-hire-btn">Hire ' + escHtml(manager.Name) + "</button>";

  content.innerHTML = html;
  modal.classList.remove("hidden");

  document.getElementById("profile-hire-btn").addEventListener("click", function () {
    window.FM24State.manager.hired = manager;
    window.FM24State.manager.mode = null;
    window.FM24State.manager.generatedTactic = null;
    window.FM24State.manager.report = null;
    window.FM24State.manager.gaps = [];
    window.FM24State.manager.recommendations = [];
    modal.classList.add("hidden");
    renderManagerView();
  });
}

// ─── EVENT WIRING ───

function wireManagerRowClicks() {
  var rows = document.querySelectorAll(".manager-row");
  for (var i = 0; i < rows.length; i++) {
    rows[i].addEventListener("click", function () {
      var name = this.getAttribute("data-name");
      var roster = window.FM24State.manager.roster;
      for (var j = 0; j < roster.length; j++) {
        if (roster[j].Name === name) {
          renderManagerProfile(roster[j]);
          return;
        }
      }
    });
  }

  // Change squad button
  var changeBtn = document.getElementById("change-squad-btn");
  if (changeBtn) {
    changeBtn.addEventListener("click", function () {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = ".html,.htm";
      input.addEventListener("change", function () {
        if (!this.files || !this.files[0]) return;
        handleStaffUpload(this.files[0], "squad");
      });
      input.click();
    });
  }

  // Change staff button
  var changeStaffBtn = document.getElementById("change-staff-btn");
  if (changeStaffBtn) {
    changeStaffBtn.addEventListener("click", function () {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = ".html,.htm";
      input.addEventListener("change", function () {
        if (!this.files || !this.files[0]) return;
        var reader = new FileReader();
        reader.onload = function (e) {
          var text = e.target.result;
          if (text.indexOf("<html") === -1 && text.indexOf("<!DOCTYPE") === -1 && text.indexOf("<table") === -1) {
            showToast("This doesn't look like an FM24 HTML export.", "error");
            return;
          }
          parseStaffHTML(text).then(function (staff) {
            window.FM24State.manager.roster = staff;
            window.FM24State.manager.fitScores = {};
            window.FM24State.manager.fitScoresReady = false;
            window.FM24State.manager.fitScoresComputing = false;
            var eligible = filterEligibleManagers(staff);
            showToast("Loaded " + staff.length + " staff, " + eligible.length + " eligible managers.", "success");
            renderManagerView();
          });
        };
        reader.readAsText(this.files[0]);
      });
      input.click();
    });
  }

  // Change market button (hire step)
  var changeMarketBtn = document.getElementById("change-market-btn");
  if (changeMarketBtn) {
    changeMarketBtn.addEventListener("click", function () {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = ".html,.htm";
      input.addEventListener("change", function () {
        if (!this.files || !this.files[0]) return;
        handleStaffUpload(this.files[0], "market");
      });
      input.click();
    });
  }

  // Filter bar events
  var searchInput = document.getElementById("hire-search-input");
  var archetypeFilter = document.getElementById("hire-archetype-filter");
  var fitMin = document.getElementById("hire-fit-min");
  var fitMax = document.getElementById("hire-fit-max");
  var sortSelect = document.getElementById("hire-sort-select");

  function updateFilters() {
    var f = window.FM24State.managerFilters;
    if (searchInput) f.searchQuery = searchInput.value;
    if (archetypeFilter) f.archetype = archetypeFilter.value;
    if (fitMin) f.fitMin = parseInt(fitMin.value, 10) || 0;
    if (fitMax) f.fitMax = parseInt(fitMax.value, 10) || 100;
    if (sortSelect) f.sortBy = sortSelect.value;
    renderManagerView();
    var restored = document.getElementById("hire-search-input");
    if (restored && document.activeElement !== restored) {
      restored.focus();
      restored.setSelectionRange(restored.value.length, restored.value.length);
    }
  }

  if (searchInput) searchInput.addEventListener("input", updateFilters);
  if (archetypeFilter) archetypeFilter.addEventListener("change", updateFilters);
  if (fitMin) fitMin.addEventListener("change", updateFilters);
  if (fitMax) fitMax.addEventListener("change", updateFilters);
  if (sortSelect) sortSelect.addEventListener("change", updateFilters);
}

function wireAnalyseButton() {
  var squadZone = document.getElementById("manager-squad-upload");
  var marketZone = document.getElementById("manager-market-upload");

  // Squad upload
  if (squadZone) {
    var squadInput = squadZone.querySelector("input[type=file]");
    if (squadInput) {
      squadInput.addEventListener("change", function () {
        if (this.files && this.files[0]) handleStaffUpload(this.files[0], "squad");
      });
    }
  }

  // Market upload
  if (marketZone) {
    var marketInput = marketZone.querySelector("input[type=file]");
    if (marketInput) {
      marketInput.addEventListener("change", function () {
        if (this.files && this.files[0]) handleStaffUpload(this.files[0], "market");
      });
    }
  }

  // Change squad button (analyse step)
  var changeSquadBtn = document.getElementById("change-squad-analyse-btn");
  if (changeSquadBtn) {
    changeSquadBtn.addEventListener("click", function () {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = ".html,.htm";
      input.addEventListener("change", function () {
        if (this.files && this.files[0]) handleStaffUpload(this.files[0], "squad");
      });
      input.click();
    });
  }

  // Change market button (analyse step)
  var changeMarketBtn = document.getElementById("change-market-analyse-btn");
  if (changeMarketBtn) {
    changeMarketBtn.addEventListener("click", function () {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = ".html,.htm";
      input.addEventListener("change", function () {
        if (this.files && this.files[0]) handleStaffUpload(this.files[0], "market");
      });
      input.click();
    });
  }

  // Mode buttons (Head Coach / Full Manager)
  var modeBtns = document.querySelectorAll("[data-manager-mode]");
  for (var mi = 0; mi < modeBtns.length; mi++) {
    modeBtns[mi].addEventListener("click", function () {
      window.FM24State.manager.mode = this.getAttribute("data-manager-mode");
      renderManagerView();
    });
  }

  // Analyse button
  var analyseBtn = document.getElementById("analyse-btn");
  if (analyseBtn && !analyseBtn.disabled) {
    analyseBtn.addEventListener("click", function () {
      runAnalysis();
    });
  }
}

function wireResultsButtons() {
  var applyBtn = document.getElementById("apply-tactic-btn");
  if (applyBtn) {
    applyBtn.addEventListener("click", applyGeneratedTactic);
  }
}

function wireResetButton() {
  var resetBtn = document.getElementById("hire-different-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      window.FM24State.manager.hired = null;
      window.FM24State.manager.mode = null;
      window.FM24State.manager.generatedTactic = null;
      window.FM24State.manager.report = null;
      window.FM24State.manager.gaps = [];
      window.FM24State.manager.recommendations = [];
      renderManagerView();
    });
  }
}

// ─── STAFF UPLOAD FILE HANDLER ───

function handleStaffUpload(file, targetKey) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    var text = e.target.result;
    if (text.indexOf("<html") === -1 && text.indexOf("<!DOCTYPE") === -1 && text.indexOf("<table") === -1) {
      showToast("This doesn't look like an FM24 HTML export.", "error");
      return;
    }
    var parseFn = targetKey === "squad" ? parseSquadHTML :
      (typeof parseMarketHTML !== "undefined" ? parseMarketHTML : parseSquadHTML);
    parseFn(text).then(function (result) {
      if (targetKey === "squad") {
        window.FM24State.squad = result;
        window.dispatchEvent(new CustomEvent("fm24:squad-loaded", { detail: { count: result.length } }));
        showToast("Loaded " + result.length + " players", "success");
      } else {
        window.FM24State.market = result;
        window.dispatchEvent(new CustomEvent("fm24:market-loaded", { detail: { count: result.length } }));
        showToast("Loaded " + result.length + " market players", "success");
      }
      renderManagerView();
    });
  };
  reader.readAsText(file);
}

// ─── RUN ANALYSIS ───

function runAnalysis() {
  var state = window.FM24State.manager;
  var squad = window.FM24State.squad;
  if (!state.hired || !squad || squad.length === 0) {
    showToast("Hire a manager and load a squad first.", "error");
    return;
  }

  var tactic = generateTacticFromManager(state.hired, squad);
  if (!tactic) {
    showToast("Failed to generate tactic. Check manager attributes.", "error");
    return;
  }

  var report = generateManagerReport(state.hired, tactic, squad);

  var recommendations = [];
  if (state.mode === "full_manager" && window.FM24State.market.length > 0) {
    recommendations = generateTransferRecommendations(state.hired, tactic.gaps, window.FM24State.market);
  }

  var fitScore = calculateManagerFit(state.hired, squad, tactic);
  state.fitScore = fitScore;

  state.generatedTactic = tactic;
  state.report = report;
  state.gaps = tactic.gaps || [];
  state.recommendations = recommendations;

  renderManagerView();
  showToast("Analysis complete for " + state.hired.Name, "success");
}

// ─── STAFF UPLOAD ZONE ───

(function wireManagerUpload() {
  document.addEventListener("click", function (e) {
    var zone = document.getElementById("staff-upload-zone");
    if (!zone) return;
    var input = zone.querySelector("input[type=file]");
    if (input && (e.target === zone || e.target.tagName === "P" || e.target.tagName === "SPAN")) {
      input.click();
    }
  });

  document.addEventListener("change", function (e) {
    var input = e.target;
    if (input && input.type === "file" && input.closest("#staff-upload-zone")) {
      if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function (ev) {
          var text = ev.target.result;
          if (text.indexOf("<html") === -1 && text.indexOf("<!DOCTYPE") === -1 && text.indexOf("<table") === -1) {
            showToast("This doesn't look like an FM24 HTML export.", "error");
            return;
          }
          parseStaffHTML(text).then(function (staff) {
            window.FM24State.manager.roster = staff;
            window.FM24State.manager.fitScores = {};
            window.FM24State.manager.fitScoresReady = false;
            window.FM24State.manager.fitScoresComputing = false;
            var eligible = filterEligibleManagers(staff);
            showToast("Loaded " + staff.length + " staff, " + eligible.length + " eligible managers.", "success");
            renderManagerView();
          });
        };
        reader.readAsText(input.files[0]);
      }
    }
  });

  // Drag and drop for staff upload
  document.addEventListener("dragover", function (e) {
    var zone = document.getElementById("staff-upload-zone");
    if (zone && zone.contains(e.target)) { e.preventDefault(); zone.classList.add("drag-over"); }
  });
  document.addEventListener("dragleave", function (e) {
    var zone = document.getElementById("staff-upload-zone");
    if (zone && zone.contains(e.target)) { e.preventDefault(); zone.classList.remove("drag-over"); }
  });
  document.addEventListener("drop", function (e) {
    var zone = document.getElementById("staff-upload-zone");
    if (zone && zone.contains(e.target)) {
      e.preventDefault();
      zone.classList.remove("drag-over");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        var reader = new FileReader();
        reader.onload = function (ev) {
          var text = ev.target.result;
          if (text.indexOf("<html") === -1 && text.indexOf("<!DOCTYPE") === -1 && text.indexOf("<table") === -1) {
            showToast("This doesn't look like an FM24 HTML export.", "error");
            return;
          }
          parseStaffHTML(text).then(function (staff) {
            window.FM24State.manager.roster = staff;
            window.FM24State.manager.fitScores = {};
            window.FM24State.manager.fitScoresReady = false;
            window.FM24State.manager.fitScoresComputing = false;
            var eligible = filterEligibleManagers(staff);
            showToast("Loaded " + staff.length + " staff, " + eligible.length + " eligible managers.", "success");
            renderManagerView();
          });
        };
        reader.readAsText(e.dataTransfer.files[0]);
      }
    }
  });

  // Handle squad and market uploads within manager view
  document.addEventListener("change", function (e) {
    var input = e.target;
    if (!input || input.type !== "file") return;
    var parent = input.closest("#manager-squad-upload, #manager-market-upload");
    if (!parent || !input.files || !input.files[0]) return;
    var isSquad = parent.id === "manager-squad-upload";
    handleStaffUpload(input.files[0], isSquad ? "squad" : "market");
  });
})();
