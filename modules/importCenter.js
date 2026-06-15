// ─── IMPORT CENTER MODULE ───

function showImportCenter() {
  var overlay = document.getElementById("import-center-overlay");
  if (!overlay) return;
  overlay.classList.remove("hidden", "fade-out");

  var zonesContainer = document.getElementById("import-center-zones");
  if (!zonesContainer) return;

  var isDof = window.FM24State.appMode === "dof";
  var hasSquad = window.FM24State.squad.length > 0;
  var hasStaff = isDof && window.FM24State.manager.roster.length > 0;
  var hasMarket = window.FM24State.market.length > 0;
  var squadLabel = hasSquad ? "Loaded squad (" + window.FM24State.squad.length + " players)" : "";
  var staffLabel = hasStaff ? "Loaded staff (" + window.FM24State.manager.roster.length + ")" : "";
  var marketLabel = hasMarket ? "Loaded market (" + window.FM24State.market.length + " players)" : "";

  var html = "";

  // Squad row
  html += buildImportCenterRow("ic-squad", "Squad Export", true, false, hasSquad, squadLabel);

  // Staff row (only in DOF mode)
  html += buildImportCenterRow("ic-staff", "Staff Export", isDof, !isDof, hasStaff, staffLabel);

  // Market row
  html += buildImportCenterRow("ic-market", "Market Export", false, false, hasMarket, marketLabel);

  zonesContainer.innerHTML = html;

  // Wire upload handlers
  wireImportUpload("ic-squad-zone", "squad");
  if (isDof) wireImportUpload("ic-staff-zone", "staff");
  wireImportUpload("ic-market-zone", "market");

  // Pre-mark zones if data already exists
  if (hasSquad) markImportRowDone("ic-squad-zone", squadLabel);
  if (hasStaff) markImportRowDone("ic-staff-zone", staffLabel);
  if (hasMarket) markImportRowDone("ic-market-zone", marketLabel);

  // Wire close buttons
  var closeBtn = document.getElementById("import-center-close");
  var doneBtn = document.getElementById("import-center-done-btn");
  if (closeBtn) closeBtn.addEventListener("click", hideImportCenter);
  if (doneBtn) doneBtn.addEventListener("click", hideImportCenter);

  // Click outside to close
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) hideImportCenter();
  });
}

function buildImportCenterRow(prefix, label, visible, required, hasData, statusText) {
  var doneClass = hasData ? " done" : "";
  var html = "";
  html += '<div class="import-row' + (visible ? "" : " hidden") + '" id="' + prefix + '-row">';
  html += '  <div class="import-label">' + label + (required ? ' <span class="text-red-400">*</span>' : '') + '</div>';
  html += '  <div class="import-zone' + doneClass + '" id="' + prefix + '-zone">';
  html += '    <input type="file" accept=".html,.htm" class="import-file-input">';
  html += '    <span class="import-placeholder' + (hasData ? " hidden" : "") + '">Drop file or click to upload</span>';
  html += '    <span class="import-filename' + (hasData ? "" : " hidden") + '">' + statusText + '</span>';
  html += '    <span class="import-check' + (hasData ? "" : " hidden") + '">&#10003;</span>';
  html += '    <div class="import-progress hidden"><div class="import-progress-bar" id="' + prefix + '-progress"></div></div>';
  html += '  </div>';
  html += '</div>';
  return html;
}

function hideImportCenter() {
  var overlay = document.getElementById("import-center-overlay");
  if (!overlay) return;
  overlay.classList.add("fade-out");
  setTimeout(function () {
    overlay.classList.add("hidden");
    overlay.classList.remove("fade-out");
  }, 400);
}
