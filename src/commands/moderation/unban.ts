import { Message } from 'discord.js';

import { Command } from '..';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';

export class CommandUnban implements Command {
  cmd = 'unban';
  docs = {
    usage: 'unban <user>',
    description: 'unbans',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;
    if (!msg.guild?.members.resolve(msg.author?.id as string)?.hasPermission('BAN_MEMBERS'))
      return msg.channel.send(Embed.error('you have insufficient permissions to (un)ban members'));
    if (args._.length !== 1) return msg.channel.send(Embed.error('expected 1 argument'));
    if (!msg.guild?.me?.hasPermission('BAN_MEMBERS'))
      return msg.channel.send(Embed.error('bot has insufficient permissions to (un)ban members'));
    try {
      await msg.guild.members.unban(args._[0].replace(/[<@!>]/g, ''));
      msg.channel.send(Embed.success('user was unbanned'));
    } catch (err) {
      msg.channel.send(Embed.error(codeBlock(err)));
    }
  }
}
