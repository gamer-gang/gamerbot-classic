import { Message } from 'discord.js';

import { Command } from '..';
import { CmdArgs } from '../../types';

export class CommandStop implements Command {
  cmd = 'stop';
  docs = {
    usage: 'stop',
    description: 'the music is hurting my ears please stop it',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, queueStore, client } = cmdArgs;
    const queue = queueStore.get(msg.guild?.id as string);

    if (!queue.playing) return msg.channel.send('not playing');

    try {
      queue.videos = [];
      queueStore.set(msg.guild?.id as string, queue);
      queue.playingEmbedMessage = undefined;
      queue.voiceConnection?.dispatcher?.end('stop command');
    } catch (err) {
      return msg.channel.send(`error: \n\`\`\`\n${err.stack}\n\`\`\``);
    }

    return msg.channel.send('stopped');
  }
}
