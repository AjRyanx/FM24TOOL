var FM24_DEFAULTS = {
  TRANSFER_BUDGET: 50000000,
  WAGE_BUDGET: 500000,
  BOARD_CONFIDENCE: 70,
  RELATIONSHIP_INDEX: 60,
  MIN_AGE: 15,
  MAX_AGE: 40
};
window.FM24_DEFAULTS = FM24_DEFAULTS;

window.FM24State = {
  appMode: null,
  currentSaveName: null,
  squad: [],
  market: [],
  shortlist: [],
  tactic: {
    formation: null,
    slots: {},
    instructions: {},
    isComplete: false,
    subs: {}
  },
  filters: {},
  depthHidden: [],
  depthOverrides: {},
  tacticSlots: { slots: [], activeIndex: 0 },
  tacticUI: {
    activeTab: 'pitch',
    renamingSlot: -1
  },
  manager: {
    roster: [],
    hired: null,
    mode: null,
    subMode: null,
    transferAuthorityMode: 'manual',
    generatedTactic: null,
    report: null,
    gaps: [],
    recommendations: [],
    dofImportComplete: false,
    fitScores: {},
    fitScoresReady: false,
    fitScoresComputing: false,
    budget: FM24_DEFAULTS.TRANSFER_BUDGET,
    wageBudget: FM24_DEFAULTS.WAGE_BUDGET,
    transfers: { in: [], out: [] },
    squadDesignations: [],
    transferResultV2: null,
    pendingDecisions: [],
    incomingBids: [],
    relationshipIndex: FM24_DEFAULTS.RELATIONSHIP_INDEX,
    relationshipHistory: [],
    windowCount: 0,
    windowStage: null,
    windowActive: false,
    partAResult: null,
    windowHistory: [],
    unrestPlayers: [],
    contractDispute: false,
    lowRelationshipConsecutive: 0,
    evolutionHistory: [],
    lastFitBaseline: {},
    evolutionLocked: false,
    lastFitResult: null,
    lastCoherenceScore: null,
    lastSquadFitScore: null,
    squadDNA: null,
    negotiation: {
      status: null,
      candidateId: null,
      interestResult: null,
      alignmentScore: 50,
      promises: [],
      negotiationRound: 0,
      currentDemands: null,
      userOffers: [],
      reluctantThreshold: null,
      lastResponse: null
    }
  },
  freeAgentPool: [],
  rivalClubs: {},
  board: {
    confidence: FM24_DEFAULTS.BOARD_CONFIDENCE,
    stage: 'NORMAL',
    mandates: [],
    mandateHistory: [],
    activeConstraint: null,
    dismissalPending: false,
    reprieverActive: false,
    reprieveMandates: []
  },
  signingHistory: [],
  panelScrollPositions: {}
};

function saveDepthHidden() {
  var json = JSON.stringify(window.FM24State.depthHidden);
  try { localStorage.setItem("fm24_depth_hidden", json); } catch (_) {}
  if (window.FM24DB) window.FM24DB.setPref('fm24_depth_hidden', json);
}

function saveDepthOverrides() {
  var json = JSON.stringify(window.FM24State.depthOverrides);
  try { localStorage.setItem("fm24_depth_overrides", json); } catch (_) {}
  if (window.FM24DB) window.FM24DB.setPref('fm24_depth_overrides', json);
}

// ─── MODE MANAGEMENT ───

function filterTabsByMode(mode) {
  document.querySelectorAll('.sidebar-nav-group[data-mode]').forEach(function (group) {
    var groupMode = group.dataset.mode;
    group.classList.toggle("hidden", groupMode !== mode);
  });

  // Toggle specific recruitment tabs in DoF mode based on the manager's operational mode
  var marketBtn = document.querySelector('.sidebar-nav-item[data-tab="market"]');
  var wonderkidBtn = document.querySelector('.sidebar-nav-item[data-tab="wonderkid"]');
  var managerBtn = document.querySelector('.sidebar-nav-item[data-tab="manager"]');

  if (mode === "dof") {
    var mgr = window.FM24State.manager || {};
    var mgrMode = mgr.mode;
    var isFullManager = (mgrMode === "full_manager");
    
    if (marketBtn) marketBtn.classList.toggle("hidden", isFullManager);
    if (wonderkidBtn) wonderkidBtn.classList.toggle("hidden", isFullManager);
    if (managerBtn) {
      managerBtn.classList.remove("hidden");
      var labelSpan = managerBtn.querySelector('.sidebar-item-label');
      if (labelSpan) {
        labelSpan.textContent = mgr.hired ? "Manager Profile" : "Manager Market";
      }
    }
  } else {
    // In Normal mode, market/wonderkid are always visible, but manager profile/market is hidden
    if (marketBtn) marketBtn.classList.remove("hidden");
    if (wonderkidBtn) wonderkidBtn.classList.remove("hidden");
    if (managerBtn) managerBtn.classList.add("hidden");
  }
}

function updateSaveBar() {
  var sidebarName = document.getElementById("sidebar-save-name");
  var sidebarDot = document.getElementById("sidebar-save-dot");
  if (sidebarName && sidebarDot) {
    if (window.FM24State.appMode) {
      sidebarName.textContent = window.FM24State.currentSaveName || "Unsaved";
      sidebarDot.classList.remove("unsaved");
    } else {
      sidebarName.textContent = "Unsaved";
    }
  }
  var modeVal = document.getElementById("sidebar-mode-value");
  if (modeVal) {
    modeVal.textContent = window.FM24State.appMode === "dof" ? "Director of Football" : window.FM24State.appMode === "normal" ? "Normal" : "—";
  }
}

