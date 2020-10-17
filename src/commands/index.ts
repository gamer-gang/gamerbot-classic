import { Message } from 'discord.js';
import yargsParser from 'yargs-parser';

import { CmdArgs } from '../types';
import { CommandAbout } from './general/about';
import { CommandHelp } from './general/help';
import { CommandUptime } from './general/uptime';
import { CommandGif } from './media/gif';
import { CommandApiMessage } from './messages/apimessage';
import { CommandCowsay } from './messages/cowsay';
import { CommandEcho } from './messages/echo';
import { CommandEz } from './messages/ez';
import { CommandJoke } from './messages/joke';
import { CommandBan } from './moderation/ban';
import { CommandConfig } from './moderation/config/config';
import { CommandPurge } from './moderation/purge';
import { CommandRole } from './moderation/role';
import { CommandUnban } from './moderation/unban';
import { CommandPause } from './music/pause';
import { CommandPlay } from './music/play';
import { CommandQueue } from './music/queue';
import { CommandResume } from './music/resume';
import { CommandSkip } from './music/skip';
import { CommandStop } from './music/stop';
import { CommandLorem } from './spam/lorem';
import { CommandRandom } from './spam/random';
import { CommandSpam } from './spam/spam';
import { CommandStats } from './stats/stats';

export interface Command {
  cmd: string | string[];
  yargsSchema?: yargsParser.Options;
  docs: CommandDocs;
  executor: (args: CmdArgs) => Promise<void | Message>;
}

export type CommandDocs = Docs | Docs[];

interface Docs {
  usage: string | string[];
  description: string;
}

export const commands: Command[] = [
  // general
  new CommandAbout(),
  new CommandHelp(),
  new CommandUptime(),

  // moderation
  new CommandBan(),
  new CommandConfig(),
  new CommandPurge(),
  new CommandRole(),
  new CommandUnban(),

  // messages
  new CommandApiMessage(),
  new CommandCowsay(),
  new CommandEcho(),
  new CommandEz(),
  new CommandJoke(),

  // spammable
  new CommandLorem(),
  new CommandRandom(),
  new CommandSpam(),

  // media
  new CommandGif(),

  // stats
  new CommandStats(),

  // music
  new CommandPlay(),
  new CommandPause(),
  new CommandQueue(),
  new CommandSkip(),
  new CommandStop(),
  new CommandResume(),

  // games
  // new CommandLiarsDice(),
];
