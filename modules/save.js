// ─── SAVE/LOAD ENGINE ───
// Backed by Dexie.js (IndexedDB). Falls back to localStorage if Dexie unavailable.

function sanitizeName(name) {
  return String(name).replace(/[^a-zA-Z0-9 _-]/g, "_").trim() || "Unnamed";
}

function deriveClubName(squad) {
  if (!squad || squad.length === 0) return "";
  var counts = {};
  var maxCount = 0;
  var best = "";
  for (var i = 0; i < squad.length; i++) {
    var club = squad[i].Club || "";
    if (!club) continue;
    counts[club] = (counts[club] || 0) + 1;
    if (counts[club] > maxCount) {
      maxCount = counts[club];
      best = club;
    }
  }
  return best;
}

// ─── Data shape validation ───

function validatePlayerData(player, source) {
  if (!player || typeof player !== 'object') return false;
  if (!player.Name || typeof player.Name !== 'string') {
    console.warn('[Validate] Player missing Name field', source);
    return false;
  }
  if (player.Age !== undefined && (typeof player.Age !== 'number' || isNaN(player.Age))) {
    player.Age = 0;
  }
  if (player.CA !== undefined && (typeof player.CA !== 'number' || isNaN(player.CA))) {
    player.CA = 100;
  }
  if (player.PA !== undefined && (typeof player.PA !== 'number' || isNaN(player.PA))) {
    player.PA = player.CA || 120;
  }
  return true;
}

function validateSquadData(players, source) {
  if (!Array.isArray(players)) return false;
  var valid = players.filter(function (p) { return validatePlayerData(p, source); });
  // Replace array in-place with only valid entries
  players.length = 0;
  valid.forEach(function (p) { players.push(p); });
  return players.length > 0;
}

// ─── Simple string hash for corruption detection ───

