import { Context } from '@gamerbot/types';
import { codeBlock, Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';

export class CommandNext implements Command {
  cmd = ['next', 'skip'];
  docs: CommandDocs = [
    {
      usage: 'next',
      description: 'skip current track',
    },
    {
      usage: 'next <number>',
      description: 'skip many tracks',
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

        if (!int || isNaN(int) || int <= 0 || int >= queue.tracks.length - queue.index)
          return Embed.error('Invalid skip amount').reply(msg);

        queue.index += int - 1;

        Embed.success(`Skipped **${int}** tracks`).reply(msg);
      } else {
        msg.react('⏭️');
      }

      // break out of looping if looping one
      if (queue.loop === 'one') queue.index++;

      queue.audioPlayer.stop();
    } catch (err) {
      return Embed.error(codeBlock(err)).reply(msg);
    }
  }
}
