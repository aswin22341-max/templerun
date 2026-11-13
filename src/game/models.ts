import * as THREE from 'three';
import { GameMaterials } from './materials';
import { ObstacleType, PowerUpType } from '../types/game';

export interface ExplorerRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  pelvis: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  scarfTail: THREE.Mesh;
  leftArm: THREE.Group;
  leftForearm: THREE.Group;
  rightArm: THREE.Group;
  rightForearm: THREE.Group;
  leftLeg: THREE.Group;
  leftShin: THREE.Group;
  rightLeg: THREE.Group;
  rightShin: THREE.Group;
  shieldMesh: THREE.Mesh;
  invincibleMesh: THREE.Mesh;
  contactShadow: THREE.Mesh;
}

export interface MonsterRig {
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  contactShadow: THREE.Mesh;
}

export function createExplorerModel(mats: GameMaterials): ExplorerRig {
  const root = new THREE.Group();

  // Contact shadow at y = 0.02
  const shadowGeo = new THREE.PlaneGeometry(1.35, 1.35);
  shadowGeo.rotateX(-Math.PI / 2);
  const contactShadow = new THREE.Mesh(shadowGeo, mats.contactShadow);
  contactShadow.position.y = 0.02;
  root.add(contactShadow);

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  // Pelvis (hip center at y = 0.92)
  const pelvis = new THREE.Group();
  pelvis.position.y = 0.92;
  bodyGroup.add(pelvis);

  const pelvisMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.18, 0.26),
    mats.explorerPants,
  );
  pelvisMesh.castShadow = true;
  pelvis.add(pelvisMesh);

  // Leather utility belt + brass buckle
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.07, 0.28),
    mats.explorerLeather,
  );
  belt.position.y = 0.06;
  pelvis.add(belt);

  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.08, 0.04),
    mats.goldCoin,
  );
  buckle.position.set(0, 0.06, -0.14);
  pelvis.add(buckle);

  // Torso
  const torso = new THREE.Group();
  torso.position.y = 0.12;
  pelvis.add(torso);

  const chest = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.54, 0.28),
    mats.explorerJacket,
  );
  chest.position.y = 0.27;
  chest.castShadow = true;
  torso.add(chest);

  // Scarf collar + trailing scarf tail
  const scarfCollar = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.055, 8, 16),
    mats.explorerScarf,
  );
  scarfCollar.rotation.x = Math.PI / 2;
  scarfCollar.position.set(0, 0.54, 0);
  torso.add(scarfCollar);

  const scarfTail = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.04, 0.42),
    mats.explorerScarf,
  );
  scarfTail.position.set(0.08, 0.52, 0.24);
  scarfTail.castShadow = true;
  torso.add(scarfTail);

  // Explorer backpack + rolled bedroll + brass latches
  const pack = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.42, 0.18),
    mats.explorerLeather,
  );
  pack.position.set(0, 0.29, 0.21);
  pack.castShadow = true;
  torso.add(pack);

  const bedroll = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 0.4, 10),
    mats.stoneTrim,
  );
  bedroll.rotation.z = Math.PI / 2;
  bedroll.position.set(0, 0.52, 0.22);
  torso.add(bedroll);

  // Head + Fedora Hat
  const head = new THREE.Group();
  head.position.set(0, 0.62, 0);
  torso.add(head);

  const headMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.28, 0.26),
    mats.explorerSkin,
  );
  headMesh.position.y = 0.14;
  headMesh.castShadow = true;
  head.add(headMesh);

  // Hat brim + crown + leather band
  const hatBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.3, 0.03, 16),
    mats.explorerHat,
  );
  hatBrim.position.y = 0.27;
  hatBrim.castShadow = true;
  head.add(hatBrim);

  const hatCrown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.18, 0.16, 12),
    mats.explorerHat,
  );
  hatCrown.position.y = 0.35;
  hatCrown.castShadow = true;
  head.add(hatCrown);

  const hatBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.182, 0.184, 0.035, 12),
    mats.explorerScarf,
  );
  hatBand.position.y = 0.29;
  head.add(hatBand);

  // Helper to build articulated arm
  const buildArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.3, 0.48, 0);
    torso.add(shoulder);

    const upper = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.28, 0.13),
      mats.explorerJacket,
    );
    upper.position.y = -0.13;
    upper.castShadow = true;
    shoulder.add(upper);

    const forearm = new THREE.Group();
    forearm.position.y = -0.27;
    shoulder.add(forearm);

    const lower = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.25, 0.11),
      mats.explorerSkin,
    );
    lower.position.y = -0.12;
    lower.castShadow = true;
    forearm.add(lower);

    const glove = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.09, 0.12),
      mats.explorerLeather,
    );
    glove.position.y = -0.25;
    forearm.add(glove);

    return { shoulder, forearm };
  };

  const leftA = buildArm(-1);
  const rightA = buildArm(1);

  // Helper to build articulated leg
  const buildLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.13, -0.05, 0);
    pelvis.add(hip);

    const thigh = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.42, 0.18),
      mats.explorerPants,
    );
    thigh.position.y = -0.21;
    thigh.castShadow = true;
    hip.add(thigh);

    const shinGroup = new THREE.Group();
    shinGroup.position.y = -0.42;
    hip.add(shinGroup);

    const shin = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.36, 0.16),
      mats.explorerPants,
    );
    shin.position.y = -0.18;
    shin.castShadow = true;
    shinGroup.add(shin);

    const boot = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.24),
      mats.explorerLeather,
    );
    boot.position.set(0, -0.37, -0.04);
    boot.castShadow = true;
    shinGroup.add(boot);

    return { hip, shinGroup };
  };

  const leftL = buildLeg(-1);
  const rightL = buildLeg(1);

  // Power-up aura visuals
  const shieldMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.12, 20, 16),
    mats.shieldBubble,
  );
  shieldMesh.position.y = 1.05;
  shieldMesh.visible = false;
  root.add(shieldMesh);

  const invincibleMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.22, 20, 16),
    mats.invincibleAura,
  );
  invincibleMesh.position.y = 1.05;
  invincibleMesh.visible = false;
  root.add(invincibleMesh);

  return {
    root,
    bodyGroup,
    pelvis,
    torso,
    head,
    scarfTail,
    leftArm: leftA.shoulder,
    leftForearm: leftA.forearm,
    rightArm: rightA.shoulder,
    rightForearm: rightA.forearm,
    leftLeg: leftL.hip,
    leftShin: leftL.shinGroup,
    rightLeg: rightL.hip,
    rightShin: rightL.shinGroup,
    shieldMesh,
    invincibleMesh,
    contactShadow,
  };
}

