// ==========================================
// THE SIMS 2: ANT COLONY (THE SIMANTS 2)
// Data Types, Interfaces & Save Data Structures
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
  neat: number;       // 0-10
  outgoing: number;   // 0-10
  active: number;     // 0-10
  playful: number;    // 0-10
  nice: number;       // 0-10
}

export interface Motives {
  hunger: number;     // 0-100
  energy: number;     // 0-100
  grooming: number;   // 0-100
  social: number;     // 0-100
  fun: number;        // 0-100
  colonyDuty: number; // 0-100
}

export interface AntSkills {
  digging: number;    // 1-10
  foraging: number;   // 1-10
  nursing: number;    // 1-10
  combat: number;     // 1-10
  charisma: number;   // 1-10
}

export interface AntMemory {
  id: string;
  title: string;
  description: string;
  icon: string;
  isPositive: boolean;
  day: number;
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
  points: number;
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

export type AntAccessoryType = 'none' | 'crown' | 'hardhat' | 'nurse_cap' | 'helmet' | 'flower' | 'goggles';

export interface QueuedAction {
  id: string;
  name: string;
  icon: string;
  duration: number;
  elapsed: number;
  targetType: 'ant' | 'object' | 'tile' | 'surface_entity' | 'self' | 'none';
  targetId?: string;
  targetX?: number;
  targetY?: number;
  onStart?: (ant: AntSim) => void;
  onUpdate?: (ant: AntSim, dt: number) => boolean;
  onComplete?: (ant: AntSim) => void;
  interruptible: boolean;
}

export interface SpeechBubble {
  text?: string;
  icon: string;
  isThought: boolean;
  timer: number;
}

export interface AntSim {
  id: string;
  name: string;
  title: string;
  caste: CasteType;
  color: string;
  accessory: AntAccessoryType;
  scale: number;
  aspiration: AspirationType;
  aspirationScore: number;
  aspirationLevel: AspirationLevel;
  personality: Personality;
  motives: Motives;
  skills: AntSkills;
  memories: AntMemory[];
  wants: WantOrFear[];
  fears: WantOrFear[];
  relationships: Record<string, Relationship>;
  heldItem: HeldItemType;
  actionQueue: QueuedAction[];

  // 3D Physical State
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facing: number;
  walkCycle: number;
  antennaTwitch: number;
  isSleeping: boolean;
  isDancing: boolean;
  isDigging: boolean;
  stateText: string;

  bubble: SpeechBubble | null;
  failurePsychiatrist: boolean;
}

// Brood Entities
export interface BroodEntity {
  id: string;
  stage: 'egg' | 'larva' | 'pupa';
  x: number;
  y: number;
  z: number;
  age: number;
  growthDuration: number;
  hunger: number;
  careQuality: number;
}

// Surface World Entities
export interface SurfaceEntity {
  id: string;
  type: 'watermelon' | 'donut' | 'sugar_pile' | 'aphid' | 'flower' | 'spider' | 'raindrop';
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  resourcesRemaining: number;
  maxResources: number;
  tamed?: boolean;
}

// Object Catalog
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
  depth: number;
  motiveEffects: Partial<Record<keyof Motives, number>>;
}

export interface ColonyObject {
  id: string;
  type: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  occupiedByAntId?: string;
  stateValue: number;
}

// World Grid (Cutaway Anthill)
export const TILE_SIZE = 32;
export const GRID_COLS = 50;
export const GRID_ROWS = 36;
export const SURFACE_ROW = 10;

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

// Modes & Settings
export type GameMode = 'Live' | 'Buy' | 'Build';
export type CameraPreset = 'Dollhouse' | 'Isometric' | 'Follow' | 'Surface';

export interface ColonyState {
  pollenPoints: number;
  day: number;
  timeOfDay: number;
  timeScale: number;
  weather: 'Sunny' | 'Gentle_Breeze' | 'Picnic_Day' | 'Light_Shower';
  freeWill: 'High' | 'Medium' | 'Off';
  musicVolume: number;
  sfxVolume: number;
  masterVolume: number;
  radioStation: 'Spore_Jazz' | 'Anthill_Bossa' | 'Chitter_Pop';
}

// Save Game Serialization Data
export interface SaveGameData {
  version: number;
  saveTime: string;
  colonyName: string;
  state: ColonyState;
  grid: { type: TileType; markedForDig?: boolean }[][];
  ants: Array<Omit<AntSim, 'actionQueue' | 'bubble'>>;
  brood: BroodEntity[];
  colonyObjects: ColonyObject[];
  surfaceEntities: SurfaceEntity[];
  selectedAntId: string | null;
}
