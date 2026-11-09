import * as THREE from 'three';

/**
 * Creates a procedural cyber highway grid texture using HTML5 Canvas.
 */
export function createCyberRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Deep cyber blue/dark gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, '#0a0d18');
  grad.addColorStop(0.5, '#070913');
  grad.addColorStop(1, '#05070e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Cross grid lines
  ctx.strokeStyle = 'rgba(30, 75, 140, 0.35)';
  ctx.lineWidth = 4;
  for (let y = 0; y < 1024; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // 3 Lane dividing dashes (Lanes at x = ~256, 512, 768)
  const laneDividers = [341, 682];
  laneDividers.forEach((x) => {
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
    ctx.lineWidth = 8;
    ctx.setLineDash([48, 48]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Outer glowing highway borders
  const borderGradLeft = ctx.createLinearGradient(0, 0, 80, 0);
  borderGradLeft.addColorStop(0, 'rgba(0, 240, 255, 0.9)');
  borderGradLeft.addColorStop(1, 'rgba(0, 240, 255, 0)');
  ctx.fillStyle = borderGradLeft;
  ctx.fillRect(0, 0, 80, 1024);

  const borderGradRight = ctx.createLinearGradient(944, 0, 1024, 0);
  borderGradRight.addColorStop(0, 'rgba(217, 70, 239, 0)');
  borderGradRight.addColorStop(1, 'rgba(217, 70, 239, 0.9)');
  ctx.fillStyle = borderGradRight;
  ctx.fillRect(944, 0, 80, 1024);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates a procedural letter texture for floating 3D letter coins.
 */
const letterTextureCache = new Map<string, THREE.CanvasTexture>();

export function getLetterTexture(char: string, isTarget: boolean = true): THREE.CanvasTexture {
  const key = `${char}_${isTarget}`;
  if (letterTextureCache.has(key)) {
    return letterTextureCache.get(key)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Circular / Octagonal glowing cyber crystal background
  ctx.clearRect(0, 0, 512, 512);

  // Background radial gradient
  const radGrad = ctx.createRadialGradient(256, 256, 40, 256, 256, 240);
  if (isTarget) {
    radGrad.addColorStop(0, 'rgba(24, 16, 52, 0.95)');
    radGrad.addColorStop(0.7, 'rgba(10, 8, 30, 0.95)');
    radGrad.addColorStop(1, 'rgba(76, 29, 149, 0.95)');
  } else {
    radGrad.addColorStop(0, 'rgba(16, 32, 45, 0.95)');
    radGrad.addColorStop(0.7, 'rgba(8, 18, 30, 0.95)');
    radGrad.addColorStop(1, 'rgba(14, 116, 144, 0.95)');
  }

  ctx.beginPath();
  ctx.arc(256, 256, 230, 0, Math.PI * 2);
  ctx.fillStyle = radGrad;
  ctx.fill();

  // Outer glowing ring
  ctx.strokeStyle = isTarget ? '#a855f7' : '#06b6d4';
  ctx.lineWidth = 14;
  ctx.stroke();

  // Secondary inner high-tech ring
  ctx.strokeStyle = isTarget ? '#ec4899' : '#38bdf8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 256, 205, 0, Math.PI * 2);
  ctx.stroke();

  // Render the Letter with Mitr font
  ctx.font = '700 240px "Mitr", "Segoe UI", Roboto, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Letter glow
  ctx.shadowColor = isTarget ? '#f43f5e' : '#38bdf8';
  ctx.shadowBlur = 32;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(char, 256, 256);

  // Second pass for crisp inner core
  ctx.shadowBlur = 0;
  ctx.fillStyle = isTarget ? '#fdf2f8' : '#f0fdfa';
  ctx.fillText(char, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  letterTextureCache.set(key, texture);
  return texture;
}

/**
 * Builds a composite 3-12 part procedural Gemini Runner Bot.
 * Parts:
 * 1. Torso core (faceted aerodynamic body with Gemini gradient)
 * 2. Glowing Visor / Head with holographic eyes
 * 3. Left shoulder pauldron
 * 4. Right shoulder pauldron
 * 5. Back thruster engine pod
 * 6. Thruster nozzle / plasma glow
 * 7. Left floating hand/arm
 * 8. Right floating hand/arm
 * 9. Left running leg/skid
 * 10. Right running leg/skid
 * 11. Chest Gemini emblem (twin spark diamond)
 * 12. Ground shadow projector disc
 */
export function buildGeminiRunnerCharacter(): {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  visor: THREE.Mesh;
  thrusterGlow: THREE.Mesh;
  chestEmblem: THREE.Mesh;
  groundShadow: THREE.Mesh;
} {
  const group = new THREE.Group();

  // Materials
  const armorMat = new THREE.MeshStandardMaterial({
    color: 0x1e1e38,
    metalness: 0.85,
    roughness: 0.25,
  });

  const whiteChassisMat = new THREE.MeshStandardMaterial({
    color: 0xeef2ff,
    metalness: 0.5,
    roughness: 0.2,
  });

  const cyanGlowMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00d0e0,
    emissiveIntensity: 1.8,
    metalness: 0.3,
    roughness: 0.1,
  });

  const magentaGlowMat = new THREE.MeshStandardMaterial({
    color: 0xff007f,
    emissive: 0xe00060,
    emissiveIntensity: 2.0,
    metalness: 0.2,
    roughness: 0.1,
  });

  // 1. Torso
  const torsoGeo = new THREE.CylinderGeometry(0.32, 0.22, 0.75, 6);
  const torso = new THREE.Mesh(torsoGeo, armorMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  group.add(torso);

  // Chest white breastplate
  const plateGeo = new THREE.BoxGeometry(0.42, 0.45, 0.2);
  const breastplate = new THREE.Mesh(plateGeo, whiteChassisMat);
  breastplate.position.set(0, 1.22, 0.16);
  group.add(breastplate);

  // 2. Chest Gemini Emblem (Dual Diamond)
  const emblemGeo = new THREE.OctahedronGeometry(0.12);
  const chestEmblem = new THREE.Mesh(emblemGeo, cyanGlowMat);
  chestEmblem.position.set(0, 1.25, 0.26);
  chestEmblem.scale.set(0.7, 1.2, 0.4);
  group.add(chestEmblem);

  // 3. Head & Visor
  const headGeo = new THREE.SphereGeometry(0.24, 16, 16);
  const head = new THREE.Mesh(headGeo, whiteChassisMat);
  head.position.set(0, 1.72, 0);
  head.castShadow = true;
  group.add(head);

  // Glowing Visor
  const visorGeo = new THREE.CylinderGeometry(0.23, 0.22, 0.14, 16, 1, false, 0, Math.PI);
  const visor = new THREE.Mesh(visorGeo, cyanGlowMat);
  visor.rotation.y = -Math.PI / 2;
  visor.position.set(0, 1.72, 0.08);
  group.add(visor);

  // 4 & 5. Shoulder Pauldrons
  const shoulderGeo = new THREE.ConeGeometry(0.18, 0.32, 5);
  const leftShoulder = new THREE.Mesh(shoulderGeo, armorMat);
  leftShoulder.position.set(-0.46, 1.45, 0);
  leftShoulder.rotation.z = Math.PI / 2.8;
  group.add(leftShoulder);

  const rightShoulder = new THREE.Mesh(shoulderGeo, armorMat);
  rightShoulder.position.set(0.46, 1.45, 0);
  rightShoulder.rotation.z = -Math.PI / 2.8;
  group.add(rightShoulder);

  // 6. Back Thruster Pod
  const podGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.5, 8);
  const thrusterPod = new THREE.Mesh(podGeo, armorMat);
  thrusterPod.position.set(0, 1.22, -0.26);
  thrusterPod.rotation.x = 0.2;
  group.add(thrusterPod);

  // Thruster flame / plasma nozzle
  const nozzleGeo = new THREE.ConeGeometry(0.12, 0.35, 8);
  const thrusterGlow = new THREE.Mesh(nozzleGeo, magentaGlowMat);
  thrusterGlow.position.set(0, 0.95, -0.32);
  thrusterGlow.rotation.x = Math.PI;
  group.add(thrusterGlow);

  // 7 & 8. Arms
  const armGeo = new THREE.CapsuleGeometry(0.08, 0.45, 4, 8);
  const leftArm = new THREE.Mesh(armGeo, armorMat);
  leftArm.position.set(-0.48, 1.15, 0);
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, armorMat);
  rightArm.position.set(0.48, 1.15, 0);
  group.add(rightArm);

  // 9 & 10. Legs
  const legGeo = new THREE.CapsuleGeometry(0.1, 0.65, 4, 8);
  const leftLeg = new THREE.Mesh(legGeo, whiteChassisMat);
  leftLeg.position.set(-0.22, 0.45, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, whiteChassisMat);
  rightLeg.position.set(0.22, 0.45, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // 11. Ground Contact Shadow Disc
  const shadowGeo = new THREE.PlaneGeometry(1.2, 1.2);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d')!;
  const sGrad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
  sGrad.addColorStop(0, 'rgba(0,0,0,0.7)');
  sGrad.addColorStop(1, 'rgba(0,0,0,0)');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 128, 128);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);

  const groundShadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const groundShadow = new THREE.Mesh(shadowGeo, groundShadowMat);
  groundShadow.rotation.x = -Math.PI / 2;
  groundShadow.position.y = 0.02;
  group.add(groundShadow);

  return {
    group,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    visor,
    thrusterGlow,
    chestEmblem,
    groundShadow,
  };
}

/**
 * Creates a composite procedural 3D Obstacle.
 */
export function createObstacleMesh(type: 'barrier' | 'laser' | 'spikes'): THREE.Group {
  const group = new THREE.Group();

  if (type === 'barrier') {
    // Low Cyber Laser Hurdle (Jump over)
    // Left post
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.3,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xff3b30,
      emissive: 0xff2020,
      emissiveIntensity: 2.2,
      roughness: 0.1,
    });

    const postGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.9, 8);
    const leftPost = new THREE.Mesh(postGeo, postMat);
    leftPost.position.set(-1.0, 0.45, 0);
    leftPost.castShadow = true;
    group.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, postMat);
    rightPost.position.set(1.0, 0.45, 0);
    rightPost.castShadow = true;
    group.add(rightPost);

    // Glowing laser beam bar (low, y = 0.5)
    const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.0, 8);
    const beam = new THREE.Mesh(beamGeo, glowMat);
    beam.rotation.z = Math.PI / 2;
    beam.position.set(0, 0.45, 0);
    group.add(beam);

    // Hazard warning stripes
    const hazardGeo = new THREE.BoxGeometry(2.0, 0.12, 0.12);
    const hazardMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.4,
      roughness: 0.4,
    });
    const hazardBar = new THREE.Mesh(hazardGeo, hazardMat);
    hazardBar.position.set(0, 0.25, 0);
    group.add(hazardBar);

  } else if (type === 'laser') {
    // High Energy Arch (Slide under)
    // Tall side pillars
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.2,
    });
    const archGlowMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x9333ea,
      emissiveIntensity: 2.4,
      roughness: 0.1,
    });

    const pillarGeo = new THREE.CylinderGeometry(0.14, 0.18, 2.8, 8);
    const leftPillar = new THREE.Mesh(pillarGeo, archMat);
    leftPillar.position.set(-1.1, 1.4, 0);
    leftPillar.castShadow = true;
    group.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, archMat);
    rightPillar.position.set(1.1, 1.4, 0);
    rightPillar.castShadow = true;
    group.add(rightPillar);

    // High plasma beam (y = 1.7 to 2.3) - player must slide under!
    const beamGeo = new THREE.BoxGeometry(2.2, 0.8, 0.25);
    const beam = new THREE.Mesh(beamGeo, archGlowMat);
    beam.position.set(0, 1.8, 0);
    group.add(beam);

  } else {
    // Spikes / Cyber Monolith (Switch lane)
    const monolithMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.15,
    });
    const spikeGlowMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 2.0,
      roughness: 0.1,
    });

    // Central faceted crystal
    const crystalGeo = new THREE.OctahedronGeometry(0.65, 0);
    const crystal = new THREE.Mesh(crystalGeo, monolithMat);
    crystal.scale.set(0.7, 1.6, 0.7);
    crystal.position.set(0, 1.0, 0);
    crystal.castShadow = true;
    group.add(crystal);

    // Glowing core spikes
    const coreSpikeGeo = new THREE.ConeGeometry(0.3, 1.8, 4);
    const spike = new THREE.Mesh(coreSpikeGeo, spikeGlowMat);
    spike.position.set(0, 0.9, 0);
    group.add(spike);

    // Base emitter ring
    const ringGeo = new THREE.TorusGeometry(0.5, 0.08, 6, 16);
    const ring = new THREE.Mesh(ringGeo, spikeGlowMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.08, 0);
    group.add(ring);
  }

  return group;
}

