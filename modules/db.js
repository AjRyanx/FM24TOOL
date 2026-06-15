// ─── DEXIE DATABASE LAYER ───

var FM24Database = (function () {
  var DB = null;
  var DB_NAME = 'FM24TacticalSuite';
  var DB_VERSION = 1;

  function initialize() {
    if (typeof Dexie === 'undefined') {
      console.error('[FM24DB] Dexie not loaded.');
      return Promise.reject(new Error('Dexie not loaded'));
    }
    DB = new Dexie(DB_NAME);
    DB.version(DB_VERSION).stores({
      saves: 'saveName, mode, updatedAt',
      saveMeta: 'saveName, mode',
      squads: 'id, saveName',
      markets: 'id, saveName',
      appPrefs: 'key',
      tacticSlots: '++id'
    });
    return DB.open().then(function () {
      return migrateFromLocalStorage();
    });
  }

  // ─── One-time localStorage migration ───

  function migrateFromLocalStorage() {
    // Check if we already migrated
    return getPref('_migrated').then(function (migrated) {
      if (migrated) return;
      // Look for fm24_save_* keys in localStorage
      var migratedAny = false;
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf('fm24_save_') === 0) {
          var parts = key.split('_');
          if (parts.length >= 3) {
            // key format: fm24_save_{mode}_{name}
            var mode = parts[2];
            var name = parts.slice(3).join('_');
            try {
              var raw = localStorage.getItem(key);
              if (raw) {
                var data = JSON.parse(raw);
                // Save to Dexie
                saveGameRaw(name, mode, data, [], []);
                // Also migrate metadata
                var metaKey = 'fm24_meta_' + mode + '_' + name;
                var metaRaw = localStorage.getItem(metaKey);
                if (metaRaw) {
                  var metaData = JSON.parse(metaRaw);
                  DB.saveMeta.put({
                    saveName: name,
                    mode: mode,
                    clubName: metaData.clubName || '',
                    managerName: metaData.managerName || null,
                    managerArchetype: metaData.managerArchetype || null,
                    transferArchetype: metaData.transferArchetype || null,
                    formation: metaData.formation || null,
                    playerCount: metaData.playerCount || 0,
                    marketCount: metaData.marketCount || 0,
                    boardConfidence: metaData.boardConfidence || null,
                    boardStage: metaData.boardStage || null,
                    windowCount: metaData.windowCount || 0,
                    contractDispute: metaData.contractDispute || false,
                    createdAt: metaData.createdAt || Date.now(),
                    updatedAt: metaData.updatedAt || Date.now()
                  });
                }
                migratedAny = true;
              }
            } catch (_) {}
          }
        }
      }
      // Also migrate preferences
      var prefKeys = ['fm24_mode', 'fm24-theme', 'fm24-onboarded', 'fm24_depth_hidden', 'fm24_depth_overrides', 'fm24_tactic_slots'];
      prefKeys.forEach(function (pk) {
        try {
          var val = localStorage.getItem(pk);
          if (val !== null) {
            DB.appPrefs.put({ key: pk, value: val });
          }
        } catch (_) {}
      });
      if (migratedAny) {
        console.log('[FM24DB] Migrated saves from localStorage.');
      }
      return setPref('_migrated', 'true');
    });
  }

  // ─── Internal: save raw state to Dexie ───

  function saveGameRaw(name, mode, data, squad, market) {
    return DB.transaction('rw', [DB.saves, DB.squads, DB.markets, DB.saveMeta], function () {
      DB.saves.put({
        saveName: name,
        mode: mode,
        data: data,
        updatedAt: Date.now()
      });
      // Persist squad data
      DB.squads.put({
        id: name + '_squad',
        saveName: name,
        players: squad
      });
      // Persist market data
      DB.markets.put({
        id: name + '_market',
        saveName: name,
        players: market
      });
    });
  }

  // ─── Public API ───

  function saveGame(name, mode, serializedState, squad, market) {
    console.log('[FM24DB] Saving game:', name, mode);
    // Build metadata
    var s = window.FM24State;
    var clubName = '';
    if (squad && squad.length > 0) {
      var counts = {};
      var maxCount = 0;
      squad.forEach(function (p) {
        var club = p.Club || '';
        if (!club) return;
        counts[club] = (counts[club] || 0) + 1;
        if (counts[club] > maxCount) {
          maxCount = counts[club];
          clubName = club;
        }
      });
    }
    var managerName = s.manager && s.manager.hired ? s.manager.hired.Name : null;
    return DB.transaction('rw', [DB.saves, DB.squads, DB.markets, DB.saveMeta], function () {
      DB.saves.put({
        saveName: name,
        mode: mode,
        data: serializedState,
        updatedAt: Date.now()
      });
      var squadId = name + '_squad';
      DB.squads.put({
        id: squadId,
        saveName: name,
        players: squad
      });
      var marketId = name + '_market';
      DB.markets.put({
        id: marketId,
        saveName: name,
        players: market
      });
      // Always save squad and market IDs in saveMeta for reference
      DB.saveMeta.put({
        saveName: name,
        mode: mode,
        clubName: clubName,
        managerName: managerName,
        managerArchetype: s.manager && s.manager.hired && typeof deriveArchetype === 'function' ? deriveArchetype(s.manager.hired) : null,
        transferArchetype: s.manager && s.manager.hired && typeof resolveTransferArchetype === 'function' ? resolveTransferArchetype(s.manager.hired) : null,
        formation: s.tactic ? s.tactic.formation : null,
        playerCount: squad ? squad.length : 0,
        marketCount: market ? market.length : 0,
        boardConfidence: s.board ? s.board.confidence : null,
        boardStage: s.board ? s.board.stage : null,
        windowCount: s.manager ? s.manager.windowCount || 0 : 0,
        contractDispute: s.manager ? s.manager.contractDispute || false : false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    });
  }

  function loadGame(name, mode) {
    console.log('[FM24DB] Loading game:', name, mode);
    return DB.transaction('r', [DB.saves, DB.squads, DB.markets], function () {
      return Promise.all([
        DB.saves.get({ saveName: name, mode: mode }),
        DB.squads.get({ id: name + '_squad' }),
        DB.markets.get({ id: name + '_market' })
      ]);
    }).then(function (results) {
      var saveRecord = results[0];
      var squadRecord = results[1];
      var marketRecord = results[2];
      if (!saveRecord) return null;
      return {
        data: saveRecord.data,
        squad: squadRecord ? squadRecord.players : [],
        market: marketRecord ? marketRecord.players : []
      };
    });
  }

  function deleteSave(name, mode) {
    console.log('[FM24DB] Deleting save:', name, mode);
    return DB.transaction('rw', [DB.saves, DB.squads, DB.markets, DB.saveMeta], function () {
      DB.saves.where({ saveName: name, mode: mode }).delete();
      DB.saveMeta.where({ saveName: name, mode: mode }).delete();
      DB.squads.delete(name + '_squad');
      DB.markets.delete(name + '_market');
    });
  }

  function listSaves(mode) {
    return DB.saves
      .where('mode')
      .equals(mode)
      .sortBy('updatedAt')
      .then(function (records) {
        return records.map(function (r) { return r.saveName; }).reverse();
      });
  }

  function listSavesWithMetadata(mode) {
    return DB.saveMeta
      .where('mode')
      .equals(mode)
      .toArray()
      .then(function (metas) {
        // Sort by updatedAt descending
        metas.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
        return metas.map(function (m) {
          return {
            name: m.saveName,
            clubName: m.clubName || '',
            managerName: m.managerName || null,
            managerArchetype: m.managerArchetype || null,
            transferArchetype: m.transferArchetype || null,
            formation: m.formation || null,
            playerCount: m.playerCount || 0,
            marketCount: m.marketCount || 0,
            boardConfidence: m.boardConfidence || null,
            boardStage: m.boardStage || null,
            contractDispute: m.contractDispute || false,
            windowCount: m.windowCount || 0,
            createdAt: m.createdAt || null,
            updatedAt: m.updatedAt || null
          };
        });
      });
  }

  function saveExists(name, mode) {
    return DB.saves.get({ saveName: name, mode: mode }).then(function (record) {
      return !!record;
    });
  }

  // ─── Preferences ───

  function getPref(key) {
    if (!DB) {
      try { return Promise.resolve(localStorage.getItem(key)); } catch (e) {}
      return Promise.resolve(null);
    }
    return DB.appPrefs.get(key).then(function (record) {
      return record ? record.value : null;
    });
  }

  function setPref(key, value) {
    if (!DB) {
      try { localStorage.setItem(key, value); } catch (e) {}
      return Promise.resolve();
    }
    return DB.appPrefs.put({ key: key, value: value });
  }

  function deletePref(key) {
    if (!DB) {
      try { localStorage.removeItem(key); } catch (e) {}
      return Promise.resolve();
    }
    return DB.appPrefs.delete(key);
  }

  // ─── Tactic Slots ───

  function saveTacticSlots(slots) {
    // Clear existing, then insert all
    return DB.tacticSlots.clear().then(function () {
      if (!slots || !slots.length) return;
      return DB.tacticSlots.bulkAdd(slots.map(function (slot) {
        return { name: slot.name, tactic: JSON.parse(JSON.stringify(slot.tactic)) };
      }));
    });
  }

  function loadTacticSlots() {
    return DB.tacticSlots.toArray().then(function (records) {
      return records.map(function (r) {
        return { name: r.name, tactic: r.tactic };
      });
    });
  }

  // ─── Export Helpers ───

  function exportSaveToJSON(name, mode) {
    return loadGame(name, mode).then(function (result) {
      if (!result) return null;
      return JSON.stringify({
        exportVersion: 1,
        exportedAt: Date.now(),
        mode: mode,
        saveName: name,
        state: result.data,
        squad: result.squad,
        market: result.market
      }, null, 2);
    });
  }

  function importSaveFromJSON(jsonString) {
    try {
      var pkg = JSON.parse(jsonString);
      if (!pkg || !pkg.exportVersion || !pkg.saveName || !pkg.state) return false;
      var name = pkg.saveName;
      var mode = pkg.mode || 'normal';
      return saveGameRaw(name, mode, pkg.state, pkg.squad || [], pkg.market || []).then(function () {
        return { name: name, mode: mode };
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  // ─── Cleanup ───

  function close() {
    if (DB) {
      DB.close();
      DB = null;
    }
  }

  return {
    initialize: initialize,
    migrateFromLocalStorage: migrateFromLocalStorage,
    saveGame: saveGame,
    loadGame: loadGame,
    deleteSave: deleteSave,
    listSaves: listSaves,
    listSavesWithMetadata: listSavesWithMetadata,
    saveExists: saveExists,
    getPref: getPref,
    setPref: setPref,
    deletePref: deletePref,
    saveTacticSlots: saveTacticSlots,
    loadTacticSlots: loadTacticSlots,
    exportSaveToJSON: exportSaveToJSON,
    importSaveFromJSON: importSaveFromJSON,
    close: close
  };
})();

if (typeof window !== 'undefined') {
  window.FM24DB = FM24Database;
}

// Auto-initialize the database
FM24Database.initialize().catch(function (err) {
  console.error('[FM24DB] Initialization failed, falling back to localStorage:', err.message);
});
