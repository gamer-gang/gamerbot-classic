import { Canvas } from 'canvas';
import { Color, color } from '../../../util/color';

export const headerHeight = 46;
export const mainHeight = 40;
export const padding = 16;
export const colors = {
  black: color(0x000000),
  dark_blue: color(0x0000aa),
  dark_green: color(0x00aa00),
  dark_aqua: color(0x00aaaa),
  dark_red: color(0xaa0000),
  dark_purple: color(0xaa00aa),
  gold: color(0xffaa00),
  gray: color(0xaaaaaa),
  dark_gray: color(0x555555),
  blue: color(0x5555ff),
  green: color(0x55ff55),
  aqua: color(0x55ffff),
  red: color(0xff5555),
  light_purple: color(0xff55ff),
  yellow: color(0xffff55),
  white: color(0xffffff),
};

export const colorCode = (num: number): Color => colors[Object.keys(colors)[num]];

export const parseFormattedText = (text: string): { color: Color; text: string }[] => {
  return text
    .split('§')
    .filter(t => !!t)
    .map(segment => {
      if (!/^[A-Za-z0-9]$/.test(segment[0] ?? '')) throw new Error('invalid formatted string');

      return { color: colorCode(parseInt(segment[0], 16)), text: segment.substring(1) };
    });
};

export const font = (px: number): string => px + 'px Roboto Mono';
export const round = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;
export const letterWidth = (fontSize: number): number => {
  const tester = new Canvas(fontSize, fontSize);
  const c = tester.getContext('2d');
  c.fillStyle = '#dddddd';
  c.strokeStyle = '#dddddd';
  c.textDrawingMode = 'glyph';
  c.textAlign = 'left';
  c.font = font(fontSize);
  return c.measureText('A').width;
};
