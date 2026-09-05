// ==========================================
// THE SIMS 2: ANT COLONY UI & MENU SYSTEM
// Options, Save/Load, CAS Studio & Console
// ==========================================

import type { AntAccessoryType, AntSim, AspirationType, CasteType, GameMode, Motives } from './types';
import { TILE_SIZE } from './types';
import { Simulation } from './simulation';
import { audio } from './audio';
import { CATALOG } from './catalog';
import type { Renderer3D } from './renderer3d';

function escapeHTML(value: string | number): string {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!);
}

export class UIManager {
  private sim: Simulation;
  private renderer: Renderer3D | null = null;
  private container: HTMLElement;

  public activeMode: GameMode = 'Live';
  public activeTab: 'needs' | 'wants' | 'relationships' | 'personality' = 'needs';
  public activeCategory: string = 'All';
  public selectedCatalogItem: string | null = null;
  public buildTool: 'Dig' | 'Move' = 'Dig';
  public selectedObjectId: string | null = null;

  public pieMenuVisible: boolean = false;
  private notifTimeout: number | null = null;

  // CAS (Create-An-Ant) State
  private casPersonality = { neat: 5, outgoing: 5, active: 5, playful: 5, nice: 5 };

  constructor(sim: Simulation, container: HTMLElement) {
    this.sim = sim;
    this.container = container;
    this.renderInitialDOM();
    this.bindEvents();
  }

  public setRenderer(renderer: Renderer3D) {
    this.renderer = renderer;
  }

  // ==========================================
  // INITIAL DOM
  // ==========================================

