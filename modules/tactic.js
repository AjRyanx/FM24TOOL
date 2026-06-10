// ─── Strata Check Helper (handles both string and array strata) ───

function roleHasStrata(role, strata) {
  if (typeof role.strata === "string") return role.strata === strata;
  return role.strata.indexOf(strata) !== -1;
}

// ─── 24-Slot Global Grid ───

var GLOBAL_PITCH_SLOTS = {
  GK:  { strata: "GK", flank: "C", x: 340, y: 380 },
  DL:  { strata: "WD", flank: "L", x: 100, y: 310 },
  DCL: { strata: "DC", flank: "L", x: 220, y: 310 },
  DC:  { strata: "DC", flank: "C", x: 340, y: 310 },
  DCR: { strata: "DC", flank: "R", x: 460, y: 310 },
  DR:  { strata: "WD", flank: "R", x: 580, y: 310 },
  WBL: { strata: "WB", flank: "L", x: 75,  y: 240 },
  DMCL:{ strata: "DM", flank: "C", x: 200, y: 240 },
  DMC: { strata: "DM", flank: "C", x: 340, y: 240 },
  DMCR:{ strata: "DM", flank: "C", x: 480, y: 240 },
  WBR: { strata: "WB", flank: "R", x: 605, y: 240 },
  ML:  { strata: "WM", flank: "L", x: 110, y: 168 },
  MCL: { strata: "CM", flank: "L", x: 220, y: 168 },
  MC:  { strata: "CM", flank: "C", x: 340, y: 168 },
  MCR: { strata: "CM", flank: "R", x: 460, y: 168 },
  MR:  { strata: "WM", flank: "R", x: 570, y: 168 },
  AML: { strata: "WA", flank: "L", x: 130, y: 110 },
  AMCL:{ strata: "AMC", flank: "C", x: 240, y: 110 },
  AMC: { strata: "AMC", flank: "C", x: 340, y: 110 },
  AMCR:{ strata: "AMC", flank: "C", x: 440, y: 110 },
  AMR: { strata: "WA", flank: "R", x: 550, y: 110 },
  STCL:{ strata: "ST", flank: "C", x: 240, y: 55 },
  STC: { strata: "ST", flank: "C", x: 340, y: 55 },
  STCR:{ strata: "ST", flank: "C", x: 440, y: 55 }
};

function getSlotDef(slotId) {
  return GLOBAL_PITCH_SLOTS[slotId] || null;
}

// ─── Formation Presets (11-slot arrays) ───

