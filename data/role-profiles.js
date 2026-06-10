// ─── ROLE BEHAVIORAL PROFILES ───
// Attribute-driven profiles for all FM24 roles.
// Each profile encodes movement, defensive, attacking, build-up tendencies
// plus boolean special flags. Used by the pairing engine (Layer 1) and
// structural validators (Layers 2-5).

var ROLE_PROFILES = {
  // ════════════════════════════════════════════
  // GOALKEEPERS
  // ════════════════════════════════════════════
  GK_D: {
    movement:      { vertical:0.0, width_drift:0.0, roam:0.0, hold_position:1.0, run_beyond_striker:0.0 },
    defensive:     { track_back:1.0, press_intensity:0.1, cover_wide:0.0, cover_central:0.0 },
    attacking:     { crosses:0.0, through_balls:0.2, dribble:0.0, shot_frequency:0.0, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.3, ball_carry:0.0, switch_play:0.2 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:false }
  },
  SK_D: {
    movement:      { vertical:0.2, width_drift:0.1, roam:0.1, hold_position:0.8, run_beyond_striker:0.0 },
    defensive:     { track_back:0.9, press_intensity:0.2, cover_wide:0.2, cover_central:0.3 },
    attacking:     { crosses:0.0, through_balls:0.3, dribble:0.0, shot_frequency:0.0, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.2, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:true, press_monster:false, roaming:false,
                     holder:true, distributor:true }
  },
  SK_S: {
    movement:      { vertical:0.3, width_drift:0.2, roam:0.2, hold_position:0.6, run_beyond_striker:0.0 },
    defensive:     { track_back:0.8, press_intensity:0.3, cover_wide:0.3, cover_central:0.4 },
    attacking:     { crosses:0.0, through_balls:0.4, dribble:0.2, shot_frequency:0.0, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.6, ball_carry:0.3, switch_play:0.5 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:true, press_monster:false, roaming:false,
                     holder:true, distributor:true }
  },
  SK_A: {
    movement:      { vertical:0.5, width_drift:0.3, roam:0.3, hold_position:0.3, run_beyond_striker:0.0 },
    defensive:     { track_back:0.6, press_intensity:0.4, cover_wide:0.4, cover_central:0.5 },
    attacking:     { crosses:0.0, through_balls:0.5, dribble:0.3, shot_frequency:0.0, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.4, ball_carry:0.4, switch_play:0.6 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:true, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },

  // ════════════════════════════════════════════
  // CENTRE-BACKS
  // ════════════════════════════════════════════
  CD_D: {
    movement:      { vertical:0.1, width_drift:0.1, roam:0.0, hold_position:1.0, run_beyond_striker:0.0 },
    defensive:     { track_back:1.0, press_intensity:0.3, cover_wide:0.4, cover_central:0.9 },
    attacking:     { crosses:0.0, through_balls:0.1, dribble:0.0, shot_frequency:0.1, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.4, ball_carry:0.1, switch_play:0.2 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:false }
  },
  CD_ST: {
    movement:      { vertical:0.3, width_drift:0.2, roam:0.1, hold_position:0.7, run_beyond_striker:0.0 },
    defensive:     { track_back:0.9, press_intensity:0.6, cover_wide:0.3, cover_central:0.7 },
    attacking:     { crosses:0.0, through_balls:0.1, dribble:0.0, shot_frequency:0.1, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.3, ball_carry:0.1, switch_play:0.2 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:false }
  },
  CD_CO: {
    movement:      { vertical:0.0, width_drift:0.2, roam:0.0, hold_position:1.0, run_beyond_striker:0.0 },
    defensive:     { track_back:1.0, press_intensity:0.2, cover_wide:0.6, cover_central:1.0 },
    attacking:     { crosses:0.0, through_balls:0.1, dribble:0.0, shot_frequency:0.0, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.1, switch_play:0.3 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:false }
  },
  BPD_D: {
    movement:      { vertical:0.3, width_drift:0.2, roam:0.2, hold_position:0.8, run_beyond_striker:0.0 },
    defensive:     { track_back:0.9, press_intensity:0.3, cover_wide:0.3, cover_central:0.8 },
    attacking:     { crosses:0.0, through_balls:0.3, dribble:0.3, shot_frequency:0.1, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.7, ball_carry:0.5, switch_play:0.5 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:true }
  },
  BPD_ST: {
    movement:      { vertical:0.4, width_drift:0.3, roam:0.2, hold_position:0.6, run_beyond_striker:0.0 },
    defensive:     { track_back:0.8, press_intensity:0.5, cover_wide:0.3, cover_central:0.6 },
    attacking:     { crosses:0.0, through_balls:0.3, dribble:0.3, shot_frequency:0.1, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.7, ball_carry:0.5, switch_play:0.5 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:true }
  },
  BPD_CO: {
    movement:      { vertical:0.2, width_drift:0.3, roam:0.2, hold_position:0.8, run_beyond_striker:0.0 },
    defensive:     { track_back:1.0, press_intensity:0.2, cover_wide:0.5, cover_central:1.0 },
    attacking:     { crosses:0.0, through_balls:0.3, dribble:0.3, shot_frequency:0.1, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.8, ball_carry:0.5, switch_play:0.6 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:true }
  },
  NCB_D: {
    movement:      { vertical:0.0, width_drift:0.0, roam:0.0, hold_position:1.0, run_beyond_striker:0.0 },
    defensive:     { track_back:1.0, press_intensity:0.2, cover_wide:0.3, cover_central:0.9 },
    attacking:     { crosses:0.0, through_balls:0.0, dribble:0.0, shot_frequency:0.0, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.2, ball_carry:0.0, switch_play:0.1 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:false }
  },
  NCB_ST: {
    movement:      { vertical:0.1, width_drift:0.0, roam:0.0, hold_position:1.0, run_beyond_striker:0.0 },
    defensive:     { track_back:1.0, press_intensity:0.4, cover_wide:0.2, cover_central:0.8 },
    attacking:     { crosses:0.0, through_balls:0.0, dribble:0.0, shot_frequency:0.0, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.2, ball_carry:0.0, switch_play:0.1 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:false }
  },
  NCB_CO: {
    movement:      { vertical:0.0, width_drift:0.0, roam:0.0, hold_position:1.0, run_beyond_striker:0.0 },
    defensive:     { track_back:1.0, press_intensity:0.1, cover_wide:0.3, cover_central:1.0 },
    attacking:     { crosses:0.0, through_balls:0.0, dribble:0.0, shot_frequency:0.0, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.2, ball_carry:0.0, switch_play:0.1 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:false }
  },
  Libero_S: {
    movement:      { vertical:0.6, width_drift:0.4, roam:0.5, hold_position:0.3, run_beyond_striker:0.2 },
    defensive:     { track_back:0.7, press_intensity:0.3, cover_wide:0.5, cover_central:0.6 },
    attacking:     { crosses:0.0, through_balls:0.4, dribble:0.5, shot_frequency:0.2, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.7, ball_carry:0.7, switch_play:0.5 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:true,
                     holder:false, distributor:true }
  },
  Libero_A: {
    movement:      { vertical:0.8, width_drift:0.5, roam:0.7, hold_position:0.1, run_beyond_striker:0.3 },
    defensive:     { track_back:0.5, press_intensity:0.4, cover_wide:0.4, cover_central:0.4 },
    attacking:     { crosses:0.1, through_balls:0.5, dribble:0.6, shot_frequency:0.3, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.7, ball_carry:0.8, switch_play:0.6 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:true,
                     holder:false, distributor:true }
  },
  WCB_D: {
    movement:      { vertical:0.2, width_drift:0.6, roam:0.1, hold_position:0.8, run_beyond_striker:0.0 },
    defensive:     { track_back:0.9, press_intensity:0.4, cover_wide:0.7, cover_central:0.6 },
    attacking:     { crosses:0.1, through_balls:0.2, dribble:0.2, shot_frequency:0.1, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.3, switch_play:0.3 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:false }
  },
  WCB_S: {
    movement:      { vertical:0.3, width_drift:0.7, roam:0.2, hold_position:0.6, run_beyond_striker:0.1 },
    defensive:     { track_back:0.8, press_intensity:0.4, cover_wide:0.8, cover_central:0.5 },
    attacking:     { crosses:0.2, through_balls:0.3, dribble:0.3, shot_frequency:0.2, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.6, ball_carry:0.4, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:true }
  },
  WCB_A: {
    movement:      { vertical:0.5, width_drift:0.8, roam:0.4, hold_position:0.3, run_beyond_striker:0.2 },
    defensive:     { track_back:0.6, press_intensity:0.6, cover_wide:0.8, cover_central:0.3 },
    attacking:     { crosses:0.3, through_balls:0.3, dribble:0.4, shot_frequency:0.3, early_cross:0.1 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.5, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },

  // ════════════════════════════════════════════
  // WIDE DEFENDERS
  // ════════════════════════════════════════════
  FB_D: {
    movement:      { vertical:0.1, width_drift:0.5, roam:0.1, hold_position:0.9, run_beyond_striker:0.0 },
    defensive:     { track_back:1.0, press_intensity:0.3, cover_wide:0.8, cover_central:0.2 },
    attacking:     { crosses:0.1, through_balls:0.1, dribble:0.1, shot_frequency:0.0, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.2, switch_play:0.2 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:false }
  },
  FB_S: {
    movement:      { vertical:0.3, width_drift:0.6, roam:0.2, hold_position:0.6, run_beyond_striker:0.1 },
    defensive:     { track_back:0.8, press_intensity:0.3, cover_wide:0.8, cover_central:0.2 },
    attacking:     { crosses:0.4, through_balls:0.2, dribble:0.2, shot_frequency:0.1, early_cross:0.1 },
    build_up:      { short_pass_tendency:0.6, ball_carry:0.3, switch_play:0.3 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  FB_A: {
    movement:      { vertical:0.6, width_drift:0.8, roam:0.4, hold_position:0.2, run_beyond_striker:0.3 },
    defensive:     { track_back:0.6, press_intensity:0.4, cover_wide:0.7, cover_central:0.1 },
    attacking:     { crosses:0.7, through_balls:0.2, dribble:0.4, shot_frequency:0.2, early_cross:0.3 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.4, switch_play:0.3 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  NFB_D: {
    movement:      { vertical:0.0, width_drift:0.2, roam:0.0, hold_position:1.0, run_beyond_striker:0.0 },
    defensive:     { track_back:1.0, press_intensity:0.2, cover_wide:0.6, cover_central:0.4 },
    attacking:     { crosses:0.0, through_balls:0.0, dribble:0.0, shot_frequency:0.0, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.3, ball_carry:0.1, switch_play:0.1 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:false }
  },
  WB_D: {
    movement:      { vertical:0.3, width_drift:0.7, roam:0.2, hold_position:0.7, run_beyond_striker:0.1 },
    defensive:     { track_back:0.9, press_intensity:0.5, cover_wide:0.8, cover_central:0.2 },
    attacking:     { crosses:0.4, through_balls:0.2, dribble:0.3, shot_frequency:0.1, early_cross:0.1 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.4, switch_play:0.3 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:false }
  },
  WB_S: {
    movement:      { vertical:0.5, width_drift:0.8, roam:0.3, hold_position:0.4, run_beyond_striker:0.2 },
    defensive:     { track_back:0.7, press_intensity:0.5, cover_wide:0.8, cover_central:0.2 },
    attacking:     { crosses:0.6, through_balls:0.3, dribble:0.4, shot_frequency:0.2, early_cross:0.2 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.5, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  WB_A: {
    movement:      { vertical:0.7, width_drift:0.9, roam:0.5, hold_position:0.1, run_beyond_striker:0.4 },
    defensive:     { track_back:0.5, press_intensity:0.6, cover_wide:0.7, cover_central:0.1 },
    attacking:     { crosses:0.8, through_balls:0.3, dribble:0.5, shot_frequency:0.3, early_cross:0.4 },
    build_up:      { short_pass_tendency:0.4, ball_carry:0.6, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  CWB_S: {
    movement:      { vertical:0.6, width_drift:0.8, roam:0.6, hold_position:0.2, run_beyond_striker:0.3 },
    defensive:     { track_back:0.5, press_intensity:0.5, cover_wide:0.6, cover_central:0.1 },
    attacking:     { crosses:0.7, through_balls:0.4, dribble:0.6, shot_frequency:0.3, early_cross:0.3 },
    build_up:      { short_pass_tendency:0.6, ball_carry:0.7, switch_play:0.5 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:true,
                     holder:false, distributor:true }
  },
  CWB_A: {
    movement:      { vertical:0.8, width_drift:0.9, roam:0.7, hold_position:0.0, run_beyond_striker:0.5 },
    defensive:     { track_back:0.3, press_intensity:0.7, cover_wide:0.5, cover_central:0.1 },
    attacking:     { crosses:0.9, through_balls:0.4, dribble:0.7, shot_frequency:0.4, early_cross:0.5 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.8, switch_play:0.5 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:true,
                     holder:false, distributor:true }
  },
  IWB_D: {
    movement:      { vertical:0.2, width_drift:0.3, roam:0.2, hold_position:0.8, run_beyond_striker:0.0 },
    defensive:     { track_back:0.9, press_intensity:0.4, cover_wide:0.5, cover_central:0.6 },
    attacking:     { crosses:0.1, through_balls:0.4, dribble:0.3, shot_frequency:0.1, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.7, ball_carry:0.4, switch_play:0.5 },
    special:       { inverted:true, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:true }
  },
  IWB_S: {
    movement:      { vertical:0.4, width_drift:0.3, roam:0.3, hold_position:0.5, run_beyond_striker:0.1 },
    defensive:     { track_back:0.7, press_intensity:0.5, cover_wide:0.4, cover_central:0.6 },
    attacking:     { crosses:0.2, through_balls:0.5, dribble:0.4, shot_frequency:0.2, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.8, ball_carry:0.5, switch_play:0.6 },
    special:       { inverted:true, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },
  IWB_A: {
    movement:      { vertical:0.6, width_drift:0.3, roam:0.5, hold_position:0.2, run_beyond_striker:0.2 },
    defensive:     { track_back:0.5, press_intensity:0.6, cover_wide:0.3, cover_central:0.5 },
    attacking:     { crosses:0.3, through_balls:0.5, dribble:0.6, shot_frequency:0.3, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.7, ball_carry:0.6, switch_play:0.6 },
    special:       { inverted:true, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },
  IFB_D: {
    movement:      { vertical:0.1, width_drift:0.3, roam:0.1, hold_position:0.9, run_beyond_striker:0.0 },
    defensive:     { track_back:1.0, press_intensity:0.3, cover_wide:0.6, cover_central:0.5 },
    attacking:     { crosses:0.0, through_balls:0.2, dribble:0.1, shot_frequency:0.0, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.6, ball_carry:0.2, switch_play:0.3 },
    special:       { inverted:true, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:false }
  },

  // ════════════════════════════════════════════
  // DEFENSIVE MIDFIELDERS
  // ════════════════════════════════════════════
  DM_D: {
    movement:      { vertical:0.2, width_drift:0.2, roam:0.1, hold_position:0.9, run_beyond_striker:0.0 },
    defensive:     { track_back:0.9, press_intensity:0.5, cover_wide:0.5, cover_central:0.7 },
    attacking:     { crosses:0.0, through_balls:0.2, dribble:0.1, shot_frequency:0.1, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.2, switch_play:0.3 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:false }
  },
  DM_S: {
    movement:      { vertical:0.4, width_drift:0.3, roam:0.2, hold_position:0.6, run_beyond_striker:0.1 },
    defensive:     { track_back:0.7, press_intensity:0.5, cover_wide:0.5, cover_central:0.6 },
    attacking:     { crosses:0.1, through_balls:0.3, dribble:0.2, shot_frequency:0.2, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.6, ball_carry:0.3, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  DLP_D: {
    movement:      { vertical:0.2, width_drift:0.2, roam:0.1, hold_position:0.8, run_beyond_striker:0.0 },
    defensive:     { track_back:0.8, press_intensity:0.3, cover_wide:0.4, cover_central:0.6 },
    attacking:     { crosses:0.0, through_balls:0.6, dribble:0.2, shot_frequency:0.1, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.9, ball_carry:0.3, switch_play:0.8 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:true }
  },
  DLP_S: {
    movement:      { vertical:0.4, width_drift:0.3, roam:0.2, hold_position:0.5, run_beyond_striker:0.1 },
    defensive:     { track_back:0.6, press_intensity:0.3, cover_wide:0.3, cover_central:0.5 },
    attacking:     { crosses:0.1, through_balls:0.7, dribble:0.3, shot_frequency:0.2, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.9, ball_carry:0.4, switch_play:0.8 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },
  BWM_D: {
    movement:      { vertical:0.2, width_drift:0.3, roam:0.3, hold_position:0.7, run_beyond_striker:0.0 },
    defensive:     { track_back:1.0, press_intensity:1.0, cover_wide:0.6, cover_central:0.7 },
    attacking:     { crosses:0.0, through_balls:0.1, dribble:0.1, shot_frequency:0.1, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.3, ball_carry:0.2, switch_play:0.2 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:true, roaming:false,
                     holder:true, distributor:false }
  },
  BWM_S: {
    movement:      { vertical:0.4, width_drift:0.3, roam:0.4, hold_position:0.4, run_beyond_striker:0.1 },
    defensive:     { track_back:0.9, press_intensity:1.0, cover_wide:0.5, cover_central:0.6 },
    attacking:     { crosses:0.0, through_balls:0.2, dribble:0.2, shot_frequency:0.2, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.3, ball_carry:0.3, switch_play:0.2 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:true, roaming:false,
                     holder:false, distributor:false }
  },
  Anchor_D: {
    movement:      { vertical:0.1, width_drift:0.1, roam:0.0, hold_position:1.0, run_beyond_striker:0.0 },
    defensive:     { track_back:1.0, press_intensity:0.3, cover_wide:0.4, cover_central:0.8 },
    attacking:     { crosses:0.0, through_balls:0.1, dribble:0.0, shot_frequency:0.0, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.1, switch_play:0.2 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:false }
  },
  HB_D: {
    movement:      { vertical:0.1, width_drift:0.2, roam:0.1, hold_position:0.9, run_beyond_striker:0.0 },
    defensive:     { track_back:1.0, press_intensity:0.3, cover_wide:0.5, cover_central:0.9 },
    attacking:     { crosses:0.0, through_balls:0.2, dribble:0.1, shot_frequency:0.0, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.6, ball_carry:0.3, switch_play:0.3 },
    special:       { inverted:false, drops_into_backline:true, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:false }
  },
  Regista_S: {
    movement:      { vertical:0.5, width_drift:0.5, roam:0.7, hold_position:0.2, run_beyond_striker:0.2 },
    defensive:     { track_back:0.4, press_intensity:0.3, cover_wide:0.3, cover_central:0.4 },
    attacking:     { crosses:0.0, through_balls:0.8, dribble:0.7, shot_frequency:0.3, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.8, ball_carry:0.8, switch_play:0.9 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:true,
                     holder:false, distributor:true }
  },
  RPM_S: {
    movement:      { vertical:0.5, width_drift:0.5, roam:0.6, hold_position:0.2, run_beyond_striker:0.2 },
    defensive:     { track_back:0.7, press_intensity:0.7, cover_wide:0.4, cover_central:0.5 },
    attacking:     { crosses:0.1, through_balls:0.5, dribble:0.6, shot_frequency:0.3, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.7, ball_carry:0.7, switch_play:0.6 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:true,
                     holder:false, distributor:true }
  },
  SV_S: {
    movement:      { vertical:0.6, width_drift:0.3, roam:0.5, hold_position:0.3, run_beyond_striker:0.3 },
    defensive:     { track_back:0.6, press_intensity:0.5, cover_wide:0.3, cover_central:0.5 },
    attacking:     { crosses:0.1, through_balls:0.3, dribble:0.5, shot_frequency:0.5, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.6, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:true,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  SV_A: {
    movement:      { vertical:0.8, width_drift:0.4, roam:0.6, hold_position:0.1, run_beyond_striker:0.5 },
    defensive:     { track_back:0.4, press_intensity:0.6, cover_wide:0.2, cover_central:0.3 },
    attacking:     { crosses:0.2, through_balls:0.4, dribble:0.6, shot_frequency:0.7, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.4, ball_carry:0.7, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:true,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },

  // ════════════════════════════════════════════
  // CENTRAL MIDFIELDERS
  // ════════════════════════════════════════════
  CM_D: {
    movement:      { vertical:0.2, width_drift:0.2, roam:0.1, hold_position:0.8, run_beyond_striker:0.0 },
    defensive:     { track_back:0.9, press_intensity:0.5, cover_wide:0.3, cover_central:0.7 },
    attacking:     { crosses:0.0, through_balls:0.2, dribble:0.1, shot_frequency:0.2, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.2, switch_play:0.3 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:false }
  },
  CM_S: {
    movement:      { vertical:0.4, width_drift:0.3, roam:0.2, hold_position:0.5, run_beyond_striker:0.1 },
    defensive:     { track_back:0.6, press_intensity:0.4, cover_wide:0.3, cover_central:0.5 },
    attacking:     { crosses:0.1, through_balls:0.3, dribble:0.2, shot_frequency:0.3, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.6, ball_carry:0.3, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  CM_A: {
    movement:      { vertical:0.7, width_drift:0.4, roam:0.4, hold_position:0.2, run_beyond_striker:0.4 },
    defensive:     { track_back:0.4, press_intensity:0.5, cover_wide:0.2, cover_central:0.3 },
    attacking:     { crosses:0.1, through_balls:0.4, dribble:0.4, shot_frequency:0.5, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.4, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  BBM_S: {
    movement:      { vertical:0.6, width_drift:0.4, roam:0.5, hold_position:0.2, run_beyond_striker:0.4 },
    defensive:     { track_back:0.8, press_intensity:0.7, cover_wide:0.3, cover_central:0.5 },
    attacking:     { crosses:0.1, through_balls:0.3, dribble:0.4, shot_frequency:0.5, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.5, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:true,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  AP_S: {
    movement:      { vertical:0.5, width_drift:0.4, roam:0.3, hold_position:0.4, run_beyond_striker:0.2 },
    defensive:     { track_back:0.3, press_intensity:0.2, cover_wide:0.2, cover_central:0.3 },
    attacking:     { crosses:0.1, through_balls:0.8, dribble:0.6, shot_frequency:0.3, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.8, ball_carry:0.5, switch_play:0.7 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },
  AP_A: {
    movement:      { vertical:0.7, width_drift:0.4, roam:0.4, hold_position:0.2, run_beyond_striker:0.3 },
    defensive:     { track_back:0.2, press_intensity:0.3, cover_wide:0.1, cover_central:0.2 },
    attacking:     { crosses:0.2, through_balls:0.8, dribble:0.7, shot_frequency:0.4, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.7, ball_carry:0.6, switch_play:0.7 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },
  Mezzala_S: {
    movement:      { vertical:0.5, width_drift:0.7, roam:0.6, hold_position:0.3, run_beyond_striker:0.3 },
    defensive:     { track_back:0.5, press_intensity:0.5, cover_wide:0.4, cover_central:0.3 },
    attacking:     { crosses:0.2, through_balls:0.6, dribble:0.6, shot_frequency:0.4, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.7, ball_carry:0.7, switch_play:0.5 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:true,
                     holder:false, distributor:true }
  },
  Mezzala_A: {
    movement:      { vertical:0.8, width_drift:0.8, roam:0.8, hold_position:0.1, run_beyond_striker:0.5 },
    defensive:     { track_back:0.3, press_intensity:0.6, cover_wide:0.3, cover_central:0.2 },
    attacking:     { crosses:0.2, through_balls:0.7, dribble:0.7, shot_frequency:0.5, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.6, ball_carry:0.8, switch_play:0.5 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:true,
                     holder:false, distributor:true }
  },
  Carrilero_S: {
    movement:      { vertical:0.3, width_drift:0.6, roam:0.2, hold_position:0.7, run_beyond_striker:0.0 },
    defensive:     { track_back:0.9, press_intensity:0.5, cover_wide:0.7, cover_central:0.5 },
    attacking:     { crosses:0.2, through_balls:0.2, dribble:0.2, shot_frequency:0.2, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.6, ball_carry:0.3, switch_play:0.3 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:false }
  },
  DLP_CM_D: {
    movement:      { vertical:0.2, width_drift:0.3, roam:0.1, hold_position:0.8, run_beyond_striker:0.0 },
    defensive:     { track_back:0.8, press_intensity:0.3, cover_wide:0.3, cover_central:0.6 },
    attacking:     { crosses:0.0, through_balls:0.6, dribble:0.2, shot_frequency:0.1, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.9, ball_carry:0.3, switch_play:0.8 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:true }
  },
  DLP_CM_S: {
    movement:      { vertical:0.4, width_drift:0.3, roam:0.2, hold_position:0.5, run_beyond_striker:0.1 },
    defensive:     { track_back:0.6, press_intensity:0.3, cover_wide:0.3, cover_central:0.5 },
    attacking:     { crosses:0.1, through_balls:0.7, dribble:0.3, shot_frequency:0.2, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.9, ball_carry:0.4, switch_play:0.8 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },
  BWM_CM_D: {
    movement:      { vertical:0.2, width_drift:0.3, roam:0.3, hold_position:0.7, run_beyond_striker:0.0 },
    defensive:     { track_back:1.0, press_intensity:1.0, cover_wide:0.5, cover_central:0.7 },
    attacking:     { crosses:0.0, through_balls:0.1, dribble:0.1, shot_frequency:0.1, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.3, ball_carry:0.2, switch_play:0.2 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:true, roaming:false,
                     holder:true, distributor:false }
  },
  BWM_CM_S: {
    movement:      { vertical:0.4, width_drift:0.3, roam:0.4, hold_position:0.4, run_beyond_striker:0.1 },
    defensive:     { track_back:0.9, press_intensity:1.0, cover_wide:0.4, cover_central:0.6 },
    attacking:     { crosses:0.0, through_balls:0.2, dribble:0.2, shot_frequency:0.2, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.3, ball_carry:0.3, switch_play:0.2 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:true, roaming:false,
                     holder:false, distributor:false }
  },
  RPM_CM_S: {
    movement:      { vertical:0.5, width_drift:0.5, roam:0.6, hold_position:0.2, run_beyond_striker:0.2 },
    defensive:     { track_back:0.7, press_intensity:0.7, cover_wide:0.4, cover_central:0.5 },
    attacking:     { crosses:0.1, through_balls:0.5, dribble:0.6, shot_frequency:0.3, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.7, ball_carry:0.7, switch_play:0.6 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:true,
                     holder:false, distributor:true }
  },

  // ════════════════════════════════════════════
  // WIDE MIDFIELDERS
  // ════════════════════════════════════════════
  WM_D: {
    movement:      { vertical:0.2, width_drift:0.7, roam:0.1, hold_position:0.8, run_beyond_striker:0.0 },
    defensive:     { track_back:0.9, press_intensity:0.5, cover_wide:0.8, cover_central:0.2 },
    attacking:     { crosses:0.3, through_balls:0.2, dribble:0.2, shot_frequency:0.1, early_cross:0.1 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.3, switch_play:0.3 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:false }
  },
  WM_S: {
    movement:      { vertical:0.4, width_drift:0.8, roam:0.2, hold_position:0.5, run_beyond_striker:0.1 },
    defensive:     { track_back:0.6, press_intensity:0.4, cover_wide:0.8, cover_central:0.2 },
    attacking:     { crosses:0.5, through_balls:0.3, dribble:0.3, shot_frequency:0.2, early_cross:0.2 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.4, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  WM_A: {
    movement:      { vertical:0.6, width_drift:0.8, roam:0.4, hold_position:0.2, run_beyond_striker:0.2 },
    defensive:     { track_back:0.4, press_intensity:0.5, cover_wide:0.7, cover_central:0.1 },
    attacking:     { crosses:0.7, through_balls:0.3, dribble:0.4, shot_frequency:0.3, early_cross:0.3 },
    build_up:      { short_pass_tendency:0.4, ball_carry:0.5, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  DW_D: {
    movement:      { vertical:0.2, width_drift:0.6, roam:0.2, hold_position:0.8, run_beyond_striker:0.0 },
    defensive:     { track_back:1.0, press_intensity:1.0, cover_wide:0.8, cover_central:0.3 },
    attacking:     { crosses:0.3, through_balls:0.2, dribble:0.2, shot_frequency:0.1, early_cross:0.1 },
    build_up:      { short_pass_tendency:0.4, ball_carry:0.3, switch_play:0.2 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:true, roaming:false,
                     holder:true, distributor:false }
  },
  DW_S: {
    movement:      { vertical:0.4, width_drift:0.6, roam:0.3, hold_position:0.5, run_beyond_striker:0.1 },
    defensive:     { track_back:0.9, press_intensity:1.0, cover_wide:0.7, cover_central:0.2 },
    attacking:     { crosses:0.4, through_balls:0.3, dribble:0.3, shot_frequency:0.2, early_cross:0.1 },
    build_up:      { short_pass_tendency:0.4, ball_carry:0.4, switch_play:0.3 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:true, roaming:false,
                     holder:false, distributor:false }
  },
  Winger_WM_S: {
    movement:      { vertical:0.4, width_drift:0.9, roam:0.3, hold_position:0.4, run_beyond_striker:0.2 },
    defensive:     { track_back:0.5, press_intensity:0.3, cover_wide:0.7, cover_central:0.1 },
    attacking:     { crosses:0.8, through_balls:0.3, dribble:0.5, shot_frequency:0.2, early_cross:0.4 },
    build_up:      { short_pass_tendency:0.4, ball_carry:0.5, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  Winger_WM_A: {
    movement:      { vertical:0.7, width_drift:0.9, roam:0.5, hold_position:0.1, run_beyond_striker:0.3 },
    defensive:     { track_back:0.3, press_intensity:0.4, cover_wide:0.6, cover_central:0.1 },
    attacking:     { crosses:0.9, through_balls:0.3, dribble:0.6, shot_frequency:0.3, early_cross:0.5 },
    build_up:      { short_pass_tendency:0.3, ball_carry:0.6, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  IW_WM_S: {
    movement:      { vertical:0.4, width_drift:0.5, roam:0.3, hold_position:0.4, run_beyond_striker:0.2 },
    defensive:     { track_back:0.6, press_intensity:0.5, cover_wide:0.5, cover_central:0.3 },
    attacking:     { crosses:0.3, through_balls:0.5, dribble:0.6, shot_frequency:0.3, early_cross:0.1 },
    build_up:      { short_pass_tendency:0.6, ball_carry:0.5, switch_play:0.5 },
    special:       { inverted:true, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },
  IW_WM_A: {
    movement:      { vertical:0.7, width_drift:0.5, roam:0.5, hold_position:0.1, run_beyond_striker:0.3 },
    defensive:     { track_back:0.3, press_intensity:0.6, cover_wide:0.4, cover_central:0.2 },
    attacking:     { crosses:0.4, through_balls:0.6, dribble:0.7, shot_frequency:0.4, early_cross:0.1 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.6, switch_play:0.5 },
    special:       { inverted:true, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },
  WP_WM_S: {
    movement:      { vertical:0.4, width_drift:0.6, roam:0.4, hold_position:0.4, run_beyond_striker:0.1 },
    defensive:     { track_back:0.4, press_intensity:0.2, cover_wide:0.5, cover_central:0.2 },
    attacking:     { crosses:0.5, through_balls:0.7, dribble:0.6, shot_frequency:0.2, early_cross:0.2 },
    build_up:      { short_pass_tendency:0.7, ball_carry:0.6, switch_play:0.7 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },
  WP_WM_A: {
    movement:      { vertical:0.6, width_drift:0.6, roam:0.5, hold_position:0.2, run_beyond_striker:0.2 },
    defensive:     { track_back:0.3, press_intensity:0.3, cover_wide:0.4, cover_central:0.1 },
    attacking:     { crosses:0.6, through_balls:0.7, dribble:0.7, shot_frequency:0.3, early_cross:0.2 },
    build_up:      { short_pass_tendency:0.6, ball_carry:0.7, switch_play:0.7 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },

  // ════════════════════════════════════════════
  // WIDE ATTACKERS
  // ════════════════════════════════════════════
  Winger_S: {
    movement:      { vertical:0.4, width_drift:1.0, roam:0.3, hold_position:0.4, run_beyond_striker:0.2 },
    defensive:     { track_back:0.4, press_intensity:0.3, cover_wide:0.6, cover_central:0.1 },
    attacking:     { crosses:0.9, through_balls:0.3, dribble:0.6, shot_frequency:0.3, early_cross:0.5 },
    build_up:      { short_pass_tendency:0.3, ball_carry:0.6, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  Winger_A: {
    movement:      { vertical:0.7, width_drift:1.0, roam:0.5, hold_position:0.1, run_beyond_striker:0.3 },
    defensive:     { track_back:0.2, press_intensity:0.4, cover_wide:0.5, cover_central:0.0 },
    attacking:     { crosses:1.0, through_balls:0.3, dribble:0.7, shot_frequency:0.4, early_cross:0.6 },
    build_up:      { short_pass_tendency:0.2, ball_carry:0.7, switch_play:0.3 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  IW_S: {
    movement:      { vertical:0.4, width_drift:0.5, roam:0.3, hold_position:0.4, run_beyond_striker:0.2 },
    defensive:     { track_back:0.5, press_intensity:0.5, cover_wide:0.4, cover_central:0.2 },
    attacking:     { crosses:0.3, through_balls:0.6, dribble:0.7, shot_frequency:0.4, early_cross:0.1 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.6, switch_play:0.5 },
    special:       { inverted:true, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },
  IW_A: {
    movement:      { vertical:0.7, width_drift:0.5, roam:0.5, hold_position:0.1, run_beyond_striker:0.3 },
    defensive:     { track_back:0.2, press_intensity:0.6, cover_wide:0.3, cover_central:0.1 },
    attacking:     { crosses:0.4, through_balls:0.6, dribble:0.8, shot_frequency:0.5, early_cross:0.1 },
    build_up:      { short_pass_tendency:0.4, ball_carry:0.7, switch_play:0.5 },
    special:       { inverted:true, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },
  IF_S: {
    movement:      { vertical:0.5, width_drift:0.4, roam:0.4, hold_position:0.3, run_beyond_striker:0.3 },
    defensive:     { track_back:0.5, press_intensity:0.5, cover_wide:0.3, cover_central:0.2 },
    attacking:     { crosses:0.2, through_balls:0.4, dribble:0.6, shot_frequency:0.5, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.5, switch_play:0.4 },
    special:       { inverted:true, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  IF_A: {
    movement:      { vertical:0.8, width_drift:0.4, roam:0.5, hold_position:0.1, run_beyond_striker:0.5 },
    defensive:     { track_back:0.2, press_intensity:0.6, cover_wide:0.2, cover_central:0.1 },
    attacking:     { crosses:0.3, through_balls:0.4, dribble:0.7, shot_frequency:0.6, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.4, ball_carry:0.6, switch_play:0.4 },
    special:       { inverted:true, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  RMD_A: {
    movement:      { vertical:0.8, width_drift:0.3, roam:0.6, hold_position:0.0, run_beyond_striker:0.6 },
    defensive:     { track_back:0.1, press_intensity:0.1, cover_wide:0.1, cover_central:0.1 },
    attacking:     { crosses:0.1, through_balls:0.3, dribble:0.9, shot_frequency:0.7, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.3, ball_carry:0.9, switch_play:0.2 },
    special:       { inverted:true, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:true,
                     holder:false, distributor:false }
  },
  WTM_S: {
    movement:      { vertical:0.2, width_drift:0.6, roam:0.2, hold_position:0.7, run_beyond_striker:0.1 },
    defensive:     { track_back:0.5, press_intensity:0.3, cover_wide:0.6, cover_central:0.2 },
    attacking:     { crosses:0.6, through_balls:0.2, dribble:0.3, shot_frequency:0.2, early_cross:0.3 },
    build_up:      { short_pass_tendency:0.3, ball_carry:0.3, switch_play:0.2 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:true, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  WTM_A: {
    movement:      { vertical:0.5, width_drift:0.6, roam:0.3, hold_position:0.3, run_beyond_striker:0.2 },
    defensive:     { track_back:0.3, press_intensity:0.4, cover_wide:0.5, cover_central:0.1 },
    attacking:     { crosses:0.7, through_balls:0.2, dribble:0.4, shot_frequency:0.3, early_cross:0.4 },
    build_up:      { short_pass_tendency:0.2, ball_carry:0.4, switch_play:0.2 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:true, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  AP_WA_S: {
    movement:      { vertical:0.5, width_drift:0.5, roam:0.4, hold_position:0.3, run_beyond_striker:0.2 },
    defensive:     { track_back:0.3, press_intensity:0.2, cover_wide:0.4, cover_central:0.2 },
    attacking:     { crosses:0.3, through_balls:0.8, dribble:0.6, shot_frequency:0.3, early_cross:0.1 },
    build_up:      { short_pass_tendency:0.8, ball_carry:0.5, switch_play:0.7 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },
  AP_WA_A: {
    movement:      { vertical:0.7, width_drift:0.5, roam:0.5, hold_position:0.1, run_beyond_striker:0.3 },
    defensive:     { track_back:0.2, press_intensity:0.3, cover_wide:0.3, cover_central:0.1 },
    attacking:     { crosses:0.4, through_balls:0.8, dribble:0.7, shot_frequency:0.4, early_cross:0.1 },
    build_up:      { short_pass_tendency:0.7, ball_carry:0.6, switch_play:0.7 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },
  TQ_WA_A: {
    movement:      { vertical:0.6, width_drift:0.6, roam:0.8, hold_position:0.0, run_beyond_striker:0.3 },
    defensive:     { track_back:0.0, press_intensity:0.0, cover_wide:0.1, cover_central:0.0 },
    attacking:     { crosses:0.2, through_balls:0.9, dribble:0.9, shot_frequency:0.6, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.7, ball_carry:0.8, switch_play:0.6 },
    special:       { inverted:false, drops_into_backline:false, static_creator:true, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:true,
                     holder:false, distributor:true }
  },

  // ════════════════════════════════════════════
  // ATTACKING MIDFIELDERS
  // ════════════════════════════════════════════
  AM_S: {
    movement:      { vertical:0.5, width_drift:0.3, roam:0.3, hold_position:0.4, run_beyond_striker:0.2 },
    defensive:     { track_back:0.4, press_intensity:0.4, cover_wide:0.2, cover_central:0.3 },
    attacking:     { crosses:0.1, through_balls:0.6, dribble:0.5, shot_frequency:0.4, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.6, ball_carry:0.4, switch_play:0.5 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  AM_A: {
    movement:      { vertical:0.7, width_drift:0.3, roam:0.4, hold_position:0.2, run_beyond_striker:0.4 },
    defensive:     { track_back:0.2, press_intensity:0.5, cover_wide:0.1, cover_central:0.2 },
    attacking:     { crosses:0.2, through_balls:0.6, dribble:0.6, shot_frequency:0.6, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.5, switch_play:0.5 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  Trequartista_A: {
    movement:      { vertical:0.6, width_drift:0.5, roam:0.8, hold_position:0.0, run_beyond_striker:0.3 },
    defensive:     { track_back:0.0, press_intensity:0.0, cover_wide:0.1, cover_central:0.1 },
    attacking:     { crosses:0.1, through_balls:0.9, dribble:0.9, shot_frequency:0.6, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.7, ball_carry:0.8, switch_play:0.6 },
    special:       { inverted:false, drops_into_backline:false, static_creator:true, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:true,
                     holder:false, distributor:true }
  },
  Enganche_S: {
    movement:      { vertical:0.4, width_drift:0.2, roam:0.1, hold_position:0.9, run_beyond_striker:0.0 },
    defensive:     { track_back:0.2, press_intensity:0.1, cover_wide:0.1, cover_central:0.3 },
    attacking:     { crosses:0.0, through_balls:0.9, dribble:0.3, shot_frequency:0.3, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.9, ball_carry:0.2, switch_play:0.8 },
    special:       { inverted:false, drops_into_backline:false, static_creator:true, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:true }
  },
  SS_A: {
    movement:      { vertical:0.8, width_drift:0.4, roam:0.6, hold_position:0.1, run_beyond_striker:0.5 },
    defensive:     { track_back:0.3, press_intensity:0.6, cover_wide:0.2, cover_central:0.2 },
    attacking:     { crosses:0.1, through_balls:0.4, dribble:0.6, shot_frequency:0.7, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.4, ball_carry:0.5, switch_play:0.3 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:true,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:true,
                     holder:false, distributor:false }
  },
  AP_AMC_S: {
    movement:      { vertical:0.5, width_drift:0.3, roam:0.3, hold_position:0.4, run_beyond_striker:0.2 },
    defensive:     { track_back:0.3, press_intensity:0.2, cover_wide:0.2, cover_central:0.3 },
    attacking:     { crosses:0.1, through_balls:0.8, dribble:0.6, shot_frequency:0.3, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.8, ball_carry:0.5, switch_play:0.7 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },
  AP_AMC_A: {
    movement:      { vertical:0.7, width_drift:0.3, roam:0.4, hold_position:0.2, run_beyond_striker:0.3 },
    defensive:     { track_back:0.2, press_intensity:0.3, cover_wide:0.1, cover_central:0.2 },
    attacking:     { crosses:0.2, through_balls:0.8, dribble:0.7, shot_frequency:0.4, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.7, ball_carry:0.6, switch_play:0.7 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },

  // ════════════════════════════════════════════
  // STRIKERS
  // ════════════════════════════════════════════
  DLF_S: {
    movement:      { vertical:0.3, width_drift:0.5, roam:0.4, hold_position:0.4, run_beyond_striker:0.2 },
    defensive:     { track_back:0.2, press_intensity:0.2, cover_wide:0.2, cover_central:0.1 },
    attacking:     { crosses:0.1, through_balls:0.6, dribble:0.5, shot_frequency:0.4, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.7, ball_carry:0.5, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },
  DLF_A: {
    movement:      { vertical:0.5, width_drift:0.5, roam:0.5, hold_position:0.2, run_beyond_striker:0.4 },
    defensive:     { track_back:0.1, press_intensity:0.3, cover_wide:0.2, cover_central:0.1 },
    attacking:     { crosses:0.2, through_balls:0.6, dribble:0.6, shot_frequency:0.5, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.6, ball_carry:0.6, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },
  AF_A: {
    movement:      { vertical:1.0, width_drift:0.6, roam:0.5, hold_position:0.0, run_beyond_striker:1.0 },
    defensive:     { track_back:0.0, press_intensity:0.3, cover_wide:0.1, cover_central:0.0 },
    attacking:     { crosses:0.1, through_balls:0.2, dribble:0.5, shot_frequency:0.9, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.2, ball_carry:0.4, switch_play:0.1 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  TF_S: {
    movement:      { vertical:0.3, width_drift:0.3, roam:0.1, hold_position:0.8, run_beyond_striker:0.1 },
    defensive:     { track_back:0.3, press_intensity:0.3, cover_wide:0.1, cover_central:0.1 },
    attacking:     { crosses:0.1, through_balls:0.1, dribble:0.1, shot_frequency:0.6, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.3, ball_carry:0.1, switch_play:0.1 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:true, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:true, distributor:false }
  },
  TF_A: {
    movement:      { vertical:0.5, width_drift:0.3, roam:0.2, hold_position:0.5, run_beyond_striker:0.2 },
    defensive:     { track_back:0.2, press_intensity:0.4, cover_wide:0.1, cover_central:0.0 },
    attacking:     { crosses:0.1, through_balls:0.1, dribble:0.2, shot_frequency:0.7, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.2, ball_carry:0.2, switch_play:0.1 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:true, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  Poacher_A: {
    movement:      { vertical:0.9, width_drift:0.3, roam:0.2, hold_position:0.3, run_beyond_striker:0.8 },
    defensive:     { track_back:0.0, press_intensity:0.1, cover_wide:0.0, cover_central:0.0 },
    attacking:     { crosses:0.0, through_balls:0.1, dribble:0.2, shot_frequency:1.0, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.1, ball_carry:0.1, switch_play:0.0 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:false }
  },
  CF_S: {
    movement:      { vertical:0.5, width_drift:0.5, roam:0.5, hold_position:0.3, run_beyond_striker:0.3 },
    defensive:     { track_back:0.2, press_intensity:0.4, cover_wide:0.2, cover_central:0.1 },
    attacking:     { crosses:0.2, through_balls:0.5, dribble:0.6, shot_frequency:0.5, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.6, ball_carry:0.6, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },
  CF_A: {
    movement:      { vertical:0.7, width_drift:0.5, roam:0.6, hold_position:0.1, run_beyond_striker:0.5 },
    defensive:     { track_back:0.1, press_intensity:0.5, cover_wide:0.2, cover_central:0.0 },
    attacking:     { crosses:0.2, through_balls:0.5, dribble:0.7, shot_frequency:0.7, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.5, ball_carry:0.7, switch_play:0.4 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:false,
                     holder:false, distributor:true }
  },
  PF_D: {
    movement:      { vertical:0.3, width_drift:0.4, roam:0.4, hold_position:0.5, run_beyond_striker:0.2 },
    defensive:     { track_back:0.6, press_intensity:1.0, cover_wide:0.3, cover_central:0.2 },
    attacking:     { crosses:0.0, through_balls:0.2, dribble:0.3, shot_frequency:0.3, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.4, ball_carry:0.3, switch_play:0.2 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:true, roaming:false,
                     holder:true, distributor:false }
  },
  PF_S: {
    movement:      { vertical:0.5, width_drift:0.5, roam:0.5, hold_position:0.3, run_beyond_striker:0.3 },
    defensive:     { track_back:0.4, press_intensity:0.8, cover_wide:0.3, cover_central:0.2 },
    attacking:     { crosses:0.1, through_balls:0.3, dribble:0.4, shot_frequency:0.4, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.4, ball_carry:0.4, switch_play:0.3 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:true, roaming:false,
                     holder:false, distributor:false }
  },
  PF_A: {
    movement:      { vertical:0.7, width_drift:0.5, roam:0.5, hold_position:0.1, run_beyond_striker:0.5 },
    defensive:     { track_back:0.2, press_intensity:1.0, cover_wide:0.2, cover_central:0.1 },
    attacking:     { crosses:0.1, through_balls:0.2, dribble:0.5, shot_frequency:0.6, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.3, ball_carry:0.5, switch_play:0.2 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:true, roaming:false,
                     holder:false, distributor:false }
  },
  F9_S: {
    movement:      { vertical:0.3, width_drift:0.6, roam:0.6, hold_position:0.2, run_beyond_striker:0.1 },
    defensive:     { track_back:0.2, press_intensity:0.3, cover_wide:0.3, cover_central:0.2 },
    attacking:     { crosses:0.1, through_balls:0.7, dribble:0.7, shot_frequency:0.4, early_cross:0.0 },
    build_up:      { short_pass_tendency:0.8, ball_carry:0.7, switch_play:0.5 },
    special:       { inverted:false, drops_into_backline:false, static_creator:false, second_ball_runner:false,
                     target_man:false, sweeper_keeper:false, press_monster:false, roaming:true,
                     holder:false, distributor:true }
  }
};
