// ==========================================
// THE SIMS 2: ANT COLONY SIMULATION ENGINE
// World Grid, Ant Autonomy, Brood & Needs
// ==========================================

import {
  GRID_COLS,
  GRID_ROWS,
  SURFACE_ROW,
  TILE_SIZE,
} from './types';
import type {
  AntSim,
  AspirationType,
  BroodEntity,
  CasteType,
  ColonyObject,
  ColonyState,
  Personality,
  SurfaceEntity,
  TileType,
  WantFearKey,
  WantOrFear,
  WorldTile,
} from './types';
import { audio } from './audio';
import { CATALOG } from './catalog';

export class Simulation {
  public grid: WorldTile[][];
  public ants: AntSim[] = [];
  public brood: BroodEntity[] = [];
  public surfaceEntities: SurfaceEntity[] = [];
  public colonyObjects: ColonyObject[] = [];
  public state: ColonyState;

  public selectedAntId: string | null = null;
  public highlightedTile: { col: number; row: number } | null = null;

  private nextId: number = 100;

  constructor() {
    this.grid = [];
    this.state = {
      pollenPoints: 280, // Starting § currency
      day: 1,
      timeOfDay: 9.5,   // 9:30 AM
      timeScale: 1,     // Normal speed
      weather: 'Sunny',
    };

    this.initWorldGrid();
    this.initSurfaceEntities();
    this.initColonyObjects();
    this.initStartingAnts();
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  private initWorldGrid() {
    this.grid = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      const row: WorldTile[] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        if (r < SURFACE_ROW) {
          row.push({ type: 'sky' });
        } else if (r === SURFACE_ROW) {
          row.push({ type: 'grass' });
        } else {
          // Underground soil with rocks
          const isRock = Math.random() < 0.05 && r > SURFACE_ROW + 3;
          row.push({ type: isRock ? 'hard_rock' : 'soil', wallType: 'dirt' });
        }
      }
      this.grid.push(row);
    }

    // Carve Starting Anthill Chambers:
    // 1. Entrance Vertical Shaft (x: 24..25, y: 10..15)
    this.carveRect(24, 10, 3, 6, 'tunnel');

    // 2. Central Great Chamber (x: 18..32, y: 15..19)
    this.carveRect(18, 15, 15, 5, 'chamber_floor');

    // 3. Royal Nursery & Queen's Quarters (x: 8..18, y: 19..24)
    this.carveRect(8, 19, 11, 6, 'royal_brick');
    this.carveRect(18, 20, 2, 2, 'tunnel'); // connecting corridor

    // 4. Fungus Farm Chamber (x: 31..42, y: 19..24)
    this.carveRect(31, 19, 12, 6, 'fungus_bed');
    this.carveRect(30, 20, 2, 2, 'tunnel'); // connecting corridor