var FORMATIONS = {
  "4-4-2": {
    slots: ["GK","DL","DCL","DCR","DR","ML","MCL","MCR","MR","STCL","STCR"],
    defaultRoles: {
      "GK": "GK_D", "DL": "FB_S", "DCL": "CD_D", "DCR": "CD_D", "DR": "FB_S",
      "ML": "WM_S", "MCL": "CM_S", "MCR": "CM_S", "MR": "WM_S",
      "STCL": "DLF_S", "STCR": "AF_A"
    }
  },
  "3-5-2": {
    slots: ["GK","DCL","DC","DCR","WBL","WBR","DMC","MCL","MCR","STCL","STCR"],
    defaultRoles: {
      "GK": "GK_D", "DCL": "CD_D", "DC": "CD_D", "DCR": "CD_D",
      "WBL": "WB_S", "WBR": "WB_S",
      "DMC": "DM_S", "MCL": "CM_S", "MCR": "CM_S",
      "STCL": "DLF_S", "STCR": "AF_A"
    }
  },
  "4-2-3-1": {
    slots: ["GK","DL","DCL","DCR","DR","DMCL","DMCR","AML","AMC","AMR","STC"],
    defaultRoles: {
      "GK": "GK_D", "DL": "FB_S", "DCL": "CD_D", "DCR": "CD_D", "DR": "FB_S",
      "DMCL": "DM_S", "DMCR": "DM_S",
      "AML": "Winger_A", "AMC": "AM_S", "AMR": "Winger_A",
      "STC": "AF_A"
    }
  },
  "5-3-2": {
    slots: ["GK","DCL","DC","DCR","WBL","WBR","DMC","MCL","MCR","STCL","STCR"],
    defaultRoles: {
      "GK": "GK_D", "DCL": "CD_D", "DC": "CD_D", "DCR": "CD_D",
      "WBL": "WB_S", "WBR": "WB_S",
      "DMC": "DM_S", "MCL": "CM_S", "MCR": "CM_S",
      "STCL": "DLF_S", "STCR": "AF_A"
    }
  },
  "4-1-4-1": {
    slots: ["GK","DL","DCL","DCR","DR","DMC","ML","MCL","MCR","MR","STC"],
    defaultRoles: {
      "GK": "GK_D", "DL": "FB_S", "DCL": "CD_D", "DCR": "CD_D", "DR": "FB_S",
      "DMC": "DM_S",
      "ML": "WM_S", "MCL": "CM_S", "MCR": "CM_S", "MR": "WM_S",
      "STC": "AF_A"
    }
  },
  "4-3-3 DM": {
    slots: ["GK","DL","DCL","DCR","DR","DMC","MCL","MCR","AML","AMR","STC"],
    defaultRoles: {
      "GK": "GK_D", "DL": "FB_S", "DCL": "CD_D", "DCR": "CD_D", "DR": "FB_S",
      "DMC": "DM_S", "MCL": "CM_S", "MCR": "CM_S",
      "AML": "Winger_A", "AMR": "Winger_A",
      "STC": "AF_A"
    }
  },
  "4-2-4 DM": {
    slots: ["GK","DL","DCL","DCR","DR","DMCL","DMCR","AML","AMR","STCL","STCR"],
    defaultRoles: {
      "GK": "GK_D", "DL": "FB_S", "DCL": "CD_D", "DCR": "CD_D", "DR": "FB_S",
      "DMCL": "DM_D", "DMCR": "DM_S",
      "AML": "Winger_A", "AMR": "Winger_A",
      "STCL": "AF_A", "STCR": "Poacher_A"
    }
  },
  "3-4-3": {
    slots: ["GK","DCL","DC","DCR","WBL","WBR","DMCL","DMCR","AML","AMR","STC"],
    defaultRoles: {
      "GK": "GK_D", "DCL": "CD_D", "DC": "CD_D", "DCR": "CD_D",
      "WBL": "WB_S", "WBR": "WB_S",
      "DMCL": "DM_D", "DMCR": "BWM_S",
      "AML": "Winger_A", "AMR": "Winger_A",
      "STC": "AF_A"
    }
  },
  "4-5-1": {
    slots: ["GK","DL","DCL","DCR","DR","DMC","MCL","MCR","ML","MR","STC"],
    defaultRoles: {
      "GK": "GK_D", "DL": "FB_D", "DCL": "CD_D", "DCR": "CD_D", "DR": "FB_D",
      "DMC": "Anchor_D",
      "MCL": "CM_D", "MCR": "CM_D",
      "ML": "WM_S", "MR": "WM_S",
      "STC": "TF_S"
    }
  },
  "4-3-2-1": {
    slots: ["GK","DL","DCL","DCR","DR","DMC","MCL","MCR","AMCL","AMCR","STC"],
    defaultRoles: {
      "GK": "GK_D", "DL": "FB_S", "DCL": "CD_D", "DCR": "CD_D", "DR": "FB_S",
      "DMC": "DM_D",
      "MCL": "CM_S", "MCR": "CM_S",
      "AMCL": "SS_A", "AMCR": "SS_A",
      "STC": "AF_A"
    }
  },
  "3-4-2-1": {
    slots: ["GK","DCL","DC","DCR","WBL","WBR","DMCL","DMCR","AMCL","AMCR","STC"],
    defaultRoles: {
      "GK": "GK_D", "DCL": "CD_D", "DC": "CD_D", "DCR": "CD_D",
      "WBL": "WB_S", "WBR": "WB_S",
      "DMCL": "DM_D", "DMCR": "DLP_S",
      "AMCL": "AM_S", "AMCR": "AM_S",
      "STC": "AF_A"
    }
  }
};

function getRoleGroupsForStrata(strata) {
  var roles = FM24_ROLES.filter(function (r) { return roleHasStrata(r, strata); });
  var groups = {};
  roles.forEach(function (r) {
    if (!groups[r.abbreviation]) {
      groups[r.abbreviation] = { abbreviation: r.abbreviation, name: r.name, duties: [] };
    }
    groups[r.abbreviation].duties.push(r.duty);
  });
  var result = [];
  Object.keys(groups).forEach(function (k) { result.push(groups[k]); });
  return result;
}

