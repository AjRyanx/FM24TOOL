# FM24 Tactical Suite — Codebase Guide

## Overview
Single-page web app (no framework, vanilla JS) for FM24 tactic building, squad depth analysis, market search, wonderkid scouting, and DOF-mode manager hiring + tactic generation. Uses localStorage for persistence.

---

## File Structure

```
fm24-tool/
├── index.html           — Main HTML shell (202 lines)
├── style.css            — All custom styles
├── CODEGUIDE.md         — This file
├── app.js               — Bootstrap, central state, mode mgmt, save/load UI, init (539 lines)
├── data/
│   ├── roles.js         — FM24_ROLES array (1023 lines)
│   ├── tactic-schema.js — TACTIC_SCHEMA for instruction UI (212 lines)
│   ├── instruction-weights.js — INSTRUCTION_WEIGHT_MODIFIERS (154 lines)
│   ├── manager-engine.js    — Manager philosophy derivation (2851 lines)
│   ├── cb-combos.js        — CB combination data
│   └── midfield-combos.js  — Midfield combination data
└── modules/
    ├── squad.js         — parseSquadHTML() (261 lines)
    ├── tactic.js        — Tactics engine, pitch slots, formations (471 lines)
    ├── market.js        — Market view, filtering, scoring (782 lines)
    ├── eval.js          — Player scoring engine (411 lines)
    ├── ui.js            — All rendering: depth, tactic builder, pitch (over 2000 lines)
    ├── tacticValidator.js — evaluateTacticFeasibility() (387 lines)
    ├── wonderkid.js     — Wonderkid scout (584 lines)
    ├── managerEval.js   — calculateManagerFit() (471 lines)
    ├── manager.js       — Manager module (1437 lines)
    ├── managerEvolution.js — Manager evolution engine (436 lines)
    ├── save.js          — Save/load engine (126 lines)
    └── wages.js         — Wage parsing helper
```

---

## Central State (`window.FM24State`)

Defined in `app.js:1-35`:

```js
window.FM24State = {
  appMode: null,                  // "normal" | "dof" | null
  currentSaveName: null,          // localStorage save name
  squad: [],                      // player objects from parseSquadHTML
  market: [],                     // market player objects
  shortlist: [],                  // shortlisted players
  tactic: {                       // current active tactic
    formation: null,              // e.g. "4-3-3"
    slots: {},                    // slotId → { roleId, duty, playerName }
    instructions: {},
    isComplete: false,
    subs: {}
  },
  filters: {},
  depthHidden: [],                // [{name, strata}] — hidden players per strata
  depthOverrides: {},             // {playerName: slotId} — manual slot assignments
  tacticSlots: { slots: [], activeIndex: 0 },  // 5 saved tactic slots
  tacticUI: {
    activeTab: 'pitch',          // "pitch" | "in_possession" | "in_transition" | "out_of_possession"
    renamingSlot: -1
  },
  depthUI: {                     // depth view state
    search: "",
    strata: "All",
    viewMode: "slots"            // "slots" | "strata"
  },
  marketUI: { /* market filters */ },
  wonderkidUI: { /* wonderkid filters */ },
  manager: {
    roster: [],                  // staff array from parseStaffHTML
    hired: null,                 // hired manager object
    mode: null,                  // "head_coach" | "full_manager"
    generatedTactic: null,
    report: null,
    gaps: [],
    recommendations: [],
    dofImportComplete: false,
    fitScores: {},
    fitScoresReady: false,
    fitScoresComputing: false,
    evolutionHistory: [],
    lastFitBaseline: {},
    evolutionLocked: false
  }
};
```

---

## App Initialization (`app.js`)

