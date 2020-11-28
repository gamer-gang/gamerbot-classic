import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity()
export class GuildInvite {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'date' })
  createdAt = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt = new Date();

  @Property({ type: 'text' })
  guildId!: string;

  @Property({ type: 'text' })
  @Unique()
  code!: string;

  @Property({ type: 'text', nullable: true })
  creatorId?: string;

  @Property({ type: 'text', nullable: true })
  creatorTag?: string;

  @Property({ type: 'number', default: 0 })
  uses!: number;
}