  private renderInitialDOM() {
    this.container.innerHTML = `
      <canvas id="game-canvas"></canvas>

      <!-- TOP BAR -->
      <div class="top-bar">
        <!-- ACTION QUEUE (TOP LEFT) -->
        <div class="action-queue-container" id="action-queue-container">
          <div class="action-queue-title">Queue</div>
          <div class="action-queue-list" id="action-queue-list"></div>
        </div>

        <!-- CAMERA PRESETS -->
        <div class="camera-presets-panel">
          <button class="cam-preset-btn active" data-preset="Dollhouse" title="Classic Dollhouse Cross-Section">🏠 Dollhouse</button>
          <button class="cam-preset-btn" data-preset="Isometric" title="3D Isometric View">📐 3D Iso</button>
          <button class="cam-preset-btn" data-preset="Follow" title="Follow Selected Ant">🔍 Follow</button>
          <button class="cam-preset-btn" data-preset="Surface" title="Surface Picnic View">🌻 Surface</button>
        </div>

        <!-- TOP RIGHT PANEL -->
        <div class="top-right-panel">
          <div class="sims-logo-badge">
            <div class="sims-logo-plumbob"></div>
            <div class="sims-logo-title">The SimAnts <span>2</span></div>
          </div>
          <button class="btn-icon-round" id="btn-cas" title="Create-An-Ant Studio">➕</button>
          <button class="btn-icon-round" id="btn-options" title="Game Options & Save/Load (F5)">⚙️</button>
          <button class="btn-icon-round" id="btn-audio" title="Toggle Music & Sound">🎵</button>
        </div>
      </div>

      <!-- NOTIFICATION BANNER -->
      <div class="notification-banner" id="notif-banner">Welcome to The SimAnts 2!</div>

      <div class="build-tools" id="build-tools" role="toolbar" aria-label="Placement tools" hidden>
        <div id="build-tool-buttons">
          <button class="btn-sims build-tool-btn" data-tool="Dig" aria-pressed="true">⛏️ Dig tunnels</button>
          <button class="btn-sims build-tool-btn" data-tool="Move" aria-pressed="false">✋ Move items</button>
        </div>
        <button class="btn-sims secondary" id="btn-cancel-placement" title="Cancel selection (Escape)">Cancel</button>
        <span id="build-status" role="status">Click soil or rock to excavate.</span>
      </div>

      <!-- BUY / BUILD CATALOG DRAWER -->
      <div class="catalog-drawer" id="catalog-drawer">
        <div class="catalog-header">
          <div class="catalog-title" id="catalog-title">Buy Mode Catalog</div>
          <div class="catalog-categories" id="catalog-categories">
            <button class="cat-btn active" data-cat="All">All</button>
            <button class="cat-btn" data-cat="Comfort">Comfort</button>
            <button class="cat-btn" data-cat="Food">Food</button>
            <button class="cat-btn" data-cat="Fun">Fun</button>
            <button class="cat-btn" data-cat="Decor">Decor</button>
            <button class="cat-btn" data-cat="Queen">Queen</button>
          </div>
        </div>
        <div class="catalog-items-row" id="catalog-items-row"></div>
      </div>

      <!-- RADIAL PIE MENU -->
      <div class="pie-menu-container" id="pie-menu" style="display: none;">
        <div class="pie-center-dot" id="pie-center-dot">🐜</div>
        <div id="pie-slices-container"></div>
      </div>

      <!-- SYSTEM OPTIONS & SAVE/LOAD MODAL -->
      <div class="modal-overlay" id="options-modal" style="display: none;">
        <div class="modal-window">
          <div class="modal-header">
            <div class="modal-title">⚙️ Game Options & Save / Load</div>
            <button class="modal-close" id="btn-close-options">✕</button>
          </div>
          <div class="modal-body">
            <!-- SAVE & LOAD SLOTS -->
            <div class="modal-section">
              <div class="section-title">Save & Load Colony</div>
              <div class="save-slots-grid">
                <div class="save-slot-box">
                  <div class="slot-name">Slot 1</div>
                  <div class="slot-actions">
                    <button class="btn-sims" id="btn-save-slot-1">Save</button>
                    <button class="btn-sims" id="btn-load-slot-1">Load</button>
                  </div>
                </div>
                <div class="save-slot-box">
                  <div class="slot-name">Slot 2</div>
                  <div class="slot-actions">
                    <button class="btn-sims" id="btn-save-slot-2">Save</button>
                    <button class="btn-sims" id="btn-load-slot-2">Load</button>
                  </div>
                </div>
                <div class="save-slot-box">
                  <div class="slot-name">Auto-Save</div>
                  <div class="slot-actions">
                    <button class="btn-sims" id="btn-load-auto">Load Auto</button>
                  </div>
                </div>
              </div>
              <div class="file-io-row">
                <button class="btn-sims secondary" id="btn-export-save">📥 Export Save File (.json)</button>
                <button class="btn-sims secondary" id="btn-import-save">📤 Import Save File</button>
                <input type="file" id="file-input-save" accept=".json" style="display: none;" />
                <button class="btn-sims danger" id="btn-reset-colony">⚠️ New Colony</button>
              </div>
            </div>

            <!-- AUDIO & SETTINGS -->
            <div class="modal-section">
              <div class="section-title">Audio & Radio Stations</div>
              <div class="setting-row">
                <label>Radio Station:</label>
                <select id="select-radio-station" class="sims-select">
                  <option value="Spore_Jazz">Spore Jazz Lounge</option>
                  <option value="Anthill_Bossa">Anthill Bossa Nova</option>
                  <option value="Chitter_Pop">Chitter Chiptune Pop</option>
                </select>
              </div>
              <div class="setting-row">
                <label>Master Volume:</label>
                <input type="range" id="slider-master-vol" min="0" max="1" step="0.05" value="0.5" class="sims-slider" />
              </div>
              <div class="setting-row">
                <label>Music Volume:</label>
                <input type="range" id="slider-music-vol" min="0" max="1" step="0.05" value="0.5" class="sims-slider" />
              </div>
              <div class="setting-row">
                <label>Free Will (Autonomy):</label>
                <select id="select-freewill" class="sims-select">
                  <option value="High">High (Full Free Will)</option>
                  <option value="Medium">Medium</option>
                  <option value="Off">Off (Direct Control Only)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CREATE-AN-ANT (CAS) STUDIO MODAL -->
      <div class="modal-overlay" id="cas-modal" style="display: none;">
        <div class="modal-window cas-window">
          <div class="modal-header">
            <div class="modal-title">✨ Create-An-Ant Studio</div>
            <button class="modal-close" id="btn-close-cas">✕</button>
          </div>
          <div class="modal-body cas-body">
            <div class="cas-left-col">
              <div class="cas-preview-box">
                <canvas id="cas-preview-canvas" width="160" height="160"></canvas>
              </div>
              <div class="setting-row">
                <label>Exoskeleton Color:</label>
                <div class="color-picker-row">
                  <button class="color-swatch active" data-color="#a85a2b" style="background: #a85a2b;"></button>
                  <button class="color-swatch" data-color="#9a244a" style="background: #9a244a;"></button>
                  <button class="color-swatch" data-color="#3d2b1f" style="background: #3d2b1f;"></button>
                  <button class="color-swatch" data-color="#d17b38" style="background: #d17b38;"></button>
                  <button class="color-swatch" data-color="#2d6a4f" style="background: #2d6a4f;"></button>
                </div>
              </div>
              <div class="setting-row">
                <label>Head Accessory:</label>
                <select id="cas-accessory" class="sims-select">
                  <option value="none">None</option>
                  <option value="hardhat">Hard Hat</option>
                  <option value="crown">Golden Tiara</option>
                  <option value="nurse_cap">Nurse Cap</option>
                  <option value="goggles">Explorer Goggles</option>
                </select>
              </div>
            </div>

            <div class="cas-right-col">
              <div class="setting-row">
                <label>Name:</label>
                <input type="text" id="cas-name" class="sims-input" value="Ant-rew" maxlength="20" />
              </div>
              <div class="setting-row">
                <label>Colony Caste:</label>
                <select id="cas-caste" class="sims-select">
                  <option value="Worker">Minor Worker (Digging & Labor)</option>
                  <option value="Nurse">Nurse Ant (Brood Care & Feeding)</option>
                  <option value="Soldier">Major Soldier (Combat & Defense)</option>
                  <option value="Forager">Forager (Surface Exploration)</option>
                </select>
              </div>
              <div class="setting-row">
                <label>Aspiration:</label>
                <select id="cas-aspiration" class="sims-select">
                  <option value="Pleasure">Pleasure (Food, Lounging, Fun)</option>
                  <option value="Fortune">Fortune (Sugar Hoarding, Wealth)</option>
                  <option value="Brood">Family / Brood (Nurturing Eggs & Larvae)</option>
                  <option value="Popularity">Popularity (Friends, Trophallaxis)</option>
                  <option value="Knowledge">Knowledge (Excavation, Biology)</option>
                </select>
              </div>

              <!-- PERSONALITY POINTS -->
              <div class="personality-builder">
                <div class="cas-points-title">Personality Points: <span id="cas-points-left">0</span></div>
                <div class="cas-trait-row">
                  <span>Neat:</span>
                  <div class="stepper">
                    <button class="step-btn" data-trait="neat" data-delta="-1">-</button>
                    <span id="cas-val-neat">5</span>
                    <button class="step-btn" data-trait="neat" data-delta="1">+</button>
                  </div>
                </div>
                <div class="cas-trait-row">
                  <span>Outgoing:</span>
                  <div class="stepper">
                    <button class="step-btn" data-trait="outgoing" data-delta="-1">-</button>
                    <span id="cas-val-outgoing">5</span>
                    <button class="step-btn" data-trait="outgoing" data-delta="1">+</button>
                  </div>
                </div>
                <div class="cas-trait-row">
                  <span>Active:</span>
                  <div class="stepper">
                    <button class="step-btn" data-trait="active" data-delta="-1">-</button>
                    <span id="cas-val-active">5</span>
                    <button class="step-btn" data-trait="active" data-delta="1">+</button>
                  </div>
                </div>
                <div class="cas-trait-row">
                  <span>Playful:</span>
                  <div class="stepper">
                    <button class="step-btn" data-trait="playful" data-delta="-1">-</button>
                    <span id="cas-val-playful">5</span>
                    <button class="step-btn" data-trait="playful" data-delta="1">+</button>
                  </div>
                </div>
                <div class="cas-trait-row">
                  <span>Nice:</span>
                  <div class="stepper">
                    <button class="step-btn" data-trait="nice" data-delta="-1">-</button>
                    <span id="cas-val-nice">5</span>
                    <button class="step-btn" data-trait="nice" data-delta="1">+</button>
                  </div>
                </div>
              </div>

              <button class="btn-sims primary full-width" id="btn-spawn-cas-ant">🎉 Spawn Into Colony</button>
            </div>
          </div>
        </div>
      </div>

      <!-- THE SIMS 2 BOTTOM CONTROL CONSOLE -->
      <div class="sims2-console">
        <!-- LEFT: PORTRAIT & DETAILS -->
        <div class="console-left">
          <div class="portrait-frame">
            <div class="portrait-plumbob-gem"></div>
            <canvas class="portrait-canvas" id="portrait-canvas" width="90" height="90"></canvas>
          </div>
          <div class="sim-info-meta">
            <div class="sim-name" id="sim-name">Select an Ant</div>
            <div class="sim-caste-badge" id="sim-caste">Worker</div>
            <div class="sim-title" id="sim-title">Lead Excavator</div>
            <div class="sim-state-text" id="sim-state">Idling pleasantly</div>
          </div>
        </div>

        <!-- CENTER: MODES & CLOCK -->
        <div class="console-center">
          <div class="mode-selector">
            <button class="mode-btn active" id="btn-mode-live">🐜 Live Mode</button>
            <button class="mode-btn" id="btn-mode-buy">🛋️ Buy Mode</button>
            <button class="mode-btn" id="btn-mode-build">⛏️ Build Mode</button>
          </div>
          <div class="clock-and-funds">
            <div class="time-controls">
              <button class="time-btn" id="time-pause" title="Pause">⏸</button>
              <button class="time-btn active" id="time-1x" title="Normal Speed">▶</button>
              <button class="time-btn" id="time-2x" title="Fast Speed">▶▶</button>
              <button class="time-btn" id="time-3x" title="Ultra Speed">▶▶▶</button>
            </div>
            <div class="clock-display" id="clock-display">Day 1 - 09:30 AM</div>
            <div class="funds-display" id="funds-display">§ 280</div>
          </div>
        </div>

        <!-- RIGHT: TABS & METERS -->
        <div class="console-right">
          <div class="tab-nav">
            <button class="tab-btn active" data-tab="needs">📊 Needs</button>
            <button class="tab-btn" data-tab="wants">💎 Wants & Fears</button>
            <button class="tab-btn" data-tab="relationships">👥 Social</button>
            <button class="tab-btn" data-tab="personality">📜 Bio & Skills</button>
          </div>
          <div class="tab-content" id="tab-content">
            <div id="tab-pane-needs" class="motives-grid"></div>
            <div id="tab-pane-wants" class="wants-fears-container" style="display: none;"></div>
            <div id="tab-pane-relationships" class="relationships-list" style="display: none;"></div>
            <div id="tab-pane-personality" class="bio-skills-container" style="display: none;"></div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // EVENT BINDINGS
  // ==========================================

  private bindEvents() {
    // Mode Switching
    const liveBtn = document.getElementById('btn-mode-live')!;
    const buyBtn = document.getElementById('btn-mode-buy')!;
    const buildBtn = document.getElementById('btn-mode-build')!;
    const drawer = document.getElementById('catalog-drawer')!;

    liveBtn.addEventListener('click', () => {
      this.setMode('Live');
      drawer.classList.remove('open');
      audio.playClick();
    });

    buyBtn.addEventListener('click', () => {
      this.setMode('Buy');
      drawer.classList.add('open');
      this.renderCatalogItems();
      audio.playClick();
    });

    buildBtn.addEventListener('click', () => {
      this.setMode('Build');
      drawer.classList.remove('open');
      this.showNotification(this.buildTool === 'Move' ? 'Click an item, then its new location. Escape cancels.' : 'Build Mode: Click soil blocks to excavate!');
      audio.playClick();
    });

    document.querySelectorAll<HTMLElement>('.build-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.cancelPlacement();
        this.buildTool = btn.dataset.tool as 'Dig' | 'Move';
        document.querySelectorAll<HTMLElement>('.build-tool-btn').forEach(button => {
          button.setAttribute('aria-pressed', String(button.dataset.tool === this.buildTool));
        });
      });
    });
    document.getElementById('btn-cancel-placement')!.addEventListener('click', () => this.cancelPlacement());

    // Time Controls
    document.getElementById('time-pause')!.addEventListener('click', () => this.setTimeScale(0));
    document.getElementById('time-1x')!.addEventListener('click', () => this.setTimeScale(1));
    document.getElementById('time-2x')!.addEventListener('click', () => this.setTimeScale(2));
    document.getElementById('time-3x')!.addEventListener('click', () => this.setTimeScale(4));

    // Audio & Modals
    document.getElementById('btn-audio')!.addEventListener('click', () => {
      const isMuted = audio.toggleMute();
      document.getElementById('btn-audio')!.innerText = isMuted ? '🔇' : '🎵';
      this.showNotification(isMuted ? 'Sound Muted' : 'Sound Enabled');
    });

    document.getElementById('btn-options')!.addEventListener('click', () => {
      this.openModal('options-modal');
      audio.playClick();
    });
    document.getElementById('btn-close-options')!.addEventListener('click', () => {
      this.closeModal('options-modal');
      audio.playClick();
    });

    document.getElementById('btn-cas')!.addEventListener('click', () => {
      this.openModal('cas-modal');
      this.updateCasPreview();
      audio.playClick();
    });
    document.getElementById('btn-close-cas')!.addEventListener('click', () => {
      this.closeModal('cas-modal');
      audio.playClick();
    });

    // Camera Presets
    document.querySelectorAll('.cam-preset-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('.cam-preset-btn').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        const preset = target.dataset.preset as any;
        if (this.renderer) this.renderer.setPreset(preset);
        audio.playClick();
      });
    });

    // Save & Load Buttons
    document.getElementById('btn-save-slot-1')!.addEventListener('click', () => {
      const ok = this.sim.saveToLocalStorage('slot_1');
      this.showNotification(ok ? 'Game Saved to Slot 1!' : 'Save Failed');
    });
    document.getElementById('btn-load-slot-1')!.addEventListener('click', () => {
      const ok = this.sim.loadFromLocalStorage('slot_1');
      this.showNotification(ok ? 'Game Loaded from Slot 1!' : 'No Save in Slot 1');
      this.closeModal('options-modal');
    });

    document.getElementById('btn-save-slot-2')!.addEventListener('click', () => {
      const ok = this.sim.saveToLocalStorage('slot_2');
      this.showNotification(ok ? 'Game Saved to Slot 2!' : 'Save Failed');
    });
    document.getElementById('btn-load-slot-2')!.addEventListener('click', () => {
      const ok = this.sim.loadFromLocalStorage('slot_2');
      this.showNotification(ok ? 'Game Loaded from Slot 2!' : 'No Save in Slot 2');
      this.closeModal('options-modal');
    });

    document.getElementById('btn-load-auto')!.addEventListener('click', () => {
      const ok = this.sim.loadFromLocalStorage('auto');
      this.showNotification(ok ? 'Auto-Save Loaded!' : 'No Auto-Save Found');
      this.closeModal('options-modal');
    });

    // Export & Import
    document.getElementById('btn-export-save')!.addEventListener('click', () => {
      const json = this.sim.exportSaveJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `simants_save_day${this.sim.state.day}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showNotification('Save Exported Successfully!');
    });

    const fileInput = document.getElementById('file-input-save') as HTMLInputElement;
    document.getElementById('btn-import-save')!.addEventListener('click', () => {
      fileInput.click();
    });
    fileInput.addEventListener('change', e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = ev => {
          const content = ev.target?.result as string;
          const ok = this.sim.importSaveJSON(content);
          this.showNotification(ok ? 'Colony Imported Successfully!' : 'Invalid Save File');
          this.closeModal('options-modal');
        };
        reader.readAsText(file);
      }
    });

    document.getElementById('btn-reset-colony')!.addEventListener('click', () => {
      if (confirm('Start a new colony? Current unsaved progress will be lost.')) {
        this.sim.resetColony();
        this.showNotification('New Colony Started!');
        this.closeModal('options-modal');
      }
    });

    // Audio Sliders & Settings
    document.getElementById('slider-master-vol')!.addEventListener('input', e => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      audio.setMasterVolume(v);
    });
    document.getElementById('slider-music-vol')!.addEventListener('input', e => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      audio.setMusicVolume(v);
    });
    document.getElementById('select-radio-station')!.addEventListener('change', e => {
      const val = (e.target as HTMLSelectElement).value as any;
      audio.setRadioStation(val);
      this.sim.state.radioStation = val;
    });
    document.getElementById('select-freewill')!.addEventListener('change', e => {
      const val = (e.target as HTMLSelectElement).value as any;
      this.sim.state.freeWill = val;
    });

    // CAS Swatches & Steppers
    document.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', e => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        this.updateCasPreview();
        audio.playClick();
      });
    });

    document.getElementById('cas-accessory')!.addEventListener('change', () => {
      this.updateCasPreview();
    });

    document.querySelectorAll('.step-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const target = e.currentTarget as HTMLElement;
        const trait = target.dataset.trait as keyof typeof this.casPersonality;
        const delta = parseInt(target.dataset.delta || '0', 10);
        const totalUsed = Object.values(this.casPersonality).reduce((a, b) => a + b, 0);
        const cur = this.casPersonality[trait];
        if (delta > 0 && cur < 10 && totalUsed < 30) {
          this.casPersonality[trait]++;
        } else if (delta < 0 && cur > 0) {
          this.casPersonality[trait]--;
        }
        document.getElementById(`cas-val-${trait}`)!.innerText = `${this.casPersonality[trait]}`;
        const newTotal = Object.values(this.casPersonality).reduce((a, b) => a + b, 0);
        document.getElementById('cas-points-left')!.innerText = `${30 - newTotal}`;
        audio.playClick();
      });
    });

    document.getElementById('btn-spawn-cas-ant')!.addEventListener('click', () => {
      this.spawnCasAnt();
    });

    // Tab Switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const target = e.currentTarget as HTMLElement;
        const tab = target.dataset.tab as any;
        this.switchTab(tab);
        audio.playClick();
      });
    });

    // Catalog Categories
    document.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        this.activeCategory = target.dataset.cat || 'All';
        this.renderCatalogItems();
        audio.playClick();
      });
    });

    document.getElementById('pie-center-dot')!.addEventListener('click', () => {
      this.hidePieMenu();
    });
  }

  private openModal(id: string) {
    this.cancelPlacement();
    document.getElementById(id)!.style.display = 'flex';
  }

  private closeModal(id: string) {
    document.getElementById(id)!.style.display = 'none';
  }

  // ==========================================
  // CAS (CREATE-AN-ANT) SPAWN
  // ==========================================

  private updateCasPreview() {
    const canvas = document.getElementById('cas-preview-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const activeColor = (document.querySelector('.color-swatch.active') as HTMLElement)?.dataset.color || '#a85a2b';
    const accessory = (document.getElementById('cas-accessory') as HTMLSelectElement)?.value || 'none';

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 + 10);
    ctx.scale(3, 3);

    // Head
    ctx.fillStyle = activeColor;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-4, -1, 3, 0, Math.PI * 2);
    ctx.arc(4, -1, 3, 0, Math.PI * 2);
    ctx.fill();

    // Antennae
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-4, -10);
    ctx.quadraticCurveTo(-9, -18, -13, -16);
    ctx.moveTo(4, -10);
    ctx.quadraticCurveTo(9, -18, 13, -16);
    ctx.stroke();

    // Accessory
    if (accessory === 'crown') {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(-6, -11);
      ctx.lineTo(-3, -16);
      ctx.lineTo(0, -12);
      ctx.lineTo(3, -16);
      ctx.lineTo(6, -11);
      ctx.closePath();
      ctx.fill();
    } else if (accessory === 'hardhat') {
      ctx.fillStyle = '#ffb703';
      ctx.fillRect(-6, -14, 12, 4);
    } else if (accessory === 'goggles') {
      ctx.fillStyle = '#00b4d8';
      ctx.beginPath();
      ctx.arc(-4, -1, 4, 0, Math.PI * 2);
      ctx.arc(4, -1, 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private spawnCasAnt() {
    const nameInput = document.getElementById('cas-name') as HTMLInputElement;
    const casteSelect = document.getElementById('cas-caste') as HTMLSelectElement;
    const aspirSelect = document.getElementById('cas-aspiration') as HTMLSelectElement;
    const accessSelect = document.getElementById('cas-accessory') as HTMLSelectElement;
    const activeColor = (document.querySelector('.color-swatch.active') as HTMLElement)?.dataset.color || '#a85a2b';

    const name = nameInput.value.trim() || 'Worker Ant';
    const caste = casteSelect.value as CasteType;
    const aspiration = aspirSelect.value as AspirationType;
    const accessory = accessSelect.value as AntAccessoryType;

    const newAnt = this.sim.createAnt(name, caste, `Colony ${caste}`, activeColor, 1.05, {
      x: 20 * 32,
      y: 18 * 32,
      z: 0,
      aspiration,
      accessory,
      personality: { ...this.casPersonality },
    });

    this.sim.ants.push(newAnt);
    this.sim.selectedAntId = newAnt.id;

    audio.playWantFulfilled();
    this.showNotification(`🎉 ${name} has arrived at the colony!`);
    this.closeModal('cas-modal');
  }

  // ==========================================
  // MODES & TABS
  // ==========================================

  public setMode(mode: GameMode) {
    this.cancelPlacement();
    this.hidePieMenu();
    this.activeMode = mode;
    document.getElementById('build-tools')!.hidden = mode === 'Live';
    document.getElementById('build-tool-buttons')!.hidden = mode !== 'Build';
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    if (mode === 'Live') document.getElementById('btn-mode-live')!.classList.add('active');
    if (mode === 'Buy') document.getElementById('btn-mode-buy')!.classList.add('active');
    if (mode === 'Build') document.getElementById('btn-mode-build')!.classList.add('active');
  }

  public cancelPlacement(): boolean {
    const hadSelection = this.selectedObjectId !== null || this.selectedCatalogItem !== null;
    this.selectedObjectId = null;
    this.selectedCatalogItem = null;
    this.renderer?.setPlacementPreview(null);
    return hadSelection;
  }

  public handlePlacementClick(worldX: number, worldY: number): boolean {
    const col = Math.floor(worldX / TILE_SIZE), row = Math.floor(worldY / TILE_SIZE);
    if (this.activeMode === 'Live') return false;
    if (this.activeMode === 'Build' && this.buildTool === 'Dig') {
      this.sim.instantDigTile(col, row);
    } else if (this.activeMode === 'Build') {
      if (this.selectedObjectId) {
        const error = this.sim.getMoveError(this.selectedObjectId, col, row);
        if (error) this.showNotification(error);
        else if (this.sim.moveObject(this.selectedObjectId, col, row)) {
          this.cancelPlacement();
          this.showNotification('Item moved. No pollen spent.');
        }
      } else {
        const obj = this.sim.colonyObjects.find(o => worldX >= o.x && worldX < o.x + o.width && worldY >= o.y && worldY < o.y + o.height);
        if (obj) {
          this.selectedObjectId = obj.id;
          this.showNotification('Choose a green footprint to move here. Escape cancels.');
        } else this.showNotification('Click an existing item to select it.');
      }
    } else {
      const error = this.sim.getBuyError(this.selectedCatalogItem || '', col, row);
      if (error) this.showNotification(error);
      else if (this.sim.buyObject(this.selectedCatalogItem!, col, row)) this.showNotification('Item placed in colony!');
    }
    return true;
  }

  private updatePlacementPreview() {
    if (this.activeMode === 'Live') return;
    const tile = this.sim.highlightedTile;
    const obj = this.sim.colonyObjects.find(o => o.id === this.selectedObjectId);
    if (this.selectedObjectId && !obj) this.cancelPlacement();
    const item = CATALOG.find(c => c.type === (obj?.type || this.selectedCatalogItem));
    let hint = this.activeMode === 'Buy' ? 'Choose an item from the catalog.' :
      this.buildTool === 'Move' ? 'Click an item, then its new location. Escape cancels.' : 'Click soil or rock to excavate.';
    this.renderer?.setPlacementPreview(null);
    if (tile && (obj || (this.activeMode === 'Buy' && item))) {
      const width = obj?.width || item!.width * TILE_SIZE;
      const height = obj?.height || item!.height * TILE_SIZE;
      const error = obj ? this.sim.getMoveError(obj.id, tile.col, tile.row) : this.sim.getBuyError(item!.type, tile.col, tile.row);
      this.renderer?.setPlacementPreview({ ...tile, width, height, valid: !error });
      hint = error || `Click to place ${item?.name || 'item'}. Escape cancels.`;
    } else if (tile && this.activeMode === 'Build' && this.buildTool === 'Dig') {
      const type = this.sim.grid[tile.row]?.[tile.col]?.type;
      this.renderer?.setPlacementPreview({ ...tile, width: TILE_SIZE, height: TILE_SIZE, valid: type === 'soil' || type === 'hard_rock' });
    }
    const status = document.getElementById('build-status')!;
    if (status.innerText !== hint) status.innerText = hint;
  }

  public setTimeScale(scale: number) {
    this.sim.state.timeScale = scale;
    document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
    if (scale === 0) document.getElementById('time-pause')!.classList.add('active');
    if (scale === 1) document.getElementById('time-1x')!.classList.add('active');
    if (scale === 2) document.getElementById('time-2x')!.classList.add('active');
    if (scale === 4) document.getElementById('time-3x')!.classList.add('active');
    audio.playClick();
  }

  public switchTab(tab: 'needs' | 'wants' | 'relationships' | 'personality') {
    this.activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.classList.add('active');

    document.getElementById('tab-pane-needs')!.style.display = tab === 'needs' ? 'grid' : 'none';
    document.getElementById('tab-pane-wants')!.style.display = tab === 'wants' ? 'flex' : 'none';
    document.getElementById('tab-pane-relationships')!.style.display = tab === 'relationships' ? 'flex' : 'none';
    document.getElementById('tab-pane-personality')!.style.display = tab === 'personality' ? 'flex' : 'none';
  }

  public showNotification(text: string) {
    const banner = document.getElementById('notif-banner')!;
    banner.innerText = text;
    banner.classList.add('visible');
    if (this.notifTimeout) clearTimeout(this.notifTimeout);
    this.notifTimeout = window.setTimeout(() => {
      banner.classList.remove('visible');
    }, 3500);
  }

  // ==========================================
  // CATALOG DRAWER
  // ==========================================

  private renderCatalogItems() {
    const row = document.getElementById('catalog-items-row')!;
    row.innerHTML = '';

    const filtered =
      this.activeCategory === 'All'
        ? CATALOG
        : CATALOG.filter(item => item.category === this.activeCategory);

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'catalog-item-card';
      card.innerHTML = `
        <div class="item-icon">${item.icon}</div>
        <div class="item-name">${item.name}</div>
        <div class="item-cost">§ ${item.cost}</div>
      `;
      card.title = `${item.description}`;
      card.addEventListener('click', () => {
        this.selectedCatalogItem = item.type;
        this.showNotification(`Selected ${item.name}! Click underground floor to place.`);
        audio.playClick();
      });
      row.appendChild(card);
    });
  }

  // ==========================================
  // RADIAL PIE MENU
  // ==========================================

  public openPieMenu(screenX: number, screenY: number, options: Array<{ label: string; icon: string; action: () => void }>) {
    this.pieMenuVisible = true;

    const pieMenu = document.getElementById('pie-menu')!;
    const slices = document.getElementById('pie-slices-container')!;
    slices.innerHTML = '';

    pieMenu.style.left = `${screenX}px`;
    pieMenu.style.top = `${screenY}px`;
    pieMenu.style.display = 'block';

    const radius = 80;
    const count = options.length;

    options.forEach((opt, idx) => {
      const angle = (idx / count) * Math.PI * 2 - Math.PI / 2;
      const ox = Math.cos(angle) * radius;
      const oy = Math.sin(angle) * radius;

      const btn = document.createElement('button');
      btn.className = 'pie-slice-btn';
      btn.style.left = `calc(50% + ${ox}px)`;
      btn.style.top = `calc(50% + ${oy}px)`;
      btn.innerHTML = `<span>${opt.icon}</span> <span>${opt.label}</span>`;

      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.hidePieMenu();
        audio.playClick();
        opt.action();
      });

      slices.appendChild(btn);
    });

    audio.playClick();
  }

  public hidePieMenu() {
    this.pieMenuVisible = false;
    const pieMenu = document.getElementById('pie-menu');
    if (pieMenu) pieMenu.style.display = 'none';
  }

  // ==========================================
  // PER-FRAME UPDATE
  // ==========================================

  public update(_dt: number) {
    this.updatePlacementPreview();
    const sel = this.sim.getSelectedAnt();

    // Clock & Funds
    const hours = Math.floor(this.sim.state.timeOfDay);
    const mins = Math.floor((this.sim.state.timeOfDay % 1) * 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayH = hours % 12 === 0 ? 12 : hours % 12;
    const padM = mins < 10 ? `0${mins}` : mins;

    document.getElementById('clock-display')!.innerText = `Day ${this.sim.state.day} - ${displayH}:${padM} ${ampm}`;
    document.getElementById('funds-display')!.innerText = `§ ${this.sim.state.pollenPoints}`;

    if (sel) {
      document.getElementById('sim-name')!.innerText = sel.name;
      document.getElementById('sim-caste')!.innerText = sel.caste;
      document.getElementById('sim-title')!.innerText = sel.title;
      document.getElementById('sim-state')!.innerText = sel.stateText;

      this.drawPortrait(sel);
      this.updateActionQueue(sel);

      if (this.activeTab === 'needs') {
        this.updateMotivesTab(sel.motives);
      } else if (this.activeTab === 'wants') {
        this.updateWantsFearsTab(sel);
      } else if (this.activeTab === 'relationships') {
        this.updateRelationshipsTab(sel);
      } else if (this.activeTab === 'personality') {
        this.updateBioAndSkillsTab(sel);
      }
    }
  }

  private drawPortrait(ant: AntSim) {
    const canvas = document.getElementById('portrait-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 + 10);
    ctx.scale(2.2, 2.2);

    ctx.fillStyle = ant.color;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-4, -1, 3, 0, Math.PI * 2);
    ctx.arc(4, -1, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-3, -2, 1, 0, Math.PI * 2);
    ctx.arc(5, -2, 1, 0, Math.PI * 2);
    ctx.fill();

    const twitch = Math.sin(ant.antennaTwitch) * 2;
    ctx.strokeStyle = ant.color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-4, -10);
    ctx.quadraticCurveTo(-9, -18 + twitch, -13, -16 + twitch);
    ctx.moveTo(4, -10);
    ctx.quadraticCurveTo(9, -18 - twitch, 13, -16 - twitch);
    ctx.stroke();

    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-3, 8, 3, 0, Math.PI);
    ctx.arc(3, 8, 3, 0, Math.PI);
    ctx.fill();

    if (ant.caste === 'Queen' || ant.accessory === 'crown') {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(-6, -11);
      ctx.lineTo(-3, -16);
      ctx.lineTo(0, -12);
      ctx.lineTo(3, -16);
      ctx.lineTo(6, -11);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  private updateActionQueue(ant: AntSim) {
    const list = document.getElementById('action-queue-list')!;
    const queueKey = JSON.stringify([ant.id, ...ant.actionQueue.map(action => action.id)]);
    if (list.dataset.queueKey === queueKey) {
      const action = ant.actionQueue[0];
      const progress = list.querySelector<HTMLElement>('.action-progress-bar');
      if (progress && action) {
        progress.style.width = `${action.duration > 0 ? Math.min(100, action.elapsed / action.duration * 100) : 0}%`;
      }
      return;
    }
    list.dataset.queueKey = queueKey;
    list.innerHTML = '';

    ant.actionQueue.forEach((act, idx) => {
      const card = document.createElement('div');
      card.className = `action-card ${idx === 0 ? 'current' : ''}`;
      card.title = act.name;

      const progress = act.duration > 0 ? Math.min(100, (act.elapsed / act.duration) * 100) : 0;

      card.innerHTML = `
        <div class="action-card-icon">${escapeHTML(act.icon)}</div>
        <div class="action-card-cancel">✕</div>
        ${idx === 0 ? `<div class="action-progress-ring"><div class="action-progress-bar" style="width: ${progress}%"></div></div>` : ''}
      `;

      card.addEventListener('click', e => {
        e.stopPropagation();
        this.sim.cancelAction(ant, idx);
        audio.playClick();
      });

      list.appendChild(card);
    });
  }

  private updateMotivesTab(m: Motives) {
    const pane = document.getElementById('tab-pane-needs')!;
    const keys: Array<{ key: keyof Motives; label: string; icon: string }> = [
      { key: 'hunger', label: 'Hunger', icon: '🍉' },
      { key: 'energy', label: 'Energy', icon: '💤' },
      { key: 'grooming', label: 'Grooming', icon: '✨' },
      { key: 'social', label: 'Social', icon: '💬' },
      { key: 'fun', label: 'Fun', icon: '🎯' },
      { key: 'colonyDuty', label: 'Colony Duty', icon: '👑' },
    ];

    pane.innerHTML = keys
      .map(k => {
        const val = Math.max(0, Math.min(100, Math.round(m[k.key])));
        const stateClass = val > 60 ? 'good' : val > 30 ? 'medium' : 'bad';
        return `
        <div class="motive-row">
          <div class="motive-label">${k.icon} ${k.label}</div>
          <div class="motive-track">
            <div class="motive-fill ${stateClass}" style="width: ${val}%;"></div>
          </div>
        </div>
      `;
      })
      .join('');
  }

  private updateWantsFearsTab(ant: AntSim) {
    const pane = document.getElementById('tab-pane-wants')!;
    const norm = Math.max(0, Math.min(100, ((ant.aspirationScore + 3000) / 11000) * 100));
    const level = escapeHTML(ant.aspirationLevel.toLowerCase());

    pane.innerHTML = `
      <div class="aspiration-meter-col">
        <div class="aspiration-meter-track">
          <div class="aspiration-meter-fill ${level}" style="height: ${norm}%;"></div>
        </div>
        <div class="aspiration-level-tag">${escapeHTML(ant.aspirationLevel)}</div>
      </div>

      <div class="wants-fears-lists">
        <div class="wf-section-label wants">Wants</div>
        <div class="wf-row">
          ${ant.wants
            .map(
              w => `
            <div class="wf-card want" title="${escapeHTML(w.name)}: ${escapeHTML(w.description)}">
              <div class="wf-card-icon">${escapeHTML(w.icon)}</div>
              <div class="wf-card-points">+${escapeHTML(w.points)}</div>
            </div>
          `
            )
            .join('')}
        </div>

        <div class="wf-section-label fears">Fears</div>
        <div class="wf-row">
          ${ant.fears
            .map(
              f => `
            <div class="wf-card fear" title="${escapeHTML(f.name)}: ${escapeHTML(f.description)}">
              <div class="wf-card-icon">${escapeHTML(f.icon)}</div>
              <div class="wf-card-points">${escapeHTML(f.points)}</div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  private updateRelationshipsTab(ant: AntSim) {
    const pane = document.getElementById('tab-pane-relationships')!;
    const others = this.sim.ants.filter(a => a.id !== ant.id);

    pane.innerHTML = others
      .map(o => {
        const rel = ant.relationships[o.id] || { daily: 50, lifetime: 50 };
        const badge = rel.isBestFriend ? 'Best Friends' : rel.daily > 70 ? 'Friends' : 'Acquaintance';
        return `
        <div class="rel-row">
          <div class="rel-name-col">
            <span>🐜</span>
            <span>${escapeHTML(o.name)}</span>
          </div>
          <div class="rel-meters">
            <div class="rel-meter-box">
              <span>Daily:</span>
              <b style="color: ${rel.daily > 50 ? '#37e36c' : '#ff4d4d'}">${Math.round(rel.daily)}</b>
            </div>
            <div class="rel-meter-box">
              <span>Lifetime:</span>
              <b style="color: #ffd700">${Math.round(rel.lifetime)}</b>
            </div>
            <div class="rel-badge">${badge}</div>
          </div>
        </div>
      `;
      })
      .join('');
  }

  private updateBioAndSkillsTab(ant: AntSim) {
    const pane = document.getElementById('tab-pane-personality')!;

    const traits: Array<{ key: keyof AntSim['personality']; label: string; icon: string }> = [
      { key: 'neat', label: 'Neat', icon: '🧼' },
      { key: 'outgoing', label: 'Outgoing', icon: '🗣️' },
      { key: 'active', label: 'Active', icon: '⚡' },
      { key: 'playful', label: 'Playful', icon: '🎲' },
      { key: 'nice', label: 'Nice', icon: '😇' },
    ];

    const traitsHtml = traits
      .map(t => {
        const val = ant.personality[t.key];
        const pips = Array.from({ length: 10 }, (_, i) => `<div class="personality-pip ${i < val ? 'filled' : ''}"></div>`).join('');
        return `
        <div class="personality-row">
          <span style="width: 75px;">${t.icon} ${t.label}:</span>
          <div class="personality-pips">${pips}</div>
        </div>
      `;
      })
      .join('');

    const skillsHtml = `
      <div class="skills-col">
        <div class="sub-title">Skills</div>
        <div class="skill-row"><span>⛏️ Digging:</span> <b>${escapeHTML(ant.skills.digging)}/10</b></div>
        <div class="skill-row"><span>🌾 Foraging:</span> <b>${escapeHTML(ant.skills.foraging)}/10</b></div>
        <div class="skill-row"><span>🍼 Brood Care:</span> <b>${escapeHTML(ant.skills.nursing)}/10</b></div>
        <div class="skill-row"><span>⚔️ Combat:</span> <b>${escapeHTML(ant.skills.combat)}/10</b></div>
        <div class="skill-row"><span>💬 Charisma:</span> <b>${escapeHTML(ant.skills.charisma)}/10</b></div>
      </div>
    `;

    const memoriesHtml = `
      <div class="memories-col">
        <div class="sub-title">Memories</div>
        <div class="memories-list">
          ${ant.memories
            .map(
              m => `
            <div class="mem-badge ${m.isPositive ? 'pos' : 'neg'}" title="${escapeHTML(m.description)}">
              <span>${escapeHTML(m.icon)}</span>
              <span>Day ${escapeHTML(m.day)}: ${escapeHTML(m.title)}</span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;

    pane.innerHTML = `
      <div class="bio-skills-wrapper">
        <div class="traits-col">${traitsHtml}</div>
        ${skillsHtml}
        ${memoriesHtml}
      </div>
    `;
  }
}
