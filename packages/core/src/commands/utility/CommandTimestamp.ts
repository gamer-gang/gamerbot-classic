import { Embed, getDateFromSnowflake, getDateStringFromSnowflake } from '@gamerbot/util';
import { Message } from 'discord.js';
import { Command, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

export class CommandTimestamp extends Command {
  cmd = ['timestamp'];
  docs = [
    {
      usage: 'timestamp <snowflake>',
      description: 'extract timestamp from snowflake',
    },
  ];
  commandOptions: CommandOptions = {
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
