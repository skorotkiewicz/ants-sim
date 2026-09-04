// ==========================================
// THE SIMS 2: ANT COLONY (THE SIMANTS 2)
// Game Entry Point & Controller Loop
// ==========================================

import './style.css';
import { Simulation } from './simulation';
import { Renderer } from './renderer';
import { UIManager } from './ui';
import { audio } from './audio';
import { GRID_COLS, GRID_ROWS, SURFACE_ROW, TILE_SIZE } from './types';
import type { AntSim } from './types';

class GameApp {
  private sim: Simulation;
  private renderer: Renderer;
  private ui: UIManager;

  private isDraggingCamera: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private cameraStartX: number = 0;
  private cameraStartY: number = 0;
  private hasDragged: boolean = false;

  private lastTime: number = 0;
  private keysDown: Set<string> = new Set();

  constructor() {
    const appEl = document.getElementById('app')!;
    this.sim = new Simulation();
    this.ui = new UIManager(this.sim, appEl);

    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new Renderer(canvas);

    this.setupWindowEvents();
    this.setupCanvasInputs(canvas);
    this.setupKeyboard();

    // Resize canvas to full window
    this.onResize();

    // Start Main Game Loop
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  private onResize() {
    this.renderer.resize(window.innerWidth, window.innerHeight);
  }

  private setupWindowEvents() {
    window.addEventListener('resize', () => this.onResize());

    // First user gesture starts Web Audio & procedural lounge jazz
    const unlockAudio = () => {
      audio.ensureContext();
      audio.startMusic();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
  }

  private setupKeyboard() {
    window.addEventListener('keydown', e => {
      this.keysDown.add(e.code);

      if (e.code === 'Space') {
        e.preventDefault();
        this.ui.setTimeScale(this.sim.state.timeScale === 0 ? 1 : 0);
      } else if (e.code === 'Digit1') {
        this.ui.setTimeScale(1);
      } else if (e.code === 'Digit2') {
        this.ui.setTimeScale(2);
      } else if (e.code === 'Digit3') {
        this.ui.setTimeScale(4);
      } else if (e.code === 'Tab') {
        // Cycle selected ant
        e.preventDefault();
        this.cycleSelectedAnt();
      } else if (e.code === 'KeyM') {
        const isMuted = audio.toggleMute();
        this.ui.showNotification(isMuted ? 'Muted' : 'Audio On');
      }
    });

    window.addEventListener('keyup', e => {
      this.keysDown.delete(e.code);
    });
  }

  private cycleSelectedAnt() {
    if (this.sim.ants.length === 0) return;
    const currentIdx = this.sim.ants.findIndex(a => a.id === this.sim.selectedAntId);
    const nextIdx = (currentIdx + 1) % this.sim.ants.length;
    const nextAnt = this.sim.ants[nextIdx];
    this.sim.selectedAntId = nextAnt.id;
    this.renderer.cameraX = nextAnt.x;
    this.renderer.cameraY = nextAnt.y;
    audio.playPlumbobSelect();
  }

  private setupCanvasInputs(canvas: HTMLCanvasElement) {
    // Mouse Down (Start Pan or Click)
    canvas.addEventListener('mousedown', e => {
      if (this.ui.pieMenuVisible) {
        this.ui.hidePieMenu();
      }

      this.isDraggingCamera = true;
      this.hasDragged = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.cameraStartX = this.renderer.cameraX;
      this.cameraStartY = this.renderer.cameraY;
    });

    // Mouse Move (Pan Camera or Highlight Tile)
    window.addEventListener('mousemove', e => {
      if (this.isDraggingCamera) {
        const dx = (e.clientX - this.dragStartX) / this.renderer.zoom;
        const dy = (e.clientY - this.dragStartY) / this.renderer.zoom;
        if (Math.hypot(dx, dy) > 5) {
          this.hasDragged = true;
          this.renderer.cameraX = this.cameraStartX - dx;
          this.renderer.cameraY = this.cameraStartY - dy;
        }
      }

      // Update Highlight Tile
      const rect = canvas.getBoundingClientRect();
      const worldPos = this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const col = Math.floor(worldPos.x / TILE_SIZE);
      const row = Math.floor(worldPos.y / TILE_SIZE);

      if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
        this.sim.highlightedTile = { col, row };
      } else {
        this.sim.highlightedTile = null;
      }
    });

    // Mouse Up (Click Interaction)
    window.addEventListener('mouseup', e => {
      if (this.isDraggingCamera) {
        this.isDraggingCamera = false;
        if (!this.hasDragged) {
          // It was a click!
          const rect = canvas.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const clickY = e.clientY - rect.top;
          this.handleCanvasClick(clickX, clickY, e.clientX, e.clientY);
        }
      }
    });

    // Mouse Wheel (Smooth Zoom)
    canvas.addEventListener(
      'wheel',
      e => {
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 1.12 : 0.89;
        this.renderer.zoom = Math.max(0.45, Math.min(2.5, this.renderer.zoom * zoomDelta));
      },
      { passive: false }
    );
  }

  // Convert Screen pixel coordinates to Simulation World coordinates
  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const w = this.renderer.canvas.width;
    const h = this.renderer.canvas.height;
    const wx = (sx - w / 2) / this.renderer.zoom + this.renderer.cameraX;
    const wy = (sy - h / 2) / this.renderer.zoom + this.renderer.cameraY;
    return { x: wx, y: wy };
  }

