import { PlayableType } from '@gamerbot/common';
import { formatDuration } from '@gamerbot/util';
import { Duration } from 'luxon';
import { Track } from './Track';

export interface FileTrackData {
  url: string;
  title: string;
  duration: Duration;
}

export class FileTrack extends Track {
  internalType = 'file' as const;

  constructor(public data: FileTrackData) {
    super();
  }

  get type(): string {
    return 'File';
  }

  get url(): string {
    return this.data.url;
  }

  get title(): string {
    return this.data.title;
  }

  get titleMarkup(): string {
    return `[${this.title}](${this.url})`;
  }

  get durationString(): string {
    return formatDuration(this.duration);
  }

  get duration(): Duration {
    return this.data.duration;
  }

  async getPlayable(): Promise<[type: PlayableType, url: string]> {
    return ['url', this.data.url];
  }
}
