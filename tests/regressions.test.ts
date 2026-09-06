import { afterAll, expect, spyOn, test } from 'bun:test';
import * as THREE from 'three';
import { audio } from '../src/audio';
import { CATALOG } from '../src/catalog';
import { Renderer3D } from '../src/renderer3d';
import { Simulation } from '../src/simulation';
import { UIManager } from '../src/ui';
import { GRID_COLS, GRID_ROWS, TILE_SIZE } from '../src/types';

const audioStub = spyOn(audio, 'ensureContext').mockImplementation(() => {});
afterAll(() => audioStub.mockRestore());

function controlledColony() {
  const sim = new Simulation();
  sim.state.freeWill = 'Off';
  sim.brood = [];
  sim.ants = [sim.ants[1]];
  return sim;
}

function advance(sim: Simulation, seconds: number) {
  for (let i = 0; i < seconds * 10; i++) sim.update(0.1);
}

test('a long walk completes only after reaching its destination', () => {
  const sim = controlledColony();
  sim.carveRect(0, 18, GRID_COLS, 1, 'tunnel');
  const ant = sim.ants[0];
  ant.x = TILE_SIZE;
  let arrived = false;
  const target = (GRID_COLS - 2) * TILE_SIZE;
  sim.queueWalkToCoord(ant, target, ant.y, () => { arrived = true; });
  advance(sim, 16);
  expect(arrived).toBe(false);
  advance(sim, 14);
  expect(arrived).toBe(true);
  expect(Math.abs(ant.x - target)).toBeLessThan(12);
});

test('walk destinations outside the playable area are clamped', () => {
  const sim = controlledColony();
  sim.carveRect(0, 18, GRID_COLS, 1, 'tunnel');
  const ant = sim.ants[0];
  ant.x = TILE_SIZE;
  let arrived = false;
  sim.queueWalkToCoord(ant, -100, ant.y, () => { arrived = true; });
  advance(sim, 2);
  expect(arrived).toBe(true);
  expect(ant.vx).toBe(0);
});

test('a fast platinum ant does not oscillate past the destination', () => {
  const sim = controlledColony();
  sim.state.timeScale = 4;
  const ant = sim.ants[0];
  ant.aspirationLevel = 'Platinum';
  const target = ant.x + 15;
  let arrived = false;
  sim.queueWalkToCoord(ant, target, ant.y, () => { arrived = true; });
  advance(sim, 1);
  expect(arrived).toBe(true);
  expect(Math.abs(ant.x - target)).toBeLessThan(12);
});

test('sleep recovers energy, pauses walking, and releases the bed with free will off', () => {
  const sim = controlledColony();
  const ant = sim.ants[0];
  const bed = sim.colonyObjects.find(o => o.type === 'leaf_hammock')!;
  bed.occupiedByAntId = ant.id;
  ant.isSleeping = true;
  ant.motives.energy = 90;
  sim.queueWalkToCoord(ant, ant.x + 100, ant.y, () => {});
  const x = ant.x;
  sim.update(0.1);
  expect(ant.x).toBe(x);
  advance(sim, 5);
  expect(ant.isSleeping).toBe(false);
  expect(ant.motives.energy).toBeLessThanOrEqual(100);
  expect(bed.occupiedByAntId).toBeUndefined();
});

test('canceling the current walk stops motion and releases its bed reservation', () => {
  const sim = controlledColony();
  const ant = sim.ants[0];
  sim.queueWalkToCoord(ant, ant.x + 200, ant.y, () => { throw Error('Canceled callback ran'); });
  sim.update(0.1);
  sim.colonyObjects[2].occupiedByAntId = ant.id;
  sim.cancelAction(ant, 0);
  const x = ant.x;
  advance(sim, 1);
  expect(ant.x).toBe(x);
  expect(ant.actionQueue).toHaveLength(0);
  expect(sim.colonyObjects[2].occupiedByAntId).toBeUndefined();
});

