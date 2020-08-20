import * as Discord from 'discord.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as YouTube from 'simple-youtube-api';
import { Store } from './store';

export interface GuildConfig {
  prefix: string;
  allowSpam: boolean;
}

export interface GuildQueue {
  videos: Video[];
  voiceChannel?: Discord.VoiceChannel;
  textChannel?: Discord.TextChannel;
  voiceConnection?: Discord.VoiceConnection;
  playing: boolean;
}

export interface Video {
  url: string;
  title: string;
  lengthSeconds: number;
  requesterId: string;
}

export interface CmdArgs {
  msg: Discord.Message | Discord.PartialMessage;
  args: Array<string>;
  cmd: string;
  configStore: Store<GuildConfig>;
  queueStore: Store<GuildQueue>;
  client: Discord.Client;
  youtube: YouTube;
}
