// ==========================================
// THE SIMS 2: ANT COLONY (THE SIMANTS 2)
// Game Entry Point, 3D WebGL Engine & Input Loop
// ==========================================

import './style.css';
import { Simulation } from './simulation';
import { Renderer3D } from './renderer3d';
import { UIManager } from './ui';
import { audio } from './audio';
import { GRID_COLS, GRID_ROWS, SURFACE_ROW, TILE_SIZE } from './types';
import type { AntSim } from './types';

class GameApp {
  private sim: Simulation;
  private renderer: Renderer3D;
  private ui: UIManager;

  private isDraggingCamera: boolean = false;
  private isOrbiting: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private targetStartX: number = 0;
  private targetStartY: number = 0;
  private angleStartX: number = 0;
  private angleStartY: number = 0;
  private hasDragged: boolean = false;

  private lastTime: number = 0;
  private keysDown: Set<string> = new Set();

  constructor() {
    const appEl = document.getElementById('app')!;
    this.sim = new Simulation();
    this.ui = new UIManager(this.sim, appEl);

    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new Renderer3D(canvas);
    this.ui.setRenderer(this.renderer);

    this.setupWindowEvents();
    this.setupCanvasInputs(canvas);
    this.setupKeyboard();

    this.onResize();

    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  private onResize() {
    this.renderer.resize(window.innerWidth, window.innerHeight);
  }

  private setupWindowEvents() {
    window.addEventListener('resize', () => this.onResize());

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
    window.addEventListener('blur', () => {
      this.keysDown.clear();
      this.isDraggingCamera = false;
      this.isOrbiting = false;
    });
    window.addEventListener('focusin', () => this.keysDown.clear());
    window.addEventListener('keydown', e => {
      if (e.code === 'Escape' && this.ui.cancelPlacement()) {
        e.preventDefault();
        return;
      }
      const target = e.target;
      if (target instanceof HTMLElement && (target.closest('input, textarea, select, button') || target.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      this.keysDown.add(e.code);
      if (e.repeat) return;

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
        e.preventDefault();
        this.cycleSelectedAnt();
      } else if (e.code === 'KeyM') {
        const isMuted = audio.toggleMute();
        this.ui.showNotification(isMuted ? 'Muted' : 'Audio On');
      } else if (e.code === 'F5' || e.code === 'Escape') {
        e.preventDefault();
        this.ui.cancelPlacement();
        const modal = document.getElementById('options-modal')!;
        modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
        audio.playClick();
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
    this.renderer.targetPos.set(nextAnt.x, -nextAnt.y, nextAnt.z);
    audio.playPlumbobSelect();
  }

  private setupCanvasInputs(canvas: HTMLCanvasElement) {
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    canvas.addEventListener('mousedown', e => {
      if (this.ui.pieMenuVisible) {
        this.ui.hidePieMenu();
      }

      this.hasDragged = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;

      if (e.button === 2 || e.altKey) {
        // Orbit Camera
        this.isOrbiting = true;
        this.angleStartX = this.renderer.cameraAngleX;
        this.angleStartY = this.renderer.cameraAngleY;
      } else {
        // Pan Camera
        this.isDraggingCamera = true;
        this.targetStartX = this.renderer.targetPos.x;
        this.targetStartY = this.renderer.targetPos.y;
      }
    });

    window.addEventListener('mousemove', e => {
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;

      if (Math.hypot(dx, dy) > 5) {
        this.hasDragged = true;
      }

      if (this.isOrbiting) {
        this.renderer.cameraAngleX = this.angleStartX - dx * 0.005;
        this.renderer.cameraAngleY = Math.max(0.02, Math.min(1.4, this.angleStartY + dy * 0.005));
      } else if (this.isDraggingCamera) {
        const factor = this.renderer.cameraDistance * 0.0015;
        this.renderer.targetPos.x = this.targetStartX - dx * factor;
        this.renderer.targetPos.y = this.targetStartY + dy * factor;
      }

      // UI overlays are not placement targets.
      this.sim.highlightedTile = null;
      if (e.target !== canvas) return;
      const hit = this.renderer.raycast(e.clientX, e.clientY);
      if (hit) {
        const col = Math.floor(hit.point.x / TILE_SIZE);
        const row = Math.floor(-hit.point.y / TILE_SIZE);
        if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
          this.sim.highlightedTile = { col, row };
        } else {
          this.sim.highlightedTile = null;
        }
      }
    });

    canvas.addEventListener('mouseleave', () => { this.sim.highlightedTile = null; });

    window.addEventListener('mouseup', e => {
      if (this.isOrbiting) {
        this.isOrbiting = false;
      }

      if (this.isDraggingCamera) {
        this.isDraggingCamera = false;
        if (!this.hasDragged && e.button === 0 && e.target === canvas) {
          this.handleCanvasClick(e.clientX, e.clientY);
        }
      }
    });

    canvas.addEventListener(
      'wheel',
      e => {
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 0.9 : 1.1;
        this.renderer.cameraDistance = Math.max(150, Math.min(1600, this.renderer.cameraDistance * zoomDelta));
      },
      { passive: false }
    );
  }

  // ==========================================
  // CLICK INTERACTION DISPATCHER
  // ==========================================

  private handleCanvasClick(clientX: number, clientY: number) {
    const hit = this.renderer.raycast(clientX, clientY);
    if (!hit) return;

    const worldX = hit.point.x;
    const worldY = -hit.point.y;

    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);

    if (this.ui.handlePlacementClick(worldX, worldY)) return;

    // LIVE MODE
    const sel = this.sim.getSelectedAnt();

    // 1. Check Ant Click
    const clickedAnt = this.sim.ants.find(a => Math.hypot(a.x - worldX, a.y - worldY) < 26 * a.scale);
    if (clickedAnt) {
      if (!sel || sel.id === clickedAnt.id) {
        this.sim.selectedAntId = clickedAnt.id;
        audio.playPlumbobSelect();
        audio.playSimlish('chat');
        return;
      } else {
        this.openAntPieMenu(sel, clickedAnt, clientX, clientY);
        return;
      }
    }

    // 2. Check Brood (Larva / Egg) Click
    const clickedBrood = this.sim.brood.find(b => Math.hypot(b.x - worldX, b.y - worldY) < 22);
    if (clickedBrood && sel) {
      this.openBroodPieMenu(sel, clickedBrood, clientX, clientY);
      return;
    }

    // 3. Check Colony Objects
    const clickedObj = this.sim.colonyObjects.find(
      o =>
        worldX >= o.x &&
        worldX <= o.x + o.width &&
        worldY >= o.y &&
        worldY <= o.y + o.height
    );
    if (clickedObj && sel) {
      this.openObjectPieMenu(sel, clickedObj, clientX, clientY);
      return;
    }

    // 4. Check Surface Entities
    const clickedEntity = this.sim.surfaceEntities.find(
      e =>
        worldX >= e.x &&
        worldX <= e.x + e.width &&
        worldY >= e.y &&
        worldY <= e.y + e.height
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
          if (!this.sim.executeDigAction(sel, col, row)) this.ui.showNotification('No reachable edge to dig from. Connect a tunnel first.');
        } else {
          this.sim.queueWalkToCoord(sel, worldX, worldY, () => {
            sel.stateText = 'Arrived at destination';
          });
        }
      } else {
        this.sim.queueWalkToCoord(sel, worldX, worldY, () => {
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
              if (this.sim.takeFood(obj, 2)) {
                actor.motives.hunger = Math.min(100, actor.motives.hunger + 45);
                this.sim.showBubble(actor, '🍯', false, 2.5);
                audio.playChime(750);
              } else {
                this.ui.showNotification('Not enough stored sugar for a meal. Forage from the surface.');
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
            if (!this.sim.takeFood(obj, 15)) {
              this.ui.showNotification('Not enough fungus yet. Give it time to grow.');
              return;
            }
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
              if (!this.sim.takeFood(ent, 4)) {
                this.ui.showNotification('Not enough watermelon for a meal.');
                return;
              }
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
              if (actor.heldItem !== 'none') {
                this.ui.showNotification('Deposit your carried food first.');
                return;
              }
              if (!this.sim.takeFood(ent, 1)) {
                this.ui.showNotification('No watermelon chunks left.');
                return;
              }
              actor.heldItem = 'watermelon_chunk';
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
            if (!this.sim.takeFood(ent, 4)) {
              this.ui.showNotification('Not enough donut left for a meal.');
              return;
            }
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

    const panSpeed = 350 * dt;
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) this.renderer.targetPos.x -= panSpeed;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) this.renderer.targetPos.x += panSpeed;
    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) this.renderer.targetPos.y += panSpeed;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) this.renderer.targetPos.y -= panSpeed;

    this.sim.update(dt);
    this.renderer.render(this.sim, dt);
    this.ui.update(dt);

    requestAnimationFrame(this.gameLoop.bind(this));
  }
}

new GameApp();
