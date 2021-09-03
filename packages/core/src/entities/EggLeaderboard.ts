import { BigIntType, Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { Snowflake } from 'discord.js';

@Entity()
export class EggLeaderboard {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'date' })
  createdAt = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt = new Date();

  @Property({ type: 'string' })
  userId!: Snowflake;

  @Property({ type: 'string' })
  userTag!: string;

  @Property({ type: BigIntType, default: 0 })
  collected!: bigint | string;

  @Property({ type: BigIntType, default: 0 })
  balance!: bigint | string;
}
