import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { ChatCommand, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandTechSupport extends ChatCommand {
  name = ['techsupport', 'support'];
  help = [
    {
      usage: 'techsupport',
      description: 'request tech help (--delete or -d to delete)',
    },
  ];
  data: CommandOptions = {
    description: 'Request technical support',
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const emoji = client.getCustomEmoji('worksonmymachine');
    if (!emoji) return event.reply(Embed.error('Emoji not found').ephemeral());

    await event.defer();
    setTimeout(() => event.editReply(emoji.toString()), 5000);
  }
}
