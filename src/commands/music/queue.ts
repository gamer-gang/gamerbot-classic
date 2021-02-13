import { Message, MessageReaction, User } from 'discord.js';
import he from 'he';
import _ from 'lodash';
import yargsParser from 'yargs-parser';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';
import { Context, Queue } from '../../types';
import { Embed, formatDuration, getTrackLength, getTrackUrl, listify } from '../../util';

export class CommandQueue implements Command {
  cmd = ['queue', 'q'];
  yargs: yargsParser.Options = {
    boolean: ['clear'],
    string: ['remove'],
    alias: {
      clear: ['c'],
      remove: ['rm', 'r'],
    },
  };
  docs: CommandDocs = [
    {
      usage: 'queue',
      description: 'list the things!!!',
    },
    {
      usage: 'queue -c, --clear',
      description: 'clear queue',
    },
    {
      usage: 'queue -r, --rm, --remove <index>',
      description: 'remove video at `<index>` from queue',
    },
  ];
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    const queue = client.queues.get(msg.guild.id);

    if (args.clear) {
      if (!queue.tracks.length) return msg.channel.send(Embed.error('Nothing playing'));

      queue.tracks = queue.playing ? [queue.tracks[queue.index]] : [];

      return msg.channel.send(Embed.success('Queue cleared'));
    }

    if (args.remove != null) {
      if (/^\d+-\d+$/.test(args.remove)) {
        const [start, end] = args.remove.split('-').map((n: string) => parseInt(n, 10));

        if (
          [start, end].some(v => isNaN(v) || !v || v <= 1 || v > queue.tracks.length) ||
          end < start
        )
          return msg.channel.send(Embed.error('Invalid removal range'));

        const removed = queue.tracks.splice(start - 1, end - start + 1);

        const trackMarkup = removed.map(
          track => `**[${he.decode(track.data.title)}](${getTrackUrl(track)})**`
        );

        return msg.channel.send(Embed.success(`Removed ${listify(trackMarkup)} from the queue`));
      } else {
        const index = parseInt(args.remove, 10);

        if (isNaN(index) || !index || index <= 0 || index > queue.tracks.length - 1)
          return msg.channel.send(Embed.error('Invalid removal index'));

        const removed = queue.tracks.splice(index, 1)[0];

        return msg.channel.send(
          Embed.success(
            '',
            `Removed **[${he.decode(removed.data.title)}](${getTrackUrl(removed)})** from the queue`
          )
        );
      }
    }

    const tracks = _.cloneDeep(queue.tracks);
    if (!tracks.length) return msg.channel.send(Embed.info('Nothing in queue'));

    const queueLines = tracks.map(
      (track, i) =>
        `${i + 1}. **[${he.decode(track.data.title)}](${getTrackUrl(track)})** (${getTrackLength(
          track
        )})${
          queue.playing && queue.index === i
            ? ` **(now playing, ${formatDuration(queue.remainingTime)} remaining)**`
            : ''
        }`
    );

    const queueSegments = _.chunk(queueLines, 10);
    let pageNumber = 0;

    const queueMessage = await msg.channel.send(
      this.makeEmbed({ queueSegments, pageNumber, queue })
    );

    if (queueSegments.length > 1) {
      await queueMessage.react('◀️');
      await queueMessage.react('▶️');
      queueMessage
        .createReactionCollector(
          (reaction: MessageReaction, user: User) =>
            ['◀️', '▶️'].includes(reaction.emoji.name) && user.id === msg.author?.id,
          { idle: 60000 }
        )
        .on('collect', (reaction, user) => {
          if (reaction.emoji.name === '▶️') {
            pageNumber++;
            if (pageNumber === queueSegments.length) pageNumber = 0;
          } else {
            pageNumber--;
            if (pageNumber === -1) pageNumber = queueSegments.length - 1;
          }
          queueMessage.edit(this.makeEmbed({ queueSegments, pageNumber, queue }));

          reaction.users.remove(user.id);
        })
        .on('end', () => queueMessage.reactions.removeAll());
    }
  }

  // TODO move into queue class

  makeEmbed({
    pageNumber,
    queueSegments,
    queue,
  }: {
    pageNumber: number;
    queueSegments: string[][];
    queue: Queue;
  }): Embed {
    const embed = new Embed({
      title: 'queue',
      description: `**queue length:** ${queue.length}\n${queueSegments[pageNumber].join('\n')}`,
    });

    if (queueSegments.length > 1) embed.setFooter(`page ${pageNumber + 1}/${queueSegments.length}`);

    return embed;
  }
}
