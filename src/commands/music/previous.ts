import { Message } from 'discord.js';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';

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

    if (!queue.playing) return msg.channel.send(Embed.error('Not playing'));

    const voice = msg.member?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceConnection?.channel.id)
      return msg.channel.send(Embed.error('You are not in the music channel'));

    try {
      if (args._[0] != undefined) {
        const int = parseInt(args._[0]);

        if (!int || isNaN(int) || int <= 0 || int > queue.index)
          return msg.channel.send(Embed.error('Invalid amount'));

        queue.index -= int + 1;

        msg.channel.send(Embed.success(`Rewinded **${int}** tracks`));
      } else {
        queue.index -= 2;
        msg.react('⏮️');
      }

      // break out of looping if looping one
      if (queue.loop === 'one') queue.index--;

      queue.voiceConnection?.dispatcher?.end();
    } catch (err) {
      return msg.channel.send(Embed.error(codeBlock(err)));
    }
  }
}
