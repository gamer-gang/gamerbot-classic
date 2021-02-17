import { Message } from 'discord.js';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';
import { Context } from '../../types';
import { Embed, getDateFromSnowflake } from '../../util';

export class CommandUserInfo implements Command {
  cmd = ['userinfo', 'user'];
  docs: CommandDocs = {
    usage: 'userinfo [id]',
    description: 'get information about a user (no id for you)',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    if (args._[0]) {
      const user = client.users.resolve(args._[0]);
      if (!user)
        return msg.channel.send(
          Embed.error(
            'Could not resolve user ID',
            "Check if it's valid and that gamerbot shares a server with the user."
          )
        );
    }

    const user = client.users.resolve(args._[0]) || msg.author;
    const icon = user.avatarURL({ format: 'png' });

    const inGuild = msg.guild.members.cache.get(user.id);

    const embed = new Embed({
      author: {
        iconURL: icon ?? undefined,
        name: user.tag + (user.bot ? ' (bot)' : ''),
      },
      title: 'User info',
      description: inGuild ? user.toString() : undefined,
    })
      .addField('Account creation', getDateFromSnowflake(user.id).join('; '))
      .addField('ID', user.id)
      .setTimestamp();

    if (inGuild) {
      const guildMember = msg.guild.members.cache.get(user.id);
      embed.addField(
        'Roles',
        guildMember?.roles.cache
          .array()
          .filter(r => r.id !== msg.guild.roles.everyone.id)
          .map(r => r.toString())
          .join(' ')
      );
    }

    icon && embed.setThumbnail(icon);

    msg.channel.send(embed);
  }
}
