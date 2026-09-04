// ==========================================
// THE SIMS 2: ANT COLONY UI SYSTEM
// Console, Action Queue, Pie Menu, Catalog
// ==========================================

import { AntSim, GameMode, Motives, QueuedAction } from './types';
import { Simulation } from './simulation';
import { audio } from './audio';
import { CATALOG } from './catalog';

export class UIManager {
  private sim: Simulation;
  private container: HTMLElement;

  // Active UI state
  public activeMode: GameMode = 'Live';
  public activeTab: 'needs' | 'wants' | 'relationships' | 'personality' = 'needs';
  public activeCategory: string = 'All';
  public selectedCatalogItem: string | null = null;

  // Pie Menu
  public pieMenuVisible: boolean = false;
  private pieX: number = 0;
  private pieY: number = 0;
  private pieOptions: Array<{ label: string; icon: string; action: () => void }> = [];

  // Notification Banner
  private notifTimeout: number | null = null;

  constructor(sim: Simulation, container: HTMLElement) {
    this.sim = sim;
    this.container = container;
    this.renderInitialDOM();
    this.bindEvents();
  }

  // ==========================================
  // INITIAL DOM CONSTRUCTION
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

        <!-- TOP RIGHT PANEL -->
        <div class="top-right-panel">
          <div class="sims-logo-badge">
            <div class="sims-logo-plumbob"></div>
            <div class="sims-logo-title">The SimAnts <span>2</span></div>
          </div>
          <button class="btn-icon-round" id="btn-audio" title="Toggle Music & Sound">🎵</button>
          <button class="btn-icon-round" id="btn-help" title="Colony Guide">❓</button>
        </div>
      </div>

      <!-- NOTIFICATION BANNER -->
      <div class="notification-banner" id="notif-banner">Welcome to The SimAnts 2!</div>

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
            <button class="tab-btn" data-tab="personality">📜 Bio</button>
          </div>
          <div class="tab-content" id="tab-content">
            <!-- TAB 1: NEEDS -->
            <div id="tab-pane-needs" class="motives-grid"></div>

            <!-- TAB 2: WANTS & FEARS -->
            <div id="tab-pane-wants" class="wants-fears-container" style="display: none;"></div>

            <!-- TAB 3: RELATIONSHIPS -->
            <div id="tab-pane-relationships" class="relationships-list" style="display: none;"></div>

