import { Embed, getDateFromSnowflake } from '@gamerbot/util';
import { Message, PermissionString, Snowflake, TextChannel } from 'discord.js';
import { ChatCommand, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

export class CommandPurgeTo extends ChatCommand {
  name = ['purgeto'];
  help = [{ usage: 'purgeto <id>', description: 'delete given message and all after' }];
  userPermissions: PermissionString[] = ['MANAGE_MESSAGES'];
  botPermissions: PermissionString[] = ['MANAGE_MESSAGES'];
  data: CommandOptions = {
    description: 'Purge all messages after a given message',
    options: [
      {
        name: 'message-id',
        description: 'Message to delete after (this message is also deleted)',
        type: 'STRING',
        required: true,
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const messages = await event.channel.messages.fetch();

    const input = event.isInteraction()
      ? event.options.getString('message-id')
      : event.args || event.message.reference?.messageId?.toString();

    if (!input)
      return event.reply(
        Embed.error(
          'No start message to delete from',
          `Either supply the message id (\`${event.guildConfig.prefix}purgeto 123456789012345678\`) or reply to the message while sending the command`
        )
      );

    const startMessage = messages.get(input as Snowflake);

    if (!startMessage)
      return event.reply(
        Embed.error('Could not resolve starting message in current channel').ephemeral()
      );

    if (getDateFromSnowflake(input).diffNow().as('days') > 14)
      return event.reply(Embed.error('Start of range is older than 14 days').ephemeral());

    const messageArray = [...messages.values()].sort(
      (a, b) => (a.id as unknown as number) - (b.id as unknown as number)
    );
    const startIndex = messageArray.indexOf(startMessage);
    if (startIndex === -1) throw new Error('Start index is -1');

    const numberToDelete = messageArray.length - startIndex;

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