    // 5. Worker Bunkhouse (x: 18..32, y: 24..28)
    this.carveRect(18, 24, 15, 5, 'chamber_floor');
    this.carveRect(24, 19, 3, 6, 'tunnel'); // shaft down to bunkhouse
  }

  public carveRect(startCol: number, startRow: number, width: number, height: number, type: TileType) {
    for (let r = startRow; r < startRow + height && r < GRID_ROWS; r++) {
      for (let c = startCol; c < startCol + width && c < GRID_COLS; c++) {
        if (this.grid[r] && this.grid[r][c]) {
          this.grid[r][c].type = type;
          this.grid[r][c].markedForDig = false;
        }
      }
    }
  }

  private initSurfaceEntities() {
    // Surface picnic & food sources
    this.surfaceEntities = [
      {
        id: 'surf_watermelon',
        type: 'watermelon',
        x: 16 * TILE_SIZE,
        y: (SURFACE_ROW - 1) * TILE_SIZE,
        width: 64,
        height: 48,
        resourcesRemaining: 200,
        maxResources: 200,
      },
      {
        id: 'surf_donut',
        type: 'donut',
        x: 29 * TILE_SIZE,
        y: (SURFACE_ROW - 1) * TILE_SIZE,
        width: 56,
        height: 44,
        resourcesRemaining: 150,
        maxResources: 150,
      },
      {
        id: 'surf_sugar',
        type: 'sugar_pile',
        x: 37 * TILE_SIZE,
        y: (SURFACE_ROW - 1) * TILE_SIZE,
        width: 48,
        height: 32,
        resourcesRemaining: 120,
        maxResources: 120,
      },
      {
        id: 'surf_aphid_1',
        type: 'aphid',
        x: 8 * TILE_SIZE,
        y: (SURFACE_ROW - 2) * TILE_SIZE,
        width: 32,
        height: 24,
        resourcesRemaining: 50,
        maxResources: 50,
        tamed: false,
      },
      {
        id: 'surf_aphid_2',
        type: 'aphid',
        x: 11 * TILE_SIZE,
        y: (SURFACE_ROW - 2) * TILE_SIZE,
        width: 32,
        height: 24,
        resourcesRemaining: 50,
        maxResources: 50,
        tamed: false,
      },
      {
        id: 'surf_flower',
        type: 'flower',
        x: 43 * TILE_SIZE,
        y: (SURFACE_ROW - 3) * TILE_SIZE,
        width: 40,
        height: 70,
        resourcesRemaining: 60,
        maxResources: 60,
      },
    ];
  }

  private initColonyObjects() {
    this.colonyObjects = [
      // Central Chamber: Sugar Pantry & Radio
      {
        id: 'obj_pantry',
        type: 'sugar_pantry',
        x: 21 * TILE_SIZE,
        y: 18 * TILE_SIZE,
        width: 2 * TILE_SIZE,
        height: 1 * TILE_SIZE,
        stateValue: 24, // 24 initial sugar stored
      },
      {
        id: 'obj_radio',
        type: 'spore_radio',
        x: 27 * TILE_SIZE,
        y: 18 * TILE_SIZE,
        width: 2 * TILE_SIZE,
        height: 1 * TILE_SIZE,
        stateValue: 1, // Radio is ON and rocking
      },

      // Worker Bunkhouse: Leaf Hammocks
      {
        id: 'obj_hammock_1',
        type: 'leaf_hammock',
        x: 19 * TILE_SIZE,
        y: 27 * TILE_SIZE,
        width: 2 * TILE_SIZE,
        height: 1 * TILE_SIZE,
        stateValue: 0,
      },
      {
        id: 'obj_hammock_2',
        type: 'leaf_hammock',
        x: 23 * TILE_SIZE,
        y: 27 * TILE_SIZE,
        width: 2 * TILE_SIZE,
        height: 1 * TILE_SIZE,
        stateValue: 0,
      },
      {
        id: 'obj_moss_1',
        type: 'moss_mattress',
        x: 27 * TILE_SIZE,
        y: 27 * TILE_SIZE,
        width: 2 * TILE_SIZE,
        height: 1 * TILE_SIZE,
        stateValue: 0,
      },

      // Fungus Chamber: Fungus Bed & Biolum Shroom
      {
        id: 'obj_fungus_1',
        type: 'fungus_garden',
        x: 33 * TILE_SIZE,
        y: 23 * TILE_SIZE,
        width: 3 * TILE_SIZE,
        height: 2 * TILE_SIZE,
        stateValue: 40,
      },
      {
        id: 'obj_shroom_light',
        type: 'biolum_shroom',
        x: 39 * TILE_SIZE,
        y: 23 * TILE_SIZE,
        width: 1 * TILE_SIZE,
        height: 1 * TILE_SIZE,
        stateValue: 1,
      },

      // Royal Nursery: Queen's Throne & Brood Nests
      {
        id: 'obj_throne',
        type: 'queen_throne',
        x: 10 * TILE_SIZE,
        y: 23 * TILE_SIZE,
        width: 3 * TILE_SIZE,
        height: 2 * TILE_SIZE,
        stateValue: 0,
      },
    ];

    // Starting Brood (Eggs & Larvae in Royal Nursery)
    this.brood = [
      {
        id: 'brood_1',
        stage: 'egg',
        x: 14 * TILE_SIZE,
        y: 23.5 * TILE_SIZE,
        age: 10,
        growthDuration: 60,
        hunger: 100,
        careQuality: 90,
      },
      {
        id: 'brood_2',
        stage: 'egg',
        x: 15 * TILE_SIZE,
        y: 23.5 * TILE_SIZE,
        age: 35,
        growthDuration: 60,
        hunger: 100,
        careQuality: 85,
      },
      {
        id: 'brood_3',
        stage: 'larva',
        x: 16 * TILE_SIZE,
        y: 23.5 * TILE_SIZE,
        age: 20,
        growthDuration: 75,
        hunger: 65,
        careQuality: 80,
      },
    ];
  }

  private initStartingAnts() {
    // 1. Her Majesty Queen Formica
    const queen: AntSim = this.createAnt('Queen Ant-oinette IV', 'Queen', 'Matriarch of the Hill', '#9a244a', 1.5, {
      x: 11 * TILE_SIZE,
      y: 23 * TILE_SIZE,
      aspiration: 'Brood',
      personality: { neat: 8, outgoing: 6, active: 4, playful: 3, nice: 7 },
    });

    // 2. Minor Worker - Ant-thony
    const worker1: AntSim = this.createAnt('Ant-thony', 'Worker', 'Lead Excavator', '#a85a2b', 1.0, {
      x: 20 * TILE_SIZE,
      y: 18 * TILE_SIZE,
      aspiration: 'Fortune',
      personality: { neat: 9, outgoing: 5, active: 9, playful: 6, nice: 8 },
    });

    // 3. Nurse - Florence
    const nurse: AntSim = this.createAnt('Florence', 'Nurse', 'Chief Brood Caretaker', '#c87834', 1.05, {
      x: 15 * TILE_SIZE,
      y: 23 * TILE_SIZE,
      aspiration: 'Brood',
      personality: { neat: 10, outgoing: 8, active: 6, playful: 5, nice: 10 },
    });

    // 4. Soldier - Major Pincer
    const soldier: AntSim = this.createAnt('Major Pincer', 'Soldier', 'Colony Defender', '#5c3318', 1.3, {
      x: 24 * TILE_SIZE,
      y: 13 * TILE_SIZE,
      aspiration: 'Popularity',
      personality: { neat: 4, outgoing: 7, active: 9, playful: 8, nice: 6 },
    });

    // 5. Forager - Scout Chirp
    const forager: AntSim = this.createAnt('Scout Chirp', 'Forager', 'Surface Pathfinder', '#d17b38', 0.95, {
      x: 22 * TILE_SIZE,
      y: 9 * TILE_SIZE,
      aspiration: 'Pleasure',
      personality: { neat: 5, outgoing: 9, active: 10, playful: 9, nice: 7 },
    });

    this.ants = [queen, worker1, nurse, soldier, forager];
    this.selectedAntId = worker1.id;

    // Seed mutual friendly relationships
    this.ants.forEach(a => {
      this.ants.forEach(b => {
        if (a.id !== b.id) {
          a.relationships[b.id] = {
            daily: 45 + Math.floor(Math.random() * 30),
            lifetime: 40 + Math.floor(Math.random() * 25),
            isBestFriend: a.caste === 'Queen' ? false : Math.random() < 0.2,
          };
        }
      });
    });
  }

  public createAnt(
    name: string,
    caste: CasteType,
    title: string,
    color: string,
    scale: number,
    options: {
      x: number;
      y: number;
      aspiration: AspirationType;
      personality: Personality;
    }
  ): AntSim {
    const id = `ant_${++this.nextId}`;
    const ant: AntSim = {
      id,
      name,
      title,
      caste,
      color,
      scale,
      aspiration: options.aspiration,
      aspirationScore: 3500, // starts in Gold / high Green
      aspirationLevel: 'Gold',
      personality: options.personality,
      motives: {
        hunger: 80 + Math.random() * 15,
        energy: 85 + Math.random() * 10,
        grooming: 75 + Math.random() * 20,
        social: 70 + Math.random() * 25,
        fun: 70 + Math.random() * 25,
        colonyDuty: 80 + Math.random() * 15,
      },
      wants: [],
      fears: [],
      relationships: {},
      heldItem: 'none',
      actionQueue: [],
      x: options.x,
      y: options.y,
      vx: 0,
      vy: 0,
      facing: 1,
      walkCycle: 0,
      antennaTwitch: 0,
      isSleeping: false,
      isDancing: false,
      isDigging: false,
      stateText: 'Idling pleasantly',
      bubble: null,
      failurePsychiatrist: false,
    };

    this.rollWantsAndFears(ant);
    return ant;
  }

  // ==========================================
  // WANTS & FEARS ENGINE (THE SIMS 2 CORE)
  // ==========================================

  public rollWantsAndFears(ant: AntSim) {
    const possibleWants: WantOrFear[] = [
      {
        id: `w_honey_${Math.random()}`,
        key: 'eat_honeydew',
        name: 'Sip Sweet Honeydew',
        description: 'Taste the delicious nectar produced by aphids.',
        icon: '🍯',
        points: 1200,
      },
      {
        id: `w_melon_${Math.random()}`,
        key: 'eat_watermelon',
        name: 'Feast on Watermelon',
        description: 'Carve a chunk from the summer picnic melon.',
        icon: '🍉',
        points: 1500,
      },
      {
        id: `w_troph_${Math.random()}`,
        key: 'share_trophallaxis',
        name: 'Share Trophallaxis',
        description: 'Deepen colony bonds by sharing nectar mouth-to-mouth.',
        icon: '💖',
        points: 1800,
      },
      {
        id: `w_hammock_${Math.random()}`,
        key: 'nap_in_hammock',
        name: 'Nap in Leaf Cradle',
        description: 'Take a restorative siesta in a suspended hammock.',
        icon: '🍃',
        points: 1000,
      },
      {
        id: `w_radio_${Math.random()}`,
        key: 'dance_to_radio',
        name: 'Dance to Spore Jazz',
        description: 'Wiggle legs and swing antennae to the retro tunes.',
        icon: '📻',
        points: 1400,
      },
      {
        id: `w_joust_${Math.random()}`,
        key: 'play_antenna_joust',
        name: 'Antenna Jousting Play',
        description: 'Engage in a friendly duel of antennae reflexes.',
        icon: '⚔️',
        points: 1600,
      },
      {
        id: `w_joke_${Math.random()}`,
        key: 'tell_joke',
        name: 'Tell a Colony Joke',
        description: 'Share a funny pheromone quip with a comrade.',
        icon: '😂',
        points: 1100,
      },
      {
        id: `w_dig_${Math.random()}`,
        key: 'dig_new_tunnel',
        name: 'Excavate Dirt Block',
        description: 'Carve out new subterranean living space.',
        icon: '⛏️',
        points: 2000,
      },
      {
        id: `w_feed_${Math.random()}`,
        key: 'feed_baby_larva',
        name: 'Feed Hungry Larva',
        description: 'Regurgitate nutritious paste to a wiggling baby.',
        icon: '🐛',
        points: 2200,
      },
      {
        id: `w_praise_${Math.random()}`,
        key: 'tend_queen',
        name: 'Praise Her Majesty',
        description: 'Pay respects to the Queen in the Royal Chamber.',
        icon: '👑',
        points: 2500,
      },
      {
        id: `w_aphid_${Math.random()}`,
        key: 'pet_aphid',
        name: 'Pet an Aphid',
        description: 'Gently stroke a docile aphid on the grass stems.',
        icon: '💚',
        points: 1300,
      },
    ];

    const possibleFears: WantOrFear[] = [
      {
        id: `f_starve_${Math.random()}`,
        key: 'starve',
        name: 'Starvation Motive Failure',
        description: 'Let hunger drop into the dangerous red zone.',
        icon: '💀',
        points: -2500,
      },
      {
        id: `f_rej_${Math.random()}`,
        key: 'rejected_social',
        name: 'Get Rejected in Social',
        description: 'Have another ant snap mandibles at your greeting.',
        icon: '💔',
        points: -1800,
      },
      {
        id: `f_exhaust_${Math.random()}`,
        key: 'pass_out_exhausted',
        name: 'Collapse from Exhaustion',
        description: 'Fall asleep face-first in the dirt before reaching bed.',
        icon: '💤',
        points: -1500,
      },
      {
        id: `f_larva_${Math.random()}`,
        key: 'larva_goes_hungry',
        name: 'Neglected Brood Crisis',
        description: 'A nursery larva crying from empty stomach.',
        icon: '🚼',
        points: -3000,
      },
    ];

    // Pick 4 unique wants matching aspiration preference
    const shuffledWants = [...possibleWants].sort(() => Math.random() - 0.5);
    ant.wants = shuffledWants.slice(0, 4);

    // Pick 3 fears
    const shuffledFears = [...possibleFears].sort(() => Math.random() - 0.5);
    ant.fears = shuffledFears.slice(0, 3);
  }

  public triggerWant(ant: AntSim, key: WantFearKey) {
    const wantIdx = ant.wants.findIndex(w => w.key === key);
    if (wantIdx !== -1) {
      const want = ant.wants[wantIdx];
      ant.aspirationScore += want.points;
      this.state.pollenPoints += Math.floor(want.points / 50); // bonus §

      audio.playWantFulfilled();
      this.showBubble(ant, want.icon, false, 3.0);

      // Re-roll this slot
      this.rollWantsAndFears(ant);
      this.updateAspirationLevel(ant);
    }
  }

  public triggerFear(ant: AntSim, key: WantFearKey) {
    const fearIdx = ant.fears.findIndex(f => f.key === key);
    if (fearIdx !== -1) {
      const fear = ant.fears[fearIdx];
      ant.aspirationScore += fear.points; // points are negative
      audio.playFearTriggered();
      this.showBubble(ant, '💔', true, 3.5);

      this.rollWantsAndFears(ant);
      this.updateAspirationLevel(ant);
    }
  }

  private updateAspirationLevel(ant: AntSim) {
    const score = ant.aspirationScore;
    if (score >= 6000) {
      ant.aspirationLevel = 'Platinum';
    } else if (score >= 3500) {
      ant.aspirationLevel = 'Gold';
    } else if (score >= 1000) {
      ant.aspirationLevel = 'Green';
    } else if (score >= -2000) {
      ant.aspirationLevel = 'Red';
    } else {
      ant.aspirationLevel = 'Failure';
      // The Social Ant Shrink descends!
      if (!ant.failurePsychiatrist) {
        ant.failurePsychiatrist = true;
        this.showBubble(ant, '🩺', true, 5.0);
        ant.stateText = 'Aspiration Failure! Receiving therapy...';
      }
    }
  }

  // ==========================================
  // SPEECH & THOUGHT BUBBLES
  // ==========================================

  public showBubble(ant: AntSim, icon: string, isThought: boolean = false, duration: number = 2.5) {
    ant.bubble = {
      icon,
      isThought,
      timer: duration,
    };
  }

  // ==========================================
  // SIMULATION UPDATE LOOP
  // ==========================================

  public update(dt: number) {
    if (this.state.timeScale === 0) return; // Paused

    const scaledDt = dt * this.state.timeScale;

    // Advance World Clock
    this.advanceClock(scaledDt);

    // Update Brood Lifecycle
    this.updateBrood(scaledDt);

    // Update Colony Objects (Radio music, Fungus growth, Aphids)
    this.updateObjects(scaledDt);

    // Update Ants (Needs, AI, Movement, Queues)
    for (const ant of this.ants) {
      this.updateAnt(ant, scaledDt);
    }

    // Queen Reproduction
    this.updateQueenEggLaying(scaledDt);
  }

  private advanceClock(dt: number) {
    // 1 real second = 1 sim minute at 1x
    this.state.timeOfDay += (dt / 60) * 0.8;
    if (this.state.timeOfDay >= 24) {
      this.state.timeOfDay -= 24;
      this.state.day += 1;
    }
  }

  private updateBrood(dt: number) {
    for (let i = this.brood.length - 1; i >= 0; i--) {
      const b = this.brood[i];
      b.age += dt;

      if (b.stage === 'egg') {
        if (b.age >= b.growthDuration) {
          // Egg hatches into Larva!
          b.stage = 'larva';
          b.age = 0;
          b.growthDuration = 80;
          b.hunger = 70;
          audio.playChime(880);
        }
      } else if (b.stage === 'larva') {
        b.hunger = Math.max(0, b.hunger - dt * 0.8);
        if (b.hunger < 20) {
          // Larva hungry fear!
          const nurse = this.ants.find(a => a.caste === 'Nurse');
          if (nurse) this.triggerFear(nurse, 'larva_goes_hungry');
        }

        if (b.age >= b.growthDuration && b.hunger > 40) {
          // Larva spins into Pupa!
          b.stage = 'pupa';
          b.age = 0;
          b.growthDuration = 60;
          audio.playChime(1046);
        }
      } else if (b.stage === 'pupa') {
        if (b.age >= b.growthDuration) {
          // Emerge as a new adult ant!
          this.brood.splice(i, 1);
          this.hatchAdultAnt(b.x, b.y);
        }
      }
    }
  }

  private hatchAdultAnt(x: number, y: number) {
    const castes: CasteType[] = ['Worker', 'Nurse', 'Soldier', 'Forager'];
    const caste = castes[Math.floor(Math.random() * castes.length)];
    const names = ['Barnaby', 'Chitina', 'Maximus', 'Zora', 'Bramble', 'Pippy', 'Ferdinand', 'Gwendolyn'];
    const name = names[Math.floor(Math.random() * names.length)] + ` #${this.ants.length + 1}`;
    const aspirs: AspirationType[] = ['Pleasure', 'Fortune', 'Brood', 'Popularity', 'Knowledge'];
    const aspiration = aspirs[Math.floor(Math.random() * aspirs.length)];

    const newAnt = this.createAnt(name, caste, `Freshly Hatched ${caste}`, '#b26838', 1.0, {
      x,
      y,
      aspiration,
      personality: {
        neat: Math.floor(Math.random() * 11),
        outgoing: Math.floor(Math.random() * 11),
        active: Math.floor(Math.random() * 11),
        playful: Math.floor(Math.random() * 11),
        nice: Math.floor(Math.random() * 11),
      },
    });

    this.ants.push(newAnt);
    audio.playWantFulfilled();
    this.showBubble(newAnt, '🎉', false, 4.0);
  }

  private updateQueenEggLaying(dt: number) {
    const queen = this.ants.find(a => a.caste === 'Queen');
    if (!queen) return;

    // Queen lays egg if well-fed and rested every ~90 seconds
    if (queen.motives.hunger > 60 && queen.motives.energy > 50 && this.brood.length < 10) {
      if (Math.random() < dt * 0.015) {
        this.brood.push({
          id: `egg_${++this.nextId}`,
          stage: 'egg',
          x: queen.x + (Math.random() - 0.5) * 30,
          y: queen.y + 10,
          age: 0,
          growthDuration: 60,
          hunger: 100,
          careQuality: 95,
        });
        this.showBubble(queen, '🥚', false, 3.0);
        audio.playChime(660);
      }
    }
  }

  private updateObjects(dt: number) {
    for (const obj of this.colonyObjects) {
      if (obj.type === 'fungus_garden') {
        // Fungus slowly grows edible mushroom mycelium
        obj.stateValue = Math.min(100, obj.stateValue + dt * 0.5);
      } else if (obj.type === 'aphid_pen') {
        // Domestic aphids generate sweet honeydew droplets
        obj.stateValue = Math.min(50, obj.stateValue + dt * 0.3);
      }
    }
  }

  // ==========================================
  // INDIVIDUAL ANT SIMULATION
  // ==========================================

  private updateAnt(ant: AntSim, dt: number) {
    // 1. Decay Motives over time
    ant.motives.hunger = Math.max(0, ant.motives.hunger - dt * 0.22);
    ant.motives.energy = Math.max(0, ant.motives.energy - dt * (ant.isSleeping ? -1.8 : 0.18));
    ant.motives.grooming = Math.max(0, ant.motives.grooming - dt * 0.12);
    ant.motives.social = Math.max(0, ant.motives.social - dt * 0.14);
    ant.motives.fun = Math.max(0, ant.motives.fun - dt * 0.16);
    ant.motives.colonyDuty = Math.max(0, ant.motives.colonyDuty - dt * 0.08);

    // Fear checks
    if (ant.motives.hunger < 12) {
      this.triggerFear(ant, 'starve');
    }
    if (ant.motives.energy < 5 && !ant.isSleeping) {
      this.triggerFear(ant, 'pass_out_exhausted');
      // Collapse on ground
      ant.isSleeping = true;
      ant.stateText = 'Passed out from exhaustion!';
      this.showBubble(ant, '💤', true, 3.0);
    }

    // Psychiatrist healing
    if (ant.failurePsychiatrist) {
      ant.aspirationScore += dt * 350;
      if (ant.aspirationScore >= 1200) {
        ant.failurePsychiatrist = false;
        this.updateAspirationLevel(ant);
        this.showBubble(ant, '✨', false, 3.0);
      }
    }

    // 2. Update Bubbles
    if (ant.bubble) {
      ant.bubble.timer -= dt;
      if (ant.bubble.timer <= 0) {
        ant.bubble = null;
      }
    }

    // 3. Process Action Queue or Run Autonomy
    if (ant.actionQueue.length > 0) {
      const action = ant.actionQueue[0];
      if (action.elapsed === 0 && action.onStart) {
        action.onStart(ant);
      }

      action.elapsed += dt;
      let finished = action.elapsed >= action.duration;

      if (action.onUpdate) {
        const updateDone = action.onUpdate(ant, dt);
        if (updateDone) finished = true;
      }

      if (finished) {
        if (action.onComplete) {
          action.onComplete(ant);
        }
        ant.actionQueue.shift();
      }
    } else {
      // Free will autonomy!
      this.runAntAutonomy(ant, dt);
    }

    // 4. Procedural movement & animation
    ant.antennaTwitch += dt * (3 + Math.random() * 4);
    if (Math.abs(ant.vx) > 0.05 || Math.abs(ant.vy) > 0.05) {
      ant.walkCycle += dt * 8;
      ant.x += ant.vx * dt;
      ant.y += ant.vy * dt;
      ant.facing = ant.vx >= 0 ? 1 : -1;
    } else {
      ant.walkCycle = 0;
    }

    // Keep ant inside world bounds
    ant.x = Math.max(1 * TILE_SIZE, Math.min((GRID_COLS - 2) * TILE_SIZE, ant.x));
    ant.y = Math.max(2 * TILE_SIZE, Math.min((GRID_ROWS - 2) * TILE_SIZE, ant.y));
  }

  // ==========================================
  // AUTONOMOUS AI (FREE WILL)
  // ==========================================

  private runAntAutonomy(ant: AntSim, dt: number) {
    if (ant.isSleeping) {
      ant.motives.energy = Math.min(100, ant.motives.energy + dt * 2.5);
      if (ant.motives.energy >= 98) {
        ant.isSleeping = false;
        ant.stateText = 'Awake and refreshed!';
      }
      return;
    }

    // If lowest motive is critically low, address it!
    const m = ant.motives;

    // Hunger lowest
    if (m.hunger < 45) {
      this.autonomousSeekFood(ant);
      return;
    }

    // Energy lowest
    if (m.energy < 30) {
      this.autonomousSeekRest(ant);
      return;
    }

    // Grooming lowest
    if (m.grooming < 40) {
      this.autonomousGroom(ant);
      return;
    }

    // Social lowest
    if (m.social < 45) {
      this.autonomousSeekSocial(ant);
      return;
    }

    // Fun lowest
    if (m.fun < 45) {
      this.autonomousSeekFun(ant);
      return;
    }

    // Colony Duty / Caste Role
    this.autonomousCasteWork(ant, dt);
  }

  private autonomousSeekFood(ant: AntSim) {
    // 1. Check if pantry has sugar
    const pantry = this.colonyObjects.find(o => o.type === 'sugar_pantry' && o.stateValue > 0);
    if (pantry) {
      this.queueWalkToObject(ant, pantry, () => {
        ant.stateText = 'Munching sugar at pantry';
        ant.actionQueue.push({
          id: `eat_${Math.random()}`,
          name: 'Eat Stored Sugar',
          icon: '🍯',
          duration: 3.5,
          elapsed: 0,
          targetType: 'object',
          targetId: pantry.id,
          onComplete: a => {
            pantry.stateValue = Math.max(0, pantry.stateValue - 2);
            a.motives.hunger = Math.min(100, a.motives.hunger + 45);
            audio.playChime(750);
            this.showBubble(a, '🍯', false, 2.0);
          },
          interruptible: true,
        });
      });
      return;
    }

    // 2. Check if fungus garden is harvestable
    const fungus = this.colonyObjects.find(o => o.type === 'fungus_garden' && o.stateValue >= 20);
    if (fungus) {
      this.queueWalkToObject(ant, fungus, () => {
        ant.stateText = 'Snacking on cultivated fungus';
        ant.actionQueue.push({
          id: `eat_fungus_${Math.random()}`,
          name: 'Eat Fungus Mash',
          icon: '🍄',
          duration: 3.0,
          elapsed: 0,
          targetType: 'object',
          targetId: fungus.id,
          onComplete: a => {
            fungus.stateValue = Math.max(0, fungus.stateValue - 15);
            a.motives.hunger = Math.min(100, a.motives.hunger + 35);
            this.showBubble(a, '🍄', false, 2.0);
          },
          interruptible: true,
        });
      });
      return;
    }

    // 3. Go to surface watermelon or sugar
    const melon = this.surfaceEntities.find(e => e.type === 'watermelon' && e.resourcesRemaining > 0);
    if (melon) {
      this.queueWalkToCoord(ant, melon.x, melon.y, () => {
        ant.stateText = 'Feasting on summer watermelon';
        ant.actionQueue.push({
          id: `eat_melon_${Math.random()}`,
          name: 'Eat Watermelon Slice',
          icon: '🍉',
          duration: 4.0,
          elapsed: 0,
          targetType: 'surface_entity',
          targetId: melon.id,
          onComplete: a => {
            melon.resourcesRemaining = Math.max(0, melon.resourcesRemaining - 5);
            a.motives.hunger = Math.min(100, a.motives.hunger + 55);
            this.triggerWant(a, 'eat_watermelon');
          },
          interruptible: true,
        });
      });
    }
  }

  private autonomousSeekRest(ant: AntSim) {
    const beds = this.colonyObjects.filter(
      o => (o.type === 'leaf_hammock' || o.type === 'moss_mattress') && !o.occupiedByAntId
    );

    if (beds.length > 0) {
      const bed = beds[Math.floor(Math.random() * beds.length)];
      bed.occupiedByAntId = ant.id;

      this.queueWalkToObject(ant, bed, () => {
        ant.isSleeping = true;
        ant.stateText = `Sleeping in ${bed.type === 'leaf_hammock' ? 'Leaf Hammock' : 'Moss Bed'}`;
        this.triggerWant(ant, 'nap_in_hammock');
        this.showBubble(ant, '💤', true, 4.0);
        audio.playChime(440);
      });
    } else {
      // Power nap on floor
      ant.isSleeping = true;
      ant.stateText = 'Taking a dirt power nap';
      this.showBubble(ant, '💤', true, 3.0);
    }
  }

  private autonomousGroom(ant: AntSim) {
    ant.stateText = 'Grooming antennae and legs';
    ant.vx = 0;
    ant.vy = 0;
    ant.actionQueue.push({
      id: `groom_${Math.random()}`,
      name: 'Groom Antennae',
      icon: '✨',
      duration: 3.0,
      elapsed: 0,
      targetType: 'self',
      onComplete: a => {
        a.motives.grooming = Math.min(100, a.motives.grooming + 40);
        this.showBubble(a, '✨', false, 2.0);
      },
      interruptible: true,
    });
  }

  private autonomousSeekSocial(ant: AntSim) {
    const others = this.ants.filter(o => o.id !== ant.id && !o.isSleeping);
    if (others.length === 0) return;

    const friend = others[Math.floor(Math.random() * others.length)];
    this.queueWalkToCoord(ant, friend.x + (ant.x > friend.x ? 25 : -25), friend.y, () => {
      ant.facing = friend.x > ant.x ? 1 : -1;
      friend.facing = ant.x > friend.x ? 1 : -1;

      // Antenna Tap & Chat
      ant.stateText = `Chatting with ${friend.name}`;
      audio.playSimlish('chat');
      this.showBubble(ant, '💬', false, 2.5);
      this.showBubble(friend, '🐜', false, 2.5);

      ant.motives.social = Math.min(100, ant.motives.social + 25);
      friend.motives.social = Math.min(100, friend.motives.social + 25);

      // Boost relationship
      this.changeRelationship(ant, friend, 8, 4);

      this.triggerWant(ant, 'tell_joke');
    });
  }

  private autonomousSeekFun(ant: AntSim) {
    // Radio or Pebble Game
    const radio = this.colonyObjects.find(o => o.type === 'spore_radio');
    if (radio) {
      this.queueWalkToObject(ant, radio, () => {
        ant.stateText = 'Dancing to Spore Radio!';
        ant.isDancing = true;
        this.showBubble(ant, '🎵', false, 3.0);
        ant.actionQueue.push({
          id: `dance_${Math.random()}`,
          name: 'Dance to Spore Jazz',
          icon: '🎵',
          duration: 4.5,
          elapsed: 0,
          targetType: 'object',
          targetId: radio.id,
          onComplete: a => {
            a.isDancing = false;
            a.motives.fun = Math.min(100, a.motives.fun + 40);
            this.triggerWant(a, 'dance_to_radio');
          },
          interruptible: true,
        });
      });
    }
  }

  private autonomousCasteWork(ant: AntSim, dt: number) {
    if (ant.caste === 'Worker') {
      // Find marked dig tile or wander
      const digTile = this.findNearestDigTile(ant);
      if (digTile) {
        this.queueWalkToCoord(ant, digTile.c * TILE_SIZE + 16, digTile.r * TILE_SIZE + 16, () => {
          this.executeDigAction(ant, digTile.c, digTile.r);
        });
      } else {
        // Carry food from surface to pantry if pantry is low
        const pantry = this.colonyObjects.find(o => o.type === 'sugar_pantry');
        if (pantry && pantry.stateValue < 30) {
          const sugar = this.surfaceEntities.find(s => s.type === 'sugar_pile' && s.resourcesRemaining > 0);
          if (sugar && ant.heldItem === 'none') {
            this.queueWalkToCoord(ant, sugar.x, sugar.y, () => {
              ant.heldItem = 'sugar_crumb';
              sugar.resourcesRemaining -= 1;
              this.showBubble(ant, '🍯', false, 2.0);

              // Walk to pantry to deposit
              this.queueWalkToObject(ant, pantry, () => {
                ant.heldItem = 'none';
                pantry.stateValue += 5;
                this.state.pollenPoints += 15;
                ant.motives.colonyDuty = Math.min(100, ant.motives.colonyDuty + 20);
                audio.playChime(900);
              });
            });
          }
        }
      }
    } else if (ant.caste === 'Nurse') {
      // Tend hungry larvae or clean eggs
      const hungryLarva = this.brood.find(b => b.stage === 'larva' && b.hunger < 70);
      if (hungryLarva) {
        this.queueWalkToCoord(ant, hungryLarva.x, hungryLarva.y, () => {
          ant.stateText = 'Feeding baby larva regurgitated mash';
          this.showBubble(ant, '🍼', false, 3.0);
          hungryLarva.hunger = Math.min(100, hungryLarva.hunger + 40);
          ant.motives.colonyDuty = Math.min(100, ant.motives.colonyDuty + 25);
          this.triggerWant(ant, 'feed_baby_larva');
          audio.playTrophallaxis();
        });
      }
    } else if (ant.caste === 'Forager') {
      // Brave the surface, search for aphids or snacks
      if (Math.random() < dt * 0.1) {
        const aphid = this.surfaceEntities.find(e => e.type === 'aphid');
        if (aphid) {
          this.queueWalkToCoord(ant, aphid.x, aphid.y, () => {
            ant.stateText = 'Milking sweet honeydew from aphid';
            audio.playSimlish('happy');
            this.showBubble(ant, '💚', false, 2.5);
            this.state.pollenPoints += 10;
            ant.motives.fun = Math.min(100, ant.motives.fun + 15);
            this.triggerWant(ant, 'pet_aphid');
          });
        }
      }
    }
  }

  // ==========================================
  // RELATIONSHIPS & SOCIAL INTERACTIONS
  // ==========================================

  public changeRelationship(antA: AntSim, antB: AntSim, deltaDaily: number, deltaLifetime: number) {
    if (!antA.relationships[antB.id]) {
      antA.relationships[antB.id] = { daily: 50, lifetime: 50 };
    }
    if (!antB.relationships[antA.id]) {
      antB.relationships[antA.id] = { daily: 50, lifetime: 50 };
    }

    const relA = antA.relationships[antB.id];
    const relB = antB.relationships[antA.id];

    relA.daily = Math.max(-100, Math.min(100, relA.daily + deltaDaily));
    relA.lifetime = Math.max(-100, Math.min(100, relA.lifetime + deltaLifetime));

    relB.daily = Math.max(-100, Math.min(100, relB.daily + deltaDaily));
    relB.lifetime = Math.max(-100, Math.min(100, relB.lifetime + deltaLifetime));

    if (relA.daily > 80 && relA.lifetime > 70) {
      relA.isBestFriend = true;
      relB.isBestFriend = true;
    }
  }

  // Trophallaxis (Mouth-to-mouth liquid food sharing)
  public executeTrophallaxis(giver: AntSim, receiver: AntSim) {
    giver.stateText = `Sharing trophallaxis with ${receiver.name}`;
    receiver.stateText = `Receiving trophallaxis from ${giver.name}`;

    audio.playTrophallaxis();
    this.showBubble(giver, '💖', false, 3.0);
    this.showBubble(receiver, '🍯', false, 3.0);

    const transfer = 25;
    giver.motives.hunger = Math.max(10, giver.motives.hunger - transfer * 0.4);
    receiver.motives.hunger = Math.min(100, receiver.motives.hunger + transfer);

    giver.motives.social = Math.min(100, giver.motives.social + 20);
    receiver.motives.social = Math.min(100, receiver.motives.social + 20);

    this.changeRelationship(giver, receiver, 15, 8);
    this.triggerWant(giver, 'share_trophallaxis');
    this.triggerWant(receiver, 'share_trophallaxis');
  }

  // Antenna Jousting (Playful combat)
  public executeAntennaJoust(antA: AntSim, antB: AntSim) {
    audio.playSimlish('happy');
    this.showBubble(antA, '⚔️', false, 3.0);
    this.showBubble(antB, '⚔️', false, 3.0);

    antA.motives.fun = Math.min(100, antA.motives.fun + 35);
    antB.motives.fun = Math.min(100, antB.motives.fun + 35);

    this.changeRelationship(antA, antB, 12, 6);
    this.triggerWant(antA, 'play_antenna_joust');
    this.triggerWant(antB, 'play_antenna_joust');
  }

  // ==========================================
  // DIGGING & BUILDING (BUILD MODE)
  // ==========================================

  public markTileForDig(col: number, row: number) {
    if (row < SURFACE_ROW || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return;
    const tile = this.grid[row][col];
    if (tile.type === 'soil' || tile.type === 'hard_rock') {
      tile.markedForDig = !tile.markedForDig;
      audio.playClick();
    }
  }

  public instantDigTile(col: number, row: number) {
    if (row < SURFACE_ROW || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return;
    const tile = this.grid[row][col];
    if (tile.type === 'soil' || tile.type === 'hard_rock') {
      tile.type = 'tunnel';
      tile.markedForDig = false;
      this.state.pollenPoints += 5; // gain § for excavated minerals
      audio.playDigDirt();
    }
  }

  private findNearestDigTile(ant: AntSim): { c: number; r: number } | null {
    let nearest: { c: number; r: number } | null = null;
    let minDist = Infinity;

    for (let r = SURFACE_ROW; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (this.grid[r][c].markedForDig) {
          const dist = Math.hypot(c * TILE_SIZE - ant.x, r * TILE_SIZE - ant.y);
          if (dist < minDist) {
            minDist = dist;
            nearest = { c, r };
          }
        }
      }
    }
    return nearest;
  }

  public executeDigAction(ant: AntSim, col: number, row: number) {
    ant.stateText = `Excavating soil at (${col}, ${row})`;
    ant.isDigging = true;
    ant.actionQueue.push({
      id: `dig_${col}_${row}`,
      name: 'Excavate Tunnel',
      icon: '⛏️',
      duration: 2.5,
      elapsed: 0,
      targetType: 'tile',
      targetX: col * TILE_SIZE,
      targetY: row * TILE_SIZE,
      onComplete: a => {
        a.isDigging = false;
        if (this.grid[row] && this.grid[row][col]) {
          this.grid[row][col].type = 'tunnel';
          this.grid[row][col].markedForDig = false;
        }
        audio.playDigDirt();
        this.state.pollenPoints += 8;
        a.motives.colonyDuty = Math.min(100, a.motives.colonyDuty + 25);
        this.triggerWant(a, 'dig_new_tunnel');
      },
      interruptible: true,
    });
  }

  // ==========================================
  // BUY MODE (PURCHASE & PLACE OBJECT)
  // ==========================================

  public buyObject(catalogType: string, tileCol: number, tileRow: number): boolean {
    const item = CATALOG.find(c => c.type === catalogType);
    if (!item) return false;

    if (this.state.pollenPoints < item.cost) {
      audio.playFearTriggered();
      return false; // Not enough §
    }

    this.state.pollenPoints -= item.cost;
    const newObj: ColonyObject = {
      id: `obj_${++this.nextId}`,
      type: item.type,
      x: tileCol * TILE_SIZE,
      y: tileRow * TILE_SIZE,
      width: item.width * TILE_SIZE,
      height: item.height * TILE_SIZE,
      stateValue: item.type === 'sugar_pantry' ? 20 : item.type === 'spore_radio' ? 1 : 0,
    };

    this.colonyObjects.push(newObj);
    audio.playPlaceObject();
    return true;
  }

  // ==========================================
  // PATHFINDING & MOVEMENT UTILS
  // ==========================================

  public queueWalkToCoord(ant: AntSim, targetX: number, targetY: number, onArrival: () => void) {
    ant.actionQueue.push({
      id: `walk_${Math.random()}`,
      name: 'Walk to location',
      icon: '🐾',
      duration: 15.0, // max timeout
      elapsed: 0,
      targetType: 'none',
      onUpdate: (a) => {
        const dx = targetX - a.x;
        const dy = targetY - a.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 12) {
          a.vx = 0;
          a.vy = 0;
          return true; // arrived!
        }

        const speed = a.aspirationLevel === 'Platinum' ? 75 : 55;
        a.vx = (dx / dist) * speed;
        a.vy = (dy / dist) * speed;
        return false;
      },
      onComplete: () => {
        ant.vx = 0;
        ant.vy = 0;
        onArrival();
      },
      interruptible: true,
    });
  }

  public queueWalkToObject(ant: AntSim, obj: ColonyObject, onArrival: () => void) {
    this.queueWalkToCoord(ant, obj.x + obj.width / 2, obj.y + obj.height / 2, onArrival);
  }

  public getSelectedAnt(): AntSim | null {
    if (!this.selectedAntId) return null;
    return this.ants.find(a => a.id === this.selectedAntId) || null;
  }
}
