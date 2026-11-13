import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BiomeZone,
  GameSettings,
  GameSnapshot,
  GameStatus,
  ObstacleType,
  POWERUP_DURATIONS,
  PowerUpTimers,
  PowerUpType,
} from '../types/game';
import { FootstepSurface, SoundEngine } from './audio';
import { createGameMaterials, GameMaterials } from './materials';
import {
  createCoinMesh,
  createExplorerModel,
  createMonsterModel,
  createObstacleGroup,
  createPillarGroup,
  createPowerUpMesh,
  createTreeGroup,
  ExplorerRig,
  MonsterRig,
} from './models';
import { createProceduralTextures, ProceduralTextureSet } from './textures';

const LANES = [-2.4, 0, 2.4] as const;
const TRACK_WIDTH = 7.8;
const SEG_LEN = 24;
const SEG_COUNT = 8;
const STORAGE_KEY_HIGH = 'temple_adventure_highscore_v1';
const STORAGE_KEY_DIST = 'temple_adventure_bestdist_v1';
const STORAGE_KEY_COINS = 'temple_adventure_totalcoins_v1';

// Pre-allocated math helpers for zero GC inside render loop
const _vec3 = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _color = new THREE.Color();

interface ObstacleInstance {
  type: ObstacleType;
  mesh: THREE.Group;
  localZ: number;
  centerX: number;
  halfW: number;
  halfZ: number;
  yMin: number;
  yMax: number;
  hit: boolean;
  smashed: boolean;
  smashVelY: number;
  smashVelX: number;
}

interface CoinInstance {
  mesh: THREE.Group;
  localZ: number;
  x: number;
  y: number;
  collected: boolean;
  magnetized: boolean;
  worldX: number;
  worldZ: number;
}

interface PowerUpInstance {
  type: PowerUpType;
  mesh: THREE.Group;
  localZ: number;
  x: number;
  y: number;
  collected: boolean;
}

interface AnimatedDecor {
  flames: THREE.Mesh[];
  waterfalls: THREE.Mesh[];
}

interface TrackSegment {
  group: THREE.Group;
  z: number; // Center Z of segment
  biome: BiomeZone;
  hasGap: boolean;
  gapLocalZMin: number;
  gapLocalZMax: number;
  obstacles: ObstacleInstance[];
  coins: CoinInstance[];
  powerUps: PowerUpInstance[];
  decor: AnimatedDecor;
}

interface Particle {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  active: boolean;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  vz: number;
}

export class TempleRunnerEngine {
  private container: HTMLElement;
  private onSnapshot: (snap: GameSnapshot) => void;
  private onContextLostChange?: (lost: boolean) => void;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private keyLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private rimLight!: THREE.DirectionalLight;

  private textures!: ProceduralTextureSet;
  private mats!: GameMaterials;
  private explorer!: ExplorerRig;
  private monster!: MonsterRig;
  private audio = new SoundEngine();

  private segments: TrackSegment[] = [];
  private particles: Particle[] = [];
  private particleGeo!: THREE.SphereGeometry;

  private isSoftwareGl = false;
  private frameId = 0;
  private disposed = false;
  private lastTime = 0;
  private elapsed = 0;
  private snapshotTimer = 0;

  // Game state
  private status: GameStatus = 'menu';
  private settings: GameSettings;
  private score = 0;
  private distance = 0;
  private runCoins = 0;
  private highScore = 0;
  private bestDistance = 0;
  private totalCoinsBank = 0;
  private isNewHighScore = false;
  private deathReason = '';

  // Player kinematics
  private targetLane = 1; // 0, 1, 2
  private playerX = 0;
  private playerY = 0;
  private playerVelY = 0;
  private isGrounded = true;
  private slideTimer = 0;
  private turnTilt = 0;
  private runCycle = 0;
  private lastStepHalf = 0;
  private speed = 15.5;
  private monsterProximity = 0.3;
  private graceTimer = 0;
  private fallOutTimer = 0;
  private introTimer = 0;
  private cameraShake = 0;
  private currentBiome: BiomeZone = 'temple';
  private spawnedSegments = 0;
  private activePowerUps: PowerUpTimers = {
    magnet: 0,
    boost: 0,
    shield: 0,
    multiplier: 0,
    invincibility: 0,
  };

  // Input tracking
  private touchStartX = 0;
  private touchStartY = 0;
  private touchSwiped = false;
  private pointerDown = false;

  // Bound event listeners
  private handleResizeBound: () => void;
  private handleKeyDownBound: (e: KeyboardEvent) => void;
  private handlePointerDownBound: (e: PointerEvent) => void;
  private handlePointerMoveBound: (e: PointerEvent) => void;
  private handlePointerUpBound: () => void;
  private handleContextLostBound: (e: Event) => void;
  private handleContextRestoredBound: () => void;

  constructor(
    container: HTMLElement,
    initialSettings: GameSettings,
    onSnapshot: (snap: GameSnapshot) => void,
    onContextLostChange?: (lost: boolean) => void,
  ) {
    this.container = container;
    this.settings = { ...initialSettings };
    this.onSnapshot = onSnapshot;
    this.onContextLostChange = onContextLostChange;

    this.highScore = Number(localStorage.getItem(STORAGE_KEY_HIGH) || '0') || 0;
    this.bestDistance = Number(localStorage.getItem(STORAGE_KEY_DIST) || '0') || 0;
    this.totalCoinsBank = Number(localStorage.getItem(STORAGE_KEY_COINS) || '0') || 0;

    this.audio.setEnabled(this.settings.soundEnabled);
    this.audio.setVolumes(this.settings.musicVolume, this.settings.sfxVolume);

    this.handleResizeBound = this.handleResize.bind(this);
    this.handleKeyDownBound = this.handleKeyDown.bind(this);
    this.handlePointerDownBound = this.handlePointerDown.bind(this);
    this.handlePointerMoveBound = this.handlePointerMove.bind(this);
    this.handlePointerUpBound = this.handlePointerUp.bind(this);
    this.handleContextLostBound = (e: Event) => {
      e.preventDefault();
      this.onContextLostChange?.(true);
    };
    this.handleContextRestoredBound = () => {
      this.onContextLostChange?.(false);
    };

    this.initThree();
    this.initWorld();
    this.bindEvents();
    this.emitSnapshot();

    this.lastTime = performance.now();
    this.startLoop();
  }

  private detectSoftwareGl(): boolean {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  }

