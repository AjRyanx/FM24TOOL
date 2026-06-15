(function (global) {
  "use strict";

  var CLUBS_DATABASE = {
    elite: [
      "Real Madrid",
      "Barcelona",
      "Paris Saint-Germain",
      "Manchester City",
      "Arsenal",
      "Liverpool",
      "Manchester United",
      "Bayern Munich",
      "Juventus",
      "Inter Milan",
      "AC Milan"
    ],
    challenger: [
      "Atletico Madrid",
      "Borussia Dortmund",
      "Bayer Leverkusen",
      "Tottenham Hotspur",
      "Chelsea",
      "Newcastle United",
      "Aston Villa",
      "Napoli",
      "Lazio",
      "Roma",
      "Porto",
      "Benfica",
      "Sporting CP",
      "Ajax"
    ],
    midTable: [
      "West Ham United",
      "Everton",
      "Crystal Palace",
      "Fulham",
      "Brighton",
      "Wolves",
      "Brentford",
      "Real Betis",
      "Real Sociedad",
      "Villarreal",
      "Sevilla",
      "Athletic Bilbao",
      "Fiorentina",
      "Bologna",
      "Torino",
      "Eintracht Frankfurt",
      "Wolfsburg",
      "Borussia Mönchengladbach",
      "Lille",
      "Monaco",
      "Marseille",
      "Lyon"
    ],
    lowerLeague: [
      "Leicester City",
      "Leeds United",
      "Southampton",
      "Ipswich Town",
      "Burnley",
      "Watford",
      "Norwich City",
      "Sunderland",
      "West Brom",
      "Espanyol",
      "Real Valladolid",
      "Parma",
      "Genoa",
      "Sampdoria",
      "St. Pauli",
      "Schalke 04",
      "FC Köln",
      "Auxerre",
      "Saint-Etienne",
      "Celtic",
      "Rangers",
      "Feyenoord",
      "PSV Eindhoven"
    ]
  };

  var DYNAMIC_CLUBS_DATABASE = null;
  var lastSquadLength = -1;
  var lastMarketLength = -1;
  var lastFirstPlayerName = "";

  function rebuildDynamicClubs() {
    var squad = (global.FM24State && global.FM24State.squad) || [];
    var market = (global.FM24State && global.FM24State.market) || [];
    var allPlayers = squad.concat(market);

    // Group players by club
    var clubPlayers = {};
    for (var i = 0; i < allPlayers.length; i++) {
      var p = allPlayers[i];
      var club = p.Club || p.club;
      if (!club || club === "Free Agent" || club === "Free Agency" || club === "None") continue;

      if (!clubPlayers[club]) {
        clubPlayers[club] = [];
      }

      var ca = parseInt(p.CA, 10);
      if (isNaN(ca) || ca <= 0) {
        var ap = p.AP || 0;
        if (ap >= 50000000) ca = 160;
        else if (ap >= 30000000) ca = 145;
        else if (ap >= 15000000) ca = 130;
        else ca = 110;
      }
      clubPlayers[club].push(ca);
    }

    var clubs = Object.keys(clubPlayers);
    if (clubs.length < 15) {
      // Not enough unique clubs in uploaded save/market data, use hardcoded real-world default database
      DYNAMIC_CLUBS_DATABASE = null;
      return;
    }

    // For each club, calculate score: average of top 8 players' CA (or all if less than 8)
    var ratedClubs = [];
    for (var j = 0; j < clubs.length; j++) {
      var name = clubs[j];
      var cas = clubPlayers[name];
      cas.sort(function (a, b) { return b - a; });
      var topCount = Math.min(cas.length, 8);
      var sum = 0;
      for (var k = 0; k < topCount; k++) {
        sum += cas[k];
      }
      var avg = topCount > 0 ? (sum / topCount) : 100;
      ratedClubs.push({ name: name, score: avg });
    }

    // Sort clubs by score descending
    ratedClubs.sort(function (a, b) { return b.score - a.score; });

    var elite = [];
    var challenger = [];
    var midTable = [];
    var lowerLeague = [];

    // Distribute into tiers based on score thresholds
    for (var m = 0; m < ratedClubs.length; m++) {
      var rc = ratedClubs[m];
      if (rc.score >= 148) {
        elite.push(rc.name);
      } else if (rc.score >= 135) {
        challenger.push(rc.name);
      } else if (rc.score >= 118) {
        midTable.push(rc.name);
      } else {
        lowerLeague.push(rc.name);
      }
    }

    // Safeguard: if any tier ends up empty (e.g. all players have low CA), fall back to division by percentiles
    if (elite.length === 0 || challenger.length === 0 || midTable.length === 0 || lowerLeague.length === 0) {
      elite = [];
      challenger = [];
      midTable = [];
      lowerLeague = [];

      var total = ratedClubs.length;
      var eliteEnd = Math.max(1, Math.round(total * 0.15));
      var chalEnd = Math.max(eliteEnd + 1, Math.round(total * 0.40));
      var midEnd = Math.max(chalEnd + 1, Math.round(total * 0.75));

      for (var n = 0; n < total; n++) {
        var name = ratedClubs[n].name;
        if (n < eliteEnd) elite.push(name);
        else if (n < chalEnd) challenger.push(name);
        else if (n < midEnd) midTable.push(name);
        else lowerLeague.push(name);
      }
    }

    DYNAMIC_CLUBS_DATABASE = {
      elite: elite,
      challenger: challenger,
      midTable: midTable,
      lowerLeague: lowerLeague
    };

    console.log("Dynamically built club database from imported data:", {
      elite: elite.length,
      challenger: challenger.length,
      midTable: midTable.length,
      lowerLeague: lowerLeague.length
    });
  }

  // Force rebuild on import events
  if (typeof window !== "undefined") {
    window.addEventListener("fm24:squad-loaded", function () { DYNAMIC_CLUBS_DATABASE = null; });
    window.addEventListener("fm24:market-loaded", function () { DYNAMIC_CLUBS_DATABASE = null; });
  }

  function hashString(str) {
    var hash = 0;
    if (!str) return hash;
    for (var i = 0; i < str.length; i++) {
      var chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  function getRealisticClubForPlayer(player, salt) {
    if (!player) return "Unknown Club";
    var name = player.Name || player.name || "Unknown Player";
    var ca = parseInt(player.CA, 10);
    if (isNaN(ca) || ca <= 0) {
      // Fallback: estimate CA based on AP (market value) if CA is missing/invalid
      var ap = player.AP || 0;
      if (ap >= 50000000) ca = 160;
      else if (ap >= 30000000) ca = 145;
      else if (ap >= 15000000) ca = 130;
      else ca = 110;
    }

    // Dynamic extraction check
    var currentSquad = (global.FM24State && global.FM24State.squad) || [];
    var currentMarket = (global.FM24State && global.FM24State.market) || [];
    var firstPlayerName = (currentSquad[0] && currentSquad[0].Name) || "";

    if (DYNAMIC_CLUBS_DATABASE === null ||
        currentSquad.length !== lastSquadLength ||
        currentMarket.length !== lastMarketLength ||
        firstPlayerName !== lastFirstPlayerName) {
      rebuildDynamicClubs();
      lastSquadLength = currentSquad.length;
      lastMarketLength = currentMarket.length;
      lastFirstPlayerName = firstPlayerName;
    }

    var activeDatabase = DYNAMIC_CLUBS_DATABASE || CLUBS_DATABASE;

    var tier = "lowerLeague";
    if (ca >= 155) {
      tier = "elite";
    } else if (ca >= 140) {
      tier = "challenger";
    } else if (ca >= 120) {
      tier = "midTable";
    }

    var pool = activeDatabase[tier];
    var hashVal = hashString(name + (salt || ""));
    var index = hashVal % pool.length;
    return pool[index];
  }

  global.getRealisticClubForPlayer = getRealisticClubForPlayer;

})(typeof window !== "undefined" ? window : global);
