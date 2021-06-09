import { BigIntType, Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity()
export class Config {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'date' })
  createdAt = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt = new Date();

  @Property({ type: 'text' })
  @Unique()
  guildId!: string;

  @Property({ type: 'text', default: '$' })
  prefix!: string;

  @Property({ type: 'boolean', default: false })
  allowSpam!: boolean;

  @Property({ type: 'boolean', default: true })
  egg!: boolean;

  @Property({ type: 'text', nullable: true })
  welcomeJson?: string;

  @Property({ type: 'text', nullable: true })
  welcomeChannelId?: string;

  @Property({ type: BigIntType, default: 0 })
  logSubscribedEvents!: bigint;

  @Property({ type: 'text', nullable: true })
  logChannelId?: string;
}