function renderAll() {
  renderTacticBuilder();
  renderDepthView();
  renderMarketView();
  renderWonderkidView();
  if (window.FM24State.appMode === "dof") {
    renderManagerView();
    updateManagerBadge();
    if (typeof renderDashboardView === "function") renderDashboardView();
    if (typeof renderTransfersView === "function") renderTransfersView();
  }
  updateSaveBar();
  updateNavBadge();
  // Always re-sync sidebar visibility with current manager mode state
  if (window.FM24State.appMode) filterTabsByMode(window.FM24State.appMode);
}
window.renderAll = renderAll;

function enterMode(mode) {
  window.FM24State.appMode = mode;
  if (window.FM24DB) { window.FM24DB.setPref('fm24_mode', mode); } else { try { localStorage.setItem("fm24_mode", mode); } catch (_) {} }
  var overlay = document.getElementById("mode-overlay");
  if (overlay) overlay.classList.add("hidden");
  var contScreen = document.getElementById("continuity-screen");
  if (contScreen) contScreen.classList.remove("hidden");
  showContinuityScreen(mode);

  document.getElementById("app-shell")?.classList.remove("hidden");
  document.getElementById("app-sidebar")?.classList.remove("hidden");

  var modeVal = document.getElementById("sidebar-mode-value");
  if (modeVal) {
    modeVal.textContent = mode === "dof" ? "Director of Football" : mode === "normal" ? "Normal" : "—";
  }

  filterTabsByMode(mode);

  var defaultTab = mode === "dof" ? "dashboard" : "tactic";
  if (typeof window.FM24SwitchTab === "function") {
    window.FM24SwitchTab(defaultTab);
  }
}

function showContinuityScreen(mode) {
  var modeLabel = document.getElementById("continuity-mode-label");
  if (modeLabel) {
    modeLabel.textContent = mode === "dof" ? "DOF Mode" : "Normal Mode";
  }

  var listEl = document.getElementById("continuity-saves-list");
  if (!listEl) return;
  listSavesWithMetadata(mode).then(function (saves) {
    listEl.innerHTML = "";
    if (saves.length === 0) {
      listEl.innerHTML = "<div class='text-xs text-text-muted' style='padding:8px 0'>No saved sessions yet.</div>";
      return;
    }

    saves.forEach(function (save) {
      var card = document.createElement("div");
      card.className = "continuity-card";

      var nameEl = document.createElement("div");
      nameEl.className = "continuity-save-name";
      nameEl.textContent = save.name;
      card.appendChild(nameEl);

      var meta = document.createElement("div");
      meta.className = "continuity-meta";

      if (save.clubName) {
        var clubEl = document.createElement("span");
        clubEl.className = "continuity-meta-item";
        clubEl.textContent = save.clubName;
        meta.appendChild(clubEl);
      }

      if (save.formation) {
        var formEl = document.createElement("span");
        formEl.className = "continuity-meta-item";
        formEl.textContent = save.formation;
        meta.appendChild(formEl);
      }

      if (save.playerCount > 0) {
        var pcEl = document.createElement("span");
        pcEl.className = "continuity-meta-item";
        pcEl.textContent = save.playerCount + " players";
        meta.appendChild(pcEl);
      }

      if (save.updatedAt) {
        var timeEl = document.createElement("span");
        timeEl.className = "continuity-meta-item";
        var d = new Date(save.updatedAt);
        timeEl.textContent = d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        meta.appendChild(timeEl);
      }

      card.appendChild(meta);

      var actions = document.createElement("div");
      actions.className = "continuity-save-actions";

      var loadBtn = document.createElement("button");
      loadBtn.className = "cont-load-btn";
      loadBtn.textContent = "Load";
      loadBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        startLoadedGame(save.name);
      });
      actions.appendChild(loadBtn);

      var delBtn = document.createElement("button");
      delBtn.className = "cont-del-btn";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var isActive = (save.name === window.FM24State.currentSaveName);
        var msg = isActive
          ? "Warning: '" + save.name + "' is your currently active save. Deleting it will decouple your current session from this file, making it an unsaved game. Proceed?"
          : "Delete save '" + save.name + "'?";
        if (!confirm(msg)) return;
        deleteSave(mode, save.name).then(function () {
          if (isActive) {
            window.FM24State.currentSaveName = null;
            updateSaveBar();
          }
          showContinuityScreen(mode);
        });
      });
      actions.appendChild(delBtn);

      card.appendChild(actions);
      listEl.appendChild(card);
    });
  });
}

function startNewGame() {
  resetState();
  document.getElementById("continuity-screen").classList.add("hidden");
  var mode = window.FM24State.appMode;

  renderAll();

  if (mode === "dof") {
    window.FM24State.manager.dofImportComplete = false;
    showImportOverlay();
  }
}

function startLoadedGame(saveName) {
  var mode = window.FM24State.appMode;
  loadSave(mode, saveName).then(function (success) {
    if (!success) {
      showToast("Failed to load save.", "error");
      return;
    }
    window.FM24State.currentSaveName = saveName;
    document.getElementById("continuity-screen").classList.add("hidden");

    renderAll();

    if (mode === "dof") {
      var s = window.FM24State;
      if (s.manager.hired && !s.squad.length) {
        showImportOverlay();
      } else if (s.manager.hired) {
        hideImportOverlay();
        window.FM24SwitchTab("dashboard");
      } else if (!s.manager.dofImportComplete) {
        showImportOverlay();
      } else {
        window.FM24SwitchTab("manager");
      }
    }
    showToast('Loaded "' + saveName + '".', "success");
  });
}

function showImportOverlay() {
  var overlay = document.getElementById("dof-import-overlay");
  overlay.classList.remove("hidden", "fade-out");
  // Re-wire upload handlers each time overlay is shown
  wireImportUpload("import-squad-zone", "squad");
  wireImportUpload("import-staff-zone", "staff");
  wireImportUpload("import-market-zone", "market");

  // Pre-mark zones if data already exists (e.g. from save/previous import)
  if (window.FM24State.squad.length > 0) {
    markImportRowDone("import-squad-zone", "Loaded squad (" + window.FM24State.squad.length + " players)");
  }
  if (window.FM24State.manager.roster.length > 0) {
    markImportRowDone("import-staff-zone", "Loaded staff (" + window.FM24State.manager.roster.length + ")");
  }
  if (window.FM24State.market.length > 0) {
    markImportRowDone("import-market-zone", "Loaded market (" + window.FM24State.market.length + " players)");
  }

  updateImportContinueBtn();
}

