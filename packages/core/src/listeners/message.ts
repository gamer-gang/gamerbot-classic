import { Context } from '@gamerbot/types';
import { codeBlock, dbFindOneError, Embed, listify } from '@gamerbot/util';
import { Message, TextChannel } from 'discord.js';
import _ from 'lodash';
import yargsParser from 'yargs-parser';
import { Command } from '../commands';
import { ongoingTriviaQuestions } from '../commands/games/trivia';
import { CommandHelp } from '../commands/general/help';
import { Config } from '../entities/Config';
import { Queue } from '../models';
import { client, getLogger, orm } from '../providers';
import * as eggs from './eggs';
import { getLogHandler, intToLogEvents } from './log';
import { LogEventHandler, LogEventName } from './log/_constants';

const verifyPermissions = (context: Context, command: Command): boolean => {
  const { msg, config, cmd } = context;

  const userPermissions = msg.guild?.members.resolve(msg.author.id)?.permissionsIn(msg.channel);
  const botPermissions = msg.guild?.me?.permissionsIn(msg.channel);

  if (!botPermissions?.has('SEND_MESSAGES')) {
    getLogger(`verifyPermissions[guild=${context.msg.guild.id}]`).error(
      `cannot respond to "${msg.cleanContent}" in ${msg.channel.id} due to missing permissions`
    );
    return false;
  }

  if (command.userPermissions) {
    const missingPermissions = command.userPermissions.filter(perm => !userPermissions?.has(perm));

    if (missingPermissions.length) {
      Embed.error(
        `Missing permissions for ${config.prefix}${cmd}`,
        `${config.prefix}${cmd} requires ${listify(
          command.userPermissions.map(v => `\`${v}\``)
        )}, but you are missing ${listify(missingPermissions.map(v => `\`${v}\``))}`
      ).reply(msg);
      return false;
    }
  }

  if (command.botPermissions) {
    const missingPermissions = command.botPermissions.filter(perm => !botPermissions?.has(perm));

    if (missingPermissions.length) {
      Embed.error(
        `gamerbot missing permissions for ${config.prefix}${cmd}`,
        `${config.prefix}${cmd} requires ${listify(
          command.botPermissions.map(v => `\`${v}\``)
        )}, but gamerbot does not have access to ${listify(
          missingPermissions.map(v => `\`${v}\``)
        )}`
      ).reply(msg);
      return false;
    }
  }

  return true;
};

const logCommandEvents = (context: Context, command: Command) => {
  const { msg, config } = context;

  const event = `gamerbotCommand${_.capitalize(
    Array.isArray(command.cmd) ? command.cmd[0].toLowerCase() : command.cmd
  )}` as LogEventName;
  const handlerName = `on${event[0].toUpperCase()}${event.substr(1)}` as LogEventHandler;

  const logHandler = getLogHandler(handlerName);

  const logger = getLogger(`Client!${event}[guild=${msg.guild.id}]`);

  if (!intToLogEvents(config.logSubscribedEvents).includes(event)) {
    logger.debug('guild has not subscribed to the event, aborting');
    return;
  }

  if (!logHandler) {
    if (handlerName.includes('onGamerbot'))
      logger.debug(`${handlerName} does not exist, ignoring event`);
    else logger.warn(`${handlerName} does not exist, ignoring event`);
    return;
  }

  if (!config.logChannelId) {
    logger.debug(`guild does not have a log channel set, aborting`);
    return;
  }

  const logChannel = client.channels.cache.get(config.logChannelId) as TextChannel | undefined;
  if (!logChannel)
    return logger.error(
      `could not get log channel ${config.logChannelId} for ${msg.guild.name}, aborting`
    );

  logger.debug(`calling handler`);
  logHandler(msg.guild, logChannel)(context);
};

export const onMessageCreate = async (msg: Context['msg']): Promise<void | Message> => {
  const start = process.hrtime();

  const logger = getLogger(`Client!messageCreate[guild=${msg.guild.id}]`);

  if (msg.author.bot && !msg.author?.tag.endsWith('#0000')) return;
  if (msg.author.id == client.user?.id) return;
  if (!msg.guild) return; // don't respond to DMs

  client.queues.setIfUnset(msg.guild.id, new Queue(msg.guild.id));

  const config = await (async (msg: Context['msg']) => {
    const existing = await orm.em.findOne(Config, { guildId: msg.guild?.id });
    if (existing) return existing;

    const fresh = orm.em.create(Config, { guildId: msg.guild?.id });
    await orm.em.persistAndFlush(fresh);
    return await orm.em.findOneOrFail(
      Config,
      { guildId: msg.guild?.id },
      { failHandler: dbFindOneError(msg.channel) }
    );
  })(msg);

  if (!msg.author.bot || msg.author?.tag.endsWith('#0000')) eggs.onMessage(msg, config);

  if (new RegExp(`^<@!?${client.user.id}>$`).test(msg.content)) {
    Embed.info(
      `Prefix is set to \`${config.prefix}\`\n` +
        `See \`${config.prefix}help\` or https://gamerbot-dev.web.app for more information`
    )
      .setDefaultAuthor()
      .reply(msg);

    return;
  }

  if (!msg.content.startsWith(config.prefix)) return;

  // do not respond if playing trivia
  if (ongoingTriviaQuestions.has(msg.author.id)) return;

  const [cmd, ...argv] = msg.content.slice(config.prefix.length).replace(/ +/g, ' ').split(' ');

  let command = client.commands.find(v => {
    if (Array.isArray(v.cmd)) return v.cmd.some(c => c.toLowerCase() === cmd.toLowerCase());
    else return v.cmd.toLowerCase() === cmd.toLowerCase();
  });
  if (!command) return;

  const yargsConfig = _.merge(command.yargs ?? {}, {
    alias: _.merge(command.yargs?.alias, { help: 'h' }),
    boolean: ['help', ...(command.yargs?.boolean ?? [])],
    default: _.merge(command.yargs?.default, { help: false }),
    configuration: { 'flatten-duplicate-arrays': false },
  } as yargsParser.Options);

  const args = yargsParser.detailed(argv, yargsConfig);

  const context: Context = {
    msg: msg as Context['msg'],
    cmd,
    args: args.argv,
    config,
    startTime: start,
  };

  if (args.error) Embed.warning(codeBlock(args.error)).reply(msg);
  if (context.args.help) {
    logger.debug('help flag set, modifying args and cmd');
    context.args._ = [cmd];
    command = new CommandHelp();
  }

  logCommandEvents(context, command);

  if (!verifyPermissions(context, command)) return;

  try {
    await command?.execute(context);
    msg.channel.stopTyping(true);
    orm.em.flush();
  } catch (err) {
    msg.channel.stopTyping(true);
    logger.error(err);
    Embed.error(codeBlock(err)).reply(msg);
  }
};
