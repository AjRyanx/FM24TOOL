const INSTRUCTION_WEIGHT_MODIFIERS = {
  // ── DEFENSIVE LINE ──
  "defensiveLine:Much Higher": { Pac: +2, Acc: +2, Pos: +1 },
  "defensiveLine:Higher": { Pac: +1, Acc: +1 },
  "defensiveLine:Standard": {},
  "defensiveLine:Lower": { Pac: -1, Str: +1, Pos: +1 },
  "defensiveLine:Much Lower": { Pac: -2, Str: +2, Jum: +1, Pos: +2 },

  // ── LINE OF ENGAGEMENT ──
  "lineOfEngagement:High": { Wor: +2, Sta: +2, Pac: +1, Agg: +1 },
  "lineOfEngagement:Mid block": {},
  "lineOfEngagement:Low": { Wor: -1, Pos: +2, Str: +1 },
  "lineOfEngagement:Very Low": { Wor: -2, Pos: +3, Str: +1, Pac: -1 },

  // ── TRIGGER PRESS ──
  "triggerPress:Much More Often": { Wor: +2, Sta: +2, Pac: +1 },
  "triggerPress:More Often": { Wor: +1, Sta: +1 },
  "triggerPress:Standard": {},
  "triggerPress:Less Often": { Wor: -1, Sta: -1 },
  "triggerPress:Much Less Often": { Wor: -2, Sta: -2, Pos: +1 },

  // ── PASSING DIRECTNESS ──
  "passingDirectness:Extremely Direct": { Hea: +2, Str: +2, Pac: +1, Pas: -2 },
  "passingDirectness:Much More Direct": { Hea: +1, Str: +1, Pas: -1 },
  "passingDirectness:More Direct": { Pas: -1, Hea: +1 },
  "passingDirectness:Mixed": {},
  "passingDirectness:Shorter": { Pas: +1, Dec: +1, Cmp: +1 },
  "passingDirectness:Much Shorter": { Pas: +2, Dec: +2, Cmp: +1, Vis: +1 },
  "passingDirectness:Extremely Short": { Pas: +3, Dec: +2, Cmp: +2, Vis: +1, Hea: -2 },

  // ── TEMPO ──
  "tempo:Extremely High": { Pac: +2, Acc: +2, Sta: +2, Dec: -1 },
  "tempo:Much Higher": { Pac: +1, Acc: +1, Sta: +1 },
  "tempo:Higher": { Pac: +1, Sta: +1 },
  "tempo:Normal": {},
  "tempo:Lower": { Dec: +1, Cmp: +1, Sta: -1 },
  "tempo:Much Lower": { Dec: +2, Cmp: +2, Vis: +1, Sta: -1, Pac: -1 },
  "tempo:Extremely Low": { Dec: +2, Cmp: +2, Vis: +2, Pac: -2, Sta: -2 },

  // ── WHEN POSSESSION LOST ──
  "whenPossessionLost:Counter-Press": { Wor: +2, Sta: +2, Pac: +1, Agg: +1 },
  "whenPossessionLost:Regroup": { Pos: +2, Dec: +1, Wor: -1 },

  // ── WHEN POSSESSION WON ──
  "whenPossessionWon:Counter": { Pac: +2, Acc: +2, Fin: +1 },
  "whenPossessionWon:Hold Shape": { Cmp: +2, Dec: +2, Pas: +1, Tec: +1 },

  // ── ATTACKING WIDTH ──
  "attackingWidth:Extremely Wide": { Cro: +2, Pac: +1, Sta: +1 },
  "attackingWidth:Wide": { Cro: +1 },
  "attackingWidth:Fairly Wide": {},
  "attackingWidth:Normal": {},
  "attackingWidth:Fairly Narrow": {},
  "attackingWidth:Narrow": { Fin: +1, Dec: +1, Cro: -1 },
  "attackingWidth:Extremely Narrow": { Fin: +2, Dec: +2, Tec: +1, Cro: -2 },

  // ── CREATIVE FREEDOM ──
  "creativeFreedom:More Expressive": { Vis: +2, Fla: +1, Dec: +1 },
  "creativeFreedom:Balanced": {},
  "creativeFreedom:More Disciplined": { Pos: +2, Tea: +1, Vis: -1, Fla: -1 },

  // ── PLAY OUT OF DEFENCE ──
  "playOutOfDefence:true": { Pas: +2, Dec: +1, Cmp: +1 },

  // ── PASS INTO SPACE ──
  "passIntoSpace:true": { Pac: +2, Acc: +2, OtB: +1 },

  // ── WORK BALL INTO BOX ──
  "workBallIntoBox:true": { Dec: +1, Tec: +1, Fin: +1, Pas: +1 },

  // ── RUN AT DEFENCE ──
  "runAtDefence:true": { Dri: +2, Pac: +1, Agi: +1, Acc: +1 },

  // ── SHOOT ON SIGHT ──
  "shootOnSight:true": { Lon: +2, Fin: +1 },

  // ── TACKLING ──
  "tackling:Get Stuck In": { Agg: +2, Bra: +1, Tck: +1 },
  "tackling:Stay on feet": { Pos: +2, Tck: -1, Agg: -1 },

  // ── MENTALITY ──
  "mentality:Very Attacking": { Fla: +2, OtB: +2, Ant: +1, Vis: +1, Tck: -1 },
  "mentality:Attacking": { Fla: +1, OtB: +1, Ant: +1, Vis: +1 },
  "mentality:Positive": { OtB: +1, Ant: +1 },
  "mentality:Balanced": {},
  "mentality:Cautious": { Pos: +1, Tea: +1 },
  "mentality:Defensive": { Pos: +1, Tea: +1, Wor: +1 },
  "mentality:Very Defensive": { Pos: +2, Tea: +2, Wor: +1, Fla: -1 },

  // ── DEFENSIVE WIDTH ──
  "defensiveWidth:Wider": { Sta: +2, Pac: +1, Acc: +1 },
  "defensiveWidth:Standard": {},
  "defensiveWidth:Narrower": { Pos: +2, Cnt: +1, Tea: +1 },

  // ── DEFENSIVE LINE BEHAVIOR ──
  "defensiveLineBehavior:Step Up More": { Ant: +2, Acc: +2, Pac: +1 },
  "defensiveLineBehavior:Drop Off More": { Pos: +2, Jum: +1, Str: +1, Hea: +1 },

  // ── HIT EARLY CROSSES ──
  "hitEarlyCrosses:true": { Cro: +2, Vis: +1, Dec: +1, Pas: -1 },

  // ── PRESSING TRAP ──
  "pressingTrap:Trap Inside": { Wor: +2, Tck: +1, Agg: +1 },
  "pressingTrap:Trap Outside": { Pac: +2, Sta: +1, Wor: +1 },
  "pressingTrap:None": {},

  // ── CROSS ENGAGEMENT ──
  "crossEngagement:Stop Crosses": { Acc: +2, Tck: +1, Agi: +1 },
  "crossEngagement:Invite Crosses": { Jum: +2, Hea: +1, Pos: +1 },
  "crossEngagement:Normal": {},

  // ── CROSS TYPE ──
  "crossType:Mixed": {},
  "crossType:Floated": {},
  "crossType:Whipped": {},
  "crossType:Low": {},

  // ── AIM CROSSES AT ──
  "aimCrossesAt:Target Forward": {},
  "aimCrossesAt:None": {},

  // ── GK DISTRIBUTION ──
  "gkDistributionPace:Distribute Quickly": {},
  "gkDistributionPace:Normal": {},
  "gkDistributionPace:Slow Pace Down": {},
  "gkDistributionMethod:Roll It Out": {},
  "gkDistributionMethod:Throw It Out": {},
  "gkDistributionMethod:Take Short Kicks": {},
  "gkDistributionMethod:Take Long Kicks": {},
  "gkDistributionTarget:Centre-Backs": {},
  "gkDistributionTarget:Full-Backs": {},
  "gkDistributionTarget:Defensive Midfielder": {},
  "gkDistributionTarget:Target Forward": {},
  "gkDistributionTarget:Playmaker": {},
  "gkDistributionTarget:Wide Players": {},
  "gkDistributionTarget:Over Opposition Defence": {},

  // ── OVERLAP / UNDERLAP ──
  "overlapLeft:true": {},
  "overlapRight:true": {},
  "underlapLeft:true": {},
  "underlapRight:true": {},

  // ── PREVENT SHORT GK DISTRIBUTION ──
  "preventShortGKDistribution:true": {},

  // ── PLAY FOR SET PIECES ──
  "playForSetPieces:true": {},

  // ── FOCUS PLAY ──
  "focusPlayLeft:true": {},
  "focusPlayCentre:true": {},
  "focusPlayRight:true": {}
};
