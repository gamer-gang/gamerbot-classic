import { registerFont } from 'canvas';
import { ClientEvents, Guild, GuildMember, Invite, TextChannel } from 'discord.js';
import dotenv from 'dotenv';
import fse from 'fs-extra';
import _ from 'lodash';
import 'source-map-support/register';
import { Config } from './entities/Config';
import * as eggs from './listeners/eggs';
import { intToLogEvents, logClientEvents, LogEventHandler, logHandlers } from './listeners/log';
import { onMessage } from './listeners/message';
import * as reactions from './listeners/reactions';
import * as voice from './listeners/voice';
import * as welcome from './listeners/welcome';
import {
  CachedInvite,
  client,
  getLogger,
  inviteCache,
  logger,
  orm,
  storage,
  usernameCache,
} from './providers';
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

  const members = (
    await Promise.all(
      guilds.map(
        (guild, index) =>
          new Promise<GuildMember[]>(resolve => {
            setTimeout(() => guild.members.fetch().then(c => resolve(c.array())), index * 2500);
          })
      )
    )
  ).flat(1);

  members.forEach(m =>
    usernameCache.set(m.id, {
      username: m.user.username,
      discriminator: m.user.discriminator,
    })
  );

  logger.debug(`successfully cached ${members.length} users`);
};

client.on('ready', () => {
  logger.info(`${client.user.tag} ready`);
  setPresence();
  setInterval(setPresence, 1000 * 60 * 10);
  fetchMemberCache();
  setInterval(fetchMemberCache, 1000 * 60 * 5);
});

// attach log handlers
// TODO improve types
const eventHooks: {
  [key: string]: { pre?: (guild: Guild) => (...args: any[]) => Promise<any> };
} = {
  inviteCreate: {
    pre: (guild: Guild) => async (invite: Invite) => {
      inviteCache.set(invite.code, {
        code: invite.code,
        creatorId: invite.inviter?.id,
        creatorTag: invite.inviter?.tag,
        guildId: guild.id,
        uses: invite.uses ?? 0,
      });
    },
  },
  inviteDelete: {
    pre: (guild: Guild) => async (invite: Invite) => {
      const cached = _.clone(inviteCache.get(invite.code));
      inviteCache.delete(invite.code);
      return cached;
    },
  },
  guildMemberAdd: {
    pre: (guild: Guild) => async () => {
      // figure out which invite was just used
      const newInvites = (await guild.fetchInvites()).array();

      let usedCached: CachedInvite | undefined;
      let usedNew: Invite | undefined;

      for (const invite of newInvites) {
        const cached = inviteCache.get(invite.code);
        if (!cached) {
          getLogger(`GUILD ${guild.id}`).warn(`invite ${invite.code} has no cached counterpart`);
          continue;
        }
        if ((invite.uses ?? 0) > cached.uses) {
          cached.uses++;
          usedCached = cached;
          usedNew = invite;
          break;
        }
      }

      return { usedCached, usedNew };
    },
  },
};

(logClientEvents as readonly (keyof ClientEvents)[]).forEach(event => {
  const handlerName = `on${event[0].toUpperCase()}${event.slice(1)}` as LogEventHandler;
  if (event === 'presenceUpdate' || event === 'voiceStateUpdate') return;

  client.on(event, async (...args) => {
    storage.run(orm.em.fork(true, true), async () => {
      let guild;

      for (const arg of args) {
        guild = findGuild(arg);
        if (guild) break;
      }

      const logger = getLogger(`GUILD ${guild?.id ?? 'unknown'} EVENT ${event}`);

      if (!guild) return logger.error(`could not find guild for resource ${args[0].toString()}`);

      let preInfo;
      const hooks = eventHooks[event];
      if (hooks?.pre) {
        logger.debug(`calling pre-event hook`);
        preInfo = await hooks.pre(guild)(...args);
      }

      const logHandler = logHandlers[handlerName];

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

      const logChannel = client.channels.cache.get(config.logChannelId) as TextChannel | undefined;
      if (!logChannel)
        return logger.error(
          `could not get log channel ${config.logChannelId} for ${guild.name}, aborting`
        );

      try {
        logger.debug(`calling handler`);
        await logHandler(guild, logChannel, preInfo)(...args);
        await orm.em.flush();
      } catch (err) {
        getLogger(`GUILD ${guild?.id ?? 'unknown'} EVENT ${event}`).error(err);
      }
    });
  });
});

client.on('debug', content => {
  if (process.env.NODE_ENV === 'development') logger.debug(content);
  else if (content.includes('Remaining: '))
    logger.info(`remaining gateway sessions: ${content.split(' ').reverse()[0]}`);
});

const handleEvent = (handler: (...args: any[]) => unknown) => (...args: any[]) => {
  storage.run(orm.em.fork(true, true), () => handler(...args));
};

client
  .on('message', handleEvent(onMessage))
  .on('warn', logger.warn)
  .on('error', logger.error)
  .on('disconnect', () => logger.warn('client disconnected!'))
  .on(
    'guildCreate',
    handleEvent(async (guild: Guild) => {
      getLogger(`GUILD ${guild.id}`).info(
        `joined guild: ${guild.name} (${guild.memberCount} members)`
      );
      const fresh = orm.em.create(Config, { guildId: guild.id });
      await orm.em.persistAndFlush(fresh);
    })
  )
  .on('guildDelete', async guild => {
    const em = orm.em.fork();
    getLogger(`GUILD ${guild.id}`).info(`left guild: ${guild.name} (${guild.memberCount} members)`);
    const config = await em.findOne(Config, { guildId: guild.id });
    config && (await em.removeAndFlush(config));
  })
  .on('guildMemberAdd', handleEvent(welcome.onGuildMemberAdd))
  .on('voiceStateUpdate', handleEvent(voice.onVoiceStateUpdate))
  .on('messageReactionAdd', handleEvent(reactions.onMessageReactionAdd))
  .on('messageReactionRemove', handleEvent(reactions.onMessageReactionRemove))
  .login(process.env.DISCORD_TOKEN);