export function createMonsterModel(mats: GameMaterials): MonsterRig {
  const root = new THREE.Group();

  const shadowGeo = new THREE.PlaneGeometry(2.6, 2.6);
  shadowGeo.rotateX(-Math.PI / 2);
  const contactShadow = new THREE.Mesh(shadowGeo, mats.contactShadow);
  contactShadow.position.y = 0.02;
  root.add(contactShadow);

  const torso = new THREE.Group();
  torso.position.y = 1.45;
  root.add(torso);

  // Massive hunched beast torso
  const chest = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.95, 1),
    mats.monsterHide,
  );
  chest.scale.set(1.18, 1.05, 0.92);
  chest.castShadow = true;
  torso.add(chest);

  // Cracked stone shoulder pauldrons & dorsal spikes
  for (const s of [-1, 1]) {
    const pauldron = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.45, 0),
      mats.monsterArmor,
    );
    pauldron.position.set(s * 0.92, 0.35, -0.1);
    pauldron.castShadow = true;
    torso.add(pauldron);
  }

  for (let i = 0; i < 3; i++) {
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.55 - i * 0.08, 6),
      mats.monsterArmor,
    );
    spike.position.set(0, 0.65 - i * 0.25, 0.65 + i * 0.06);
    spike.rotation.x = 0.65;
    torso.add(spike);
  }

  // Head with glowing eyes & curved horns
  const head = new THREE.Group();
  head.position.set(0, 0.55, -0.78);
  torso.add(head);

  const skull = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.66, 0.72),
    mats.monsterHide,
  );
  skull.castShadow = true;
  head.add(skull);

  const stoneBrow = new THREE.Mesh(
    new THREE.BoxGeometry(0.84, 0.2, 0.5),
    mats.monsterArmor,
  );
  stoneBrow.position.set(0, 0.22, -0.18);
  head.add(stoneBrow);

  // Glowing eyes facing -Z toward the player
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 8, 8),
      mats.monsterEye,
    );
    eye.position.set(s * 0.2, 0.08, -0.36);
    head.add(eye);

    const horn = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.65, 7),
      mats.monsterHorn,
    );
    horn.position.set(s * 0.38, 0.38, -0.05);
    horn.rotation.z = -s * 0.55;
    horn.rotation.x = -0.35;
    head.add(horn);

    const tusk = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.26, 6),
      mats.monsterHorn,
    );
    tusk.position.set(s * 0.22, -0.22, -0.36);
    tusk.rotation.x = -0.3;
    head.add(tusk);
  }

  // Heavy articulated arms
  const buildMonsterArm = (s: -1 | 1) => {
    const arm = new THREE.Group();
    arm.position.set(s * 1.05, 0.2, -0.15);
    torso.add(arm);

    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 1.05, 8),
      mats.monsterHide,
    );
    upper.position.y = -0.5;
    upper.castShadow = true;
    arm.add(upper);

    const fist = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.32, 0),
      mats.monsterArmor,
    );
    fist.position.set(0, -1.05, -0.08);
    fist.castShadow = true;
    arm.add(fist);

    return arm;
  };

  const leftArm = buildMonsterArm(-1);
  const rightArm = buildMonsterArm(1);

  const buildMonsterLeg = (s: -1 | 1) => {
    const leg = new THREE.Group();
    leg.position.set(s * 0.5, 1.0, 0.15);
    root.add(leg);

    const limb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.2, 0.95, 8),
      mats.monsterHide,
    );
    limb.position.y = -0.46;
    limb.castShadow = true;
    leg.add(limb);

    return leg;
  };

  const leftLeg = buildMonsterLeg(-1);
  const rightLeg = buildMonsterLeg(1);

  return {
    root,
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    contactShadow,
  };
}

