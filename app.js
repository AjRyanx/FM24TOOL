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
    generatedTactic: null,
    report: null,
    gaps: [],
    recommendations: [],
    dofImportComplete: false,
    fitScores: {},
    fitScoresReady: false,
    fitScoresComputing: false
  }
};

function saveDepthHidden() {
  try { localStorage.setItem("fm24_depth_hidden", JSON.stringify(window.FM24State.depthHidden)); } catch (_) {}
}

function saveDepthOverrides() {
  try { localStorage.setItem("fm24_depth_overrides", JSON.stringify(window.FM24State.depthOverrides)); } catch (_) {}
}

// ─── MODE MANAGEMENT ───

function filterTabsByMode(mode) {
  var tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(function (btn) {
    var btnMode = btn.getAttribute("data-mode");
    if (btnMode === "all") {
      btn.style.display = "";
    } else if (btnMode === "dof") {
      btn.style.display = mode === "dof" ? "" : "none";
    }
  });
}

function updateModeNav() {
  var navMode = document.getElementById("nav-mode");
  var label = document.getElementById("mode-label");
  if (!navMode || !label) return;
  var mode = window.FM24State.appMode;
  if (mode) {
    navMode.style.display = "flex";
    label.textContent = mode === "dof" ? "DOF" : "Normal";
  } else {
    navMode.style.display = "none";
  }
}

function updateSaveBar() {
  var bar = document.getElementById("save-bar");
  var display = document.getElementById("save-name-display");
  if (!bar || !display) return;
  if (window.FM24State.appMode) {
    bar.classList.remove("hidden");
    var name = window.FM24State.currentSaveName;
    display.innerHTML = name
      ? 'Save: <span style="color:#CCCCCC">' + name.replace(/</g, "&lt;") + "</span>"
      : "Unsaved";
  } else {
    bar.classList.add("hidden");
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
  }
  updateModeNav();
  updateSaveBar();
  updateNavBadge();
}

function enterMode(mode) {
  window.FM24State.appMode = mode;
  try { localStorage.setItem("fm24_mode", mode); } catch (_) {}
  document.getElementById("mode-overlay").classList.add("hidden");
  filterTabsByMode(mode);
  renderAll();
  if (mode === "dof") {
    var s = window.FM24State;
    var needsImport = !s.squad.length || !s.manager.roster.length;
    if (!s.manager.dofImportComplete && needsImport) {
      showImportOverlay();
    } else {
      hideImportOverlay();
      window.FM24SwitchTab("manager");
    }
  }
  if (mode === "normal") {
    var activeTab = document.querySelector(".tab-btn.active-tab");
    if (activeTab && activeTab.getAttribute("data-tab") === "manager") {
      window.FM24SwitchTab("tactic");
    }
  }
}

function showImportOverlay() {
  var overlay = document.getElementById("dof-import-overlay");
  overlay.classList.remove("hidden", "fade-out");
  // Re-wire upload handlers each time overlay is shown
  wireImportUpload("import-squad-zone", "squad");
  wireImportUpload("import-staff-zone", "staff");
  wireImportUpload("import-market-zone", "market");
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

  var targetKey = zoneId === "import-squad-zone" ? "squad" :
                  zoneId === "import-staff-zone" ? "staff" :
                  zoneId === "import-market-zone" ? "market" : null;

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
  updateModeNav();
  updateSaveBar();
}

// ─── MANAGER BADGE ───

function updateManagerBadge() {
  var badge = document.getElementById("manager-badge");
  if (!badge) return;
  if (window.FM24State.appMode !== "dof") {
    badge.textContent = "";
    return;
  }
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

// ─── SAVE/LOAD UI ───

function renderLoadModal() {
  var listEl = document.getElementById("load-list");
  if (!listEl) return;
  var mode = window.FM24State.appMode;
  if (!mode) return;
  var saves = listSaves(mode);
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
      if (!loadSave(mode, name)) { showToast("Failed to load save.", "error"); return; }
      window.FM24State.currentSaveName = name;
      document.getElementById("load-modal").classList.remove("open");
      showToast("Save loaded. Upload squad &amp; market HTML to continue.", "info");
      renderAll();
    });
    actions.appendChild(loadBtn);
    var delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "Del";
    delBtn.addEventListener("click", function () {
      deleteSave(mode, name);
      renderLoadModal();
    });
    actions.appendChild(delBtn);
    item.appendChild(actions);
    listEl.appendChild(item);
  });
}

// ─── INIT ───