test('loading restores the ID counter and clears actions without leaving motion or reservations', () => {
  const sim = controlledColony();
  const saved = sim.serialize();
  saved.ants[0].id = 'ant_900';
  saved.ants[0].vx = 55;
  saved.ants[0].isDigging = true;
  saved.ants[0].isDancing = true;
  saved.colonyObjects[0].id = 'obj_950';
  saved.colonyObjects[2].occupiedByAntId = 'ant_900';
  saved.selectedAntId = 'ant_900';
  sim.deserialize(saved);
  const ant = sim.ants[0];
  expect(ant.vx).toBe(0);
  expect(ant.isDigging).toBe(false);
  expect(ant.isDancing).toBe(false);
  expect(sim.colonyObjects[2].occupiedByAntId).toBeUndefined();
  const newAnt = sim.createAnt('New', 'Worker', '', '#a85a2b', 1, {
    x: ant.x, y: ant.y, aspiration: 'Brood', personality: ant.personality,
  });
  expect(Number(newAnt.id.split('_')[1])).toBeGreaterThan(950);
});

test('invalid imports and local saves leave the live colony and queued actions unchanged', () => {
  const sim = controlledColony();
  const ant = sim.ants[0];
  const action = sim.queueWalkToCoord(ant, ant.x + 80, ant.y, () => {});
  const snapshot = () => JSON.stringify({ ...sim.serialize(), saveTime: '' });
  const before = snapshot();
  const invalid: unknown[] = [null, {}, [], 'not a save'];
  const mutations: Array<(data: any) => void> = [
    data => { data.version = 2; },
    data => { delete data.state.freeWill; },
    data => { data.state.timeScale = -1; },
    data => { data.state.masterVolume = 2; },
    data => { data.grid.pop(); },
    data => { data.grid[0].pop(); },
    data => { data.grid[0][0].type = 'lava'; },
    data => { data.ants[0].motives = {}; },
    data => { data.ants[0].x = Infinity; },
    data => { data.ants[0].caste = 'Wizard'; },
    data => { data.ants[0].wants = [null]; },
    data => { data.ants[0].relationships.other = { daily: 'bad', lifetime: 0 }; },
    data => { data.colonyObjects[0].width = 0; },
    data => { data.surfaceEntities.at(-1).id = 123; },
    data => { data.colonyObjects[0].id = data.ants[0].id; },
  ];
  for (const mutate of mutations) {
    const data = JSON.parse(sim.exportSaveJSON());
    data.state.pollenPoints += 99;
    data.grid[11][0].type = 'tunnel';
    mutate(data);
    invalid.push(data);
  }
  const errors = spyOn(console, 'error').mockImplementation(() => {});
  const previousStorage = globalThis.localStorage;
  let stored = '';
  globalThis.localStorage = { getItem: () => stored } as any;
  try {
    expect(sim.importSaveJSON('{broken')).toBe(false);
    for (const data of invalid) {
      stored = JSON.stringify(data);
      expect(sim.importSaveJSON(stored)).toBe(false);
      expect(snapshot()).toBe(before);
      expect(sim.loadFromLocalStorage()).toBe(false);
      expect(snapshot()).toBe(before);
      expect(() => sim.deserialize(data as any)).toThrow();
      expect(snapshot()).toBe(before);
      expect(sim.ants[0]).toBe(ant);
      expect(ant.actionQueue[0]).toBe(action);
    }
  } finally {
    globalThis.localStorage = previousStorage;
    errors.mockRestore();
  }
});