export function createCoinMesh(mats: GameMaterials): THREE.Group {
  const g = new THREE.Group();

  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.09, 18),
    mats.goldCoin,
  );
  disc.rotation.x = Math.PI / 2;
  g.add(disc);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.38, 0.055, 8, 18),
    mats.goldRim,
  );
  g.add(rim);

  const emblem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16, 0),
    mats.goldRim,
  );
  emblem.scale.set(1, 1, 0.35);
  g.add(emblem);

  return g;
}

export function createPowerUpMesh(
  type: PowerUpType,
  mats: GameMaterials,
): THREE.Group {
  const g = new THREE.Group();

  const colorMap: Record<PowerUpType, number> = {
    magnet: 0x38bdf8,
    boost: 0xf59e0b,
    shield: 0x10b981,
    multiplier: 0xa855f7,
    invincibility: 0xfacc15,
  };

  const coreMat = new THREE.MeshStandardMaterial({
    color: colorMap[type],
    emissive: colorMap[type],
    emissiveIntensity: 1.1,
    roughness: 0.2,
    metalness: 0.65,
  });

  // Outer gyro ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.56, 0.055, 8, 24),
    mats.goldCoin,
  );
  g.add(ring);

  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.035, 8, 20),
    coreMat,
  );
  innerRing.rotation.y = Math.PI / 2;
  g.add(innerRing);

  if (type === 'magnet') {
    const uShape = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.08, 10, 16, Math.PI),
      coreMat,
    );
    uShape.rotation.z = Math.PI;
    g.add(uShape);
    for (const s of [-1, 1]) {
      const tip = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.18, 0.14),
        mats.ironMetal,
      );
      tip.position.set(s * 0.24, 0.08, 0);
      g.add(tip);
    }
  } else if (type === 'boost') {
    const bolt = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.56, 5),
      coreMat,
    );
    bolt.rotation.z = -0.3;
    g.add(bolt);
    const wingL = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.1, 0.06),
      mats.goldCoin,
    );
    wingL.position.set(-0.2, 0.05, 0);
    wingL.rotation.z = 0.4;
    g.add(wingL);
  } else if (type === 'shield') {
    const buckler = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.24, 0.1, 8),
      coreMat,
    );
    buckler.rotation.x = Math.PI / 2;
    g.add(buckler);
    const boss = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 10),
      mats.goldCoin,
    );
    g.add(boss);
  } else if (type === 'multiplier') {
    const gem1 = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      coreMat,
    );
    gem1.position.set(-0.14, 0.08, 0);
    const gem2 = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      coreMat,
    );
    gem2.position.set(0.14, -0.08, 0);
    g.add(gem1, gem2);
  } else {
    // invincibility sun crown
    const sun = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 1),
      coreMat,
    );
    g.add(sun);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.04, 6, 16),
      mats.goldCoin,
    );
    halo.rotation.x = Math.PI / 3;
    g.add(halo);
  }

  g.userData.disposeExtra = () => coreMat.dispose();
  return g;
}

