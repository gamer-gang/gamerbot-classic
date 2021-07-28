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

    const manager = client.devMode ? event.guild.commands : client.application?.commands;
    if (!manager) return Embed.error('Command manager is undefined').reply(msg);

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
      await manager.set(data);

      Embed.success(
        `Deployed **${data.length}** commands ${
          client.devMode ? `to **${msg.guild.name}**` : '**globally**'
        }, overwriting previous deployment`,
        `**Commands**: ${data.map(command => command.name).join(', ')}

Excluded **${internalCommands}** internal commands${
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