            <!-- TAB 4: PERSONALITY -->
            <div id="tab-pane-personality" class="personality-grid" style="display: none;"></div>
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
      this.showNotification('Build Mode: Click soil to mark for excavation!');
      audio.playClick();
    });

    // Time Controls
    document.getElementById('time-pause')!.addEventListener('click', () => this.setTimeScale(0));
    document.getElementById('time-1x')!.addEventListener('click', () => this.setTimeScale(1));
    document.getElementById('time-2x')!.addEventListener('click', () => this.setTimeScale(2));
    document.getElementById('time-3x')!.addEventListener('click', () => this.setTimeScale(4));

    // Audio & Help
    document.getElementById('btn-audio')!.addEventListener('click', () => {
      const isMuted = audio.toggleMute();
      const btn = document.getElementById('btn-audio')!;
      btn.innerText = isMuted ? '🔇' : '🎵';
      this.showNotification(isMuted ? 'Sound Muted' : 'Sound Enabled');
    });

    document.getElementById('btn-help')!.addEventListener('click', () => {
      this.showNotification('Left Click: Select Ant or Open Pie Menu. Drag: Pan Camera. Scroll: Zoom!');
      audio.playSimlish('chat');
    });

    // Tab Switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const target = e.currentTarget as HTMLElement;
        const tab = target.dataset.tab as 'needs' | 'wants' | 'relationships' | 'personality';
        this.switchTab(tab);
        audio.playClick();
      });
    });

    // Catalog Category Filter
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

    // Close pie menu when clicking center dot
    document.getElementById('pie-center-dot')!.addEventListener('click', () => {
      this.hidePieMenu();
    });
  }

  public setMode(mode: GameMode) {
    this.activeMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    if (mode === 'Live') document.getElementById('btn-mode-live')!.classList.add('active');
    if (mode === 'Buy') document.getElementById('btn-mode-buy')!.classList.add('active');
    if (mode === 'Build') document.getElementById('btn-mode-build')!.classList.add('active');

    const canvas = document.getElementById('game-canvas')!;
    canvas.classList.remove('tool-dig', 'tool-buy');
    if (mode === 'Build') canvas.classList.add('tool-dig');
    if (mode === 'Buy') canvas.classList.add('tool-buy');
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
    document.getElementById('tab-pane-personality')!.style.display = tab === 'personality' ? 'grid' : 'none';
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
  // CATALOG DRAWER (BUY MODE)
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
  // RADIAL PIE MENU (THE SIMS 2 STYLE)
  // ==========================================

  public openPieMenu(screenX: number, screenY: number, options: Array<{ label: string; icon: string; action: () => void }>) {
    this.pieX = screenX;
    this.pieY = screenY;
    this.pieOptions = options;
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
  // PER-FRAME UI UPDATE
  // ==========================================

  public update(dt: number) {
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

      // Update Portrait Canvas
      this.drawPortrait(sel, dt);

      // Update Action Queue
      this.updateActionQueue(sel);

      // Update Active Tab Content
      if (this.activeTab === 'needs') {
        this.updateMotivesTab(sel.motives);
      } else if (this.activeTab === 'wants') {
        this.updateWantsFearsTab(sel);
      } else if (this.activeTab === 'relationships') {
        this.updateRelationshipsTab(sel);
      } else if (this.activeTab === 'personality') {
        this.updatePersonalityTab(sel);
      }
    }
  }

  private drawPortrait(ant: AntSim, dt: number) {
    const canvas = document.getElementById('portrait-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 + 10);
    ctx.scale(2.2, 2.2);

    // Cute Ant Face Portrait
    // Head
    ctx.fillStyle = ant.color;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-4, -1, 3, 0, Math.PI * 2);
    ctx.arc(4, -1, 3, 0, Math.PI * 2);
    ctx.fill();

    // Eye highlights
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-3, -2, 1, 0, Math.PI * 2);
    ctx.arc(5, -2, 1, 0, Math.PI * 2);
    ctx.fill();

    // Antennae
    const twitch = Math.sin(ant.antennaTwitch) * 2;
    ctx.strokeStyle = ant.color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-4, -10);
    ctx.quadraticCurveTo(-9, -18 + twitch, -13, -16 + twitch);
    ctx.moveTo(4, -10);
    ctx.quadraticCurveTo(9, -18 - twitch, 13, -16 - twitch);
    ctx.stroke();

    // Mandibles
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-3, 8, 3, 0, Math.PI);
    ctx.arc(3, 8, 3, 0, Math.PI);
    ctx.fill();

    // Caste Hat
    if (ant.caste === 'Queen') {
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
    list.innerHTML = '';

    ant.actionQueue.forEach((act, idx) => {
      const card = document.createElement('div');
      card.className = `action-card ${idx === 0 ? 'current' : ''}`;
      card.title = act.name;

      const progress = act.duration > 0 ? Math.min(100, (act.elapsed / act.duration) * 100) : 0;

      card.innerHTML = `
        <div class="action-card-icon">${act.icon}</div>
        <div class="action-card-cancel">✕</div>
        ${idx === 0 ? `<div class="action-progress-ring"><div class="action-progress-bar" style="width: ${progress}%"></div></div>` : ''}
      `;

      card.addEventListener('click', e => {
        e.stopPropagation();
        ant.actionQueue.splice(idx, 1);
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

    // Aspiration Meter calculation (Score: -3000 to +8000)
    const norm = Math.max(0, Math.min(100, ((ant.aspirationScore + 3000) / 11000) * 100));
    const level = ant.aspirationLevel.toLowerCase();

    pane.innerHTML = `
      <!-- METER -->
      <div class="aspiration-meter-col">
        <div class="aspiration-meter-track">
          <div class="aspiration-meter-fill ${level}" style="height: ${norm}%;"></div>
        </div>
        <div class="aspiration-level-tag">${ant.aspirationLevel}</div>
      </div>

      <!-- LISTS -->
      <div class="wants-fears-lists">
        <div class="wf-section-label wants">Wants</div>
        <div class="wf-row">
          ${ant.wants
            .map(
              w => `
            <div class="wf-card want" title="${w.name}: ${w.description}">
              <div class="wf-card-icon">${w.icon}</div>
              <div class="wf-card-points">+${w.points}</div>
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
            <div class="wf-card fear" title="${f.name}: ${f.description}">
              <div class="wf-card-icon">${f.icon}</div>
              <div class="wf-card-points">${f.points}</div>
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
            <span>${o.name}</span>
          </div>
          <div class="rel-meters">
            <div class="rel-meter-box" title="Daily Interaction Score">
              <span>Daily:</span>
              <b style="color: ${rel.daily > 50 ? '#37e36c' : '#ff4d4d'}">${Math.round(rel.daily)}</b>
            </div>
            <div class="rel-meter-box" title="Lifetime Friendship Score">
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

  private updatePersonalityTab(ant: AntSim) {
    const pane = document.getElementById('tab-pane-personality')!;
    const traits: Array<{ key: keyof AntSim['personality']; label: string; icon: string }> = [
      { key: 'neat', label: 'Neat', icon: '🧼' },
      { key: 'outgoing', label: 'Outgoing', icon: '🗣️' },
      { key: 'active', label: 'Active', icon: '⚡' },
      { key: 'playful', label: 'Playful', icon: '🎲' },
      { key: 'nice', label: 'Nice', icon: '😇' },
    ];

    pane.innerHTML = traits
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
  }
}
