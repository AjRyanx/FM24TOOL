const FM24_ROLES = [
  // ── GOALKEEPERS ──
  {
    id: "GK_D",
    name: "Goalkeeper",
    abbreviation: "GK",
    duty: "Defend",
    strata: "GK",
    isPlaymaker: false,
    baseWeights: { "1v1":3, Acc:2, Aer:5, Agg:2, Agi:5, Ant:2, Bra:2, Cmd:5, Cmp:4, Cnt:3, Com:3, Dec:3, Fir:2, Han:4, Jum:4, Kic:3, Pac:3, Pos:4, Pun:1, Ref:5, Sta:2, Str:2, TRO:1, Tec:3, Thr:3, Vis:3 },
    description: "Stays on line, makes saves, distributes simply."
  },
  {
    id: "SK_D",
    name: "Sweeper Keeper",
    abbreviation: "SK",
    duty: "Defend",
    strata: "GK",
    isPlaymaker: false,
    baseWeights: { "1v1":5, Acc:3, Aer:5, Agg:2, Agi:5, Ant:4, Bra:2, Cmd:4, Cmp:4, Cnt:3, Com:3, Dec:3, Ecc:2, Fir:3, Han:5, Jum:4, Kic:4, Pac:4, Pas:4, Pos:4, Pun:1, Ref:5, Sta:2, Str:2, TRO:3, Tec:3, Vis:3 , Thr:3},
    description: "Sweeps behind the defence but prioritises shot-stopping."
  },
  {
    id: "SK_S",
    name: "Sweeper Keeper",
    abbreviation: "SK",
    duty: "Support",
    strata: "GK",
    isPlaymaker: false,
    baseWeights: { "1v1":3, Acc:4, Aer:5, Agg:2, Agi:5, Ant:4, Bra:2, Cmd:3, Cmp:4, Cnt:3, Com:3, Dec:3, Ecc:2, Fir:3, Han:4, Jum:4, Kic:5, Pac:4, Pas:4, Pos:4, Pun:1, Ref:5, Sta:2, Str:2, TRO:3, Tec:3, Thr:3, Vis:3 },
    description: "Comfortable sweeping and starting attacks with measured distribution."
  },
  {
    id: "SK_A",
    name: "Sweeper Keeper",
    abbreviation: "SK",
    duty: "Attack",
    strata: "GK",
    isPlaymaker: false,
    baseWeights: { "1v1":5, Acc:5, Aer:5, Agg:2, Agi:5, Ant:4, Bra:2, Cmd:3, Cmp:3, Cnt:2, Com:3, Dec:3, Ecc:5, Fir:3, Han:4, Jum:4, Kic:4, Pac:5, Pas:3, Pos:4, Pun:1, Ref:5, Sta:2, Str:2, TRO:5, Tec:3, Thr:3, Vis:3 },
    description: "Aggressively sweeps outside the box and distributes quickly to launch attacks."
  },

  // ── CENTRE-BACKS ──
  {
    id: "CD_D",
    name: "Central Defender",
    abbreviation: "CD",
    duty: "Defend",
    strata: "DC",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:3, Bra:3, Cmp:3, Cnt:4, Hea:4, Jum:5, Ldr:3, Mar:4, Pac:4, Pos:4, Prof:2, Sta:2, Str:4, Tck:4 , Wor:3},
    description: "Standard defender who wins headers and makes tackles."
  },
  {
    id: "CD_ST",
    name: "Central Defender",
    abbreviation: "CD",
    duty: "Stopper",
    strata: "DC",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:4, Bra:4, Cmp:3, Cnt:3, Hea:4, Jum:5, Ldr:3, Mar:4, Pac:4, Pos:3, Prof:2, Sta:2, Str:4, Tck:4 , Wor:3},
    description: "Steps out aggressively to engage attackers before they reach the back line."
  },
  {
    id: "CD_CO",
    name: "Central Defender",
    abbreviation: "CD",
    duty: "Cover",
    strata: "DC",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bra:3, Cmp:4, Cnt:4, Hea:3, Jum:5, Ldr:2, Mar:3, Pac:5, Pos:5, Prof:2, Sta:2, Str:4, Tck:4 , Wor:3},
    description: "Drops deep to cover space behind the defensive line."
  },
  {
    id: "BPD_D",
    name: "Ball-Playing Defender",
    abbreviation: "BPD",
    duty: "Defend",
    strata: "DC",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:4, Cnt:3, Dec:4, Jum:4, Ldr:2, Mar:3, Pac:4, Pas:4, Pos:4, Prof:2, Sta:2, Str:4, Tck:4, Vis:3 , Wor:3},
    description: "Steps forward with the ball and picks out progressive passes."
  },
  {
    id: "BPD_ST",
    name: "Ball-Playing Defender",
    abbreviation: "BPD",
    duty: "Stopper",
    strata: "DC",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bra:3, Cmp:4, Cnt:3, Dec:3, Jum:5, Ldr:2, Mar:3, Pac:5, Pas:4, Pos:5, Prof:2, Sta:2, Str:4, Tck:4 , Wor:3},
    description: "Stopper defender who aggressively engages attackers."
  },
  {
    id: "BPD_CO",
    name: "Ball-Playing Defender",
    abbreviation: "BPD",
    duty: "Cover",
    strata: "DC",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bra:3, Cmp:4, Cnt:3, Dec:3, Jum:5, Ldr:2, Mar:3, Pac:5, Pas:4, Pos:5, Prof:2, Sta:2, Str:4, Tck:4 , Wor:3},
    description: "Covering defender who can play line-breaking passes from deep."
  },
  {
    id: "NCB_D",
    name: "No-Nonsense Centre-Back",
    abbreviation: "NCB",
    duty: "Defend",
    strata: "DC",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:4, Bra:4, Cmp:3, Cnt:2, Hea:4, Jum:5, Ldr:2, Mar:2, Pac:4, Pas:1, Pos:4, Prof:2, Sta:2, Str:5, Tck:4 , Wor:3},
    description: "Winning headers and crunching tackles are the only priority."
  },
  {
    id: "NCB_ST",
    name: "No-Nonsense Centre-Back",
    abbreviation: "NCB",
    duty: "Stopper",
    strata: "DC",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:3, Bra:4, Cmp:3, Cnt:2, Hea:4, Jum:5, Ldr:2, Mar:2, Pac:4, Pas:1, Pos:4, Prof:2, Sta:2, Str:5, Tck:4 , Wor:3},
    description: "Clears danger with simple, safe passes to nearby teammates."
  },
  {
    id: "NCB_CO",
    name: "No-Nonsense Centre-Back",
    abbreviation: "NCB",
    duty: "Cover",
    strata: "DC",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:3, Bra:4, Cmp:3, Cnt:3, Hea:4, Jum:5, Ldr:2, Mar:2, Pac:5, Pas:1, Pos:5, Prof:2, Sta:2, Str:5, Tck:4 , Wor:3},
    description: "Cover defender who shells the ball clear at every opportunity."
  },
  {
    id: "Libero_S",
    name: "Libero",
    abbreviation: "Libero",
    duty: "Support",
    strata: "DC",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:4, Cnt:2, Dec:4, Jum:5, Ldr:2, Mar:2, Pac:4, Pas:4, Pos:4, Prof:2, Sta:2, Str:4, Tck:3, Vis:3 , Wor:3},
    description: "Sweeps behind the line and carries the ball into midfield."
  },
  {
    id: "Libero_A",
    name: "Libero",
    abbreviation: "Libero",
    duty: "Attack",
    strata: "DC",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bra:2, Cmp:4, Cnt:2, Dec:4, Dri:3, Jum:4, Ldr:2, Mar:2, Pac:5, Pas:4, Pos:4, Prof:2, Sta:2, Str:3, Vis:4 , Wor:3},
    description: "Marches forward from defence to join attacks in advanced areas."
  },
  {
    id: "WCB_D",
    name: "Wide Centre-Back",
    abbreviation: "WCB",
    duty: "Defend",
    strata: "DC",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:3, Cmp:3, Cnt:3, Hea:4, Jum:5, Ldr:2, Mar:3, Pac:4, Pos:4, Prof:2, Sta:2, Str:4, Tck:4 , Wor:3},
    description: "Centre-back in a back three who stays compact and defends the channel."
  },
  {
    id: "WCB_S",
    name: "Wide Centre-Back",
    abbreviation: "WCB",
    duty: "Support",
    strata: "DC",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:4, Cnt:3, Dec:3, Jum:5, Ldr:2, Mar:3, Pac:4, Pas:3, Pos:4, Prof:2, Sta:2, Str:4, Tck:4 , Wor:3},
    description: "Wide centre-back who carries the ball into midfield on occasion."
  },
  {
    id: "WCB_A",
    name: "Wide Centre-Back",
    abbreviation: "WCB",
    duty: "Attack",
    strata: "DC",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bra:2, Cmp:3, Cnt:2, Cro:3, Dec:3, Jum:4, Ldr:2, Mar:2, Pac:5, Pos:4, Prof:2, Sta:4, Str:4, Tck:4 , Wor:3},
    description: "Overlaps like a wing-back from the centre-back position in a back three."
  },

  // ── FULL-BACKS / WING-BACKS ──
  {
    id: "FB_D",
    name: "Full-Back",
    abbreviation: "FB",
    duty: "Defend",
    strata: ["WD"],
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bra:3, Cmp:3, Cnt:3, Cro:3, Ldr:2, Mar:4, Pac:5, Pos:4, Prof:2, Sta:4, Str:3, Tck:4, Wor:4 , Jum:3, Ant:3},
    description: "Stays deep, marks the winger, keeps the defensive shape."
  },
  {
    id: "FB_S",
    name: "Full-Back",
    abbreviation: "FB",
    duty: "Support",
    strata: ["WD"],
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bra:2, Cmp:3, Cnt:2, Cro:4, Dec:3, Ldr:2, Mar:3, Pac:5, Pas:3, Pos:4, Prof:2, Sta:4, Str:2, Tck:3, Wor:4 , Jum:3, Ant:3},
    description: "Provides cautious width in attack while still tracking back."
  },
  {
    id: "FB_A",
    name: "Full-Back",
    abbreviation: "FB",
    duty: "Attack",
    strata: ["WD"],
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bra:2, Cmp:3, Cnt:2, Cro:4, Dec:3, Dri:3, Ldr:2, Mar:3, Pac:5, Pos:4, Prof:2, Sta:4, Str:2, Tec:3, Wor:4 , Jum:3, Ant:3},
    description: "Makes overlapping runs and delivers crosses into the box."
  },
  {
    id: "NFB_D",
    name: "No-Nonsense Full-Back",
    abbreviation: "NFB",
    duty: "Defend",
    strata: ["WD"],
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bra:4, Cnt:3, Cro:3, Hea:3, Ldr:2, Mar:4, Pac:5, Pas:1, Pos:4, Prof:2, Sta:4, Str:4, Tck:4, Wor:4 , Jum:3, Ant:3, Cmp:3},
    description: "Tackles first and asks questions later — pure defensive full-back."
  },
  {
    id: "WB_D",
    name: "Wing-Back",
    abbreviation: "WB",
    duty: "Defend",
    strata: ["WD", "WB"],
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bra:2, Cmp:3, Cnt:2, Cro:3, Ldr:2, Mar:3, Pac:5, Pos:4, Prof:2, Sta:4, Str:3, Tck:4, Wor:4 , Jum:3, Ant:3},
    description: "Defends the flank with occasional forward bursts."
  },
  {
    id: "WB_S",
    name: "Wing-Back",
    abbreviation: "WB",
    duty: "Support",
    strata: ["WD", "WB"],
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bra:2, Cmp:3, Cnt:2, Cro:4, Dec:3, Dri:3, Ldr:2, Mar:2, Pac:5, Pas:3, Pos:4, Prof:2, Sta:5, Str:2, Wor:4 , Jum:3, Ant:3},
    description: "Balances defensive duties with consistent forward support."
  },
  {
    id: "WB_A",
    name: "Wing-Back",
    abbreviation: "WB",
    duty: "Attack",
    strata: ["WD", "WB"],
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bra:2, Cmp:3, Cnt:2, Cro:4, Dec:3, Dri:4, Ldr:2, Mar:2, Pac:5, Pos:4, Prof:2, Sta:5, Str:2, Tec:3, Wor:4 , Jum:3, Ant:3},
    description: "Bombing forward as a primary attacking outlet down the flank."
  },
  {
    id: "CWB_S",
    name: "Complete Wing-Back",
    abbreviation: "CWB",
    duty: "Support",
    strata: ["WB"],
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bra:2, Cmp:3, Cnt:2, Cro:4, Dec:3, Dri:4, Ldr:2, Mar:2, Pac:5, Pas:3, Pos:4, Prof:2, Sta:5, Str:2, Tec:3, Wor:4 , Jum:3, Ant:3},
    description: "A world-class wing-back who contributes at both ends of the pitch."
  },
  {
    id: "CWB_A",
    name: "Complete Wing-Back",
    abbreviation: "CWB",
    duty: "Attack",
    strata: ["WB"],
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bra:2, Cnt:2, Cro:4, Dec:3, Dri:4, Fin:3, Ldr:2, Mar:2, Pac:5, Pas:3, Pos:4, Prof:2, Sta:5, Str:2, Tec:3, Wor:4 , Jum:3, Ant:3, Cmp:3},
    description: "A primary attacking threat who overlaps relentlessly and joins the box."
  },
  {
    id: "IWB_D",
    name: "Inverted Wing-Back",
    abbreviation: "IWB",
    duty: "Defend",
    strata: ["WD", "WB"],
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bra:2, Cmp:3, Cnt:3, Cro:3, Dec:3, Ldr:2, Mar:3, Pac:5, Pas:3, Pos:4, Prof:2, Sta:4, Str:2, Tck:4, Wor:4 , Jum:3, Ant:3},
    description: "Defends as a full-back but tucks into midfield when in possession."
  },
  {
    id: "IWB_S",
    name: "Inverted Wing-Back",
    abbreviation: "IWB",
    duty: "Support",
    strata: ["WD", "WB"],
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bra:2, Cmp:3, Cnt:2, Cro:3, Dec:4, Ldr:2, Mar:2, Pac:5, Pas:3, Pos:4, Prof:2, Sta:4, Str:2, Tec:3, Vis:3, Wor:4 , Jum:3, Ant:3},
    description: "Inverts into central midfield to create overloads in possession."
  },
  {
    id: "IWB_A",
    name: "Inverted Wing-Back",
    abbreviation: "IWB",
    duty: "Attack",
    strata: ["WD", "WB"],
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bra:2, Cmp:3, Cnt:2, Cro:3, Dec:4, Dri:3, Fin:3, Ldr:2, Mar:2, Pac:5, Pos:4, Prof:2, Sta:4, Str:2, Tec:3, Vis:3, Wor:4 , Jum:3, Ant:3},
    description: "Drifts inside aggressively to support attacks through the middle."
  },
  {
    id: "IFB_D",
    name: "Inverted Full-Back",
    abbreviation: "IFB",
    duty: "Defend",
    strata: ["WD"],
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bra:3, Cmp:3, Cnt:3, Cro:3, Dec:4, Ldr:2, Mar:3, Pac:5, Pas:3, Pos:5, Prof:2, Sta:4, Str:2, Tck:4, Wor:4 , Jum:3, Ant:3},
    description: "Defends as a full-back but slides into a back-three in possession."
  },

  // ── DEFENSIVE MIDFIELDERS ──
  {
    id: "DM_D",
    name: "Defensive Midfielder",
    abbreviation: "DM",
    duty: "Defend",
    strata: "DM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:3, Bra:3, Cmp:3, Cnt:3, Fir:2, Ldr:2, Mar:3, Pac:4, Pos:4, Prof:2, Sta:5, Str:4, Tck:4, Tea:3, Wor:5 , Ant:3, Jum:3},
    description: "Sits in front of the back four screening the defence."
  },
  {
    id: "DM_S",
    name: "Defensive Midfielder",
    abbreviation: "DM",
    duty: "Support",
    strata: "DM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:3, Cnt:2, Dec:3, Fir:2, Ldr:2, Mar:2, Pac:4, Pas:3, Pos:4, Prof:2, Sta:5, Str:3, Tck:4, Tea:2, Wor:5 , Ant:3, Jum:3},
    description: "Shields the defence while offering a simple passing option."
  },
  {
    id: "DLP_D",
    name: "Deep-Lying Playmaker",
    abbreviation: "DLP",
    duty: "Defend",
    strata: "DM",
    isPlaymaker: true,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:4, Cnt:2, Dec:4, Fir:2, Ldr:3, Mar:2, Pac:4, Pas:5, Pos:3, Prof:2, Sta:5, Str:2, Tck:3, Tea:2, Vis:4, Wor:5 , Ant:3, Jum:3},
    description: "Dictates play from deep with precise passing and tempo control."
  },
  {
    id: "DLP_S",
    name: "Deep-Lying Playmaker",
    abbreviation: "DLP",
    duty: "Support",
    strata: "DM",
    isPlaymaker: true,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:4, Cnt:2, Dec:4, Fir:2, Ldr:3, Mar:2, Pac:4, Pas:5, Pos:3, Prof:2, Sta:5, Str:2, Tck:2, Tea:2, Tec:3, Vis:4, Wor:5 , Ant:3, Jum:3},
    description: "Orchestrates attacks from a deeper position with range of passing."
  },
  {
    id: "BWM_D",
    name: "Ball-Winning Midfielder",
    abbreviation: "BWM",
    duty: "Defend",
    strata: "DM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:4, Bra:3, Cnt:2, Fir:2, Ldr:2, Mar:3, Pac:4, Pos:3, Prof:2, Sta:5, Str:4, Tck:4, Tea:2, Wor:5 , Ant:3, Jum:3},
    description: "A relentless hunter who wins the ball back and gives it simple."
  },
  {
    id: "BWM_S",
    name: "Ball-Winning Midfielder",
    abbreviation: "BWM",
    duty: "Support",
    strata: "DM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:4, Bra:3, Cnt:2, Fir:2, Ldr:2, Mar:2, Pac:4, Pos:3, Prof:2, Sta:5, Str:3, Tck:4, Tea:2, Wor:5 , Ant:3, Jum:3},
    description: "Chases down opponents across the midfield third to regain possession."
  },
  {
    id: "Anchor_D",
    name: "Anchor",
    abbreviation: "Anchor",
    duty: "Defend",
    strata: "DM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:3, Cmp:3, Cnt:3, Fir:2, Jum:3, Ldr:3, Mar:3, Pac:4, Pos:5, Prof:2, Sta:5, Str:4, Tck:4, Tea:3, Wor:5 , Ant:3},
    description: "A pure screen who never leaves the defensive line's doorstep."
  },
  {
    id: "HB_D",
    name: "Half-Back",
    abbreviation: "HB",
    duty: "Defend",
    strata: "DM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:3, Cmp:4, Cnt:3, Dec:4, Fir:2, Ldr:3, Mar:3, Pac:4, Pos:5, Prof:2, Sta:5, Str:4, Tck:4, Tea:3, Wor:5 , Ant:3, Jum:3},
    description: "Drops between the centre-backs to form a back-three in possession."
  },
  {
    id: "Regista_S",
    name: "Regista",
    abbreviation: "Regista",
    duty: "Support",
    strata: "DM",
    isPlaymaker: true,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:4, Cnt:1, Dec:4, Dri:3, Fir:2, Fla:3, Ldr:2, Mar:1, Pac:4, Pas:5, Pos:3, Prof:2, Sta:4, Str:2, Tea:2, Tec:4, Vis:5, Wor:4 , Ant:3, Jum:3},
    description: "A deep-lying creative hub with freedom to roam and pick passes."
  },
  {
    id: "RPM_S",
    name: "Roaming Playmaker",
    abbreviation: "RPM",
    duty: "Support",
    strata: "DM",
    isPlaymaker: true,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:3, Cnt:2, Dec:4, Dri:3, Fir:2, Ldr:2, Mar:2, Pac:4, Pas:5, Pos:3, Prof:2, Sta:5, Str:2, Tea:2, Tec:3, Vis:4, Wor:5 , Ant:3, Jum:3},
    description: "Covers every blade of grass to receive and dictate the game."
  },
  {
    id: "SV_S",
    name: "Segundo Volante",
    abbreviation: "SV",
    duty: "Support",
    strata: "DM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cnt:2, Dec:3, Fin:4, Fir:2, Ldr:2, OtB:3, Pac:4, Pas:3, Pos:3, Prof:2, Sta:5, Str:4, Tck:4, Tea:2, Wor:5 , Ant:3, Jum:3},
    description: "A DM who supports attacks by arriving late in the box."
  },
  {
    id: "SV_A",
    name: "Segundo Volante",
    abbreviation: "SV",
    duty: "Attack",
    strata: "DM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cnt:1, Dec:4, Dri:3, Fin:5, Fir:2, Ldr:2, OtB:4, Pac:4, Pas:3, Pos:3, Prof:2, Sta:5, Str:4, Tea:2, Wor:5 , Ant:3, Jum:3},
    description: "Marches forward from midfield to join the attack as an extra striker."
  },

  // ── CENTRAL MIDFIELDERS ──
  {
    id: "CM_D",
    name: "Central Midfielder",
    abbreviation: "CM",
    duty: "Defend",
    strata: "CM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:3, Cmp:3, Cnt:2, Dec:3, Ldr:2, Mar:3, Pac:4, Pas:3, Pos:4, Prof:2, Sta:5, Str:3, Tck:4, Tea:3, Wor:5 , Ant:4},
    description: "Holds the midfield shape and breaks up opposition play."
  },
  {
    id: "CM_S",
    name: "Central Midfielder",
    abbreviation: "CM",
    duty: "Support",
    strata: "CM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:3, Cnt:2, Dec:3, Fir:2, Ldr:2, Mar:2, Pac:4, Pas:4, Prof:2, Sta:5, Str:3, Tck:3, Vis:3, Wor:5 , Ant:4},
    description: "A well-rounded midfielder who contributes to both phases."
  },
  {
    id: "CM_A",
    name: "Central Midfielder",
    abbreviation: "CM",
    duty: "Attack",
    strata: "CM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:3, Cnt:1, Dec:3, Dri:3, Fin:4, Fir:2, Ldr:2, Lon:2, Mar:1, OtB:4, Pac:4, Pas:3, Prof:2, Sta:5, Str:2, Wor:5 , Ant:4},
    description: "Makes late runs into the box to get on the end of chances."
  },
  {
    id: "BBM_S",
    name: "Box-to-Box Midfielder",
    abbreviation: "BBM",
    duty: "Support",
    strata: "CM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cnt:2, Dec:4, Dri:3, Fin:4, Ldr:2, Mar:2, Pac:4, Pas:4, Prof:2, Sta:5, Str:4, Tck:3, Wor:5 , Ant:4, Cmp:3},
    description: "Endless engine who covers both penalty boxes across ninety minutes."
  },
  {
    id: "AP_S",
    name: "Advanced Playmaker",
    abbreviation: "AP",
    duty: "Support",
    strata: "CM",
    isPlaymaker: true,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:3, Dec:4, Dri:3, Fir:3, Fla:2, Fre:2, Ldr:2, Pac:4, Pas:5, Prof:2, Sta:4, Str:2, Tec:4, Vis:4, Wor:3 , Ant:4},
    description: "Creative hub who operates between midfield and attack to unlock defences."
  },
  {
    id: "AP_A",
    name: "Advanced Playmaker",
    abbreviation: "AP",
    duty: "Attack",
    strata: "CM",
    isPlaymaker: true,
    baseWeights: { Acc:4, Agg:2, Bra:2, Dec:4, Dri:4, Fin:3, Fir:3, Fla:2, Fre:2, Ldr:2, Pac:4, Pas:5, Prof:2, Sta:4, Str:2, Tec:4, Vis:4, Wor:4 , Ant:4, Cmp:3},
    description: "Plays further forward as the team's primary creative force."
  },
  {
    id: "Mezzala_S",
    name: "Mezzala",
    abbreviation: "Mezzala",
    duty: "Support",
    strata: "CM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:3, Cnt:1, Dec:3, Dri:3, Fin:4, Fir:2, Ldr:2, Lon:2, Mar:1, OtB:3, Pac:4, Pas:3, Prof:2, Sta:5, Str:2, Tec:4, Vis:3, Wor:5 , Ant:4},
    description: "Drifts wide from centre-midfield to create overloads on the flank."
  },
  {
    id: "Mezzala_A",
    name: "Mezzala",
    abbreviation: "Mezzala",
    duty: "Attack",
    strata: "CM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:3, Cnt:1, Dec:4, Dri:4, Fin:5, Fir:2, Ldr:2, Lon:2, Mar:1, Pac:4, Pas:3, Prof:2, Sta:5, Str:2, Tec:4, Wor:5 , Ant:4},
    description: "Aggressive wide-drifting midfielder who gets into goal-scoring positions."
  },
  {
    id: "Carrilero_S",
    name: "Carrilero",
    abbreviation: "Carrilero",
    duty: "Support",
    strata: "CM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:3, Cnt:2, Dec:4, Ldr:2, Mar:2, Pac:4, Pas:3, Pos:4, Prof:2, Sta:5, Str:3, Tck:2, Tea:4, Wor:5 , Ant:4},
    description: "Shuttles between the flanks to cover space and offer passing angles."
  },

  {
    id: "DLP_CM_D",
    name: "Deep-Lying Playmaker",
    abbreviation: "DLP",
    duty: "Defend",
    strata: "CM",
    isPlaymaker: true,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:4, Cnt:2, Dec:4, Fir:2, Ldr:3, Mar:2, Pac:4, Pas:5, Pos:3, Prof:2, Sta:5, Str:2, Tck:3, Tea:2, Vis:4, Wor:5 , Ant:3, Jum:3},
    description: "Dictates play from deep with precise passing and tempo control."
  },
  {
    id: "DLP_CM_S",
    name: "Deep-Lying Playmaker",
    abbreviation: "DLP",
    duty: "Support",
    strata: "CM",
    isPlaymaker: true,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:4, Cnt:2, Dec:4, Fir:2, Ldr:3, Mar:2, Pac:4, Pas:5, Pos:3, Prof:2, Sta:5, Str:2, Tck:2, Tea:2, Tec:3, Vis:4, Wor:5 , Ant:3, Jum:3},
    description: "Orchestrates attacks from a deeper position with range of passing."
  },
  {
    id: "BWM_CM_D",
    name: "Ball-Winning Midfielder",
    abbreviation: "BWM",
    duty: "Defend",
    strata: "CM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:4, Bra:3, Cnt:2, Fir:2, Ldr:2, Mar:3, Pac:4, Pos:3, Prof:2, Sta:5, Str:4, Tck:4, Tea:2, Wor:5 , Ant:3, Jum:3},
    description: "A relentless hunter who wins the ball back and gives it simple."
  },
  {
    id: "BWM_CM_S",
    name: "Ball-Winning Midfielder",
    abbreviation: "BWM",
    duty: "Support",
    strata: "CM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:4, Bra:3, Cnt:2, Fir:2, Ldr:2, Mar:2, Pac:4, Pos:3, Prof:2, Sta:5, Str:3, Tck:4, Tea:2, Wor:5 , Ant:3, Jum:3},
    description: "Chases down opponents across the midfield third to regain possession."
  },
  {
    id: "RPM_CM_S",
    name: "Roaming Playmaker",
    abbreviation: "RPM",
    duty: "Support",
    strata: "CM",
    isPlaymaker: true,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:3, Cnt:2, Dec:4, Dri:3, Fir:2, Ldr:2, Mar:2, Pac:4, Pas:5, Pos:3, Prof:2, Sta:5, Str:2, Tea:2, Tec:3, Vis:4, Wor:5 , Ant:3, Jum:3},
    description: "Covers every blade of grass to receive and dictate the game."
  },

  // ── WIDE ATTACKERS ──
  {
    id: "Winger_S",
    name: "Winger",
    abbreviation: "W",
    duty: "Support",
    strata: "WA",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Agi:4, Bal:3, Bra:2, Cmp:3, Cor:1, Cro:4, Dec:3, Dri:4, Fin:3, Fla:2, Fre:1, Ldr:2, Pac:5, Pas:3, Prof:2, Sta:2, Str:2, Tec:3 , Ant:3, Jum:3},
    description: "Stays wide and delivers crosses for the forwards."
  },
  {
    id: "Winger_A",
    name: "Winger",
    abbreviation: "W",
    duty: "Attack",
    strata: "WA",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Agi:4, Bal:3, Bra:2, Cmp:3, Cor:1, Cro:4, Dec:3, Dri:4, Fin:4, Fla:2, Fre:1, Ldr:2, Pac:5, Pas:3, Prof:2, Sta:2, Str:2, Tec:3 , Ant:3, Jum:3},
    description: "Aggressively attacks the byline to fire dangerous crosses into the box."
  },
  {
    id: "IW_S",
    name: "Inverted Winger",
    abbreviation: "IW",
    duty: "Support",
    strata: "WA",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Agi:4, Bal:3, Bra:2, Cmp:3, Dec:3, Dri:4, Fin:3, Fla:2, Fre:1, Ldr:2, OtB:4, Pac:5, Pas:3, Prof:2, Sta:2, Str:2, Tec:3, Vis:3 , Ant:3, Jum:3, Cro:3},
    description: "Cuts inside from the flank to create shooting and passing angles."
  },
  {
    id: "IW_A",
    name: "Inverted Winger",
    abbreviation: "IW",
    duty: "Attack",
    strata: "WA",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Agi:4, Bal:3, Bra:2, Cmp:3, Dec:3, Dri:4, Fin:4, Fla:2, Fre:1, Ldr:2, Pac:5, Pas:3, Prof:2, Sta:2, Str:2, Tec:4 , Ant:3, Jum:3, Cro:3},
    description: "Drives inside aggressively to get into goal-scoring positions."
  },
  {
    id: "IF_S",
    name: "Inside Forward",
    abbreviation: "IF",
    duty: "Support",
    strata: "WA",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Agi:4, Bal:3, Bra:2, Cmp:3, Dec:3, Dri:4, Fin:4, Fla:2, Fre:1, Ldr:2, OtB:4, Pac:5, Prof:2, Sta:2, Str:2, Tec:3 , Ant:3, Jum:3, Cro:3},
    description: "Starts wide but attacks the central channels as a secondary striker."
  },
  {
    id: "IF_A",
    name: "Inside Forward",
    abbreviation: "IF",
    duty: "Attack",
    strata: "WA",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Agi:4, Bal:3, Bra:2, Cmp:3, Dec:4, Dri:4, Fin:5, Fla:2, Fre:1, Ldr:2, OtB:4, Pac:5, Prof:2, Sta:2, Str:2, Tec:3 , Ant:3, Jum:3, Cro:3},
    description: "Primary goal threat from the flank, cutting inside to finish chances."
  },
  {
    id: "RMD_A",
    name: "Raumdeuter",
    abbreviation: "RMD",
    duty: "Attack",
    strata: "WA",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Agi:4, Ant:5, Bal:3, Bra:2, Cmp:3, Dec:4, Dri:4, Fin:4, Fla:2, Fre:1, Ldr:2, OtB:5, Pac:5, Prof:2, Sta:2, Str:2, Tec:3 , Jum:3, Cro:3},
    description: "A space-hunter who finds gaps in the defence and exploits them."
  },
  {
    id: "WTM_S",
    name: "Wide Target Man",
    abbreviation: "WTM",
    duty: "Support",
    strata: "WA",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bal:3, Bra:4, Cmp:3, Fin:3, Fla:2, Hea:4, Jum:4, Ldr:2, OtB:3, Pac:5, Prof:2, Sta:2, Str:5 , Ant:3, Cro:3},
    description: "Target man stationed wide to hold up play and win aerial balls."
  },
  {
    id: "WTM_A",
    name: "Wide Target Man",
    abbreviation: "WTM",
    duty: "Attack",
    strata: "WA",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bal:3, Bra:4, Cmp:3, Fin:4, Fla:2, Hea:4, Jum:4, Ldr:2, OtB:3, Pac:5, Prof:2, Sta:2, Str:5 , Ant:3, Cro:3},
    description: "A powerful wide presence who attacks crosses with authority."
  },
  {
    id: "AP_WA_S",
    name: "Advanced Playmaker",
    abbreviation: "AP",
    duty: "Support",
    strata: "WA",
    isPlaymaker: true,
    baseWeights: { Acc:4, Agg:2, Bal:3, Bra:2, Cmp:3, Dec:4, Dri:3, Fir:3, Fla:2, Fre:2, Ldr:2, Pac:4, Pas:5, Prof:2, Sta:4, Str:2, Tec:4, Vis:4, Wor:3 , Ant:3, Jum:3, Cro:3},
    description: "Creative hub who operates between midfield and attack to unlock defences."
  },
  {
    id: "AP_WA_A",
    name: "Advanced Playmaker",
    abbreviation: "AP",
    duty: "Attack",
    strata: "WA",
    isPlaymaker: true,
    baseWeights: { Acc:4, Agg:2, Bal:3, Bra:2, Dec:4, Dri:4, Fin:3, Fir:3, Fla:2, Fre:2, Ldr:2, Pac:4, Pas:5, Prof:2, Sta:4, Str:2, Tec:4, Vis:4, Wor:4 , Ant:3, Jum:3, Cro:3},
    description: "Plays further forward as the team's primary creative force."
  },
  {
    id: "TQ_WA_A",
    name: "Trequartista",
    abbreviation: "Treq",
    duty: "Attack",
    strata: "WA",
    isPlaymaker: true,
    baseWeights: { Acc:4, Agg:2, Agi:4, Bal:3, Bra:2, Cmp:3, Dec:4, Dri:4, Fin:4, Fir:3, Fla:3, Fre:2, Ldr:2, Pac:4, Prof:2, Sta:2, Str:2, Tec:5, Vis:5, Wor:1 , Ant:3, Jum:3, Cro:3},
    maxWeights: { Wor: 2 },
    description: "A free-roaming artist who creates magic but does not track back."
  },

  // ── WIDE MIDFIELDERS ──
  {
    id: "WM_D",
    name: "Wide Midfielder",
    abbreviation: "WM",
    duty: "Defend",
    strata: "WM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:3, Cnt:2, Cro:3, Dec:3, Ldr:2, Mar:2, Pac:4, Pas:3, Prof:2, Sta:5, Str:3, Tck:3, Wor:4 , Dri:3, Tec:3},
    description: "Hugs the touchline and provides defensive cover."
  },
  {
    id: "WM_S",
    name: "Wide Midfielder",
    abbreviation: "WM",
    duty: "Support",
    strata: "WM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:3, Cnt:2, Cro:4, Dec:3, Dri:3, Ldr:2, Mar:2, Pac:4, Pas:3, Prof:2, Sta:5, Str:2, Wor:4 , Tec:3},
    description: "Hugs the touchline and delivers crosses from the byline."
  },
  {
    id: "WM_A",
    name: "Wide Midfielder",
    abbreviation: "WM",
    duty: "Attack",
    strata: "WM",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bra:2, Cmp:3, Cnt:1, Cro:4, Dec:3, Dri:3, Fin:3, Ldr:2, Mar:1, Pac:5, Pas:3, Prof:2, Sta:5, Str:2, Wor:4 , Tec:3},
    description: "Hugs the touchline and attacks the byline aggressively."
  },
  {
    id: "WM_Aut",
    name: "Wide Midfielder",
    abbreviation: "WM",
    duty: "Automatic",
    strata: "WM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:3, Cro:3, Dec:3, Dri:3, Ldr:2, Pac:4, Pas:3, Prof:2, Sta:5, Str:2, Tck:3, Wor:4 , Tec:3},
    description: "Hugs the touchline with duty adapting to team mentality."
  },
  {
    id: "DW_D",
    name: "Defensive Winger",
    abbreviation: "DW",
    duty: "Defend",
    strata: "WM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:3, Bra:3, Cnt:2, Cro:3, Ldr:2, Mar:3, Pac:4, Pos:3, Prof:2, Sta:5, Str:3, Tck:4, Wor:5 , Dri:3, Tec:3},
    description: "Provides defensive cover and presses opposition full-backs."
  },
  {
    id: "DW_S",
    name: "Defensive Winger",
    abbreviation: "DW",
    duty: "Support",
    strata: "WM",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:3, Cnt:2, Cro:3, Ldr:2, Mar:3, Pac:4, Prof:2, Sta:5, Str:3, Tck:3, Wor:4 , Dri:3, Tec:3},
    description: "Presses high while also contributing to counter-attacks."
  },
  {
    id: "Winger_WM_S",
    name: "Winger",
    abbreviation: "W",
    duty: "Support",
    strata: "WM",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Agi:4, Bra:2, Cmp:3, Cro:4, Dec:3, Dri:4, Fin:3, Fla:2, Ldr:2, Pac:5, Pas:3, Prof:2, Sta:2, Str:2, Tec:3 },
    description: "Hugs the touchline, beats defenders outside, and crosses from the byline."
  },
  {
    id: "Winger_WM_A",
    name: "Winger",
    abbreviation: "W",
    duty: "Attack",
    strata: "WM",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Agi:4, Bra:2, Cmp:3, Cro:4, Dec:3, Dri:4, Fin:4, Fla:2, Ldr:2, Pac:5, Pas:3, Prof:2, Sta:2, Str:2, Tec:3 },
    description: "Aggressively attacks the byline to fire dangerous crosses into the box."
  },
  {
    id: "IW_WM_S",
    name: "Inverted Winger",
    abbreviation: "IW",
    duty: "Support",
    strata: "WM",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Agi:4, Bra:2, Cmp:3, Cro:3, Dec:3, Dri:4, Fin:3, Fla:2, Ldr:2, OtB:4, Pac:5, Pas:3, Prof:2, Sta:2, Str:2, Tec:3, Vis:3 },
    description: "Cuts inside to create space for overlapping full-backs."
  },
  {
    id: "IW_WM_A",
    name: "Inverted Winger",
    abbreviation: "IW",
    duty: "Attack",
    strata: "WM",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Agi:4, Bra:2, Cmp:3, Cro:3, Dec:3, Dri:4, Fin:4, Fla:2, Ldr:2, Pac:5, Pas:3, Prof:2, Sta:2, Str:2, Tec:4 },
    description: "Cuts inside aggressively to create overloads and goal chances."
  },
  {
    id: "WP_WM_S",
    name: "Wide Playmaker",
    abbreviation: "WP",
    duty: "Support",
    strata: "WM",
    isPlaymaker: true,
    baseWeights: { Acc:5, Agg:2, Agi:4, Bra:2, Cmp:3, Cro:4, Dri:4, Fin:2, Ldr:2, Pac:5, Pas:5, Prof:2, Sta:2, Str:2, Tec:4, Vis:4 },
    description: "Drifts inside from the flank to dictate play in the half-space."
  },
  {
    id: "WP_WM_A",
    name: "Wide Playmaker",
    abbreviation: "WP",
    duty: "Attack",
    strata: "WM",
    isPlaymaker: true,
    baseWeights: { Acc:5, Agg:2, Agi:4, Bra:2, Cro:4, Dec:3, Dri:4, Fin:3, Ldr:2, Pac:5, Pas:5, Prof:2, Sta:2, Str:2, Tec:4, Vis:4 },
    description: "Advanced wide creator who cuts inside to pull the strings in the final third."
  },

  // ── ATTACKING MIDFIELDERS ──
  {
    id: "AM_S",
    name: "Attacking Midfielder",
    abbreviation: "AM",
    duty: "Support",
    strata: "AMC",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:3, Dri:4, Fin:3, Fir:2, Fla:2, Fre:1, Ldr:2, Lon:2, OtB:3, Pac:4, Pas:4, Prof:2, Sta:4, Str:2, Tec:4, Vis:4, Wor:4 , Cnt:3, Jum:3},
    description: "A well-rounded creator in the hole behind the striker."
  },
  {
    id: "AM_A",
    name: "Attacking Midfielder",
    abbreviation: "AM",
    duty: "Attack",
    strata: "AMC",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Bra:2, Dri:4, Fin:4, Fir:2, Fla:2, Fre:1, Ldr:2, Lon:2, OtB:4, Pac:4, Pas:4, Prof:2, Sta:4, Str:2, Tec:4, Vis:4, Wor:4 , Cnt:3, Jum:3},
    description: "Advanced threat who pushes into the box to score and create."
  },
  {
    id: "Trequartista_A",
    name: "Trequartista",
    abbreviation: "Treq",
    duty: "Attack",
    strata: "AMC",
    isPlaymaker: true,
    baseWeights: { Acc:4, Agg:2, Agi:4, Bra:2, Cmp:3, Dec:4, Dri:4, Fin:4, Fir:3, Fla:3, Fre:2, Ldr:2, OtB:3, Pac:4, Prof:2, Sta:2, Str:2, Tec:5, Vis:5, Wor:1 , Cnt:3, Jum:3},
    maxWeights: { Wor: 2 },
    description: "A free-roaming artist who creates magic but does not track back."
  },
  {
    id: "Enganche_S",
    name: "Enganche",
    abbreviation: "Enganche",
    duty: "Support",
    strata: "AMC",
    isPlaymaker: true,
    baseWeights: { Acc:3, Agg:2, Bra:2, Cmp:4, Dec:5, Dri:3, Fin:3, Fir:4, Fla:2, Ldr:2, OtB:3, Pac:3, Pas:5, Prof:2, Sta:2, Str:2, Tec:4, Vis:5, Wor:1 , Cnt:3, Jum:3},
    maxWeights: { Wor: 2 },
    description: "A static playmaker in the hole who serves as the team's creative focal point."
  },
  {
    id: "SS_A",
    name: "Shadow Striker",
    abbreviation: "SS",
    duty: "Attack",
    strata: "AMC",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Ant:4, Bra:2, Cmp:3, Dec:4, Dri:4, Fin:5, Fir:3, Ldr:2, Lon:3, OtB:5, Pac:5, Prof:2, Sta:2, Str:2, Tec:4 , Cnt:3, Jum:3},
    description: "A goal-scoring attacker who arrives late into the box from deep."
  },
  {
    id: "AP_AMC_S",
    name: "Advanced Playmaker",
    abbreviation: "AP",
    duty: "Support",
    strata: "AMC",
    isPlaymaker: true,
    baseWeights: { Acc:4, Agg:2, Bra:2, Cmp:3, Dec:4, Dri:3, Fir:3, Fla:2, Fre:2, Ldr:2, OtB:3, Pac:4, Pas:5, Prof:2, Sta:4, Str:2, Tec:4, Vis:4, Wor:3 , Cnt:3, Jum:3},
    description: "Creative hub who operates between midfield and attack to unlock defences."
  },
  {
    id: "AP_AMC_A",
    name: "Advanced Playmaker",
    abbreviation: "AP",
    duty: "Attack",
    strata: "AMC",
    isPlaymaker: true,
    baseWeights: { Acc:4, Agg:2, Bra:2, Dec:4, Dri:4, Fin:3, Fir:3, Fla:2, Fre:2, Ldr:2, OtB:3, Pac:4, Pas:5, Prof:2, Sta:4, Str:2, Tec:4, Vis:4, Wor:4 , Cnt:3, Jum:3},
    description: "Plays further forward as the team's primary creative force."
  },

  // ── STRIKERS ──
  {
    id: "DLF_S",
    name: "Deep-Lying Forward",
    abbreviation: "DLF",
    duty: "Support",
    strata: "ST",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bal:5, Bra:2, Cmp:3, Dec:3, Det:3, Fin:5, Fir:3, Ldr:2, OtB:3, Pac:3, Pas:4, Prof:2, Sta:2, Str:4, Tec:3, Vis:3 , Jum:4, Cnt:3},
    description: "Drops deep to link play and bring others into the attack."
  },
  {
    id: "DLF_A",
    name: "Deep-Lying Forward",
    abbreviation: "DLF",
    duty: "Attack",
    strata: "ST",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bal:4, Bra:2, Cmp:3, Dec:3, Det:3, Dri:3, Fin:5, Fir:3, Ldr:2, OtB:4, Pac:5, Pas:4, Prof:2, Sta:2, Str:2, Vis:3 , Jum:4, Cnt:3},
    description: "Drops deep but is more focused on turning and running at goal."
  },
  {
    id: "AF_A",
    name: "Advanced Forward",
    abbreviation: "AF",
    duty: "Attack",
    strata: "ST",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bal:4, Bra:2, Cmp:3, Dec:3, Det:3, Dri:4, Fin:5, Fir:2, Ldr:2, OtB:5, Pac:5, Prof:2, Sta:2, Str:2, Tec:3 , Jum:4, Cnt:3},
    description: "Leads the line as the primary goal scorer."
  },
  {
    id: "TF_S",
    name: "Target Forward",
    abbreviation: "TF",
    duty: "Support",
    strata: "ST",
    isPlaymaker: false,
    baseWeights: { Acc:2, Agg:2, Bal:4, Bra:4, Cmp:3, Det:3, Fin:5, Fir:2, Hea:5, Jum:5, Ldr:2, OtB:4, Pac:2, Prof:2, Sta:2, Str:5 , Cnt:3},
    description: "Holds up the ball and brings others into play with knockdowns."
  },
  {
    id: "TF_A",
    name: "Target Forward",
    abbreviation: "TF",
    duty: "Attack",
    strata: "ST",
    isPlaymaker: false,
    baseWeights: { Acc:2, Agg:2, Bal:4, Bra:4, Cmp:3, Det:3, Fin:5, Fir:2, Hea:5, Jum:5, Ldr:2, OtB:5, Pac:2, Prof:2, Sta:2, Str:5 , Cnt:3},
    description: "Dominant aerial presence who attacks crosses and finishes powerfully."
  },
  {
    id: "Poacher_A",
    name: "Poacher",
    abbreviation: "Poacher",
    duty: "Attack",
    strata: "ST",
    isPlaymaker: false,
    baseWeights: { Acc:4, Agg:2, Ant:5, Bal:4, Bra:2, Cmp:3, Det:3, Dri:2, Fin:5, Fir:2, Ldr:2, OtB:5, Pac:3, Prof:2, Sta:2, Str:2, Tec:2 , Jum:4, Cnt:3},
    description: "Lives on the shoulder of the last defender and finishes every chance."
  },
  {
    id: "CF_S",
    name: "Complete Forward",
    abbreviation: "CF",
    duty: "Support",
    strata: "ST",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bal:4, Bra:2, Cmp:3, Dec:3, Det:3, Dri:4, Fin:5, Fir:3, Ldr:2, OtB:4, Pac:5, Pas:4, Prof:2, Sta:2, Str:2, Tec:4 , Jum:4, Cnt:3},
    description: "A do-everything forward who drops deep, creates, scores, and presses."
  },
  {
    id: "CF_A",
    name: "Complete Forward",
    abbreviation: "CF",
    duty: "Attack",
    strata: "ST",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bal:4, Bra:2, Cmp:4, Dec:4, Det:3, Dri:4, Fin:5, Fir:3, Ldr:2, OtB:3, Pac:5, Pas:4, Prof:2, Sta:2, Str:2, Tec:4 , Jum:4, Cnt:3},
    description: "The complete striker — pace, power, technique, and a relentless goal threat."
  },
  {
    id: "PF_D",
    name: "Pressing Forward",
    abbreviation: "PF",
    duty: "Defend",
    strata: "ST",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:5, Bal:4, Bra:4, Cmp:3, Det:3, Fin:3, Fir:2, Ldr:2, OtB:2, Pac:5, Prof:2, Sta:5, Str:4, Tck:3, Wor:5 , Jum:4, Cnt:3},
    description: "The first line of defence — harries defenders relentlessly from the front."
  },
  {
    id: "PF_S",
    name: "Pressing Forward",
    abbreviation: "PF",
    duty: "Support",
    strata: "ST",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:3, Bal:4, Bra:3, Cmp:3, Det:3, Dri:3, Fin:4, Fir:2, Ldr:2, OtB:4, Pac:5, Pas:3, Prof:2, Sta:5, Str:3, Tec:3, Wor:4 , Jum:4, Cnt:3},
    description: "Presses high while also dropping to link play and win second balls."
  },
  {
    id: "PF_A",
    name: "Pressing Forward",
    abbreviation: "PF",
    duty: "Attack",
    strata: "ST",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:4, Bal:4, Bra:3, Cmp:3, Det:3, Fin:5, Fir:2, Ldr:2, OtB:4, Pac:5, Prof:2, Sta:5, Str:3, Wor:5 , Jum:4, Cnt:3},
    description: "Charges at defenders and presses intensely while chasing goals."
  },
  {
    id: "F9_S",
    name: "False Nine",
    abbreviation: "F9",
    duty: "Support",
    strata: "ST",
    isPlaymaker: false,
    baseWeights: { Acc:5, Agg:2, Bal:4, Bra:2, Cmp:3, Dec:3, Det:3, Dri:4, Fin:5, Fir:3, Ldr:2, OtB:4, Pac:5, Pas:3, Prof:2, Sta:2, Str:2, Vis:4, Wor:3 , Jum:4, Cnt:3},
    description: "A deep-lying striker who drops into midfield to create overloads."
  }
];
