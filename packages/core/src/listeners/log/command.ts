import { Embed } from '@gamerbot/util';
import { Guild, TextChannel } from 'discord.js';
import { CommandEvent } from '../../models/CommandEvent';
import { logColorFor } from './utils';
import { LogEventHandler, LogEventName, LogHandlers } from './_constants';

const onCommand =
  (logEvent: LogEventName) =>
  (guild: Guild, logChannel: TextChannel) =>
  async (event: Readonly<CommandEvent>) => {
    const embed = new Embed({
      author: {
        iconURL: event.user.displayAvatarURL({ format: 'png' }) ?? undefined,
        name: event.user.tag,
      },
      color: logColorFor(logEvent),
      title: 'User issued gamerbot command',
    })
      .addField(
        'Command',
        `\`${
          event.isInteraction()
            ? JSON.stringify(event.interaction.toJSON())
            : event.message.cleanContent
        }\``
      )
      .addField('User ID', event.user.id)
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
  'gamerbotCommandBack',
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
