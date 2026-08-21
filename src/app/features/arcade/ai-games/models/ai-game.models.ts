export type AiGameGenre = 'action_runner' | 'puzzle_physics' | 'space_invader' | 'quantum_grid' | 'chrono_dodger' | 'orbital_gravity' | 'elemental_arena' | 'cyber_defense';

export type AiGamePlayMode = 'local' | 'p2p' | 'online_pro';

export interface AiGameMutation {
  id: string;
  version: number;
  unlockedAtLevel: number;
  title: string;
  category: 'mechanic' | 'hazard' | 'ability' | 'environment' | 'twist';
  description: string;
  aiRationale: string;
  isEnabled: boolean; // Player can toggle / rollback
  codeModifierKey?: string;
  createdAt: number;
}

export interface AiGameLevel {
  levelNumber: number;
  title: string;
  description: string;
  targetScore: number;
  timeLimitSeconds?: number;
  requiredGems?: number;
  hazardsCount: number;
  speedMultiplier: number;
  specialRules?: string[];
  activeMutationIds?: string[];
  themeHue: number;
}

export interface AiGameBlueprint {
  id: string;
  title: string;
  genre: AiGameGenre;
  tagline: string;
  storyLore: string;
  rules: string[];
  controlsGuide: {
    keyboard: string[];
    touch: string[];
    mouse?: string;
  };
  theme: {
    primaryColor: string;
    accentColor: string;
    bgGradient: string;
    icon: string;
    particleStyle: 'sparks' | 'bubbles' | 'cyber_squares' | 'stars';
  };
  currentLevelIndex: number; // 1-indexed
  maxUnlockedLevel: number;
  levels: AiGameLevel[];
  mutations: AiGameMutation[];
  totalEvolutionsCount: number;
  highScore: number;
  timesPlayed: number;
  createdAt: number;
  updatedAt: number;
  generationStatus: 'generating' | 'ready' | 'error';
  currentGeneratingStep?: string;
}

export interface AiPlayerState {
  name: string;
  score: number;
  lives: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  powerups: { [key: string]: boolean };
}