Script load order in `index.html:184-200`:
1. `data/roles.js` → FM24_ROLES
2. `data/tactic-schema.js` → TACTIC_SCHEMA
3. `data/instruction-weights.js` → INSTRUCTION_WEIGHT_MODIFIERS
4. `modules/squad.js` → parseSquadHTML()
5. `modules/tactic.js` → tactics engine
6. `modules/market.js` → market engine
7. `modules/eval.js` → scoring engine
8. `modules/ui.js` → all rendering
9. `modules/tacticValidator.js` → evaluateTacticFeasibility()
10. `modules/managerEvolution.js` → manager evolution engine
11. `modules/wonderkid.js` → wonderkid
12. `data/midfield-combos.js`
13. `data/cb-combos.js`
14. `data/manager-engine.js` → manager philosophy
15. `modules/managerEval.js` → calculateManagerFit()
16. `modules/manager.js` → manager UI
17. `modules/save.js` → save/load
18. `app.js` → bootstrap

The IIFE in `app.js:379-600`:
- Calls `initTacticSlots()` to load saved tactics
- Loads `depthHidden` and `depthOverrides` from localStorage
- Initializes `depthUI`, `marketUI`, `wonderkidUI`
- Sets up tab switching (`window.FM24SwitchTab`)
- Registers event listeners on custom events
- Checks for saved mode → enters it or shows mode overlay

---

## Tab Navigation

- 5 tabs: Tactic, Squad, Market, Wonderkid, Manager
- Manager tab = DOF-only (`data-mode="dof"`)
- Tab buttons in `index.html:98-113`
- Tab panels: `panel-tactic`, `panel-squad`, `panel-market`, `panel-wonderkid`, `panel-manager`
- `filterTabsByMode()` hides manager tab in normal mode
- `window.FM24SwitchTab()` → hides/shows panels, triggers `render*View()` calls

---

## Mode System

Two modes: **Normal** (tactic builder only) and **DOF** (includes manager hiring).

- Mode selection overlay (`#mode-overlay`) shown on first load
- `enterMode(mode)` in `app.js:101` → sets appMode, filters tabs, renders all
- DOF mode checks if squad + staff loaded → shows `#dof-import-overlay` or auto-navigates to manager tab
- `exitMode()` → saves, resets state, shows mode overlay

### DOF Import Overlay (`app.js:125-286`)

3 upload zones: Squad (*), Staff (*), Market (optional).
- `wireImportUpload(zoneId, targetKey)` → wires file input + drag-drop
- `markImportRowDone(zoneId, filename)` → shows checkmark, filename, [Change] button
- `resetImportZone(zoneId)` → clears state, re-wires upload
- `updateImportContinueBtn()` → enabled when squad + staff done
- Continue button closes overlay and switches to manager tab

---

## Tactic Builder (`modules/ui.js`, `modules/tactic.js`, `modules/eval.js`)

### Pitch Slots (`modules/tactic.js:10-35`)
`GLOBAL_PITCH_SLOTS` = 24 slots with strata + flank + x/y position.

### Formations (`modules/tactic.js:43-106`)
7 formation presets with default roles.

### Scoring Engine (`modules/eval.js`)
- `isFlankEligible(player, slotId)` — strata + flank gate
- `computeTacticWeights(roleId, instructions)` — role base × instruction modifiers
- `scorePlayerForRole(player, roleId, instructions)` → `{total, fitLabel, breakdown}`
- `scorePlayerForTacticSlot(player, slotId)` — flank-aware + foot bonus
- `findBestTacticFitForPlayer(player)` — finds best slot for each role
- Foot bonus: `getFootBonus(player, slotId, slotDef, roleId)` — checks strong foot vs expected foot

### Builder UI (`modules/ui.js:982+`)
Sidebar: mentality select + 3 phase cards + saved tactics slots.
Main content: pitch view (formation select + pitch SVG + roster table) or phase instruction panels.
`renderTacticBuilder()` → `_buildSidebar()` + `_buildMainContent()` → `renderPitch()` + `renderSummary()`

### Saved Tactic Slots (`modules/tactic.js:301+`)
5 slots: `createDefaultTactic()`, `loadSlot()`, `renameSlot()`, `clearSlot()`, `saveTacticSlots()`, `saveActiveTactic()`

