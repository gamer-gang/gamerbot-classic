import { Guild, Message, Snowflake } from 'discord.js';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';
import { Context } from '../../types';
import { Embed } from '../../util';

export class CommandServericon implements Command {
  cmd = ['servericon', 'serverpfp', 'serveravatar', 'guildicon', 'guildpfp'];
  docs: CommandDocs = {
    usage: 'servericon [id]',
    description: 'get icon for a server (no id for current server)',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    let guild: Guild | undefined | null = msg.guild;

    if (args._[0]) {
      guild = client.guilds.resolve(args._.join('') as Snowflake);
    }

    if (!guild)
      return Embed.error(
        'Could not resolve server',
        'Check if the server is valid and that gamerbot is in it.'
      ).reply(msg);

    let icon = guild.iconURL({ dynamic: true, size: 4096 });
    if (icon?.includes('.webp')) icon = guild.iconURL({ format: 'png', size: 4096 });

    if (!icon) return Embed.error('Server has no icon set').reply(msg);

    const embed = new Embed({
      author: {
        iconURL: icon ?? undefined,
        name: guild.name,
      },
      title: 'Server icon',
      image: { url: icon },
    });

    embed.reply(msg);
  }
}
