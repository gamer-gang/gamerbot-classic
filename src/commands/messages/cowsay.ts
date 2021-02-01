import { say } from '@wiisportsresorts/cowsay';
import * as cows from '@wiisportsresorts/cowsay/lib/cows';
import { Message } from 'discord.js';
import yargsParser from 'yargs-parser';
import { Command } from '..';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';

export class CommandCowsay implements Command {
  cmd = 'cowsay';
  yargs: yargsParser.Options = {
    boolean: ['delete', 'list'],
    string: ['cow'],
    alias: {
      delete: 'd',
      cow: 'f',
      list: 'l',
    },
    default: {
      delete: false,
    },
  };
  docs = {
    usage: 'cowsay [-d, --delete] <...msg>',
    description: 'you know what it does (`--delete` deletes source command)',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    if (args.list)
      return msg.channel.send(Embed.info('Cows', codeBlock(Object.keys(cows).join(', '))));

    if (args._.length == 0 || /^\s+$/.test(args._.join(' ')))
      return msg.channel.send(Embed.error('nothing to say'));

    msg.channel.startTyping();

    args.delete && msg.deletable && msg.delete();

    const cow = Object.keys(cows).includes(args.cow)
      ? cows[args.cow as keyof typeof import('@wiisportsresorts/cowsay/lib/cows')]
      : undefined;

    if (args.cow && !cow) return msg.channel.send(Embed.error('Unknown cow'));

    const text = say(args._.join(' '), {
      W: 48,
      cow,
    }).replace(/```/g, "'''"); // prevent codeblock escaping

    const messages = text
      .match(/(.|\n){1,1990}\n/g)
      ?.map(message => codeBlock(message)) as string[];

    for (const text of messages) await msg.channel.send(text);

    msg.channel.stopTyping();
  }
}
