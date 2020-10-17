import { Message } from 'discord.js';

import { Command, CommandDocs } from '..';
import { CmdArgs } from '../../types';
import { updatePlayingEmbed } from '../../util/music';

export class CommandPause implements Command {
  cmd = 'pause';
  docs: CommandDocs = {
    usage: 'pause',
    description: 'pauses playback',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, queueStore } = cmdArgs;
    const queue = queueStore.get(msg.guild?.id as string);

    if (!queue.playing) return msg.channel.send('not playing');

    const voice = msg.member?.voice;
    if (!voice?.channel) return msg.channel.send('you are not in voice channel');
    if (voice.channel.id !== queue.voiceConnection?.channel.id)
      return msg.channel.send('wrong voice channel');

    try {
      queue.voiceConnection?.dispatcher?.pause(true);
      updatePlayingEmbed({ playing: false });
    } catch (err) {
      return msg.channel.send(`error:\n\`\`\`\n${err.stack}\n\`\`\``);
    }

    return msg.channel.send('paused\nNOTE: very broken rn');
  }
}
