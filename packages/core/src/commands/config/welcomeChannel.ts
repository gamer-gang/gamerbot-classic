import { Embed } from '@gamerbot/util';
import { GuildChannel, Message, Snowflake } from 'discord.js';
import { Config } from '../../entities/Config';
import { CommandEvent } from '../../models/CommandEvent';

export const welcomeChannel = async (
  event: CommandEvent,
  newValue?: string | GuildChannel
): Promise<void | Message> => {
  const config = await event.em.findOneOrFail(Config, { guildId: event.guild.id });

  if (!newValue) {
    if (config.welcomeChannelId)
      return event.reply(
        Embed.info(
          `Welcome channel is set to <#${config.welcomeChannelId}>`,
          `Use \`/config welcome-channel unset\` to remove`
        )
      );

    return event.reply(Embed.info('No welcome channel set'));
  }

  if (newValue === 'unset') {
    delete config.welcomeChannelId;
    return event.reply(
      Embed.success(
        'Unset welcome channel',
        'Welcome messages will go to the system message channel'
      )
    );
  }

  const channelId = newValue.toString().replace(/[<#>]/g, '') as Snowflake;
  const channel = event.guild.channels.cache.get(channelId);
  if (!channel) return event.reply(Embed.error('Invalid channel `' + newValue + '`').ephemeral());
  if (channel.type !== 'GUILD_TEXT')
    return event.reply(Embed.error('Only text channels allowed').ephemeral());

  config.welcomeChannelId = channel.id;
  return event.reply(Embed.success(`Welcome channel set to ${channel}`));
};
