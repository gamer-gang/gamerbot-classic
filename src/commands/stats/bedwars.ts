import { Canvas } from 'canvas';
import { client } from '../../providers';
import { Hypixel } from '../../types/declarations/hypixel';
import { byteSize } from '../../util';

const font = (px: number) => px + 'px Roboto Mono';
const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;
const headerHeight = 30;
const mainHeight = 24;
const padding = 8;

const letterWidth = (fontSize: number) => {
  const tester = new Canvas(fontSize, fontSize);
  const c = tester.getContext('2d');
  c.fillStyle = '#dddddd';
  c.strokeStyle = '#dddddd';
  c.textDrawingMode = 'glyph';
  c.textAlign = 'left';
  c.font = font(fontSize);
  return c.measureText('A').width;
};

const columns = {
  K: 'kills',
  D: 'deaths',
  KDR: '',
  FK: 'final_kills',
  FD: 'final_deaths',
  FKDR: '',
  W: 'wins',
  L: 'losses',
  'W/L': '',
  Beds: 'beds_broken',
};

const gamemodes = {
  Solos: 'eight_one_',
  Doubles: 'eight_two_',
  '3v3v3v3': 'four_three_',
  '4v4v4v4': 'four_four_',
  '4v4': 'two_four_',
  'Rush Solo': 'eight_one_rush_',
  'Rush Doubles': 'eight_two_rush_',
  'Rush 4v4v4v4': 'four_four_rush_',
  'Ultimate Solo': 'eight_one_ultimate_',
  'Ultimate Doubles': 'eight_two_ultimate_',
  'Ultimate 4v4v4v4': 'eight_two_ultimate_',
  'Armed Doubles': 'eight_two_armed_',
  'Armed 4v4v4v4': 'four_four_armed_',
  'Voidless Doubles': 'eight_two_voidless_',
  'Voidless 4v4v4v4': 'four_four_voidless_',
  'Lucky Doubles': 'eight_two_lucky_',
  'Lucky 4v4v4v4': 'four_four_lucky_',
  'Castle 40v40': 'castle_',
  Overall: '',
};
const gamemodeNames = Object.keys(gamemodes);

