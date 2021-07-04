import { Message } from 'discord.js';
import { evaluate } from 'mathjs';
import { Command, CommandDocs } from '..';
import { Context } from '../../types';
import { Embed } from '../../util';

export class CommandMath implements Command {
  cmd = ['math', 'calc', 'eval'];
  docs: CommandDocs = {
    usage: 'math <...expression>',
    description:
      'evalulate a mathematical expression or conversion\nyou can wrap your expression in backticks to avoid having to escape characters',
  };
  execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    if (args._.length === 0) return msg.channel.send(Embed.error('No expression provided'));

    let expression = args._.join(' ');

    expression = expression.replace(/^`([^`]+)`$/, '$1').replace(/\\([*_\\])/gi, '$1');

    if (/(?:[`\\])/gi.test(expression))
      return msg.channel.send(Embed.error('Invalid characters in expression'));

    const scope = {};
    let result: any;

    try {
      result = evaluate(expression, scope);
    } catch (err) {
      return msg.channel.send(Embed.error(err.message));
    }

    const variables = Object.keys(scope)
      .map(k => `${k} => \`${scope[k]}\``)
      .join('\n');

    const embed = new Embed({
      description: `Expression: \`${expression}\`\nResult: \`${result}\`${
        variables ? '\n\n' + variables : ''
      }`,
    });

    return msg.channel.send(embed);
  }
}
