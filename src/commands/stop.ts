import { Message } from 'discord.js';
import { Command } from '.';
import { CmdArgs } from '../types';

export class CommandStop implements Command {
  cmd = 'stop';
  docs = {
    usage: 'stop',
    description: 'the music is hurting my ears please stop it',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, queueStore } = cmdArgs;
    const queue = queueStore.get(msg.guild?.id as string);

    if (!queue.playing) return msg.channel.send("yo i ain't even playing");

    queue.videos = [];
    queue.voiceConnection?.dispatcher.end('stop command');

    return msg.channel.send('ok it stopped');
  }
}
