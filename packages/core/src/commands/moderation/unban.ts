import { Message, PermissionString } from 'discord.js';
import { Command } from '..';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';

export class CommandUnban implements Command {
  cmd = 'unban';
  docs = {
    usage: 'unban <user>',
    description: 'unbans',
  };
  userPermissions: PermissionString[] = ['BAN_MEMBERS'];
  botPermissions: PermissionString[] = ['BAN_MEMBERS'];
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    if (!args._.length)
      return msg.channel.send(Embed.error('Expected a user (and optionally reason)'));

    const reason = args._.slice(1).join(' ') || undefined;

    try {
      await msg.guild.members.unban(args._[0].replace(/[<@!>]/g, ''), reason);
      msg.channel.send(Embed.success('User was unbanned'));
    } catch (err) {
      msg.channel.send(Embed.error(codeBlock(err)));
    }
  }
}
