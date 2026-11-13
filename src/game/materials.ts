import * as THREE from 'three';
import { ProceduralTextureSet } from './textures';

export interface GameMaterials {
  templeFloor: THREE.MeshStandardMaterial;
  jungleFloor: THREE.MeshStandardMaterial;
  woodBridge: THREE.MeshStandardMaterial;
  stoneWall: THREE.MeshStandardMaterial;
  stoneTrim: THREE.MeshStandardMaterial;
  mossyRock: THREE.MeshStandardMaterial;
  bark: THREE.MeshStandardMaterial;
  foliageDark: THREE.MeshStandardMaterial;
  foliageLight: THREE.MeshStandardMaterial;
  jungleFloorGrass: THREE.MeshStandardMaterial;
  cliffRock: THREE.MeshStandardMaterial;
  waterfall: THREE.MeshStandardMaterial;
  gorgeWater: THREE.MeshStandardMaterial;
  goldCoin: THREE.MeshStandardMaterial;
  goldRim: THREE.MeshStandardMaterial;
  bronzeMetal: THREE.MeshStandardMaterial;
  ironMetal: THREE.MeshStandardMaterial;
  rope: THREE.MeshStandardMaterial;
  fireCore: THREE.MeshStandardMaterial;
  fireOuter: THREE.MeshStandardMaterial;
  explorerSkin: THREE.MeshStandardMaterial;
  explorerJacket: THREE.MeshStandardMaterial;
  explorerPants: THREE.MeshStandardMaterial;
  explorerLeather: THREE.MeshStandardMaterial;
  explorerScarf: THREE.MeshStandardMaterial;
  explorerHat: THREE.MeshStandardMaterial;
  monsterHide: THREE.MeshStandardMaterial;
  monsterArmor: THREE.MeshStandardMaterial;
  monsterEye: THREE.MeshStandardMaterial;
  monsterHorn: THREE.MeshStandardMaterial;
  shieldBubble: THREE.MeshStandardMaterial;
  invincibleAura: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  dispose: () => void;
}

