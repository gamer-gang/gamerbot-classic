import * as Discord from 'discord.js';
import * as dotenv from 'dotenv';
import * as fse from 'fs-extra';
import YouTube from 'simple-youtube-api';
import { inspect } from 'util';
import { commands } from './commands';
import { Store } from './store';
import { GuildConfig, GuildGames, GuildQueue } from './types';
import { resolvePath, updateFlags } from './util';

dotenv.config();

fse.mkdirp(resolvePath('data'));

export const client = new Discord.Client();
export const youtube = new YouTube(process.env.YT_API_KEY as string);

export const configStore = new Store<GuildConfig>({
  path: 'data/config.yaml',
  dataLanguage: 'yaml',
  writeOnSet: true,
  readImmediately: true,
});
export const queueStore = new Store<GuildQueue>({
  path: 'data/queue.yaml',
  dataLanguage: 'yaml',
});
export const gameStore = new Store<GuildGames>({
  path: 'data/games.yaml',
  dataLanguage: 'yaml',
  readImmediately: true,
  writeOnSet: true,
});

client.on('message', async (msg: Discord.Message) => {
  if (msg.author.id == client.user?.id) return;
  // don't respond to DMs
  if (!msg.guild) return;

  configStore.setIfUnset(msg.guild.id, { prefix: '$', allowSpam: false, cowPrefix: '/cow' });
  queueStore.setIfUnset(msg.guild.id, { videos: [], playing: false });
  gameStore.setIfUnset(msg.guild.id, { liarsDice: {} });

  const config = configStore.get(msg.guild.id);
  if (!msg.content.startsWith(config.prefix)) return;

  const [cmd, ...args] = msg.content.slice(config.prefix.length).split(' ');
  const flags: Record<string, number> = {};

  const commandClass = commands.find(v => {
    if (Array.isArray(v.cmd)) return v.cmd.some(c => c.toLowerCase() === cmd.toLowerCase());
    else return v.cmd.toLowerCase() === cmd.toLowerCase();
  });

  updateFlags(flags, args);

  console.log(msg.content);

  if (!commandClass) return;

  // console.debug(inspect(cmd, true, null, true));
  // console.debug(inspect(args, true, null, true));

  return commandClass.executor({
    msg,
    cmd,
    args,
    flags,
    client,
    configStore,
    queueStore,
    youtube,
    gameStore,
  });
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
        name: 'your mom',
        type: 'PLAYING',
      },
    });
  })
  .login(process.env.DISCORD_TOKEN);
