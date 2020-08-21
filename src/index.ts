import * as Discord from 'discord.js';
import * as dotenv from 'dotenv';
import * as fse from 'fs-extra';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as YouTube from 'simple-youtube-api';
import { inspect } from 'util';
import { commands } from './commands';
import { Store } from './store';
import { GuildConfig, GuildQueue } from './types';
import { resolvePath, updateFlags } from './util';

dotenv.config();

fse.mkdirp(resolvePath('data'));

const client = new Discord.Client();
const youtube = new YouTube(process.env.YT_API_KEY as string);

const configStore = new Store<GuildConfig>({
  path: 'data/config.yaml',
  dataLanguage: 'yaml',
  writeOnSet: true,
  readImmediately: true,
});
const queueStore = new Store<GuildQueue>({
  path: 'data/queue.yaml',
  dataLanguage: 'yaml',
});

client.on('message', async (msg: Discord.Message) => {
  if (msg.author.bot) return;
  // don't respond to DMs
  if (!msg.guild) return;

  configStore.setIfUnset(msg.guild.id, { prefix: '$', allowSpam: false });
  queueStore.setIfUnset(msg.guild.id, { videos: [], playing: false });

  const config = configStore.get(msg.guild.id);
  if (!msg.content.startsWith(config.prefix)) return;

  const [cmd, ...args] = msg.content.slice(config.prefix.length).split(' ');
  const flags: Record<string, number> = {};

  const commandClass = commands.find(v => {
    if (Array.isArray(v.cmd)) return v.cmd.some(c => c.toLowerCase() === cmd.toLowerCase());
    else return v.cmd.toLowerCase() === cmd.toLowerCase();
  });

  updateFlags(flags, args);

  if (!commandClass) return;

  // console.debug(inspect(cmd, true, null, true));
  // console.debug(inspect(args, true, null, true));

  if (
    msg.content.includes('@everyone') ||
    msg.content.includes('@here') ||
    /<@!\d{18}>/g.test(msg.content)
  ) {
    return msg.channel.send('yea i aint doin that');
  }

  return commandClass.executor({
    msg,
    cmd,
    args,
    flags,
    client,
    configStore,
    queueStore,
    youtube,
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
