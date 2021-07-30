import { Embed } from '@gamerbot/util';
import { Message, PermissionString } from 'discord.js';
import _ from 'lodash';
import { Command, CommandOptions } from '../..';
import { CommandEvent } from '../../../models/CommandEvent';
import { allowSpam } from './allowspam';
import { egg } from './egg';
import { logChannel } from './logChannel';
import { logEvents } from './logEvents';
import { prefix } from './prefix';
import { welcomeChannel } from './welcomeChannel';
import { welcomeMessage } from './welcomeMessage';

const configHandlers: Record<string, (event: CommandEvent, newValue: any) => Promise<any>> = {
  welcomeChannel,
  welcomeMessage,
  prefix,
  egg,
  allowSpam,
  logChannel,
  logEvents,
};

export class CommandConfig extends Command {
  cmd = ['config'];
  docs = [
    {
      usage: 'config <option> [newValue]',
      description: 'get/set a config value',
    },
  ];
  userPermissions: PermissionString[] = ['ADMINISTRATOR'];
  commandOptions: CommandOptions = {
    description: 'Get/set configuration values',
    options: [
      {
        name: 'welcome-channel',
        description: 'Channel for gamerbot welcome messages',
        type: 'SUB_COMMAND',
        options: [
          {
            name: 'set-welcome-channel',
            description: 'Channel to use',
            type: 'CHANNEL',
          },
        ],
      },
      {
        name: 'welcome-message',
        description: 'Configurable welcome message',
        type: 'SUB_COMMAND',
        options: [
          {
            name: 'set-welcome-message',
            description:
              'JSON message to send; %USER%, %USERTAG%, and %GUILD% are replaced with their respective values',
            type: 'STRING',
          },
        ],
      },
      {
        name: 'prefix',
        description: 'Prefix for gamerbot commands',
        type: 'SUB_COMMAND',
        options: [
          {
            name: 'set-prefix',
            description: 'Channel to use',
            type: 'STRING',
          },
        ],
      },
      {
        name: 'egg',
        description: 'Enable/disable eggs in this server',
        type: 'SUB_COMMAND',
        options: [
          {
            name: 'set-egg',
            description: 'Enable/disable eggs (yes, no, true, false, etc)',
            type: 'BOOLEAN',
          },
        ],
      },
      {
        name: 'allow-spam',
        description: 'Enable/disable spam commands',
        type: 'SUB_COMMAND',
        options: [
          {
            name: 'set-allow-spam',
            description: 'Enable/disable spam commands',
            type: 'BOOLEAN',
          },
        ],
      },
      {
        name: 'log-channel',
        description: 'Channel for gamerbot log messages',
        type: 'SUB_COMMAND',
        options: [
          {
            name: 'set-log-channel',
            description: 'Channel to use',
            type: 'CHANNEL',
          },
        ],
      },
      {
        name: 'log-events',
        description: 'Events to log in log channel',
        type: 'SUB_COMMAND',
        options: [
          {
            name: 'set-log-events',
            description: 'Events to log',
            type: 'STRING',
          },
        ],
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const subcommand = _.camelCase(
      event.isInteraction() ? event.options.getSubcommand() : event.argv[0] ?? ''
    );

    const handlerName = Object.keys(configHandlers).find(
      n => n.toLowerCase() === subcommand.toLowerCase()
    );

    if (!subcommand || !handlerName)
      return event.reply(
        Embed.error(
          'Invalid config option',
          'Valid options: ' +
            Object.keys(configHandlers)
              .map(k => k.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase())
              .join(', ')
        )
      );

    const option = event.isInteraction()
      ? event.options.get(`set-${subcommand.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`)
      : event.args.split(' ').slice(1).join(' ');

    await configHandlers[handlerName](
      event,
      typeof option === 'object'
        ? option?.value ?? option?.channel ?? option?.member ?? option?.user
        : option
    );

    event.em.flush();
  }
}
