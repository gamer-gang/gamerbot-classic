import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import _ from 'lodash';
import { ChatCommand, CommandOptions } from '..';
import packageJson from '../../../package.json';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandAbout extends ChatCommand {
  name = ['about'];
  help = [
    {
      usage: 'about',
      description: 'show about message',
    },
  ];
  data: CommandOptions = {
    description: 'Show about message.',
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const users = _.uniq(
      [...client.guilds.cache.values()].flatMap(guild =>
        [...guild.members.cache.values()].map(u => u.id)
      )
    );

    const embed = new Embed({ title: 'About' }).setDefaultAuthor();
    embed
      .addField('Repository', '[GitHub](https://github.com/gamer-gang/gamerbot)')
      .addField('Issues', '[Issues](https://github.com/gamer-gang/gamerbot/issues)')
      .addField('nice pfp', 'pfp made by @qqq#0447')
      .addField('Guilds', client.guilds.cache.size.toString(), true)
      .addField('Users', users.length.toString(), true)
      .setThumbnail('attachment://hexagon.png');

    embed.addField('Version', packageJson.version, true);
    return event.reply(embed);
  }
}
