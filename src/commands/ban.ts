import { GuildMember, Message } from 'discord.js';

import { Command } from '.';
import { CmdArgs } from '../types';

export class CommandBan implements Command {
  cmd = 'ban';
  docs = {
    usage: 'ban <user>',
    description: 'bans',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;
    await msg.guild?.members.ban(msg.guild.members.resolve(args[1]) as GuildMember);
    msg.channel.send('success');
  }
}
