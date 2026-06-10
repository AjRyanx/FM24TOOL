// ─── FM24 Tactic Generation Test Runner (Node.js) ───
// Usage: node run-test.js [maxManagers]
// Output: test-results.json + summary to console

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var BASE = __dirname;
var MAX_MANAGERS = parseInt(process.argv[2] || "30", 10);

// ── 1. Minimal browser API stubs ──
global.window = global;
global.navigator = { userAgent: "node" };
global.setTimeout = setTimeout;
global.clearTimeout = clearTimeout;
global.document = {
  createElement: function() { return {}; },
  createTextNode: function() { return {}; },
  addEventListener: function() {},
  querySelectorAll: function() { return []; },
  getElementById: function() { return null; },
  documentElement: { style: {} },
  body: { appendChild: function() {}, classList: { add: function() {}, remove: function() {} } },
  head: { appendChild: function() {} },
  querySelector: function() { return null; }
};
global.addEventListener = function() {};
global.location = { href: "", search: "", pathname: "" };
global.localStorage = { getItem: function() { return null; }, setItem: function() {}, removeItem: function() {} };
global.MutationObserver = function() { return { observe: function() {}, disconnect: function() {} }; };
global.customElements = { define: function() {}, get: function() { return undefined; } };
global.CustomEvent = function() { return { initCustomEvent: function() {} }; };
global.DOMParser = function() {};
global.DOMParser.prototype.parseFromString = function() { return { querySelectorAll: function() { return []; } }; };

// ── 2. Load scripts in order via vm.runInThisContext ──
var scriptOrder = [
  "data/roles.js",
  "data/tactic-schema.js",
  "data/instruction-weights.js",
  "data/role-profiles.js",
  "modules/squad.js",
  "modules/tactic.js",
  "modules/eval.js",
  "modules/market.js",
  "modules/ui.js",
  "data/relationship-pairings.js",
  "data/cb-combos.js",
  "data/midfield-combos.js",
  "data/zone-grid.js",
  "data/pairing-rules.js",
  "modules/pairingEngine.js",
  "modules/structureValidator.js",
  "modules/autofixEngine.js",
  "modules/zoneCollisionDetector.js",
  "modules/archetypeScorer.js",
  "modules/globalAggregator.js",
  "modules/tacticValidator.js",
  "modules/wonderkid.js",
  "data/manager-engine.js",
  "modules/managerEval.js",
  "modules/manager.js",
  "modules/save.js",
  "app.js"
];

console.log("Loading scripts (vm.runInThisContext)...");
scriptOrder.forEach(function(relPath) {
  var fullPath = path.join(BASE, relPath);
  if (!fs.existsSync(fullPath)) {
    console.warn("  SKIP (not found): " + relPath);
    return;
  }
  var code = fs.readFileSync(fullPath, "utf-8");
  try {
    vm.runInThisContext(code, fullPath);
  } catch(e) {
    // Some scripts may fail due to missing DOM APIs — that's OK for UI modules
    console.warn("  WARN (" + relPath + "): " + e.message.substring(0, 80));
  }
});
console.log("Scripts loaded.\n");

// ── 3. Verify core function ──
if (typeof generateTacticFromManager !== "function") {
  console.error("FATAL: generateTacticFromManager not loaded. Aborting.");
  process.exit(1);
}
console.log("Core engine: generateTacticFromManager = " + typeof generateTacticFromManager);

// ── 4. Parse staff.html table (no DOMParser dependency) ──
function parseStaffTable(html) {
  var headers = [];
  var rows = [];
  var thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi;
  var m;
  while ((m = thRe.exec(html)) !== null) {
    headers.push(m[1].replace(/<[^>]+>/g, "").trim());
  }
  if (headers.length === 0) {
    var firstTr = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
    if (firstTr) {
      var tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      while ((m = tdRe.exec(firstTr[1])) !== null) {
        headers.push(m[1].replace(/<[^>]+>/g, "").trim());
      }
    }
  }
  var trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  var isFirst = true;
  while ((m = trRe.exec(html)) !== null) {
    if (isFirst && headers.length > 0) { isFirst = false; continue; }
    var rowHtml = m[1];
    var cells = [];
    var tdRe2 = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    var cm;
    while ((cm = tdRe2.exec(rowHtml)) !== null) {
      cells.push(cm[1].replace(/<[^>]+>/g, "").trim());
    }
    if (cells.length > 0 && cells.length === headers.length) rows.push(cells);
  }
  return { headers: headers, rows: rows };
}

