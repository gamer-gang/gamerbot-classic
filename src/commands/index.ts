import { Message } from 'discord.js';
import fse from 'fs-extra';
import yargsParser from 'yargs-parser';

import { Context } from '../types';
import { resolvePath } from '../util';

export interface Command {
  cmd: string | string[];
  yargsSchema?: yargsParser.Options;
  docs: CommandDocs;
  execute: (args: Context) => Promise<void | Message>;
}

export type CommandDocs = Docs | Docs[];

interface Docs {
  usage: string | string[];
  description: string;
}

export const commands: Command[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let modules: Record<string, any>[];
if (process.env.WEBPACK) {
  const requireContext = require.context('.', true, /\.ts$/);
  modules = requireContext.keys().map(r => requireContext(r));
} else {
  modules = fse.readdirSync(resolvePath('.')).map(file => require(`./${file}`));
}

modules.forEach(mod => {
  const valid = Object.keys(mod).filter(name => /^Command[A-Z].*/.test(name));
  if (valid.length) commands.push(...valid.map(name => new mod[name]()));
});

commands.sort((a, b) => {
  const cmdA = (Array.isArray(a.cmd) ? a.cmd[0] : a.cmd).toLowerCase();
  const cmdB = (Array.isArray(b.cmd) ? b.cmd[0] : b.cmd).toLowerCase();
  return cmdA < cmdB ? -1 : cmdA > cmdB ? 1 : 0;
});
