import { GuildEmoji, TextChannel } from 'discord.js';
import { intToLogEvents, LogHandlers } from '.';
import { client, logger } from '../../providers';
import { Embed } from '../../util';
import { formatValue, getConfig, getLatestAuditEvent, logColorFor } from './utils';

const auditChangeTable: Record<string, string> = {
  name: 'Name',
};

export const emojiHandlers: LogHandlers = {
  onEmojiCreate: async (emoji: GuildEmoji) => {
    const guild = emoji.guild;
    const config = await getConfig(emoji);
    if (!config.logChannelId) return;
    const logChannel = client.channels.cache.get(config.logChannelId) as TextChannel | undefined;
    if (!logChannel)
      return logger.error(
        'could not get log channel ' + config.logChannelId + ' for ' + guild.name
      );
    if (!intToLogEvents(config.logSubscribedEvents).includes('emojiCreate')) return;

    const auditEvent = await getLatestAuditEvent(guild);

    const embed = new Embed({
      author: {
        iconURL: guild.iconURL({ format: 'png' }) ?? undefined,
        name: guild.name,
      },
      color: logColorFor('emojiCreate'),
      title: 'Emoji added',
    })
      .addField('Name', emoji.name)
      .addField('Animated', emoji.animated)
      .setThumbnail(emoji.url)
      .setTimestamp();

    embed.addField('Added by', auditEvent.executor);

    logChannel.send(embed);
  },
  onEmojiDelete: async (emoji: GuildEmoji) => {
    const guild = emoji.guild;
    const config = await getConfig(emoji);

    if (!config.logChannelId) return;
    const logChannel = client.channels.cache.get(config.logChannelId) as TextChannel | undefined;
    if (!logChannel)
      return logger.error(
        'could not get log channel ' + config.logChannelId + ' for ' + guild.name
      );
    if (!intToLogEvents(config.logSubscribedEvents).includes('emojiDelete')) return;

    const auditEvent = await getLatestAuditEvent(guild);

    const embed = new Embed({
      author: {
        iconURL: guild.iconURL({ format: 'png' }) ?? undefined,
        name: guild.name,
      },
      color: logColorFor('emojiDelete'),
      title: 'Emoji removed',
    })
      .addField('Name', emoji.name)
      .addField('ID', emoji.id)
      .addField('Animated', emoji.animated)
      .setThumbnail(emoji.url)
      .setTimestamp();

    embed.addField('Removed by', auditEvent.executor);

    logChannel.send(embed);
  },
  onEmojiUpdate: async (prev: GuildEmoji, next: GuildEmoji) => {
    const guild = next.guild;
    const config = await getConfig(next);
    if (!config.logChannelId) return;
    const logChannel = client.channels.cache.get(config.logChannelId) as TextChannel | undefined;
    if (!logChannel)
      return logger.error(
        'could not get log channel ' + config.logChannelId + ' for ' + guild.name
      );
    if (!intToLogEvents(config.logSubscribedEvents).includes('emojiUpdate')) return;

    const auditEvent = await getLatestAuditEvent(guild);

    const embed = new Embed({
      author: {
        iconURL: guild.iconURL({ format: 'png' }) ?? undefined,
        name: guild.name,
      },
      color: logColorFor('emojiUpdate'),
      title: 'Emoji updated',
      description: `Updated emoji: ${next}`,
    })
      .setThumbnail(next.url)
      .setTimestamp();

    auditEvent.changes?.forEach(change => {
      embed.addField(
        auditChangeTable[change.key] ?? change.key,
        `\`${formatValue(change.old)} => ${formatValue(change.new)}\``
      );
    });

    embed.addField('Updated by', auditEvent.executor);

    logChannel.send(embed);
  },
};
