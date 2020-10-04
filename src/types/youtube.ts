import { Message, TextChannel, VoiceChannel, VoiceConnection } from 'discord.js';
import { Video as YTVideo } from 'simple-youtube-api';

export interface Video extends YTVideo {
  requesterId: string;
  livestream: boolean;
}

export interface GuildQueue {
  videos: Video[];
  voiceChannel?: VoiceChannel;
  textChannel?: TextChannel;
  voiceConnection?: VoiceConnection;
  playing: boolean;
  playingEmbedMessage?: Message;
  playingEmbedMessageInterval?: NodeJS.Timeout;
  currentVideoSecondsRemaining: number;
}