---

## Squad Depth (`modules/ui.js:167-979`)

Two views toggled by `depthUI.viewMode`:

### Stratified View (`_renderDepthChart()`)
- Groups players by strata (GK, DC, WD, DM, CM, WM, AMC, WA, ST)
- Filters by search + strata buttons
- Shows per-strata average fit score
- Hide button (`−`) adds to `depthHidden` per strata
- Player count: `updateDepthPlayerCount()` shows visible/total

### Slot Coverage View (`_renderSlotCoverage()`)
- Calls `buildGlobalDepthAssignments(squad)` — 3-pass algorithm
- Assigns players to tactic slots (forces, fills core, overflow)
- Shows coverage status (`green=full`, `amber=partial`, `red=empty`)
- Each player has clickable slot badge to override assignment
- Slot picker dropdown for manual assignment

---

## Market Search (`modules/market.js`)

### Market View Rendering
Renders squad upload zone (if no squad), tactic requirement (if not complete), then search UI:
- Filters: slot select, min score, age range, nationality, AP max, wage max, strata, flank, shortlist-only
- Sort: best_score, age, wage, ap, name
- Pagination: `currentPage` + page size 25
- Results table shows score bars, fit badges, club, AP, wage

### Market Parser
- `parseMarketHTML()` — similar to parseSquadHTML but detects market export format

### Player Card
- `renderPlayerCard(player)` — modal showing attributes, scores, best roles
- `renderPlayerCardByName(name)` — looked up from squad/market

---

## Wonderkid Scout (`modules/wonderkid.js`)

### Key Concepts
- `PEAK_AGE` per strata
- `PERSONALITY_MULTIPLIERS` — personality affects PA projection
- `computeSquadBaseline()` — average CA of squad for gap calculation
- Computes "Gap" = projected PA - squad average at same strata threshold

### UI
- Filters: max/min age, min PA, min gap, nationality, AP, include unknown, show only tactic fits
- Sort: pa, age, ca, gap, name, ap
- Shows each player with age, CA, PA, personality, strata, gap, estimated value

---

## Manager Module (`modules/manager.js`)

### 4-Step Wizard

**Step 1 — Upload Staff** (`renderStaffUploadStep()`)
- Drag-drop zone for staff HTML export
- `parseStaffHTML(text, onProgress)` — parses FM24 staff export table
  - Marks eligible managers: Head Coach, Manager, Sporting Director, Technical Director
  - `filterEligibleManagers()` → filters + sorts by CA

**Step 2 — Hire** (`renderHireStep()`)
- Filter bar: search input, archetype dropdown, fit range, sort
- Table: name, age, job, CA, archetype, mentality, pressing, formation, fit score
- Rows clickable → `renderManagerProfile(manager)` modal
- Profile modal shows: fit score pillars, key attributes, style, Hire button
- Async fit computation: `computeFitScoresAsync(eligible, squad, callback)` — chunks of 3
- Filtering + sorting in-memory via `managerFilters` state
- Focus retention for search input after re-render

**Filter Events:** `updateFilters()` reads all filter controls, updates state, re-renders, restores focus

**Step 3 — Analyse** (`renderAnalyseStep()`)
- Mode selection: Head Coach or Full Manager
- Squad status + market status with [Change] buttons
- Market upload zone only shown in Full Manager mode
- Market status always visible (green checkmark with change button)
- Analyse button enabled when squad + mode + (not full_manager or market)

**Step 4 — Results** (`renderResultsStep()`)
- Fit Score (6 pillars with bars + insights)
- Tactical Feasibility Score (`evaluateTacticFeasibility()`)
- Manager Report (summary, rationale, squad strengths/gaps)
- Generated Tactic display (grouped by strata)
- Transfer Recommendations (Full Manager only, sorted by priority)
- Apply Tactic button → copies to tactic builder

