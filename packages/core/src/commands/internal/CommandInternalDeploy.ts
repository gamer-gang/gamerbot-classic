import { codeBlock } from '@discordjs/builders';
import { Embed } from '@gamerbot/util';
import { ApplicationCommandData, Message } from 'discord.js';
import { CommandDocs, InternalCommand } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandInternalDeploy extends InternalCommand {
  name = ['deploy'];
  help: CommandDocs = [
    {
      usage: 'deploy',
      description: 'deploy slash commands',
    },
  ];
  async execute(event: CommandEvent): Promise<void | Message> {
    if (event.isInteraction()) return;
    const msg = event.message;

    Embed.info('Deploying...').send(msg.channel);

    let internalCommands = 0;
    const nonSlashCommands: string[] = [];

    const data = client.commands.flatMap<ApplicationCommandData>(command => {
      if (command.internal) {
        internalCommands++;
        return [];
      }
      if (command.type === 'CHAT_INPUT') {
        if (!command.data) {
          nonSlashCommands.push(command.name[0]);
          return [];
        }

        return {
          name: command.name[0],
          ...command.data,
        };
      } else {
        return {
          name: command.name,
          type: command.type,
        };
      }
    });

    try {
      const commands = [
        ...(client.devMode
          ? await event.guild.commands.set(data)
          : await client.application!.commands.set(data)
        ).values(),
      ];

      Embed.success(
        `Deployed **${commands.length}** commands ${
          client.devMode ? `to **${msg.guild.name}**` : '**globally**'
        }, overwriting previous deployment`,
        `**Chat commands**: ${commands
          .filter(c => c.type === 'CHAT_INPUT')
          .map(c => c.name)
          .join(', ')}
**User commands**: ${commands
          .filter(c => c.type === 'USER')
          .map(c => c.name)
          .join(', ')}
**Message commands**: ${commands
          .filter(c => c.type === 'MESSAGE')
          .map(c => c.name)
          .join(', ')}

Excluded **${internalCommands}** internal chat command${internalCommands === 1 ? '' : 's'}${
          nonSlashCommands.length
            ? `

**Excluded chat commands without slash command data (${
                nonSlashCommands.length
              })**: ${nonSlashCommands.join(', ')}`
            : ''
        }`
      ).send(msg.channel);
    } catch (err) {
      Embed.error(codeBlock(err)).send(msg.channel);
    }
  }
}
