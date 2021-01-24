import { Message } from 'discord.js';
import fse from 'fs-extra';
import yaml from 'js-yaml';

import { Command } from '..';
import { Context } from '../../types';
import { resolvePath, sanitize } from '../../util';

const replacements = (yaml.load(fse.readFileSync(resolvePath('assets/ez.yaml')).toString()) as {
  replacements: string[];
}).replacements;

export class CommandEz implements Command {
  cmd = 'ez';
  docs = {
    usage: 'ez',
    description: 'ez',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg } = context;

    const replacement = replacements[Math.floor(Math.random() * replacements.length)];
    const guildMember = msg.guild?.members.cache.get(msg.author?.id as string);

    msg.delete();
    return msg.channel.send(
      `*${sanitize(guildMember?.nickname ?? guildMember?.user.username)} says:* ${replacement}`
    );
  }
}
