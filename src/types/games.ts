import { ReactionCollector } from 'discord.js';

export interface GuildGames {
  liarsDice: Record<string, LiarsDiceGame>;
}

export type GameReactionCollector = ReactionCollector & { gameCode?: string };

export interface DiceObject {
  sides: number;
  value: number;
}

export interface LiarsDiceGame {
  players: Record<string, LiarsDicePlayer>;
  creatorId: string;
  metadata: LiarsDiceMetadata;
  roundNumber: number;
}

export interface LiarsDiceMetadata {
  diceAmount: number;
  diceSides: number;
}

export interface LiarsDicePlayer {
  dice: DiceObject[];
}