### Re-upload Flow
- **[Change Staff]** / **[Change Squad]** / **[Change Market]** buttons create temp `<input type="file">`, process the file, update state, re-render
- `handleStaffUpload(file, targetKey)` → parses + dispatches `fm24:squad-loaded` or `fm24:market-loaded`

### Run Analysis (`runAnalysis()`)
1. `generateTacticFromManager(hired, squad)` — manager-engine
2. `generateManagerReport(hired, tactic, squad)` — text report
3. `generateTransferRecommendations(hired, gaps, market)` — transfer targets
4. `calculateManagerFit(hired, squad, tactic)` — fit score
5. Updates state, re-renders

---

## Manager Engine (`data/manager-engine.js` — 2851 lines)

### Key Functions

**Mentality Resolution** (`resolveMentality()`):
- Maps FM24 "Playing Mentality" → app mentality
- Fallback: Att attribute thresholds

**Formation Resolution** (`resolveFormation()`):
- Maps FM24 formation name → app formation via `FM_FORMATION_MAP`
- Fallback: scores each formation based on Att/TacKnw/Ada/Dis/Pressing

**Role Profiles** (`ROLE_PROFILES` — 2851 lines of role definitions):
- Each role has 4-dim vector: `{att, tec, dis, press}` (0-5 scale)
- Plus per-attribute archetype stat weights (e.g. "Pac" weight for different philosophies)
- `PLAYMAKER_DEMOTION` map for WP role strata enforcement
- `isMetaRole(roleId)` / `isAntiMetaRole(roleId)` — meta/anti-meta role classification
- `ROLE_BOOST` / `ROLE_SUPPRESSION` maps
- Philosophy scoring via role profile similarity

**Philosophy Derivation** (`deriveManagerPhilosophy()`):
- Scores manager against 5 philosophies using attribute profiles
- Returns best-matching archetype name

---

## Manager Evaluation (`modules/managerEval.js`)

### `calculateManagerFit(manager, squad, existingTactic)`
5 pillars (total 100):
| Pillar | Max | Description |
|--------|-----|-------------|
| Tactical Coverage | 25 | Formation family match + slot coverage |
| Style Capacity | 15 | Playing mentality + pressing + instruction alignment |
| Locker Room | 30 | Discipline, motivation, man management |
| Development | 15 | Youth coaching, judging ability/potential |
| Gap Severity (or Baseline) | 15 | Squad gaps vs. tactic needs |

- `classifySquadStrength(squad)` → {tier, avgCA, maxCA}
- `getBestPlayerScore(slotId, roleId, instructions)` → best fit score for slot
- Insights generated from low/high pillar scores

---

## Tactic Validator (`modules/tacticValidator.js`)

### `evaluateTacticFeasibility(tactic)`
3 categories (0-100% each):
| Category | Weight | What it checks |
|----------|--------|---------------|
| Role Compatibility | 35% | CB pairings, full-back/wing-back combos, DM/CM combos, striker partnerships |
| Tactical Balance | 35% | Attacking vs defensive role distribution, strata balance |
| Positional Coverage | 30% | Redundancy across formation structure |

Returns: `{overallScore, categories, positives[], warnings[]}`

---

## Manager Evolution System (`modules/managerEvolution.js`)

### Overview
Evaluates four pressure signals after transfer windows and squad re-imports.
If signals exceed thresholds, the manager's tactic, philosophy, or recruitment
recommendations drift in place. The player is notified via toast. All changes
are silent (no approval step).

### Key Entry Points
| Function | Purpose |
|----------|---------|
| `computeEvolutionSignal(state, manager, squad)` | Pure evaluation — returns `{changed, drifts, signals}`. Never mutates state (except auto-setting `evolutionLocked` from relationshipIndex). |
| `applyEvolution(result, state)` | Mutates tactic, philosophy, recommendations. Dispatches `fm24:tactic-imported`, shows toasts, logs to evolutionHistory. Always updates `lastFitBaseline`. |
| `buildPressureVector(state, manager, squad)` | Returns 4 signals: `squadPressure`, `growthPressure`, `relationshipDamper`, `boardPressure`. |
| `scoreSquadFitDelta(squad, tactic)` | Average fit score change vs `lastFitBaseline`. |
| `getEvolutionSummary(manager)` | Human-readable summary of the last evolution event. |
| `buildNewFitBaseline(squad, tactic)` | Builds `{playerName → fitScore}` map for current assignments. |