/**
 * Creates a 3D Floating Letter Token.
 */
export function createLetterTokenMesh(char: string, isTarget: boolean = true): {
  group: THREE.Group;
  diamondRing: THREE.Mesh;
  disc: THREE.Group;
} {
  const group = new THREE.Group();

  // Procedural letter texture
  const texture = getLetterTexture(char, isTarget);

  const discGroup = new THREE.Group();

  // Metallic cylinder body
  const rimGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.12, 24);
  const rimMat = new THREE.MeshStandardMaterial({
    color: isTarget ? 0x6d28d9 : 0x0284c7,
    metalness: 0.8,
    roughness: 0.2,
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.rotation.x = Math.PI / 2;
  discGroup.add(rimMesh);

  // Upright front & back faces pointing towards camera (-Z) and away (+Z)
  const faceGeo = new THREE.CircleGeometry(0.54, 28);
  const faceMat = new THREE.MeshStandardMaterial({
    map: texture,
    metalness: 0.3,
    roughness: 0.2,
    emissive: isTarget ? 0x3b0764 : 0x083344,
    emissiveIntensity: 0.65,
  });

  const frontFace = new THREE.Mesh(faceGeo, faceMat);
  frontFace.rotation.y = Math.PI; // Faces -Z (camera) upright!
  frontFace.position.z = -0.065;
  discGroup.add(frontFace);

  const backFace = new THREE.Mesh(faceGeo, faceMat);
  backFace.position.z = 0.065;
  discGroup.add(backFace);

  group.add(discGroup);

  // Outer spinning diamond ring
  const ringGeo = new THREE.TorusGeometry(0.78, 0.04, 6, 4);
  const ringMat = new THREE.MeshStandardMaterial({
    color: isTarget ? 0xf43f5e : 0x38bdf8,
    emissive: isTarget ? 0xe11d48 : 0x0284c7,
    emissiveIntensity: 1.8,
    metalness: 0.9,
    roughness: 0.1,
  });
  const diamondRing = new THREE.Mesh(ringGeo, ringMat);
  diamondRing.rotation.z = Math.PI / 4;
  group.add(diamondRing);

  // Subtle core light
  const light = new THREE.PointLight(isTarget ? 0xd946ef : 0x38bdf8, 1.2, 3);
  group.add(light);

  return { group, diamondRing, disc: discGroup };
}

/**
 * Creates a 3D Floating Heart Power-up Mesh (for restoring player hearts on the track).
 */
let cachedHeartGeo: THREE.ExtrudeGeometry | null = null;

export function createHeartPickupMesh(): {
  group: THREE.Group;
  heartMesh: THREE.Mesh;
  haloRing: THREE.Mesh;
} {
  const group = new THREE.Group();

  if (!cachedHeartGeo) {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.35);
    shape.bezierCurveTo(0, -0.35, -0.45, -0.05, -0.45, 0.22);
    shape.bezierCurveTo(-0.45, 0.45, -0.15, 0.52, 0, 0.28);
    shape.bezierCurveTo(0.15, 0.52, 0.45, 0.45, 0.45, 0.22);
    shape.bezierCurveTo(0.45, -0.05, 0, -0.35, 0, -0.35);

    cachedHeartGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.06,
      bevelThickness: 0.06,
    });
    cachedHeartGeo.center();
  }

  const heartMat = new THREE.MeshStandardMaterial({
    color: 0xff2a5f,
    emissive: 0xe11d48,
    emissiveIntensity: 1.6,
    metalness: 0.35,
    roughness: 0.15,
  });

  const heartMesh = new THREE.Mesh(cachedHeartGeo, heartMat);
  group.add(heartMesh);

  // Glowing healing halo ring
  const ringGeo = new THREE.TorusGeometry(0.66, 0.035, 8, 24);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 1.8,
    metalness: 0.8,
    roughness: 0.15,
  });
  const haloRing = new THREE.Mesh(ringGeo, ringMat);
  group.add(haloRing);

  const light = new THREE.PointLight(0xff2a5f, 1.4, 3.5);
  group.add(light);

  return { group, heartMesh, haloRing };
}

