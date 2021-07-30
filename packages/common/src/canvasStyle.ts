/* eslint-disable @typescript-eslint/no-var-requires */
import { resolvePath } from '@gamerbot/util';

export const headerHeight = 44;
export const subheaderHeight = 28;
export const mainHeight = 40;
export const padding = 16;
export const margin = 0;
export const fgColor = '#dfe0e4';
export const fgAltColor = '#a8abb5';
export const bgColor = '#1e2024';

let fontLoaded = false;
const assertFontLoaded = () => {
  if (fontLoaded) return;
  fontLoaded = true;
  require('canvas').registerFont(resolvePath('assets/fonts/RobotoMono-Regular-NF.ttf'), {
    family: 'Roboto Mono',
  });
};

export const font = (px: number): string => px + 'px Roboto Mono';
export const round = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;
export const getCharWidth = (
  measure: number | import('canvas').CanvasRenderingContext2D
): number => {
  assertFontLoaded();
  if (typeof measure === 'number') {
    const mod = require('canvas');
    const tester: import('canvas').Canvas = new mod.Canvas(measure, measure);
    const c = tester.getContext('2d');
    c.fillStyle = fgColor;
    c.strokeStyle = fgColor;
    c.textAlign = 'left';
    c.font = font(measure);
    return c.measureText('A').width;
  } else return getCharWidth(+measure.font.split('px')[0]);
};
