import { Embed, listify } from '@gamerbot/util';
import { TextChannel } from 'discord.js';
import _ from 'lodash';
import { getLogger } from 'log4js';
import { ChatCommand, MessageCommand, UserCommand } from '../../commands';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';
import { getLogHandler, intToLogEvents } from '../log';
import { LogEventHandler, LogEventName } from '../log/_constants';

export const verifyPermissions = (event: CommandEvent): boolean => {
  const { command } = event;

  const userPermissions = event.guild?.members.resolve(event.user.id)?.permissionsIn(event.channel);
  const botPermissions = event.guild?.me?.permissionsIn(event.channel);

  if (!botPermissions?.has('SEND_MESSAGES')) {
    getLogger(`verifyPermissions[guild=${event.guild.id}]`).error(
      `cannot respond to "${event.id}" in ${event.channel.id} due to missing permissions`
    );
    return false;
  }

  if (command.userPermissions) {
    const missingPermissions = command.userPermissions.filter(perm => !userPermissions?.has(perm));

    if (missingPermissions.length) {
      event.reply(
        Embed.error(
          `Missing permissions for /${event.commandName}`,
          `/${event.commandName} requires ${listify(
            command.userPermissions.map(v => `\`${v}\``)
          )}, but you are missing ${listify(missingPermissions.map(v => `\`${v}\``))}`
        )
      );
      return false;
    }
  }

  if (command.botPermissions) {
    const missingPermissions = command.botPermissions.filter(perm => !botPermissions?.has(perm));

    if (missingPermissions.length) {
      event.reply(
        Embed.error(
          `gamerbot missing permissions for /${event.commandName}`,
          `/${event.commandName} requires ${listify(
            command.botPermissions.map(v => `\`${v}\``)
          )}, but gamerbot does not have access to ${listify(
            missingPermissions.map(v => `\`${v}\``)
          )}`
        )
      );
      return false;
    }
  }

  return true;
};

export const logCommandEvents = (event: CommandEvent): void => {
  const isCommand =
    event instanceof UserCommand || event instanceof MessageCommand || event instanceof ChatCommand;
  const command = isCommand ? event : event.command;

  const logEvent = `gamerbotCommand${_.capitalize(command.name[0].toLowerCase())}` as LogEventName;
  const handlerName = `on${logEvent[0].toUpperCase()}${logEvent.substr(1)}` as LogEventHandler;

  const logHandler = getLogHandler(handlerName);

  const logger = getLogger(`Client!${logEvent}${isCommand ? '' : `[guild=${event.guild.id}]`}`);

  if (!intToLogEvents(event.guildConfig.logSubscribedEvents).includes(logEvent)) {
    logger.debug('guild has not subscribed to the event, aborting');
    return;
  }

  if (!logHandler) {
    if (handlerName.includes('onGamerbot'))
      logger.debug(`${handlerName} does not exist, ignoring event`);
    else logger.warn(`${handlerName} does not exist, ignoring event`);
    return;
  }

  if (!event.guildConfig.logChannelId) {
    logger.debug(`guild does not have a log channel set, aborting`);
    return;
  }

  const logChannel = client.channels.cache.get(event.guildConfig.logChannelId) as
    | TextChannel
    | undefined;
  if (!logChannel)
    return logger.error(
      `could not get log channel ${event.guildConfig.logChannelId} for ${event.guild.name}, aborting`
    );

  logger.debug(`calling handler`);
  logHandler(event.guild, logChannel)(event);
};