function hideImportOverlay() {
  var overlay = document.getElementById("dof-import-overlay");
  overlay.classList.add("fade-out");
  setTimeout(function () {
    overlay.classList.add("hidden");
  }, 400);
}

function wireImportUpload(zoneId, targetKey) {
  var zone = document.getElementById(zoneId);
  if (!zone) return;
  var input = zone.querySelector(".import-file-input");
  if (!input) return;
  // Remove old listener by replacing
  var newInput = input.cloneNode(true);
  input.parentNode.replaceChild(newInput, input);
  newInput.addEventListener("change", function () {
    if (!this.files || !this.files[0]) return;
    var file = this.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
      var text = e.target.result;
      if (text.indexOf("<html") === -1 && text.indexOf("<!DOCTYPE") === -1 && text.indexOf("<table") === -1) {
        showToast("This doesn't look like an FM24 HTML export.", "error");
        return;
      }
      var progressBar = document.getElementById(zoneId.replace("import-", "import-").replace("-zone", "-progress"));
      if (progressBar) {
        var progressContainer = progressBar.parentNode;
        if (progressContainer) progressContainer.classList.remove("hidden");
      }
      function onProgress(cur, total) {
        if (progressBar) {
          progressBar.style.width = Math.round((cur / total) * 100) + "%";
        }
      }
      var parsePromise;
      if (targetKey === "squad") {
        parsePromise = parseSquadHTML(text, onProgress);
      } else if (targetKey === "staff") {
        parsePromise = parseStaffHTML(text, onProgress);
      } else if (targetKey === "market") {
        parsePromise = (typeof parseMarketHTML !== "undefined" ? parseMarketHTML : parseSquadHTML)(text, onProgress);
      }
      if (parsePromise) {
        parsePromise.then(function (result) {
          if (targetKey === "squad") {
            window.FM24State.squad = result;
            window.dispatchEvent(new CustomEvent("fm24:squad-loaded", { detail: { count: result.length } }));
            showToast("Loaded " + result.length + " players.", "success");
          } else if (targetKey === "staff") {
            window.FM24State.manager.roster = result;
            window.FM24State.manager.fitScores = {};
            window.FM24State.manager.fitScoresReady = false;
            window.FM24State.manager.fitScoresComputing = false;
            var eligible = filterEligibleManagers(result);
            showToast("Loaded " + result.length + " staff, " + eligible.length + " eligible managers.", "success");
          } else if (targetKey === "market") {
            window.FM24State.market = result;
            window.dispatchEvent(new CustomEvent("fm24:market-loaded", { detail: { count: result.length } }));
            showToast("Loaded " + result.length + " market players.", "success");
          }
          markImportRowDone(zoneId, file.name);
          updateImportContinueBtn();
        });
      }
    };
    reader.readAsText(file);
  });
  // Click zone to trigger file input
  zone.addEventListener("click", function (e) {
    if (e.target === newInput || newInput.contains(e.target)) return;
    newInput.click();
  });

  // Drag-and-drop
  zone.addEventListener("dragover", function (e) {
    e.preventDefault();
    if (!zone.classList.contains("done")) zone.classList.add("drag-over");
  });
  zone.addEventListener("dragleave", function () {
    zone.classList.remove("drag-over");
  });
  zone.addEventListener("drop", function (e) {
    e.preventDefault();
    zone.classList.remove("drag-over");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      newInput.files = e.dataTransfer.files;
      var event = new Event("change", { bubbles: true });
      newInput.dispatchEvent(event);
    }
  });
}

function markImportRowDone(zoneId, filename) {
  var zone = document.getElementById(zoneId);
  if (!zone) return;
  zone.classList.add("done");
  zone.classList.remove("drag-over");
  var placeholder = zone.querySelector(".import-placeholder");
  var fnEl = zone.querySelector(".import-filename");
  var check = zone.querySelector(".import-check");
  if (placeholder) placeholder.classList.add("hidden");
  if (fnEl) { fnEl.textContent = filename; fnEl.classList.remove("hidden"); }
  if (check) check.classList.remove("hidden");

  // Add or show change button
  var changeBtn = zone.querySelector(".import-change-btn");
  if (!changeBtn) {
    changeBtn = document.createElement("button");
    changeBtn.className = "import-change-btn";
    changeBtn.textContent = "[Change]";
    changeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      resetImportZone(zoneId);
    });
    zone.appendChild(changeBtn);
  }
  changeBtn.classList.remove("hidden");
}

function resetImportZone(zoneId) {
  var zone = document.getElementById(zoneId);
  if (!zone) return;

  var targetKey = null;
  if (zoneId.indexOf("squad") !== -1) {
    targetKey = "squad";
  } else if (zoneId.indexOf("staff") !== -1) {
    targetKey = "staff";
  } else if (zoneId.indexOf("market") !== -1) {
    targetKey = "market";
  }

  if (targetKey === "squad") {
    window.FM24State.squad = [];
  } else if (targetKey === "staff") {
    window.FM24State.manager.roster = [];
    window.FM24State.manager.fitScores = {};
    window.FM24State.manager.fitScoresReady = false;
    window.FM24State.manager.fitScoresComputing = false;
  } else if (targetKey === "market") {
    window.FM24State.market = [];
  }

  zone.classList.remove("done");
  var placeholder = zone.querySelector(".import-placeholder");
  var fnEl = zone.querySelector(".import-filename");
  var check = zone.querySelector(".import-check");
  var changeBtn = zone.querySelector(".import-change-btn");
  var progressBar = document.getElementById(zoneId.replace("-zone", "-progress"));
  var progressContainer = progressBar ? progressBar.parentNode : null;

  if (placeholder) placeholder.classList.remove("hidden");
  if (fnEl) fnEl.classList.add("hidden");
  if (check) check.classList.add("hidden");
  if (changeBtn) changeBtn.classList.add("hidden");
  if (progressContainer) progressContainer.classList.add("hidden");
  if (progressBar) progressBar.style.width = "0%";

  if (targetKey) wireImportUpload(zoneId, targetKey);
  updateImportContinueBtn();
}

