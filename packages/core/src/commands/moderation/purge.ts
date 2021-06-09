import { Message, PermissionString, TextChannel } from 'discord.js';
import yargsParser from 'yargs-parser';
import { Command, CommandDocs } from '..';
import { Context } from '../../types';
import { Embed, getDateFromSnowflake } from '../../util';

export class CommandPurge implements Command {
  cmd = 'purge';
  docs: CommandDocs = [
    {
      usage: 'purge <number>',
      description:
        'delete last `number` messages (might take a while becuase ratelimiting)\n' +
        'minimum 2, maximum 1000 (command is repeatable)\n' +
        'only deletes messages up to 14 days old because of a discord limitation',
    },
    {
      usage: 'purge -t, --to <id>',
      description: 'purge the given message and everything after it',
    },
  ];
  yargs: yargsParser.Options = {
    alias: { to: 't' },
    string: ['to'],
  };
  userPermissions: PermissionString[] = ['MANAGE_MESSAGES'];
  botPermissions: PermissionString[] = ['MANAGE_MESSAGES'];
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    let numberToDelete = parseInt(args._[0], 10);

    // TODO add support for replying to start message when v13 drops
    if (args.to) {
      const messages = await msg.channel.messages.fetch();
      const startMessage = messages.get(args.to.toString());
      if (!startMessage)
        return msg.channel.send(
          Embed.error('Could not resolve starting message in current channel')
        );

      if (getDateFromSnowflake(args.to.toString()).diffNow().as('days') > 14)
        return msg.channel.send(Embed.error('Start of range is older than 14 days'));

      const messageArray = messages
        .array()
        .sort((a, b) => (a.id as unknown as number) - (b.id as unknown as number));
      const startIndex = messageArray.indexOf(startMessage);
      if (startIndex === -1) throw new Error('Start index is -1');

      numberToDelete = messageArray.length - startIndex;
    }

    if (!numberToDelete || isNaN(numberToDelete) || numberToDelete < 2 || numberToDelete > 1000)
      return msg.channel.send(Embed.error('Number must be an integer from 2 to 1000 inclusive'));

    for (let i = 0; i < Math.ceil(numberToDelete / 100); i++) {
      const deletable = i === Math.floor(numberToDelete / 100) ? numberToDelete % 100 : 100;
      const deleted = await (msg.channel as TextChannel).bulkDelete(deletable, true);
      if (deleted.size < deletable) {
        msg.channel
          .send(Embed.warning('Stopped deleting because messages are older than 14 days'))
          .then(m => setTimeout(() => m.delete(), 5000));
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
  }
}
