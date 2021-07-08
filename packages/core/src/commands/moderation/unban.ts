import { Context } from '@gamerbot/types';
import { codeBlock, Embed } from '@gamerbot/util';
import { Message, PermissionString, Snowflake } from 'discord.js';
import { Command } from '..';

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

    if (!args._.length) return Embed.error('Expected a user (and optionally reason)').reply(msg);

    const reason = args._.slice(1).join(' ') || undefined;

    try {
      await msg.guild.members.unban(args._[0].replace(/[<@!>]/g, '') as Snowflake, reason);
      Embed.success('User was unbanned').reply(msg);
    } catch (err) {
      Embed.error(codeBlock(err)).reply(msg);
    }
  }
}
