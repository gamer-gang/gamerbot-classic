import { delay, findGuild, resolvePath } from '@gamerbot/util';
import { registerFont } from 'canvas';
import { ClientEvents, Guild, GuildMember, Invite, TextChannel } from 'discord.js';
import dotenv from 'dotenv';
import fse from 'fs-extra';
import _ from 'lodash';
import { getLogger } from 'log4js';
import { Config } from './entities/Config';
import { CachedInvite } from './gamerbot';
import { onInteractionCreate } from './listeners/command/onInteractionCreate';
import { onMessageCreate } from './listeners/command/onMessageCreate';
import * as eggs from './listeners/eggs';
import { getLogHandler, intToLogEvents } from './listeners/log';
import { LogClientEventName, logClientEvents, LogEventHandler } from './listeners/log/_constants';
import * as reactions from './listeners/reactions';
import * as voice from './listeners/voice';
import * as welcome from './listeners/welcome';
import { client, directORM, getORM, storage } from './providers';

dotenv.config({ path: resolvePath('.env') });

fse.mkdirp(resolvePath('data'));

// register fonts for canvas
const fonts: Record<string, { family: string; weight?: string; style?: string }> = {
  'RobotoMono-Regular-NF.ttf': { family: 'Roboto Mono NF' },
};

Object.keys(fonts).forEach(filename =>
  registerFont(resolvePath('assets/fonts/' + filename), fonts[filename])
);

export const setPresence = async (): Promise<void> => {
  const num = await eggs.get(client);
  client.presenceManager.presence = {
    activities: [
      {
        type: 'PLAYING',
        name: `with ${num.toLocaleString()} egg${num === 1n ? '' : 's'} | /help`,
      },
    ],
  };
};

// keep member caches up-to-date
const fetchMemberCache = async (): Promise<void> => {
  const guilds = [...client.guilds.cache.values()];

  const members = (
    await Promise.all(
      guilds.map(
        (guild, index) =>
          new Promise<GuildMember[]>(resolve => {
            setTimeout(
              () => guild.members.fetch().then(c => resolve([...c.values()])),
              index * 2500
            );
          })
      )
    )
  ).flat(1);

  members.forEach(m =>
    client.usernameCache.set(m.id, {
      username: m.user.username,
      discriminator: m.user.discriminator,
    })
  );

  getLogger('fetchMemberCache').debug(`successfully cached ${members.length} users`);
};

const fetchInvite = async (guild: Guild) => {
  try {
    const invites = (await guild.invites.fetch()).values();

    const trackedInvites: string[] = [];

    for (const invite of invites) {
      client.inviteCache.set(invite.code, {
        code: invite.code,
        creatorId: invite.inviter!.id,
        creatorTag: invite.inviter!.tag,
        guildId: guild.id,
        uses: invite.uses ?? 0,
      });

      trackedInvites.push(invite.code);
    }

    getLogger(`fetchInvite[guild=${guild.id}]`).debug('successfully cached invites');

    return;
  } catch (err) {
    getLogger(`fetchInvite[guild=${guild.id}]`).error(`error caching invites: ${err.message}`);
  }
};

client.on('ready', async () => {
  getLogger('Client!ready').info(`${client.user.tag} ready`);
  setPresence();
  setInterval(setPresence, 1000 * 60 * 10);
  fetchMemberCache();
  setInterval(fetchMemberCache, 1000 * 60 * 60);

  const orm = await getORM();

  const inviteFetchers = [...client.guilds.cache.values()].map((guild, index) =>
    delay(index * 2500)(undefined).then(() => fetchInvite(guild))
  );

  Promise.all(inviteFetchers).then(() => orm.em.flush());
});

const usernameCacheUpdates: { [userId: string]: NodeJS.Timeout } = {};

