import { Message, TextChannel } from 'discord.js';

import { Command, CommandDocs } from '..';
import { CmdArgs } from '../../types';
import { Embed } from '../../util';

export class CommandPurge implements Command {
  cmd = 'purge';
  docs: CommandDocs = {
    usage: 'purge <number>',
    description:
      'delete last `number` messages (might take a while becuase ratelimiting)\n' +
      'minimum 2, maximum 1000 (command is repeatable)\n' +
      'only deletes messages up to 14 days old because of a discord limitation',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args } = cmdArgs;

    const n = parseInt(args._[0], 10);

    if (!n || isNaN(n) || n < 2 || n > 1000)
      return msg.channel.send(
        new Embed({ intent: 'error', title: 'number must be an integer from 2 to 1000 inclusive' })
      );

    if (!msg.guild?.members.resolve(msg.author?.id as string)?.hasPermission('MANAGE_MESSAGES'))
      return msg.channel.send(
        new Embed({ intent: 'error', title: 'you are missing `MANAGE_MESSAGES` permission' })
      );

    if (!msg.guild?.me?.hasPermission('MANAGE_MESSAGES'))
      return msg.channel.send(
        new Embed({ intent: 'error', title: 'bot is missing `MANAGE_MESSAGES` permission' })
      );

    for (let i = 0; i < Math.ceil(n / 100); i++) {
      const deletable = i === Math.floor(n / 100) ? n % 100 : 100;
      const deleted = await (msg.channel as TextChannel).bulkDelete(deletable, true);
      if (deleted.array().length < deletable) {
        msg.channel
          .send(
            new Embed({ intent: 'warning', title: 'stopped deleting because messages are too old' })
          )
          .then(m => setTimeout(() => m.delete(), 5000));
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 4000));
    }
  }
}