function getRoleId(abbreviation, duty, strata) {
  for (var i = 0; i < FM24_ROLES.length; i++) {
    var r = FM24_ROLES[i];
    if (r.abbreviation === abbreviation && r.duty === duty && roleHasStrata(r, strata)) return r.id;
  }
  return null;
}

function getRoleById(roleId) {
  for (var i = 0; i < FM24_ROLES.length; i++) {
    if (FM24_ROLES[i].id === roleId) return FM24_ROLES[i];
  }
  return null;
}

function setFormation(formationName) {
  var preset = FORMATIONS[formationName];
  if (!preset) return;
  window.FM24State.tactic.formation = formationName;
  window.FM24State.tactic.slots = {};
  preset.slots.forEach(function (slotId) {
    var defaultRoleId = preset.defaultRoles[slotId];
    if (defaultRoleId) {
      var role = getRoleById(defaultRoleId);
      window.FM24State.tactic.slots[slotId] = {
        roleId: defaultRoleId,
        duty: role ? role.duty : null,
        playerName: null
      };
    } else {
      window.FM24State.tactic.slots[slotId] = { roleId: null, duty: null, playerName: null };
    }
  });
  checkTacticComplete();
  persistTactic();
  window.dispatchEvent(new CustomEvent("fm24:formation-changed"));
}

var DEFAULT_ROLE_STRATA = {
  GK:  { abbreviation: "GK", duty: "Defend" },
  DC:  { abbreviation: "CD", duty: "Defend" },
  WD:  { abbreviation: "FB", duty: "Support" },
  WB:  { abbreviation: "WB", duty: "Support" },
  DM:  { abbreviation: "DM", duty: "Support" },
  CM:  { abbreviation: "CM", duty: "Support" },
  WM:  { abbreviation: "WM", duty: "Support" },
  WA:  { abbreviation: "W",  duty: "Support" },
  AMC: { abbreviation: "AM", duty: "Support" },
  ST:  { abbreviation: "AF", duty: "Attack" }
};

function moveSlotRole(oldSlotId, newSlotId) {
  var slot = window.FM24State.tactic.slots[oldSlotId];
  if (!slot) return;
  if (window.FM24State.tactic.slots[newSlotId]) return;

  var newDef = getSlotDef(newSlotId);
  var oldDef = getSlotDef(oldSlotId);
  var newRoleId = slot.roleId;
  var newDuty = slot.duty;

  // If strata differs, auto-assign default role for target strata
  if (slot.roleId && newDef && oldDef && oldDef.strata !== newDef.strata) {
    var dc = DEFAULT_ROLE_STRATA[newDef.strata];
    if (dc) {
      var rid = getRoleId(dc.abbreviation, dc.duty, newDef.strata);
      if (rid) { newRoleId = rid; newDuty = dc.duty; }
    }
  }

  delete window.FM24State.tactic.slots[oldSlotId];
  window.FM24State.tactic.slots[newSlotId] = { roleId: newRoleId, duty: newDuty, playerName: slot.playerName || null };
  checkTacticComplete();
  persistTactic();
  window.dispatchEvent(new CustomEvent("fm24:slot-moved"));
}

var _isDragging = false;
function getIsDragging() { return _isDragging; }
function setIsDragging(v) { _isDragging = v; }

function assignSlotRole(slotId, roleId, duty) {
  var roleEntry = getRoleById(roleId);
  if (!roleEntry) return;
  var slot = window.FM24State.tactic.slots[slotId];
  if (!slot) return;
  slot.roleId = roleId;
  slot.duty = duty;
  checkTacticComplete();
  persistTactic();
  window.dispatchEvent(new CustomEvent("fm24:slot-assigned"));
}

function clearPitchSlot(slotId) {
  var slot = window.FM24State.tactic.slots[slotId];
  if (slot) {
    slot.roleId = null;
    slot.duty = null;
    delete slot.playerName;
    checkTacticComplete();
    persistTactic();
    window.dispatchEvent(new CustomEvent("fm24:slot-cleared"));
  }
}

