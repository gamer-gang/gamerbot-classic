import { Message, TextChannel, VoiceChannel, VoiceConnection } from 'discord.js';
import { Duration, Video } from 'simple-youtube-api';

export type TrackType = 'youtube' | 'file' | 'spotify';

export type BaseTrack = {
  requesterId: string;
};

export interface YoutubeTrack extends BaseTrack {
  type: 'youtube';
  data: YoutubeTrackData;
}

export interface YoutubeTrackData extends Omit<Video, 'fetch'> {
  livestream: boolean;
}

export interface FileTrack extends BaseTrack {
  type: 'file';
  data: FileTrackData;
}

export interface FileTrackData {
  url: string;
  title: string;
  duration: Duration;
}

export interface SpotifyTrack extends BaseTrack {
  type: 'spotify';
  data: SpotifyTrackData;
}

export interface SpotifyTrackData {
  title: string;
  artists: (SpotifyApi.ArtistObjectSimplified | SpotifyApi.ArtistObjectFull)[];
  id: string;
  cover: SpotifyApi.ImageObject;
  duration: Duration;
}

export type Track = YoutubeTrack | FileTrack | SpotifyTrack;

export type LoopMode = 'none' | 'one' | 'all';

export interface GuildQueue {
  tracks: Track[];
  voiceChannel?: VoiceChannel;
  textChannel?: TextChannel;
  voiceConnection?: VoiceConnection;
  playing: boolean;
  paused: boolean;
  loop: LoopMode;
  current: {
    index: number;
    startTime?: Date;
    pauseTime?: Date;
    embed?: Message;
    embedInterval?: NodeJS.Timeout;
  };
}
