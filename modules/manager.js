// ─── MANAGER MODULE ───

function escAttr(s) {
  if (typeof s !== "string") return s;
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatCurrency(val) {
  if (val >= 1000000) return (val / 1000000).toFixed(1) + "M";
  if (val >= 1000) return (val / 1000).toFixed(0) + "K";
  return String(val);
}

function sanitizeHistory(state) {
  var history = state.windowHistory || [];
  var baselineQuality = (state.hired && state.hired.squadAvgQuality) || 13.9;
  
  return history.map(function (w, idx) {
    var clone = Object.assign({}, w);
    
    // 1. Squad Quality Fallback
    if (!clone.startSquadAvgQuality || clone.startSquadAvgQuality <= 0) {
      if (idx === 0) {
        clone.startSquadAvgQuality = baselineQuality;
      } else {
        var prevQual = baselineQuality;
        for (var i = idx - 1; i >= 0; i--) {
          if (history[i] && history[i].endSquadAvgQuality > 0) {
            prevQual = history[i].endSquadAvgQuality;
            break;
          } else if (history[i] && history[i].startSquadAvgQuality > 0) {
            prevQual = history[i].startSquadAvgQuality;
            break;
          }
        }
        clone.startSquadAvgQuality = prevQual;
      }
    }
    if (!clone.endSquadAvgQuality || clone.endSquadAvgQuality <= 0) {
      clone.endSquadAvgQuality = clone.startSquadAvgQuality;
    }
    
    // 2. Sales / SalesCount Fallback & Auto-recovery
    if (clone.salesCount === undefined) {
      if (clone.sales <= 100) {
        clone.salesCount = clone.sales;
        // Recover monetary sales from eventLog
        var recoveredRev = 0;
        if (clone.eventLog && clone.eventLog.length > 0) {
          clone.eventLog.forEach(function (ev) {
            if (ev.type === 'SOLD' || ev.type === 'EMERGENCY_SALE') {
              var detail = ev.detail || ev.msg || ev.message || '';
              var match = detail.match(/£([0-9.]+)\s*([MKmk]?)/);
              if (match) {
                var val = parseFloat(match[1]);
                var unit = match[2].toUpperCase();
                if (unit === 'M') val *= 1000000;
                else if (unit === 'K') val *= 1000;
                recoveredRev += val;
              }
            }
          });
        }
        clone.sales = recoveredRev;
      } else {
        clone.salesCount = 0;
        if (clone.eventLog) {
          clone.eventLog.forEach(function (ev) {
            if (ev.type === 'SOLD' || ev.type === 'EMERGENCY_SALE') {
              clone.salesCount++;
            }
          });
        }
      }
    }
    
    return clone;
  });
}

// ─── GLOBAL: Transfer History Table Renderer ───
// Renders a full interactive Transfer History table with accordion day-by-day logs.
// Used by both the Manager Profile (renderAnalyseStep) and the Dashboard transfer-history widget.
window.renderTransferHistoryTable = function (history, idPrefix) {
  if (!history || history.length === 0) {
    return '<div class="text-text-muted text-xs py-4 text-center">No transfer windows recorded yet.</div>';
  }
  idPrefix = idPrefix || '';

  var html = '';
  html += '<div class="overflow-x-auto">';
  html += '<table class="w-full text-left text-[11px] font-mono">';
  html += '  <thead>';
  html += '    <tr class="border-b border-border/40 text-[9px] text-text-muted uppercase tracking-wider">';
  html += '      <th class="py-2 px-3 font-semibold">Window</th>';
  html += '      <th class="py-2 px-3 text-right font-semibold">Budget</th>';
  html += '      <th class="py-2 px-3 text-right font-semibold">Spent</th>';
  html += '      <th class="py-2 px-3 text-center font-semibold">Sales</th>';
  html += '      <th class="py-2 px-3 text-center font-semibold">Signed</th>';
  html += '      <th class="py-2 px-3 text-center font-semibold">Busts</th>';
  html += '      <th class="py-2 px-3 text-center font-semibold">Mandates</th>';
  html += '      <th class="py-2 px-3 text-center font-semibold">Rel</th>';
  html += '      <th class="py-2 px-3 text-center font-semibold">Arc</th>';
  html += '      <th class="py-2 px-3 text-right font-semibold">Start → End XI</th>';
  html += '    </tr>';
  html += '  </thead>';
  html += '  <tbody class="divide-y divide-border/20">';

  history.forEach(function (w, idx) {
    var delta = w.endSquadAvgQuality - w.startSquadAvgQuality;
    var dColor = delta >= 0 ? "text-green-400" : "text-red-400";
    var dSign = delta >= 0 ? "+" : "";

    html += '    <tr class="window-history-row hover:bg-surface-hover/30 transition-colors cursor-pointer" data-window-idx="' + idx + '">';
    html += '      <td class="py-2.5 px-3 font-semibold text-white flex items-center gap-1.5">';
    html += '        <span class="text-[10px] text-text-muted select-none">▶</span> ' + escAttr(w.label);
    html += '      </td>';
    html += '      <td class="py-2.5 px-3 text-right text-text-secondary">£' + formatCurrency(w.budget) + '</td>';
    html += '      <td class="py-2.5 px-3 text-right text-text-secondary">£' + formatCurrency(w.spent) + '</td>';
    html += '      <td class="py-2.5 px-3 text-center text-text-secondary">' + (w.salesCount !== undefined ? w.salesCount : w.sales) + '</td>';
    html += '      <td class="py-2.5 px-3 text-center text-text-secondary">' + w.signed + '</td>';
    html += '      <td class="py-2.5 px-3 text-center text-text-secondary">' + w.busts + '</td>';

    var mandHtml = "";
    if (w.mandates === "—") {
      mandHtml = '<span class="text-text-muted">—</span>';
    } else if (typeof w.mandates === 'string') {
      for (var mi = 0; mi < w.mandates.length; mi++) {
        var char = w.mandates[mi];
        if (char === "✓") mandHtml += '<span class="text-green-400 font-extrabold mx-0.5">✓</span>';
        else if (char === "✗") mandHtml += '<span class="text-red-400 font-extrabold mx-0.5">✗</span>';
      }
    } else {
      mandHtml = '<span class="text-text-muted">—</span>';
    }
    html += '      <td class="py-2.5 px-3 text-center">' + mandHtml + '</td>';

    var relColor = w.rel >= 80 ? "text-green-400" : w.rel >= 50 ? "text-yellow-400" : "text-red-400";
    html += '      <td class="py-2.5 px-3 text-center font-bold ' + relColor + '">' + w.rel + '</td>';
    var arcIcon = w.arcCompleted ? '<span class="text-green-400 text-[10px]" title="' + escAttr(w.arcCompleted) + '">✓</span>' : '<span class="text-text-muted text-[9px]">—</span>';
    html += '      <td class="py-2.5 px-3 text-center">' + arcIcon + '</td>';
    html += '      <td class="py-2.5 px-3 text-right text-text-secondary">' + w.startSquadAvgQuality.toFixed(1) + ' → ' + w.endSquadAvgQuality.toFixed(1) + ' <span class="text-[10px] ' + dColor + '">(' + dSign + delta.toFixed(1) + ')</span></td>';
    html += '    </tr>';

    // Accordion expanded detail drawer
    html += '    <tr id="' + idPrefix + 'window-detail-' + idx + '" class="window-detail-drawer" style="display: none; background-color: rgba(0,0,0,0.2);">';
    html += '      <td colspan="10" class="p-4 border-t border-border/40">';
    html += '        <div class="space-y-3">';
    html += '          <h5 class="text-[10px] font-bold text-white uppercase tracking-wider font-mono">Day-by-Day Transfer Window Timeline</h5>';

    if (w.eventLog && w.eventLog.length > 0) {
      html += '          <div class="timeline-container relative pl-6 space-y-4 border-l border-border/30 max-h-[300px] overflow-y-auto scrollbar-thin py-2">';
      w.eventLog.forEach(function (ev) {
        var typeClass = ev.type ? ev.type.toLowerCase() : 'info';
        var badgeColor = 'bg-blue-500';
        if (typeClass === 'signed') badgeColor = 'bg-green-500';
        else if (typeClass === 'collapsed') badgeColor = 'bg-red-500';
        else if (typeClass === 'redirect') badgeColor = 'bg-purple-500';
        else if (typeClass === 'rival_interest' || typeClass === 'rival_inflated' || typeClass === 'rival_interest_detected') badgeColor = 'bg-yellow-500';

        var dayLabel = ev.day !== undefined ? 'Day ' + ev.day : ev.label || ev.msg || '';
        var detailText = ev.detail || ev.message || '';
        var evName = ev.player || ev.name || '';

        html += '            <div class="timeline-item flex items-start gap-3" style="position: relative;">';
        html += '              <div class="w-2.5 h-2.5 rounded-full ' + badgeColor + ' shadow-sm flex-shrink-0 mt-0.5" style="position: absolute; left: -1.35rem;"></div>';
        html += '              <div class="flex-1 min-w-0">';
        html += '                <div class="flex items-center gap-2 flex-wrap">';
        if (dayLabel) html += '                  <span class="text-[10px] font-bold text-white font-mono">' + escAttr(dayLabel) + '</span>';
        if (evName) html += '                  <span class="text-[10px] text-text-secondary">' + escAttr(evName) + '</span>';
        html += '                </div>';
        if (detailText) html += '                <div class="text-[10px] text-text-muted leading-relaxed mt-0.5">' + escAttr(detailText) + '</div>';
        html += '              </div>';
        html += '            </div>';
      });
      html += '          </div>';
    } else {
      html += '          <div class="text-[10px] text-text-muted">No detailed event log for this window.</div>';
    }

    html += '        </div>';
    html += '      </td>';
    html += '    </tr>';
  });

  html += '  </tbody>';
  html += '</table>';
  html += '</div>';
  return html;
};

// ─── PHASE 1: Staff HTML Parser ───

function parseStaffHTML(htmlText, onProgress) {
  return new Promise(function (resolve, reject) {
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

    if (headers.length === 0 || dataRows.length === 0) {
      reject(new Error('No tabular data found in HTML. Ensure the export contains a table with staff/player rows.'));
      return;
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
  var STRATA_PHRASES = {
    GK:  "commands the box",
    DC:  "anchors the backline",
    WD:  "holds the flank",
    WB:  "patrols the wing",
    DM:  "screens the defence",
    CM:  "orchestrates from midfield",
    WM:  "drives the wing",
    WA:  "threatens from wide",
    AMC: "pulls the strings",
    ST:  "leads the line"
  };
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
    var usedTopPlayers = {};
    for (var strata in strataSlots) {
      if (!strataSlots.hasOwnProperty(strata)) continue;
      var candidates = [];
      var slots = strataSlots[strata];
      for (var pi = 0; pi < squad.length; pi++) {
        var pl = squad[pi];
        if (!pl.strata || !Array.isArray(pl.strata) || pl.strata.indexOf(strata) === -1) continue;
        var bestForPlayer = 0;
        for (var si2 = 0; si2 < slots.length; si2++) {
          var roleId2 = tactic.slots[slots[si2]] ? tactic.slots[slots[si2]].roleId : null;
          if (!roleId2) continue;
          var scoreObj2 = scorePlayerForRole(pl, roleId2, tactic.instructions);
          if (scoreObj2 && scoreObj2.total > bestForPlayer) bestForPlayer = scoreObj2.total;
        }
        candidates.push({ name: pl.Name, score: bestForPlayer });
      }
      candidates.sort(function (a, b) { return b.score - a.score; });
      var chosen = null;
      for (var ci = 0; ci < candidates.length; ci++) {
        if (!usedTopPlayers[candidates[ci].name]) {
          chosen = candidates[ci];
          break;
        }
      }
      var minCount = strata === "GK" ? 2 : 3;
      var leadPhrase = STRATA_PHRASES[strata] || "holds the position";
      if (candidates.length >= minCount && chosen && chosen.score >= 12) {
        usedTopPlayers[chosen.name] = true;
        squadStrengths.push("Strong " + strata + " depth \u2014 " + chosen.name + " " + leadPhrase + ".");
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

// ─── FULL MANAGER: Age Archetype ───

function deriveAgeArchetype(manager) {
  var youth = manager.Youth || 0;
  var mgm = manager.Mgm || 0;
  if (youth >= 13) return "youth_developer";
  if (youth < 11 && mgm >= 13) return "veteran_seeker";
  return "balanced";
}

function estimatePlayerValue(player) {
  if (player.AP && player.AP > 0) return player.AP;
  var ca = player.CA || 0;
  if (ca <= 0) return 500000;
  if (ca >= 180) return 80000000;
  if (ca >= 160) return 40000000;
  if (ca >= 140) return 15000000;
  if (ca >= 120) return 5000000;
  if (ca >= 100) return 1500000;
  return 500000;
}

var SLOT_PRIORITY_MAP = {
  GK: "Critical", DC: "Critical", DCL: "Critical", DCR: "Critical", STC: "Critical",
  DMCL: "Important", DMC: "Important", DMCR: "Important",
  MCL: "Important", MC: "Important", MCR: "Important",
  DL: "Important", DR: "Important",
  WBL: "Important", WBR: "Important",
  AML: "Depth", AMR: "Depth", AMC: "Depth", AMCL: "Depth", AMCR: "Depth",
  ML: "Depth", MR: "Depth",
  STCL: "Depth", STCR: "Depth"
};

var PRIORITY_ORDER = { Critical: 0, Important: 1, Depth: 2 };

function getSlotPriority(slotId) {
  return SLOT_PRIORITY_MAP[slotId] || "Depth";
}

// ─── FULL MANAGER: Transfer Window Simulation ───

function simulateTransferWindow(manager, squad, market, budget, tactic) {
  if (typeof simulateTransferWindowV2 === "function") {
    var defaultWageBudget = 500000;
    var v2Result = simulateTransferWindowV2(manager, squad, market, budget, defaultWageBudget, tactic);
    
    // Map V2 result keys to legacy V1 return keys for backward compatibility and test runner
    v2Result.baselines = {
      squadQuality: v2Result.thresholds.squadQuality
    };
    v2Result.arrivals = v2Result.signedPlayers.map(function(x) {
      return {
        player: x.player,
        slotId: x.slotId,
        fee: x.fee,
        fitScore: x.trueFitScore,
        adjustedScore: x.adjustedScore || x.trueFitScore
      };
    });
    v2Result.departures = v2Result.soldPlayers.map(function(x) {
      return {
        player: x,
        fee: x.saleFee || 0
      };
    });
    
    v2Result.spent = v2Result.totalSpent;
    v2Result.saleTotal = v2Result.totalSaleRevenue;
    v2Result.startingBudget = budget;
    v2Result.remainingBudget = v2Result.transferBudgetRemaining;
    v2Result.unresolved = v2Result.dealsCollapsed ? v2Result.dealsCollapsed.length : 0;
    
    return v2Result;
  }

  var archetype = deriveAgeArchetype(manager);
  var slotKeys = Object.keys(tactic.slots || {});
  var instructions = tactic.instructions || {};
  var designations = [];
  var departures = [];
  var arrivals = [];
  var saleTotal = 0;

  // Step 1: Score all squad players for all tactical slots
  // We do a global starting XI solver to prevent multi-strata selling logic bugs.
  var playerSlotScores = [];
  for (var pi = 0; pi < squad.length; pi++) {
    var p = squad[pi];
    for (var si = 0; si < slotKeys.length; si++) {
      var sid = slotKeys[si];
      var slot = tactic.slots[sid];
      if (!slot || !slot.roleId) continue;
      if (!isFlankEligible(p, sid)) continue;
      var sc = scorePlayerForRole(p, slot.roleId, instructions);
      if (sc) {
        playerSlotScores.push({
          player: p,
          slotId: sid,
          roleId: slot.roleId,
          score: sc.total
        });
      }
    }
  }

  // Sort candidate combinations by score descending
  playerSlotScores.sort(function (a, b) { return b.score - a.score; });

  // Pass 1: Assign Starting XI (each player once, each slot once)
  var startersMap = {}; // slotId -> { player, score }
  var assignedStarters = {}; // playerName -> true
  for (var i = 0; i < playerSlotScores.length; i++) {
    var entry = playerSlotScores[i];
    if (startersMap[entry.slotId]) continue;
    if (assignedStarters[entry.player.Name]) continue;

    startersMap[entry.slotId] = { player: entry.player, score: entry.score };
    assignedStarters[entry.player.Name] = true;
  }

  // Pass 2: Assign Backup Depth (each slot gets at most 1 backup from remaining players)
  var totalStarterScore = 0;
  var starterCount = 0;
  for (var sid in startersMap) {
    totalStarterScore += startersMap[sid].score;
    starterCount++;
  }
  var squadQuality = starterCount > 0 ? (totalStarterScore / starterCount) : 13.0;

  // Dynamic satisfaction threshold (scales with squad quality)
  var dynamicThreshold = Math.max(11.0, Math.min(15.0, squadQuality - 0.5));
  dynamicThreshold = Math.round(dynamicThreshold * 10) / 10;

  // Dynamic backup threshold (scales relative to satisfaction)
  var dynamicBackupThreshold = Math.max(9.0, Math.min(12.5, dynamicThreshold - 2.5));
  dynamicBackupThreshold = Math.round(dynamicBackupThreshold * 10) / 10;

  // Dynamic candidate threshold for recruitment upgrades
  var candidateMinScore = Math.max(10.5, Math.min(14.0, dynamicThreshold - 1.0));
  candidateMinScore = Math.round(candidateMinScore * 10) / 10;

  var backupsMap = {}; // slotId -> { player, score }
  var assignedBackups = {}; // playerName -> true
  for (var i = 0; i < playerSlotScores.length; i++) {
    var entry = playerSlotScores[i];
    // Must not be starting anywhere
    if (assignedStarters[entry.player.Name]) continue;
    if (backupsMap[entry.slotId]) continue;
    if (assignedBackups[entry.player.Name]) continue;

    // We only keep backups if they are decent (score >= dynamicBackupThreshold)
    if (entry.score >= dynamicBackupThreshold) {
      backupsMap[entry.slotId] = { player: entry.player, score: entry.score };
      assignedBackups[entry.player.Name] = true;
    }
  }

  // Pass 3: Categorize Designations for all players in squad
  for (var pi = 0; pi < squad.length; pi++) {
    var p = squad[pi];
    var isStarter = assignedStarters[p.Name];
    var isBackup = assignedBackups[p.Name];

    if (isStarter) {
      var slotId = null;
      var score = 0;
      for (var sid in startersMap) {
        if (startersMap[sid].player.Name === p.Name) {
          slotId = sid;
          score = startersMap[sid].score;
          break;
        }
      }
      designations.push({
        player: p,
        designation: "Keep",
        slotId: slotId,
        score: score,
        reason: "Starting XI (" + slotId + ")"
      });
    } else if (isBackup) {
      var slotId = null;
      var score = 0;
      for (var sid in backupsMap) {
        if (backupsMap[sid].player.Name === p.Name) {
          slotId = sid;
          score = backupsMap[sid].score;
          break;
        }
      }
      designations.push({
        player: p,
        designation: "Depth",
        slotId: slotId,
        score: score,
        reason: "Squad Depth (" + slotId + ")"
      });
    } else {
      var bestScore = 0;
      var bestSlot = null;
      for (var i = 0; i < playerSlotScores.length; i++) {
        if (playerSlotScores[i].player.Name === p.Name) {
          if (playerSlotScores[i].score > bestScore) {
            bestScore = playerSlotScores[i].score;
            bestSlot = playerSlotScores[i].slotId;
          }
        }
      }

      // Protect young prospects from sale/listing
      var isYoungProspect = p.Age <= 20 || (p.Age <= 23 && (p.PA || 0) > (p.CA || 0) + 15);
      if (isYoungProspect) {
        designations.push({
          player: p,
          designation: "Keep",
          slotId: bestSlot,
          score: bestScore,
          reason: "Young Prospect"
        });
      } else {
        var val = estimatePlayerValue(p);
        var fee = Math.round(val * 0.9);
        var reason = bestScore < dynamicBackupThreshold ? "Poor tactical fit" : "Surplus to requirements";
        designations.push({
          player: p,
          designation: "Sell",
          slotId: bestSlot,
          score: bestScore,
          reason: reason
        });
        departures.push({
          player: p,
          fee: fee,
          position: p.Position || "",
          age: p.Age
        });
        saleTotal += fee;
      }
    }
  }

  // Pass 4: Find starting slots where manager is UNSATISFIED
  // Satisfied if starter score is >= dynamicThreshold. Gaps are slots without starters, or starter score < dynamicThreshold.
  var unresolved = [];
  for (var si = 0; si < slotKeys.length; si++) {
    var sid = slotKeys[si];
    var slot = tactic.slots[sid];
    if (!slot || !slot.roleId) continue;

    var starter = startersMap[sid];
    var starterScore = starter ? starter.score : -1;

    // Satisfaction threshold is dynamicThreshold
    if (starterScore < dynamicThreshold) {
      unresolved.push({
        slotId: sid,
        priority: getSlotPriority(sid),
        currentBest: starterScore,
        buyThreshold: dynamicThreshold
      });
    }
  }

  // Sort unresolved gaps by priority (Critical -> Important -> Depth)
  unresolved.sort(function (a, b) {
    return (PRIORITY_ORDER[a.priority] || 3) - (PRIORITY_ORDER[b.priority] || 3);
  });

  var totalBudget = budget + saleTotal;
  var spent = 0;

  var squadNames = {};
  for (var i = 0; i < squad.length; i++) {
    squadNames[squad[i].Name] = true;
  }
  var signedPlayers = {};

  // Pass 5: Buy Replacements
  for (var ui = 0; ui < unresolved.length; ui++) {
    var gap = unresolved[ui];
    var slot = tactic.slots[gap.slotId];
    if (!slot || !slot.roleId) continue;

    var candidates = [];
    for (var pi = 0; pi < market.length; pi++) {
      var mp = market[pi];
      if (squadNames[mp.Name] || signedPlayers[mp.Name]) continue;
      if (!isFlankEligible(mp, gap.slotId)) continue;
      var sc = scorePlayerForRole(mp, slot.roleId, instructions);
      // Candidates must be better than candidateMinScore and better than the current starter (if one exists) to warrant purchase
      if (!sc || sc.total < candidateMinScore || sc.total <= gap.currentBest) continue;

      // Age archetype modifiers
      var adjustedScore = sc.total;
      if (archetype === "youth_developer") {
        if (mp.Age <= 21) adjustedScore += 3.0;
        else if (mp.Age <= 23) adjustedScore += 1.5;
        else if (mp.Age >= 29) adjustedScore -= 2.0;
        else if (mp.Age >= 32) adjustedScore -= 4.0;
      } else if (archetype === "veteran_seeker") {
        if (mp.Age >= 28) adjustedScore += 2.0;
        else if (mp.Age >= 31) adjustedScore += 3.0;
        else if (mp.Age < 22) adjustedScore -= 3.0;
      }

      var price = estimatePlayerValue(mp);
      if (price > totalBudget - spent) continue;

      candidates.push({ player: mp, score: adjustedScore, price: price, rawScore: sc.total });
    }

    candidates.sort(function (a, b) { return b.score - a.score; });

    if (candidates.length > 0) {
      var best = candidates[0];
      arrivals.push({
        player: best.player,
        slotId: gap.slotId,
        roleId: slot.roleId,
        fee: best.price,
        fitScore: best.rawScore,
        adjustedScore: best.score,
        archetypeMatch: archetype
      });
      spent += best.price;
      signedPlayers[best.player.Name] = true;
    }
  }

  return {
    designations: designations,
    departures: departures,
    arrivals: arrivals,
    saleTotal: saleTotal,
    spent: spent,
    startingBudget: budget,
    remainingBudget: totalBudget - spent,
    unresolved: unresolved.length - arrivals.length,
    archetype: archetype,
    baselines: { squadQuality: squadQuality },
    thresholds: {
      satisfaction: dynamicThreshold,
      backup: dynamicBackupThreshold,
      candidate: candidateMinScore
    }
  };
}

// ─── APPLY GENERATED TACTIC ───

function applyGeneratedTactic() {
  var mgr = window.FM24State.manager;
  var tac = mgr.generatedTactic || (mgr.hired ? mgr.hired.tactic : null);
  if (!tac) return;

  window.FM24State.tactic.formation = tac.formation;
  window.FM24State.tactic.slots = JSON.parse(JSON.stringify(tac.slots));
  window.FM24State.tactic.instructions = JSON.parse(JSON.stringify(tac.instructions));
  window.FM24State.tactic.isComplete = true;
  window.FM24State.tactic.subs = {};

  persistTactic();
  window.dispatchEvent(new CustomEvent("fm24:tactic-imported"));
  showToast(mgr.hired ? mgr.hired.Name + "'s tactic has been applied." : "Manager tactic applied.", "success");

  // If we are applying the transient tactic from the active window, clear simulation state and close window.
  // If we are applying the persistent tactic from the dashboard, DO NOT clear the state!
  if (mgr.windowActive && mgr.generatedTactic) {
    mgr.generatedTactic = null;
    mgr.report = null;
    mgr.gaps = [];
    mgr.recommendations = [];
    mgr.fitScore = null;
    mgr.transferResult = null;
    mgr.transferResultV2 = null;
    mgr.partAResult = null;
    mgr.incomingBids = [];
    mgr.transfers = { in: [], out: [] };
    mgr.squadDesignations = [];
    mgr.windowStage = null;
    mgr.windowActive = false;
  }

  if (window.FM24State.currentSaveName && typeof createSave === "function") {
    createSave(window.FM24State.appMode, window.FM24State.currentSaveName);
  }
  renderManagerView();
}


function applyTransferResults() {
  var mgr = window.FM24State.manager;
  if (!mgr.transferResult) return;
  var tr = mgr.transferResult;

  // 1. Apply the generated tactic
  if (mgr.generatedTactic) {
    var tac = mgr.generatedTactic;
    window.FM24State.tactic.formation = tac.formation;
    window.FM24State.tactic.slots = JSON.parse(JSON.stringify(tac.slots));
    window.FM24State.tactic.instructions = JSON.parse(JSON.stringify(tac.instructions));
    window.FM24State.tactic.isComplete = true;
    window.FM24State.tactic.subs = {};
  }

  // 2. Remove sold players from squad
  var soldNames = {};
  for (var i = 0; i < tr.departures.length; i++) {
    soldNames[tr.departures[i].player.Name] = true;
  }
  var keptSquad = [];
  for (var i = 0; i < window.FM24State.squad.length; i++) {
    if (!soldNames[window.FM24State.squad[i].Name]) {
      keptSquad.push(window.FM24State.squad[i]);
    }
  }

  // Clear sold players from tactic slots/subs
  var slots = window.FM24State.tactic.slots || {};
  Object.keys(slots).forEach(function (slotId) {
    if (slots[slotId] && slots[slotId].playerName && soldNames[slots[slotId].playerName]) {
      slots[slotId].playerName = null;
    }
  });
  var subs = window.FM24State.tactic.subs || {};
  Object.keys(subs).forEach(function (subId) {
    if (subs[subId] && soldNames[subs[subId]]) {
      delete subs[subId];
    }
  });

  // 3. Add arrivals to squad
  for (var i = 0; i < tr.arrivals.length; i++) {
    var a = tr.arrivals[i];
    var newPlayer = JSON.parse(JSON.stringify(a.player));
    // Ensure it has strata/flanks for depth view
    if (!newPlayer.strata || !newPlayer.strata.length) {
      var posInfo = parsePositions(newPlayer.Position || "");
      newPlayer.strata = posInfo.strata;
      newPlayer.flanks = posInfo.flanks;
    }
    keptSquad.push(newPlayer);

    // 4. Assign arrival to its tactic slot
    if (a.slotId && window.FM24State.tactic.slots[a.slotId]) {
      window.FM24State.tactic.slots[a.slotId].playerName = a.player.Name;
    }
  }

  validateSquadData(keptSquad, 'squad');
  window.FM24State.squad = keptSquad;

  // Run auto pick to fill in the rest of the starting XI and bench
  if (typeof _handleAutoPick === "function") {
    _handleAutoPick(true);
  } else if (typeof window._handleAutoPick === "function") {
    window._handleAutoPick(true);
  }

  persistTactic();
  window.dispatchEvent(new CustomEvent("fm24:tactic-imported"));
  window.dispatchEvent(new CustomEvent("fm24:squad-loaded", { detail: { count: keptSquad.length } }));

  showToast("Squad changes applied: " + tr.departures.length + " sold, " + tr.arrivals.length + " signed.", "success");
  window.FM24SwitchTab("tactic");
}

function applyTransferResultsV2() {
  var mgr = window.FM24State.manager;
  if (!mgr.transferResultV2) return;
  var trV2 = mgr.transferResultV2;

  // 1. Apply generated tactic
  if (mgr.generatedTactic) {
    var tac = mgr.generatedTactic;
    window.FM24State.tactic.formation = tac.formation;
    window.FM24State.tactic.slots = JSON.parse(JSON.stringify(tac.slots));
    window.FM24State.tactic.instructions = JSON.parse(JSON.stringify(tac.instructions));
    window.FM24State.tactic.isComplete = true;
    window.FM24State.tactic.subs = {};
  }

  // 2. Collect names of outgoing players
  var outgoingNames = {};
  function markOutgoing(list) {
    for (var i = 0; i < list.length; i++) {
      outgoingNames[list[i].Name || list[i].player.Name] = true;
    }
  }
  markOutgoing(trV2.releasedPlayers || []);
  markOutgoing(trV2.soldPlayers || []);
  markOutgoing(trV2.loanedPlayers || []);
  markOutgoing(trV2.emergencySales || []);

  // 3. Filter squad — keep players not outgoing
  var keptSquad = [];
  for (var i = 0; i < window.FM24State.squad.length; i++) {
    if (!outgoingNames[window.FM24State.squad[i].Name]) {
      keptSquad.push(window.FM24State.squad[i]);
    }
  }

  // Clear outgoing players from tactic slots/subs
  var slots = window.FM24State.tactic.slots || {};
  Object.keys(slots).forEach(function (slotId) {
    if (slots[slotId] && slots[slotId].playerName && outgoingNames[slots[slotId].playerName]) {
      slots[slotId].playerName = null;
    }
  });
  var subs = window.FM24State.tactic.subs || {};
  Object.keys(subs).forEach(function (subId) {
    if (subs[subId] && outgoingNames[subs[subId]]) {
      delete subs[subId];
    }
  });

  // 4. Add signed players to squad
  for (var i = 0; i < trV2.signedPlayers.length; i++) {
    var a = trV2.signedPlayers[i];
    var newPlayer = JSON.parse(JSON.stringify(a.player));
    if (!newPlayer.strata || !newPlayer.strata.length) {
      var posInfo = parsePositions(newPlayer.Position || "");
      newPlayer.strata = posInfo.strata;
      newPlayer.flanks = posInfo.flanks;
    }
    keptSquad.push(newPlayer);

    // 5. Assign to tactic slot
    if (a.slotId && window.FM24State.tactic.slots[a.slotId]) {
      window.FM24State.tactic.slots[a.slotId].playerName = a.player.Name;
    }
  }

  validateSquadData(keptSquad, 'squad');
  window.FM24State.squad = keptSquad;

  // 6. Track loaned-out players
  if (!mgr.loanedOutPlayers) mgr.loanedOutPlayers = [];
  (trV2.loanedPlayers || []).forEach(function (lp) {
    var lpName = lp.Name || lp.player.Name;
    var exists = mgr.loanedOutPlayers.some(function (lop) {
      return (lop.Name || lop.player.Name) === lpName;
    });
    if (!exists) {
      var loanRecord = lp.player ? JSON.parse(JSON.stringify(lp.player)) : JSON.parse(JSON.stringify(lp));
      loanRecord.loanStatus = 'LOANED';
      mgr.loanedOutPlayers.push(loanRecord);
    }
  });

  // 7. Remove recalled players from loanedOutPlayers
  (trV2.signedPlayers || []).forEach(function (a) {
    if (a.isRecall === true) {
      var recallName = a.player.Name;
      mgr.loanedOutPlayers = mgr.loanedOutPlayers.filter(function (lop) {
        return (lop.Name || lop.player.Name) !== recallName;
      });
    }
  });

  // 8. Update signingHistory statuses
  var shBoard = window.FM24State.board;
  if (shBoard && shBoard.signingHistory) {
    shBoard.signingHistory.forEach(function (sh) {
      var shName = sh.playerName;
      if (!shName) return;
      var wasSold = (trV2.soldPlayers || []).some(function (p) { return (p.Name || p.player.Name) === shName; });
      var wasEmergencySold = (trV2.emergencySales || []).some(function (es) { return (es.player.Name || es.player.player.Name) === shName; });
      if (wasSold || wasEmergencySold) { sh.status = 'SOLD'; return; }
      var wasReleased = (trV2.releasedPlayers || []).some(function (p) { return (p.Name || p.player.Name) === shName; });
      if (wasReleased) { sh.status = 'RELEASED'; return; }
      var wasLoaned = (trV2.loanedPlayers || []).some(function (p) { return (p.Name || p.player.Name) === shName; });
      if (wasLoaned) { sh.status = 'LOANED'; return; }
      var wasRecalled = (trV2.signedPlayers || []).some(function (a) { return a.isRecall === true && a.player.Name === shName; });
      if (wasRecalled) { sh.status = 'Active'; }
    });
  }

  // Run auto pick to fill in the rest of the starting XI and bench
  if (typeof _handleAutoPick === "function") {
    _handleAutoPick(true);
  } else if (typeof window._handleAutoPick === "function") {
    window._handleAutoPick(true);
  }

  persistTactic();
  window.dispatchEvent(new CustomEvent("fm24:tactic-imported"));
  window.dispatchEvent(new CustomEvent("fm24:squad-loaded", { detail: { count: keptSquad.length } }));

  var outCount = Object.keys(outgoingNames).length;
  showToast("Squad updated: " + trV2.signedPlayers.length + " signed, " + outCount + " departed.", "success");

  // Carry over remaining budgets to the next window!
  if (trV2.transferBudgetRemaining !== undefined) {
    mgr.budget = trV2.transferBudgetRemaining;
  }
  if (trV2.wageBudgetTotal !== undefined) {
    mgr.wageBudget = trV2.wageBudgetTotal;
  }

  // Clear active window results since we have executed them!
  mgr.generatedTactic = null;
  mgr.report = null;
  mgr.gaps = [];
  mgr.recommendations = [];
  mgr.fitScore = null;
  mgr.transferResult = null;
  mgr.transferResultV2 = null;
  mgr.partAResult = null;
  mgr.incomingBids = [];
  mgr.transfers = { in: [], out: [] };
  mgr.squadDesignations = [];
  mgr.windowStage = null;
  mgr.windowActive = false;

  if (window.FM24State.currentSaveName && typeof createSave === "function") {
    createSave(window.FM24State.appMode, window.FM24State.currentSaveName);
  }
  updateTacticalAnalysis(true);
  renderManagerView();
}

function renderManagerView() {
  var panelEl = document.getElementById("panel-manager");
  if (panelEl) {
    panelEl.style.overflow = "";
    panelEl.style.height = "";
  }
  var container = document.getElementById("manager-content");
  if (!container) return;
  container.style.overflow = "";
  container.style.height = "";
  var state = window.FM24State.manager;

  updateTacticalAnalysis(false);

  var listScroll = document.getElementById("candidate-list-scroll");
  var savedScrollTop = listScroll ? listScroll.scrollTop : 0;

  var html = "";
  if (state.roster.length === 0) {
    html += renderStaffUploadStep(state);
  } else if (state.hired) {
    // Show the Manager Profile / Analysis Prep step (Step 3) if hired
    html += renderAnalyseStep(state);
  } else {
    // Show Candidate Selection list if no manager is hired
    html += '<div class="max-w-7xl mx-auto w-full h-full flex flex-col min-h-0 space-y-6">';
    html += '  <div class="flex-1 flex flex-col min-h-0">';
    html += '    <div class="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">';
    html += '      <span class="w-2 h-2 rounded-full bg-blue-500"></span>';
    html += '      Available Candidates (Manager Market)';
    html += '    </div>';
    html += renderHireStep(state);
    html += '  </div>';
    html += '</div>';
  }

  container.innerHTML = html;

  // Restore scroll
  var newListScroll = document.getElementById("candidate-list-scroll");
  if (newListScroll) {
    newListScroll.scrollTop = savedScrollTop;
  }

  // Wire events
  if (state.roster.length > 0) wireManagerRowClicks();
  wireResetButton();
}

function renderManagerHub(state) {
  // If active window, render results or intervention panel
  if (state.windowActive) {
    var activeHtml = "";
    if (state.windowStage === 'PART_A_COMPLETE' && state.partAResult && !state.transferResultV2) {
      activeHtml = renderInterventionPanel(state);
    } else if (state.generatedTactic || state.transferResultV2 || state.transferResult) {
      activeHtml = renderResultsStep(state);
    }
    return '<div class="flex-1 overflow-y-auto pr-2 min-h-0 space-y-4 pb-8">' + activeHtml + '</div>';
  }

  // Otherwise, render the Manager Office Dashboard with sub-tabs!
  var html = "";
  var manager = state.hired;
  if (!manager) return "<p class='text-text-muted text-xs'>No manager hired yet.</p>";

  var archetype = deriveArchetype(manager);
  var transArch = typeof resolveTransferArchetype === "function" ? resolveTransferArchetype(manager) : "OPPORTUNIST";
  var board = window.FM24State.board || { confidence: 70, stage: 'NORMAL', mandates: [], objectiveArcs: [] };
  var history = sanitizeHistory(state);
  var activeSubTab = state.activeSubTab || 'dashboard';

  html += '<div class="flex-1 flex flex-col min-h-0 space-y-4 animate-fade-in">';

  html += '  <div class="bg-surface border border-border/60 rounded-xl p-4 flex items-center justify-between">';
  html += '    <div class="flex items-center gap-3">';
  html += '      <div class="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold">' + escHtml((manager.Name || '?').charAt(0).toUpperCase()) + '</div>';
  html += '      <div>';
  html += '        <div class="text-sm font-bold text-white">' + escHtml(manager.Name) + '</div>';
  html += '        <div class="text-[10px] text-text-muted">' + escHtml(manager['Preferred Formation'] || '—') + ' · CA ' + (manager.CA || 0) + '</div>';
  html += '      </div>';
  html += '    </div>';
  html += '    <div class="flex items-center gap-2">';
  html += '      <button onclick="FM24SwitchTab(\'dashboard\')" class="text-[10px] px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded transition-colors">Dashboard</button>';
  html += '      <button onclick="FM24SwitchTab(\'transfers\')" class="text-[10px] px-3 py-1.5 bg-border/40 hover:bg-border text-white rounded transition-colors">Transfers</button>';
  html += '    </div>';
  html += '  </div>';

  // ═══ HISTORY SUB-TAB ═══
  html += '  <div class="manager-subtab-content flex-1 overflow-y-auto space-y-6" data-subtab="history">';




  html += '    <div class="bg-surface border border-border/60 rounded-xl p-5 flex flex-col gap-4 shadow-lg">';
  html += '      <div>';
  html += '        <h4 class="text-xs font-bold text-white uppercase tracking-wider mb-0.5">Career Timeline & History</h4>';
  html += '        <p class="text-[11px] text-text-muted">Simulated transfer windows and squad development history.</p>';
  html += '      </div>';

  if (history.length === 0) {
    html += '      <div class="text-center py-6 bg-backdrop/10 border border-dashed border-border rounded-lg">';
    html += '        <div class="text-xl mb-1.5">📁</div>';
    html += '        <h4 class="text-xs font-bold text-white uppercase tracking-wider mb-0.5">No History Recorded</h4>';
    html += '        <p class="text-[10px] text-text-muted max-w-sm mx-auto leading-relaxed px-4">Complete your first transfer window to begin recording your tenure timeline and tracking squad quality deltas.</p>';
    html += '      </div>';
  } else {
    html += '      <div class="overflow-x-auto border border-border/60 rounded-lg">';
    html += '        <table class="w-full text-left border-collapse text-xs">';
    html += '          <thead>';
    html += '            <tr class="bg-backdrop/40 border-b border-border/40 text-[9px] uppercase tracking-wider font-bold text-text-secondary">';
    html += '              <th class="py-2 px-3">Window</th>';
    html += '              <th class="py-2 px-3 text-right">Spend</th>';
    html += '              <th class="py-2 px-3 text-right">Sales</th>';
    html += '              <th class="py-2 px-3 text-right">Signed</th>';
    html += '              <th class="py-2 px-3 text-right">Mandates</th>';
    html += '              <th class="py-2 px-3 text-right">Squad Quality</th>';
    html += '              <th class="py-2 px-3 text-right">Relationship</th>';
    html += '            </tr>';
    html += '          </thead>';
    html += '          <tbody class="divide-y divide-border/20 text-[11px] text-white font-medium">';
    
    history.forEach(function (w, idx) {
      var dVal = (w.endSquadAvgQuality || 0) - (w.startSquadAvgQuality || 0);
      var dSign = dVal >= 0 ? "+" : "";
      var dColor = dVal >= 0 ? "text-green-400" : "text-red-400";
      html += '            <tr class="manager-history-row hover:bg-backdrop/25 transition-colors cursor-pointer" data-window-idx="' + idx + '">';
      html += '              <td class="py-2 px-3 font-bold"><span class="text-[10px] text-text-muted select-none mr-1">▶</span>' + escHtml(w.label || ("W" + w.windowIndex)) + '</td>';
      html += '              <td class="py-2 px-3 text-right text-red-400 font-mono">£' + formatCurrency(w.spent || 0) + '</td>';
      html += '              <td class="py-2 px-3 text-right text-green-400 font-mono">£' + formatCurrency(w.sales || 0) + '</td>';
      html += '              <td class="py-2 px-3 text-right font-mono">' + (w.signed || 0) + '</td>';
      html += '              <td class="py-2 px-3 text-right font-mono">' + escHtml(w.mandates || "—") + '</td>';
      html += '              <td class="py-2 px-3 text-right font-mono">' + (w.startSquadAvgQuality || 0).toFixed(1) + ' → ' + (w.endSquadAvgQuality || 0).toFixed(1) + ' <span class="' + dColor + '">(' + dSign + dVal.toFixed(1) + ')</span></td>';
      html += '              <td class="py-2 px-3 text-right font-mono text-blue-400">' + (w.rel || 60) + '%</td>';
      html += '            </tr>';
      
      // Build signed and sold lists from event log
      var signedPlayers = [];
      var soldPlayers = [];
      if (w.eventLog) {
        w.eventLog.forEach(function (ev) {
          if (ev.type === "SIGNED" || ev.type === "FA_SIGNED") {
            signedPlayers.push(ev.detail || ev.msg || ev.message || ev.player);
          } else if (ev.type === "SOLD") {
            soldPlayers.push(ev.detail || ev.msg || ev.message || ev.player);
          }
        });
      }
      
      html += '            <tr id="manager-detail-' + idx + '" class="bg-backdrop/10 border-t border-border/25" style="display: none;">';
      html += '              <td colspan="7" class="py-3 px-4">';
      html += '                <div class="grid grid-cols-2 gap-4">';
      
      // Left column: Players bought
      html += '                  <div>';
      html += '                    <div class="text-[10px] text-green-400 uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1.5"><span>✚</span> Players Bought (' + signedPlayers.length + ')</div>';
      if (signedPlayers.length > 0) {
        html += '                    <div class="space-y-0.5">';
        signedPlayers.forEach(function (d) {
          html += '                      <div class="text-[10px] text-text-secondary font-mono leading-relaxed">• ' + escHtml(d) + '</div>';
        });
        html += '                    </div>';
      } else {
        html += '                    <p class="text-[10px] text-text-muted italic">No signings this window.</p>';
      }
      html += '                  </div>';
      
      // Right column: Players sold
      html += '                  <div>';
      html += '                    <div class="text-[10px] text-orange-400 uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1.5"><span>✕</span> Players Sold (' + soldPlayers.length + ')</div>';
      if (soldPlayers.length > 0) {
        html += '                    <div class="space-y-0.5">';
        soldPlayers.forEach(function (d) {
          html += '                      <div class="text-[10px] text-text-secondary font-mono leading-relaxed">• ' + escHtml(d) + '</div>';
        });
        html += '                    </div>';
      } else {
        html += '                    <p class="text-[10px] text-text-muted italic">No sales this window.</p>';
      }
      html += '                  </div>';
      
      html += '                </div>';
      
      // Full event log collapsed by default
      html += '                <details class="mt-3 border border-border/20 rounded">';
      html += '                  <summary class="text-[10px] text-text-muted cursor-pointer hover:text-white transition-colors px-2.5 py-1.5 font-bold uppercase tracking-wider select-none">Full Event Log (' + (w.eventLog ? w.eventLog.length : 0) + ' events)</summary>';
      if (w.eventLog && w.eventLog.length > 0) {
        html += '                  <div class="space-y-0.5 px-2.5 pb-2 max-h-28 overflow-y-auto font-mono text-[9px] leading-relaxed text-text-secondary border-t border-border/20 pt-1.5 mt-0.5">';
        w.eventLog.forEach(function (ev) {
          html += '                    <div>[' + escHtml(ev.type) + '] ' + escHtml(ev.detail || ev.msg || ev.message || "") + '</div>';
        });
        html += '                  </div>';
      } else {
        html += '                  <p class="text-[10px] text-text-muted italic px-2.5 pb-2">No events logged.</p>';
      }
      html += '                </details>';
      
      html += '              </td>';
      html += '            </tr>';
    });
    
    html += '          </tbody>';
    html += '        </table>';
    html += '      </div>';
  }
  html += '    </div>'; // end tenure card
  html += '  </div>'; // end history sub-tab

  html += '</div>'; // end hub container

  return html;
}

function switchManagerSubTab(tabId) {
  if (window.FM24State && window.FM24State.manager) {
    window.FM24State.manager.activeSubTab = tabId;
  }
  var btns = document.querySelectorAll('.manager-subtab-btn');
  btns.forEach(function (b) {
    if (b.getAttribute('data-manager-subtab') === tabId) {
      b.classList.remove('text-text-muted', 'border-transparent');
      b.classList.add('text-white', 'border-blue-500');
    } else {
      b.classList.remove('text-white', 'border-blue-500');
      b.classList.add('text-text-muted', 'border-transparent');
    }
  });
  var contents = document.querySelectorAll('.manager-subtab-content');
  contents.forEach(function (c) {
    if (c.getAttribute('data-subtab') === tabId) {
      c.classList.remove('hidden');
    } else {
      c.classList.add('hidden');
    }
  });
}
window.switchManagerSubTab = switchManagerSubTab;

function toggleBlueprintCollapse() {
  var el = document.getElementById("blueprint-details");
  var btn = document.querySelector(".toggle-blueprint-btn");
  if (el && btn) {
    var isHidden = el.style.display === "none";
    el.style.display = isHidden ? "block" : "none";
    btn.textContent = isHidden ? "[Hide]" : "[Show]";
  }
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

function getDofAttr(manager, key) {
  var mapping = {
    "Youth": ["Youth", "Working with Youth", "WorkingWithYouth"],
    "Judge P": ["Judge P", "Judge_P", "Judging Player Potential", "JudgingPlayerPotential"],
    "Judge A": ["Judge A", "Judge_A", "Judging Player Ability", "JudgingPlayerAbility"],
    "Tac Knw": ["Tac Knw", "Tactical Knowledge", "TacticalKnowledge"],
    "Prof": ["Prof", "Professionalism", "Professionalism"]
  };
  var aliases = mapping[key] || [key];
  for (var i = 0; i < aliases.length; i++) {
    if (manager[aliases[i]] !== undefined) {
      var val = parseInt(manager[aliases[i]], 10);
      return isNaN(val) ? 0 : val;
    }
  }
  return 0;
}

function renderDofAttributeRow(label, val) {
  var pct = Math.min(100, Math.round((val / 20) * 100));
  var barColor = val >= 15 ? "bg-green-500" : val >= 10 ? "bg-yellow-500" : val >= 6 ? "bg-orange-500" : "bg-red-500";
  var textColor = val >= 15 ? "text-green-400" : val >= 10 ? "text-yellow-400" : val >= 6 ? "text-orange-400" : "text-red-400";
  
  var html = "";
  html += '<div class="flex flex-col gap-1">';
  html += '  <div class="flex justify-between text-xs">';
  html += '    <span class="text-text-secondary font-medium">' + escHtml(label) + '</span>';
  html += '    <span class="' + textColor + ' font-bold">' + val + '/20</span>';
  html += '  </div>';
  html += '  <div class="w-full bg-backdrop border border-border/50 rounded h-2 overflow-hidden">';
  html += '    <div class="' + barColor + ' rounded h-full transition-all" style="width:' + pct + '%"></div>';
  html += '  </div>';
  html += '</div>';
  return html;
}

function renderCompatibilityPillarRow(label, pillar) {
  if (!pillar) return '';
  var val = pillar.score;
  var max = pillar.max;
  var pct = max > 0 ? Math.min(100, Math.round((val / max) * 100)) : 0;
  var barColor = pct >= 75 ? "bg-blue-500" : pct >= 50 ? "bg-cyan-500" : pct >= 30 ? "bg-teal-500" : "bg-red-500";
  
  var html = "";
  html += '<div class="flex flex-col gap-1">';
  html += '  <div class="flex justify-between text-[11px]">';
  html += '    <span class="text-text-muted">' + escHtml(label) + '</span>';
  html += '    <span class="text-text-secondary font-semibold">' + Math.round(val) + '/' + max + '</span>';
  html += '  </div>';
  html += '  <div class="w-full bg-backdrop border border-border/50 rounded h-1.5 overflow-hidden">';
  html += '    <div class="' + barColor + ' rounded h-full transition-all" style="width:' + pct + '%"></div>';
  html += '  </div>';
  html += '</div>';
  return html;
}

function renderArchetypeTag(type, value) {
  var desc = "";
  var cleanVal = value ? value.toUpperCase().trim() : "";
  if (type === "tactical") {
    var v = value ? value.toLowerCase().trim() : "";
    if (v.indexOf("positional play specialist") !== -1) {
      desc = "Positional Play Specialist: High-volume passing, vertical rotations, half-space exploits, higher defensive lines, and strict positional discipline.";
    } else if (v.indexOf("wide-oriented direct play") !== -1) {
      desc = "Wide-Oriented Direct Play: Direct passing stretching play wide to overlapping wingbacks and traditional wingers for crosses into target men.";
    } else if (v.indexOf("possession-oriented tactician") !== -1) {
      desc = "Possession-Oriented Tactician: Patient build-up, short direct passing, low risk, and suffocating opponents through sustained ball possession.";
    } else if (v.indexOf("aggressive high-press tactician") !== -1) {
      desc = "Aggressive High-Press Tactician: High-intensity counter-pressing on loss, compact high block, and immediate vertical transitions.";
    } else if (v.indexOf("disciplined defensive organiser") !== -1) {
      desc = "Disciplined Defensive Organiser: Compact low-to-mid block, regrouping on possession loss, and rigid defensive recovery positioning.";
    } else if (v.indexOf("direct counter-attacker") !== -1) {
      desc = "Direct Counter-Attacker: Absorbs pressure in a disciplined mid block and unleashes lightning-fast direct vertical counters into space.";
    } else if (v.indexOf("pragmatic system-adapter") !== -1) {
      desc = "Pragmatic System-Adapter: Highly adaptable, altering roles and instructions dynamically based on squad capacity and opponent threats.";
    } else {
      desc = "Balanced Tactician: Flexible instruction framework with balanced width, tempo, and playing mentality.";
    }
    return '<span class="has-tooltip inline-flex items-center text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/25 font-bold tracking-wide uppercase cursor-help">' + escHtml(value) + '<span class="tooltip-box">' + escHtml(desc) + '</span></span>';
  } else { // transfer
    if (cleanVal.indexOf("IDENTITY_ARCHITECT") !== -1) {
      desc = "Identity Architect: Focuses on signings that strictly align with tactical structures and high team determination floors.";
    } else if (cleanVal.indexOf("DEVELOPER") !== -1) {
      desc = "Developer: High focus on academy talent, youth scouting, and developing/protecting long-term prospect value.";
    } else if (cleanVal.indexOf("PHILOSOPHER") !== -1) {
      desc = "Philosopher: Prioritizes elite professionalism and mental composure. Prefers low-risk, highly calculated additions.";
    } else if (cleanVal.indexOf("RECYCLER") !== -1) {
      desc = "Recycler: Prioritizes immediate impact (current ability). Recycles older veterans with low tolerance/priority for youth.";
    } else if (cleanVal.indexOf("STATESMAN") !== -1) {
      desc = "Statesman: Prioritizes locker room harmony, loyalty, and a veteran core. Highly loyal to the existing squad.";
    } else if (cleanVal.indexOf("PRESSURE_BUYER") !== -1) {
      desc = "Pressure Buyer: Easily swayed by board pressure or immediate squad gaps; prone to signing under stress.";
    } else if (cleanVal.indexOf("SELL_TO_BUY") !== -1) {
      desc = "Sell-to-Buy: High determination and player assessment, but low loyalty; willing to sell stars to fund squad upgrades.";
    } else {
      desc = "Opportunist: Ambition-driven and flexible. Ready to move quickly on market-listed players or high-reputation bargains.";
    }
    return '<span class="has-tooltip inline-flex items-center text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/25 font-bold tracking-wide uppercase cursor-help">' + escHtml(value) + '<span class="tooltip-box">' + escHtml(desc) + '</span></span>';
  }
}

function renderManagerCard(manager) {
  var archetype = deriveArchetype(manager);
  var transArch = typeof resolveTransferArchetype === "function" ? resolveTransferArchetype(manager) : "OPPORTUNIST";
  var youth = getDofAttr(manager, "Youth");
  var judgeP = getDofAttr(manager, "Judge P");
  var judgeA = getDofAttr(manager, "Judge A");

  var html = "";
  html += '<div class="bg-gradient-to-br from-surface to-surface/90 border border-border/85 rounded-xl p-5 mb-6 shadow-lg animate-fade-in relative overflow-hidden">';
  html += '  <div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>';
  html += '  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-3.5 mb-4">';
  html += '    <div>';
  html += '      <div class="flex items-center gap-2">';
  html += '        <h3 class="text-sm font-extrabold text-white tracking-tight">' + escHtml(manager.Name) + '</h3>';
  html += '        <span class="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">HIRED GAFFER</span>';
  html += '      </div>';
  html += '      <div class="text-[11px] text-text-muted mt-0.5 flex items-center gap-2">';
  html += '        <span>Preferred Job: <strong class="text-text-secondary">' + escHtml(manager["Preferred Job"] || "Manager") + '</strong></span>';
  html += '        <span>•</span>';
  html += '        <span>CA: <strong class="text-text-secondary">' + (manager.CA || 0) + '</strong></span>';
  html += '      </div>';
  html += '    </div>';
  html += '    <div class="flex items-center gap-2">';
  html += '      ' + renderArchetypeTag("tactical", archetype);
  html += '      ' + renderArchetypeTag("transfer", transArch);
  html += '      <button class="text-xs text-text-muted hover:text-white transition-colors bg-border/40 hover:bg-border px-3 py-1.5 rounded border border-border/40" id="hire-different-card-btn">Hire Different</button>';
  html += '    </div>';
  html += '  </div>';

  html += '  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-4 text-xs">';
  html += '    <div>';
  html += '      <span class="text-text-muted block mb-1 text-[10px] uppercase font-bold tracking-wider">Formation</span>';
  html += '      <span class="text-white font-extrabold">' + escHtml(manager["Preferred Formation"] || "—") + '</span>';
  html += '    </div>';
  html += '    <div>';
  html += '      <span class="text-text-muted block mb-1 text-[10px] uppercase font-bold tracking-wider">Mentality</span>';
  html += '      <span class="text-white font-extrabold">' + escHtml(manager["Playing Mentality"] || "—") + '</span>';
  html += '    </div>';
  html += '    <div>';
  html += '      <span class="text-text-muted block mb-1 text-[10px] uppercase font-bold tracking-wider">Pressing</span>';
  html += '      <span class="text-white font-extrabold">' + escHtml(manager["Pressing Style"] || "—") + '</span>';
  html += '    </div>';
  html += '    <div>';
  html += '      <span class="text-text-muted block mb-1 text-[10px] uppercase font-bold tracking-wider">Marking</span>';
  html += '      <span class="text-white font-extrabold">' + escHtml(manager["Marking Style"] || "—") + '</span>';
  html += '    </div>';
  
  var scoreColor = function(v) { return v >= 15 ? "text-green-400" : v >= 11 ? "text-yellow-400" : "text-red-400"; };
  
  html += '    <div>';
  html += '      <span class="text-text-muted block mb-1 text-[10px] uppercase font-bold tracking-wider">Youth Dev</span>';
  html += '      <span class="font-extrabold ' + scoreColor(youth) + '">' + youth + '</span><span class="text-[10px] text-text-muted">/20</span>';
  html += '    </div>';
  html += '    <div>';
  html += '      <span class="text-text-muted block mb-1 text-[10px] uppercase font-bold tracking-wider">Judging Pot</span>';
  html += '      <span class="font-extrabold ' + scoreColor(judgeP) + '">' + judgeP + '</span><span class="text-[10px] text-text-muted">/20</span>';
  html += '    </div>';
  html += '    <div>';
  html += '      <span class="text-text-muted block mb-1 text-[10px] uppercase font-bold tracking-wider">Judging Abil</span>';
  html += '      <span class="font-extrabold ' + scoreColor(judgeA) + '">' + judgeA + '</span><span class="text-[10px] text-text-muted">/20</span>';
  html += '    </div>';
  html += '  </div>';

  if (window.FM24State.manager.transferResultV2) {
    html += '  <div class="mt-4 pt-3.5 border-t border-border/40 flex items-center justify-between gap-4">';
    html += '    <div class="text-[11px] text-text-muted">Transfer Window Simulation results ready. Review the squad upgrades below.</div>';
    html += '    <button id="apply-transfers-v2-card-btn" class="text-xs px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-bold uppercase tracking-wider shadow shadow-blue-500/10">Apply Transfers to Squad</button>';
    html += '  </div>';
  }

  html += '</div>';

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

  var eligible = filterEligibleManagers(state.roster);
  var boardState = window.FM24State.board || { stage: 'NORMAL' };

  if (!window.FM24State.managerFilters) {
    window.FM24State.managerFilters = {
      archetype: "All",
      fitMin: 0,
      fitMax: 100,
      sortBy: "fit",
      searchQuery: "",
      mentality: "All",
      pressing: "All",
      transferArchetype: "All",
      interest: "All"
    };
  }
  var filters = window.FM24State.managerFilters;
  if (filters.mentality === undefined) filters.mentality = "All";
  if (filters.pressing === undefined) filters.pressing = "All";
  if (filters.transferArchetype === undefined) filters.transferArchetype = "All";
  if (filters.interest === undefined) filters.interest = "All";

  var fitDisabled = hasSquad && !fitScoresReady;

  var uniqueMentalities = {};
  var uniquePressingStyles = {};
  var uniqueTransferArchetypes = {};

  for (var i = 0; i < eligible.length; i++) {
    var mgr = eligible[i];
    var ment = mgr["Playing Mentality"] || "—";
    uniqueMentalities[ment] = true;

    var press = mgr["Pressing Style"] || "—";
    uniquePressingStyles[press] = true;

    var transArch = typeof resolveTransferArchetype === "function" ? resolveTransferArchetype(mgr) : "OPPORTUNIST";
    uniqueTransferArchetypes[transArch] = true;
  }

  var mentalityList = Object.keys(uniqueMentalities).sort();
  var pressingList = Object.keys(uniquePressingStyles).sort();
  var transferArchetypeList = Object.keys(uniqueTransferArchetypes).sort();

  var archetypes = {};
  for (var fi = 0; fi < eligible.length; fi++) {
    archetypes[eligible[fi].Name] = deriveArchetype(eligible[fi]);
  }

  var fitScores = fitScoresReady ? window.FM24State.manager.fitScores : {};

  var filtered = [];
  for (var fi2 = 0; fi2 < eligible.length; fi2++) {
    var m2 = eligible[fi2];
    var arch = archetypes[m2.Name];
    var fit = fitScoresReady && fitScores[m2.Name] ? fitScores[m2.Name].overallScore : null;

    var mMent = m2["Playing Mentality"] || "—";
    var mPress = m2["Pressing Style"] || "—";
    var mTransArch = typeof resolveTransferArchetype === "function" ? resolveTransferArchetype(m2) : "OPPORTUNIST";

    if (filters.archetype !== "All" && arch !== filters.archetype) continue;
    if (filters.searchQuery && m2.Name.toLowerCase().indexOf(filters.searchQuery.toLowerCase()) === -1) continue;
    if (filters.mentality && filters.mentality !== "All" && mMent !== filters.mentality) continue;
    if (filters.pressing && filters.pressing !== "All" && mPress !== filters.pressing) continue;
    if (filters.transferArchetype && filters.transferArchetype !== "All" && mTransArch !== filters.transferArchetype) continue;
    if (filters.interest && filters.interest !== "All") {
      var interestVal = calculateManagerInterest(m2, squad, boardState);
      if (filters.interest === "Interested" && interestVal.band === "LOCKED") continue;
      if (filters.interest === "Eager" && interestVal.band !== "EAGER") continue;
    }
    if (fitScoresReady && fit !== null && (fit < filters.fitMin || fit > filters.fitMax)) continue;
    filtered.push(m2);
  }

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

  var selectedMgr = null;
  if (filtered.length > 0) {
    if (state.selectedCandidateName) {
      selectedMgr = filtered.find(function(m) { return m.Name === state.selectedCandidateName; });
    }
    if (!selectedMgr) {
      selectedMgr = filtered[0];
      state.selectedCandidateName = selectedMgr.Name;
    }
  }

  var html = "";

  html += '<div class="text-xs text-text-muted mb-4 flex items-center justify-between">';
  html += '  <div>';
  html += '    <span class="font-bold text-white">' + state.roster.length + '</span> staff loaded, <span class="font-bold text-white">' + eligible.length + '</span> eligible managers.';
  html += '    <button id="change-staff-btn" class="text-xs text-text-muted hover:text-white underline transition-colors ml-2">[Change Staff]</button>';
  if (hasSquad) {
    html += '    <button id="change-squad-btn" class="text-xs text-text-muted hover:text-white underline transition-colors ml-2">[Change Squad]</button>';
  }
  var hasMarket = window.FM24State.market && window.FM24State.market.length > 0;
  if (hasMarket) {
    html += '    <button id="change-market-btn" class="text-xs text-text-muted hover:text-white underline transition-colors ml-2">[Change Market]</button>';
  }
  html += '  </div>';
  html += '</div>';

  html += '<div class="bg-surface border border-border rounded-lg p-4 mb-5 shadow-sm">';
  html += '  <div class="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">';
  html += '    <svg class="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>';
  html += '    Filter Candidates';
  html += '  </div>';
  html += '  <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3">';
  
  html += '    <div class="flex flex-col gap-1">';
  html += '      <span class="text-[9px] text-text-muted uppercase font-bold tracking-wider">Search Name</span>';
  html += '      <input id="hire-search-input" type="text" placeholder="Search name..." value="' + escAttr(filters.searchQuery) + '" class="w-full text-xs bg-backdrop border border-border rounded-lg px-2.5 py-1.5 text-white placeholder:text-text-muted focus:outline-none focus:border-text-muted">';
  html += '    </div>';

  html += '    <div class="flex flex-col gap-1">';
  html += '      <span class="text-[9px] text-text-muted uppercase font-bold tracking-wider">Tactical Style</span>';
  html += '      <select id="hire-archetype-filter" class="w-full text-xs bg-backdrop border border-border rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-text-muted">';
  var knownArchetypes = ["All", "possession-oriented tactician", "positional play specialist", "aggressive high-press tactician", "disciplined defensive organiser", "direct counter-attacker", "wide-oriented direct play", "pragmatic system-adapter", "balanced tactician"];
  for (var ai = 0; ai < knownArchetypes.length; ai++) {
    var selArch = knownArchetypes[ai] === filters.archetype ? "selected" : "";
    html += '        <option value="' + knownArchetypes[ai] + '" ' + selArch + '>' + knownArchetypes[ai] + '</option>';
  }
  html += '      </select>';
  html += '    </div>';

  html += '    <div class="flex flex-col gap-1">';
  html += '      <span class="text-[9px] text-text-muted uppercase font-bold tracking-wider">Transfer Archetype</span>';
  html += '      <select id="hire-transfer-archetype-filter" class="w-full text-xs bg-backdrop border border-border rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-text-muted">';
  html += '        <option value="All" ' + (filters.transferArchetype === "All" ? "selected" : "") + '>All Transfer Archetypes</option>';
  for (var tai = 0; tai < transferArchetypeList.length; tai++) {
    var taVal = transferArchetypeList[tai];
    var selTA = taVal === filters.transferArchetype ? "selected" : "";
    html += '        <option value="' + escAttr(taVal) + '" ' + selTA + '>' + escHtml(taVal) + '</option>';
  }
  html += '      </select>';
  html += '    </div>';

  html += '    <div class="flex flex-col gap-1">';
  html += '      <span class="text-[9px] text-text-muted uppercase font-bold tracking-wider">Mentality</span>';
  html += '      <select id="hire-mentality-filter" class="w-full text-xs bg-backdrop border border-border rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-text-muted">';
  html += '        <option value="All" ' + (filters.mentality === "All" ? "selected" : "") + '>All Mentalities</option>';
  for (var mi = 0; mi < mentalityList.length; mi++) {
    var mVal = mentalityList[mi];
    var selM = mVal === filters.mentality ? "selected" : "";
    html += '        <option value="' + escAttr(mVal) + '" ' + selM + '>' + escHtml(mVal) + '</option>';
  }
  html += '      </select>';
  html += '    </div>';

  html += '    <div class="flex flex-col gap-1">';
  html += '      <span class="text-[9px] text-text-muted uppercase font-bold tracking-wider">Pressing Style</span>';
  html += '      <select id="hire-pressing-filter" class="w-full text-xs bg-backdrop border border-border rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-text-muted">';
  html += '        <option value="All" ' + (filters.pressing === "All" ? "selected" : "") + '>All Pressing Styles</option>';
  for (var pi = 0; pi < pressingList.length; pi++) {
    var pVal = pressingList[pi];
    var selP = pVal === filters.pressing ? "selected" : "";
    html += '        <option value="' + escAttr(pVal) + '" ' + selP + '>' + escHtml(pVal) + '</option>';
  }
  html += '      </select>';
  html += '    </div>';

  html += '    <div class="flex flex-col gap-1">';
  html += '      <span class="text-[9px] text-text-muted uppercase font-bold tracking-wider">Interest</span>';
  html += '      <select id="hire-interest-filter" class="w-full text-xs bg-backdrop border border-border rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-text-muted">';
  html += '        <option value="All" ' + (filters.interest === "All" ? "selected" : "") + '>All</option>';
  html += '        <option value="Interested" ' + (filters.interest === "Interested" ? "selected" : "") + '>Interested (Approachable)</option>';
  html += '        <option value="Eager" ' + (filters.interest === "Eager" ? "selected" : "") + '>Eagerly Interested</option>';
  html += '      </select>';
  html += '    </div>';

  if (hasSquad) {
    html += '    <div class="flex flex-col gap-1">';
    html += '      <span class="text-[9px] text-text-muted uppercase font-bold tracking-wider">Fit Range</span>';
    html += '      <div class="flex items-center gap-1.5">';
    html += '        <input id="hire-fit-min" type="number" min="0" max="100" placeholder="0" value="' + filters.fitMin + '" class="w-full text-xs bg-backdrop border border-border rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-text-muted" ' + (fitDisabled ? 'disabled style="opacity:0.5"' : "") + '>';
    html += '        <span class="text-xs text-text-muted">-</span>';
    html += '        <input id="hire-fit-max" type="number" min="0" max="100" placeholder="100" value="' + filters.fitMax + '" class="w-full text-xs bg-backdrop border border-border rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-text-muted" ' + (fitDisabled ? 'disabled style="opacity:0.5"' : "") + '>';
    html += '      </div>';
    html += '    </div>';
  }

  html += '    <div class="flex flex-col gap-1">';
  html += '      <span class="text-[9px] text-text-muted uppercase font-bold tracking-wider">Sort By</span>';
  html += '      <select id="hire-sort-select" class="w-full text-xs bg-backdrop border border-border rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-text-muted">';
  var sortOptions = [["fit", "Squad Compatibility"], ["name", "Name"], ["age", "Age"], ["ca", "Current Ability"], ["archetype", "Tactical Archetype"]];
  for (var si = 0; si < sortOptions.length; si++) {
    var selSort = sortOptions[si][0] === filters.sortBy ? "selected" : "";
    html += '        <option value="' + sortOptions[si][0] + '" ' + selSort + '>' + sortOptions[si][1] + '</option>';
  }
  html += '      </select>';
  html += '    </div>';

  html += '  </div>';
  if (fitDisabled) {
    html += '  <div class="text-[10px] text-yellow-400 mt-2 flex items-center gap-1"><span class="animate-pulse w-1.5 h-1.5 rounded-full bg-yellow-400"></span> Computing tactical fit compatibility scores for all candidates...</div>';
  }
  html += '</div>';

  html += '<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">';
  
  html += '  <div class="lg:col-span-5 flex flex-col gap-2 pr-1 bg-surface/30 border border-border/40 rounded-lg p-2" style="max-height: calc(100vh - 290px); overflow-y: auto;">';
  if (filtered.length > 0) {
    for (var i = 0; i < filtered.length; i++) {
      var m3 = filtered[i];
      var arch = archetypes[m3.Name];
      var fs = fitScoresReady && fitScores[m3.Name] ? fitScores[m3.Name].overallScore : null;
      var transArch = typeof resolveTransferArchetype === "function" ? resolveTransferArchetype(m3) : "OPPORTUNIST";
      var isActive = selectedMgr && m3.Name === selectedMgr.Name;
      var interest = calculateManagerInterest(m3, squad, boardState);
      var negState = window.FM24State.manager.negotiation;
      var isFailed = negState && negState.status === 'collapsed' && negState.candidateId === m3.Name;
      
      html += '    <div class="manager-row flex items-center justify-between p-3 bg-surface border ' + (isActive ? 'border-border border-l-4 border-l-blue-600 bg-surface-hover' : 'border-border hover:bg-surface-hover') + ' rounded-lg cursor-pointer transition-all duration-150' + (isFailed ? ' opacity-50' : '') + '" data-name="' + escAttr(m3.Name) + '">';
      html += '      <div class="flex flex-col gap-0.5 flex-1 min-w-0">';
      html += '        <div class="text-xs font-bold ' + (isActive ? 'text-white' : 'text-text-secondary') + ' flex items-center gap-1.5">' + escHtml(m3.Name);
      html += '          <span class="interest-badge interest-badge-' + interest.band.toLowerCase() + '">' + interest.label + '</span>';
      html += '        </div>';
      html += '        <div class="text-[10px] text-text-muted flex items-center gap-1.5">';
      html += '          <span>Age: ' + (m3.Age || 0) + '</span>';
      html += '          <span>•</span>';
      html += '          <span>CA: ' + (m3.CA || 0) + '</span>';
      html += '        </div>';
      html += '        <div class="text-[9px] flex items-center gap-1.5 mt-0.5">';
      html += '          ' + renderArchetypeTag("tactical", arch);
      html += '          ' + renderArchetypeTag("transfer", transArch);
        html += '        </div>';
      html += '      </div>';
      
      if (hasSquad) {
        if (fs !== null) {
          var fitClass = fs >= 70 ? "fit-great" : fs >= 50 ? "fit-good" : fs >= 30 ? "fit-ok" : "fit-poor";
          html += '      <span class="fit-badge text-[11px] px-2 py-0.5 ' + fitClass + '">' + fs + '%</span>';
        } else {
          html += '      <span class="text-[10px] text-text-muted">' + (fitScoresReady ? '—' : '…') + '</span>';
        }
      }
      html += '    </div>';
    }
  } else {
    html += '    <div class="text-xs text-text-muted text-center py-8 bg-surface border border-border rounded-lg">No candidates match the selected filters.</div>';
  }
  html += '  </div>';

  if (selectedMgr) {
    var arch = archetypes[selectedMgr.Name];
    var transArch = typeof resolveTransferArchetype === "function" ? resolveTransferArchetype(selectedMgr) : "OPPORTUNIST";
    var fitScore = fitScoresReady && fitScores[selectedMgr.Name] ? fitScores[selectedMgr.Name] : null;
    var interest = calculateManagerInterest(selectedMgr, squad, boardState);

    // Estimated wage calculation
    var baseWageEst = Math.max(100, parseInt(selectedMgr.CA, 10) || 100) * 950;
    var ambEst = selectedMgr.Ambition || selectedMgr.Determination || 10;
    var ambMultEst = 1 + (ambEst / 20);
    var estWage = Math.round(baseWageEst * ambMultEst / 500) * 500;

    var negStateDetail = window.FM24State.manager.negotiation;
    var detailIsFailed = negStateDetail && negStateDetail.status === 'collapsed' && negStateDetail.candidateId === selectedMgr.Name;

    html += '  <div class="lg:col-span-7 flex flex-col bg-surface border border-border rounded-lg sticky top-4 self-start overflow-hidden shadow-lg' + (detailIsFailed ? ' relative' : '') + '" style="height: calc(100vh - 240px);">';

    if (detailIsFailed) {
      html += '    <div class="absolute inset-0 z-20 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm rounded-lg">';
      html += '      <div class="flex flex-col items-center gap-3 p-6 text-center">';
      html += '        <svg class="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
      html += '        <span class="text-sm font-bold text-gray-400">Negotiations Failed</span>';
      html += '        <span class="text-[10px] text-gray-500">Not available this session</span>';
      html += '      </div>';
      html += '    </div>';
    }

    // 1. Pinned Header
    html += '    <div class="p-5 border-b border-border flex items-start justify-between flex-shrink-0 bg-surface rounded-t-lg z-10">';
    html += '      <div>';
    html += '        <h3 class="text-base font-bold text-white leading-tight flex items-center gap-2">' + escHtml(selectedMgr.Name);
    html += '          <span class="interest-badge interest-badge-' + interest.band.toLowerCase() + '">' + interest.label + '</span>';
    html += '        </h3>';
    html += '        <div class="text-xs text-text-muted flex items-center gap-1.5 mt-1">';
    html += '          <span>' + escHtml(selectedMgr["Preferred Job"] || "Manager") + '</span>';
    html += '          <span>•</span>';
    html += '          <span>Age ' + (selectedMgr.Age || 0) + '</span>';
    html += '          <span>•</span>';
    html += '          <span>CA ' + (selectedMgr.CA || 0) + '</span>';
    html += '        </div>';
    html += '        <div class="text-[10px] text-text-muted mt-1">Est. <span class="blur-sm">~£' + (estWage / 1000) + ',000/wk</span></div>';
    if (!hasSquad) {
      html += '        <div class="text-[9px] text-yellow-500/70 mt-1">Interest calculated using estimated club level (avgCA ~110). Upload a squad file for accurate results.</div>';
    }
    html += '      </div>';
    if (hasSquad && fitScore !== null) {
      var fsColor = fitScore.overallScore >= 70 ? "fit-great" : fitScore.overallScore >= 50 ? "fit-good" : fitScore.overallScore >= 30 ? "fit-ok" : "fit-poor";
      html += '      <div class="text-right flex flex-col items-end">';
      html += '        <span class="text-[9px] text-text-muted uppercase font-bold tracking-wider mb-1">Squad Fit</span>';
      html += '        <span class="fit-badge text-xs py-1 px-3 ' + fsColor + '">' + fitScore.overallScore + '/100</span>';
      html += '      </div>';
    }
    html += '    </div>';

    // 2. Scrollable Body
    html += '    <div class="flex-1 overflow-y-auto p-5 pr-3 space-y-5 bg-surface">';
    
    html += '      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
    html += '        <div class="bg-backdrop border border-border/60 rounded-lg p-3.5">';
    html += '          <div class="text-[9px] text-text-muted uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1.5">';
    html += '            <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>';
    html += '            Tactical Alignment';
    html += '          </div>';
    html += '          <div class="mb-2">' + renderArchetypeTag("tactical", arch) + '</div>';
    html += '          <div class="flex flex-col gap-1 text-[11px] text-text-secondary">';
    html += '            <div>Formation: <strong class="text-white">' + escHtml(selectedMgr["Preferred Formation"] || "—") + '</strong></div>';
    html += '            <div>Mentality: <strong class="text-white">' + escHtml(selectedMgr["Playing Mentality"] || "—") + '</strong></div>';
    html += '            <div>Pressing: <strong class="text-white">' + escHtml(selectedMgr["Pressing Style"] || "—") + '</strong></div>';
    html += '          </div>';
    html += '        </div>';

    html += '        <div class="bg-backdrop border border-border/60 rounded-lg p-3.5">';
    html += '          <div class="text-[9px] text-text-muted uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1.5">';
    html += '            <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>';
    html += '            Transfer Archetype';
    html += '          </div>';
    html += '          <div class="mb-2">' + renderArchetypeTag("transfer", transArch) + '</div>';
    html += '          <div class="flex flex-col gap-1 text-[11px] text-text-secondary">';
    html += '            <div>Personality: <strong class="text-white">' + escHtml(selectedMgr["Personality"] || "—") + '</strong></div>';
    html += '            <div>Marking Style: <strong class="text-white">' + escHtml(selectedMgr["Marking Style"] || "—") + '</strong></div>';
    html += '          </div>';
    html += '        </div>';
    html += '      </div>';

    html += '      <div class="border-t border-border pt-4">';
    html += '        <h4 class="text-[10px] font-bold text-white uppercase tracking-wider mb-3.5">DoF Critical Attributes</h4>';
    html += '        <div class="flex flex-col gap-3.5">';
    html += renderDofAttributeRow("Working with Youth", getDofAttr(selectedMgr, "Youth"));
    html += renderDofAttributeRow("Judging Player Potential", getDofAttr(selectedMgr, "Judge P"));
    html += renderDofAttributeRow("Judging Player Ability", getDofAttr(selectedMgr, "Judge A"));
    html += renderDofAttributeRow("Tactical Knowledge", getDofAttr(selectedMgr, "Tac Knw"));
    html += renderDofAttributeRow("Professionalism", getDofAttr(selectedMgr, "Prof"));
    html += '        </div>';
    html += '      </div>';

    if (hasSquad && fitScore !== null) {
      html += '      <div class="border-t border-border pt-4">';
      html += '        <h4 class="text-[10px] font-bold text-white uppercase tracking-wider mb-3.5">Squad Compatibility Analysis</h4>';
      html += '        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5">';
      html += renderCompatibilityPillarRow("Tactical Coverage", fitScore.pillars.tacticalCoverage);
      html += renderCompatibilityPillarRow("Style Capacity", fitScore.pillars.styleCapacity);
      html += renderCompatibilityPillarRow("Locker Room Matrix", fitScore.pillars.lockerRoom);
      html += renderCompatibilityPillarRow("Timeline & Development", fitScore.pillars.development);
      if (fitScore.pillars.gapSeverity) {
        html += renderCompatibilityPillarRow("Gap Severity", fitScore.pillars.gapSeverity);
      }
      if (fitScore.pillars.baseline) {
        html += renderCompatibilityPillarRow("Baseline Competency", fitScore.pillars.baseline);
      }
      html += '        </div>';
      
      if (fitScore.insights && fitScore.insights.length > 0) {
        html += '        <div class="mt-4 bg-backdrop border border-border/80 rounded-lg p-3">';
        html += '          <div class="text-[9px] text-text-muted uppercase font-bold tracking-wider mb-2">Director of Football Assessment</div>';
        html += '          <div class="flex flex-col gap-1.5">';
        for (var ii = 0; ii < fitScore.insights.length; ii++) {
          html += '            <div class="text-xs text-text-secondary flex items-start gap-2">';
          html += '              <span class="text-text-muted mt-0.5">•</span>';
          html += '              <span>' + escHtml(fitScore.insights[ii]) + '</span>';
          html += '            </div>';
        }
        html += '          </div>';
        html += '        </div>';
      }
      html += '      </div>';
    }

    html += '    </div>'; // End of scrollable body

    // 3. Pinned Footer
    html += '    <div class="p-5 border-t border-border bg-surface rounded-b-lg flex-shrink-0 z-10 flex flex-col gap-1.5">';
    if (interest.band === 'LOCKED') {
      html += '      <button id="profile-hire-btn" disabled class="w-full py-2.5 bg-gray-800 text-gray-500 text-xs font-bold uppercase tracking-wider rounded cursor-not-allowed shadow-md flex items-center justify-center gap-2" title="Requires squad avgCA ≥ ' + interest.minRequiredAvgCA + ' | Your club: ~' + interest.avgCA + '">';
      html += '        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>';
      html += '        Not Interested';
      html += '      </button>';
      html += '      <div class="text-[9px] text-text-muted text-center">Requires squad avgCA ≥ ' + interest.minRequiredAvgCA + '  |  Your club: ~' + interest.avgCA + '</div>';
    } else {
      var btnColor = interest.band === 'RELUCTANT' ? 'bg-orange-700 hover:bg-orange-600' : interest.band === 'OPEN' ? 'bg-yellow-700 hover:bg-yellow-600' : 'bg-green-700 hover:bg-green-600';
      html += '      <button id="profile-hire-btn" class="w-full py-2.5 ' + btnColor + ' text-white text-xs font-bold uppercase tracking-wider rounded transition-colors duration-150 shadow-md flex items-center justify-center gap-2">';
      html += '        Enter Negotiations';
      html += '      </button>';
      if (interest.band === 'RELUCTANT') {
        html += '      <div class="text-[9px] text-orange-400/70 text-center">Will walk away unless offer impresses</div>';
      }
    }
    html += '    </div>';
    
    html += '  </div>'; // End container
  } else {
    html += '  <div class="lg:col-span-7 flex flex-col items-center justify-center p-8 text-center text-text-muted bg-surface border border-border rounded-lg sticky top-4 self-start" style="height: calc(100vh - 240px);">';
    html += '    <svg class="w-8 h-8 mb-2 opacity-40 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
    html += '    <p class="text-xs font-semibold">No Manager Candidate Selected</p>';
    html += '    <p class="text-[10px] text-text-muted mt-1">Select a candidate from the list or adjust filters.</p>';
    html += '  </div>';
  }
  html += '</div>';

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
  var manager = state.hired;
  if (!manager) return "<p class='text-text-muted text-xs'>No manager hired yet.</p>";

  var archetype = deriveArchetype(manager);
  var transArch = typeof resolveTransferArchetype === "function" ? resolveTransferArchetype(manager) : "OPPORTUNIST";
  var nat = manager.Nationality || manager.Nation || manager.Nat || "—";
  var coachStyle = manager["Coaching Style"] || manager["CoachingStyle"] || "—";

  // Helper: render a colored attribute bar
  function renderAttrBar(label, val, maxVal) {
    maxVal = maxVal || 20;
    var pct = Math.min(100, Math.round((val / maxVal) * 100));
    var barColor = val >= 15 ? "bg-green-500" : val >= 11 ? "bg-yellow-500" : val >= 6 ? "bg-orange-500" : "bg-red-500";
    var textColor = val >= 15 ? "text-green-400" : val >= 11 ? "text-yellow-400" : val >= 6 ? "text-orange-400" : "text-red-400";
    return '<div class="flex flex-col gap-0.5">' +
      '<div class="flex justify-between text-[10px]">' +
        '<span class="text-text-secondary">' + escAttr(label) + '</span>' +
        '<span class="' + textColor + ' font-bold">' + val + '/' + maxVal + '</span>' +
      '</div>' +
      '<div class="w-full bg-backdrop border border-border/50 rounded h-1.5 overflow-hidden">' +
        '<div class="' + barColor + ' h-full rounded-full" style="width:' + pct + '%"></div>' +
      '</div>' +
    '</div>';
  }

  html += '<div class="space-y-5 animate-fade-in">';

  // ═══ BIOGRAPHY & IDENTITY CARD ═══
  html += '  <div class="bg-gradient-to-r from-surface to-surface/80 border border-border/80 rounded-xl p-5 shadow-lg relative overflow-hidden">';
  html += '    <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>';
  html += '    <div class="flex items-center justify-between">';
  html += '      <div class="flex items-center gap-4">';
  html += '        <div class="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-lg font-extrabold text-blue-400">' + (manager.Name ? manager.Name.charAt(0).toUpperCase() : '?') + '</div>';
  html += '        <div>';
  html += '          <h3 class="text-base font-extrabold text-white tracking-tight">' + escAttr(manager.Name) + '</h3>';
  html += '          <div class="flex items-center gap-2 text-[11px] text-text-muted mt-0.5">';
  html += '            <span>' + (manager.Age || '—') + ' yrs</span>';
  html += '            <span class="w-1 h-1 rounded-full bg-border"></span>';
  html += '            <span>' + escAttr(nat) + '</span>';
  html += '            <span class="w-1 h-1 rounded-full bg-border"></span>';
  html += '            <span>' + escAttr(manager.Personality || '—') + '</span>';
  html += '            <span class="w-1 h-1 rounded-full bg-border"></span>';
  html += '            <span>Media: ' + escAttr(manager["Media Handling"] || '—') + '</span>';
  html += '          </div>';
  html += '        </div>';
  html += '      </div>';
  html += '      <div class="flex items-center gap-2">';
  html += '        <span class="text-[9px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">HIRED</span>';
  html += '        ' + renderArchetypeTag("tactical", archetype);
  html += '        ' + renderArchetypeTag("transfer", transArch);
  html += '      </div>';
  html += '    </div>';
  html += '    <div class="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">';
  var stats = [
    { label: "Youth Dev", val: getDofAttr(manager, "Youth") },
    { label: "Judge Pot", val: getDofAttr(manager, "Judge P") },
    { label: "Judge Abil", val: getDofAttr(manager, "Judge A") },
    { label: "Tac Knw", val: getDofAttr(manager, "Tac Knw") },
    { label: "Prof Rating", val: getDofAttr(manager, "Prof") }
  ];
  stats.forEach(function (stat) {
    var pct = Math.round((stat.val / 20) * 100);
    var color = stat.val >= 15 ? "text-green-400" : stat.val >= 11 ? "text-yellow-400" : "text-red-400";
    html += '      <div class="bg-backdrop/40 border border-border/40 rounded-lg p-2 flex flex-col gap-1">';
    html += '        <span class="text-text-muted text-[9px] uppercase font-bold tracking-wider">' + stat.label + '</span>';
    html += '        <div class="flex items-baseline justify-between">';
    html += '          <span class="text-sm font-extrabold ' + color + '">' + stat.val + '</span>';
    html += '          <span class="text-[8px] text-text-muted">/20</span>';
    html += '        </div>';
    html += '        <div class="w-full bg-border/30 h-1 rounded-full overflow-hidden">';
    html += '          <div class="bg-blue-500 h-full rounded-full" style="width: ' + pct + '%"></div>';
    html += '        </div>';
    html += '      </div>';
  });
  html += '    </div>';
  html += '  </div>';

  // ═══ 3-COLUMN GRID: MAIN DOSSIER (2/3) + OPS COCKPIT (1/3) ═══
  html += '  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">';

  // ─── LEFT & MIDDLE: MAIN DOSSIER (lg:col-span-2) ───
  html += '    <div class="lg:col-span-2 space-y-5">';

  // Tactical DNA Card
  html += '      <div class="widget-card cursor-zoom-in hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/5 transition-all bg-surface border border-border/80 rounded-xl p-5 shadow-lg" id="manager-widget-tactical-dna">';
  html += '        <h4 class="text-[10px] font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">';
  html += '          <span class="w-2 h-2 rounded-full bg-blue-500"></span> Tactical DNA';
  html += '        </h4>';
  // Formations grid
  html += '        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">';
  var formations = [
    { label: "Preferred", val: manager["Preferred Formation"] },
    { label: "Second", val: manager["Second Formation"] || manager["Secondary Formation"] },
    { label: "Attacking", val: manager["Attacking Formation"] },
    { label: "Defensive", val: manager["Defensive Formation"] }
  ];
  formations.forEach(function (f) {
    html += '          <div class="bg-backdrop/40 border border-border/40 rounded-lg p-2.5 text-center">';
    html += '            <span class="text-[8px] text-text-muted uppercase font-bold tracking-wider block">' + f.label + '</span>';
    html += '            <span class="text-xs font-extrabold text-white block mt-0.5">' + escAttr(f.val || '—') + '</span>';
    html += '          </div>';
  });
  html += '        </div>';
  // Playstyles
  html += '        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">';
  html += '          <div><span class="text-text-muted block text-[9px] uppercase font-bold tracking-wider">Mentality</span><span class="text-white font-extrabold">' + escAttr(manager["Playing Mentality"] || '—') + '</span></div>';
  html += '          <div><span class="text-text-muted block text-[9px] uppercase font-bold tracking-wider">Pressing</span><span class="text-white font-extrabold">' + escAttr(manager["Pressing Style"] || '—') + '</span></div>';
  html += '          <div><span class="text-text-muted block text-[9px] uppercase font-bold tracking-wider">Marking</span><span class="text-white font-extrabold">' + escAttr(manager["Marking Style"] || '—') + '</span></div>';
  html += '          <div><span class="text-text-muted block text-[9px] uppercase font-bold tracking-wider">Coaching</span><span class="text-white font-extrabold">' + escAttr(coachStyle) + '</span></div>';
  html += '        </div>';
  html += '      </div>';

  // Attributes Dashboard Card
  html += '      <div class="widget-card cursor-zoom-in hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/5 transition-all bg-surface border border-border/80 rounded-xl p-5 shadow-lg" id="manager-widget-attributes">';
  html += '        <h4 class="text-[10px] font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">';
  html += '          <span class="w-2 h-2 rounded-full bg-green-500"></span> Attributes Dashboard';
  html += '        </h4>';
  html += '        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">';
  // Coaching & Tactics
  html += '          <div>';
  html += '            <span class="text-[9px] text-text-muted uppercase font-bold tracking-wider block mb-1.5 border-b border-border/20 pb-1">Coaching &amp; Tactics</span>';
  html += '            <div class="space-y-1.5">';
  html +=                renderAttrBar("Tactical Knowledge", getDofAttr(manager, "Tac Knw"));
  html +=                renderAttrBar("Coaching Style", manager[manager["Coaching Style"] || "CoachingStyle"] ? parseInt(manager[manager["Coaching Style"]], 10) || 0 : 0);
  html += '            </div>';
  html += '          </div>';
  // Recruitment
  html += '          <div>';
  html += '            <span class="text-[9px] text-text-muted uppercase font-bold tracking-wider block mb-1.5 border-b border-border/20 pb-1">Recruitment</span>';
  html += '            <div class="space-y-1.5">';
  html +=                renderAttrBar("Judging Potential", getDofAttr(manager, "Judge P"));
  html +=                renderAttrBar("Judging Ability", getDofAttr(manager, "Judge A"));
  html += '            </div>';
  html += '          </div>';
  // Mental DNA
  html += '          <div>';
  html += '            <span class="text-[9px] text-text-muted uppercase font-bold tracking-wider block mb-1.5 border-b border-border/20 pb-1">Mental DNA</span>';
  html += '            <div class="space-y-1.5">';
  html +=                renderAttrBar("Professionalism", getDofAttr(manager, "Prof"));
  html +=                renderAttrBar("Working with Youth", getDofAttr(manager, "Youth"));
  html += '            </div>';
  html += '          </div>';
  // Transfer DNA
  html += '          <div>';
  html += '            <span class="text-[9px] text-text-muted uppercase font-bold tracking-wider block mb-1.5 border-b border-border/20 pb-1">Transfer DNA</span>';
  html += '            <div class="space-y-1.5">';
  html +=                renderAttrBar("Transfer Archetype", transArch === "OPPORTUNIST" ? 18 : transArch === "BALANCED" ? 12 : 8, 20);
  html += '            </div>';
  html += '          </div>';
  html += '        </div>';
  html += '      </div>';

  // Squad Alignment / Compatibility Card
  var squad = window.FM24State.squad;
  var tactic = window.FM24State.tactic;
  var hasSquad = squad && squad.length > 0;
  html += '      <div class="widget-card cursor-zoom-in hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/5 transition-all bg-surface border border-border/80 rounded-xl p-5 shadow-lg" id="manager-widget-squad-alignment">';
  html += '        <h4 class="text-[10px] font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">';
  html += '          <span class="w-2 h-2 rounded-full bg-amber-500"></span> Squad Alignment Report';
  html += '        </h4>';
  if (hasSquad && tactic && tactic.isComplete) {
    var dnaScore = state.lastCoherenceScore;
    var dnaResult = state.lastCoherenceResult;
    if (dnaScore === null || dnaScore === undefined) {
      if (typeof computeSquadDNA === 'function') {
        var sqDna = computeSquadDNA(squad);
        if (sqDna) {
          var coh = typeof computeCoherenceScore === 'function' ? computeCoherenceScore(sqDna, manager, tactic) : null;
          dnaScore = coh ? coh.score : null;
          dnaResult = coh;
        }
      }
    }
    if (dnaScore !== null) {
      var dnaColor = dnaScore >= 80 ? "text-green-400" : dnaScore >= 60 ? "text-yellow-400" : "text-red-400";
      var dnaBarColor = dnaScore >= 80 ? "bg-green-500" : dnaScore >= 60 ? "bg-yellow-500" : "bg-red-500";
      html += '        <div class="flex items-center gap-3 mb-3">';
      html += '          <div class="flex-1 bg-backdrop rounded-full h-2.5 overflow-hidden">';
      html += '            <div class="' + dnaBarColor + ' h-full rounded-full transition-all" style="width:' + dnaScore + '%"></div>';
      html += '          </div>';
      html += '          <span class="text-sm font-extrabold ' + dnaColor + '">' + dnaScore + '%</span>';
      html += '        </div>';
      if (dnaResult && dnaResult.warnings && dnaResult.warnings.length > 0) {
        html += '        <div class="space-y-1">';
        dnaResult.warnings.forEach(function (warn) {
          html += '          <div class="text-[10px] text-yellow-400/80 flex items-start gap-1.5">';
          html += '            <span>⚠</span><span>' + escAttr(warn) + '</span>';
          html += '          </div>';
        });
        html += '        </div>';
      }
      var fitScore = state.lastSquadFitScore;
      if (fitScore !== null && fitScore !== undefined) {
        var fColor = fitScore >= 70 ? "text-green-400" : fitScore >= 50 ? "text-yellow-400" : "text-red-400";
        html += '        <div class="mt-2 text-[10px] text-text-muted">Squad Avg Fit: <span class="font-bold ' + fColor + '">' + fitScore + '/100</span></div>';
      }
    } else {
      html += '        <div class="text-[10px] text-text-muted">Complete tactic builder to view squad alignment.</div>';
    }
  } else if (hasSquad) {
    html += '        <div class="text-[10px] text-text-muted">Build a tactic to view squad alignment.</div>';
  } else {
    html += '        <div class="text-[10px] text-text-muted">Load squad data to view alignment report.</div>';
  }
  html += '      </div>';

  // Transfer History (Full Managers only)
  if (state.mode === "full_manager") {
    html += '      <div class="widget-card cursor-zoom-in hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/5 transition-all bg-surface border border-border/80 rounded-xl p-5 shadow-lg" id="manager-widget-transfer-history">';
    html += '        <h4 class="text-[10px] font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">';
    html += '          <span class="w-2 h-2 rounded-full bg-purple-500"></span> Transfer History &amp; Timeline';
    html += '        </h4>';
    var history = state.windowHistory || [];
    if (history.length > 0) {
      html +=          window.renderTransferHistoryTable(history, 'mp-');
    } else {
      html += '        <div class="text-[10px] text-text-muted">No completed transfer windows yet. Run a Full Manager transfer window simulation to populate history.</div>';
    }
    html += '      </div>';
  }

  html += '    </div>'; // ─── END MAIN DOSSIER (lg:col-span-2) ───

  // ─── RIGHT COLUMN: OPERATIONS COCKPIT (lg:col-span-1) ───
  html += '    <div class="space-y-5">';

  // Operational Model Selection
  html += '      <div class="bg-surface border border-border/80 rounded-xl p-5 shadow-lg">';
  html += '        <h4 class="text-[10px] font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">';
  html += '          <span class="w-2 h-2 rounded-full bg-indigo-500"></span> Operational Model';
  html += '        </h4>';
  html += '        <p class="text-[10px] text-text-muted mb-3">Select how the manager collaborates with the Director of Football.</p>';
  html += '        <div class="space-y-3">';

  var hcActive = state.mode === "head_coach";
  html += '          <div class="role-option-card border rounded-lg p-3.5 cursor-pointer transition-all ' + (hcActive ? 'border-blue-500 bg-blue-500/5' : 'border-border/60 hover:bg-surface-hover') + '" data-manager-mode="head_coach">';
  html += '            <div class="flex items-center justify-between mb-1.5">';
  html += '              <span class="text-xs font-bold text-white">Head Coach</span>';
  html += '              <input type="radio" name="role-mode" ' + (hcActive ? 'checked' : '') + ' class="accent-blue-500">';
  html += '            </div>';
  html += '            <p class="text-[9px] text-text-secondary leading-relaxed">Focuses strictly on match tactics, squad fit, and team selections. The DoF retains full control of the transfer window.</p>';
  html += '          </div>';

  var fmActive = state.mode === "full_manager";
  html += '          <div class="role-option-card border rounded-lg p-3.5 cursor-pointer transition-all ' + (fmActive ? 'border-blue-500 bg-blue-500/5' : 'border-border/60 hover:bg-surface-hover') + '" data-manager-mode="full_manager">';
  html += '            <div class="flex items-center justify-between mb-1.5">';
  html += '              <span class="text-xs font-bold text-white">Full Manager</span>';
  html += '              <input type="radio" name="role-mode" ' + (fmActive ? 'checked' : '') + ' class="accent-blue-500">';
  html += '            </div>';
  html += '            <p class="text-[9px] text-text-secondary leading-relaxed">Manager dictates transfer decisions based on their personality archetype. Simulates a complete transfer window.</p>';
  html += '          </div>';

  html += '        </div>';

  if (hcActive) {
    var assistedActive = state.transferAuthorityMode === "assisted";
    html += '        <div id="transfer-authority-container" class="mt-3 border border-border/40 rounded-lg p-3 bg-backdrop/10">';
    html += '          <div class="flex items-center justify-between">';
    html += '            <div>';
    html += '              <span class="text-xs font-bold text-white">Transfer Authority</span>';
    html += '              <p class="text-[9px] text-text-muted">In assisted mode, the DoF proposes squad actions and you approve or block each decision.</p>';
    html += '            </div>';
    html += '            <label class="relative inline-flex items-center cursor-pointer">';
    html += '              <input type="checkbox" id="transfer-authority-toggle" class="sr-only peer" ' + (assistedActive ? 'checked' : '') + '>';
    html += '              <div class="w-9 h-5 bg-border/60 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[\'\'] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>';
    html += '              <span class="ml-2 text-[9px] font-bold uppercase ' + (assistedActive ? 'text-blue-400' : 'text-text-muted') + '">' + (assistedActive ? 'Assisted' : 'Manual') + '</span>';
    html += '            </label>';
    html += '          </div>';
    html += '        </div>';
  }
  html += '      </div>';

  // Note: Financial parameters, data file uploads, and execute button removed from profile.
  // These are now exclusive to the Transfers tab for cleaner separation of concerns.

  html += '    </div>'; // ─── END OPS COCKPIT (lg:col-span-1) ───

  html += '  </div>'; // ─── END 3-COLUMN GRID ───

  html += '</div>';

  return html;
}

function renderInterventionPanel(state) {
  var result = state.partAResult;
  if (!result || !result.pendingDecisions) return "<p class='text-text-muted text-xs'>No squad analysis results available.</p>";

  var html = "";
  html += '<div class="space-y-4 animate-fade-in max-w-5xl">';

  // Header
  var board = window.FM24State.board || {};
  html += '<div class="flex items-center justify-between flex-wrap gap-2">';
  html += '  <div class="flex items-center gap-2">';
  html += '    <h3 class="text-sm font-bold text-white uppercase tracking-wider">Director of Football — Executive Squad Review</h3>';
  html += '    <span class="text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ' + (board.stage === 'NORMAL' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : board.stage === 'SCRUTINY' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : board.stage === 'PRESSURE' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20') + '">' + (board.stage || 'NORMAL') + '</span>';
  html += '  </div>';
  html += '  <span class="text-[10px] text-text-muted bg-backdrop/40 px-2.5 py-1 rounded border border-border/40">' + result.pendingDecisions.length + ' Pending Decisions</span>';
  html += '</div>';

  html += '<div class="text-xs text-text-muted leading-relaxed bg-backdrop/20 border border-border/40 rounded-lg p-3">';
  html += '  The Head Coach has completed the initial squad requirements review. As Director of Football, review each proposed action below. ';
  html += '  You can <strong class="text-white">Approve</strong>, <strong class="text-yellow-400">Block</strong>, ';
  html += '  or choose alternative options per decision. Once you confirm, you (the DoF) will execute the incoming transfer phase.';
  html += '</div>';

  // Outgoing decisions section
  html += '<div class="bg-surface border border-border/80 rounded-xl p-4 shadow-lg">';
  html += '  <h4 class="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">';
  html += '    <span class="w-2 h-2 rounded-full bg-amber-400"></span> Squad Actions';
  html += '  </h4>';

  var outgoingDecisions = result.pendingDecisions.filter(function (d) {
    return d.type === 'SALE_PROPOSED' || d.type === 'LOAN_PROPOSED' || d.type === 'RELEASE_PROPOSED';
  });

  // 5.4 Loan recall decisions
  var recallDecisions = result.pendingDecisions.filter(function (d) {
    return d.type === 'RECALL_OPTION';
  });

  if (outgoingDecisions.length > 0) {
    html += '  <div class="border border-border/40 rounded-lg overflow-hidden">';
    html += '    <table class="w-full text-xs text-left">';
    html += '      <thead>';
    html += '        <tr class="bg-backdrop/60 border-b border-border/40 text-[10px] font-bold uppercase tracking-wider text-text-muted">';
    html += '          <th class="py-2 px-3">Player</th>';
    html += '          <th class="py-2 px-3">Age</th>';
    html += '          <th class="py-2 px-3">Action</th>';
    html += '          <th class="py-2 px-3">Reason</th>';
    html += '          <th class="py-2 px-3 text-right">Financial Impact</th>';
    html += '          <th class="py-2 px-3 text-center">Decision</th>';
    html += '        </tr>';
    html += '      </thead>';
    html += '      <tbody class="divide-y divide-border/20">';

    outgoingDecisions.forEach(function (d, idx) {
      var actionLabel = d.type === 'SALE_PROPOSED' ? 'Sell' : d.type === 'LOAN_PROPOSED' ? 'Loan' : 'Release';
      var actionColor = d.type === 'SALE_PROPOSED' ? 'text-green-400' : d.type === 'LOAN_PROPOSED' ? 'text-blue-400' : 'text-red-400';
      var finImpact = d.type === 'RELEASE_PROPOSED' ? '-' + formatCurrency(d.financials.wage) + '/wk' :
                       d.type === 'LOAN_PROPOSED' ? '-' + formatCurrency(d.financials.wage) + '/wk' :
                       '+' + formatCurrency(d.financials.fee);
      var globalIdx = result.pendingDecisions.indexOf(d);
      var decisionId = 'dof-decision-' + globalIdx;

      var optApprove = d.dofDecision === 'APPROVE' ? ' selected' : '';
      var optBlock = d.dofDecision === 'BLOCK' ? ' selected' : '';
      var optCounter = d.dofDecision === 'COUNTER' ? ' selected' : '';

      html += '        <tr class="hover:bg-surface-hover/30 transition-colors" data-decision-idx="' + globalIdx + '">';
      html += '          <td class="py-2 px-3 font-semibold text-white">' + escHtml(d.player.Name || d.player.name || 'Unknown') + '</td>';
      html += '          <td class="py-2 px-3 text-text-muted">' + (d.player.Age || d.player.age || 0) + '</td>';
      html += '          <td class="py-2 px-3"><span class="font-bold ' + actionColor + '">' + actionLabel + '</span></td>';
      html += '          <td class="py-2 px-3 text-text-secondary text-[10px]">' + escHtml(d.reason) + '</td>';
      html += '          <td class="py-2 px-3 text-right font-mono text-text-secondary">' + finImpact + '</td>';
      html += '          <td class="py-2 px-3 text-center">';
      html += '            <select data-decision-id="' + decisionId + '" class="dof-decision-select text-[10px] bg-backdrop border border-border rounded px-1.5 py-1 text-white focus:outline-none focus:border-blue-500">';
      html += '              <option value="APPROVE"' + optApprove + '>APPROVE</option>';
      html += '              <option value="BLOCK"' + optBlock + '>BLOCK</option>';
      if (d.type === 'SALE_PROPOSED') {
        html += '              <option value="COUNTER"' + optCounter + '>COUNTER</option>';
      }
      html += '            </select>';
      html += '          </td>';
      html += '        </tr>';
    });

    html += '      </tbody>';
    html += '    </table>';
    html += '  </div>';
  } else {
    html += '  <p class="text-xs text-text-muted">No outgoing actions proposed.</p>';
  }

  html += '</div>';

  // 5.4 Loan recall decisions section
  if (recallDecisions.length > 0) {
    html += '<div class="bg-surface border border-cyan-500/30 rounded-xl p-4 shadow-lg">';
    html += '  <h4 class="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">';
    html += '    <span class="w-2 h-2 rounded-full bg-cyan-400"></span> Loan Recall Options';
    html += '  </h4>';
    html += '  <div class="space-y-2">';
    recallDecisions.forEach(function (d, idx) {
      var globalIdx = result.pendingDecisions.indexOf(d);
      var decisionId = 'dof-decision-' + globalIdx;
      var optPending = (!d.dofDecision || d.dofDecision === '') ? ' selected' : '';
      var optRecall = d.dofDecision === 'RECALL' ? ' selected' : '';
      var optBlock = d.dofDecision === 'BLOCK' ? ' selected' : '';

      html += '    <div class="bg-backdrop/30 border border-border/40 rounded-lg p-3 flex items-center justify-between">';
      html += '      <div>';
      html += '        <span class="text-xs text-white font-semibold">' + escHtml(d.player.Name || 'Unknown') + '</span>';
      html += '        <span class="text-[10px] text-text-muted block">' + escHtml(d.reason) + '</span>';
      html += '      </div>';
      html += '      <select data-decision-id="' + decisionId + '" class="dof-decision-select text-[10px] bg-backdrop border border-border rounded px-1.5 py-1 text-white focus:outline-none focus:border-cyan-500">';
      html += '        <option value=""' + optPending + '>— PENDING —</option>';
      html += '        <option value="RECALL"' + optRecall + '>RECALL</option>';
      html += '        <option value="BLOCK"' + optBlock + '>BLOCK — Keep on Loan</option>';
      html += '      </select>';
      html += '    </div>';
    });
    html += '  </div>';
    html += '</div>';
  }

  // Target proposals section
  var targetDecisions = result.pendingDecisions.filter(function (d) {
    return d.type === 'TARGET_PROPOSED' || d.type === 'BUDGET_OVERRUN';
  });

  if (targetDecisions.length > 0) {
    html += '<div class="bg-surface border border-border/80 rounded-xl p-4 shadow-lg">';
    html += '  <h4 class="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">';
    html += '    <span class="w-2 h-2 rounded-full bg-green-400"></span> Recruitment Proposals';
    html += '  </h4>';
    html += '  <div class="border border-border/40 rounded-lg overflow-hidden">';
    html += '    <table class="w-full text-xs text-left">';
    html += '      <thead>';
    html += '        <tr class="bg-backdrop/60 border-b border-border/40 text-[10px] font-bold uppercase tracking-wider text-text-muted">';
    html += '          <th class="py-2 px-3">Target</th>';
    html += '          <th class="py-2 px-3">Age</th>';
    html += '          <th class="py-2 px-3">Type</th>';
    html += '          <th class="py-2 px-3">Reason</th>';
    html += '          <th class="py-2 px-3 text-right">Est. Fee</th>';
    html += '          <th class="py-2 px-3 text-center">Decision</th>';
    html += '        </tr>';
    html += '      </thead>';
    html += '      <tbody class="divide-y divide-border/20">';

    targetDecisions.forEach(function (d, idx) {
      var globalIdx = result.pendingDecisions.indexOf(d);
      var decisionId = 'dof-decision-' + globalIdx;
      var typeLabel = d.type === 'BUDGET_OVERRUN' ? 'Budget Overrun' : 'Signing';
      var typeColor = d.type === 'BUDGET_OVERRUN' ? 'text-orange-400' : 'text-green-400';

      var optApprove = d.dofDecision === 'APPROVE' ? ' selected' : '';
      var optBlock = d.dofDecision === 'BLOCK' ? ' selected' : '';

      html += '        <tr class="hover:bg-surface-hover/30 transition-colors">';
      html += '          <td class="py-2 px-3 font-semibold text-white">' + escHtml(d.player.Name || d.player.name || 'Unknown') + '</td>';
      html += '          <td class="py-2 px-3 text-text-muted">' + (d.player.Age || 0) + '</td>';
      html += '          <td class="py-2 px-3"><span class="font-bold ' + typeColor + '">' + typeLabel + '</span></td>';
      html += '          <td class="py-2 px-3 text-text-secondary text-[10px]">' + escHtml(d.reason) + '</td>';
      html += '          <td class="py-2 px-3 text-right font-mono text-red-400">' + formatCurrency(d.financials.fee) + '</td>';
      html += '          <td class="py-2 px-3 text-center">';
      html += '            <select data-decision-id="' + decisionId + '" class="dof-decision-select text-[10px] bg-backdrop border border-border rounded px-1.5 py-1 text-white focus:outline-none focus:border-blue-500">';
      html += '              <option value="APPROVE"' + optApprove + '>APPROVE</option>';
      html += '              <option value="BLOCK"' + optBlock + '>BLOCK</option>';
      html += '            </select>';
      html += '          </td>';
      html += '        </tr>';
    });

    html += '      </tbody>';
    html += '    </table>';
    html += '  </div>';
    html += '</div>';
  }

  // Incoming bids section
  var incomingBids = state.incomingBids || [];
  if (incomingBids.length > 0) {
    html += '<div class="bg-surface border border-border/80 rounded-xl p-4 shadow-lg">';
    html += '  <h4 class="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">';
    html += '    <span class="w-2 h-2 rounded-full bg-purple-400"></span> Incoming Bids from Rival Clubs';
    html += '  </h4>';
    html += '  <div class="border border-border/40 rounded-lg overflow-hidden">';
    html += '    <table class="w-full text-xs text-left">';
    html += '      <thead>';
    html += '        <tr class="bg-backdrop/60 border-b border-border/40 text-[10px] font-bold uppercase tracking-wider text-text-muted">';
    html += '          <th class="py-2 px-3">Player</th>';
    html += '          <th class="py-2 px-3">Rival Club</th>';
    html += '          <th class="py-2 px-3 text-right">Bid Amount</th>';
    html += '          <th class="py-2 px-3">Manager Advice</th>';
    html += '          <th class="py-2 px-3 text-center">Decision</th>';
    html += '        </tr>';
    html += '      </thead>';
    html += '      <tbody class="divide-y divide-border/20">';

    incomingBids.forEach(function (bid, idx) {
      var bidId = 'dof-bid-' + idx;
      var optReject = bid.dofDecision === 'REJECT' ? ' selected' : '';
      var optApprove = bid.dofDecision === 'APPROVE' ? ' selected' : '';
      var optNegotiate = bid.dofDecision === 'NEGOTIATE' ? ' selected' : '';
      var optPass = bid.dofDecision === 'PASS_TO_MANAGER' ? ' selected' : '';

      var mgrRec = null;
      if (typeof getManagerRecommendation === 'function' && state.hired) {
        mgrRec = getManagerRecommendation(bid.player, bid.bidAmount, state.hired, window.FM24State.market || []);
      }

      var adviceText = 'No advice';
      var adviceClass = 'text-text-muted';
      var adviceReason = '';
      if (mgrRec) {
        var isSell = mgrRec.decision === 'SELL';
        adviceText = isSell ? 'SELL (ACCEPT)' : 'KEEP (REJECT)';
        adviceClass = isSell ? 'text-green-400 font-bold' : 'text-red-400 font-bold';
        adviceReason = mgrRec.reasons && mgrRec.reasons.length > 0 ? mgrRec.reasons[0] : '';
      }

      html += '        <tr class="hover:bg-surface-hover/30 transition-colors">';
      html += '          <td class="py-2 px-3">';
      html += '            <div class="font-semibold text-white">' + escHtml(bid.player.Name || bid.player.name || 'Unknown') + '</div>';
      html += '            <div class="text-[10px] text-text-muted mt-0.5">' + escHtml(bid.player.Position || 'N/A') + '</div>';
      html += '          </td>';
      html += '          <td class="py-2 px-3 text-text-secondary">' + escHtml(bid.rivalClub || 'Unknown') + '</td>';
      html += '          <td class="py-2 px-3 text-right font-mono text-green-400">' + formatCurrency(bid.bidAmount || 0) + '</td>';
      html += '          <td class="py-2 px-3">';
      html += '            <div class="' + adviceClass + '">' + adviceText + '</div>';
      if (adviceReason) {
        html += '            <div class="text-[10px] text-text-secondary truncate max-w-[200px]" title="' + escHtml(adviceReason) + '">' + escHtml(adviceReason) + '</div>';
      }
      html += '          </td>';
      html += '          <td class="py-2 px-3 text-center">';
      html += '            <select data-bid-id="' + bidId + '" class="dof-bid-select text-[10px] bg-backdrop border border-border rounded px-1.5 py-1 text-white focus:outline-none focus:border-blue-500">';
      html += '              <option value="REJECT"' + optReject + '>REJECT</option>';
      html += '              <option value="APPROVE"' + optApprove + '>APPROVE</option>';
      html += '              <option value="NEGOTIATE"' + optNegotiate + '>NEGOTIATE</option>';
      html += '              <option value="PASS_TO_MANAGER"' + optPass + '>PASS TO MANAGER</option>';
      html += '            </select>';
      html += '          </td>';
      html += '        </tr>';
    });

    html += '      </tbody>';
    html += '    </table>';
    html += '  </div>';
    html += '</div>';
  }

  // Board mandate preview
  // 5.2 Succession advisory flags
  var audit = result.audit;
  var successionFlags = audit && audit.successionFlags ? audit.successionFlags : [];
  if (successionFlags.length > 0) {
    html += '<div class="bg-surface border border-orange-500/30 rounded-xl p-4 shadow-lg">';
    html += '  <h4 class="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">';
    html += '    <span class="w-2 h-2 rounded-full bg-orange-400"></span> Succession Advisory';
    html += '  </h4>';
    html += '  <div class="space-y-2">';
    successionFlags.forEach(function (sf) {
      var urgencyColor = sf.urgency === 'HIGH' ? 'text-red-400' : 'text-amber-400';
      html += '    <div class="bg-backdrop/30 border border-border/40 rounded-lg p-2.5 flex items-center justify-between">';
      html += '      <div>';
      html += '        <span class="text-xs text-white font-semibold">' + escHtml(sf.player.Name || 'Unknown') + ' — ' + escHtml(sf.slot ? (sf.slot.roleId || '') : '') + '</span>';
      html += '        <span class="text-[10px] text-text-muted block">Fit score: ' + (sf.fitScore || 0).toFixed(1) + ' → projected: ' + (sf.projectedScore || 0).toFixed(1) + ' — below threshold</span>';
      html += '      </div>';
      html += '      <span class="text-[10px] font-bold uppercase ' + urgencyColor + '">' + sf.urgency + '</span>';
      html += '    </div>';
    });
    html += '  </div>';
    html += '</div>';
  }

  var board = window.FM24State.board || {};
  var mandates = board.mandates || [];
  if (mandates.length > 0) {
    html += '<div class="bg-surface border border-border/80 rounded-xl p-4 shadow-lg">';
    html += '  <h4 class="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">';
    html += '    <span class="w-2 h-2 rounded-full bg-red-400"></span> Board Mandates';
    html += '  </h4>';
    html += '  <div class="space-y-2">';
    mandates.forEach(function (m) {
      var mColor = m.status === 'ACTIVE' ? 'text-amber-400' : m.status === 'PASSED' ? 'text-green-400' : 'text-red-400';
      html += '    <div class="bg-backdrop/30 border border-border/40 rounded-lg p-2.5 flex items-center justify-between">';
      html += '      <div>';
      html += '        <span class="text-xs text-white font-semibold">' + escHtml(m.description || m.type || 'Unknown mandate') + '</span>';
      html += '        <span class="text-[10px] text-text-muted block">Target: ' + escHtml(m.target || m.metric || 'N/A') + '</span>';
      html += '      </div>';
      html += '      <span class="text-[10px] font-bold uppercase ' + mColor + '">' + (m.status || 'ACTIVE') + '</span>';
      html += '    </div>';
    });
    html += '  </div>';
    html += '</div>';
  }

  // Confidence bar
  if (board) {
    var confPct = board.confidence !== undefined ? board.confidence : 70;
    var confColor = confPct >= 70 ? 'bg-green-500' : confPct >= 40 ? 'bg-yellow-500' : 'bg-red-500';
    html += '<div class="bg-surface border border-border/80 rounded-xl p-4 shadow-lg">';
    html += '  <h4 class="text-xs font-bold text-white uppercase tracking-wider mb-2">Board Confidence</h4>';
    html += '  <div class="flex items-center gap-3">';
    html += '    <div class="flex-1 bg-backdrop rounded-full h-2.5 overflow-hidden">';
    html += '      <div class="' + confColor + ' h-full rounded-full transition-all" style="width:' + confPct + '%"></div>';
    html += '    </div>';
    html += '    <span class="text-sm font-extrabold text-white">' + confPct + '%</span>';
    html += '  </div>';
    html += '</div>';
  }

  // Relationship display
  var mgr = state.hired;
  if (mgr && mgr.relationshipIndex !== undefined) {
    var relIndex = mgr.relationshipIndex || 60;
    var relColor = relIndex >= 80 ? 'text-green-400' : relIndex >= 50 ? 'text-yellow-400' : 'text-red-400';
    html += '<div class="bg-surface border border-border/80 rounded-xl p-4 shadow-lg">';
    html += '  <h4 class="text-xs font-bold text-white uppercase tracking-wider mb-2">Manager Relationship Index</h4>';
    html += '  <div class="flex items-center gap-3">';
    html += '    <div class="flex-1 bg-backdrop rounded-full h-2.5 overflow-hidden">';
    html += '      <div class="' + (relIndex >= 80 ? 'bg-green-500' : relIndex >= 50 ? 'bg-yellow-500' : 'bg-red-500') + ' h-full rounded-full transition-all" style="width:' + relIndex + '%"></div>';
    html += '    </div>';
    html += '    <span class="text-sm font-extrabold ' + relColor + '">' + relIndex + '</span>';
    html += '  </div>';
    if (mgr.relationshipHistory && mgr.relationshipHistory.length > 0) {
      html += '  <div class="text-[10px] text-text-muted mt-1">';
      html += '    <span>Past events: ' + mgr.relationshipHistory.length + '</span>';
      html += '  </div>';
    }
    html += '</div>';
  }

  // 4.3 Contract dispute decision
  if (state.contractDispute && board.contractDisputeDecision === null) {
    html += '<div class="bg-red-900/20 border border-red-500/30 rounded-xl p-4 shadow-lg">';
    html += '  <div class="flex items-center gap-2 mb-3">';
    html += '    <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>';
    html += '    <h4 class="text-xs font-bold text-white uppercase tracking-wider">Manager Contract Dispute</h4>';
    html += '    <span class="text-[9px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 uppercase font-bold">MANDATORY</span>';
    html += '  </div>';
    html += '  <p class="text-xs text-text-secondary mb-3">Relationship with the board has been below 40 for two consecutive windows. A decision must be made:</p>';
    html += '  <select id="contract-dispute-decision" class="w-full text-xs bg-backdrop border border-border rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500">';
    html += '    <option value="STATUS_QUO">Status Quo — No change (board confidence -10)</option>';
    html += '    <option value="RENEW">Renew Contract — Improved terms (board confidence +5, relationship +15)</option>';
    html += '    <option value="DISMISS">Dismiss Manager — End employment (game over for this manager)</option>';
    html += '  </select>';
    html += '  <p class="text-[10px] text-text-muted mt-2">The DoF will execute this decision when you confirm the window.</p>';
    html += '</div>';
  }

  // Confirm button
  html += '<div class="flex gap-3">';
  html += '  <button id="dof-confirm-btn" class="flex-1 text-xs py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold uppercase tracking-wider transition-colors shadow shadow-blue-600/20">Confirm Decisions & Execute Incoming Phase</button>';
  html += '  <button id="dof-cancel-btn" class="text-xs py-3 bg-surface-hover hover:bg-border text-white rounded-lg font-bold uppercase tracking-wider transition-colors border border-border/60">Cancel Window</button>';
  html += '</div>';

  html += '</div>';
  return html;
}

function renderResultsStep(state) {
  // Route by windowStage
  if (state.windowStage === 'PART_A_COMPLETE' && state.partAResult && !state.transferResultV2) {
    return renderInterventionPanel(state);
  }

  var report = state.report;
  var tactic = state.generatedTactic;
  var recommendations = state.recommendations;
  if (!report || !tactic) return "<p class='text-text-muted text-xs'>No results. Please analyse the squad first.</p>";

  var html = "";

  var manager = state.hired;
  var archetype = manager ? deriveArchetype(manager) : "";
  var transArch = (manager && typeof resolveTransferArchetype === "function") ? resolveTransferArchetype(manager) : "OPPORTUNIST";
  var board = window.FM24State.board || {};

  // Dismissal notice banner
  if (board.dismissalPending) {
    html += '<div class="bg-red-900/30 border border-red-500/40 rounded-xl p-4 mb-4 flex items-center gap-3">';
    html += '  <span class="text-red-400 text-lg">&#9888;</span>';
    html += '  <div class="flex-1">';
    html += '    <p class="text-sm font-bold text-red-300">Dismissal Vote Pending</p>';
    html += '    <p class="text-xs text-text-muted">Board confidence has collapsed. You must meet the reprieve mandates to save your position.</p>';
    html += '  </div>';
    html += '  <span class="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded font-bold uppercase">Stage: ' + (board.stage || 'NORMAL') + '</span>';
    html += '</div>';
  }

  // Constrain parent for scroll isolation
  var panelEl = document.getElementById("panel-manager");
  if (panelEl) panelEl.style.overflow = "hidden";
  var contentEl = document.getElementById("manager-content");
  if (contentEl) contentEl.style.height = "100%";

  html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in results-scroll-grid">';

  // ─── LEFT COLUMN: EXECUTIVE SCORECARD & ACTIONS (1/3 width) ───
  html += '  <div class="space-y-4 lg:col-span-1 results-scroll-col-left">';

  // Executive Scorecard (compressed)
  html += '    <div class="bg-surface border border-border/80 rounded-xl p-4 shadow-lg">';
  
  var fitScore = state.fitScore;
  var fScore = 0;
  var feasibility = null;
  if (typeof evaluateTacticFeasibility === "function") {
    feasibility = evaluateTacticFeasibility(tactic);
    fScore = feasibility.overallScore;
  }
  
  var fColor = fScore >= 80 ? "text-green-400" : fScore >= 60 ? "text-yellow-400" : fScore >= 40 ? "text-orange-400" : "text-red-400";
  var coherence = (typeof aggregateCoherence === "function" && feasibility) ? aggregateCoherence(feasibility, tactic) : null;
  
  html += '      <div class="flex items-center justify-between gap-3">';
  html += '        <span class="text-xs text-text-secondary font-bold">Feasibility <span class="text-lg font-black ' + fColor + '">' + fScore + '</span></span>';
  if (coherence) {
    html += '        <span class="text-text-muted text-[9px]">·</span>';
    html += '        <span class="text-xs text-text-secondary font-bold">Coherence <span class="text-lg font-black ' + coherence.bandColor + '">' + coherence.score + '</span></span>';
    html += '        <span class="text-[8px] ' + coherence.bandColor + ' font-bold uppercase tracking-wider">' + coherence.band + '</span>';
  }
  if (fitScore) {
    var fs = fitScore.overallScore;
    var fsColor = fs >= 80 ? "text-green-400" : fs >= 60 ? "text-yellow-400" : fs >= 40 ? "text-orange-400" : "text-red-400";
    html += '        <span class="text-text-muted text-[9px]">·</span>';
    html += '        <span class="text-xs text-text-secondary font-bold">Fit <span class="text-lg font-black ' + fsColor + '">' + fs + '</span></span>';
  }
  html += '      </div>';
  html += '    </div>'; // end scorecard card

  // Detailed Pillars Card
  html += '    <div class="bg-surface border border-border/80 rounded-xl p-4 shadow-lg space-y-1">';
  html += '      <h3 class="text-[10px] font-bold text-white uppercase tracking-wider border-b border-border/40 pb-1.5 mb-1">Pillar Diagnostics</h3>';
  
  if (fitScore) {
    html += '      <div class="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">Fit Pillars:</div>';
    var pillars = fitScore.pillars;
    var pillarLabels = {
      tacticalCoverage: "Tactical Coverage",
      styleCapacity: "Style Capacity",
      lockerRoom: "Locker Room Matrix",
      development: "Squad Timeline",
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
        html += '      <div class="flex items-center justify-between text-[11px] gap-2">';
        html += '        <span class="text-text-muted w-24 truncate">' + (pillarLabels[pk] || pk) + '</span>';
        html += '        <div class="flex-1 bg-surface-hover rounded-full h-1 overflow-hidden">';
        html += '          <div class="' + (pillarColors[pk] || "bg-white") + ' rounded-full h-1" style="width:' + pct + '%"></div>';
        html += '        </div>';
        html += '        <span class="text-text-secondary w-7 text-right font-bold">' + pct + '%</span>';
        html += '      </div>';
      }
    }
  }

  if (feasibility) {
    html += '      <div class="text-[10px] font-bold text-text-muted uppercase tracking-wider border-t border-border/20 pt-2 mt-2">Feasibility Categories:</div>';
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
        html += '      <div class="flex items-center justify-between text-[11px] gap-2">';
        html += '        <span class="text-text-muted w-24 truncate">' + (catLabels[ck] || ck) + '</span>';
        html += '        <div class="flex-1 bg-surface-hover rounded-full h-1 overflow-hidden">';
        html += '          <div class="' + (catColors[ck] || "bg-white") + ' rounded-full h-1" style="width:' + pct + '%"></div>';
        html += '        </div>';
        html += '        <span class="text-text-secondary w-7 text-right font-bold">' + pct + '%</span>';
        html += '      </div>';
      }
    }
  }
  html += '    </div>'; // end diagnostics card

  // Financial Recap Card (compressed)
  var trV2 = state.transferResultV2;
  if ((state.mode === "full_manager" || state.mode === "head_coach") && trV2) {
    html += '    <div class="bg-surface border border-border/80 rounded-xl p-4 shadow-lg">';
    
    var budgetRemaining = trV2.transferBudgetRemaining;
    var wageRemaining = trV2.wageBudgetRemaining;
    var totalSpent = trV2.totalSpent;
    var saleRev = trV2.totalSaleRevenue;
    var weeklyWageBill = trV2.weeklyWageBill;

    html += '      <div class="flex items-center justify-between text-[10px] flex-wrap gap-x-3 gap-y-0.5">';
    html += '        <span class="text-text-muted">Budget: <span class="font-extrabold ' + (budgetRemaining >= 0 ? 'text-green-400' : 'text-red-400') + '">£' + formatCurrency(budgetRemaining) + '</span></span>';
    html += '        <span class="text-text-muted">Wages: <span class="font-extrabold ' + (wageRemaining >= 0 ? 'text-green-400' : 'text-red-400') + '">£' + formatCurrency(wageRemaining) + ' p/w</span></span>';
    html += '        <span class="text-text-muted">Spent: <span class="font-extrabold text-red-400">£' + formatCurrency(totalSpent) + '</span></span>';
    html += '        <span class="text-text-muted">Sales: <span class="font-extrabold text-green-400">£' + formatCurrency(saleRev) + '</span></span>';
    html += '        <span class="text-text-muted">Bill: <span class="font-extrabold text-white">£' + formatCurrency(weeklyWageBill) + ' p/w</span></span>';
    html += '      </div>';
    html += '    </div>'; // end financial card
  } else if (state.mode === "head_coach") {
    html += '    <div class="bg-surface border border-border/80 rounded-xl p-5 shadow-lg">';
    html += '      <h3 class="text-[10px] font-bold text-white uppercase tracking-wider border-b border-border/40 pb-2 mb-2">Operational Mode</h3>';
    html += '      <div class="text-xs text-text-secondary">Operating as <strong class="text-white">Director of Football</strong>. The Head Coach designs the tactics, while you manage recruitment and transfer budgets.</div>';
    html += '    </div>';
  }

  // Board Confidence + Strategic Objective Arc (merged) - REMOVED AS REQUESTED BY USER
  var mandates = [];
  var activeMandates = [];
  var activeArc = null;
  var completedArc = null;

  // 6.1 Squad DNA Match Card
  var history = state.windowHistory || [];
  var lastDna = history.length > 0 ? history[history.length - 1].dnaScore : null;
  if (tactic.slots) {
    var dnaScore = null;
    if (lastDna !== null && lastDna !== undefined) {
      dnaScore = lastDna;
    } else if (typeof computeDnaScore === "function") {
      var dnaResult = computeDnaScore(window.FM24State.squad, tactic);
      dnaScore = dnaResult ? dnaResult.score : null;
    }
    if (dnaScore !== null) {
      var dnaColor = dnaScore >= 80 ? 'text-green-400' : dnaScore >= 60 ? 'text-yellow-400' : 'text-red-400';
      var dnaBarColor = dnaScore >= 80 ? 'bg-green-500' : dnaScore >= 60 ? 'bg-yellow-500' : 'bg-red-500';
      var dnaLabel = dnaScore >= 80 ? 'Embedded' : dnaScore >= 60 ? 'Developing' : 'Early Stage';
      var mgrName = state.hired ? (state.hired.Name || 'Manager') : 'Manager';
      html += '    <div class="bg-surface border border-border/80 rounded-xl p-5 shadow-lg">';
      html += '      <div class="flex items-center justify-between mb-2">';
      html += '        <h3 class="text-[10px] font-bold text-white uppercase tracking-wider">Squad DNA Match</h3>';
      html += '        <span class="text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ' + dnaColor.replace('text-', 'text-').replace('400', '400') + ' bg-white/5 border border-white/10">' + dnaLabel + '</span>';
      html += '      </div>';
      html += '      <div class="flex items-center gap-3">';
      html += '        <div class="flex-1 bg-backdrop rounded-full h-2.5 overflow-hidden">';
      html += '          <div class="' + dnaBarColor + ' h-full rounded-full transition-all" style="width:' + dnaScore + '%"></div>';
      html += '        </div>';
      html += '        <span class="text-sm font-extrabold ' + dnaColor + '">' + dnaScore + '%</span>';
      html += '      </div>';
      html += '      <div class="mt-1.5 text-[10px] text-text-muted">';
      html += '        <span>' + mgrName + '\'s system: squad attribute alignment (' + dnaScore + '% match)</span>';
      html += '      </div>';
      html += '    </div>';
    }
  }

  // Manager Relationship Card
  var mgr = state.hired;
  if (mgr && mgr.relationshipIndex !== undefined) {
    var relIndex = mgr.relationshipIndex || 60;
    var relColor = relIndex >= 80 ? 'text-green-400' : relIndex >= 50 ? 'text-yellow-400' : 'text-red-400';
    var relBarColor = relIndex >= 80 ? 'bg-green-500' : relIndex >= 50 ? 'bg-yellow-500' : 'bg-red-500';
    html += '    <div class="bg-surface border border-border/80 rounded-xl p-5 shadow-lg">';
    html += '      <div class="flex items-center justify-between mb-2">';
    html += '        <h3 class="text-[10px] font-bold text-white uppercase tracking-wider">Manager Relationship</h3>';
    if (state.contractDispute) {
      html += '        <span class="text-[9px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 uppercase font-bold">DISPUTE</span>';
    }
    html += '      </div>';
    html += '      <div class="flex items-center gap-3">';
    html += '        <div class="flex-1 bg-backdrop rounded-full h-2.5 overflow-hidden">';
    html += '          <div class="' + relBarColor + ' h-full rounded-full transition-all" style="width:' + relIndex + '%"></div>';
    html += '        </div>';
    html += '        <span class="text-sm font-extrabold ' + relColor + '">' + relIndex + '</span>';
    html += '      </div>';
    if (state.contractDispute) {
      html += '      <div class="mt-1.5 text-[10px] text-red-400">';
      html += '        <span>Contract dispute — archetype modifiers degraded by 15%. Resolve in next intervention panel.</span>';
      html += '      </div>';
    }
    if (mgr.relationshipHistory && mgr.relationshipHistory.length > 0) {
      html += '      <div class="mt-1.5 text-[10px] text-text-muted">';
      html += '        <span>Past events: ' + mgr.relationshipHistory.length + '</span>';
      html += '      </div>';
    }
    html += '    </div>';
  }

  // Unrest Players Card
  if (state.unrestPlayers && state.unrestPlayers.length > 0) {
    html += '    <div class="bg-surface border border-amber-500/30 rounded-xl p-5 shadow-lg">';
    html += '      <div class="flex items-center justify-between mb-2">';
    html += '        <h3 class="text-[10px] font-bold text-white uppercase tracking-wider">Player Unrest</h3>';
    html += '        <span class="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-bold">' + state.unrestPlayers.length + ' unsettled</span>';
    html += '      </div>';
    html += '      <p class="text-[10px] text-text-muted mb-2">Captain Ldr bonus reduced from +0.3 to +0.1 per unrest player.</p>';
    html += '      <div class="space-y-1">';
    state.unrestPlayers.forEach(function (up) {
      html += '        <div class="text-[10px] flex items-center justify-between bg-backdrop/30 rounded px-2 py-1">';
      html += '          <span class="text-white">' + escHtml(up.name) + '</span>';
      html += '          <span class="text-text-muted">Det ' + up.det + ' | CA ' + up.ca + ' | ' + up.reason + '</span>';
      html += '        </div>';
    });
    html += '      </div>';
    html += '    </div>';
  }

  // Free Agents Available Card
  var freeAgentPool = window.FM24State.freeAgentPool || [];
  if (freeAgentPool.length > 0) {
    html += '    <div class="bg-surface border border-border/80 rounded-xl p-5 shadow-lg">';
    html += '      <div class="flex items-center justify-between mb-2">';
    html += '        <h3 class="text-[10px] font-bold text-white uppercase tracking-wider">Free Agents Available</h3>';
    html += '        <span class="text-[9px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 uppercase font-bold">' + freeAgentPool.length + ' players</span>';
    html += '      </div>';
    html += '      <p class="text-[10px] text-text-muted mb-2">Released players available on free transfers (wage only).</p>';
    html += '      <div class="space-y-1 max-h-40 overflow-y-auto">';
    freeAgentPool.forEach(function (fa) {
      if (fa.status === 'SIGNED') return;
      html += '        <div class="text-[10px] flex items-center justify-between bg-backdrop/30 rounded px-2 py-1">';
      html += '          <span class="text-white">' + escHtml(fa.Name) + '</span>';
      html += '          <span class="text-text-muted">CA ' + (fa.CA || 0) + ' | Age ' + (fa.Age || 0) + ' | £' + formatCurrency(fa.Wage || 0) + '/wk</span>';
      html += '        </div>';
    });
    html += '      </div>';
    html += '    </div>';
  }

  // Action Hub Card
  html += '    <div class="bg-surface border border-border/80 rounded-xl p-5 shadow-lg space-y-2.5">';
  html += '      <h3 class="text-[10px] font-bold text-white uppercase tracking-wider border-b border-border/40 pb-2 mb-2">Director Action Hub</h3>';
  
  var hasResult = state.mode === "full_manager" && trV2;
  var isHcWithResult = state.mode === "head_coach" && trV2;
  if (hasResult || isHcWithResult) {
    html += '      <button id="apply-transfers-v2-hub-btn" class="w-full text-xs py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold uppercase tracking-wider transition-colors shadow shadow-blue-600/20">Execute Transfer & Tactic Plan</button>';
    html += '      <p class="text-[10px] text-text-muted text-center leading-normal">Applies tactical formation/instructions and processes all completed signings & sales immediately.</p>';
  } else {
    html += '      <button id="apply-tactic-btn" class="w-full text-xs py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold uppercase tracking-wider transition-colors shadow shadow-blue-600/20">Apply Tactic Structure</button>';
    html += '      <p class="text-[10px] text-text-muted text-center leading-normal">Applies the tactical formation, roles, and instructions to the Tactic Builder.</p>';
  }
  
  // Next Window / Re-Analyse button
  var nextLabel = ((state.mode === "full_manager" || state.mode === "head_coach") && trV2) ? "Next Transfer Window" : "Re-Analyse Squad";
  var nextDesc = ((state.mode === "full_manager" || state.mode === "head_coach") && trV2) ? "Re-open analysis to simulate the next transfer window with updated squad & market data." : "Re-run the tactical analysis with updated squad data.";
  html += '      <button id="next-window-btn" class="w-full text-xs py-2.5 bg-surface-hover hover:bg-border text-white rounded-lg font-bold uppercase tracking-wider transition-colors border border-border/60">' + nextLabel + '</button>';
  html += '      <p class="text-[10px] text-text-muted text-center leading-normal">' + nextDesc + '</p>';
  
  html += '      <div class="border-t border-border/20 pt-2.5 mt-2 flex justify-center">';
  html += '        <button id="hire-different-hub-btn" class="text-[10px] text-text-muted hover:text-white transition-colors uppercase font-bold tracking-wider">← Fire Manager & Select New</button>';
  html += '      </div>';
  html += '    </div>'; // end action hub
  
  html += '  </div>'; // ─── END LEFT COLUMN ───

  // ─── RIGHT COLUMN: MAIN TABS PANELS (2/3 width) ───
  html += '  <div class="lg:col-span-2 results-scroll-col-right">';

  // Tabs Navigation
  html += '    <div class="flex justify-between items-center border-b border-border/60 bg-surface rounded-t-xl px-2 pt-2 gap-1">';
  html += '      <div class="flex gap-1">';
  html += '        <button class="results-tab-btn active px-4 py-2 text-xs font-bold uppercase tracking-wider text-white border-b-2 border-blue-500 bg-backdrop/20 hover:bg-backdrop/40 transition-all rounded-t-lg" data-results-tab="report">Tactic & Report</button>';
    if ((state.mode === "full_manager" || state.mode === "head_coach") && trV2) {
      html += '        <button class="results-tab-btn px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-muted border-b-2 border-transparent hover:text-white hover:bg-backdrop/40 transition-all rounded-t-lg" data-results-tab="transfers">Transfers & Ledger</button>';
      html += '        <button class="results-tab-btn px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-muted border-b-2 border-transparent hover:text-white hover:bg-backdrop/40 transition-all rounded-t-lg" data-results-tab="designations">Squad Designations</button>';
    }
    html += '        <button class="results-tab-btn px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-muted border-b-2 border-transparent hover:text-white hover:bg-backdrop/40 transition-all rounded-t-lg" data-results-tab="season">Season Overview</button>';
    html += '        <button class="results-tab-btn px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-muted border-b-2 border-transparent hover:text-white hover:bg-backdrop/40 transition-all rounded-t-lg" data-results-tab="bid">Bid Consult</button>';
    html += '      </div>';
    html += '      <div class="flex gap-1.5 pb-2 pr-2 print:hidden">';
    html += '        <button id="export-report-html-btn" class="px-2.5 py-1 bg-surface-hover hover:bg-border text-text-secondary hover:text-white rounded border border-border text-[10px] uppercase font-bold tracking-wider transition-colors flex items-center gap-1">&#128190; HTML Report</button>';
    html += '        <button id="export-report-pdf-btn" class="px-2.5 py-1 bg-surface-hover hover:bg-border text-text-secondary hover:text-white rounded border border-border text-[10px] uppercase font-bold tracking-wider transition-colors flex items-center gap-1">&#128160; Print/PDF</button>';
    html += '      </div>';
    html += '    </div>'; // end tab headers
  
  // Tab panels wrapper
  html += '    <div class="bg-surface border border-t-0 border-border/80 rounded-b-xl p-5 shadow-lg results-tab-scroll">';

  // Tab Panel 1: report
  html += '      <div id="results-panel-report" class="results-tab-panel space-y-4">';
  
  // Summary & Rationale (collapsible)
  html += '        <div class="space-y-2 border-b border-border/30 pb-4">';
  html += '          <div class="flex items-center justify-between">';
  html += '            <h4 class="text-xs font-bold text-white uppercase tracking-wider">Manager Tactical Blueprint</h4>';
  html += '            <button class="toggle-blueprint-btn text-[10px] text-text-muted hover:text-white uppercase tracking-wider font-bold" onclick="toggleBlueprintCollapse()">[Show]</button>';
  html += '          </div>';
  html += '          <div id="blueprint-details" class="bg-backdrop/30 border border-border/20 rounded-lg p-3.5 space-y-2 text-xs leading-relaxed text-text-secondary" style="display:none;">';
  html += '            <p><strong class="text-white">Profile summary:</strong> ' + escHtml(report.managerSummary) + '</p>';
  html += '            <p><strong class="text-white">Tactical rationale:</strong> ' + escHtml(report.tacticRationale) + '</p>';
  html += '          </div>';
  html += '          <p class="bg-backdrop/10 border border-border/10 rounded-lg p-2 text-xs leading-relaxed text-text-secondary"><strong class="text-white">Overall squad fit:</strong> ' + escHtml(report.overallFit) + '</p>';
  html += '        </div>';

  // Strengths & Gaps
  html += '        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-border/30 pb-4">';
  // Strengths
  html += '          <div class="space-y-2">';
  html += '            <h4 class="text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-1.5">';
  html += '              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>';
  html += '              Tactical Strengths';
  html += '            </h4>';
  if (report.squadStrengths.length > 0) {
    html += '            <ul class="space-y-1.5 text-xs text-text-secondary list-none pl-0">';
    for (var si = 0; si < report.squadStrengths.length; si++) {
      html += '              <li class="flex items-start gap-2">';
      html += '                <span class="text-green-500 font-bold">•</span>';
      html += '                <span>' + escHtml(report.squadStrengths[si]) + '</span>';
      html += '              </li>';
    }
    html += '            </ul>';
  } else {
    html += '            <p class="text-xs text-text-muted">No specific tactical strengths noted.</p>';
  }
  html += '          </div>';

  // Gaps
  html += '          <div class="space-y-2">';
  html += '            <h4 class="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">';
  html += '              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
  html += '              Tactical Gaps';
  html += '            </h4>';
  if (report.squadGaps.length > 0) {
    html += '            <ul class="space-y-2 text-xs text-text-secondary list-none pl-0">';
    for (var gi = 0; gi < report.squadGaps.length; gi++) {
      var g = report.squadGaps[gi];
      html += '              <li class="bg-backdrop/40 border border-border/20 rounded-lg p-2.5 flex flex-col gap-1">';
      html += '                <div class="flex items-center justify-between">';
      html += '                  <span class="font-bold text-white text-[11px]">[' + escHtml(g.slotId) + '] ' + escHtml(g.roleName) + '</span>';
      html += '                </div>';
      html += '                <span class="text-[10.5px] leading-normal text-text-muted">' + escHtml(g.reason) + '</span>';
      html += '                <span class="text-[10px] text-text-muted mt-0.5">Best Alternative: <strong class="text-text-secondary">' + escHtml(g.bestAvailable) + '</strong></span>';
      html += '              </li>';
    }
    html += '            </ul>';
  } else {
    html += '            <p class="text-xs text-text-muted">No tactical gaps detected in starting lineup.</p>';
  }
  html += '          </div>';
  html += '        </div>'; // end strengths/gaps grid

  // Starting XI Slot Quality Table
  if (trV2 && trV2.slotQualityTable) {
    html += '        <div class="space-y-2">';
    html += '          <div class="flex items-center justify-between">';
    html += '            <h4 class="text-xs font-bold text-white uppercase tracking-wider">Starting XI Slot Quality</h4>';
    html += '            <span class="text-[10px] text-text-muted">(Evaluates fit, consistency, big games, & reliability)</span>';
    html += '          </div>';
    html += '          <div class="border border-border/40 rounded-lg overflow-hidden">';
    html += '            <table class="w-full text-xs text-left">';
    html += '              <thead>';
    html += '                <tr class="bg-backdrop/60 border-b border-border/40 text-[10px] font-bold uppercase tracking-wider text-text-muted">';
    html += '                  <th class="py-2 px-3">Slot</th>';
    html += '                  <th class="py-2 px-3">Player</th>';
    html += '                  <th class="py-2 px-3 text-right">Raw Fit</th>';
    html += '                  <th class="py-2 px-3 text-right">Overall Quality</th>';
    html += '                </tr>';
    html += '              </thead>';
    html += '              <tbody class="divide-y divide-border/20">';

    var tableMap = {};
    if (Array.isArray(trV2.slotQualityTable)) {
      trV2.slotQualityTable.forEach(function (x) {
        tableMap[x.slot] = { playerName: x.player.Name, fitScore: x.fitScore, slotQuality: x.slotQuality };
      });
    } else {
      tableMap = trV2.slotQualityTable;
    }

    var slotIds = Object.keys(tableMap).sort(function (a, b) {
      if (typeof slotPositionOrder === "function") return slotPositionOrder(a) - slotPositionOrder(b);
      var da = GLOBAL_PITCH_SLOTS[a], db = GLOBAL_PITCH_SLOTS[b];
      if (da && db) {
        if (db.y !== da.y) return db.y - da.y;
        return da.x - db.x;
      }
      return a.localeCompare(b);
    });

    for (var si = 0; si < slotIds.length; si++) {
      var sqEntry = tableMap[slotIds[si]];
      var qColor = sqEntry.slotQuality >= 14 ? "text-green-400 font-extrabold" : sqEntry.slotQuality >= 11 ? "text-yellow-400 font-extrabold" : "text-red-400 font-extrabold";
      html += '                <tr class="hover:bg-surface-hover/30 transition-colors">';
      html += '                  <td class="py-2 px-3 font-semibold text-white">' + escHtml(slotIds[si]) + '</td>';
      html += '                  <td class="py-2 px-3 text-text-secondary">' + escHtml(sqEntry.playerName) + '</td>';
      html += '                  <td class="py-2 px-3 text-right text-text-muted">' + (sqEntry.fitScore ? sqEntry.fitScore.toFixed(1) : "\u2014") + '</td>';
      html += '                  <td class="py-2 px-3 text-right"><span class="' + qColor + '">' + sqEntry.slotQuality.toFixed(1) + '</span></td>';
      html += '                </tr>';
    }
    html += '              </tbody>';
    html += '            </table>';
    html += '          </div>';
    html += '        </div>';
  }
  
  html += '      </div>'; // ─── END REPORT TAB ───

  // Tab Panel 2: transfers
  if ((state.mode === "full_manager" || state.mode === "head_coach") && trV2) {
    html += '      <div id="results-panel-transfers" class="results-tab-panel space-y-6" style="display: none;">';

    // Arrivals
    html += '        <div class="space-y-2">';
    html += '          <h4 class="text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-1.5">';
    html += '            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>';
    html += '            Arrivals (In)';
    html += '          </h4>';
    if (trV2.signedPlayers && trV2.signedPlayers.length > 0) {
      html += '          <div class="border border-border/40 rounded-lg overflow-hidden">';
      html += '            <table class="w-full text-xs text-left">';
      html += '              <thead>';
      html += '                <tr class="bg-backdrop/60 border-b border-border/40 text-[10px] font-bold uppercase tracking-wider text-text-muted">';
      html += '                  <th class="py-2 px-3">Player</th>';
      html += '                  <th class="py-2 px-3">Club</th>';
      html += '                  <th class="py-2 px-3">Role</th>';
      html += '                  <th class="py-2 px-3 text-right">Fee</th>';
      html += '                  <th class="py-2 px-3 text-right">Fit</th>';
      html += '                  <th class="py-2 px-3 text-right">Inflated</th>';
      html += '                </tr>';
      html += '              </thead>';
      html += '              <tbody class="divide-y divide-border/20">';
      for (var ai = 0; ai < trV2.signedPlayers.length; ai++) {
        var a = trV2.signedPlayers[ai];
        var role = typeof getRoleById === "function" ? getRoleById(a.roleId) : null;
        var roleName = role ? role.name : (a.roleId || "");
        var fitColor = a.trueFitScore >= 14 ? "text-green-400" : a.trueFitScore >= 11 ? "text-yellow-400" : "text-red-400";
        html += '                <tr class="hover:bg-surface-hover/30 transition-colors">';
        html += '                  <td class="py-2 px-3 font-semibold text-white">' + escHtml(a.player.Name) + '</td>';
        html += '                  <td class="py-2 px-3 text-text-secondary">' + escHtml(a.player.Club || "Free Agency") + '</td>';
        html += '                  <td class="py-2 px-3 text-text-secondary">' + escHtml(roleName) + '</td>';
        html += '                  <td class="py-2 px-3 text-right text-red-400 font-mono">£' + formatCurrency(a.fee) + '</td>';
        html += '                  <td class="py-2 px-3 text-right"><span class="' + fitColor + ' font-bold">' + (a.trueFitScore ? a.trueFitScore.toFixed(1) : "?") + '</span></td>';
        html += '                  <td class="py-2 px-3 text-right text-text-muted">' + (a.rivalBid ? "<span class='text-yellow-400 font-semibold'>Yes</span>" : "—") + '</td>';
        html += '                </tr>';
      }
      html += '              </tbody>';
      html += '            </table>';
      html += '          </div>';
    } else {
      html += '          <p class="text-xs text-text-muted bg-backdrop/20 border border-border/25 rounded-lg p-3 text-center">No players signed in this window.</p>';
    }
    html += '        </div>';

    // Departures
    html += '        <div class="space-y-2">';
    html += '          <h4 class="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">';
    html += '            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M20 12H4"></path></svg>';
    html += '            Departures (Out)';
    html += '          </h4>';
    
    var hasDepartures = (trV2.soldPlayers && trV2.soldPlayers.length > 0) || 
                         (trV2.releasedPlayers && trV2.releasedPlayers.length > 0) ||
                         (trV2.loanedPlayers && trV2.loanedPlayers.length > 0) ||
                         (trV2.emergencySales && trV2.emergencySales.length > 0);

    if (hasDepartures) {
      html += '          <div class="border border-border/40 rounded-lg overflow-hidden">';
      html += '            <table class="w-full text-xs text-left">';
      html += '              <thead>';
      html += '                <tr class="bg-backdrop/60 border-b border-border/40 text-[10px] font-bold uppercase tracking-wider text-text-muted">';
      html += '                  <th class="py-2 px-3">Player</th>';
      html += '                  <th class="py-2 px-3">Destination</th>';
      html += '                  <th class="py-2 px-3">Type</th>';
      html += '                  <th class="py-2 px-3 text-right">Fee / Wage Saved</th>';
      html += '                </tr>';
      html += '              </thead>';
      html += '              <tbody class="divide-y divide-border/20">';
      
      if (trV2.soldPlayers) {
        for (var si = 0; si < trV2.soldPlayers.length; si++) {
          var p = trV2.soldPlayers[si];
          html += '                <tr class="hover:bg-surface-hover/30 transition-colors">';
          html += '                  <td class="py-2 px-3 font-semibold text-white">' + escHtml(p.Name) + '</td>';
          html += '                  <td class="py-2 px-3 text-text-secondary">' + escHtml(p.buyerClub || "Unknown Club") + '</td>';
          html += '                  <td class="py-2 px-3 text-green-400 font-bold">SOLD</td>';
          html += '                  <td class="py-2 px-3 text-right text-green-400 font-mono">£' + formatCurrency(p.saleFee || p.AP || 0) + '</td>';
          html += '                </tr>';
        }
      }
      if (trV2.emergencySales) {
        for (var ei = 0; ei < trV2.emergencySales.length; ei++) {
          var es = trV2.emergencySales[ei];
          html += '                <tr class="hover:bg-surface-hover/30 transition-colors">';
          html += '                  <td class="py-2 px-3 font-semibold text-white">' + escHtml(es.player.Name) + '</td>';
          html += '                  <td class="py-2 px-3 text-text-secondary">' + escHtml(es.buyerClub || es.player.buyerClub || "Unknown Club") + '</td>';
          html += '                  <td class="py-2 px-3 text-orange-400 font-bold">EMERGENCY SALE</td>';
          html += '                  <td class="py-2 px-3 text-right text-green-400 font-mono">£' + formatCurrency(es.fee) + '</td>';
          html += '                </tr>';
        }
      }
      if (trV2.releasedPlayers) {
        for (var ri = 0; ri < trV2.releasedPlayers.length; ri++) {
          var p = trV2.releasedPlayers[ri];
          html += '                <tr class="hover:bg-surface-hover/30 transition-colors">';
          html += '                  <td class="py-2 px-3 font-semibold text-white">' + escHtml(p.Name) + '</td>';
          html += '                  <td class="py-2 px-3 text-text-muted">Free Agent</td>';
          html += '                  <td class="py-2 px-3 text-red-400 font-bold">RELEASED</td>';
          html += '                  <td class="py-2 px-3 text-right text-text-muted font-mono">£' + formatCurrency(p.Wage || 0) + '/wk saved</td>';
          html += '                </tr>';
        }
      }
      if (trV2.loanedPlayers) {
        for (var li = 0; li < trV2.loanedPlayers.length; li++) {
          var p = trV2.loanedPlayers[li];
          html += '                <tr class="hover:bg-surface-hover/30 transition-colors">';
          html += '                  <td class="py-2 px-3 font-semibold text-white">' + escHtml(p.Name) + '</td>';
          html += '                  <td class="py-2 px-3 text-text-secondary">' + escHtml(p.buyerClub || "Unknown Club") + '</td>';
          html += '                  <td class="py-2 px-3 text-blue-400 font-bold">LOANED</td>';
          html += '                  <td class="py-2 px-3 text-right text-text-muted font-mono">£' + formatCurrency(p.Wage || 0) + '/wk saved</td>';
          html += '                </tr>';
        }
      }
      html += '              </tbody>';
      html += '            </table>';
      html += '          </div>';
    } else {
      html += '          <p class="text-xs text-text-muted bg-backdrop/20 border border-border/25 rounded-lg p-3 text-center">No squad departures in this window.</p>';
    }
    html += '        </div>';

    // Grid of other logs
    html += '        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
    
    // Sticking points
    html += '          <div class="space-y-2">';
    html += '            <h4 class="text-xs font-bold text-orange-400 uppercase tracking-wider">Surplus & Sticking Points</h4>';
    var hasSurplusLogs = (trV2.unsoldSurplus && trV2.unsoldSurplus.length > 0) || (trV2.refusedListings && trV2.refusedListings.length > 0);
    if (hasSurplusLogs) {
      html += '            <div class="border border-border/40 rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">';
      html += '              <table class="w-full text-xs text-left">';
      html += '                <thead>';
      html += '                  <tr class="bg-backdrop/60 border-b border-border/40 text-[9px] font-bold uppercase tracking-wider text-text-muted">';
      html += '                    <th class="py-1.5 px-3">Player</th>';
      html += '                    <th class="py-1.5 px-3">Status</th>';
      html += '                    <th class="py-1.5 px-3 text-right">Wage Drain</th>';
      html += '                  </tr>';
      html += '                </thead>';
      html += '                <tbody class="divide-y divide-border/20">';
      if (trV2.refusedListings) {
        for (var ri = 0; ri < trV2.refusedListings.length; ri++) {
          var rp = trV2.refusedListings[ri];
          html += '                  <tr class="hover:bg-surface-hover/30 transition-colors">';
          html += '                    <td class="py-1.5 px-3 font-semibold text-white">' + escHtml(rp.Name) + '</td>';
          html += '                    <td class="py-1.5 px-3 text-red-400 font-semibold">Refused Transfer</td>';
          html += '                    <td class="py-1.5 px-3 text-right text-red-400 font-mono">£' + formatCurrency(rp.Wage || 0) + '</td>';
          html += '                  </tr>';
        }
      }
      if (trV2.unsoldSurplus) {
        for (var ui = 0; ui < trV2.unsoldSurplus.length; ui++) {
          var up = trV2.unsoldSurplus[ui];
          html += '                  <tr class="hover:bg-surface-hover/30 transition-colors">';
          html += '                    <td class="py-1.5 px-3 font-semibold text-white">' + escHtml(up.Name) + '</td>';
          html += '                    <td class="py-1.5 px-3 text-orange-400 font-semibold">Unsold Surplus</td>';
          html += '                    <td class="py-1.5 px-3 text-right text-red-400 font-mono">£' + formatCurrency(up.Wage || 0) + '</td>';
          html += '                  </tr>';
        }
      }
      html += '                </tbody>';
      html += '              </table>';
      html += '            </div>';
    } else {
      html += '            <p class="text-[11px] text-text-muted bg-backdrop/20 border border-border/25 rounded-lg p-2.5 text-center">No stuck surplus players.</p>';
    }
    html += '          </div>';

    // Scouting & Deal Breakers
    html += '          <div class="space-y-2">';
    html += '            <h4 class="text-xs font-bold text-yellow-400 uppercase tracking-wider">Scouting & Deal Breakers</h4>';
    var hasDealLogs = (trV2.dealsCollapsed && trV2.dealsCollapsed.length > 0) || (trV2.scoutingBusts && trV2.scoutingBusts.length > 0);
    if (hasDealLogs) {
      html += '            <div class="border border-border/40 rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">';
      html += '              <table class="w-full text-xs text-left">';
      html += '                <thead>';
      html += '                  <tr class="bg-backdrop/60 border-b border-border/40 text-[9px] font-bold uppercase tracking-wider text-text-muted">';
      html += '                    <th class="py-1.5 px-3">Player</th>';
      html += '                    <th class="py-1.5 px-3">Issue</th>';
      html += '                    <th class="py-1.5 px-3 text-right">Details</th>';
      html += '                  </tr>';
      html += '                </thead>';
      html += '                <tbody class="divide-y divide-border/20">';
      if (trV2.dealsCollapsed) {
        for (var ci = 0; ci < trV2.dealsCollapsed.length; ci++) {
          var c = trV2.dealsCollapsed[ci];
          html += '                  <tr class="hover:bg-surface-hover/30 transition-colors">';
          html += '                    <td class="py-1.5 px-3 font-semibold text-white">' + escHtml(c.player.Name) + '</td>';
          html += '                    <td class="py-1.5 px-3 text-yellow-400 font-semibold">Deal Collapsed</td>';
          html += '                    <td class="py-1.5 px-3 text-right text-text-muted">' + escHtml(c.reason) + '</td>';
          html += '                  </tr>';
        }
      }
      if (trV2.scoutingBusts) {
        for (var bi = 0; bi < trV2.scoutingBusts.length; bi++) {
          var b = trV2.scoutingBusts[bi];
          html += '                  <tr class="hover:bg-surface-hover/30 transition-colors">';
          html += '                    <td class="py-1.5 px-3 font-semibold text-white">' + escHtml(b.player.Name) + '</td>';
          html += '                    <td class="py-1.5 px-3 text-red-400 font-semibold">Scouting Bust</td>';
          html += '                    <td class="py-1.5 px-3 text-right text-orange-400">Miss: ' + b.difference.toFixed(1) + '</td>';
          html += '                  </tr>';
        }
      }
      html += '                </tbody>';
      html += '              </table>';
      html += '            </div>';
    } else {
      html += '            <p class="text-[11px] text-text-muted bg-backdrop/20 border border-border/25 rounded-lg p-2.5 text-center">No collapsed deals or scouting misses.</p>';
    }
    html += '          </div>';
    html += '        </div>'; // end logs grid

    // Chronological Transfer Timeline
    html += '        <div class="space-y-3 border-t border-border/20 pt-4">';
    html += '          <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">';
    html += '            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    html += '            Chronological Transfer Window Timeline';
    html += '          </h4>';
    if (trV2.eventLog && trV2.eventLog.length > 0) {
      html += '          <div class="timeline-container max-h-[350px] overflow-y-auto pr-2 scrollbar-thin">';
      for (var eti = 0; eti < trV2.eventLog.length; eti++) {
        var ev = trV2.eventLog[eti];
        var badgeClass = ev.type ? ev.type.toLowerCase() : "bid_submitted";
        var titleText = ev.type ? ev.type.replace(/_/g, " ") : "Event";
        
        // Match badge design token styles
        if (ev.type === 'SALE_OPENED') badgeClass = 'sold';
        if (ev.type === 'REDIRECT') badgeClass = 'bid_submitted';
        if (ev.type === 'BUDGET_OVERRUN') badgeClass = 'bid_submitted';
        if (ev.type === 'RELEASE') badgeClass = 'release';

        html += '            <div class="timeline-item animate-fade-in">';
        html += '              <div class="timeline-badge ' + badgeClass + '"></div>';
        html += '              <div class="timeline-content">';
        html += '                <div class="timeline-day">Day ' + ev.day + '</div>';
        html += '                <div class="timeline-title uppercase font-bold text-[9px] tracking-wider">' + titleText + '</div>';
        html += '                <div class="timeline-detail text-text-secondary">' + escHtml(ev.detail) + '</div>';
        html += '              </div>';
        html += '            </div>';
      }
      html += '          </div>';
    } else {
      html += '          <p class="text-xs text-text-muted bg-backdrop/20 border border-border/25 rounded-lg p-3 text-center">No transfer timeline recorded.</p>';
    }
    html += '        </div>';

    html += '      </div>'; // ─── END TRANSFERS TAB ───
  }

  // Tab Panel 3: designations
  if ((state.mode === "full_manager" || state.mode === "head_coach") && trV2 && trV2.designations && trV2.designations.length > 0) {
    html += '      <div id="results-panel-designations" class="results-tab-panel space-y-4" style="display: none;">';
    html += '        <div class="flex items-center justify-between">';
    html += '          <h4 class="text-xs font-bold text-white uppercase tracking-wider font-mono">Squad Designations & Roster Strategy</h4>';
    html += '          <span class="text-[10px] text-text-muted">High-density strategist overview</span>';
    html += '        </div>';
    html += '        <div class="border border-border/40 rounded-lg overflow-hidden max-h-[500px] overflow-y-auto scrollbar-thin shadow-inner bg-backdrop/10">';
    html += '          <table class="w-full text-xs text-left table-auto">';
    html += '            <thead class="sticky top-0 z-10 bg-[#141414] border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-text-muted shadow">';
    html += '              <tr>';
    html += '                <th class="py-2 px-3">Player</th>';
    html += '                <th class="py-2 px-3">Position</th>';
    html += '                <th class="py-2 px-3 text-center">Age</th>';
    html += '                <th class="py-2 px-3 text-right">Fit</th>';
    html += '                <th class="py-2 px-3 text-center">Status</th>';
    html += '                <th class="py-2 px-3">Strategy / Reason</th>';
    html += '              </tr>';
    html += '            </thead>';
    html += '            <tbody class="divide-y divide-border/20">';

    var sortedDesignations = trV2.designations.slice().sort(function (a, b) {
      var weight = { Sell: 0, Depth: 1, Keep: 2 };
      var wA = weight[a.designation] !== undefined ? weight[a.designation] : 9;
      var wB = weight[b.designation] !== undefined ? weight[b.designation] : 9;
      if (wA !== wB) return wA - wB;
      return (b.score || 0) - (a.score || 0);
    });

    for (var di = 0; di < sortedDesignations.length; di++) {
      var d = sortedDesignations[di];
      var statusColor = d.designation === "Keep" ? "bg-green-500/10 text-green-400 border border-green-500/20" : d.designation === "Depth" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20";
      var relHint = d.unreliable ? " (unreliable)" : "";
      
      html += '              <tr class="hover:bg-surface-hover/30 transition-colors">';
      html += '                <td class="py-2 px-3 font-semibold text-white">' + escHtml(d.player.Name) + '</td>';
      html += '                <td class="py-2 px-3 text-text-muted truncate max-w-[120px]">' + escHtml(d.player.Position || "") + '</td>';
      html += '                <td class="py-2 px-3 text-center text-text-secondary">' + (d.player.Age || 0) + '</td>';
      html += '                <td class="py-2 px-3 text-right text-text-secondary font-mono">' + (d.score > 0 ? d.score.toFixed(1) : "\u2014") + '</td>';
      html += '                <td class="py-2 px-3 text-center">';
      html += '                  <span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider inline-block ' + statusColor + '">' + d.designation + '</span>';
      html += '                </td>';
      html += '                <td class="py-2 px-3 text-[11px] text-text-muted truncate max-w-[200px]" title="' + escHtml(d.reason || "") + '">';
      html += '                  ' + escHtml(d.reason || "") + (relHint ? " <span class='text-red-400'>" + relHint + "</span>" : "");
      html += '                </td>';
      html += '              </tr>';
    }

    html += '            </tbody>';
    html += '          </table>';
    html += '        </div>';
    html += '      </div>';
  }

    html += renderSeasonOverviewPanel(state);

    // Bid Consult Panel
    html += '      <div id="results-panel-bid" class="results-tab-panel" style="display: none;">';
    html += '        <div id="bid-consultation-results"></div>';
    html += '      </div>';

    html += '    </div>'; // end panels wrapper
  html += '  </div>'; // ─── END RIGHT COLUMN ───
  html += '</div>'; // ─── END GRID ───

  return html;
}

function renderSeasonOverviewPanel(state) {
  var board = window.FM24State.board || {};
  var history = sanitizeHistory(state);
  
  var html = '<div id="results-panel-season" class="results-tab-panel space-y-6" style="display: none;">';
  
  if (history.length === 0) {
    html += '  <div class="text-center py-12 bg-backdrop/10 border border-dashed border-border rounded-xl">';
    html += '    <div class="text-3xl mb-3">📁</div>';
    html += '    <h4 class="text-sm font-bold text-white uppercase tracking-wider mb-1">No Window History</h4>';
    html += '    <p class="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">Complete your first transfer window to begin recording your career timeline, tracking squad evolution, and profiling player development arcs.</p>';
    html += '  </div>';
    html += '</div>';
    return html;
  }
  
  // ─── 1. TENURE SCORECARD & PREVIEW GRID ───
  html += '  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
  
  // Tenure Card
  var totalSpend = 0;
  var totalSales = 0;
  var totalBusts = 0;
  history.forEach(function (w) {
    totalSpend += (w.spent || 0);
    totalSales += (w.sales || 0);
    totalBusts += (w.busts || 0);
  });
  
  // Calculate Overall Quality Delta
  var initialQuality = history[0] ? history[0].startSquadAvgQuality : 0;
  var currentQuality = history[history.length - 1] ? history[history.length - 1].endSquadAvgQuality : 0;
  var qualityDelta = currentQuality - initialQuality;
  var qDeltaColor = qualityDelta >= 0 ? "text-green-400" : "text-red-400";
  var qDeltaSign = qualityDelta >= 0 ? "+" : "";
  
  html += '    <div class="bg-surface border border-border/60 rounded-xl p-4 space-y-3.5">';
  html += '      <div class="flex items-center justify-between border-b border-border/20 pb-2">';
  html += '        <h4 class="text-xs font-bold text-white uppercase tracking-wider font-mono">Manager Tenure Summary</h4>';
  html += '        <span class="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-bold uppercase rounded-full tracking-wider">Active</span>';
  html += '      </div>';
  html += '      <div class="grid grid-cols-2 gap-3">';
  html += '        <div>';
  html += '          <span class="text-[10px] text-text-muted uppercase tracking-wider block font-medium">Windows Completed</span>';
  html += '          <span class="text-lg font-black text-white font-mono">' + history.length + '</span>';
  html += '        </div>';
  html += '        <div>';
  html += '          <span class="text-[10px] text-text-muted uppercase tracking-wider block font-medium">Squad Quality Evolution</span>';
  html += '          <span class="text-lg font-black text-white font-mono">' + initialQuality.toFixed(1) + ' → ' + currentQuality.toFixed(1) + ' <span class="text-xs ' + qDeltaColor + '">(' + qDeltaSign + qualityDelta.toFixed(1) + ')</span></span>';
  html += '        </div>';
  html += '        <div>';
  html += '          <span class="text-[10px] text-text-muted uppercase tracking-wider block font-medium">Cumulative Spend</span>';
  html += '          <span class="text-lg font-black text-red-400 font-mono">£' + formatCurrency(totalSpend) + '</span>';
  html += '        </div>';
  html += '        <div>';
  html += '          <span class="text-[10px] text-text-muted uppercase tracking-wider block font-medium">Cumulative Sales</span>';
  html += '          <span class="text-lg font-black text-green-400 font-mono">£' + formatCurrency(totalSales) + '</span>';
  html += '        </div>';
  html += '      </div>';
  // 6.3 Board Objective Arc in tenure card
  var boardArcs = board.objectiveArcs || [];
  var activeArc = boardArcs.find(function (a) { return a.status === 'ACTIVE'; });
  if (activeArc) {
    html += '      <div class="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">';
    html += '        <div class="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">Strategic Objective</div>';
    html += '        <div class="text-[10px] text-text-secondary">' + escHtml(activeArc.description) + '</div>';
    html += '        <div class="text-[9px] text-text-muted mt-1">' + activeArc.windowsRemaining + ' window' + (activeArc.windowsRemaining !== 1 ? 's' : '') + ' remaining</div>';
    html += '      </div>';
  }
  html += '    </div>';
  
  // Next Window Preview
  var upcomingWindowIndex = history.length + 1;
  var isSummer = upcomingWindowIndex % 2 === 1;
  var nextWindowLabel = "W" + upcomingWindowIndex + " " + (isSummer ? "Summer" : "Winter") + " Forecast";
  var confidence = board.confidence !== undefined ? board.confidence : 70;
  
  // Financial Forecast
  var baseAllocation = isSummer ? 40000000 : 15000000;
  var budgetModifier = 1.0;
  var forecastMsg = "";
  var forecastColor = "text-text-secondary";
  
  if (confidence >= 85) {
    budgetModifier = 1.25;
    forecastMsg = "Excellent relationship: Board grants a 25% budget premium.";
    forecastColor = "text-green-400";
  } else if (confidence >= 70) {
    budgetModifier = 1.05;
    forecastMsg = "Positive standing: Board grants a 5% budget premium.";
    forecastColor = "text-emerald-400";
  } else if (confidence < 50) {
    budgetModifier = 0.75;
    forecastMsg = "Warning: Strict 25% budget reduction imposed due to low board confidence.";
    forecastColor = "text-red-400";
  } else {
    forecastMsg = "Stable board stance: Standard budget allocation expected.";
  }
  
  var expectedBudget = baseAllocation * budgetModifier;
  
  // Find weakest tactical slot
  var weakestSlot = "None";
  var weakestScore = 999;
  var squad = window.FM24State.squad || [];
  var tactic = state.generatedTactic || window.FM24State.tactic || {};
  
  if (tactic.slots) {
    Object.keys(tactic.slots).forEach(function (sid) {
      var slot = tactic.slots[sid];
      if (slot && slot.roleId) {
        // Find player currently assigned
        var pName = slot.playerName;
        if (pName) {
          var player = squad.find(function (p) { return p.Name === pName; });
          if (player) {
            var sc = scorePlayerForRole(player, slot.roleId, tactic.instructions || {});
            var scoreVal = sc ? sc.total : 0;
            if (scoreVal < weakestScore) {
              weakestScore = scoreVal;
              weakestSlot = sid;
            }
          }
        }
      }
    });
  }
  
  // Relationship Forecast
  var mgrRel = state.relationshipIndex !== undefined ? state.relationshipIndex : 60;
  var relForecastMsg = mgrRel >= 75
    ? (state.hired ? escHtml(state.hired.Name) : "Manager") + ' will push harder on transfer targets — high trust'
    : mgrRel <= 40
    ? (state.hired ? escHtml(state.hired.Name) : "Manager") + ' will be resistant — relationship needs repair'
    : 'Standard window expected';

  html += '    <div class="bg-surface border border-border/60 rounded-xl p-4 space-y-3.5">';
  html += '      <div class="flex items-center justify-between border-b border-border/20 pb-2">';
  html += '        <h4 class="text-xs font-bold text-white uppercase tracking-wider font-mono">' + nextWindowLabel + '</h4>';
  html += '        <span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-bold uppercase rounded-full tracking-wider">Forecast</span>';
  html += '      </div>';
  html += '      <div class="space-y-2 text-xs">';
  html += '        <div class="flex justify-between items-center">';
  html += '          <span class="text-text-muted">Expected Transfer Budget:</span>';
  html += '          <span class="font-extrabold text-white font-mono">£' + formatCurrency(expectedBudget) + '</span>';
  html += '        </div>';
  html += '        <div class="flex justify-between items-center">';
  html += '          <span class="text-text-muted">Standing Adjustment:</span>';
  html += '          <span class="font-semibold ' + forecastColor + '">' + forecastMsg + '</span>';
  html += '        </div>';
  html += '        <div class="flex justify-between items-center">';
  html += '          <span class="text-text-muted">Relationship Forecast:</span>';
  html += '          <span class="font-semibold text-text-secondary">' + relForecastMsg + '</span>';
  html += '        </div>';
  html += '        <div class="flex justify-between items-center border-t border-border/20 pt-2 mt-2">';
  html += '          <span class="text-text-muted">Primary Transfer Mandate Recommendation:</span>';
  html += '          <span class="font-extrabold text-blue-400 uppercase tracking-wider font-mono">' + weakestSlot + ' (Reinforcement)</span>';
  html += '        </div>';
  html += '      </div>';
  html += '    </div>';
  
  html += '  </div>'; // end scorecard/preview grid
  
  // ─── 2. SQUAD EVOLUTION TRACKER (TREND MAP) ───
  html += '  <div class="bg-surface border border-border/40 rounded-xl p-4 space-y-3">';
  html += '    <h4 class="text-xs font-bold text-white uppercase tracking-wider font-mono">Squad Quality Development Trend</h4>';
  html += '    <div class="flex flex-wrap items-center gap-2 py-2">';
  
  // First item: baseline
  html += '      <div class="bg-backdrop/40 border border-border/55 rounded-lg px-3 py-2 text-center min-w-[80px] shadow-sm">';
  html += '        <span class="text-[9px] text-text-muted uppercase tracking-wider block font-semibold">Baseline</span>';
  html += '        <span class="text-sm font-black text-white font-mono">' + initialQuality.toFixed(1) + '</span>';
  html += '      </div>';
  
  history.forEach(function (w, idx) {
    var delta = w.endSquadAvgQuality - w.startSquadAvgQuality;
    var dColor = delta >= 0 ? "text-green-400" : "text-red-400";
    var dSign = delta >= 0 ? "▲" : "▼";
    var dValStr = delta !== 0 ? dSign + Math.abs(delta).toFixed(1) : "—";
    
    html += '      <div class="text-text-muted font-bold text-lg px-1">→</div>';
    
    html += '      <div class="bg-backdrop/40 border border-border/55 rounded-lg px-3 py-2 text-center min-w-[100px] shadow-sm hover:border-blue-500/40 transition-colors cursor-help" title="Window budget: £' + formatCurrency(w.budget) + ', spent: £' + formatCurrency(w.spent) + '">';
    html += '        <span class="text-[9px] text-text-muted uppercase tracking-wider block font-semibold">' + w.label + '</span>';
    html += '        <span class="text-sm font-black text-white font-mono">' + w.endSquadAvgQuality.toFixed(1) + '</span>';
    html += '        <span class="text-[9px] font-bold block ' + dColor + ' mt-0.5">' + dValStr + '</span>';
    html += '      </div>';
  });
  
  html += '    </div>';
  html += '  </div>';
  
  // ─── 3. WINDOW HISTORY DASHBOARD ───
  html += '  <div class="space-y-2">';
  html += '    <div class="flex items-center justify-between">';
  html += '      <h4 class="text-xs font-bold text-white uppercase tracking-wider font-mono">Window-by-Window Ledger & Timeline</h4>';
  html += '      <span class="text-[10px] text-text-muted">Click row to expand day-by-day event log</span>';
  html += '    </div>';
  html += '    <div class="border border-border/40 rounded-lg overflow-hidden bg-backdrop/10 shadow-sm">';
  html += '      <table class="w-full text-xs text-left table-auto">';
  html += '        <thead class="bg-[#141414] border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-text-muted">';
  html += '          <tr>';
  html += '            <th class="py-2 px-3">Window</th>';
  html += '            <th class="py-2 px-3 text-right">Budget</th>';
  html += '            <th class="py-2 px-3 text-right">Spent</th>';
  html += '            <th class="py-2 px-3 text-center">Sales</th>';
  html += '            <th class="py-2 px-3 text-center">Signed</th>';
  html += '            <th class="py-2 px-3 text-center">Busts</th>';
  html += '            <th class="py-2 px-3 text-center">Mandates</th>';
  html += '            <th class="py-2 px-3 text-center">Rel</th>';
  html += '            <th class="py-2 px-3 text-center">Arc</th>';
  html += '            <th class="py-2 px-3 text-right">Start → End XI</th>';
  html += '          </tr>';
  html += '        </thead>';
  html += '        <tbody class="divide-y divide-border/20">';
  
  history.forEach(function (w, idx) {
    var delta = w.endSquadAvgQuality - w.startSquadAvgQuality;
    var dColor = delta >= 0 ? "text-green-400" : "text-red-400";
    var dSign = delta >= 0 ? "+" : "";
    
    html += '          <tr class="window-history-row hover:bg-surface-hover/30 transition-colors cursor-pointer" data-window-idx="' + idx + '">';
    html += '            <td class="py-2.5 px-3 font-semibold text-white flex items-center gap-1.5">';
    html += '              <span class="text-[10px] text-text-muted select-none">▶</span> ' + w.label;
    html += '            </td>';
    html += '            <td class="py-2.5 px-3 text-right text-text-secondary font-mono">£' + formatCurrency(w.budget) + '</td>';
    html += '            <td class="py-2.5 px-3 text-right text-text-secondary font-mono">£' + formatCurrency(w.spent) + '</td>';
    html += '            <td class="py-2.5 px-3 text-center text-text-secondary font-mono">' + (w.salesCount !== undefined ? w.salesCount : w.sales) + '</td>';
    html += '            <td class="py-2.5 px-3 text-center text-text-secondary font-mono">' + w.signed + '</td>';
    html += '            <td class="py-2.5 px-3 text-center text-text-secondary font-mono">' + w.busts + '</td>';
    
    // Mandates Passed / Failed indicators
    var mandHtml = "";
    if (w.mandates === "—") {
      mandHtml = '<span class="text-text-muted">—</span>';
    } else {
      for (var mi = 0; mi < w.mandates.length; mi++) {
        var char = w.mandates[mi];
        if (char === "✓") mandHtml += '<span class="text-green-400 font-extrabold mx-0.5">✓</span>';
        else if (char === "✗") mandHtml += '<span class="text-red-400 font-extrabold mx-0.5">✗</span>';
      }
    }
    
    html += '            <td class="py-2.5 px-3 text-center font-mono">' + mandHtml + '</td>';
    
    var relColor = w.rel >= 80 ? "text-green-400" : w.rel >= 50 ? "text-yellow-400" : "text-red-400";
    html += '            <td class="py-2.5 px-3 text-center font-bold font-mono ' + relColor + '">' + w.rel + '</td>';
    var arcIcon = w.arcCompleted ? '<span class="text-green-400 text-[10px]" title="' + escHtml(w.arcCompleted) + '">\u2713</span>' : '<span class="text-text-muted text-[9px]">\u2014</span>';
    html += '            <td class="py-2.5 px-3 text-center font-mono">' + arcIcon + '</td>';
    html += '            <td class="py-2.5 px-3 text-right text-text-secondary font-mono">' + w.startSquadAvgQuality.toFixed(1) + ' → ' + w.endSquadAvgQuality.toFixed(1) + ' <span class="text-[10px] ' + dColor + '">(' + dSign + delta.toFixed(1) + ')</span></td>';
    html += '          </tr>';
    
    // Accordion Expanded Detail Drawer
    html += '          <tr id="window-detail-' + idx + '" class="window-detail-drawer" style="display: none; background-color: rgba(0,0,0,0.2);">';
    html += '            <td colspan="10" class="p-4 border-t border-border/40">';
    html += '              <div class="space-y-3">';
    html += '                <h5 class="text-[10px] font-bold text-white uppercase tracking-wider font-mono">Day-by-Day Transfer Window Timeline</h5>';
    
    if (w.eventLog && w.eventLog.length > 0) {
      html += '                <div class="timeline-container relative pl-6 space-y-4 border-l border-border/30 max-h-[300px] overflow-y-auto scrollbar-thin py-2">';
      w.eventLog.forEach(function (ev) {
        var typeClass = ev.type ? ev.type.toLowerCase() : 'info';
        var badgeColor = 'bg-blue-500';
        if (typeClass === 'signed') badgeColor = 'bg-green-500';
        else if (typeClass === 'collapsed') badgeColor = 'bg-red-500';
        else if (typeClass === 'redirect') badgeColor = 'bg-purple-500';
        else if (typeClass === 'rival_interest' || typeClass === 'rival_inflated' || typeClass === 'rival_interest_detected') badgeColor = 'bg-yellow-500';
        else if (typeClass === 'sold' || typeClass === 'released') badgeColor = 'bg-orange-500';
        else if (typeClass === 'loan') badgeColor = 'bg-indigo-500';

        html += '                  <div class="timeline-item relative">';
        html += '                    <div class="timeline-badge absolute -left-[31.5px] top-[2px] w-[11px] h-[11px] rounded-full border-2 border-[#1c1c1e] ' + badgeColor + '"></div>';
        html += '                    <div class="timeline-content text-[11px] leading-relaxed">';
        html += '                      <span class="text-text-muted font-bold mr-2">Day ' + ev.day + ':</span>';
        html += '                      <span class="text-text-secondary">' + escHtml(ev.detail) + '</span>';
        html += '                    </div>';
        html += '                  </div>';
      });
      html += '                </div>';
    } else {
      html += '                <p class="text-text-muted text-[11px]">No events were logged during this transfer window.</p>';
    }
    
    html += '              </div>';
    html += '            </td>';
    html += '          </tr>';
  });
  
  html += '        </tbody>';
  html += '      </table>';
  html += '    </div>';
  html += '  </div>';
  
  // ─── 4. PLAYER CAREER ARCS ───
  var signingHistory = board.signingHistory || [];
  html += '  <div class="space-y-2">';
  html += '    <h4 class="text-xs font-bold text-white uppercase tracking-wider font-mono">Player Career Development Arcs</h4>';
  html += '    <div class="border border-border/40 rounded-lg overflow-hidden bg-backdrop/10 shadow-sm">';
  html += '      <table class="w-full text-xs text-left table-auto">';
  html += '        <thead class="bg-[#141414] border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-text-muted">';
  html += '          <tr>';
  html += '            <th class="py-2 px-3">Player</th>';
  html += '            <th class="py-2 px-3">Age Signed</th>';
  html += '            <th class="py-2 px-3">Window</th>';
  html += '            <th class="py-2 px-3 text-right">Fee</th>';
  html += '            <th class="py-2 px-3">Role</th>';
  html += '            <th class="py-2 px-3 text-right">Quality at Signing</th>';
  html += '            <th class="py-2 px-3 text-right">Current Quality</th>';
  html += '            <th class="py-2 px-3 text-center">Development Status</th>';
  html += '          </tr>';
  html += '        </thead>';
  html += '        <tbody class="divide-y divide-border/20">';
  
  var activeSignings = signingHistory.filter(function (sig) {
    return sig.playerName !== undefined && sig.playerName !== null;
  });
  
  function cleanPlayerNameForCompare(name) {
    if (!name) return "";
    return name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u00a0\s]+/g, " ");
  }

  if (activeSignings.length > 0) {
    var loanedOut = state.loanedOutPlayers || [];
    activeSignings.forEach(function (sig) {
      var currentSq = null;
      var roleId = sig.roleId || "";
      var currVal = null;
      var statusText = "Departed/Sold";
      var statusColor = "bg-red-500/10 text-red-400 border border-red-500/20";
      var isLoaned = false;
      
      var sigNameClean = cleanPlayerNameForCompare(sig.playerName);
      // Check active squad first
      for (var pi = 0; pi < squad.length; pi++) {
        if (cleanPlayerNameForCompare(squad[pi].Name) === sigNameClean) {
          currentSq = squad[pi];
          break;
        }
      }
      // If not in squad, check loanedOutPlayers
      if (!currentSq) {
        for (var li = 0; li < loanedOut.length; li++) {
          var lop = loanedOut[li];
          var lopName = lop.Name || (lop.player && lop.player.Name);
          if (cleanPlayerNameForCompare(lopName) === sigNameClean) {
            currentSq = lop;
            isLoaned = true;
            break;
          }
        }
      }
      
      if (currentSq) {
        if (roleId) {
          var sc = scorePlayerForRole(currentSq, roleId, tactic.instructions || {});
          currVal = typeof PlayerUtils !== "undefined" ? PlayerUtils.slotQuality(currentSq, sc ? sc.total : 0) : (sc ? sc.total : 0);
          
          var devDelta = currVal - sig.slotQualityAtSigning;
          if (devDelta >= 1.5) {
            statusText = "★ Elite Dev";
            statusColor = "bg-green-500/10 text-green-400 border border-green-500/20";
          } else if (devDelta >= 0.5) {
            statusText = "▲ Steady Growth";
            statusColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
          } else if (devDelta >= -0.2) {
            statusText = "● Stable";
            statusColor = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
          } else {
            statusText = "▼ Declining";
            statusColor = "bg-orange-500/10 text-orange-400 border border-orange-500/20";
          }
          if (isLoaned) {
            statusText += " (Loan)";
            statusColor = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
          }
        } else {
          statusText = isLoaned ? "Active (Loan)" : "Active";
          statusColor = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
        }
      } else {
        if (sig.status === 'RELEASED') {
          statusText = "Released";
          statusColor = "bg-orange-500/10 text-orange-400 border border-orange-500/20";
        } else {
          var lastCompletedWindow = state.windowCount || 1;
          if (sig.windowIndex === lastCompletedWindow) {
            statusText = "Joined";
            statusColor = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
          }
        }
      }
      
      var windowLabel = "W" + sig.windowIndex + " " + (sig.windowIndex % 2 === 1 ? "Sum" : "Win");
      
      html += '          <tr class="hover:bg-surface-hover/20 transition-colors">';
      html += '            <td class="py-2 px-3 font-semibold text-white">' + escHtml(sig.playerName) + '</td>';
      html += '            <td class="py-2 px-3 text-text-secondary">' + sig.age + '</td>';
      html += '            <td class="py-2 px-3 text-text-muted">' + windowLabel + '</td>';
      html += '            <td class="py-2 px-3 text-right text-text-secondary font-mono">£' + formatCurrency(sig.fee) + '</td>';
      html += '            <td class="py-2 px-3 text-text-muted truncate max-w-[100px]">' + escHtml(roleId) + '</td>';
      html += '            <td class="py-2 px-3 text-right text-text-secondary font-mono">' + (sig.slotQualityAtSigning !== undefined ? sig.slotQualityAtSigning.toFixed(1) : '—') + '</td>';
      html += '            <td class="py-2 px-3 text-right text-text-secondary font-mono">' + (currVal !== null ? currVal.toFixed(1) : "—") + '</td>';
      html += '            <td class="py-2 px-3 text-center">';
      html += '              <span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider inline-block ' + statusColor + '">' + statusText + '</span>';
      html += '            </td>';
      html += '          </tr>';
    });
  } else {
    html += '          <tr>';
    html += '            <td colspan="8" class="py-4 text-center text-text-muted">No players signed yet.</td>';
    html += '          </tr>';
  }
  
  // Loaned-out players not in signingHistory (youth intake / pre-existing squad)
  var loanedOut = state.loanedOutPlayers || [];
  var shNames = {};
  activeSignings.forEach(function (sig) {
    if (sig.playerName) shNames[cleanPlayerNameForCompare(sig.playerName)] = true;
  });
  if (loanedOut.length > 0) {
    loanedOut.forEach(function (lop) {
      var lopNameRaw = lop.Name || (lop.player && lop.player.Name) || 'Unknown';
      if (shNames[cleanPlayerNameForCompare(lopNameRaw)]) return;
      var lopAge = lop.Age || (lop.player && lop.player.Age) || 0;
      var lopPos = lop.Position || lop.BestPosition || (lop.player && (lop.player.Position || lop.player.BestPosition)) || '';
      html += '          <tr class="opacity-80">';
      html += '            <td class="py-2 px-3 font-semibold text-white">' + escHtml(lopNameRaw) + ' <span class="text-[9px] text-text-muted ml-1">(on loan)</span></td>';
      html += '            <td class="py-2 px-3 text-text-secondary">' + lopAge + '</td>';
      html += '            <td class="py-2 px-3 text-text-muted">—</td>';
      html += '            <td class="py-2 px-3 text-right text-text-secondary font-mono">—</td>';
      html += '            <td class="py-2 px-3 text-text-muted truncate max-w-[100px]">' + escHtml(lopPos) + '</td>';
      html += '            <td class="py-2 px-3 text-right text-text-secondary font-mono">—</td>';
      html += '            <td class="py-2 px-3 text-right text-text-secondary font-mono">—</td>';
      html += '            <td class="py-2 px-3 text-center">';
      html += '              <span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider inline-block bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">LOANED</span>';
      html += '            </td>';
      html += '          </tr>';
    });
  }
  
  html += '        </tbody>';
  html += '      </table>';
  html += '    </div>';
  html += '  </div>';
  
  html += '</div>';
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
  var transArch = typeof resolveTransferArchetype === "function" ? resolveTransferArchetype(manager) : "OPPORTUNIST";
  var html = "";

  // Header
  html += '<div class="flex items-start justify-between mb-3">';
  html += '<div>';
  html += '<div class="text-sm font-bold text-white">' + escHtml(manager.Name) + "</div>";
  html += '<div class="text-xs text-text-muted">' + escHtml(manager["Preferred Job"] || "") + " \u2022 CA " + (manager.CA || 0) + "</div>";
  html += '<div class="text-xs text-green-400 mt-1">Tactical: ' + escHtml(archetype) + "</div>";
  html += '<div class="text-xs text-blue-400">Transfer: ' + escHtml(transArch) + "</div>";
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

  // Squad Identity (DNA)
  if (typeof computeSquadDNA === 'function' && squad && squad.length > 0) {
    var sdna = computeSquadDNA(squad);
    var scoh = null;
    if (typeof computeCoherenceScore === 'function' && window.FM24State.tactic && window.FM24State.tactic.isComplete) {
      scoh = computeCoherenceScore(sdna, manager, window.FM24State.tactic);
    }
    var dnaTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    html += '<div class="dna-profile-section">';
    html += '  <div class="dna-profile-section-header">Squad Identity</div>';
    html += '  <div class="dna-profile-body">';
    html += '    <div class="dna-profile-badge-wrap">';
    html += (typeof renderDNABadge === 'function' ? renderDNABadge(sdna, 140, dnaTheme) : '');
    html += '      <div class="dna-profile-label">' + sdna.profile + '</div>';
    html += '    </div>';
    html += '    <div class="dna-profile-coherence">';
    if (scoh) {
      html += '      <div class="dna-section-label">Philosophy Coherence</div>';
      html += (typeof renderCoherenceBadge === 'function' ? renderCoherenceBadge(scoh, false) : '');
    }
    html += '      <div class="dna-profile-axis-list">';
    html += (typeof renderAxisBreakdown === 'function' ? renderAxisBreakdown(sdna) : '');
    html += '      </div>';
    html += '    </div>';
    html += '  </div>';
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
  html += 'Marking: ' + escHtml(manager["Marking Style"] || "\u2014") + "<br>";
  html += 'Transfer Archetype: ' + escHtml(transArch);
  html += '</div></div>';

  // Hire button
  html += '<button class="text-xs px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors w-full" id="profile-hire-btn">Hire ' + escHtml(manager.Name) + "</button>";

  content.innerHTML = html;
  modal.classList.remove("hidden");

  document.getElementById("profile-hire-btn").addEventListener("click", function () {
    // 6.2 Capture original manager attributes for development tracking
    if (!manager._originalAttributes) {
      manager._originalAttributes = {
        Tac_Knw: manager["Tac Knw"] || manager["Tac_Knw"] || 0,
        Judge_P: manager["Judge P"] || manager["Judge_P"] || 0,
        Judge_A: manager["Judge A"] || manager["Judge_A"] || 0,
        Det: manager.Det || 0,
        Prof: manager.Prof || 0,
        Youth: manager.Youth || 0
      };
    }
    window.FM24State.manager.hired = manager;
    window.FM24State.manager.mode = "head_coach"; // Default to Head Coach
    window.FM24State.manager.generatedTactic = null;
    window.FM24State.manager.report = null;
    window.FM24State.manager.gaps = [];
    window.FM24State.manager.recommendations = [];
    window.FM24State.manager.windowActive = false;
    window.FM24State.manager.windowStage = null;
    applyManagerTacticAutomatically(manager, window.FM24State.squad);
    updateTacticalAnalysis(true);
    modal.classList.add("hidden");
    renderManagerView();
    if (window.FM24State.appMode === "dof" && typeof window.FM24SwitchTab === "function") {
      window.FM24SwitchTab("dashboard");
    }
  });
}

// ─── PHASE 1: MANAGER INTEREST CALCULATION ───

function calculateManagerInterest(manager, squad, boardState) {
  var mgrCA = Math.max(100, parseInt(manager.CA, 10) || 100);
  var ambition = manager.Ambition || manager.Determination || 10;
  var noSquadFallback = false;

  // Step 1 — avgCA
  var avgCA = 110;
  if (squad && squad.length > 0) {
    var sum = 0, validCount = 0;
    for (var i = 0; i < squad.length; i++) {
      var caVal = parseInt(squad[i].CA, 10);
      if (!isNaN(caVal) && caVal > 0) {
        sum += caVal;
        validCount++;
      }
    }
    avgCA = validCount > 0 ? sum / validCount : 110;
    noSquadFallback = false;
  } else {
    noSquadFallback = true;
  }

  // Step 2 — minRequiredAvgCA (tiered curve)
  var minReq;
  if (mgrCA < 100) {
    minReq = 90;
  } else if (mgrCA >= 100 && mgrCA <= 139) {
    minReq = (mgrCA - 100) * 0.60 + 95;
  } else if (mgrCA >= 140 && mgrCA <= 159) {
    minReq = (mgrCA - 140) * 0.80 + 119;
  } else {
    minReq = (mgrCA - 160) * 1.00 + 135;
  }

  // Step 3 — boardPenalty
  if (boardState) {
    if (boardState.stage === 'PRESSURE') minReq += 5;
    if (boardState.stage === 'DISMISSAL_RISK') minReq += 10;
  }

  // Step 4 — philosophyFit adjustment
  var squadDNA = window.FM24State.manager.squadDNA;
  if (squadDNA && typeof deriveManagerPhilosophy === 'function') {
    var mgrPhil = deriveManagerPhilosophy(manager);
    var mismatch = 0;
    if (mgrPhil && mgrPhil.scores) {
      var mgrPressing = mgrPhil.scores['aggressive high-press tactician'] || 0;
      var mgrPossession = mgrPhil.scores['possession-oriented tactician'] || 0;
      var sqPressing = squadDNA.pressing || 0;
      var sqPossession = squadDNA.possession || 0;
      mismatch = Math.abs(mgrPressing - sqPressing) + Math.abs(mgrPossession - sqPossession);
      if (mismatch > 30) minReq += 3;
    }
  }

  // Step 5 — diff
  var diff = avgCA - minReq;

  // Step 6 — interestBand
  var band, label, color;
  if (diff < -10) {
    band = 'LOCKED'; label = 'Not Interested'; color = 'interest-locked';
  } else if (diff < -3) {
    band = 'RELUCTANT'; label = 'Hard to Convince'; color = 'interest-reluctant';
  } else if (diff < 5) {
    band = 'OPEN'; label = 'Considering'; color = 'interest-open';
  } else {
    band = 'EAGER'; label = 'Interested'; color = 'interest-eager';
  }

  return {
    band: band,
    label: label,
    color: color,
    canApproach: band !== 'LOCKED',
    diff: diff,
    avgCA: Math.round(avgCA),
    minRequiredAvgCA: Math.round(minReq),
    noSquadFallback: noSquadFallback,
    reluctantThreshold: null // set later during interview
  };
}

// ─── PHASE 2: INTERVIEW SYSTEM V2 ───

// ─── V2 HELPERS ───

function weightedPick(pool, manager, state, gaps, qWeights) {
  var weights = pool.map(function (t) {
    var w = 1.0;
    if (typeof t.weight === 'function') {
      w = t.weight(manager, state, gaps, qWeights);
    }
    return Math.max(0.1, w);
  });
  var total = weights.reduce(function (s, w) { return s + w; }, 0);
  var r = Math.random() * total;
  var cursor = 0;
  for (var i = 0; i < pool.length; i++) {
    cursor += weights[i];
    if (r <= cursor) return pool[i];
  }
  return pool[pool.length - 1];
}

function interpolate(text, manager, state, gaps, tokenCache) {
  if (!text) return '';
  var tokens = tokenCache || buildTokenCache(manager, state, gaps);
  return text.replace(/\{\{([^}]+)\}\}/g, function (_, key) {
    return tokens[key] !== undefined && tokens[key] !== null ? String(tokens[key]) : '';
  });
}

function buildTokenCache(manager, state, gaps) {
  var squad = state.squad || [];
  var squadLen = squad.length;
  var avgCA = 110;
  var avgAge = 26;
  var topPlayer = null;
  if (squadLen > 0) {
    var caSum = 0, caCount = 0, ageSum = 0;
    var topCA = 0;
    for (var si = 0; si < squadLen; si++) {
      var p = squad[si];
      var ca = parseFloat(p.CA) || 0;
      if (ca > 0) { caSum += ca; caCount++; }
      if (ca > topCA) { topCA = ca; topPlayer = p; }
      ageSum += parseFloat(p.Age) || 0;
    }
    avgCA = caCount > 0 ? caSum / caCount : 110;
    avgAge = squadLen > 0 ? ageSum / squadLen : 26;
  }
  var hist = state.manager.hireHistory || [];
  var lastHire = hist.length > 0 ? hist[hist.length - 1] : null;
  var mgrPhil = null;
  if (typeof deriveManagerPhilosophy === 'function') {
    mgrPhil = deriveManagerPhilosophy(manager);
  }
  var philStr = 'my system';
  if (mgrPhil) {
    if (mgrPhil.primaryStyle) philStr = mgrPhil.primaryStyle;
    else if (mgrPhil.label) philStr = mgrPhil.label;
  }
  return {
    'mgr.name': manager.Name || 'I',
    'mgr.age': manager.Age || '',
    'mgr.ca': manager.CA || '',
    'mgr.philosophy': philStr,
    'mgr.formation': manager['Preferred Formation'] || 'my preferred system',
    'mgr.mentality': manager['Playing Mentality'] || 'my approach',
    'squad.avgca': Math.round(avgCA),
    'squad.count': squadLen,
    'squad.topname': topPlayer ? topPlayer.Name : 'your best player',
    'squad.weakpos': gaps && gaps[0] ? (gaps[0].position || 'key positions') : 'key positions',
    'squad.weakslot': gaps && gaps[0] ? (gaps[0].slotId || 'midfield') : 'midfield',
    'squad.age': Math.round(avgAge),
    'budget.transfer': typeof formatCurrency === 'function' ? formatCurrency(state.manager.budget || 0) : String(state.manager.budget || 0),
    'budget.wage': typeof formatCurrency === 'function' ? formatCurrency(state.manager.wageBudget || 0) : String(state.manager.wageBudget || 0),
    'board.stage': (state.board && state.board.stage) || 'NORMAL',
    'board.confidence': (state.board && state.board.confidence) || 70,
    'prev.manager': lastHire ? lastHire.name : 'your previous manager',
    'prev.outcome': lastHire ? (lastHire.outcome || 'left the club') : null,
    'tactic.formation': (state.tactic && state.tactic.formation) ? state.tactic.formation : 'your current setup',
    'window.count': state.manager.windowCount || 0
  };
}

function deriveQuestionWeights(manager) {
  var tact = parseInt(manager['Tactical Knowledge'] || manager.Tac || manager.Tac_Knw || 10, 10);
  var man = parseInt(manager['Man Management'] || manager.Man || 10, 10);
  var det = parseInt(manager.Determination || manager.Det || 10, 10);
  var amb = parseInt(manager.Ambition || manager.Amb || 10, 10);
  var med = parseInt(manager['Media Handling'] || manager.Med || 10, 10);
  return {
    tacticalPrecision: tact / 20,
    squadHarmony: man / 20,
    authorityFocus: amb / 20,
    resultsDriven: det / 20,
    mediaAware: med / 20
  };
}

// ─── V2 QUESTION POOLS ───

var QA_GEGENPRESS = [
  {
    id: 'A_GEG_1', weight: function (mgr, state) {
      var s = state.squad || []; var ageSum = 0;
      s.forEach(function (p) { ageSum += p.Age || 0; });
      var avgAge = s.length > 0 ? ageSum / s.length : 26;
      return avgAge > 28 ? 0.3 : 1.5;
    },
    text: "My system will ask a lot physically — every player presses from the front. Looking at your squad (avgCA {{squad.avgca}}), can they sustain 90 minutes of high-intensity pressing?",
    context: "Gegenpress requires elite physical conditioning and squad depth.",
    answers: [
      { label: 'A', text: 'Conditioning is already a priority — we train for it.', alignmentDelta: 20, wageDelta: 0, promise: null },
      { label: 'B', text: "We'll need a pre-season to build that foundation.", alignmentDelta: 8, wageDelta: 0, promise: null },
      { label: 'C', text: "Some players will struggle. You may need to adapt the intensity.", alignmentDelta: -12, wageDelta: 0.08, promise: null }
    ]
  },
  {
    id: 'A_GEG_2', weight: function () { return 1.0; },
    text: "Gegenpressing only works with total defensive discipline. I need the team to press as a unit, not individually. Are you willing to enforce that culture from the top?",
    context: "Collective pressing discipline is the foundation of gegenpressing.",
    answers: [
      { label: 'A', text: "Absolutely — we'll back you in establishing that culture.", alignmentDelta: 18, wageDelta: 0, promise: null },
      { label: 'B', text: "Within reason — some players need more freedom.", alignmentDelta: 5, wageDelta: 0, promise: null },
      { label: 'C', text: "That level of rigidity might cost us certain players.", alignmentDelta: -10, wageDelta: 0.10, promise: null }
    ]
  },
  {
    id: 'A_GEG_3', weight: function (mgr, state) {
      return state.tactic && state.tactic.formation ? 2.0 : 0.1;
    },
    text: "I've looked at your {{tactic.formation}} setup. It doesn't naturally lend itself to gegenpressing. Are you prepared to change your tactical identity completely?",
    context: "Formation change may be required for gegenpress compatibility.",
    answers: [
      { label: 'A', text: "Yes — we'll adopt your system wholesale.", alignmentDelta: 22, wageDelta: 0, promise: null },
      { label: 'B', text: "We'll evolve gradually — hybrid approach initially.", alignmentDelta: 8, wageDelta: 0, promise: null },
      { label: 'C', text: "The formation stays — you adapt within it.", alignmentDelta: -18, wageDelta: 0.12, promise: null }
    ]
  },
  {
    id: 'A_GEG_4', weight: function (mgr, state) {
      return (state.squad || []).length < 18 ? 1.8 : 0.4;
    },
    text: "Gegenpressing demands squad depth — rotation is not optional, it's survival. With {{squad.count}} senior players, do you have the depth to rotate through a high-press system?",
    context: "Squad depth is vital for sustaining a high-press approach.",
    answers: [
      { label: 'A', text: "We'll recruit specifically for depth and work rate.", alignmentDelta: 15, wageDelta: 0, promise: { type: 'SIGN_ROLE', detail: 'physical', deadline: 1, fulfilled: false, broken: false } },
      { label: 'B', text: "It'll be tight but we can manage with smart rotation.", alignmentDelta: 5, wageDelta: 0, promise: null },
      { label: 'C', text: "You'll need to pick your moments — full press every game isn't realistic.", alignmentDelta: -8, wageDelta: 0.05, promise: null }
    ]
  }
];

var QA_POSSESSION = [
  {
    id: 'A_POS_1', weight: function () { return 1.0; },
    text: "I need footballers who can play under pressure — technically gifted, composed in tight spaces. Is {{squad.topname}} representative of what your squad can offer?",
    context: "Possession football requires high technical ability across the squad.",
    answers: [
      { label: 'A', text: "Yes — we've built around technical quality.", alignmentDelta: 18, wageDelta: 0, promise: null },
      { label: 'B', text: "We have pockets of quality but need improvement.", alignmentDelta: 6, wageDelta: 0, promise: { type: 'SIGN_ROLE', detail: 'technical', deadline: 2, fulfilled: false, broken: false } },
      { label: 'C', text: "Honestly, the squad is more physical than technical.", alignmentDelta: -10, wageDelta: 0.08, promise: null }
    ]
  },
  {
    id: 'A_POS_2', weight: function () { return 1.2; },
    text: "My system demands ball-playing defenders — centre-backs who are comfortable receiving under pressure and distributing. Can you guarantee that profile in your defensive recruitment?",
    context: "Ball-playing centre-backs are essential for playing out from the back.",
    answers: [
      { label: 'A', text: "We'll specifically target ball-playing profiles.", alignmentDelta: 20, wageDelta: 0, promise: { type: 'SIGN_ROLE', detail: 'DC', deadline: 2, fulfilled: false, broken: false } },
      { label: 'B', text: "We have one — we'd need to find a partner.", alignmentDelta: 10, wageDelta: 0, promise: null },
      { label: 'C', text: "Our defenders are more traditional — you'll need to adapt.", alignmentDelta: -12, wageDelta: 0.10, promise: null }
    ]
  },
  {
    id: 'A_POS_3', weight: function (mgr, state) {
      var squad = state.squad || [];
      var sum = 0, count = 0;
      squad.forEach(function (p) { var ca = p.CA || 0; if (ca > 0) { sum += ca; count++; } });
      var avg = count > 0 ? sum / count : 110;
      return avg < 115 ? 2.0 : 0.5;
    },
    text: "Possession football takes time to embed — results may dip before they improve. With a squad averaging CA {{squad.avgca}}, are you and the board patient enough to see it through?",
    context: "Patience is required when implementing a possession system.",
    answers: [
      { label: 'A', text: "We're committed to the process regardless of early results.", alignmentDelta: 20, wageDelta: 0, promise: null },
      { label: 'B', text: "The board wants progress — we have 18 months at most.", alignmentDelta: 3, wageDelta: 0, promise: null },
      { label: 'C', text: "We need results quickly. Can you deliver faster?", alignmentDelta: -15, wageDelta: 0.12, promise: null }
    ]
  },
  {
    id: 'A_POS_4', weight: function (mgr, state) {
      return state.tactic && state.tactic.formation ? 1.8 : 0.2;
    },
    text: "Your {{tactic.formation}} can work for my system if the roles are right. But I'll need to reshape how several players think about their positioning. Will you give me that time?",
    context: "Tactical reshaping requires time and patience.",
    answers: [
      { label: 'A', text: "Take whatever time you need — we're here for the long term.", alignmentDelta: 18, wageDelta: 0, promise: null },
      { label: 'B', text: "Six months to show progress, then we review.", alignmentDelta: 5, wageDelta: 0, promise: null },
      { label: 'C', text: "Players are set in their ways — don't expect a revolution.", alignmentDelta: -8, wageDelta: 0.05, promise: null }
    ]
  }
];

var QA_DIRECT = [
  {
    id: 'A_DIR_1', weight: function () { return 1.0; },
    text: "Transitions are everything in my system. I need explosive, decisive players in the final third. Can {{squad.topname}} lead that charge, or do we need to recruit?",
    context: "Counter-attacking football prioritises pace and direct passing.",
    answers: [
      { label: 'A', text: "We have the pace — the system fits our profile.", alignmentDelta: 18, wageDelta: 0, promise: null },
      { label: 'B', text: "We have some but will need one key signing.", alignmentDelta: 10, wageDelta: 0, promise: { type: 'SIGN_ROLE', detail: 'pace', deadline: 1, fulfilled: false, broken: false } },
      { label: 'C', text: "Honestly we're a bit slow up top — you'll need to adapt.", alignmentDelta: -10, wageDelta: 0.08, promise: null }
    ]
  },
  {
    id: 'A_DIR_2', weight: function () { return 1.2; },
    text: "Counter-attacking only works if we're defensively solid when out of possession. Low block, compact shape, no individual errors. Is that the defensive mentality here?",
    context: "Defensive solidity is foundational to counter-attacking systems.",
    answers: [
      { label: 'A', text: "Defensive solidity is non-negotiable — we enforce it.", alignmentDelta: 20, wageDelta: 0, promise: null },
      { label: 'B', text: "We're working on it — some defensive frailty remains.", alignmentDelta: 5, wageDelta: 0, promise: null },
      { label: 'C', text: "We've conceded too many this season — it's an issue.", alignmentDelta: -8, wageDelta: 0.05, promise: null }
    ]
  },
  {
    id: 'A_DIR_3', weight: function () { return 1.0; },
    text: "Direct football and set pieces go hand in hand. I want to weaponise dead balls — corners, free kicks, throw-ins. Is there appetite to invest time in that here?",
    context: "Set pieces are a key weapon in direct football.",
    answers: [
      { label: 'A', text: "Completely — set pieces are an underused weapon and we'll prioritise them.", alignmentDelta: 15, wageDelta: 0, promise: null },
      { label: 'B', text: "We work on them but it's not the main focus.", alignmentDelta: 5, wageDelta: 0, promise: null },
      { label: 'C', text: "Players aren't particularly strong aerially — may not suit us.", alignmentDelta: -5, wageDelta: 0, promise: null }
    ]
  },
  {
    id: 'A_DIR_4', weight: function (mgr, state) {
      return (state.manager.budget || 0) < 10000000 ? 2.0 : 0.4;
    },
    text: "Counter-attacking football is cost-efficient — you don't need galácticos. With {{budget.transfer}} to work with, I can make this work if you trust the process. Can you commit to that?",
    context: "Counter-attacking can be effective on a limited budget.",
    answers: [
      { label: 'A', text: "Fully — we back your judgement on recruitment.", alignmentDelta: 22, wageDelta: 0, promise: null },
      { label: 'B', text: "Within limits — some targets may be out of reach.", alignmentDelta: 8, wageDelta: 0, promise: null },
      { label: 'C', text: "The budget is tight and results are still expected quickly.", alignmentDelta: -10, wageDelta: 0.08, promise: null }
    ]
  }
];

var QA_DEFAULT = [
  {
    id: 'A_DEF_1', weight: function () { return 1.0; },
    text: "I have a clear philosophy and I don't bend it to fit circumstances. What level of tactical freedom are you offering me to implement my methods?",
    context: "Philosophy fit determines long-term tactical coherence.",
    answers: [
      { label: 'A', text: "Complete freedom — we'll build around your system.", alignmentDelta: 18, wageDelta: 0, promise: null },
      { label: 'B', text: "Freedom within our existing identity.", alignmentDelta: 5, wageDelta: 0, promise: null },
      { label: 'C', text: "You adapt to our players, not the other way around.", alignmentDelta: -12, wageDelta: 0.10, promise: null }
    ]
  },
  {
    id: 'A_DEF_2', weight: function (mgr, state) {
      return state.tactic && state.tactic.formation ? 1.5 : 0.8;
    },
    text: "I see you've been playing {{tactic.formation}}. That may or may not suit what I want to implement. I need to know you're open to a fundamental tactical shift if necessary.",
    context: "Tactical flexibility is important for long-term success.",
    answers: [
      { label: 'A', text: "Completely open — the formation is yours to decide.", alignmentDelta: 20, wageDelta: 0, promise: null },
      { label: 'B', text: "Open to evolution, but gradual — squad needs time.", alignmentDelta: 8, wageDelta: 0, promise: null },
      { label: 'C', text: "The players are set up for {{tactic.formation}} — I'd prefer to keep it.", alignmentDelta: -8, wageDelta: 0.06, promise: null }
    ]
  },
  {
    id: 'A_DEF_3', weight: function (mgr, state) {
      return state.board && (state.board.stage === 'PRESSURE' || state.board.stage === 'DISMISSAL_RISK') ? 2.5 : 0.6;
    },
    text: "There's clearly pressure from the board here. I need to understand — are you hiring me for a quick fix, or are you serious about building something?",
    context: "Board pressure affects the patience available for a rebuild.",
    answers: [
      { label: 'A', text: "We're building something — results will follow the process.", alignmentDelta: 20, wageDelta: 0, promise: null },
      { label: 'B', text: "Both — process matters but we need points on the board.", alignmentDelta: 5, wageDelta: 0, promise: null },
      { label: 'C', text: "Honestly, results are the priority right now.", alignmentDelta: -12, wageDelta: 0.08, promise: null }
    ]
  }
];

// Category B: Squad Reality Check

var QB_GAP = [
  {
    id: 'B_GAP_1', weight: function () { return 1.5; },
    text: "Your biggest weakness is clear — {{squad.weakpos}}. That gap will limit what I can implement. Are you committed to addressing it this window?",
    context: "Addressing squad gaps is critical for tactical implementation.",
    answers: [
      { label: 'A', text: "Yes — {{squad.weakpos}} is our first priority signing.", alignmentDelta: 15, wageDelta: 0, promise: { type: 'SIGN_ROLE', detail: '{{squad.weakslot}}', deadline: 1, fulfilled: false, broken: false } },
      { label: 'B', text: "It's on the list but depends on budget availability.", alignmentDelta: 5, wageDelta: 0, promise: null },
      { label: 'C', text: "You'll need to work around it for now.", alignmentDelta: -8, wageDelta: 0, promise: null }
    ]
  },
  {
    id: 'B_GAP_2', weight: function () { return 1.2; },
    text: "For my system to work, {{squad.weakpos}} isn't just a weakness — it's a blocker. I can't implement what I want without quality there. How seriously are you taking that?",
    context: "A key positional gap can block tactical implementation entirely.",
    answers: [
      { label: 'A', text: "Very seriously — we'll make it happen.", alignmentDelta: 18, wageDelta: 0, promise: { type: 'SIGN_ROLE', detail: '{{squad.weakslot}}', deadline: 1, fulfilled: false, broken: false } },
      { label: 'B', text: "We're aware — it may take until the next window.", alignmentDelta: 6, wageDelta: 0, promise: { type: 'SIGN_ROLE', detail: '{{squad.weakslot}}', deadline: 2, fulfilled: false, broken: false } },
      { label: 'C', text: "We think the current options can cover it adequately.", alignmentDelta: -12, wageDelta: 0.05, promise: null }
    ]
  },
  {
    id: 'B_GAP_3', weight: function (mgr, state) {
      return (state.manager.budget || 0) < 5000000 ? 2.5 : 0.4;
    },
    text: "You need a {{squad.weakpos}} but with {{budget.transfer}} in the budget, quality options will be limited. How creative are you willing to get — loans, free agents, developing youth?",
    context: "Budget constraints may require creative solutions for recruitment.",
    answers: [
      { label: 'A', text: "Very creative — we'll find the right player regardless of cost.", alignmentDelta: 15, wageDelta: 0, promise: { type: 'SIGN_ROLE', detail: '{{squad.weakslot}}', deadline: 2, fulfilled: false, broken: false } },
      { label: 'B', text: "We'll try but may need to accept a compromise signing.", alignmentDelta: 5, wageDelta: 0, promise: null },
      { label: 'C', text: "The budget is what it is — you manage with it.", alignmentDelta: -5, wageDelta: 0, promise: null }
    ]
  }
];

var QB_STRONG = [
  {
    id: 'B_STR_1', weight: function (mgr, state) {
      var squad = state.squad || [];
      var topCA = 0;
      squad.forEach(function (p) { var ca = p.CA || 0; if (ca > topCA) topCA = ca; });
      return topCA >= 150 ? 2.0 : 0.8;
    },
    text: "{{squad.topname}} is exactly the kind of player I want to build around. But top players need constant stimulation. How will you keep them challenged and engaged?",
    context: "High-quality squads need careful man-management.",
    answers: [
      { label: 'A', text: "European ambitions, clear development path, competitive wages.", alignmentDelta: 18, wageDelta: 0.05, promise: null },
      { label: 'B', text: "We give them the platform — results keep them motivated.", alignmentDelta: 10, wageDelta: 0, promise: null },
      { label: 'C', text: "That's your job — keep the dressing room sharp.", alignmentDelta: 15, wageDelta: 0, promise: null }
    ]
  },
  {
    id: 'B_STR_2', weight: function () { return 1.0; },
    text: "With a squad of this quality — averaging CA {{squad.avgca}} — I'd expect to compete seriously. What are the actual targets this season, and are they ambitious enough?",
    context: "A strong squad should have ambitious targets.",
    answers: [
      { label: 'A', text: "We're aiming to challenge at the top — nothing less.", alignmentDelta: 15, wageDelta: 0, promise: null },
      { label: 'B', text: "Realistic targets — top half, cup runs where possible.", alignmentDelta: 5, wageDelta: 0, promise: null },
      { label: 'C', text: "The board just wants stability — we don't push for too much.", alignmentDelta: -10, wageDelta: 0.08, promise: null }
    ]
  },
  {
    id: 'B_STR_3', weight: function (mgr, state) {
      var squad = state.squad || [];
      var ageSum = 0;
      squad.forEach(function (p) { ageSum += p.Age || 0; });
      var avgAge = squad.length > 0 ? ageSum / squad.length : 26;
      return avgAge > 27 ? 2.0 : 0.5;
    },
    text: "This squad has quality but the average age is {{squad.age}}. We're looking at a 2-3 year window before a transition. Are you thinking about succession and squad renewal?",
    context: "An ageing squad requires succession planning.",
    answers: [
      { label: 'A', text: "Yes — we blend the current squad with younger additions.", alignmentDelta: 20, wageDelta: 0, promise: { type: 'SIGN_ROLE', detail: 'youth', deadline: 2, fulfilled: false, broken: false } },
      { label: 'B', text: "The current group is the focus — we'll deal with renewal later.", alignmentDelta: 5, wageDelta: 0, promise: null },
      { label: 'C', text: "One season at a time — don't overthink the future.", alignmentDelta: -5, wageDelta: 0, promise: null }
    ]
  }
];

var QB_REBUILD = [
  {
    id: 'B_REB_1', weight: function () { return 1.5; },
    text: "CA {{squad.avgca}} across the squad tells me everything. This is a rebuild. I need at least two windows before judging the project. Is the board aligned on that timeline?",
    context: "Rebuilding projects require patience and long-term planning.",
    answers: [
      { label: 'A', text: "Fully — we've had that conversation and they're committed.", alignmentDelta: 22, wageDelta: 0, promise: { type: 'REBUILD_MANDATE', detail: 'long_term', deadline: 3, fulfilled: false, broken: false } },
      { label: 'B', text: "They're patient but will want signs of progress.", alignmentDelta: 8, wageDelta: 0, promise: null },
      { label: 'C', text: "The board wants results within a season — that's the reality.", alignmentDelta: -15, wageDelta: 0.12, promise: null }
    ]
  },
  {
    id: 'B_REB_2', weight: function (mgr, state) {
      var squad = state.squad || [];
      var youngCount = 0;
      squad.forEach(function (p) { if ((p.Age || 99) < 22) youngCount++; });
      return youngCount >= 4 ? 2.0 : 0.6;
    },
    text: "I can see the youth in this squad. A rebuild done right means developing these players properly, not selling them the moment they show promise. Can you guarantee that?",
    context: "Youth development is key to a successful rebuild.",
    answers: [
      { label: 'A', text: "Absolutely — development is the strategy, not a stepping stone.", alignmentDelta: 20, wageDelta: 0, promise: { type: 'REBUILD_MANDATE', detail: 'youth_dev', deadline: 2, fulfilled: false, broken: false } },
      { label: 'B', text: "We'll develop them but won't block good sales.", alignmentDelta: 5, wageDelta: 0, promise: null },
      { label: 'C', text: "If the price is right, we'll sell — that's how we fund the rebuild.", alignmentDelta: -8, wageDelta: 0.05, promise: null }
    ]
  },
  {
    id: 'B_REB_3', weight: function () { return 1.0; },
    text: "Rebuilding with {{budget.transfer}} is workable but every signing has to count. I need full confidence that we're aligned on recruitment — no panic buys, no interference.",
    context: "Recruitment alignment is vital during a rebuild.",
    answers: [
      { label: 'A', text: "You lead recruitment — we back your decisions.", alignmentDelta: 20, wageDelta: 0, promise: { type: 'CONSULT', detail: 'recruitment_veto', deadline: 1, fulfilled: false, broken: false } },
      { label: 'B', text: "Collaboration — we discuss every signing together.", alignmentDelta: 10, wageDelta: 0, promise: { type: 'CONSULT', detail: 'shared', deadline: 1, fulfilled: false, broken: false } },
      { label: 'C', text: "The board has final say on transfers — always has.", alignmentDelta: -12, wageDelta: 0.10, promise: null }
    ]
  }
];

// Category C: Control & Transfers

var QC_ELITE = [
  {
    id: 'C_ELI_1', weight: function () { return 1.0; }, seededRole: null,
    text: "At this stage of my career I don't accept oversight on footballing matters. Full control — tactics, recruitment, playing philosophy. That's my baseline. Can you offer that?",
    context: "Elite managers often demand full control over football operations.",
    answers: [
      { label: 'A', text: "Full Manager — what happens on the pitch is yours.", alignmentDelta: 20, wageDelta: 0, promise: null, seededRole: 'FULL_MANAGER' },
      { label: 'B', text: "Head Coach — recruitment stays with the DoF.", alignmentDelta: -10, wageDelta: 0.15, promise: null, seededRole: 'HEAD_COACH', tensionFlag: true },
      { label: 'C', text: "Shared model — collaborative on all major decisions.", alignmentDelta: 5, wageDelta: 0, promise: { type: 'CONSULT', detail: 'collaborative', deadline: 0, fulfilled: false, broken: false }, seededRole: 'HEAD_COACH' }
    ]
  },
  {
    id: 'C_ELI_2', weight: function (mgr, state) {
      return (state.manager.hireHistory || []).length > 0 ? 2.0 : 0.3;
    }, seededRole: null,
    text: "I've seen what happens when a manager doesn't have full authority — {{prev.manager}} being a case in point. I won't put myself in that position. How is this different?",
    context: "Previous manager experience influences authority demands.",
    answers: [
      { label: 'A', text: "It's different because you'll have genuine authority here.", alignmentDelta: 22, wageDelta: 0, promise: null, seededRole: 'FULL_MANAGER' },
      { label: 'B', text: "Some oversight is structural — but day-to-day is yours.", alignmentDelta: 5, wageDelta: 0, promise: { type: 'CONSULT', detail: 'collaborative', deadline: 0, fulfilled: false, broken: false }, seededRole: 'HEAD_COACH' },
      { label: 'C', text: "It's similar — the DoF model is how we operate.", alignmentDelta: -15, wageDelta: 0.15, promise: null, seededRole: 'HEAD_COACH', tensionFlag: true }
    ]
  },
  {
    id: 'C_ELI_3', weight: function () { return 1.2; }, seededRole: null,
    text: "Recruitment is where most manager-DoF relationships break down. I need to know specifically — who has the final word on signings, and what happens when we disagree?",
    context: "Clear recruitment authority prevents future friction.",
    answers: [
      { label: 'A', text: "You have final say on all footballing signings.", alignmentDelta: 20, wageDelta: 0, promise: null, seededRole: 'FULL_MANAGER' },
      { label: 'B', text: "We decide together — DoF facilitates, you approve.", alignmentDelta: 8, wageDelta: 0, promise: { type: 'CONSULT', detail: 'collaborative', deadline: 0, fulfilled: false, broken: false }, seededRole: 'HEAD_COACH' },
      { label: 'C', text: "The DoF signs off on all transfers. That's non-negotiable.", alignmentDelta: -12, wageDelta: 0.15, promise: null, seededRole: 'HEAD_COACH', tensionFlag: true }
    ]
  }
];

var QC_MID = [
  {
    id: 'C_MID_1', weight: function () { return 1.0; }, seededRole: null,
    text: "Before anything else I need clarity on my remit. Specifically: do I have a say in who comes in and out, or is that purely the DoF's domain?",
    context: "Role clarity prevents friction between DoF and manager.",
    answers: [
      { label: 'A', text: "Strong input — every decision goes through you.", alignmentDelta: 15, wageDelta: 0, promise: { type: 'CONSULT', detail: 'collaborative', deadline: 0, fulfilled: false, broken: false }, seededRole: 'HEAD_COACH' },
      { label: 'B', text: "Coaching is yours — transfers stay with the DoF.", alignmentDelta: 5, wageDelta: 0, promise: null, seededRole: 'HEAD_COACH' },
      { label: 'C', text: "Full control — we'll give you the Manager title.", alignmentDelta: 20, wageDelta: -0.05, promise: null, seededRole: 'FULL_MANAGER' }
    ]
  },
  {
    id: 'C_MID_2', weight: function (mgr) {
      return (parseInt(mgr.Ambition || mgr.Amb || 10, 10) >= 15) ? 2.0 : 0.5;
    }, seededRole: null,
    text: "I'll be honest — I'm looking to step up. Head Coach is acceptable short-term, but I want a pathway to full managerial control. Is that on the table?",
    context: "Ambitious managers may push for a future promotion pathway.",
    answers: [
      { label: 'A', text: "Yes — performance reviewed after 12 months with upgrade possible.", alignmentDelta: 18, wageDelta: 0, promise: { type: 'CONSULT', detail: 'collaborative', deadline: 0, fulfilled: false, broken: false }, seededRole: 'HEAD_COACH' },
      { label: 'B', text: "We can discuss it — nothing guaranteed.", alignmentDelta: 8, wageDelta: 0, promise: null, seededRole: 'HEAD_COACH' },
      { label: 'C', text: "The DoF structure is permanent here — no pathway to full control.", alignmentDelta: -10, wageDelta: 0.10, promise: null, seededRole: 'HEAD_COACH' }
    ]
  },
  {
    id: 'C_MID_3', weight: function () { return 1.0; }, seededRole: null,
    text: "I work well in collaborative environments, but I need to know what collaboration actually means here in practice. Walk me through a typical transfer decision.",
    context: "Understanding the transfer process prevents future conflict.",
    answers: [
      { label: 'A', text: "You identify targets, DoF negotiates, you approve the final call.", alignmentDelta: 20, wageDelta: 0, promise: { type: 'CONSULT', detail: 'collaborative', deadline: 0, fulfilled: false, broken: false }, seededRole: 'HEAD_COACH' },
      { label: 'B', text: "DoF identifies, you assess tactically, board approves.", alignmentDelta: 8, wageDelta: 0, promise: null, seededRole: 'HEAD_COACH' },
      { label: 'C', text: "DoF runs the process — you focus on the football.", alignmentDelta: 3, wageDelta: 0, promise: null, seededRole: 'HEAD_COACH' }
    ]
  }
];

var QC_LOW = [
  {
    id: 'C_LOW_1', weight: function () { return 1.0; }, seededRole: null,
    text: "I'm not here to be managed myself. I need genuine autonomy on training, tactics, and lineup selection. No interference on matchday or in the week. Can you guarantee that?",
    context: "Coaching autonomy is important for lower-profile managers.",
    answers: [
      { label: 'A', text: "Complete coaching autonomy — we don't touch that side.", alignmentDelta: 20, wageDelta: 0, promise: null, seededRole: 'HEAD_COACH' },
      { label: 'B', text: "Mostly — we might have input during difficult runs.", alignmentDelta: 5, wageDelta: 0, promise: null, seededRole: 'HEAD_COACH' },
      { label: 'C', text: "We're quite involved operationally — that won't change.", alignmentDelta: -15, wageDelta: 0.10, promise: null, seededRole: 'HEAD_COACH', tensionFlag: true }
    ]
  },
  {
    id: 'C_LOW_2', weight: function (mgr) {
      return (parseInt(mgr.Age || 35, 10) < 38) ? 1.8 : 0.5;
    }, seededRole: null,
    text: "This role is a step in my development and I'm not pretending otherwise. But I need an environment where I can actually implement my ideas and be judged on them. Is that what you're offering?",
    context: "Younger managers value a development-focused environment.",
    answers: [
      { label: 'A', text: "Yes — you'll have full coaching control and fair assessment.", alignmentDelta: 18, wageDelta: 0, promise: null, seededRole: 'HEAD_COACH' },
      { label: 'B', text: "Largely — with some guidance from the sporting structure.", alignmentDelta: 8, wageDelta: 0, promise: null, seededRole: 'HEAD_COACH' },
      { label: 'C', text: "We have a strong DoF presence — it's a supported role.", alignmentDelta: 3, wageDelta: 0, promise: null, seededRole: 'HEAD_COACH' }
    ]
  },
  {
    id: 'C_LOW_3', weight: function () { return 1.0; }, seededRole: null,
    text: "What are the actual expectations for me here? I want to hear it plainly — results, style, timeline. I don't want to be set up to fail with impossible targets.",
    context: "Clear expectations prevent early conflict.",
    answers: [
      { label: 'A', text: "Realistic targets, time to implement, fair review process.", alignmentDelta: 20, wageDelta: 0, promise: null, seededRole: 'HEAD_COACH' },
      { label: 'B', text: "Results within a season — we back you but need to see progress.", alignmentDelta: 5, wageDelta: 0, promise: null, seededRole: 'HEAD_COACH' },
      { label: 'C', text: "The board wants immediate improvement — that's the brief.", alignmentDelta: -8, wageDelta: 0.05, promise: null, seededRole: 'HEAD_COACH' }
    ]
  }
];

// Wildcard Templates

var WILDCARDS = {
  board_pressure: [
    {
      id: 'WC_BP_1',
      text: "The board confidence sits at {{board.confidence}}% — that's a difficult environment. Why would I join a club where the pressure is already this intense?",
      context: "Board pressure can deter potential manager hires.",
      answers: [
        { label: 'A', text: "Because we're rebuilding from a low point — the upside is real.", alignmentDelta: 15, wageDelta: 0.10, promise: null },
        { label: 'B', text: "The pressure is temporary — results will change the picture.", alignmentDelta: 8, wageDelta: 0.05, promise: null },
        { label: 'C', text: "I won't pretend it's ideal — but we believe in you.", alignmentDelta: -5, wageDelta: 0.15, promise: null }
      ]
    },
    {
      id: 'WC_BP_2',
      text: "I've done my homework. {{board.confidence}}% board confidence and a {{board.stage}} situation. What assurance can you give me that I won't be sacked after three bad results?",
      context: "Job security is a concern in high-pressure environments.",
      answers: [
        { label: 'A', text: "Explicit assurance — we're giving you a full season minimum.", alignmentDelta: 20, wageDelta: 0.08, promise: null },
        { label: 'B', text: "No coach is fully safe, but we'll be fair in our assessment.", alignmentDelta: 5, wageDelta: 0.05, promise: null },
        { label: 'C', text: "Results determine everything — that's just the reality.", alignmentDelta: -10, wageDelta: 0.15, promise: null }
      ]
    }
  ],
  prev_dismissed: [
    {
      id: 'WC_PD_1',
      text: "You dismissed {{prev.manager}}. I need to understand why, because whatever that pattern is — I want to make sure I'm not walking into the same situation.",
      context: "A history of dismissing managers raises concerns for new candidates.",
      answers: [
        { label: 'A', text: "It was about results, not approach — you'll have full support.", alignmentDelta: 15, wageDelta: 0.05, promise: null },
        { label: 'B', text: "There were tactical disagreements — we've learned from it.", alignmentDelta: 8, wageDelta: 0, promise: null },
        { label: 'C', text: "Managers are judged on results here — that won't change.", alignmentDelta: -8, wageDelta: 0.10, promise: null }
      ]
    },
    {
      id: 'WC_PD_2',
      text: "{{prev.manager}} didn't last long. Before I go any further — what went wrong, and what are you doing differently this time?",
      context: "Candidates want to understand management changes.",
      answers: [
        { label: 'A', text: "We rushed the hire and didn't align on expectations. We've fixed that.", alignmentDelta: 20, wageDelta: 0, promise: null },
        { label: 'B', text: "Results weren't good enough — it's as simple as that.", alignmentDelta: 3, wageDelta: 0, promise: null },
        { label: 'C', text: "Management decisions are confidential — I can't go into detail.", alignmentDelta: -10, wageDelta: 0.08, promise: null }
      ]
    }
  ],
  unrest: [
    {
      id: 'WC_UNR_1',
      text: "I've heard there are unsettled players in the squad right now. That's a significant concern for any incoming manager. How are you handling it, and what support will I have?",
      context: "Player unrest can destabilise a new manager's start.",
      answers: [
        { label: 'A', text: "We're addressing it — the DoF will manage exits professionally.", alignmentDelta: 18, wageDelta: 0, promise: null },
        { label: 'B', text: "It's a situation you'll need to manage as part of the job.", alignmentDelta: 3, wageDelta: 0, promise: null },
        { label: 'C', text: "Some unrest is natural — don't read too much into it.", alignmentDelta: -8, wageDelta: 0.05, promise: null }
      ]
    }
  ],
  no_signings: [
    {
      id: 'WC_NS_1',
      text: "You've had {{window.count}} transfer windows and made no signings. That tells me either the budget isn't real or the recruitment process is broken. Which is it?",
      context: "A lack of previous signings raises questions about recruitment.",
      answers: [
        { label: 'A', text: "The budget is real — we've been waiting for the right manager to lead it.", alignmentDelta: 15, wageDelta: 0, promise: null },
        { label: 'B', text: "Recruitment has been cautious — that changes now.", alignmentDelta: 8, wageDelta: 0, promise: null },
        { label: 'C', text: "The market was difficult — it's not as straightforward as it looks.", alignmentDelta: -5, wageDelta: 0, promise: null }
      ]
    }
  ],
  wage_crisis: [
    {
      id: 'WC_WC_1',
      text: "The wage structure here looks severely stretched. With only {{budget.wage}} headroom per week, how do I bring in any quality without breaking what's already here?",
      context: "A tight wage budget restricts recruitment options.",
      answers: [
        { label: 'A', text: "We'll restructure the wage bill before you start — that's a commitment.", alignmentDelta: 20, wageDelta: 0, promise: { type: 'REBUILD_MANDATE', detail: 'wage_restructure', deadline: 1, fulfilled: false, broken: false } },
        { label: 'B', text: "It'll require creative thinking — loans, frees, development.", alignmentDelta: 8, wageDelta: 0, promise: null },
        { label: 'C', text: "Work within the structure — that's the challenge of the role.", alignmentDelta: -10, wageDelta: 0.05, promise: null }
      ]
    }
  ]
};

// ─── V2 generateInterview() ───

function generateInterview(manager, squadDNA, gaps, boardState) {
  var state = window.FM24State;
  var squad = state.squad || [];
  var mgrCA = Math.max(100, parseInt(manager.CA, 10) || 100);

  // Compute avgCA
  var avgCA = 110;
  if (squad.length > 0) {
    var sum = 0, validCount = 0;
    for (var gsi = 0; gsi < squad.length; gsi++) {
      var caVal = parseInt(squad[gsi].CA, 10);
      if (!isNaN(caVal) && caVal > 0) { sum += caVal; validCount++; }
    }
    avgCA = validCount > 0 ? sum / validCount : 110;
  }

  // Derive manager philosophy
  var topStyle = 'balanced';
  if (typeof deriveManagerPhilosophy === 'function') {
    var mgrPhil = deriveManagerPhilosophy(manager);
    if (mgrPhil && mgrPhil.primaryStyle) topStyle = mgrPhil.primaryStyle;
  }

  // Build token cache once
  var tokenCache = buildTokenCache(manager, state, gaps);
  var qWeights = deriveQuestionWeights(manager);

  var questions = [];

  // ── CATEGORY A: Tactical Identity ──
  var qAPool;
  if (topStyle === 'aggressive high-press tactician' || topStyle === 'gegenpress') {
    qAPool = QA_GEGENPRESS;
  } else if (topStyle === 'possession-oriented tactician' || topStyle === 'tiki-taka' || topStyle === 'positional play specialist' || topStyle === 'possession') {
    qAPool = QA_POSSESSION;
  } else if (topStyle === 'direct counter-attacker' || topStyle === 'direct' || topStyle === 'wide-oriented direct play') {
    qAPool = QA_DIRECT;
  } else {
    qAPool = QA_DEFAULT;
  }
  var qATpl = weightedPick(qAPool, manager, state, gaps, qWeights);
  var qA = {
    id: qATpl.id,
    category: 'tactical',
    text: interpolate(qATpl.text, manager, state, gaps, tokenCache),
    context: interpolate(qATpl.context, manager, state, gaps, tokenCache),
    answers: qATpl.answers.map(function (a) {
      var ans = {
        label: a.label,
        text: interpolate(a.text, manager, state, gaps, tokenCache),
        alignmentDelta: a.alignmentDelta,
        wageDelta: a.wageDelta || 0,
        promise: a.promise ? JSON.parse(JSON.stringify(a.promise)) : null
      };
      if (a.promise && a.promise.detail) {
        ans.promise.detail = interpolate(a.promise.detail, manager, state, gaps, tokenCache);
      }
      return ans;
    })
  };
  questions.push(qA);

  // ── CATEGORY B: Squad Reality Check or Wildcard ──
  var qB;

  // Evaluate wildcard triggers in priority order
  var wildcardTpl = null;
  // Trigger 1: Board under pressure
  if (!wildcardTpl && boardState && (boardState.stage === 'PRESSURE' || boardState.stage === 'DISMISSAL_RISK')) {
    wildcardTpl = weightedPick(WILDCARDS.board_pressure, manager, state, gaps, qWeights);
  }
  // Trigger 2: Previous manager dismissed
  if (!wildcardTpl && (state.manager.hireHistory || []).some(function (h) { return h.outcome === 'dismissed'; })) {
    wildcardTpl = weightedPick(WILDCARDS.prev_dismissed, manager, state, gaps, qWeights);
  }
  // Trigger 3: Significant player unrest
  if (!wildcardTpl && (state.manager.unrestPlayers || []).length >= 3) {
    wildcardTpl = weightedPick(WILDCARDS.unrest, manager, state, gaps, qWeights);
  }
  // Trigger 4: Multiple windows with no signings
  if (!wildcardTpl && state.manager.windowCount >= 2 && (state.manager.transfers.in || []).length === 0) {
    wildcardTpl = weightedPick(WILDCARDS.no_signings, manager, state, gaps, qWeights);
  }
  // Trigger 5: Wage bill critically tight
  if (!wildcardTpl && (state.manager.wageBudget || 0) < 50000) {
    wildcardTpl = weightedPick(WILDCARDS.wage_crisis, manager, state, gaps, qWeights);
  }

  if (wildcardTpl) {
    qB = {
      id: wildcardTpl.id,
      category: 'squad',
      text: interpolate(wildcardTpl.text, manager, state, gaps, tokenCache),
      context: interpolate(wildcardTpl.context, manager, state, gaps, tokenCache),
      answers: wildcardTpl.answers.map(function (a) {
        var ans = {
          label: a.label,
          text: interpolate(a.text, manager, state, gaps, tokenCache),
          alignmentDelta: a.alignmentDelta,
          wageDelta: a.wageDelta || 0,
          promise: a.promise ? JSON.parse(JSON.stringify(a.promise)) : null
        };
        if (a.promise && a.promise.detail) {
          ans.promise.detail = interpolate(a.promise.detail, manager, state, gaps, tokenCache);
        }
        return ans;
      })
    };
  } else {
    // Normal Category B selection
    var qBPool;
    if (gaps && gaps.length > 0 && gaps[0].position) {
      qBPool = QB_GAP;
    } else if (avgCA >= 130) {
      qBPool = QB_STRONG;
    } else {
      qBPool = QB_REBUILD;
    }
    var qBTpl = weightedPick(qBPool, manager, state, gaps, qWeights);
    qB = {
      id: qBTpl.id,
      category: 'squad',
      text: interpolate(qBTpl.text, manager, state, gaps, tokenCache),
      context: interpolate(qBTpl.context, manager, state, gaps, tokenCache),
      answers: qBTpl.answers.map(function (a) {
        var ans = {
          label: a.label,
          text: interpolate(a.text, manager, state, gaps, tokenCache),
          alignmentDelta: a.alignmentDelta,
          wageDelta: a.wageDelta || 0,
          promise: a.promise ? JSON.parse(JSON.stringify(a.promise)) : null
        };
        if (a.promise && a.promise.detail) {
          ans.promise.detail = interpolate(a.promise.detail, manager, state, gaps, tokenCache);
        }
        return ans;
      })
    };
  }
  questions.push(qB);

  // ── CATEGORY C: Control & Transfers ──
  var qCPool;
  if (mgrCA >= 140) {
    qCPool = QC_ELITE;
  } else if (mgrCA >= 110) {
    qCPool = QC_MID;
  } else {
    qCPool = QC_LOW;
  }
  var qCTpl = weightedPick(qCPool, manager, state, gaps, qWeights);
  var qC = {
    id: qCTpl.id,
    category: 'control',
    text: interpolate(qCTpl.text, manager, state, gaps, tokenCache),
    context: interpolate(qCTpl.context, manager, state, gaps, tokenCache),
    seededRole: 'HEAD_COACH',
    answers: qCTpl.answers.map(function (a) {
      var ans = {
        label: a.label,
        text: interpolate(a.text, manager, state, gaps, tokenCache),
        alignmentDelta: a.alignmentDelta,
        wageDelta: a.wageDelta || 0,
        promise: a.promise ? JSON.parse(JSON.stringify(a.promise)) : null,
        seededRole: a.seededRole || 'HEAD_COACH',
        tensionFlag: a.tensionFlag || false
      };
      if (a.promise && a.promise.detail) {
        ans.promise.detail = interpolate(a.promise.detail, manager, state, gaps, tokenCache);
      }
      return ans;
    })
  };
  questions.push(qC);

  return questions;
}

// ─── PHASE 3: CONTRACT NEGOTIATION ───

function computeInitialDemands(manager, alignmentScore, seededRole, interviewWageMult) {
  var mgrCA = Math.max(100, parseInt(manager.CA, 10) || 100);
  var ambition = manager.Ambition || manager.Determination || 10;

  var baseWage = mgrCA * 950;
  var ambMult = 1 + (ambition / 20);

  var alignModifier = 1.0;
  if (alignmentScore >= 75) alignModifier = 0.95;
  else if (alignmentScore >= 45) alignModifier = 1.0;
  else if (alignmentScore >= 30) alignModifier = 1.15;

  var targetWage = Math.round(baseWage * ambMult * alignModifier * (interviewWageMult || 1.0) / 500) * 500;
  var walkAwayWage = Math.round(targetWage * 0.75 / 500) * 500;

  var role = seededRole || (mgrCA >= 140 ? 'FULL_MANAGER' : 'HEAD_COACH');

  var contractLength = 1;
  var minContractLength = 1;
  if (mgrCA >= 160) {
    contractLength = 3;
    minContractLength = 2;
  } else if (mgrCA >= 130) {
    contractLength = 2;
    minContractLength = 1;
  } else {
    contractLength = 1;
    minContractLength = 1;
  }
  if (alignmentScore < 45) {
    contractLength = Math.max(minContractLength, contractLength - 1);
  }

  return {
    wage: targetWage,
    walkAwayWage: walkAwayWage,
    role: role,
    contractLength: contractLength,
    minContractLength: minContractLength
  };
}

function evaluateOffer(manager, negotiationState, offer) {
  var demands = negotiationState.currentDemands;
  if (!demands) {
    return { outcome: 'REJECT', reason: 'no_demands', score: 0, reaction: 'No demands established.' };
  }

  var band = negotiationState.interestResult ? negotiationState.interestResult.band : 'OPEN';

  // Acceptance score calculation
  var score = 50;

  // Wage component (0–40 points)
  var wageDiff = offer.wage - demands.walkAwayWage;
  var wageRange = demands.wage - demands.walkAwayWage;
  var wageScore = wageRange > 0 ? (wageDiff / wageRange) * 40 : (wageDiff > 0 ? 40 : 0);
  score += Math.max(-20, Math.min(40, wageScore));

  // Role component
  var roleMismatch = offer.role !== demands.role;
  if (roleMismatch) score -= 25;

  // Contract length
  if (offer.contractLength < demands.minContractLength) score -= 15;

  // Friction penalty
  score -= (negotiationState.negotiationRound || 0) * 8;

  // Personality modifiers
  var prof = manager.Professionalism || 10;
  var amb = manager.Ambition || 10;
  var adap = manager.Adaptability || 10;

  if (amb >= 16) score -= 8;
  if (prof >= 16) score += 6;
  if (adap >= 16 && roleMismatch) score += 8;

  // RELUCTANT threshold gate
  if (band === 'RELUCTANT' && negotiationState.reluctantThreshold !== null && score < negotiationState.reluctantThreshold) {
    return {
      outcome: 'WALK_AWAY',
      reason: 'reluctant_threshold',
      score: Math.round(score),
      reaction: "I was skeptical coming in, and nothing here has changed my mind."
    };
  }

  var outcome, reaction;
  if (score >= 60) {
    outcome = 'ACCEPT';
    if (prof >= 15) reaction = "This works. I look forward to getting started.";
    else if (amb >= 16) reaction = "I'll hold you to these terms. Let's get to work.";
    else reaction = "Agreed. I'm ready to begin.";
  } else if (score >= 35) {
    outcome = 'COUNTER_OFFER';
    if (amb >= 16) reaction = "The wage isn't where I need it to be. I'd expect £" + Math.round(demands.wage / 1000) + "k minimum.";
    else if (prof >= 15) reaction = "I see merit in this offer but require some adjustments.";
    else reaction = "I need a bit more before I can commit to this.";
  } else if ((negotiationState.negotiationRound || 0) < 3) {
    outcome = 'REJECT';
    reaction = "That's not close enough to what I'd expect for this role.";
  } else {
    outcome = 'WALK_AWAY';
    reaction = "I don't think we're going to find common ground here.";
  }

  // Build counter-offer
  var counter = null;
  if (outcome === 'COUNTER_OFFER' || outcome === 'REJECT') {
    var newWage = Math.round(offer.wage * 1.10 / 500) * 500;
    newWage = Math.min(newWage, demands.wage);
    var newRole = demands.role;
    if (score > 48 && newRole === 'FULL_MANAGER') newRole = 'HEAD_COACH';
    var newLength = demands.contractLength - (score > 45 ? 1 : 0);
    if (newLength < demands.minContractLength) newLength = demands.minContractLength;
    counter = { wage: newWage, role: newRole, contractLength: newLength };
  }

  return {
    outcome: outcome,
    reason: null,
    score: Math.round(score),
    reaction: reaction,
    counter: counter,
    roleMismatch: roleMismatch
  };
}

// ─── INTERVIEW MODAL ───

function renderInterviewModal(manager, questions, questionIndex) {
  var modal = document.getElementById("manager-interview-modal");
  var content = document.getElementById("manager-interview-content");
  if (!modal || !content) return;

  var negState = window.FM24State.manager.negotiation;
  var alignmentScore = negState.alignmentScore || 50;
  var currentQ = questions[questionIndex];
  var isLastQ = questionIndex === 2;
  var isSummary = questionIndex >= questions.length;

  // Determine alignment bar color
  var alignColor = alignmentScore >= 70 ? '#22c55e' : alignmentScore >= 45 ? '#eab308' : '#ef4444';

  var html = '';

  // Header
  html += '<div class="flex items-center justify-between mb-4">';
  html += '  <h3 class="text-xs font-bold text-white uppercase tracking-wider">Interview — ' + escHtml(manager.Name) + '</h3>';
  html += '  <button id="interview-close-btn" class="text-xs text-text-muted hover:text-white transition-colors">[X]</button>';
  html += '</div>';

  if (isSummary) {
    // ── Summary Panel ──
    html += '<div class="space-y-4">';
    html += '  <div class="text-sm font-bold text-white">Interview Complete</div>';

    var alignmentBand = alignmentScore >= 75 ? 'STRONG FIT' : alignmentScore >= 45 ? 'MODERATE FIT' : alignmentScore >= 30 ? 'WEAK FIT' : 'POOR FIT';
    var alignColorLabel = alignmentScore >= 75 ? 'text-green-400' : alignmentScore >= 45 ? 'text-yellow-400' : alignmentScore >= 30 ? 'text-orange-400' : 'text-red-400';
    html += '  <div class="flex items-center gap-2">';
    html += '    <span class="text-xs text-text-muted">Alignment Score:</span>';
    html += '    <span class="text-sm font-bold ' + alignColorLabel + '">' + alignmentScore + ' / 100</span>';
    html += '    <span class="text-[9px] px-2 py-0.5 rounded-full border ' + (alignmentScore >= 75 ? 'border-green-500/30 text-green-400' : alignmentScore >= 45 ? 'border-yellow-500/30 text-yellow-400' : 'border-red-500/30 text-red-400') + '">' + alignmentBand + '</span>';
    html += '  </div>';

    // Commitments made
    var promises = negState.promises || [];
    var wageMultiplierStr = '';
    var wageDeltas = [];
    for (var qi = 0; qi < questions.length; qi++) {
      for (var ai = 0; ai < questions[qi].answers.length; ai++) {
        var ans = questions[qi].answers[ai];
        if (ans._chosen && ans.wageDelta && ans.wageDelta !== 0) {
          wageDeltas.push((ans.wageDelta > 0 ? '+' : '') + Math.round(ans.wageDelta * 100) + '%');
        }
      }
    }
    if (wageDeltas.length > 0) {
      wageMultiplierStr = 'Wage Adjustment: ' + wageDeltas.join(', ');
    } else {
      wageMultiplierStr = 'Wage Adjustment: None (alignment within range)';
    }

    if (promises.length > 0) {
      html += '  <div class="mt-3">';
      html += '    <div class="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1.5">Commitments Made:</div>';
      html += '    <div class="flex flex-col gap-1">';
      for (var pi = 0; pi < promises.length; pi++) {
        var p = promises[pi];
        html += '      <div class="text-xs text-text-secondary flex items-start gap-1.5">';
        html += '        <span class="text-text-muted mt-0.5">•</span>';
        html += '        <span>' + escHtml(p.detail || p.type) + (p.deadline > 0 ? ' (within ' + p.deadline + ' window' + (p.deadline > 1 ? 's' : '') + ')' : '') + '</span>';
        html += '      </div>';
      }
      html += '    </div>';
      html += '  </div>';
    }

    html += '  <div class="text-xs text-text-muted">' + wageMultiplierStr + '</div>';

    // Contextual closing line
    var prof = parseInt(manager.Professionalism || manager.Prof || 10, 10);
    var amb = parseInt(manager.Ambition || manager.Amb || 10, 10);
    var closingLine;
    if (alignmentScore >= 75) {
      if (prof >= 15) closingLine = "I'm satisfied with how this went. Let's talk terms.";
      else if (amb >= 16) closingLine = "Good — I'm ready to get started. Don't waste my time in negotiations.";
      else closingLine = "I think we're on the same page. I'm interested.";
    } else if (alignmentScore >= 50) {
      if (amb >= 16) closingLine = "I have reservations, but let's see what you're offering.";
      else closingLine = "There are some things we'll need to work through, but I'm open to continuing.";
    } else {
      closingLine = "I have real concerns. The offer will need to be strong.";
    }
    html += '  <div class="bg-backdrop border border-border/40 rounded-lg p-3 mt-3">';
    html += '    <div class="text-[10px] text-text-muted italic">"' + escHtml(closingLine) + '"</div>';
    html += '    <div class="text-[9px] text-text-muted mt-1">— ' + escHtml(manager.Name) + '</div>';
    html += '  </div>';

    html += '  <button id="proceed-to-negotiation-btn" class="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors shadow-md mt-4">Proceed to Contract Negotiations</button>';
    html += '</div>';

    content.innerHTML = html;
    modal.classList.remove("hidden");

    document.getElementById("proceed-to-negotiation-btn").addEventListener("click", function () {
      // Set reluctantThreshold
      if (negState.interestResult && negState.interestResult.band === 'RELUCTANT') {
        var relBase = 45;
        if (manager.Ambition >= 16) relBase += 10;
        if (manager.Professionalism >= 16) relBase -= 5;
        if (manager.Determination >= 17) relBase += 5;
        negState.reluctantThreshold = Math.max(35, Math.min(65, relBase));
      }

      negState.status = 'negotiating';

      // Seed role from Category C
      var seededRole = 'HEAD_COACH';
      if (questions.length >= 3) {
        var qC = questions[2];
        for (var cai = 0; cai < qC.answers.length; cai++) {
          if (qC.answers[cai]._chosen && qC.answers[cai].seededRole) {
            seededRole = qC.answers[cai].seededRole;
            break;
          }
        }
      }

      // Compute interview wage multiplier from chosen answers
      var interviewWageMult = 1.0;
      for (var qwi = 0; qwi < questions.length; qwi++) {
        for (var awi = 0; awi < questions[qwi].answers.length; awi++) {
          var a = questions[qwi].answers[awi];
          if (a._chosen && a.wageDelta && a.wageDelta !== 0) {
            interviewWageMult *= a.wageDelta;
          }
        }
      }

      negState.currentDemands = computeInitialDemands(manager, alignmentScore, seededRole, interviewWageMult);
      renderNegotiationModal(manager);
    });

    document.getElementById("interview-close-btn").addEventListener("click", function () {
      negState.status = 'collapsed';
      modal.classList.add("hidden");
      renderManagerView();
    });
    return;
  }

  if (!currentQ) {
    modal.classList.add("hidden");
    return;
  }

  // ── Progress dots ──
  html += '<div class="flex items-center gap-2 mb-3">';
  for (var qi2 = 0; qi2 < 3; qi2++) {
    var dotClass = qi2 < questionIndex ? 'bg-green-500' : qi2 === questionIndex ? 'bg-blue-500' : 'bg-border';
    html += '  <div class="w-2.5 h-2.5 rounded-full ' + dotClass + '"></div>';
  }
  html += '  <span class="text-[9px] text-text-muted ml-auto">Question ' + (questionIndex + 1) + ' of 3</span>';
  html += '</div>';

  // ── Alignment meter ──
  html += '<div class="mb-3">';
  html += '  <div class="flex items-center justify-between text-[9px] text-text-muted mb-1">';
  html += '    <span>Alignment</span>';
  html += '    <span style="color:' + alignColor + '">' + alignmentScore + ' / 100</span>';
  html += '  </div>';
  html += '  <div class="alignment-meter">';
  html += '    <div class="alignment-meter-fill" style="width:' + alignmentScore + '%; background:' + alignColor + '"></div>';
  html += '  </div>';
  html += '</div>';

  // ── Question ──
  html += '<div class="bg-backdrop border border-border/60 rounded-lg p-4 mb-4">';
  html += '  <div class="text-xs text-white font-bold mb-1">"' + escHtml(currentQ.text) + '"</div>';
  html += '  <div class="text-[10px] text-text-muted italic">' + escHtml(currentQ.context) + '</div>';
  html += '</div>';

  // ── Answers ──
  html += '<div class="flex flex-col gap-2">';
  var labels = ['A', 'B', 'C'];
  for (var ai2 = 0; ai2 < currentQ.answers.length; ai2++) {
    var ans = currentQ.answers[ai2];
    var conseqParts = [];
    if (ans.alignmentDelta !== 0) {
      var dir = ans.alignmentDelta > 0 ? 'stronger' : 'weaker';
      var phrase = ans.alignmentDelta > 0 ? 'aligns on your approach' : 'misalignment on expectations';
      conseqParts.push((ans.alignmentDelta > 0 ? '+' : '') + ans.alignmentDelta + ' ' + dir + ' alignment — ' + phrase);
    }
    if (ans.promise) {
      var promiseDetail = ans.promise.detail || ans.promise.type;
      conseqParts.push('commits to: ' + promiseDetail);
    }
    if (ans.wageDelta && ans.wageDelta !== 0) {
      var estWage = Math.max(500, (parseInt(manager.CA || 100, 10) * 950));
      var newWage = Math.round(estWage * (1 + ans.wageDelta) / 500) * 500;
      conseqParts.push('wage ~\u00A3' + newWage.toLocaleString('en-GB') + '/wk');
    }
    var conseqText = conseqParts.length > 0 ? conseqParts.join(' • ') : '';

    html += '    <div class="interview-answer p-3 bg-backdrop border border-border/60 rounded-lg hover:bg-surface-hover hover:border-border cursor-pointer transition-all" data-qidx="' + questionIndex + '" data-answer-idx="' + ai2 + '">';
    html += '      <div class="flex items-start gap-2">';
    html += '        <span class="text-[10px] font-bold text-text-muted w-4 flex-shrink-0">[' + labels[ai2] + ']</span>';
    html += '        <div class="flex-1 min-w-0">';
    html += '          <div class="text-xs text-text-secondary">' + escHtml(ans.text) + '</div>';
    if (conseqText) {
      html += '          <div class="text-[9px] text-text-muted mt-1">' + conseqText + '</div>';
    }
    html += '        </div>';
    html += '      </div>';
    html += '    </div>';
  }
  html += '</div>';

  content.innerHTML = html;
  modal.classList.remove("hidden");

  // Wire answer clicks
  var answerEls = content.querySelectorAll('.interview-answer');
  for (var ei = 0; ei < answerEls.length; ei++) {
    (function (qIdx, aIdx) {
      answerEls[ei].addEventListener('click', function () {
        var q = questions[qIdx];
        if (!q) return;
        var answer = q.answers[aIdx];
        if (!answer) return;

        // Mark chosen
        for (var ci = 0; ci < q.answers.length; ci++) {
          q.answers[ci]._chosen = false;
        }
        answer._chosen = true;

        // Apply alignment delta
        negState.alignmentScore = Math.max(0, Math.min(100, (negState.alignmentScore || 50) + answer.alignmentDelta));

        // Apply promise
        if (answer.promise) {
          negState.promises.push(JSON.parse(JSON.stringify(answer.promise)));
        }

        // Advance to next question or summary
        var nextIdx = qIdx + 1;
        if (nextIdx >= questions.length) {
          // Post-Q3 threshold checks — before showing summary
          var finalAlignment = negState.alignmentScore || 50;
          if (finalAlignment < 30) {
            negState.status = 'collapsed';
            modal.classList.add('hidden');
            showToast(escHtml(manager.Name) + ' has ended the interview \u2014 no common ground found.', 'error');
            renderManagerView();
            return;
          }
          if (finalAlignment >= 30 && finalAlignment < 45 && negState.interestResult && negState.interestResult.band === 'RELUCTANT') {
            negState.status = 'collapsed';
            modal.classList.add('hidden');
            showToast(escHtml(manager.Name) + " isn't convinced this is the right project.", 'error');
            renderManagerView();
            return;
          }
          renderInterviewModal(manager, questions, nextIdx); // summary
        } else {
          renderInterviewModal(manager, questions, nextIdx);
        }
      });
    })(questionIndex, ei);
  }

  // Close button
  document.getElementById("interview-close-btn").addEventListener("click", function () {
    negState.status = 'collapsed';
    modal.classList.add("hidden");
    renderManagerView();
  });
}

// ─── NEGOTIATION HELPERS ───

function parseWage(str) {
  var cleaned = String(str).replace(/[^0-9]/g, '');
  var num = parseInt(cleaned, 10);
  if (isNaN(num) || num < 1) return 1000;
  if (num < 1000) return num * 1000;
  return num;
}

function formatWage(val) {
  if (isNaN(val) || val < 1) return '\u00A30';
  return '\u00A3' + val.toLocaleString('en-GB');
}

// ─── NEGOTIATION MODAL ───

function renderNegotiationModal(manager) {
  var modal = document.getElementById("manager-interview-modal");
  var content = document.getElementById("manager-interview-content");
  if (!modal || !content) return;

  var negState = window.FM24State.manager.negotiation;
  var demands = negState.currentDemands;
  if (!demands) return;

  // Remove blur from estimated wage (negotiation is in progress)
  var blurEls = document.querySelectorAll('.blur-sm');
  for (var be = 0; be < blurEls.length; be++) {
    blurEls[be].classList.remove('blur-sm');
  }

  var round = negState.negotiationRound || 0;
  var maxRounds = 3;

  var html = '';

  // Header
  html += '<div class="flex items-center justify-between mb-4">';
  html += '  <h3 class="text-xs font-bold text-white uppercase tracking-wider">Contract Negotiations — ' + escHtml(manager.Name) + '</h3>';
  html += '  <button id="negotiation-close-btn" class="text-xs text-text-muted hover:text-white transition-colors">[X]</button>';
  html += '</div>';

  // Round indicator
  html += '<div class="text-[10px] text-text-muted mb-4">Round ' + (round + 1) + ' of ' + maxRounds + '</div>';

  // Two-column layout
  html += '<div class="negotiation-panel">';

  // Left: Manager demands
  html += '  <div class="bg-backdrop border border-border/60 rounded-lg p-4">';
  html += '    <div class="text-[9px] text-text-muted uppercase font-bold tracking-wider mb-2">Manager Demands</div>';
  html += '    <div class="flex flex-col gap-2 text-xs">';
  html += '      <div class="flex justify-between"><span class="text-text-muted">Role:</span><span class="text-white font-bold">' + (demands.role || '—') + '</span></div>';
  html += '      <div class="flex justify-between"><span class="text-text-muted">Wage:</span><span class="text-white font-bold">\u00A3' + (demands.wage / 1000).toFixed(0) + ',000/wk</span></div>';
  html += '      <div class="flex justify-between"><span class="text-text-muted">Term:</span><span class="text-white font-bold">' + demands.contractLength + ' year' + (demands.contractLength > 1 ? 's' : '') + '</span></div>';
  if (round >= 1) {
    html += '      <div class="flex justify-between mt-2 pt-2 border-t border-border/60"><span class="text-text-muted">Walk-away floor:</span><span class="text-red-400 font-bold">\u00A3' + (demands.walkAwayWage / 1000).toFixed(0) + ',000/wk</span></div>';
  }
  html += '    </div>';
  html += '  </div>';

  // Right: Your offer
  var currentOffer = {
    wage: demands.walkAwayWage + Math.round((demands.wage - demands.walkAwayWage) * 0.6 / 500) * 500,
    role: demands.role === 'FULL_MANAGER' ? 'HEAD_COACH' : demands.role,
    contractLength: Math.max(demands.minContractLength, demands.contractLength - 1)
  };
  // Store as data attributes for JS access
  var offerDataWage = currentOffer.wage;
  var offerDataRole = currentOffer.role;
  var offerDataLength = currentOffer.contractLength;

  html += '  <div class="bg-backdrop border border-border/60 rounded-lg p-4" id="offer-panel">';
  html += '    <div class="text-[9px] text-text-muted uppercase font-bold tracking-wider mb-2">Your Offer</div>';
  html += '    <div class="flex flex-col gap-3">';

  // Role dropdown
  html += '      <div class="flex flex-col gap-1">';
  html += '        <span class="text-[9px] text-text-muted">Role</span>';
  html += '        <select id="offer-role" class="w-full text-xs bg-backdrop border border-border rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-text-muted">';
  var roleOptions = ['FULL_MANAGER', 'HEAD_COACH'];
  for (var ri = 0; ri < roleOptions.length; ri++) {
    var sel = roleOptions[ri] === currentOffer.role ? 'selected' : '';
    html += '          <option value="' + roleOptions[ri] + '" ' + sel + '>' + roleOptions[ri].replace(/_/g, ' ') + '</option>';
  }
  html += '        </select>';
  if (demands.role === 'FULL_MANAGER') {
    html += '        <div class="text-[8px] text-yellow-500" id="role-warning">\u26A0 This will significantly reduce satisfaction</div>';
  }
  html += '      </div>';

  // Wage input
  html += '      <div class="flex flex-col gap-1">';
  html += '        <span class="text-[9px] text-text-muted">Wage (\u00A3/wk)</span>';
  html += '        <div class="wage-input-group">';
  html += '          <button class="wage-step-btn" id="wage-minus">\u2212</button>';
  html += '          <input type="text" id="offer-wage" class="wage-value-input" value="' + formatWage(currentOffer.wage) + '" data-wage="' + currentOffer.wage + '">';
  html += '          <button class="wage-step-btn" id="wage-plus">+</button>';
  html += '        </div>';
  html += '      </div>';

  // Contract length
  html += '      <div class="flex flex-col gap-1">';
  html += '        <span class="text-[9px] text-text-muted">Contract Length</span>';
  html += '        <select id="offer-length" class="w-full text-xs bg-backdrop border border-border rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-text-muted">';
  var lengthOptions = [1, 2, 3, 4, 5];
  for (var li = 0; li < lengthOptions.length; li++) {
    var selL = lengthOptions[li] === currentOffer.contractLength ? 'selected' : '';
    html += '          <option value="' + lengthOptions[li] + '" ' + selL + '>' + lengthOptions[li] + ' year' + (lengthOptions[li] > 1 ? 's' : '') + '</option>';
  }
  html += '        </select>';
  html += '      </div>';

  html += '    </div>';
  html += '  </div>';

  html += '</div>'; // End negotiation-panel

  // Satisfaction bar (live preview)
  html += '<div class="mt-4">';
  html += '  <div class="flex items-center justify-between text-[9px] text-text-muted mb-1">';
  html += '    <span>Satisfaction</span>';
  html += '    <span id="satisfaction-label">' + evaluateOffer(manager, negState, currentOffer).score + '% — ' + getSatisfactionLabel(evaluateOffer(manager, negState, currentOffer)) + '</span>';
  html += '  </div>';
  html += '  <div class="satisfaction-bar">';
  var initialEval = evaluateOffer(manager, negState, currentOffer);
  var satClass = initialEval.score >= 60 ? 'green' : initialEval.score >= 35 ? 'yellow' : 'red';
  html += '    <div class="satisfaction-bar-fill ' + satClass + '" id="satisfaction-fill" style="width:' + Math.max(0, Math.min(100, initialEval.score)) + '%"></div>';
  html += '  </div>';
  html += '</div>';

  // Last response text
  if (negState.lastResponse) {
    html += '<div class="mt-3 bg-backdrop border border-border/60 rounded-lg p-3">';
    html += '  <div class="text-[9px] text-text-muted uppercase font-bold tracking-wider mb-1">Last Response</div>';
    html += '  <div class="text-xs text-text-secondary italic">"' + escHtml(negState.lastResponse) + '"</div>';
    html += '</div>';
  }

  // Buttons
  html += '<div class="flex gap-2 mt-4">';
  html += '  <button id="submit-offer-btn" class="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors shadow-md">Submit Offer</button>';
  html += '  <button id="walk-away-btn" class="py-2.5 px-4 bg-red-900/40 hover:bg-red-800 border border-red-500/30 hover:border-red-500 text-red-400 text-xs font-bold uppercase tracking-wider rounded transition-colors">Walk Away</button>';
  html += '</div>';

  content.innerHTML = html;
  modal.classList.remove("hidden");

  // Wire negotiation controls
  wireNegotiationOffer(manager, demands, negState);
}

function getSatisfactionLabel(evalResult) {
  if (!evalResult) return '—';
  if (evalResult.outcome === 'ACCEPT') return 'Likely to accept';
  if (evalResult.outcome === 'COUNTER_OFFER') return 'Uncertain — may counter';
  if (evalResult.outcome === 'WALK_AWAY') return 'Will reject / walk away';
  return 'Will reject';
}

function wireNegotiationOffer(manager, demands, negState) {
  var offerWageInput = document.getElementById('offer-wage');
  var offerRoleSelect = document.getElementById('offer-role');
  var offerLengthSelect = document.getElementById('offer-length');
  var submitBtn = document.getElementById('submit-offer-btn');
  var walkBtn = document.getElementById('walk-away-btn');
  var closeBtn = document.getElementById('negotiation-close-btn');
  var modal = document.getElementById('manager-interview-modal');

  if (!offerWageInput || !submitBtn) return;


  function getCurrentOffer() {
    var wage = parseWage(offerWageInput.value);
    wage = Math.max(1000, Math.round(wage / 500) * 500);
    var role = offerRoleSelect ? offerRoleSelect.value : 'HEAD_COACH';
    var length = offerLengthSelect ? parseInt(offerLengthSelect.value, 10) : 1;
    return { wage: wage, role: role, contractLength: length };
  }

  // Debounced satisfaction update
  var satTimeout = null;
  function updateSatisfaction() {
    if (satTimeout) clearTimeout(satTimeout);
    satTimeout = setTimeout(function () {
      var offer = getCurrentOffer();
      var evalResult = evaluateOffer(manager, negState, offer);
      var fill = document.getElementById('satisfaction-fill');
      var label = document.getElementById('satisfaction-label');
      if (fill) {
        var satClass = evalResult.score >= 60 ? 'green' : evalResult.score >= 35 ? 'yellow' : 'red';
        fill.className = 'satisfaction-bar-fill ' + satClass;
        fill.style.width = Math.max(0, Math.min(100, evalResult.score)) + '%';
      }
      if (label) {
        label.textContent = evalResult.score + '% — ' + getSatisfactionLabel(evalResult);
      }

      // Role warning
      var roleWarn = document.getElementById('role-warning');
      if (roleWarn) {
        var isReluctant = negState.interestResult && negState.interestResult.band === 'RELUCTANT';
        if (offer.role !== demands.role) {
          roleWarn.textContent = isReluctant ? '\u26A0 This will likely end negotiations' : '\u26A0 This will significantly reduce satisfaction';
          roleWarn.style.display = '';
        } else {
          roleWarn.style.display = 'none';
        }
      }
    }, 200);
  }

  // Wire wage input
  offerWageInput.addEventListener('input', updateSatisfaction);
  offerWageInput.addEventListener('blur', function () {
    var w = parseWage(offerWageInput.value);
    w = Math.max(1000, Math.round(w / 500) * 500);
    offerWageInput.value = formatWage(w);
    updateSatisfaction();
  });

  // Wire step buttons
  var minusBtn = document.getElementById('wage-minus');
  var plusBtn = document.getElementById('wage-plus');
  if (minusBtn) {
    minusBtn.addEventListener('click', function () {
      var w = parseWage(offerWageInput.value);
      w = Math.max(1000, w - 500);
      offerWageInput.value = formatWage(w);
      updateSatisfaction();
    });
  }
  if (plusBtn) {
    plusBtn.addEventListener('click', function () {
      var w = parseWage(offerWageInput.value);
      w = w + 500;
      offerWageInput.value = formatWage(w);
      updateSatisfaction();
    });
  }

  // Wire role and length
  if (offerRoleSelect) offerRoleSelect.addEventListener('change', updateSatisfaction);
  if (offerLengthSelect) offerLengthSelect.addEventListener('change', updateSatisfaction);

  // Submit offer
  submitBtn.addEventListener('click', function () {
    var offer = getCurrentOffer();
    var evalResult = evaluateOffer(manager, negState, offer);

    // Store last response
    negState.lastResponse = evalResult.reaction;

    // Push offer to history
    if (!negState.userOffers) negState.userOffers = [];
    negState.userOffers.push(offer);

    if (evalResult.outcome === 'ACCEPT') {
      // Accept — hire the manager
      if (!manager._originalAttributes) {
        manager._originalAttributes = {
          Tac_Knw: manager["Tac Knw"] || manager["Tac_Knw"] || 0,
          Judge_P: manager["Judge P"] || manager["Judge_P"] || 0,
          Judge_A: manager["Judge A"] || manager["Judge_A"] || 0,
          Det: manager.Det || 0,
          Prof: manager.Prof || 0,
          Youth: manager.Youth || 0
        };
      }
      window.FM24State.manager.hired = manager;
      window.FM24State.manager.mode = offer.role === 'FULL_MANAGER' ? 'full_manager' : 'head_coach';
      window.FM24State.manager.managerWage = offer.wage;
      window.FM24State.manager.negotiation.status = 'agreed';

      // Record in hireHistory
      var mgrState = window.FM24State.manager;
      if (!mgrState.hireHistory) mgrState.hireHistory = [];
      var existingIdx = -1;
      for (var hi = 0; hi < mgrState.hireHistory.length; hi++) {
        if (mgrState.hireHistory[hi].name === manager.Name && mgrState.hireHistory[hi].outcome === null) {
          existingIdx = hi;
          break;
        }
      }
      if (existingIdx === -1) {
        mgrState.hireHistory.push({
          name: manager.Name,
          ca: manager.CA || 0,
          outcome: 'active',
          windowsServed: 0,
          alignmentScore: mgrState.negotiation.alignmentScore || 50,
          promisesFulfilled: 0,
          promisesBroken: 0,
          hiredAt: Date.now()
        });
      }

      if (typeof filterTabsByMode === "function") {
        filterTabsByMode(window.FM24State.appMode);
      }

      // Apply tactic and generate mandates
      applyManagerTacticAutomatically(manager, window.FM24State.squad);
      if (typeof generateMandates === 'function') {
        try { generateMandates(); } catch (e) {}
      }

      modal.classList.add("hidden");
      renderManagerView();
      if (window.FM24State.appMode === "dof" && typeof window.FM24SwitchTab === "function") {
        window.FM24SwitchTab("dashboard");
      }
      showToast("Deal agreed — " + manager.Name + " joins as " + offer.role.replace(/_/g, ' ') + " at \u00A3" + (offer.wage / 1000).toFixed(0) + ",000/week", "success");

    } else if (evalResult.outcome === 'WALK_AWAY') {
      negState.status = 'collapsed';
      modal.classList.add("hidden");
      var walkMsg = evalResult.reason === 'reluctant_threshold'
        ? (manager.Name + ' was never convinced — negotiations ended.')
        : (manager.Name + ' has walked away from negotiations.');
      showToast(walkMsg, 'error');
      renderManagerView();
    } else {
      // COUNTER_OFFER or REJECT — advance round
      negState.negotiationRound = (negState.negotiationRound || 0) + 1;

      if (evalResult.counter) {
        // Update demands with counter
        negState.currentDemands.wage = evalResult.counter.wage;
        negState.currentDemands.role = evalResult.counter.role;
        negState.currentDemands.contractLength = evalResult.counter.contractLength;
      }

      if (negState.negotiationRound >= 3) {
        // Max rounds reached — force walk away
        negState.status = 'collapsed';
        modal.classList.add("hidden");
        showToast(manager.Name + ' — no agreement reached. Negotiations ended.', 'error');
        renderManagerView();
      } else {
        // Re-render negotiation modal with updated state
        renderNegotiationModal(manager);
      }
    }
  });

  // Walk away button
  if (walkBtn) {
    walkBtn.addEventListener('click', function () {
      negState.status = 'collapsed';
      modal.classList.add("hidden");
      showToast(manager.Name + ' — negotiations cancelled.', 'error');
      renderManagerView();
    });
  }

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      negState.status = 'collapsed';
      modal.classList.add("hidden");
      renderManagerView();
    });
  }
}

// ─── EVENT WIRING ───

function wireManagerRowClicks() {}

function wireAnalyseButton() {}

// ─── DOF-FEATURE: CONFIRM / CANCEL INTERVENTION ───

function buildStructuredOutFromTransferResult(tr) {
  var out = [];
  (tr.soldPlayers || []).forEach(function (sp) {
    out.push({ player: sp, fee: sp.Fee || sp.saleFee || 0, type: 'SOLD', position: sp.Position || sp.BestPosition || '', age: sp.Age || 0 });
  });
  (tr.emergencySales || []).forEach(function (es) {
    var p = es.player || es;
    out.push({ player: p, fee: p.Fee || 0, type: 'EMERGENCY_SOLD', position: p.Position || p.BestPosition || '', age: p.Age || 0 });
  });
  (tr.releasedPlayers || []).forEach(function (rp) {
    out.push({ player: rp, fee: 0, type: 'RELEASED', position: rp.Position || rp.BestPosition || '', age: rp.Age || 0 });
  });
  (tr.loanedPlayers || []).forEach(function (lp) {
    var p = lp.player || lp;
    out.push({ player: p, fee: 0, type: 'LOANED', position: p.Position || p.BestPosition || '', age: p.Age || 0 });
  });
  return out;
}

function confirmDofDecisions() {
  var state = window.FM24State.manager;
  var partAResult = state.partAResult;
  if (!partAResult) {
    showToast("No DOF analysis in progress.", "error");
    return;
  }

  // Collect decision values from the selects
  var decisionSelects = document.querySelectorAll(".dof-decision-select");
  var resolvedDecisions = partAResult.pendingDecisions.map(function (d, idx) {
    var select = document.querySelector('select[data-decision-id="dof-decision-' + idx + '"]');
    var dofDecision = select ? select.value : (d.dofDecision || 'APPROVE');
    return {
      type: d.type,
      player: d.player,
      manager: d.manager,
      reason: d.reason,
      financials: d.financials,
      dofDecision: dofDecision,
      contextGapSlot: d.contextGapSlot,
      recallFitScore: d.recallFitScore
    };
  });

  // Collect incoming bid decisions
  var bidSelects = document.querySelectorAll(".dof-bid-select");
  var resolvedBids = [];
  bidSelects.forEach(function (select) {
    var idx = parseInt(select.getAttribute('data-bid-id').replace('dof-bid-', ''), 10);
    var bid = state.incomingBids[idx];
    if (bid) {
      bid.dofDecision = select.value;
      resolvedBids.push(bid);
    }
  });
  state.partAResult.pendingDecisions = resolvedDecisions;

  // Run Part B
  if (typeof runPartB === "function") {
    var partBResult = runPartB(partAResult, resolvedDecisions);
    if (partBResult) {
      state.transferResultV2 = partBResult;
      state.transfers = { in: partBResult.signedPlayers, out: buildStructuredOutFromTransferResult(partBResult) };
      state.squadDesignations = partBResult.designations;
      state.partAResult = null;
      state.windowStage = 'COMPLETE';
      state.windowActive = true;

      // Update board confidence and evaluate mandates
      var board = window.FM24State.board || { confidence: 70, stage: 'NORMAL', mandates: [], mandateHistory: [] };
      if (typeof generateBoardMandate === "function" && board.mandates.length === 0) {
        var ledgerPartA = partAResult.ledger || { weeklyWageBill: 0, wageBudget: 500000 };
        board.mandates = generateBoardMandate(window.FM24State.squad, ledgerPartA, partAResult.audit.unresolved || []);
      }
      if (typeof evaluateMandates === "function") {
        var finalState = {
          squad: window.FM24State.squad,
          signedPlayers: partBResult.signedPlayers || [],
          gaps: partAResult.audit.unresolved || [],
          starters: partBResult.slotQualityTable || [],
          depth: [],
          protectedPlayers: [],
          candidateMinScore: partAResult.audit.candidateMinScore || 11
        };
        var ledgerPartB = { weeklyWageBill: partBResult.weeklyWageBill || 0, wageBudget: partAResult.ledger ? partAResult.ledger.wageBudget : 500000 };
        board.mandates = evaluateMandates(board.mandates, finalState, ledgerPartB);
      }
      // 6.3 Board Objective Arcs — generate if none active, then evaluate
      if (typeof generateObjectiveArc === "function") {
        generateObjectiveArc(window.FM24State.squad, board, state.windowCount || 0);
      }
      if (typeof evaluateObjectiveArc === "function") {
        var arcResult = evaluateObjectiveArc(
          board, window.FM24State.squad, state.windowCount || 0,
          partBResult.startSquadAvgQuality || 0,
          partBResult.endSquadAvgQuality || 0,
          partBResult.weeklyWageBill || 0
        );
        if (arcResult && arcResult.boost !== 0) {
          board.confidence = Math.max(0, Math.min(100, board.confidence + arcResult.boost));
          if (arcResult.boost > 0) {
            state.windowHistory = state.windowHistory || [];
            if (state.windowHistory.length > 0) {
              state.windowHistory[state.windowHistory.length - 1].arcCompleted = arcResult.arc.type;
            }
          }
        }
      }
      if (typeof updateBoardConfidence === "function") {
        var activeMandates = board.mandates.filter(function (m) { return m.status !== 'PASSED' && m.status !== 'FAILED'; });
        if (activeMandates.length === 0) activeMandates = board.mandates;
        var confResult = updateBoardConfidence(activeMandates, board.confidence || 70, null);
        board.confidence = confResult.newConfidence;
        board.stage = typeof resolveStage === "function" ? resolveStage(board.confidence) : 'NORMAL';
        board.mandateHistory = board.mandateHistory || [];
        // 6.1 Compute Squad DNA Evolution score
        var dnaResult = typeof computeDnaScore === "function"
          ? computeDnaScore(window.FM24State.squad, partAResult.audit ? (window.FM24State.tactic || state.generatedTactic) : null)
          : { score: null, details: [] };
        board.mandateHistory.push({
          mandates: JSON.parse(JSON.stringify(board.mandates)),
          delta: confResult.delta,
          newConfidence: confResult.newConfidence,
          dnaScore: dnaResult.score,
          timestamp: Date.now()
        });
      }
      window.FM24State.board = board;
      evaluatePastSignings();

      // Apply relationship deltas based on decisions
      if (typeof applyRelationshipDeltas === "function") {
        applyRelationshipDeltas(state.hired, resolvedDecisions);
      }

      // 4.3 Contract dispute resolution
      if (state.contractDispute) {
        var contractSelect = document.getElementById("contract-dispute-decision");
        if (contractSelect) {
          var contractDecision = contractSelect.value;
          board.contractDisputeDecision = contractDecision;
          if (contractDecision === 'RENEW') {
            board.confidence = Math.min(100, (board.confidence || 70) + 5);
            state.relationshipIndex = Math.min(100, (state.relationshipIndex || 60) + 15);
            state.contractDispute = false;
            state.lowRelationshipConsecutive = 0;
            showToast("Contract renewed. Relationship improved.", "success");
          } else if (contractDecision === 'DISMISS') {
            board.confidence = 0;
            (state.hireHistory || []).forEach(function (h) { if (h.outcome === 'active') h.outcome = 'dismissed'; });
            state.hired = null;
            state.mode = null;
            state.contractDispute = false;
            state.lowRelationshipConsecutive = 0;
            board.stage = 'DISMISSAL_RISK';
            showToast("Manager dismissed by the board.", "error");
          } else {
            // STATUS_QUO
            board.confidence = Math.max(0, (board.confidence || 70) - 10);
            showToast("Status quo maintained. Board confidence decreased.", "warning");
          }
        }
      }

      if (typeof window.renderAll === "function") { window.renderAll(); } else { renderManagerView(); }
      showToast("Incoming phase complete. " + (partBResult.signedPlayers.length || 0) + " players signed.", "success");
    } else {
      showToast("Part B execution failed. Check data.", "error");
    }
  } else {
    // Fallback if runPartB not available
    var budget = state.budget || 50000000;
    var wageBudget = state.wageBudget || 500000;
    var tactic = state.generatedTactic;
    var squad = window.FM24State.squad;
    if (typeof simulateTransferWindowV2 === "function") {
      var transferResult = simulateTransferWindowV2(state.hired, squad, window.FM24State.market, budget, wageBudget, tactic);
      state.transferResultV2 = transferResult;
      state.partAResult = null;
      state.transfers = { in: transferResult.signedPlayers, out: buildStructuredOutFromTransferResult(transferResult) };
      state.squadDesignations = transferResult.designations;
      evaluatePastSignings();
      state.windowStage = 'COMPLETE';
      state.windowActive = false;
      if (typeof window.renderAll === "function") { window.renderAll(); } else { renderManagerView(); }
      showToast("Transfer window complete (fallback mode).", "success");
    } else {
      showToast("Transfer engine not available.", "error");
    }
  }
}

function cancelDofWindow() {
  if (!confirm("Cancel this transfer window? All pending decisions will be discarded.")) return;
  var state = window.FM24State.manager;
  state.partAResult = null;
  state.transferResultV2 = null;
  state.incomingBids = [];
  state.generatedTactic = null;
  state.report = null;
  state.gaps = [];
  state.recommendations = [];
  state.windowStage = null;
  state.windowActive = false;
  if (typeof window.renderAll === "function") { window.renderAll(); } else { renderManagerView(); }
  showToast("Transfer window cancelled. Return to analysis step.", "info");
}

function evaluatePastSignings() {
  var state = window.FM24State.manager;
  var trV2 = state.transferResultV2;
  
  // Calculate window count
  var currentWindowIndex = (state.windowCount || 0) + 1;
  state.windowCount = currentWindowIndex;

  var board = window.FM24State.board || {};
  
  // Track signings if there are any
  if (trV2 && trV2.signedPlayers && trV2.signedPlayers.length > 0) {
    if (!board.signingHistory) board.signingHistory = [];
    var signingHistory = board.signingHistory;
    trV2.signedPlayers.forEach(function (sig) {
      var fitScore = sig.trueFitScore || sig.scoutedScore || 0;
      var slotQuality = typeof PlayerUtils !== "undefined"
        ? PlayerUtils.slotQuality(sig.player, fitScore)
        : fitScore;
      signingHistory.push({
        playerName: sig.player.Name || sig.name || (sig.player && sig.player.name),
        age: (sig.player && sig.player.Age) || sig.age || 0,
        fee: sig.fee || 0,
        roleId: sig.roleId || '',
        windowIndex: currentWindowIndex,
        trueFitScore: fitScore,
        scoutedScore: sig.scoutedScore || 0,
        slotQualityAtSigning: sig.slotQualityAtSigning || slotQuality,
        timestamp: Date.now()
      });
    });
    board.signingHistory = signingHistory;
  }

  // Construct and push window history record
  state.windowHistory = state.windowHistory || [];
  
  var label = "W" + currentWindowIndex + " " + (currentWindowIndex % 2 === 1 ? "Sum" : "Win");
  var budget = state.budget || 50000000;
  var spent = trV2 ? (trV2.totalSpent || 0) : 0;
  var sales = trV2 ? (trV2.totalSaleRevenue || 0) : 0;
  var salesCount = trV2 ? ((trV2.soldPlayers ? trV2.soldPlayers.length : 0) + (trV2.emergencySales ? trV2.emergencySales.length : 0)) : 0;
  var signed = trV2 ? (trV2.signedPlayers ? trV2.signedPlayers.length : 0) : 0;
  var busts = trV2 ? (trV2.scoutingBusts ? trV2.scoutingBusts.length : 0) : 0;
  
  var mandateStatusStr = "";
  if (board.mandates && board.mandates.length > 0) {
    board.mandates.forEach(function (m) {
      if (m.status === 'PASSED') mandateStatusStr += "✓";
      else if (m.status === 'FAILED') mandateStatusStr += "✗";
    });
  }
  if (!mandateStatusStr) mandateStatusStr = "—";

  var rel = state.relationshipIndex !== undefined ? state.relationshipIndex : 60;
  
  var prevRecord = state.windowHistory && state.windowHistory[state.windowHistory.length - 1];
  var fallbackQuality = prevRecord ? (prevRecord.endSquadAvgQuality || prevRecord.startSquadAvgQuality || 13.9) : 13.9;
  
  var startSquadAvgQuality = trV2 && trV2.startSquadAvgQuality ? trV2.startSquadAvgQuality : fallbackQuality;
  var endSquadAvgQuality = trV2 && trV2.endSquadAvgQuality ? trV2.endSquadAvgQuality : startSquadAvgQuality;
  var eventLog = trV2 && trV2.eventLog ? JSON.parse(JSON.stringify(trV2.eventLog)) : [];

  state.windowHistory.push({
    windowIndex: currentWindowIndex,
    label: label,
    budget: budget,
    spent: spent,
    sales: sales,
    salesCount: salesCount,
    signed: signed,
    busts: busts,
    mandates: mandateStatusStr,
    rel: rel,
    startSquadAvgQuality: startSquadAvgQuality,
    endSquadAvgQuality: endSquadAvgQuality,
    eventLog: eventLog,
    dnaScore: board.mandateHistory && board.mandateHistory.length > 0
      ? board.mandateHistory[board.mandateHistory.length - 1].dnaScore
      : null,
    timestamp: Date.now()
  });

  window.FM24State.board = board;

  // 4.3 Contract dispute tracking: check relationship after window
  if (state.relationshipIndex !== undefined && state.relationshipIndex < 40) {
    state.lowRelationshipConsecutive = (state.lowRelationshipConsecutive || 0) + 1;
  } else {
    state.lowRelationshipConsecutive = 0;
  }
  if (state.lowRelationshipConsecutive >= 2 && !state.contractDispute) {
    state.contractDispute = true;
    // Generate board decision event for contract dispute
    if (board.mandates) {
      board.contractDisputeDecision = null; // null = pending, will be set by intervention
    }
  }
  if (state.relationshipIndex !== undefined && state.relationshipIndex >= 50 && state.contractDispute) {
    // Recovery: if relationship recovers above 50, dispute ends
    state.contractDispute = false;
    state.lowRelationshipConsecutive = 0;
  }

  // 4.4 Free agent pool: add released players from this window
  if (trV2 && trV2.releasedPlayers && trV2.releasedPlayers.length > 0) {
    window.FM24State.freeAgentPool = window.FM24State.freeAgentPool || [];
    trV2.releasedPlayers.forEach(function (rp) {
      var existing = window.FM24State.freeAgentPool.some(function (fa) {
        return (fa.Name === rp.Name || fa.name === rp.Name) && fa.status === 'RELEASED';
      });
      if (!existing) {
        window.FM24State.freeAgentPool.push({
          Name: rp.Name,
          Age: rp.Age || 0,
          CA: rp.CA || 0,
          PA: rp.PA || 0,
          Wage: rp.Wage || 0,
          AP: 0,
          Det: rp.Det || 0,
          Prof: rp.Prof || 0,
          status: 'RELEASED',
          windowReleased: state.windowCount || 0
        });
      }
    });
  }

  // 4.1 Unrest player tracking: scan unsold/refused/emergency sales for high-Det players
  if (trV2 && trV2.unsoldSurplus) {
    state.unrestPlayers = [];
    trV2.unsoldSurplus.forEach(function (u) {
      var p = u.player || u;
      var det = p.Det || p.Determination || u.Det || 0;
      if (det >= 12) {
        state.unrestPlayers.push({
          name: p.Name || u.name,
          age: p.Age || u.Age || 0,
          det: det,
          ca: p.CA || u.CA || 0,
          reason: 'UNSOLD'
        });
      }
    });
  }

  // 5.3 Unsold windows tracking: increment unsoldWindows for UNSOLD players in signingHistory
  var allUnsoldNames = {};
  if (trV2 && trV2.unsoldSurplus) {
    trV2.unsoldSurplus.forEach(function (u) {
      allUnsoldNames[u.name || (u.player ? u.player.Name : '')] = true;
    });
  }
  if (trV2 && trV2.refusedListings) {
    trV2.refusedListings.forEach(function (u) {
      allUnsoldNames[u.name || (u.player ? u.player.Name : '')] = true;
    });
  }
  // Increment unsoldWindows for matching entries in signingHistory
  if (!board.signingHistory) board.signingHistory = [];
  board.signingHistory.forEach(function (sh) {
    if (sh.status === 'UNSOLD' || sh.status === 'REFUSES_LEAVE') {
      sh.unsoldWindows = (sh.unsoldWindows || 0) + 1;
    }
  });
  // Add new unsold entries for this window
  if (trV2 && trV2.unsoldSurplus) {
    trV2.unsoldSurplus.forEach(function (u) {
      var p = u.player || u;
      var pName = p.Name || u.name;
      if (!pName) return;
      var exists = board.signingHistory.some(function (sh) { return sh.name === pName && (sh.status === 'UNSOLD' || sh.status === 'REFUSES_LEAVE'); });
      if (!exists) {
        board.signingHistory.push({
          name: pName,
          age: p.Age || u.Age || 0,
          status: 'UNSOLD',
          unsoldWindows: 1,
          windowIndex: currentWindowIndex
        });
      }
    });
  }
  if (trV2 && trV2.refusedListings) {
    trV2.refusedListings.forEach(function (u) {
      var p = u.player || u;
      var pName = p.Name || u.name;
      if (!pName) return;
      var exists = board.signingHistory.some(function (sh) { return sh.name === pName && (sh.status === 'UNSOLD' || sh.status === 'REFUSES_LEAVE'); });
      if (!exists) {
        board.signingHistory.push({
          name: pName,
          age: p.Age || u.Age || 0,
          status: 'REFUSES_LEAVE',
          unsoldWindows: 1,
          windowIndex: currentWindowIndex
        });
      }
    });
  }
  if (trV2 && trV2.refusedListings) {
    trV2.refusedListings.forEach(function (u) {
      var p = u.player || u;
      var det = p.Det || p.Determination || u.Det || 0;
      if (det >= 12) {
        state.unrestPlayers.push({
          name: p.Name || u.name,
          age: p.Age || u.Age || 0,
          det: det,
          ca: p.CA || u.CA || 0,
          reason: 'REFUSED_LEAVE'
        });
      }
    });
  }
  if (trV2 && trV2.emergencySales) {
    trV2.emergencySales.forEach(function (u) {
      var p = u.player || u;
      var det = p.Det || p.Determination || 0;
      if (det >= 12) {
        state.unrestPlayers.push({
          name: p.Name || u.name,
          age: p.Age || u.Age || 0,
          det: det,
          ca: p.CA || u.CA || 0,
          reason: 'EMERGENCY_SOLD'
        });
      }
    });
  }

  // 6.2 Manager Development: attribute evolution based on window outcomes
  var hired = state.hired;
  if (hired && hired._originalAttributes && trV2) {
    // Calculate Tac_Knw gain: +1 if all mandates passed
    var allMandatesMet = board.mandates && board.mandates.length > 0
      ? board.mandates.every(function (m) { return m.met; })
      : false;
    if (allMandatesMet) {
      var currentTac = hired["Tac Knw"] || hired["Tac_Knw"] || 0;
      var origTac = hired._originalAttributes.Tac_Knw || 0;
      var maxTac = origTac + 3;
      if (currentTac < maxTac) {
        var newTac = Math.min(maxTac, currentTac + 1);
        hired["Tac Knw"] = newTac;
        hired["Tac_Knw"] = newTac;
      }
    }
    // Calculate Judge_P penalty: -1 per scouting bust
    var bustCount = trV2.scoutingBusts ? trV2.scoutingBusts.length : 0;
    if (bustCount > 0) {
      var currentJudge = hired["Judge P"] || hired["Judge_P"] || 0;
      var origJudge = hired._originalAttributes.Judge_P || 0;
      var minJudge = origJudge - 3;
      var newJudge = Math.max(minJudge, currentJudge - bustCount);
      hired["Judge P"] = newJudge;
      hired["Judge_P"] = newJudge;
    }
  }

  // Persist the save file immediately if a save session is active
  if (window.FM24State.currentSaveName && typeof createSave === "function") {
    createSave(window.FM24State.appMode, window.FM24State.currentSaveName);
  }
}

function applyRelationshipDeltas(manager, decisions) {
  if (!manager || !decisions) return;
  var state = window.FM24State.manager;
  var delta = 0;
  decisions.forEach(function (d) {
    if (d.dofDecision === 'APPROVE') delta += 1;
    else if (d.dofDecision === 'BLOCK') delta -= 2;
  });
  state.relationshipIndex = Math.max(0, Math.min(100, (state.relationshipIndex || 60) + delta));
  state.relationshipHistory = state.relationshipHistory || [];
  state.relationshipHistory.push({
    delta: delta,
    newIndex: state.relationshipIndex,
    reason: 'Decision batch | ' + decisions.length + ' items',
    timestamp: Date.now()
  });
}

function wireResultsButtons() {}

function wireResetButton() {}

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
      validateSquadData(result, targetKey);
      if (targetKey === "squad") {
        window.FM24State.squad = result;
        // Warn if playing time columns are missing
        if (result.length > 0) {
          var first = result[0];
          if (first.Mins === undefined || first.AvRat === undefined || first.AgreedPT === undefined || first.ActualPT === undefined) {
            showToast("Squad loaded but Mins/AvRat/AgreedPT/ActualPT columns not found — playing time features disabled. Re-export with these columns.", "warning");
          }
        }
        window.dispatchEvent(new CustomEvent("fm24:squad-loaded", { detail: { count: result.length } }));
        showToast("Loaded " + result.length + " players", "success");
        // Check evolution with new squad, then update baseline
        if (typeof computeEvolutionSignal === 'function' && typeof applyEvolution === 'function') {
          var evoResult = computeEvolutionSignal(window.FM24State, window.FM24State.manager, window.FM24State.squad);
          if (evoResult.changed) {
            setTimeout(function () { applyEvolution(evoResult, window.FM24State); }, 600);
          } else {
            window.FM24State.manager.lastFitBaseline = buildNewFitBaseline(window.FM24State.squad, window.FM24State.tactic);
          }
        }
      } else {
        validateSquadData(result, 'market');
        window.FM24State.market = result;
        window.dispatchEvent(new CustomEvent("fm24:market-loaded", { detail: { count: result.length } }));
        showToast("Loaded " + result.length + " market players", "success");
      }
      renderManagerView();
    }).catch(function (err) {
      showToast(err.message || "Failed to parse file", "error");
    });
  };
  reader.readAsText(file);
}

// ─── APPLY MANAGER TACTIC AUTOMATICALLY ON HIRE ───

function applyManagerTacticAutomatically(selectedMgr, squad) {
  if (selectedMgr && squad && squad.length > 0) {
    if (typeof generateTacticFromManager === "function") {
      var tactic = generateTacticFromManager(selectedMgr, squad);
      if (tactic) {
        selectedMgr.tactic = tactic;
        if (typeof generateManagerReport === "function") {
          selectedMgr.report = generateManagerReport(selectedMgr, tactic, squad);
        }
        if (typeof calculateManagerFit === "function") {
          selectedMgr.fitScore = calculateManagerFit(selectedMgr, squad, tactic);
        }
        
        // Copy to active tactic
        window.FM24State.tactic.formation = tactic.formation;
        window.FM24State.tactic.slots = JSON.parse(JSON.stringify(tactic.slots));
        window.FM24State.tactic.instructions = JSON.parse(JSON.stringify(tactic.instructions));
        window.FM24State.tactic.isComplete = true;
        window.FM24State.tactic.subs = {};
        
        // Auto pick starting squad & bench
        var autoPickFn = typeof _handleAutoPick === "function" ? _handleAutoPick : (typeof autopickSquad === "function" ? autopickSquad : null);
        if (autoPickFn) {
          autoPickFn(false);
        }
        
        if (typeof persistTactic === "function") {
          persistTactic();
        }
      }
    }
  }
}

// ─── UPDATE TACTICAL ANALYSIS (PERSISTENT BLUEPRINT) ───

function updateTacticalAnalysis(force) {
  var state = window.FM24State.manager;
  var squad = window.FM24State.squad;
  if (state.hired && squad && squad.length > 0) {
    if (!state.hired.tactic || force) {
      var tactic = generateTacticFromManager(state.hired, squad);
      if (tactic) {
        state.hired.tactic = tactic;
        state.hired.report = generateManagerReport(state.hired, tactic, squad);
        state.hired.fitScore = calculateManagerFit(state.hired, squad, tactic);
      }
    }
  }
}

// ─── RUN ANALYSIS ───

function runAnalysis() {
  var state = window.FM24State.manager;
  var squad = window.FM24State.squad;
  if (!state.hired || !squad || squad.length === 0) {
    showToast("Hire a manager and load a squad first.", "error");
    return;
  }

  // Read current budget values from DOM if inputs are available
  var budgetInput = document.getElementById("transfer-budget-input");
  if (budgetInput) {
    state.budget = parseInt(budgetInput.value, 10) || 0;
  }
  var wageInput = document.getElementById("wage-budget-input");
  if (wageInput) {
    state.wageBudget = parseInt(wageInput.value, 10) || 0;
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
  state.windowStage = null;
  state.windowActive = false;

  // Apply board constraints before running analysis
  var board = window.FM24State.board || {};
  if (typeof applyBoardConstraint === "function" && squad) {
    board.activeConstraint = applyBoardConstraint(squad, board);
  }

  // Assisted Head Coach mode: staged Part A → intervention → Part B
  if (state.mode === "head_coach" && typeof runPartA === "function") {
    var budget = state.budget || 50000000;
    var wageBudget = state.wageBudget || 500000;
    var partAResult = runPartA(state.hired, squad, window.FM24State.market || [], budget, wageBudget, tactic);
    state.partAResult = partAResult;
    state.transferResultV2 = null;
    state.transfers = { in: [], out: [] };
    state.squadDesignations = partAResult ? partAResult.audit.designations : [];

    // Generate incoming bids for intervention panel
    var getBidsFn = typeof window !== "undefined" ? window.generateIncomingBids : (typeof global !== "undefined" ? global.generateIncomingBids : null);
    if (typeof getBidsFn === "function" && partAResult) {
      var simulationState = {
        surplusPool: partAResult.audit.surplusPool || [],
        dynamicThreshold: partAResult.audit.dynamicThreshold || 11
      };
      state.incomingBids = getBidsFn(squad, simulationState);
    } else {
      state.incomingBids = [];
    }

    // Generate board mandates
    if (partAResult && typeof generateBoardMandate === "function" && board.mandates.length === 0) {
      var ledger = partAResult.ledger || { weeklyWageBill: 0, wageBudget: 500000 };
      board.mandates = generateBoardMandate(squad, ledger, tactic.gaps || []);
      board.mandates.forEach(function (m) { m.status = 'ACTIVE'; });
    }

    // Evaluate past signings if this is a subsequent window
    if (state.windowCount > 0 && typeof evaluatePastSignings === "function") {
      evaluatePastSignings();
    }

    state.windowStage = 'PART_A_COMPLETE';
    state.windowActive = true;
  } else if (state.mode === "full_manager" && window.FM24State.market && window.FM24State.market.length > 0) {
    var budget = state.budget || 50000000;
    var wageBudget = state.wageBudget || 500000;
    if (typeof simulateTransferWindowV2 === "function") {
      var transferResult = simulateTransferWindowV2(state.hired, squad, window.FM24State.market, budget, wageBudget, tactic);
      state.transferResultV2 = transferResult;
      state.partAResult = null;
      state.transfers = { in: transferResult.signedPlayers, out: buildStructuredOutFromTransferResult(transferResult) };
      state.squadDesignations = transferResult.designations;
    } else {
      var transferResult = simulateTransferWindow(state.hired, squad, window.FM24State.market, budget, tactic);
      state.transferResult = transferResult;
      state.partAResult = null;
      state.transfers = { in: transferResult.arrivals, out: transferResult.departures.map(function (d) { return { player: d.player || d, fee: d.fee || 0, type: 'SOLD', position: (d.player ? d.player.Position || d.player.BestPosition || '' : ''), age: (d.player ? d.player.Age || 0 : 0) }; }) };
      state.squadDesignations = transferResult.designations;
    }
    evaluatePastSignings();
    state.windowStage = 'COMPLETE';
    state.windowActive = true;
  } else {
    state.transferResult = null;
    state.transferResultV2 = null;
    state.partAResult = null;
    state.windowStage = 'COMPLETE';
    state.windowActive = true;
  }

  // Check board dismissal condition
  if (typeof checkDismissalCondition === "function") {
    board.stage = typeof resolveStage === "function" ? resolveStage(board.confidence || 70) : 'NORMAL';
    var dismissalResult = checkDismissalCondition(board);
    if (dismissalResult.dismissed) {
      showToast(dismissalResult.message, "error");
    }
    if (dismissalResult.reprieve) {
      showToast(dismissalResult.message, "warning");
    }
  }
  window.FM24State.board = board;

  // Initialize evolution baseline after analysis
  if (typeof buildNewFitBaseline === 'function') {
    state.lastFitBaseline = buildNewFitBaseline(squad, tactic);
  }

  if (typeof window.renderAll === "function") { window.renderAll(); } else { renderManagerView(); }
  showToast("Analysis complete for " + state.hired.Name, "success");
}

// ─── STAFF UPLOAD ZONE ───

(function wireManagerUpload() {
  // Centralized, robust event delegation for the Manager view
  document.addEventListener("click", function (e) {
    // 1. Staff upload zone click
    var zone = document.getElementById("staff-upload-zone");
    if (zone && (e.target === zone || e.target.closest("#staff-upload-zone"))) {
      var input = zone.querySelector("input[type=file]");
      if (input && e.target !== input) {
        input.click();
        return;
      }
    }

    // 2. Candidate row clicks (Step 2)
    var managerRow = e.target.closest(".manager-row");
    if (managerRow) {
      var name = managerRow.getAttribute("data-name");
      window.FM24State.manager.selectedCandidateName = name;
      renderManagerView();
      return;
    }

    // 3. Profile hire button (Step 2) — routes to interview
    if (e.target.id === "profile-hire-btn" || e.target.closest("#profile-hire-btn")) {
      var roster = window.FM24State.manager.roster;
      var name = window.FM24State.manager.selectedCandidateName;
      var selectedMgr = null;
      for (var j = 0; j < roster.length; j++) {
        if (roster[j].Name === name) {
          selectedMgr = roster[j];
          break;
        }
      }
      if (selectedMgr) {
        var interest = calculateManagerInterest(selectedMgr, window.FM24State.squad, window.FM24State.board);
        // Ensure negotiation object exists (safety guard for sessions loaded before this field existed)
        if (!window.FM24State.manager.negotiation) {
          window.FM24State.manager.negotiation = {
            status: null, candidateId: null, interestResult: null,
            alignmentScore: 50, promises: [], negotiationRound: 0,
            currentDemands: null, userOffers: [], reluctantThreshold: null, lastResponse: null
          };
        }
        var negState = window.FM24State.manager.negotiation;

        // Check for previous failed negotiation
        if (negState.status === 'collapsed' && negState.candidateId === selectedMgr.Name) {
          showToast(selectedMgr.Name + ' previously walked away from negotiations. Not available this session.', 'error');
          return;
        }

        // RELUCTANT confirmation prompt
        if (interest.band === 'RELUCTANT') {
          if (!confirm("\u26A0 " + selectedMgr.Name + " is skeptical about this opportunity.\nA strong interview and competitive offer will be required.\nProceed?")) {
            return;
          }
        }

        // Initialize negotiation state
        negState.candidateId = selectedMgr.Name;
        negState.interestResult = interest;
        negState.alignmentScore = 50;
        negState.promises = [];
        negState.negotiationRound = 0;
        negState.currentDemands = null;
        negState.userOffers = [];
        negState.reluctantThreshold = null;
        negState.status = 'interview';

        // Generate interview questions
        var state = window.FM24State.manager;
        var squadDNA = state.squadDNA || null;
        var gaps = state.gaps || [];
        var questions = generateInterview(selectedMgr, squadDNA, gaps, window.FM24State.board);
        renderInterviewModal(selectedMgr, questions, 0);
      }
      return;
    }

    // 3.5 Fire Manager Button click
    if (e.target.id === "btn-fire-manager" || e.target.closest("#btn-fire-manager")) {
      e.stopPropagation();
      if (!confirm("Are you sure you want to fire the current manager? All active transfer windows, objectives, and tactical profiles will be reset.")) {
        return;
      }
      
      var state = window.FM24State.manager;
      var firedName = state.hired ? state.hired.Name : "Manager";
      (state.hireHistory || []).forEach(function (h) { if (h.outcome === 'active') h.outcome = 'dismissed'; });
      state.hired = null;
      state.mode = null;
      state.generatedTactic = null;
      state.report = null;
      state.gaps = [];
      state.recommendations = [];
      state.windowActive = false;
      state.windowStage = null;
      state.transferResultV2 = null;
      state.windowCount = 0;
      
      if (window.FM24State.board) {
        window.FM24State.board.confidence = 70;
        window.FM24State.board.stage = 'NORMAL';
        window.FM24State.board.mandates = [];
        window.FM24State.board.objectiveArcs = [];
        window.FM24State.board.signingHistory = [];
      }
      
      if (typeof filterTabsByMode === "function") {
        filterTabsByMode(window.FM24State.appMode);
      }
      
      if (typeof showToast === "function") {
        showToast(firedName + " has been sacked.", "warning");
      }
      
      if (typeof window.renderAll === "function") {
        window.renderAll();
      } else {
        renderManagerView();
      }
      
      if (typeof window.FM24SwitchTab === "function") {
        window.FM24SwitchTab("manager");
      }
      return;
    }

    // 4. Operational Mode buttons (Step 3 role cards)
    var modeBtn = e.target.closest("[data-manager-mode]");
    if (modeBtn) {
      window.FM24State.manager.mode = modeBtn.getAttribute("data-manager-mode");
      if (typeof createSave === "function") {
        createSave(window.FM24State.appMode, window.FM24State.currentSaveName);
      }
      if (typeof filterTabsByMode === "function") {
        filterTabsByMode(window.FM24State.appMode);
      }
      if (typeof window.renderAll === "function") {
        window.renderAll();
      } else {
        renderManagerView();
      }
      return;
    }

    // 5. Budget adjustment buttons (Step 3)
    if (e.target.id === "btn-budget-minus" || e.target.closest("#btn-budget-minus")) {
      e.stopPropagation();
      var input = document.getElementById("transfer-budget-input");
      if (input) {
        var val = Math.max(0, (parseInt(input.value, 10) || 0) - 10000000);
        input.value = val;
        window.FM24State.manager.budget = val;
        var disp = document.getElementById("budget-display");
        if (disp) disp.textContent = "\u00a3" + formatCurrency(val);
      }
      return;
    }
    if (e.target.id === "btn-budget-plus" || e.target.closest("#btn-budget-plus")) {
      e.stopPropagation();
      var input = document.getElementById("transfer-budget-input");
      if (input) {
        var val = (parseInt(input.value, 10) || 0) + 10000000;
        input.value = val;
        window.FM24State.manager.budget = val;
        var disp = document.getElementById("budget-display");
        if (disp) disp.textContent = "\u00a3" + formatCurrency(val);
      }
      return;
    }
    if (e.target.id === "btn-wage-minus" || e.target.closest("#btn-wage-minus")) {
      e.stopPropagation();
      var input = document.getElementById("wage-budget-input");
      if (input) {
        var val = Math.max(0, (parseInt(input.value, 10) || 0) - 50000);
        input.value = val;
        window.FM24State.manager.wageBudget = val;
        var disp = document.getElementById("wage-budget-display");
        if (disp) disp.textContent = "\u00a3" + formatCurrency(val) + " p/w";
      }
      return;
    }
    if (e.target.id === "btn-wage-plus" || e.target.closest("#btn-wage-plus")) {
      e.stopPropagation();
      var input = document.getElementById("wage-budget-input");
      if (input) {
        var val = (parseInt(input.value, 10) || 0) + 50000;
        input.value = val;
        window.FM24State.manager.wageBudget = val;
        var disp = document.getElementById("wage-budget-display");
        if (disp) disp.textContent = "\u00a3" + formatCurrency(val) + " p/w";
      }
      return;
    }

    // 6. Execute Tactical & Transfer Analysis button (Step 3)
    if (e.target.id === "analyse-btn" || e.target.closest("#analyse-btn")) {
      runAnalysis();
      return;
    }

    // 7. Change squad / staff / market buttons click triggering files programmatically
    if (e.target.id === "change-squad-btn" || e.target.id === "change-squad-analyse-btn" || e.target.closest("#change-squad-btn") || e.target.closest("#change-squad-analyse-btn")) {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = ".html,.htm";
      input.addEventListener("change", function () {
        if (this.files && this.files[0]) handleStaffUpload(this.files[0], "squad");
      });
      input.click();
      return;
    }
    if (e.target.id === "change-staff-btn" || e.target.closest("#change-staff-btn")) {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = ".html,.htm";
      input.addEventListener("change", function () {
        if (!this.files || !this.files[0]) return;
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
          }).catch(function (err) {
            showToast(err.message || "Failed to parse file", "error");
          });
        };
        reader.readAsText(this.files[0]);
      });
      input.click();
      return;
    }
    if (e.target.id === "change-market-btn" || e.target.id === "change-market-analyse-btn" || e.target.closest("#change-market-btn") || e.target.closest("#change-market-analyse-btn")) {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = ".html,.htm";
      input.addEventListener("change", function () {
        if (this.files && this.files[0]) handleStaffUpload(this.files[0], "market");
      });
      input.click();
      return;
    }

    // 8. Results Step Buttons
    if (e.target.id === "apply-tactic-btn" || e.target.closest("#apply-tactic-btn")) {
      applyGeneratedTactic();
      return;
    }
    if (e.target.id === "apply-transfers-btn" || e.target.closest("#apply-transfers-btn")) {
      applyTransferResults();
      return;
    }
    if (e.target.id === "apply-transfers-v2-card-btn" || e.target.id === "apply-transfers-v2-hub-btn" || e.target.closest("#apply-transfers-v2-card-btn") || e.target.closest("#apply-transfers-v2-hub-btn")) {
      applyTransferResultsV2();
      return;
    }
    if (e.target.id === "dof-confirm-btn" || e.target.closest("#dof-confirm-btn")) {
      confirmDofDecisions();
      return;
    }
    if (e.target.id === "dof-cancel-btn" || e.target.closest("#dof-cancel-btn")) {
      cancelDofWindow();
      return;
    }
    if (e.target.id === "disable-coach-recs-checkbox") {
      window.FM24State.manager.disableCoachRecs = e.target.checked;
      return;
    }
    if (e.target.id === "next-window-btn" || e.target.closest("#next-window-btn")) {
      if (!confirm("Start a new window? Current analysis results will be cleared.")) return;
      var mgr = window.FM24State.manager;
      var trV2 = mgr.transferResultV2;
      
      if (trV2) {
        if (trV2.transferBudgetRemaining !== undefined) {
          mgr.budget = trV2.transferBudgetRemaining;
        }
        if (trV2.wageBudgetTotal !== undefined) {
          mgr.wageBudget = trV2.wageBudgetTotal;
        }
      }
      mgr.activeResultsTab = 'report';
      mgr.generatedTactic = null;
      mgr.report = null;
      mgr.gaps = [];
      mgr.recommendations = [];
      mgr.fitScore = null;
      mgr.transferResult = null;
      mgr.transferResultV2 = null;
      mgr.partAResult = null;
      mgr.incomingBids = [];
      mgr.transfers = { in: [], out: [] };
      mgr.squadDesignations = [];
      mgr.windowStage = null;
      mgr.windowActive = false;
      var board = window.FM24State.board || {};
      board.stage = typeof resolveStage === "function" ? resolveStage(board.confidence || 70) : 'NORMAL';
      board.activeConstraint = null;
      board.dismissalPending = false;
      board.reprieverActive = false;
      board.reprieveMandates = [];
      if (window.FM24State.currentSaveName && typeof createSave === "function") {
        createSave(window.FM24State.appMode, window.FM24State.currentSaveName);
      }
      renderManagerView();
      showToast("Re-upload squad & market data and run analysis for the next window.", "info");
      return;
    }

    if (e.target.id === "hire-different-hub-btn" || e.target.id === "resign-manager-btn" || e.target.closest("#hire-different-hub-btn") || e.target.closest("#resign-manager-btn")) {
      if (!confirm("Are you sure you want to fire the current manager and select a new one? Board confidence and window history will be reset.")) return;
      var currentRoster = window.FM24State.manager.roster || [];
      var currentFitScores = window.FM24State.manager.fitScores || {};
      var currentFitScoresReady = window.FM24State.manager.fitScoresReady || false;
      window.FM24State.manager = {
        roster: currentRoster,
        fitScores: currentFitScores,
        fitScoresReady: currentFitScoresReady,
        fitScoresComputing: false,
        hired: null,
        budget: 50000000,
        wageBudget: 500000,
        mode: "head_coach",
        windowActive: false,
        windowStage: null,
        windowHistory: [],
        relationshipIndex: 60,
        relationshipHistory: []
      };
      window.FM24State.board = {
        confidence: 70,
        stage: 'NORMAL',
        mandates: [],
        objectiveArcs: [],
        activeConstraint: null,
        dismissalPending: false,
        reprieverActive: false,
        reprieveMandates: []
      };
      if (window.FM24State.currentSaveName && typeof createSave === "function") {
        createSave(window.FM24State.appMode, window.FM24State.currentSaveName);
      }
      renderManagerView();
      showToast("Manager fired. You can now select a new manager from the candidate list.", "info");
      return;
    }

    // 9. Results tab switches
    var resultsTabBtn = e.target.closest(".results-tab-btn");
    if (resultsTabBtn) {
      var targetTab = resultsTabBtn.getAttribute("data-results-tab");
      var tabBtns = document.querySelectorAll(".results-tab-btn");
      tabBtns.forEach(function (b) {
        var isActive = b === resultsTabBtn;
        b.classList.toggle("active", isActive);
        b.classList.toggle("text-white", isActive);
        b.classList.toggle("border-blue-500", isActive);
        b.classList.toggle("text-text-muted", !isActive);
        b.classList.toggle("border-transparent", !isActive);
      });
      var panels = document.querySelectorAll(".results-tab-panel");
      panels.forEach(function (p) {
        var isTarget = p.getAttribute("id") === "results-panel-" + targetTab;
        p.style.display = isTarget ? "block" : "none";
      });
      if (targetTab === "transfers") {
        setTimeout(animateTimeline, 100);
      }
      if (targetTab === "bid") {
        setTimeout(function() {
          if (typeof renderBidConsultation === "function") {
            renderBidConsultation("bid-consultation-results");
          }
        }, 50);
      }
      return;
    }

    // 10. Window history row expand/collapse — uses nextElementSibling (works on any tab)
    var historyRow = e.target.closest(".window-history-row");
    var managerRow = e.target.closest(".manager-history-row");
    if (historyRow || managerRow) {
      var row = historyRow || managerRow;
      var detail = row.nextElementSibling;
      if (detail && detail.classList.contains("window-detail-drawer")) {
        var isCollapsed = detail.style.display === "none" || detail.style.display === "";
        detail.style.display = isCollapsed ? "table-row" : "none";
        var indicator = row.querySelector("span");
        if (indicator) {
          indicator.textContent = isCollapsed ? "▼" : "▶";
        }
      }
      return;
    }

    // 11. Reset buttons (Step 4 & Step 2)
    if (e.target.id === "hire-different-card-btn" || e.target.closest("#hire-different-card-btn") || e.target.id === "hire-different-hub-btn" || e.target.closest("#hire-different-hub-btn") || e.target.id === "hire-different-btn" || e.target.closest("#hire-different-btn") || e.target.id === "reset-manager-btn" || e.target.closest("#reset-manager-btn") || e.target.id === "reset-manager-step3-btn" || e.target.closest("#reset-manager-step3-btn")) {
      (window.FM24State.manager.hireHistory || []).forEach(function (h) { if (h.outcome === 'active') h.outcome = 'dismissed'; });
      window.FM24State.manager.hired = null;
      window.FM24State.manager.mode = null;
      window.FM24State.manager.generatedTactic = null;
      window.FM24State.manager.report = null;
      window.FM24State.manager.gaps = [];
      window.FM24State.manager.recommendations = [];
      window.FM24State.manager.budget = 50000000;
      window.FM24State.manager.transfers = { in: [], out: [] };
      window.FM24State.manager.squadDesignations = [];
      window.FM24State.manager.transferResult = null;
      window.FM24State.manager.transferResultV2 = null;
      if (typeof filterTabsByMode === "function") {
        filterTabsByMode(window.FM24State.appMode);
      }
      renderManagerView();
      return;
    }
  });

  // ─── MANAGER WIDGET EXPANSION (click-to-expand cards) ───
  document.addEventListener('click', function (e) {
    var card = e.target.closest('[id^="manager-widget-"]');
    if (!card) return;
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('a') || e.target.classList.contains('cursor-pointer') || e.target.getAttribute('onclick')) {
      return;
    }
    var state = window.FM24State.manager;
    var manager = state.hired || {};
    var widgetId = card.id;
    var title, content;
    if (widgetId === 'manager-widget-tactical-dna') {
      title = 'Tactical DNA — ' + escAttr(manager.Name);
      content = renderExpandedTacticalDNA(manager);
    } else if (widgetId === 'manager-widget-attributes') {
      title = 'Attributes Dashboard — ' + escAttr(manager.Name);
      content = renderExpandedAttributes(manager);
    } else if (widgetId === 'manager-widget-squad-alignment') {
      title = 'Squad Alignment Report';
      content = renderExpandedSquadAlignment(manager);
    } else if (widgetId === 'manager-widget-transfer-history') {
      title = 'Transfer History & Timeline';
      content = renderExpandedTransferHistory();
    }
    if (title && content) {
      var modal = document.getElementById('widget-expanded-modal');
      var titleEl = document.getElementById('widget-expanded-title');
      var bodyEl = document.getElementById('widget-expanded-body');
      if (modal && titleEl && bodyEl) {
        titleEl.textContent = title;
        bodyEl.innerHTML = '<div class="expanded-widget-content">' + content + '</div>';
        modal.classList.remove('hidden');
      }
    }
  });

  function renderExpandedTacticalDNA(mgr) {
    var html = '<div class="space-y-6">';

    // Formations grid
    html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-4">';
    var fList = [
      { label: 'Preferred', val: mgr['Preferred Formation'] },
      { label: 'Secondary', val: mgr['Second Formation'] || mgr['Secondary Formation'] },
      { label: 'Attacking', val: mgr['Attacking Formation'] },
      { label: 'Defensive', val: mgr['Defensive Formation'] }
    ];
    fList.forEach(function (f) {
      html += '<div class="bg-backdrop/50 border border-border/50 rounded-xl p-4 text-center">';
      html += '  <span class="text-[10px] text-text-muted uppercase font-bold tracking-wider block">' + f.label + '</span>';
      html += '  <span class="text-lg font-extrabold text-white block mt-1">' + escAttr(f.val || '—') + '</span>';
      html += '</div>';
    });
    html += '</div>';

    // Playstyles bar
    html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 bg-backdrop/30 border border-border/30 rounded-xl p-4">';
    html += '  <div><span class="text-[10px] text-text-muted uppercase tracking-wider block">Mentality</span><span class="text-sm font-bold text-white">' + escAttr(mgr['Playing Mentality'] || '—') + '</span></div>';
    html += '  <div><span class="text-[10px] text-text-muted uppercase tracking-wider block">Pressing</span><span class="text-sm font-bold text-white">' + escAttr(mgr['Pressing Style'] || '—') + '</span></div>';
    html += '  <div><span class="text-[10px] text-text-muted uppercase tracking-wider block">Marking</span><span class="text-sm font-bold text-white">' + escAttr(mgr['Marking Style'] || '—') + '</span></div>';
    html += '  <div><span class="text-[10px] text-text-muted uppercase tracking-wider block">Coaching</span><span class="text-sm font-bold text-white">' + escAttr(mgr['Coaching Style'] || mgr['CoachingStyle'] || '—') + '</span></div>';
    html += '</div>';

    // Staff Attributes Grid
    html += '<div class="bg-backdrop/30 border border-border/30 rounded-xl p-4">';
    html += '  <h5 class="text-[11px] font-bold text-white uppercase tracking-wider mb-3">Staff Attributes</h5>';
    html += '  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">';
    var attrKeys = [
      { key: 'Tac Knw', label: 'Tactical Knowledge' },
      { key: 'Judge P', label: 'Judging Potential' },
      { key: 'Judge A', label: 'Judging Ability' },
      { key: 'Youth', label: 'Working with Youth' },
      { key: 'Prof', label: 'Professionalism' }
    ];
    attrKeys.forEach(function (a) {
      var val = getDofAttr(mgr, a.key);
      var pct = Math.min(100, Math.round((val / 20) * 100));
      var color = val >= 15 ? 'text-green-400' : val >= 11 ? 'text-yellow-400' : val >= 6 ? 'text-orange-400' : 'text-red-400';
      var barColor = val >= 15 ? 'bg-green-500' : val >= 11 ? 'bg-yellow-500' : val >= 6 ? 'bg-orange-500' : 'bg-red-500';
      html += '    <div class="bg-backdrop/40 border border-border/40 rounded-lg p-3">';
      html += '      <span class="text-[10px] text-text-muted uppercase font-bold tracking-wider block mb-1">' + a.label + '</span>';
      html += '      <div class="flex items-center gap-2">';
      html += '        <span class="text-lg font-extrabold ' + color + '">' + val + '</span>';
      html += '        <span class="text-[10px] text-text-muted">/20</span>';
      html += '      </div>';
      html += '      <div class="w-full bg-border/30 h-1.5 rounded-full overflow-hidden mt-1">';
      html += '        <div class="' + barColor + ' h-full rounded-full" style="width:' + pct + '%"></div>';
      html += '      </div>';
      html += '    </div>';
    });
    html += '  </div>';
    html += '</div>';

    // Mini SVG Pitch
    var prefForm = (mgr['Preferred Formation'] || '4-4-2').trim();
    html += '<div class="bg-backdrop/30 border border-border/30 rounded-xl p-4">';
    html += '  <h5 class="text-[11px] font-bold text-white uppercase tracking-wider mb-3">Formation: ' + escAttr(prefForm) + '</h5>';
    html += '  <div class="flex justify-center">';
    html += '    <svg viewBox="0 0 400 520" class="w-full max-w-[280px] h-auto" xmlns="http://www.w3.org/2000/svg">';
    html += '      <rect x="0" y="0" width="400" height="520" fill="#1a3a2a" rx="12"/>';
    html += '      <rect x="20" y="30" width="360" height="460" fill="none" stroke="#2d5a40" stroke-width="2" rx="6"/>';
    html += '      <line x1="20" y1="260" x2="380" y2="260" stroke="#2d5a40" stroke-width="2"/>';
    html += '      <circle cx="200" cy="260" r="30" fill="none" stroke="#2d5a40" stroke-width="2"/>';
    html += '      <rect x="165" y="20" width="70" height="50" rx="10" fill="none" stroke="#2d5a40" stroke-width="1.5"/>';
    html += '      <rect x="165" y="450" width="70" height="50" rx="10" fill="none" stroke="#2d5a40" stroke-width="1.5"/>';
    // Position players on pitch
    var parts = prefForm.split('-');
    var rows = [];
    if (parts.length >= 3) {
      rows.push(parseInt(parts[0], 10) || 4);  // defenders
      rows.push(parseInt(parts[1], 10) || 4);  // midfielders
      rows.push(parseInt(parts[2], 10) || 2);  // forwards
    } else if (parts.length === 2) {
      rows.push(parseInt(parts[0], 10) || 4);
      rows.push(parseInt(parts[1], 10) || 6);
    } else {
      rows = [4, 4, 2];
    }
    var rowLabels = ['GK', 'DEF', 'MID', 'FWD'];
    var rowY = [470, 370, 200, 70];
    // GK
    html += '      <circle cx="200" cy="470" r="10" fill="#3b82f6" stroke="#60a5fa" stroke-width="1.5"/>';
    html += '      <text x="200" y="473" text-anchor="middle" fill="white" font-size="8" font-weight="bold">GK</text>';
    for (var ri = 0; ri < rows.length; ri++) {
      var count = rows[ri];
      var yPos = rowY[ri + 1];
      if (count <= 0) continue;
      var spacing = Math.min(300 / count, 50);
      var startX = 200 - ((count - 1) * spacing) / 2;
      for (var pi = 0; pi < count; pi++) {
        var xPos = startX + pi * spacing;
        html += '      <circle cx="' + xPos.toFixed(1) + '" cy="' + yPos + '" r="9" fill="#2563eb" stroke="#60a5fa" stroke-width="1.2"/>';
        html += '      <text x="' + xPos.toFixed(1) + '" y="' + (yPos + 3) + '" text-anchor="middle" fill="white" font-size="7" font-weight="bold">' + rowLabels[ri + 1] + '</text>';
      }
    }
    html += '    </svg>';
    html += '  </div>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  function renderExpandedAttributes(mgr) {
    var html = '<div class="space-y-4">';
    html += '<p class="text-[11px] text-text-muted">Complete staff dossier for <strong class="text-white">' + escAttr(mgr.Name) + '</strong></p>';
    html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';
    var allAttrs = [
      { key: 'Tac Knw', label: 'Tactical Knowledge', group: 'Coaching' },
      { key: 'Judge P', label: 'Judging Potential', group: 'Recruitment' },
      { key: 'Judge A', label: 'Judging Ability', group: 'Recruitment' },
      { key: 'Youth', label: 'Working with Youth', group: 'Mental' },
      { key: 'Prof', label: 'Professionalism', group: 'Mental' },
      { key: 'Ada', label: 'Adaptability', group: 'Mental' },
      { key: 'Det', label: 'Determination', group: 'Mental' },
      { key: 'Loy', label: 'Loyalty', group: 'Mental' },
      { key: 'Amb', label: 'Ambition', group: 'Mental' },
      { key: 'Cont', label: 'Controversy', group: 'Mental' },
      { key: 'Sportsmanship', label: 'Sportsmanship', group: 'Mental' },
      { key: 'Temperament', label: 'Temperament', group: 'Mental' },
      { key: 'Pressure', label: 'Pressure', group: 'Mental' },
      { key: 'Reputation', label: 'World Reputation', group: 'Reputation' },
      { key: 'National Reputation', label: 'National Reputation', group: 'Reputation' },
      { key: 'Home Reputation', label: 'Home Reputation', group: 'Reputation' },
      { key: 'Current Reputation', label: 'Current Reputation', group: 'Reputation' }
    ];
    allAttrs.forEach(function (a) {
      var val = parseInt(mgr[a.key], 10);
      if (isNaN(val)) val = 0;
      var maxVal = (a.key.indexOf('Reputation') !== -1 || a.key === 'Home Reputation' || a.key === 'Current Reputation' || a.key === 'National Reputation') ? 10000 : 20;
      var pct = Math.min(100, Math.round((val / maxVal) * 100));
      var color = pct >= 75 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : pct >= 25 ? 'text-orange-400' : 'text-red-400';
      var barColor = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : pct >= 25 ? 'bg-orange-500' : 'bg-red-500';
      var dispVal = (maxVal === 10000) ? val.toLocaleString() : val.toString();
      html += '    <div class="bg-backdrop/40 border border-border/40 rounded-lg p-3">';
      html += '      <div class="flex justify-between items-center mb-1">';
      html += '        <span class="text-[10px] text-text-muted uppercase font-bold tracking-wider">' + a.label + '</span>';
      html += '        <span class="text-xs font-extrabold ' + color + '">' + dispVal + '/' + maxVal.toLocaleString() + '</span>';
      html += '      </div>';
      html += '      <div class="w-full bg-border/30 h-2 rounded-full overflow-hidden">';
      html += '        <div class="' + barColor + ' h-full rounded-full" style="width:' + pct + '%"></div>';
      html += '      </div>';
      html += '    </div>';
    });
    html += '  </div>';
    html += '</div>';
    return html;
  }

  function renderExpandedSquadAlignment(mgr) {
    var html = '<div class="space-y-4">';
    var squad = window.FM24State.squad || [];
    var tactic = window.FM24State.tactic || {};
    var st = window.FM24State.manager;
    var dnaScore = st.lastCoherenceScore;
    var dnaResult = st.lastCoherenceResult;
    if (dnaScore === null || dnaScore === undefined) {
      if (typeof computeSquadDNA === 'function') {
        var sqDna = computeSquadDNA(squad);
        if (sqDna) {
          var coh = typeof computeCoherenceScore === 'function' ? computeCoherenceScore(sqDna, mgr, tactic) : null;
          dnaScore = coh ? coh.score : null;
          dnaResult = coh;
        }
      }
    }
    if (dnaScore !== null) {
      var dnaColor = dnaScore >= 80 ? 'text-green-400' : dnaScore >= 60 ? 'text-yellow-400' : 'text-red-400';
      var dnaBarColor = dnaScore >= 80 ? 'bg-green-500' : dnaScore >= 60 ? 'bg-yellow-500' : 'bg-red-500';
      html += '<div class="bg-backdrop/30 border border-border/30 rounded-xl p-5">';
      html += '  <h5 class="text-[11px] font-bold text-white uppercase tracking-wider mb-3">Coherence Score</h5>';
      html += '  <div class="flex items-center gap-4">';
      html += '    <div class="flex-1 bg-backdrop/60 rounded-full h-4 overflow-hidden">';
      html += '      <div class="' + dnaBarColor + ' h-full rounded-full transition-all" style="width:' + dnaScore + '%"></div>';
      html += '    </div>';
      html += '    <span class="text-2xl font-extrabold ' + dnaColor + '">' + dnaScore + '%</span>';
      html += '  </div>';
      html += '</div>';
      if (dnaResult && dnaResult.details) {
        html += '<div class="bg-backdrop/30 border border-border/30 rounded-xl p-4">';
        html += '  <h5 class="text-[11px] font-bold text-white uppercase tracking-wider mb-2">Score Breakdown</h5>';
        html += '  <div class="space-y-1.5">';
        Object.keys(dnaResult.details).forEach(function (k) {
          var v = dnaResult.details[k];
          html += '    <div class="flex justify-between text-[11px]">';
          html += '      <span class="text-text-muted">' + escAttr(k) + '</span>';
          html += '      <span class="text-white font-bold">' + (typeof v === 'number' ? v.toFixed(1) : v) + '</span>';
          html += '    </div>';
        });
        html += '  </div>';
        html += '</div>';
      }
      if (dnaResult && dnaResult.warnings && dnaResult.warnings.length > 0) {
        html += '<div class="bg-backdrop/30 border border-amber-500/30 rounded-xl p-4">';
        html += '  <h5 class="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2">Warnings</h5>';
        html += '  <div class="space-y-1.5">';
        dnaResult.warnings.forEach(function (warn) {
          html += '    <div class="text-[11px] text-yellow-400/80 flex items-start gap-2">';
          html += '      <span>⚠</span><span>' + escAttr(warn) + '</span>';
          html += '    </div>';
        });
        html += '  </div>';
        html += '</div>';
      }
    } else {
      html += '<div class="bg-backdrop/30 border border-border/30 rounded-xl p-5 text-center">';
      html += '  <p class="text-sm text-text-muted">No squad alignment data available. Run a tactical & transfer analysis to compute coherence.</p>';
      html += '</div>';
    }
    // Manager DNA vs Squad DNA comparison
    if (mgr) {
      html += '<div class="bg-backdrop/30 border border-border/30 rounded-xl p-4">';
      html += '  <h5 class="text-[11px] font-bold text-white uppercase tracking-wider mb-3">Manager Tactical Preferences</h5>';
      html += '  <div class="grid grid-cols-2 gap-3 text-[11px]">';
      var prefs = [
        { label: 'Formation', val: mgr['Preferred Formation'] },
        { label: 'Mentality', val: mgr['Playing Mentality'] },
        { label: 'Pressing', val: mgr['Pressing Style'] },
        { label: 'Marking', val: mgr['Marking Style'] },
        { label: 'Coaching', val: mgr['Coaching Style'] || mgr['CoachingStyle'] || '—' },
        { label: 'Archetype', val: deriveArchetype ? deriveArchetype(mgr) : '—' }
      ];
      prefs.forEach(function (p) {
        html += '    <div class="bg-backdrop/40 border border-border/40 rounded-lg p-2.5">';
        html += '      <span class="text-[10px] text-text-muted uppercase tracking-wider block">' + p.label + '</span>';
        html += '      <span class="text-xs font-bold text-white">' + escAttr(p.val || '—') + '</span>';
        html += '    </div>';
      });
      html += '  </div>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderExpandedTransferHistory() {
    var state = window.FM24State.manager;
    var history = state.windowHistory || [];
    if (history.length === 0) {
      return '<div class="text-text-muted text-sm text-center py-8">No completed transfer windows yet. Run a Full Manager transfer window simulation to populate history.</div>';
    }
    var html = '<div class="space-y-4">';
    html += window.renderTransferHistoryTable(history, 'exp-');
    html += '</div>';
    return html;
  }

  document.addEventListener("input", function (e) {
    var id = e.target.id;
    if (id === "hire-search-input") {
      window.FM24State.managerFilters.searchQuery = e.target.value;
      renderManagerView();
      var restored = document.getElementById("hire-search-input");
      if (restored && document.activeElement !== restored) {
        restored.focus();
        restored.setSelectionRange(restored.value.length, restored.value.length);
      }
    } else if (id === "transfer-budget-input") {
      var val = parseInt(e.target.value, 10) || 0;
      window.FM24State.manager.budget = val;
      var disp = document.getElementById("budget-display");
      if (disp) disp.textContent = "\u00a3" + formatCurrency(val);
    } else if (id === "wage-budget-input") {
      var val = parseInt(e.target.value, 10) || 0;
      window.FM24State.manager.wageBudget = val;
      var disp = document.getElementById("wage-budget-display");
      if (disp) disp.textContent = "\u00a3" + formatCurrency(val) + " p/w";
    }
  });

  document.addEventListener("change", function (e) {
    var id = e.target.id;
    var f = window.FM24State.managerFilters;
    if (id === "hire-archetype-filter") {
      f.archetype = e.target.value;
      renderManagerView();
    } else if (id === "hire-transfer-archetype-filter") {
      f.transferArchetype = e.target.value;
      renderManagerView();
    } else if (id === "hire-mentality-filter") {
      f.mentality = e.target.value;
      renderManagerView();
    } else if (id === "hire-pressing-filter") {
      f.pressing = e.target.value;
      renderManagerView();
    } else if (id === "hire-interest-filter") {
      f.interest = e.target.value;
      renderManagerView();
    } else if (id === "hire-fit-min") {
      f.fitMin = parseInt(e.target.value, 10) || 0;
      renderManagerView();
    } else if (id === "hire-fit-max") {
      f.fitMax = parseInt(e.target.value, 10) || 100;
      renderManagerView();
    } else if (id === "hire-sort-select") {
      f.sortBy = e.target.value;
      renderManagerView();
    } else if (id === "transfer-authority-toggle") {
      window.FM24State.manager.transferAuthorityMode = e.target.checked ? "assisted" : "manual";
      if (typeof createSave === "function") {
        createSave(window.FM24State.appMode, window.FM24State.currentSaveName);
      }
      if (typeof filterTabsByMode === "function") {
        filterTabsByMode(window.FM24State.appMode);
      }
      renderManagerView();
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
          }).catch(function (err) {
            showToast(err.message || "Failed to parse file", "error");
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

  // ─── MILESTONE 5 FEATURES ───

  var currentInteractiveIndex = 0;

  window.highlightRow = function (index) {
    var interactiveElements = Array.from(document.querySelectorAll('.dof-decision-select, .dof-bid-select'));
    if (interactiveElements.length === 0) return;
    
    // Clamp index
    if (index < 0) index = 0;
    if (index >= interactiveElements.length) index = interactiveElements.length - 1;
    
    // Remove highlighted styling from all rows and selects
    document.querySelectorAll('tr').forEach(function(tr) {
      tr.style.backgroundColor = "";
    });
    interactiveElements.forEach(function(el) {
      el.classList.remove('ring-2', 'ring-blue-500', 'border-blue-500');
    });
    
    var activeEl = interactiveElements[index];
    if (activeEl) {
      activeEl.classList.add('ring-2', 'ring-blue-500');
      activeEl.focus();
      
      var tr = activeEl.closest('tr');
      if (tr) {
        tr.style.backgroundColor = "rgba(59, 130, 246, 0.15)";
      }
    }
    
    currentInteractiveIndex = index;
  };

  document.addEventListener("keydown", function (e) {
    // Check if intervention panel or contract dispute decision is active
    var isInterventionVisible = document.getElementById("contract-dispute-decision") || document.querySelector(".dof-decision-select") || document.querySelector(".dof-bid-select");
    if (!isInterventionVisible) return;
    
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
      // Don't intercept arrow up/down if they are actively interacting inside a select dropdown
      if (e.key === "ArrowUp" || e.key === "ArrowDown") return;
    }
    
    var key = e.key.toLowerCase();
    var interactiveElements = Array.from(document.querySelectorAll('.dof-decision-select, .dof-bid-select'));
    if (interactiveElements.length === 0) return;
    
    if (key === 'n' || key === 'arrowdown') {
      e.preventDefault();
      window.highlightRow(currentInteractiveIndex + 1);
    } else if (key === 'p' || key === 'arrowup') {
      e.preventDefault();
      window.highlightRow(currentInteractiveIndex - 1);
    } else if (key === 'a') {
      e.preventDefault();
      var activeEl = interactiveElements[currentInteractiveIndex];
      if (activeEl) {
        if (hasOption(activeEl, "APPROVE")) {
          activeEl.value = "APPROVE";
          activeEl.dispatchEvent(new Event('change', { bubbles: true }));
          showToast("Approved: " + getPlayerNameOfRow(activeEl), "success");
        }
      }
    } else if (key === 'b') {
      e.preventDefault();
      var activeEl = interactiveElements[currentInteractiveIndex];
      if (activeEl) {
        if (hasOption(activeEl, "BLOCK")) {
          activeEl.value = "BLOCK";
          activeEl.dispatchEvent(new Event('change', { bubbles: true }));
          showToast("Blocked: " + getPlayerNameOfRow(activeEl), "info");
        } else if (hasOption(activeEl, "REJECT")) {
          activeEl.value = "REJECT";
          activeEl.dispatchEvent(new Event('change', { bubbles: true }));
          showToast("Rejected: " + getPlayerNameOfRow(activeEl), "info");
        }
      }
    } else if (key === 'r') {
      e.preventDefault();
      var activeEl = interactiveElements[currentInteractiveIndex];
      if (activeEl) {
        if (hasOption(activeEl, "NEGOTIATE")) {
          activeEl.value = "NEGOTIATE";
          activeEl.dispatchEvent(new Event('change', { bubbles: true }));
          showToast("Negotiated: " + getPlayerNameOfRow(activeEl), "warning");
        } else if (hasOption(activeEl, "COUNTER")) {
          activeEl.value = "COUNTER";
          activeEl.dispatchEvent(new Event('change', { bubbles: true }));
          showToast("Counter-offered: " + getPlayerNameOfRow(activeEl), "warning");
        } else if (hasOption(activeEl, "REJECT")) {
          activeEl.value = "REJECT";
          activeEl.dispatchEvent(new Event('change', { bubbles: true }));
          showToast("Rejected: " + getPlayerNameOfRow(activeEl), "info");
        }
      }
    }
  });

  function hasOption(selectEl, val) {
    return Array.from(selectEl.options).some(function(opt) { return opt.value === val; });
  }

  function getPlayerNameOfRow(selectEl) {
    var tr = selectEl.closest('tr');
    if (tr) {
      var td = tr.querySelector('td');
      if (td) return td.textContent.trim();
    }
    return "Player";
  }

  window.animateTimeline = function () {
    var container = document.querySelector(".timeline-container");
    if (!container) return;
    var items = container.querySelectorAll(".timeline-item");
    if (items.length === 0) return;
    
    // Reset all items to invisible
    items.forEach(function (item) {
      item.style.opacity = "0";
      item.style.transform = "translateY(12px)";
      item.style.transition = "opacity 0.35s ease, transform 0.35s ease";
    });
    
    var idx = 0;
    function showNext() {
      if (idx >= items.length) return;
      var item = items[idx];
      if (item) {
        item.style.opacity = "1";
        item.style.transform = "translateY(0)";
        
        container.scrollTo({
          top: item.offsetTop - container.offsetTop - 20,
          behavior: 'smooth'
        });
      }
      idx++;
      setTimeout(showNext, 250);
    }
    showNext();
  };

  window.exportHtmlSnapshot = function () {
    var state = window.FM24State.manager;
    var board = window.FM24State.board || {};
    var trV2 = state.transferResultV2;
    var hired = state.hired || {};
    
    var html = '<!DOCTYPE html>\n<html>\n<head>\n<title>FM24 DoF Suite - Executive Report</title>\n';
    html += '<meta charset="utf-8">\n';
    html += '<script src="https://cdn.tailwindcss.com"></script>\n';
    html += '<style>\n';
    html += 'body { background-color: #0b0f19; color: #f3f4f6; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }\n';
    html += '</style>\n</head>\n<body class="p-8 max-w-5xl mx-auto space-y-8">\n';
    
    // Header Card
    html += '  <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex items-center justify-between">\n';
    html += '    <div>\n';
    html += '      <h1 class="text-2xl font-black text-white tracking-tight uppercase">Director of Football Executive Report</h1>\n';
    html += '      <p class="text-slate-400 text-xs mt-1">Manager: <strong class="text-white">' + (hired.Name || 'N/A') + '</strong> | Formation: ' + (hired["Preferred Formation"] || 'N/A') + ' | Mentality: ' + (hired["Playing Mentality"] || 'N/A') + '</p>\n';
    html += '    </div>\n';
    html += '    <div class="text-right">\n';
    html += '      <span class="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">Window Count: ' + (state.windowCount || 1) + '</span>\n';
    html += '    </div>\n';
    html += '  </div>\n';
    
    // Metrics Grid
    html += '  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">\n';
    
    // Board Confidence
    var confPct = board.confidence || 70;
    html += '    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">\n';
    html += '      <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Board Confidence</h3>\n';
    html += '      <div class="text-3xl font-extrabold text-white mb-2">' + confPct + '%</div>\n';
    html += '      <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">\n';
    html += '        <div class="bg-emerald-500 h-full" style="width: ' + confPct + '%"></div>\n';
    html += '      </div>\n';
    html += '    </div>\n';
    
    // Manager Relationship
    var relPct = state.relationshipIndex || 60;
    html += '    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">\n';
    html += '      <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Coach Relationship</h3>\n';
    html += '      <div class="text-3xl font-extrabold text-white mb-2">' + relPct + '/100</div>\n';
    html += '      <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">\n';
    html += '        <div class="bg-blue-500 h-full" style="width: ' + relPct + '%"></div>\n';
    html += '      </div>\n';
    html += '    </div>\n';
    
    // Financial Summary
    var spentVal = trV2 ? (trV2.totalSpent || 0) : 0;
    var salesVal = (trV2 && trV2.totalSaleRevenue !== undefined) ? trV2.totalSaleRevenue : 0;
    html += '    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">\n';
    html += '      <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Net Spending</h3>\n';
    html += '      <div class="text-lg font-bold text-red-400 font-mono">Spent: £' + (spentVal / 1000000).toFixed(1) + 'M</div>\n';
    html += '      <div class="text-lg font-bold text-emerald-400 font-mono">Sales: £' + (salesVal / 1000000).toFixed(1) + 'M</div>\n';
    html += '    </div>\n';
    
    html += '  </div>\n';
  
    // Signings Ledger
    html += '  <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">\n';
    html += '    <h3 class="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">Completed Signings & Sales</h3>\n';
    if (trV2 && trV2.signedPlayers && trV2.signedPlayers.length > 0) {
      html += '    <div class="overflow-x-auto">\n';
      html += '      <table class="w-full text-xs text-left">\n';
      html += '        <thead>\n';
      html += '          <tr class="border-b border-slate-800 text-slate-400 uppercase tracking-wider">\n';
      html += '            <th class="py-2">Player</th>\n';
      html += '            <th class="py-2">Age</th>\n';
      html += '            <th class="py-2 text-right">Fee</th>\n';
      html += '            <th class="py-2 text-right">Wage</th>\n';
      html += '            <th class="py-2 text-center">Designation</th>\n';
      html += '          </tr>\n';
      html += '        </thead>\n';
      html += '        <tbody class="divide-y divide-slate-800">\n';
      trV2.signedPlayers.forEach(function (sig) {
        html += '          <tr>\n';
        html += '            <td class="py-2 font-bold text-white">' + (sig.Name || sig.playerName || 'Unknown') + '</td>\n';
        html += '            <td class="py-2 text-slate-300">' + (sig.Age || sig.age || 'N/A') + '</td>\n';
        html += '            <td class="py-2 text-right text-emerald-400 font-mono">£' + (sig.fee ? (sig.fee / 1000000).toFixed(2) + 'M' : 'Free') + '</td>\n';
        html += '            <td class="py-2 text-right text-slate-300 font-mono">£' + (sig.wage || 0).toLocaleString() + '/wk</td>';
        html += '            <td class="py-2 text-center text-blue-400 font-semibold">' + (sig.designation || 'Keep') + '</td>\n';
        html += '          </tr>\n';
      });
      html += '        </tbody>\n';
      html += '      </table>\n';
      html += '    </div>\n';
    } else {
      html += '    <p class="text-xs text-slate-500">No transfers executed in this window.</p>\n';
    }
    html += '  </div>\n';
    
    // Career History
    html += '  <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">\n';
    html += '    <h3 class="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">Career Ledger History</h3>\n';
    var history = sanitizeHistory(state);
    if (history.length > 0) {
      html += '    <div class="overflow-x-auto">\n';
      html += '      <table class="w-full text-xs text-left">\n';
      html += '        <thead>\n';
      html += '          <tr class="border-b border-slate-800 text-slate-400 uppercase tracking-wider">\n';
      html += '            <th class="py-2">Window</th>\n';
      html += '            <th class="py-2 text-right">Budget</th>\n';
      html += '            <th class="py-2 text-right">Spent</th>\n';
      html += '            <th class="py-2 text-center">Sales</th>\n';
      html += '            <th class="py-2 text-center">Signed</th>\n';
      html += '            <th class="py-2 text-center">Coach Rel</th>\n';
      html += '            <th class="py-2 text-right">Squad Quality</th>\n';
      html += '          </tr>\n';
      html += '        </thead>\n';
      html += '        <tbody class="divide-y divide-slate-800">\n';
      history.forEach(function (w) {
        html += '          <tr>\n';
        html += '            <td class="py-2 font-bold text-white">' + w.label + '</td>\n';
        html += '            <td class="py-2 text-right font-mono text-slate-300">£' + (w.budget / 1000000).toFixed(1) + 'M</td>\n';
        html += '            <td class="py-2 text-right font-mono text-slate-300">£' + (w.spent / 1000000).toFixed(1) + 'M</td>\n';
        html += '            <td class="py-2 text-center text-slate-300">' + (w.salesCount !== undefined ? w.salesCount : w.sales) + '</td>\n';
        html += '            <td class="py-2 text-center text-slate-300">' + w.signed + '</td>\n';
        html += '            <td class="py-2 text-center text-blue-400 font-bold">' + w.rel + '</td>\n';
        html += '            <td class="py-2 text-right text-slate-300 font-mono">' + w.startSquadAvgQuality.toFixed(1) + ' → ' + w.endSquadAvgQuality.toFixed(1) + '</td>\n';
        html += '          </tr>\n';
      });
      html += '        </tbody>\n';
      html += '      </table>\n';
      html += '    </div>\n';
    } else {
      html += '    <p class="text-xs text-slate-500">No career history recorded yet.</p>\n';
    }
    html += '  </div>\n';
  
    html += '  <div class="text-center text-[10px] text-slate-600 mt-8">\n';
    html += '    Generated by FM24 Tactical Suite Director of Football Engine &copy; ' + new Date().getFullYear() + '\n';
    html += '  </div>\n';
    html += '</body>\n</html>\n';
    
    // Trigger file download
    var blob = new Blob([html], { type: "text/html" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "FM24_DoF_Report_W" + (state.windowCount || 1) + ".html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Executive HTML Report exported successfully!", "success");
  };
})();
