import { Message } from 'discord.js';

import { Command } from '..';
import { client } from '../..';
import { CmdArgs } from '../../types';

export class CommandUnban implements Command {
  cmd = 'unban';
  docs = {
    usage: 'unban <user>',
    description: 'unbans',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;
    if (!msg.guild?.members.resolve(msg.author?.id as string)?.hasPermission('BAN_MEMBERS'))
      return msg.channel.send('you are missing `BAN_MEMBERS` permission');
    if (args.length !== 1) return msg.channel.send('expected 1 arg');
    if (!msg.guild?.members.resolve(client.user?.id as string)?.hasPermission('BAN_MEMBERS'))
      return msg.channel.send('bot is missing `BAN_MEMBERS` permission');
    try {
      await msg.guild.members.unban(args._[0].replace(/(<@!|>)/g, ''));
      msg.channel.send('success');
    } catch (err) {
      msg.channel.send('we got an error boys\n```\n' + err + '\n```');
    }
  }
}
