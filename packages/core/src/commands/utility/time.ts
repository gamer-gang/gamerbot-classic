import { Context } from '@gamerbot/types';
import { codeBlock, Embed } from '@gamerbot/util';
import didYouMean from 'didyoumean';
import { Message, MessageReaction, User } from 'discord.js';
import { DateTime } from 'luxon';
import { zones } from 'tzdata';
import yargsParser from 'yargs-parser';
import { Command, CommandDocs } from '..';

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

  ianaList = luxonValidTimezones.filter(tz => tz.includes('/')).sort();

  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    if (args.list) {
      const regions: { [region: string]: string[] } = {};
      this.ianaList.forEach(tz => {
        const [region, ...city] = tz.split('/');
        regions[region] ??= [];
        regions[region].push(city.join('/'));
      });

      const pages = Object.entries(regions)
        .map(([region, cities]) => `${region}\n===========\n${cities.sort().join(', ')}`)
        .join('\n\n')
        .match(/(?:.|\n){1,1000}([\n, ]|$)/g)!;

      const parsedPageNumber = parseInt(args._[0]);
      const parsedValid =
        !Number.isNaN(parsedPageNumber) && parsedPageNumber > 0 && parsedPageNumber < pages.length;

      let pageNumber = parsedValid ? parsedPageNumber - 1 : 0;

      const message = await this.makeListEmbed(pages, pageNumber).reply(msg);

      if (pages.length > 1) {
        await message.react('◀️');
        await message.react('▶️');
        message
          .createReactionCollector({
            filter: (reaction: MessageReaction, user: User) =>
              ['◀️', '▶️'].includes(reaction.emoji.name!) && user.id === msg.author?.id,
            idle: 60000,
          })
          .on('collect', (reaction, user) => {
            if (reaction.emoji.name === '▶️') {
              pageNumber++;
              if (pageNumber === pages.length) pageNumber = 0;
            } else {
              pageNumber--;
              if (pageNumber === -1) pageNumber = pages.length - 1;
            }

            message.edit({ embeds: [this.makeListEmbed(pages, pageNumber)] });

            reaction.users.remove(user.id);
          })
          .on('end', () => message.reactions.removeAll());
      }

      return;
    }

    if (args._[0]) {
      let zone: string;
      let supplied = args._.join('_');

      if (/^^(?:(?:UTC|GMT)?[+-]\d{1,2}(?::\d{2})?|UTC|GMT)$$/i.test(supplied)) {
        supplied = supplied.replace(/GMT/gi, 'UTC');
        if (/^[+-]\d{1,2}(?::\d{2})?$/.test(supplied)) supplied = 'UTC' + args._[0];
        zone = supplied.toUpperCase();
      } else {
        const matched = this.ianaList.filter(tz =>
          tz
            .replace(/[_/]/g, ' ')
            .toLowerCase()
            .includes(supplied.replace(/[_/]/g, ' ').toLowerCase())
        );

        if (matched.length !== 1) {
          const possibleMatch = didYouMean(supplied, this.ianaList);
          return Embed.error(
            'Invalid time zone',
            possibleMatch ? `Did you mean \`${possibleMatch}\`?` : undefined
          ).reply(msg);
        }

        zone = matched[0];
      }

      const date = DateTime.now().setZone(zone);

      if (!date.isValid)
        return Embed.error(
          'Error: ' + date.invalidReason,
          date.invalidExplanation || undefined
        ).reply(msg);

      // TODO: figure out how to display the short code for every zone in the correct locale
      // i.e. Europe/London in en-US is GMT+1, while in en-GB it is BST
      const shortCode = date.offsetNameShort;

      const embed = new Embed({
        author: { name: `Time in ${date.zoneName}` },
        title: date.toLocaleString(DateTime.DATETIME_HUGE_WITH_SECONDS),
        footer: {
          text: `Offset: UTC${date.toFormat('ZZ')}${
            /^[A-Z]+$/.test(shortCode) ? ' • Short code: ' + shortCode : ''
          }`,
        },
      });

      return embed.reply(msg);
    }

    const commonZones: (keyof typeof zones)[] = [
      'America/Los_Angeles',
      'America/Chicago',
      'America/New_York',
      'Europe/London',
      'Europe/Berlin',
      'Asia/Shanghai',
      'Asia/Tokyo',
      'Australia/Sydney',
    ];

    const dates = commonZones.map(tz => DateTime.now().setZone(tz));

    const embed = new Embed({ title: 'World clock' });

    dates.forEach(date =>
      embed.addField(date.zoneName, date.toLocaleString(DateTime.DATETIME_MED), true)
    );

    embed.reply(msg);
  }
}
