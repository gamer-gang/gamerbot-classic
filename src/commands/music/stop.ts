import { Message } from 'discord.js';

import { Command, CommandDocs } from '..';
import { CmdArgs } from '../../types';
import { Embed } from '../../util';

export class CommandStop implements Command {
  cmd = 'stop';
  docs: CommandDocs = {
    usage: 'stop',
    description: 'stops playback',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, queueStore } = cmdArgs;
    const queue = queueStore.get(msg.guild?.id as string);

    if (!queue.playing)
      return msg.channel.send(new Embed({ intent: 'error', title: 'not playing' }));

    const voice = msg.member?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceConnection?.channel.id)
      return msg.channel.send(
        new Embed({ intent: 'error', title: 'you are not in the voice channel' })
      );

    try {
      queue.tracks = [];
      queueStore.set(msg.guild?.id as string, queue);
      queue.voiceConnection?.dispatcher?.end('stop command');
      return msg.channel.send(new Embed({ intent: 'success', title: 'stopped' }));
    } catch (err) {
      return msg.channel.send(
        new Embed({
          intent: 'error',
          title: 'error',
          description: `\n\`\`\`\n${err.stack}\n\`\`\``,
        })
      );
    }
  }
}