  // ==========================================
  // CLICK INTERACTION DISPATCHER
  // ==========================================

  private handleCanvasClick(screenX: number, screenY: number, clientX: number, clientY: number) {
    const worldPos = this.screenToWorld(screenX, screenY);
    const col = Math.floor(worldPos.x / TILE_SIZE);
    const row = Math.floor(worldPos.y / TILE_SIZE);

    // BUILD MODE
    if (this.ui.activeMode === 'Build') {
      if (row >= SURFACE_ROW && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        this.sim.instantDigTile(col, row);
      }
      return;
    }

    // BUY MODE
    if (this.ui.activeMode === 'Buy') {
      if (!this.ui.selectedCatalogItem) {
        this.ui.showNotification('Choose an item from the catalog first!');
        return;
      }
      if (row >= SURFACE_ROW && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        const success = this.sim.buyObject(this.ui.selectedCatalogItem, col, row);
        if (success) {
          this.ui.showNotification('Item placed in colony!');
        } else {
          this.ui.showNotification('Not enough § Pollen points!');
        }
      }
      return;
    }

    // LIVE MODE: Click ants, entities, objects, or floor
    const sel = this.sim.getSelectedAnt();

    // 1. Check Ant Click
    const clickedAnt = this.sim.ants.find(a => Math.hypot(a.x - worldPos.x, a.y - worldPos.y) < 22 * a.scale);
    if (clickedAnt) {
      if (!sel || sel.id === clickedAnt.id) {
        // Select this ant!
        this.sim.selectedAntId = clickedAnt.id;
        audio.playPlumbobSelect();
        audio.playSimlish('chat');
        return;
      } else {
        // Clicked another ant with active ant selected -> Open Radial Pie Menu!
        this.openAntPieMenu(sel, clickedAnt, clientX, clientY);
        return;
      }
    }

    // 2. Check Brood (Larva / Egg) Click
    const clickedBrood = this.sim.brood.find(b => Math.hypot(b.x - worldPos.x, b.y - worldPos.y) < 18);
    if (clickedBrood && sel) {
      this.openBroodPieMenu(sel, clickedBrood, clientX, clientY);
      return;
    }

    // 3. Check Colony Objects (Furniture / Radio / Bed)
    const clickedObj = this.sim.colonyObjects.find(
      o =>
        worldPos.x >= o.x &&
        worldPos.x <= o.x + o.width &&
        worldPos.y >= o.y &&
        worldPos.y <= o.y + o.height
    );
    if (clickedObj && sel) {
      this.openObjectPieMenu(sel, clickedObj, clientX, clientY);
      return;
    }

    // 4. Check Surface Entities (Watermelon, Donut, Aphid)
    const clickedEntity = this.sim.surfaceEntities.find(
      e =>
        worldPos.x >= e.x &&
        worldPos.x <= e.x + e.width &&
        worldPos.y >= e.y &&
        worldPos.y <= e.y + e.height
    );
    if (clickedEntity && sel) {
      this.openSurfaceEntityPieMenu(sel, clickedEntity, clientX, clientY);
      return;
    }

    // 5. Open Floor / Tile: Walk here or Dig
    if (sel) {
      if (row >= SURFACE_ROW && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        const tile = this.sim.grid[row][col];
        if (tile.type === 'soil' || tile.type === 'hard_rock') {
          // Excavate Dirt
          this.sim.executeDigAction(sel, col, row);
        } else {
          // Walk Here
          this.sim.queueWalkToCoord(sel, worldPos.x, worldPos.y, () => {
            sel.stateText = 'Arrived at destination';
          });
        }
      } else {
        // Surface walk
        this.sim.queueWalkToCoord(sel, worldPos.x, worldPos.y, () => {
          sel.stateText = 'Arrived at destination';
        });
      }
    }
  }

