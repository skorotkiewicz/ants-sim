// ==========================================
// THE SIMS 2: ANT COLONY CANVAS RENDERER
// Cutaway Anthill, 3D Plumbob, Ants & World
// ==========================================

import {
  AntSim,
  BroodEntity,
  ColonyObject,
  GRID_COLS,
  GRID_ROWS,
  SURFACE_ROW,
  SurfaceEntity,
  TILE_SIZE,
} from './types';
import { Simulation } from './simulation';

export class Renderer {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  public cameraX: number = 0;
  public cameraY: number = 0;
  public zoom: number = 1.0;

  private plumbobRotation: number = 0;
  private animTimer: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    // Initial camera position centered on anthill gallery
    this.cameraX = 25 * TILE_SIZE;
    this.cameraY = 16 * TILE_SIZE;
  }

  public resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public render(sim: Simulation, dt: number) {
    this.animTimer += dt;
    this.plumbobRotation += dt * 3.2;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Save camera transform
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.cameraX, -this.cameraY);

    // 1. Render Sky & Surface Backdrop
    this.renderSkyAndSurface(sim);

    // 2. Render Underground Soil & Tunnels
    this.renderUndergroundGrid(sim);

    // 3. Render Surface Entities (Watermelon, Donut, Sugar, Aphids)
    this.renderSurfaceEntities(sim);

    // 4. Render Colony Objects (Furniture, Beds, Radio, Pantry, Throne)
    this.renderColonyObjects(sim);

    // 5. Render Brood (Eggs, Larvae, Pupae)
    this.renderBrood(sim);

    // 6. Render Ants
    this.renderAnts(sim);

    // 7. Render The Plumbob above Selected Ant
    this.renderPlumbob(sim);

    // 8. Render Speech & Thought Bubbles
    this.renderBubbles(sim);

    // 9. Render Build Mode Hover Highlight
    if (sim.highlightedTile) {
      this.renderTileHighlight(sim.highlightedTile.col, sim.highlightedTile.row);
    }

    ctx.restore();
  }

  // ==========================================
  // SKY & SURFACE
  // ==========================================

  private renderSkyAndSurface(sim: Simulation) {
    const ctx = this.ctx;
    const worldW = GRID_COLS * TILE_SIZE;
    const surfaceY = SURFACE_ROW * TILE_SIZE;

    // Day/Night Sky Gradient
    const t = sim.state.timeOfDay; // 0..24
    let skyTop = '#5eaefc';
    let skyBottom = '#b5e2ff';

    if (t < 6 || t > 20) {
      // Night
      skyTop = '#0a1628';
      skyBottom = '#182b45';
    } else if (t < 8) {
      // Dawn / Sunrise
      skyTop = '#df7356';
      skyBottom = '#ffd38b';
    } else if (t > 18) {
      // Sunset
      skyTop = '#a44e5d';
      skyBottom = '#f49354';
    }

    const skyGrad = ctx.createLinearGradient(0, 0, 0, surfaceY);
    skyGrad.addColorStop(0, skyTop);
    skyGrad.addColorStop(1, skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, worldW, surfaceY);

    // Sun or Moon
    if (t >= 6 && t <= 19) {
      // Sun
      const sunRatio = (t - 6) / 13;
      const sunX = worldW * (0.15 + sunRatio * 0.7);
      const sunY = surfaceY * 0.35 - Math.sin(sunRatio * Math.PI) * 100;

      ctx.save();
      ctx.fillStyle = 'rgba(255, 235, 140, 0.9)';
      ctx.shadowColor = 'rgba(255, 220, 80, 0.6)';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Moon
      ctx.save();
      ctx.fillStyle = '#f0f4f8';
      ctx.shadowColor = 'rgba(200, 230, 255, 0.5)';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(worldW * 0.75, surfaceY * 0.25, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    this.drawCloud(worldW * 0.25, surfaceY * 0.3, 40);
    this.drawCloud(worldW * 0.65, surfaceY * 0.2, 55);

    // Surface Picnic Blanket (Red & White Checkered)
    const blanketX = 14 * TILE_SIZE;
    const blanketW = 22 * TILE_SIZE;
    const blanketY = surfaceY - 8;
    const blanketH = 10;

    ctx.fillStyle = '#c72b2b';
    ctx.fillRect(blanketX, blanketY, blanketW, blanketH);

    // White checker stripes
    ctx.fillStyle = '#f8f8f8';
    for (let bx = blanketX; bx < blanketX + blanketW; bx += 24) {
      ctx.fillRect(bx, blanketY, 12, blanketH);
    }

    // Grass blades along the ground
    ctx.strokeStyle = '#489b2c';
    ctx.lineWidth = 2.5;
    for (let c = 0; c < GRID_COLS; c++) {
      const gx = c * TILE_SIZE + 4;
      const gy = surfaceY;
      const sway = Math.sin(this.animTimer * 2 + c) * 4;

      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + sway, gy - 12, gx + sway * 1.5, gy - 20);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(gx + 14, gy);
      ctx.quadraticCurveTo(gx + 14 - sway, gy - 10, gx + 14 - sway * 1.2, gy - 16);
      ctx.stroke();
    }
  }

  private drawCloud(x: number, y: number, r: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.6, y - r * 0.2, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x - r * 0.5, y, r * 0.6, 0, Math.PI * 2);
    ctx.arc(x + r * 1.1, y + r * 0.1, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ==========================================
  // UNDERGROUND SOIL & CHAMBERS
  // ==========================================

  private renderUndergroundGrid(sim: Simulation) {
    const ctx = this.ctx;

    for (let r = SURFACE_ROW; r < GRID_ROWS; r++) {
      const depthRatio = (r - SURFACE_ROW) / (GRID_ROWS - SURFACE_ROW);
      for (let c = 0; c < GRID_COLS; c++) {
        const tile = sim.grid[r][c];
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        if (tile.type === 'grass') {
          // Lush Surface Grass Soil
          ctx.fillStyle = '#4c8c2b';
          ctx.fillRect(x, y, TILE_SIZE, 8);
          ctx.fillStyle = '#6d4c2b';
          ctx.fillRect(x, y + 8, TILE_SIZE, TILE_SIZE - 8);
        } else if (tile.type === 'soil') {
          // Organic Soil with strata
          const baseColor = depthRatio < 0.4 ? '#5c3d23' : depthRatio < 0.75 ? '#482f1b' : '#352112';
          ctx.fillStyle = baseColor;
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

          // Subtle soil noise pebbles
          if ((c * 7 + r * 13) % 5 === 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
            ctx.fillRect(x + 6, y + 10, 5, 4);
          } else if ((c * 3 + r * 11) % 7 === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.fillRect(x + 14, y + 18, 4, 3);
          }
        } else if (tile.type === 'hard_rock') {
          // Solid hard rock vein
          ctx.fillStyle = '#4f5257';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#323438';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        } else if (tile.type === 'tunnel' || tile.type === 'chamber_floor') {
          // Carved Anthill Space (Cutaway background wall)
          ctx.fillStyle = tile.type === 'chamber_floor' ? '#2f1c11' : '#26170d';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

          // Dirt arch outlines
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        } else if (tile.type === 'royal_brick') {
          // Royal Queen's Quarters (rich terracotta and gold accent)
          ctx.fillStyle = '#3f1c24';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = 'rgba(218, 165, 32, 0.2)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        } else if (tile.type === 'fungus_bed') {
          // Fungus Farm Chamber (dark moist soil with mycelium)
          ctx.fillStyle = '#212918';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = 'rgba(120, 200, 90, 0.12)';
          ctx.beginPath();
          ctx.arc(x + 16, y + 16, 12, 0, Math.PI * 2);
          ctx.fill();
        }

        // Marked for digging (Blinking dash border + pickaxe)
        if (tile.markedForDig) {
          ctx.save();
          const blink = Math.sin(this.animTimer * 6) > 0;
          ctx.strokeStyle = blink ? '#ffeb3b' : '#ffffff';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⛏️', x + 16, y + 16);
          ctx.restore();
        }
      }
    }

    // Organic roots hanging into tunnels
    this.renderRoots();
  }

  private renderRoots() {
    const ctx = this.ctx;
    ctx.strokeStyle = '#855938';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const roots = [
      { sx: 10 * TILE_SIZE, sy: SURFACE_ROW * TILE_SIZE, ex: 12 * TILE_SIZE, ey: (SURFACE_ROW + 4) * TILE_SIZE },
      { sx: 28 * TILE_SIZE, sy: SURFACE_ROW * TILE_SIZE, ex: 27 * TILE_SIZE, ey: (SURFACE_ROW + 5) * TILE_SIZE },
      { sx: 41 * TILE_SIZE, sy: SURFACE_ROW * TILE_SIZE, ex: 42 * TILE_SIZE, ey: (SURFACE_ROW + 6) * TILE_SIZE },
    ];

    roots.forEach(r => {
      ctx.beginPath();
      ctx.moveTo(r.sx, r.sy);
      ctx.quadraticCurveTo(r.sx + 8, (r.sy + r.ey) / 2, r.ex, r.ey);
      ctx.stroke();
    });
  }

  // ==========================================
  // SURFACE PICNIC ENTITIES
  // ==========================================

  private renderSurfaceEntities(sim: Simulation) {
    const ctx = this.ctx;

    for (const ent of sim.surfaceEntities) {
      if (ent.type === 'watermelon') {
        // Juicy Watermelon Wedge
        ctx.save();
        ctx.translate(ent.x, ent.y);

        // Green Rind
        ctx.fillStyle = '#2d7a2f';
        ctx.beginPath();
        ctx.arc(32, 28, 30, Math.PI * 0.9, Math.PI * 2.1);
        ctx.fill();

        // White rind layer
        ctx.fillStyle = '#c5e8b7';
        ctx.beginPath();
        ctx.arc(32, 28, 26, Math.PI * 0.9, Math.PI * 2.1);
        ctx.fill();

        // Red Juicy Flesh
        ctx.fillStyle = '#e63946';
        ctx.beginPath();
        ctx.arc(32, 28, 23, Math.PI * 0.9, Math.PI * 2.1);
        ctx.fill();

        // Seeds
        ctx.fillStyle = '#1a1a1a';
        [
          { x: 24, y: 18 },
          { x: 32, y: 14 },
          { x: 40, y: 20 },
          { x: 32, y: 22 },
        ].forEach(s => {
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, 2, 3.5, 0.3, 0, Math.PI * 2);
          ctx.fill();
        });

        // Resource quantity indicator
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🍉 ${ent.resourcesRemaining}`, 32, -6);
        ctx.restore();
      } else if (ent.type === 'donut') {
        // Glazed Donut with Sprinkles
        ctx.save();
        ctx.translate(ent.x, ent.y);

        // Donut Dough
        ctx.fillStyle = '#d49b56';
        ctx.beginPath();
        ctx.arc(28, 22, 22, 0, Math.PI * 2);
        ctx.fill();

        // Pink Frosting
        ctx.fillStyle = '#ff70a6';
        ctx.beginPath();
        ctx.arc(28, 22, 18, 0, Math.PI * 2);
        ctx.fill();

        // Donut Hole
        ctx.fillStyle = '#5eaefc'; // Sky peek through hole
        ctx.beginPath();
        ctx.arc(28, 22, 7, 0, Math.PI * 2);
        ctx.fill();

        // Sprinkles
        const sprinkles = [
          { x: 20, y: 14, c: '#ffffff' },
          { x: 36, y: 15, c: '#ffeb3b' },
          { x: 34, y: 28, c: '#38b000' },
          { x: 20, y: 27, c: '#0077b6' },
        ];
        sprinkles.forEach(sp => {
          ctx.fillStyle = sp.c;
          ctx.fillRect(sp.x, sp.y, 4, 2);
        });

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🍩 ${ent.resourcesRemaining}`, 28, -6);
        ctx.restore();
      } else if (ent.type === 'sugar_pile') {
        // Sparkling Sugar Crystals
        ctx.save();
        ctx.translate(ent.x, ent.y);

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 8;

        // Sugar mound
        ctx.beginPath();
        ctx.moveTo(4, 26);
        ctx.lineTo(24, 6);
        ctx.lineTo(44, 26);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🍯 ${ent.resourcesRemaining}`, 24, -4);
        ctx.restore();
      } else if (ent.type === 'aphid') {
        // Cute Green Aphid
        ctx.save();
        ctx.translate(ent.x, ent.y);

        // Body
        ctx.fillStyle = '#70c040';
        ctx.beginPath();
        ctx.ellipse(16, 12, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Honeydew drop on back!
        ctx.fillStyle = '#ffdf60';
        ctx.beginPath();
        ctx.arc(12, 8, 4, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(22, 10, 2, 0, Math.PI * 2);
        ctx.fill();

        // Antennae
        ctx.strokeStyle = '#4b8825';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(22, 10);
        ctx.lineTo(28, 4);
        ctx.stroke();

        ctx.restore();
      } else if (ent.type === 'flower') {
        // Sunflower / Dandelion
        ctx.save();
        ctx.translate(ent.x, ent.y);
        // Stem
        ctx.strokeStyle = '#387820';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(20, 60);
        ctx.lineTo(20, 15);
        ctx.stroke();

        // Blossom Petals
        ctx.fillStyle = '#fdb813';
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          ctx.beginPath();
          ctx.arc(20 + Math.cos(a) * 12, 15 + Math.sin(a) * 12, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        // Center
        ctx.fillStyle = '#5c3818';
        ctx.beginPath();
        ctx.arc(20, 15, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }
  }

  // ==========================================
  // COLONY OBJECTS (FURNITURE & AMENITIES)
  // ==========================================

  private renderColonyObjects(sim: Simulation) {
    const ctx = this.ctx;

    for (const obj of sim.colonyObjects) {
      ctx.save();
      ctx.translate(obj.x, obj.y);

      if (obj.type === 'leaf_hammock') {
        // Suspended Leaf Hammock
        ctx.strokeStyle = '#7c5438';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.lineTo(8, 18);
        ctx.moveTo(obj.width, 4);
        ctx.lineTo(obj.width - 8, 18);
        ctx.stroke();

        // Curved green leaf
        ctx.fillStyle = '#529b35';
        ctx.beginPath();
        ctx.moveTo(6, 18);
        ctx.quadraticCurveTo(obj.width / 2, 30, obj.width - 6, 18);
        ctx.quadraticCurveTo(obj.width / 2, 24, 6, 18);
        ctx.fill();
      } else if (obj.type === 'moss_mattress') {
        // Velvet Moss Bed
        ctx.fillStyle = '#397a2e';
        ctx.beginPath();
        ctx.roundRect(4, 8, obj.width - 8, obj.height - 10, 6);
        ctx.fill();

        // Pillow petal
        ctx.fillStyle = '#f2a7b5';
        ctx.beginPath();
        ctx.roundRect(8, 10, 14, 12, 4);
        ctx.fill();
      } else if (obj.type === 'sugar_pantry') {
        // Wooden Pantry Trough
        ctx.fillStyle = '#654321';
        ctx.fillRect(4, 12, obj.width - 8, obj.height - 14);

        // Sugar filling
        const fillHeight = Math.min(14, (obj.stateValue / 50) * 14);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8, 24 - fillHeight, obj.width - 16, fillHeight);

        // Label
        ctx.fillStyle = '#f8f8f8';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🍯 ${obj.stateValue}`, obj.width / 2, 8);
      } else if (obj.type === 'spore_radio') {
        // Retro Spore Gramophone
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(8, 14, 24, 16);

        // Phonograph horn (curled leaf)
        ctx.fillStyle = '#d4a373';
        ctx.beginPath();
        ctx.moveTo(24, 14);
        ctx.lineTo(36, 4);
        ctx.lineTo(44, 14);
        ctx.closePath();
        ctx.fill();

        // Floating Musical Notes!
        if (obj.stateValue === 1) {
          const noteY = 2 + Math.sin(this.animTimer * 4) * 4;
          ctx.fillStyle = '#ffd166';
          ctx.font = '14px sans-serif';
          ctx.fillText('🎵', 32, noteY);
        }
      } else if (obj.type === 'fungus_garden') {
        // Leafcutter Fungus Incubator
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(4, 10, obj.width - 8, obj.height - 12);

        // Mulched leaf paste
        ctx.fillStyle = '#4c7c34';
        ctx.fillRect(8, 18, obj.width - 16, obj.height - 22);

        // Growing Mushrooms
        const shroomCount = Math.floor((obj.stateValue / 100) * 5) + 1;
        for (let i = 0; i < shroomCount; i++) {
          const sx = 14 + i * 14;
          const sy = obj.height - 16;
          // Stem
          ctx.fillStyle = '#f0ebd8';
          ctx.fillRect(sx + 4, sy - 8, 4, 10);
          // Spotted Red Cap
          ctx.fillStyle = '#e63946';
          ctx.beginPath();
          ctx.arc(sx + 6, sy - 10, 8, Math.PI, Math.PI * 2);
          ctx.fill();
        }
      } else if (obj.type === 'biolum_shroom') {
        // Glowing Shroom Lamp
        ctx.save();
        ctx.fillStyle = 'rgba(100, 255, 180, 0.25)';
        ctx.shadowColor = 'rgba(80, 255, 160, 0.7)';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(16, 16, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#52b788';
        ctx.beginPath();
        ctx.arc(16, 14, 7, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (obj.type === 'queen_throne') {
        // Imperial Queen's Anthill Throne
        ctx.fillStyle = '#b7094c';
        ctx.beginPath();
        ctx.roundRect(8, 12, obj.width - 16, obj.height - 14, 8);
        ctx.fill();

        // Golden Trim
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Crown carving
        ctx.fillStyle = '#ffd700';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👑', obj.width / 2, 22);
      }

      ctx.restore();
    }
  }

  // ==========================================
  // BROOD (EGGS, LARVAE, PUPAE)
  // ==========================================

  private renderBrood(sim: Simulation) {
    const ctx = this.ctx;

    for (const b of sim.brood) {
      ctx.save();
      ctx.translate(b.x, b.y);

      if (b.stage === 'egg') {
        // Pearlescent White Egg
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 8, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (b.stage === 'larva') {
        // Wiggling Baby Larva
        const wiggle = Math.sin(this.animTimer * 5 + b.x) * 2;
        ctx.fillStyle = '#faf0ca';
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 6 + wiggle, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cute Little Eyes
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.arc(6, -1, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Hunger indicator if hungry
        if (b.hunger < 50) {
          ctx.font = '10px sans-serif';
          ctx.fillText('🍼', -4, -10);
        }
      } else if (b.stage === 'pupa') {
        // Silk Cocoon
        ctx.fillStyle = '#eae2b7';
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 12, 0.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#d4a373';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // ==========================================
  // ANTS RENDERING
  // ==========================================

  private renderAnts(sim: Simulation) {
    const ctx = this.ctx;

    for (const ant of sim.ants) {
      ctx.save();
      ctx.translate(ant.x, ant.y);
      ctx.scale(ant.scale * ant.facing, ant.scale);

      // Platinum Aspiration Sparkles!
      if (ant.aspirationLevel === 'Platinum') {
        const sparkleX = (Math.sin(this.animTimer * 8 + ant.x) * 18);
        const sparkleY = (Math.cos(this.animTimer * 7 + ant.y) * 14);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00f5d4';
        ctx.shadowBlur = 6;
        ctx.fillRect(sparkleX, sparkleY, 3, 3);
        ctx.shadowBlur = 0;
      }

      // Sleeping Ant: curled up with Zzz
      if (ant.isSleeping) {
        ctx.rotate(-0.3);
      }

      // 1. Six Jointed Legs with Procedural Walk Cycle
      ctx.strokeStyle = ant.color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      const walk = ant.walkCycle;
      const legOffsets = [-8, 0, 8];

      legOffsets.forEach((lx, idx) => {
        const legPhase = walk + idx * 1.6;
        const legSwing = Math.sin(legPhase) * 6;

        // Top Leg
        ctx.beginPath();
        ctx.moveTo(lx, -2);
        ctx.lineTo(lx + legSwing * 0.5, -9);
        ctx.lineTo(lx + legSwing, -14);
        ctx.stroke();

        // Bottom Leg
        ctx.beginPath();
        ctx.moveTo(lx, 2);
        ctx.lineTo(lx - legSwing * 0.5, 9);
        ctx.lineTo(lx - legSwing, 14);
        ctx.stroke();
      });

      // 2. Abdomen (Gaster)
      ctx.fillStyle = ant.color;
      ctx.beginPath();
      const abdomenW = ant.caste === 'Queen' ? 18 : 12;
      const abdomenH = ant.caste === 'Queen' ? 14 : 9;
      ctx.ellipse(-14, 0, abdomenW, abdomenH, 0, 0, Math.PI * 2);
      ctx.fill();

      // Queen Royal Stripes
      if (ant.caste === 'Queen') {
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 3. Petiole (Waist)
      ctx.fillStyle = ant.color;
      ctx.fillRect(-4, -2, 4, 4);

      // 4. Thorax (Middle Segment)
      ctx.beginPath();
      ctx.ellipse(3, 0, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 5. Head
      ctx.beginPath();
      const headR = ant.caste === 'Soldier' ? 9 : 7;
      ctx.ellipse(14, 0, headR, headR - 1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Big Expressive Eye
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(15, -3, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Eye highlight (Sims shine)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(16, -4, 1, 0, Math.PI * 2);
      ctx.fill();

      // 6. Antennae (Twitching!)
      const twitch = Math.sin(ant.antennaTwitch) * 0.25;
      ctx.strokeStyle = ant.color;
      ctx.lineWidth = 1.6;

      // Upper Antenna
      ctx.beginPath();
      ctx.moveTo(18, -4);
      ctx.lineTo(24, -10 + twitch * 8);
      ctx.lineTo(28, -8 + twitch * 10);
      ctx.stroke();

      // Lower Antenna
      ctx.beginPath();
      ctx.moveTo(18, -1);
      ctx.lineTo(25, -4 - twitch * 6);
      ctx.lineTo(29, -2 - twitch * 8);
      ctx.stroke();

      // 7. Powerful Mandibles
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = ant.caste === 'Soldier' ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(19, 1);
      ctx.lineTo(24, 2);
      ctx.moveTo(19, 4);
      ctx.lineTo(24, 3);
      ctx.stroke();

      // Caste Specific Hats / Items:
      if (ant.caste === 'Queen') {
        // Gold Tiara
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(11, -8);
        ctx.lineTo(13, -13);
        ctx.lineTo(15, -9);
        ctx.lineTo(17, -13);
        ctx.lineTo(19, -8);
        ctx.closePath();
        ctx.fill();
      } else if (ant.caste === 'Worker') {
        // Little hardhat stripe
        ctx.fillStyle = '#ffb703';
        ctx.fillRect(12, -7, 5, 2);
      }

      // 8. Visually Held Item in Mandibles
      if (ant.heldItem === 'sugar_crumb') {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 4;
        ctx.fillRect(24, -2, 6, 6);
        ctx.shadowBlur = 0;
      } else if (ant.heldItem === 'watermelon_chunk') {
        ctx.fillStyle = '#e63946';
        ctx.fillRect(24, -3, 7, 7);
      } else if (ant.heldItem === 'honeydew_drop') {
        ctx.fillStyle = '#ffbe0b';
        ctx.beginPath();
        ctx.arc(26, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // ==========================================
  // THE ICONIC SIMS 2 PLUMBOB (3D CRYSTAL)
  // ==========================================

  private renderPlumbob(sim: Simulation) {
    const sel = sim.getSelectedAnt();
    if (!sel) return;

    const ctx = this.ctx;
    const px = sel.x;
    const py = sel.y - (sel.scale * 28 + Math.sin(this.animTimer * 4) * 4);

    // Color based on Aspiration & Motive status
    let colorTop = '#00ff66';
    let colorMid = '#1ce35d';
    let colorBottom = '#0e8a36';

    const avgMotive = (sel.motives.hunger + sel.motives.energy + sel.motives.social + sel.motives.fun) / 4;

    if (sel.aspirationLevel === 'Platinum') {
      colorTop = '#e0f7ff';
      colorMid = '#a0e7ff';
      colorBottom = '#5bc0be';
    } else if (avgMotive > 65) {
      colorTop = '#2bf56b';
      colorMid = '#10c44c';
      colorBottom = '#0b792f';
    } else if (avgMotive > 35) {
      colorTop = '#ffea00';
      colorMid = '#ffaa00';
      colorBottom = '#d67a00';
    } else {
      colorTop = '#ff5454';
      colorMid = '#d90429';
      colorBottom = '#8d0801';
    }

    ctx.save();
    ctx.translate(px, py);

    // Subtle drop shadow on ant
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 24, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3D Diamond Projection
    const rot = this.plumbobRotation;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    const diamondW = 8;
    const diamondH = 15;

    // Facet 1 (Left Front)
    ctx.fillStyle = colorTop;
    ctx.beginPath();
    ctx.moveTo(0, -diamondH);
    ctx.lineTo(cosR * diamondW, 0);
    ctx.lineTo(0, diamondH);
    ctx.lineTo(-sinR * diamondW, 0);
    ctx.closePath();
    ctx.fill();

    // Facet 2 (Right Front Highlight)
    ctx.fillStyle = colorMid;
    ctx.beginPath();
    ctx.moveTo(0, -diamondH);
    ctx.lineTo(sinR * diamondW, 0);
    ctx.lineTo(0, diamondH);
    ctx.closePath();
    ctx.fill();

    // Crystal edge sheen
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  // ==========================================
  // SPEECH & THOUGHT BUBBLES
  // ==========================================

  private renderBubbles(sim: Simulation) {
    const ctx = this.ctx;

    for (const ant of sim.ants) {
      if (!ant.bubble) continue;

      const bx = ant.x;
      const by = ant.y - (ant.scale * 32 + 20);

      ctx.save();
      ctx.translate(bx, by);

      // Bubble background
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#2b4c7e';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 6;

      if (ant.bubble.isThought) {
        // Cloud Thought Bubble
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.arc(12, -4, 12, 0, Math.PI * 2);
        ctx.arc(-12, -4, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Little thought dots down to ant
        ctx.beginPath();
        ctx.arc(4, 18, 3.5, 0, Math.PI * 2);
        ctx.arc(2, 25, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Speech Bubble with Pointer
        ctx.beginPath();
        ctx.roundRect(-22, -18, 44, 30, 8);
        ctx.fill();
        ctx.stroke();

        // Pointer triangle
        ctx.beginPath();
        ctx.moveTo(-4, 12);
        ctx.lineTo(0, 20);
        ctx.lineTo(4, 12);
        ctx.fill();
      }

      ctx.shadowBlur = 0;

      // Inside Icon / Text
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ant.bubble.icon, 0, -2);

      ctx.restore();
    }
  }

  private renderTileHighlight(col: number, row: number) {
    const ctx = this.ctx;
    const x = col * TILE_SIZE;
    const y = row * TILE_SIZE;

    ctx.save();
    ctx.strokeStyle = '#38b000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = 'rgba(56, 176, 0, 0.15)';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.restore();
  }
}