export function createObstacleGroup(
  type: ObstacleType,
  widthUnits: number,
  mats: GameMaterials,
): THREE.Group {
  const g = new THREE.Group();

  if (type === 'fallenTree') {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.48, widthUnits, 10),
      mats.bark,
    );
    trunk.rotation.z = Math.PI / 2;
    trunk.position.y = 0.46;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    g.add(trunk);

    // Broken branch stubs & mossy clusters
    for (let i = -1; i <= 1; i++) {
      const stub = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.55, 6),
        mats.bark,
      );
      stub.position.set(i * (widthUnits * 0.28), 0.85, i * 0.12);
      stub.rotation.z = i * 0.45;
      stub.rotation.x = 0.25;
      stub.castShadow = true;
      g.add(stub);

      const moss = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.26, 0),
        mats.foliageDark,
      );
      moss.scale.set(1.4, 0.5, 1.1);
      moss.position.set(i * 0.7, 0.82, 0.15);
      g.add(moss);
    }
  } else if (type === 'boulder') {
    const main = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.95, 1),
      mats.mossyRock,
    );
    main.position.y = 0.82;
    main.scale.set(1.05, 0.92, 0.95);
    main.castShadow = true;
    main.receiveShadow = true;
    g.add(main);

    const side1 = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.55, 0),
      mats.stoneWall,
    );
    side1.position.set(-0.62, 0.45, 0.25);
    side1.castShadow = true;
    g.add(side1);

    const mossCap = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.46, 0),
      mats.foliageLight,
    );
    mossCap.scale.set(1.4, 0.35, 1.2);
    mossCap.position.set(0.1, 1.5, -0.05);
    g.add(mossCap);
  } else if (type === 'fireTrap') {
    const trough = new THREE.Mesh(
      new THREE.BoxGeometry(widthUnits, 0.34, 0.95),
      mats.stoneWall,
    );
    trough.position.y = 0.17;
    trough.castShadow = true;
    trough.receiveShadow = true;
    g.add(trough);

    const grate = new THREE.Mesh(
      new THREE.BoxGeometry(widthUnits - 0.18, 0.08, 0.72),
      mats.ironMetal,
    );
    grate.position.y = 0.36;
    g.add(grate);

    const flames: THREE.Mesh[] = [];
    const count = Math.max(3, Math.round(widthUnits * 2));
    for (let i = 0; i < count; i++) {
      const fx = -widthUnits * 0.4 + (i / (count - 1)) * (widthUnits * 0.8);
      const outer = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.95, 7),
        mats.fireOuter,
      );
      outer.position.set(fx, 0.82, (i % 2 === 0 ? 1 : -1) * 0.08);
      g.add(outer);
      flames.push(outer);

      const inner = new THREE.Mesh(
        new THREE.ConeGeometry(0.13, 0.62, 6),
        mats.fireCore,
      );
      inner.position.set(fx, 0.68, 0);
      g.add(inner);
      flames.push(inner);
    }
    g.userData.flames = flames;
  } else if (type === 'stoneWall') {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(widthUnits, 2.35, 0.85),
      mats.stoneWall,
    );
    base.position.y = 1.18;
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(widthUnits + 0.18, 0.28, 1.02),
      mats.stoneTrim,
    );
    cap.position.y = 2.46;
    cap.castShadow = true;
    g.add(cap);

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(widthUnits + 0.16, 0.24, 1.02),
      mats.stoneTrim,
    );
    plinth.position.y = 0.12;
    g.add(plinth);
  } else if (type === 'woodBarrier') {
    const railTop = new THREE.Mesh(
      new THREE.BoxGeometry(widthUnits, 0.24, 0.22),
      mats.woodBridge,
    );
    railTop.position.y = 1.02;
    railTop.castShadow = true;
    g.add(railTop);

    const railMid = new THREE.Mesh(
      new THREE.BoxGeometry(widthUnits, 0.2, 0.2),
      mats.woodBridge,
    );
    railMid.position.y = 0.54;
    railMid.castShadow = true;
    g.add(railMid);

    const postCount = widthUnits > 3 ? 3 : 2;
    for (let i = 0; i < postCount; i++) {
      const px =
        postCount === 2
          ? (i === 0 ? -1 : 1) * (widthUnits * 0.38)
          : (i - 1) * (widthUnits * 0.38);
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.13, 1.25, 7),
        mats.bark,
      );
      post.position.set(px, 0.62, 0);
      post.castShadow = true;
      g.add(post);

      const lash = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.035, 6, 10),
        mats.rope,
      );
      lash.rotation.x = Math.PI / 2;
      lash.position.set(px, 1.02, 0);
      g.add(lash);
    }
  } else if (type === 'rotatingTrap') {
    // Twin stone pillars + central spinning bronze-spiked log rotor
    for (const s of [-1, 1]) {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 2.2, 0.45),
        mats.stoneWall,
      );
      pillar.position.set(s * (widthUnits * 0.52), 1.1, 0);
      pillar.castShadow = true;
      g.add(pillar);

      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.22, 0.56),
        mats.bronzeMetal,
      );
      cap.position.set(s * (widthUnits * 0.52), 2.25, 0);
      g.add(cap);
    }

    const rotor = new THREE.Group();
    rotor.position.y = 1.02;
    g.add(rotor);

    const axle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, widthUnits * 1.04, 10),
      mats.ironMetal,
    );
    axle.rotation.z = Math.PI / 2;
    axle.castShadow = true;
    rotor.add(axle);

    // 4 radial blades along the axle
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(widthUnits * 0.9, 0.16, 0.65),
        mats.bronzeMetal,
      );
      blade.position.set(0, Math.cos(angle) * 0.35, Math.sin(angle) * 0.35);
      blade.rotation.x = angle;
      blade.castShadow = true;
      rotor.add(blade);
    }
    g.userData.rotor = rotor;
  } else if (type === 'lowHanging') {
    // Tall side pillars + heavy overhead lintel beam at y = 1.12..2.55 (SLIDE UNDER!)
    const span = widthUnits;
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.28, 2.8, 8),
        mats.stoneWall,
      );
      post.position.set(s * (span * 0.52), 1.4, 0);
      post.castShadow = true;
      g.add(post);
    }

    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(span + 0.5, 1.25, 0.72),
      mats.stoneWall,
    );
    beam.position.y = 1.85; // Bottom edge at 1.225 -> standing (1.8m) hits, sliding (0.75m) clears cleanly!
    beam.castShadow = true;
    beam.receiveShadow = true;
    g.add(beam);

    const timberUnder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, span + 0.4, 8),
      mats.bark,
    );
    timberUnder.rotation.z = Math.PI / 2;
    timberUnder.position.y = 1.22;
    timberUnder.castShadow = true;
    g.add(timberUnder);

    // Hanging jungle vines & carved warning trim on bottom edge
    for (let i = -2; i <= 2; i++) {
      const vine = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.32, 5),
        mats.foliageLight,
      );
      vine.rotation.x = Math.PI;
      vine.position.set(i * (span * 0.18), 1.1, 0.25);
      g.add(vine);
    }
  }

  return g;
}

