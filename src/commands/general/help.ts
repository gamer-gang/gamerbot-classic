import { Message } from 'discord.js';
import _ from 'lodash';

import { Command, CommandDocs, commands } from '..';
import { CmdArgs } from '../../types';
import { codeBlock, Embed } from '../../util';

export class CommandHelp implements Command {
  cmd = ['help', 'h'];
  docs = {
    usage: 'help',
    description: 'Show this message.',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args, config } = cmdArgs;

    if (args._[0]) {
      const command = commands.find(({ cmd }) =>
        Array.isArray(cmd)
          ? cmd.find(v => v.toLowerCase() == args._[0].toLowerCase())
          : cmd.toLowerCase() === args._[0].toLowerCase()
      );
      if (command) {
        const [name, desc] = this.makeField(config.prefix, command);
        const embed = new Embed({ title: 'help: ' + name, description: desc });

        return msg.channel.send(embed);
      } else return msg.channel.send(Embed.error('no help found for ' + args._[0]));
    } else {
      const embed = new Embed({
        title: 'help',
        description: "`$cmd --help`, `$cmd -h`, or `$help <cmd>` will show `cmd`'s help text",
      });
      for (const command of _.dropRight(commands))
        embed.addField(...this.makeField(config.prefix, command, true));
      embed.addField(...this.makeField(config.prefix, _.last(commands) as Command));

      try {
        const dm = await msg.author?.createDM();
        dm?.send(embed);
        msg.channel.send(Embed.success('help message sent in DMs'));
      } catch (err) {
        msg.channel.send(Embed.error('error sending DM', codeBlock(err)));
      }
    }
  }

  makeField(
    prefix: string,
    command: Command,
    trailingNewline = false
  ): [name: string, value: string, inline: boolean] {
    const fieldName = Array.isArray(command.cmd)
      ? command.cmd.map(cmd => `\`${prefix}${cmd}\``).join(', ')
      : `\`${prefix}${command.cmd}\``;

    const fieldValue = Array.isArray(command.docs)
      ? command.docs.map(this.formatFieldValue).join('\n')
      : this.formatFieldValue(command.docs);

    return [fieldName, fieldValue + (trailingNewline ? '\n\u200b' : ''), false];
  }

  formatFieldValue(docs: Exclude<CommandDocs, unknown[]>): string {
    const usage = Array.isArray(docs.usage)
      ? docs.usage.map(v => `\`${v}\``).join('\n')
      : `\`${docs.usage}\``;

    return `${usage}\n${docs.description}`;
  }
}
