import { RequestContext } from '@mikro-orm/core';
import { registerFont } from 'canvas';
import { ClientEvents, Guild, GuildMember, Message } from 'discord.js';
import dotenv from 'dotenv';
import fse from 'fs-extra';
import _ from 'lodash/fp';
import 'source-map-support/register';
import yargsParser from 'yargs-parser';
import { Command } from './commands';
import { CommandHelp } from './commands/general/help';
import { Config } from './entities/Config';
import * as eggs from './listeners/eggs';
import { LogEventHandler, logEvents, logHandlers } from './listeners/log';
import * as reactions from './listeners/reactions';
import * as voice from './listeners/voice';
import * as welcome from './listeners/welcome';
import { client, getLogger, logger, usernameCache } from './providers';
import { Queue } from './types';
import { codeBlock, dbFindOneError, Embed, listify, resolvePath } from './util';

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

client.on('message', async msg => {
  const start = process.hrtime();

  if (msg.author.bot && !msg.author?.tag.endsWith('#0000')) return;
  if (msg.author.id == client.user?.id) return;
  if (!msg.guild) return; // don't respond to DMs

  client.queues.setIfUnset(msg.guild.id, new Queue(msg.guild.id));

  const config = await (async (msg: Message) => {
    const existing = await client.em.findOne(Config, { guildId: msg.guild?.id });
    if (existing) return existing;

    const fresh = client.em.create(Config, { guildId: msg.guild?.id });
    await client.em.persistAndFlush(fresh);
    return await client.em.findOneOrFail(
      Config,
      { guildId: msg.guild?.id },
      { failHandler: dbFindOneError(msg.channel) }
    );
  })(msg);

  if (!msg.author.bot || msg.author?.tag.endsWith('#0000'))
    eggs.onMessage(msg, config, client.em)();

  if (new RegExp(`^<@!?${client.user.id}>$`).test(msg.content)) {
    msg.channel.send(
      Embed.info(
        `Prefix is set to \`${config.prefix}\`\nSee \`$help\` or https://gamerbot-dev.web.app for more information`
      ).setDefaultAuthor()
    );
    return;
  }

  if (!msg.content.startsWith(config.prefix)) return;

  const [cmd, ...argv] = msg.content.slice(config.prefix.length).replace(/ +/g, ' ').split(' ');

  let command: Command | undefined = client.commands.find(v => {
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

  const context = {
    msg: msg as Message & { guild: Guild },
    cmd,
    args: args.argv,
    config,
    startTime: start,
  };

  const logHandler = Array.isArray(command.cmd)
    ? command.cmd.map(
        cmd => logHandlers[`onGamerbotCommand${_.capitalize(cmd.toLowerCase())}` as LogEventHandler]
      )[0]
    : logHandlers[`onGamerbotCommand${_.capitalize(command.cmd.toLowerCase())}` as LogEventHandler];

  if (logHandler) logHandler(context);

  if (args.error) msg.channel.send(Embed.warning(codeBlock(args.error)));
  if (context.args.help) {
    context.args._ = [cmd];
    command = new CommandHelp();
  }

  const userPermissions = msg.guild?.members.resolve(msg.author.id)?.permissionsIn(msg.channel);
  const botPermissions = msg.guild?.me?.permissionsIn(msg.channel);

  if (!botPermissions?.has('SEND_MESSAGES')) {
    logger.error(
      `cannot respond to ${msg.cleanContent} in ${msg.channel.id} due to missing permissions`
    );
    return;
  }

  if (command.userPermissions) {
    const missingPermissions = command.userPermissions
      .map(perm => [perm, userPermissions?.has(perm)])
      .filter(([perm, has]) => has === false)
      .map(([perm]) => perm);

    if (missingPermissions.length) {
      return msg.channel.send(
        Embed.error(
          `Missing permissions for ${config.prefix}${cmd}`,
          `${config.prefix}${cmd} requires ${listify(
            command.userPermissions.map(v => `\`${v}\``)
          )}, but you are missing ${listify(missingPermissions.map(v => `\`${v}\``))}`
        )
      );
    }
  }

  if (command.botPermissions) {
    const missingPermissions = command.botPermissions
      .map(perm => [perm, botPermissions?.has(perm)])
      .filter(([perm, has]) => has === false)
      .map(([perm]) => perm);

    if (missingPermissions.length) {
      return msg.channel.send(
        Embed.error(
          `gamerbot missing permissions for ${config.prefix}${cmd}`,
          `${config.prefix}${cmd} requires ${listify(
            command.botPermissions.map(v => `\`${v}\``)
          )}, but gamerbot does not have access to ${listify(
            missingPermissions.map(v => `\`${v}\``)
          )}`
        )
      );
    }
  }

  RequestContext.create(client.em, () => {
    command
      ?.execute({
        msg: msg as Message & { guild: Guild },
        cmd,
        args: args.argv,
        config,
        startTime: start,
      })
      .then(() => msg.channel.stopTyping(true))
      .then(() => client.em.fork().flush())
      .catch(err => {
        msg.channel.stopTyping(true);
        logger.error(err);
        msg.channel.send(Embed.error(codeBlock(err)));
      });
  });
});

client.on('ready', () => {
  logger.info(`${client.user.tag} ready`);
  setPresence();
  setInterval(setPresence, 1000 * 60 * 10);
  fetchMemberCache();
});

(logEvents.filter(e => !e.includes('gamerbotCommand')) as (keyof ClientEvents)[]).forEach(event => {
  const handlerName = `on${event[0].toUpperCase()}${event.slice(1)}` as LogEventHandler;
  if (logHandlers[handlerName]) {
    client.on(event, async (...args) => {
      RequestContext.create(client.em, async () => {
        let guild: Guild;
        if (client.guilds.cache.get(args[0].id)) {
          guild = args[0] as Guild;
        } else {
          guild = args[0].guild as Guild;
        }

        logger.debug(`recv guild ${guild?.id ?? 'unknown'} event ${event}`);

        try {
          await logHandlers[handlerName]!(...args);
          (RequestContext.getEntityManager() ?? client.em).flush();
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
  .on('warn', logger.warn)
  .on('error', logger.error)
  .on('disconnect', () => logger.warn('client disconnected!'))
  .on('guildCreate', async guild => {
    const em = client.em.fork();
    getLogger(`GUILD ${guild.id}`).info(
      `joined guild: ${guild.name} (${guild.memberCount} members)`
    );
    const fresh = em.create(Config, { guildId: guild.id });
    await em.persistAndFlush(fresh);
  })
  .on('guildDelete', async guild => {
    const em = client.em.fork();
    getLogger(`GUILD ${guild.id}`).info(`left guild: ${guild.name} (${guild.memberCount} members)`);
    const config = await em.findOne(Config, { guildId: guild.id });
    config && (await em.removeAndFlush(config));
  })
  .on('guildMemberAdd', welcome.onGuildMemberAdd(client.em.fork()))
  .on('voiceStateUpdate', voice.onVoiceStateUpdate())
  .on('messageReactionAdd', reactions.onMessageReactionAdd(client.em.fork()))
  .on('messageReactionRemove', reactions.onMessageReactionRemove(client.em.fork()))
  .login(process.env.DISCORD_TOKEN);
