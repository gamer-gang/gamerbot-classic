import { Collection, Entity, ManyToOne, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';
import { Snowflake } from 'discord.js';

@Entity()
export class ReactionRole {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'date' })
  createdAt = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt = new Date();

  @Property({ type: 'text', unique: false })
  guildId!: Snowflake;

  @Property({ type: 'text' })
  messageId!: Snowflake;

  @OneToMany(() => RoleEmoji, roleEmoji => roleEmoji.message)
  roles = new Collection<RoleEmoji>(this);
}

@Entity()
export class RoleEmoji {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'date' })
  createdAt = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt = new Date();

  @ManyToOne({ entity: () => ReactionRole })
  message!: ReactionRole;

  @Property({ type: 'text' })
  roleId!: Snowflake;

  @Property({ type: 'text' })
  emoji!: string;
}
