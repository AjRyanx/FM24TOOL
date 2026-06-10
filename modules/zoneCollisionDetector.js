(function (global) {
  "use strict";

  var profiles = global.ROLE_PROFILES || {};
  var ZONE_GRID = global.ZONE_GRID || {};

  function getProfile(r) { return profiles[r] || null; }

  // ════════════════════════════════════════════════════════════════
  // COLLISION DETECTION ENGINE
  // ════════════════════════════════════════════════════════════════

  function detectZoneCollisions(slots, instructions) {
    var violations = [];
    if (!slots) return { score: 1, violations: violations, zoneMap: {} };
    if (typeof inferRoleZoneMap !== "function") return { score: 1, violations: violations, zoneMap: {} };

    var phases = ["BuildUp", "Attack", "Defence", "Transition"];

    // Per-phase zone analysis
    var phaseResults = {};

    phases.forEach(function(phase) {
      var zoneMap = {};
      var slotDetails = {};

      Object.keys(slots).forEach(function(sid) {
        if (!slots[sid] || !slots[sid].roleId) return;
        if (sid === "GK") return;
        var roleId = slots[sid].roleId;
        var zone = inferRoleZoneMap(roleId, sid, phase);
        if (ZONE_GRID.isGoalZone && ZONE_GRID.isGoalZone(zone)) return;
        if (!zoneMap[zone]) zoneMap[zone] = [];
        zoneMap[zone].push({ slotId: sid, roleId: roleId });
        slotDetails[sid] = { zone: zone, roleId: roleId };
      });

      var phaseViolations = [];

      // ─── Check A: Zone overload (>2 occupants, no holder) ───
      Object.keys(zoneMap).forEach(function(zone) {
        var occs = zoneMap[zone];
        if (occs.length <= 2) return;
        var hasHolder = false;
        for (var i = 0; i < occs.length; i++) {
          var prof = getProfile(occs[i].roleId);
          if (prof && (prof.special.holder || (prof.defensive && prof.defensive.track_back > 0.8))) {
            hasHolder = true;
            break;
          }
        }
        if (!hasHolder) {
          var label = ZONE_GRID.zoneLabel ? (ZONE_GRID.zoneLabel[zone] || zone) : zone;
          phaseViolations.push({
            id: "Z3A_OVERLOAD_" + zone,
            severity: occs.length >= 4 ? "WARNING" : "SUGGESTION",
            phase: phase,
            zone: zone,
            zoneLabel: label,
            description: occs.length + " players in " + label + " during " + phase + " — no holder to provide structure.",
            suggestion: "Assign a defend-duty or holding role in this zone, or move one occupant to a different channel.",
            occupants: occs.map(function(o) { return o.roleId; })
          });
        }
      });

      // ─── Check B: Half-space column density (only if wide channel empty) ───
      [1, 3].forEach(function(col) {
        var zonesInCol = [];
        Object.keys(zoneMap).forEach(function(zone) {
          var zp = parseZone(zone);
          if (zp && zp.col === col) {
            zoneMap[zone].forEach(function(o) { zonesInCol.push({ zone: zone, roleId: o.roleId }); });
          }
        });
        if (zonesInCol.length < 3) return;
        // Check if the corresponding wide channel (col 0 for left, col 4 for right) is empty
        var wideCol = col === 1 ? 0 : 4;
        var hasWide = false;
        Object.keys(zoneMap).forEach(function(zone) {
          var zp = parseZone(zone);
          if (zp && zp.col === wideCol && zoneMap[zone].length > 0) hasWide = true;
        });
        if (hasWide) return;
        var side = col === 1 ? "left" : "right";
        phaseViolations.push({
          id: "Z3B_HALF_STACK_" + (col === 1 ? "L" : "R"),
          severity: zonesInCol.length >= 4 ? "WARNING" : "SUGGESTION",
          phase: phase,
          halfSpace: side,
          description: zonesInCol.length + " players stacked in the " + side + " half-space during " + phase + " with no wide outlet.",
          suggestion: "Move one occupant to the wide channel or assign a wide player on this flank.",
          occupants: zonesInCol.map(function(o) { return o.roleId; })
        });
      });

      // ─── Check C: Width void ───
      var wideCount = { 0: 0, 4: 0 };
      Object.keys(zoneMap).forEach(function(zone) {
        var zp = parseZone(zone);
        if (zp && (zp.col === 0 || zp.col === 4)) wideCount[zp.col] += zoneMap[zone].length;
      });
      if (wideCount[0] === 0 && wideCount[4] === 0) {
        phaseViolations.push({
          id: "Z3C_WIDTH_VOID",
          severity: "WARNING",
          phase: phase,
          description: "Both wide channels empty during " + phase + " — no width provider.",
          suggestion: "Assign a Winger/WB/FB with Attack duty on at least one flank."
        });
      }

      // ─── Check D: Unstructured roaming ───
      Object.keys(zoneMap).forEach(function(zone) {
        var occs = zoneMap[zone];
        var roamers = [];
        for (var i = 0; i < occs.length; i++) {
          var prof = getProfile(occs[i].roleId);
          if (prof && (prof.special.roaming || (prof.movement && prof.movement.roam > 0.7))) {
            roamers.push(occs[i]);
          }
        }
        if (roamers.length < 2) return;
        // Check adjacent zones for a holder
        var zp = parseZone(zone);
        if (!zp) return;
        var adjacentZones = [
          zoneId(zp.row, Math.max(0, zp.col - 1)),
          zoneId(zp.row, Math.min(4, zp.col + 1)),
          zoneId(Math.max(0, zp.row - 1), zp.col),
          zoneId(Math.min(3, zp.row + 1), zp.col)
        ];
        var adjacentHolder = false;
        for (var ai = 0; ai < adjacentZones.length; ai++) {
          var adj = zoneMap[adjacentZones[ai]];
          if (!adj) continue;
          for (var aj = 0; aj < adj.length; aj++) {
            var p = getProfile(adj[aj].roleId);
            if (p && p.special.holder) { adjacentHolder = true; break; }
          }
          if (adjacentHolder) break;
        }
        if (!adjacentHolder) {
          var label = ZONE_GRID.zoneLabel ? (ZONE_GRID.zoneLabel[zone] || zone) : zone;
          phaseViolations.push({
            id: "Z3D_UNSTRUCTURED_ROAM_" + zone,
            severity: "WARNING",
            phase: phase,
            zone: zone,
            zoneLabel: label,
            description: roamers.length + " roaming roles in " + label + " without a holder in adjacent zone during " + phase + ".",
            suggestion: "Add a holding midfielder or change one roaming role to a defend duty.",
            occupants: roamers.map(function(o) { return o.roleId; })
          });
        }
      });

      // ─── Check E: Zone 14 static overload ───
      var zone14 = zoneMap["0_2"];
      if (zone14 && zone14.length >= 2) {
        var staticCreators = [];
        for (var i = 0; i < zone14.length; i++) {
          var prof = getProfile(zone14[i].roleId);
          if (prof && (prof.special.static_creator || (prof.attacking && prof.attacking.through_balls > 0.7 && !prof.movement.roam))) {
            staticCreators.push(zone14[i]);
          }
        }
        if (staticCreators.length >= 2) {
          phaseViolations.push({
            id: "Z3E_ZONE14_STATIC",
            severity: "WARNING",
            phase: phase,
            zone: "0_2",
            description: staticCreators.length + " static creators share Zone 14 during " + phase + " — no runner to stretch defence.",
            suggestion: "Replace one static creator with a runner (SS, AM_A) or move one wide.",
            occupants: staticCreators.map(function(o) { return o.roleId; })
          });
        }
      }

      phaseResults[phase] = { zoneMap: zoneMap, violations: phaseViolations, slotDetails: slotDetails };
      phaseViolations.forEach(function(v) { violations.push(v); });
    });

    var score = computeZoneScore(violations);
    return { score: score, violations: violations, phaseResults: phaseResults };
  }

  // ─── HELPERS ───

  function parseZone(z) {
    if (!z || typeof z !== "string") return null;
    var p = z.split("_");
    return { row: parseInt(p[0], 10), col: parseInt(p[1], 10) };
  }

  function zoneId(row, col) {
    return row + "_" + col;
  }

  function computeZoneScore(violations) {
    var score = 1.0;
    violations.forEach(function(v) {
      if (v.severity === "CRITICAL") score -= 0.20;
      else if (v.severity === "ERROR") score -= 0.12;
      else if (v.severity === "WARNING") score -= 0.06;
      else score -= 0.02;
    });
    return Math.max(0, score);
  }

  // ─── EXPORT ───

  global.detectZoneCollisions = detectZoneCollisions;

})(typeof window !== "undefined" ? window : global);
