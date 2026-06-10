function footStrengthToNumber(val) {
  if (val === "Very Strong") return 5;
  if (val === "Strong") return 4;
  if (val === "Fairly Strong") return 3;
  if (val === "Reasonable") return 2;
  if (val === "Weak") return 1;
  return 0;
}

function parseAP(val) {
  if (!val) return { AP: 0, APDisplay: "" };
  var s = val.replace(/^£/, "").trim();
  var orig = val.trim();
  var num = 0;
  if (s.slice(-1) === "M") {
    num = parseFloat(s.slice(0, -1)) * 1000000;
  } else if (s.slice(-1) === "K") {
    num = parseFloat(s.slice(0, -1)) * 1000;
  } else {
    num = parseFloat(s) || 0;
  }
  return { AP: num, APDisplay: orig };
}

function parseWage(val) {
  if (!val) return { Wage: 0, WageDisplay: "" };
  var s = val.replace(/^£/, "").replace(/,/g, "").trim();
  var orig = val.trim();
  var parts = s.split(" p/w");
  var num = parseFloat(parts[0]) || 0;
  return { Wage: num, WageDisplay: orig };
}

function parsePositions(positionString) {
  if (!positionString || typeof positionString !== "string") {
    return { raw: "", strata: [], flanks: [] };
  }
  var raw = positionString.trim();
  var segments = raw.split(",").map(function (s) { return s.trim(); }).filter(Boolean);

  var simpleMap = {
    GK: { strata: ["GK"], flanks: ["C"] },
    DM: { strata: ["DM"], flanks: ["C"] }
  };

  var flankMap = {
    D: {
      C: { strata: ["DC"], flanks: ["C"] },
      R: { strata: ["WD"], flanks: ["R"] },
      L: { strata: ["WD"], flanks: ["L"] },
      RC: { strata: ["DC", "WD"], flanks: ["R", "C"] },
      LC: { strata: ["DC", "WD"], flanks: ["L", "C"] },
      RL: { strata: ["DC", "WD"], flanks: ["R", "L"] },
      RLC: { strata: ["DC", "WD"], flanks: ["R", "L", "C"] }
    },
    "D/WB": {
      R: { strata: ["WD", "WB"], flanks: ["R"] },
      L: { strata: ["WD", "WB"], flanks: ["L"] },
      RL: { strata: ["WD", "WB"], flanks: ["R", "L"] }
    },
    WB: {
      R: { strata: ["WD", "WB"], flanks: ["R"] },
      L: { strata: ["WD", "WB"], flanks: ["L"] },
      RL: { strata: ["WD", "WB"], flanks: ["R", "L"] }
    },
    M: {
      C: { strata: ["CM"], flanks: ["C"] },
      R: { strata: ["WM"], flanks: ["R"] },
      L: { strata: ["WM"], flanks: ["L"] },
      RC: { strata: ["CM", "WM"], flanks: ["R", "C"] },
      LC: { strata: ["CM", "WM"], flanks: ["L", "C"] },
      RL: { strata: ["WM"], flanks: ["R", "L"] },
      RLC: { strata: ["CM", "WM"], flanks: ["R", "L", "C"] }
    },
    AM: {
      C: { strata: ["AMC"], flanks: ["C"] },
      R: { strata: ["WA"], flanks: ["R"] },
      L: { strata: ["WA"], flanks: ["L"] },
      RL: { strata: ["WA"], flanks: ["R", "L"] },
      RC: { strata: ["WA", "AMC"], flanks: ["R", "C"] },
      LC: { strata: ["WA", "AMC"], flanks: ["L", "C"] },
      RLC: { strata: ["WA", "AMC"], flanks: ["R", "L", "C"] }
    },
    ST: {
      C: { strata: ["ST"], flanks: ["C"] }
    }
  };

  var allStrata = {};
  var allFlanks = {};

  segments.forEach(function (seg) {
    var match = seg.match(/^([A-Z/]+?)(?:\s*\(([A-Z]+)\))?$/);
    if (!match) return;
    var base = match[1];
    var flankCode = match[2];

    // Handle compound positions like "M/AM", "DM/M", "AM/ST" by splitting
    if (base.indexOf('/') !== -1) {
      var parts = base.split('/');
      parts.forEach(function (part) {
        if (simpleMap[part]) {
          simpleMap[part].strata.forEach(function (s) { allStrata[s] = true; });
          simpleMap[part].flanks.forEach(function (f) { allFlanks[f] = true; });
        } else if (flankCode && flankMap[part] && flankMap[part][flankCode]) {
          flankMap[part][flankCode].strata.forEach(function (s) { allStrata[s] = true; });
          flankMap[part][flankCode].flanks.forEach(function (f) { allFlanks[f] = true; });
        } else if (flankMap[part] && flankMap[part].C) {
          flankMap[part].C.strata.forEach(function (s) { allStrata[s] = true; });
          flankMap[part].C.flanks.forEach(function (f) { allFlanks[f] = true; });
        }
      });
      return;
    }

    if (!flankCode && simpleMap[base]) {
      simpleMap[base].strata.forEach(function (s) { allStrata[s] = true; });
      simpleMap[base].flanks.forEach(function (f) { allFlanks[f] = true; });
      return;
    }

    flankCode = flankCode || "C";
    var entry = flankMap[base] && flankMap[base][flankCode];
    if (!entry) {
      if (simpleMap[base]) {
        entry = simpleMap[base];
      } else {
        var fallback = flankMap[base] && flankMap[base].C;
        if (fallback) entry = fallback;
      }
    }
    if (!entry) return;
    entry.strata.forEach(function (s) { allStrata[s] = true; });
    entry.flanks.forEach(function (f) { allFlanks[f] = true; });
  });

  return {
    raw: raw,
    strata: Object.keys(allStrata),
    flanks: Object.keys(allFlanks)
  };
}

