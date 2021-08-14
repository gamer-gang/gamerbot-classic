import { codeBlock, Embed } from '@gamerbot/util';
import { Message, PermissionString, Snowflake } from 'discord.js';
import { ChatCommand, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandUnban extends ChatCommand {
  name = ['unban'];
  help = [
    {
      usage: 'unban <user>',
      description: 'unbans',
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

    if (!input) return event.reply(Embed.error('Expected a user (and optionally reason)'));
    const user =
      client.users.resolve(input as any) ??
      client.users.resolve(input.toString().replace(/<@!?(\d+)>/g, '$1') as Snowflake) ??
      input.toString().replace(/<@!?(\d+)>/g, '$1');

    if (!user) return event.reply(Embed.error('Could not resolve user').ephemeral());

    const unbanner = event.guild.members.resolve(event.user.id)!;

    try {
      await event.guild.members.unban(
        user,
        `${unbanner.user.tag} (${unbanner.id}) used unban command${
          reason ? `: '${reason}'` : ' (no reason provided)'
        }`
      );
      event.reply(Embed.success(`${user} unbanned`));
    } catch (err) {
      event.reply(Embed.error(codeBlock(err)).ephemeral());
    }
  }
}