function buildManagers(parsed) {
  var NUMERIC = { Age:true, CA:true, PA:true, Temp:true, Spor:true, Prof:true,
    Pres:true, Loy:true, Cont:true, Amb:true, Youth:true,
    Tec:true, "Tac Knw":true, SPC:true, Mot:true, Men:true,
    Dis:true, "Jud SA":true, "Judge P":true, "Judge A":true,
    Ada:true, "Ana D":true, Att:true, Mgm:true, TCo:true };
  var FLOAT = { "Win %":true, "Draw %":true, "Loss %":true };
  var INT = { Pld:true, For:true, Ag:true, Drn:true, GD:true };

  return parsed.rows.map(function(cells) {
    var entry = {};
    parsed.headers.forEach(function(h, i) {
      var raw = (cells[i] || "").replace(/[^\x20-\x7E]/g, "").trim();
      if (NUMERIC[h]) { var n = parseInt(raw, 10); entry[h] = isNaN(n) ? 0 : n; }
      else if (FLOAT[h]) { var f = parseFloat(raw); entry[h] = isNaN(f) ? null : f; }
      else if (INT[h]) { var iv = parseInt(raw, 10); entry[h] = isNaN(iv) ? null : iv; }
      else { entry[h] = raw; }
    });
    entry.isManagerEligible = ["Head Coach","Manager","Sporting Director","Technical Director"]
      .indexOf(entry["Preferred Job"]) !== -1;
    return entry;
  });
}

// ── 5. Validation helper ──
function validateTactic(tactic) {
  var r = {};
  try {
    if (typeof evaluatePairings === "function") {
      var p = evaluatePairings(tactic.slots, tactic.instructions || {});
      r.pairingViolations = (p && p.violations) ? p.violations.filter(function(v) { return v.severity !== "GOOD"; }) : [];
      r.pairingScore = p ? p.pairingScore : null;
    }
  } catch(e) { r.pairingError = e.message; }

  try {
    if (typeof runStructuralValidators === "function") {
      var s = runStructuralValidators(tactic.slots, tactic.instructions || {});
      r.structuralScore = s.score;
      r.structuralViolations = s.violations || [];
    }
  } catch(e) { r.structuralError = e.message; }

  try {
    if (typeof detectZoneCollisions === "function") {
      var z = detectZoneCollisions(tactic.slots, tactic.instructions || {});
      r.zoneViolations = (z && z.violations) ? z.violations : [];
      r.zoneScore = z ? z.score : null;
    }
  } catch(e) { r.zoneError = e.message; }

  try {
    if (typeof scoreArchetypeCompliance === "function") {
      var a = scoreArchetypeCompliance(tactic.slots, tactic.instructions, tactic.philosophy);
      r.archetypeViolations = (a && a.violations) ? a.violations : [];
      r.archetypeScore = a ? a.score : null;
    }
  } catch(e) { r.archetypeError = e.message; }

  var ps = r.pairingScore != null ? r.pairingScore : 1;
  var ss = r.structuralScore != null ? r.structuralScore : 1;
  var zs = r.zoneScore != null ? r.zoneScore : 1;
  var asRaw = r.archetypeScore != null ? r.archetypeScore : 100;
  if (asRaw > 1) asRaw = asRaw / 100;
  r.globalScore = ps * 0.35 + ss * 0.40 + zs * 0.20 + asRaw * 0.05;
  return r;
}

// ── 6. Main test run ──
console.log("Reading staff.html...");
var staffHtml = fs.readFileSync(path.join(BASE, "staff.html"), "utf-8");
var parsed = parseStaffTable(staffHtml);
console.log("Headers: " + parsed.headers.join(", "));
console.log("Data rows: " + parsed.rows.length);

var allManagers = buildManagers(parsed);
var eligible = allManagers.filter(function(m) { return m.isManagerEligible; })
  .sort(function(a, b) { return (b.CA || 0) - (a.CA || 0); });

console.log("Staff: " + allManagers.length + " entries, " + eligible.length + " eligible managers.\n");

var testSet = eligible.slice(0, MAX_MANAGERS);
var results = [];
var successes = 0, errors = 0;
var totalPreScore = 0, totalPostScore = 0;
var totalFixes = 0;
var vioCounts = { CRITICAL: 0, ERROR: 0, WARNING: 0, SUGGESTION: 0 };

