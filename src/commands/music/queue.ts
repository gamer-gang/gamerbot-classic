import { Message } from 'discord.js';
import _ from 'lodash';
import yargsParser from 'yargs-parser';

import { Command, CommandDocs } from '..';
import { CmdArgs, Video } from '../../types';
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
      if (!queue.videos.length) return msg.channel.send('nothing playing');

      queue.videos = [_.head(queue.videos) as Video];

      return msg.channel.send('cleared queue');
    }

    if (args.remove != null) {
      const index = args.remove;

      if (isNaN(index) || !index || index === 0 || index > queue.videos.length - 1)
        return msg.channel.send('invalid remove index');

      return msg.channel.send(`removed "${queue.videos.splice(index, 1)[0].title}" from the queue`);
    }

    const videos = _.cloneDeep(queue.videos.map(v => v as Omit<Video, 'youtube'>));
    if (!videos.length) return msg.channel.send('nothing playing');

    const nowPlaying = videos.shift();

    const queueString = videos.length
      ? `queue: \n` +
        videos
          .map(
            (v, i) =>
              `${i + 1}. ${_.unescape(v.title)}${` (${
                v.livestream ? 'livestream' : formatDuration(v.duration)
              })`}`
          )
          .join('\n')
      : 'queue is empty';

    msg.channel.send(
      `total queue length: ${getQueueLength(queue, true)}\n` +
        `now playing: ${_.unescape(nowPlaying?.title)} (${
          nowPlaying?.livestream
            ? 'livestream'
            : formatDuration(queue.currentVideoSecondsRemaining) + ' remaining'
        })${queue.voiceConnection?.dispatcher.paused ? ' (paused)' : ''}\n` +
        queueString
    );
  }
}
