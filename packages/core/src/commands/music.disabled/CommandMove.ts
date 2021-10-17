import { codeBlock } from '@discordjs/builders';
import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { ChatCommand, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandMove extends ChatCommand {
  name = ['move', 'mv'];
  help: CommandDocs = [
    {
      usage: 'move <query> [index]',
      description: 'move a track to a new queue position',
    },
  ];
  data: CommandOptions = {
    description: 'Move a track to a new queue position',
    options: [
      {
        name: 'query',
        description: 'Track to move (either title or index)',
        type: 'STRING',
        required: true,
      },
      {
        name: 'new-index',
        description: 'New index (if omitted, will move to after current track)',
        type: 'INTEGER',
        required: true,
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const queue = client.queues.get(event.guild.id);

    if (!(await queue.playing)) return event.reply(Embed.error('Not playing').ephemeral());

    const voice = event.guild.members.cache.get(event.user.id)?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceChannel?.id)
      return event.reply(
        Embed.error(
          'You must be in the same voice channel as the bot to use this command'
        ).ephemeral()
      );

    const query = event.isInteraction()
      ? event.options.getString('query', true)
      : event.argv.slice(0, event.argv.length - 1).join(' ');

    let newIndex = event.isInteraction()
      ? event.options.getInteger('new-index')
      : /^\d+$/.test(event.argv[event.argv.length - 1])
      ? parseInt(event.argv[event.argv.length - 1], 10)
      : null;

    try {
      if (query === null) return event.reply(Embed.error('No query provided').ephemeral());

      let oldIndex: number;

      if (/^\d+$/.test(query)) {
        oldIndex = parseInt(query);
      } else {
        const matched = queue.tracks.filter(
          t =>
            t.title.toLowerCase() === query.toLowerCase() ||
            t.title.toLowerCase().includes(query.toLowerCase())
        );

        if (matched.length === 0)
          return event.reply(Embed.error('No matches for query').ephemeral());
        else if (matched.length > 1)
          return event.reply(
            Embed.error(
              'Query matched more than one track:',
              matched
                .map(m => `${queue.tracks.findIndex(t => t === m) + 1}. ${m.titleMarkup}`)
                .join('\n')
            )
          );

        oldIndex = queue.tracks.findIndex(t => t === matched[0]);
      }

      // const oldIndex = /^\d+$/.test(query)
      //   ? parseInt(query)
      //   :

      newIndex ??= queue.index + 2;

      if (!oldIndex || isNaN(oldIndex) || oldIndex < 1 || oldIndex > queue.tracks.length)
        return event.reply(Embed.error('Invalid query').ephemeral());

      if (!newIndex || isNaN(newIndex) || newIndex < 1 || newIndex > queue.tracks.length + 1)
        return event.reply(Embed.error('Invalid index').ephemeral());

      if (oldIndex === queue.index + 1 || newIndex === queue.index + 1)
        return event.reply(Embed.error('Cannot move current track').ephemeral());

      const current = queue.tracks[queue.index];

      const moved = queue.tracks.splice(oldIndex - 1, 1)[0];
      queue.tracks.splice(newIndex, 0, moved);

      queue.index = queue.tracks.findIndex(t => t === current);

      event.reply(Embed.success(`Moved ${moved.titleMarkup} to #${newIndex} in queue`));
    } catch (err) {
      return event.reply(Embed.error(codeBlock(err)).ephemeral());
    }
  }
}
