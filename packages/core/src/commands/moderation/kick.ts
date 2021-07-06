import { Message, PermissionString, Snowflake } from 'discord.js';
import { Command, CommandDocs } from '..';
import { Context } from '../../types';
import { codeBlock, Embed, sanitize } from '../../util';

export class CommandKick implements Command {
  cmd = 'kick';
  docs: CommandDocs = {
    usage: 'kick <user> <...reason>',
    description: 'bans',
  };
  userPermissions: PermissionString[] = ['KICK_MEMBERS'];
  botPermissions: PermissionString[] = ['KICK_MEMBERS'];
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;
    if (args._.length === 0)
      return Embed.error('Expected a user (and optionally reason)').reply(msg);

    try {
      const member = msg.guild.members.resolve(args._[0].replace(/[<@!>]/g, '') as Snowflake);

      if (!member) return Embed.error(`Could not resolve member \`${args._[0]}\``).reply(msg);

      const kicker = msg.guild.members.resolve(msg.author.id)!;

      if (kicker.roles.highest.comparePositionTo(member.roles.highest) <= 0)
        return Embed.error('You cannot kick that member').reply(msg);

      if (msg.guild.me!.roles.highest.comparePositionTo(member.roles.highest) <= 0)
        return Embed.error('gamerbot cannot kick that member').reply(msg);

      if (!member.kick) return Embed.error('User cannot be kicked').reply(msg);

      const reason = args._.slice(1).join(' ') || undefined;

      await member?.kick(reason);
      Embed.success(
        member.user.tag + ' was kicked',
        reason ? `Reason: ${sanitize(reason)}` : undefined
      ).reply(msg);
    } catch (err) {
      Embed.error(codeBlock(err)).reply(msg);
    }
  }
}