  // ==========================================
  // PIE MENUS FOR LIVE MODE
  // ==========================================

  private openAntPieMenu(actor: AntSim, target: AntSim, cx: number, cy: number) {
    const options = [
      {
        label: 'Trophallaxis',
        icon: '💖',
        action: () => {
          this.sim.queueWalkToCoord(actor, target.x + 20, target.y, () => {
            this.sim.executeTrophallaxis(actor, target);
          });
        },
      },
      {
        label: 'Antenna Tap',
        icon: '💬',
        action: () => {
          this.sim.queueWalkToCoord(actor, target.x + 20, target.y, () => {
            actor.stateText = `Chatting with ${target.name}`;
            audio.playSimlish('chat');
            this.sim.showBubble(actor, '💬', false, 2.5);
            this.sim.showBubble(target, '🐜', false, 2.5);
            actor.motives.social = Math.min(100, actor.motives.social + 25);
            target.motives.social = Math.min(100, target.motives.social + 25);
            this.sim.changeRelationship(actor, target, 8, 4);
          });
        },
      },
      {
        label: 'Tell Ant Joke',
        icon: '😂',
        action: () => {
          this.sim.queueWalkToCoord(actor, target.x + 20, target.y, () => {
            actor.stateText = `Told a joke to ${target.name}`;
            audio.playSimlish('happy');
            this.sim.showBubble(actor, '😂', false, 3.0);
            this.sim.showBubble(target, '😄', false, 3.0);
            actor.motives.fun = Math.min(100, actor.motives.fun + 25);
            this.sim.changeRelationship(actor, target, 12, 6);
            this.sim.triggerWant(actor, 'tell_joke');
          });
        },
      },
      {
        label: 'Antenna Joust',
        icon: '⚔️',
        action: () => {
          this.sim.queueWalkToCoord(actor, target.x + 20, target.y, () => {
            this.sim.executeAntennaJoust(actor, target);
          });
        },
      },
      {
        label: 'Groom Comrade',
        icon: '✨',
        action: () => {
          this.sim.queueWalkToCoord(actor, target.x + 20, target.y, () => {
            actor.stateText = `Grooming ${target.name}`;
            audio.playSimlish('happy');
            this.sim.showBubble(actor, '✨', false, 3.0);
            target.motives.grooming = Math.min(100, target.motives.grooming + 45);
            actor.motives.social = Math.min(100, actor.motives.social + 20);
            this.sim.changeRelationship(actor, target, 10, 5);
          });
        },
      },
    ];

    if (target.caste === 'Queen') {
      options.push({
        label: 'Praise Queen',
        icon: '👑',
        action: () => {
          this.sim.queueWalkToCoord(actor, target.x + 25, target.y, () => {
            actor.stateText = 'Praising Her Royal Majesty';
            audio.playSimlish('romantic');
            this.sim.showBubble(actor, '👑', false, 3.5);
            this.sim.showBubble(target, '✨', false, 3.5);
            actor.motives.colonyDuty = Math.min(100, actor.motives.colonyDuty + 40);
            this.sim.triggerWant(actor, 'tend_queen');
          });
        },
      });
    }

    this.ui.openPieMenu(cx, cy, options);
  }

