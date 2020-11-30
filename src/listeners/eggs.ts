import { EntityManager } from '@mikro-orm/postgresql';
import { Message, PartialMessage, User } from 'discord.js';

import { setPresence } from '..';
import { Config } from '../entities/Config';
import { EggLeaderboard } from '../entities/EggLeaderboard';
import { Gamerbot } from '../gamerbot';

const eggy = (msg: Message | PartialMessage, prefix: string) =>
  ['🥚', 'egg'].some(egg => msg.content?.toLowerCase().includes(egg)) &&
  !msg.content?.toLowerCase().startsWith(prefix);

const cooldown = 30000;

class EggCooldown {
  constructor(public timestamp: number, public warned = false) {}

  expired(): boolean {
    return Date.now() > this.timestamp + cooldown;
  }
}

const cooldowns: Record<string, EggCooldown> = {};

const getEggsFromDB = async (em: Gamerbot['em']) => {
  const builder = (em as EntityManager).createQueryBuilder(EggLeaderboard);
  const eggsObjects: { eggs: number }[] = await builder.select('eggs').execute();

  return eggsObjects.reduce((a, b) => ({ eggs: a.eggs + b.eggs }), { eggs: 0 }).eggs;
};

let eggCount: number;

const getLeaderboardEntry = async (user: User, em: Gamerbot['em']) => {
  const entry = await (async (user: User) => {
    const existing = await em.findOne(EggLeaderboard, { userId: user.id });
    if (existing) {
      if (user.tag !== existing.userTag) existing.userTag = user.tag;
      return existing;
    }

    const fresh = em.create(EggLeaderboard, { userId: user.id, userTag: user.tag });
    await em.persistAndFlush(fresh);
    return await em.findOneOrFail(EggLeaderboard, { userId: user.id });
  })(user);

  return entry;
};

export const get = async (client: Gamerbot): Promise<number> => {
  return (eggCount ??= await getEggsFromDB(client.em));
};

const grantEgg = async (msg: Message | PartialMessage, em: Gamerbot['em']) => {
  msg.react('🥚');
  eggCount++;
  setPresence();

  const lb = await getLeaderboardEntry(msg.author as User, em);
  lb.eggs++;
  em.flush();
};

export const onMessage = (
  msg: Message | PartialMessage,
  config: Config,
  em: Gamerbot['em']
) => async (): Promise<void | Message> => {
  if (!config || msg.author?.bot || !config.egg) return;

  if (eggy(msg, config.prefix)) {
    if (cooldowns[msg.author?.id as string]) {
      const cooldown = cooldowns[msg.author?.id as string];
      if (!cooldown.warned) {
        cooldown.warned = true;
        return msg.channel.send(`<@${msg.author?.id}> enter the chill zone`);
      }

      if (!cooldown.expired()) return;
    }

    cooldowns[msg.author?.id as string] = new EggCooldown(Date.now());
    grantEgg(msg, em);
    return;
  }
};
