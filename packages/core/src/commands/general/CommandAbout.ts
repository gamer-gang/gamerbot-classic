import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import _ from 'lodash';
import { Command, CommandOptions } from '..';
import packageJson from '../../../package.json';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandAbout extends Command {
  cmd = ['about'];
  docs = [
    {
      usage: 'about',
      description: 'show about message',
    },
  ];
  commandOptions: CommandOptions = {
    description: 'Show about message.',
  };
  async execute(event: CommandEvent): Promise<void | Message> {
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

    embed.addField('Version', packageJson.version, true);
    return event.reply(embed);
  }
}
