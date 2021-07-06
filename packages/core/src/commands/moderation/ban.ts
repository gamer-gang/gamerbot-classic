import { Message, PermissionString, Snowflake } from 'discord.js';
import { Command, CommandDocs } from '..';
import { Context } from '../../types';
import { codeBlock, Embed, sanitize } from '../../util';

export class CommandBan implements Command {
  cmd = 'ban';
  docs: CommandDocs = {
    usage: 'ban <user> <...reason>',
    description: 'bans',
  };
  userPermissions: PermissionString[] = ['BAN_MEMBERS'];
  botPermissions: PermissionString[] = ['BAN_MEMBERS'];
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    if (args._.length === 0)
      return Embed.error('Expected a user (and optionally reason)').reply(msg);

    try {
      const member = msg.guild.members.resolve(args._[0].replace(/[<@!>]/g, '') as Snowflake);

      if (!member) return Embed.error(`Could not resolve member \`${args._[0]}\``).reply(msg);

      const banner = msg.guild.members.resolve(msg.author.id)!;

      if (banner.roles.highest.comparePositionTo(member.roles.highest) <= 0)
        return Embed.error('You cannot ban that member').reply(msg);

      if (msg.guild.me!.roles.highest.comparePositionTo(member.roles.highest) <= 0)
        return Embed.error('Bot cannot ban member').reply(msg);

      if (!member.bannable) return Embed.error('User is not bannable').reply(msg);

      const reason = args._.slice(1).join(' ') || undefined;

      await member?.ban({ reason });
      Embed.success(
        member.user.tag + ' was banned',
        reason ? `Reason: ${sanitize(reason)}` : undefined
      ).reply(msg);
    } catch (err) {
      Embed.error(codeBlock(err)).reply(msg);
    }
  }
}
