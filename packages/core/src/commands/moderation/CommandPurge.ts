import { Embed } from '@gamerbot/util';
import { Message, PermissionString, TextChannel } from 'discord.js';
import { ChatCommand, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

export class CommandPurge extends ChatCommand {
  name = ['purge'];
  logUses = true;
  help: CommandDocs = [
    {
      usage: 'purge <number>',
      description:
        'delete last `number` messages (might take a while becuase ratelimiting)\n' +
        'minimum 2, maximum 1000 (command is repeatable)\n' +
        'only deletes messages up to 14 days old because of a discord limitation',
    },
  ];
  userPermissions: PermissionString[] = ['MANAGE_MESSAGES'];
  botPermissions: PermissionString[] = ['MANAGE_MESSAGES'];
  data: CommandOptions = {
    description: 'Purge all messages after a given message',
    options: [
      {
        name: 'count',
        description: 'Number of messages to purge',
        type: 'INTEGER',
        required: true,
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const numberToDelete = event.isInteraction()
      ? event.options.getInteger('count')
      : parseInt(event.args, 10);

    if (!numberToDelete || isNaN(numberToDelete) || numberToDelete < 2 || numberToDelete > 1000)
      return event.reply(
        Embed.error('Number must be an integer from 2 to 1000 inclusive').ephemeral()
      );

    if (event.isInteraction()) event.reply(Embed.info('Purging...').ephemeral());

    for (let i = 0; i < Math.ceil(numberToDelete / 100); i++) {
      const deletable = i === Math.floor(numberToDelete / 100) ? numberToDelete % 100 : 100;
      const deleted = await (event.channel as TextChannel).bulkDelete(deletable, true);
      if (deleted.size < deletable) {
        Embed.warning('Stopped deleting because messages are older than 14 days')
          .send(event.channel)
          .then(m => setTimeout(() => m.delete(), 5000));
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (event.isInteraction())
      event.editReply(Embed.info(`Purged ${numberToDelete} messages`).ephemeral());
  }
}
