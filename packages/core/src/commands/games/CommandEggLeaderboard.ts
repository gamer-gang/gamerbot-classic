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
import { ChatCommand, CommandOptions } from '..';
import { EggLeaderboard } from '../../entities/EggLeaderboard';
import { CommandEvent } from '../../models/CommandEvent';
import { client, getORM } from '../../providers';

export class CommandEggLeaderboard extends ChatCommand {
  name = ['eggleaderboard', 'egglb'];
  help = [
    {
      usage: 'eggleaderboard',
      description: 'egg leaderboard!! shows top 25 egg leaders.',
    },
    {
      usage: 'eggleaderboard <...user>',
      description: "show someone else's ranking",
    },
  ];
  data: CommandOptions = {
    description: 'Show egg leaders',
    options: [
      {
        name: 'type',
        description: 'Leaderboard type',
        type: 'STRING',
        choices: [
          { name: 'collected', value: 'collected' },
          { name: 'balance', value: 'balance' },
        ],
      },
      {
        name: 'user',
        description: 'User to show rankings for (leave blank for top eggers)',
        type: 'USER',
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    let type = ((event.isInteraction() ? event.options.getString('type') : event.argv[0]) ??
      'balance') as 'balance' | 'collected';

    if (type && /^\w+$/.test(type) && type !== 'balance' && type !== 'collected')
      return event.reply(Embed.error('Invalid type', 'Valid options: collected, balance'));

    let userInput = event.isInteraction()
      ? event.options.getUser('user')
      : (event.argv[1]?.replace(/^<@!?(\d{18})>$/g, '$1') as Snowflake);

    if (/^<@!?(\d{18})>$/g.test(type)) {
      userInput = type.replace(/^<@!?(\d{18})>$/g, '$1') as Snowflake;
      type = 'balance';
    }

    const orm = await getORM();
    const eggers: Pick<EggLeaderboard, 'collected' | 'balance' | 'userTag' | 'userId'>[] = await (
      orm.em as EntityManager
    )
      .createQueryBuilder(EggLeaderboard)
      .select(['collected', 'balance', 'userTag', 'userId'])
      .execute();

    eggers.sort((a, b) =>
      BigInt(a[type]) < BigInt(b[type]) ? 1 : BigInt(a[type]) > BigInt(b[type]) ? -1 : 0
    );

    if (userInput) {
      const user = client.users.resolve(userInput);

      if (!user) return event.reply(Embed.error('Invalid user').ephemeral());

      if (client.user.id === user.id)
        return event.reply(Embed.error('thats me you bafoon').ephemeral());

      const ranking = eggers.findIndex(lb => lb.userId == user.id);

      if (ranking === -1) return event.reply(Embed.error('No data/invalid user', 'get egging!!'));

      const eggs = BigInt(eggers[ranking][type]);

      return event.reply(
        Embed.info(
          `**${eggers[ranking].userTag}** is ranked **#${
            ranking + 1
          }** out of **${eggers.length.toLocaleString()}** in the world for ${
            type === 'collected' ? 'lifetime collected eggs' : 'egg balance'
          } with **${eggs.toLocaleString()}** egg${eggs > 1 ? 's' : ''}`
        )
      );
    }

    const totalEggers = eggers.length.toLocaleString();
    const totalEggs = eggers.reduce((a, b) => a + BigInt(b[type]), 0n).toLocaleString();

    const pages = _.chunk(eggers, 20);

    let pageNumber = 0;

    if (pages.length === 1) {
      await event.reply(this.makeEmbed({ pages, totalEggers, totalEggs, pageNumber, type }));
    } else {
      const row = new MessageActionRow({
        components: [
          new MessageButton({ customId: 'prev', style: 'SECONDARY', emoji: '◀️' }),
          new MessageButton({ customId: 'next', style: 'SECONDARY', emoji: '▶️' }),
        ],
      });

      await event.reply({
        embeds: [this.makeEmbed({ pages, totalEggers, totalEggs, pageNumber, type })],
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
            embeds: [this.makeEmbed({ pages, totalEggers, totalEggs, pageNumber, type })],
            components: [row],
          });
        })
        .on('end', () => {
          reply.edit({
            embeds: [this.makeEmbed({ pages, totalEggers, totalEggs, pageNumber, type })],
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
    type,
  }: {
    pages: Pick<EggLeaderboard, 'collected' | 'balance' | 'userTag' | 'userId'>[][];
    pageNumber: number;
    totalEggers: string;
    totalEggs: string;
    type: 'collected' | 'balance';
  }): Embed {
    const page = pages[pageNumber];

    const formattedList = page
      .map(
        (lb, index) =>
          `${pageNumber * 20 + index + 1}. **${lb.userTag}** with **${lb[
            type
          ].toLocaleString()}** egg${BigInt(lb[type]) > 1n ? 's' : ''}`
      )
      .join('\n');

    const embed = Embed.info(
      `🥚 Top eggers (${type})`,
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
