import * as Discord from 'discord.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as YouTube from 'simple-youtube-api';
import { Store } from './store';

export interface GuildConfig {
  prefix: string;
  allowSpam: boolean;
  cowPrefix: string;
}

export interface GuildQueue {
  videos: Video[];
  voiceChannel?: Discord.VoiceChannel;
  textChannel?: Discord.TextChannel;
  voiceConnection?: Discord.VoiceConnection;
  playing: boolean;
}

export interface GuildGames {
  liarsDice: Record<string, LiarsDiceGame>;
}

export interface LiarsDiceGame {
  players: Record<string, LiarsDicePlayer>;
  creatorId: string;
  metadata: LiarsDiceMetadata;
  reactionCollector?: GameReactionCollector;
}

export interface LiarsDiceMetadata {
  diceAmount: number;
  diceSides: number;
}

export interface DiceObject {
  sides: number;
  value: number;
}

export interface LiarsDicePlayer {
  dice: DiceObject[];
}

export type GameReactionCollector = Discord.ReactionCollector & {
  gameCode?: string;
};

export interface Video {
  url: string;
  title: string;
  lengthSeconds: number;
  requesterId: string;
}

export interface CmdArgs {
  msg: Discord.Message | Discord.PartialMessage;
  args: string[];
  flags: Record<string, number>;
  cmd: string;
  configStore: Store<GuildConfig>;
  queueStore: Store<GuildQueue>;
  gameStore: Store<GuildGames>;
  client: Discord.Client;
  youtube: YouTube;
}
