import { Canvas } from 'canvas';

export const headerHeight = 44;
export const subheaderHeight = 28;
export const mainHeight = 40;
export const padding = 16;
export const margin = 0;
export const fgColor = '#dfe0e4';
export const fgAltColor = '#a8abb5';
export const bgColor = '#1e2024';

export const font = (px: number): string => px + 'px Roboto Mono';
export const round = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;
export const getCharWidth = (measure: number | CanvasRenderingContext2D): number => {
  if (typeof measure === 'number') {
    const tester = new Canvas(measure, measure);
    const c = tester.getContext('2d');
    c.fillStyle = fgColor;
    c.strokeStyle = fgColor;
    c.textAlign = 'left';
    c.font = font(measure);
    return c.measureText('A').width;
  } else return getCharWidth(+measure.font.split('px')[0]);
};
