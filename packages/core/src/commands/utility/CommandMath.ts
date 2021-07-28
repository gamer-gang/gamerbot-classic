import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { evaluate } from 'mathjs';
import { Command, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

export class CommandMath extends Command {
  cmd = ['math', 'calc', 'eval'];
  docs: CommandDocs = [
    {
      usage: 'math <...expression>',
      description:
        'evalulate a mathematical expression or conversion\nyou can wrap your expression in backticks to avoid having to escape characters',
    },
  ];
  commandOptions: CommandOptions = {
    description: 'Evaluate a mathematical expression',
    options: [
      {
        name: 'expression',
        description: 'Expression to evaluate',
        type: 'STRING',
        required: true,
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    let expression = event.isInteraction() ? event.options.getString('expression') : event.args;

    if (!expression) return event.reply(Embed.error('No expression provided').ephemeral());

    expression = expression.replace(/^`([^`]+)`$/, '$1').replace(/\\([*_\\])/gi, '$1');

    if (/(?:[`\\])/gi.test(expression))
      return event.reply(Embed.error('Invalid characters in expression').ephemeral());

    const scope = {};
    let result: any;

    try {
      result = evaluate(expression, scope);
    } catch (err) {
      return event.reply(Embed.error(err.message).ephemeral());
    }

    const variables = Object.keys(scope)
      .map(k => `${k} => \`${scope[k]}\``)
      .join('\n');

    const embed = new Embed({
      description: `Expression: \`${expression}\`\nResult: \`${result}\`${
        variables ? '\n\n' + variables : ''
      }`,
    });

    return event.reply(embed);
  }
}
