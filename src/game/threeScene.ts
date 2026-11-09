import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  buildGeminiRunnerCharacter,
  createCyberRoadTexture,
  createHeartPickupMesh,
  createLetterTokenMesh,
  createObstacleMesh,
} from './proceduralAssets';
import {
  ActiveLetter,
  ActiveObstacle,
  DifficultyLevelInfo,
  ObstacleType,
  WordEntry,
} from '../types/game';
import { getDifficultyForScore } from '../data/words';

const LANE_WIDTH = 2.4;
// Camera sits at -Z looking towards +Z, so +X is screen-left and -X is screen-right
const LANE_POSITIONS = [LANE_WIDTH, 0, -LANE_WIDTH];
const ROAD_SEGMENT_LENGTH = 80;
const TOTAL_ROAD_SEGMENTS = 4;
const OBSTACLE_SPAWN_HORIZON = 95;
const LETTER_SPAWN_HORIZON = 52;
const HEART_SPAWN_HORIZON = 80;

// Reusable math vectors to prevent GC allocations during render loop
const _vec3 = new THREE.Vector3();

export interface ActiveHeartPickup {
  id: number;
  lane: number;
  z: number;
  y: number;
  collected: boolean;
}

export interface GameEngineCallbacks {
  onLetterCollected: (char: string, index: number, pointsAdded: number, newScore: number) => void;
  onWordCompleted: (
    word: WordEntry,
    wordPoints: number,
    letterPointsEarned: number,
    newTotalScore: number,
    previousLevel: number,
    newLevelInfo: DifficultyLevelInfo
  ) => void;
  onHeartCollected: (newHp: number, maxHp: number) => void;
  onLevelUp: (newLevelInfo: DifficultyLevelInfo) => void;
  onPlayerHit: (damage: number, newHp: number) => void;
  onStatsUpdate: (
    score: number,
    distance: number,
    sessionPlaytime: number,
    levelInfo: DifficultyLevelInfo
  ) => void;
  onGameOver: () => void;
}

export class GeminiRunnerEngine {
  private container: HTMLElement;
  private callbacks: GameEngineCallbacks;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private isSoftwareGl: boolean = false;
  private frameId: number = 0;

  // Track & Environment
  private roadSegments: THREE.Mesh[] = [];
  private backgroundStars!: THREE.Points;
  private cyberBuildings: THREE.InstancedMesh | null = null;

  // Character
  private charGroup!: THREE.Group;
  private charParts!: ReturnType<typeof buildGeminiRunnerCharacter>;
  private playerTargetLane: number = 0; // -1, 0, 1
  private playerX: number = 0;
  private playerY: number = 0;
  private playerVy: number = 0;
  private isJumping: boolean = false;
  private isSliding: boolean = false;
  private slideTimer: number = 0;
  private invincibleTimer: number = 0;

  // Game Loop & State
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private speed: number = 15; // gentle student-friendly speed
  private targetSpeed: number = 15;
  private speedBonusOffset: number = 0;
  private distance: number = 0;
  private score: number = 0;
  private sessionPlaytime: number = 0;
  private currentLevelInfo: DifficultyLevelInfo = getDifficultyForScore(0);
  private hp: number = 3; // Starts with 3 hearts
  private maxHp: number = 5; // Can collect extra hearts up to 5 (or restore back to 3+)

  // Current Quest Word, Letters, Obstacles & Heart Pickups
  private currentWord: WordEntry | null = null;
  private collectedLettersCount: number = 0;
  private nextSpawnLetterIndex: number = 0;
  private currentWordLetterPoints: number = 0;
  private activeLetters: {
    data: ActiveLetter;
    meshData: ReturnType<typeof createLetterTokenMesh>;
  }[] = [];
  private activeObstacles: {
    data: ActiveObstacle;
    group: THREE.Group;
  }[] = [];
  private activeHearts: {
    data: ActiveHeartPickup;
    meshData: ReturnType<typeof createHeartPickupMesh>;
  }[] = [];

