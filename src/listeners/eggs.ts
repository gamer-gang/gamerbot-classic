import { EntityManager } from '@mikro-orm/postgresql';
import { Message, PartialMessage, User } from 'discord.js';

import { setPresence } from '..';
import { Config } from '../entities/Config';
import { EggLeaderboard } from '../entities/EggLeaderboard';
import { Context } from '../types';

const eggy = (msg: Message | PartialMessage, prefix: string) =>
  ['🥚', 'egg'].some(egg => msg.content?.toLowerCase().includes(egg)) &&
  !msg.content?.toLowerCase().startsWith(prefix);

const cooldown = 5000;

class EggCooldown {
  constructor(public timestamp: number, public warned = false) {}

  expired(): boolean {
    return Date.now() > this.timestamp + cooldown;
  }
}

const cooldowns: Record<string, EggCooldown> = {};

const getEggsFromDB = async (em: Context['em']) => {
  const builder = (em as EntityManager).createQueryBuilder(EggLeaderboard);
  const eggsObjects: { eggs: number }[] = await builder.select('eggs').execute();

  return eggsObjects.reduce((a, b) => ({ eggs: a.eggs + b.eggs }), { eggs: 0 }).eggs;
};

let eggCount: number;

const getLeaderboardEntry = async (user: User, em: Context['em']) => {
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

export const get = async (em: Context['em']): Promise<number> => {
  if (eggCount == null) eggCount = await getEggsFromDB(em);
  return eggCount;
};

export const onMessage = (
  msg: Message | PartialMessage,
  config: Config,
  em: Context['em']
) => async (): Promise<void> => {
  if (!config || msg.author?.bot || !config.egg) return;

  if (eggy(msg, config.prefix)) {
    if (!cooldowns[msg.author?.id as string]) {
      cooldowns[msg.author?.id as string] = new EggCooldown(Date.now());
      grantEgg(msg, em);
      return;
    } else {
      const cooldown = cooldowns[msg.author?.id as string];
      if (cooldown.expired()) {
        grantEgg(msg, em);
      } else if (!cooldown.warned) {
        msg.channel.send(`<@${msg.author?.id}> enter the chill zone`);
        cooldown.warned = true;
      }
    }
  }
};

const grantEgg = async (msg: Message | PartialMessage, em: Context['em']) => {
  msg.react('🥚');

  eggCount++;
  setPresence();

  const lb = await getLeaderboardEntry(msg.author as User, em);
  lb.eggs++;

  em.flush();
};

// export const onMessageDelete = (em: Context['em']) => async (
//   msg: Message | PartialMessage
// ): Promise<void> => {
//   const config = await em.findOne(Config, { guildId: msg.guild?.id as string });
//   if (!config || msg.author?.bot || !config.egg) return;

//   if (eggy(msg, config.prefix)) {
//     eggCount--;
//     setPresence();

//     const lb = await getLeaderboardEntry(msg.author as User, em);
//     lb.eggs--;

//     em.flush();
//   }
// };

// export const onMessageUpdate = (em: Context['em']) => async (
//   prev: Message | PartialMessage,
//   next: Message | PartialMessage
// ): Promise<void> => {
//   const config = await em.findOne(Config, { guildId: next.guild?.id as string });
//   if (!config || next.author?.bot || !config.egg) return;

//   if (!eggy(prev, config.prefix) && eggy(next, config.prefix)) {
//     next.react('🥚');

//     eggCount++;
//     setPresence();

//     const lb = await getLeaderboardEntry(next.author as User, em);
//     lb.eggs++;

//     em.flush();
//   } else if (eggy(prev, config.prefix) && !eggy(next, config.prefix)) {
//     next.reactions.cache.get('🥚')?.users.remove(client.user as User);

//     eggCount--;
//     setPresence();

//     const lb = await getLeaderboardEntry(next.author as User, em);
//     lb.eggs--;

//     em.flush();
//   }
// };
