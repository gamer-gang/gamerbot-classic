import { Embed, getDateStringFromSnowflake, getProfileImageUrl } from '@gamerbot/util';
import { Guild, Message, Snowflake, User } from 'discord.js';
import { ChatCommand, CommandDocs, CommandOptions, UserCommand } from '..';
import { CommandEvent, ContextMenuCommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

const makeEmbed = (user: User, guild: Guild | null): Embed => {
  const icon = getProfileImageUrl(user);

  const inGuild = guild?.members.cache.get(user.id);

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
    const guildMember = guild!.members.cache.get(user.id)!;

    const roles = [...guildMember.roles.cache.values()].filter(
      r => r.id !== guild!.roles.everyone.id
    );
    embed.addField(
      `Roles (${roles?.length ?? 0})`,
      roles?.map(r => r.toString()).join(' ') || 'None'
    );
  }

  icon && embed.setThumbnail(icon);

  return embed;
};

export class CommandUserInfo extends ChatCommand {
  name = ['userinfo', 'user'];
  help: CommandDocs = [
    {
      usage: 'userinfo [id]',
      description: 'get information about a user (no id for you)',
    },
  ];
  data: CommandOptions = {
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

    event.reply(makeEmbed(user, event.guild));
  }
}

export class UserCommandUserInfo extends UserCommand {
  name = 'User info';
  async execute(interaction: ContextMenuCommandEvent): Promise<void | Message> {
    if (interaction.targetType !== 'USER') return;

    const user = client.users.resolve(interaction.targetId);

    if (!user)
      return interaction.reply({
        embeds: [
          Embed.error(
            'Could not resolve user',
            'Check if the user is valid and that gamerbot shares a server with the user.'
          ),
        ],
        ephemeral: true,
      });

    interaction.reply({ embeds: [makeEmbed(user, interaction.guild)], ephemeral: true });
  }
}
