import { Message, TextChannel, VoiceChannel, VoiceConnection } from 'discord.js';
import { Duration, Video as YTVideo } from 'simple-youtube-api';

export enum TrackType {
  YOUTUBE,
  FILE,
}

export interface Video extends Omit<YTVideo, 'fetch'> {
  livestream: boolean;
}

export interface URLAudio {
  url: string;
  title: string;
  duration: Duration;
}

export type VideoTrack = {
  type: TrackType.YOUTUBE;
  data: Video;
};

export type URLTrack = {
  type: TrackType.FILE;
  data: URLAudio;
};

export type Track = (VideoTrack | URLTrack) & {
  requesterId: string;
};

export interface GuildQueue {
  tracks: Track[];
  voiceChannel?: VoiceChannel;
  textChannel?: TextChannel;
  voiceConnection?: VoiceConnection;
  playing: boolean;
  current: {
    secondsRemaining: number;
    startTime?: Date;
    pauseTime?: Date;
    embed?: Message;
    embedInterval?: NodeJS.Timeout;
  };
}