  // Spawning meters
  private nextObstacleZ: number = 36;
  private nextLetterZ: number = 16;
  private nextHeartZ: number = 42;
  private obstacleIdCounter: number = 0;
  private letterIdCounter: number = 0;
  private heartIdCounter: number = 0;

  // Camera Shake & Particle Emitters
  private cameraShake: number = 0;
  private particlesMesh!: THREE.Points;
  private particlePositions!: Float32Array;
  private particleVelocities!: Float32Array;
  private particleLifespans!: Float32Array;
  private readonly MAX_PARTICLES = 160;

  private clock = new THREE.Clock();

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.init();
  }

  private init(): void {
    // 1. Detect Software WebGL
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 2. Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);
    this.scene.fog = new THREE.FogExp2(0x060913, 0.016);

    // 3. Camera
    const aspect = this.container.clientWidth / this.container.clientHeight || 16 / 9;
    this.camera = new THREE.PerspectiveCamera(56, aspect, 0.1, 300);
    this.camera.position.set(0, 4.2, -6.8);
    this.camera.lookAt(0, 1.8, 10);

    // 4. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // 5. RoomEnvironment for Studio reflection
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 6. Lighting
    this.setupLighting();

    // 7. Track & Environment Scenery
    this.setupRoad();
    this.setupBackgroundStars();
    this.setupCyberBuildings();

    // 8. Player Character
    this.setupCharacter();

    // 9. Particles System
    this.setupParticles();

    // 10. Resize listener
    window.addEventListener('resize', this.onWindowResize);

    // Initial render
    this.renderer.render(this.scene, this.camera);
  }

  private setupLighting(): void {
    const hemiLight = new THREE.HemisphereLight(0x00d2ff, 0x1f0b3d, 1.2);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(12, 24, -14);
    if (!this.isSoftwareGl) {
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 60;
      dirLight.shadow.camera.left = -10;
      dirLight.shadow.camera.right = 10;
      dirLight.shadow.camera.top = 20;
      dirLight.shadow.camera.bottom = -5;
      dirLight.shadow.bias = -0.0005;
      dirLight.shadow.normalBias = 0.02;
    }
    this.scene.add(dirLight);

    const backGlow = new THREE.PointLight(0xa855f7, 2.0, 40);
    backGlow.position.set(0, 6, 25);
    this.scene.add(backGlow);
  }

  private setupRoad(): void {
    const roadTexture = createCyberRoadTexture();
    roadTexture.repeat.set(1, ROAD_SEGMENT_LENGTH / 12);
    if (!this.isSoftwareGl) {
      roadTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    }

    const roadGeo = new THREE.PlaneGeometry(9.6, ROAD_SEGMENT_LENGTH, 1, 1);
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: 0.25,
      metalness: 0.6,
    });

    for (let i = 0; i < TOTAL_ROAD_SEGMENTS; i++) {
      const mesh = new THREE.Mesh(roadGeo, roadMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(0, 0, i * ROAD_SEGMENT_LENGTH);
      mesh.receiveShadow = !this.isSoftwareGl;
      this.scene.add(mesh);
      this.roadSegments.push(mesh);
    }
  }

  private setupBackgroundStars(): void {
    const starCount = 600;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 300;
      starPos[i * 3 + 1] = Math.random() * 80 + 5;
      starPos[i * 3 + 2] = Math.random() * 260 - 20;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 1.2,
      transparent: true,
      opacity: 0.7,
    });

    this.backgroundStars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.backgroundStars);
  }

  private setupCyberBuildings(): void {
    const count = 36;
    const boxGeo = new THREE.BoxGeometry(4, 30, 8);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x090d1a,
      metalness: 0.8,
      roughness: 0.4,
    });

    this.cyberBuildings = new THREE.InstancedMesh(boxGeo, boxMat, count);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const rot = new THREE.Euler();
    const quat = new THREE.Quaternion();

    for (let i = 0; i < count; i++) {
      const isLeft = i % 2 === 0;
      const x = isLeft ? -16 - Math.random() * 18 : 16 + Math.random() * 18;
      const z = (i / 2) * 16 - 10;
      const h = 14 + Math.random() * 26;

      position.set(x, h / 2 - 2, z);
      scale.set(1 + Math.random() * 0.8, h / 30, 1 + Math.random() * 0.8);
      matrix.compose(position, quat.setFromEuler(rot), scale);
      this.cyberBuildings.setMatrixAt(i, matrix);
    }
    this.cyberBuildings.instanceMatrix.needsUpdate = true;
    this.scene.add(this.cyberBuildings);
  }

  private setupCharacter(): void {
    this.charParts = buildGeminiRunnerCharacter();
    this.charGroup = this.charParts.group;
    this.charGroup.position.set(0, 0, 0);
    this.scene.add(this.charGroup);
  }

  private setupParticles(): void {
    const geo = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.MAX_PARTICLES * 3);
    this.particleVelocities = new Float32Array(this.MAX_PARTICLES * 3);
    this.particleLifespans = new Float32Array(this.MAX_PARTICLES);

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particlePositions[i * 3] = 0;
      this.particlePositions[i * 3 + 1] = -100;
      this.particlePositions[i * 3 + 2] = 0;
      this.particleLifespans[i] = 0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.45,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particlesMesh = new THREE.Points(geo, mat);
    this.scene.add(this.particlesMesh);
  }

  private spawnParticle(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    life: number = 0.5
  ): void {
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      if (this.particleLifespans[i] <= 0) {
        this.particlePositions[i * 3] = x;
        this.particlePositions[i * 3 + 1] = y;
        this.particlePositions[i * 3 + 2] = z;
        this.particleVelocities[i * 3] = vx;
        this.particleVelocities[i * 3 + 1] = vy;
        this.particleVelocities[i * 3 + 2] = vz;
        this.particleLifespans[i] = life;
        break;
      }
    }
  }

  public burstSparks(x: number, y: number, z: number, count: number = 20): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 6;
      this.spawnParticle(
        x,
        y,
        z,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd + 2,
        (Math.random() - 0.5) * spd,
        0.4 + Math.random() * 0.4
      );
    }
  }

  // ---- Game Loop Control ----
  public start(newWord: WordEntry, initialSpeedOffset: number = 0): void {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.currentWord = newWord;
    this.collectedLettersCount = 0;
    this.nextSpawnLetterIndex = 0;
    this.currentWordLetterPoints = 0;

    // Player starts at 0 points and 3 hearts!
    this.score = 0;
    this.distance = 0;
    this.sessionPlaytime = 0;
    this.speedBonusOffset = initialSpeedOffset;
    this.currentLevelInfo = getDifficultyForScore(0);

    this.hp = 3;
    this.speed = this.currentLevelInfo.baseSpeed + this.speedBonusOffset;
    this.targetSpeed = this.speed;

    this.playerTargetLane = 0;
    this.playerX = 0;
    this.playerY = 0;
    this.playerVy = 0;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.invincibleTimer = 0;
    this.cameraShake = 0;
    this.charGroup.visible = true;

    this.clearAllSpawnedObjects();

    this.nextObstacleZ = 38;
    this.nextLetterZ = 16;
    this.nextHeartZ = 44;

    this.ensureUpcomingLetters();
    this.spawnObstacleAhead();
    this.spawnHeartAhead();

    this.callbacks.onStatsUpdate(0, 0, 0, this.currentLevelInfo);

    this.clock.start();
    this.loop();
  }

  /**
   * Resumes after the Word Translation Modal is closed:
   * - Clears nearby obstacles so the player never hits a hazard right after reading a word
   * - Grants a brief invincibility window
   * - Spawns the next word's letters and unpauses the game
   */
  public setWordAndResume(word: WordEntry): void {
    this.currentWord = word;
    this.collectedLettersCount = 0;
    this.nextSpawnLetterIndex = 0;
    this.currentWordLetterPoints = 0;

    // Remove any leftover letters from previous word
    this.activeLetters.forEach(({ meshData }) => {
      this.scene.remove(meshData.group);
    });
    this.activeLetters = [];

    // Clear any obstacles close to the player (z < 30) so player is 100% safe upon resuming!
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      if (this.activeObstacles[i].data.z < 30) {
        this.scene.remove(this.activeObstacles[i].group);
        this.activeObstacles.splice(i, 1);
      }
    }

    this.invincibleTimer = 1.6;
    this.nextLetterZ = 16;
    this.ensureUpcomingLetters();

    this.isPaused = false;
    this.clock.getDelta(); // reset clock delta so no jump in frame time occurs
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.clock.getDelta();
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
  }

  // ---- Player Controls ----
  public moveLeft(): void {
    if (!this.isRunning || this.isPaused) return;
    if (this.playerTargetLane > -1) {
      this.playerTargetLane -= 1;
    }
  }

  public moveRight(): void {
    if (!this.isRunning || this.isPaused) return;
    if (this.playerTargetLane < 1) {
      this.playerTargetLane += 1;
    }
  }

  public jump(): void {
    if (!this.isRunning || this.isPaused) return;
    if (!this.isJumping) {
      this.isSliding = false;
      this.slideTimer = 0;
      this.isJumping = true;
      this.playerVy = 14.2;
    }
  }

  public slide(): void {
    if (!this.isRunning || this.isPaused) return;
    this.isSliding = true;
    this.slideTimer = 0.65;
    if (this.isJumping) {
      this.playerVy = -20;
    }
  }

  // ---- Spawn Helpers ----
  private ensureUpcomingLetters(): void {
    if (!this.currentWord) return;
    const word = this.currentWord.word;

    while (
      this.activeLetters.length < 2 &&
      this.nextSpawnLetterIndex < word.length &&
      this.nextLetterZ < LETTER_SPAWN_HORIZON
    ) {
      const targetChar = word[this.nextSpawnLetterIndex];
      const laneChoices = [-1, 0, 1];
      let chosenLane = laneChoices[Math.floor(Math.random() * laneChoices.length)];

      // Keep letters well separated from obstacles in the same lane
      for (const obs of this.activeObstacles) {
        if (Math.abs(obs.data.z - this.nextLetterZ) < 6.0 && obs.data.lane === chosenLane) {
          chosenLane = ((chosenLane + 2) % 3) - 1;
        }
      }

      // 35% of letters float higher so player jumps to collect them
      const isHighJumpLetter = Math.random() < 0.35;
      const baseHeight = isHighJumpLetter ? 2.15 : 1.15;

      const id = ++this.letterIdCounter;
      const meshData = createLetterTokenMesh(targetChar, true);
      meshData.group.position.set(LANE_POSITIONS[chosenLane + 1], baseHeight, this.nextLetterZ);
      this.scene.add(meshData.group);

      this.activeLetters.push({
        data: {
          id,
          char: targetChar,
          wordId: this.currentWord.id,
          letterIndex: this.nextSpawnLetterIndex,
          isTargetLetter: true,
          lane: chosenLane,
          z: this.nextLetterZ,
          y: baseHeight,
          collected: false,
        },
        meshData,
      });

      this.nextSpawnLetterIndex++;
      this.nextLetterZ += 16 + Math.random() * 5;
    }
  }

  private spawnHeartAhead(): void {
    if (this.activeHearts.length >= 2) return;

    const laneChoices = [-1, 0, 1];
    let chosenLane = laneChoices[Math.floor(Math.random() * laneChoices.length)];

    // Avoid overlapping obstacles or letters
    for (const obs of this.activeObstacles) {
      if (Math.abs(obs.data.z - this.nextHeartZ) < 6.0 && obs.data.lane === chosenLane) {
        chosenLane = ((chosenLane + 2) % 3) - 1;
      }
    }

    const isJumpHeart = Math.random() < 0.4;
    const baseHeight = isJumpHeart ? 2.1 : 1.15;

    const id = ++this.heartIdCounter;
    const meshData = createHeartPickupMesh();
    meshData.group.position.set(LANE_POSITIONS[chosenLane + 1], baseHeight, this.nextHeartZ);
    this.scene.add(meshData.group);

    this.activeHearts.push({
      data: {
        id,
        lane: chosenLane,
        z: this.nextHeartZ,
        y: baseHeight,
        collected: false,
      },
      meshData,
    });

    // Spawn hearts more frequently if the player has fewer than 3 hearts!
    const gap = this.hp < 3 ? 34 + Math.random() * 14 : 52 + Math.random() * 20;
    this.nextHeartZ += gap;
  }

  private spawnObstacleAhead(): void {
    const types: ObstacleType[] = ['barrier', 'laser', 'spikes'];
    const type = types[Math.floor(Math.random() * types.length)];
    const laneChoices = [-1, 0, 1];
    let lane = laneChoices[Math.floor(Math.random() * laneChoices.length)];

    // Avoid spawning an obstacle right on top of an active letter or heart
    for (const letObj of this.activeLetters) {
      if (Math.abs(letObj.data.z - this.nextObstacleZ) < 6.0 && letObj.data.lane === lane) {
        lane = ((lane + 2) % 3) - 1;
      }
    }

    this.createSingleObstacle(type, lane, this.nextObstacleZ);

    // Gentle obstacle spacing from current DifficultyLevelInfo
    const { obstacleGapMin, obstacleGapMax } = this.currentLevelInfo;
    const gap = obstacleGapMin + Math.random() * (obstacleGapMax - obstacleGapMin);
    this.nextObstacleZ += gap;
  }

  private createSingleObstacle(type: ObstacleType, lane: number, zPos: number): void {
    const id = ++this.obstacleIdCounter;
    const group = createObstacleMesh(type);
    group.position.set(LANE_POSITIONS[lane + 1], 0, zPos);
    this.scene.add(group);

    this.activeObstacles.push({
      data: {
        id,
        type,
        lane,
        z: zPos,
        width: type === 'spikes' ? 1.2 : 2.0,
        height: type === 'laser' ? 2.8 : 0.9,
        passed: false,
      },
      group,
    });
  }

  private clearAllSpawnedObjects(): void {
    this.activeLetters.forEach(({ meshData }) => {
      this.scene.remove(meshData.group);
    });
    this.activeLetters = [];

    this.activeObstacles.forEach(({ group }) => {
      this.scene.remove(group);
    });
    this.activeObstacles = [];

    this.activeHearts.forEach(({ meshData }) => {
      this.scene.remove(meshData.group);
    });
    this.activeHearts = [];
  }

  // ---- Main Game Animation Loop ----
  private loop = (): void => {
    if (!this.isRunning) return;

    const rawDt = this.clock.getDelta();
    const clampedDt = Math.min(rawDt, 0.05);

    // When paused (including when the vocabulary translation modal is on screen),
    // the character and obstacles completely stop so the player can never die while reading!
    if (!this.isPaused) {
      this.sessionPlaytime += clampedDt;
      this.updateSimulation(clampedDt);
    }

    this.render();

    this.frameId = requestAnimationFrame(this.loop);
  };

  private updateSimulation(dt: number): void {
    // 1. Speed scales gently with Score-based Difficulty Level
    this.targetSpeed = this.currentLevelInfo.baseSpeed + this.speedBonusOffset;
    this.speed = THREE.MathUtils.damp(this.speed, this.targetSpeed, 2.5, dt);
    const frameDistance = this.speed * dt;
    this.distance += frameDistance;

    this.callbacks.onStatsUpdate(
      this.score,
      Math.floor(this.distance),
      this.sessionPlaytime,
      this.currentLevelInfo
    );

    // 2. Road Recycle
    this.roadSegments.forEach((seg) => {
      seg.position.z -= frameDistance;
      if (seg.position.z < -ROAD_SEGMENT_LENGTH) {
        seg.position.z += TOTAL_ROAD_SEGMENTS * ROAD_SEGMENT_LENGTH;
      }
    });

    // 3. Move Obstacles & Check Collisions
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      const obs = this.activeObstacles[i];
      obs.data.z -= frameDistance;
      obs.group.position.z = obs.data.z;

      if (
        !obs.data.passed &&
        obs.data.z > -0.7 &&
        obs.data.z < 0.7 &&
        Math.abs(this.playerX - LANE_POSITIONS[obs.data.lane + 1]) < 0.88
      ) {
        let isHit = false;

        if (obs.data.type === 'barrier') {
          if (this.playerY < 0.75) isHit = true;
        } else if (obs.data.type === 'laser') {
          if (!this.isSliding || this.playerY > 0.4) isHit = true;
        } else {
          isHit = true;
        }

        if (isHit && this.invincibleTimer <= 0) {
          obs.data.passed = true;
          this.handlePlayerHit();
          if (this.hp <= 0) return;
        }
      }

      if (obs.data.z < -15) {
        this.scene.remove(obs.group);
        this.activeObstacles.splice(i, 1);
      }
    }

    this.nextObstacleZ -= frameDistance;
    if (this.nextObstacleZ < OBSTACLE_SPAWN_HORIZON) {
      this.spawnObstacleAhead();
    }

    // 4. Move Heart Pickups & Check Collection
    for (let i = this.activeHearts.length - 1; i >= 0; i--) {
      const heartObj = this.activeHearts[i];
      heartObj.data.z -= frameDistance;
      heartObj.meshData.group.position.z = heartObj.data.z;

      // Spin heart and halo ring
      heartObj.meshData.heartMesh.rotation.y += dt * 2.4;
      heartObj.meshData.haloRing.rotation.z -= dt * 2.0;
      const bobY = heartObj.data.y + Math.sin(this.distance * 0.14 + heartObj.data.id) * 0.14;
      heartObj.meshData.group.position.y = bobY;

      const verticalDist = Math.abs(this.playerY + 0.9 - bobY);
      if (
        !heartObj.data.collected &&
        heartObj.data.z > -1.15 &&
        heartObj.data.z < 1.15 &&
        Math.abs(this.playerX - LANE_POSITIONS[heartObj.data.lane + 1]) < 1.15 &&
        verticalDist < 1.5
      ) {
        heartObj.data.collected = true;
        this.burstSparks(
          heartObj.meshData.group.position.x,
          heartObj.meshData.group.position.y,
          heartObj.meshData.group.position.z,
          24
        );
        this.scene.remove(heartObj.meshData.group);
        this.activeHearts.splice(i, 1);

        // Increase player heart (up to maxHp = 5)
        this.hp = Math.min(this.maxHp, this.hp + 1);
        this.callbacks.onHeartCollected(this.hp, this.maxHp);
        continue;
      }

      if (heartObj.data.z < -10) {
        this.scene.remove(heartObj.meshData.group);
        this.activeHearts.splice(i, 1);
      }
    }

    this.nextHeartZ = Math.max(24, this.nextHeartZ - frameDistance);
    if (this.nextHeartZ < HEART_SPAWN_HORIZON && this.activeHearts.length < 2) {
      this.spawnHeartAhead();
    }

    // 5. Move Letters & Check Collection
    for (let i = this.activeLetters.length - 1; i >= 0; i--) {
      const letObj = this.activeLetters[i];
      letObj.data.z -= frameDistance;
      letObj.meshData.group.position.z = letObj.data.z;

      letObj.meshData.diamondRing.rotation.z += dt * 3.5;
      letObj.meshData.disc.rotation.y = Math.sin(this.distance * 0.15 + letObj.data.id) * 0.25;
      const bobY = letObj.data.y + Math.sin(this.distance * 0.12 + letObj.data.id) * 0.15;
      letObj.meshData.group.position.y = bobY;

      const verticalDist = Math.abs(this.playerY + 0.9 - bobY);
      if (
        !letObj.data.collected &&
        letObj.data.z > -1.2 &&
        letObj.data.z < 1.2 &&
        Math.abs(this.playerX - LANE_POSITIONS[letObj.data.lane + 1]) < 1.15 &&
        verticalDist < 1.5
      ) {
        letObj.data.collected = true;
        this.burstSparks(
          letObj.meshData.group.position.x,
          letObj.meshData.group.position.y,
          letObj.meshData.group.position.z,
          26
        );
        this.scene.remove(letObj.meshData.group);
        this.activeLetters.splice(i, 1);

        this.handleLetterCollected(letObj.data);
        // If completing the word paused the game, stop processing remaining objects this frame
        if (this.isPaused) return;
        continue;
      }

      // If player missed the target letter, recycle it ahead so they can still complete the word
      if (letObj.data.z < -8) {
        this.scene.remove(letObj.meshData.group);
        this.activeLetters.splice(i, 1);
        if (!letObj.data.collected && this.currentWord) {
          this.nextSpawnLetterIndex = this.collectedLettersCount;
          this.activeLetters.forEach(({ meshData }) => this.scene.remove(meshData.group));
          this.activeLetters = [];
          this.nextLetterZ = Math.max(16, this.nextLetterZ);
          this.ensureUpcomingLetters();
          break;
        }
      }
    }

    this.nextLetterZ = Math.max(14, this.nextLetterZ - frameDistance);
    this.ensureUpcomingLetters();

    // 6. Update Player Physics & Kinematics
    const targetX = LANE_POSITIONS[this.playerTargetLane + 1];
    this.playerX = THREE.MathUtils.damp(this.playerX, targetX, 16, dt);
    this.charGroup.position.x = this.playerX;

    const laneDiff = targetX - this.playerX;
    this.charGroup.rotation.z = THREE.MathUtils.damp(
      this.charGroup.rotation.z,
      -laneDiff * 0.35,
      12,
      dt
    );
    this.charGroup.rotation.y = THREE.MathUtils.damp(
      this.charGroup.rotation.y,
      laneDiff * 0.2,
      12,
      dt
    );

    if (this.isJumping) {
      this.playerY += this.playerVy * dt;
      this.playerVy -= 36 * dt;
      if (this.playerY <= 0) {
        this.playerY = 0;
        this.playerVy = 0;
        this.isJumping = false;
        this.burstSparks(this.playerX, 0.05, 0, 6);
      }
    }
    this.charGroup.position.y = this.playerY;

    if (this.isSliding) {
      this.slideTimer -= dt;
      this.charGroup.scale.y = THREE.MathUtils.damp(this.charGroup.scale.y, 0.45, 20, dt);
      this.charGroup.scale.z = THREE.MathUtils.damp(this.charGroup.scale.z, 1.3, 20, dt);
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    } else {
      const targetScaleY = this.isJumping ? 1.15 : 1.0;
      this.charGroup.scale.y = THREE.MathUtils.damp(this.charGroup.scale.y, targetScaleY, 14, dt);
      this.charGroup.scale.z = THREE.MathUtils.damp(this.charGroup.scale.z, 1.0, 14, dt);
    }

    const runCycle = this.distance * 1.8;
    if (!this.isJumping && !this.isSliding) {
      this.charParts.leftLeg.rotation.x = Math.sin(runCycle) * 0.7;
      this.charParts.rightLeg.rotation.x = -Math.sin(runCycle) * 0.7;
      this.charParts.leftArm.rotation.x = -Math.sin(runCycle) * 0.6;
      this.charParts.rightArm.rotation.x = Math.sin(runCycle) * 0.6;
    } else if (this.isJumping) {
      this.charParts.leftLeg.rotation.x = -0.5;
      this.charParts.rightLeg.rotation.x = -0.3;
      this.charParts.leftArm.rotation.x = 0.8;
      this.charParts.rightArm.rotation.x = 0.8;
    } else if (this.isSliding) {
      this.charParts.leftLeg.rotation.x = 1.1;
      this.charParts.rightLeg.rotation.x = 1.1;
    }

    if (Math.random() < 0.6) {
      this.spawnParticle(
        this.playerX + (Math.random() - 0.5) * 0.2,
        this.playerY + 1.0,
        -0.4,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        -4,
        0.3
      );
    }

    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
      this.charGroup.visible = Math.floor(this.invincibleTimer * 20) % 2 === 0;
    } else {
      this.charGroup.visible = true;
    }

    // 7. Camera Follow with Decaying Shake
    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 3);
    }
    const shakeX = (Math.random() - 0.5) * this.cameraShake * 0.4;
    const shakeY = (Math.random() - 0.5) * this.cameraShake * 0.4;

    this.camera.position.x = THREE.MathUtils.damp(
      this.camera.position.x,
      this.playerX * 0.6 + shakeX,
      8,
      dt
    );
    this.camera.position.y = THREE.MathUtils.damp(
      this.camera.position.y,
      4.2 + this.playerY * 0.4 + shakeY,
      8,
      dt
    );
    this.camera.position.z = -6.8;

    _vec3.set(this.playerX * 0.4, 1.8 + this.playerY * 0.3, 10);
    this.camera.lookAt(_vec3);

    // 8. Update Particles System
    this.updateParticles(dt);
  }

  private updateParticles(dt: number): void {
    let activeCount = 0;
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      if (this.particleLifespans[i] > 0) {
        this.particleLifespans[i] -= dt;
        this.particlePositions[i * 3] += this.particleVelocities[i * 3] * dt;
        this.particlePositions[i * 3 + 1] += this.particleVelocities[i * 3 + 1] * dt;
        this.particlePositions[i * 3 + 2] += this.particleVelocities[i * 3 + 2] * dt;
        activeCount++;
      } else {
        this.particlePositions[i * 3 + 1] = -100;
      }
    }
    if (activeCount > 0 || this.particlesMesh.geometry.attributes.position.needsUpdate) {
      this.particlesMesh.geometry.attributes.position.needsUpdate = true;
    }
  }

  private checkScoreLevelProgression(previousLevel: number): DifficultyLevelInfo {
    const updatedLevelInfo = getDifficultyForScore(this.score);
    this.currentLevelInfo = updatedLevelInfo;
    if (updatedLevelInfo.level > previousLevel) {
      this.callbacks.onLevelUp(updatedLevelInfo);
    }
    return updatedLevelInfo;
  }

  private handlePlayerHit(): void {
    this.hp = Math.max(0, this.hp - 1);
    this.invincibleTimer = 1.6;
    this.cameraShake = 0.8;
    this.burstSparks(this.playerX, 1.2, 0, 30);
    this.callbacks.onPlayerHit(1, this.hp);

    if (this.hp <= 0) {
      this.isPaused = true;
      this.charGroup.visible = true;
      this.callbacks.onGameOver();
    }
  }

  private handleLetterCollected(letterData: ActiveLetter): void {
    if (!this.currentWord) return;

    const prevLevel = this.currentLevelInfo.level;
    this.collectedLettersCount++;

    const letterPts = Math.round(50 * this.currentLevelInfo.speedMultiplier);
    this.score += letterPts;
    this.currentWordLetterPoints += letterPts;

    const updatedLevelAfterLetter = this.checkScoreLevelProgression(prevLevel);

    this.callbacks.onLetterCollected(
      letterData.char,
      this.collectedLettersCount - 1,
      letterPts,
      this.score
    );

    // Check if the full English word is completed!
    if (this.collectedLettersCount >= this.currentWord.word.length) {
      // Immediately STOP/PAUSE the simulation so the character never runs forward or hits obstacles while reading!
      this.isPaused = true;
      this.charGroup.visible = true;

      const levelBeforeBonus = updatedLevelAfterLetter.level;
      const wordCompletionBonus =
        this.currentWord.word.length * 100 + (this.currentLevelInfo.level - 1) * 100;
      this.score += wordCompletionBonus;

      const finalLevelInfo = this.checkScoreLevelProgression(levelBeforeBonus);

      this.callbacks.onStatsUpdate(
        this.score,
        Math.floor(this.distance),
        this.sessionPlaytime,
        finalLevelInfo
      );

      this.callbacks.onWordCompleted(
        this.currentWord,
        wordCompletionBonus,
        this.currentWordLetterPoints,
        this.score,
        prevLevel,
        finalLevelInfo
      );
    } else {
      this.ensureUpcomingLetters();
    }
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize = (): void => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.onWindowResize);
    this.clearAllSpawnedObjects();
    this.renderer.dispose();
  }
}
