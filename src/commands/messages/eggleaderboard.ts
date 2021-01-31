import { EntityManager } from '@mikro-orm/postgresql';
import { Message } from 'discord.js';
import yargsParser from 'yargs-parser';
import { Command } from '..';
import { EggLeaderboard } from '../../entities/EggLeaderboard';
import { client } from '../../providers';
import { Context } from '../../types';
import { Embed } from '../../util';

export class CommandEggLeaderboard implements Command {
  cmd = ['eggleaderboard', 'egglb'];
  yargs: yargsParser.Options = {
    boolean: ['me'],
    alias: {
      me: '-m',
    },
    default: {
      me: false,
    },
  };
  docs = [
    {
      usage: 'eggleaderboard',
      description: 'egg leaderboard!! shows top 25 egg leaders.',
    },
    {
      usage: 'eggleaderboard -m, --me',
      description: 'show your ranking',
    },
    {
      usage: 'eggleaderboard <...user>',
      description: "show someone else's ranking",
    },
  ];

  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    const eggers: Pick<
      EggLeaderboard,
      'eggs' | 'userTag' | 'userId'
    >[] = await (client.em as EntityManager)
      .createQueryBuilder(EggLeaderboard)
      .select(['eggs', 'userTag', 'userId'])
      .execute();

    eggers.sort((a, b) => b.eggs - a.eggs);

    if (args.me || args._.length) {
      const identifier = args.me ? msg.author?.id : args._.join(' ').trim();

      if (!identifier || !/^\d{18}|<@!?\d{18}>|.+#\d{4}$/.test(identifier)) {
        return msg.channel.send(Embed.error('invalid user'));
      }

      if ([client.user?.tag, client.user?.id].some(v => v && identifier.includes(v)))
        return msg.channel.send(Embed.error('thats me you bafoon'));

      const ranking = /\d{18}/.test(identifier)
        ? eggers.findIndex(lb => lb.userId == identifier.replace(/[<@!>]/g, ''))
        : eggers.findIndex(lb => lb.userTag == identifier);

      if (ranking === -1)
        return msg.channel.send(Embed.error('no data/invalid user', 'get egging!!'));

      const eggs = eggers[ranking].eggs;

      return msg.channel.send(
        Embed.info(
          `**${eggers[ranking].userTag}** is ranked **#${
            ranking + 1
          }** out of **${eggers.length.toLocaleString()}** in the world with **${eggs.toLocaleString()}** egg${
            eggs > 1 ? 's' : ''
          }`
        )
      );
    }

    const top = eggers.slice(0, Math.min(eggers.length, 25));

    return msg.channel.send(
      Embed.info(
        '🥚 top eggers',
        top.length
          ? `total eggers: **${eggers.length.toLocaleString()}**\ntotal eggs: **${eggers
              .reduce((a, b) => ({ eggs: a.eggs + b.eggs }), { eggs: 0 })
              .eggs.toLocaleString()}**\n` +
              top
                .map(
                  (lb, index) =>
                    `${index + 1}. **${lb.userTag}** with **${lb.eggs.toLocaleString()}** egg${
                      lb.eggs > 1 ? 's' : ''
                    }`
                )
                .join('\n')
          : 'no eggers! get egging!!!'
      )
    );
  }
}
