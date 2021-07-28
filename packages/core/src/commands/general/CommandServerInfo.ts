import { Embed, getDateStringFromSnowflake } from '@gamerbot/util';
import { Guild, Message } from 'discord.js';
import { Command, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandServerInfo extends Command {
  cmd = ['serverinfo', 'guildinfo', 'server', 'guild'];
  docs: CommandDocs = [
    {
      usage: 'serverinfo [id]',
      description: 'get information about a server (no id for current server)',
    },
  ];
  commandOptions: CommandOptions = {
    description: 'Show server info',
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

    if (input) {
      guild = client.guilds.resolve(input as any);
      if (!guild)
        return event.reply(
          Embed.error(
            'Could not resolve guild ID',
            "Check if it's valid and that gamerbot is in that server."
          ).ephemeral()
        );
    }

    const inGuild = guild === event.guild;

    const bots = (await guild.members.fetch()).array().filter(member => member.user.bot).length;
    let icon = guild.iconURL({ dynamic: true, size: 4096 });
    if (icon?.includes('.webp')) icon = guild.iconURL({ format: 'png', size: 4096 });

    const owner = await guild.fetchOwner();
    const embed = new Embed({
      author: {
        iconURL: icon ?? undefined,
        name: guild.name,
      },
      title: 'Server info',
      description: icon ? undefined : 'No icon set',
    })
      .addField('Creation date', getDateStringFromSnowflake(guild.id).join('; '))
      .addField('Owner', inGuild ? owner.toString() : `${owner.user.tag} (${owner.id})`)
      .addField(
        'Members',
        `${guild.memberCount} members (${guild.memberCount - bots} users, ${bots} bots)`
      )
      .addField('ID', guild.id)
      .setTimestamp();

    icon && embed.setThumbnail(icon);

    event.reply(embed);
  }
}
