import { codeBlock, Embed, sanitize } from '@gamerbot/util';
import { Message, PermissionString, Snowflake, User } from 'discord.js';
import { ChatCommand, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandBan extends ChatCommand {
  name = ['ban'];
  help: CommandDocs = [
    {
      usage: 'ban <user> <...reason>',
      description: 'bans',
    },
  ];
  userPermissions: PermissionString[] = ['BAN_MEMBERS'];
  botPermissions: PermissionString[] = ['BAN_MEMBERS'];
  data: CommandOptions = {
    description: 'Unban a user',
    options: [
      {
        name: 'user',
        description: 'User to unban',
        type: 'USER',
        required: true,
      },
      {
        name: 'reason',
        description: 'Unban reason',
        type: 'STRING',
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const input = event.isInteraction() ? event.options.getUser('user') : event.argv[0];
    const reason = event.isInteraction()
      ? event.options.getString('reason')
      : event.args.split(' ').slice(1).join(' ');

    if (!input) return event.reply(Embed.error('Expected a user (and optionally reason'));
    const user =
      client.users.resolve(input as any) ??
      (client.users.resolve(input.toString().replace(/<@!?(\d+)>/g, '$1') as Snowflake) as User);

    if (!user) return event.reply(Embed.error('Could not resolve user').ephemeral());

    try {
      const banner = event.guild.members.resolve(event.user.id)!;
      const bannee = event.guild.members.resolve(user);

      if (!bannee) return event.reply(Embed.error('User not in guild').ephemeral());

      if (banner.roles.highest.comparePositionTo(bannee.roles.highest) <= 0)
        return event.reply(Embed.error('You cannot ban that member').ephemeral());

      if (event.guild.me!.roles.highest.comparePositionTo(bannee.roles.highest) <= 0)
        return event.reply(Embed.error('gamerbot cannot ban that member').ephemeral());

      if (!bannee.bannable)
        return event.reply(Embed.error('Member is not bannable by gamerbot').ephemeral());

      await bannee.ban({
        reason: `${banner.user.tag} (${banner.id}) used ban command${
          reason ? `: '${reason}'` : ' (no reason provided)'
        }`,
      });
      event.reply(
        Embed.success(
          bannee.user.tag + ' was banned',
          reason ? `Reason: ${sanitize(reason)}` : undefined
        )
      );
    } catch (err) {
      event.reply(Embed.error(codeBlock(err)).ephemeral());
    }
  }
}
