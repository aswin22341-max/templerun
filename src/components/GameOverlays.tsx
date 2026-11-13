import React from 'react';
import {
  BookOpen,
  Coins,
  Flame,
  Magnet,
  Play,
  RotateCcw,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Trophy,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  GameSettings,
  GameSnapshot,
  POWERUP_DURATIONS,
  POWERUP_META,
  PowerUpType,
} from '../types/game';

interface MainMenuProps {
  snapshot: GameSnapshot;
  soundEnabled: boolean;
  onPlay: () => void;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onOpenInstructions: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  snapshot,
  soundEnabled,
  onPlay,
  onToggleSound,
  onOpenSettings,
  onOpenInstructions,
}) => {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-5 sm:p-8 lg:p-12">
      {/* Top Bar: Sound toggle only, keeping 3D explorer unobstructed */}
      <div className="flex items-center justify-between">
        <div className="pointer-events-auto flex items-center gap-3 text-xs sm:text-sm text-stone-300/90">
          <span className="font-mono-num">
            Best Score: <strong className="text-amber-300">{snapshot.highScore.toLocaleString()}</strong>
          </span>
          <span aria-hidden="true" className="text-stone-500">·</span>
          <span className="font-mono-num">
            Best Run: <strong className="text-stone-100">{snapshot.bestDistance.toLocaleString()} m</strong>
          </span>
          <span aria-hidden="true" className="text-stone-500 hidden sm:inline">·</span>
          <span className="font-mono-num hidden sm:inline">
            Treasure: <strong className="text-amber-300">{snapshot.totalCoinsBank.toLocaleString()}</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleSound}
          aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
          className="pointer-events-auto flex min-h-11 items-center gap-2 rounded-lg border border-stone-600/50 bg-[#0e1511]/90 px-4 py-2 text-sm font-medium text-stone-100 transition-colors hover:border-amber-400/60 hover:bg-[#17221b] focus-visible:outline-2 focus-visible:outline-amber-400 whitespace-nowrap shrink-0"
        >
          {soundEnabled ? (
            <Volume2 className="h-4 w-4 text-amber-400" />
          ) : (
            <VolumeX className="h-4 w-4 text-stone-400" />
          )}
          <span>{soundEnabled ? 'Sound ON' : 'Sound OFF'}</span>
        </button>
      </div>

      {/* Left-aligned title & action dock leaving center/right 3D showcase clear */}
      <div className="pointer-events-auto max-w-md rounded-xl border border-amber-500/20 bg-[#0e1511]/88 p-6 sm:p-8 shadow-2xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-amber-400/90 uppercase">
          Endless Jungle Runner
        </p>
        <h1 className="font-display mt-2 text-3xl sm:text-5xl font-extrabold tracking-wide text-stone-50 leading-tight">
          TEMPLE ADVENTURE
        </h1>
        <p className="mt-3 text-sm sm:text-base text-stone-300 leading-relaxed">
          Outrun the cursed temple guardian across crumbling bridges, ancient traps, and dense jungle ruins.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onPlay}
            className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-lg bg-amber-500 px-6 py-3 text-base font-bold text-stone-950 transition-transform duration-150 hover:bg-amber-400 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 whitespace-nowrap"
          >
            <Play className="h-5 w-5 fill-current" />
            <span>Play</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onOpenInstructions}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-600/60 bg-[#17221b] px-4 py-2.5 text-sm font-semibold text-stone-100 transition-colors hover:border-amber-400/50 hover:bg-[#1f2e24] focus-visible:outline-2 focus-visible:outline-amber-400 whitespace-nowrap"
            >
              <BookOpen className="h-4 w-4 text-amber-400" />
              <span>Instructions</span>
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-600/60 bg-[#17221b] px-4 py-2.5 text-sm font-semibold text-stone-100 transition-colors hover:border-amber-400/50 hover:bg-[#1f2e24] focus-visible:outline-2 focus-visible:outline-amber-400 whitespace-nowrap"
            >
              <Settings className="h-4 w-4 text-amber-400" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PowerUpHudProps {
  activePowerUps: SnapshotTimers;
}

type SnapshotTimers = GameSnapshot['activePowerUps'];

const POWERUP_ICONS: Record<PowerUpType, React.ReactNode> = {
  magnet: <Magnet className="h-4 w-4 text-sky-400" />,
  boost: <Zap className="h-4 w-4 text-amber-400" />,
  shield: <Shield className="h-4 w-4 text-emerald-400" />,
  multiplier: <Sparkles className="h-4 w-4 text-purple-400" />,
  invincibility: <Sun className="h-4 w-4 text-yellow-300" />,
};

export const PowerUpIndicators: React.FC<PowerUpHudProps> = ({ activePowerUps }) => {
  const active = (Object.keys(activePowerUps) as PowerUpType[]).filter(
    (k) => activePowerUps[k] > 0,
  );
  if (active.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {active.map((type) => {
        const rem = activePowerUps[type];
        const pct = Math.min(100, (rem / POWERUP_DURATIONS[type]) * 100);
        const meta = POWERUP_META[type];
        return (
          <div
            key={type}
            className="flex min-w-[126px] flex-col gap-1 rounded-lg border border-stone-600/50 bg-[#0e1511]/90 px-3 py-1.5"
          >
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-stone-100">
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                {POWERUP_ICONS[type]}
                <span>{meta.shortLabel}</span>
              </span>
              <span className="font-mono-num text-stone-300">{rem.toFixed(1)}s</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
              <div
                className="h-full transition-[width] duration-75"
                style={{ width: `${pct}%`, backgroundColor: meta.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface PauseModalProps {
  soundEnabled: boolean;
  onResume: () => void;
  onRestart: () => void;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  soundEnabled,
  onResume,
  onRestart,
  onToggleSound,
  onOpenSettings,
  onMainMenu,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 p-4">
      <div className="w-full max-w-sm rounded-xl border border-amber-500/25 bg-[#0e1511] p-6 shadow-2xl">
        <h2 className="font-display text-center text-2xl font-bold tracking-wide text-stone-50">
          PAUSED
        </h2>
        <p className="mt-1 text-center text-xs text-stone-400">
          Catch your breath before the guardian closes in
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-stone-950 transition-colors hover:bg-amber-400"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Resume</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-stone-600/60 bg-[#17221b] px-5 py-2.5 text-sm font-semibold text-stone-100 transition-colors hover:border-amber-400/50 hover:bg-[#1f2e24]"
          >
            <RotateCcw className="h-4 w-4 text-amber-400" />
            <span>Restart</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onToggleSound}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-600/60 bg-[#17221b] px-3 py-2 text-sm font-medium text-stone-100 hover:bg-[#1f2e24]"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-amber-400" />
              ) : (
                <VolumeX className="h-4 w-4 text-stone-400" />
              )}
              <span>{soundEnabled ? 'Sound ON' : 'Sound OFF'}</span>
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-600/60 bg-[#17221b] px-3 py-2 text-sm font-medium text-stone-100 hover:bg-[#1f2e24]"
            >
              <Settings className="h-4 w-4 text-amber-400" />
              <span>Settings</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onMainMenu}
            className="flex min-h-11 w-full items-center justify-center rounded-lg border border-stone-700/70 bg-transparent px-5 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800/70 hover:text-stone-100"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  snapshot: GameSnapshot;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  snapshot,
  onRestart,
  onMainMenu,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 p-4">
      <div className="w-full max-w-md rounded-xl border border-amber-500/25 bg-[#0e1511] p-6 sm:p-8 shadow-2xl">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-red-400 uppercase">
            Run Ended
          </p>
          <h2 className="font-display mt-1 text-3xl font-extrabold tracking-wide text-stone-50">
            GAME OVER
          </h2>
          {snapshot.deathReason && (
            <p className="mt-2 text-sm text-stone-300">{snapshot.deathReason}</p>
          )}
          {snapshot.isNewHighScore && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-amber-400">
              <Trophy className="h-4 w-4" />
              <span>New High Score</span>
            </p>
          )}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 border-y border-stone-700/60 py-5 text-center">
          <div>
            <p className="text-xs text-stone-400">Final Score</p>
            <p className="font-mono-num mt-1 text-xl sm:text-2xl font-bold text-stone-50">
              {snapshot.score.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-400">Distance</p>
            <p className="font-mono-num mt-1 text-xl sm:text-2xl font-bold text-emerald-400">
              {snapshot.distance.toLocaleString()} m
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-400">Coins</p>
            <p className="font-mono-num mt-1 text-xl sm:text-2xl font-bold text-amber-400">
              {snapshot.coins.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-stone-400">
          <span className="font-mono-num">
            Best Score: <strong className="text-stone-200">{snapshot.highScore.toLocaleString()}</strong>
          </span>
          <span className="font-mono-num">
            Best Run: <strong className="text-stone-200">{snapshot.bestDistance.toLocaleString()} m</strong>
          </span>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-bold text-stone-950 transition-colors hover:bg-amber-400"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Restart</span>
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="flex min-h-12 flex-1 items-center justify-center rounded-lg border border-stone-600/60 bg-[#17221b] px-5 py-3 text-sm font-semibold text-stone-100 transition-colors hover:border-amber-400/50 hover:bg-[#1f2e24]"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

interface SettingsModalProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onChange,
  onClose,
}) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-amber-500/25 bg-[#0e1511] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-700/60 pb-4">
          <h2 className="font-display text-xl font-bold tracking-wide text-stone-50">
            SETTINGS
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-800 hover:text-stone-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Master Sound */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-100">Sound Audio</p>
              <p className="text-xs text-stone-400">Jungle music & sound effects</p>
            </div>
            <button
              type="button"
              onClick={() =>
                onChange({ ...settings, soundEnabled: !settings.soundEnabled })
              }
              className={`min-h-10 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                settings.soundEnabled
                  ? 'bg-amber-500 text-stone-950'
                  : 'border border-stone-600 bg-[#17221b] text-stone-300'
              }`}
            >
              {settings.soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Music Volume */}
          <div>
            <div className="flex justify-between text-xs font-medium text-stone-300">
              <span>Music Volume</span>
              <span className="font-mono-num">
                {Math.round(settings.musicVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.musicVolume}
              onChange={(e) =>
                onChange({ ...settings, musicVolume: Number(e.target.value) })
              }
              className="mt-2 w-full accent-amber-500"
            />
          </div>

          {/* SFX Volume */}
          <div>
            <div className="flex justify-between text-xs font-medium text-stone-300">
              <span>Effects Volume</span>
              <span className="font-mono-num">
                {Math.round(settings.sfxVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.sfxVolume}
              onChange={(e) =>
                onChange({ ...settings, sfxVolume: Number(e.target.value) })
              }
              className="mt-2 w-full accent-amber-500"
            />
          </div>

          {/* Swipe Sensitivity */}
          <div>
            <div className="flex justify-between text-xs font-medium text-stone-300">
              <span>Touch Swipe Sensitivity</span>
              <span className="font-mono-num">
                {settings.swipeSensitivity.toFixed(1)}×
              </span>
            </div>
            <input
              type="range"
              min={0.6}
              max={1.5}
              step={0.1}
              value={settings.swipeSensitivity}
              onChange={(e) =>
                onChange({
                  ...settings,
                  swipeSensitivity: Number(e.target.value),
                })
              }
              className="mt-2 w-full accent-amber-500"
            />
          </div>

          {/* Graphics Quality */}
          <div>
            <p className="text-xs font-medium text-stone-300">Render Quality</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(['high', 'balanced'] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onChange({ ...settings, quality: q })}
                  className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors ${
                    settings.quality === q
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                      : 'border-stone-700 bg-[#17221b] text-stone-300 hover:bg-[#1f2e24]'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 flex min-h-11 w-full items-center justify-center rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400"
        >
          Done
        </button>
      </div>
    </div>
  );
};

interface InstructionsModalProps {
  onClose: () => void;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({
  onClose,
}) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-amber-500/25 bg-[#0e1511] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-700/60 pb-4">
          <h2 className="font-display text-xl font-bold tracking-wide text-stone-50">
            EXPLORER GUIDE
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close instructions"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-800 hover:text-stone-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5 text-sm text-stone-300">
          <div>
            <h3 className="text-xs font-bold tracking-wider text-amber-400 uppercase">
              Controls
            </h3>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="rounded-lg border border-stone-700/60 bg-[#17221b] p-3">
                <p className="font-semibold text-stone-100">Change Lanes</p>
                <p className="mt-1 text-xs text-stone-400">
                  Left / Right Arrow keys (A / D) or Swipe Left / Right
                </p>
              </div>
              <div className="rounded-lg border border-stone-700/60 bg-[#17221b] p-3">
                <p className="font-semibold text-stone-100">Jump</p>
                <p className="mt-1 text-xs text-stone-400">
                  Up Arrow / Space (W) or Swipe Up
                </p>
              </div>
              <div className="rounded-lg border border-stone-700/60 bg-[#17221b] p-3">
                <p className="font-semibold text-stone-100">Slide / Fast-Fall</p>
                <p className="mt-1 text-xs text-stone-400">
                  Down Arrow (S) or Swipe Down
                </p>
              </div>
              <div className="rounded-lg border border-stone-700/60 bg-[#17221b] p-3">
                <p className="font-semibold text-stone-100">Pause Game</p>
                <p className="mt-1 text-xs text-stone-400">
                  Esc or P key, or top-right Pause button
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold tracking-wider text-amber-400 uppercase">
              Traps & Obstacles
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-stone-300">
              <li className="flex items-start gap-2">
                <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
                <span>
                  <strong className="text-stone-100">Jump over</strong> fallen logs, fire traps, wooden barricades, and broken bridge gorges.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>
                  <strong className="text-stone-100">Slide under</strong> low-hanging stone lintels and spinning rotor blades.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Coins className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span>
                  <strong className="text-stone-100">Dodge lanes</strong> around tall carved monolith walls and massive boulders.
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold tracking-wider text-amber-400 uppercase">
              Ancient Power-Ups
            </h3>
            <div className="mt-2 space-y-2">
              {(Object.keys(POWERUP_META) as PowerUpType[]).map((type) => (
                <div
                  key={type}
                  className="flex items-center gap-3 rounded-lg border border-stone-800 bg-[#141e18] px-3 py-2"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-stone-900">
                    {POWERUP_ICONS[type]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-100">
                      {POWERUP_META[type].label}
                    </p>
                    <p className="text-xs text-stone-400">
                      {POWERUP_META[type].description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 flex min-h-11 w-full items-center justify-center rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400"
        >
          Got It
        </button>
      </div>
    </div>
  );
};
