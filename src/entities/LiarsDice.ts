import { Collection, Entity, ManyToOne, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class LiarsDice {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'date' })
  createdAt = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt = new Date();

  @Property({ type: 'text' })
  guildId!: string;

  @Property({ type: 'text' })
  gameCode!: string;

  @Property({ type: 'text' })
  creatorId!: string;

  @Property({ type: 'number', default: 6 })
  diceSides!: number;

  @Property({ type: 'number', default: 5 })
  diceAmount!: number;

  @OneToMany(() => LiarsDicePlayer, player => player.game)
  players = new Collection<LiarsDicePlayer>(this);

  @Property({ type: 'text[]' })
  playerOrder!: string[];

  @Property({ type: 'number', default: 0 })
  roundNumber!: number;

  @Property({ type: 'text', nullable: true })
  currentBidder!: string;
}

@Entity()
export class LiarsDicePlayer {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'date' })
  createdAt = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt = new Date();

  @Property({ type: 'text' })
  playerId!: string;

  @ManyToOne({ entity: () => LiarsDice })
  game!: LiarsDice;

  @Property({ type: 'number[]' })
  hand!: number[];
}
