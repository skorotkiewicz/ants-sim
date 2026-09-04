// ==========================================
// THE SIMS 2: ANT COLONY 3D WEBGL RENDERER
// Three.js 3D Dollhouse Anthill, 3D Plumbob & Ants
// ==========================================

import * as THREE from 'three';
import type { AntSim, CameraPreset } from './types';
import { GRID_COLS, GRID_ROWS, SURFACE_ROW, TILE_SIZE } from './types';
import { Simulation } from './simulation';

export class Renderer3D {
  public canvas: HTMLCanvasElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  // Camera Navigation
  public targetPos: THREE.Vector3;
  public cameraAngleX: number = 0;      // Yaw (horizontal)
  public cameraAngleY: number = 0.2;    // Pitch (vertical)
  public cameraDistance: number = 750;
  public currentPreset: CameraPreset = 'Dollhouse';

  // Scene Objects
  private antMeshes: Map<string, THREE.Group> = new Map();
  private objectMeshes: Map<string, THREE.Group> = new Map();
  private surfaceMeshes: Map<string, THREE.Group> = new Map();
  private broodMeshes: Map<string, THREE.Group> = new Map();
  private tileMeshes: Map<string, THREE.Mesh> = new Map();

  // Plumbob
  private plumbobMesh: THREE.Group;
  private plumbobLight: THREE.PointLight;
  private plumbobMatTop: THREE.MeshStandardMaterial;
  private plumbobMatBottom: THREE.MeshStandardMaterial;

  // Lighting
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;

  // Animation Timer
  private animTimer: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.targetPos = new THREE.Vector3((GRID_COLS * TILE_SIZE) / 2, -(18 * TILE_SIZE), 0);

    // 1. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Scene Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#102238');

