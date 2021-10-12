import { Embed } from '@gamerbot/util';
import { CommandInteractionOption, Formatters, Guild, TextChannel } from 'discord.js';
import { CommandEvent } from '../../models/CommandEvent';
import { logColorFor } from './utils';
import { LogEventHandler, LogEventName, LogHandlers } from './_constants';

const getOptions = (options: readonly CommandInteractionOption[], indent = ''): string =>
  options
    .map(
      opt =>
        indent +
        `${opt.name} => ${(opt.options?.length
          ? '\n' + getOptions(opt.options, indent + '  ') + '\n'
          : opt.channel
          ? '#' + opt.channel.name
          : opt.user
          ? '@' + opt.user.tag
          : opt.member ?? opt.message ?? opt.role ?? opt.value ?? '(none)'
        ).toString()}`
    )
    .join('\n');

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
        `${
          event.isInteraction() ? `/${event.commandName}` : '`' + event.message.cleanContent + '`'
        }`
      )
      .setTimestamp();

    if (event.isContextMenuInteraction())
      embed.addField('Target type', event.targetType).addField('Target ID', event.targetId);
    else if (event.isInteraction())
      embed.addField('Options', Formatters.codeBlock(getOptions(event.options.data)));

    embed
      .addField('User ID', event.user.id)

      .send(logChannel);
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
