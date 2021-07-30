import { canvasStyle as s } from '@gamerbot/common';
import { Color, Embed, HslTriple, RgbTriple } from '@gamerbot/util';
import { Canvas } from 'canvas';
import { Message } from 'discord.js';
import { Command, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

export class CommandColor extends Command {
  cmd = ['color'];
  docs: CommandDocs = [
    {
      usage: 'color <hex|rgb|hsl>',
      description: `get info about color

example colors:
\`#1e90ff\`
\`30 144 255\`, \`30, 144, 255\` (assumes rgb)
\`rgb 30 144 255\`, \`rgb(30, 144, 255)\`
\`hsl 209.6 100% 55.88%\`, \`hsl(209.6, 100%, 555.88%)\`
`,
    },
  ];
  commandOptions: CommandOptions = {
    description: 'Get information about a color',
    options: [
      {
        name: 'color',
        description: 'Color (hex, RGB, or HSL); see `/help color` for examples',
        type: 'STRING',
        required: true,
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const input = event.isInteraction() ? event.options.getString('color') : event.args;
    if (!input) return event.reply(Embed.error('Invalid color').ephemeral());

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
          return event.reply(Embed.error('Invalid RGB color').ephemeral());
        color = Color.from(components, 'rgb');
      } else if (hslRegex.test(input)) {
        const exec = hslRegex.exec(input)?.slice(1);
        if (!exec) throw new Error('Invalid state: exec failed but passed test');

        color = Color.from(exec.map(str => parseInt(str)) as HslTriple, 'hsl');
      } else {
        return event.reply(
          Embed.error('Invalid color', 'See help for valid color formats').ephemeral()
        );
      }
    } catch (err) {
      return event.reply(Embed.error(err.message).ephemeral());
    }

    await event.defer();

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

    event.editReply({ files: [png] });
  }
}
