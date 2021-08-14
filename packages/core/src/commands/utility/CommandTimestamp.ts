import { Embed, getDateFromSnowflake, getDateStringFromSnowflake } from '@gamerbot/util';
import { Message } from 'discord.js';
import { ChatCommand, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

export class CommandTimestamp extends ChatCommand {
  name = ['timestamp'];
  help = [
    {
      usage: 'timestamp <snowflake>',
      description: 'extract timestamp from snowflake',
    },
  ];
  data: CommandOptions = {
    description: 'Get the timestamp of a snowflake',
    options: [
      {
        name: 'snowflake',
        description: 'Snowflake to check',
        type: 'STRING',
        required: true,
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const snowflake = event.isInteraction()
      ? event.options.getString('snowflake', true)
      : event.args ?? '';

    if (!/^\d{18}$/.test(snowflake))
      return event.reply(Embed.error('Invalid snowflake').ephemeral());

    return event.reply(
      Embed.info(
        'Timestamp of ' + snowflake,
        getDateStringFromSnowflake(snowflake).join('; ')
      ).setFooter(getDateFromSnowflake(snowflake).toString())
    );
  }
}
