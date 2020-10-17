import { Message } from 'discord.js';

import { Command, CommandDocs, commands } from '..';
import { Embed } from '../../embed';
import { CmdArgs } from '../../types';

export class CommandHelp implements Command {
  cmd = ['help', 'h'];
  docs = {
    usage: 'help',
    description: 'Show this message.',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const {
      msg,
      args,
      em,
      config: { prefix },
    } = cmdArgs;

    const search = args._[0];
    if (search) {
      const find = commands.find(({ cmd }) =>
        Array.isArray(cmd)
          ? cmd.find(v => v.toLowerCase() == search.toLowerCase())
          : cmd.toLowerCase() === search.toLowerCase()
      );
      if (find) {
        const [name, desc] = this.makeField(prefix, find);
        const embed = new Embed().setTitle('help: ' + name).setDescription(desc);

        return msg.channel.send(embed);
      } else return msg.channel.send('no help found for ' + search);
    } else {
      const embed = new Embed().setTitle('help!!!!!!1');
      for (const command of commands) embed.addField(...this.makeField(prefix, command));

      try {
        const dm = await msg.author?.createDM();
        dm?.send(embed);
        msg.channel.send('help message sent in DMs');
      } catch (err) {
        msg.channel.send('error sending DM, err message:\n```\n' + err + '\n```');
      }
    }
  }

  makeField(prefix: string, command: Command): [name: string, value: string, inline: boolean] {
    const fieldName = Array.isArray(command.cmd)
      ? command.cmd.map(cmd => `\`${prefix}${cmd}\``).join(', ')
      : `\`${prefix}${command.cmd}\``;

    const fieldValue = Array.isArray(command.docs)
      ? command.docs.map(this.formatFieldValue).join('\n\n')
      : this.formatFieldValue(command.docs);

    return [fieldName, fieldValue + '\n', false];
  }

  formatFieldValue(docs: Exclude<CommandDocs, unknown[]>): string {
    const usage = Array.isArray(docs.usage)
      ? docs.usage.map(v => `\`${v}\``).join('\n')
      : `\`${docs.usage}\``;

    return `${usage}\n${docs.description}`;
  }
}
