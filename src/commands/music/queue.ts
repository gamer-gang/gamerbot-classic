import { Message } from 'discord.js';
import _ from 'lodash';
import yargsParser from 'yargs-parser';

import { Command, CommandDocs } from '..';
import { CmdArgs, Track, TrackType } from '../../types';
import { formatDuration, getQueueLength } from '../../util';

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
      if (!queue.tracks.length) return msg.channel.send('nothing playing');

      queue.tracks = [_.head(queue.tracks) as Track];

      return msg.channel.send('cleared queue');
    }

    if (args.remove != null) {
      const index = args.remove;

      if (isNaN(index) || !index || index === 0 || index > queue.tracks.length - 1)
        return msg.channel.send('invalid remove index');

      return msg.channel.send(
        `removed "${queue.tracks.splice(index, 1)[0].data.title}" from the queue`
      );
    }

    const tracks = _.cloneDeep(queue.tracks);
    if (!tracks.length) return msg.channel.send('nothing playing');

    const nowPlaying = tracks.shift();

    const queueString = tracks.length
      ? `queue: \n` +
        tracks
          .map(
            (v, i) =>
              `${i + 1}. ${_.unescape(v.data.title)}${` (${
                v.type === TrackType.YOUTUBE && v.data.livestream
                  ? 'livestream'
                  : formatDuration(v.data.duration)
              })`}`
          )
          .join('\n')
      : 'queue is empty';

    msg.channel.send(
      `total queue length: ${getQueueLength(queue, { first: true })}\n` +
        `now playing: ${_.unescape(nowPlaying?.data.title)} (${
          nowPlaying?.type === TrackType.YOUTUBE && nowPlaying?.data.livestream
            ? 'livestream'
            : formatDuration(queue.current.secondsRemaining) + ' remaining'
        })${queue.voiceConnection?.dispatcher.paused ? ' (paused)' : ''}\n` +
        queueString
    );
  }
}
