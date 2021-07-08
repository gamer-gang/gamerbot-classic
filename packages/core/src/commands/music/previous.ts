import { Context } from '@gamerbot/types';
import { codeBlock, Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';

export class CommandPrevious implements Command {
  cmd = ['previous', 'prev', 'rewind'];
  docs: CommandDocs = [
    {
      usage: ['previous'],
      description: 'rewind 1 track',
    },
    {
      usage: 'previous <number>',
      description: 'rewind many tracks',
    },
  ];
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;
    const queue = client.queues.get(msg.guild.id);

    if (!queue.playing) return Embed.error('Not playing').reply(msg);

    const voice = msg.member?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceChannel?.id)
      return Embed.error('You are not in the music channel').reply(msg);

    try {
      if (args._[0] != undefined) {
        const int = parseInt(args._[0]);

        if (!int || isNaN(int) || int <= 0 || int > queue.index)
          return Embed.error('Invalid amount').reply(msg);

        queue.index -= int + 1;

        Embed.success(`Rewinded **${int}** tracks`).reply(msg);
      } else {
        queue.index -= 2;
        msg.react('⏮️');
      }

      // break out of looping if looping one
      if (queue.loop === 'one') queue.index--;

      queue.audioPlayer.stop();
    } catch (err) {
      return Embed.error(codeBlock(err)).reply(msg);
    }
  }
}