function checkTacticComplete() {
  var slots = window.FM24State.tactic.slots;
  var count = 0;
  Object.keys(slots).forEach(function (k) {
    if (slots[k].roleId) count++;
  });
  window.FM24State.tactic.isComplete = count === 11;
  if (count === 11) {
    window.dispatchEvent(new CustomEvent("fm24:tactic-complete"));
  }
}

function updateInstruction(key, value) {
  window.FM24State.tactic.instructions[key] = value;
  persistTactic();
  window.dispatchEvent(new CustomEvent("fm24:instructions-changed"));
}

function persistTactic() {
  try {
    localStorage.setItem("fm24_tactic", JSON.stringify(window.FM24State.tactic));
  } catch (_) {}
  saveActiveTactic();
}

function exportTacticJSON() {
  var json = JSON.stringify(window.FM24State.tactic, null, 2);
  var blob = new Blob([json], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "fm24_tactic.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importTacticJSON(jsonStr) {
  try {
    var data = JSON.parse(jsonStr);
    if (!data || !data.slots || !data.formation) {
      showToast("Invalid tactic JSON", "error");
      return false;
    }
    window.FM24State.tactic.formation = data.formation || null;
    window.FM24State.tactic.slots = data.slots || {};
    window.FM24State.tactic.instructions = data.instructions || {};
    window.FM24State.tactic.subs = data.subs || {};
    window.FM24State.tactic.isComplete = data.isComplete || false;
    persistTactic();
    window.dispatchEvent(new CustomEvent("fm24:tactic-imported"));
    showToast("Tactic loaded successfully", "success");
    return true;
  } catch (_) {
    showToast("Invalid tactic JSON", "error");
    return false;
  }
}

function assignPlayerToSlot(slotId, playerName) {
  var slot = window.FM24State.tactic.slots[slotId];
  if (!slot) return;
  if (playerName) {
    slot.playerName = playerName;
  } else {
    delete slot.playerName;
  }
  persistTactic();
  window.dispatchEvent(new CustomEvent("fm24:slot-assigned"));
}

// ─── Multi-Slot Tactic Management ───

function createDefaultTactic() {
  var formation = "4-3-3 DM";
  var formDef = FORMATIONS[formation];
  var slots = {};
  if (formDef) {
    formDef.slots.forEach(function (slotId) {
      var defaultRoleId = formDef.defaultRoles[slotId];
      if (defaultRoleId) {
        var role = getRoleById(defaultRoleId);
        slots[slotId] = {
          roleId: defaultRoleId,
          duty: role ? role.duty : null,
          playerName: null
        };
      } else {
        slots[slotId] = { roleId: null, duty: null, playerName: null };
      }
    });
  }
  return {
    formation: formDef ? formation : null,
    slots: slots,
    instructions: {},
    isComplete: formDef && formDef.slots.length > 0 && formDef.slots.every(function (sid) {
      return slots[sid] && slots[sid].roleId;
    }),
    subs: {}
  };
}

function initTacticSlots() {
  var ts = window.FM24State.tacticSlots;
  if (!ts) return;

  try {
    var raw = localStorage.getItem("fm24_tactic_slots");
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.slots && parsed.slots.length > 0) {
        // Migrate any legacy slot IDs in loaded tactics
        var slotMap = { DML: "DMCL", DMR: "DMCR", STL: "STCL", STR: "STCR" };
        parsed.slots.forEach(function (s) {
          if (s.tactic && s.tactic.slots) {
            var migrated = {};
            Object.keys(s.tactic.slots).forEach(function (k) {
              migrated[slotMap[k] || k] = s.tactic.slots[k];
            });
            s.tactic.slots = migrated;
          }
        });

        ts.slots = parsed.slots;
        ts.activeIndex = parsed.activeIndex || 0;
        while (ts.slots.length < 5) {
          ts.slots.push({ name: "Slot " + (ts.slots.length + 1), tactic: null });
        }
        // prevent activeIndex out of bounds after length fix
        if (ts.activeIndex >= ts.slots.length) ts.activeIndex = 0;
        var active = ts.slots[ts.activeIndex];
        if (active && active.tactic) {
          window.FM24State.tactic = JSON.parse(JSON.stringify(active.tactic));
          if (!window.FM24State.tactic.subs) window.FM24State.tactic.subs = {};
          return;
        }
      }
    }
  } catch (_) {}

  // Migration: old single-tactic key
  try {
    var oldRaw = localStorage.getItem("fm24_tactic");
    if (oldRaw) {
      var oldTactic = JSON.parse(oldRaw);
      var slotMap = { DML: "DMCL", DMR: "DMCR", STL: "STCL", STR: "STCR" };
      var migrated = {};
      Object.keys(oldTactic.slots || {}).forEach(function (k) {
        migrated[slotMap[k] || k] = oldTactic.slots[k];
      });
      oldTactic.slots = migrated;

      ts.slots = [{ name: "Slot 1", tactic: oldTactic }];
      for (var i = 2; i <= 5; i++) {
        ts.slots.push({ name: "Slot " + i, tactic: null });
      }
      ts.activeIndex = 0;
      window.FM24State.tactic = JSON.parse(JSON.stringify(oldTactic));
      if (!window.FM24State.tactic.subs) window.FM24State.tactic.subs = {};
      localStorage.removeItem("fm24_tactic");
      saveTacticSlots();
      return;
    }
  } catch (_) {}

  // Fresh start
  ts.slots = [];
  for (var i = 1; i <= 5; i++) {
    ts.slots.push({ name: "Slot " + i, tactic: null });
  }
  ts.activeIndex = 0;
  var d = createDefaultTactic();
  ts.slots[0].tactic = JSON.parse(JSON.stringify(d));
  window.FM24State.tactic = JSON.parse(JSON.stringify(d));
  saveTacticSlots();
}

