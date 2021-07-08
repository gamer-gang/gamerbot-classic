import { Context } from '@gamerbot/types';
import { Embed, getProfileImageUrl } from '@gamerbot/util';
import { Message, Snowflake, User } from 'discord.js';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';

export class CommandAvatar implements Command {
  cmd = ['avatar', 'av'];
  docs: CommandDocs = {
    usage: 'avatar [id]',
    description: 'get avatar for a user (no id for you)',
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
    if (!icon) return Embed.error('Could not get avatar for ' + user).reply(msg);

    const embed = new Embed({
      author: {
        iconURL: icon ?? undefined,
        name: user.tag,
      },
      title: 'Avatar',
      image: { url: icon },
    });

    embed.reply(msg);
  }
}