  private initThree(): void {
    this.isSoftwareGl = this.detectSoftwareGl();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && this.settings.quality === 'high',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(
      this.isSoftwareGl
        ? 1
        : Math.min(window.devicePixelRatio, this.settings.quality === 'high' ? 2 : 1.35),
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1f3026);
    this.scene.fog = new THREE.FogExp2(0x1f3026, 0.0112);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    pmremGenerator.dispose();

    this.camera = new THREE.PerspectiveCamera(62, w / h, 0.15, 280);
    this.camera.position.set(0, 4.4, 7.2);

    // 3-Point Tropical Temple Lighting Rig (warm golden sun + cool canopy fill + rim)
    this.hemiLight = new THREE.HemisphereLight(0x9bd1c8, 0x3a2d1d, 0.85);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xffe1a8, 2.15);
    this.keyLight.position.set(16, 26, 12);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 70;
    const d = 20;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x6ee7b7, 0.75);
    this.rimLight.position.set(-14, 10, -18);
    this.scene.add(this.rimLight);

    // Procedural textures & materials
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.mats = createGameMaterials(this.textures);

    // Gradient sky dome (no flat void)
    this.createSkyDome();

    // Pre-allocated particle pool
    this.particleGeo = new THREE.SphereGeometry(0.11, 6, 6);
    for (let i = 0; i < 65; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd54f,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        mat,
        active: false,
        life: 0,
        maxLife: 0.5,
        vx: 0,
        vy: 0,
        vz: 0,
      });
    }
  }

  private createSkyDome(): void {
    const skyGeo = new THREE.SphereGeometry(220, 20, 12);
    const pos = skyGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const topColor = new THREE.Color(0x163238);
    const midColor = new THREE.Color(0x284b3c);
    const horizonColor = new THREE.Color(0x6b7c54);

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = THREE.MathUtils.clamp((y + 20) / 180, 0, 1);
      if (t < 0.35) {
        _color.lerpColors(horizonColor, midColor, t / 0.35);
      } else {
        _color.lerpColors(midColor, topColor, (t - 0.35) / 0.65);
      }
      colors[i * 3] = _color.r;
      colors[i * 3 + 1] = _color.g;
      colors[i * 3 + 2] = _color.b;
    }
    skyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const skyMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyDome);
  }

  private initWorld(): void {
    this.explorer = createExplorerModel(this.mats);
    this.scene.add(this.explorer.root);

    this.monster = createMonsterModel(this.mats);
    this.monster.root.position.set(0, 0, 6.4);
    this.scene.add(this.monster.root);

    this.rebuildTrack();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private rebuildTrack(): void {
    for (const seg of this.segments) {
      this.disposeSegment(seg);
    }
    this.segments = [];
    this.spawnedSegments = 0;
    this.currentBiome = 'temple';

    for (let i = 0; i < SEG_COUNT; i++) {
      // Segment 0 starts at z = +12 (so player at z=0 is nicely inside it), extending to -Z
      const segZ = 12 - i * SEG_LEN;
      const seg = this.createSegment(segZ, i < 2);
      this.segments.push(seg);
      this.scene.add(seg.group);
    }
  }

  private pickBiome(index: number): BiomeZone {
    const cycle = Math.floor(index / 7) % 3;
    if (cycle === 0) return 'temple';
    if (cycle === 1) return 'jungle';
    return 'waterfallBridge';
  }

  private createSegment(zPos: number, safeZone: boolean): TrackSegment {
    const segIdx = this.spawnedSegments++;
    const biome = this.pickBiome(segIdx);
    const group = new THREE.Group();
    group.position.z = zPos;

    const obstacles: ObstacleInstance[] = [];
    const coins: CoinInstance[] = [];
    const powerUps: PowerUpInstance[] = [];
    const flames: THREE.Mesh[] = [];
    const waterfalls: THREE.Mesh[] = [];

    const diff = Math.min(1, this.distance / 1600);
    // Decide if this segment has a bridge/temple chasm gap (only after safeZone)
    const allowGap = !safeZone && segIdx >= 3 && Math.random() < (biome === 'waterfallBridge' ? 0.34 : 0.16 + diff * 0.12);
    const gapLocalZMin = -2.3;
    const gapLocalZMax = 2.3;

    // 1. Track Floor & Curbs
    const floorMat =
      biome === 'temple'
        ? this.mats.templeFloor
        : biome === 'jungle'
          ? this.mats.jungleFloor
          : this.mats.woodBridge;

    if (allowGap) {
      // Split floor around gap [-2.3, +2.3] -> two slabs: [-12 .. -2.3] (len 9.7) and [+2.3 .. +12] (len 9.7)
      const slabLen = (SEG_LEN - (gapLocalZMax - gapLocalZMin)) * 0.5;
      for (const dir of [-1, 1]) {
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(TRACK_WIDTH, 1.2, slabLen),
          floorMat,
        );
        slab.position.set(0, -0.6, dir * (gapLocalZMax + slabLen * 0.5));
        slab.receiveShadow = true;
        group.add(slab);

        // Broken edge beams/stone teeth
        for (let bx = -2.8; bx <= 2.8; bx += 1.4) {
          const tooth = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 0.35, 0.7),
            biome === 'waterfallBridge' ? this.mats.woodBridge : this.mats.stoneTrim,
          );
          tooth.position.set(bx, -0.15, dir * (gapLocalZMax + 0.15));
          tooth.rotation.x = dir * 0.22;
          group.add(tooth);
        }
      }

      // Deep gorge water far below
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(36, SEG_LEN),
        this.mats.gorgeWater,
      );
      water.rotation.x = -Math.PI / 2;
      water.position.y = -10.5;
      group.add(water);
    } else {
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(TRACK_WIDTH, 1.2, SEG_LEN),
        floorMat,
      );
      floor.position.y = -0.6;
      floor.receiveShadow = true;
      group.add(floor);
    }

    // Track side curbs or bridge rope railings
    for (const side of [-1, 1]) {
      if (biome === 'waterfallBridge') {
        for (let pz = -9; pz <= 9; pz += 6) {
          if (allowGap && Math.abs(pz) < 3) continue;
          const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.16, 1.35, 7),
            this.mats.bark,
          );
          post.position.set(side * (TRACK_WIDTH * 0.5 + 0.15), 0.65, pz);
          post.castShadow = true;
          group.add(post);
        }
        const rail = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.055, SEG_LEN, 6),
          this.mats.rope,
        );
        rail.rotation.x = Math.PI / 2;
        rail.position.set(side * (TRACK_WIDTH * 0.5 + 0.15), 1.15, 0);
        group.add(rail);
      } else {
        const curb = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, 0.42, SEG_LEN),
          biome === 'temple' ? this.mats.stoneTrim : this.mats.mossyRock,
        );
        curb.position.set(side * (TRACK_WIDTH * 0.5 + 0.32), 0.14, 0);
        curb.receiveShadow = true;
        curb.castShadow = true;
        group.add(curb);
      }
    }

    // 2. Natural Outer Environment (Jungle terrain, trees, temple pillars, waterfall cliffs — NO boxy indoor walls!)
    if (biome === 'waterfallBridge') {
      // Deep gorge water below entire bridge
      if (!allowGap) {
        const water = new THREE.Mesh(
          new THREE.PlaneGeometry(46, SEG_LEN),
          this.mats.gorgeWater,
        );
        water.rotation.x = -Math.PI / 2;
        water.position.y = -10.5;
        group.add(water);
      }

      // Flanking canyon cliff rock faces + animated cascading waterfalls
      for (const side of [-1, 1]) {
        const cliff = new THREE.Mesh(
          new THREE.DodecahedronGeometry(9.5, 1),
          this.mats.cliffRock,
        );
        cliff.scale.set(0.95, 2.2, 1.35);
        cliff.position.set(side * 16.5, 1.5, 0);
        group.add(cliff);

        if (segIdx % 2 === (side === -1 ? 0 : 1)) {
          const wf = new THREE.Mesh(
            new THREE.PlaneGeometry(4.2, 20),
            this.mats.waterfall,
          );
          wf.position.set(side * 11.4, -0.5, 0);
          wf.rotation.y = -side * (Math.PI * 0.45);
          group.add(wf);
          waterfalls.push(wf);
        }
      }
    } else {
      // Extended mossy jungle ground flanks (blends naturally into fog)
      for (const side of [-1, 1]) {
        const ground = new THREE.Mesh(
          new THREE.PlaneGeometry(34, SEG_LEN),
          this.mats.jungleFloorGrass,
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(side * (TRACK_WIDTH * 0.5 + 17), -0.18, 0);
        ground.receiveShadow = true;
        group.add(ground);

        // Trees & lush foliage clusters
        const treeCount = biome === 'jungle' ? 3 : 2;
        for (let t = 0; t < treeCount; t++) {
          const tz = -8 + t * 8 + (Math.random() - 0.5) * 3;
          const tx = side * (6.2 + Math.random() * 7.5);
          const tree = createTreeGroup(this.mats, 0.85 + Math.random() * 0.55);
          tree.position.set(tx, -0.18, tz);
          tree.rotation.y = Math.random() * Math.PI * 2;
          group.add(tree);
        }

        // Temple pillars with torches in temple biome
        if (biome === 'temple') {
          for (const pz of [-6, 6]) {
            const pillar = createPillarGroup(this.mats, Math.random() < 0.25);
            pillar.position.set(side * 4.75, 0, pz);
            group.add(pillar);
            if (pillar.userData.torchFlame) {
              flames.push(pillar.userData.torchFlame as THREE.Mesh);
            }
          }
        } else {
          // Jungle moss boulders along outer edge
          const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(1.1 + Math.random() * 0.8, 0),
            this.mats.mossyRock,
          );
          rock.position.set(side * (5.6 + Math.random() * 2.5), 0.3, (Math.random() - 0.5) * 14);
          rock.scale.y = 0.7;
          group.add(rock);
        }
      }

      // Occasional grand temple archway spanning over the track
      if (biome === 'temple' && segIdx % 3 === 1) {
        const lintel = new THREE.Mesh(
          new THREE.BoxGeometry(10.6, 1.15, 1.35),
          this.mats.stoneWall,
        );
        lintel.position.set(0, 5.45, -6);
        lintel.castShadow = true;
        group.add(lintel);
      }
    }

    // 3. Obstacles & Collectibles
    if (safeZone) {
      // Welcoming starter coin line down center lane
      for (let cz = -9; cz <= 3; cz += 2.2) {
        const c = createCoinMesh(this.mats);
        c.position.set(0, 0.9, cz);
        group.add(c);
        coins.push({
          mesh: c,
          localZ: cz,
          x: 0,
          y: 0.9,
          collected: false,
          magnetized: false,
          worldX: 0,
          worldZ: zPos + cz,
        });
      }
    } else if (allowGap) {
      // Gap spans [-2.3, +2.3]. Place guiding coin jump arc over the gap!
      const coinLane = LANES[Math.floor(Math.random() * 3)];
      for (let i = -2; i <= 2; i++) {
        const cz = i * 1.45;
        const arcY = 0.9 + Math.cos((i / 2.2) * (Math.PI / 2)) * 1.35;
        const c = createCoinMesh(this.mats);
        c.position.set(coinLane, arcY, cz);
        group.add(c);
        coins.push({
          mesh: c,
          localZ: cz,
          x: coinLane,
          y: arcY,
          collected: false,
          magnetized: false,
          worldX: coinLane,
          worldZ: zPos + cz,
        });
      }
    } else {
      // Spawn 1 or 2 obstacles depending on difficulty
      const obsSlots = diff > 0.3 && Math.random() < 0.45 + diff * 0.35 ? [-6, 5] : [0];
      for (const slotZ of obsSlots) {
        const obs = this.spawnObstacleInSlot(slotZ, diff, group, flames);
        if (obs) {
          obstacles.push(obs);
          // Add guiding coins around/over obstacle or on open lane
          this.spawnCoinsAroundObstacle(obs, slotZ, group, coins, zPos);
        }
      }

      // Chance to spawn a Power-Up on an open lane
      if (Math.random() < 0.24) {
        const pTypes: PowerUpType[] = [
          'magnet',
          'boost',
          'shield',
          'multiplier',
          'invincibility',
        ];
        const pType = pTypes[Math.floor(Math.random() * pTypes.length)];
        const pLane = LANES[Math.floor(Math.random() * 3)];
        const pz = obsSlots.length === 1 ? -7.5 : 0;
        const pMesh = createPowerUpMesh(pType, this.mats);
        pMesh.position.set(pLane, 1.15, pz);
        group.add(pMesh);
        powerUps.push({
          type: pType,
          mesh: pMesh,
          localZ: pz,
          x: pLane,
          y: 1.15,
          collected: false,
        });
      }
    }

    return {
      group,
      z: zPos,
      biome,
      hasGap: allowGap,
      gapLocalZMin,
      gapLocalZMax,
      obstacles,
      coins,
      powerUps,
      decor: { flames, waterfalls },
    };
  }

  private spawnObstacleInSlot(
    slotZ: number,
    diff: number,
    group: THREE.Group,
    flamesOut: THREE.Mesh[],
  ): ObstacleInstance | null {
    const types: ObstacleType[] = [
      'fallenTree',
      'boulder',
      'fireTrap',
      'stoneWall',
      'woodBarrier',
      'rotatingTrap',
      'lowHanging',
    ];
    const type = types[Math.floor(Math.random() * types.length)];

    let spanLanes = 1;
    if (
      (type === 'fallenTree' ||
        type === 'fireTrap' ||
        type === 'stoneWall' ||
        type === 'woodBarrier' ||
        type === 'rotatingTrap') &&
      Math.random() < 0.25 + diff * 0.35
    ) {
      spanLanes = 2;
    } else if (type === 'lowHanging') {
      spanLanes = Math.random() < 0.45 ? 3 : 2;
    }

    let centerX = 0;
    if (spanLanes === 1) {
      centerX = LANES[Math.floor(Math.random() * 3)];
    } else if (spanLanes === 2) {
      centerX = Math.random() < 0.5 ? -1.2 : 1.2;
    } else {
      centerX = 0;
    }

    const widthUnits = spanLanes === 1 ? 2.0 : spanLanes === 2 ? 4.4 : 7.0;
    const mesh = createObstacleGroup(type, widthUnits, this.mats);
    mesh.position.set(centerX, 0, slotZ);
    group.add(mesh);

    if (mesh.userData.flames) {
      flamesOut.push(...(mesh.userData.flames as THREE.Mesh[]));
    }

    let yMin = 0;
    let yMax = 1.2;
    let halfZ = 0.42;

    switch (type) {
      case 'fallenTree':
        yMin = 0;
        yMax = 0.85;
        halfZ = 0.44;
        break;
      case 'boulder':
        yMin = 0;
        yMax = 1.48;
        halfZ = 0.65;
        break;
      case 'fireTrap':
        yMin = 0;
        yMax = 0.92;
        halfZ = 0.42;
        break;
      case 'stoneWall':
        yMin = 0;
        yMax = 2.5;
        halfZ = 0.44;
        break;
      case 'woodBarrier':
        yMin = 0;
        yMax = 1.05;
        halfZ = 0.25;
        break;
      case 'rotatingTrap':
        yMin = 0.55;
        yMax = 1.55;
        halfZ = 0.42;
        break;
      case 'lowHanging':
        yMin = 1.15;
        yMax = 2.65;
        halfZ = 0.36;
        break;
    }

    return {
      type,
      mesh,
      localZ: slotZ,
      centerX,
      halfW: widthUnits * 0.48,
      halfZ,
      yMin,
      yMax,
      hit: false,
      smashed: false,
      smashVelY: 0,
      smashVelX: 0,
    };
  }

  private spawnCoinsAroundObstacle(
    obs: ObstacleInstance,
    slotZ: number,
    group: THREE.Group,
    coinsOut: CoinInstance[],
    segZ: number,
  ): void {
    const canJump =
      obs.type === 'fallenTree' ||
      obs.type === 'fireTrap' ||
      obs.type === 'woodBarrier';
    const canSlide = obs.type === 'lowHanging';

    if (canJump && Math.random() < 0.65) {
      // Coin arc right over obstacle
      const laneX =
        obs.halfW > 1.5
          ? obs.centerX < 0
            ? LANES[0]
            : LANES[2]
          : obs.centerX;
      for (let i = -1; i <= 1; i++) {
        const cz = slotZ + i * 1.4;
        const cy = i === 0 ? 2.15 : 1.55;
        const c = createCoinMesh(this.mats);
        c.position.set(laneX, cy, cz);
        group.add(c);
        coinsOut.push({
          mesh: c,
          localZ: cz,
          x: laneX,
          y: cy,
          collected: false,
          magnetized: false,
          worldX: laneX,
          worldZ: segZ + cz,
        });
      }
    } else if (canSlide) {
      const laneX = LANES[Math.floor(Math.random() * 3)];
      for (let i = -1; i <= 1; i++) {
        const cz = slotZ + i * 1.5;
        const c = createCoinMesh(this.mats);
        c.position.set(laneX, 0.55, cz);
        group.add(c);
        coinsOut.push({
          mesh: c,
          localZ: cz,
          x: laneX,
          y: 0.55,
          collected: false,
          magnetized: false,
          worldX: laneX,
          worldZ: segZ + cz,
        });
      }
    } else {
      // Line of 3 coins on a guaranteed safe lane
      const safeLanes = LANES.filter(
        (lx) => Math.abs(lx - obs.centerX) > obs.halfW + 0.3,
      );
      if (safeLanes.length > 0) {
        const laneX = safeLanes[Math.floor(Math.random() * safeLanes.length)];
        for (let i = -1; i <= 1; i++) {
          const cz = slotZ + i * 1.7;
          const c = createCoinMesh(this.mats);
          c.position.set(laneX, 0.9, cz);
          group.add(c);
          coinsOut.push({
            mesh: c,
            localZ: cz,
            x: laneX,
            y: 0.9,
            collected: false,
            magnetized: false,
            worldX: laneX,
            worldZ: segZ + cz,
          });
        }
      }
    }
  }

  private disposeSegment(seg: TrackSegment): void {
    this.scene.remove(seg.group);
    seg.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).geometry.dispose();
      }
      if (obj.userData.disposeExtra) {
        (obj.userData.disposeExtra as () => void)();
      }
    });
  }

  // =========================================================================
  // PUBLIC CONTROLS & LIFECYCLE
  // =========================================================================

  public startGame(): void {
    this.audio.unlock();
    this.audio.startMusic();
    this.audio.playMonsterGrowl();

    this.score = 0;
    this.distance = 0;
    this.runCoins = 0;
    this.isNewHighScore = false;
    this.deathReason = '';
    this.targetLane = 1;
    this.playerX = 0;
    this.playerY = 0;
    this.playerVelY = 0;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.turnTilt = 0;
    this.speed = 15.5;
    this.monsterProximity = 0.62;
    this.graceTimer = 0;
    this.fallOutTimer = 0;
    this.cameraShake = 0;
    this.activePowerUps = {
      magnet: 0,
      boost: 0,
      shield: 0,
      multiplier: 0,
      invincibility: 0,
    };

    this.explorer.root.position.set(0, 0, 0);
    this.explorer.root.rotation.set(0, 0, 0);
    this.explorer.bodyGroup.rotation.set(0, 0, 0);
    this.explorer.shieldMesh.visible = false;
    this.explorer.invincibleMesh.visible = false;

    this.rebuildTrack();

    this.status = 'intro';
    this.introTimer = 1.05;
    this.emitSnapshot();
  }

  public pauseGame(): void {
    if (this.status === 'playing' || this.status === 'intro') {
      this.status = 'paused';
      this.emitSnapshot();
    }
  }

  public resumeGame(): void {
    if (this.status === 'paused') {
      this.audio.unlock();
      this.status = 'playing';
      this.lastTime = performance.now();
      this.emitSnapshot();
    }
  }

  public returnToMenu(): void {
    this.audio.stopMusic();
    this.status = 'menu';
    this.targetLane = 1;
    this.playerX = 0;
    this.playerY = 0;
    this.playerVelY = 0;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.fallOutTimer = 0;
    this.explorer.root.position.set(0, 0, 0);
    this.explorer.root.rotation.set(0, 0, 0);
    this.explorer.bodyGroup.rotation.set(0, 0, 0);
    this.explorer.shieldMesh.visible = false;
    this.explorer.invincibleMesh.visible = false;
    this.rebuildTrack();
    this.emitSnapshot();
  }

  public updateSettings(next: GameSettings): void {
    const qualityChanged = next.quality !== this.settings.quality;
    this.settings = { ...next };
    this.audio.setEnabled(next.soundEnabled);
    this.audio.setVolumes(next.musicVolume, next.sfxVolume);

    if (qualityChanged && !this.isSoftwareGl) {
      this.renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, next.quality === 'high' ? 2 : 1.35),
      );
    }
  }

  // Input Actions
  public moveLeft(): void {
    if (this.status !== 'playing' && this.status !== 'intro') return;
    if (this.targetLane > 0) {
      this.targetLane--;
      this.turnTilt = -0.34;
      this.audio.playLaneShift();
    }
  }

  public moveRight(): void {
    if (this.status !== 'playing' && this.status !== 'intro') return;
    if (this.targetLane < 2) {
      this.targetLane++;
      this.turnTilt = 0.34;
      this.audio.playLaneShift();
    }
  }

  public jump(): void {
    if (this.status !== 'playing' && this.status !== 'intro') return;
    if (this.isGrounded) {
      this.playerVelY = 11.6;
      this.isGrounded = false;
      this.slideTimer = 0;
      this.audio.playJump();
      this.spawnBurst(this.playerX, 0.2, 0, 0xd6c7a9, 6);
    }
  }

  public slide(): void {
    if (this.status !== 'playing' && this.status !== 'intro') return;
    if (!this.isGrounded) {
      // Fast-fall slam into slide
      this.playerVelY = Math.min(this.playerVelY, -19);
    }
    this.slideTimer = 0.68;
    this.audio.playSlide();
  }

  // =========================================================================
  // EVENT BINDING
  // =========================================================================

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResizeBound);
    window.addEventListener('keydown', this.handleKeyDownBound);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDownBound);
    window.addEventListener('pointermove', this.handlePointerMoveBound);
    window.addEventListener('pointerup', this.handlePointerUpBound);
    window.addEventListener('pointercancel', this.handlePointerUpBound);
    dom.addEventListener('webglcontextlost', this.handleContextLostBound);
    dom.addEventListener('webglcontextrestored', this.handleContextRestoredBound);
  }

  private handleResize(): void {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    const code = e.code;

    if (code === 'Escape' || code === 'KeyP') {
      if (this.status === 'playing') this.pauseGame();
      else if (this.status === 'paused') this.resumeGame();
      return;
    }

    if (this.status !== 'playing' && this.status !== 'intro') return;

    if (code === 'ArrowLeft' || code === 'KeyA') {
      e.preventDefault();
      this.moveLeft();
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      e.preventDefault();
      this.moveRight();
    } else if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') {
      e.preventDefault();
      this.jump();
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      e.preventDefault();
      this.slide();
    }
  }

  private handlePointerDown(e: PointerEvent): void {
    this.audio.unlock();
    this.pointerDown = true;
    this.touchSwiped = false;
    this.touchStartX = e.clientX;
    this.touchStartY = e.clientY;
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.pointerDown || this.touchSwiped) return;
    if (this.status !== 'playing' && this.status !== 'intro') return;

    const dx = e.clientX - this.touchStartX;
    const dy = e.clientY - this.touchStartY;
    const threshold = 32 / Math.max(0.5, this.settings.swipeSensitivity);

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    this.touchSwiped = true;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) this.moveLeft();
      else this.moveRight();
    } else {
      if (dy < 0) this.jump();
      else this.slide();
    }
  }

  private handlePointerUp(): void {
    this.pointerDown = false;
    this.touchSwiped = false;
  }

  // =========================================================================
  // GAME LOOP & SIMULATION
  // =========================================================================

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;

      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      this.update(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl.fenceSync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private update(dt: number): void {
    this.elapsed += dt;

    if (this.status === 'menu') {
      this.updateMenuShowcase(dt);
      this.updateDecorAnimations(dt);
      return;
    }

    if (this.status === 'paused') {
      return;
    }

    if (this.status === 'gameover') {
      this.updateGameOverAnimation(dt);
      this.updateParticles(dt);
      this.updateDecorAnimations(dt);
      return;
    }

    // Active gameplay ('intro' or 'playing')
    if (this.status === 'intro') {
      this.introTimer -= dt;
      if (this.introTimer <= 0) {
        this.status = 'playing';
        this.emitSnapshot();
      }
    }

    // Power-up countdowns
    (Object.keys(this.activePowerUps) as PowerUpType[]).forEach((k) => {
      if (this.activePowerUps[k] > 0) {
        this.activePowerUps[k] = Math.max(0, this.activePowerUps[k] - dt);
      }
    });
    if (this.graceTimer > 0) this.graceTimer = Math.max(0, this.graceTimer - dt);

    const isBoost = this.activePowerUps.boost > 0;
    const isInvincible = this.activePowerUps.invincibility > 0;
    const hasShield = this.activePowerUps.shield > 0;
    const hasMagnet = this.activePowerUps.magnet > 0;
    const scoreMult = this.activePowerUps.multiplier > 0 ? 2 : 1;

    this.explorer.shieldMesh.visible = hasShield;
    this.explorer.invincibleMesh.visible = isInvincible || isBoost;
    if (hasShield) this.explorer.shieldMesh.rotation.y += dt * 1.8;
    if (isInvincible || isBoost) {
      this.explorer.invincibleMesh.rotation.y -= dt * 3.2;
    }

    // Progressive running speed
    const baseSpeed = Math.min(34.5, 15.5 + this.distance * 0.014);
    const targetSpeed = isBoost ? baseSpeed + 11.5 : baseSpeed;
    this.speed = THREE.MathUtils.damp(this.speed, targetSpeed, 5, dt);

    // Advance distance & score
    const stepDist = this.speed * dt;
    this.distance += stepDist;
    this.score += stepDist * 10 * scoreMult;

    // Monster proximity slowly recovers during clean running
    this.monsterProximity = Math.max(0.24, this.monsterProximity - dt * 0.055);

    // Player horizontal lane damping
    const targetX = LANES[this.targetLane];
    this.playerX = THREE.MathUtils.damp(this.playerX, targetX, 16, dt);
    this.turnTilt = THREE.MathUtils.damp(this.turnTilt, 0, 10, dt);

    // Vertical jump & gravity
    if (!this.isGrounded) {
      this.playerVelY -= 31 * dt;
      this.playerY += this.playerVelY * dt;
      if (this.playerY <= 0) {
        this.playerY = 0;
        this.playerVelY = 0;
        this.isGrounded = true;
        this.spawnBurst(this.playerX, 0.1, 0, 0x9b8d72, 4);
      }
    }

    // Slide countdown
    if (this.slideTimer > 0) {
      this.slideTimer = Math.max(0, this.slideTimer - dt);
    }

    // Scroll track segments toward +Z
    let minZ = Infinity;
    for (const seg of this.segments) {
      seg.z += stepDist;
      seg.group.position.z = seg.z;
      if (seg.z < minZ) minZ = seg.z;
    }

    // Recycle segments past +24
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      if (seg.z > SEG_LEN + 6) {
        this.disposeSegment(seg);
        const newZ = minZ - SEG_LEN;
        minZ = newZ;
        const fresh = this.createSegment(newZ, false);
        this.segments[i] = fresh;
        this.scene.add(fresh.group);
      }
    }

    // Determine biome at player Z = 0
    for (const seg of this.segments) {
      if (Math.abs(seg.z) <= SEG_LEN * 0.5) {
        this.currentBiome = seg.biome;
        break;
      }
    }

    // Update obstacles, coins, power-ups & check collisions
    this.updateTrackEntities(
      dt,
      hasMagnet,
      isBoost,
      isInvincible,
      hasShield,
      scoreMult,
    );

    // Animate Explorer & Monster
    this.animateExplorer(dt, isBoost);
    this.animateMonster(dt);

    // Update Camera
    this.updateChaseCamera(dt, isBoost);

    // Update Particles & Decor
    this.updateParticles(dt);
    this.updateDecorAnimations(dt);

    // Periodic UI snapshot (~15 Hz for crisp HUD counters without React spam)
    this.snapshotTimer += dt;
    if (this.snapshotTimer >= 0.065) {
      this.snapshotTimer = 0;
      this.emitSnapshot();
    }
  }

  private updateTrackEntities(
    dt: number,
    hasMagnet: boolean,
    isBoost: boolean,
    isInvincible: boolean,
    hasShield: boolean,
    scoreMult: number,
  ): void {
    const playerZ = isBoost ? -0.6 : 0;
    const isSliding = this.slideTimer > 0 && this.isGrounded;
    const playerBottom = this.playerY;
    const playerTop = this.playerY + (isSliding ? 0.72 : 1.72);
    const playerHalfW = 0.32;

    for (const seg of this.segments) {
      // Gap check when player is over this segment's chasm
      if (seg.hasGap && this.status === 'playing') {
        const gapWorldMin = seg.z + seg.gapLocalZMin;
        const gapWorldMax = seg.z + seg.gapLocalZMax;
        if (playerZ > gapWorldMin + 0.35 && playerZ < gapWorldMax - 0.35) {
          if (this.playerY < 0.25 && !isBoost && !isInvincible) {
            this.triggerGameOver('Fell into the Ancient Gorge', true);
            return;
          }
        }
      }

      // Obstacles
      for (const obs of seg.obstacles) {
        if (obs.type === 'rotatingTrap' && obs.mesh.userData.rotor && !obs.smashed) {
          (obs.mesh.userData.rotor as THREE.Group).rotation.x += dt * 4.8;
        }

        if (obs.smashed) {
          obs.mesh.position.y += obs.smashVelY * dt;
          obs.mesh.position.x += obs.smashVelX * dt;
          obs.smashVelY -= 25 * dt;
          obs.mesh.rotation.z += dt * 6;
          obs.mesh.rotation.x += dt * 4;
          continue;
        }

        if (obs.hit || this.status !== 'playing') continue;

        const obsWorldZ = seg.z + obs.localZ;
        if (Math.abs(obsWorldZ - playerZ) < obs.halfZ + 0.26) {
          const xOverlap =
            Math.abs(this.playerX - obs.centerX) < obs.halfW + playerHalfW - 0.16;
          const yOverlap = playerTop > obs.yMin && playerBottom < obs.yMax;

          if (xOverlap && yOverlap) {
            obs.hit = true;
            if (isBoost || isInvincible) {
              obs.smashed = true;
              obs.smashVelY = 13;
              obs.smashVelX = (Math.random() - 0.5) * 10;
              this.score += 100 * scoreMult;
              this.cameraShake = 0.22;
              this.audio.playCollision();
              this.spawnBurst(obs.centerX, 1.0, obsWorldZ, 0xfbbf24, 12);
            } else if (hasShield) {
              this.activePowerUps.shield = 0;
              this.graceTimer = 1.25;
              this.cameraShake = 0.38;
              this.monsterProximity = Math.min(0.85, this.monsterProximity + 0.35);
              this.audio.playCollision();
              this.spawnBurst(this.playerX, 1.0, playerZ, 0x10b981, 14);
              this.emitSnapshot();
            } else if (this.graceTimer <= 0) {
              const reasonMap: Record<ObstacleType, string> = {
                fallenTree: 'Tripped over a Fallen Jungle Log',
                boulder: 'Crashed into an Ancient Boulder',
                fireTrap: 'Scorched by a Temple Fire Trap',
                stoneWall: 'Struck a Carved Stone Monolith',
                woodBarrier: 'Smashed into a Spiked Barricade',
                gap: 'Fell into the Ancient Gorge',
                rotatingTrap: 'Hit by a Spinning Temple Rotor',
                lowHanging: 'Clipped an Overhead Ruin Beam',
              };
              this.triggerGameOver(reasonMap[obs.type], false);
              return;
            }
          }
        }
      }

      // Coins
      for (const coin of seg.coins) {
        if (coin.collected) continue;
        coin.mesh.rotation.y += dt * 3.6;

        const worldZ = seg.z + coin.localZ;
        const worldX = coin.mesh.position.x;

        if (hasMagnet && Math.abs(worldZ - playerZ) < 12.5) {
          coin.magnetized = true;
        }

        if (coin.magnetized) {
          // Pull coin toward player in segment-local coordinates
          const targetLocalZ = playerZ - seg.z;
          coin.mesh.position.x = THREE.MathUtils.damp(
            coin.mesh.position.x,
            this.playerX,
            14,
            dt,
          );
          coin.mesh.position.y = THREE.MathUtils.damp(
            coin.mesh.position.y,
            this.playerY + 1.0,
            14,
            dt,
          );
          coin.localZ = THREE.MathUtils.damp(coin.localZ, targetLocalZ, 14, dt);
          coin.mesh.position.z = coin.localZ;
        }

        const dx = coin.mesh.position.x - this.playerX;
        const dy = coin.mesh.position.y - (this.playerY + 0.95);
        const dz = seg.z + coin.localZ - playerZ;

        if (dx * dx + dy * dy + dz * dz < 1.35) {
          coin.collected = true;
          coin.mesh.visible = false;
          this.runCoins += 1;
          this.score += 25 * scoreMult;
          this.audio.playCoin();
          this.spawnBurst(
            coin.mesh.position.x,
            coin.mesh.position.y,
            playerZ,
            0xffd54f,
            6,
          );
        } else {
          coin.worldX = worldX;
          coin.worldZ = worldZ;
        }
      }

      // Power-Ups
      for (const pu of seg.powerUps) {
        if (pu.collected) continue;
        pu.mesh.rotation.y += dt * 2.4;
        pu.mesh.position.y = pu.y + Math.sin(this.elapsed * 3.2) * 0.16;

        const dx = pu.x - this.playerX;
        const dy = pu.mesh.position.y - (this.playerY + 0.95);
        const dz = seg.z + pu.localZ - playerZ;

        if (dx * dx + dy * dy + dz * dz < 1.65) {
          pu.collected = true;
          pu.mesh.visible = false;
          this.activePowerUps[pu.type] = POWERUP_DURATIONS[pu.type];
          this.score += 75 * scoreMult;
          this.audio.playPowerUp();
          this.spawnBurst(pu.x, pu.mesh.position.y, playerZ, 0x38bdf8, 12);
          this.emitSnapshot();
        }
      }
    }
  }

  private triggerGameOver(reason: string, fellInGorge: boolean): void {
    this.status = 'gameover';
    this.deathReason = reason;
    this.cameraShake = 0.55;
    this.fallOutTimer = fellInGorge ? 1.2 : 0;

    this.audio.playCollision();
    this.audio.playMonsterGrowl();
    this.audio.playGameOver();
    this.audio.stopMusic();

    const finalScore = Math.floor(this.score);
    const finalDist = Math.floor(this.distance);

    if (finalScore > this.highScore) {
      this.highScore = finalScore;
      this.isNewHighScore = true;
      localStorage.setItem(STORAGE_KEY_HIGH, String(finalScore));
    }
    if (finalDist > this.bestDistance) {
      this.bestDistance = finalDist;
      localStorage.setItem(STORAGE_KEY_DIST, String(finalDist));
    }
    this.totalCoinsBank += this.runCoins;
    localStorage.setItem(STORAGE_KEY_COINS, String(this.totalCoinsBank));

    this.spawnBurst(this.playerX, this.playerY + 1, 0, 0xef4444, 16);
    this.emitSnapshot();
  }

  // =========================================================================
  // ANIMATIONS & CAMERA
  // =========================================================================

  private animateExplorer(dt: number, isBoost: boolean): void {
    const zOffset = isBoost ? -0.6 : 0;
    this.explorer.root.position.set(this.playerX, this.playerY, zOffset);

    // Contact shadow stays projected on ground when jumping (hidden over deep gaps)
    this.explorer.contactShadow.position.y = -this.playerY + 0.02;
    const shadowScale = Math.max(0.45, 1 - this.playerY * 0.22);
    this.explorer.contactShadow.scale.setScalar(shadowScale);

    // Banking tilt during lane switches
    this.explorer.bodyGroup.rotation.z = -this.turnTilt;
    this.explorer.bodyGroup.rotation.y = -this.turnTilt * 0.55;

    if (!this.isGrounded) {
      // Dynamic mid-air jump pose
      this.explorer.pelvis.position.y = THREE.MathUtils.damp(
        this.explorer.pelvis.position.y,
        0.96,
        14,
        dt,
      );
      this.explorer.torso.rotation.x = THREE.MathUtils.damp(
        this.explorer.torso.rotation.x,
        -0.2,
        10,
        dt,
      );
      this.explorer.leftLeg.rotation.x = THREE.MathUtils.damp(
        this.explorer.leftLeg.rotation.x,
        0.75,
        12,
        dt,
      );
      this.explorer.leftShin.rotation.x = THREE.MathUtils.damp(
        this.explorer.leftShin.rotation.x,
        -1.1,
        12,
        dt,
      );
      this.explorer.rightLeg.rotation.x = THREE.MathUtils.damp(
        this.explorer.rightLeg.rotation.x,
        -0.35,
        12,
        dt,
      );
      this.explorer.rightShin.rotation.x = THREE.MathUtils.damp(
        this.explorer.rightShin.rotation.x,
        -0.5,
        12,
        dt,
      );
      this.explorer.leftArm.rotation.x = THREE.MathUtils.damp(
        this.explorer.leftArm.rotation.x,
        2.1,
        10,
        dt,
      );
      this.explorer.rightArm.rotation.x = THREE.MathUtils.damp(
        this.explorer.rightArm.rotation.x,
        1.8,
        10,
        dt,
      );
      this.explorer.scarfTail.rotation.x = 0.55;
      return;
    }

    if (this.slideTimer > 0) {
      // Low baseball/parkour slide pose
      this.explorer.pelvis.position.y = THREE.MathUtils.damp(
        this.explorer.pelvis.position.y,
        0.34,
        18,
        dt,
      );
      this.explorer.torso.rotation.x = THREE.MathUtils.damp(
        this.explorer.torso.rotation.x,
        1.15,
        18,
        dt,
      );
      this.explorer.leftLeg.rotation.x = THREE.MathUtils.damp(
        this.explorer.leftLeg.rotation.x,
        1.35,
        18,
        dt,
      );
      this.explorer.leftShin.rotation.x = THREE.MathUtils.damp(
        this.explorer.leftShin.rotation.x,
        -0.1,
        18,
        dt,
      );
      this.explorer.rightLeg.rotation.x = THREE.MathUtils.damp(
        this.explorer.rightLeg.rotation.x,
        0.55,
        18,
        dt,
      );
      this.explorer.rightShin.rotation.x = THREE.MathUtils.damp(
        this.explorer.rightShin.rotation.x,
        -1.45,
        18,
        dt,
      );
      this.explorer.leftArm.rotation.x = THREE.MathUtils.damp(
        this.explorer.leftArm.rotation.x,
        -0.9,
        15,
        dt,
      );
      this.explorer.rightArm.rotation.x = THREE.MathUtils.damp(
        this.explorer.rightArm.rotation.x,
        -0.7,
        15,
        dt,
      );
      return;
    }

    // Crisp pumping sprint cycle
    this.runCycle += dt * (this.speed * 0.78);
    const s = Math.sin(this.runCycle);
    const c = Math.cos(this.runCycle);

    // Trigger footstep audio on stride crossings
    const stepHalf = Math.floor(this.runCycle / Math.PI);
    if (stepHalf !== this.lastStepHalf) {
      this.lastStepHalf = stepHalf;
      const surface: FootstepSurface =
        this.currentBiome === 'waterfallBridge'
          ? 'wood'
          : this.currentBiome === 'jungle'
            ? 'dirt'
            : 'stone';
      if (this.status === 'playing') {
        this.audio.playFootstep(surface);
      }
    }

    this.explorer.pelvis.position.y = 0.92 + Math.abs(c) * 0.09;
    this.explorer.torso.rotation.x = THREE.MathUtils.damp(
      this.explorer.torso.rotation.x,
      -0.24,
      14,
      dt,
    );
    this.explorer.head.rotation.y = Math.sin(this.runCycle * 0.5) * 0.05;
    this.explorer.scarfTail.rotation.x = 0.25 + Math.sin(this.elapsed * 18) * 0.22;

    this.explorer.leftLeg.rotation.x = s * 0.95;
    this.explorer.leftShin.rotation.x = Math.min(0, -c * 0.9 - 0.35);
    this.explorer.rightLeg.rotation.x = -s * 0.95;
    this.explorer.rightShin.rotation.x = Math.min(0, c * 0.9 - 0.35);

    this.explorer.leftArm.rotation.x = -s * 0.85;
    this.explorer.leftForearm.rotation.x = 0.75 + Math.max(0, -s) * 0.45;
    this.explorer.rightArm.rotation.x = s * 0.85;
    this.explorer.rightForearm.rotation.x = 0.75 + Math.max(0, s) * 0.45;
  }

  private animateMonster(dt: number): void {
    const targetMonsterZ = 3.2 + (1 - this.monsterProximity) * 5.2;
    this.monster.root.position.z = THREE.MathUtils.damp(
      this.monster.root.position.z,
      targetMonsterZ,
      4.5,
      dt,
    );
    this.monster.root.position.x = THREE.MathUtils.damp(
      this.monster.root.position.x,
      this.playerX * 0.75,
      5,
      dt,
    );

    const stride = this.elapsed * 10.5;
    this.monster.torso.position.y = 1.45 + Math.abs(Math.sin(stride)) * 0.16;
    this.monster.torso.rotation.x = -0.22 + Math.sin(stride * 2) * 0.06;
    this.monster.leftArm.rotation.x = Math.sin(stride) * 0.85;
    this.monster.rightArm.rotation.x = -Math.sin(stride) * 0.85;
    this.monster.leftLeg.rotation.x = -Math.sin(stride) * 0.7;
    this.monster.rightLeg.rotation.x = Math.sin(stride) * 0.7;
  }

  private updateChaseCamera(dt: number, isBoost: boolean): void {
    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 1.4);
    }

    const shakeX = (Math.random() - 0.5) * this.cameraShake * 0.7;
    const shakeY = (Math.random() - 0.5) * this.cameraShake * 0.55;

    // FOV widens smoothly during boost/high speed
    const targetFov = isBoost ? 74 : 62 + Math.min(8, (this.speed - 15.5) * 0.35);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5, dt);
    this.camera.updateProjectionMatrix();

    if (this.status === 'intro') {
      // Dramatic start swoop from front-right quarter behind explorer
      const t = 1 - Math.max(0, this.introTimer / 1.05);
      const ease = 1 - Math.pow(1 - t, 3);
      const angle = (1 - ease) * 1.7;
      const dist = THREE.MathUtils.lerp(5.2, 7.1, ease);
      this.camera.position.set(
        Math.sin(angle) * dist + this.playerX * 0.5,
        THREE.MathUtils.lerp(2.6, 4.35, ease),
        Math.cos(angle) * dist,
      );
      _vec3.set(this.playerX * 0.5, 1.35, -8 * ease);
      this.camera.lookAt(_vec3);
      return;
    }

    const desiredX = this.playerX * 0.62 + shakeX;
    const desiredY = 4.35 + this.playerY * 0.48 + shakeY;
    const desiredZ = isBoost ? 7.8 : 7.05;

    this.camera.position.x = THREE.MathUtils.damp(
      this.camera.position.x,
      desiredX,
      10,
      dt,
    );
    this.camera.position.y = THREE.MathUtils.damp(
      this.camera.position.y,
      desiredY,
      8,
      dt,
    );
    this.camera.position.z = THREE.MathUtils.damp(
      this.camera.position.z,
      desiredZ,
      6,
      dt,
    );

    _vec3.set(
      this.playerX * 0.55,
      1.45 + this.playerY * 0.35,
      -9.5,
    );
    this.camera.lookAt(_vec3);
  }

  private updateMenuShowcase(dt: number): void {
    // Explorer poised in confident idle stance; monster looms ominously behind
    this.explorer.root.position.set(0, 0, 0);
    this.explorer.pelvis.position.y = 0.92 + Math.sin(this.elapsed * 2.4) * 0.025;
    this.explorer.torso.rotation.x = -0.05;
    this.explorer.leftLeg.rotation.x = -0.14;
    this.explorer.rightLeg.rotation.x = 0.16;
    this.explorer.leftShin.rotation.x = -0.05;
    this.explorer.rightShin.rotation.x = -0.1;
    this.explorer.leftArm.rotation.x = 0.15;
    this.explorer.rightArm.rotation.x = -0.12;
    this.explorer.scarfTail.rotation.x = 0.15 + Math.sin(this.elapsed * 4) * 0.1;

    this.monster.root.position.set(0, 0, 5.8);
    this.monster.torso.position.y = 1.45 + Math.sin(this.elapsed * 2.2) * 0.08;
    this.monster.leftArm.rotation.x = Math.sin(this.elapsed * 1.6) * 0.12;
    this.monster.rightArm.rotation.x = -Math.sin(this.elapsed * 1.6) * 0.12;

    // Gentle cinematic orbit framing both explorer and ancient temple path
    const sway = Math.sin(this.elapsed * 0.38) * 2.1;
    this.camera.position.set(
      2.6 + sway * 0.55,
      3.1 + Math.cos(this.elapsed * 0.32) * 0.35,
      -4.8,
    );
    _vec3.set(0, 1.4, 2.2);
    this.camera.lookAt(_vec3);
    void dt;
  }

  private updateGameOverAnimation(dt: number): void {
    if (this.fallOutTimer > 0) {
      // Falling down into the chasm
      this.fallOutTimer -= dt;
      this.playerVelY -= 26 * dt;
      this.explorer.root.position.y += this.playerVelY * dt;
      this.explorer.bodyGroup.rotation.x += dt * 3.5;
    } else {
      // Explorer collapsed / stunned on ground while monster looms right behind
      this.explorer.bodyGroup.rotation.x = THREE.MathUtils.damp(
        this.explorer.bodyGroup.rotation.x,
        -1.35,
        8,
        dt,
      );
      this.explorer.root.position.y = THREE.MathUtils.damp(
        this.explorer.root.position.y,
        0.25,
        8,
        dt,
      );
      this.monster.root.position.z = THREE.MathUtils.damp(
        this.monster.root.position.z,
        1.75,
        6,
        dt,
      );
      this.monster.leftArm.rotation.x = -0.9 + Math.sin(this.elapsed * 7) * 0.25;
      this.monster.rightArm.rotation.x = -0.9 - Math.sin(this.elapsed * 7) * 0.25;
    }

    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 1.5);
    }

    this.camera.position.x = THREE.MathUtils.damp(
      this.camera.position.x,
      this.playerX + 2.4,
      4,
      dt,
    );
    this.camera.position.y = THREE.MathUtils.damp(
      this.camera.position.y,
      2.6,
      4,
      dt,
    );
    this.camera.position.z = THREE.MathUtils.damp(
      this.camera.position.z,
      4.5,
      4,
      dt,
    );
    _vec3.set(this.playerX, Math.max(-2, this.explorer.root.position.y + 0.8), 0.5);
    this.camera.lookAt(_vec3);
  }

  private updateDecorAnimations(dt: number): void {
    // Scroll waterfall UVs
    this.textures.waterfallMap.offset.y -= dt * 1.4;

    // Flicker fire trap and torch flames
    for (const seg of this.segments) {
      for (let i = 0; i < seg.decor.flames.length; i++) {
        const f = seg.decor.flames[i];
        const flicker = 0.82 + Math.sin(this.elapsed * 18 + i * 2.1) * 0.22;
        f.scale.set(1, flicker, 1);
      }
    }
  }

  private spawnBurst(
    x: number,
    y: number,
    z: number,
    colorHex: number,
    count: number,
  ): void {
    let spawned = 0;
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.25;
      p.vx = (Math.random() - 0.5) * 6.5;
      p.vy = 2.0 + Math.random() * 5.2;
      p.vz = (Math.random() - 0.5) * 4.5;
      p.mat.color.setHex(colorHex);
      p.mat.opacity = 1;
      p.mesh.position.set(x, y, z);
      p.mesh.scale.setScalar(1);
      p.mesh.visible = true;
      spawned++;
      if (spawned >= count) break;
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vy -= 14 * dt;
      _vec3B.set(p.vx * dt, p.vy * dt, p.vz * dt);
      p.mesh.position.add(_vec3B);
      const t = 1 - p.life / p.maxLife;
      p.mat.opacity = t;
      p.mesh.scale.setScalar(0.4 + t * 0.8);
    }
  }

  private emitSnapshot(): void {
    this.onSnapshot({
      status: this.status,
      score: Math.floor(this.score),
      distance: Math.floor(this.distance),
      coins: this.runCoins,
      highScore: this.highScore,
      bestDistance: this.bestDistance,
      totalCoinsBank: this.totalCoinsBank,
      speed: Math.round(this.speed * 10) / 10,
      multiplier: this.activePowerUps.multiplier > 0 ? 2 : 1,
      monsterProximity: this.monsterProximity,
      activePowerUps: { ...this.activePowerUps },
      deathReason: this.deathReason,
      isNewHighScore: this.isNewHighScore,
      biome: this.currentBiome,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResizeBound);
    window.removeEventListener('keydown', this.handleKeyDownBound);
    window.removeEventListener('pointermove', this.handlePointerMoveBound);
    window.removeEventListener('pointerup', this.handlePointerUpBound);
    window.removeEventListener('pointercancel', this.handlePointerUpBound);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.handlePointerDownBound);
    dom.removeEventListener('webglcontextlost', this.handleContextLostBound);
    dom.removeEventListener('webglcontextrestored', this.handleContextRestoredBound);

    this.audio.dispose();

    for (const seg of this.segments) {
      this.disposeSegment(seg);
    }
    this.segments = [];

    for (const p of this.particles) {
      p.mat.dispose();
    }
    this.particleGeo.dispose();

    this.explorer.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose();
    });
    this.monster.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose();
    });

    this.mats.dispose();
    this.textures.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
