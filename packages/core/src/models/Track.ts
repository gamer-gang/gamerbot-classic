import { Duration } from 'luxon';
import { Readable } from 'stream';
import ytdl from 'ytdl-core';
import { FileTrack } from './FileTrack';
import { SpotifyTrack } from './SpotifyTrack';
import { YoutubeTrack } from './YoutubeTrack';

export type TrackType = 'youtube' | 'file' | 'spotify';

export type BaseTrack = {
  requesterId: string;
};
export abstract class Track {
  internalType = 'unknown';

  constructor(public requesterId: string) {}

  isYoutube(): this is YoutubeTrack {
    return this.internalType === 'youtube';
  }

  isSpotify(): this is SpotifyTrack {
    return this.internalType === 'spotify';
  }

  isFile(): this is FileTrack {
    return this.internalType === 'file';
  }

  abstract get url(): string | undefined;
  abstract get type(): string;
  abstract getPlayable(ytdlOptions?: ytdl.downloadOptions): Promise<string | Readable>;
  abstract get titleMarkup(): string;
  abstract get title(): string;
  abstract get durationString(): string;
  abstract get duration(): Duration;

  get coverUrl(): string | null | undefined {
    return;
  }
}
