import { Message } from 'discord.js';

import { Command, CommandDocs } from '..';
import { Context } from '../../types';
import { Embed, getDateFromSnowflake } from '../../util';

export class CommandServerInfo implements Command {
  cmd = 'serverinfo';
  docs: CommandDocs = {
    usage: 'serverinfo',
    description: 'get information about current server',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg } = context;

    const guild = msg.guild;

    const guildDate = getDateFromSnowflake(guild.id);
    const bots = (await guild.members.fetch()).array().filter(member => member.user.bot).length;
    const icon = guild.iconURL();

    const embed = new Embed({
      author: {
        iconURL: icon ?? undefined,
        name: guild.name,
      },
      title: 'Guild info',
    })
      .addField('Creation date', guildDate.join('; '))
      .addField('Owner', guild.owner)
      .addField(
        'Members',
        `${guild.memberCount} members (${guild.memberCount - bots} users, ${bots} bots)`
      )
      .setTimestamp();

    icon && embed.setThumbnail(icon);

    msg.channel.send(embed);
  }
}
