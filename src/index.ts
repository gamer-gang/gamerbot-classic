import { registerFont } from 'canvas';
import { ClientEvents, Guild, GuildMember, Message } from 'discord.js';
import dotenv from 'dotenv';
import fse from 'fs-extra';
import _ from 'lodash/fp';
import yargsParser from 'yargs-parser';

import { Command } from './commands';
import { CommandHelp } from './commands/general/help';
import { Config } from './entities/Config';
import * as eggs from './listeners/eggs';
import { LogEventHandler, logEvents, logHandlers } from './listeners/log';
import * as reactions from './listeners/reactions';
import * as voice from './listeners/voice';
import * as welcome from './listeners/welcome';
import { client, logger } from './providers';
import { codeBlock, dbFindOneError, Embed, emptyQueue, resolvePath } from './util';

dotenv.config({ path: resolvePath('.env') });

fse.mkdirp(resolvePath('data'));
fse.mkdirp(resolvePath('data/gifs'));

export const setPresence = async (): Promise<void> => {
  const num = await eggs.get(client);
  client.presenceManager.presence = {
    activity: {
      type: 'PLAYING',
      name: `with ${num.toLocaleString()} egg${num === 1 ? '' : 's'} | $help`,
    },
  };
};

// register fonts for canvas
const fonts: Record<string, { family: string; weight?: string; style?: string }> = {
  'FiraSans-Regular.ttf': { family: 'Fira Sans' },
  'FiraSans-Italic.ttf': { family: 'Fira Sans', style: 'italic' },
  'FiraSans-Bold.ttf': { family: 'Fira Sans', weight: 'bold' },
  'FiraSans-BoldItalic.ttf': { family: 'Fira Sans', weight: 'bold', style: 'italic' },
};

Object.keys(fonts).forEach(filename =>
  registerFont(resolvePath('assets/fonts/' + filename), fonts[filename])
);

// keep member caches up-to-date
const fetchMemberCache = async (): Promise<void> => {
  const guilds = client.guilds.cache.array();

  await Promise.all(
    guilds.map(
      (guild, index) =>
        new Promise<GuildMember[]>(resolve => {
          setTimeout(() => guild.members.fetch().then(c => resolve(c.array())), index * 2500);
        })
    )
  );

  setTimeout(fetchMemberCache, 1000 * 60 * 5);
};

client.on('message', async msg => {
  const start = process.hrtime();

  if (msg.author.bot) return;
  if (msg.author.id == client.user?.id) return;
  if (!msg.guild) return; // don't respond to DMs

  client.queues.setIfUnset(msg.guild.id, emptyQueue());

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

  eggs.onMessage(msg, config, client.em)();

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

  console.log(logHandler);
  console.log(logHandlers);

  if (logHandler) logHandler(context);

  if (args.error) msg.channel.send(Embed.warning(codeBlock(args.error)));
  if (context.args.help) {
    context.args.argv._ = [cmd];
    command = new CommandHelp();
  }

  await command.execute(context);

  client.em.flush();
});

client.on('ready', () => {
  logger.info(`${client.user.tag} ready`);
  setPresence();
  setInterval(setPresence, 1000 * 60 * 10);
  fetchMemberCache();
});

(logEvents.filter(e => e.includes('gamerbotCommand')) as (keyof ClientEvents)[]).forEach(event => {
  const handlerName = `on${event[0].toUpperCase()}${event.slice(1)}` as LogEventHandler;
  if (logHandlers[handlerName])
    client.on(event, async (...args: any[]) => {
      logHandlers[handlerName]!(...args).then(() => client.em.flush());
    });
});

client
  .on('warn', logger.warn)
  .on('error', logger.error)
  .on('debug', msg => logger.debug(msg))
  .on('disconnect', () => logger.warn('client disconnected!'))
  .on('guildCreate', async guild => {
    const fresh = client.em.create(Config, { guildId: guild.id });
    await client.em.persistAndFlush(fresh);
  })
  .on('guildDelete', async guild => {
    const config = await client.em.findOne(Config, { guildId: guild.id });
    config && (await client.em.removeAndFlush(config));
  })
  .on('guildMemberAdd', welcome.onGuildMemberAdd(client.em))
  // .on('messageDelete', eggs.onMessageDelete(client.em))
  // .on('messageUpdate', eggs.onMessageUpdate(client.em))
  .on('voiceStateUpdate', voice.onVoiceStateUpdate())
  .on('messageReactionAdd', reactions.onMessageReactionAdd(client.em))
  .on('messageReactionRemove', reactions.onMessageReactionRemove(client.em))
  .login(process.env.DISCORD_TOKEN);
