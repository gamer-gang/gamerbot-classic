import { VoiceChannel, TextChannel, VoiceConnection } from 'discord.js';

export interface Video {
  url: string;
  title: string;
  lengthSeconds: number;
  requesterId: string;
}

export interface GuildQueue {
  videos: Video[];
  voiceChannel?: VoiceChannel;
  textChannel?: TextChannel;
  voiceConnection?: VoiceConnection;
  playing: boolean;
}
