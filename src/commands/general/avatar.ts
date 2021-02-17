import { Message, User } from 'discord.js';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';
import { Context } from '../../types';
import { Embed } from '../../util';

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
      console.log(args._[0]);
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

    const icon = user.avatarURL({ format: 'png', size: 4096 });

    if (!icon) return msg.channel.send(Embed.error('Could not get avatar for ' + user));

    const embed = new Embed({
      author: {
        iconURL: icon ?? undefined,
        name: user.tag,
      },
      title: 'Avatar',
      image: { url: icon },
    });

    msg.channel.send(embed);
  }
}