testSet.forEach(function(mgr, idx) {
  var name = (mgr.Name || "?").replace(/[^a-zA-Z0-9 ]/g, "").trim().substring(0, 25);
  var progress = "[" + (idx+1) + "/" + testSet.length + "] ";
  process.stdout.write(progress + name + "... ");

  var result = {
    manager: {
      Name: mgr.Name, CA: mgr.CA, Att: mgr.Att, Tec: mgr.Tec, Dis: mgr.Dis,
      PressingStyle: mgr["Pressing Style"], PlayingMentality: mgr["Playing Mentality"],
      PreferredFormation: mgr["Preferred Formation"]
    },
    tactic: null, preAutofix: null, postAutofix: null, autofixFixes: [], errors: []
  };

  // Generate
  var tactic;
  try {
    tactic = generateTacticFromManager(mgr, []);
    if (!tactic) { result.errors.push("Generation returned null"); errors++; console.log("NULL\n"); results.push(result); return; }
    result.tactic = {
      formation: tactic.formation,
      philosophy: tactic.philosophy,
      instructions: tactic.instructions,
      slots: {}
    };
    Object.keys(tactic.slots || {}).forEach(function(sid) {
      var s = tactic.slots[sid];
      result.tactic.slots[sid] = { roleId: s.roleId, duty: s.duty };
    });
  } catch(e) {
    result.errors.push("Generation: " + e.message);
    errors++;
    console.error("ERROR: " + e.stack + "\n");
    results.push(result);
    return;
  }

  // Pre-autofix validation (tactic already went through engine's internal autofix)
  try { result.preAutofix = validateTactic(tactic); }
  catch(e) { result.errors.push("Pre-validate: " + e.message); }

  // External second-pass autofix
  try {
    if (typeof autofixTactic === "function") {
      var fixResult = autofixTactic(tactic.slots, tactic.instructions || {}, 8, tactic.philosophy);
      result.autofixFixes = fixResult.fixes || [];
      if (fixResult.slots) tactic.slots = fixResult.slots;
      if (fixResult.instructions) tactic.instructions = fixResult.instructions;
    }
  } catch(e) { result.errors.push("Autofix: " + e.message); }

  // Post-autofix validation
  try { result.postAutofix = validateTactic(tactic); }
  catch(e) { result.errors.push("Post-validate: " + e.message); }

  // Sync final post-autofix tactic slots and instructions back to result object
  if (result.tactic) {
    result.tactic.instructions = tactic.instructions;
    result.tactic.slots = {};
    Object.keys(tactic.slots || {}).forEach(function(sid) {
      var s = tactic.slots[sid];
      result.tactic.slots[sid] = { roleId: s.roleId, duty: s.duty };
    });
  }

  if (result.preAutofix) totalPreScore += result.preAutofix.globalScore || 0;
  if (result.postAutofix) totalPostScore += result.postAutofix.globalScore || 0;
  totalFixes += result.autofixFixes.length;

  successes++;
  var preS = result.preAutofix ? (result.preAutofix.globalScore || 0).toFixed(3) : "?";
  var postS = result.postAutofix ? (result.postAutofix.globalScore || 0).toFixed(3) : "?";
  var fixC = result.autofixFixes.length;
  var vioC = 0;
  if (result.postAutofix) {
    ["pairingViolations","structuralViolations","zoneViolations","archetypeViolations"].forEach(function(k) {
      (result.postAutofix[k] || []).forEach(function(v) {
        vioC++;
        if (vioCounts[v.severity] !== undefined) vioCounts[v.severity]++;
      });
    });
  }
  var roleSummary = "";
  if (result.tactic && result.tactic.slots) {
    var sids = Object.keys(result.tactic.slots).sort();
    roleSummary = sids.map(function(sid) {
      var s = result.tactic.slots[sid];
      var role = getRoleById ? getRoleById(s.roleId) : null;
      return sid + "=" + (role ? role.abbreviation : s.roleId) + "-" + (s.duty||"?").charAt(0);
    }).join(" ");
  }
  results.push(result);
  console.log("Pre:" + preS + " Post:" + postS + " Fixes:" + fixC + " Vios:" + vioC);
  console.log("  " + tactic.formation + " " + tactic.philosophy + " | " + roleSummary);
});

// ── 7. Summary ──
console.log("\n═══════════════════════════════════════");
console.log("RESULTS: " + successes + " succeeded, " + errors + " errors");
if (successes > 0) {
  var avgPre = (totalPreScore / successes).toFixed(3);
  var avgPost = (totalPostScore / successes).toFixed(3);
  console.log("Avg Pre-Global-Score:   " + avgPre);
  console.log("Avg Post-Global-Score:  " + avgPost);
  console.log("Avg Delta:              " + (parseFloat(avgPost) - parseFloat(avgPre)).toFixed(3));
  console.log("Total Second-Pass Fixes: " + totalFixes);
  console.log("\nPost-Autofix Violations:");
  Object.keys(vioCounts).forEach(function(k) {
    if (vioCounts[k] > 0) console.log("  " + k + ": " + vioCounts[k]);
  });
}

// ── 8. Save results ──
var outputPath = path.join(BASE, "test-results.json");
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), "utf-8");
console.log("\nFull results saved to: " + outputPath);
console.log("To review: type `node -e \"var r=require('./test-results.json'); console.log(JSON.stringify(r, null, 2).substring(0,5000))\"`");