test('valid saves round-trip through storage and imports without retaining input references', () => {
  const source = new Simulation();
  source.state.freeWill = 'Off';
  source.state.pollenPoints = 731;
  source.grid[11][0].markedForDig = true;
  const previousStorage = globalThis.localStorage;
  const slots = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => slots.get(key) ?? null,
    setItem: (key: string, value: string) => { slots.set(key, value); },
  } as any;
  try {
    expect(source.saveToLocalStorage('slot_2')).toBe(true);
    const sim = new Simulation();
    expect(sim.loadFromLocalStorage('slot_2')).toBe(true);
    expect(sim.state).toEqual(source.state);
    expect(sim.grid[11][0].markedForDig).toBe(true);
    expect(sim.brood).toEqual(source.brood);
    expect(sim.ants[0].memories).toEqual(source.ants[0].memories);
    expect(sim.importSaveJSON(source.exportSaveJSON())).toBe(true);
    const data = JSON.parse(source.exportSaveJSON());
    sim.deserialize(data);
    data.ants[0].motives.hunger = -999;
    data.colonyObjects[0].stateValue = -999;
    expect(sim.ants[0].motives.hunger).toBe(source.ants[0].motives.hunger);
    expect(sim.colonyObjects[0].stateValue).toBe(source.colonyObjects[0].stateValue);
    expect(() => advance(sim, 1)).not.toThrow();
  } finally {
    globalThis.localStorage = previousStorage;
  }
});

// Exercise scene synchronization without creating a WebGL context.
function sceneRenderer() {
  const renderer = Object.create(Renderer3D.prototype) as any;
  renderer.scene = new THREE.Scene();
  for (const key of ['antMeshes', 'objectMeshes', 'surfaceMeshes', 'broodMeshes', 'tileMeshes']) {
    renderer[key] = new Map();
  }
  return renderer;
}

for (const item of CATALOG) {
  test(`${item.name} has visible geometry after purchase and reload`, () => {
    const sim = controlledColony();
    sim.state.pollenPoints = item.cost;
    expect(sim.buyObject(item.type, 20, 16)).toBe(true);
    const id = sim.colonyObjects.at(-1)!.id;
    const renderer = sceneRenderer();
    const checkModel = () => {
      renderer.syncColonyObjects(sim);
      const model = renderer.objectMeshes.get(id);
      const bounds = new THREE.Box3().setFromObject(model);
      expect(bounds.isEmpty()).toBe(false);
      expect(bounds.getSize(new THREE.Vector3()).toArray().every(n => Number.isFinite(n) && n > 0)).toBe(true);
      expect(model.parent === renderer.scene).toBe(true);
      return model;
    };
    const original = checkModel();
    sim.deserialize(JSON.parse(sim.exportSaveJSON()));
    expect(checkModel() === original).toBe(false);
  });
}

test('the gramophone has an open horn and its record stops when off or paused', () => {
  const sim = controlledColony();
  const renderer = sceneRenderer();
  const radio = sim.colonyObjects.find(obj => obj.type === 'spore_radio')!;
  renderer.syncColonyObjects(sim, 0);
  const model = renderer.objectMeshes.get(radio.id);
  const horn = model.getObjectByName('radio-horn');
  const record = model.getObjectByName('radio-record');
  const light = model.getObjectByName('radio-light');
  expect(horn?.geometry.type).toBe('LatheGeometry');
  expect(horn.material.side).toBe(THREE.DoubleSide);
  const start = record.rotation.y;
  renderer.syncColonyObjects(sim, 0.1);
  expect(record.rotation.y).toBeGreaterThan(start);
  radio.stateValue = 0;
  const stopped = record.rotation.y;
  renderer.syncColonyObjects(sim, 0.1);
  expect(record.rotation.y).toBe(stopped);
  expect(light.material.emissiveIntensity).toBe(0);
  radio.stateValue = 1;
  sim.state.timeScale = 0;
  renderer.syncColonyObjects(sim, 0.1);
  expect(record.rotation.y).toBe(stopped);
});

test('the throne has a seat in front of a taller backrest and a crown above it', () => {
  const sim = controlledColony();
  const renderer = sceneRenderer();
  renderer.syncColonyObjects(sim);
  const throne = sim.colonyObjects.find(obj => obj.type === 'queen_throne')!;
  const model = renderer.objectMeshes.get(throne.id);
  const bounds = (name: string) => {
    const part = model.getObjectByName(name);
    expect(part).toBeDefined();
    return new THREE.Box3().setFromObject(part);
  };
  const seat = bounds('throne-seat');
  const back = bounds('throne-backrest');
  const crown = bounds('throne-crown');
  expect(back.max.y).toBeGreaterThan(seat.max.y);
  expect(seat.max.z).toBeGreaterThan(back.max.z);
  expect(crown.max.y).toBeGreaterThan(back.max.y);
});

