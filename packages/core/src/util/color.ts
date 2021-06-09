export type ColorFormat = 'number' | 'hex' | 'plain';
export type Color = ((format?: 'number') => number) &
  ((format?: 'hex') => string) &
  ((format?: 'plain') => string);

export const color = (num: number): Color => {
  const fn = ((format?: ColorFormat) => {
    switch (format) {
      case 'number':
        return num;
      case 'plain':
        return num.toString(16).padStart(6, '0');
      case 'hex':
      case undefined:
        return '#' + num.toString(16).padStart(6, '0');
      default:
        throw new Error(`unknown color format: ${format}`);
    }
  }) as Color;

  fn.toString = () => fn('hex');
  fn.valueOf = () => fn('number');

  return fn;
};
