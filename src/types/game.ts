export type WordCategory =
  | 'School'
  | 'Animals'
  | 'Nature'
  | 'Daily Life'
  | 'Occupations'
  | 'Science';

export interface WordEntry {
  id: string;
  word: string; // UPPERCASE e.g. "SCHOOL"
  phonetic: string; // e.g. "/skuːl/"
  thaiMeaning: string; // e.g. "โรงเรียน"
  partOfSpeech: string; // e.g. "คำนาม (Noun)"
  exampleEn: string;
  exampleTh: string;
  category: WordCategory;
  gradeLevel: 'ป.4' | 'ป.5' | 'ป.6';
  difficulty: 'easy' | 'medium' | 'hard';
  funFactTh?: string;
}

export type LaneIndex = 0 | 1 | 2; // -1 (left), 0 (center), 1 (right)

export interface DifficultyLevelInfo {
  level: number;
  titleEn: string;
  titleTh: string;
  minScore: number;
  nextLevelScore: number | null;
  speedMultiplier: number;
  baseSpeed: number;
  obstacleGapMin: number;
  obstacleGapMax: number;
  wordDifficulty: 'easy' | 'medium' | 'hard';
  badgeColor: string;
}

export interface WordCompletionSummary {
  word: WordEntry;
  wordPoints: number;
  letterPointsEarned: number;
  streakBonus: number;
  totalEarnedThisWord: number;
  newTotalScore: number;
  highScore: number;
  isNewHighScore: boolean;
  previousLevel: number;
  newLevelInfo: DifficultyLevelInfo;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  wordsCount: number;
  levelReached: number;
  playtimeSeconds: number;
  createdAt: string;
  syncedToSheet?: boolean;
}

export type ObstacleType = 'barrier' | 'laser' | 'spikes';

export interface ActiveObstacle {
  id: number;
  type: ObstacleType;
  lane: number; // -1, 0, 1
  z: number;
  width: number;
  height: number;
  passed: boolean;
}

export interface ActiveLetter {
  id: number;
  char: string;
  wordId: string;
  letterIndex: number;
  isTargetLetter: boolean;
  lane: number; // -1, 0, 1
  z: number;
  y: number;
  collected: boolean;
}

export type GamePhase = 'title' | 'playing' | 'word_modal' | 'paused' | 'game_over';
