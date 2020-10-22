import { Message } from 'discord.js';
import he from 'he';
import _ from 'lodash';
import yargsParser from 'yargs-parser';

import { Command, CommandDocs } from '..';
import { CmdArgs, Track, TrackType } from '../../types';
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

    const queue = queueStore.get(msg.guild?.id as string);

    if (args.clear) {
      if (!queue.tracks.length)
        return msg.channel.send(new Embed({ intent: 'error', title: 'nothing playing' }));

      queue.tracks = [_.head(queue.tracks) as Track];

      return msg.channel.send(new Embed({ intent: 'success', title: 'cleared queue' }));
    }

    if (args.remove != null) {
      const index = args.remove;

      if (isNaN(index) || !index || index === 0 || index > queue.tracks.length - 1)
        return msg.channel.send(new Embed({ intent: 'error', title: 'invalid removal index' }));

      const removed = queue.tracks.splice(index, 1)[0];

      return msg.channel.send(
        new Embed({
          intent: 'success',
          title: `removed "[${he.decode(removed.data.title)}](${getTrackUrl(
            removed
          )})" from the queue`,
        })
      );
    }

    const tracks = _.cloneDeep(queue.tracks);
    if (!tracks.length)
      return msg.channel.send(new Embed({ intent: 'warning', title: 'nothing playing' }));

    const nowPlaying = tracks.shift();

    const queueString = tracks.length
      ? `queue: \n` +
        tracks
          .map(
            (track, i) =>
              `${i + 1}. [**${he.decode(track.data.title)}**](${getTrackUrl(
                track
              )}) (${getTrackLength(track)})`
          )
          .join('\n')
      : '*queue is empty*';

    if (!nowPlaying) return;
    msg.channel.send(
      new Embed({
        noAuthor: true,
        title: 'queue',
        description:
          `**now playing: [${he.decode(nowPlaying.data.title)}](${getTrackUrl(nowPlaying)})** (${
            nowPlaying.type === TrackType.YOUTUBE && nowPlaying.data.livestream
              ? 'livestream'
              : formatDuration(getCurrentSecondsRemaining(queue)) + ' remaining'
          }${queue.voiceConnection?.dispatcher.paused ? ', paused' : ''})\n` + queueString,
      }).addField('total queue length', getQueueLength(queue, { first: true }), true)
    );
  }
}
