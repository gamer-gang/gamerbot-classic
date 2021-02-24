import { Message, PermissionString } from 'discord.js';
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
      return msg.channel.send(Embed.error('Expected a user (and optionally reason)'));

    try {
      const member = msg.guild.members.resolve(args._[0].replace(/[<@!>]/g, ''));

      if (!member)
        return msg.channel.send(Embed.error(`Could not resolve member \`${args._[0]}\``));

      const banner = msg.guild.members.resolve(msg.author.id)!;

      if (banner.roles.highest.comparePositionTo(member.roles.highest) <= 0)
        return msg.channel.send(Embed.error('You cannot ban that member'));

      if (msg.guild.me!.roles.highest.comparePositionTo(member.roles.highest) <= 0)
        return msg.channel.send(Embed.error('Bot cannot ban member'));

      if (!member.bannable) return msg.channel.send(Embed.error('User is not bannable'));

      const reason = args._.slice(1).join(' ') || undefined;

      await member?.ban({ reason });
      msg.channel.send(
        Embed.success(
          member.user.tag + ' was banned',
          reason ? `Reason: ${sanitize(reason)}` : undefined
        )
      );
    } catch (err) {
      msg.channel.send(Embed.error(codeBlock(err)));
    }
  }
}
