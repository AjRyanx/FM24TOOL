(function (global) {
  "use strict";

  // ════════════════════════════════════════════════════════════════
  // GLOBAL COHERENCE AGGREGATOR (Layer 5)
  // ════════════════════════════════════════════════════════════════
  // Merges violations from all 4 layers, weights by severity,
  // and produces final 0-100 score + band + summary.

  var SEVERITY_WEIGHTS = {
    CRITICAL:   25,
    ERROR:      15,
    WARNING:    8,
    SUGGESTION: 2
  };

  var BANDS = [
    { min: 85, label: "Elite",      color: "text-green-400" },
    { min: 70, label: "Functional", color: "text-blue-400" },
    { min: 50, label: "Risky",      color: "text-yellow-400" },
    { min: 0,  label: "Broken",     color: "text-red-400" }
  ];

  function aggregateCoherence(feasibilityResult, tactic) {
    var result = feasibilityResult || {};
    var categories = result.categories || {};
    var breakdown = result.breakdown || {};
    var warnings = result.warnings || [];
    var positives = result.positives || [];

    // Collect all structured violations from all layers
    var allViolations = [];
    var violationSources = {
      pairing: breakdown.pairingViolations || [],
      structure: breakdown.structureViolations || [],
      zones: breakdown.zoneViolations || [],
      archetype: breakdown.archetypeViolations || []
    };
    var sourceLabels = {
      pairing: "Pairing Rules",
      structure: "Structural",
      zones: "Zone Collision",
      archetype: "Archetype Fit"
    };

    Object.keys(violationSources).forEach(function(src) {
      var list = violationSources[src];
      if (!list || !list.forEach) return;
      list.forEach(function(v) {
        allViolations.push({
          source: src,
          sourceLabel: sourceLabels[src] || src,
          id: v.id || "UNKNOWN",
          severity: v.severity || "WARNING",
          description: v.description || "No description"
        });
      });
    });

    // Score: weighted penalty from violations
    var rawPenalty = 0;
    var criticalCount = 0;
    var errorCount = 0;
    var warningCount = 0;
    var suggestionCount = 0;

    allViolations.forEach(function(v) {
      var w = SEVERITY_WEIGHTS[v.severity] || SEVERITY_WEIGHTS.WARNING;
      rawPenalty += w;
      if (v.severity === "CRITICAL") criticalCount++;
      else if (v.severity === "ERROR") errorCount++;
      else if (v.severity === "WARNING") warningCount++;
      else if (v.severity === "SUGGESTION") suggestionCount++;
    });

    // Cap penalty at 100
    var totalPenalty = Math.min(rawPenalty, 100);

    // Architecture doc formula: pairing*0.35 + structure*0.25 + zone*0.20 + press*0.15 + archetype*0.05
    // We don't have standalone press_score; press cohesion is within structure.
    // Map: structure = (compatibility + balance + coverage) / 3, distribute press weight.
    var pairingScore = (categories.pairing || 0) / 100;
    var zoneScore = (categories.zones || 100) / 100;
    var archetypeScore = (categories.archetype || 100) / 100;

    var comp = (categories.compatibility || 100) / 100;
    var bal = (categories.balance || 100) / 100;
    var cov = (categories.coverage || 100) / 100;
    var structureScore = (comp + bal + cov) / 3;

    // Arch doc weights (press*0.15 folded into structure as *0.40)
    var rawTotal = pairingScore * 0.35 + structureScore * 0.25 + zoneScore * 0.20 + 0.15 * structureScore + archetypeScore * 0.05;
    // Simplify: structure gets 0.25 + 0.15(press) = 0.40
    rawTotal = pairingScore * 0.35 + structureScore * 0.40 + zoneScore * 0.20 + archetypeScore * 0.05;
    var totalBase = Math.round(rawTotal * 100);

    // Penalties subtract from base
    var finalScore = Math.max(0, Math.min(100, totalBase - totalPenalty * 0.5));
    finalScore = Math.round(finalScore);

    // Assign band
    var band = BANDS[BANDS.length - 1];
    for (var b = 0; b < BANDS.length; b++) {
      if (finalScore >= BANDS[b].min) {
        band = BANDS[b];
        break;
      }
    }

    // Summary
    var summary = "";
    if (finalScore >= 85) {
      summary = "Tactic is elite. High coherence, FM-ready.";
    } else if (finalScore >= 70) {
      summary = "Tactic is functional. Solid with minor rough edges.";
    } else if (finalScore >= 50) {
      summary = "Tactic is risky. Violations present; review before use.";
    } else {
      summary = "Tactic is broken. Critical structural failures; do not use.";
    }

    // Include the per-source violation details
    var sourceBreakdown = {};
    Object.keys(violationSources).forEach(function(src) {
      var list = violationSources[src];
      if (list && list.length > 0 && sourceLabels[src]) {
        sourceBreakdown[src] = {
          label: sourceLabels[src],
          count: list.length,
          violations: list
        };
      }
    });

    return {
      score: finalScore,
      band: band.label,
      bandColor: band.color,
      summary: summary,
      violations: allViolations,
      violationCounts: {
        critical: criticalCount,
        error: errorCount,
        warning: warningCount,
        suggestion: suggestionCount,
        total: allViolations.length
      },
      sourceBreakdown: sourceBreakdown,
      penalty: totalPenalty
    };
  }

  // ─── EXPORT ───
  global.aggregateCoherence = aggregateCoherence;

})(typeof window !== "undefined" ? window : global);
