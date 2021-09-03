import { Embed } from '@gamerbot/util';
import { Guild, Message } from 'discord.js';
import { ChatCommand, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandServericon extends ChatCommand {
  name = ['servericon', 'serverpfp', 'serveravatar', 'guildicon', 'guildpfp'];
  help: CommandDocs = [
    {
      usage: 'servericon [id]',
      description: 'get icon for a server (no id for current server)',
    },
  ];
  data: CommandOptions = {
    description: 'Show icon for a server',
    options: [
      {
        name: 'id',
        description: 'ID of server to show (leave blank for current server)',
        type: 'STRING',
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    let guild: Guild | undefined | null = event.guild;

    const input = event.isInteraction() ? event.options.getString('id') : event.args;

    if (input) guild = client.guilds.resolve(input as any);

    if (!guild)
      return event.reply(
        Embed.error(
          'Could not resolve server',
          'Check if the server is valid and that gamerbot is in it.'
        ).ephemeral()
      );

    let icon = guild.iconURL({ dynamic: true, size: 4096 });
    if (icon?.includes('.webp')) icon = guild.iconURL({ format: 'png', size: 4096 });

    if (!icon) return event.reply(Embed.info('Server has no icon set').ephemeral());

    const embed = new Embed({
      author: {
        iconURL: icon ?? undefined,
        name: guild.name,
      },
      title: 'Server icon',
      image: { url: icon },
    });

    event.reply(embed);
  }
}
