import { codeBlock, Embed, listify } from '@gamerbot/util';
import { Message } from 'discord.js';
import { ChatCommand, CommandOptions } from '..';
import { APIMessage, CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandRemove extends ChatCommand {
  name = ['remove', 'rm'];
  help = [
    {
      usage: 'remove <index> [removeCount]',
      description: 'Remove one or more tracks from the queue',
    },
  ];
  data: CommandOptions = {
    description: 'Remove one or more tracks from the queue',
    options: [
      {
        name: 'index',
        description: 'Start index to remove from',
        type: 'INTEGER',
        required: true,
      },
      {
        name: 'remove-count',
        description: 'Number of tracks to remove (default 1)',
        type: 'INTEGER',
      },
    ],
  };
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

    const start = event.isInteraction()
      ? event.options.getInteger('index', true)
      : parseInt(event.argv[0]);
    const removeCount =
      (event.isInteraction()
        ? event.options.getInteger('remove-count')
        : parseInt(event.argv[1])) ?? 1;

    if (!start) return event.reply(Embed.error('No start index specified').ephemeral());

    try {
      const current = queue.tracks[queue.index];
      // if (removeCount != null) {
      if (!removeCount) return event.reply(Embed.error('Invalid removal count').ephemeral());

      const end = start + removeCount;

      if (end > queue.tracks.length + 1)
        return event.reply(Embed.error('Removal count overflows end of queue').ephemeral());

      if (start <= queue.index + 1 && end > queue.index + 1)
        return event.reply(Embed.error("Can't remove current track").ephemeral());

      const removed = queue.tracks.splice(start - 1, removeCount);

      const trackMarkup = removed.map(track => `**${track.titleMarkup}**`);

      // update current index
      queue.index = queue.tracks.indexOf(current);

      return event.reply(Embed.success(`Removed ${listify(trackMarkup)} from the queue`));
      // } else {
      //   if (isNaN(start) || !start || start <= 0 || start > queue.tracks.length - 1)
      //     return event.reply(Embed.error('Invalid removal index').ephemeral());

      //   if (start === queue.index + 1)
      //     return event.reply(Embed.error("Can't remove current track").ephemeral());

      //   const removed = queue.tracks.splice(start - 1, 1)[0];

      //   // update current index
      //   queue.index = queue.tracks.indexOf(current);

      //   return event.reply(Embed.success(`Removed **${removed.titleMarkup}** from the queue`));
      // }
    } catch (err) {
      return event.reply(Embed.error(codeBlock(err)).ephemeral());
    }
  }
}
