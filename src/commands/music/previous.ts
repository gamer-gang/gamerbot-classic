import { Message } from 'discord.js';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';
import { Context } from '../../types';
import { codeBlock, Embed } from '../../util';

export class CommandPrevious implements Command {
  cmd = ['previous', 'prev'];
  docs: CommandDocs = {
    usage: ['previous'],
    description: 'go back a track',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg } = context;
    const queue = client.queues.get(msg.guild.id);

    if (!queue.playing) return msg.channel.send(Embed.error('Not playing'));

    const voice = msg.member?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceConnection?.channel.id)
      return msg.channel.send(Embed.error('You are not in the music channel'));

    try {
      // break out of looping if looping one
      if (queue.loop === 'one') queue.index--;
      queue.voiceConnection?.dispatcher?.end();
      queue.index -= 2;
      msg.react('⏮️');
    } catch (err) {
      return msg.channel.send(Embed.error(codeBlock(err)));
    }
  }
}
