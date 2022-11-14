import { canvasStyle } from '@gamerbot/common';
import { Color } from '@gamerbot/util';
import { CanvasRenderingContext2D } from 'canvas';
import _ from 'lodash';

export const colors = {
  black: Color.from(0x000000),
  dark_blue: Color.from(0x0000aa),
  dark_green: Color.from(0x00aa00),
  dark_aqua: Color.from(0x00aaaa),
  dark_red: Color.from(0xaa0000),
  dark_purple: Color.from(0xaa00aa),
  gold: Color.from(0xffaa00),
  gray: Color.from(0xaaaaaa),
  dark_gray: Color.from(0x555555),
  blue: Color.from(0x5555ff),
  green: Color.from(0x55ff55),
  aqua: Color.from(0x55ffff),
  red: Color.from(0xff5555),
  light_purple: Color.from(0xff55ff),
  yellow: Color.from(0xffff55),
  white: Color.from(0xffffff),
};

export const colorCode = (num: number): Color => colors[Object.keys(colors)[num]];

type Text = {
  color: Color;
  text: string;
};

export const parseFormattedText = (text: string, defaultStyle = 0xdfe0e4): Text[] => {
  if (!text.includes('§')) return [{ text, color: Color.from(defaultStyle) }];
  return text
    .split('§')
    .filter(t => !!t)
    .map(segment => {
      if (!/^[A-Za-z0-9]$/.test(segment[0] ?? '')) throw new Error('invalid formatted string');

      return {
        color: segment[0] === 'r' ? Color.from(defaultStyle) : colorCode(parseInt(segment[0], 16)),
        text: segment.substring(1),
      };
    });
};

export const stripFormatting = (text: string): string => text.replace(/§[0-9a-f]/gi, '');

export const drawFormattedText = (
  c: CanvasRenderingContext2D,
  text: Text[] | string,
  x: number,
  y: number,
  textAlign: 'left' | 'right' = 'left'
): number => {
  const initialStyle = c.fillStyle;

  if (typeof text === 'string')
    text = parseFormattedText(text, parseInt(initialStyle.toString().replace(/#/g, ''), 16));

  const charWidth = canvasStyle.getCharWidth(+c.font.split('px')[0]);

  c.save();

  c.textAlign = textAlign;

  const textWidth = (textAlign === 'left' ? text : _.clone(text).reverse()).reduce((x, segment) => {
    c.fillStyle = segment.color.hex;
    c.fillText(segment.text, x, y);

    return textAlign === 'left'
      ? x + charWidth * segment.text.length
      : x - charWidth * segment.text.length;
  }, x);

  c.restore();

  return textWidth;
};