### Threshold Constants
| Constant | Value | Gate |
|----------|-------|------|
| `TACTIC_SQUAD` | 35 | Squad pressure to trigger tactic re-eval |
| `TACTIC_GROWTH` | 40 | Growth pressure to trigger tactic re-eval |
| `TACTIC_SCORE_GRACE` | 5 | New tactic can score this much lower and still apply |
| `TACTIC_MIN_SLOT_DIFF` | 3 | Minimum different slots for a tactic drift |
| `PHILOSOPHY` | 50 | Squad pressure to trigger philosophy drift |
| `PHILOSOPHY_BOARD` | 65 | Board pressure to force philosophy toward safe archetypes |

### Pressure Signals
- **Squad pressure**: `(mismatch_signings × 15) + (key_departures × 20)`, capped 100
- **Growth pressure**: `abs(avgFitDelta) × 4`, capped 100. Negative delta (decline) also generates pressure.
- **Relationship damper**: Multiplier (0.0–1.3) applied to squad + growth pressure. At relationshipIndex < 30, evolution is **locked**. At > 85, damper = 1.3 (more willing to drift).
- **Board pressure**: `NORMAL=0` / `SCRUTINY=30` / `PRESSURE=65` / `DISMISSAL_RISK=90`. At ≥ 65, philosophy biased toward conservative archetypes. At ≥ 90, tactic drift is suppressed entirely.

### Philosophy Families
Cross-family shifts are logged; same-family shifts are ignored:
`gegenpress` / `counter-press` → `high-intensity`
`tiki-taka` / `possession` → `possession`
`route one` / `counter` → `direct`
`low-block` / `park-the-bus` → `defensive`

### New ManagerState Fields
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `evolutionHistory` | `EvolutionLogEntry[]` | `[]` | Chronological log of every evolution event |
| `lastFitBaseline` | `{name → number}` | `{}` | Fit scores at last baseline capture |
| `evolutionLocked` | `boolean` | `false` | Auto-set when relationshipIndex < 30, reset at > 35 |

### Trigger Points
1. **End of `simulateTransferWindowV2()`** (`transferWindowV2.js:1321`) — after transfer result assembled
2. **After squad import in `handleStaffUpload()`** (`manager.js:4582`) — with 600ms setTimeout for UI settle
3. **After `runAnalysis()`** (`manager.js:4735`) — baseline init only, no evolution eval

### Load Order
managerEvolution.js loads between managerEval.js and manager.js in index.html.
Dependencies: eval.js, tactic.js, tacticValidator.js, manager-engine.js.

### Test Coverage
`scratch/test-evolution.js` — 5 test cases (squad pressure, relationship lock,
board suppression, growth pressure, threshold gate). Run with `node scratch/test-evolution.js`.

---

## Save/Load (`modules/save.js`)

- Prefix: `fm24_save_{mode}_`
- `serializeState()` → tactic, depthHidden, depthOverrides, shortlist, UI states, manager
- `deserializeState(data)` → restores all state properties
- `createSave(mode, name)` → localStorage.setItem
- `loadSave(mode, name)` → localStorage.getItem + deserialize + re-render
- `listSaves(mode)` → lists all saves for given mode
- `deleteSave(mode, name)` → removes from localStorage
- `resetState()` → clears FM24State (squad, market, shortlist, tactic, manager)

---

## Data Files

### `data/roles.js`
- `FM24_ROLES` array: each role has `{id, name, abbreviation, duty, strata(s), isPlaymaker, baseWeights, maxWeights?, description}`
- Strata can be string or array