function saveTacticSlots() {
  try {
    localStorage.setItem("fm24_tactic_slots", JSON.stringify(window.FM24State.tacticSlots));
  } catch (_) {}
}

function saveActiveTactic() {
  var ts = window.FM24State && window.FM24State.tacticSlots;
  if (!ts || !ts.slots || ts.slots.length === 0) return;
  var idx = ts.activeIndex;
  if (idx < 0 || idx >= ts.slots.length) return;
  ts.slots[idx].tactic = JSON.parse(JSON.stringify(window.FM24State.tactic));
  saveTacticSlots();
}

function loadSlot(index) {
  var ts = window.FM24State.tacticSlots;
  if (!ts || index < 0 || index >= ts.slots.length) return;
  saveActiveTactic();
  ts.activeIndex = index;
  var slot = ts.slots[index];
  if (slot && slot.tactic) {
    window.FM24State.tactic = JSON.parse(JSON.stringify(slot.tactic));
  } else {
    var d = createDefaultTactic();
    slot.tactic = JSON.parse(JSON.stringify(d));
    window.FM24State.tactic = JSON.parse(JSON.stringify(d));
  }
  saveTacticSlots();
  window.dispatchEvent(new CustomEvent("fm24:formation-changed"));
}

function renameSlot(index, newName) {
  var ts = window.FM24State.tacticSlots;
  if (!ts || index < 0 || index >= ts.slots.length) return;
  ts.slots[index].name = (newName || "").trim() || ("Slot " + (index + 1));
  saveTacticSlots();
}

function clearSlot(index) {
  var ts = window.FM24State.tacticSlots;
  if (!ts || index < 0 || index >= ts.slots.length) return;
  var d = createDefaultTactic();
  ts.slots[index].tactic = JSON.parse(JSON.stringify(d));
  ts.slots[index].name = "Slot " + (index + 1);
  if (ts.activeIndex === index) {
    window.FM24State.tactic = JSON.parse(JSON.stringify(d));
    saveActiveTactic();
    window.dispatchEvent(new CustomEvent("fm24:formation-changed"));
  } else {
    saveTacticSlots();
  }
}

function getSlotDisplay(slot) {
  if (!slot || !slot.roleId) return null;
  var role = getRoleById(slot.roleId);
  if (!role) return null;
  var dutyAbbr = "";
  if (role.duty === "Defend") dutyAbbr = "D";
  else if (role.duty === "Support") dutyAbbr = "S";
  else if (role.duty === "Attack") dutyAbbr = "A";
  else if (role.duty === "Stopper") dutyAbbr = "ST";
  else if (role.duty === "Cover") dutyAbbr = "CO";
  return { abbr: role.abbreviation, duty: dutyAbbr, full: role.abbreviation + "-" + dutyAbbr };
}
