import { Message, TextChannel } from 'discord.js';
import { Command, CommandDocs } from '..';
import { Context } from '../../types';
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
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    const n = parseInt(args._[0], 10);

    if (!n || isNaN(n) || n < 2 || n > 1000)
      return msg.channel.send(Embed.error('number must be an integer from 2 to 1000 inclusive'));

    if (!msg.guild?.members.resolve(msg.author?.id as string)?.hasPermission('MANAGE_MESSAGES'))
      return msg.channel.send(Embed.error('you are missing the `MANAGE_MESSAGES` permission'));

    if (
      !msg.guild?.me?.hasPermission('MANAGE_MESSAGES') ||
      !(msg.channel as TextChannel).permissionsFor(msg.guild?.me)
    )
      return msg.channel.send(Embed.error('I am missing the `MANAGE_MESSAGES` permission'));

    msg.channel.startTyping();

    for (let i = 0; i < Math.ceil(n / 100); i++) {
      const deletable = i === Math.floor(n / 100) ? n % 100 : 100;
      const deleted = await (msg.channel as TextChannel).bulkDelete(deletable, true);
      if (deleted.array().length < deletable) {
        msg.channel
          .send(Embed.warning('stopped deleting because messages are older than 14 days'))
          .then(m => setTimeout(() => m.delete(), 5000));
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 4000));
    }

    msg.channel.stopTyping();
  }
}
