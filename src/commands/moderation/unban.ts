import { Message } from 'discord.js';

import { Command } from '..';
import { CmdArgs } from '../../types';
import { Embed } from '../../util';

export class CommandUnban implements Command {
  cmd = 'unban';
  docs = {
    usage: 'unban <user>',
    description: 'unbans',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;
    if (!msg.guild?.members.resolve(msg.author?.id as string)?.hasPermission('BAN_MEMBERS'))
      return msg.channel.send(
        new Embed({ intent: 'error', title: 'you are missing `BAN_MEMBERS` permission' })
      );
    if (args._.length !== 1)
      return msg.channel.send(new Embed({ intent: 'error', title: 'expected 1 arg' }));
    if (!msg.guild?.me?.hasPermission('BAN_MEMBERS'))
      return msg.channel.send(
        new Embed({ intent: 'error', title: 'bot is missing `BAN_MEMBERS` permission' })
      );
    try {
      await msg.guild.members.unban(args._[0].replace(/(<@!|>)/g, ''));
      msg.channel.send(new Embed({ intent: 'success', title: 'unbanned' }));
    } catch (err) {
      msg.channel.send(
        new Embed({ intent: 'error', title: 'error', description: '```\n' + err + '\n```' })
      );
    }
  }
}
