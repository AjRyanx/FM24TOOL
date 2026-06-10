// ─── RELATIONSHIP PAIRING TABLES ───
// Scored role-pairings for the 7 missing relationship systems + spine check.
// Each entry: { a, b, compat, archetypes }
//   a, b        = role IDs (ordered, but comparison is symmetric)
//   compat      = 0.0 (conflict) to 1.0 (perfect match)
//   archetypes  = philosophy tags where this pair shines
//   link        = relationship type key for enforcement functions

var RELATIONSHIP_PAIRINGS = {

  // ═══════════════════════════════════════════════════
  // #6 — CB + FB RELATIONSHIP
  // When FB/WB pushes forward, does the CB cover the channel?
  // ═══════════════════════════════════════════════════
  CB_FB_channel: [

    // — CD + FB —
    { a:"CD_D",   b:"FB_D",   compat:1.0, archetypes:["def","bal"] },
    { a:"CD_D",   b:"FB_S",   compat:0.8, archetypes:["def","bal"] },
    { a:"CD_D",   b:"FB_A",   compat:0.5, archetypes:["def","bal"] },
    { a:"CD_D",   b:"WB_D",   compat:0.9, archetypes:["def","bal"] },
    { a:"CD_D",   b:"WB_S",   compat:0.7, archetypes:["def","bal"] },
    { a:"CD_D",   b:"WB_A",   compat:0.4, archetypes:["def","bal"] },
    { a:"CD_D",   b:"CWB_S",  compat:0.3, archetypes:["def","bal"] },
    { a:"CD_D",   b:"CWB_A",  compat:0.2, archetypes:["def"] },
    { a:"CD_D",   b:"IWB_D",  compat:0.8, archetypes:["pos","def"] },
    { a:"CD_D",   b:"IWB_S",  compat:0.7, archetypes:["pos","bal"] },
    { a:"CD_D",   b:"IWB_A",  compat:0.5, archetypes:["pos"] },
    { a:"CD_D",   b:"IFB_D",  compat:0.8, archetypes:["pos","def"] },
    { a:"CD_D",   b:"NFB_D",  compat:1.0, archetypes:["def"] },
    { a:"CD_ST",  b:"FB_D",   compat:0.8, archetypes:["press","bal"] },
    { a:"CD_ST",  b:"FB_S",   compat:0.6, archetypes:["press","bal"] },
    { a:"CD_ST",  b:"FB_A",   compat:0.3, archetypes:["press"] },
    { a:"CD_ST",  b:"WB_A",   compat:0.2, archetypes:["press"] },
    { a:"CD_ST",  b:"CWB_A",  compat:0.1, archetypes:["press"] },
    { a:"CD_CO",  b:"FB_A",   compat:0.9, archetypes:["pos","ctr"] },
    { a:"CD_CO",  b:"WB_A",   compat:0.9, archetypes:["ctr"] },
    { a:"CD_CO",  b:"CWB_A",  compat:0.8, archetypes:["pos","ctr"] },
    { a:"CD_CO",  b:"IWB_A",  compat:0.6, archetypes:["pos"] },

    // — BPD + FB —
    { a:"BPD_D",  b:"FB_D",   compat:0.9, archetypes:["pos","bal"] },
    { a:"BPD_D",  b:"FB_S",   compat:0.8, archetypes:["pos","bal"] },
    { a:"BPD_D",  b:"FB_A",   compat:0.5, archetypes:["pos","ctr"] },
    { a:"BPD_D",  b:"WB_A",   compat:0.4, archetypes:["pos","ctr"] },
    { a:"BPD_D",  b:"CWB_A",  compat:0.3, archetypes:["pos"] },
    { a:"BPD_CO", b:"WB_A",   compat:0.9, archetypes:["pos","ctr"] },
    { a:"BPD_CO", b:"CWB_A",  compat:0.8, archetypes:["pos","ctr"] },

    // — NCB + FB (notable conflicts) —
    { a:"NCB_D",  b:"FB_A",   compat:0.3, archetypes:["def"] },
    { a:"NCB_D",  b:"WB_A",   compat:0.2, archetypes:["def"] },
    { a:"NCB_D",  b:"CWB_A",  compat:0.1, archetypes:["def"] },
    { a:"NCB_D",  b:"IWB_S",  compat:0.5, archetypes:["def"] },
    { a:"NCB_D",  b:"IWB_A",  compat:0.3, archetypes:["def"] },

    // — WCB + FB (back-3) —
    { a:"WCB_D",  b:"FB_A",   compat:0.7, archetypes:["def","bal"] },
    { a:"WCB_S",  b:"FB_A",   compat:0.5, archetypes:["pos","bal"] },
    { a:"WCB_A",  b:"WB_D",   compat:0.6, archetypes:["press","ctr"] },
    { a:"WCB_A",  b:"WB_S",   compat:0.4, archetypes:["ctr"] },
    { a:"WCB_A",  b:"WB_A",   compat:0.3, archetypes:["press"] },
    { a:"WCB_D",  b:"CWB_A",  compat:0.6, archetypes:["pos","ctr"] },
    { a:"WCB_A",  b:"CWB_A",  compat:0.2, archetypes:["press"] },

    // — Libero + FB —
    { a:"Libero_S", b:"FB_A", compat:0.5, archetypes:["pos"] },
    { a:"Libero_S", b:"WB_A", compat:0.4, archetypes:["pos"] },
    { a:"Libero_A", b:"WB_S", compat:0.4, archetypes:["press","pos"] },
    { a:"Libero_A", b:"WB_A", compat:0.3, archetypes:["press"] },
    { a:"Libero_S", b:"IWB_A",compat:0.4, archetypes:["pos"] }
  ],

  // ═══════════════════════════════════════════════════
  // #8 — DM + FB RELATIONSHIP
  // When FB attacks, does DM shift to cover the flank?
  // ═══════════════════════════════════════════════════
  DM_FB_flank: [

    // — DM_D/S + FB —
    { a:"DM_D",   b:"FB_D",   compat:1.0, archetypes:["def","bal"] },
    { a:"DM_D",   b:"FB_S",   compat:0.8, archetypes:["def","bal"] },
    { a:"DM_D",   b:"FB_A",   compat:0.5, archetypes:["def","ctr"] },
    { a:"DM_D",   b:"WB_A",   compat:0.4, archetypes:["def","ctr"] },
    { a:"DM_D",   b:"CWB_A",  compat:0.3, archetypes:["def"] },
    { a:"DM_D",   b:"IWB_D",  compat:0.9, archetypes:["pos","def"] },
    { a:"DM_D",   b:"IWB_S",  compat:0.7, archetypes:["pos","bal"] },
    { a:"DM_D",   b:"IWB_A",  compat:0.5, archetypes:["pos"] },
    { a:"DM_D",   b:"IFB_D",  compat:0.7, archetypes:["pos","def"] },
    { a:"DM_D",   b:"NFB_D",  compat:1.0, archetypes:["def"] },
    { a:"DM_S",   b:"FB_A",   compat:0.6, archetypes:["bal","ctr"] },
    { a:"DM_S",   b:"WB_A",   compat:0.4, archetypes:["bal","ctr"] },
    { a:"DM_S",   b:"CWB_A",  compat:0.3, archetypes:["bal"] },
    { a:"DM_S",   b:"IWB_A",  compat:0.5, archetypes:["pos"] },

    // — DLP (DM) + FB —
    { a:"DLP_D",  b:"FB_A",   compat:0.5, archetypes:["pos","bal"] },
    { a:"DLP_D",  b:"WB_A",   compat:0.4, archetypes:["pos"] },
    { a:"DLP_D",  b:"CWB_A",  compat:0.3, archetypes:["pos"] },
    { a:"DLP_D",  b:"IWB_A",  compat:0.4, archetypes:["pos"] },
    { a:"DLP_D",  b:"IFB_D",  compat:0.6, archetypes:["pos"] },
    { a:"DLP_S",  b:"FB_A",   compat:0.5, archetypes:["pos","bal"] },
    { a:"DLP_S",  b:"WB_A",   compat:0.3, archetypes:["pos"] },
    { a:"DLP_S",  b:"CWB_A",  compat:0.2, archetypes:["pos"] },

    // — Anchor + FB (critical: Anchor never covers flank) —
    { a:"Anchor_D", b:"FB_D", compat:1.0, archetypes:["def"] },
    { a:"Anchor_D", b:"FB_S", compat:0.8, archetypes:["def","bal"] },
    { a:"Anchor_D", b:"FB_A", compat:0.3, archetypes:["def"] },
    { a:"Anchor_D", b:"WB_A", compat:0.2, archetypes:["def"] },
    { a:"Anchor_D", b:"CWB_A",compat:0.1, archetypes:["def"] },
    { a:"Anchor_D", b:"IWB_D",compat:0.9, archetypes:["pos","def"] },
    { a:"Anchor_D", b:"IWB_A",compat:0.5, archetypes:["pos"] },
    { a:"Anchor_D", b:"IFB_D",compat:0.8, archetypes:["pos","def"] },
    { a:"Anchor_D", b:"NFB_D",compat:1.0, archetypes:["def"] },

    // — HB + FB (specialist: HB drops, freeing FB) —
    { a:"HB_D",   b:"FB_A",   compat:1.0, archetypes:["pos","ctr"] },
    { a:"HB_D",   b:"WB_A",   compat:0.9, archetypes:["pos","ctr"] },
    { a:"HB_D",   b:"WB_S",   compat:1.0, archetypes:["pos","bal"] },
    { a:"HB_D",   b:"CWB_A",  compat:1.0, archetypes:["pos","press"] },
    { a:"HB_D",   b:"CWB_S",  compat:1.0, archetypes:["pos"] },
    { a:"HB_D",   b:"IWB_D",  compat:0.9, archetypes:["pos","def"] },
    { a:"HB_D",   b:"IWB_S",  compat:0.8, archetypes:["pos"] },
    { a:"HB_D",   b:"IWB_A",  compat:0.6, archetypes:["pos"] },
    { a:"HB_D",   b:"IFB_D",  compat:0.6, archetypes:["pos"] },
    { a:"HB_D",   b:"NFB_D",  compat:0.8, archetypes:["pos","def"] },

    // — Regista + FB —
    { a:"Regista_S", b:"FB_A",  compat:0.4, archetypes:["pos"] },
    { a:"Regista_S", b:"WB_A",  compat:0.3, archetypes:["pos"] },
    { a:"Regista_S", b:"CWB_A", compat:0.2, archetypes:["pos"] },
    { a:"Regista_S", b:"IWB_A", compat:0.4, archetypes:["pos"] },
    { a:"Regista_S", b:"IFB_D", compat:0.7, archetypes:["pos"] },
    { a:"Regista_S", b:"NFB_D", compat:0.8, archetypes:["pos"] },

    // — RPM (DM) + FB —
    { a:"RPM_S",   b:"FB_A",  compat:0.4, archetypes:["bal","press"] },
    { a:"RPM_S",   b:"WB_A",  compat:0.3, archetypes:["press"] },
    { a:"RPM_S",   b:"CWB_A", compat:0.2, archetypes:["press"] },
    { a:"RPM_S",   b:"IWB_A", compat:0.4, archetypes:["pos"] },
    { a:"RPM_S",   b:"IFB_D", compat:0.7, archetypes:["pos","bal"] },
    { a:"RPM_S",   b:"NFB_D", compat:0.8, archetypes:["bal"] },

    // — BWM (DM) + FB —
    { a:"BWM_D",   b:"FB_A",  compat:0.4, archetypes:["press","ctr"] },
    { a:"BWM_D",   b:"WB_A",  compat:0.3, archetypes:["press","ctr"] },
    { a:"BWM_D",   b:"CWB_A", compat:0.2, archetypes:["press"] },
    { a:"BWM_D",   b:"IWB_A", compat:0.5, archetypes:["pos","press"] },
    { a:"BWM_D",   b:"IFB_D", compat:0.7, archetypes:["pos","def"] },
    { a:"BWM_S",   b:"FB_A",  compat:0.3, archetypes:["press"] },
    { a:"BWM_S",   b:"WB_A",  compat:0.2, archetypes:["press"] },
    { a:"BWM_S",   b:"CWB_A", compat:0.1, archetypes:["press"] },

    // — SV + FB —
    { a:"SV_S",    b:"FB_A",  compat:0.5, archetypes:["bal","ctr"] },
    { a:"SV_S",    b:"WB_A",  compat:0.4, archetypes:["ctr"] },
    { a:"SV_S",    b:"CWB_A", compat:0.3, archetypes:["ctr","press"] },
    { a:"SV_S",    b:"IWB_A", compat:0.4, archetypes:["pos","ctr"] },
    { a:"SV_S",    b:"IFB_D", compat:0.8, archetypes:["pos","bal"] },
    { a:"SV_A",    b:"FB_A",  compat:0.3, archetypes:["ctr"] },
    { a:"SV_A",    b:"WB_A",  compat:0.2, archetypes:["ctr","press"] },
    { a:"SV_A",    b:"CWB_A", compat:0.1, archetypes:["press"] },
    { a:"SV_A",    b:"IFB_D", compat:0.6, archetypes:["pos","ctr"] }
  ],

  // ═══════════════════════════════════════════════════
  // #9 — DM + CB RELATIONSHIP
  // HB drops between CBs; pressing coordination; structural coverage.
  // ═══════════════════════════════════════════════════
  DM_CB_press: [

    // — HB + CB (back-3 creator) —
    { a:"HB_D",   b:"CD_D",   compat:1.0, archetypes:["pos","def"] },
    { a:"HB_D",   b:"BPD_D",  compat:1.0, archetypes:["pos"] },
    { a:"HB_D",   b:"NCB_D",  compat:0.8, archetypes:["pos","def"] },
    { a:"HB_D",   b:"CD_ST",  compat:0.6, archetypes:["pos","press"] },
    { a:"HB_D",   b:"WCB_D",  compat:0.9, archetypes:["pos","def"] },
    { a:"HB_D",   b:"WCB_S",  compat:0.7, archetypes:["pos"] },
    { a:"HB_D",   b:"Libero_S",compat:0.5, archetypes:["pos"] },
    { a:"HB_D",   b:"Libero_A",compat:0.4, archetypes:["pos"] },

    // — DM_D/S + CB pressing —
    { a:"DM_D",   b:"CD_D",   compat:1.0, archetypes:["def","bal"] },
    { a:"DM_D",   b:"CD_ST",  compat:0.8, archetypes:["press","bal"] },
    { a:"DM_D",   b:"BPD_ST", compat:0.7, archetypes:["press","pos"] },
    { a:"DM_S",   b:"CD_ST",  compat:0.6, archetypes:["press"] },
    { a:"DM_S",   b:"BPD_ST", compat:0.5, archetypes:["press","pos"] },

    // — Anchor + CB —
    { a:"Anchor_D", b:"CD_D",  compat:1.0, archetypes:["def"] },
    { a:"Anchor_D", b:"CD_ST", compat:1.0, archetypes:["def","press"] },
    { a:"Anchor_D", b:"BPD_ST",compat:0.9, archetypes:["def","press"] },
    { a:"Anchor_D", b:"NCB_D", compat:1.0, archetypes:["def"] },

    // — BWM + CB (double-step risk) —
    { a:"BWM_D",   b:"CD_D",  compat:0.8, archetypes:["press","def"] },
    { a:"BWM_D",   b:"CD_ST", compat:0.4, archetypes:["press"] },
    { a:"BWM_D",   b:"BPD_ST",compat:0.3, archetypes:["press"] },
    { a:"BWM_D",   b:"NCB_D", compat:0.7, archetypes:["press","def"] },
    { a:"BWM_S",   b:"CD_ST", compat:0.2, archetypes:["press"] },
    { a:"BWM_S",   b:"BPD_ST",compat:0.2, archetypes:["press"] },

    // — DLP + CB —
    { a:"DLP_D",   b:"CD_D",  compat:1.0, archetypes:["pos","def"] },
    { a:"DLP_D",   b:"BPD_D", compat:1.0, archetypes:["pos"] },
    { a:"DLP_S",   b:"CD_ST", compat:0.6, archetypes:["pos","press"] },

    // — Regista + CB (roamer coverage) —
    { a:"Regista_S", b:"CD_CO", compat:0.9, archetypes:["pos"] },
    { a:"Regista_S", b:"BPD_CO",compat:0.9, archetypes:["pos"] },
    { a:"Regista_S", b:"NCB_D", compat:0.7, archetypes:["pos","def"] },

    // — RPM + CB —
    { a:"RPM_S",    b:"CD_D",  compat:0.7, archetypes:["bal"] },
    { a:"RPM_S",    b:"CD_CO", compat:0.9, archetypes:["bal"] },
    { a:"RPM_S",    b:"BPD_D", compat:0.7, archetypes:["pos","bal"] },

    // — Libero + DM double-step —
    { a:"DM_D",     b:"Libero_S", compat:0.6, archetypes:["pos"] },
    { a:"DM_S",     b:"Libero_A", compat:0.3, archetypes:["press"] },
    { a:"Anchor_D", b:"Libero_S", compat:0.7, archetypes:["pos","def"] },
    { a:"Anchor_D", b:"Libero_A", compat:0.5, archetypes:["pos","press"] },
    { a:"DLP_D",    b:"Libero_S", compat:0.7, archetypes:["pos"] },
    { a:"BWM_D",    b:"Libero_S", compat:0.3, archetypes:["press"] },

    // — SV + CB —
    { a:"SV_S",    b:"CD_D",   compat:0.7, archetypes:["bal","ctr"] },
    { a:"SV_A",    b:"CD_D",   compat:0.4, archetypes:["ctr"] },
    { a:"SV_A",    b:"CD_CO",  compat:0.7, archetypes:["ctr"] }
  ],

  // ═══════════════════════════════════════════════════
  // #14 — MEZZALA + OPPOSITE CM
  // Mezzala drifts wide; opposite CM must cover central space.
  // ═══════════════════════════════════════════════════
  Mezzala_CM_cover: [

    // — Mezzala + opposite CM —
    { a:"Mezzala_S", b:"CM_D",       compat:0.9, archetypes:["bal","def"] },
    { a:"Mezzala_S", b:"CM_S",       compat:0.6, archetypes:["bal"] },
    { a:"Mezzala_S", b:"CM_A",       compat:0.3, archetypes:["bal","ctr"] },
    { a:"Mezzala_A", b:"CM_D",       compat:1.0, archetypes:["bal","def"] },
    { a:"Mezzala_A", b:"CM_S",       compat:0.5, archetypes:["bal"] },
    { a:"Mezzala_A", b:"CM_A",       compat:0.2, archetypes:["ctr"] },
    { a:"Mezzala_A", b:"BBM_S",      compat:0.8, archetypes:["press","bal"] },
    { a:"Mezzala_S", b:"BBM_S",      compat:0.7, archetypes:["press","bal"] },
    { a:"Mezzala_S", b:"Carrilero_S",compat:1.0, archetypes:["def","bal"] },
    { a:"Mezzala_A", b:"Carrilero_S",compat:0.9, archetypes:["bal"] },
    { a:"Mezzala_S", b:"DLP_CM_D",   compat:0.9, archetypes:["pos","def"] },
    { a:"Mezzala_A", b:"DLP_CM_D",   compat:1.0, archetypes:["pos","def"] },
    { a:"Mezzala_S", b:"DLP_CM_S",   compat:0.6, archetypes:["pos"] },
    { a:"Mezzala_A", b:"DLP_CM_S",   compat:0.5, archetypes:["pos"] },
    { a:"Mezzala_S", b:"BWM_CM_D",   compat:0.8, archetypes:["press","def"] },
    { a:"Mezzala_A", b:"BWM_CM_D",   compat:0.9, archetypes:["press","def"] },
    { a:"Mezzala_S", b:"BWM_CM_S",   compat:0.4, archetypes:["press"] },
    { a:"Mezzala_A", b:"BWM_CM_S",   compat:0.3, archetypes:["press"] },
    { a:"Mezzala_S", b:"RPM_CM_S",   compat:0.5, archetypes:["bal"] },
    { a:"Mezzala_A", b:"RPM_CM_S",   compat:0.4, archetypes:["bal"] },
    { a:"Mezzala_S", b:"AP_S",       compat:0.4, archetypes:["pos"] },
    { a:"Mezzala_A", b:"AP_S",       compat:0.3, archetypes:["pos"] },
    { a:"Mezzala_A", b:"AP_A",       compat:0.2, archetypes:["pos"] },

    // — Mezzala + DM (spine cover) —
    { a:"Mezzala_S", b:"DM_D",       compat:0.8, archetypes:["bal","def"] },
    { a:"Mezzala_A", b:"DM_D",       compat:0.9, archetypes:["ctr","def"] },
    { a:"Mezzala_S", b:"Anchor_D",   compat:1.0, archetypes:["def"] },
    { a:"Mezzala_A", b:"Anchor_D",   compat:1.0, archetypes:["def"] },
    { a:"Mezzala_S", b:"DLP_D",      compat:0.7, archetypes:["pos"] },
    { a:"Mezzala_A", b:"DLP_D",      compat:0.6, archetypes:["pos"] },
    { a:"Mezzala_S", b:"BWM_D",      compat:0.7, archetypes:["press"] },
    { a:"Mezzala_A", b:"BWM_D",      compat:0.8, archetypes:["press"] },
    { a:"Mezzala_S", b:"HB_D",       compat:0.8, archetypes:["pos"] },
    { a:"Mezzala_A", b:"HB_D",       compat:0.7, archetypes:["pos"] },
    { a:"Mezzala_S", b:"SV_S",       compat:0.3, archetypes:["ctr"] },
    { a:"Mezzala_A", b:"SV_A",       compat:0.1, archetypes:["ctr","press"] }
  ],

  // ═══════════════════════════════════════════════════
  // #18 — AM + CM PAIRING
  // SS doesn't track back. Treq doesn't press. Enganche is static.
  // ═══════════════════════════════════════════════════
  AM_CM_balance: [

    // — SS + CM —
    { a:"SS_A",      b:"CM_D",       compat:0.9, archetypes:["bal","def"] },
    { a:"SS_A",      b:"CM_S",       compat:0.5, archetypes:["bal"] },
    { a:"SS_A",      b:"CM_A",       compat:0.2, archetypes:["ctr"] },
    { a:"SS_A",      b:"BBM_S",      compat:0.8, archetypes:["press","bal"] },
    { a:"SS_A",      b:"Carrilero_S",compat:1.0, archetypes:["def","bal"] },
    { a:"SS_A",      b:"DLP_CM_D",   compat:0.8, archetypes:["pos","def"] },
    { a:"SS_A",      b:"DLP_CM_S",   compat:0.5, archetypes:["pos"] },
    { a:"SS_A",      b:"BWM_CM_D",   compat:0.8, archetypes:["press","def"] },
    { a:"SS_A",      b:"BWM_CM_S",   compat:0.4, archetypes:["press"] },
    { a:"SS_A",      b:"RPM_CM_S",   compat:0.6, archetypes:["bal"] },
    { a:"SS_A",      b:"AP_S",       compat:0.3, archetypes:["pos"] },
    { a:"SS_A",      b:"Mezzala_S",  compat:0.3, archetypes:["bal"] },
    { a:"SS_A",      b:"Mezzala_A",  compat:0.2, archetypes:["ctr"] },

    // — Treq + CM —
    { a:"Trequartista_A", b:"CM_D",       compat:0.9, archetypes:["pos","def"] },
    { a:"Trequartista_A", b:"CM_S",       compat:0.5, archetypes:["pos"] },
    { a:"Trequartista_A", b:"CM_A",       compat:0.2, archetypes:["pos"] },
    { a:"Trequartista_A", b:"BBM_S",      compat:1.0, archetypes:["pos","press"] },
    { a:"Trequartista_A", b:"Carrilero_S",compat:0.8, archetypes:["pos","def"] },
    { a:"Trequartista_A", b:"DLP_CM_D",   compat:0.7, archetypes:["pos"] },
    { a:"Trequartista_A", b:"BWM_CM_D",   compat:1.0, archetypes:["press","pos"] },
    { a:"Trequartista_A", b:"BWM_CM_S",   compat:0.8, archetypes:["press"] },
    { a:"Trequartista_A", b:"RPM_CM_S",   compat:0.7, archetypes:["pos","press"] },
    { a:"Trequartista_A", b:"AP_S",       compat:0.3, archetypes:["pos"] },
    { a:"Trequartista_A", b:"Mezzala_S",  compat:0.2, archetypes:["pos"] },
    { a:"Trequartista_A", b:"Mezzala_A",  compat:0.1, archetypes:["pos"] },

    // — Enganche + CM —
    { a:"Enganche_S", b:"CM_D",       compat:0.6, archetypes:["pos","def"] },
    { a:"Enganche_S", b:"CM_S",       compat:0.6, archetypes:["pos"] },
    { a:"Enganche_S", b:"CM_A",       compat:0.9, archetypes:["pos","ctr"] },
    { a:"Enganche_S", b:"BBM_S",      compat:0.8, archetypes:["pos","press"] },
    { a:"Enganche_S", b:"Carrilero_S",compat:0.7, archetypes:["pos","def"] },
    { a:"Enganche_S", b:"AP_A",       compat:1.0, archetypes:["pos"] },
    { a:"Enganche_S", b:"Mezzala_S",  compat:0.7, archetypes:["pos"] },
    { a:"Enganche_S", b:"Mezzala_A",  compat:0.8, archetypes:["pos","ctr"] },
    { a:"Enganche_S", b:"RPM_CM_S",   compat:0.6, archetypes:["pos","bal"] },
    { a:"Enganche_S", b:"BWM_CM_D",   compat:0.5, archetypes:["press","pos"] },
    { a:"Enganche_S", b:"DLP_CM_D",   compat:0.5, archetypes:["pos"] },
    { a:"Enganche_S", b:"DLP_CM_S",   compat:0.4, archetypes:["pos"] },

    // — AM_S/AM_A + CM —
    { a:"AM_S",      b:"CM_D",       compat:0.8, archetypes:["bal","def"] },
    { a:"AM_S",      b:"CM_S",       compat:0.7, archetypes:["bal"] },
    { a:"AM_S",      b:"CM_A",       compat:0.5, archetypes:["bal","ctr"] },
    { a:"AM_S",      b:"BBM_S",      compat:0.8, archetypes:["press","bal"] },
    { a:"AM_S",      b:"Carrilero_S",compat:0.9, archetypes:["def","bal"] },
    { a:"AM_S",      b:"DLP_CM_D",   compat:0.7, archetypes:["pos"] },
    { a:"AM_S",      b:"Mezzala_S",  compat:0.6, archetypes:["pos","bal"] },
    { a:"AM_A",      b:"CM_D",       compat:0.9, archetypes:["def","ctr"] },
    { a:"AM_A",      b:"CM_S",       compat:0.6, archetypes:["bal"] },
    { a:"AM_A",      b:"BBM_S",      compat:0.7, archetypes:["press","bal"] },
    { a:"AM_A",      b:"Carrilero_S",compat:0.9, archetypes:["def","bal"] },
    { a:"AM_A",      b:"DLP_CM_D",   compat:0.6, archetypes:["pos"] },
    { a:"AM_A",      b:"BWM_CM_D",   compat:0.8, archetypes:["press"] },
    { a:"AM_A",      b:"Mezzala_S",  compat:0.4, archetypes:["bal"] },
    { a:"AM_A",      b:"Mezzala_A",  compat:0.2, archetypes:["ctr"] }
  ],

  // ═══════════════════════════════════════════════════
  // #21 — FALSE 9 + SURROUNDING ROLES
  // F9 drops deep; who fills the vacated box space?
  // ═══════════════════════════════════════════════════
  F9_surrounds: [

    // — F9 + Wide Attackers —
    { a:"F9_S",    b:"IF_S",    compat:0.7, archetypes:["pos","bal"] },
    { a:"F9_S",    b:"IF_A",    compat:1.0, archetypes:["pos","ctr"] },
    { a:"F9_S",    b:"IW_S",    compat:0.7, archetypes:["pos"] },
    { a:"F9_S",    b:"IW_A",    compat:0.9, archetypes:["pos","press"] },
    { a:"F9_S",    b:"W_S",     compat:0.4, archetypes:["bal"] },
    { a:"F9_S",    b:"W_A",     compat:0.5, archetypes:["ctr"] },
    { a:"F9_S",    b:"RMD_A",   compat:1.0, archetypes:["ctr"] },
    { a:"F9_S",    b:"AP_WA_S", compat:0.6, archetypes:["pos"] },
    { a:"F9_S",    b:"TQ_WA_A", compat:0.4, archetypes:["pos"] },

    // — F9 + AM —
    { a:"F9_S",    b:"AM_A",    compat:0.8, archetypes:["pos","bal"] },
    { a:"F9_S",    b:"SS_A",    compat:1.0, archetypes:["pos","ctr"] },
    { a:"F9_S",    b:"AP_AMC_S",compat:0.6, archetypes:["pos"] },
    { a:"F9_S",    b:"AP_AMC_A",compat:0.7, archetypes:["pos"] },
    { a:"F9_S",    b:"Trequartista_A",compat:0.4, archetypes:["pos"] },

    // — F9 + WM Wide Attackers (ML/MR strata) —
    { a:"F9_S",    b:"Winger_WM_S",  compat:0.4, archetypes:["bal"] },
    { a:"F9_S",    b:"Winger_WM_A",  compat:0.5, archetypes:["ctr"] },
    { a:"F9_S",    b:"IW_WM_S", compat:0.7, archetypes:["pos"] },
    { a:"F9_S",    b:"IW_WM_A", compat:0.9, archetypes:["pos","press"] },
    { a:"F9_S",    b:"WP_WM_S", compat:0.5, archetypes:["pos"] }
  ],

  // ═══════════════════════════════════════════════════
  // #22 — TARGET MAN + SUPPORT CAST
  // TM needs crossers + second-ball runners.
  // ═══════════════════════════════════════════════════
  TM_support: [

    // — TM + Wide cross providers —
    { a:"TF_S",    b:"W_S",     compat:1.0, archetypes:["def","bal"] },
    { a:"TF_S",    b:"W_A",     compat:0.9, archetypes:["ctr","bal"] },
    { a:"TF_A",    b:"W_S",     compat:0.9, archetypes:["bal"] },
    { a:"TF_A",    b:"W_A",     compat:1.0, archetypes:["ctr"] },
    { a:"TF_S",    b:"WM_S",    compat:0.8, archetypes:["def","bal"] },
    { a:"TF_S",    b:"WM_A",    compat:0.7, archetypes:["ctr"] },
    { a:"TF_S",    b:"WB_A",    compat:0.9, archetypes:["pos","ctr"] },
    { a:"TF_S",    b:"CWB_S",   compat:0.8, archetypes:["pos"] },
    { a:"TF_A",    b:"CWB_A",   compat:0.9, archetypes:["press","ctr"] },
    { a:"TF_S",    b:"AP_WA_S", compat:0.7, archetypes:["pos"] },

    // — TM + NOT a crosser (conflict) —
    { a:"TF_S",    b:"IWB_S",   compat:0.2, archetypes:["pos"] },
    { a:"TF_S",    b:"IWB_A",   compat:0.1, archetypes:["pos"] },
    { a:"TF_S",    b:"NFB_D",   compat:0.1, archetypes:["def"] },
    { a:"TF_S",    b:"IF_A",    compat:0.3, archetypes:["ctr","pos"] },
    { a:"TF_S",    b:"IW_A",    compat:0.3, archetypes:["pos","press"] },

    // — TM + Second-ball runners —
    { a:"TF_S",    b:"CM_A",    compat:0.8, archetypes:["ctr","bal"] },
    { a:"TF_S",    b:"CM_S",    compat:0.6, archetypes:["bal"] },
    { a:"TF_A",    b:"CM_A",    compat:0.9, archetypes:["ctr"] },
    { a:"TF_S",    b:"BBM_S",   compat:1.0, archetypes:["press","bal"] },
    { a:"TF_A",    b:"BBM_S",   compat:0.9, archetypes:["press","ctr"] },
    { a:"TF_S",    b:"Mezzala_S",compat:0.6, archetypes:["bal"] },
    { a:"TF_S",    b:"Mezzala_A",compat:0.7, archetypes:["ctr"] },
    { a:"TF_S",    b:"AM_S",    compat:0.6, archetypes:["bal"] },
    { a:"TF_S",    b:"AM_A",    compat:0.7, archetypes:["ctr"] },
    { a:"TF_S",    b:"SS_A",    compat:0.8, archetypes:["ctr","bal"] },
    { a:"TF_A",    b:"SS_A",    compat:0.8, archetypes:["ctr"] },
    { a:"TF_S",    b:"DLF_S",   compat:0.7, archetypes:["pos"] },
    { a:"TF_S",    b:"CF_S",    compat:0.7, archetypes:["bal"] },

    // — TM partners that conflict —
    { a:"TF_S",    b:"Trequartista_A",compat:0.3, archetypes:["pos"] },
    { a:"TF_S",    b:"Enganche_S",    compat:0.3, archetypes:["pos"] },
    { a:"TF_S",    b:"F9_S",          compat:0.2, archetypes:["pos"] }
  ],

  // ═══════════════════════════════════════════════════
  // #25 — SPINE CHECK
  // Vertical coherence — mismatched GK/CB/DM/CM/ST styles.
  // ═══════════════════════════════════════════════════
  spine_profiles: [

    // — GOOD spines —
    {
      spine: { GK:"SK_A", DC:"BPD_ST", DM:"BWM_D", CM:"AP_A", ST:"AF_A" },
      score: 1.0, archetypes:["press","pos"], label:"High press aggressive"
    },
    {
      spine: { GK:"SK_S", DC:"BPD_ST", DM:"RPM_S", CM:"BBM_S", ST:"AF_A" },
      score: 1.0, archetypes:["press","bal"], label:"High energy balanced"
    },
    {
      spine: { GK:"SK_S", DC:"BPD_D", DM:"DLP_D", CM:"CM_A", ST:"AF_A" },
      score: 1.0, archetypes:["pos","bal"], label:"Structured possession"
    },
    {
      spine: { GK:"SK_A", DC:"BPD_ST", DM:"Regista_S", CM:"Mezzala_A", ST:"CF_A" },
      score: 0.9, archetypes:["pos","press"], label:"Expansive possession"
    },
    {
      spine: { GK:"SK_S", DC:"BPD_D", DM:"BWM_D", CM:"AP_S", ST:"CF_S" },
      score: 0.9, archetypes:["pos","bal"], label:"Balanced possession"
    },
    {
      spine: { GK:"GK_D", DC:"CD_D", DM:"DM_D", CM:"CM_D", ST:"TF_S" },
      score: 1.0, archetypes:["def","bal"], label:"Classic defensive"
    },
    {
      spine: { GK:"GK_D", DC:"CD_D", DM:"Anchor_D", CM:"CM_D", ST:"TF_A" },
      score: 0.9, archetypes:["def","ctr"], label:"Defensive counter"
    },
    {
      spine: { GK:"GK_D", DC:"NCB_D", DM:"DM_D", CM:"CM_S", ST:"TF_S" },
      score: 0.9, archetypes:["def","bal"], label:"Narrow defensive"
    },
    {
      spine: { GK:"GK_D", DC:"CD_CO", DM:"BWM_D", CM:"CM_A", ST:"AF_A" },
      score: 0.9, archetypes:["ctr","press"], label:"Direct counter"
    },
    {
      spine: { GK:"GK_D", DC:"CD_D", DM:"Anchor_D", CM:"BBM_S", ST:"Poacher_A" },
      score: 0.9, archetypes:["ctr","bal"], label:"Anchor counter"
    },
    {
      spine: { GK:"GK_D", DC:"CD_CO", DM:"DM_D", CM:"CM_A", ST:"AF_A" },
      score: 1.0, archetypes:["ctr"], label:"Pure counter"
    },
    {
      spine: { GK:"SK_S", DC:"CD_D", DM:"SV_A", CM:"CM_A", ST:"AF_A" },
      score: 0.8, archetypes:["ctr","press"], label:"Counter press"
    },
    {
      spine: { GK:"SK_S", DC:"CD_CO", DM:"DLP_D", CM:"BBM_S", ST:"CF_A" },
      score: 0.9, archetypes:["pos","ctr"], label:"Possession to transition"
    },
    {
      spine: { GK:"GK_D", DC:"BPD_D", DM:"Anchor_D", CM:"DLP_CM_S", ST:"DLF_S" },
      score: 0.9, archetypes:["pos","def"], label:"Patient possession"
    },
    {
      spine: { GK:"SK_S", DC:"BPD_D", DM:"HB_D", CM:"CM_S", ST:"F9_S" },
      score: 1.0, archetypes:["pos"], label:"Fluid morphing"
    },
    {
      spine: { GK:"SK_S", DC:"CD_ST", DM:"BWM_D", CM:"BBM_S", ST:"PF_S" },
      score: 0.9, archetypes:["press"], label:"Aggressive press"
    },

    // — MISMATCH spines (for conflict detection) —
    {
      spine: { GK:"GK_D", DC:"NCB_D", DM:"Regista_S", CM:"CM_D", ST:"TF_S" },
      score: 0.2, archetypes:[], label:"MISMATCH: Regista demands BPD, NCB is direct"
    },
    {
      spine: { GK:"SK_A", DC:"NCB_D", DM:"DM_D", CM:"AP_A", ST:"TF_A" },
      score: 0.2, archetypes:[], label:"MISMATCH: SK_A + NCB_D — DL conflict"
    },
    {
      spine: { GK:"SK_A", DC:"CD_D", DM:"Anchor_D", CM:"DLP_CM_S", ST:"Poacher_A" },
      score: 0.2, archetypes:[], label:"MISMATCH: SK_A high line + Anchor deep — zone conflict"
    },
    {
      spine: { GK:"GK_D", DC:"BPD_ST", DM:"Regista_S", CM:"Mezzala_A", ST:"Poacher_A" },
      score: 0.2, archetypes:[], label:"MISMATCH: GK_D low line + BPD_ST high press"
    },
    {
      spine: { GK:"SK_S", DC:"CD_D", DM:"DM_D", CM:"CM_D", ST:"AF_A" },
      score: 0.3, archetypes:[], label:"MISMATCH: SK_S distributes, but DM+CM+CD are slow — AF_A starved"
    },
    {
      spine: { GK:"GK_D", DC:"BPD_D", DM:"Regista_S", CM:"AP_A", ST:"Poacher_A" },
      score: 0.2, archetypes:[], label:"MISMATCH: GK_D low line contradicts roaming DM+AP"
    },
    {
      spine: { GK:"SK_A", DC:"NCB_D", DM:"BWM_S", CM:"CM_D", ST:"AF_A" },
      score: 0.2, archetypes:[], label:"MISMATCH: SK_A high line + NCB low block"
    }
  ],

  // ═══════════════════════════════════════════════════
  // NP-01 to NP-05 — Vertical Axis: DM + AM
  // When DM and AM occupy the same vertical channel,
  // do they complement or conflict?
  // ═══════════════════════════════════════════════════
  DM_AM_vertical: [
    { a:"Anchor_D",       b:"Trequartista_A", compat:0.05, archetypes:[] },
    { a:"Regista_S",      b:"SS_A",           compat:0.40, archetypes:[] },
    { a:"HB_D",           b:"Enganche_S",     compat:0.35, archetypes:[] },
    { a:"BWM_D",          b:"Trequartista_A", compat:0.85, archetypes:["press","ctr"] },
    { a:"DM_D",           b:"AM_A",           compat:0.90, archetypes:["def","bal"] }
  ],

  // ═══════════════════════════════════════════════════
  // NP-06 to NP-10 — Wide Forward + CM (Same Flank)
  // CM and WA on the same side: do they overlap or
  // complement each other's movement?
  // ═══════════════════════════════════════════════════
  WF_CM_sides: [
    { a:"Mezzala_A",  b:"IF_A",         compat:0.05, archetypes:[] },
    { a:"CM_D",       b:"IF_A",         compat:0.85, archetypes:["def","bal"] },
    { a:"BBM_S",      b:"IW_A",         compat:0.80, archetypes:["press","ctr"] },
    { a:"Carrilero_S",b:"Winger_A",     compat:0.85, archetypes:["def","bal"] },
    { a:"AP_S",       b:"IF_S",         compat:0.40, archetypes:["pos"] }
  ],

  // ═══════════════════════════════════════════════════
  // NP-11 to NP-15 — Full-Back / Wing-Back + Winger
  // WB/FB and wide forward on same flank: is width
  // maintained or compromised?
  // ═══════════════════════════════════════════════════
  FB_winger: [
    // IF / IW + FB — most common real-life wide attack pairings
    { a:"FB_S",   b:"IF_S",     compat:0.90, archetypes:["bal","press","ctr"] },
    { a:"FB_S",   b:"IF_A",     compat:0.88, archetypes:["press","ctr"] },
    { a:"FB_A",   b:"IF_A",     compat:0.92, archetypes:["press","ctr"] },
    { a:"FB_A",   b:"IF_S",     compat:0.88, archetypes:["bal","press"] },
    { a:"FB_S",   b:"IW_S",     compat:0.90, archetypes:["pos","bal"] },
    { a:"FB_A",   b:"IW_A",     compat:0.88, archetypes:["pos","press"] },
    { a:"FB_D",   b:"IF_S",     compat:0.85, archetypes:["def","bal"] },
    { a:"FB_D",   b:"IW_S",     compat:0.82, archetypes:["def","pos"] },
    // IF / IW + WB
    { a:"WB_S",   b:"IF_S",     compat:0.90, archetypes:["bal","ctr"] },
    { a:"WB_A",   b:"IF_A",     compat:0.92, archetypes:["press","ctr"] },
    { a:"WB_A",   b:"IF_S",     compat:0.88, archetypes:["press","bal"] },
    { a:"WB_S",   b:"IW_A",     compat:0.90, archetypes:["pos","press"] },
    { a:"WB_A",   b:"IW_A",     compat:0.88, archetypes:["pos","press"] },
    { a:"WB_A",   b:"IW_S",     compat:0.85, archetypes:["bal","pos"] },
    { a:"CWB_A",  b:"IF_A",     compat:0.85, archetypes:["press","ctr"] },
    { a:"CWB_S",  b:"IF_S",     compat:0.82, archetypes:["bal"] },
    { a:"CWB_A",  b:"IW_S",     compat:0.80, archetypes:["pos"] },
    { a:"IWB_S",  b:"IW_A",     compat:0.82, archetypes:["pos"] },
    { a:"IWB_A",  b:"IW_S",     compat:0.80, archetypes:["pos"] },
    { a:"IWB_S",  b:"IF_S",     compat:0.78, archetypes:["pos","bal"] },
    // Traditional Winger + FB/WB (one flank only — still valid)
    { a:"FB_S",   b:"Winger_S", compat:0.88, archetypes:["bal","ctr"] },
    { a:"FB_A",   b:"Winger_A", compat:0.85, archetypes:["ctr"] },
    { a:"WB_A",   b:"Winger_S", compat:0.85, archetypes:["bal","ctr"] },
    { a:"FB_D",   b:"Winger_S", compat:0.88, archetypes:["def","ctr"] },
    // WM + FB (midfield line width)
    { a:"FB_S",   b:"Winger_WM_S", compat:0.85, archetypes:["bal","ctr"] },
    { a:"FB_S",   b:"IW_WM_S",     compat:0.88, archetypes:["pos","bal"] },
    { a:"FB_D",   b:"WM_S",        compat:0.82, archetypes:["def","bal"] },
  ],

  // ═══════════════════════════════════════════════════
  // NP-16 to NP-20 — Double AM Logic
  // Two AMCs in 4-2-2-1 / 4-4-1-1: are they balanced
  // or do they create static/roam conflicts?
  // ═══════════════════════════════════════════════════
  AM_double: [
    { a:"SS_A",          b:"Trequartista_A", compat:0.05, archetypes:[] },
    { a:"AM_S",          b:"Enganche_S",     compat:0.40, archetypes:["pos","bal"] },
    { a:"SS_A",          b:"AP_AMC_S",       compat:0.85, archetypes:["press","ctr"] },
    { a:"Trequartista_A",b:"Enganche_S",     compat:0.20, archetypes:[] },
    { a:"AM_A",          b:"AM_A",           compat:0.20, archetypes:[] }
  ],

  // ═══════════════════════════════════════════════════
  // NP-26 to NP-30 — Goalkeeper + First Defender
  // GK and DC combination: are their line heights and
  // distribution styles compatible?
  // ═══════════════════════════════════════════════════
  GK_DC: [
    { a:"SK_A",   b:"NCB_D",   compat:0.05, archetypes:[] },
    { a:"GK_D",   b:"BPD_ST",  compat:0.35, archetypes:[] },
    { a:"SK_S",   b:"CD_CO",   compat:0.85, archetypes:["pos","bal"] },
    { a:"GK_D",   b:"Libero_S",compat:0.35, archetypes:["def"] },
    { a:"SK_A",   b:"CD_ST",   compat:0.85, archetypes:["press","pos"] }
  ]
};

// ─── HELPER: Lookup pairing compatibility ───
function getPairingCompatibility(roleA, roleB, table) {
  if (!table) return 0.5;
  for (var i = 0; i < table.length; i++) {
    var p = table[i];
    if ((p.a === roleA && p.b === roleB) || (p.a === roleB && p.b === roleA)) {
      return p.compat;
    }
  }
  return 0.5; // unknown pairing — neutral
}

// ─── HELPER: Get pairing entry for two roles ───
function getPairingEntry(roleA, roleB, table) {
  if (!table) return null;
  for (var i = 0; i < table.length; i++) {
    var p = table[i];
    if ((p.a === roleA && p.b === roleB) || (p.a === roleB && p.b === roleA)) {
      return p;
    }
  }
  return null;
}

// ─── HELPER: Find spine profile for a set of roles ───
function getSpineScore(slotRoles, profiles) {
  if (!profiles) return 0.5;
  for (var i = 0; i < profiles.length; i++) {
    var sp = profiles[i];
    var match = true;
    for (var key in sp.spine) {
      if (sp.spine.hasOwnProperty(key)) {
        if (slotRoles[key] !== sp.spine[key]) { match = false; break; }
      }
    }
    if (match) return sp.score;
  }
  return 0.5;
}
