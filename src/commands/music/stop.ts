import { Message } from 'discord.js';
import _ from 'lodash';

import { Command, CommandDocs } from '..';
import { CmdArgs, Track } from '../../types';
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
      queue.tracks = [_.head(queue.tracks) as Track];
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
