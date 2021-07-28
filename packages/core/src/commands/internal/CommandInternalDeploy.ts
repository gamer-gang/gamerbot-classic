import { codeBlock, Embed } from '@gamerbot/util';
import { ApplicationCommandData, Message } from 'discord.js';
import { CommandDocs, InternalCommand } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandInternalDeploy extends InternalCommand {
  cmd = ['deploy'];
  docs: CommandDocs = [
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
      if (!command.commandOptions) {
        nonSlashCommands.push(command.cmd[0]);
        return [];
      }

      return {
        name: command.cmd[0],
        ...command.commandOptions,
      };
    });

    try {
      const commands = (
        client.devMode
          ? await event.guild.commands.set(data)
          : await client.application!.commands.set(data)
      ).array();

      Embed.success(
        `Deployed **${commands.length}** commands ${
          client.devMode ? `to **${msg.guild.name}**` : '**globally**'
        }, overwriting previous deployment`,
        `**Commands**: ${commands.map(command => command.name).join(', ')}

Excluded **${internalCommands}** internal command${internalCommands === 1 ? '' : 's'}${
          nonSlashCommands.length
            ? `

**Excluded commands without slash command data (${
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