test('every starting surface entity has visible geometry', () => {
  const sim = controlledColony();
  const renderer = sceneRenderer();
  renderer.syncSurfaceEntities(sim);
  for (const entity of sim.surfaceEntities) {
    const bounds = new THREE.Box3().setFromObject(renderer.surfaceMeshes.get(entity.id));
    expect(bounds.isEmpty()).toBe(false);
  }
});

test('brood stage changes replace models and hatched brood releases GPU resources', () => {
  const sim = new Simulation();
  sim.brood = [sim.brood[0]];
  const renderer = sceneRenderer();
  renderer.syncBrood(sim);
  const egg = renderer.broodMeshes.get(sim.brood[0].id);
  const dispose = spyOn(egg.children[0].geometry, 'dispose');
  sim.brood[0].stage = 'larva';
  renderer.syncBrood(sim);
  expect(renderer.broodMeshes.get(sim.brood[0].id) === egg).toBe(false);
  expect(dispose).toHaveBeenCalledTimes(1);
  sim.brood = [];
  renderer.syncBrood(sim);
  expect(renderer.broodMeshes.size).toBe(0);
  expect(renderer.scene.children).toHaveLength(0);
});

test('loading and resetting remove stale scene entities, including reused IDs', () => {
  const sim = new Simulation();
  const renderer = sceneRenderer();
  for (const [sync, cache, field] of [
    ['syncAnts', 'antMeshes', 'ants'],
    ['syncColonyObjects', 'objectMeshes', 'colonyObjects'],
    ['syncSurfaceEntities', 'surfaceMeshes', 'surfaceEntities'],
  ]) {
    renderer[sync](sim, 0);
    const entities = (sim as any)[field];
    const old = renderer[cache].get(entities[0].id);
    (sim as any)[field] = [{ ...entities[0] }];
    renderer[sync](sim, 0);
    expect(renderer[cache].size).toBe(1);
    expect(renderer[cache].get(entities[0].id) === old).toBe(false);
    expect(old.parent).toBeNull();
  }
});

test('names and imported descriptions are escaped in HTML and attribute contexts', () => {
  const sim = new Simulation();
  const ui = Object.create(UIManager.prototype) as any;
  ui.sim = sim;
  const pane = { innerHTML: '' };
  const previousDocument = globalThis.document;
  globalThis.document = { getElementById: () => pane } as any;
  try {
    const payload = '\"><img src=x onerror=alert(1)>';
    sim.ants[1].name = payload;
    ui.updateRelationshipsTab(sim.ants[0]);
    expect(pane.innerHTML).not.toContain('<img');
    expect(pane.innerHTML).toContain('&quot;&gt;&lt;img');
    sim.ants[0].memories[0].description = payload;
    sim.ants[0].memories[0].title = payload;
    ui.updateBioAndSkillsTab(sim.ants[0]);
    expect(pane.innerHTML).not.toContain('<img');
    expect(pane.innerHTML).toContain('title="&quot;&gt;&lt;img');
    sim.ants[0].wants[0].name = payload;
    sim.ants[0].wants[0].icon = payload;
    ui.updateWantsFearsTab(sim.ants[0]);
    expect(pane.innerHTML).not.toContain('<img');
    expect(pane.innerHTML).toContain('&quot;&gt;&lt;img');
  } finally {
    globalThis.document = previousDocument;
  }
});

test('excavated tiles dispose their geometry and material', () => {
  const sim = new Simulation();
  const renderer = sceneRenderer();
  renderer.syncWorldGrid(sim);
  const tile = renderer.tileMeshes.get('0_11');
  const disposeGeometry = spyOn(tile.geometry, 'dispose');
  const disposeMaterial = spyOn(tile.material, 'dispose');
  sim.instantDigTile(0, 11);
  renderer.syncWorldGrid(sim);
  expect(renderer.tileMeshes.has('0_11')).toBe(false);
  expect(disposeGeometry).toHaveBeenCalledTimes(1);
  expect(disposeMaterial).toHaveBeenCalledTimes(1);
});

