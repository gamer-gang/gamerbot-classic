// stolen from https://github.com/Plancke/hypixel-php/tree/master/src/util/games/bedwars

import { canvasStyle as s } from '@gamerbot/config';
import { Color } from '@gamerbot/util';
import { Player } from 'hypixel-types';
import _ from 'lodash';
import { getRank, rankPrefixes } from './rank';
import { colors, parseFormattedText } from './style';

export const EASY_LEVELS = 4;
export const EASY_LEVELS_XP = 7000;
export const XP_PER_PRESTIGE = 96 * 5000 + EASY_LEVELS_XP;
export const LEVELS_PER_PRESTIGE = 100;

export const getLevelForExp = (exp: number): number => {
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

export const getExpForLevel = (level: number): number => {
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

export const getLevelRespectingPrestige = (level: number): number => {
  return level > 3000 ? level - 3000 : level % LEVELS_PER_PRESTIGE;
};

const {
  aqua,
  black,
  blue,
  dark_aqua,
  dark_blue,
  dark_gray,
  dark_green,
  dark_purple,
  dark_red,
  gold,
  gray,
  green,
  light_purple,
  red,
  white,
  yellow,
} = colors;

export const prestigeColors = {
  0: [gray],
  100: [white],
  200: [gold],
  300: [aqua],
  400: [dark_green],
  500: [dark_aqua],
  600: [dark_red],
  700: [light_purple],
  800: [blue],
  900: [dark_purple],
  1000: [red, gold, yellow, green, aqua, light_purple, dark_purple],
  1100: [gray, white, white, white, white, gray, gray],
  1200: [gray, yellow, yellow, yellow, yellow, gold, gray],
  1300: [gray, aqua, aqua, aqua, aqua, dark_aqua, gray],
  1400: [gray, green, green, green, green, dark_green, gray],
  1500: [gray, dark_aqua, dark_aqua, dark_aqua, dark_aqua, blue, gray],
  1600: [gray, red, red, red, red, dark_red, gray],
  1700: [gray, light_purple, light_purple, light_purple, light_purple, dark_purple, gray],
  1800: [gray, blue, blue, blue, blue, dark_blue, gray],
  1900: [gray, dark_purple, dark_purple, dark_purple, dark_purple, dark_gray, gray],
  2000: [dark_gray, gray, white, white, gray, gray, dark_gray],
  2100: [white, white, yellow, yellow, gold, gold, gold],
  2200: [gold, gold, white, white, aqua, dark_aqua, dark_aqua],
  2300: [dark_purple, dark_purple, light_purple, light_purple, gold, yellow, yellow],
  2400: [aqua, aqua, white, white, gray, gray, dark_gray],
  2500: [white, white, green, green, dark_green, dark_green, dark_green],
  2600: [dark_red, dark_red, red, red, light_purple, light_purple, dark_purple],
  2700: [yellow, yellow, white, white, dark_gray, dark_gray, dark_gray],
  2800: [green, green, dark_green, dark_green, gold, gold, yellow],
  2900: [aqua, aqua, dark_aqua, dark_aqua, blue, blue, blue],
  3000: [yellow, yellow, gold, gold, red, red, dark_red],
};

export const getPrestigePalette = (level: number): Color[] => {
  const keys = Object.keys(prestigeColors).reverse();

  for (const prestige of keys) {
    if (level >= prestige) return prestigeColors[prestige];
  }

  return [gray];
};

export const getPrestigePlaintext = (player: Player): string => {
  const level = Math.floor(getLevelForExp(player.stats.Bedwars.Experience ?? 0));
  const star = level >= 2100 ? '⚝' : level >= 1100 ? '✪' : '★';
  const tag = `[${level}${star}]`;
  return tag;
};

export const drawPrestige = (c: CanvasRenderingContext2D, player: Player): number => {
  c.save();

  const charWidth = s.getCharWidth(+c.font.split('px')[0]);

  const level = Math.floor(getLevelForExp(player.stats.Bedwars.Experience ?? 0));
  const palette = getPrestigePalette(level);

  const star = level >= 2100 ? '⚝' : level >= 1100 ? '✪' : '★';

  const tag = `[${level}${star}]`;

  const split = tag
    .split('')
    .map((char, index) => ({ text: char, color: palette[index % palette.length] }));

  c.textAlign = 'right';

  const width = _.clone(split)
    .reverse()
    .reduce((offset, segment) => {
      c.fillStyle = segment.color.hex;
      c.fillText(segment.text, offset, s.padding + s.headerHeight);

      return offset - (segment.text === star ? c.measureText(star).width * 1.1 : charWidth);
    }, c.canvas.width - s.padding - s.margin * 2);

  c.restore();

  return width;
};

export const drawRank = (
  c: CanvasRenderingContext2D,
  player: Player,
  x = s.padding,
  y = s.padding + s.headerHeight
): [width: number, nameColor: Color] => {
  c.save();

  const charWidth = s.getCharWidth(+c.font.split('px')[0]);

  const split = parseFormattedText(rankPrefixes[getRank(player)]).map(segment => {
    if (/^\*+$/.test(segment.text)) {
      segment.color = colors[(player.rankPlusColor ?? 'red').toLowerCase() as keyof typeof colors];
      segment.text = segment.text.replace(/\*/g, '+');
    }

    return segment;
  });

  const prefixWidth = split.reduce((offset, segment) => {
    c.fillStyle = segment.color.hex;
    c.fillText(segment.text, offset - charWidth * 0.2, y);

    return offset + charWidth * segment.text.length;
  }, x);

  c.restore();

  return [prefixWidth === x ? x : prefixWidth + charWidth / 2, split[0].color];
};
