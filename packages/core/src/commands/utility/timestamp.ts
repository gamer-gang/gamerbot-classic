import { Context } from '@gamerbot/types';
import { Embed, getDateFromSnowflake, getDateStringFromSnowflake } from '@gamerbot/util';
import { Message } from 'discord.js';
import { Command } from '..';

export class CommandTimestamp implements Command {
  cmd = 'timestamp';
  docs = {
    usage: 'timestamp <snowflake>',
    description: 'extract timestamp from snowflake',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    const snowflake = args._[0];
    if (!/^\d{18}$/.test(snowflake)) return Embed.error('Invalid snowflake').reply(msg);

    return Embed.info('Timestamp of ' + snowflake, getDateStringFromSnowflake(snowflake).join('; '))
      .setFooter(getDateFromSnowflake(snowflake).toString())
      .reply(msg);
  }
}
