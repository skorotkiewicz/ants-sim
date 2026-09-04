// ==========================================
// THE SIMS 2: ANT COLONY (THE SIMANTS 2)
// Data Types & System Definitions
// ==========================================

export type CasteType = 'Queen' | 'Worker' | 'Nurse' | 'Soldier' | 'Forager';

export type AspirationType =
  | 'Pleasure'      // Loves food, lounging, naps, fun
  | 'Fortune'       // Loves hoarding sugar, gems, big pantry
  | 'Brood'         // Loves eggs, nursing larvae, colony family
  | 'Popularity'    // Loves chatting, high relationships, trophallaxis
  | 'Knowledge';    // Loves excavating, inspecting surface, domesticating aphids

export type AspirationLevel = 'Failure' | 'Red' | 'Green' | 'Gold' | 'Platinum';

export interface Personality {
  neat: number;       // 0-10 (Cleans dirt/trash vs leaves messes)
  outgoing: number;   // 0-10 (Chatty vs solitary)
  active: number;     // 0-10 (Fast worker vs loves naps)
  playful: number;    // 0-10 (Jousting/jokes vs serious worker)
  nice: number;       // 0-10 (Generous trophallaxis vs snappy)
}

export interface Motives {
  hunger: number;     // 0-100 (Starving -> Full)
  energy: number;     // 0-100 (Exhausted -> Energized)
  grooming: number;   // 0-100 (Filthy/mites -> Pristine)
  social: number;     // 0-100 (Lonely -> Beloved)
  fun: number;        // 0-100 (Miserable -> Entertained)
  colonyDuty: number; // 0-100 (Guilty slacker -> Hero of the Colony)
}

export type WantFearKey =
  | 'eat_honeydew'
  | 'eat_watermelon'
  | 'share_trophallaxis'
  | 'nap_in_hammock'
  | 'dance_to_radio'
  | 'play_antenna_joust'
  | 'tell_joke'
  | 'dig_new_tunnel'
  | 'feed_baby_larva'
  | 'tend_queen'
  | 'pet_aphid'
  | 'defeat_pest'
  | 'stockpile_sugar'
  | 'starve'
  | 'rejected_social'
  | 'pass_out_exhausted'
  | 'larva_goes_hungry'
  | 'spider_attack'
  | 'cave_in';

export interface WantOrFear {
  id: string;
  key: WantFearKey;
  name: string;
  description: string;
  icon: string;
  points: number; // positive for wants (+1000..+5000), negative for fears (-1000..-4000)
  targetId?: string;
}

export interface Relationship {
  daily: number;    // -100 to +100
  lifetime: number; // -100 to +100
  isBestFriend?: boolean;
  isCrush?: boolean;
  isRival?: boolean;
}

export type HeldItemType =
  | 'none'
  | 'sugar_crumb'
  | 'watermelon_chunk'
  | 'honeydew_drop'
  | 'fungus_mash'
  | 'egg'
  | 'larva'
  | 'dirt_clod'
  | 'flower_petal'
  | 'shiny_pebble';

export interface QueuedAction {
  id: string;
  name: string;
  icon: string;
  duration: number;   // total time in seconds
  elapsed: number;    // time spent
  targetType: 'ant' | 'object' | 'tile' | 'surface_entity' | 'self' | 'none';
  targetId?: string;
  targetX?: number;
  targetY?: number;
  onStart?: (ant: AntSim) => void;
  onUpdate?: (ant: AntSim, dt: number) => boolean; // return true if finished
  onComplete?: (ant: AntSim) => void;
  interruptible: boolean;
}

export interface SpeechBubble {
  text?: string;
  icon: string;
  isThought: boolean; // thought bubble vs speech bubble
  timer: number;      // remaining duration in seconds
}

export interface AntSim {
  id: string;
  name: string;
  title: string;
  caste: CasteType;
  color: string;
  scale: number;
  aspiration: AspirationType;
  aspirationScore: number;
  aspirationLevel: AspirationLevel;
  personality: Personality;
  motives: Motives;
  wants: WantOrFear[];
  fears: WantOrFear[];
  relationships: Record<string, Relationship>;
  heldItem: HeldItemType;
  actionQueue: QueuedAction[];

  // World physical state
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number; // angle in radians or -1/1
  walkCycle: number;
  antennaTwitch: number;
  isSleeping: boolean;
  isDancing: boolean;
  isDigging: boolean;
  stateText: string;

  // Bubbles & visuals
  bubble: SpeechBubble | null;
  failurePsychiatrist: boolean; // Is the Social Ant Shrink active for this ant?
}

// Brood: Eggs and Larvae
export interface BroodEntity {
  id: string;
  stage: 'egg' | 'larva' | 'pupa';
  x: number;
  y: number;
  chamberId?: string;
  age: number;        // in seconds
  growthDuration: number;
  hunger: number;     // for larvae (0-100)
  careQuality: number;
}

// Surface World Entities
export interface SurfaceEntity {
  id: string;
  type: 'watermelon' | 'donut' | 'sugar_pile' | 'aphid' | 'flower' | 'spider';
  x: number;
  y: number;
  width: number;
  height: number;
  resourcesRemaining: number;
  maxResources: number;
  tamed?: boolean;
  moodTimer?: number;
}

// Colony Furniture & Amenities
export type ObjectCatalogCategory = 'Comfort' | 'Food' | 'Fun' | 'Decor' | 'Queen';

export interface ObjectCatalogItem {
  type: string;
  name: string;
  category: ObjectCatalogCategory;
  cost: number;
  description: string;
  icon: string;
  width: number;
  height: number;
  motiveEffects: Partial<Record<keyof Motives, number>>; // motive rate/sec
}

export interface ColonyObject {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  occupiedByAntId?: string;
  stateValue: number; // e.g. stored sugar count, radio playing state
}

// World Grid (Cutaway Anthill)
export const TILE_SIZE = 32;
export const GRID_COLS = 50;
export const GRID_ROWS = 36;
export const SURFACE_ROW = 10; // Row index where ground starts (0..9 is surface sky/grass)

export type TileType =
  | 'sky'
  | 'grass'
  | 'soil'
  | 'hard_rock'
  | 'tunnel'
  | 'chamber_floor'
  | 'royal_brick'
  | 'fungus_bed';

export interface WorldTile {
  type: TileType;
  wallType?: 'dirt' | 'royal' | 'moss' | 'stone';
  markedForDig?: boolean;
}

// Game Modes
export type GameMode = 'Live' | 'Buy' | 'Build';

// Colony Economy & Simulation Clock
export interface ColonyState {
  pollenPoints: number; // Currency §
  day: number;
  timeOfDay: number;    // 0 to 24 hours
  timeScale: number;    // 0 = Pause, 1 = 1x, 2 = 2x, 3 = 4x
  weather: 'Sunny' | 'Gentle_Breeze' | 'Picnic_Day' | 'Light_Shower';
}
