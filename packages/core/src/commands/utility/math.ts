import { Context } from '@gamerbot/types';
import { Embed } from '@gamerbot/util';
import { Message } from 'discord.js';
import { evaluate } from 'mathjs';
import { Command, CommandDocs } from '..';

export class CommandMath implements Command {
  cmd = ['math', 'calc', 'eval'];
  docs: CommandDocs = {
    usage: 'math <...expression>',
    description:
      'evalulate a mathematical expression or conversion\nyou can wrap your expression in backticks to avoid having to escape characters',
  };
  execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    if (args._.length === 0) return Embed.error('No expression provided').reply(msg);

    let expression = args._.join(' ');

    expression = expression.replace(/^`([^`]+)`$/, '$1').replace(/\\([*_\\])/gi, '$1');

    if (/(?:[`\\])/gi.test(expression))
      return Embed.error('Invalid characters in expression').reply(msg);

    const scope = {};
    let result: any;

    try {
      result = evaluate(expression, scope);
    } catch (err) {
      return Embed.error(err.message).reply(msg);
    }

    const variables = Object.keys(scope)
      .map(k => `${k} => \`${scope[k]}\``)
      .join('\n');

    const embed = new Embed({
      description: `Expression: \`${expression}\`\nResult: \`${result}\`${
        variables ? '\n\n' + variables : ''
      }`,
    });

    return embed.reply(msg);
  }
}
