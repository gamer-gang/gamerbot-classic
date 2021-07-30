import { PlayableType } from '@gamerbot/common';
import { Duration } from 'luxon';
import { FileTrack } from './FileTrack';
import { SpotifyTrack } from './SpotifyTrack';
import { YoutubeTrack } from './YoutubeTrack';

export type TrackType = 'youtube' | 'file' | 'spotify';

export type BaseTrack = {
  requesterId: string;
};
export abstract class Track {
  internalType = 'unknown';

  isYoutube(): this is YoutubeTrack {
    return this.internalType === 'youtube';
  }

  isSpotify(): this is SpotifyTrack {
    return this.internalType === 'spotify';
  }

  isFile(): this is FileTrack {
    return this.internalType === 'file';
  }

  requesterId?: string;

  abstract get url(): string | undefined;
  abstract get type(): string;
  abstract getPlayable(): Promise<[type: PlayableType, url: string]>;
  abstract get titleMarkup(): string;
  abstract get title(): string;
  abstract get durationString(): string;
  abstract get duration(): Duration;

  get coverUrl(): string | null | undefined {
    return;
  }
}
