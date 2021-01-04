export type ColorFormat = 'number' | 'hex' | 'plain';
export type Color = ((format?: 'number') => number) &
  ((format?: 'hex') => string) &
  ((format?: 'plain') => string) & { toString(): string };

const color = (num: number): Color => {
  const fn = ((format?: ColorFormat) => {
    switch (format) {
      case 'number':
        return num;
      case 'plain':
        return num.toString(16);
      case 'hex':
      case undefined:
        return '#' + num.toString(16);
      default:
        throw new Error(`unknown color format: ${format}`);
    }
  }) as Color;

  fn.toString = () => fn('hex');

  return fn;
};

export class Colors {
  static readonly green = color(0x8eef43);
  static readonly blue = color(0x209fd5);
  static readonly red = color(0xfb4b4e);
  static readonly orange = color(0xefa443);
}
