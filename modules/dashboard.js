(function () {

/* ═══ DASHBOARD MODULE ══════════════════════════════════════════════════════
 *   Widget renderers for Dashboard view + Transfers view (Phase 2A/2B)
 */

var DASHBOARD_WIDGETS = [
  { id: 'manager-profile', span: 'widget-half',   render: renderManagerProfileWidget },
  { id: 'board-confidence', span: 'widget-third',  render: renderBoardConfidenceWidget },
  { id: 'scoreboard',       span: 'widget-full',   render: renderScoreboardWidget },
  { id: 'squad-dna-match',  span: 'widget-half',   render: renderSquadDNAMatchWidget },
  { id: 'player-unrest',    span: 'widget-third',  render: renderPlayerUnrestWidget },
  { id: 'tactical-blueprint', span: 'widget-half', render: renderTacticalBlueprintWidget },
  { id: 'loaned-players',   span: 'widget-third',  render: renderLoanedPlayersWidget },
  { id: 'squad-summary',    span: 'widget-half',   render: renderSquadSummaryWidget },
  { id: 'career-arcs',      span: 'widget-third',  render: renderCareerArcsWidget },
  { id: 'pillar-diagnostics', span: 'widget-full', render: renderPillarDiagnosticsWidget },
  { id: 'transfer-history', span: 'widget-full', render: renderTransferHistoryDashboardWidget }
];

function computeDashboardData() {
  var s = window.FM24State;
  var mgr = s.manager;
  var hired = mgr.hired;
  var squad = s.squad;
  var tactic = s.tactic;
  var board = s.board || { confidence: 70, stage: 'NORMAL', mandates: [] };

  if (!hired || !squad.length) {
    return { ready: false, hired: hired, squad: squad, board: board };
  }

  if (!mgr.squadDNA || !mgr.squadDNA.computedAt) {
    mgr.squadDNA = typeof computeSquadDNA === 'function' ? computeSquadDNA(squad) : null;
  }
  var squadDNA = mgr.squadDNA;

  if (squadDNA && tactic && tactic.isComplete && mgr.lastCoherenceScore == null) {
    var coh = typeof computeCoherenceScore === 'function' ? computeCoherenceScore(squadDNA, hired, tactic) : null;
    mgr.lastCoherenceScore = coh ? coh.score : null;
    mgr.lastCoherenceResult = coh;
  }

  if (hired && tactic && tactic.isComplete && !mgr.lastFitResult) {
    var fit = typeof calculateManagerFit === 'function' ? calculateManagerFit(hired, squad, tactic) : null;
    mgr.lastFitResult = fit;
    mgr.lastSquadFitScore = fit ? fit.overallScore : null;
    if (fit && fit.squadDNA && !squadDNA) {
      mgr.squadDNA = fit.squadDNA;
      squadDNA = fit.squadDNA;
    }
  }

  var managerDNA = typeof computeManagerDNA === 'function' ? computeManagerDNA(hired) : null;

  return {
    ready: true,
    hired: hired,
    squadDNA: squadDNA,
    managerDNA: managerDNA,
    coherence: mgr.lastCoherenceResult,
    fitResult: mgr.lastFitResult,
    tactic: tactic,
    board: board,
    squad: squad,
    season: mgr.season || {}
  };
}

function esc(s) {
  return typeof escHtml === 'function' ? escHtml(s) : String(s);
}

function renderManagerProfileWidget(c) {
  if (!c.ready) {
    return '<div class="widget-body"><div class="widget-empty">Hire a manager and load squad data to see the profile.</div></div>';
  }
  var h = c.hired;
  var fit = c.fitResult;
  var coh = c.coherence;
  var arch = typeof deriveArchetype === 'function' ? deriveArchetype(h) : 'Balanced';

  var fitScore = fit ? fit.overallScore : null;
  var fitColor = fitScore >= 80 ? '#22c55e' : fitScore >= 60 ? '#f59e0b' : '#ef4444';
  var fitBarColor = fitScore >= 80 ? 'background:#22c55e' : fitScore >= 60 ? 'background:#f59e0b' : 'background:#ef4444';
  var initials = (h.Name || '?').charAt(0).toUpperCase();

  var html = '';
  html += '<div class="widget-body--profile">';
  html += '  <div class="profile-avatar cursor-pointer" onclick="FM24SwitchTab(\'manager\')">' + initials + '</div>';
  html += '  <div class="profile-info w-full min-w-0">';
  html += '    <div class="profile-name truncate cursor-pointer hover:text-blue-400 hover:underline" onclick="FM24SwitchTab(\'manager\')">' + esc(h.Name) + '</div>';
  html += '    <div class="profile-meta">CA ' + (h.CA || 0) + ' · ' + esc(h['Preferred Formation'] || '—') + '</div>';
  html += '    <div class="profile-tags flex items-center justify-between w-full mt-1.5">';
  html += '      <div class="flex items-center gap-1.5">';
  html += '        <span class="tag tag-blue">' + esc(arch) + '</span>';
  if (coh) {
    var cohColor = coh.score >= 70 ? 'tag-green' : coh.score >= 40 ? 'tag-amber' : 'tag-blue';
    html += '        <span class="tag ' + cohColor + '">' + coh.score + '% Coherent</span>';
  }
  html += '      </div>';
  html += '      <button id="btn-fire-manager" class="px-2 py-0.5 bg-red-950/40 hover:bg-red-900 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-white text-[9px] font-bold uppercase tracking-wider rounded transition-colors shadow-sm ml-2">Sack</button>';
  html += '    </div>';
  html += '  </div>';
  html += '  <div class="profile-fit">';
  if (fitScore != null) {
    html += '    <div class="fit-score" style="color:' + fitColor + '">' + fitScore + '</div>';
    html += '    <div class="fit-label">Squad Fit</div>';
    html += '    <div class="fit-bar-wrap"><div class="fit-bar-fill" style="width:' + fitScore + '%;' + fitBarColor + '"></div></div>';
  }
  html += '  </div>';

  // Manager satisfaction
  var negState = window.FM24State.manager.negotiation || {};
  var alignmentScore = negState.alignmentScore || 50;
  var promises = negState.promises || [];
  var fulfilledCount = promises.filter(function (p) { return p.fulfilled; }).length;
  var brokenCount = promises.filter(function (p) { return p.broken; }).length;
  var pendingCount = promises.filter(function (p) { return !p.fulfilled && !p.broken; }).length;
  var fulfillRate = promises.length > 0 ? fulfilledCount / promises.length : 1;
  var satisfactionScore = Math.min(100, Math.round(alignmentScore * 0.4 + fulfillRate * 60));
  var satColor = satisfactionScore >= 70 ? '#22c55e' : satisfactionScore >= 40 ? '#f59e0b' : '#ef4444';

  html += '<div class="mt-3 pt-3 border-t border-border/60">';
  html += '  <div class="flex items-center justify-between text-[10px] text-text-muted mb-1">';
  html += '    <span>Manager Satisfaction</span>';
  html += '    <span style="color:' + satColor + '; font-weight:700">' + satisfactionScore + '%</span>';
  html += '  </div>';
  html += '  <div class="fit-bar-wrap"><div class="fit-bar-fill" style="width:' + satisfactionScore + '%;background:' + satColor + '"></div></div>';
  html += '</div>';

  // Active Commitments
  if (promises.length > 0) {
    html += '<div class="mt-3 pt-2 border-t border-border/60">';
    html += '  <div class="text-[9px] text-text-muted uppercase font-bold tracking-wider mb-1.5">Active Commitments</div>';
    html += '  <div class="flex flex-col gap-1">';
    for (var pi = 0; pi < promises.length; pi++) {
      var p = promises[pi];
      var statusClass = p.broken ? 'broken' : p.fulfilled ? 'fulfilled' : 'pending';
      var statusLabel = p.broken ? 'Broken' : p.fulfilled ? 'Fulfilled' : 'Pending';
      html += '    <div class="promise-item ' + statusClass + '">';
      html += '      <span class="flex-1 min-w-0 truncate">' + esc(p.detail || p.type) + '</span>';
      html += '      <span class="text-[8px] uppercase font-bold tracking-wider flex-shrink-0">[' + statusLabel + ']</span>';
      html += '    </div>';
    }
    html += '  </div>';
    html += '</div>';
  }

  // Season block
  var season = c.season || {};
  if (season.played > 0) {
    html += '<div class="mt-3 pt-2 border-t border-border/60">';
    html += '  <div class="text-[9px] text-text-muted uppercase font-bold tracking-wider mb-1.5">Season</div>';
    html += '  <div class="flex items-center gap-3 text-[10px]">';
    html += '    <span class="text-green-400 font-bold">' + (season.won || 0) + 'W</span>';
    html += '    <span class="text-text-muted">' + (season.drawn || 0) + 'D</span>';
    html += '    <span class="text-red-400 font-bold">' + (season.lost || 0) + 'L</span>';
    if (season.position) {
      html += '    <span class="text-text-secondary">Pos: ' + positionOrdinal(season.position) + '</span>';
    }
    html += '    <span class="text-text-secondary">' + (season.played || 0) + 'P</span>';
    html += '  </div>';
    html += '</div>';
  }

  html += '</div>';

  return html;
}

function positionOrdinal(n) {
  if (!n) return '';
  var s = ['th', 'st', 'nd', 'rd'];
  var v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function renderBoardConfidenceWidget(c) {
  var board = c.board || { confidence: 70, stage: 'NORMAL', mandates: [] };
  var conf = board.confidence != null ? board.confidence : 70;
  var stage = board.stage || 'NORMAL';
  var activeMandates = (board.mandates || []).filter(function (m) { return m.status === 'ACTIVE'; });
  var r = 22;
  var circ = 2 * Math.PI * r;
  var offset = circ - (conf / 100) * circ;
  var stageColor = stage === 'NORMAL' ? '#22c55e' : stage === 'SCRUTINY' ? '#f59e0b' : '#ef4444';
  var stageClass = stage === 'NORMAL' ? 'stage-ok' : stage === 'SCRUTINY' ? 'stage-warn' : 'stage-danger';

  var html = '';
  html += '<div class="widget-body--board">';
  html += '  <div class="board-ring-wrap">';
  html += '    <svg width="56" height="56" viewBox="0 0 56 56">';
  html += '      <circle cx="28" cy="28" r="' + r + '" fill="none" stroke="#1F1F1F" stroke-width="3"/>';
  html += '      <circle cx="28" cy="28" r="' + r + '" fill="none" stroke="' + stageColor + '" stroke-width="3" stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '" stroke-linecap="round" transform="rotate(-90 28 28)"/>';
  html += '    </svg>';
  html += '    <div class="board-ring-label" style="color:' + stageColor + '">' + conf + '</div>';
  html += '  </div>';
  html += '  <div class="board-info">';
  html += '    <div class="board-stage ' + stageClass + '">' + stage.replace(/_/g, ' ') + '</div>';
  html += '    <div class="board-note">' + activeMandates.length + ' active mandate' + (activeMandates.length !== 1 ? 's' : '') + '</div>';
  if (stage === 'DISMISSAL_RISK') {
    html += '  <div class="board-alert">Dismissal pending — satisfy reprieve mandates</div>';
  } else if (stage === 'PRESSURE') {
    html += '  <div class="board-alert">Under severe board pressure</div>';
  }
  html += '  </div>';
  html += '</div>';

  return html;
}

function renderScoreboardWidget(c) {
  var s = window.FM24State;
  var mgr = s.manager;
  var board = c.board || { confidence: 70 };
  var fit = c.fitResult;
  var fitScore = fit ? fit.overallScore : null;
  var budget = mgr.budget || 0;
  var rel = mgr.relationshipIndex != null ? mgr.relationshipIndex : 60;
  var windows = mgr.windowCount || 0;
  var squadSize = c.squad ? c.squad.length : 0;

  var items = [
    { label: 'Squad Fit', value: fitScore != null ? fitScore + '%' : '—', cls: fitScore >= 80 ? 'score-good' : fitScore >= 60 ? 'score-mid' : fitScore != null ? 'score-bad' : '' },
    { label: 'Board Confidence', value: board.confidence + '%', cls: board.confidence >= 60 ? 'score-good' : board.confidence >= 40 ? 'score-mid' : 'score-bad' },
    { label: 'Manager Relation', value: rel + '%', cls: rel >= 60 ? 'score-good' : rel >= 40 ? 'score-mid' : 'score-bad' },
    { label: 'Transfer Budget', value: '£' + (typeof formatCurrency === 'function' ? formatCurrency(budget) : budget.toLocaleString()), cls: '' },
    { label: 'Squad Size', value: squadSize, cls: '' },
    { label: 'Windows Done', value: windows, cls: '' }
  ];

  var html = '<div class="scoreboard">';
  items.forEach(function (item) {
    html += '  <div class="score-cell">';
    html += '    <div class="score-num ' + item.cls + '">' + item.value + '</div>';
    html += '    <div class="score-label">' + item.label + '</div>';
    html += '  </div>';
  });
  html += '</div>';

  if (fit && fit.insights && fit.insights.length > 0) {
    var top = fit.insights[0];
    var isWarn = top.indexOf('gap') !== -1 || top.indexOf('weak') !== -1 || top.indexOf('concern') !== -1;
    html += '<div class="score-note ' + (isWarn ? 'score-note--warn' : 'score-note--ok') + '">' + esc(top) + '</div>';
  }

  return html;
}

function renderSquadDNAMatchWidget(c) {
  if (!c.squadDNA) {
    return '<div class="widget-body"><div class="widget-empty">Load squad data to compute DNA match.</div></div>';
  }
  var dna = c.squadDNA;
  var coh = c.coherence;
  var theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

  // Calculate Squad DNA Match score (role-to-player fit)
  var dnaScore = null;
  var s = window.FM24State;
  if (typeof computeDnaScore === "function" && s && s.squad && s.tactic) {
    var dnaResult = computeDnaScore(s.squad, s.tactic);
    dnaScore = dnaResult ? dnaResult.score : null;
  }

  var html = '';
  // 1. Widget Header
  html += '<div class="widget-header">';
  html += '  <span class="widget-title">Squad DNA Match & Coherence</span>';
  if (dnaScore !== null) {
    var badgeColor = dnaScore >= 80 ? 'bg-green-500/10 text-green-400 border-green-500/20' : dnaScore >= 60 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20';
    html += '  <span class="text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider border ' + badgeColor + '">Match: ' + dnaScore + '%</span>';
  }
  html += '</div>';

  // 2. Widget Body
  html += '<div class="widget-body">';
  html += '  <div class="widget-body--dna p-1">';
  html += '    <div class="dna-profile-body flex gap-6 items-center">';
  html += '      <div class="dna-profile-badge-wrap flex flex-col items-center gap-1.5 flex-shrink-0">';
  html += (typeof renderDNABadge === 'function' ? renderDNABadge(dna, 130, theme) : '');
  html += '        <div class="text-[10px] text-text-secondary font-bold text-center mt-1 uppercase tracking-wider">' + esc(dna.profile) + '</div>';
  html += '      </div>';
  html += '      <div class="dna-profile-coherence flex-1 min-w-0 flex flex-col gap-2">';
  
  // Side-by-side overall scores
  html += '        <div class="grid grid-cols-2 gap-3 mb-1 border-b border-border/40 pb-2">';
  if (dnaScore !== null) {
    var dnaColor = dnaScore >= 80 ? 'text-[#2ECC71]' : dnaScore >= 60 ? 'text-[#F5A623]' : 'text-[#E8524A]';
    html += '          <div>';
    html += '            <div class="text-[8px] text-text-muted font-bold uppercase tracking-wider">Squad DNA Match</div>';
    html += '            <div class="text-sm font-extrabold ' + dnaColor + '">' + dnaScore + '%</div>';
    html += '          </div>';
  }
  if (coh) {
    var cohColor = coh.score >= 80 ? 'text-[#2ECC71]' : coh.score >= 60 ? 'text-[#F5A623]' : 'text-[#E8524A]';
    html += '          <div>';
    html += '            <div class="text-[8px] text-text-muted font-bold uppercase tracking-wider">DNA Coherence</div>';
    html += '            <div class="text-sm font-extrabold ' + cohColor + '">' + coh.score + '%</div>';
    html += '          </div>';
  }
  html += '        </div>';

  // Proven layer: how much of the DNA assessment is backed by actual minutes
  var provenPct = 0;
  if (typeof PlayerUtils !== "undefined" && PlayerUtils.getMinutesLoad && s && s.squad) {
    var provenCount = 0;
    for (var ppi = 0; ppi < s.squad.length; ppi++) {
      var ml = PlayerUtils.getMinutesLoad(s.squad[ppi]);
      if (ml.tier === 'starter' || ml.tier === 'rotation') provenCount++;
    }
    provenPct = s.squad.length > 0 ? Math.round((provenCount / s.squad.length) * 100) : 0;
  }
  var provenLabel = provenPct >= 60 ? 'Proven' : 'Provisional';
  var provenColor = provenPct >= 60 ? 'text-emerald-400' : 'text-amber-400';
  html += '        <div class="flex items-center gap-2 text-[9px] mb-1">';
  html += '          <span class="' + provenColor + ' font-bold uppercase tracking-wider">' + provenLabel + '</span>';
  html += '          <span class="text-text-muted">' + provenPct + '% of squad with 900+ mins</span>';
  html += '        </div>';

  if (coh) {
    html += '        <div class="text-[10px] text-text-secondary font-medium italic border-l-2 border-border/80 pl-2 leading-relaxed mb-1">' + esc(coh.verdict) + '</div>';
  } else if (c.tactic && !c.tactic.isComplete) {
    html += '        <div class="text-[10px] text-[#F5A623] font-bold uppercase tracking-wider mb-1">Tactic Incomplete</div>';
    html += '        <div class="text-[10px] text-text-secondary font-medium italic border-l-2 border-[#F5A623]/60 pl-2 leading-relaxed mb-1">Configure your tactic slots to calculate coherence match.</div>';
  }
  html += '        <div class="dna-profile-axis-list">';
  html += (typeof renderAxisBreakdown === 'function' ? renderAxisBreakdown(dna) : '');
  // Proven overlay bars
  if (s && s.squad && typeof computeSquadDNA === 'function') {
    var provenSquad = s.squad.filter(function (pp) {
      if (typeof PlayerUtils === "undefined" || !PlayerUtils.getMinutesLoad) return false;
      var ml = PlayerUtils.getMinutesLoad(pp);
      return ml.tier === 'starter' && pp.AvRat != null && pp.AvRat >= 6.75;
    });
    if (provenSquad.length >= 5) {
      var provenDNA = computeSquadDNA(provenSquad);
      if (provenDNA && provenDNA.axes) {
        html += '<div class="mt-2 pt-2 border-t border-border/40">';
        html += '  <div class="text-[9px] text-text-muted uppercase font-bold tracking-wider mb-1.5">Proven Performance (starters with AvRat \u2265 6.75)</div>';
        for (var axi = 0; axi < DNA_AXIS_ORDER.length; axi++) {
          var axName = DNA_AXIS_ORDER[axi];
          var axDef = DNA_AXES[axName];
          var baseData = dna.axes[axName];
          var provData = provenDNA.axes[axName];
          if (!baseData || !provData) continue;
          var basePct = Math.round(baseData.relative * 100);
          var provPct = Math.round(provData.relative * 100);
          html += '<div class="dna-axis-row">' +
            '<span class="dna-axis-name">' + axDef.label + '</span>' +
            '<div class="dna-axis-bar-track" style="position:relative">' +
              '<div class="dna-axis-bar-fill" style="width:' + basePct + '%; background:' + axDef.colour + '; opacity:0.3; position:absolute;top:0;left:0;height:100%"></div>' +
              '<div class="dna-axis-bar-fill" style="width:' + provPct + '%; background:' + axDef.colour + '; opacity:0.8; position:absolute;top:0;left:0;height:100%"></div>' +
            '</div>' +
            '<span class="dna-axis-value" style="display:flex;flex-direction:column;line-height:1.2;font-size:8px">' +
              '<span>' + baseData.raw.toFixed(1) + '</span>' +
              '<span class="text-text-muted">' + provData.raw.toFixed(1) + '</span>' +
            '</span>' +
          '</div>';
        }
        html += '</div>';
      }
    }
  }
  html += '        </div>';
  html += '      </div>';
  html += '    </div>';
  html += '  </div>';
  html += '</div>';

  return html;
}

function renderPlayerUnrestWidget(c) {
  var unrest = (window.FM24State.manager.unrestPlayers || []);
  var dispute = window.FM24State.manager.contractDispute;

  if (unrest.length === 0 && !dispute) {
    var html = '<div class="widget-body" style="padding-bottom:6px">';
    html += '  <div class="unrest-ok">';
    html += '    <div class="unrest-ok-icon">&#10003;</div>';
    html += '    <div>';
    html += '      <div class="unrest-ok-text">Dressing room is calm</div>';
    html += '      <div class="unrest-ok-sub">No player unrest or contract disputes</div>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    return html;
  }

  var html = '<div class="widget-body" style="padding-bottom:6px">';
  if (dispute) {
    html += '  <div class="unrest-player" style="margin-bottom:5px">';
    html += '    <div class="unrest-dot"></div>';
    html += '    <div class="unrest-name">Contract Dispute</div>';
    html += '    <div class="unrest-reason">Ongoing</div>';
    html += '  </div>';
  }
  var maxShow = c.isExpanded ? unrest.length : 3;
  for (var i = 0; i < Math.min(unrest.length, maxShow); i++) {
    var u = unrest[i];
    html += '  <div class="unrest-player" style="margin-bottom:3px">';
    html += '    <div class="unrest-dot"></div>';
    html += '    <div class="unrest-name">' + esc(u.player ? u.player.Name : (u.Name || u.name || 'Unknown')) + '</div>';
    html += '    <div class="unrest-reason">' + esc(Array.isArray(u.reasons) ? u.reasons.join('; ') : (u.reason || 'Unhappy')) + '</div>';
    if (u.source === 'playing-time') {
      html += '    <span class="text-[8px] uppercase tracking-wider font-bold text-amber-400/70 ml-auto flex-shrink-0">PT</span>';
    }
    html += '  </div>';
  }
  if (unrest.length > maxShow) {
    html += '  <div class="unrest-ok-sub" style="padding:4px 0 0 14px;font-size:10px">+' + (unrest.length - maxShow) + ' more</div>';
  }
  html += '</div>';
  return html;
}

function renderPillarDiagnosticsWidget(c) {
  var fit = c.fitResult;
  if (!fit || !fit.pillars) {
    return '<div class="widget-body"><div class="widget-empty">No fit data available. Complete your tactic and load squad data.</div></div>';
  }

  var pillarLabels = {
    tacticalCoverage: 'Tactical Coverage',
    styleCapacity: 'Style Capacity',
    lockerRoom: 'Locker Room',
    development: 'Development',
    gapSeverity: 'Gap Severity',
    baseline: 'Baseline Quality'
  };

  var html = '<div class="pillars">';

  for (var key in fit.pillars) {
    var p = fit.pillars[key];
    if (!p || p.max <= 0) continue;
    var pct = Math.round((p.score / p.max) * 100);
    var pClass = pct >= 80 ? 'pillar-high' : pct >= 60 ? 'pillar-mid' : pct >= 40 ? 'pillar-low' : 'pillar-crit';
    var label = pillarLabels[key] || key;

    html += '<div class="pillar-row">';
    html += '  <span class="pillar-name">' + label + '</span>';
    html += '  <div class="pillar-track">';
    html += '    <div class="pillar-fill ' + pClass + '" style="width:' + pct + '%"></div>';
    html += '  </div>';
    html += '  <span class="pillar-score">' + p.score + '/' + p.max + '</span>';
    html += '</div>';
  }
  html += '</div>';

  if (fit.insights && fit.insights.length > 0) {
    html += '<div style="margin-top:8px;font-size:10px;color:#666;line-height:1.4">';
    var maxInsights = c.isExpanded ? fit.insights.length : 3;
    for (var j = 0; j < Math.min(fit.insights.length, maxInsights); j++) {
      html += '<div style="padding:2px 0">' + esc(fit.insights[j]) + '</div>';
    }
    html += '</div>';
  }

  return html;
}

function renderSquadSummaryWidget(c) {
  if (!c.ready || !c.squad || c.squad.length === 0) {
    return '<div class="widget-body"><div class="widget-empty">Load squad data to view summary.</div></div>';
  }
  var squad = c.squad;
  var totalAge = 0;
  var totalCA = 0;
  var totalPA = 0;
  squad.forEach(function (p) {
    totalAge += (parseInt(p.Age, 10) || 0);
    totalCA += (parseFloat(p.CA) || 0);
    totalPA += (parseFloat(p.PA) || 0);
  });
  var avgAge = totalAge / squad.length;
  var avgCA = totalCA / squad.length;

  var sorted = squad.slice().sort(function (a, b) {
    return (parseFloat(b.CA) || 0) - (parseFloat(a.CA) || 0);
  });
  var topPlayers = c.isExpanded ? sorted : sorted.slice(0, 4);

  var html = '';
  html += '<div class="widget-header">';
  html += '  <span class="widget-title">Squad Summary</span>';
  html += '  <span class="text-[9px] text-text-muted">Avg CA: ' + avgCA.toFixed(1) + '</span>';
  html += '</div>';
  html += '<div class="widget-body">';
  html += '  <div class="flex justify-between items-center text-[10px] text-text-secondary mb-2 font-mono">';
  html += '    <span>Total Players: <strong>' + squad.length + '</strong></span>';
  html += '    <span>Avg Age: <strong>' + avgAge.toFixed(1) + ' y/o</strong></span>';
  html += '  </div>';
  html += '  <table class="w-full text-left text-[11px] font-sans">';
  html += '    <thead>';
  html += '      <tr class="border-b border-border/40 text-[9px] text-text-muted uppercase tracking-wider">';
  html += '        <th class="pb-1 font-semibold">Player</th>';
  html += '        <th class="pb-1 font-semibold">Position</th>';
  html += '        <th class="pb-1 font-semibold text-center">Age</th>';
  html += '        <th class="pb-1 font-semibold text-right">CA</th>';
  html += '        <th class="pb-1 font-semibold text-right">PA</th>';
  html += '      </tr>';
  html += '    </thead>';
  html += '    <tbody class="divide-y divide-border/20">';
  topPlayers.forEach(function (p) {
    var pos = p.Position || p.BestPosition || '';
    if (pos.length > 15) pos = pos.substring(0, 12) + '...';
    html += '      <tr class="hover:bg-surface-hover/20 transition-colors">';
    html += '        <td class="py-1 font-semibold text-white truncate max-w-[80px]" title="' + esc(p.Name) + '">' + esc(p.Name) + '</td>';
    html += '        <td class="py-1 text-text-muted truncate max-w-[80px]" title="' + esc(pos) + '">' + esc(pos) + '</td>';
    html += '        <td class="py-1 text-center text-text-secondary">' + (p.Age || '—') + '</td>';
    html += '        <td class="py-1 text-right text-text-secondary font-mono">' + (p.CA ? parseFloat(p.CA).toFixed(1) : '—') + '</td>';
    html += '        <td class="py-1 text-right text-text-secondary font-mono">' + (p.PA ? parseFloat(p.PA).toFixed(1) : '—') + '</td>';
    html += '      </tr>';
  });
  html += '    </tbody>';
  html += '  </table>';
  html += '</div>';

  return html;
}

function renderLoanedPlayersWidget(c) {
  var state = window.FM24State.manager;
  var loanedOut = state.loanedOutPlayers || [];

  var html = '';
  html += '<div class="widget-header">';
  html += '  <span class="widget-title">Loaned Out Players</span>';
  html += '  <span class="text-[9px] text-text-muted font-bold">Total: ' + loanedOut.length + '</span>';
  html += '</div>';
  html += '<div class="widget-body">';

  if (loanedOut.length === 0) {
    html += '  <div class="widget-empty">No players currently out on loan.</div>';
    html += '</div>';
    return html;
  }

  html += '  <table class="w-full text-left text-[11px] font-sans">';
  html += '    <thead>';
  html += '      <tr class="border-b border-border/40 text-[9px] text-text-muted uppercase tracking-wider">';
  html += '        <th class="pb-1 font-semibold">Player</th>';
  html += '        <th class="pb-1 font-semibold">Position</th>';
  html += '        <th class="pb-1 font-semibold text-center">Age</th>';
  html += '        <th class="pb-1 font-semibold text-center">Status</th>';
  html += '      </tr>';
  html += '    </thead>';
  html += '    <tbody class="divide-y divide-border/20">';
  var displayLoans = c.isExpanded ? loanedOut : loanedOut.slice(0, 4);
  displayLoans.forEach(function (lop) {
    var lopName = lop.Name || (lop.player && lop.player.Name) || 'Unknown';
    var lopAge = lop.Age || (lop.player && lop.player.Age) || '—';
    var lopPos = lop.Position || lop.BestPosition || (lop.player && (lop.player.Position || lop.player.BestPosition)) || '—';
    if (lopPos.length > 12) lopPos = lopPos.substring(0, 10) + '...';
    html += '      <tr class="hover:bg-surface-hover/20 transition-colors">';
    html += '        <td class="py-1 font-semibold text-white truncate max-w-[80px]" title="' + esc(lopName) + '">' + esc(lopName) + '</td>';
    html += '        <td class="py-1 text-text-muted">' + esc(lopPos) + '</td>';
    html += '        <td class="py-1 text-center text-text-secondary">' + lopAge + '</td>';
    html += '        <td class="py-1 text-center">';
    html += '          <span class="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">LOANED</span>';
    html += '        </td>';
    html += '      </tr>';
  });
  html += '    </tbody>';
  html += '  </table>';
  html += '</div>';

  return html;
}

function renderCareerArcsWidget(c) {
  var board = c.board || {};
  var signingHistory = board.signingHistory || [];
  var state = window.FM24State.manager;
  var squad = c.squad || [];

  var html = '';
  html += '<div class="widget-header">';
  html += '  <span class="widget-title">Player Arcs</span>';
  html += '  <span class="text-[9px] text-text-muted font-bold">Signed: ' + signingHistory.length + '</span>';
  html += '</div>';
  html += '<div class="widget-body">';

  if (signingHistory.length === 0) {
    html += '  <div class="widget-empty">No players signed yet.</div>';
    html += '</div>';
    return html;
  }

  html += '  <table class="w-full text-left text-[11px] font-sans">';
  html += '    <thead>';
  html += '      <tr class="border-b border-border/40 text-[9px] text-text-muted uppercase tracking-wider">';
  html += '        <th class="pb-1 font-semibold">Player</th>';
  html += '        <th class="pb-1 font-semibold text-right">Fee</th>';
  html += '        <th class="pb-1 font-semibold text-center">Status</th>';
  html += '      </tr>';
  html += '    </thead>';
  html += '    <tbody class="divide-y divide-border/20">';

  var activeSignings = signingHistory.filter(function (sig) {
    return sig.playerName !== undefined && sig.playerName !== null;
  });

  function cleanName(name) {
    if (!name) return "";
    return name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\u00a0\s]+/g, " ");
  }

  var displaySignings = c.isExpanded ? activeSignings : activeSignings.slice(0, 4);
  displaySignings.forEach(function (sig) {
    var currentSq = null;
    var roleId = sig.roleId || "";
    var currVal = null;
    var statusText = "Sold";
    var statusColor = "bg-red-500/10 text-red-400 border border-red-500/20";
    var isLoaned = false;

    var sigNameClean = cleanName(sig.playerName);
    for (var pi = 0; pi < squad.length; pi++) {
      if (cleanName(squad[pi].Name) === sigNameClean) {
        currentSq = squad[pi];
        break;
      }
    }
    if (!currentSq && state.loanedOutPlayers) {
      for (var li = 0; li < state.loanedOutPlayers.length; li++) {
        var lop = state.loanedOutPlayers[li];
        var lopName = lop.Name || (lop.player && lop.player.Name);
        if (cleanName(lopName) === sigNameClean) {
          currentSq = lop;
          isLoaned = true;
          break;
        }
      }
    }

    if (currentSq) {
      if (roleId && typeof scorePlayerForRole === 'function') {
        var sc = scorePlayerForRole(currentSq, roleId, (c.tactic && c.tactic.instructions) || {});
        currVal = typeof PlayerUtils !== "undefined" ? PlayerUtils.slotQuality(currentSq, sc ? sc.total : 0) : (sc ? sc.total : 0);
        
        var devDelta = currVal - sig.slotQualityAtSigning;
        if (devDelta >= 1.5) {
          statusText = "★ Elite";
          statusColor = "bg-green-500/10 text-green-400 border border-green-500/20";
        } else if (devDelta >= 0.5) {
          statusText = "▲ Growth";
          statusColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
        } else if (devDelta >= -0.2) {
          statusText = "● Stable";
          statusColor = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
        } else {
          statusText = "▼ Decline";
          statusColor = "bg-orange-500/10 text-orange-400 border border-orange-500/20";
        }
        if (isLoaned) {
          statusText = "Loan";
          statusColor = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
        }
      } else {
        statusText = isLoaned ? "Loan" : "Active";
        statusColor = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      }
    } else {
      if (sig.status === 'RELEASED') {
        statusText = "Released";
        statusColor = "bg-orange-500/10 text-orange-400 border border-orange-500/20";
      } else {
        var lastCompletedWindow = state.windowCount || 1;
        if (sig.windowIndex === lastCompletedWindow) {
          statusText = "Joined";
          statusColor = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
        }
      }
    }

    var feeStr = typeof formatCurrency === 'function' ? formatCurrency(sig.fee) : sig.fee;

    html += '      <tr class="hover:bg-surface-hover/20 transition-colors">';
    html += '        <td class="py-1 font-semibold text-white truncate max-w-[65px]" title="' + esc(sig.playerName) + '">' + esc(sig.playerName) + '</td>';
    html += '        <td class="py-1 text-right text-text-secondary font-mono">£' + feeStr + '</td>';
    html += '        <td class="py-1 text-center">';
    html += '          <span class="px-1 py-0.2 rounded text-[7px] font-bold uppercase tracking-wider inline-block ' + statusColor + '">' + statusText + '</span>';
    html += '        </td>';
    html += '      </tr>';
  });

  html += '    </tbody>';
  html += '  </table>';
  html += '</div>';

  return html;
}

function renderTacticalBlueprintWidget(c) {
  var state = window.FM24State.manager;
  var report = state.report;
  if (c.hired && c.tactic && c.tactic.isComplete && !report) {
    report = typeof generateManagerReport === 'function' ? generateManagerReport(c.hired, c.tactic, c.squad) : null;
    state.report = report;
  }

  var html = '';
  html += '<div class="widget-header">';
  html += '  <span class="widget-title">Tactical Blueprint</span>';
  if (c.hired) {
    html += '  <span class="text-[9px] text-blue-400 font-bold">' + esc(c.hired['Preferred Formation'] || '') + '</span>';
  }
  html += '</div>';
  html += '<div class="widget-body text-[11px] leading-relaxed space-y-2 text-text-secondary">';

  if (!report) {
    html += '  <div class="widget-empty">Complete tactic builder to view tactical blueprint.</div>';
    html += '</div>';
    return html;
  }

  html += '  <p><strong class="text-white">Philosophy:</strong> ' + esc(report.managerSummary) + '</p>';
  html += '  <p><strong class="text-white">Squad Fit:</strong> ' + esc(report.overallFit) + '</p>';
  html += '  <div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/20">';
  html += '    <div>';
  html += '      <span class="text-[9px] font-bold text-green-400 uppercase tracking-wider block mb-0.5">Tactical Strength</span>';
  html += '      <span class="text-[10px] text-text-secondary leading-snug block ' + (c.isExpanded ? '' : 'line-clamp-2') + '">' + (report.squadStrengths[0] || 'None') + '</span>';
  html += '    </div>';
  html += '    <div>';
  html += '      <span class="text-[9px] font-bold text-red-400 uppercase tracking-wider block mb-0.5">Primary Gap</span>';
  if (report.squadGaps && report.squadGaps[0]) {
    var gap = report.squadGaps[0];
    html += '    <span class="text-[10px] text-text-secondary leading-snug block ' + (c.isExpanded ? '' : 'line-clamp-2') + '">[' + esc(gap.slotId) + '] ' + esc(gap.roleName) + '</span>';
  } else {
    html += '    <span class="text-[10px] text-text-secondary leading-snug block">None</span>';
  }
  html += '    </div>';
  html += '  </div>';
  html += '</div>';

  return html;
}

// ─── Transfer History Dashboard Widget ───
function renderTransferHistoryDashboardWidget(c) {
  var state = window.FM24State.manager;
  var history = state.windowHistory || [];

  var html = '';
  html += '<div class="widget-header">';
  html += '  <span class="widget-title">Transfer History</span>';
  html += '  <span class="text-[9px] text-text-muted font-bold">Windows: ' + history.length + '</span>';
  html += '</div>';

  if (history.length === 0) {
    html += '<div class="widget-body"><div class="widget-empty">No completed transfer windows yet.</div></div>';
    return html;
  }

  html += '<div class="widget-body">';
  if (c.isExpanded) {
    html += window.renderTransferHistoryTable(history, 'dash-');
  } else {
    // Summary table without event logs
    html += '<table class="w-full text-left text-[11px] font-mono">';
    html += '  <thead>';
    html += '    <tr class="border-b border-border/40 text-[9px] text-text-muted uppercase tracking-wider">';
    html += '      <th class="pb-1 font-semibold">Window</th>';
    html += '      <th class="pb-1 font-semibold text-right">Budget</th>';
    html += '      <th class="pb-1 font-semibold text-right">Spent</th>';
    html += '      <th class="pb-1 font-semibold text-center">Sales</th>';
    html += '      <th class="pb-1 font-semibold text-center">Signed</th>';
    html += '      <th class="pb-1 font-semibold text-right">XI Δ</th>';
    html += '    </tr>';
    html += '  </thead>';
    html += '  <tbody class="divide-y divide-border/20">';

    var displayHistory = history.slice(-4);
    displayHistory.forEach(function (w) {
      var delta = w.endSquadAvgQuality - w.startSquadAvgQuality;
      var dColor = delta >= 0 ? "text-green-400" : "text-red-400";
      var dSign = delta >= 0 ? "+" : "";
      html += '    <tr class="hover:bg-surface-hover/20 transition-colors">';
      html += '      <td class="py-1.5 font-semibold text-white">' + esc(w.label) + '</td>';
      html += '      <td class="py-1.5 text-right text-text-secondary">£' + formatCurrency(w.budget) + '</td>';
      html += '      <td class="py-1.5 text-right text-text-secondary">£' + formatCurrency(w.spent) + '</td>';
      html += '      <td class="py-1.5 text-center text-text-secondary">' + (w.salesCount !== undefined ? w.salesCount : w.sales) + '</td>';
      html += '      <td class="py-1.5 text-center text-text-secondary">' + w.signed + '</td>';
      html += '      <td class="py-1.5 text-right text-text-secondary font-mono ' + dColor + '">' + dSign + delta.toFixed(1) + '</td>';
      html += '    </tr>';
    });
    html += '  </tbody>';
    html += '</table>';
  }
  html += '</div>';

  return html;
}

// ─── renderDashboardView ───

window.renderDashboardView = function () {
  var el = document.getElementById('dashboard-content');
  if (!el) return;

  var s = window.FM24State;
  var mgr = s.manager;

  if (!mgr.hired) {
    var html = '';
    html += '<div class="flex flex-col items-center justify-center p-16 text-center border border-dashed border-border/80 rounded-xl max-w-xl mx-auto mt-12 bg-backdrop/10 shadow-lg">';
    html += '  <div class="text-4xl mb-4">📊</div>';
    html += '  <h4 class="text-sm font-bold text-white uppercase tracking-wider mb-2 font-mono">Director of Football Dashboard</h4>';
    html += '  <p class="text-xs text-text-muted mb-6 leading-relaxed">Unlock the control room dashboard containing tactical feasibility metrics, board confidence trackers, squad DNA insights, and career development arcs by hiring a head coach.</p>';
    html += '  <button onclick="FM24SwitchTab(\'manager\')" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-md">Go to Manager Selection</button>';
    html += '</div>';
    el.innerHTML = html;
    return;
  }

  var data = computeDashboardData();

  var html = '<div class="dashboard-grid">';

  for (var i = 0; i < DASHBOARD_WIDGETS.length; i++) {
    var w = DASHBOARD_WIDGETS[i];
    var bodyHtml = w.render(data);
    html += '<div class="widget-card ' + w.span + ' hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/5 transition-all cursor-zoom-in" id="widget-' + w.id + '">';
    html +=   bodyHtml.indexOf('widget-header') === -1
    ? '<div class="widget-body">' + bodyHtml + '</div>'
    : bodyHtml;
    html += '</div>';
  }

  html += '</div>';
  el.innerHTML = html;
};

// ─── renderTransfersView (Phase 2B stub) ───

window.renderTransfersView = function () {
  var el = document.getElementById('transfers-content');
  if (!el) return;

  var s = window.FM24State;
  var mgr = s.manager;

  if (!mgr.hired) {
    var html = '';
    html += '<div class="flex flex-col items-center justify-center p-16 text-center border border-dashed border-border/80 rounded-xl max-w-xl mx-auto mt-12 bg-backdrop/10 shadow-lg">';
    html += '  <div class="text-4xl mb-4">👔</div>';
    html += '  <h4 class="text-sm font-bold text-white uppercase tracking-wider mb-2 font-mono">No Hired Manager</h4>';
    html += '  <p class="text-xs text-text-muted mb-6 leading-relaxed">Before configuring budgets and running transfer window simulations, you must hire a manager from your staff exports to establish tactical requirements.</p>';
    html += '  <button onclick="FM24SwitchTab(\'manager\')" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-md">Go to Manager Selection</button>';
    html += '</div>';
    el.innerHTML = html;
    return;
  }

  // Active Simulation View integration
  if (mgr.windowActive) {
    var activeHtml = "";
    if (mgr.windowStage === 'PART_A_COMPLETE' && mgr.partAResult && !mgr.transferResultV2) {
      activeHtml = typeof renderInterventionPanel === 'function' ? renderInterventionPanel(mgr) : '<div class="widget-body"><div class="widget-empty">Intervention panel rendering error.</div></div>';
    } else if (mgr.generatedTactic || mgr.transferResultV2 || mgr.transferResult) {
      activeHtml = typeof renderResultsStep === 'function' ? renderResultsStep(mgr) : '<div class="widget-body"><div class="widget-empty">Results step rendering error.</div></div>';
    } else {
      activeHtml = '<div class="widget-body"><div class="widget-empty">Active window simulation in progress...</div></div>';
    }
    el.innerHTML = '<div class="p-4 md:p-6 space-y-6">' + activeHtml + '</div>';
    return;
  }

  var state = mgr;
  var history = state.windowHistory || [];
  var squad = s.squad;
  var market = s.market;
  var hasSquad = squad && squad.length > 0;
  var hasMarket = market && market.length > 0;

  var html = '<div class="p-4 md:p-6 space-y-6">';

  html += '  <div class="bg-surface border border-border/60 rounded-xl p-5 flex flex-col gap-4 shadow-lg">';
  html += '    <div class="flex items-center justify-between border-b border-border/20 pb-3">';
  html += '      <div>';
  html += '        <h4 class="text-xs font-bold text-white uppercase tracking-wider mb-0.5">Prepare Transfer Window</h4>';
  html += '        <p class="text-[11px] text-text-muted">Configure budgets and upload recent FM24 exports to run the window analysis.</p>';
  html += '      </div>';
  html += '      <span class="px-2.5 py-1 bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20 text-[9px] rounded-full uppercase tracking-wider">Window #' + (history.length + 1) + '</span>';
  html += '    </div>';

  // Config grid
  html += '    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">';

  // Operational Model (Read-only representation syncing from state.mode)
  if (!state.mode) state.mode = 'head_coach';
  var modeLabel = state.mode === 'full_manager' ? 'Full Manager' : 'Head Coach';
  var modeDesc = state.mode === 'full_manager'
    ? 'Manager dictates transfer decisions based on their personality archetype. Simulates complete window.'
    : 'Focuses strictly on match tactics, squad fit, and team selections. DoF retains final transfer decisions.';
  var disableRecs = state.disableCoachRecs === true;

  html += '      <div class="flex flex-col gap-2.5">';
  html += '        <div class="flex flex-col gap-2 bg-backdrop/20 border border-border/40 p-4 rounded-xl relative justify-between">';
  html += '          <div class="flex items-center justify-between">';
  html += '            <span class="text-[10px] text-text-muted uppercase font-bold tracking-wider">Active Operational Model</span>';
  html += '            <button onclick="FM24SwitchTab(\'manager\')" class="text-[9px] text-blue-400 hover:text-blue-300 font-bold uppercase transition-colors">Change Profile</button>';
  html += '          </div>';
  html += '          <div class="flex items-center justify-between mt-1">';
  html += '            <span class="text-xs font-extrabold text-white">' + modeLabel + '</span>';
  html += '            <span class="text-[9px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold uppercase">Hired Role</span>';
  html += '          </div>';
  html += '          <p class="text-[10px] text-text-secondary leading-relaxed mt-1">' + modeDesc + '</p>';
  html += '        </div>';
  html += '        <div class="mt-1 flex items-center gap-2 bg-backdrop/30 border border-border/40 p-2.5 rounded-lg">';
  html += '          <input type="checkbox" id="disable-coach-recs-checkbox" ' + (disableRecs ? 'checked' : '') + ' class="accent-blue-500 w-3.5 h-3.5">';
  html += '          <div class="flex flex-col">';
  html += '            <label for="disable-coach-recs-checkbox" class="text-[11px] font-bold text-white cursor-pointer select-none">Disable Coach Transfer Recommendations</label>';
  html += '            <span class="text-[9px] text-text-secondary leading-normal">Hired coach will not make automated recommendations.</span>';
  html += '          </div>';
  html += '        </div>';
  html += '      </div>';

  // Budgets
  html += '      <div class="flex flex-col gap-3">';
  html += '        <span class="text-[10px] text-white uppercase font-bold tracking-wider">Financial Budgets</span>';
  html += '        <div class="flex flex-col gap-1">';
  html += '          <div class="flex items-center justify-between text-[11px]">';
  html += '            <span class="text-text-secondary">Transfer Budget</span>';
  html += '            <span id="budget-display" class="text-green-400 font-bold">£' + (typeof formatCurrency === 'function' ? formatCurrency(state.budget || 50000000) : (state.budget || 50000000).toLocaleString()) + '</span>';
  html += '          </div>';
  html += '          <div class="flex gap-1.5">';
  html += '            <input id="transfer-budget-input" type="number" min="0" max="500000000" step="5000000" value="' + (state.budget || 50000000) + '" class="flex-1 text-[11px] bg-backdrop border border-border rounded px-2.5 py-1 text-white focus:outline-none focus:border-border">';
  html += '            <button id="btn-budget-minus" class="px-2 py-0.5 bg-border/40 hover:bg-border text-white rounded text-[10px] transition-colors font-medium">-10M</button>';
  html += '            <button id="btn-budget-plus" class="px-2 py-0.5 bg-border/40 hover:bg-border text-white rounded text-[10px] transition-colors font-medium">+10M</button>';
  html += '          </div>';
  html += '        </div>';
  html += '        <div class="flex flex-col gap-1">';
  html += '          <div class="flex items-center justify-between text-[11px]">';
  html += '            <span class="text-text-secondary">Weekly Wage Budget</span>';
  html += '            <span id="wage-budget-display" class="text-green-400 font-bold">£' + (typeof formatCurrency === 'function' ? formatCurrency(state.wageBudget || 500000) : (state.wageBudget || 500000).toLocaleString()) + ' p/w</span>';
  html += '          </div>';
  html += '          <div class="flex gap-1.5">';
  html += '            <input id="wage-budget-input" type="number" min="0" max="5000000" step="50000" value="' + (state.wageBudget || 500000) + '" class="flex-1 text-[11px] bg-backdrop border border-border rounded px-2.5 py-1 text-white focus:outline-none focus:border-border">';
  html += '            <button id="btn-wage-minus" class="px-2 py-0.5 bg-border/40 hover:bg-border text-white rounded text-[10px] transition-colors font-medium">-50K</button>';
  html += '            <button id="btn-wage-plus" class="px-2 py-0.5 bg-border/40 hover:bg-border text-white rounded text-[10px] transition-colors font-medium">+50K</button>';
  html += '          </div>';
  html += '        </div>';
  html += '      </div>';
  html += '    </div>';

  // Data asset uploads
  html += '    <div class="border-t border-border/20 pt-4 mt-1 grid grid-cols-1 md:grid-cols-2 gap-4">';
  html += '      <div class="border border-border/80 rounded-xl p-3.5 bg-backdrop/20 flex flex-col gap-2.5">';
  html += '        <div class="flex items-center justify-between">';
  html += '          <span class="text-[11px] font-bold text-white flex items-center gap-1.5"><span class="w-2 h-2 rounded-full ' + (hasSquad ? 'bg-green-500' : 'bg-red-500') + '"></span>Squad Database</span>';
  html += '          <span class="text-[9px] ' + (hasSquad ? 'text-green-400' : 'text-red-400') + ' font-bold uppercase">' + (hasSquad ? 'Loaded' : 'Required') + '</span>';
  html += '        </div>';
  if (hasSquad) {
    html += '        <div class="flex items-center justify-between text-xs bg-surface p-2 rounded border border-border/40">';
    html += '          <span class="text-text-secondary truncate text-[10px]">\u2713 ' + squad.length + ' Players Synced</span>';
    html += '          <button id="change-squad-analyse-btn" class="px-2.5 py-0.5 bg-border/40 hover:bg-border text-white text-[9px] font-bold rounded transition-colors">Replace</button>';
    html += '        </div>';
  } else {
    html += '        <div class="border border-dashed border-border/60 rounded-lg p-4 text-center bg-backdrop/35 relative" id="manager-squad-upload">';
    html += '          <p class="text-[10px] font-bold text-white mt-1">Upload Squad HTML</p>';
    html += '          <input type="file" accept=".html,.htm" class="absolute inset-0 opacity-0 cursor-pointer">';
    html += '        </div>';
  }
  html += '      </div>';
  html += '      <div class="border border-border/80 rounded-xl p-3.5 bg-backdrop/20 flex flex-col gap-2.5">';
  html += '        <div class="flex items-center justify-between">';
  html += '          <span class="text-[11px] font-bold text-white flex items-center gap-1.5"><span class="w-2 h-2 rounded-full ' + (hasMarket ? 'bg-green-500' : 'bg-text-muted') + '"></span>Market Shortlist</span>';
  html += '          <span class="text-[9px] ' + (hasMarket ? 'text-green-400' : 'text-text-muted') + ' font-bold uppercase">' + (hasMarket ? 'Loaded' : 'Optional') + '</span>';
  html += '        </div>';
  if (hasMarket) {
    html += '        <div class="flex items-center justify-between text-xs bg-surface p-2 rounded border border-border/40">';
    html += '          <span class="text-text-secondary truncate text-[10px]">\u2713 ' + market.length + ' Candidates Synced</span>';
    html += '          <button id="change-market-analyse-btn" class="px-2.5 py-0.5 bg-border/40 hover:bg-border text-white text-[9px] font-bold rounded transition-colors">Replace</button>';
    html += '        </div>';
  } else {
    html += '        <div class="border border-dashed border-border/60 rounded-lg p-4 text-center bg-backdrop/35 relative" id="manager-market-upload">';
    html += '          <p class="text-[10px] font-bold text-white mt-1">Upload Shortlist HTML</p>';
    html += '          <input type="file" accept=".html,.htm" class="absolute inset-0 opacity-0 cursor-pointer">';
    html += '        </div>';
  }
  html += '      </div>';
  html += '    </div>';

  // Execute button
  var canAnalyse = hasSquad && state.mode;
  var btnClass = canAnalyse ? 'bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer' : 'bg-surface-hover text-text-muted border border-border cursor-not-allowed';
  html += '    <div class="flex justify-end mt-2">';
  html += '      <button id="analyse-btn" class="w-full md:w-auto text-xs px-6 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ' + btnClass + '" ' + (canAnalyse ? '' : 'disabled') + '>';
  html += '        <span>Open Transfer Window & Execute Analysis</span>';
  html += '      </button>';
  html += '    </div>';
  html += '  </div>';
  html += '  <div id="bid-consultation-container"></div>';
  html += '</div>';

  el.innerHTML = html;
};

// Wire up Click-to-Expand for Dashboard Widgets
if (typeof document !== 'undefined') {
  document.addEventListener('click', function (e) {
    var card = e.target.closest('.widget-card');
    if (!card) return;
    
    // Ignore clicks on buttons/inputs/links inside the card
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('a') || e.target.classList.contains('cursor-pointer') || e.target.getAttribute('onclick')) {
      return;
    }
    
    if (card.id && card.id.indexOf('widget-') === 0) {
      var widgetId = card.id.substring(7);
      var widgetObj = DASHBOARD_WIDGETS.find(function (w) { return w.id === widgetId; });
      if (widgetObj) {
        var modal = document.getElementById('widget-expanded-modal');
        var titleEl = document.getElementById('widget-expanded-title');
        var bodyEl = document.getElementById('widget-expanded-body');
        if (modal && titleEl && bodyEl) {
          var data = computeDashboardData();
          data.isExpanded = true;
          var content = widgetObj.render(data);
          
          var title = widgetObj.id.replace(/-/g, ' ').toUpperCase();
          var tempDiv = document.createElement('div');
          tempDiv.innerHTML = content;
          var titleSpan = tempDiv.querySelector('.widget-title');
          if (titleSpan) {
            title = titleSpan.textContent;
            var header = tempDiv.querySelector('.widget-header');
            if (header) {
              header.parentNode.removeChild(header);
            }
          }
          
          titleEl.textContent = title;
          bodyEl.innerHTML = '<div class="expanded-widget-content">' + tempDiv.innerHTML + '</div>';
          modal.classList.remove('hidden');
        }
      }
    }
  });

  document.addEventListener('click', function (e) {
    if (e.target.id === 'widget-expanded-close' || e.target.id === 'widget-expanded-modal') {
      var modal = document.getElementById('widget-expanded-modal');
      if (modal) modal.classList.add('hidden');
    }
  });
}

})();