    // 3. Camera Setup
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 10, 4000);
    this.updateCameraPosition();

    // 4. Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    this.sunLight.position.set(400, 800, 500);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 50;
    this.sunLight.shadow.camera.far = 2500;
    const d = 1000;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    // 5. 3D Plumbob
    const plumbobData = this.createPlumbob();
    this.plumbobMesh = plumbobData.group;
    this.plumbobLight = plumbobData.light;
    this.plumbobMatTop = plumbobData.matTop;
    this.plumbobMatBottom = plumbobData.matBottom;
    this.scene.add(this.plumbobMesh);

    // 6. Ground & Anthill Environment
    this.buildStaticEnvironment();
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public setPreset(preset: CameraPreset) {
    this.currentPreset = preset;
    if (preset === 'Dollhouse') {
      this.cameraAngleX = 0;
      this.cameraAngleY = 0.05;
      this.cameraDistance = 750;
    } else if (preset === 'Isometric') {
      this.cameraAngleX = 0.45;
      this.cameraAngleY = 0.4;
      this.cameraDistance = 850;
    } else if (preset === 'Surface') {
      this.cameraAngleX = 0;
      this.cameraAngleY = 0.55;
      this.cameraDistance = 500;
    }
  }

  public updateCameraPosition(targetOverride?: THREE.Vector3) {
    const target = targetOverride || this.targetPos;

    const cosY = Math.cos(this.cameraAngleY);
    const sinY = Math.sin(this.cameraAngleY);
    const cosX = Math.cos(this.cameraAngleX);
    const sinX = Math.sin(this.cameraAngleX);

    const cx = target.x + this.cameraDistance * cosY * sinX;
    const cy = target.y + this.cameraDistance * sinY;
    const cz = target.z + this.cameraDistance * cosY * cosX;

    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(target);
  }

  // ==========================================
  // ENVIRONMENT & ANTHILL DOLLHOUSE
  // ==========================================

  private buildStaticEnvironment() {
    const worldW = GRID_COLS * TILE_SIZE;
    const worldH = GRID_ROWS * TILE_SIZE;
    const surfaceY = -(SURFACE_ROW * TILE_SIZE);

    // 1. Surface Grass Lawn Plane
    const lawnGeo = new THREE.BoxGeometry(worldW * 1.5, 12, 400);
    const lawnMat = new THREE.MeshStandardMaterial({
      color: 0x489b2c,
      roughness: 0.8,
      metalness: 0.1,
    });
    const lawn = new THREE.Mesh(lawnGeo, lawnMat);
    lawn.position.set(worldW / 2, surfaceY - 6, 0);
    lawn.receiveShadow = true;
    this.scene.add(lawn);

    // 2. Picnic Blanket (3D Checkered Sheet)
    const blanketW = 20 * TILE_SIZE;
    const blanketGeo = new THREE.BoxGeometry(blanketW, 2, 160);
    const blanketMat = new THREE.MeshStandardMaterial({
      color: 0xc72b2b,
      roughness: 0.9,
    });
    const blanket = new THREE.Mesh(blanketGeo, blanketMat);
    blanket.position.set(24 * TILE_SIZE, surfaceY + 1, 0);
    blanket.receiveShadow = true;
    this.scene.add(blanket);

    // 3. Underground Cutaway Back Wall
    const backWallGeo = new THREE.BoxGeometry(worldW, worldH, 20);
    const backWallMat = new THREE.MeshStandardMaterial({
      color: 0x24150b,
      roughness: 0.95,
      metalness: 0.05,
    });
    const backWall = new THREE.Mesh(backWallGeo, backWallMat);
    backWall.position.set(worldW / 2, -(worldH / 2), -30);
    backWall.receiveShadow = true;
    this.scene.add(backWall);
  }

  // ==========================================
  // 3D PLUMBOB (THE SIMS 2 CRYSTAL)
  // ==========================================

  private createPlumbob(): {
    group: THREE.Group;
    light: THREE.PointLight;
    matTop: THREE.MeshStandardMaterial;
    matBottom: THREE.MeshStandardMaterial;
  } {
    const group = new THREE.Group();

    // Top Pyramid
    const topGeo = new THREE.ConeGeometry(8, 14, 6, 1);
    const matTop = new THREE.MeshStandardMaterial({
      color: 0x1ce35d,
      roughness: 0.15,
      metalness: 0.2,
      emissive: 0x1ce35d,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.92,
      flatShading: true,
    });
    const topMesh = new THREE.Mesh(topGeo, matTop);
    topMesh.position.y = 7;
    group.add(topMesh);

    // Bottom Inverted Pyramid
    const bottomGeo = new THREE.ConeGeometry(8, 14, 6, 1);
    const matBottom = new THREE.MeshStandardMaterial({
      color: 0x12a843,
      roughness: 0.2,
      metalness: 0.2,
      emissive: 0x12a843,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.92,
      flatShading: true,
    });
    const bottomMesh = new THREE.Mesh(bottomGeo, matBottom);
    bottomMesh.position.y = -7;
    bottomMesh.rotation.x = Math.PI;
    group.add(bottomMesh);

    // Colored Point Light
    const light = new THREE.PointLight(0x1ce35d, 1.2, 120);
    group.add(light);

    group.scale.set(1.2, 1.2, 1.2);
    return { group, light, matTop, matBottom };
  }

  // ==========================================
  // RENDER FRAME
  // ==========================================

  public render(sim: Simulation, dt: number) {
    this.animTimer += dt;

    // Day / Night Sun Lighting & Colors
    this.updateLighting(sim);

    // Sync World Grid
    this.syncWorldGrid(sim);

    // Sync Surface Entities (Watermelon, Donut, Sugar)
    this.syncSurfaceEntities(sim);

    // Sync Colony Objects
    this.syncColonyObjects(sim, dt);

    // Sync Brood (Eggs & Larvae)
    this.syncBrood(sim);

    // Sync Ants
    this.syncAnts(sim, dt);

    // Update Plumbob
    this.updatePlumbob(sim, dt);

    // Follow Selected Ant camera if in Follow mode
    const sel = sim.getSelectedAnt();
    if (this.currentPreset === 'Follow' && sel) {
      const antPos = new THREE.Vector3(sel.x, -sel.y, sel.z);
      this.targetPos.lerp(antPos, 0.08);
      this.updateCameraPosition();
    } else {
      this.updateCameraPosition();
    }

    this.renderer.render(this.scene, this.camera);
  }

  private updateLighting(sim: Simulation) {
    const t = sim.state.timeOfDay;
    let skyColor = new THREE.Color('#5eaefc');
    let sunIntensity = 1.2;

    if (t < 6 || t > 20) {
      skyColor = new THREE.Color('#0a1628');
      sunIntensity = 0.25;
      this.ambientLight.intensity = 0.35;
    } else if (t < 8) {
      skyColor = new THREE.Color('#e07a5f');
      sunIntensity = 0.8;
      this.ambientLight.intensity = 0.55;
    } else if (t > 18) {
      skyColor = new THREE.Color('#a44e5d');
      sunIntensity = 0.75;
      this.ambientLight.intensity = 0.55;
    } else {
      skyColor = new THREE.Color('#64b5f6');
      sunIntensity = 1.3;
      this.ambientLight.intensity = 0.75;
    }

    this.scene.background = skyColor;
    this.sunLight.intensity = sunIntensity;
  }

  // ==========================================
  // 3D ANTHILL GRID VOXELS
  // ==========================================

  private removeModel(model: THREE.Object3D) {
    model.removeFromParent();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    model.traverse(child => {
      if (child instanceof THREE.Mesh) {
        geometries.add(child.geometry);
        for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
          materials.add(material);
        }
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
  }

  private pruneModels<T extends { id: string; stage?: string }>(models: Map<string, THREE.Group>, entities: T[]) {
    const current = new Map(entities.map(entity => [entity.id, entity]));
    for (const [id, model] of models) {
      const entity = current.get(id);
      if (!entity || model.userData.entity !== entity || model.userData.stage !== entity.stage) {
        this.removeModel(model);
        models.delete(id);
      }
    }
  }

  private syncWorldGrid(sim: Simulation) {
    for (let r = SURFACE_ROW; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const tile = sim.grid[r][c];
        const key = `${c}_${r}`;
        let mesh = this.tileMeshes.get(key);

        const isSolid = tile.type === 'soil' || tile.type === 'hard_rock';

        if (isSolid) {
          if (!mesh) {
            const geo = new THREE.BoxGeometry(TILE_SIZE, TILE_SIZE, 30);
            const color = tile.type === 'hard_rock' ? 0x4f5257 : 0x5a3920;
            const mat = new THREE.MeshStandardMaterial({
              color,
              roughness: 0.9,
            });
            mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(c * TILE_SIZE + TILE_SIZE / 2, -(r * TILE_SIZE + TILE_SIZE / 2), 0);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.tileMeshes.set(key, mesh);
          }

          (mesh.material as THREE.MeshStandardMaterial).color.setHex(tile.type === 'hard_rock' ? 0x4f5257 : 0x5a3920);

          // Blinking if marked for dig
          if (tile.markedForDig) {
            const blink = Math.sin(this.animTimer * 6) > 0;
            (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(blink ? 0xffeb3b : 0x000000);
            (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4;
          } else {
            (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
          }
        } else {
          // Excavated tunnel
          if (mesh) {
            this.removeModel(mesh);
            this.tileMeshes.delete(key);
          }
        }
      }
    }
  }

  // ==========================================
  // 3D SURFACE ENTITIES (WATERMELON, DONUT, SUGAR)
  // ==========================================

  private syncSurfaceEntities(sim: Simulation) {
    this.pruneModels(this.surfaceMeshes, sim.surfaceEntities);
    sim.surfaceEntities.forEach(ent => {
      let group = this.surfaceMeshes.get(ent.id);
      if (!group) {
        group = new THREE.Group();

        if (ent.type === 'watermelon') {
          // 3D Watermelon Wedge
          const wedgeGeo = new THREE.CylinderGeometry(28, 28, 18, 16, 1, false, 0, Math.PI);
          const wedgeMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.6 });
          const wedgeMesh = new THREE.Mesh(wedgeGeo, wedgeMat);
          wedgeMesh.rotation.z = Math.PI / 2;
          group.add(wedgeMesh);

          // Green Rind
          const rindGeo = new THREE.CylinderGeometry(29.5, 29.5, 18.2, 16, 1, true, 0, Math.PI);
          const rindMat = new THREE.MeshStandardMaterial({ color: 0x2d7a2f, roughness: 0.7 });
          const rindMesh = new THREE.Mesh(rindGeo, rindMat);
          rindMesh.rotation.z = Math.PI / 2;
          group.add(rindMesh);
        } else if (ent.type === 'donut') {
          // 3D Glazed Donut
          const torusGeo = new THREE.TorusGeometry(18, 9, 16, 32);
          const doughMat = new THREE.MeshStandardMaterial({ color: 0xd49b56, roughness: 0.8 });
          const torusMesh = new THREE.Mesh(torusGeo, doughMat);
          torusMesh.rotation.x = Math.PI / 2;
          group.add(torusMesh);

          // Pink Frosting
          const frostGeo = new THREE.TorusGeometry(18.2, 7.5, 16, 32);
          const frostMat = new THREE.MeshStandardMaterial({ color: 0xff70a6, roughness: 0.3 });
          const frostMesh = new THREE.Mesh(frostGeo, frostMat);
          frostMesh.rotation.x = Math.PI / 2;
          frostMesh.position.y = 2;
          group.add(frostMesh);
        } else if (ent.type === 'sugar_pile') {
          // 3D Sugar Crystals
          for (let i = 0; i < 6; i++) {
            const cubeGeo = new THREE.BoxGeometry(10, 10, 10);
            const cubeMat = new THREE.MeshStandardMaterial({
              color: 0xffffff,
              roughness: 0.2,
              metalness: 0.1,
            });
            const cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);
            cubeMesh.position.set((Math.random() - 0.5) * 20, Math.random() * 8, (Math.random() - 0.5) * 20);
            cubeMesh.rotation.set(Math.random(), Math.random(), Math.random());
            group.add(cubeMesh);
          }
        } else if (ent.type === 'aphid') {
          // 3D Cute Green Aphid
          const aphidGeo = new THREE.SphereGeometry(10, 12, 12);
          aphidGeo.scale(1.2, 0.9, 0.9);
          const aphidMat = new THREE.MeshStandardMaterial({ color: 0x70c040, roughness: 0.5 });
          const aphidMesh = new THREE.Mesh(aphidGeo, aphidMat);
          group.add(aphidMesh);

          // Golden Honeydew drop
          const honeyGeo = new THREE.SphereGeometry(4, 8, 8);
          const honeyMat = new THREE.MeshStandardMaterial({
            color: 0xffdf60,
            roughness: 0.1,
            emissive: 0xffbe0b,
            emissiveIntensity: 0.3,
          });
          const honeyMesh = new THREE.Mesh(honeyGeo, honeyMat);
          honeyMesh.position.set(-2, 7, 0);
          group.add(honeyMesh);
        } else if (ent.type === 'flower') {
          const stemHeight = SURFACE_ROW * TILE_SIZE - ent.y - 16;
          const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, stemHeight, 8),
            new THREE.MeshStandardMaterial({ color: 0x387820 })
          );
          stem.position.set(ent.width / 2, -16 - stemHeight / 2, 0);
          group.add(stem);
          const petalGeo = new THREE.SphereGeometry(1, 10, 8);
          const petalMat = new THREE.MeshStandardMaterial({ color: 0xfdb813 });
          for (let i = 0; i < 8; i++) {
            const angle = i * Math.PI / 4;
            const petal = new THREE.Mesh(petalGeo, petalMat);
            petal.scale.set(8, 5, 3);
            petal.rotation.z = angle;
            petal.position.set(ent.width / 2 + Math.cos(angle) * 12, -16 + Math.sin(angle) * 12, 0);
            group.add(petal);
          }
          const center = new THREE.Mesh(
            new THREE.SphereGeometry(7, 12, 8),
            new THREE.MeshStandardMaterial({ color: 0x5c3818 })
          );
          center.scale.z = 0.6;
          center.position.set(ent.width / 2, -16, 3);
          group.add(center);
        }

        group.userData.entity = ent;
        group.position.set(ent.x, -ent.y, ent.z);
        this.scene.add(group);
        this.surfaceMeshes.set(ent.id, group);
      }
    });
  }

  // ==========================================
  // 3D COLONY OBJECTS (FURNITURE)
  // ==========================================

  private syncColonyObjects(sim: Simulation, dt: number = 0) {
    this.pruneModels(this.objectMeshes, sim.colonyObjects);
    sim.colonyObjects.forEach(obj => {
      if (!this.objectMeshes.has(obj.id)) {
        const group = new THREE.Group();
        const addPart = (geometry: THREE.BufferGeometry, material: number | THREE.MeshStandardMaterial, x = 0, y = 0, z = 0) => {
          const mesh = new THREE.Mesh(geometry, typeof material === 'number'
            ? new THREE.MeshStandardMaterial({ color: material, roughness: 0.7 })
            : material);
          mesh.position.set(x, y, z);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          group.add(mesh);
          return mesh;
        };

        if (obj.type === 'leaf_hammock') {
          // Curved green hammock leaf
          const leafGeo = new THREE.CylinderGeometry(20, 20, obj.width, 16, 1, true, 0, Math.PI);
          const leafMat = new THREE.MeshStandardMaterial({ color: 0x4c9b2b, side: THREE.DoubleSide });
          const leaf = new THREE.Mesh(leafGeo, leafMat);
          leaf.rotation.z = Math.PI / 2;
          leaf.position.y = -10;
          group.add(leaf);
        } else if (obj.type === 'moss_mattress') {
          addPart(new THREE.BoxGeometry(obj.width - 8, 12, obj.depth - 4), 0x397a2e, 0, -6);
          for (const x of [-18, 0, 18]) {
            const tuft = addPart(new THREE.SphereGeometry(1, 12, 8), 0x529b35, x, 0);
            tuft.scale.set(12, 6, 12);
          }
          const pillow = addPart(new THREE.SphereGeometry(1, 12, 8), 0xf2a7b5, -18, 6);
          pillow.scale.set(9, 4, 11);
        } else if (obj.type === 'royal_petal_cushion') {
          addPart(new THREE.BoxGeometry(obj.width - 6, 8, obj.depth - 4), 0xb88732, 0, -10);
          addPart(new THREE.BoxGeometry(obj.width - 10, 22, 6), 0x9a244a, 0, 0, -10);
          for (const x of [-18, 0, 18]) {
            const petal = addPart(new THREE.SphereGeometry(1, 12, 8), 0xd96278, x, -2, 3);
            petal.scale.set(12, 7, 11);
          }
        } else if (obj.type === 'fungus_garden') {
          addPart(new THREE.BoxGeometry(obj.width - 4, 12, obj.depth), 0x654321, 0, -24);
          addPart(new THREE.BoxGeometry(obj.width - 10, 4, obj.depth - 6), 0x4c7c34, 0, -16);
          for (const x of [-28, 0, 28]) {
            addPart(new THREE.CylinderGeometry(3, 4, 18, 8), 0xf0ebd8, x, -5);
            addPart(new THREE.SphereGeometry(11, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xe63946, x, 4);
            addPart(new THREE.SphereGeometry(2, 8, 6), 0xf0ebd8, x, 9, 8);
          }
        } else if (obj.type === 'aphid_pen') {
          addPart(new THREE.BoxGeometry(obj.width - 4, 6, obj.depth), 0x4c7c34, 0, -28);
          for (const z of [-12, 12]) {
            addPart(new THREE.BoxGeometry(obj.width - 6, 4, 3), 0xb58b52, 0, -12, z);
            for (const x of [-obj.width / 2 + 6, obj.width / 2 - 6]) {
              addPart(new THREE.CylinderGeometry(2, 2, 24, 8), 0x8b5a2b, x, -16, z);
            }
          }
          for (const x of [-22, 18]) {
            const aphid = addPart(new THREE.SphereGeometry(8, 12, 8), 0x70c040, x, -15);
            aphid.scale.x = 1.4;
            addPart(new THREE.SphereGeometry(2, 8, 6), 0x111111, x + 6, -12, 6);
            addPart(new THREE.SphereGeometry(4, 8, 6), 0xffdf60, x - 5, -3);
          }
        } else if (obj.type === 'pebble_table') {
          addPart(new THREE.BoxGeometry(obj.width - 4, 5, obj.depth - 4), 0x8b5a2b, 0, -2);
          for (const x of [-22, 22]) {
            addPart(new THREE.BoxGeometry(6, 12, 20), 0x654321, x, -10);
          }
          for (const z of [-8, 0, 8]) {
            addPart(new THREE.ConeGeometry(3, 8, 8), 0xd4a373, 20, 4, z);
          }
          addPart(new THREE.SphereGeometry(5, 12, 8), 0x697a80, -16, 5);
          addPart(new THREE.SphereGeometry(4, 12, 8), 0xc0b3a0, -5, 4, 6);
        } else if (obj.type === 'dewdrop_mirror') {
          addPart(new THREE.CylinderGeometry(12, 14, 6, 12), 0x8b5a2b, 0, -28);
          addPart(new THREE.CylinderGeometry(3, 4, 25, 8), 0xb88732, 0, -14);
          const rim = addPart(new THREE.TorusGeometry(12, 2, 8, 24), 0xd4a373, 0, 10);
          rim.scale.y = 1.4;
          const drop = addPart(new THREE.SphereGeometry(12, 16, 12), 0xbce8ee, 0, 10);
          drop.scale.set(1, 1.4, 0.4);
          drop.material.roughness = 0.1;
          drop.material.metalness = 0.3;
          const glint = addPart(new THREE.SphereGeometry(2, 8, 6), 0xffffff, -4, 16, 4);
          glint.scale.y = 2;
        } else if (obj.type === 'snail_shell_arch') {
          const radius = obj.width * 0.38;
          addPart(new THREE.TorusGeometry(radius, 7, 10, 32, Math.PI), 0xd4a373, 0, -24);
          for (const x of [-radius, radius]) {
            addPart(new THREE.CylinderGeometry(9, 11, 8, 12), 0xb58b52, x, -28);
          }
          for (const ring of [9, 5, 2]) {
            addPart(new THREE.TorusGeometry(ring, 1.5, 6, 20), 0x8b5a2b, 0, radius - 24, 7);
          }
        } else if (obj.type === 'sugar_pantry') {
          // Wooden Trough
          const troughGeo = new THREE.BoxGeometry(obj.width, 16, 24);
          const troughMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
          const trough = new THREE.Mesh(troughGeo, troughMat);
          group.add(trough);

          // Sugar pile inside
          const sugarGeo = new THREE.BoxGeometry(obj.width - 4, 10, 20);
          const sugarMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
          const sugar = new THREE.Mesh(sugarGeo, sugarMat);
          sugar.position.y = 5;
          group.add(sugar);
        } else if (obj.type === 'spore_radio') {
          const brass = new THREE.MeshStandardMaterial({ color: 0xd9ae55, metalness: 0.65, roughness: 0.3, side: THREE.DoubleSide });

          // Walnut cabinet, stepped trim, feet, and a slatted front grille.
          addPart(new THREE.BoxGeometry(38, 12, 24), 0x704022, -8, -8, -2);
          for (const y of [-14, -2]) {
            addPart(new THREE.BoxGeometry(41, 2, 27), 0xa16b38, -8, y, -2);
            addPart(new THREE.BoxGeometry(39, 0.6, 0.6), brass, -8, y, 11.6);
          }
          for (const x of [-23, 7]) {
            for (const z of [-10, 7]) addPart(new THREE.SphereGeometry(2, 8, 6), 0x482919, x, -15, z);
          }
          addPart(new THREE.BoxGeometry(20, 7, 1), 0x291b13, -12, -8, 10.5);
          for (const y of [-10, -8, -6]) {
            addPart(new THREE.BoxGeometry(18, 0.7, 1), brass, -12, y, 11.2);
          }
          const knob = addPart(new THREE.CylinderGeometry(2, 2, 2, 12), brass, 4, -9, 11);
          knob.rotation.x = Math.PI / 2;
          const light = addPart(new THREE.SphereGeometry(1.2, 8, 6), 0x74c98b, 4, -5, 11.5);
          light.name = 'radio-light';
          light.material.emissive.setHex(0x74c98b);

          // Vinyl, label, spindle, and an offset mark that makes rotation visible.
          addPart(new THREE.CylinderGeometry(11.5, 11.5, 1.5, 32), brass, -10, 0, 0);
          const record = addPart(new THREE.CylinderGeometry(11, 11, 0.6, 32), 0x171a18, -10, 1, 0);
          record.name = 'radio-record';
          const label = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.2, 20), new THREE.MeshStandardMaterial({ color: 0xe9d49a }));
          label.position.y = 0.4;
          record.add(label);
          const mark = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 0.7), brass);
          mark.position.set(7, 0.4, 0);
          record.add(mark);
          addPart(new THREE.CylinderGeometry(0.6, 0.6, 1.5, 8), brass, -10, 1.8, 0);
          const tonearm = new THREE.CatmullRomCurve3([
            new THREE.Vector3(5, -1, -8), new THREE.Vector3(4, 4, -7),
            new THREE.Vector3(-2, 4, 1), new THREE.Vector3(-3, 2.2, 4),
          ]);
          addPart(new THREE.TubeGeometry(tonearm, 16, 0.7, 6, false), brass);
          addPart(new THREE.BoxGeometry(2, 1, 2), 0x482919, -3, 2.2, 4);

          // A connected, flared bell aimed toward the viewer, not an inverted cone.
          const throat = new THREE.Vector3(18, 4, -4);
          const pipe = new THREE.CatmullRomCurve3([
            new THREE.Vector3(7, -1, -9), new THREE.Vector3(13, 1, -9), throat,
          ]);
          addPart(new THREE.TubeGeometry(pipe, 16, 1.6, 8, false), brass);
          const direction = new THREE.Vector3(-0.45, 0.3, 1).normalize();
          const horn = addPart(new THREE.LatheGeometry([
            new THREE.Vector2(1.6, 0), new THREE.Vector2(2.2, 3),
            new THREE.Vector2(4.5, 7), new THREE.Vector2(7, 10), new THREE.Vector2(10, 12),
          ], 32), brass, throat.x, throat.y, throat.z);
          horn.name = 'radio-horn';
          horn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
          const mouth = throat.clone().addScaledVector(direction, 12);
          const rim = addPart(new THREE.TorusGeometry(10, 0.8, 8, 32), brass, mouth.x, mouth.y, mouth.z);
          rim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
        } else if (obj.type === 'queen_throne') {
          const gold = new THREE.MeshStandardMaterial({ color: 0xd9ae55, metalness: 0.6, roughness: 0.32 });
          const velvet = new THREE.MeshStandardMaterial({ color: 0x9f2936, roughness: 0.95 });

          // Two shallow steps and four legs leave open space under the seat.
          addPart(new THREE.BoxGeometry(84, 5, 32), 0x73462a, 0, -29);
          addPart(new THREE.BoxGeometry(74, 4, 28), gold, 0, -24.5);
          for (const x of [-28, 28]) {
            for (const z of [-10, 10]) {
              addPart(new THREE.CylinderGeometry(2.5, 4, 13, 10), gold, x, -17, z);
            }
          }
          addPart(new THREE.BoxGeometry(64, 5, 26), gold, 0, -11);
          const seat = addPart(new THREE.SphereGeometry(1, 24, 12), velvet, 0, -6, 1);
          seat.scale.set(29, 4, 12);
          seat.name = 'throne-seat';

          // Arched wood-and-gold frame with a separate padded backrest.
          const frame = new THREE.Shape();
          frame.moveTo(-27, -12);
          frame.lineTo(27, -12);
          frame.lineTo(27, 9);
          frame.quadraticCurveTo(27, 26, 0, 27);
          frame.quadraticCurveTo(-27, 26, -27, 9);
          frame.closePath();
          addPart(new THREE.ExtrudeGeometry(frame, {
            depth: 4, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 2,
          }), gold, 0, 0, -14);
          const padding = new THREE.Shape();
          padding.moveTo(-22, -8);
          padding.lineTo(22, -8);
          padding.lineTo(22, 9);
          padding.quadraticCurveTo(22, 21, 0, 22);
          padding.quadraticCurveTo(-22, 21, -22, 9);
          padding.closePath();
          const back = addPart(new THREE.ExtrudeGeometry(padding, {
            depth: 2, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 1.5, bevelSegments: 3,
          }), velvet, 0, 0, -9);
          back.name = 'throne-backrest';
          for (const x of [-12, 0, 12]) {
            addPart(new THREE.SphereGeometry(1.1, 8, 6), gold, x, x === 0 ? 13 : 5, -5.5);
          }

          // Padded armrests, front posts, and rounded sap finials.
          for (const x of [-32, 32]) {
            addPart(new THREE.CylinderGeometry(2, 3, 14, 10), gold, x, -6, 10);
            const rail = addPart(new THREE.CylinderGeometry(2.5, 2.5, 25, 12), gold, x, 1, 0);
            rail.rotation.x = Math.PI / 2;
            const arm = addPart(new THREE.SphereGeometry(1, 12, 8), velvet, x, 3, 0);
            arm.scale.set(3, 2.5, 10);
            addPart(new THREE.SphereGeometry(3.5, 12, 8), gold, x, 3, 12);
          }

          // A five-point crown, rather than a cone perched on a block.
          const crest = new THREE.Shape();
          crest.moveTo(-10, 0);
          for (const [x, y] of [[-12, 9], [-7, 5], [-6, 11], [-3, 7], [0, 14], [3, 7], [6, 11], [7, 5], [12, 9], [10, 0]]) {
            crest.lineTo(x, y);
          }
          crest.closePath();
          const crown = addPart(new THREE.ExtrudeGeometry(crest, {
            depth: 2, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 1,
          }), gold, 0, 22, -8);
          crown.name = 'throne-crown';
          addPart(new THREE.OctahedronGeometry(3), 0x36a07a, 0, 26, -4);
        } else if (obj.type === 'biolum_shroom') {
          // Glowing Mushroom
          const stemGeo = new THREE.CylinderGeometry(3, 4, 18);
          const stemMat = new THREE.MeshStandardMaterial({ color: 0xf0ebd8 });
          const stem = new THREE.Mesh(stemGeo, stemMat);
          group.add(stem);

          const capGeo = new THREE.SphereGeometry(12, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
          const capMat = new THREE.MeshStandardMaterial({
            color: 0x52b788,
            emissive: 0x52b788,
            emissiveIntensity: 0.6,
          });
          const cap = new THREE.Mesh(capGeo, capMat);
          cap.position.y = 9;
          group.add(cap);

          const shroomLight = new THREE.PointLight(0x52b788, 0.8, 100);
          shroomLight.position.y = 12;
          group.add(shroomLight);
        }

        group.userData.entity = obj;
        group.position.set(obj.x + obj.width / 2, -(obj.y + obj.height / 2), obj.z);
        this.scene.add(group);
        this.objectMeshes.set(obj.id, group);
      }
      if (obj.type === 'spore_radio') {
        const model = this.objectMeshes.get(obj.id)!;
        const record = model.getObjectByName('radio-record')!;
        if (obj.stateValue === 1 && sim.state.timeScale > 0) record.rotation.y += dt * 2;
        const light = model.getObjectByName('radio-light') as THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
        light.material.emissiveIntensity = obj.stateValue === 1 ? 0.8 : 0;
      }
    });
  }

  // ==========================================
  // 3D BROOD (EGGS & LARVAE)
  // ==========================================

  private syncBrood(sim: Simulation) {
    this.pruneModels(this.broodMeshes, sim.brood);
    sim.brood.forEach(b => {
      let group = this.broodMeshes.get(b.id);
      if (!group) {
        group = new THREE.Group();

        if (b.stage === 'egg') {
          const eggGeo = new THREE.SphereGeometry(5, 12, 12);
          eggGeo.scale(0.8, 1.2, 0.8);
          const eggMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.3,
            metalness: 0.1,
          });
          const egg = new THREE.Mesh(eggGeo, eggMat);
          group.add(egg);
        } else if (b.stage === 'larva') {
          const larvaGeo = new THREE.SphereGeometry(7, 12, 12);
          larvaGeo.scale(1.4, 0.9, 0.9);
          const larvaMat = new THREE.MeshStandardMaterial({ color: 0xfaf0ca, roughness: 0.6 });
          const larva = new THREE.Mesh(larvaGeo, larvaMat);
          group.add(larva);
        } else if (b.stage === 'pupa') {
          const pupaGeo = new THREE.SphereGeometry(6, 12, 12);
          pupaGeo.scale(0.9, 1.5, 0.9);
          const pupaMat = new THREE.MeshStandardMaterial({ color: 0xeae2b7, roughness: 0.8 });
          const pupa = new THREE.Mesh(pupaGeo, pupaMat);
          group.add(pupa);
        }

        group.userData.entity = b;
        group.userData.stage = b.stage;
        group.position.set(b.x, -b.y, b.z);
        this.scene.add(group);
        this.broodMeshes.set(b.id, group);
      }
    });
  }

  // ==========================================
  // 3D PROCEDURAL ANTS
  // ==========================================

  private syncAnts(sim: Simulation, dt: number) {
    this.pruneModels(this.antMeshes, sim.ants);
    sim.ants.forEach(ant => {
      let group = this.antMeshes.get(ant.id);
      if (!group) {
        group = this.buildAnt3DModel(ant);
        group.userData.entity = ant;
        this.scene.add(group);
        this.antMeshes.set(ant.id, group);
      }

      // Smooth position interpolation
      group.position.set(ant.x, -ant.y, ant.z);
      group.scale.set(ant.scale * ant.facing, ant.scale, ant.scale);

      // Walk cycle leg swinging
      this.animateAnt3DLegs(group, ant, dt);
    });
  }

  private buildAnt3DModel(ant: AntSim): THREE.Group {
    const group = new THREE.Group();
    const color = new THREE.Color(ant.color);

    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.25,
    });

    // 1. Abdomen (Gaster)
    const abdomenGeo = new THREE.SphereGeometry(10, 14, 14);
    const abW = ant.caste === 'Queen' ? 1.6 : 1.2;
    abdomenGeo.scale(abW, 0.9, 0.9);
    const abdomen = new THREE.Mesh(abdomenGeo, mat);
    abdomen.position.set(-14, 0, 0);
    abdomen.castShadow = true;
    group.add(abdomen);

    // 2. Petiole (Waist)
    const waistGeo = new THREE.CylinderGeometry(2, 2, 4);
    const waist = new THREE.Mesh(waistGeo, mat);
    waist.rotation.z = Math.PI / 2;
    waist.position.set(-4, 0, 0);
    group.add(waist);

    // 3. Thorax
    const thoraxGeo = new THREE.SphereGeometry(7, 12, 12);
    thoraxGeo.scale(1.1, 0.8, 0.8);
    const thorax = new THREE.Mesh(thoraxGeo, mat);
    thorax.position.set(3, 0, 0);
    thorax.castShadow = true;
    group.add(thorax);

    // 4. Head
    const headR = ant.caste === 'Soldier' ? 8 : 6.5;
    const headGeo = new THREE.SphereGeometry(headR, 14, 14);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.set(13, 0, 0);
    head.castShadow = true;
    group.add(head);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(2, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(15, 2, 4);
    group.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(15, 2, -4);
    group.add(eyeR);

    // Antennae
    const antGeo = new THREE.CylinderGeometry(0.6, 0.4, 14);
    const antL = new THREE.Mesh(antGeo, mat);
    antL.name = 'antenna_l';
    antL.position.set(17, 7, 3);
    antL.rotation.z = -Math.PI / 4;
    group.add(antL);

    const antR = new THREE.Mesh(antGeo, mat);
    antR.name = 'antenna_r';
    antR.position.set(17, 7, -3);
    antR.rotation.z = -Math.PI / 4;
    group.add(antR);

    // Caste Hat / Accessory
    if (ant.caste === 'Queen' || ant.accessory === 'crown') {
      const crownGeo = new THREE.ConeGeometry(5, 7, 5);
      const crownMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.set(13, 10, 0);
      group.add(crown);
    } else if (ant.accessory === 'hardhat') {
      const helmetGeo = new THREE.SphereGeometry(6, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const helmetMat = new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.3 });
      const helmet = new THREE.Mesh(helmetGeo, helmetMat);
      helmet.position.set(13, 3, 0);
      group.add(helmet);
    }

    // 6 Articulated 3D Legs
    const legGeo = new THREE.CylinderGeometry(0.8, 0.6, 14);
    const legOffsets = [-6, 2, 9];

    legOffsets.forEach((lx, idx) => {
      // Left Leg
      const legL = new THREE.Mesh(legGeo, mat);
      legL.name = `leg_l_${idx}`;
      legL.position.set(lx, -6, 6);
      legL.rotation.x = Math.PI / 4;
      group.add(legL);

      // Right Leg
      const legR = new THREE.Mesh(legGeo, mat);
      legR.name = `leg_r_${idx}`;
      legR.position.set(lx, -6, -6);
      legR.rotation.x = -Math.PI / 4;
      group.add(legR);
    });

    return group;
  }

  private animateAnt3DLegs(group: THREE.Group, ant: AntSim, _dt: number) {
    const isMoving = Math.hypot(ant.vx, ant.vy) > 0.05;
    const walk = ant.walkCycle;

    for (let idx = 0; idx < 3; idx++) {
      const legL = group.getObjectByName(`leg_l_${idx}`);
      const legR = group.getObjectByName(`leg_r_${idx}`);

      if (legL && legR) {
        if (isMoving) {
          const phase = walk + idx * 1.8;
          legL.rotation.z = Math.sin(phase) * 0.45;
          legR.rotation.z = -Math.sin(phase) * 0.45;
        } else {
          legL.rotation.z = 0;
          legR.rotation.z = 0;
        }
      }
    }

    // Antenna Twitching
    const antL = group.getObjectByName('antenna_l');
    const antR = group.getObjectByName('antenna_r');
    if (antL && antR) {
      const twitch = Math.sin(ant.antennaTwitch) * 0.15;
      antL.rotation.x = twitch;
      antR.rotation.x = -twitch;
    }
  }

  // ==========================================
  // 3D PLUMBOB UPDATE
  // ==========================================

  private updatePlumbob(sim: Simulation, dt: number) {
    const sel = sim.getSelectedAnt();
    if (!sel) {
      this.plumbobMesh.visible = false;
      return;
    }

    this.plumbobMesh.visible = true;
    this.plumbobMesh.position.set(sel.x, -sel.y + 36 + Math.sin(this.animTimer * 4) * 4, sel.z);
    this.plumbobMesh.rotation.y += dt * 3.5;

    // Plumbob Color logic
    const avgMotive = (sel.motives.hunger + sel.motives.energy + sel.motives.social + sel.motives.fun) / 4;
    let hex = 0x1ce35d;

    if (sel.aspirationLevel === 'Platinum') {
      hex = 0xe0f7ff;
    } else if (avgMotive > 65) {
      hex = 0x1ce35d;
    } else if (avgMotive > 35) {
      hex = 0xffd000;
    } else {
      hex = 0xff3030;
    }

    this.plumbobMatTop.color.setHex(hex);
    this.plumbobMatTop.emissive.setHex(hex);
    this.plumbobMatBottom.color.setHex(hex);
    this.plumbobMatBottom.emissive.setHex(hex);
    this.plumbobLight.color.setHex(hex);
  }

  // ==========================================
  // RAYCASTING FOR MOUSE CLICK HITS
  // ==========================================

  public raycast(screenX: number, screenY: number): { point: THREE.Vector3 } | null {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
      (screenX / window.innerWidth) * 2 - 1,
      -(screenY / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(mouse, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const target = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(plane, target)) {
      return { point: target };
    }
    return null;
  }
}
