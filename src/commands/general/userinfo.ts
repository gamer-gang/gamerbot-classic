import { Message, User } from 'discord.js';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';
import { Context } from '../../types';
import { Embed, getDateFromSnowflake, getProfileImageUrl } from '../../util';

export class CommandUserInfo implements Command {
  cmd = ['userinfo', 'user'];
  docs: CommandDocs = {
    usage: 'userinfo [id]',
    description: 'get information about a user (no id for you)',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    let user = msg.author;

    if (args._[0]) {
      user =
        client.users.resolve(args._.join('')) ??
        (client.users.resolve(args._[0].replace(/<@!?(\d+)>/g, '$1')) as User);
      if (!user)
        return msg.channel.send(
          Embed.error(
            'Could not resolve user',
            'Check if the user is valid and that gamerbot shares a server with the user.'
          )
        );
    }

    const icon = getProfileImageUrl(user);

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

      const roles = guildMember?.roles.cache
        .array()
        .filter(r => r.id !== msg.guild.roles.everyone.id);
      embed.addField(
        `Roles (${roles?.length ?? 0})`,
        roles?.map(r => r.toString()).join(' ') || 'None'
      );
    }

    icon && embed.setThumbnail(icon);

    msg.channel.send(embed);
  }
}
