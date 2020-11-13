import { MikroORM } from '@mikro-orm/core/MikroORM';
import { registerFont } from 'canvas';
import { Guild, Message } from 'discord.js';
import dotenv from 'dotenv';
import fse from 'fs-extra';
import _ from 'lodash/fp';
import { inspect } from 'util';
import yargsParser from 'yargs-parser';

import { commands } from './commands';
import { CommandHelp } from './commands/general/help';
import { Config } from './entities/Config';
import * as eggs from './listeners/eggs';
import * as reactions from './listeners/reactions';
import * as voice from './listeners/voice';
import * as welcome from './listeners/welcome';
import mikroOrmConfig from './mikro-orm.config';
import { client, logger, queueStore, spotify } from './providers';
import { codeBlock, dbFindOneError, Embed, resolvePath } from './util';

dotenv.config({ path: resolvePath('.env') });

fse.mkdirp(resolvePath('data'));
fse.mkdirp(resolvePath('data/gifs'));

export const setPresence = (): void => {
  const num = eggs.get();
  const s = num === 1 ? '' : 's';
  client.user?.setPresence({
    activity: {
      name: `with ${num.toLocaleString()} egg${s} | $help`,
      type: 'PLAYING',
    },
  });
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

(async () => {
  // init db
  const orm = await MikroORM.init(mikroOrmConfig);
  await orm.getMigrator().up();

  // init spotify
  const getSpotifyAccessToken = async () => {
    const grant = await spotify.clientCredentialsGrant();
    logger.info(`new spotify access token granted, expires in ${grant.body.expires_in} seconds`);
    spotify.setAccessToken(grant.body.access_token);
    setTimeout(getSpotifyAccessToken, grant.body.expires_in * 1000);
  };

  setTimeout(getSpotifyAccessToken, 0);

  client.on('message', async msg => {
    const start = process.hrtime();

    if (msg.author.bot) return;
    if (msg.author.id == client.user?.id) return;
    if (!msg.guild) return; // don't respond to DMs

    queueStore.setIfUnset(msg.guild.id, {
      tracks: [],
      playing: false,
      current: {},
    });

    const config = await (async (msg: Message) => {
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

    eggs.onMessage(msg, config)();

    if (!msg.content.startsWith(config.prefix)) return;

    const [cmd, ...argv] = msg.content.slice(config.prefix.length).replace(/ +/g, ' ').split(' ');

    let commandClass = commands.find(v => {
      if (Array.isArray(v.cmd)) return v.cmd.some(c => c.toLowerCase() === cmd.toLowerCase());
      else return v.cmd.toLowerCase() === cmd.toLowerCase();
    });
    if (!commandClass) return;

    const yargsConfig = _.merge(commandClass.yargsSchema ?? {}, {
      alias: _.merge(commandClass.yargsSchema?.alias, { help: 'h' }),
      boolean: commandClass.yargsSchema?.boolean
        ? ['help'].concat(...commandClass.yargsSchema?.boolean)
        : ['help'],
      default: _.merge(commandClass.yargsSchema?.default, { help: false }),
      configuration: { 'flatten-duplicate-arrays': false },
    } as yargsParser.Options);

    const args = yargsParser.detailed(argv, yargsConfig);

    console.log(inspect(yargsConfig, true, 2, true));
    console.log(inspect(args, true, 2, true));

    if (args.error) msg.channel.send(Embed.warning(codeBlock(args.error)));
    if (args.argv.help) {
      args.argv._ = [cmd];
      commandClass = new CommandHelp();
    }

    await commandClass.executor({
      msg: msg as Message & { guild: Guild },
      cmd,
      args: args.argv,
      em: orm.em,
      config,
      queueStore,
      startTime: start,
    });

    orm.em.flush();
  });

  client.on('ready', () => {
    logger.info(`${client.user?.tag} ready`);
    setPresence();
    setInterval(setPresence, 1000 * 60 * 10);
  });

  client
    .on('warn', logger.warn)
    .on('error', logger.error)
    .on('disconnect', () => logger.warn('client disconnected!'))
    .on('guildCreate', async guild => {
      const fresh = orm.em.create(Config, { guildId: guild.id });
      await orm.em.persistAndFlush(fresh);
    })
    .on('guildDelete', async guild => {
      const config = await orm.em.findOne(Config, { guildId: guild.id });
      config && (await orm.em.removeAndFlush(config));
    })
    .on('guildMemberAdd', welcome.onGuildMemberAdd(orm.em))
    .on('messageDelete', eggs.onMessageDelete(orm.em))
    .on('messageUpdate', eggs.onMessageUpdate(orm.em))
    .on('voiceStateUpdate', voice.onVoiceStateUpdate())
    .on('messageReactionAdd', reactions.onMessageReactionAdd(orm.em))
    .on('messageReactionRemove', reactions.onMessageReactionRemove(orm.em))
    .login(process.env.DISCORD_TOKEN);
})().catch(err => logger.error(err));
