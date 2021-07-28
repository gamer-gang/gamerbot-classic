import { codeBlock, Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import _ from 'lodash';
import { Command, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

export class CommandHelp extends Command {
  cmd = ['help', 'h'];
  docs = [
    {
      usage: 'help',
      description: 'Show this message.',
    },
  ];
  commandOptions: CommandOptions = {
    description: 'Show command help',
    options: [
      {
        name: 'command',
        description: 'Show help for a specific command',
        type: 'STRING',
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const prefix = event.guildConfig.prefix;

    const requestedCommand = event.isInteraction()
      ? event.options.getString('command')
      : event.args;

    if (requestedCommand) {
      const command = client.commands.find(({ cmd }) =>
        cmd.find(v => v.toLowerCase() == requestedCommand.toLowerCase())
      );
      if (command) {
        if (command.internal) return;

        const [name, desc] = this.makeField(prefix, command);
        const embed = new Embed({ title: 'Help: ' + name, description: desc });

        return event.reply(embed);
      } else return event.reply(Embed.error('No help found for ' + requestedCommand).ephemeral());
    } else {
      const embed = new Embed({
        title: 'Help',
        description: `Prefix for ${event.guild.name} is \`${prefix}\`\n\`${prefix}help <cmd>\` or \`/help <cmd>\` will show \`cmd\`'s help text`,
      }).setDefaultAuthor();

      for (const command of client.commands.filter(c => !c.internal))
        embed.addField(...this.makeField(prefix, command, true));
      embed.addField(...this.makeField(prefix, _.last(client.commands) as Command));

      try {
        const dm = await event.user?.createDM();
        embed.send(dm);
        event.reply(Embed.success('Help message sent, check your DMs').ephemeral());
      } catch (err) {
        event.reply(Embed.error('Error sending DM', codeBlock(err)).ephemeral());
      }
    }
  }

  makeField(
    prefix: string,
    command: Command,
    trailingNewline = false
  ): [name: string, value: string, inline: boolean] {
    const fieldName = command.cmd.map(cmd => `\`${prefix}${cmd}\``).join(', ');

    const fieldValue = command.docs.map(this.formatFieldValue).join('\n');

    return [fieldName, fieldValue + (trailingNewline ? '\n\u200b' : ''), false];
  }

  formatFieldValue(docs: CommandDocs[number]): string {
    const usage = Array.isArray(docs.usage)
      ? docs.usage.map(v => `\`${v}\``).join('\n')
      : `\`${docs.usage}\``;

    return `${usage}\n${docs.description}`;
  }
}
