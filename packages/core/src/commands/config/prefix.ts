import { Embed, regExps, sanitize } from '@gamerbot/util';
import { Message } from 'discord.js';
import { Config } from '../../entities/Config';
import { CommandEvent } from '../../models/CommandEvent';

export const prefix = async (event: CommandEvent, value?: string): Promise<void | Message> => {
  const config = await event.em.findOneOrFail(Config, { guildId: event.guild.id });

  if (!value) return event.reply(Embed.info(`Prefix is \`${sanitize(config.prefix)}\``));

  if (value?.includes(' '))
    return event.reply(Embed.error('No spaces allowed in prefix').ephemeral());
  if (!regExps.ascii.test(value))
    return event.reply(Embed.error('Only ascii characters allowed in prefix').ephemeral());
  if (value.length > 16) return event.reply(Embed.error('Max 16 characters').ephemeral());

  config.prefix = value;

  return event.reply(Embed.success(`Prefix is now ${sanitize(config.prefix)}`));
};
