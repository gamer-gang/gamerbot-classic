import { Message } from 'discord.js';

import { Command } from '..';
import { client } from '../..';
import { CmdArgs } from '../../types';

export class CommandBan implements Command {
  cmd = 'ban';
  docs = {
    usage: 'ban <user> <...reason>',
    description: 'bans'
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;
    if (!msg.guild?.members.resolve(msg.author?.id as string)?.hasPermission('BAN_MEMBERS'))
      return msg.channel.send('you are missing `BAN_MEMBERS` permission');

    if (args.length === 0) return msg.channel.send('expected at least 1 arg');

    if (!msg.guild?.members.resolve(client.user?.id as string)?.hasPermission('BAN_MEMBERS'))
      return msg.channel.send('bot is missing `BAN_MEMBERS` permission');

    try {
      const member = msg.guild.members.resolve(args[0].replace(/(<@!|>)/g, ''));

      if (!member) return msg.channel.send("couldn't resolve member");
      if (!member.bannable) return msg.channel.send('`user.bannable` is false');

      await member?.ban({ reason: args.slice(1).join(' ') || undefined });
      msg.channel.send('success');
    } catch (err) {
      msg.channel.send('we got an error boys\n```\n' + err + '\n```');
    }
  }
}
