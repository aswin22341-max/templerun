import * as THREE from 'three';

export interface ProceduralTextureSet {
  templeStoneMap: THREE.CanvasTexture;
  templeStoneBump: THREE.CanvasTexture;
  sandstoneWallMap: THREE.CanvasTexture;
  woodPlankMap: THREE.CanvasTexture;
  junglePathMap: THREE.CanvasTexture;
  barkMap: THREE.CanvasTexture;
  waterfallMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  particleGlowMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const rand = seededRand(4207);

  // 1. Temple Stone Floor (carved 3-lane sandstone slabs + mossy cracks)
  const [stoneC, sCtx] = makeCanvas(512, 512);
  sCtx.fillStyle = '#5c5548';
  sCtx.fillRect(0, 0, 512, 512);

  // Subtle noise mottling
  for (let i = 0; i < 3500; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 1 + rand() * 5;
    sCtx.fillStyle =
      rand() > 0.5 ? 'rgba(255,245,220,0.05)' : 'rgba(25,22,18,0.09)';
    sCtx.fillRect(x, y, r, r);
  }

  // Carved stone slabs grid (3 columns corresponding roughly to lanes + borders)
  const rows = 4;
  const cols = 3;
  const cellW = 512 / cols;
  const cellH = 512 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellW;
      const y = r * cellH;
      const shade = Math.floor((rand() - 0.5) * 16);
      sCtx.fillStyle = `rgb(${98 + shade}, ${90 + shade}, ${76 + shade})`;
      sCtx.fillRect(x + 4, y + 4, cellW - 8, cellH - 8);

      // Inner bevel highlight
      sCtx.strokeStyle = 'rgba(220,205,175,0.14)';
      sCtx.lineWidth = 2;
      sCtx.strokeRect(x + 7, y + 7, cellW - 14, cellH - 14);

      // Carved temple glyph accent in center of alternating slabs
      if ((r + c) % 2 === 0) {
        sCtx.strokeStyle = 'rgba(42, 38, 30, 0.35)';
        sCtx.lineWidth = 2;
        sCtx.strokeRect(x + 28, y + 20, cellW - 56, cellH - 40);
      }

