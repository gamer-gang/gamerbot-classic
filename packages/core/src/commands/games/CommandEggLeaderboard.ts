import { Embed } from '@gamerbot/util';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  Message,
  MessageActionRow,
  MessageButton,
  MessageComponentInteraction,
  Snowflake,
} from 'discord.js';
import _ from 'lodash';
import { Command, CommandOptions } from '..';
import { EggLeaderboard } from '../../entities/EggLeaderboard';
import { CommandEvent } from '../../models/CommandEvent';
import { client, getORM } from '../../providers';

export class CommandEggLeaderboard extends Command {
  cmd = ['eggleaderboard', 'egglb'];
  docs = [
    {
      usage: 'eggleaderboard',
      description: 'egg leaderboard!! shows top 25 egg leaders.',
    },
    {
      usage: 'eggleaderboard <...user>',
      description: "show someone else's ranking",
    },
  ];
  commandOptions: CommandOptions = {
    description: 'Show egg leaders',
    options: [
      {
        name: 'user',
        description: 'User to show rankings for (leave blank for top eggers)',
        type: 'USER',
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const orm = await getORM();
    const eggers: Pick<EggLeaderboard, 'eggs' | 'userTag' | 'userId'>[] = await (
      orm.em as EntityManager
    )
      .createQueryBuilder(EggLeaderboard)
      .select(['eggs', 'userTag', 'userId'])
      .execute();

    eggers.sort((a, b) => b.eggs - a.eggs);

    const input = event.isInteraction()
      ? event.options.getUser('user')
      : (event.args.replace(/^<@!?(\d{18})>$/g, '$1') as Snowflake);

    if (input) {
      const user = client.users.resolve(input);

      if (!user) return event.reply(Embed.error('Invalid user').ephemeral());

      if (client.user.id === user.id)
        return event.reply(Embed.error('thats me you bafoon').ephemeral());

      const ranking = eggers.findIndex(lb => lb.userId == user.id);

      if (ranking === -1) return event.reply(Embed.error('No data/invalid user', 'get egging!!'));

      const eggs = eggers[ranking].eggs;

      return event.reply(
        Embed.info(
          `**${eggers[ranking].userTag}** is ranked **#${
            ranking + 1
          }** out of **${eggers.length.toLocaleString()}** in the world with **${eggs.toLocaleString()}** egg${
            eggs > 1 ? 's' : ''
          }`
        )
      );
    }

    const totalEggers = eggers.length.toLocaleString();
    const totalEggs = eggers
      .reduce((a, b) => ({ eggs: a.eggs + b.eggs }), { eggs: 0 })
      .eggs.toLocaleString();

    const pages = _.chunk(eggers, 20);

    let pageNumber = 0;

    if (pages.length === 1) {
      await event.reply(this.makeEmbed({ pages, totalEggers, totalEggs, pageNumber }));
    } else {
      const row = new MessageActionRow({
        components: [
          new MessageButton({ customId: 'prev', style: 'SECONDARY', emoji: '◀️' }),
          new MessageButton({ customId: 'next', style: 'SECONDARY', emoji: '▶️' }),
        ],
      });

      await event.reply({
        embeds: [this.makeEmbed({ pages, totalEggers, totalEggs, pageNumber })],
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
            embeds: [this.makeEmbed({ pages, totalEggers, totalEggs, pageNumber })],
            components: [row],
          });
        })
        .on('end', () => {
          reply.edit({
            embeds: [this.makeEmbed({ pages, totalEggers, totalEggs, pageNumber })],
            components: [],
          });
        });
    }
  }

  makeEmbed({
    pages,
    pageNumber,
    totalEggers,
    totalEggs,
  }: {
    pages: Pick<EggLeaderboard, 'eggs' | 'userTag' | 'userId'>[][];
    pageNumber: number;
    totalEggers: string;
    totalEggs: string;
  }): Embed {
    const page = pages[pageNumber];

    const formattedList = page
      .map(
        (lb, index) =>
          `${pageNumber * 20 + index + 1}. **${
            lb.userTag
          }** with **${lb.eggs.toLocaleString()}** egg${lb.eggs > 1 ? 's' : ''}`
      )
      .join('\n');

    const embed = Embed.info(
      '🥚 Top eggers',
      page.length
        ? `Total eggers: **${totalEggers}**
Total eggs: **${totalEggs}**

${formattedList}
`
        : 'No eggers! Get egging!!!'
    );

    if (pages.length > 1) embed.setFooter(`Page ${pageNumber + 1}/${pages.length}`);

    return embed;
  }
}
