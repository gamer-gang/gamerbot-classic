import { Message } from 'discord.js';

import { Command, CommandDocs } from '..';
import { Embed } from '../../embed';
import { CmdArgs } from '../../types';
import { updatePlayingEmbed } from '../../util/music';

export class CommandPlaying implements Command {
  cmd = ['playing', 'np'];
  docs: CommandDocs = [
    {
      usage: 'playing',
      description: 'show now playing embed',
    },
  ];
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, queueStore } = cmdArgs;

    const queue = queueStore.get(msg.guild?.id as string);

    await updatePlayingEmbed({ playing: false });

    queue.current.embed = await msg.channel.send(new Embed({ title: 'loading...' }));

    updatePlayingEmbed({ playing: true });
  }
}
