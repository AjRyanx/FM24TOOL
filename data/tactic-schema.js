const TACTIC_SCHEMA = {
  mentality: {
    label: "Mentality",
    type: "enum",
    values: ["Very Defensive", "Defensive", "Cautious", "Balanced", "Positive", "Attacking", "Very Attacking"],
    default: "Balanced"
  },
  attackingWidth: {
    label: "Attacking Width",
    type: "enum",
    values: ["Extremely Wide", "Wide", "Fairly Wide", "Normal", "Fairly Narrow", "Narrow", "Extremely Narrow"],
    default: "Normal"
  },
  passingDirectness: {
    label: "Passing Directness",
    type: "enum",
    values: ["Extremely Short", "Much Shorter", "Shorter", "Mixed", "More Direct", "Much More Direct", "Extremely Direct"],
    default: "Mixed"
  },
  tempo: {
    label: "Tempo",
    type: "enum",
    values: ["Extremely Low", "Much Lower", "Lower", "Normal", "Higher", "Much Higher", "Extremely High"],
    default: "Normal"
  },
  focusPlayLeft: {
    label: "Focus Play Left",
    type: "toggle",
    values: null,
    default: null
  },
  focusPlayCentre: {
    label: "Focus Play Centre",
    type: "toggle",
    values: null,
    default: null
  },
  focusPlayRight: {
    label: "Focus Play Right",
    type: "toggle",
    values: null,
    default: null
  },
  creativeFreedom: {
    label: "Creative Freedom",
    type: "enum",
    values: ["More Expressive", "Balanced", "More Disciplined"],
    default: "Balanced"
  },
  crossType: {
    label: "Cross Type",
    type: "enum",
    values: ["Mixed", "Floated", "Whipped", "Low"],
    default: "Mixed"
  },
  aimCrossesAt: {
    label: "Aim Crosses At",
    type: "enum",
    values: ["Target Forward", "None"],
    default: "None"
  },
  whenPossessionLost: {
    label: "When Possession Lost",
    type: "enum",
    values: ["Counter-Press", "Regroup"],
    default: "Counter-Press"
  },
  whenPossessionWon: {
    label: "When Possession Won",
    type: "enum",
    values: ["Counter", "Hold Shape"],
    default: "Hold Shape"
  },
  gkDistributionPace: {
    label: "GK Distribution Pace",
    type: "enum",
    values: ["Distribute Quickly", "Normal", "Slow Pace Down"],
    default: "Normal"
  },
  gkDistributionMethod: {
    label: "GK Distribution Method",
    type: "enum",
    values: ["Roll It Out", "Throw It Out", "Take Short Kicks", "Take Long Kicks"],
    default: "Roll It Out"
  },
  gkDistributionTarget: {
    label: "GK Distribution Target",
    type: "enum",
    values: ["Centre-Backs", "Full-Backs", "Defensive Midfielder", "Target Forward", "Playmaker", "Wide Players", "Over Opposition Defence"],
    default: "Centre-Backs"
  },
  lineOfEngagement: {
    label: "Line of Engagement",
    type: "enum",
    values: ["High", "Mid block", "Low", "Very Low"],
    default: "Mid block"
  },
  defensiveLine: {
    label: "Defensive Line",
    type: "enum",
    values: ["Much Higher", "Higher", "Standard", "Lower", "Much Lower"],
    default: "Standard"
  },
  tackling: {
    label: "Tackling",
    type: "enum",
    values: ["Stay on feet", "Get Stuck In"],
    default: "Stay on feet"
  },
  triggerPress: {
    label: "Trigger Press",
    type: "enum",
    values: ["Much More Often", "More Often", "Standard", "Less Often", "Much Less Often"],
    default: "Standard"
  },
  defensiveWidth: {
    label: "Defensive Width",
    type: "enum",
    values: ["Wider", "Standard", "Narrower"],
    default: "Standard"
  },
  crossEngagement: {
    label: "Cross Engagement",
    type: "enum",
    values: ["Stop Crosses", "Invite Crosses", "Normal"],
    default: "Normal"
  },
  defensiveLineBehavior: {
    label: "Defensive Line Behavior",
    type: "enum",
    values: ["Step Up More", "Drop Off More"],
    default: "Step Up More"
  },
  pressingTrap: {
    label: "Pressing Trap",
    type: "enum",
    values: ["Trap Outside", "Trap Inside", "None"],
    default: "None"
  },
  passIntoSpace: {
    label: "Pass Into Space",
    type: "toggle",
    values: null,
    default: null
  },
  workBallIntoBox: {
    label: "Work Ball Into Box",
    type: "toggle",
    values: null,
    default: null
  },
  playOutOfDefence: {
    label: "Play Out of Defence",
    type: "toggle",
    values: null,
    default: null
  },
  runAtDefence: {
    label: "Run At Defence",
    type: "toggle",
    values: null,
    default: null
  },
  shootOnSight: {
    label: "Shoot on Sight",
    type: "toggle",
    values: null,
    default: null
  },
  hitEarlyCrosses: {
    label: "Hit Early Crosses",
    type: "toggle",
    values: null,
    default: null
  },
  overlapLeft: {
    label: "Overlap Left",
    type: "toggle",
    values: null,
    default: null
  },
  overlapRight: {
    label: "Overlap Right",
    type: "toggle",
    values: null,
    default: null
  },
  underlapLeft: {
    label: "Underlap Left",
    type: "toggle",
    values: null,
    default: null
  },
  underlapRight: {
    label: "Underlap Right",
    type: "toggle",
    values: null,
    default: null
  },
  preventShortGKDistribution: {
    label: "Prevent Short GK Distribution",
    type: "toggle",
    values: null,
    default: null
  },
  playForSetPieces: {
    label: "Play For Set Pieces",
    type: "toggle",
    values: null,
    default: null
  }
};
