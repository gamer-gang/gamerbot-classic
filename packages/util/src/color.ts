export type ColorFormat = 'number' | 'hex' | 'plain' | 'rgb' | 'hsl';
export type RgbTriple = [r: number, g: number, b: number];
export type HslTriple = [h: number, s: number, l: number];

const hslToRgb = (h: number, s: number, l: number): RgbTriple => {
  if (h < 0 || h > 360) throw new Error('Invalid hue');
  if (s < 0 || s > 100) throw new Error('Invalid saturation');
  if (l < 0 || l > 100) throw new Error('Invalid lightness');
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60.0;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rgb1: number[] = [];
  if (isNaN(h)) rgb1 = [0, 0, 0];
  else if (hp <= 1) rgb1 = [c, x, 0];
  else if (hp <= 2) rgb1 = [x, c, 0];
  else if (hp <= 3) rgb1 = [0, c, x];
  else if (hp <= 4) rgb1 = [0, x, c];
  else if (hp <= 5) rgb1 = [x, 0, c];
  else if (hp <= 6) rgb1 = [c, 0, x];
  const m = l - c * 0.5;
  return [
    Math.round(255 * (rgb1[0] + m)),
    Math.round(255 * (rgb1[1] + m)),
    Math.round(255 * (rgb1[2] + m)),
  ];
};

const rgbToHsl = (r: number, g: number, b: number): HslTriple => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d === 0) h = 0;
  else if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else if (max === b) h = (r - g) / d + 4;
  const l = (min + max) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [h * 60, s, l];
};

export class Color {
  static from(input: RgbTriple | HslTriple | number | string, type?: 'rgb' | 'hsl'): Color {
    let num: number;

    if (typeof input === 'number') num = input;
    else if (Array.isArray(input)) {
      num = parseInt(
        (type === 'hsl' ? hslToRgb(...(input as HslTriple)) : input)
          .map(value => value.toString(16).padStart(2, '0'))
          .join(''),
        16
      );
      if (isNaN(num)) throw new Error('Invalid HSL/RGB color');
    } else {
      input = input.replace(/#/g, '');
      if (input.length === 3) {
        // double each character
        input = input
          .split('')
          .map(c => c + c)
          .join('');
      } else if (input.length !== 6)
        throw new Error('Hex value input to Color.from() not 3 or 6 in length');

      num = parseInt(input, 16);
      if (isNaN(num)) throw new Error('Invalid hexidecimal color');
    }

    return new Color(num);
  }

  #rgb: RgbTriple;
  #string: string;

  constructor(private num: number) {
    this.#string = this.num.toString(16).padStart(6, '0');

    const r = this.#string.slice(0, 2);
    const g = this.#string.slice(2, 4);
    const b = this.#string.slice(4, 6);

    this.#rgb = [r, g, b].map(s => parseInt(s, 16)) as RgbTriple;
  }

  get number(): number {
    return this.num;
  }
  get plain(): string {
    return this.#string;
  }
  get rgb(): RgbTriple {
    return [...this.#rgb];
  }
  get hsl(): HslTriple {
    return rgbToHsl(...this.#rgb);
  }
  get hex(): string {
    return `#${this.#string}`;
  }
}
