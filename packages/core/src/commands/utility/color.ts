import { canvasStyle as s } from '@gamerbot/config';
import { Context } from '@gamerbot/types';
import { Color, Embed, HslTriple, RgbTriple } from '@gamerbot/util';
import { Canvas } from 'canvas';
import { Message } from 'discord.js';
import { Command, CommandDocs } from '..';

export class CommandColor implements Command {
  cmd = 'color';
  docs: CommandDocs = {
    usage: 'color <hex|rgb|hsl>',
    description: `get info about color

example colors:
\`#1e90ff\`
\`30 144 255\`, \`30, 144, 255\` (assumes rgb)
\`rgb 30 144 255\`, \`rgb(30, 144, 255)\`
\`hsl 209.6 100% 55.88%\`, \`hsl(209.6, 100%, 555.88%)\`
`,
  };

  #hslToRgb(h: number, s: number, l: number): [r: number, g: number, b: number] {
    if (h < 0 || h > 360) throw 'Invalid hue';
    if (s < 0 || s > 100) throw 'Invalid saturation';
    if (l < 0 || l > 100) throw 'Invalid lightness';
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
  }

  #rgbToHsl(r: number, g: number, b: number): [h: number, s: number, l: number] {
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
  }

  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    const input = args._.join(' ');
    if (!input) return Embed.error('Invalid color').reply(msg);

    const hexCodeRegex = /^#?([a-f0-9]{3}|[a-f0-9]{6})$/i;
    const rgbRegex =
      /^(?:rgb(?:\s*\(|\s+))?\s*(\d{1,3})(?:,\s*|\s+)(\d{1,3})(?:,\s*|\s+)(\d{1,3})\s*\)?$/i;
    const hslRegex =
      /^hsl(?:\s*\(|\s+)\s*(\d+(?:\.\d+)?)(?:[°º]| ?deg(?:rees)?)?(?:,\s*|\s+)(\d+(?:\.\d+)?)%?(?:,\s*|\s+)(\d+(?:\.\d+)?)%?\s*\)?$/i;

    let color: Color;

    try {
      if (hexCodeRegex.test(input)) {
        const exec = hexCodeRegex.exec(input);
        if (!exec) throw new Error('Invalid state: exec failed but passed test');

        color = Color.from(exec[1]);
      } else if (rgbRegex.test(input)) {
        const exec = rgbRegex.exec(input)?.slice(1);
        if (!exec) throw new Error('Invalid state: exec failed but passed test');

        const components = exec.map(str => parseInt(str)) as RgbTriple;

        if (components.some(n => n < 0 || n > 255))
          return Embed.error('Invalid RGB color').reply(msg);
        color = Color.from(components, 'rgb');
      } else if (hslRegex.test(input)) {
        const exec = hslRegex.exec(input)?.slice(1);
        if (!exec) throw new Error('Invalid state: exec failed but passed test');

        color = Color.from(exec.map(str => parseInt(str)) as HslTriple, 'hsl');
      } else {
        return Embed.error('Invalid color', 'See help for valid color formats').reply(msg);
      }
    } catch (err) {
      return Embed.error(err.message).reply(msg);
    }

    const headerHeight = s.headerHeight + 12;
    const subheaderHeight = s.subheaderHeight + 12;

    const colorHeight = s.padding * 2 + headerHeight + subheaderHeight * 2;

    const canvas = new Canvas(848, colorHeight + s.padding * 2);
    const c = canvas.getContext('2d');

    c.quality = 'bilinear';
    c.patternQuality = 'bilinear';
    c.imageSmoothingQuality = 'high';
    c.antialias = 'subpixel';

    c.fillStyle = s.bgColor;
    c.fillRect(0, 0, canvas.width, canvas.height);

    const hsl = color.hsl;

    c.textAlign = 'left';
    c.font = s.font(headerHeight);
    c.fillStyle = s.fgColor;
    hsl[1];
    c.fillText(`${color.hex}`, s.padding, s.padding + headerHeight);

    c.font = s.font(subheaderHeight);
    c.fillStyle = s.fgAltColor;
    c.fillText(
      `rgb(${color.rgb.join(', ')})`,
      s.padding,
      s.padding * 1.5 + headerHeight + subheaderHeight
    );
    c.fillText(
      `hsl(${Math.round(hsl[0])}º, ${Math.round(hsl[1] * 100_00) / 1_00}%, ${
        Math.round(hsl[2] * 100_00) / 1_00
      }%)`,
      s.padding,
      s.padding * 2 + headerHeight + subheaderHeight * 2
    );

    c.fillStyle = color.hex;
    c.fillRect(canvas.width - s.padding - colorHeight, s.padding, colorHeight, colorHeight);

    const png = canvas.toBuffer('image/png');

    msg.reply({ files: [png] });
  }
}