      // Mossy crevices along seams
      if (rand() > 0.35) {
        sCtx.fillStyle = 'rgba(54, 92, 46, 0.45)';
        sCtx.beginPath();
        sCtx.ellipse(
          x + rand() * cellW,
          y + 3,
          12 + rand() * 18,
          4 + rand() * 5,
          0,
          0,
          Math.PI * 2,
        );
        sCtx.fill();
      }
    }
  }

  // Lane divider inlay lines
  sCtx.fillStyle = 'rgba(34, 30, 24, 0.65)';
  sCtx.fillRect(cellW - 3, 0, 6, 512);
  sCtx.fillRect(cellW * 2 - 3, 0, 6, 512);

  const templeStoneMap = new THREE.CanvasTexture(stoneC);
  templeStoneMap.colorSpace = THREE.SRGBColorSpace;
  templeStoneMap.wrapS = THREE.RepeatWrapping;
  templeStoneMap.wrapT = THREE.RepeatWrapping;
  templeStoneMap.repeat.set(1, 3);
  templeStoneMap.anisotropy = maxAnisotropy;

  // Stone bump map (linear NoColorSpace)
  const [bumpC, bCtx] = makeCanvas(256, 256);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      bCtx.fillStyle = '#b8b8b8';
      bCtx.fillRect(c * (256 / 3) + 3, r * 64 + 3, 256 / 3 - 6, 58);
    }
  }
  for (let i = 0; i < 2000; i++) {
    const v = Math.floor(110 + rand() * 45);
    bCtx.fillStyle = `rgb(${v},${v},${v})`;
    bCtx.fillRect(rand() * 256, rand() * 256, 2, 2);
  }
  const templeStoneBump = new THREE.CanvasTexture(bumpC);
  templeStoneBump.wrapS = THREE.RepeatWrapping;
  templeStoneBump.wrapT = THREE.RepeatWrapping;
  templeStoneBump.repeat.set(1, 3);
  templeStoneBump.anisotropy = maxAnisotropy;

  // 2. Sandstone Carved Ruin Wall / Pillar
  const [wallC, wCtx] = makeCanvas(256, 256);
  wCtx.fillStyle = '#7c6e58';
  wCtx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 6; row++) {
    const y = row * (256 / 6);
    const offset = (row % 2) * 32;
    for (let col = -1; col < 5; col++) {
      const x = col * 64 + offset;
      const d = Math.floor((rand() - 0.5) * 20);
      wCtx.fillStyle = `rgb(${124 + d},${110 + d},${86 + d})`;
      wCtx.fillRect(x + 2, y + 2, 60, 256 / 6 - 4);
    }
  }
  // Carved frieze band
  wCtx.fillStyle = 'rgba(52, 44, 34, 0.5)';
  wCtx.fillRect(0, 108, 256, 40);
  for (let i = 0; i < 8; i++) {
    wCtx.strokeStyle = 'rgba(205, 178, 122, 0.45)';
    wCtx.lineWidth = 2;
    wCtx.strokeRect(i * 32 + 6, 114, 20, 28);
  }
  const sandstoneWallMap = new THREE.CanvasTexture(wallC);
  sandstoneWallMap.colorSpace = THREE.SRGBColorSpace;
  sandstoneWallMap.wrapS = THREE.RepeatWrapping;
  sandstoneWallMap.wrapT = THREE.RepeatWrapping;
  sandstoneWallMap.anisotropy = maxAnisotropy;

  // 3. Wooden Bridge Planks
  const [woodC, wdCtx] = makeCanvas(512, 512);
  wdCtx.fillStyle = '#2d1e12';
  wdCtx.fillRect(0, 0, 512, 512);
  const plankCount = 12;
  const plankH = 512 / plankCount;
  for (let i = 0; i < plankCount; i++) {
    const y = i * plankH;
    const tone = Math.floor((rand() - 0.5) * 22);
    wdCtx.fillStyle = `rgb(${112 + tone},${76 + Math.floor(tone * 0.7)},${46 + Math.floor(tone * 0.5)})`;
    wdCtx.fillRect(4, y + 3, 504, plankH - 6);

    // Wood grain streaks
    for (let g = 0; g < 16; g++) {
      wdCtx.fillStyle =
        rand() > 0.5 ? 'rgba(40,24,12,0.18)' : 'rgba(175,130,85,0.1)';
      wdCtx.fillRect(6, y + 5 + rand() * (plankH - 10), 500, 1.5);
    }

    // Iron bolt heads near edges
    wdCtx.fillStyle = '#2b2d30';
    for (const bx of [26, 176, 336, 486]) {
      wdCtx.beginPath();
      wdCtx.arc(bx, y + plankH * 0.5, 4, 0, Math.PI * 2);
      wdCtx.fill();
    }
  }
  const woodPlankMap = new THREE.CanvasTexture(woodC);
  woodPlankMap.colorSpace = THREE.SRGBColorSpace;
  woodPlankMap.wrapS = THREE.RepeatWrapping;
  woodPlankMap.wrapT = THREE.RepeatWrapping;
  woodPlankMap.repeat.set(1, 2);
  woodPlankMap.anisotropy = maxAnisotropy;

  // 4. Jungle Trail Earth & Moss
  const [jC, jCtx] = makeCanvas(512, 512);
  jCtx.fillStyle = '#4f3f2b';
  jCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4500; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 1 + rand() * 6;
    const cPick = rand();
    if (cPick < 0.4) jCtx.fillStyle = 'rgba(65, 50, 32, 0.28)';
    else if (cPick < 0.75) jCtx.fillStyle = 'rgba(98, 80, 54, 0.22)';
    else jCtx.fillStyle = 'rgba(56, 98, 42, 0.25)';
    jCtx.fillRect(x, y, r, r);
  }
  // Embedded stepping stones down the 3 lanes
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 3; c++) {
      const cx = (c + 0.5) * (512 / 3) + (rand() - 0.5) * 18;
      const cy = (r + 0.5) * (512 / 6) + (rand() - 0.5) * 12;
      jCtx.fillStyle = 'rgba(115, 108, 92, 0.55)';
      jCtx.beginPath();
      jCtx.ellipse(cx, cy, 24 + rand() * 14, 16 + rand() * 10, rand(), 0, Math.PI * 2);
      jCtx.fill();
    }
  }
  // Lush mossy edges
  const leftGrad = jCtx.createLinearGradient(0, 0, 58, 0);
  leftGrad.addColorStop(0, 'rgba(42, 84, 34, 0.92)');
  leftGrad.addColorStop(1, 'rgba(42, 84, 34, 0)');
  jCtx.fillStyle = leftGrad;
  jCtx.fillRect(0, 0, 58, 512);

  const rightGrad = jCtx.createLinearGradient(512, 0, 454, 0);
  rightGrad.addColorStop(0, 'rgba(42, 84, 34, 0.92)');
  rightGrad.addColorStop(1, 'rgba(42, 84, 34, 0)');
  jCtx.fillStyle = rightGrad;
  jCtx.fillRect(454, 0, 58, 512);

  const junglePathMap = new THREE.CanvasTexture(jC);
  junglePathMap.colorSpace = THREE.SRGBColorSpace;
  junglePathMap.wrapS = THREE.RepeatWrapping;
  junglePathMap.wrapT = THREE.RepeatWrapping;
  junglePathMap.repeat.set(1, 3);
  junglePathMap.anisotropy = maxAnisotropy;

  // 5. Tree Bark Texture
  const [barkC, bkCtx] = makeCanvas(256, 256);
  bkCtx.fillStyle = '#4a3524';
  bkCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    bkCtx.fillStyle =
      rand() > 0.5 ? 'rgba(28,18,10,0.45)' : 'rgba(95,72,50,0.3)';
    bkCtx.fillRect(rand() * 256, rand() * 256, 3 + rand() * 4, 24 + rand() * 45);
  }
  const barkMap = new THREE.CanvasTexture(barkC);
  barkMap.colorSpace = THREE.SRGBColorSpace;
  barkMap.wrapS = THREE.RepeatWrapping;
  barkMap.wrapT = THREE.RepeatWrapping;

  // 6. Waterfall Foam Texture (scrolls along V)
  const [wfC, wfCtx] = makeCanvas(256, 256);
  const wfGrad = wfCtx.createLinearGradient(0, 0, 256, 0);
  wfGrad.addColorStop(0, '#2c7d96');
  wfGrad.addColorStop(0.5, '#5cc6db');
  wfGrad.addColorStop(1, '#2c7d96');
  wfCtx.fillStyle = wfGrad;
  wfCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 320; i++) {
    wfCtx.fillStyle = `rgba(235, 252, 255, ${0.15 + rand() * 0.45})`;
    wfCtx.fillRect(rand() * 256, rand() * 256, 2 + rand() * 6, 18 + rand() * 50);
  }
  const waterfallMap = new THREE.CanvasTexture(wfC);
  waterfallMap.colorSpace = THREE.SRGBColorSpace;
  waterfallMap.wrapS = THREE.RepeatWrapping;
  waterfallMap.wrapT = THREE.RepeatWrapping;

  // 7. Radial Contact Shadow
  const [csC, csCtx] = makeCanvas(128, 128);
  const csGrad = csCtx.createRadialGradient(64, 64, 6, 64, 64, 60);
  csGrad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  csGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.3)');
  csGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  csCtx.fillStyle = csGrad;
  csCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(csC);

  // 8. Soft Particle Glow
  const [pgC, pgCtx] = makeCanvas(64, 64);
  const pgGrad = pgCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
  pgGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  pgGrad.addColorStop(0.45, 'rgba(255, 240, 190, 0.65)');
  pgGrad.addColorStop(1, 'rgba(255, 220, 120, 0)');
  pgCtx.fillStyle = pgGrad;
  pgCtx.fillRect(0, 0, 64, 64);
  const particleGlowMap = new THREE.CanvasTexture(pgC);

  return {
    templeStoneMap,
    templeStoneBump,
    sandstoneWallMap,
    woodPlankMap,
    junglePathMap,
    barkMap,
    waterfallMap,
    contactShadowMap,
    particleGlowMap,
    dispose: () => {
      templeStoneMap.dispose();
      templeStoneBump.dispose();
      sandstoneWallMap.dispose();
      woodPlankMap.dispose();
      junglePathMap.dispose();
      barkMap.dispose();
      waterfallMap.dispose();
      contactShadowMap.dispose();
      particleGlowMap.dispose();
    },
  };
}
