export const BASE = 10_000;
export const GROWTH = 2_500;

/* Constants to generate the total amount of XP to complete a level */
export const HALF_GROWTH = 0.5 * GROWTH;

/* Constants to look up the level from the total amount of XP */
export const REVERSE_PQ_PREFIX = -(BASE - 0.5 * GROWTH) / GROWTH;
export const REVERSE_CONST = REVERSE_PQ_PREFIX * REVERSE_PQ_PREFIX;
export const GROWTH_DIVIDES_2 = 2 / GROWTH;

const getLevel = (xp: number): number => {
  return xp < 0
    ? 1
    : Math.floor(1 + REVERSE_PQ_PREFIX + Math.sqrt(REVERSE_CONST + GROWTH_DIVIDES_2 * xp));
};

const getPercentageToNextLevel = (xp: number): number => {
  const lv = getLevel(xp),
    x0 = getTotalExpToLevel(lv);
  return (xp - x0) / (getTotalExpToLevel(lv + 1) - x0);
};

const getTotalExpToLevel = (level: number) => {
  const lv = Math.floor(level),
    x0 = getTotalExpToFullLevel(lv);
  if (level == lv) return x0;
  return (getTotalExpToFullLevel(lv + 1) - x0) * (level % 1) + x0;
};

const getTotalExpToFullLevel = (level: number) => {
  return (HALF_GROWTH * (level - 2) + BASE) * (level - 1);
};

export const getNetworkLevel = (xp: number): number => {
  return getLevel(xp) + getPercentageToNextLevel(xp);
};
