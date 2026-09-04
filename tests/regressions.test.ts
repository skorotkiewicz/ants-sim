import { afterAll, expect, spyOn, test } from 'bun:test';
import * as THREE from 'three';
import { audio } from '../src/audio';
import { CATALOG } from '../src/catalog';
import { Renderer3D } from '../src/renderer3d';
import { Simulation } from '../src/simulation';
import { UIManager } from '../src/ui';
import { GRID_COLS, TILE_SIZE } from '../src/types';

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
  const ant = sim.ants[0];
  ant.x = TILE_SIZE;
  let arrived = false;
  sim.queueWalkToCoord(ant, -100, ant.y, () => { arrived = true; });
  advance(sim, 1);
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
