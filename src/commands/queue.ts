import { Message } from 'discord.js';
import * as _ from 'lodash';
import { Command } from '.';
import { CmdArgs } from '../types';

export class CommandQueue implements Command {
  cmd = ['queue', 'q'];
  docs = [
    {
      usage: ['queue'],
      description: `list the things!!!`,
    },
    {
      usage: ['queue remove <index>', 'queue rm <index>'],
      description: 'remove video at <index> from queue',
    },
  ];
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args, queueStore } = cmdArgs;

    const queue = queueStore.get(msg.guild?.id as string);

    switch (args[0]) {
      case 'remove':
      case 'rm':
        if (parseInt(args[1]) === 0 || parseInt(args[1]) > queue.videos.length - 1)
          return msg.channel.send('invalid index');
        msg.channel.send(
          `ok removed "${queue.videos.splice(parseInt(args[1]), 1)[0].title}" from the queue`
        );
        break;
      default: {
        const videos = _.cloneDeep(queue.videos);
        if (!videos.length) return msg.channel.send('nothing playing');

        const nowPlaying = videos.shift();

        const queueString = videos.length
          ? `queue: \n` + videos.map((v, i) => i + 1 + '. ' + _.unescape(v.title) + '\n').join('')
          : 'queue is empty';

        msg.channel.send(`now playing: ${_.unescape(nowPlaying?.title)}\n` + queueString);
        break;
      }
    }
  }
}
