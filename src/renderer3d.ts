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
    this.syncColonyObjects(sim);

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
            this.scene.remove(mesh);
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
        }

        group.position.set(ent.x, -ent.y, ent.z);
        this.scene.add(group);
        this.surfaceMeshes.set(ent.id, group);
      }
    });
  }

  // ==========================================
  // 3D COLONY OBJECTS (FURNITURE)
  // ==========================================

  private syncColonyObjects(sim: Simulation) {
    sim.colonyObjects.forEach(obj => {
      let group = this.objectMeshes.get(obj.id);
      if (!group) {
        group = new THREE.Group();

        if (obj.type === 'leaf_hammock') {
          // Curved green hammock leaf
          const leafGeo = new THREE.CylinderGeometry(20, 20, obj.width, 16, 1, true, 0, Math.PI);
          const leafMat = new THREE.MeshStandardMaterial({ color: 0x4c9b2b, side: THREE.DoubleSide });
          const leaf = new THREE.Mesh(leafGeo, leafMat);
          leaf.rotation.z = Math.PI / 2;
          leaf.position.y = -10;
          group.add(leaf);
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
          // Gramophone Box
          const boxGeo = new THREE.BoxGeometry(24, 20, 20);
          const boxMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
          const box = new THREE.Mesh(boxGeo, boxMat);
          group.add(box);

          // Horn
          const hornGeo = new THREE.ConeGeometry(12, 20, 16, 1, true);
          const hornMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, side: THREE.DoubleSide });
          const horn = new THREE.Mesh(hornGeo, hornMat);
          horn.rotation.z = -Math.PI / 3;
          horn.position.set(10, 14, 0);
          group.add(horn);
        } else if (obj.type === 'queen_throne') {
          // Royal Velvet Cushion & Gold Crest
          const throneGeo = new THREE.BoxGeometry(obj.width, obj.height, 24);
          const throneMat = new THREE.MeshStandardMaterial({ color: 0xb7094c, roughness: 0.4 });
          const throne = new THREE.Mesh(throneGeo, throneMat);
          group.add(throne);

          // Golden Crown Ornament
          const crownGeo = new THREE.ConeGeometry(10, 14, 5);
          const crownMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
          const crown = new THREE.Mesh(crownGeo, crownMat);
          crown.position.y = obj.height / 2 + 7;
          group.add(crown);
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

        group.position.set(obj.x + obj.width / 2, -(obj.y + obj.height / 2), obj.z);
        this.scene.add(group);
        this.objectMeshes.set(obj.id, group);
      }
    });
  }

  // ==========================================
  // 3D BROOD (EGGS & LARVAE)
  // ==========================================

  private syncBrood(sim: Simulation) {
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
    sim.ants.forEach(ant => {
      let group = this.antMeshes.get(ant.id);
      if (!group) {
        group = this.buildAnt3DModel(ant);
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