function computeChecksum(str) {
  var hash = 0;
  if (str.length === 0) return hash;
  for (var i = 0; i < str.length; i++) {
    var chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
}

// ─── Debounce helper for rapid save operations ───

var saveDebounceTimer = null;
var saveInProgress = false;

function debouncedSave(fn) {
  if (saveInProgress) return;
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(function () {
    saveInProgress = true;
    saveDebounceTimer = null;
    try { fn(); }
    finally { saveInProgress = false; }
  }, 300);
}

// ─── Serialization ───

function serializeState() {
  var s = window.FM24State;
  var data = {
    saveVersion: 7,
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
  if (s.board) {
    data.board = JSON.parse(JSON.stringify(s.board));
  }
  if (s.signingHistory) {
    data.signingHistory = JSON.parse(JSON.stringify(s.signingHistory));
  }
  if (s.freeAgentPool) {
    data.freeAgentPool = JSON.parse(JSON.stringify(s.freeAgentPool));
  }
  if (s.rivalClubs) {
    data.rivalClubs = JSON.parse(JSON.stringify(s.rivalClubs));
  }
  data.checksum = computeChecksum(JSON.stringify(data));
  return data;
}

function deserializeState(data) {
  if (!data || !data.saveVersion) return false;
  var storedChecksum = data.checksum;
  delete data.checksum;
  var computedChecksum = computeChecksum(JSON.stringify(data));
  if (storedChecksum && computedChecksum !== storedChecksum) {
    console.error('[Save] Checksum mismatch — save file may be corrupted');
    return false;
  }
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
    s.manager.budget = data.manager.budget !== undefined ? data.manager.budget : 50000000;
    if (data.saveVersion >= 2) {
      s.manager.wageBudget = data.manager.wageBudget !== undefined ? data.manager.wageBudget : 500000;
      s.manager.relationshipIndex = data.manager.relationshipIndex !== undefined ? data.manager.relationshipIndex : 60;
      s.manager.relationshipHistory = data.manager.relationshipHistory || [];
      s.manager.windowCount = data.manager.windowCount || 0;
      s.manager.pendingDecisions = data.manager.pendingDecisions || [];
      s.manager.incomingBids = data.manager.incomingBids || [];
      s.manager.partAResult = data.manager.partAResult || null;
      s.manager.transferResultV2 = data.manager.transferResultV2 || null;
    }
    if (data.saveVersion >= 3) {
      s.manager.transferAuthorityMode = data.manager.transferAuthorityMode || 'manual';
      s.manager.windowStage = data.manager.windowStage || null;
      s.manager.windowActive = data.manager.windowActive === true;
    }
    if (data.saveVersion >= 4) {
      s.manager.unrestPlayers = data.manager.unrestPlayers || [];
      s.manager.contractDispute = data.manager.contractDispute === true;
      s.manager.lowRelationshipConsecutive = data.manager.lowRelationshipConsecutive || 0;
      s.freeAgentPool = data.freeAgentPool || [];
    }
    if (data.saveVersion >= 5) {
      // unsoldWindows is part of signingHistory entries
    }
    if (data.saveVersion >= 6) {
      s.manager.evolutionHistory = data.manager.evolutionHistory || [];
      s.manager.lastFitBaseline = data.manager.lastFitBaseline || {};
      s.manager.evolutionLocked = data.manager.evolutionLocked === true;
    }
    if (data.saveVersion >= 7) {
      if (!s.manager.negotiation) {
        s.manager.negotiation = {};
      }
      if (s.manager.negotiation.candidateId === undefined) s.manager.negotiation.candidateId = null;
      if (s.manager.negotiation.interestResult === undefined) s.manager.negotiation.interestResult = null;
      if (s.manager.negotiation.alignmentScore === undefined) s.manager.negotiation.alignmentScore = 50;
      if (s.manager.negotiation.promises === undefined) s.manager.negotiation.promises = [];
      if (s.manager.negotiation.negotiationRound === undefined) s.manager.negotiation.negotiationRound = 0;
      if (s.manager.negotiation.currentDemands === undefined) s.manager.negotiation.currentDemands = null;
      if (s.manager.negotiation.userOffers === undefined) s.manager.negotiation.userOffers = [];
      if (s.manager.negotiation.reluctantThreshold === undefined) s.manager.negotiation.reluctantThreshold = null;
      if (s.manager.negotiation.status === undefined) s.manager.negotiation.status = null;
      if (s.manager.managerWage === undefined) s.manager.managerWage = 0;
    } else {
      // v6 save or earlier — write defaults
      if (!s.manager.negotiation) {
        s.manager.negotiation = {};
      }
      if (s.manager.negotiation.candidateId === undefined) s.manager.negotiation.candidateId = null;
      if (s.manager.negotiation.interestResult === undefined) s.manager.negotiation.interestResult = null;
      if (s.manager.negotiation.alignmentScore === undefined) s.manager.negotiation.alignmentScore = 50;
      if (s.manager.negotiation.promises === undefined) s.manager.negotiation.promises = [];
      if (s.manager.negotiation.negotiationRound === undefined) s.manager.negotiation.negotiationRound = 0;
      if (s.manager.negotiation.currentDemands === undefined) s.manager.negotiation.currentDemands = null;
      if (s.manager.negotiation.userOffers === undefined) s.manager.negotiation.userOffers = [];
      if (s.manager.negotiation.reluctantThreshold === undefined) s.manager.negotiation.reluctantThreshold = null;
      if (s.manager.negotiation.status === undefined) s.manager.negotiation.status = null;
      if (s.manager.managerWage === undefined) s.manager.managerWage = 0;
    }
    s.manager.loanedOutPlayers = data.manager.loanedOutPlayers || [];
    s.manager.transfers = data.manager.transfers || { in: [], out: [] };
    s.manager.squadDesignations = data.manager.squadDesignations || [];
    s.manager.transferResult = data.manager.transferResult || null;
    s.manager.dofImportComplete = data.manager.dofImportComplete === true;
    s.manager.windowHistory = data.manager.windowHistory || [];
    s.manager.hireHistory = data.manager.hireHistory || [];
  }
  if (data.board) {
    s.board = s.board || {};
    Object.assign(s.board, data.board);
  }
  if (data.saveVersion >= 3) {
    if (s.board.stage === undefined) s.board.stage = 'NORMAL';
    if (s.board.activeConstraint === undefined) s.board.activeConstraint = null;
    if (s.board.dismissalPending === undefined) s.board.dismissalPending = false;
    if (s.board.reprieverActive === undefined) s.board.reprieverActive = false;
    if (s.board.reprieveMandates === undefined) s.board.reprieveMandates = [];
  }
  if (data.signingHistory) {
    s.signingHistory = data.signingHistory.slice();
  }
  if (data.freeAgentPool) {
    s.freeAgentPool = data.freeAgentPool.slice();
  }
  if (data.rivalClubs) {
    s.rivalClubs = JSON.parse(JSON.stringify(data.rivalClubs));
  }
  return true;
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
  s.wonderkidUI = { maxAge: 21, minAge: 15, minPA: 130, minGap: 20, nationality: "", maxAP: "", includeUnknown: false, showOnlyTacticFits: false, sortBy: "pa", sortAsc: false, limit: 100, currentPage: 0, squadBaseline: null, userOverride: { minPA: false, minGap: false } };
  s.tacticUI = { activeTab: "pitch", renamingSlot: -1 };
  s.depthUI = { search: "", strata: "All", viewMode: "slots", provenOnly: false };
  s.currentSaveName = null;
  var defs = window.FM24_DEFAULTS || {};
  s.board = { confidence: defs.BOARD_CONFIDENCE || 70, stage: 'NORMAL', mandates: [], mandateHistory: [], activeConstraint: null, dismissalPending: false, reprieverActive: false, reprieveMandates: [] };
  s.signingHistory = [];
  s.panelScrollPositions = {};
  s.freeAgentPool = [];
  s.rivalClubs = {};
  if (s.manager) {
    s.manager.roster = [];
    s.manager.hired = null;
    s.manager.mode = null;
    s.manager.subMode = null;
    s.manager.transferAuthorityMode = 'manual';
    s.manager.generatedTactic = null;
    s.manager.report = null;
    s.manager.gaps = [];
    s.manager.recommendations = [];
    s.manager.dofImportComplete = false;
    s.manager.budget = defs.TRANSFER_BUDGET || 50000000;
    s.manager.wageBudget = defs.WAGE_BUDGET || 500000;
    s.manager.relationshipIndex = defs.RELATIONSHIP_INDEX || 60;
    s.manager.relationshipHistory = [];
    s.manager.windowCount = 0;
    s.manager.windowStage = null;
    s.manager.windowActive = false;
    s.manager.pendingDecisions = [];
    s.manager.incomingBids = [];
    s.manager.partAResult = null;
    s.manager.transferResultV2 = null;
    s.manager.transfers = { in: [], out: [] };
    s.manager.squadDesignations = [];
    s.manager.transferResult = null;
    s.manager.unrestPlayers = [];
    s.manager.contractDispute = false;
    s.manager.lowRelationshipConsecutive = 0;
    s.manager.windowHistory = [];
    s.manager.hireHistory = [];
    s.manager.evolutionHistory = [];
    s.manager.lastFitBaseline = {};
    s.manager.evolutionLocked = false;
    s.manager.lastFitResult = null;
    s.manager.lastCoherenceScore = null;
    s.manager.lastSquadFitScore = null;
    s.manager.squadDNA = null;
    s.manager.loanedOutPlayers = [];
    s.manager.negotiation = {
      candidateId: null,
      interestResult: null,
      alignmentScore: 50,
      promises: [],
      negotiationRound: 0,
      currentDemands: null,
      userOffers: [],
      reluctantThreshold: null,
      status: null
    };
    s.manager.managerWage = 0;
  }
}

// ─── Dexie-backed operations ───

function getDB() {
  return typeof window !== "undefined" && window.FM24DB ? window.FM24DB : null;
}

function _executeSave(mode, name) {
  var db = getDB();
  if (!db) {
    try {
      var SAVE_PREFIX = "fm24_save_";
      var key = SAVE_PREFIX + mode + "_" + sanitizeName(name);
      var raw = JSON.stringify(serializeState());
      localStorage.setItem(key, raw);
      return true;
    } catch (e) {
      return false;
    }
  }
  var s = window.FM24State;
  return db.saveGame(name, mode, serializeState(), s.squad, s.market).then(function () {
    return true;
  }).catch(function () {
    return false;
  });
}

function createSave(mode, name) {
  debouncedSave(function () { _executeSave(mode, name); });
}

function loadSave(mode, name) {
  var db = getDB();
  if (!db) {
    // Fallback to localStorage
    try {
      var SAVE_PREFIX = "fm24_save_";
      var key = SAVE_PREFIX + mode + "_" + sanitizeName(name);
      var raw = localStorage.getItem(key);
      if (!raw) return false;
      var data = JSON.parse(raw);
      return deserializeState(data);
    } catch (e) {
      return false;
    }
  }
  return db.loadGame(name, mode).then(function (result) {
    if (!result) return false;
    // Restore squad and market from DB
    if (result.squad) window.FM24State.squad = result.squad;
    if (result.market) window.FM24State.market = result.market;
    return deserializeState(result.data);
  }).catch(function () {
    return false;
  });
}

function deleteSave(mode, name) {
  var db = getDB();
  if (!db) {
    try {
      var SAVE_PREFIX = "fm24_save_";
      var META_PREFIX = "fm24_meta_";
      var key = SAVE_PREFIX + mode + "_" + sanitizeName(name);
      localStorage.removeItem(key);
      localStorage.removeItem(META_PREFIX + mode + "_" + sanitizeName(name));
      return true;
    } catch (e) {
      return false;
    }
  }
  return db.deleteSave(name, mode).then(function () {
    return true;
  }).catch(function () {
    return false;
  });
}

function listSaves(mode) {
  var db = getDB();
  if (!db) {
    var SAVE_PREFIX = "fm24_save_";
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
  return db.listSaves(mode).then(function (names) {
    return names;
  });
}

function listSavesWithMetadata(mode) {
  var db = getDB();
  if (!db) {
    var SAVE_PREFIX = "fm24_save_";
    var prefix = SAVE_PREFIX + mode + "_";
    var names = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf(prefix) === 0) {
        names.push(key.substring(prefix.length));
      }
    }
    return names.sort().map(function (name) {
      return {
        name: name,
        clubName: "",
        managerName: null,
        managerArchetype: null,
        transferArchetype: null,
        formation: null,
        playerCount: 0,
        marketCount: 0,
        boardConfidence: null,
        boardStage: null,
        contractDispute: false,
        windowCount: 0,
        createdAt: null,
        updatedAt: null
      };
    });
  }
  return db.listSavesWithMetadata(mode).then(function (metas) {
    return metas;
  });
}

function saveExists(mode, name) {
  var db = getDB();
  if (!db) {
    var SAVE_PREFIX = "fm24_save_";
    var key = SAVE_PREFIX + mode + "_" + sanitizeName(name);
    return localStorage.getItem(key) !== null;
  }
  return db.saveExists(name, mode).then(function (exists) {
    return exists;
  });
}