  private openBroodPieMenu(actor: AntSim, brood: any, cx: number, cy: number) {
    const options = [
      {
        label: 'Feed Larva',
        icon: '🍼',
        action: () => {
          this.sim.queueWalkToCoord(actor, brood.x, brood.y, () => {
            actor.stateText = 'Feeding baby larva';
            brood.hunger = Math.min(100, brood.hunger + 45);
            actor.motives.colonyDuty = Math.min(100, actor.motives.colonyDuty + 30);
            this.sim.showBubble(actor, '🍼', false, 3.0);
            this.sim.triggerWant(actor, 'feed_baby_larva');
            audio.playTrophallaxis();
          });
        },
      },
      {
        label: 'Clean & Tend',
        icon: '✨',
        action: () => {
          this.sim.queueWalkToCoord(actor, brood.x, brood.y, () => {
            actor.stateText = 'Tending to nursery brood';
            brood.careQuality = 100;
            actor.motives.colonyDuty = Math.min(100, actor.motives.colonyDuty + 20);
            this.sim.showBubble(actor, '❤️', false, 2.5);
            audio.playChime(600);
          });
        },
      },
    ];

    this.ui.openPieMenu(cx, cy, options);
  }

  private openObjectPieMenu(actor: AntSim, obj: any, cx: number, cy: number) {
    const options: any[] = [];

    if (obj.type === 'leaf_hammock' || obj.type === 'moss_mattress') {
      options.push(
        {
          label: 'Sleep',
          icon: '💤',
          action: () => {
            this.sim.queueWalkToObject(actor, obj, () => {
              actor.isSleeping = true;
              actor.stateText = 'Sleeping in bed';
              this.sim.showBubble(actor, '💤', true, 4.0);
              this.sim.triggerWant(actor, 'nap_in_hammock');
              audio.playChime(440);
            });
          },
        },
        {
          label: 'Power Nap',
          icon: '🍃',
          action: () => {
            this.sim.queueWalkToObject(actor, obj, () => {
              actor.motives.energy = Math.min(100, actor.motives.energy + 35);
              actor.stateText = 'Finished power nap';
              this.sim.showBubble(actor, '✨', false, 2.5);
            });
          },
        }
      );
    } else if (obj.type === 'sugar_pantry') {
      options.push(
        {
          label: 'Eat Stored Sugar',
          icon: '🍯',
          action: () => {
            this.sim.queueWalkToObject(actor, obj, () => {
              if (obj.stateValue > 0) {
                obj.stateValue = Math.max(0, obj.stateValue - 2);
                actor.motives.hunger = Math.min(100, actor.motives.hunger + 45);
                this.sim.showBubble(actor, '🍯', false, 2.5);
                audio.playChime(750);
              } else {
                this.ui.showNotification('Pantry is empty! Forage sugar from surface.');
              }
            });
          },
        },
        {
          label: 'Deposit Carried Food',
          icon: '📦',
          action: () => {
            this.sim.queueWalkToObject(actor, obj, () => {
              if (actor.heldItem !== 'none') {
                actor.heldItem = 'none';
                obj.stateValue += 5;
                this.sim.state.pollenPoints += 20;
                actor.motives.colonyDuty = Math.min(100, actor.motives.colonyDuty + 25);
                audio.playChime(850);
              }
            });
          },
        }
      );
    } else if (obj.type === 'spore_radio') {
      options.push(
        {
          label: 'Dance to Jazz',
          icon: '🎵',
          action: () => {
            this.sim.queueWalkToObject(actor, obj, () => {
              actor.isDancing = true;
              actor.stateText = 'Dancing to Spore Jazz!';
              this.sim.showBubble(actor, '🎵', false, 3.5);
              actor.motives.fun = Math.min(100, actor.motives.fun + 45);
              this.sim.triggerWant(actor, 'dance_to_radio');
              audio.playSimlish('happy');
            });
          },
        },
        {
          label: 'Toggle Power',
          icon: '📻',
          action: () => {
            obj.stateValue = obj.stateValue === 1 ? 0 : 1;
            this.ui.showNotification(obj.stateValue === 1 ? 'Radio On 🎵' : 'Radio Off');
          },
        }
      );
    } else if (obj.type === 'fungus_garden') {
      options.push({
        label: 'Harvest Fungus Mash',
        icon: '🍄',
        action: () => {
          this.sim.queueWalkToObject(actor, obj, () => {
            obj.stateValue = Math.max(0, obj.stateValue - 15);
            actor.motives.hunger = Math.min(100, actor.motives.hunger + 40);
            this.sim.showBubble(actor, '🍄', false, 2.5);
            audio.playChime(600);
          });
        },
      });
    }

    if (options.length > 0) {
      this.ui.openPieMenu(cx, cy, options);
    }
  }