test('action cards survive frame updates so a pending click can cancel the action', () => {
  const sim = controlledColony();
  const ant = sim.ants[0];
  sim.queueWalkToCoord(ant, ant.x + 200, ant.y, () => {});
  const ui = Object.create(UIManager.prototype) as any;
  ui.sim = sim;
  const cards: any[] = [];
  const bar = { style: { width: '' } };
  const list = { dataset: {}, innerHTML: '', appendChild: (card: any) => cards.push(card), querySelector: () => bar };
  const previousDocument = globalThis.document;
  globalThis.document = {
    getElementById: () => list,
    createElement: () => {
      const card = { onClick: null, addEventListener: (_: string, callback: any) => { card.onClick = callback; } };
      return card;
    },
  } as any;
  try {
    ui.updateActionQueue(ant);
    sim.update(0.1);
    ui.updateActionQueue(ant);
    expect(cards).toHaveLength(1);
    cards[0].onClick({ stopPropagation() {} });
    expect(ant.actionQueue).toHaveLength(0);
    expect(ant.vx).toBe(0);
  } finally {
    globalThis.document = previousDocument;
  }
});

function tunnelMaze() {
  const sim = controlledColony();
  sim.colonyObjects = [];
  sim.carveRect(0, 0, GRID_COLS, GRID_ROWS, 'soil');
  sim.carveRect(5, 12, 1, 5, 'tunnel');
  sim.carveRect(5, 16, 7, 1, 'tunnel');
  sim.carveRect(11, 12, 1, 5, 'tunnel');
  sim.ants[0].x = 5.5 * TILE_SIZE;
  sim.ants[0].y = 12.5 * TILE_SIZE;
  return sim;
}

test('ants take a connected detour instead of crossing a wall, even at 4x speed', () => {
  const sim = tunnelMaze();
  const ant = sim.ants[0];
  sim.state.timeScale = 4;
  let arrived = false;
  sim.queueWalkToCoord(ant, 11.5 * TILE_SIZE, 12.5 * TILE_SIZE, () => { arrived = true; });
  for (let i = 0; i < 60; i++) {
    sim.update(0.1);
    expect(sim.isWalkable(Math.floor(ant.x / TILE_SIZE), Math.floor(ant.y / TILE_SIZE))).toBe(true);
  }
  expect(arrived).toBe(true);
  expect(ant.x).toBe(11.5 * TILE_SIZE);
  expect(ant.y).toBe(12.5 * TILE_SIZE);
});

test('disconnected destinations and diagonal corners fail without arrival effects or leaked reservations', () => {
  const sim = tunnelMaze();
  const ant = sim.ants[0];
  sim.carveRect(6, 11, 1, 1, 'tunnel');
  expect(sim.findPath(ant.x, ant.y, 6.5 * TILE_SIZE, 11.5 * TILE_SIZE)).toBeNull();
  const bed = { id: 'isolated', type: 'moss_mattress', x: 20 * TILE_SIZE, y: 12 * TILE_SIZE, z: 0,
    width: 64, height: 32, depth: 32, stateValue: 0, occupiedByAntId: ant.id };
  sim.colonyObjects.push(bed);
  sim.carveRect(20, 12, 2, 1, 'tunnel');
  let arrived = false;
  const position = [ant.x, ant.y];
  sim.queueWalkToObject(ant, bed, () => { arrived = true; });
  advance(sim, 1);
  expect(arrived).toBe(false);
  expect([ant.x, ant.y]).toEqual(position);
  expect(ant.actionQueue).toHaveLength(0);
  expect(bed.occupiedByAntId).toBeUndefined();
  expect(ant.stateText).toContain('No route');
});