(function () {
  initTacticSlots();

  try {
    var dh = localStorage.getItem("fm24_depth_hidden");
    if (dh) window.FM24State.depthHidden = JSON.parse(dh);
  } catch (_) {}

  try {
    var dor = localStorage.getItem("fm24_depth_overrides");
    if (dor) window.FM24State.depthOverrides = JSON.parse(dor);
  } catch (_) {}

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

  var tabs = document.querySelectorAll(".tab-btn");
  var panels = {
    tactic: document.getElementById("panel-tactic"),
    squad: document.getElementById("panel-squad"),
    market: document.getElementById("panel-market"),
    wonderkid: document.getElementById("panel-wonderkid"),
    manager: document.getElementById("panel-manager")
  };

  function switchTab(tabId) {
    if (window.FM24State.appMode === "normal" && tabId === "manager") {
      tabId = "tactic";
    }
    tabs.forEach(function (btn) {
      btn.classList.toggle("active-tab", btn.dataset.tab === tabId);
    });
    Object.keys(panels).forEach(function (id) {
      panels[id].classList.toggle("active", id === tabId);
    });

    if (tabId === "tactic") renderTacticBuilder();
    if (tabId === "market") renderMarketView();
    if (tabId === "squad") renderDepthView();
    if (tabId === "wonderkid") renderWonderkidView();
    if (tabId === "manager") renderManagerView();
  }

  tabs.forEach(function (btn) {
    btn.addEventListener("click", function () {
      switchTab(btn.dataset.tab);
    });
  });

  window.FM24SwitchTab = switchTab;

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
    // Reset manager fit scores on squad change
    window.FM24State.manager.fitScores = {};
    window.FM24State.manager.fitScoresReady = false;
    window.FM24State.manager.fitScoresComputing = false;
    renderDepthView();
    renderWonderkidView();
    if (window.FM24State.appMode === "dof") renderManagerView();
  });

  window.addEventListener("fm24:market-loaded", function () {
    clearPlayerCache();
    renderMarketView();
    renderWonderkidView();
    if (window.FM24State.appMode === "dof") renderManagerView();
  });

  var invalidateAll = function () { invalidateSquadFitCache(); renderDepthView(); renderWonderkidView(); };
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

  // ─── MODE SELECTION ───

  document.getElementById("mode-normal").addEventListener("click", function () { enterMode("normal"); });
  document.getElementById("mode-dof").addEventListener("click", function () { enterMode("dof"); });

  // ─── SAVE/LOAD BUTTONS ───

  document.getElementById("btn-new-game").addEventListener("click", function () {
    if (!confirm("Start a new game? All unsaved data will be lost.")) return;
    resetState();
    showToast("New game started.", "info");
    renderAll();
  });

  document.getElementById("btn-save").addEventListener("click", function () {
    var mode = window.FM24State.appMode;
    if (!mode) return;
    var currentName = window.FM24State.currentSaveName;
    if (currentName) {
      if (createSave(mode, currentName)) {
        showToast('Saved "' + currentName + '".', "success");
      } else {
        showToast("Save failed (localStorage may be full).", "error");
      }
      return;
    }
    var name = prompt("Save name:");
    if (!name || !name.trim()) return;
    var sanitized = sanitizeName(name);
    if (!sanitized) { showToast("Invalid save name.", "error"); return; }
    if (createSave(mode, sanitized)) {
      window.FM24State.currentSaveName = sanitized;
      showToast('Saved "' + sanitized + '".', "success");
      updateSaveBar();
    } else {
      showToast("Save failed (localStorage may be full).", "error");
    }
  });

  document.getElementById("btn-load").addEventListener("click", function () {
    if (!window.FM24State.appMode) return;
    renderLoadModal();
    document.getElementById("load-modal").classList.add("open");
  });

  document.getElementById("load-modal-close").addEventListener("click", function () {
    document.getElementById("load-modal").classList.remove("open");
  });

  document.getElementById("btn-switch-mode").addEventListener("click", exitMode);

  // ─── IMPORT OVERLAY ───

  document.getElementById("import-continue-btn").addEventListener("click", function () {
    window.FM24State.manager.dofImportComplete = true;
    hideImportOverlay();
    window.FM24SwitchTab("manager");
    renderManagerView();
  });

  // ─── PROFILE MODAL CLOSE ───

  document.getElementById("profile-close-btn").addEventListener("click", function () {
    document.getElementById("manager-profile-modal").classList.add("hidden");
  });
  document.getElementById("manager-profile-modal").addEventListener("click", function (e) {
    if (e.target === this) this.classList.add("hidden");
  });

  // ─── INITIAL MODE CHECK ───

  var savedMode = null;
  try { savedMode = localStorage.getItem("fm24_mode"); } catch (_) {}
  if (savedMode === "normal" || savedMode === "dof") {
    enterMode(savedMode);
  } else {
    document.getElementById("mode-overlay").classList.remove("hidden");
  }
})();
