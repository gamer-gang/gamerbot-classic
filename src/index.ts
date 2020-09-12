import { MikroORM } from '@mikro-orm/core/MikroORM';
import Discord from 'discord.js';
import dotenv from 'dotenv';
import fse from 'fs-extra';
import YouTube from 'simple-youtube-api';

import { commands } from './commands';
import { onMessageReactionAdd, onMessageReactionRemove } from './commands/role';
import { Config } from './entities/Config';
import mikroOrmConfig from './mikro-orm.config';
import { Store } from './store';
import { GuildGames, GuildQueue } from './types';
import { dbFindOneError, resolvePath, updateFlags } from './util';

dotenv.config();

fse.mkdirp(resolvePath('data'));

export const client = new Discord.Client({ partials: ['MESSAGE', 'REACTION'] });
export const youtube = new YouTube(process.env.YT_API_KEY as string);

const queueStore = new Store<GuildQueue>({
  path: 'data/queue.yaml',
  writeOnSet: false,
  readImmediately: false,
  dataLanguage: 'yaml',
});

const gameStore = new Store<GuildGames>({
  path: 'data/games.yaml',
  writeOnSet: true,
  readImmediately: true,
  dataLanguage: 'yaml',
});

(async () => {
  // init db
  const orm = await MikroORM.init(mikroOrmConfig);

  await orm.getMigrator().up();

  client.on('message', async (msg: Discord.Message) => {
    if (msg.author.bot) return;
    if (msg.author.id == client.user?.id) return;
    // don't respond to DMs
    if (!msg.guild) return;

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

    const [cmd, ...args] = msg.content.slice(config.prefix.length).replace('  ', ' ').split(' ');
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
      client,
      youtube,
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
      client.user?.setPresence({
        activity: {
          name: 'your mom | $help',
          type: 'PLAYING',
        },
      });
    })
    .on('messageReactionAdd', onMessageReactionAdd(orm.em))
    .on('messageReactionRemove', onMessageReactionRemove(orm.em))
    .login(process.env.DISCORD_TOKEN);
})().catch(console.error);