var FM24_ATTRIBUTES = [
  "1v1","Acc","Aer","Agg","Agi","Ant","Bal","Bra","Cmd","Cnt","Cmp",
  "Cro","Dec","Det","Dri","Fin","Fir","Fla","Han","Hea","Jum","Kic",
  "Ldr","Lon","Mar","OtB","Pac","Pas","Pos","Ref","Sta","Str","Tck",
  "Tea","Tec","Thr","TRO","Vis","Wor","Com","Fre","Ecc","Pun","Cons",
  "Prof","Imp M","Cor"
];

function parseSquadHTML(htmlText, onProgress) {
  return new Promise(function (resolve) {
    var doc = new DOMParser().parseFromString(htmlText, "text/html");
    var allRows = doc.querySelectorAll("tr");
    var headers = [];
    var dataRows = [];

    // Try <th> headers first
    var headerCells = doc.querySelectorAll("tr th");
    if (headerCells.length > 0) {
      headerCells.forEach(function (th) {
        headers.push(th.textContent.trim());
      });
      allRows.forEach(function (tr) {
        if (tr.querySelector("td")) {
          dataRows.push(tr);
        }
      });
    } else {
      // Fallback: first row's <td> cells are headers
      if (allRows.length > 0) {
        var firstRow = allRows[0];
        firstRow.querySelectorAll("td").forEach(function (td) {
          headers.push(td.textContent.trim());
        });
        for (var ri = 1; ri < allRows.length; ri++) {
          if (allRows[ri].querySelector("td")) {
            dataRows.push(allRows[ri]);
          }
        }
      }
    }

    var players = [];
    var CHUNK_SIZE = 50;
    var idx = 0;

    function processChunk() {
      var limit = Math.min(idx + CHUNK_SIZE, dataRows.length);
      for (; idx < limit; idx++) {
        var tr = dataRows[idx];
        var cells = tr.querySelectorAll("td");
        var player = {};

        headers.forEach(function (h, i) {
          var val = cells[i] ? cells[i].textContent.trim() : "";
          player[h] = val;
        });

        if (!player.Name) continue;

        // Parse Age
        player.Age = parseInt(player.Age, 10);
        if (isNaN(player.Age)) player.Age = 0;

        // Parse CA/PA
        player.CA = parseInt(player["Cur Ability"] || player["CA"] || player["Current Ability"] || "-1", 10);
        player.PA = parseInt(player["Pot Ability"] || player["PA"] || player["Potential Ability"] || "-1", 10);

        // Parse AP
        var apResult = parseAP(player.AP);
        player.AP = apResult.AP;
        player.APDisplay = apResult.APDisplay;

        // Parse Wage
        var wageResult = parseWage(player.Wage);
        player.Wage = wageResult.Wage;
        player.WageDisplay = wageResult.WageDisplay;

        // Parse foot strength
        player.LeftFootScore = footStrengthToNumber(player["Left Foot"]);
        player.RightFootScore = footStrengthToNumber(player["Right Foot"]);

        // Parse attributes (use headers to find them)
        FM24_ATTRIBUTES.forEach(function (attr) {
          var ai = headers.indexOf(attr);
          if (ai !== -1 && cells[ai]) {
            var v = parseInt(cells[ai].textContent.trim(), 10);
            player[attr] = isNaN(v) ? 0 : v;
          } else {
            player[attr] = 0;
          }
        });

        // Parse positions and attach strata/flanks
        var posInfo = parsePositions(player.Position);
        player.strata = posInfo.strata;
        player.flanks = posInfo.flanks;

        players.push(player);
      }

      if (typeof onProgress === "function") {
        onProgress(idx, dataRows.length);
      }

      if (idx < dataRows.length) {
        setTimeout(processChunk, 0);
      } else {
        resolve(players);
      }
    }

    setTimeout(processChunk, 0);
  });
}

function parseMarketHTML(htmlText, onProgress) {
  return parseSquadHTML(htmlText, onProgress);
}
