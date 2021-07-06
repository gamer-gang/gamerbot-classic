import { Guild, TextChannel } from 'discord.js';
import { LogEventHandler, LogEventName, LogHandlers } from '.';
import { Context } from '../../types';
import { Embed } from '../../util';
import { logColorFor } from './utils';

const onCommand =
  (event: LogEventName) =>
  (guild: Guild, logChannel: TextChannel) =>
  async (context: Readonly<Context>) => {
    const { msg } = context;

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

    embed.send(logChannel);
  };

export const commandHandlers: LogHandlers = {};

const commands: LogEventName[] = [
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
  commandHandlers[`on${event[0].toUpperCase()}${event.slice(1)}` as LogEventHandler] =
    onCommand(event);
});
