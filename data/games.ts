export type GameId =
  | 'memory-flip'
  | 'pattern-recognition'
  | 'jigsaw-puzzle'
  | 'musical-sequence'
  | 'sequence-recall'
  | 'flow-free'
  | 'rule-switch'
  | 'picture-recall';

export interface GameDef {
  id: GameId;
  title: string;
  shortDescription: string;
  icon: string; // Ionicons name
  color: string;
  /** Order in which games are introduced to a new patient (0 = introduced first). */
  unlockOrder: number;
  /** Fully playable in this build vs a "coming soon" placeholder. */
  implemented: boolean;
}

export const GAMES: GameDef[] = [
  {
    id: 'memory-flip',
    title: 'Memory Flip',
    shortDescription: 'Flip cards to find each matching pair.',
    icon: 'grid-outline',
    color: '#E07A3F',
    unlockOrder: 0,
    implemented: true,
  },
  {
    id: 'pattern-recognition',
    title: 'Pattern Recognition',
    shortDescription: 'Watch the pattern, then predict what comes next.',
    icon: 'shapes-outline',
    color: '#3E7C6B',
    unlockOrder: 1,
    implemented: true,
  },
  {
    id: 'sequence-recall',
    title: 'Sequence Recall',
    shortDescription: 'Study the pictures, then recall their order.',
    icon: 'apps-outline',
    color: '#F2B441',
    unlockOrder: 2,
    implemented: true,
  },
  {
    id: 'flow-free',
    title: 'Path Link',
    shortDescription: 'Connect each pair without crossing.',
    icon: 'git-network-outline',
    color: '#4E7FB0',
    unlockOrder: 3,
    implemented: true,
  },
  {
    id: 'jigsaw-puzzle',
    title: 'Jigsaw Puzzle',
    shortDescription: 'Put the picture back together.',
    icon: 'extension-puzzle-outline',
    color: '#8C6E4B',
    unlockOrder: 4,
    implemented: false,
  },
  {
    id: 'musical-sequence',
    title: 'Musical Sequence',
    shortDescription: 'Listen and repeat the tune.',
    icon: 'musical-notes-outline',
    color: '#B15D8C',
    unlockOrder: 5,
    implemented: false,
  },
  {
    id: 'rule-switch',
    title: 'Rule Switch',
    shortDescription: 'Follow the rule — it may change!',
    icon: 'swap-horizontal-outline',
    color: '#C4632C',
    unlockOrder: 6,
    implemented: true,
  },
  {
    id: 'picture-recall',
    title: 'Picture Detection',
    shortDescription: 'Look closely, then answer.',
    icon: 'image-outline',
    color: '#6B5CA5',
    unlockOrder: 7,
    implemented: true,
  },
];

/**
 * Cognitive domain (brain lobe) each game exercises — feeds the doctor's
 * Cognitive Report radar. Kept in sync with game_domain() in
 * supabase/migration_cognitive.sql.
 */
export type CognitiveDomain = 'logic' | 'memory' | 'spatial' | 'visual';

export const GAME_DOMAIN: Record<GameId, CognitiveDomain> = {
  'memory-flip': 'memory',
  'sequence-recall': 'memory',
  'musical-sequence': 'memory',
  'pattern-recognition': 'logic',
  'rule-switch': 'logic',
  'flow-free': 'spatial',
  'jigsaw-puzzle': 'spatial',
  'picture-recall': 'visual',
};

/** How many games are unlocked based on milestone (days of consistent completion). */
export function unlockedGameCount(milestone: number): number {
  // 4 games to start, +1 game every 2 completed milestones, capped at 8.
  return Math.min(8, 4 + Math.floor(milestone / 2));
}

export function getActiveGames(milestone: number): GameDef[] {
  const count = unlockedGameCount(milestone);
  return GAMES.filter((g) => g.unlockOrder < count).sort((a, b) => a.unlockOrder - b.unlockOrder);
}
