import { Collection, Entity, ManyToOne, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';

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
  messageId!: string;

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
  roleId!: string;

  @Property({ type: 'text' })
  emoji!: string;
}
