import { codeBlock, Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { Command, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { LoopMode } from '../../models/Queue';
import { client } from '../../providers';

export class CommandSkip extends Command {
  cmd = ['loop'];
  docs: CommandDocs = [
    {
      usage: 'loop [none|one|all]',
      description: 'cycle loop mode',
    },
  ];
  commandOptions: CommandOptions = {
    description: 'Set the loop mode',
    options: [
      {
        name: 'mode',
        description: 'Loop mode (leave blank to cycle none => all => one)',
        type: 'STRING',
        choices: [
          { name: 'none', value: 'none' },
          { name: 'all', value: 'all' },
          { name: 'one', value: 'one' },
        ],
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const queue = client.queues.get(event.guild.id);

    if (!(await queue.playing)) return event.reply(Embed.error('Not playing').ephemeral());

    const voice = event.guild.members.cache.get(event.user.id)?.voice;
    if (!voice?.channel || voice.channel.id !== queue.voiceChannel?.id)
      return event.reply(Embed.error('you are not in the music channel').ephemeral());

    try {
      const currentLoopMode = queue.loop;
      let nextLoopMode!: LoopMode;

      const requestedLoopMode = event.isInteraction()
        ? event.options.getString('mode')
        : event.args[0];

      if (requestedLoopMode) {
        if (!['none', 'loop', 'all'].includes(requestedLoopMode))
          return event.reply(Embed.error('Invalid loop mode').ephemeral());
        nextLoopMode = requestedLoopMode as LoopMode;
      } else {
        if (currentLoopMode === 'none') nextLoopMode = 'all';
        else if (currentLoopMode === 'all') nextLoopMode = 'one';
        else if (currentLoopMode === 'one') nextLoopMode = 'none';
      }

      queue.loop = nextLoopMode;
      queue.updateNowPlaying();

      return event.reply(Embed.success(`Now looping **${nextLoopMode}**`));
    } catch (err) {
      return event.reply(Embed.error(codeBlock(err)).ephemeral());
    }
  }
}
