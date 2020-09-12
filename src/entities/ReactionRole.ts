import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class ReactionRole {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'date' })
  createdAt = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt = new Date();

  @Property({ type: 'text', unique: false })
  guildId!: string;

  @Property({ type: 'text' })
  roleId!: string;

  @Property({ type: 'text' })
  messageId!: string;

  @Property({ type: 'text' })
  emoji!: string;
}