function updateImportContinueBtn() {
  var btn = document.getElementById("import-continue-btn");
  if (!btn) return;
  var squadZone = document.getElementById("import-squad-zone");
  var staffZone = document.getElementById("import-staff-zone");
  var squadDone = squadZone && squadZone.classList.contains("done");
  var staffDone = staffZone && staffZone.classList.contains("done");
  btn.disabled = !(squadDone && staffDone);
}

function exitMode() {
  if (window.FM24State.currentSaveName) {
    createSave(window.FM24State.appMode, window.FM24State.currentSaveName);
  }
  resetState();
  try { localStorage.removeItem("fm24_mode"); } catch (_) {}
  window.FM24State.appMode = null;
  document.getElementById("mode-overlay").classList.remove("hidden");
  document.getElementById("app-shell").classList.add("hidden");
  document.getElementById("app-sidebar").classList.add("hidden");
  updateSaveBar();
}

// ─── MANAGER BADGE ───

function updateManagerBadge() {
  var badge = document.getElementById("manager-badge");
  if (!badge) return;
  if (window.FM24State.appMode !== "dof") {
    badge.textContent = "";
  } else {
    var mgr = window.FM24State.manager;
    if (mgr.hired) {
      var name = mgr.hired.Name || "";
      badge.textContent = name.length > 12 ? name.substring(0, 12) + "\u2026" : name;
      if (mgr.generatedTactic) {
        badge.innerHTML = badge.textContent + ' <span style="color:#22c55e">\u25CF</span>';
      }
    } else {
      badge.textContent = "";
    }
  }
  var tfBadge = document.getElementById("sidebar-transfers-badge");
  if (tfBadge) {
    if (window.FM24State.appMode === "dof") {
      var unrestCount = (window.FM24State.manager.unrestPlayers || []).length;
      var pendingCount = (window.FM24State.manager.pendingDecisions || []).length;
      var total = unrestCount + pendingCount;
      tfBadge.textContent = total > 0 ? total : "";
      tfBadge.classList.toggle("hidden", total === 0);
    } else {
      tfBadge.classList.add("hidden");
    }
  }
}

// ─── SAVE/LOAD UI ───

function renderLoadModal() {
  var listEl = document.getElementById("load-list");
  if (!listEl) return;
  var mode = window.FM24State.appMode;
  if (!mode) return;
  listSaves(mode).then(function (saves) {
    if (saves.length === 0) {
      listEl.innerHTML = "<p class='text-xs text-text-muted'>No saves found.</p>";
      return;
    }
    listEl.innerHTML = "";
    saves.forEach(function (name) {
      var item = document.createElement("div");
      item.className = "load-save-item";
      var label = document.createElement("span");
      label.className = "text-xs text-white";
      label.textContent = name;
      item.appendChild(label);
      var actions = document.createElement("div");
      actions.className = "flex gap-1";
      var loadBtn = document.createElement("button");
      loadBtn.className = "load-btn";
      loadBtn.textContent = "Load";
      loadBtn.addEventListener("click", function () {
        loadSave(mode, name).then(function (success) {
          if (!success) { showToast("Failed to load save.", "error"); return; }
          window.FM24State.currentSaveName = name;
          document.getElementById("load-modal").classList.remove("open");
          showToast("Save loaded.", "info");
          renderAll();
        });
      });
      actions.appendChild(loadBtn);
      var delBtn = document.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.textContent = "Del";
      delBtn.addEventListener("click", function () {
        var isActive = (name === window.FM24State.currentSaveName);
        var msg = isActive
          ? "Warning: '" + name + "' is your currently active save. Deleting it will decouple your current session from this file, making it an unsaved game. Proceed?"
          : "Delete save '" + name + "'?";
        if (!confirm(msg)) return;
        deleteSave(mode, name).then(function () {
          if (isActive) {
            window.FM24State.currentSaveName = null;
            updateSaveBar();
          }
          renderLoadModal();
        });
      });
      actions.appendChild(delBtn);
      item.appendChild(actions);
      listEl.appendChild(item);
    });
  });
}

// ─── INIT ───

