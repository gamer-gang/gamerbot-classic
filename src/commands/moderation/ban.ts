import { Message } from 'discord.js';

import { Command, CommandDocs } from '..';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';

export class CommandBan implements Command {
  cmd = 'ban';
  docs: CommandDocs = {
    usage: 'ban <user> <...reason>',
    description: 'bans',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;
    if (!msg.guild?.members.resolve(msg.author?.id as string)?.hasPermission('BAN_MEMBERS'))
      return msg.channel.send(Embed.error('you have insufficient permissions to ban members'));

    if (args._.length === 0) return msg.channel.send(Embed.error('expected at least 1 argument'));

    if (!msg.guild?.me?.hasPermission('BAN_MEMBERS'))
      return msg.channel.send(Embed.error('bot has insufficient permissions to ban members'));

    try {
      const member = msg.guild.members.resolve(args._[0].replace(/[<@!>]/g, ''));

      if (!member)
        return msg.channel.send(Embed.error(`could not resolve member \`${args._[0]}\``));
      if (!member.bannable) return msg.channel.send(Embed.error('user is not bannable'));

      await member?.ban({ reason: args._.slice(1).join(' ') || undefined });
      msg.channel.send(Embed.success(member.user.tag + ' was banned'));
    } catch (err) {
      msg.channel.send(Embed.error(codeBlock(err)));
    }
  }
}