### `data/tactic-schema.js`
- `TACTIC_SCHEMA` object: each instruction key → `{label, type, values, default}`
- Types: "enum" (dropdown), "toggle" (boolean)

### `data/instruction-weights.js`
- `INSTRUCTION_WEIGHT_MODIFIERS`: `{settingKey + ":" + value} → {attr: delta}`
- Applied to role base weights in `computeTacticWeights()`

### `data/cb-combos.js`
- CB pairing combination data (reference)

### `data/midfield-combos.js`
- Midfield combination guide (187 entries, reference)

---

## Custom Events

| Event | Trigger | Handlers |
|-------|---------|----------|
| `fm24:formation-changed` | setFormation, loadSlot | renderDepthView, renderMarket, renderWonderkid |
| `fm24:slot-assigned` | assignSlotRole | same |
| `fm24:slot-cleared` | clearPitchSlot | same |
| `fm24:slot-moved` | moveSlotRole | same |
| `fm24:tactic-imported` | importTacticJSON, applyGeneratedTactic | same |
| `fm24:squad-loaded` | upload complete | clearPlayerCache, reset fitScores, renderDepthView, renderWonderkid, renderManagerView |
| `fm24:market-loaded` | upload complete | clearPlayerCache, renderMarketView, renderWonderkid, renderManagerView |
| `fm24:tactic-complete` | all 11 slots filled | invalidateSquadFitCache, renderDepthView, renderWonderkid, renderMarketView |
| `fm24:instructions-changed` | updateInstruction | same + toast |

---

## Key Patterns

1. **Re-rendering**: Each `render*View()` function clears + rebuilds entire DOM section. Event listeners re-attached after render.
2. **Filter state preserved**: Filter inputs read from state, state updated on change, re-render restores values.
3. **Focus retention** (`manager.js:1183-1187`): After re-render, search input focus + cursor position are restored.
4. **Change/re-upload** (`manager.js` + `app.js:223-286`): Creates temp `<input type="file">` elements, processes upload, updates state, re-renders.
5. **Depth hidden**: Per-strata hide (`{name, strata}`), unique player count deduplicates by name across all strata.
6. **Manual slot overrides**: `depthOverrides[playerName] = slotId` forces assignment in coverage view.
7. **Async fit computation**: `computeFitScoresAsync()` processes in chunks of 3, shows "Computing…" indicator.

---

## File-by-File Function Index

### `app.js`
`filterTabsByMode`, `updateModeNav`, `updateSaveBar`, `renderAll`, `enterMode`, `showImportOverlay`, `hideImportOverlay`, `wireImportUpload`, `markImportRowDone`, `resetImportZone`, `updateImportContinueBtn`, `exitMode`, `updateManagerBadge`, `renderLoadModal`

### `modules/tactic.js`
`roleHasStrata`, `getSlotDef`, `getRoleGroupsForStrata`, `getRoleId`, `getRoleById`, `setFormation`, `moveSlotRole`, `assignSlotRole`, `clearPitchSlot`, `checkTacticComplete`, `updateInstruction`, `persistTactic`, `exportTacticJSON`, `importTacticJSON`, `assignPlayerToSlot`, `createDefaultTactic`, `initTacticSlots`, `saveTacticSlots`, `saveActiveTactic`, `loadSlot`, `renameSlot`, `clearSlot`, `getSlotDisplay`

### `modules/eval.js`
`getFootBonus`, `isFlankEligible`, `computeTacticWeights`, `scorePlayerForRole`, `scorePlayerForTacticSlot`, `rankPlayersForSlot`, `findBestTacticFitForPlayer`, `getTacticContextSummary`

### `modules/ui.js`
`showToast`, `buildUploadZone`, `renderDepthUpload`, `renderMarketUpload`, `renderDepthView`, `_renderDepthChart`, `updateDepthPlayerCount`, `_renderSlotCoverage`, `buildGlobalDepthAssignments`, `renderTacticBuilder`, `_buildSidebar`, `_buildMainContent`, `_buildPitchView`, `_renderRosterTable`, `renderSummary`, `renderPitch`, `renderPlayerCard`, `renderManagerProfile`, `updateNavBadge`, `renderWonderkidView`, `renderMarketView`

