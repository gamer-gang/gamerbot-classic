import { MikroORM } from '@mikro-orm/core/MikroORM';
import { registerFont } from 'canvas';
import Discord from 'discord.js';
import dotenv from 'dotenv';
import fse from 'fs-extra';
import YouTube from 'simple-youtube-api';

import { commands } from './commands';
import { Config } from './entities/Config';
import mikroOrmConfig from './mikro-orm.config';
import { onMessageReactionAdd, onMessageReactionRemove } from './reactions';
import { GuildGames, GuildQueue } from './types';
import { dbFindOneError, resolvePath, updateFlags } from './util';
import { Store } from './util/store';
import { onVoiceStateUpdate } from './voice';

dotenv.config({ path: resolvePath('.env') });

fse.mkdirp(resolvePath('data'));

const EGGFILE = resolvePath('data/eggcount.txt');

fse.ensureFileSync(EGGFILE);
let eggCount: number = parseInt(fse.readFileSync(EGGFILE).toString('utf-8')) || 0;

const setPresence = () => {
  client.user?.setPresence({
    activity: {
      name: `with ${eggCount} egg${eggCount === 1 ? '' : 's'}  | $help`,
      type: 'PLAYING',
    },
  });
};

export const client = new Discord.Client({
  partials: ['MESSAGE', 'REACTION'],
  disableMentions: 'everyone',
});
export const youtube = new YouTube(process.env.YT_API_KEY as string);

export const queueStore = new Store<GuildQueue>({
  path: 'data/queue.yaml',
  writeOnSet: false,
  readImmediately: false,
  dataLanguage: 'yaml',
});

export const gameStore = new Store<GuildGames>({
  path: 'data/games.yaml',
  writeOnSet: true,
  readImmediately: true,
  dataLanguage: 'yaml',
});

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

  client.on('message', async (msg: Discord.Message) => {
    if (msg.author.bot) return;
    if (msg.author.id == client.user?.id) return;
    // don't respond to DMs
    if (!msg.guild) return;

    queueStore.setIfUnset(msg.guild?.id as string, {
      videos: [],
      playing: false,
      currentVideoSecondsRemaining: 0,
    });

    const config =
      (await orm.em.findOne(Config, { guildId: msg.guild.id as string })) ??
      (await (async () => {
        const config = orm.em.create(Config, { guildId: msg.guild?.id as string });
        await orm.em.persistAndFlush(config);
        return await orm.em.findOneOrFail(
          Config,
          { guildId: msg.guild?.id as string },
          { failHandler: dbFindOneError(msg.channel) }
        );
      })());

    if (
      config.egg &&
      msg.content.toLowerCase().includes('egg') &&
      !msg.content.startsWith('$egg')
    ) {
      msg.react('🥚');
      eggCount++;
      fse.writeFile(EGGFILE, eggCount.toString());
      setPresence();
    }

    if (!msg.content.startsWith(config.prefix)) return;

    const [cmd, ...args] = msg.content
      .slice(config.prefix.length)
      .replace('  ', ' ')
      .split(' ');

    const flags: Record<string, number> = {};

    const commandClass = commands.find(v => {
      if (Array.isArray(v.cmd)) return v.cmd.some(c => c.toLowerCase() === cmd.toLowerCase());
      else return v.cmd.toLowerCase() === cmd.toLowerCase();
    });

    updateFlags(flags, args);

    if (!commandClass) return;

    // console.debug(inspect(cmd, true, null, true));
    // console.debug(inspect(args, true, null, true));

    await commandClass.executor({
      msg,
      cmd,
      args,
      flags,
      em: orm.em,
      queueStore,
      gameStore,
    });

    orm.em.flush();
  });
  client
    .on('warn', console.warn)
    .on('error', console.error)
    // .on('debug', console.info)
    .on('disconnect', () => console.log('client disconnected'))
    .on('ready', () => {
      console.log(`${client.user?.tag} ready`);
      setPresence();
      setInterval(setPresence, 1000 * 60 * 10);
    })
    .on('voiceStateUpdate', onVoiceStateUpdate())
    .on('messageReactionAdd', onMessageReactionAdd(orm.em))
    .on('messageReactionRemove', onMessageReactionRemove(orm.em))
    .login(process.env.DISCORD_TOKEN);
})().catch(console.error);