(function () {
  initTacticSlots();

  // Load depth preferences from DB or localStorage
  function loadDepthPrefs() {
    var db = window.FM24DB;
    if (db) {
      db.getPref('fm24_depth_hidden').then(function (val) {
        if (val) try { window.FM24State.depthHidden = JSON.parse(val); } catch (_) {}
      });
      db.getPref('fm24_depth_overrides').then(function (val) {
        if (val) try { window.FM24State.depthOverrides = JSON.parse(val); } catch (_) {}
      });
    } else {
      try {
        var dh = localStorage.getItem("fm24_depth_hidden");
        if (dh) window.FM24State.depthHidden = JSON.parse(dh);
      } catch (_) {}
      try {
        var dor = localStorage.getItem("fm24_depth_overrides");
        if (dor) window.FM24State.depthOverrides = JSON.parse(dor);
      } catch (_) {}
    }
  }
  loadDepthPrefs();

  window.FM24State.depthUI = {
    search: "",
    strata: "All",
    viewMode: "slots"
  };

  window.FM24State.marketUI = {
    selectedSlotId: null,
    minScore: 11,
    minAge: 15,
    maxAge: 40,
    nationality: "",
    maxAP: "",
    maxWage: "",
    strata: "All",
    flank: "All",
    onlyShortlisted: false,
    sortBy: "best_score",
    sortAsc: false,
    currentPage: 0
  };

  window.FM24State.wonderkidUI = {
    maxAge: 21,
    minAge: 15,
    minPA: 130,
    minGap: 20,
    nationality: "",
    maxAP: "",
    includeUnknown: false,
    showOnlyTacticFits: false,
    sortBy: "pa",
    sortAsc: false,
    limit: 100,
    squadBaseline: null,
    userOverride: { minPA: false, minGap: false }
  };

  // ─── TABS ───

  var panels = {
    tactic: document.getElementById("panel-tactic"),
    squad: document.getElementById("panel-squad"),
    market: document.getElementById("panel-market"),
    wonderkid: document.getElementById("panel-wonderkid"),
    manager: document.getElementById("panel-manager"),
    dashboard: document.getElementById("panel-dashboard"),
    transfers: document.getElementById("panel-transfers")
  };

  var TITLE_MAP = {
    tactic: "Tactic Builder",
    squad: "Squad Depth",
    market: "Market Search",
    wonderkid: "Wonderkid Scout",
    manager: "Manager Office",
    dashboard: "Dashboard",
    transfers: "Transfer Activity"
  };

  function switchTab(tabId) {
    if (window.FM24State.appMode === "normal" && (tabId === "manager" || tabId === "dashboard" || tabId === "transfers")) {
      tabId = "tactic";
    }
    if ((tabId === "market" || tabId === "wonderkid") && window.FM24State.appMode === "dof" && window.FM24State.manager.mode === "full_manager") {
      tabId = "dashboard";
    }
    if ((tabId === "market" || tabId === "wonderkid") && window.FM24State.appMode === "dof" && window.FM24State.manager.transferAuthorityMode === "assisted" && window.FM24State.manager.windowActive) {
      tabId = "dashboard";
    }
    if (window.FM24State.panelScrollPositions) {
      Object.keys(panels).forEach(function (id) {
        var p = panels[id];
        if (p && p.classList.contains("active")) {
          window.FM24State.panelScrollPositions[id] = p.scrollTop;
        }
      });
    }
    document.querySelectorAll(".sidebar-nav-item").forEach(function (btn) {
      btn.classList.toggle("active-nav", btn.dataset.tab === tabId);
    });
    Object.keys(panels).forEach(function (id) {
      if (panels[id]) panels[id].classList.remove("active");
    });
    var newPanel = panels[tabId];
    if (newPanel) {
      newPanel.style.display = tabId === "tactic" ? "flex" : "block";
      requestAnimationFrame(function () {
        newPanel.classList.add("active");
        newPanel.style.display = "";
        if (window.FM24State.panelScrollPositions) {
          var saved = window.FM24State.panelScrollPositions[tabId];
          if (saved != null) {
            requestAnimationFrame(function () { newPanel.scrollTop = saved; });
          }
        }
      });
    }
    document.title = "FM24 Tactical Suite \u2014 " + (TITLE_MAP[tabId] || tabId.charAt(0).toUpperCase() + tabId.slice(1));
    safeRender(function () {
      if (tabId === "tactic") renderTacticBuilder();
      if (tabId === "market") renderMarketView();
      if (tabId === "squad") renderDepthView();
      if (tabId === "wonderkid") renderWonderkidView();
      if (tabId === "manager") renderManagerView();
      if (tabId === "dashboard" && typeof renderDashboardView === "function") renderDashboardView();
      if (tabId === "transfers" && typeof renderTransfersView === "function") renderTransfersView();
    }, tabId);
  }

  function safeRender(fn, panelId) {
    try { fn(); }
    catch (err) {
      console.error('[Render Error] panel=' + panelId, err);
      var panel = document.getElementById(panelId === 'tactic' ? 'tactic-panel' : panelId + '-panel');
      if (!panel) panel = document.querySelector('.panel.active');
      if (panel) {
        panel.innerHTML = '<div class="p-6 text-center text-red-400 text-xs bg-backdrop border border-red-700/40 rounded-lg m-4">' +
          '<p class="font-bold mb-1">Failed to render this view</p>' +
          '<p class="text-text-muted">' + escHtml(err.message || 'Unknown error') + '</p>' +
          '<button onclick="FM24SwitchTab(\'' + panelId + '\')" class="mt-3 px-3 py-1 text-xs border border-border rounded hover:bg-surface-hover">Retry</button></div>';
      }
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("hashchange", function () {
      var tabId = (location.hash || '').replace('#', '') || 'tactic';
      switchTab(tabId);
    });

    // Initial tab from hash, or default to tactic
    var initialTab = (location.hash || '').replace('#', '') || 'tactic';
    switchTab(initialTab);
  }

  window.FM24SwitchTab = switchTab;

  // ─── GLOBAL KEYBOARD SHORTCUTS ───

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var locked = document.getElementById("locked-market");
      if (locked && locked.style.display === "flex") {
        locked.style.display = "none";
        location.hash = window.FM24State.appMode === "dof" ? '#manager' : '#tactic';
        e.preventDefault();
      }
    }
  });

  window.setActiveTab = function (tab) {
    window.FM24State.tacticUI.activeTab = tab;
    renderTacticBuilder();
    var popover = document.getElementById("role-popover");
    if (popover) popover.style.display = "none";
  };

  // ─── EVENT LISTENERS ───

  window.addEventListener("fm24:formation-changed", onTacticChanged);
  window.addEventListener("fm24:slot-assigned", onTacticChanged);
  window.addEventListener("fm24:slot-cleared", onTacticChanged);
  window.addEventListener("fm24:slot-moved", onTacticChanged);
  window.addEventListener("fm24:tactic-imported", onTacticChanged);

  window.addEventListener("fm24:squad-loaded", function () {
    var wk = window.FM24State.wonderkidUI;
    wk.userOverride = { minPA: false, minGap: false };
    clearPlayerCache();
    invalidateSquadFitCache();
    if (typeof invalidateDNACache === 'function') invalidateDNACache();
    // Reset manager fit scores on squad change
    window.FM24State.manager.fitScores = {};
    window.FM24State.manager.fitScoresReady = false;
    window.FM24State.manager.fitScoresComputing = false;
    renderAll();
  });

  window.addEventListener("fm24:market-loaded", function () {
    clearPlayerCache();
    renderAll();
  });

  var invalidateAll = function () {
    invalidateSquadFitCache();
    if (typeof invalidateDNACache === 'function') invalidateDNACache();
    renderDepthView();
    renderWonderkidView();
  };
  window.addEventListener("fm24:tactic-complete", invalidateAll);
  window.addEventListener("fm24:instructions-changed", invalidateAll);

  window.addEventListener("fm24:tactic-complete", function () { renderMarketView(); renderWonderkidView(); });
  window.addEventListener("fm24:instructions-changed", function () {
    onTacticChanged();
    renderMarketView();
    renderWonderkidView();
    var mp = document.getElementById("panel-market");
    if (mp && mp.classList.contains("active") && window.FM24State.tactic.isComplete && window.FM24State.market.length > 0) {
      showToast("Tactic updated - scores recalculated.", "info");
    }
  });

  // ─── MANAGER BADGE EVENTS ───

  window.addEventListener("fm24:squad-loaded", updateManagerBadge);
  window.addEventListener("fm24:market-loaded", updateManagerBadge);

  // Helper to safely bind event listeners in environments without full DOM
  function safeAddListener(id, event, callback) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener(event, callback);
    }
  }

  // ─── MODE SELECTION ───

  safeAddListener("mode-normal", "click", function () { enterMode("normal"); });
  safeAddListener("mode-dof", "click", function () { enterMode("dof"); });

  // ─── SAVE MODAL ───

  function doSave(name) {
    var mode = window.FM24State.appMode;
    if (!mode) return;
    var sanitized = sanitizeName(name);
    if (!sanitized) { showToast("Invalid save name.", "error"); return; }
    createSave(mode, sanitized).then(function (ok) {
      if (ok) {
        window.FM24State.currentSaveName = sanitized;
        showToast('Saved "' + sanitized + '".', "success");
        updateSaveBar();
      } else {
        showToast("Save failed.", "error");
      }
    });
  }

  safeAddListener("save-modal-confirm", "click", function () {
    var input = document.getElementById("save-name-input");
    var modal = document.getElementById("save-modal");
    if (input && modal) {
      var val = input.value.trim();
      if (val) {
        modal.classList.add("hidden");
        doSave(val);
      } else {
        showToast("Enter a save name.", "warning");
      }
    }
  });

  safeAddListener("save-modal-cancel", "click", function () {
    var modal = document.getElementById("save-modal");
    if (modal) modal.classList.add("hidden");
  });

  // Enter key in save input triggers confirm
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var modal = document.getElementById("save-modal");
      if (modal && !modal.classList.contains("hidden")) {
        var input = document.getElementById("save-name-input");
        if (input && document.activeElement === input) {
          e.preventDefault();
          var confirmBtn = document.getElementById("save-modal-confirm");
          if (confirmBtn) confirmBtn.click();
        }
      }
    }
  });

  safeAddListener("load-modal-close", "click", function () {
    var modal = document.getElementById("load-modal");
    if (modal) modal.classList.remove("open");
  });

  // ─── CONTINUITY SCREEN ───

  safeAddListener("continuity-new-card", "click", startNewGame);

  safeAddListener("continuity-switch-mode", "click", function () {
    resetState();
    if (window.FM24DB) { window.FM24DB.setPref('fm24_mode', ''); } else { try { localStorage.removeItem("fm24_mode"); } catch (_) {} }
    window.FM24State.appMode = null;
    var contScreen = document.getElementById("continuity-screen");
    if (contScreen) contScreen.classList.add("hidden");
    var modeOverlay = document.getElementById("mode-overlay");
    if (modeOverlay) modeOverlay.classList.remove("hidden");
    document.getElementById("app-shell").classList.add("hidden");
    document.getElementById("app-sidebar").classList.add("hidden");
    updateSaveBar();
  });

  // ─── IMPORT OVERLAY ───

  safeAddListener("import-continue-btn", "click", function () {
    window.FM24State.manager.dofImportComplete = true;
    hideImportOverlay();
    window.FM24SwitchTab("dashboard");
    if (typeof renderDashboardView === "function") renderDashboardView();
  });

  // ─── SIDEBAR NAVIGATION ───

  document.querySelectorAll(".sidebar-nav-item").forEach(function (btn) {
    btn.addEventListener("click", function () {
      location.hash = '#' + btn.dataset.tab;
    });
  });

  // Keyboard shortcuts: Alt+1..7 for panel switching
  document.addEventListener("keydown", function (e) {
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      var tabMap = ["dashboard", "transfers", "tactic", "squad", "market", "wonderkid", "manager"];
      var idx = parseInt(e.key, 10);
      if (idx >= 1 && idx <= tabMap.length) {
        e.preventDefault();
        location.hash = '#' + tabMap[idx - 1];
      }
    }
  });

  safeAddListener("sidebar-btn-save", "click", function () {
    var mode = window.FM24State.appMode;
    if (!mode) return;
    var currentName = window.FM24State.currentSaveName;
    if (currentName) {
      createSave(mode, currentName).then(function (ok) {
        if (ok) showToast('Saved "' + currentName + '".', "success");
        else showToast("Save failed.", "error");
      });
      return;
    }
    var saveModal = document.getElementById("save-modal");
    var saveInput = document.getElementById("save-name-input");
    if (saveModal && saveInput) {
      saveInput.value = "";
      saveModal.classList.remove("hidden");
      setTimeout(function () { saveInput.focus(); }, 100);
    }
  });
  safeAddListener("sidebar-btn-load", "click", function () {
    if (!window.FM24State.appMode) return;
    renderLoadModal();
    var modal = document.getElementById("load-modal");
    if (modal) modal.classList.add("open");
  });
  safeAddListener("sidebar-btn-import", "click", function () {
    if (typeof showImportCenter === "function") showImportCenter();
  });
  safeAddListener("sidebar-btn-switch-mode", "click", exitMode);

  // ─── PROFILE MODAL CLOSE ───

  var closeBtn = document.getElementById("profile-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      var modal = document.getElementById("manager-profile-modal");
      if (modal) modal.classList.add("hidden");
    });
  }
  var profileModal = document.getElementById("manager-profile-modal");
  if (profileModal) {
    profileModal.addEventListener("click", function (e) {
      if (e.target === this) this.classList.add("hidden");
    });
  }

  // ─── THEME TOGGLE ───
  var themeBtn = document.getElementById("btn-theme-toggle");
  var savedTheme = null;
  // Try DB first, fallback to localStorage
  var db = window.FM24DB;
  if (db) {
    db.getPref('fm24-theme').then(function (val) {
      applyTheme(val || "dark");
    });
  } else {
    applyTheme(localStorage.getItem("fm24-theme") || "dark");
  }

  function applyTheme(theme) {
    var html = document.documentElement;
    if (theme === "light") {
      html.classList.remove("dark");
      if (themeBtn) themeBtn.textContent = "Theme: Light";
    } else {
      html.classList.add("dark");
      if (themeBtn) themeBtn.textContent = "Theme: Dark";
    }
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", function() {
      var html = document.documentElement;
      var newTheme = html.classList.contains("dark") ? "light" : "dark";
      if (newTheme === "light") {
        html.classList.remove("dark");
        themeBtn.textContent = "Theme: Light";
      } else {
        html.classList.add("dark");
        themeBtn.textContent = "Theme: Dark";
      }
      if (window.FM24DB) window.FM24DB.setPref('fm24-theme', newTheme);
      try { localStorage.setItem("fm24-theme", newTheme); } catch (_) {}
    });
  }

  // ─── ONBOARDING WIZARD ───
  var onboardingSlides = [
    {
      title: "Welcome to DoF Mode",
      html: '<div class="space-y-3">' +
            '  <p class="leading-relaxed"><strong>DoF Mode</strong> transforms your FM24 career into a realistic Director of Football experience.</p>' +
            '  <p class="leading-relaxed">Instead of direct manager control, you manage the budget, scout players, execute transfer targets, and handle incoming bids, while a hired Head Coach (Manager) handles tactics and lineup choices.</p>' +
            '  <div class="bg-blue-500/10 border border-blue-500/20 rounded p-3 text-[11px] text-blue-300 font-semibold">' +
            '    Goal: Balance Board Confidence (based on financial control and mandate success) with Manager Relationship (based on tactical fit and proposal approvals).' +
            '  </div>' +
            '</div>'
    },
    {
      title: "Step 1: Hiring a Manager",
      html: '<div class="space-y-3">' +
            '  <p class="leading-relaxed">First, you need staff details to hire a Manager whose tactical DNA matches your club philosophy.</p>' +
            '  <p class="font-bold text-white uppercase tracking-wider text-[10px]">How to export Staff from FM24:</p>' +
            '  <ol class="list-decimal pl-4 space-y-1 text-text-secondary">' +
            '    <li>Go to the <strong>Staff -> Staff Search</strong> (or Members) screen in FM24.</li>' +
            '    <li>Press <kbd class="px-1 py-0.5 bg-surface border border-border rounded text-white text-[9px]">Ctrl + A</kbd> to select all staff rows.</li>' +
            '    <li>Press <kbd class="px-1 py-0.5 bg-surface border border-border rounded text-white text-[9px]">Ctrl + P</kbd> to open the print dialog.</li>' +
            '    <li>Select <strong>Web Page</strong> and save as an HTML file.</li>' +
            '    <li>Upload that file in the start overlay.</li>' +
            '  </ol>' +
            '</div>'
    },
    {
      title: "Step 2: Evaluating the Squad",
      html: '<div class="space-y-3">' +
            '  <p class="leading-relaxed">Evaluating your current players reveals gaps between their attributes and your manager\'s system requirements.</p>' +
            '  <p class="font-bold text-white uppercase tracking-wider text-[10px]">How to export Squad from FM24:</p>' +
            '  <ol class="list-decimal pl-4 space-y-1 text-text-secondary">' +
            '    <li>Go to the <strong>Squad</strong> screen in FM24.</li>' +
            '    <li>Change view to a custom view containing all key attributes (or standard view).</li>' +
            '    <li>Press <kbd class="px-1 py-0.5 bg-surface border border-border rounded text-white text-[9px]">Ctrl + A</kbd> then <kbd class="px-1 py-0.5 bg-surface border border-border rounded text-white text-[9px]">Ctrl + P</kbd>.</li>' +
            '    <li>Select <strong>Web Page</strong> and save as squad HTML file.</li>' +
            '    <li>Upload in Step 2 to view Slot Quality and depth.</li>' +
            '  </ol>' +
            '</div>'
    },
    {
      title: "Step 3: Scouting the Market",
      html: '<div class="space-y-3">' +
            '  <p class="leading-relaxed">Search the market for players that fit the precise roles needed in your tactic.</p>' +
            '  <p class="font-bold text-white uppercase tracking-wider text-[10px]">How to export Market Search from FM24:</p>' +
            '  <ol class="list-decimal pl-4 space-y-1 text-text-secondary">' +
            '    <li>Go to <strong>Scouting -> Player Search</strong> in FM24.</li>' +
            '    <li>Customize view columns to display attributes, cost, and wages.</li>' +
            '    <li>Press <kbd class="px-1 py-0.5 bg-surface border border-border rounded text-white text-[9px]">Ctrl + A</kbd> then <kbd class="px-1 py-0.5 bg-surface border border-border rounded text-white text-[9px]">Ctrl + P</kbd> -> Web Page.</li>' +
            '    <li>Upload in Step 3 to rank targets by system fit.</li>' +
            '  </ol>' +
            '</div>'
    },
    {
      title: "Step 4: Intervening & Simulating",
      html: '<div class="space-y-3">' +
            '  <p class="leading-relaxed">Once you run simulation, the DoF window starts. You\'ll see an Intervention Panel:</p>' +
            '  <ul class="list-disc pl-4 space-y-1 text-text-secondary">' +
            '    <li><strong>Squad Actions:</strong> Manager proposals to sell or loan out surplus players.</li>' +
            '    <li><strong>Incoming Bids:</strong> Bids from rival clubs. Reject, accept, or negotiate them.</li>' +
            '    <li><strong>Recruitment:</strong> Board mandate alerts and budget checks.</li>' +
            '  </ul>' +
            '  <p class="font-bold text-white uppercase tracking-wider text-[10px]">Intervention Keyboard Shortcuts:</p>' +
            '  <div class="grid grid-cols-2 gap-2 text-[10px] text-text-muted mt-1">' +
            '    <div><kbd class="px-1 py-0.5 bg-surface border border-border rounded text-white text-[9px]">A</kbd> Approve row</div>' +
            '    <div><kbd class="px-1 py-0.5 bg-surface border border-border rounded text-white text-[9px]">B</kbd> Block row</div>' +
            '    <div><kbd class="px-1 py-0.5 bg-surface border border-border rounded text-white text-[9px]">R</kbd> Reject/Redirect</div>' +
            '    <div><kbd class="px-1 py-0.5 bg-surface border border-border rounded text-white text-[9px]">N</kbd> Highlight Next row</div>' +
            '    <div><kbd class="px-1 py-0.5 bg-surface border border-border rounded text-white text-[9px]">P</kbd> Highlight Prev row</div>' +
            '  </div>' +
            '</div>'
    }
  ];

  var currentSlideIndex = 0;
  var wizardModal = document.getElementById("onboarding-wizard");
  var slidesContainer = document.getElementById("onboarding-slides");
  var progressText = document.getElementById("onboarding-progress");
  var prevBtn = document.getElementById("onboarding-prev-btn");
  var nextBtn = document.getElementById("onboarding-next-btn");
  var helpBtn = document.getElementById("btn-onboarding-help");

  function showSlide(index) {
    if (index < 0 || index >= onboardingSlides.length) return;
    currentSlideIndex = index;
    var slide = onboardingSlides[index];
    
    // Inject content
    slidesContainer.innerHTML = '<div>' +
      '  <h4 class="text-sm font-bold text-white mb-2">' + slide.title + '</h4>' +
      '  <div>' + slide.html + '</div>' +
      '</div>';
      
    // Update progress text
    progressText.textContent = "Step " + (index + 1) + " of " + onboardingSlides.length;
    
    // Toggle button states
    prevBtn.disabled = index === 0;
    nextBtn.textContent = index === onboardingSlides.length - 1 ? "Finish" : "Next";
  }

  function openWizard() {
    if (wizardModal) {
      wizardModal.classList.remove("hidden");
      showSlide(0);
    }
  }

  function closeWizard() {
    if (wizardModal) {
      wizardModal.classList.add("hidden");
      if (window.FM24DB) window.FM24DB.setPref('fm24-onboarded', 'true');
      localStorage.setItem("fm24-onboarded", "true");
    }
  }

  if (helpBtn) {
    helpBtn.addEventListener("click", openWizard);
  }

  var onboardingCloseBtn = document.getElementById("onboarding-close-btn");
  if (onboardingCloseBtn) {
    onboardingCloseBtn.addEventListener("click", closeWizard);
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", function() {
      showSlide(currentSlideIndex - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", function() {
      if (currentSlideIndex === onboardingSlides.length - 1) {
        closeWizard();
      } else {
        showSlide(currentSlideIndex + 1);
      }
    });
  }

  // Trigger onboarding on first run
  function checkOnboarding() {
    var db = window.FM24DB;
    var check = db ? db.getPref('fm24-onboarded') : Promise.resolve(localStorage.getItem('fm24-onboarded'));
    check.then(function (val) {
      if (!val) {
        setTimeout(openWizard, 1000);
      }
    });
  }
  checkOnboarding();

  // ─── INITIAL MODE CHECK (async, waits for DB) ───
  function checkSavedMode() {
    var db = window.FM24DB;
    var modePromise = db ? db.getPref('fm24_mode') : Promise.resolve(localStorage.getItem('fm24_mode'));
    modePromise.then(function (savedMode) {
      if (savedMode === "normal" || savedMode === "dof") {
        enterMode(savedMode);
      } else {
        var overlay = document.getElementById("mode-overlay");
        if (overlay) overlay.classList.remove("hidden");
      }
    }).catch(function () {
      // If DB isn't ready yet, show the overlay and let the user click
      var overlay = document.getElementById("mode-overlay");
      if (overlay) overlay.classList.remove("hidden");
    });
  }
  checkSavedMode();

  // ─── GLOBAL ERROR HANDLERS ───

  window.addEventListener('error', function (e) {
    console.error('[Global Error]', e.error || e.message);
    if (typeof showToast === 'function') {
      showToast('Something went wrong. Your save is intact.', 'error');
    }
  });

  window.addEventListener('unhandledrejection', function (e) {
    console.error('[Unhandled Promise]', e.reason);
    if (typeof showToast === 'function') {
      showToast('An async operation failed.', 'error');
    }
  });
})();
