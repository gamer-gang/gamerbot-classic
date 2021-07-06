import { Message } from 'discord.js';
import _ from 'lodash';
import { Command } from '..';
import { client } from '../../providers';
import { Context } from '../../types';
import { Embed } from '../../util';

export class CommandAbout implements Command {
  cmd = 'about';
  docs = {
    usage: 'about',
    description: 'show about message',
  };

  async execute(context: Context): Promise<void | Message> {
    const { msg } = context;

    const users = _.uniq(
      client.guilds.cache.array().flatMap(guild => guild.members.cache.array().map(u => u.id))
    );

    const embed = new Embed({ title: 'About' }).setDefaultAuthor();
    embed
      .addField('Repository', '[GitHub](https://github.com/gamer-gang/gamerbot)')
      .addField('Issues', '[Issues](https://github.com/gamer-gang/gamerbot/issues)')
      .addField('nice pfp', 'pfp made by @qqq#0447')
      .addField('Guilds', client.guilds.cache.size.toString(), true)
      .addField('Users', users.length.toString(), true)
      .setThumbnail('attachment://hexagon.png');

    const hash = process.env.LATEST_COMMIT_HASH;
    if (hash)
      embed.addField(
        'Latest commit',
        `[\`${hash?.slice(0, 7)}\`](https://github.com/gamer-gang/gamerbot/commit/${hash})`,
        true
      );
    return embed.send(msg.channel);
  }
}