// attach log handlers
// TODO: improve types
const eventHooks: {
  [key: string]: {
    pre?: (guild: Guild) => (...args: any[]) => Promise<any>;
    post?: (guild: Guild) => (...args: any[]) => Promise<any>;
  };
} = {
  inviteCreate: {
    pre: (guild: Guild) => async (invite: Invite) => {
      client.inviteCache.set(invite.code, {
        code: invite.code,
        creatorId: invite.inviter!.id,
        creatorTag: invite.inviter!.tag,
        guildId: guild.id,
        uses: invite.uses ?? 0,
      });
    },
  },
  inviteDelete: {
    pre: (guild: Guild) => async (invite: Invite) => {
      const cached = _.clone(client.inviteCache.get(invite.code));
      client.inviteCache.delete(invite.code);
      return cached;
    },
  },
  guildMemberAdd: {
    pre: (guild: Guild) => async () => {
      // figure out which invite was just used
      const newInvites = (await guild.invites.fetch()).values();

      let usedCached: CachedInvite | undefined;
      let usedNew: Invite | undefined;

      for (const invite of newInvites) {
        const cached = client.inviteCache.get(invite.code);
        if (!cached) {
          getLogger(`Client!guildMemberAdd.pre[guild=${guild}]`).warn(
            `invite ${invite.code} has no cached counterpart`
          );
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
  guildMemberUpdate: {
    // we wait to stop receiving all `guildMemberUpdate` events before updating the global cache
    // required so that all guilds receive the event regardless of order
    post: (guild: Guild) => async (prev: GuildMember, next: GuildMember) => {
      if (!client.usernameCache.has(next.id))
        client.usernameCache.set(next.id, {
          username: next.user.username,
          discriminator: next.user.discriminator,
        });

      const cached = client.usernameCache.get(next.id)!;

      if (
        cached.username === next.user.username &&
        cached.discriminator === next.user.discriminator
      )
        return;

      usernameCacheUpdates[next.id] && clearTimeout(usernameCacheUpdates[next.id]);

      const updateCache = () => {
        client.usernameCache.set(next.id, {
          username: next.user.username,
          discriminator: next.user.discriminator,
        });
        delete usernameCacheUpdates[next.id];
      };

      // if no new events in 3 seconds, update the global cache
      usernameCacheUpdates[next.id] = setTimeout(updateCache, 3000);
    },
  },
};

(logClientEvents as readonly (keyof ClientEvents)[]).forEach(event => {
  const handlerName = `on${event[0].toUpperCase()}${event.slice(1)}` as LogEventHandler;
  if (event === 'presenceUpdate' || event === 'voiceStateUpdate') return;

  client.on(event, async (...args) => {
    const orm = await getORM();
    storage.run(orm.em.fork(true, true), async () => {
      let guild;

      for (const arg of args) {
        guild = findGuild(arg as ClientEvents[LogClientEventName][0]);
        if (guild) break;
      }

      const logger = getLogger(`Client!${event}.callback[guild=${guild?.id ?? 'unknown'}]`);

      if (!guild) return logger.error(`could not find guild for resource ${args[0]?.toString()}`);

      let preInfo;
      const hooks = eventHooks[event];
      if (hooks?.pre) {
        logger.debug(`calling pre-event hook`);
        preInfo = await hooks.pre(guild)(...args);
      }

      const logHandler = getLogHandler(handlerName);

      if (!logHandler) {
        logger.debug(`no ${handlerName} handler, ignoring event`);
        return;
      }

      const config = await orm.em.findOne(Config, { guildId: guild.id });
      if (!config) return logger.error(`could not get config for ${guild.id}`);

      logger.debug(`handler for ${event} exists`);
      if (
        !intToLogEvents(config.logSubscribedEvents).includes(
          event as typeof logClientEvents[number]
        )
      ) {
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

        if (hooks?.post) {
          logger.debug(`calling post-event hook`);
          await hooks.post(guild)(...args);
        }

        await orm.em.flush();
      } catch (err) {
        logger.error(err);
      }
    });
  });
});

const debugLogger = getLogger('Client!debug');
client.on('debug', content => {
  if (content.includes('Heartbeat')) return;

  debugLogger.debug(content);

  if (content.includes('Remaining: '))
    getLogger('Client+info').info(`Remaining gateway sessions: ${content.split(' ').reverse()[0]}`);
});

const handleEvent =
  (handler: (...args: any[]) => unknown) =>
  (...args: any[]) => {
    storage.run(directORM().em.fork(true, true), () => {
      handler(...args);
    });
  };

client
  .on('messageCreate', handleEvent(onMessageCreate))
  .on('interactionCreate', handleEvent(onInteractionCreate))
  .on('warn', getLogger('Client!warn').warn)
  .on('error', getLogger('Client!error').error)
  .on('disconnect', () => getLogger('Client!disconnect').warn('client disconnected!'))
  .on(
    'guildCreate',
    handleEvent(async (guild: Guild) => {
      const orm = await getORM();
      getLogger(`Client!guildCreate[guild=${guild.id}]`).info(
        `joined guild: ${guild.name} (${guild.memberCount} members)`
      );
      const fresh = orm.em.create(Config, { guildId: guild.id });
      await orm.em.persistAndFlush(fresh);
    })
  )
  .on(
    'guildDelete',
    handleEvent(async (guild: Guild) => {
      const orm = await getORM();
      getLogger(`Client!guildDelete[guild=${guild.id}]`).info(
        `left guild: ${guild.name} (${guild.memberCount} members)`
      );
      const config = await orm.em.findOne(Config, { guildId: guild.id });
      config && (await orm.em.removeAndFlush(config));
    })
  )
  .on('guildMemberAdd', handleEvent(welcome.onGuildMemberAdd))
  .on('voiceStateUpdate', handleEvent(voice.onVoiceStateUpdate))
  .on('messageReactionAdd', handleEvent(reactions.onMessageReactionAdd))
  .on('messageReactionRemove', handleEvent(reactions.onMessageReactionRemove))
  .login(process.env.DISCORD_TOKEN);
