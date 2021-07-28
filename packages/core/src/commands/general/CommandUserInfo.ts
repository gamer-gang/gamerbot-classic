import { Embed, getDateStringFromSnowflake, getProfileImageUrl } from '@gamerbot/util';
import { Message, Snowflake, User } from 'discord.js';
import { Command, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandUserInfo extends Command {
  cmd = ['userinfo', 'user'];
  docs: CommandDocs = [
    {
      usage: 'userinfo [id]',
      description: 'get information about a user (no id for you)',
    },
  ];
  commandOptions: CommandOptions = {
    description: 'Show user info',
    options: [
      {
        name: 'user',
        description: 'ID of user to show (leave blank for yourself)',
        type: 'USER',
      },
    ],
  };

  async execute(event: CommandEvent): Promise<void | Message> {
    let user = event.user;

    const input = event.isInteraction() ? event.options.getUser('user') : event.args;

    if (input) {
      user =
        client.users.resolve(input as any) ??
        (client.users.resolve(input.toString().replace(/<@!?(\d+)>/g, '$1') as Snowflake) as User);
      if (!user)
        return event.reply(
          Embed.error(
            'Could not resolve user',
            'Check if the user is valid and that gamerbot shares a server with the user.'
          ).ephemeral()
        );
    }

    const icon = getProfileImageUrl(user);

    const inGuild = event.guild.members.cache.get(user.id);

    const embed = new Embed({
      author: {
        iconURL: icon ?? undefined,
        name: user.tag + (user.bot ? ' (bot)' : ''),
      },
      title: 'User info',
      description: inGuild ? user.toString() : undefined,
    })
      .addField('Account creation', getDateStringFromSnowflake(user.id).join('; '))
      .addField('ID', user.id)
      .setTimestamp();

    if (inGuild) {
      const guildMember = event.guild.members.cache.get(user.id);

      const roles = guildMember?.roles.cache
        .array()
        .filter(r => r.id !== event.guild.roles.everyone.id);
      embed.addField(
        `Roles (${roles?.length ?? 0})`,
        roles?.map(r => r.toString()).join(' ') || 'None'
      );
    }

    icon && embed.setThumbnail(icon);

    event.reply(embed);
  }
}
