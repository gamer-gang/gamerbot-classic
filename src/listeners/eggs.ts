import { Message, PartialMessage } from 'discord.js';
import fse from 'fs-extra';

import { setPresence } from '..';
import { Config } from '../entities/Config';
import { CmdArgs } from '../types';
import { resolvePath } from '../util';

type EventMessage = Message | PartialMessage;

/** case insensitive */
const include = (msg: EventMessage, content: string) =>
  msg.content?.toLowerCase().includes(content);

const EGGFILE = resolvePath('data/eggcount.txt');

fse.ensureFileSync(EGGFILE);
let eggCount: number = parseInt(fse.readFileSync(EGGFILE).toString('utf-8')) || 0;

export const get = (): number => eggCount;
export const increment = (deltaEggs: number): void => set(eggCount + deltaEggs);
export const set = (count: number): void => {
  if (eggCount === count) return;
  eggCount = count;
  fse.writeFile(EGGFILE, eggCount.toString());
  setPresence();
};

export const onMessage = (msg: EventMessage, config: Config) => (): void => {
  if (
    config.egg &&
    msg.content?.toLowerCase().includes('egg') &&
    !msg.content?.startsWith('$egg')
  ) {
    msg.react('🥚');
    increment(1);
  }
};

export const onMessageDelete = (em: CmdArgs['em']) => async (msg: EventMessage): Promise<void> => {
  const config = await em.findOne(Config, { guildId: msg.guild?.id as string });
  if (!config || msg.author?.bot || !config.egg) return;

  if (config.egg && include(msg, 'egg') && !msg.content?.startsWith('$egg')) increment(-1);
};

export const onMessageUpdate = (em: CmdArgs['em']) => async (
  prev: EventMessage,
  next: EventMessage
): Promise<void> => {
  const config = await em.findOne(Config, { guildId: next.guild?.id as string });
  if (!config || next.author?.bot || !config.egg) return;

  if (!include(prev, 'egg') && include(next, 'egg') && !next.content?.startsWith('$egg')) {
    next.react('🥚');
    increment(1);
  } else if (include(prev, 'egg') && !include(next, 'egg')) {
    try {
      next.reactions.cache.get('🥚')?.remove();
      increment(-1);
    } catch {
      // no
    }
  }
};
