(function (global) {
  "use strict";

  function generateIncomingBids(squad, simulationState) {
    var bids = [];
    if (!squad || squad.length === 0) return bids;

    var surplusList = simulationState.surplusPool || [];
    var surplusNames = {};
    surplusList.forEach(function (item) {
      var name = item.player ? item.player.Name : item.Name;
      if (name) surplusNames[name] = true;
    });

    squad.forEach(function (player) {
      if (!player) return;
      var ca = player.CA || 0;
      var fitScore = player.fitScore || 0;
      var dynamicThreshold = simulationState.dynamicThreshold || 11;
      var isAttractive = ca >= 130;
      var isSurplus = !!surplusNames[player.Name];
      var isMisfitted = player.fitScore !== undefined && fitScore < dynamicThreshold - 1.0;
      var isProtected = player.status === 'PROTECTED';

      // Rivals target weak slots — only consider surplus or misfit players with CA >= 120,
      // or attractive players with CA >= 130
      if (!isAttractive && !isSurplus && !isMisfitted) return;
      // Protected players are almost invisible to rivals
      if (isProtected && Math.random() > 0.1) return;

      var bidChance = 0;
      if (ca >= 160) bidChance += 0.45;
      else if (ca >= 145) bidChance += 0.28;
      else if (ca >= 130) bidChance += 0.14;

      // Surplus players flagged for sale are highly visible
      if (isSurplus) bidChance += 0.20;

      // Misfitted players (fitScore < dynamicThreshold - 1.0) are seen as vulnerable
      // Rivals sense dissatisfaction — increased weight
      if (isMisfitted) {
        var misfitDepth = (dynamicThreshold - fitScore) / dynamicThreshold;
        bidChance += 0.10 + Math.min(0.25, misfitDepth * 0.3);
      }

      // Highly attractive players draw more attention
      if (ca >= 160) bidChance += 0.05;

      // Protected penalty
      if (isProtected) bidChance *= 0.15;

      if (Math.random() > bidChance) return;

      var bidMultiplier = 0.75 + Math.random() * 0.25;
      var bidAmount = Math.round((player.AP || 0) * bidMultiplier);

      if (bidAmount <= 0) return;

      var club = typeof getRealisticClubForPlayer === "function"
        ? getRealisticClubForPlayer(player, "incoming")
        : generateRivalClubLabel(ca);

      bids.push({
        player: player,
        bidAmount: bidAmount,
        biddingClub: club,
        rivalClub: club,
        clubName: club,
        bidType: bidAmount >= (player.AP || 0) * 0.90 ? 'STRONG' : 'OPENER',
        dofDecision: null
      });
    });

    return bids;
  }

  function generateRivalClubLabel(ca) {
    if (typeof getRealisticClubForPlayer === "function") {
      return getRealisticClubForPlayer({ CA: ca, Name: "Rival Target" }, "rival-label");
    }
    var band = ca >= 160 ? 'elite' : ca >= 145 ? 'challenger' : 'continental';
    var clubNames = {
      elite:       ['Real Madrid', 'Manchester City', 'Paris Saint-Germain', 'Bayern Munich'],
      challenger:  ['Atletico Madrid', 'Borussia Dortmund', 'Tottenham Hotspur', 'Chelsea'],
      continental: ['West Ham United', 'Everton', 'Fiorentina', 'Marseille', 'Lille']
    };
    // Use persistent name if already assigned to this band
    var state = typeof window !== "undefined" && window.FM24State ? window.FM24State : null;
    if (state && state.rivalClubs && state.rivalClubs[band]) {
      return state.rivalClubs[band];
    }
    // Assign a random name from the pool and persist it
    var pool = clubNames[band];
    var chosen = pool[Math.floor(Math.random() * pool.length)];
    if (state) {
      if (!state.rivalClubs) state.rivalClubs = {};
      state.rivalClubs[band] = chosen;
    }
    return chosen;
  }

  function dofNegotiate(bid, player) {
    if (!bid || !player) return { outcome: 'REJECTED', reason: 'Invalid bid' };
    var targetFee = Math.round((player.AP || 0) * 0.92);

    if (bid.bidAmount >= targetFee) {
      return { outcome: 'SOLD', fee: bid.bidAmount };
    }

    var counter = player.AP || 0;
    var rivalResponse = Math.round(counter * (0.82 + Math.random() * 0.15));

    if (rivalResponse >= targetFee) {
      return { outcome: 'SOLD', fee: rivalResponse };
    }

    return { outcome: 'REJECTED', reason: 'Below DoF minimum' };
  }

  global.generateIncomingBids = generateIncomingBids;
  global.generateRivalClubLabel = generateRivalClubLabel;
  global.dofNegotiate = dofNegotiate;

})(typeof window !== "undefined" ? window : global);