export function createTreeGroup(
  mats: GameMaterials,
  scale = 1,
): THREE.Group {
  const g = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24 * scale, 0.45 * scale, 5.2 * scale, 8),
    mats.bark,
  );
  trunk.position.y = 2.6 * scale;
  trunk.castShadow = true;
  g.add(trunk);

  // Buttress roots
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const root = new THREE.Mesh(
      new THREE.BoxGeometry(0.2 * scale, 1.1 * scale, 0.55 * scale),
      mats.bark,
    );
    root.position.set(
      Math.cos(a) * 0.35 * scale,
      0.5 * scale,
      Math.sin(a) * 0.35 * scale,
    );
    root.rotation.y = -a;
    root.rotation.x = 0.35;
    g.add(root);
  }

  // Multi-tier lush canopy
  const canopy1 = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.9 * scale, 1),
    mats.foliageDark,
  );
  canopy1.scale.set(1.2, 0.72, 1.2);
  canopy1.position.y = 5.0 * scale;
  canopy1.castShadow = true;
  g.add(canopy1);

  const canopy2 = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.4 * scale, 1),
    mats.foliageLight,
  );
  canopy2.scale.set(1.15, 0.68, 1.15);
  canopy2.position.set(0.45 * scale, 5.9 * scale, -0.3 * scale);
  g.add(canopy2);

  const canopy3 = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.1 * scale, 0),
    mats.foliageDark,
  );
  canopy3.position.set(-0.55 * scale, 5.5 * scale, 0.4 * scale);
  g.add(canopy3);

  return g;
}

export function createPillarGroup(
  mats: GameMaterials,
  broken = false,
): THREE.Group {
  const g = new THREE.Group();

  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.45, 1.2),
    mats.stoneTrim,
  );
  plinth.position.y = 0.225;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  g.add(plinth);

  const height = broken ? 2.8 : 4.8;
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.48, height, 10),
    mats.stoneWall,
  );
  shaft.position.y = 0.45 + height * 0.5;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  g.add(shaft);

  if (!broken) {
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.4, 1.25),
      mats.stoneTrim,
    );
    cap.position.y = 0.45 + height + 0.2;
    cap.castShadow = true;
    g.add(cap);
  }

  // Torch sconce on inner face
  const bracket = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.1, 0.14),
    mats.ironMetal,
  );
  bracket.position.set(0, 2.2, 0);
  g.add(bracket);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.48, 6),
    mats.fireCore,
  );
  flame.position.set(0, 2.48, 0);
  g.add(flame);
  g.userData.torchFlame = flame;

  return g;
}
