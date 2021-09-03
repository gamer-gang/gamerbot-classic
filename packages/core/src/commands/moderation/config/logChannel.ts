import { Embed } from '@gamerbot/util';
import { GuildChannel, Message, Snowflake } from 'discord.js';
import { Config } from '../../../entities/Config';
import { CommandEvent } from '../../../models/CommandEvent';

export const logChannel = async (
  event: CommandEvent,
  newValue?: string | GuildChannel
): Promise<void | Message> => {
  const config = await event.em.findOneOrFail(Config, { guildId: event.guild.id });

  if (!newValue) {
    if (config.logChannelId)
      return event.reply(
        Embed.info(
          `Log channel is set to <#${config.logChannelId}>`,
          `Use \`${config.prefix}config logChannel unset\` to remove`
        )
      );
    return event.reply(Embed.info('No log channel set'));
  }

  if (newValue === 'unset') {
    delete config.logChannelId;
    return event.reply(Embed.warning('Unset log channel', 'Logs will no longer be sent'));
  }

  const channelId = newValue.toString().replace(/[<#>]/g, '') as Snowflake;
  const channel = event.guild?.channels.cache.get(channelId);
  if (!channel) return event.reply(Embed.error('Invalid channel `' + newValue + '`').ephemeral());
  if (channel.type !== 'GUILD_TEXT')
    return event.reply(Embed.error('Only text channels allowed').ephemeral());

  config.logChannelId = channel.id;

  if (BigInt(config.logSubscribedEvents) + 1n - 1n !== 0n)
    return event.reply(Embed.success(`Log channel set to ${channel}`).ephemeral());
  else
    return event.reply(
      Embed.success(
        `Log channel set to **${channel}**`,
        `Don't forget to subscribe to some events (\`${config.prefix}config logEvents <int/event list>\`)!`
      )
    );
};
