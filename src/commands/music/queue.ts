import { Message, MessageReaction, User } from 'discord.js';
import he from 'he';
import _ from 'lodash';
import yargsParser from 'yargs-parser';

import { Command, CommandDocs } from '..';
import { CmdArgs, GuildQueue, Track, TrackType } from '../../types';
import {
  Embed,
  formatDuration,
  getCurrentSecondsRemaining,
  getQueueLength,
  getTrackLength,
  getTrackUrl,
} from '../../util';

export class CommandQueue implements Command {
  cmd = ['queue', 'q'];
  yargsSchema: yargsParser.Options = {
    boolean: ['clear'],
    number: ['remove'],
    alias: {
      remove: ['rm', 'r'],
    },
  };
  docs: CommandDocs = [
    {
      usage: 'queue',
      description: 'list the things!!!',
    },
    {
      usage: 'queue --clear',
      description: 'clear queue',
    },
    {
      usage: 'queue -r, --rm, --remove <index>',
      description: 'remove video at `<index>` from queue',
    },
  ];
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args, queueStore } = cmdArgs;

    const queue = queueStore.get(msg.guild.id);

    if (args.clear) {
      if (!queue.tracks.length) return msg.channel.send(Embed.error('nothing playing'));

      queue.tracks = [_.head(queue.tracks) as Track];

      return msg.channel.send(Embed.success('cleared queue'));
    }

    if (args.remove != null) {
      const index = args.remove;

      if (isNaN(index) || !index || index <= 0 || index > queue.tracks.length - 1)
        return msg.channel.send(Embed.error('invalid removal index'));

      const removed = queue.tracks.splice(index, 1)[0];

      return msg.channel.send(
        Embed.success(
          '',
          `removed **[${he.decode(removed.data.title)}](${getTrackUrl(removed)})** from the queue`
        )
      );
    }

    const tracks = _.cloneDeep(queue.tracks);
    if (!tracks.length) return msg.channel.send(Embed.warning('nothing playing'));

    const nowPlaying = tracks.shift();
    // shouldn't happen, we checked if the track list is empty
    if (!nowPlaying) return;

    const queueLines = tracks.length
      ? tracks.map(
          (track, i) =>
            `${i + 1}. **[${he.decode(track.data.title)}](${getTrackUrl(
              track
            )})** (${getTrackLength(track)})`
        )
      : ['*queue is empty*'];

    const queueSegments = _.chunk(queueLines, 10);
    let pageNumber = 0;

    const queueMessage = await msg.channel.send(
      this.makeEmbed({ nowPlaying, queueSegments, pageNumber, queue })
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
          queueMessage.edit(this.makeEmbed({ nowPlaying, queueSegments, pageNumber, queue }));

          reaction.users.remove(user.id);
        })
        .on('end', () => queueMessage.reactions.removeAll());
    }
  }

  makeEmbed({
    pageNumber,
    queueSegments,
    nowPlaying,
    queue,
  }: {
    pageNumber: number;
    queueSegments: string[][];
    nowPlaying: Track;
    queue: GuildQueue;
  }): Embed {
    const embed = new Embed({
      title: 'queue',
      description:
        `**now playing: [${he.decode(nowPlaying.data.title)}](${getTrackUrl(nowPlaying)})** (${
          nowPlaying.type === TrackType.YOUTUBE && nowPlaying.data.livestream
            ? 'livestream'
            : formatDuration(getCurrentSecondsRemaining(queue)) + ' remaining'
        }${
          queue.voiceConnection?.dispatcher.paused ? ', paused' : ''
        })\n**queue length:** ${getQueueLength(queue, { first: true })}\n` +
        queueSegments[pageNumber].join('\n'),
    });

    if (queueSegments.length > 1) embed.setFooter(`page ${pageNumber + 1}/${queueSegments.length}`);

    return embed;
  }
}
