// ─── SQUAD DNA FINGERPRINT & PHILOSOPHY COHERENCE SCORE ───
// Dependencies: eval.js, archetypeScorer.js (via globals)
// Loads after archetypeScorer.js, before ui.js

(function (global) {
  "use strict";

// ─── Constants ───────────────────────────────────────────────

var DNA_AXES = {
  dynamism:    { label: 'DYN',  attributes: ['Acc','Pac','Sta','Wor','Agi'], colour: '#E8524A' },
  technicity:  { label: 'TEC',  attributes: ['Tec','Dri','Fir','Pas'],       colour: '#4A90D9' },
  physicality: { label: 'PHY',  attributes: ['Str','Jum','Bra','Bal'],       colour: '#7B5EA7' },
  intelligence:{ label: 'INT',  attributes: ['Dec','Vis','Cmp','Ant','Cnt'], colour: '#F5A623' },
  defensive:   { label: 'DEF',  attributes: ['Mar','Tck','Pos','Agg'],       colour: '#2ECC71' },
  attacking:   { label: 'ATT',  attributes: ['Fin','OtB','Lon','Hea'],       colour: '#F39C12' }
};

var DNA_AXIS_ORDER = ['dynamism','attacking','physicality','defensive','intelligence','technicity'];

var PHILOSOPHY_ARCHETYPE_AFFINITY = {
  'aggressive high-press tactician': {
    'aggressive high-press tactician': 1.00,
    'direct counter-attacker': 0.70,
    'wide-oriented direct play': 0.55,
    'balanced tactician': 0.50,
    'pragmatic system-adapter': 0.40,
    'possession-oriented tactician': 0.30,
    'positional play specialist': 0.25,
    'disciplined defensive organiser': 0.15
  },
  'possession-oriented tactician': {
    'possession-oriented tactician': 1.00,
    'positional play specialist': 0.85,
    'balanced tactician': 0.50,
    'pragmatic system-adapter': 0.45,
    'aggressive high-press tactician': 0.40,
    'direct counter-attacker': 0.20,
    'disciplined defensive organiser': 0.15,
    'wide-oriented direct play': 0.15
  },
  'positional play specialist': {
    'positional play specialist': 1.00,
    'possession-oriented tactician': 0.85,
    'balanced tactician': 0.50,
    'pragmatic system-adapter': 0.45,
    'aggressive high-press tactician': 0.35,
    'direct counter-attacker': 0.15,
    'disciplined defensive organiser': 0.15,
    'wide-oriented direct play': 0.20
  },
  'direct counter-attacker': {
    'direct counter-attacker': 1.00,
    'wide-oriented direct play': 0.75,
    'aggressive high-press tactician': 0.65,
    'disciplined defensive organiser': 0.55,
    'balanced tactician': 0.50,
    'pragmatic system-adapter': 0.45,
    'possession-oriented tactician': 0.20,
    'positional play specialist': 0.15
  },
  'wide-oriented direct play': {
    'wide-oriented direct play': 1.00,
    'direct counter-attacker': 0.80,
    'aggressive high-press tactician': 0.55,
    'balanced tactician': 0.50,
    'pragmatic system-adapter': 0.45,
    'disciplined defensive organiser': 0.35,
    'possession-oriented tactician': 0.15,
    'positional play specialist': 0.15
  },
  'disciplined defensive organiser': {
    'disciplined defensive organiser': 1.00,
    'direct counter-attacker': 0.75,
    'pragmatic system-adapter': 0.50,
    'balanced tactician': 0.50,
    'wide-oriented direct play': 0.35,
    'possession-oriented tactician': 0.20,
    'positional play specialist': 0.20,
    'aggressive high-press tactician': 0.15
  },
  'balanced tactician': {
    'aggressive high-press tactician': 0.70,
    'possession-oriented tactician': 0.70,
    'positional play specialist': 0.70,
    'direct counter-attacker': 0.70,
    'wide-oriented direct play': 0.70,
    'disciplined defensive organiser': 0.70,
    'balanced tactician': 0.70,
    'pragmatic system-adapter': 0.70
  },
  'pragmatic system-adapter': {
    'aggressive high-press tactician': 0.65,
    'possession-oriented tactician': 0.65,
    'positional play specialist': 0.65,
    'direct counter-attacker': 0.65,
    'wide-oriented direct play': 0.65,
    'disciplined defensive organiser': 0.65,
    'balanced tactician': 0.65,
    'pragmatic system-adapter': 0.65
  }
};

var ARCHETYPE_DNA_REQUIREMENTS = {
  'aggressive high-press tactician': {
    requires: { dynamism: 0.65, attacking: 0.60 },
    penalises: { dynamism: { below: 0.55, penalty: 0.5 } }
  },
  'possession-oriented tactician': {
    requires: { technicity: 0.65, intelligence: 0.60 },
    penalises: { technicity: { below: 0.55, penalty: 0.5 } }
  },
  'positional play specialist': {
    requires: { technicity: 0.70, intelligence: 0.65 },
    penalises: {}
  },
  'direct counter-attacker': {
    requires: { dynamism: 0.60, defensive: 0.60 },
    penalises: { physicality: { above: 0.75, penalty: 0.4 } }
  },
  'wide-oriented direct play': {
    requires: { physicality: 0.60, attacking: 0.60 },
    penalises: { technicity: { above: 0.75, penalty: 0.4 } }
  },
  'disciplined defensive organiser': {
    requires: { defensive: 0.65, intelligence: 0.55 },
    penalises: { dynamism: { above: 0.40, penalty: 0.5 } }
  },
  'balanced tactician': {
    requires: {},
    penalises: {}
  },
  'pragmatic system-adapter': {
    requires: {},
    penalises: {}
  }
};

// ─── Cache ───────────────────────────────────────────────────

var _dnaCache = null;

function invalidateDNACache() { _dnaCache = null; }
function getSquadDNACached() { return _dnaCache; }

// ─── Squad DNA Computation ──────────────────────────────────

function computeSquadDNA(squad) {
  if (_dnaCache && _dnaCache.playerCount === squad.length) {
    return _dnaCache;
  }

  var valid = squad.filter(function (p) {
    var count = 0;
    for (var key in p) {
      if (/^(Acc|Pac|Sta|Wor|Agi|Tec|Dri|Fir|Pas|Str|Jum|Bra|Bal|Dec|Vis|Cmp|Ant|Cnt|Mar|Tck|Pos|Agg|Fin|OtB|Lon|Hea)$/.test(key)) {
        if (p[key] > 0) count++;
      }
    }
    return count >= 10;
  });

  if (valid.length === 0) {
    return {
      axes: {
        dynamism:    { raw: 0, relative: 0 },
        technicity:  { raw: 0, relative: 0 },
        physicality: { raw: 0, relative: 0 },
        intelligence:{ raw: 0, relative: 0 },
        defensive:   { raw: 0, relative: 0 },
        attacking:   { raw: 0, relative: 0 }
      },
      dominantAxis: 'dynamism',
      weaknessAxis: 'dynamism',
      profile: 'Work in Progress',
      playerCount: 0,
      computedAt: Date.now()
    };
  }

  var axes = {};
  for (var axisName in DNA_AXES) {
    var def = DNA_AXES[axisName];
    var sum = 0;
    var count = 0;
    for (var i = 0; i < valid.length; i++) {
      for (var ai = 0; ai < def.attributes.length; ai++) {
        var attrVal = parseInt(valid[i][def.attributes[ai]], 10);
        if (!isNaN(attrVal) && attrVal > 0) {
          sum += attrVal;
          count++;
        }
      }
    }
    var raw = count > 0 ? sum / count : 0;
    axes[axisName] = {
      raw: Math.round(raw * 10) / 10,
      relative: Math.min(1, Math.max(0, raw / 20))
    };
  }

  var dominantAxis = 'dynamism';
  var weaknessAxis = 'dynamism';
  for (var axisName in axes) {
    if (axes[axisName].relative > axes[dominantAxis].relative) dominantAxis = axisName;
    if (axes[axisName].relative < axes[weaknessAxis].relative) weaknessAxis = axisName;
  }

  var result = {
    axes: axes,
    dominantAxis: dominantAxis,
    weaknessAxis: weaknessAxis,
    profile: _deriveSquadProfile(axes),
    playerCount: valid.length,
    computedAt: Date.now()
  };

  _dnaCache = result;
  return result;
}

function computeManagerDNA(manager) {
  function getAttr(key, def) {
    var val = parseInt(manager[key], 10);
    return isNaN(val) ? (def !== undefined ? def : 10) : val;
  }

  var dynamism = (getAttr('Det') + getAttr('Ada') + getAttr('Amb')) / 3;
  var technicity = (getAttr('Tac Knw') + (getAttr('Tec') || 10)) / 2;
  var physicality = (getAttr('Dis') + getAttr('Mot')) / 2;
  var intelligence = (getAttr('Judge A') + getAttr('Judge P') + getAttr('Mgm')) / 3;
  var defensive = (getAttr('Dis') + getAttr('Tac Knw')) / 2;
  var attacking = (getAttr('Amb') + getAttr('Mot') + (getAttr('Att') || 10)) / 3;

  var axes = {
    dynamism:    { raw: dynamism,   relative: Math.min(1, dynamism / 20) },
    technicity:  { raw: technicity, relative: Math.min(1, technicity / 20) },
    physicality: { raw: physicality,relative: Math.min(1, physicality / 20) },
    intelligence:{ raw: intelligence,relative: Math.min(1, intelligence / 20) },
    defensive:   { raw: defensive,  relative: Math.min(1, defensive / 20) },
    attacking:   { raw: attacking,  relative: Math.min(1, attacking / 20) }
  };

  var dominantAxis = 'dynamism';
  var weaknessAxis = 'dynamism';
  for (var a in axes) {
    if (axes[a].relative > axes[dominantAxis].relative) dominantAxis = a;
    if (axes[a].relative < axes[weaknessAxis].relative) weaknessAxis = a;
  }

  return {
    axes: axes,
    dominantAxis: dominantAxis,
    weaknessAxis: weaknessAxis,
    profile: _deriveSquadProfile(axes),
    playerCount: 1,
    computedAt: Date.now()
  };
}

function _deriveSquadProfile(axes) {
  var d = axes.dynamism.relative;
  var t = axes.technicity.relative;
  var p = axes.physicality.relative;
  var i = axes.intelligence.relative;
  var df = axes.defensive.relative;
  var a = axes.attacking.relative;

  if (d > 0.72 && a > 0.68) return 'Gegenpressing Machine';
  if (t > 0.72 && i > 0.68) return 'Possession Technicians';
  if (p > 0.72 && a > 0.65) return 'Direct & Physical';
  if (df > 0.72 && i > 0.65) return 'Structured Defenders';
  if (d > 0.65 && df > 0.65 && t < 0.55) return 'Counter-Attack Specialists';
  if (d > 0.50 && t > 0.50 && p > 0.50 && i > 0.50 && df > 0.50 && a > 0.50 &&
      d < 0.70 && t < 0.70 && p < 0.70 && i < 0.70 && df < 0.70 && a < 0.70) {
    return 'Balanced & Adaptable';
  }
  if (d > 0.68 && t < 0.50 && i < 0.50) return 'Athletic but Raw';
  if (t > 0.68 && i > 0.68 && d < 0.48) return 'Ageing Technicians';
  if (df > 0.70 && p > 0.65 && a < 0.50) return 'Defensive Grinders';

  return 'Work in Progress';
}

// ─── Philosophy Coherence Score ──────────────────────────────

function computeCoherenceScore(dna, manager, tactic) {
  var philosophy = typeof deriveManagerPhilosophy === 'function'
    ? deriveManagerPhilosophy(manager) : 'balanced tactician';
  var tacticArchetype = (tactic && tactic.philosophy) || philosophy;

  // Sub-score 1: Philosophy vs Tactic (compliance check)
  var sub1;
  if (tactic && tactic.slots && typeof scoreArchetypeCompliance === 'function') {
    var compResult = scoreArchetypeCompliance(tactic.slots, tactic.instructions || {}, philosophy);
    sub1 = Math.round(compResult.score);
  } else {
    // Fallback: use affinity table (e.g. in test stubs)
    var affinity = PHILOSOPHY_ARCHETYPE_AFFINITY[philosophy];
    sub1 = Math.round((affinity ? (affinity[tacticArchetype] || 0.5) : 0.5) * 100);
  }

  // Sub-score 2: Tactic Archetype vs Squad DNA
  var reqs = ARCHETYPE_DNA_REQUIREMENTS[tacticArchetype];
  var sub2 = _computeArchetypeDNAMatch(reqs, dna.axes);

  // Sub-score 3: Squad DNA vs Manager DNA
  var managerDNA = computeManagerDNA(manager);
  var sub3 = _computeManagerSquadMatch(managerDNA, dna);

  var coherenceScore = Math.round((sub1 * 0.33) + (sub2 * 0.33) + (sub3 * 0.34));

  var colour, colourLabel;
  if (coherenceScore >= 80) {
    colour = '#2ECC71'; colourLabel = 'Coherent';
  } else if (coherenceScore >= 60) {
    colour = '#F5A623'; colourLabel = 'Partially aligned';
  } else if (coherenceScore >= 40) {
    colour = '#E8894A'; colourLabel = 'Misaligned';
  } else {
    colour = '#E8524A'; colourLabel = 'Incoherent';
  }

  var subs = [sub1, sub2, sub3];
  var minIdx = subs.indexOf(Math.min.apply(null, subs));
  var weakLink = minIdx === 0 ? 'philosophy_tactic' : minIdx === 1 ? 'tactic_squad' : 'squad_manager';

  var verdict = _generateVerdict(coherenceScore, sub1, sub2, sub3, weakLink, tacticArchetype, dna);

  return {
    score: coherenceScore,
    colour: colour,
    verdict: verdict,
    sub1: sub1,
    sub2: sub2,
    sub3: sub3,
    weakLink: weakLink,
    colourLabel: colourLabel
  };
}

function _computeArchetypeDNAMatch(reqs, axes) {
  if (!reqs) return 50;
  var pool = 0;
  var maxPool = 0;

  for (var req in reqs.requires) {
    maxPool += 1;
    if (axes[req] && axes[req].relative >= reqs.requires[req]) {
      pool += 1;
    }
  }

  if (maxPool === 0) pool = 1;

  for (var pen in reqs.penalises) {
    if (axes[pen]) {
      var pDef = reqs.penalises[pen];
      if (pDef.below !== undefined && axes[pen].relative < pDef.below) {
        pool -= pDef.penalty;
      } else if (pDef.above !== undefined && axes[pen].relative > pDef.above) {
        pool -= pDef.penalty;
      }
    }
  }

  return Math.round(Math.max(0, Math.min(100, (pool / Math.max(1, maxPool)) * 100)));
}

function _computeManagerSquadMatch(managerDNA, squadDNA) {
  var totalDelta = 0;
  var count = 0;
  for (var axis in DNA_AXES) {
    var md = managerDNA.axes[axis] ? managerDNA.axes[axis].relative : 0;
    var sd = squadDNA.axes[axis] ? squadDNA.axes[axis].relative : 0;
    totalDelta += Math.abs(md - sd);
    count++;
  }
  var avgDelta = count > 0 ? totalDelta / count : 0.5;
  return Math.round((1 - avgDelta) * 100);
}

function _generateVerdict(score, sub1, sub2, sub3, weakLink, archetype, dna) {
  if (score >= 80) return 'Squad, tactic, and manager are fully aligned.';

  var weakScore = weakLink === 'philosophy_tactic' ? sub1
    : weakLink === 'tactic_squad' ? sub2 : sub3;

  if (weakLink === 'philosophy_tactic') {
    if (weakScore >= 70) return 'Tactic reflects the manager\'s philosophy well.';
    if (weakScore >= 40) return 'Tactic only partially fits the manager\'s style.';
    return 'Tactic contradicts the manager\'s core philosophy.';
  }

  if (weakLink === 'tactic_squad') {
    if (weakScore >= 70) return 'Squad has the tools to execute this tactic.';
    if (weakScore >= 40) return 'Squad partially suits this tactic \u2014 gaps remain.';
    var specHint = _findWeakestAxisForArchetype(archetype, dna);
    return 'Squad lacks the profile to run this system. ' + specHint.charAt(0).toUpperCase() + specHint.slice(1) + '.';
  }

  if (weakLink === 'squad_manager') {
    if (weakScore >= 70) return 'Squad identity aligns with the manager\'s values.';
    if (weakScore >= 40) return 'Squad and manager are not fully in sync yet.';
    return 'This squad doesn\'t reflect what the manager wants.';
  }

  return 'Coherence assessment incomplete.';
}

function _findWeakestAxisForArchetype(archetype, dna) {
  var reqs = ARCHETYPE_DNA_REQUIREMENTS[archetype];
  if (!reqs || !reqs.requires) return 'gaps remain';

  var worstAxis = null;
  var worstDelta = -Infinity;
  for (var ax in reqs.requires) {
    var reqVal = reqs.requires[ax];
    var actual = dna.axes[ax] ? dna.axes[ax].relative : 0;
    var delta = reqVal - actual;
    if (delta > worstDelta) {
      worstDelta = delta;
      worstAxis = ax;
    }
  }

  if (!worstAxis) return 'gaps remain';

  var hints = {
    dynamism: 'squad too slow for this system',
    technicity: 'squad lacks the technique for this system',
    physicality: 'squad too technical for direct play',
    intelligence: 'squad lacks the game intelligence',
    defensive: 'squad lacks the defensive structure',
    attacking: 'squad lacks the attacking threat'
  };
  return hints[worstAxis] || 'gaps remain';
}

// ─── SVG Badge Rendering ────────────────────────────────────

function renderDNABadge(dna, size, theme) {
  var cx = size / 2;
  var cy = size / 2;
  var baseR = size * 0.38;
  var isDark = theme !== 'light';

  // Compute lobe endpoint for each axis
  var points = [];
  for (var i = 0; i < 6; i++) {
    var axisName = DNA_AXIS_ORDER[i];
    var angle = (i * 60 - 90) * Math.PI / 180;
    var rel = dna.axes[axisName] ? dna.axes[axisName].relative : 0;
    var lobeR = baseR * (0.3 + 0.7 * rel);
    points.push({
      x: cx + lobeR * Math.cos(angle),
      y: cy + lobeR * Math.sin(angle),
      angle: angle,
      axisName: axisName,
      rel: rel
    });
  }

  // Sector paths
  var sectors = '';
  for (var i = 0; i < 6; i++) {
    var next = (i + 1) % 6;
    var axisDef = DNA_AXES[points[i].axisName];
    var opacity = 0.25 + points[i].rel * 0.55;
    sectors += '<path d="M ' + cx + ' ' + cy + ' L ' + points[i].x + ' ' + points[i].y +
      ' L ' + points[next].x + ' ' + points[next].y + ' Z" fill="' + axisDef.colour +
      '" fill-opacity="' + opacity.toFixed(2) + '" />';
  }

  // Smooth polygon outline
  var outlinePath = _smoothPolygonPath(points);
  var strokeColour = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';

  var labels = '';
  var values = '';

  if (size >= 160) {
    for (var i = 0; i < 6; i++) {
      var p = points[i];
      var unitX = Math.cos(p.angle);
      var unitY = Math.sin(p.angle);
      var lx = p.x + unitX * size * 0.08;
      var ly = p.y + unitY * size * 0.08;
      var axisDef = DNA_AXES[p.axisName];
      labels += '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) +
        '" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-size="' + (size * 0.07).toFixed(1) +
        '" font-weight="700" font-family="JetBrains Mono,monospace">' + axisDef.label + '</text>';

      if (size >= 200) {
        var vy = p.y + unitY * (size * 0.08 + (size * 0.07));
        values += '<text x="' + lx.toFixed(1) + '" y="' + (vy + 4).toFixed(1) +
          '" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="' + (size * 0.045).toFixed(1) +
          '" font-family="JetBrains Mono,monospace">' + dna.axes[p.axisName].raw.toFixed(1) + '</text>';
      }
    }
  }

  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" xmlns="http://www.w3.org/2000/svg">' +
    sectors +
    '<path d="' + outlinePath + '" fill="none" stroke="' + strokeColour + '" stroke-width="1.5" stroke-linejoin="round" />' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + (size * 0.04).toFixed(1) + '" fill="rgba(255,255,255,0.4)" />' +
    labels + values +
    '</svg>';
}

function _smoothPolygonPath(points) {
  var n = points.length;
  if (n < 3) return '';

  var d = '';
  for (var i = 0; i < n; i++) {
    var p0 = points[(i - 1 + n) % n];
    var p1 = points[i];
    var p2 = points[(i + 1) % n];
    var p3 = points[(i + 2) % n];

    var cp1x = p1.x + (p2.x - p0.x) * 0.1;
    var cp1y = p1.y + (p2.y - p0.y) * 0.1;
    var cp2x = p2.x - (p3.x - p1.x) * 0.1;
    var cp2y = p2.y - (p3.y - p1.y) * 0.1;

    if (i === 0) {
      d += 'M ' + p1.x.toFixed(1) + ' ' + p1.y.toFixed(1);
    }
    d += ' C ' + cp1x.toFixed(1) + ' ' + cp1y.toFixed(1) +
      ', ' + cp2x.toFixed(1) + ' ' + cp2y.toFixed(1) +
      ', ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
  }
  d += ' Z';
  return d;
}

// ─── Coherence Badge HTML ───────────────────────────────────

function renderCoherenceBadge(result, compact) {
  if (!result) return '';
  if (compact) {
    return '<div class="dna-coherence-compact">' +
      '<span class="dna-score" style="color:' + result.colour + '">' + result.score + '</span>' +
      '<span class="dna-label">Coherence</span>' +
      '</div>';
  }

  var colourLabel = result.colourLabel || '';

  return '<div class="dna-coherence-full">' +
    '<div class="dna-score-row">' +
    '<span class="dna-score-num" style="color:' + result.colour + '">' + result.score + '</span>' +
    '<span class="dna-score-label">/ 100</span>' +
    '<span class="dna-score-tag" style="background:' + result.colour + '20; color:' + result.colour + '">' +
    colourLabel + '</span>' +
    '</div>' +
    '<div class="dna-verdict">' + result.verdict + '</div>' +
    '<div class="dna-sub-scores">' +
    '<span title="Philosophy vs Tactic">P\u00B7T ' + result.sub1 + '</span>' +
    '<span title="Tactic vs Squad">T\u00B7S ' + result.sub2 + '</span>' +
    '<span title="Squad vs Manager">S\u00B7M ' + result.sub3 + '</span>' +
    '</div>' +
    '</div>';
}

function renderAxisBreakdown(dna) {
  var html = '';
  for (var i = 0; i < DNA_AXIS_ORDER.length; i++) {
    var ax = DNA_AXIS_ORDER[i];
    var axisDef = DNA_AXES[ax];
    var data = dna.axes[ax];
    if (!data) continue;
    var pct = Math.round(data.relative * 100);
    html += '<div class="dna-axis-row">' +
      '<span class="dna-axis-name">' + axisDef.label + '</span>' +
      '<div class="dna-axis-bar-track">' +
      '<div class="dna-axis-bar-fill" style="width:' + pct + '%; background:' + axisDef.colour + '"></div>' +
      '</div>' +
      '<span class="dna-axis-value">' + data.raw.toFixed(1) + '</span>' +
      '</div>';
  }
  return html;
}

// ─── EXPORT ───
global.computeSquadDNA = computeSquadDNA;
global.computeManagerDNA = computeManagerDNA;
global.computeCoherenceScore = computeCoherenceScore;
global.renderDNABadge = renderDNABadge;
global.renderCoherenceBadge = renderCoherenceBadge;
global.renderAxisBreakdown = renderAxisBreakdown;
global.invalidateDNACache = invalidateDNACache;
global.getSquadDNACached = getSquadDNACached;
global._deriveSquadProfile = _deriveSquadProfile;
global._smoothPolygonPath = _smoothPolygonPath;

})(typeof window !== "undefined" ? window : global);
