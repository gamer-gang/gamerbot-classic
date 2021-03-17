import { registerFont } from 'canvas';
import { ClientEvents, GuildMember, TextChannel } from 'discord.js';
import dotenv from 'dotenv';
import fse from 'fs-extra';
import 'source-map-support/register';
import { Config } from './entities/Config';
import * as eggs from './listeners/eggs';
import { intToLogEvents, LogEventHandler, logEvents, logHandlers } from './listeners/log';
import { onMessage } from './listeners/message';
import * as reactions from './listeners/reactions';
import * as voice from './listeners/voice';
import * as welcome from './listeners/welcome';
import { client, getLogger, logger, orm, storage, usernameCache } from './providers';
import { findGuild, resolvePath } from './util';

dotenv.config({ path: resolvePath('.env') });

fse.mkdirp(resolvePath('data'));
fse.mkdirp(resolvePath('data/gifs'));

// register fonts for canvas
const fonts: Record<string, { family: string; weight?: string; style?: string }> = {
  'RobotoMono-Regular-NF.ttf': { family: 'Roboto Mono' },
};

Object.keys(fonts).forEach(filename =>
  registerFont(resolvePath('assets/fonts/' + filename), fonts[filename])
);

export const setPresence = async (): Promise<void> => {
  const num = await eggs.get(client);
  client.presenceManager.presence = {
    activity: {
      type: 'PLAYING',
      name: `with ${num.toLocaleString()} egg${num === 1 ? '' : 's'} | $help`,
    },
  };
};

// keep member caches up-to-date
const fetchMemberCache = async (): Promise<void> => {
  const guilds = client.guilds.cache.array();

  const members = await Promise.all(
    guilds.map(
      (guild, index) =>
        new Promise<GuildMember[]>(resolve => {
          setTimeout(() => guild.members.fetch().then(c => resolve(c.array())), index * 2500);
        })
    )
  );

  members.flat(1).forEach(m => {
    if (usernameCache.has(m.id)) return;

    usernameCache.set(m.id, {
      username: m.user.username,
      discriminator: m.user.discriminator,
    });

    getLogger(`GUILD ${m.guild.id}`).debug('cached user ' + m.id);
  });

  setTimeout(fetchMemberCache, 1000 * 60 * 5);
};

client.on('ready', () => {
  logger.info(`${client.user.tag} ready`);
  setPresence();
  setInterval(setPresence, 1000 * 60 * 10);
  fetchMemberCache();
});

// attach log handlers
(logEvents.filter(e => !e.includes('gamerbotCommand')) as (keyof ClientEvents)[]).forEach(event => {
  const handlerName = `on${event[0].toUpperCase()}${event.slice(1)}` as LogEventHandler;
  if (logHandlers[handlerName]) {
    client.on(event, async (...args) => {
      storage.run(orm.em.fork(true, true), async () => {
        const guild = findGuild(args[0]);
        if (!guild)
          return getLogger(`GUILD unknown EVENT ${event}`).error(
            `could not find guild for resource ${args[0].toString()}`
          );

        const logHandler = logHandlers[handlerName];

        const logger = getLogger(`GUILD ${guild.id} EVENT ${event}`);

        if (!logHandler) {
          logger.warn(`no handler for ${event}, ignoring event`);
          return;
        }

        const config = await orm.em.findOne(Config, { guildId: guild.id });
        if (!config) return logger.error(`could not get config for ${guild.id}`);

        logger.debug(`handler for ${event} exists`);
        if (!intToLogEvents(config.logSubscribedEvents).includes('guildMemberUpdate')) {
          logger.debug('guild has not subscribed to the event, aborting');
          return;
        }

        if (!config.logChannelId) {
          logger.debug(`guild does not have a log channel set, aborting`);
          return;
        }

        const logChannel = client.channels.cache.get(config.logChannelId) as
          | TextChannel
          | undefined;
        if (!logChannel)
          return logger.error(
            `could not get log channel ${config.logChannelId} for ${guild.name}, aborting`
          );

        logger.debug(`recv guild ${guild.id ?? 'unknown'} event ${event}`);

        try {
          await logHandler(guild, logChannel)(...args);
          orm.em.flush();
        } catch (err) {
          getLogger(`GUILD ${guild?.id ?? 'unknown'} EVENT ${event}`).error(err);
        }
      });
    });
  }
});

client.on('debug', content => {
  if (content.includes('Remaining: '))
    logger.info(`remaining gateway sessions: ${content.split(' ').reverse()[0]}`);
});

client
  .on('message', (...args) => storage.run(orm.em.fork(true, true), () => onMessage(...args)))
  .on('warn', logger.warn)
  .on('error', logger.error)
  .on('disconnect', () => logger.warn('client disconnected!'))
  .on('guildCreate', async guild => {
    storage.run(orm.em.fork(true, true), async () => {
      getLogger(`GUILD ${guild.id}`).info(
        `joined guild: ${guild.name} (${guild.memberCount} members)`
      );
      const fresh = orm.em.create(Config, { guildId: guild.id });
      await orm.em.persistAndFlush(fresh);
    });
  })
  .on('guildDelete', async guild => {
    const em = orm.em.fork();
    getLogger(`GUILD ${guild.id}`).info(`left guild: ${guild.name} (${guild.memberCount} members)`);
    const config = await em.findOne(Config, { guildId: guild.id });
    config && (await em.removeAndFlush(config));
  })
  .on('guildMemberAdd', (...args) =>
    storage.run(orm.em.fork(true, true), () => welcome.onGuildMemberAdd(...args))
  )
  .on('voiceStateUpdate', (...args) =>
    storage.run(orm.em.fork(true, true), () => voice.onVoiceStateUpdate(...args))
  )
  .on('messageReactionAdd', (...args) =>
    storage.run(orm.em.fork(true, true), () => reactions.onMessageReactionAdd(...args))
  )
  .on('messageReactionRemove', (...args) =>
    storage.run(orm.em.fork(true, true), () => reactions.onMessageReactionRemove(...args))
  )
  .login(process.env.DISCORD_TOKEN);
