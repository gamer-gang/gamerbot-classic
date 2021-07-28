import { codeBlock, Embed } from '@gamerbot/util';
import didYouMean from 'didyoumean';
import { Message, MessageActionRow, MessageButton, MessageComponentInteraction } from 'discord.js';
import { DateTime } from 'luxon';
import { zones } from 'tzdata';
import { Command, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

didYouMean.threshold = 0.9;

const luxonValidTimezones = Object.entries(zones)
  .filter(([zoneName, v]) => Array.isArray(v))
  .map(([zoneName, v]) => zoneName)
  .filter(tz => DateTime.local().setZone(tz).isValid);

export class CommandTime extends Command {
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
  commandOptions: CommandOptions = {
    description: 'Get time and time zone information',
    options: [
      {
        name: 'world',
        description: 'Show time in a few common time zones',
        type: 'SUB_COMMAND',
      },
      {
        name: 'in',
        description: 'Get time in a time zone',
        type: 'SUB_COMMAND',
        options: [
          {
            name: 'zone',
            description: 'Time zone',
            type: 'STRING',
            required: true,
          },
        ],
      },
      {
        name: 'list',
        description: 'List time zones',
        type: 'SUB_COMMAND',
        options: [
          {
            name: 'page',
            description: 'Start on a page other than the first',
            type: 'INTEGER',
          },
        ],
      },
    ],
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

  async execute(event: CommandEvent): Promise<void | Message> {
    const subcommand = event.isInteraction()
      ? event.options.getSubCommand()
      : event.argv[0] ?? 'world';

    if (subcommand !== 'list' && subcommand !== 'in' && subcommand !== 'world')
      return event.reply(
        Embed.error('Invalid subcommand', 'Valid commands: world, in, list').ephemeral()
      );

    if (subcommand === 'list') {
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

      const parsedPageNumber = event.isInteraction()
        ? event.options.getInteger('page') ?? 1
        : parseInt(event.argv[0]);
      const parsedValid =
        !Number.isNaN(parsedPageNumber) && parsedPageNumber > 0 && parsedPageNumber < pages.length;

      let pageNumber = parsedValid ? parsedPageNumber - 1 : 0;

      if (pages.length === 1) {
        await event.reply(this.makeListEmbed(pages, pageNumber).ephemeral());
      } else {
        const row = new MessageActionRow({
          components: [
            new MessageButton({ customId: 'prev', style: 'SECONDARY', emoji: '◀️' }),
            new MessageButton({ customId: 'next', style: 'SECONDARY', emoji: '▶️' }),
          ],
        });

        const embed = this.makeListEmbed(pages, pageNumber);

        await event.reply({
          embeds: [embed],
          files: embed.files,
          components: [row],
        });

        const reply = event.channel.messages.cache.get((await event.fetchReply()).id)!;

        reply
          .createMessageComponentCollector({
            filter: (interaction: MessageComponentInteraction) =>
              interaction.user.id === event.user.id,
            idle: 1000 * 60 * 5,
          })
          .on('collect', interaction => {
            if (interaction.customId === 'next') {
              pageNumber++;
              if (pageNumber === pages.length) pageNumber = 0;
            } else {
              pageNumber--;
              if (pageNumber === -1) pageNumber = pages.length - 1;
            }

            interaction.update({
              embeds: [this.makeListEmbed(pages, pageNumber)],
              files: embed.files,
              components: [row],
            });
          })
          .on('end', () => {
            reply.edit({
              embeds: [this.makeListEmbed(pages, pageNumber)],
              files: embed.files,
              components: [],
            });
          });
      }

      return;
    } else if (subcommand === 'in') {
      let supplied = event.isInteraction()
        ? event.options.getString('zone', true)
        : event.args.split(' ').slice(1).join('_');

      if (!supplied) return event.reply(Embed.error('No time zone provided').ephemeral());

      let zone: string;

      if (/^^(?:(?:UTC|GMT)?[+-]\d{1,2}(?::\d{2})?|UTC|GMT)$$/i.test(supplied)) {
        supplied = supplied.replace(/GMT/gi, 'UTC');
        if (/^[+-]\d{1,2}(?::\d{2})?$/.test(supplied)) supplied = 'UTC' + supplied;
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
          return event.reply(
            Embed.error(
              'Invalid time zone',
              possibleMatch ? `Did you mean \`${possibleMatch}\`?` : undefined
            ).ephemeral()
          );
        }

        zone = matched[0];
      }

      const date = DateTime.now().setZone(zone);

      if (!date.isValid)
        return event.reply(
          Embed.error(
            'Error: ' + date.invalidReason,
            date.invalidExplanation || undefined
          ).ephemeral()
        );

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

      return event.reply(embed);
    } else {
      const commonZones: (keyof typeof zones)[] = [
        'Pacific/Honolulu',
        'America/Los_Angeles',
        'America/New_York',
        'Europe/Berlin',
        'Asia/Tokyo',
        'Australia/Sydney',
      ];

      const dates = commonZones.map(tz => DateTime.now().setZone(tz));

      const embed = new Embed({ title: 'World clock' });

      dates.forEach(date =>
        embed.addField(date.zoneName, date.toLocaleString(DateTime.DATETIME_MED), true)
      );

      return event.reply(embed);
    }
  }
}
