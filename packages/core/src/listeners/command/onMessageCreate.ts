import { codeBlock, dbFindOneError, Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { getLogger } from 'log4js';
import { ongoingTriviaQuestions } from '../../commands/games/CommandTrivia';
import { Config } from '../../entities/Config';
import { BaseCommandEvent, DetailedMessage } from '../../models/CommandEvent';
import { Queue } from '../../models/Queue';
import { client, directORM, getORM } from '../../providers';
import * as eggs from '../eggs';
import { logCommandEvents, verifyPermissions } from './utils';

export const onMessageCreate = async (msg: DetailedMessage): Promise<void | Message> => {
  const start = process.hrtime();

  if (msg.author.bot && !msg.author.tag.endsWith('#0000')) return;
  if (msg.author.id == client.user.id) return;
  if (!msg.guild) return; // don't respond to DMs

  const logger = getLogger(`Client!messageCreate[guild=${msg.guild.id}]`);

  client.queues.setIfUnset(msg.guild.id, new Queue(msg.guild.id));

  const orm = await getORM();

  const config = await (async (msg: DetailedMessage) => {
    const existing = await orm.em.findOne(Config, { guildId: msg.guild.id });
    if (existing) return existing;

    const fresh = orm.em.create(Config, { guildId: msg.guild.id });
    await orm.em.persistAndFlush(fresh);
    return await orm.em.findOneOrFail(
      Config,
      { guildId: msg.guild.id },
      { failHandler: dbFindOneError(msg.channel) }
    );
  })(msg);

  if (!msg.author.bot || msg.author.tag.endsWith('#0000')) eggs.onMessage(msg, config);

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

  const event = BaseCommandEvent.from(
    { msg, args: argv.join(' '), cmd },
    { config, startTime: start, em: directORM().em.fork() }
  );

  if (event.isMessage() && !event.valid) return;

  if (event.command.internal) {
    const admins = (process.env.BOT_ADMINISTRATORS ?? '').replace(/\s/g, '').split(',');
    if (!admins.includes(msg.author.id))
      return logger.info(
        `internal command issued by non-admin ${msg.author.toString()} (${msg.author.id}) - ${
          msg.content
        } - ignoring`
      );

    logger.info(
      `internal command issued by ${msg.author.toString()} - ${
        msg.content
      } - continuing with execution`
    );
  }

  logCommandEvents(event);

  if (!verifyPermissions(event)) return;

  try {
    await event.command.execute(event);
  } catch (err) {
    logger.error(err);
    Embed.error(codeBlock(err)).reply(msg);
  }
};
