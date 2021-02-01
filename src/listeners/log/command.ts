import { TextChannel } from 'discord.js';
import { intToLogEvents, LogEventHandler, LogEventType, LogHandlers } from '.';
import { client } from '../../providers';
import { Context } from '../../types';
import { Embed } from '../../util';
import { getConfig, logColorFor } from './utils';

const onCommand = (event: LogEventType) => async (context: Readonly<Context>) => {
  const { msg } = context;

  const config = await getConfig(msg);
  if (!config.logChannelId) return;
  const logChannel = client.channels.cache.get(config.logChannelId) as TextChannel;
  if (!logChannel) console.warn('could not get log channel for ' + msg.guild.name);
  if (!intToLogEvents(config.logSubscribedEvents).includes(event)) return;

  const embed = new Embed({
    author: {
      iconURL: msg.author.displayAvatarURL({ format: 'png' }) ?? undefined,
      name: msg.author.tag,
    },
    color: logColorFor(event),
    title: 'User issued gamerbot command',
  })
    .addField('Command', `\`${msg.cleanContent}\``)
    .addField('User ID', msg.author.id)
    .setTimestamp();

  logChannel.send(embed);
};

export const commandHandlers: LogHandlers = {};

const commands: LogEventType[] = [
  'gamerbotCommandApimessage',
  'gamerbotCommandBan',
  'gamerbotCommandConfig',
  'gamerbotCommandCowsay',
  'gamerbotCommandEcho',
  'gamerbotCommandEggleaderboard',
  'gamerbotCommandEz',
  'gamerbotCommandGif',
  'gamerbotCommandJoke',
  'gamerbotCommandKick',
  'gamerbotCommandPlay',
  'gamerbotCommandPrevious',
  'gamerbotCommandPurge',
  'gamerbotCommandRole',
  'gamerbotCommandShuffle',
  'gamerbotCommandSkip',
  'gamerbotCommandStop',
  'gamerbotCommandUnban',
];

commands.forEach(event => {
  commandHandlers[`on${event[0].toUpperCase()}${event.slice(1)}` as LogEventHandler] = onCommand(
    event
  );
});
