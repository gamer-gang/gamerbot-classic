import { codeBlock } from '@discordjs/builders';
import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import _ from 'lodash';
import { ChatCommand, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandShuffle extends ChatCommand {
  name = ['shuffle', 'shuf'];
  help: CommandDocs = [
    {
      usage: 'shuffle',
      description: 'shuffle queue, moving current to top',
    },
  ];
  data: CommandOptions = {
    description: 'Shuffles queue',
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const queue = client.queues.get(event.guild.id);

    if (!(await queue.playing)) return event.reply(Embed.error('Not playing').ephemeral());
    if (queue.tracks.length <= 1) return event.reply(Embed.error('Nothing in queue').ephemeral());

    const voice = event.guild.members.cache.get(event.user.id)?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceChannel?.id)
      return event.reply(
        Embed.error(
          'You must be in the same voice channel as the bot to use this command'
        ).ephemeral()
      );

    try {
      const shuffled = _.shuffle(
        // omit currently playing track (which is going to moved to the top)
        _.clone(queue.tracks).filter((__, index) => index !== queue.index)
      );

      queue.tracks = [queue.tracks[queue.index], ...shuffled];
      queue.index = 0;

      if (event.isMessage()) event.react('🔀');
      else event.reply(Embed.success('Queue shuffled'));
    } catch (err) {
      return event.reply(Embed.error(codeBlock(err)).ephemeral());
    }
  }
}