export function createGameMaterials(tex: ProceduralTextureSet): GameMaterials {
  const templeFloor = new THREE.MeshStandardMaterial({
    map: tex.templeStoneMap,
    bumpMap: tex.templeStoneBump,
    bumpScale: 0.06,
    roughness: 0.86,
    metalness: 0.04,
  });

  const jungleFloor = new THREE.MeshStandardMaterial({
    map: tex.junglePathMap,
    roughness: 0.92,
    metalness: 0.02,
  });

  const woodBridge = new THREE.MeshStandardMaterial({
    map: tex.woodPlankMap,
    roughness: 0.84,
    metalness: 0.05,
  });

  const stoneWall = new THREE.MeshStandardMaterial({
    map: tex.sandstoneWallMap,
    roughness: 0.88,
    metalness: 0.05,
  });

  const stoneTrim = new THREE.MeshStandardMaterial({
    color: 0x9b8d72,
    roughness: 0.78,
    metalness: 0.08,
  });

  const mossyRock = new THREE.MeshStandardMaterial({
    color: 0x5c6257,
    roughness: 0.92,
    metalness: 0.03,
  });

  const bark = new THREE.MeshStandardMaterial({
    map: tex.barkMap,
    roughness: 0.94,
    metalness: 0.0,
  });

  const foliageDark = new THREE.MeshStandardMaterial({
    color: 0x24562b,
    roughness: 0.82,
    metalness: 0.0,
  });

  const foliageLight = new THREE.MeshStandardMaterial({
    color: 0x3b7a38,
    roughness: 0.78,
    metalness: 0.0,
  });

  const jungleFloorGrass = new THREE.MeshStandardMaterial({
    color: 0x294d26,
    roughness: 0.95,
    metalness: 0.0,
  });

  const cliffRock = new THREE.MeshStandardMaterial({
    color: 0x45423c,
    roughness: 0.92,
    metalness: 0.04,
  });

  const waterfall = new THREE.MeshStandardMaterial({
    map: tex.waterfallMap,
    transparent: true,
    opacity: 0.84,
    roughness: 0.22,
    metalness: 0.1,
    emissive: 0x164e63,
    emissiveIntensity: 0.35,
  });

  const gorgeWater = new THREE.MeshStandardMaterial({
    color: 0x175a6b,
    roughness: 0.18,
    metalness: 0.25,
    emissive: 0x092b36,
    emissiveIntensity: 0.4,
  });

  const goldCoin = new THREE.MeshStandardMaterial({
    color: 0xffc83b,
    metalness: 0.92,
    roughness: 0.18,
    emissive: 0x6b4500,
    emissiveIntensity: 0.25,
  });

  const goldRim = new THREE.MeshStandardMaterial({
    color: 0xe69f14,
    metalness: 0.88,
    roughness: 0.32,
  });

  const bronzeMetal = new THREE.MeshStandardMaterial({
    color: 0xb07c3e,
    metalness: 0.82,
    roughness: 0.32,
  });

  const ironMetal = new THREE.MeshStandardMaterial({
    color: 0x3f434a,
    metalness: 0.85,
    roughness: 0.35,
  });

  const rope = new THREE.MeshStandardMaterial({
    color: 0x9b7e4f,
    roughness: 0.94,
    metalness: 0.0,
  });

  const fireCore = new THREE.MeshStandardMaterial({
    color: 0xffe484,
    emissive: 0xffaa22,
    emissiveIntensity: 2.2,
    roughness: 0.4,
    metalness: 0.0,
  });

  const fireOuter = new THREE.MeshStandardMaterial({
    color: 0xff5511,
    emissive: 0xff3b00,
    emissiveIntensity: 1.6,
    roughness: 0.5,
    metalness: 0.0,
    transparent: true,
    opacity: 0.88,
  });

  // Explorer character materials (distinct roughness contrast >= 0.25 across adjacent parts)
  const explorerSkin = new THREE.MeshStandardMaterial({
    color: 0xdba882,
    roughness: 0.68,
    metalness: 0.0,
  });

  const explorerJacket = new THREE.MeshStandardMaterial({
    color: 0xc29e6c,
    roughness: 0.85,
    metalness: 0.02,
  });

  const explorerPants = new THREE.MeshStandardMaterial({
    color: 0x3c4b3b,
    roughness: 0.88,
    metalness: 0.02,
  });

  const explorerLeather = new THREE.MeshStandardMaterial({
    color: 0x5c361e,
    roughness: 0.52,
    metalness: 0.12,
  });

  const explorerScarf = new THREE.MeshStandardMaterial({
    color: 0xb93829,
    roughness: 0.82,
    metalness: 0.0,
  });

  const explorerHat = new THREE.MeshStandardMaterial({
    color: 0x6b4528,
    roughness: 0.78,
    metalness: 0.05,
  });

  // Monster guardian materials
  const monsterHide = new THREE.MeshStandardMaterial({
    color: 0x221c1d,
    roughness: 0.88,
    metalness: 0.08,
  });

  const monsterArmor = new THREE.MeshStandardMaterial({
    color: 0x4b4a46,
    roughness: 0.55,
    metalness: 0.35,
  });

  const monsterEye = new THREE.MeshStandardMaterial({
    color: 0xff4411,
    emissive: 0xff3300,
    emissiveIntensity: 2.8,
    roughness: 0.2,
  });

  const monsterHorn = new THREE.MeshStandardMaterial({
    color: 0xd8cdb8,
    roughness: 0.42,
    metalness: 0.1,
  });

  const shieldBubble = new THREE.MeshStandardMaterial({
    color: 0x2ee6a6,
    emissive: 0x0f8a5f,
    emissiveIntensity: 0.7,
    transparent: true,
    opacity: 0.28,
    roughness: 0.15,
    metalness: 0.2,
    depthWrite: false,
  });

  const invincibleAura = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.32,
    roughness: 0.15,
    metalness: 0.4,
    depthWrite: false,
  });

  const contactShadow = new THREE.MeshBasicMaterial({
    map: tex.contactShadowMap,
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
  });

  const all: THREE.Material[] = [
    templeFloor,
    jungleFloor,
    woodBridge,
    stoneWall,
    stoneTrim,
    mossyRock,
    bark,
    foliageDark,
    foliageLight,
    jungleFloorGrass,
    cliffRock,
    waterfall,
    gorgeWater,
    goldCoin,
    goldRim,
    bronzeMetal,
    ironMetal,
    rope,
    fireCore,
    fireOuter,
    explorerSkin,
    explorerJacket,
    explorerPants,
    explorerLeather,
    explorerScarf,
    explorerHat,
    monsterHide,
    monsterArmor,
    monsterEye,
    monsterHorn,
    shieldBubble,
    invincibleAura,
    contactShadow,
  ];

  return {
    templeFloor,
    jungleFloor,
    woodBridge,
    stoneWall,
    stoneTrim,
    mossyRock,
    bark,
    foliageDark,
    foliageLight,
    jungleFloorGrass,
    cliffRock,
    waterfall,
    gorgeWater,
    goldCoin,
    goldRim,
    bronzeMetal,
    ironMetal,
    rope,
    fireCore,
    fireOuter,
    explorerSkin,
    explorerJacket,
    explorerPants,
    explorerLeather,
    explorerScarf,
    explorerHat,
    monsterHide,
    monsterArmor,
    monsterEye,
    monsterHorn,
    shieldBubble,
    invincibleAura,
    contactShadow,
    dispose: () => {
      all.forEach((m) => m.dispose());
    },
  };
}
