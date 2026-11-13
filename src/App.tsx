import { useCallback, useEffect, useRef, useState } from 'react';
import { Coins, Pause, Volume2, VolumeX } from 'lucide-react';
import {
  GameOverModal,
  InstructionsModal,
  MainMenu,
  PauseModal,
  PowerUpIndicators,
  SettingsModal,
} from './components/GameOverlays';
import { TempleRunnerEngine } from './game/TempleRunnerEngine';
import { GameSettings, GameSnapshot } from './types/game';

const SETTINGS_STORAGE_KEY = 'temple_adventure_settings_v1';

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicVolume: 0.45,
  sfxVolume: 0.75,
  quality: 'high',
  swipeSensitivity: 1.0,
};

function loadInitialSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const INITIAL_SNAPSHOT: GameSnapshot = {
  status: 'menu',
  score: 0,
  distance: 0,
  coins: 0,
  highScore: 0,
  bestDistance: 0,
  totalCoinsBank: 0,
  speed: 15.5,
  multiplier: 1,
  monsterProximity: 0.3,
  activePowerUps: {
    magnet: 0,
    boost: 0,
    shield: 0,
    multiplier: 0,
    invincibility: 0,
  },
  deathReason: '',
  isNewHighScore: false,
  biome: 'temple',
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<TempleRunnerEngine | null>(null);

  const [settings, setSettings] = useState<GameSettings>(loadInitialSettings);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(INITIAL_SNAPSHOT);
  const [showSettings, setShowSettings] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  // Initialize Three.js engine once in isolated ref container
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const engine = new TempleRunnerEngine(
      el,
      loadInitialSettings(),
      (nextSnap) => setSnapshot(nextSnap),
      (lost) => setContextLost(lost),
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Persist & forward settings updates without recreating WebGL canvas
  const handleSettingsChange = useCallback((next: GameSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
    engineRef.current?.updateSettings(next);
  }, []);

  const handleToggleSound = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, soundEnabled: !prev.soundEnabled };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      engineRef.current?.updateSettings(next);
      return next;
    });
  }, []);

  const handleStart = useCallback(() => {
    setShowSettings(false);
    setShowInstructions(false);
    engineRef.current?.startGame();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseGame();
  }, []);

  const handleResume = useCallback(() => {
    setShowSettings(false);
    engineRef.current?.resumeGame();
  }, []);

  const handleMainMenu = useCallback(() => {
    setShowSettings(false);
    setShowInstructions(false);
    engineRef.current?.returnToMenu();
  }, []);

  const isPlayingHud =
    snapshot.status === 'intro' ||
    snapshot.status === 'playing' ||
    snapshot.status === 'paused';

  const showControlsHint =
    (snapshot.status === 'intro' || snapshot.status === 'playing') &&
    snapshot.distance < 48;

  return (
    <main className="relative h-full w-full overflow-hidden bg-[#0e1511]">
      {/* Isolated WebGL canvas container */}
      <div
        ref={mountRef}
        className="absolute inset-0 h-full w-full"
        aria-label="Temple Adventure 3D viewport"
      />

      {/* WebGL Context Lost Fallback */}
      {contextLost && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0e1511] p-6 text-center">
          <h2 className="font-display text-2xl font-bold text-amber-400">
            Graphics Context Interrupted
          </h2>
          <p className="mt-2 max-w-md text-sm text-stone-300">
            The 3D graphics context was temporarily suspended by your browser. Reload or tap below to resume.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-stone-950"
          >
            Reload Game
          </button>
        </div>
      )}

      {/* Main Menu */}
      {snapshot.status === 'menu' && (
        <MainMenu
          snapshot={snapshot}
          soundEnabled={settings.soundEnabled}
          onPlay={handleStart}
          onToggleSound={handleToggleSound}
          onOpenSettings={() => setShowSettings(true)}
          onOpenInstructions={() => setShowInstructions(true)}
        />
      )}

      {/* Active Gameplay HUD (Edge-anchored, zero center occlusion) */}
      {isPlayingHud && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            {/* Top-left: Score & Distance */}
            <div className="rounded-lg border border-stone-600/45 bg-[#0e1511]/85 px-4 py-2.5 shadow-lg">
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono-num text-2xl sm:text-3xl font-bold tracking-tight text-stone-50">
                  {snapshot.score.toLocaleString()}
                </span>
                {snapshot.multiplier > 1 && (
                  <span className="font-mono-num text-xs font-bold text-purple-300">
                    {snapshot.multiplier}×
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-stone-300">
                <span className="font-mono-num font-semibold text-emerald-400">
                  {snapshot.distance.toLocaleString()} m
                </span>
                <span aria-hidden="true" className="text-stone-500">·</span>
                <span className="capitalize text-stone-300">
                  {snapshot.biome === 'waterfallBridge'
                    ? 'Waterfall Bridge'
                    : snapshot.biome === 'temple'
                      ? 'Ancient Temple'
                      : 'Jungle Canopy'}
                </span>
              </div>
            </div>

            {/* Top-center: Active Power-Up Timers */}
            <div className="hidden md:flex flex-1 justify-center">
              <PowerUpIndicators activePowerUps={snapshot.activePowerUps} />
            </div>

            {/* Top-right: Coins + Sound + Pause */}
            <div className="pointer-events-auto flex items-center gap-2.5">
              <div className="flex min-h-11 items-center gap-2 rounded-lg border border-stone-600/45 bg-[#0e1511]/85 px-3.5 py-2 shadow-lg">
                <Coins className="h-4 w-4 text-amber-400" />
                <span className="font-mono-num text-base sm:text-lg font-bold text-amber-300">
                  {snapshot.coins.toLocaleString()}
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleSound}
                aria-label={settings.soundEnabled ? 'Mute sound' : 'Unmute sound'}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-stone-600/45 bg-[#0e1511]/85 text-stone-100 transition-colors hover:border-amber-400/50 hover:bg-[#17221b] focus-visible:outline-2 focus-visible:outline-amber-400"
              >
                {settings.soundEnabled ? (
                  <Volume2 className="h-5 w-5 text-amber-400" />
                ) : (
                  <VolumeX className="h-5 w-5 text-stone-400" />
                )}
              </button>

              <button
                type="button"
                onClick={handlePause}
                aria-label="Pause game"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-stone-600/45 bg-[#0e1511]/85 text-stone-100 transition-colors hover:border-amber-400/50 hover:bg-[#17221b] focus-visible:outline-2 focus-visible:outline-amber-400"
              >
                <Pause className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Mobile Power-up row */}
          <div className="mt-2 flex justify-center md:hidden">
            <PowerUpIndicators activePowerUps={snapshot.activePowerUps} />
          </div>

          {/* Bottom area: Monster proximity warning + brief opening control hint */}
          <div className="flex flex-col items-center gap-2">
            {snapshot.monsterProximity > 0.68 && (
              <div className="rounded-lg border border-red-500/45 bg-[#1b0c0c]/90 px-3.5 py-1.5 text-xs font-semibold text-red-300">
                Guardian Closing In
              </div>
            )}

            <div
              className={`rounded-lg border border-stone-700/50 bg-[#0e1511]/85 px-4 py-1.5 text-xs text-stone-300 transition-opacity duration-500 ${
                showControlsHint ? 'opacity-100' : 'opacity-0'
              }`}
            >
              Swipe or Arrow Keys to Steer · Up / Space to Jump · Down to Slide
            </div>
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {snapshot.status === 'paused' && !showSettings && (
        <PauseModal
          soundEnabled={settings.soundEnabled}
          onResume={handleResume}
          onRestart={handleStart}
          onToggleSound={handleToggleSound}
          onOpenSettings={() => setShowSettings(true)}
          onMainMenu={handleMainMenu}
        />
      )}

      {/* Game Over Modal */}
      {snapshot.status === 'gameover' && (
        <GameOverModal
          snapshot={snapshot}
          onRestart={handleStart}
          onMainMenu={handleMainMenu}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Instructions Modal */}
      {showInstructions && (
        <InstructionsModal onClose={() => setShowInstructions(false)} />
      )}
    </main>
  );
}
