import { Message } from 'discord.js';

import { Command, CommandDocs } from '..';
import { CmdArgs } from '../../types';
import { Embed } from '../../util';

export class CommandBan implements Command {
  cmd = 'ban';
  docs: CommandDocs = {
    usage: 'ban <user> <...reason>',
    description: 'bans',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;
    if (!msg.guild?.members.resolve(msg.author?.id as string)?.hasPermission('BAN_MEMBERS'))
      return msg.channel.send(
        new Embed({ intent: 'error', title: 'you are missing `BAN_MEMBERS` permission' })
      );

    if (args._.length === 0)
      return msg.channel.send(new Embed({ intent: 'error', title: 'expected at least 1 arg' }));

    if (!msg.guild?.me?.hasPermission('BAN_MEMBERS'))
      return msg.channel.send(
        new Embed({ intent: 'error', title: 'bot is missing `BAN_MEMBERS` permission' })
      );

    try {
      const member = msg.guild.members.resolve(args._[0].replace(/(<@!|>)/g, ''));

      if (!member)
        return msg.channel.send(
          new Embed({ intent: 'error', title: `could not resolve member \`${args._[0]}\`` })
        );
      if (!member.bannable)
        return msg.channel.send(new Embed({ intent: 'error', title: 'user is not bannable' }));

      await member?.ban({ reason: args.slice(1).join(' ') || undefined });
      msg.channel.send(new Embed({ intent: 'success', title: 'success' }));
    } catch (err) {
      msg.channel.send(
        new Embed({ intent: 'error', title: 'error', description: '```\n' + err + '\n```' })
      );
    }
  }
}
