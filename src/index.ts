import * as Discord from 'discord.js';
import * as dotenv from 'dotenv';
import * as fse from 'fs-extra';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as YouTube from 'simple-youtube-api';
import { inspect } from 'util';
import { commands } from './commands';
import { Store } from './store';
import { GuildConfig, GuildGames, GuildQueue } from './types';
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
const gameStore = new Store<GuildGames>({
  path: 'data/games.yaml',
  dataLanguage: 'yaml',
  readImmediately: true,
  writeOnSet: false,
});

client.on('message', async (msg: Discord.Message) => {
  if (msg.author.id == client.user!.id) return;
  // don't respond to DMs
  if (!msg.guild) return;

  if (msg.author.bot) {
    if (msg.author.id === '745448789657124935') {
      if (msg.content.includes('Prefix Successfully Changed To:')) {
        console.log(msg.content);
        // extract new prefix
        const newCowPrefix = msg.content
          .substring(msg.content.indexOf('```') + 3, msg.content.lastIndexOf('```'))
          .trim();
        configStore.get(msg.guild.id).cowPrefix = newCowPrefix;
      } else if (
        msg.embeds[0] &&
        msg.embeds[0].description === '```gamerbot#0789```' &&
        msg.embeds[0].title === 'How Rich i$ $omeone'
      ) {
        const money = BigInt(msg.embeds[0].fields[0].value.replace(/[`$]/g, '').trim());
        if (money > 1) {
          // typescript complaining about bigint literal even though it works perfectly
          // @ts-ignore
          msg.channel.send('/cow buy upgrade dino ' + money / 100000000n);
        }
      }
    }
    return;
  }

  configStore.setIfUnset(msg.guild.id, { prefix: '$', allowSpam: false, cowPrefix: '/cow' });
  queueStore.setIfUnset(msg.guild.id, { videos: [], playing: false });
  gameStore.setIfUnset(msg.guild.id, { liarsDice: {} });

  const config = configStore.get(msg.guild.id);
  if (!msg.content.startsWith(config.prefix)) return;

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
