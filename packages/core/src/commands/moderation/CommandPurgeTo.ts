import { Embed, getDateFromSnowflake } from '@gamerbot/util';
import { Message, PermissionString, Snowflake, TextBasedChannels, TextChannel } from 'discord.js';
import { ChatCommand, CommandDocs, CommandOptions, MessageCommand } from '..';
import { APIMessage, CommandEvent, ContextMenuCommandEvent } from '../../models/CommandEvent';

const purgeTo = async (
  messageId: Snowflake,
  channel: TextBasedChannels
): Promise<[deleted: number, message?: string]> => {
  const messages = await channel.messages.fetch();

  const startMessage = messages.get(messageId);

  if (!startMessage) throw new Error('% Could not resolve starting message in current channel');

  if (getDateFromSnowflake(messageId).diffNow().as('days') > 14)
    throw new Error('% Start of range is older than 14 days');

  const messageArray = [...messages.values()].sort(
    (a, b) => (a.id as unknown as number) - (b.id as unknown as number)
  );
  const startIndex = messageArray.indexOf(startMessage);
  if (startIndex === -1) throw new Error('Start index is -1');

  const numberToDelete = messageArray.length - startIndex;

  for (let i = 0; i < Math.ceil(numberToDelete / 100); i++) {
    const deletable = i === Math.floor(numberToDelete / 100) ? numberToDelete % 100 : 100;
    const deleted = await (channel as TextChannel).bulkDelete(deletable, true);
    if (deleted.size < deletable) {
      return [numberToDelete, 'Stopped deleting because messages are older than 14 days'];
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return [numberToDelete];
};

export class CommandPurgeTo extends ChatCommand {
  name = ['purgeto'];
  logUses = true;
  help: CommandDocs = [
    {
      usage: 'purgeto <id>',
      description: 'delete given message and all after',
    },
  ];
  userPermissions: PermissionString[] = ['MANAGE_MESSAGES'];
  botPermissions: PermissionString[] = ['MANAGE_MESSAGES'];
  data: CommandOptions = {
    description: 'Purge a message and all messages after',
    options: [
      {
        name: 'message-id',
        description: 'Start of range to delete, inclusive',
        type: 'STRING',
        required: true,
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message | APIMessage> {
    const input = event.isInteraction()
      ? event.options.getString('message-id')
      : event.args || event.message.reference?.messageId?.toString();

    if (!input)
      return event.reply(
        Embed.error(
          'No start message to delete from',
          `Either supply the message id (\`/purgeto 123456789012345678\`) or reply to the message while sending the command`
        )
      );

    try {
      await event.deferReply({ ephemeral: true });
      const [deleted, message] = await purgeTo(input, event.channel);

      event.editReply(Embed.success(`Purged ${deleted.toLocaleString()} messages`, message));
    } catch (err) {
      if (err.message.startsWith('% '))
        return event.editReply(Embed.error(err.message.slice(2)).ephemeral());
      else throw err;
    }
  }
}

export class MessageCommandPurgeTo extends MessageCommand {
  name = 'purge to here';
  logUses = true;
  userPermissions: PermissionString[] = ['MANAGE_MESSAGES'];
  botPermissions: PermissionString[] = ['MANAGE_MESSAGES'];
  async execute(event: ContextMenuCommandEvent): Promise<void | APIMessage | Message> {
    if (event.targetType !== 'MESSAGE') return;

    try {
      await event.deferReply({ ephemeral: true });
      const [deleted, message] = await purgeTo(event.targetId, event.channel!);

      event.editReply({
        embeds: [Embed.success(`Purged ${deleted.toLocaleString()} messages`, message)],
      });
    } catch (err) {
      if (err.message.startsWith('% '))
        return event.editReply({ embeds: [Embed.error(err.message.slice(2))] });
      else throw err;
    }
  }
}