  private openSurfaceEntityPieMenu(actor: AntSim, ent: any, cx: number, cy: number) {
    const options: any[] = [];

    if (ent.type === 'watermelon') {
      options.push(
        {
          label: 'Feast Now',
          icon: '🍉',
          action: () => {
            this.sim.queueWalkToCoord(actor, ent.x, ent.y, () => {
              ent.resourcesRemaining = Math.max(0, ent.resourcesRemaining - 4);
              actor.motives.hunger = Math.min(100, actor.motives.hunger + 50);
              this.sim.showBubble(actor, '🍉', false, 3.0);
              this.sim.triggerWant(actor, 'eat_watermelon');
              audio.playChime(950);
            });
          },
        },
        {
          label: 'Carry Chunk Home',
          icon: '🎒',
          action: () => {
            this.sim.queueWalkToCoord(actor, ent.x, ent.y, () => {
              actor.heldItem = 'watermelon_chunk';
              ent.resourcesRemaining -= 1;
              this.sim.showBubble(actor, '🍉', false, 2.5);
            });
          },
        }
      );
    } else if (ent.type === 'donut') {
      options.push({
        label: 'Eat Glazed Donut',
        icon: '🍩',
        action: () => {
          this.sim.queueWalkToCoord(actor, ent.x, ent.y, () => {
            ent.resourcesRemaining = Math.max(0, ent.resourcesRemaining - 4);
            actor.motives.hunger = Math.min(100, actor.motives.hunger + 50);
            actor.motives.fun = Math.min(100, actor.motives.fun + 20);
            this.sim.showBubble(actor, '🍩', false, 3.0);
            audio.playChime(900);
          });
        },
      });
    } else if (ent.type === 'aphid') {
      options.push(
        {
          label: 'Milk Honeydew',
          icon: '🍯',
          action: () => {
            this.sim.queueWalkToCoord(actor, ent.x, ent.y, () => {
              actor.motives.hunger = Math.min(100, actor.motives.hunger + 40);
              this.sim.state.pollenPoints += 15;
              this.sim.showBubble(actor, '🍯', false, 3.0);
              this.sim.triggerWant(actor, 'eat_honeydew');
              audio.playTrophallaxis();
            });
          },
        },
        {
          label: 'Pet Aphid',
          icon: '💚',
          action: () => {
            this.sim.queueWalkToCoord(actor, ent.x, ent.y, () => {
              actor.motives.fun = Math.min(100, actor.motives.fun + 25);
              this.sim.showBubble(actor, '💚', false, 2.5);
              this.sim.triggerWant(actor, 'pet_aphid');
              audio.playSimlish('happy');
            });
          },
        }
      );
    }

    if (options.length > 0) {
      this.ui.openPieMenu(cx, cy, options);
    }
  }

  // ==========================================
  // MAIN GAME LOOP
  // ==========================================

  private gameLoop(currentTime: number) {
    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    // Keyboard camera panning (WASD / Arrows)
    const panSpeed = 350 * dt;
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) this.renderer.cameraX -= panSpeed;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) this.renderer.cameraX += panSpeed;
    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) this.renderer.cameraY -= panSpeed;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) this.renderer.cameraY += panSpeed;

    // Update Simulation
    this.sim.update(dt);

    // Render Canvas World
    this.renderer.render(this.sim, dt);

    // Update UI Console & Tabs
    this.ui.update(dt);

    requestAnimationFrame(this.gameLoop.bind(this));
  }
}

// Start application
new GameApp();