export const makeBedwarsStats = ({
  data,
  playername,
}: {
  data?: Hypixel.Bedwars;
  playername: string;
}): [buffer: Buffer, metadata?: string] => {
  if (!data) throw new Error('no data');

  const stats: Record<string, Record<keyof typeof columns, string>> = {};

  Object.keys(gamemodes).forEach(game => {
    const raw: Record<keyof typeof columns, number> = {} as any;

    Object.keys(columns).forEach(col => {
      const key = `${gamemodes[game]}${columns[col]}_bedwars` as keyof Hypixel.Bedwars;
      raw[col] = parseInt(data[key]?.toString() ?? '0');
    });

    const obj = {
      ...raw,
      KDR: round(raw.K / raw.D),
      FKDR: round(raw.FK / raw.FD),
      'W/L': round(raw.W / raw.L),
    };

    stats[game] = {} as any;
    (Object.entries(obj) as [keyof typeof columns, number][]).map(([stat, value]) => {
      let stringVal = '';
      if (['KDR', 'FKDR', 'W/L'].includes(stat)) {
        if (value === 0) stringVal = ':(';
      }
      stats[game][stat] = stringVal || (isFinite(value) ? value.toLocaleString() : '-');
    });
  });

  const canvas = new Canvas(
    letterWidth(mainHeight) * 90,
    21 * (mainHeight + 2 * padding) + headerHeight + padding
  );
  const c = canvas.getContext('2d');

  c.fillStyle = '#36393f';
  c.fillRect(0, 0, canvas.width, canvas.height);

  c.fillStyle = '#dddddd';
  c.textDrawingMode = 'glyph';
  c.textAlign = 'left';
  c.strokeStyle = '#dddddd';
  c.lineWidth = 0.5;

  c.font = font(headerHeight);
  c.fillText('bedwars stats: ' + playername, padding, padding + headerHeight);

  c.textAlign = 'right';
  c.fillText(
    [
      `${data.winstreak.toLocaleString()} ws`,
      `${data.coins.toLocaleString()} coins`,
      `${getLevelForExp(data.Experience).toFixed(2)}★`,
    ].join('  '),
    canvas.width - padding,
    padding + headerHeight
  );

  c.font = font(mainHeight);
  c.textAlign = 'left';
  c.fillText(client.user.tag, padding, headerHeight + mainHeight + 2 * padding);

  c.save();
  c.transform(1, 0, 0, 1, 0, headerHeight + mainHeight + 3 * padding);

  gamemodeNames.forEach((mode, i) => {
    const lineY = i * (mainHeight + padding * 2) + mainHeight + 2 * padding;

    c.beginPath();
    c.moveTo(0, lineY);
    c.lineTo(canvas.width, lineY);
    c.stroke();

    c.fillText(mode, padding, i * (mainHeight + padding * 2) + 2.5 * padding + 2 * mainHeight);
  });

  c.textAlign = 'right';

  const widths = Object.keys(columns).map(col =>
    Math.max(
      c.measureText(col).width,
      ...gamemodeNames.map(mode => c.measureText(stats[mode][col].toString()).width),
      65
    )
  );

  c.transform(1, 0, 0, 1, canvas.width, 0);

  Object.keys(columns)
    .reverse()
    .map((col, i) => {
      i = Object.keys(columns).length - 1 - i;

      c.fillText(col, -padding, mainHeight + padding);

      const lineX = -(widths[i] + padding * 2);

      c.beginPath();
      c.moveTo(lineX, padding);
      c.lineTo(lineX, canvas.height);
      c.stroke();

      gamemodeNames.forEach((mode, j) => {
        const value = stats[mode][col];
        c.fillText(
          value.toString(),
          -padding,
          j * (mainHeight + padding * 2) + 2.5 * padding + 2 * mainHeight
        );
      });

      c.transform(1, 0, 0, 1, -(padding * 2 + widths[i]), 0);
    });

  c.setTransform(1, 0, 0, 1, 0, 0);

  const image = canvas.toBuffer('image/jpeg', { quality: 1 });

  return [image, `${canvas.width}x${canvas.height}  ${byteSize(image.byteLength)}`];
};

// stolen from https://github.com/Plancke/hypixel-php/tree/master/src/util/games/bedwars

const EASY_LEVELS = 4;
const EASY_LEVELS_XP = 7000;
const XP_PER_PRESTIGE = 96 * 5000 + EASY_LEVELS_XP;
const LEVELS_PER_PRESTIGE = 100;

const getLevelForExp = (exp: number) => {
  const prestiges = Math.floor(exp / XP_PER_PRESTIGE);

  let level = prestiges * LEVELS_PER_PRESTIGE;

  let expWithoutPrestiges = exp - prestiges * XP_PER_PRESTIGE;

  for (let i = 1; i <= EASY_LEVELS; ++i) {
    const expForEasyLevel = getExpForLevel(i);
    if (expWithoutPrestiges < expForEasyLevel) break;
    level++;
    expWithoutPrestiges -= expForEasyLevel;
  }

  level += expWithoutPrestiges / 5000;

  return level;
};

const getExpForLevel = (level: number) => {
  if (level == 0) return 0;

  const respectedLevel = getLevelRespectingPrestige(level);
  if (respectedLevel > EASY_LEVELS) {
    return 5000;
  }

  switch (respectedLevel) {
    case 1:
      return 500;
    case 2:
      return 1000;
    case 3:
      return 2000;
    case 4:
      return 3500;
  }
  return 5000;
};

const getLevelRespectingPrestige = (level: number) => {
  return level > Prestige.RAINBOW * LEVELS_PER_PRESTIGE
    ? level - Prestige.RAINBOW * LEVELS_PER_PRESTIGE
    : level % LEVELS_PER_PRESTIGE;
};

enum Prestige {
  NONE = 0,
  IRON = 1,
  GOLD = 2,
  DIAMOND = 3,
  EMERALD = 4,
  SAPPHIRE = 5,
  RUBY = 6,
  CRYSTAL = 7,
  OPAL = 8,
  AMETHYST = 9,
  RAINBOW = 10,
}
