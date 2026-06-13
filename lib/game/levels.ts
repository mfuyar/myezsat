export interface LevelInfo {
  level: number;
  name: string;
  currentMin: number;
  nextMin: number | null;
  progressPct: number; // 0-100
}

const LEVELS = [
  { level: 1, name: "Beginner",        minXP: 0    },
  { level: 2, name: "SAT Explorer",    minXP: 100  },
  { level: 3, name: "Problem Solver",  minXP: 300  },
  { level: 4, name: "Algebra Warrior", minXP: 600  },
  { level: 5, name: "Grammar Master",  minXP: 1000 },
  { level: 6, name: "Test Strategist", minXP: 1500 },
  { level: 7, name: "SAT Champion",    minXP: 2200 },
];

export function getLevelInfo(totalXP: number): LevelInfo {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalXP >= lvl.minXP) current = lvl;
    else break;
  }
  const nextLvl = LEVELS.find((l) => l.level === current.level + 1) ?? null;
  const range = nextLvl ? nextLvl.minXP - current.minXP : 1;
  const earned = totalXP - current.minXP;
  return {
    level: current.level,
    name: current.name,
    currentMin: current.minXP,
    nextMin: nextLvl?.minXP ?? null,
    progressPct: nextLvl ? Math.min(100, Math.round((earned / range) * 100)) : 100,
  };
}

export function levelFromXP(totalXP: number): number {
  return getLevelInfo(totalXP).level;
}
