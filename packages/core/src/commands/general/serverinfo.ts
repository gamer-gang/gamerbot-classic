import { Context } from '@gamerbot/types';
import { Embed, getDateStringFromSnowflake } from '@gamerbot/util';
import { Message, Snowflake } from 'discord.js';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';

export class CommandServerInfo implements Command {
  cmd = ['serverinfo', 'guildinfo', 'server', 'guild'];
  docs: CommandDocs = {
    usage: 'serverinfo [id]',
    description: 'get information about a server (no id for current server)',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    if (args._[0]) {
      const guild = client.guilds.resolve(args._[0] as Snowflake);
      if (!guild)
        return Embed.error(
          'Could not resolve guild ID',
          "Check if it's valid and that gamerbot is in that server."
        ).reply(msg);
    }

    const guild = client.guilds.resolve(args._[0] as Snowflake) || msg.guild;

    const inGuild = guild === msg.guild;

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

    embed.reply(msg);
  }
}
