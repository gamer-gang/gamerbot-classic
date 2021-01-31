import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class HypixelPlayer {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'date' })
  createdAt = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt = new Date();

  @Property({ type: 'string' })
  userId!: string;

  @Property({ type: 'string' })
  hypixelUsername!: string;
}
