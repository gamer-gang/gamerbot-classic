import { Message } from 'discord.js';
import { Command } from '.';
import { CmdArgs } from '../types';

export class CommandSkip implements Command {
  cmd = 'skip';
  docs = {
    usage: 'skip',
    description: 'it is gone',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, queueStore } = cmdArgs;
    const queue = queueStore.get(msg.guild?.id as string);

    if (!queue.playing) return msg.channel.send("yo i ain't even playing");

    queue.voiceConnection?.dispatcher.end('skip command');

    return msg.channel.send('ok skipped');
  }
}
