import { Message } from 'discord.js';
import fse from 'fs-extra';
import yaml from 'js-yaml';

import { Command } from '..';
import { CmdArgs } from '../../types';
import { resolvePath } from '../../util';

const replacements = yaml.load(fse.readFileSync(resolvePath('assets/ez.yaml')).toString())
  .replacements as string[];

export class CommandEz implements Command {
  cmd = 'ez';
  docs = {
    usage: 'ez',
    description: 'ez',
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg } = cmdArgs;

    const replacement = replacements[Math.floor(Math.random() * replacements.length)];
    const guildMember = msg.guild?.members.cache.get(msg.author?.id as string);

    msg.delete();
    return msg.channel.send(
      `*${(guildMember?.nickname ?? guildMember?.user.username)
        ?.replace(/\\/g, '\\\\')
        .replace(/\*/g, '\\*')
        .replace(/_/g, '\\_')
        .replace(/`/g, '\\`')} says:* ${replacement}`
    );
  }
}
