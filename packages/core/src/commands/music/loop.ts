import { Context } from '@gamerbot/types';
import { codeBlock, Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import yargsParser from 'yargs-parser';
import { Command, CommandDocs } from '..';
import { LoopMode } from '../../models';
import { client } from '../../providers';

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

    if (!queue.playing) return Embed.error('not playing').reply(msg);

    const voice = msg.member?.voice;

    if (!voice?.channel || voice.channel.id !== queue.voiceChannel?.id)
      return Embed.error('you are not in the music channel').reply(msg);

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
      queue.updateNowPlaying();

      return Embed.success(`Now looping **${nextLoopMode}**`).reply(msg);
    } catch (err) {
      return Embed.error(codeBlock(err)).reply(msg);
    }
  }
}
