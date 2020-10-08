import { Message, PartialMessage } from 'discord.js';
import fse from 'fs-extra';

import { setPresence } from '..';
import { Config } from '../entities/Config';
import { CmdArgs } from '../types';
import { resolvePath } from '../util';

const EGGFILE = resolvePath('data/eggcount.txt');

fse.ensureFileSync(EGGFILE);
let eggCount: number = parseInt(fse.readFileSync(EGGFILE).toString('utf-8')) || 0;

export const getEggs = (): number => eggCount;
export const setEggs = (count: number): number => (eggCount = count);

export const onMessage = (msg: Message | PartialMessage, config: Config) => (): void => {
  if (
    config.egg &&
    msg.content?.toLowerCase().includes('egg') &&
    !msg.content?.startsWith('$egg')
  ) {
    msg.react('🥚');
    eggCount++;
    fse.writeFile(EGGFILE, eggCount.toString());
    setPresence();
  }
};

export const onMessageDelete = (em: CmdArgs['em']) => async (
  msg: Message | PartialMessage
): Promise<void> => {
  const config = await em.findOne(Config, { guildId: msg.guild?.id as string });
  if (!config) return; // whatever
  if (msg.author?.bot) return;
  if (!config.egg) return;
  if (
    config.egg &&
    msg.content?.toLowerCase().includes('egg') &&
    !msg.content?.startsWith('$egg')
  ) {
    eggCount--;
    fse.writeFile(EGGFILE, eggCount.toString());
    setPresence();
  }
};

export const onMessageUpdate = (em: CmdArgs['em']) => async (
  oldState: Message | PartialMessage,
  newState: Message | PartialMessage
): Promise<void> => {
  const config = await em.findOne(Config, { guildId: newState.guild?.id as string });
  if (!config) return; // whatever
  if (newState.author?.bot) return;
  if (!config.egg) return;
  if (
    !oldState.content?.toLowerCase().includes('egg') &&
    newState.content?.toLowerCase().includes('egg') &&
    !newState.content?.startsWith('$egg')
  ) {
    newState.react('🥚');
    eggCount++;
    fse.writeFile(EGGFILE, eggCount.toString());
    setPresence();
  } else if (
    oldState.content?.toLowerCase().includes('egg') &&
    !newState.content?.toLowerCase().includes('egg')
  ) {
    try {
      newState.reactions.cache.get('🥚')?.remove();
      eggCount--;
      fse.writeFile(EGGFILE, eggCount.toString());
      setPresence();
    } catch {
      // whatever, extra feature anyway
    }
  }
};
