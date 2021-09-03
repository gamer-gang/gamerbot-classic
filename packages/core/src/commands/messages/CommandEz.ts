import { resolvePath, sanitize } from '@gamerbot/util';
import { Message } from 'discord.js';
import fse from 'fs-extra';
import yaml from 'js-yaml';
import { ChatCommand, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';

const replacements = (
  yaml.load(fse.readFileSync(resolvePath('assets/ez.yaml')).toString()) as {
    replacements: string[];
  }
).replacements;

export class CommandEz extends ChatCommand {
  name = ['ez'];
  help = [
    {
      usage: 'ez',
      description: 'ez',
    },
  ];
  data: CommandOptions = {
    description: 'ez',
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const replacement = replacements[Math.floor(Math.random() * replacements.length)];
    const guildMember = event.guild?.members.cache.get(event.user.id);

    if (event.isMessage()) event.message.delete();

    return event.reply(
      `*${sanitize(guildMember?.nickname ?? guildMember?.user.username)} says:* ${replacement}`
    );
  }
}