### `modules/manager.js`
`parseStaffHTML`, `filterEligibleManagers`, `generateManagerReport`, `deriveArchetype`, `generateTransferRecommendations`, `applyGeneratedTactic`, `renderManagerView`, `renderStaffUploadStep`, `renderManagerCard`, `computeFitScoresAsync`, `renderHireStep`, `renderAnalyseStep`, `renderResultsStep`, `renderManagerProfile`, `wireManagerRowClicks`, `wireAnalyseButton`, `wireResultsButtons`, `wireResetButton`, `handleStaffUpload`, `runAnalysis`

### `modules/managerEval.js`
`getFormationFamily`, `classifySquadStrength`, `calculateManagerFit`

### `modules/tacticValidator.js`
`evaluateTacticFeasibility`

### `modules/save.js`
`sanitizeName`, `saveKey`, `listSaves`, `saveExists`, `serializeState`, `deserializeState`, `createSave`, `loadSave`, `deleteSave`, `resetState`

### `data/manager-engine.js`
`normalizeAttr`, `isAntiMetaRole`, `isMetaRole`, `resolveMentality`, `resolveFormation`, `getFormationFamily`, `scoreSquadForFormationFamily`, `deriveManagerPhilosophy`, `generateTacticFromManager`

---

## Squad DNA & Philosophy Coherence (`modules/squadDNA.js`)

**Squad DNA Fingerprint** (`computeSquadDNA(squad)` → `SquadDNA`):
- Averages FM24 attributes into 6 designed axes: Dynamism, Technicity, Physicality, Intelligence, Defensive Solidity, Attacking Threat.
- Returns relative scores (0–1), a dominant/weakness axis, and a derived profile label.
- Cached in module-level `_dnaCache`. Invalidate with `invalidateDNACache()`.

**Manager DNA** (`computeManagerDNA(manager)` → `SquadDNA`):
- Parallel DNA profile for manager using staff attributes (Det, Ada, Amb, Tac Knw, Dis, Mot, Judge A/P, Mgm, Att).
- Same 6-axis structure; used only for coherence scoring, not badge rendering.

**Philosophy Coherence Score** (`computeCoherenceScore(dna, manager, tactic)` → `CoherenceResult`):
- Three sub-scores (~33% each):
  - sub1: manager philosophy vs tactic archetype (affinity table lookup)
  - sub2: tactic archetype vs squad DNA (requirements + penalties)
  - sub3: squad DNA vs manager DNA (axis delta average)
- Returns 0–100 integer, hex colour, one-line verdict, and weak-link identifier.

**Badge Rendering**:
- `renderDNABadge(dna, size, theme)` → SVG string. Morphing 6-lobe polygon badge. Three sizes: 80/140/200px.
- `renderCoherenceBadge(result, compact)` → HTML string. compact=true: score+label only; compact=false: full card with verdict and sub-scores.
- `renderAxisBreakdown(dna)` → HTML mini-bar chart of all 6 axis values.

**Surfaces**:
- Depth tab: compact badge (80px) + compact coherence (above depth chart)
- DoF dashboard: full badge (200px) + full coherence card (alongside board confidence)
- Manager profile: standard badge (140px) + full coherence + axis breakdown bars

**Invalidation**: Call `invalidateDNACache()` wherever `invalidateSquadFitCache()` is called. Both are triggered by `fm24:squad-loaded` and `fm24:tactic-complete` events.

**DNA Axis Colours** (fixed, not theme-variable):
- Dynamism: `#E8524A` | Technicity: `#4A90D9` | Physicality: `#7B5EA7`
- Intelligence: `#F5A623` | Defensive: `#2ECC71` | Attacking: `#F39C12`
