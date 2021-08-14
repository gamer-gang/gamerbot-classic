import { codeBlock, Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { ChatCommand, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandPause extends ChatCommand {
  name = ['pause'];
  help: CommandDocs = [
    {
      usage: 'pause',
      description: 'pauses playback',
    },
  ];
  data: CommandOptions = {
    description: 'Pause playback',
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const queue = client.queues.get(event.guild.id);

    if (!(await queue.playing)) return event.reply(Embed.error('not playing').ephemeral());

    const voice = event.guild.members.cache.get(event.user.id)?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceChannel?.id)
      return event.reply(Embed.error('you are not in the music channel').ephemeral());

    try {
      queue.adapter.send('pause');
      queue.updateNowPlaying();

      if (event.isMessage()) event.react('⏸️');
      else event.reply(Embed.success('Paused'));
    } catch (err) {
      return event.reply(Embed.error(codeBlock(err)).ephemeral());
    }
  }
}
