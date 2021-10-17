import { codeBlock } from '@discordjs/builders';
import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { ChatCommand, CommandOptions } from '..';
import { APIMessage, CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandClear extends ChatCommand {
  name = ['clear'];
  help = [{ usage: 'clear', description: 'Clear the queue' }];
  data: CommandOptions = { description: 'Clear the queue' };
  async execute(event: CommandEvent): Promise<void | Message | APIMessage> {
    const queue = client.queues.get(event.guild.id);

    if (!event.guild.me?.voice)
      return event.reply(Embed.error('Not conected to a channel').ephemeral());

    const voice = event.guild.members.cache.get(event.user.id)?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceChannel?.id)
      return event.reply(
        Embed.error(
          'You must be in the same voice channel as the bot to use this command'
        ).ephemeral()
      );

    try {
      if (!queue.tracks.length) return event.reply(Embed.error('Nothing playing').ephemeral());
      queue.tracks = (await queue.playing) ? [queue.tracks[queue.index]] : [];
      return event.reply(Embed.success('Queue cleared'));
    } catch (err) {
      return event.reply(Embed.error(codeBlock(err)).ephemeral());
    }
  }
}
