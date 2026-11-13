export type GameStatus = 'menu' | 'intro' | 'playing' | 'paused' | 'gameover';

export type PowerUpType =
  | 'magnet'
  | 'boost'
  | 'shield'
  | 'multiplier'
  | 'invincibility';

export type ObstacleType =
  | 'fallenTree'
  | 'boulder'
  | 'fireTrap'
  | 'stoneWall'
  | 'woodBarrier'
  | 'gap'
  | 'rotatingTrap'
  | 'lowHanging';

export type BiomeZone = 'temple' | 'jungle' | 'waterfallBridge';

export interface GameSettings {
  soundEnabled: boolean;
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  quality: 'high' | 'balanced';
  swipeSensitivity: number; // 0.5..1.5
}

export interface PowerUpTimers {
  magnet: number;
  boost: number;
  shield: number;
  multiplier: number;
  invincibility: number;
}

export interface GameSnapshot {
  status: GameStatus;
  score: number;
  distance: number;
  coins: number;
  highScore: number;
  bestDistance: number;
  totalCoinsBank: number;
  speed: number;
  multiplier: number;
  monsterProximity: number; // 0 (far) .. 1 (right behind)
  activePowerUps: PowerUpTimers;
  deathReason: string;
  isNewHighScore: boolean;
  biome: BiomeZone;
}

export const POWERUP_DURATIONS: Record<PowerUpType, number> = {
  magnet: 10,
  boost: 5,
  shield: 18,
  multiplier: 12,
  invincibility: 7,
};

export const POWERUP_META: Record<
  PowerUpType,
  { label: string; shortLabel: string; color: string; description: string }
> = {
  magnet: {
    label: 'Coin Magnet',
    shortLabel: 'Magnet',
    color: '#38bdf8',
    description: 'Pulls nearby gold coins directly to you across all lanes.',
  },
  boost: {
    label: 'Speed Surge',
    shortLabel: 'Boost',
    color: '#f59e0b',
    description: 'Blazing forward dash that blasts through obstacles.',
  },
  shield: {
    label: 'Stone Aegis',
    shortLabel: 'Shield',
    color: '#10b981',
    description: 'Absorbs one direct obstacle impact without ending your run.',
  },
  multiplier: {
    label: '2× Relic',
    shortLabel: '2× Score',
    color: '#a855f7',
    description: 'Doubles all distance and coin points while active.',
  },
  invincibility: {
    label: 'Solar Armor',
    shortLabel: 'Invincible',
    color: '#fbbf24',
    description: 'Total immunity to traps and obstacles with bonus smash points.',
  },
};
