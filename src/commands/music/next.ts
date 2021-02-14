import { Message } from 'discord.js';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';

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

    if (!queue.playing) return msg.channel.send(Embed.error('Not playing'));

    const voice = msg.member?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceConnection?.channel.id)
      return msg.channel.send(Embed.error('You are not in the music channel'));

    try {
      if (args._[0] != undefined) {
        const int = parseInt(args._[0]);

        if (!int || isNaN(int) || int <= 0 || int >= queue.tracks.length - queue.index)
          return msg.channel.send(Embed.error('Invalid skip amount'));

        queue.index += int - 1;

        msg.channel.send(Embed.success(`Skipped **${int}** tracks`));
      } else {
        msg.react('⏮️');
      }

      // break out of looping if looping one
      if (queue.loop === 'one') queue.index++;

      queue.voiceConnection?.dispatcher?.end();
    } catch (err) {
      return msg.channel.send(Embed.error(codeBlock(err)));
    }
  }
}
