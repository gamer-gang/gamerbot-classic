import { Message, TextChannel, VoiceChannel, VoiceConnection } from 'discord.js';
import { Video as YTVideo } from 'simple-youtube-api';

export interface Video extends YTVideo {
  requesterId: string;
}

export interface GuildQueue {
  videos: Video[];
  voiceChannel?: VoiceChannel;
  textChannel?: TextChannel;
  voiceConnection?: VoiceConnection;
  playing: boolean;
  playingEmbedMessage?: Message;
}
