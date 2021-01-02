import { Message } from 'discord.js';

import { Command, CommandDocs } from '..';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';

export class CommandKick implements Command {
  cmd = 'kick';
  docs: CommandDocs = {
    usage: 'kick <user> <...reason>',
    description: 'bans',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;
    if (!msg.guild?.members.resolve(msg.author?.id as string)?.hasPermission('KICK_MEMBERS'))
      return msg.channel.send(Embed.error('you have insufficient permissions to kick members'));

    if (args._.length === 0) return msg.channel.send(Embed.error('Expected at least 1 argument'));

    if (!msg.guild?.me?.hasPermission('KICK_MEMBERS'))
      return msg.channel.send(Embed.error('bot has insufficient permissions to kick members'));

    try {
      const member = msg.guild.members.resolve(args._[0].replace(/[<@!>]/g, ''));

      if (!member)
        return msg.channel.send(Embed.error(`could not resolve member \`${args._[0]}\``));
      if (!member.kickable)
        return msg.channel.send(Embed.error(`user ${member.user.tag} is not kickable`));

      await member?.kick(args._.slice(1).join(' ') || undefined);
      msg.channel.send(Embed.success(member.user.tag + ' was kicked'));
    } catch (err) {
      msg.channel.send(Embed.error(codeBlock(err)));
    }
  }
}
