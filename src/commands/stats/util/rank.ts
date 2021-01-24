import { Player } from 'hypixel-types';

export const rankWeights = {
  NON_DONOR: 1,
  VIP: 2,
  VIP_PLUS: 3,
  MVP: 4,
  MVP_PLUS: 5,
  SUPERSTAR: 6,
  YOUTUBER: 60,
  JR_HELPER: 70,
  HELPER: 80,
  MODERATOR: 90,
  ADMIN: 100,
};

export type Rank = keyof typeof rankWeights;

export const rankPrefixes: Record<Rank, string> = {
  NON_DONOR: '§7',
  VIP: '§a[VIP]',
  VIP_PLUS: '§a[VIP§6+§a]',
  MVP: '§b[MVP]',
  MVP_PLUS: '§b[MVP§c*§b]',
  SUPERSTAR: '§6[MVP§c**§6]',
  YOUTUBER: '§c[§fYOUTUBE§c]',
  JR_HELPER: '§9[JR HELPER]',
  HELPER: '§9[HELPER]',
  MODERATOR: '§2[MOD]',
  ADMIN: '§c[ADMIN]',
};

export const isStaff = (player: Player): boolean => {
  const rank = player.rank ?? 'NORMAL';
  return rank != 'NORMAL';
};

export const getRank = (player: Player): Rank => {
  let out: Rank | undefined;

  if (isStaff(player)) out = player.rank as Rank;

  ['monthlyPackageRank', 'newPackageRank', 'packageRank'].forEach(key => {
    const rank = player[key] as Rank;
    if (rank && (!out || rankWeights[rank as Rank] > (out ? rankWeights[out] : 0))) out = rank;
  });

  out ??= 'NON_DONOR';

  return out;
};
