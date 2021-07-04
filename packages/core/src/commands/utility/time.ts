import { Message, MessageReaction, User } from 'discord.js';
import { DateTime } from 'luxon';
import { zones } from 'tzdata';
import yargsParser from 'yargs-parser';
import { Command, CommandDocs } from '..';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';

const luxonValidTimezones = Object.entries(zones)
  .filter(([zoneName, v]) => Array.isArray(v))
  .map(([zoneName, v]) => zoneName)
  .filter(tz => DateTime.local().setZone(tz).isValid);

export class CommandTime implements Command {
  cmd = ['time', 'tz'];
  docs: CommandDocs = [
    {
      usage: 'time [zone]',
      description:
        'display time in a common zones or in one zone (IANA format or fixed UTC offset only)',
    },
    {
      usage: 'time -l, --list',
      description: 'list supported time zones',
    },
  ];
  yargs: yargsParser.Options = {
    alias: { list: 'l' },
    boolean: ['list'],
  };

  makeListEmbed(pages: string[], pageNumber: number): Embed {
    const embed = new Embed({
      title: 'Supported time zones',
      description: codeBlock(pages[pageNumber]),
    });
    if (pages.length > 1) embed.setFooter(`Page ${pageNumber + 1}/${pages.length}`);
    return embed;
  }

  ianaList = luxonValidTimezones.filter(tz => tz.includes('/'));

  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    if (args.list) {
      const pages = this.ianaList
        .join('\n')
        .match(/(?:.|\n){1,1000}\n/g)!
        .map(str => str);

      const parsedPageNumber = parseInt(args._[0]);
      const parsedValid =
        !Number.isNaN(parsedPageNumber) && parsedPageNumber > 0 && parsedPageNumber < pages.length;

      let pageNumber = parsedValid ? parsedPageNumber - 1 : 0;

      const message = await msg.channel.send(this.makeListEmbed(pages, pageNumber));

      if (pages.length > 1) {
        await message.react('◀️');
        await message.react('▶️');
        message
          .createReactionCollector(
            (reaction: MessageReaction, user: User) =>
              ['◀️', '▶️'].includes(reaction.emoji.name) && user.id === msg.author?.id,
            { idle: 60000 }
          )
          .on('collect', (reaction, user) => {
            if (reaction.emoji.name === '▶️') {
              pageNumber++;
              if (pageNumber === pages.length) pageNumber = 0;
            } else {
              pageNumber--;
              if (pageNumber === -1) pageNumber = pages.length - 1;
            }

            message.edit(this.makeListEmbed(pages, pageNumber));

            reaction.users.remove(user.id);
          })
          .on('end', () => message.reactions.removeAll());
      }
    }

    if (args._[0]) {
      let zone: string;

      if (/^(?:(?:UTC)?[+-]\d+|UTC)$/i.test(args._[0])) {
        if (/^[+-]\d+$/.test(args._[0])) args._[0] = 'UTC' + args._[0];
        zone = args._[0].toUpperCase();
      } else {
        const matched = this.ianaList.find(
          tz => tz.toLowerCase() === args._[0].toString().toLowerCase()
        );

        if (!matched) return msg.channel.send(Embed.error('Invalid time zone'));

        zone = matched;
      }

      const date = DateTime.now().setZone(zone);

      if (!date.isValid)
        return msg.channel.send(
          Embed.error('Error: ' + date.invalidReason, date.invalidExplanation || undefined)
        );

      const utcOffset = date.offset / 60;

      const embed = new Embed({
        author: { name: `Time in ${date.zoneName}` },
        title: date.toLocaleString(DateTime.DATETIME_HUGE_WITH_SECONDS),
        footer: { text: `Offset: UTC${utcOffset < 0 ? '' : '+'}${utcOffset}` },
      });

      return msg.channel.send(embed);
    }

    const commonZones: (keyof typeof zones)[] = [
      'America/Los_Angeles',
      'America/Chicago',
      'America/New_York',
      'Europe/London',
      'Europe/Paris',
      'Asia/Shanghai',
      'Asia/Tokyo',
    ];

    const dates = commonZones.map(tz => DateTime.now().setZone(tz));

    const embed = new Embed({ title: 'World Clock' });

    dates.forEach(date =>
      embed.addField(date.zoneName, date.toLocaleString(DateTime.DATETIME_MED))
    );

    msg.channel.send(embed);
  }
}