test('walks plan from the position at execution time and reject newly blocked routes', () => {
  const sim = tunnelMaze();
  const ant = sim.ants[0];
  let arrivals = 0;
  sim.queueWalkToCoord(ant, 11.5 * TILE_SIZE, 12.5 * TILE_SIZE, () => { arrivals++; });
  sim.queueWalkToCoord(ant, 5.5 * TILE_SIZE, 12.5 * TILE_SIZE, () => { arrivals++; });
  advance(sim, 18);
  expect(arrivals).toBe(2);
  expect(ant.x).toBe(5.5 * TILE_SIZE);
  sim.queueWalkToCoord(ant, 11.5 * TILE_SIZE, 12.5 * TILE_SIZE, () => { arrivals++; });
  sim.update(0.1);
  sim.grid[16][8].type = 'hard_rock';
  advance(sim, 10);
  expect(arrivals).toBe(2);
  expect(ant.actionQueue).toHaveLength(0);
});

test('initial chambers and the surface entrance are connected', () => {
  const sim = new Simulation();
  const worker = sim.ants[1];
  for (const ant of sim.ants) {
    expect(sim.findPath(worker.x, worker.y, ant.x, ant.y)).not.toBeNull();
  }
  const melon = sim.surfaceEntities[0];
  const path = sim.findPath(worker.x, worker.y, melon.x, melon.y)!;
  expect(path.some(p => Math.floor(p.y / TILE_SIZE) === 10 && Math.floor(p.x / TILE_SIZE) === 24)).toBe(true);
});

test('digging requires a reachable edge and rewards excavation only once', () => {
  const sim = tunnelMaze();
  const ant = sim.ants[0];
  ant.wants = [];
  const funds = sim.state.pollenPoints;
  expect(sim.executeDigAction(ant, 20, 20)).toBe(false);
  expect(sim.executeDigAction(ant, 6, 16)).toBe(false); // Already open.
  expect(sim.executeDigAction(ant, 6, 15)).toBe(true);
  sim.update(0.1);
  expect(sim.grid[15][6].type).toBe('soil');
  expect(ant.isDigging).toBe(false);
  advance(sim, 8);
  expect(sim.grid[15][6].type).toBe('tunnel');
  expect(sim.state.pollenPoints).toBe(funds + 8);
  expect(sim.executeDigAction(ant, 6, 15)).toBe(false);
  expect(sim.state.pollenPoints).toBe(funds + 8);
});

test('placement checks the whole footprint, bounds, and overlaps without charging for failures', () => {
  const sim = controlledColony();
  sim.state.pollenPoints = 1000;
  const count = sim.colonyObjects.length;
  const invalid = [[0, 11], [49, 16], [20, 35], [20, 9], [21, 18], [NaN, 16], [20.5, 16]];
  for (const [col, row] of invalid) expect(sim.buyObject('moss_mattress', col, row)).toBe(false);
  sim.grid[16][21].type = 'hard_rock';
  expect(sim.buyObject('moss_mattress', 20, 16)).toBe(false);
  expect(sim.colonyObjects).toHaveLength(count);
  expect(sim.state.pollenPoints).toBe(1000);
  sim.instantDigTile(21, 16);
  expect(sim.buyObject('moss_mattress', 20, 16)).toBe(true);
  expect(sim.buyObject('moss_mattress', 22, 16)).toBe(true); // Touching edges is allowed.
  expect(sim.state.pollenPoints).toBe(1005 - 85 * 2);
});

test('moving preserves identity, contents, funds, and the original position on invalid drops', () => {
  const sim = controlledColony();
  const obj = sim.colonyObjects.find(o => o.type === 'sugar_pantry')!;
  const original = { ...obj };
  const funds = sim.state.pollenPoints;
  expect(sim.moveObject(obj.id, 0, 11)).toBe(false);
  expect(obj).toEqual(original);
  expect(sim.moveObject(obj.id, 20, 16)).toBe(true);
  expect(obj.id).toBe(original.id);
  expect(obj.stateValue).toBe(original.stateValue);
  expect([obj.x, obj.y]).toEqual([20 * TILE_SIZE, 16 * TILE_SIZE]);
  expect(sim.state.pollenPoints).toBe(funds);
  expect(sim.moveObject(obj.id, 20, 16)).toBe(true); // Ignore its own footprint.
  sim.deserialize(JSON.parse(sim.exportSaveJSON()));
  expect(sim.colonyObjects.find(o => o.id === obj.id)?.x).toBe(obj.x);
});

