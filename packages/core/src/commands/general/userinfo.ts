import { Context } from '@gamerbot/types';
import { Embed, getDateStringFromSnowflake, getProfileImageUrl } from '@gamerbot/util';
import { Message, Snowflake, User } from 'discord.js';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';

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
        client.users.resolve(args._.join('') as Snowflake) ??
        (client.users.resolve(args._[0].replace(/<@!?(\d+)>/g, '$1') as Snowflake) as User);
      if (!user)
        return Embed.error(
          'Could not resolve user',
          'Check if the user is valid and that gamerbot shares a server with the user.'
        ).reply(msg);
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
      .addField('Account creation', getDateStringFromSnowflake(user.id).join('; '))
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

    embed.reply(msg);
  }
}
