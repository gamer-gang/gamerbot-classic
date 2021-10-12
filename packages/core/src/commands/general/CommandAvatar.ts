import { Embed, getProfileImageUrl } from '@gamerbot/util';
import { Message, Snowflake, User } from 'discord.js';
import { ChatCommand, CommandDocs, CommandOptions, UserCommand } from '..';
import { APIMessage, CommandEvent, ContextMenuCommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandAvatar extends ChatCommand {
  name = ['avatar', 'av'];
  help: CommandDocs = [
    {
      usage: 'avatar [user]',
      description: 'get avatar for a user (no id for you)',
    },
  ];
  data: CommandOptions = {
    description: 'Show avatar for a user',
    options: [
      {
        name: 'user',
        description: 'User to show avatar for (leave blank for yourself)',
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
    if (!icon) return event.reply(Embed.error('Could not get avatar for ' + user).ephemeral());

    const embed = new Embed({
      author: {
        iconURL: icon ?? undefined,
        name: user.tag,
      },
      title: 'Avatar',
      image: { url: icon },
    });

    event.reply(embed);
  }
}

export class UserCommandAvatar extends UserCommand {
  name = 'Avatar';
  async execute(interaction: ContextMenuCommandEvent): Promise<void | Message | APIMessage> {
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

    const icon = getProfileImageUrl(user);
    if (!icon)
      return interaction.reply({
        embeds: [Embed.error('Could not get avatar for ' + user)],
        ephemeral: true,
      });

    const embed = new Embed({
      author: {
        iconURL: icon ?? undefined,
        name: user.tag,
      },
      title: 'Avatar',
      image: { url: icon },
    });

    interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