test('occupied and queued furniture cannot be moved', () => {
  const sim = controlledColony();
  const ant = sim.ants[0];
  const bed = sim.colonyObjects.find(o => o.type === 'moss_mattress')!;
  sim.queueWalkToObject(ant, bed, () => {});
  expect(sim.moveObject(bed.id, 20, 16)).toBe(false);
  sim.cancelAction(ant, 0);
  bed.occupiedByAntId = ant.id;
  expect(sim.moveObject(bed.id, 20, 16)).toBe(false);
  bed.occupiedByAntId = undefined;
  expect(sim.moveObject(bed.id, 20, 16)).toBe(true);
});

test('moving furniture updates the existing 3D model rather than leaving it behind', () => {
  const sim = controlledColony();
  const renderer = sceneRenderer();
  renderer.syncColonyObjects(sim);
  const obj = sim.colonyObjects[0];
  const model = renderer.objectMeshes.get(obj.id);
  expect(sim.moveObject(obj.id, 20, 16)).toBe(true);
  renderer.syncColonyObjects(sim);
  expect(renderer.objectMeshes.get(obj.id) === model).toBe(true);
  expect(model.position.x).toBe(obj.x + obj.width / 2);
  expect(model.position.y).toBe(-(obj.y + obj.height / 2));
});

test('the move tool keeps selection on invalid drops and supports cancel and a free valid drop', () => {
  const sim = controlledColony();
  const ui = Object.create(UIManager.prototype) as any;
  Object.assign(ui, { sim, activeMode: 'Build', buildTool: 'Move', selectedObjectId: null, selectedCatalogItem: null });
  const messages: string[] = [];
  ui.showNotification = (message: string) => messages.push(message);
  const obj = sim.colonyObjects[0];
  const original = { ...obj };
  const funds = sim.state.pollenPoints;
  ui.handlePlacementClick(obj.x + 16, obj.y + 16);
  expect(ui.selectedObjectId).toBe(obj.id);
  ui.handlePlacementClick(16, 11.5 * TILE_SIZE);
  expect(obj).toEqual(original);
  expect(ui.selectedObjectId).toBe(obj.id);
  expect(messages.at(-1)).toContain('Excavate');
  expect(ui.cancelPlacement()).toBe(true);
  expect(obj).toEqual(original);
  expect(ui.selectedObjectId).toBeNull();
  ui.handlePlacementClick(obj.x + 16, obj.y + 16);
  ui.handlePlacementClick(20.5 * TILE_SIZE, 16.5 * TILE_SIZE);
  expect(ui.selectedObjectId).toBeNull();
  expect(obj.x).toBe(20 * TILE_SIZE);
  expect(obj.y).toBe(16 * TILE_SIZE);
  expect(sim.state.pollenPoints).toBe(funds);
});

test('buy previews use the same validation as placement and clear on cancel', () => {
  const sim = controlledColony();
  const renderer = sceneRenderer();
  const ui = Object.create(UIManager.prototype) as any;
  Object.assign(ui, { sim, renderer, activeMode: 'Buy', selectedCatalogItem: 'moss_mattress', selectedObjectId: null });
  const status = { innerText: '' };
  const previousDocument = globalThis.document;
  globalThis.document = { getElementById: () => status } as any;
  try {
    sim.highlightedTile = { col: 20, row: 16 };
    ui.updatePlacementPreview();
    const preview = renderer.placementPreview;
    expect(preview.visible).toBe(true);
    expect(preview.material.color.getHex()).toBe(0x65d98b);
    expect(preview.scale.x).toBe(64);
    sim.highlightedTile = { col: 49, row: 16 };
    ui.updatePlacementPreview();
    expect(preview.material.color.getHex()).toBe(0xf06456);
    expect(status.innerText).toContain('whole item');
    ui.cancelPlacement();
    expect(preview.visible).toBe(false);
  } finally {
    globalThis.document = previousDocument;
  }
});
