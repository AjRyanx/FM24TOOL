// ─── SAVE/LOAD ENGINE ───

var SAVE_PREFIX = "fm24_save_";

function sanitizeName(name) {
  return String(name).replace(/[^a-zA-Z0-9 _-]/g, "_").trim() || "Unnamed";
}

function saveKey(mode, name) {
  return SAVE_PREFIX + mode + "_" + sanitizeName(name);
}

function listSaves(mode) {
  var prefix = SAVE_PREFIX + mode + "_";
  var saves = [];
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && key.indexOf(prefix) === 0) {
      saves.push(key.substring(prefix.length));
    }
  }
  return saves.sort();
}

function saveExists(mode, name) {
  return localStorage.getItem(saveKey(mode, name)) !== null;
}

function serializeState() {
  var s = window.FM24State;
  var data = {
    saveVersion: 1,
    tactic: JSON.parse(JSON.stringify(s.tactic)),
    depthHidden: JSON.parse(JSON.stringify(s.depthHidden)),
    depthOverrides: JSON.parse(JSON.stringify(s.depthOverrides)),
    shortlist: JSON.parse(JSON.stringify(s.shortlist)),
    marketUI: JSON.parse(JSON.stringify(s.marketUI)),
    wonderkidUI: JSON.parse(JSON.stringify(s.wonderkidUI)),
    tacticUI: JSON.parse(JSON.stringify(s.tacticUI)),
    depthUI: JSON.parse(JSON.stringify(s.depthUI))
  };
  if (s.manager) {
    data.manager = JSON.parse(JSON.stringify(s.manager));
  }
  return data;
}

function deserializeState(data) {
  if (!data || !data.saveVersion) return false;
  var s = window.FM24State;
  if (data.tactic) Object.assign(s.tactic, data.tactic);
  if (data.depthHidden) s.depthHidden = data.depthHidden.slice();
  if (data.depthOverrides) { s.depthOverrides = {}; Object.keys(data.depthOverrides).forEach(function (k) { s.depthOverrides[k] = data.depthOverrides[k]; }); }
  if (data.shortlist) s.shortlist = data.shortlist.slice();
  if (data.marketUI) Object.assign(s.marketUI, data.marketUI);
  if (data.wonderkidUI) Object.assign(s.wonderkidUI, data.wonderkidUI);
  if (data.tacticUI) Object.assign(s.tacticUI, data.tacticUI);
  if (data.depthUI) Object.assign(s.depthUI, data.depthUI);
  if (data.manager && s.manager) {
    s.manager.roster = data.manager.roster || [];
    s.manager.hired = data.manager.hired || null;
    s.manager.mode = data.manager.mode || null;
    s.manager.generatedTactic = data.manager.generatedTactic || null;
    s.manager.report = data.manager.report || null;
    s.manager.gaps = data.manager.gaps || [];
    s.manager.recommendations = data.manager.recommendations || [];
  }
  return true;
}

function createSave(mode, name) {
  var key = saveKey(mode, name);
  try {
    localStorage.setItem(key, JSON.stringify(serializeState()));
    return true;
  } catch (e) {
    return false;
  }
}

function loadSave(mode, name) {
  var key = saveKey(mode, name);
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return false;
    var data = JSON.parse(raw);
    return deserializeState(data);
  } catch (e) {
    return false;
  }
}

function deleteSave(mode, name) {
  var key = saveKey(mode, name);
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

function resetState() {
  var s = window.FM24State;
  s.squad = [];
  s.market = [];
  s.tactic = { formation: null, slots: {}, instructions: {}, isComplete: false, subs: {} };
  s.depthHidden = [];
  s.depthOverrides = {};
  s.shortlist = [];
  s.marketUI = { selectedSlotId: null, minScore: 11, minAge: 15, maxAge: 40, nationality: "", maxAP: "", maxWage: "", strata: "All", flank: "All", onlyShortlisted: false, sortBy: "best_score", sortAsc: false, currentPage: 0 };
  s.wonderkidUI = { maxAge: 21, minAge: 15, minPA: 130, minGap: 20, nationality: "", maxAP: "", includeUnknown: false, showOnlyTacticFits: false, sortBy: "pa", sortAsc: false, limit: 100, squadBaseline: null, userOverride: { minPA: false, minGap: false } };
  s.tacticUI = { activeTab: "pitch", renamingSlot: -1 };
  s.depthUI = { search: "", strata: "All", viewMode: "slots" };
  s.currentSaveName = null;
  if (s.manager) {
    s.manager.roster = [];
    s.manager.hired = null;
    s.manager.mode = null;
    s.manager.generatedTactic = null;
    s.manager.report = null;
    s.manager.gaps = [];
    s.manager.recommendations = [];
    s.manager.dofImportComplete = false;
  }
}
