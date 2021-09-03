import { codeBlock } from '@discordjs/builders';
import { Embed, sanitize } from '@gamerbot/util';
import { Message, PermissionString, Snowflake, User } from 'discord.js';
import { ChatCommand, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandKick extends ChatCommand {
  name = ['kick'];
  help: CommandDocs = [
    {
      usage: 'kick <user> <...reason>',
      description: 'bans',
    },
  ];
  userPermissions: PermissionString[] = ['KICK_MEMBERS'];
  botPermissions: PermissionString[] = ['KICK_MEMBERS'];
  data: CommandOptions = {
    description: 'Kick a user',
    options: [
      {
        name: 'user',
        description: 'User to kick',
        type: 'USER',
        required: true,
      },
      {
        name: 'reason',
        description: 'Reason for kick',
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
      const kickee = event.guild.members.resolve(user);

      if (!kickee) return event.reply(Embed.error(`User not in server`).ephemeral());

      const kicker = event.guild.members.resolve(event.user.id)!;

      if (kicker.roles.highest.comparePositionTo(kickee.roles.highest) <= 0)
        return event.reply(Embed.error('You cannot kick that member').ephemeral());

      if (event.guild.me!.roles.highest.comparePositionTo(kickee.roles.highest) <= 0)
        return event.reply(Embed.error('gamerbot cannot kick that member').ephemeral());

      if (!kickee.kick)
        return event.reply(Embed.error('Member cannot be kicked by gamerbot').ephemeral());

      await kickee?.kick(
        `${kicker.user.tag} (${kicker.id}) used kick command${
          reason ? `: '${reason}'` : ' (no reason provided)'
        }`
      );
      event.reply(
        Embed.success(
          kickee.user.tag + ' was kicked',
          reason ? `Reason: ${sanitize(reason)}` : undefined
        )
      );
    } catch (err) {
      event.reply(Embed.error(codeBlock(err)).ephemeral());
    }
  }
}
