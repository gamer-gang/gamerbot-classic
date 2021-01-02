import { Message } from 'discord.js';
import yargsParser from 'yargs-parser';

import { Command, CommandDocs } from '..';
import { client } from '../../providers';
import { Context, LoopMode } from '../../types';
import { codeBlock, Embed, updatePlayingEmbed } from '../../util';

export class CommandSkip implements Command {
  cmd = 'loop';
  yargs: yargsParser.Options = {
    alias: { none: 'n', one: 'o', all: 'a' },
    boolean: ['none', 'one', 'all'],
  };
  docs: CommandDocs = [
    {
      usage: 'loop',
      description: 'cycle loop mode',
    },
    {
      usage: 'loop -n, --none',
      description: 'disable looping',
    },
    {
      usage: 'loop -o, --one',
      description: 'loop current track',
    },
    {
      usage: 'loop -a, --all',
      description: 'loop all tracks in queue',
    },
  ];
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;
    const queue = client.queues.get(msg.guild.id);

    if (!queue.playing) return msg.channel.send(Embed.error('not playing'));

    const voice = msg.member?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceConnection?.channel.id)
      return msg.channel.send(Embed.error('you are not in the music channel'));

    try {
      const currentLoopMode = queue.loop;
      let nextLoopMode!: LoopMode;

      switch (true) {
        case args.none:
          nextLoopMode = 'none';
          break;
        case args.one:
          nextLoopMode = 'one';
          break;
        case args.all:
          nextLoopMode = 'all';
          break;
        default: {
          if (currentLoopMode === 'none') nextLoopMode = 'one';
          else if (currentLoopMode === 'one') nextLoopMode = 'all';
          else if (currentLoopMode === 'all') nextLoopMode = 'none';
        }
      }

      queue.loop = nextLoopMode;

      updatePlayingEmbed({ guildId: msg.guild.id });

      return msg.channel.send(Embed.success(`Now looping **${nextLoopMode}**`));
    } catch (err) {
      return msg.channel.send(Embed.error(codeBlock(err)));
    }
  }
}
