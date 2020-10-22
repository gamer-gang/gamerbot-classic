import { Message } from 'discord.js';

import { Command, CommandDocs } from '..';
import { CmdArgs } from '../../types';
import { Embed, updatePlayingEmbed } from '../../util';

export class CommandResume implements Command {
  cmd = 'resume';
  docs: CommandDocs = {
    usage: 'resume',
    description: 'resumes playback',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, queueStore } = cmdArgs;
    const queue = queueStore.get(msg.guild?.id as string);

    if (!queue.playing)
      return msg.channel.send(new Embed({ intent: 'error', title: 'not playing' }));

    const voice = msg.member?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceConnection?.channel.id)
      return msg.channel.send(
        new Embed({ intent: 'error', title: 'you are not in voice channel' })
      );

    try {
      queue.voiceConnection?.dispatcher.resume();
      updatePlayingEmbed({ playing: true });
      return msg.channel.send(new Embed({ intent: 'success', title: 'resumed' }));
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
