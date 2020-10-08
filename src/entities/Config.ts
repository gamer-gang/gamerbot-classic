import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';

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
  egg!: boolean
}
