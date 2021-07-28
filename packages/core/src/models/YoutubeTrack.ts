import { formatDuration, normalizeDuration } from '@gamerbot/util';
import { youtube_v3 } from 'googleapis';
import he from 'he';
import { Duration } from 'luxon';
import { Readable } from 'stream';
import ytdl from 'ytdl-core';
import { Track } from './Track';

export class YoutubeTrack extends Track {
  internalType = 'youtube' as const;
  livestream: boolean;

  constructor(public data: youtube_v3.Schema$Video) {
    super();
    this.livestream = this.data.snippet?.liveBroadcastContent === 'live';
  }

  get type(): string {
    return this.livestream ? 'Livestream' : 'YouTube';
  }

  get coverUrl(): string | null | undefined {
    return (
      this.data.snippet?.thumbnails?.maxres ||
      this.data.snippet?.thumbnails?.high ||
      this.data.snippet?.thumbnails?.medium ||
      this.data.snippet?.thumbnails?.standard ||
      this.data.snippet?.thumbnails?.default
    )?.url;
  }

  get url(): string {
    return 'https://youtube.com/watch?v=' + this.data.id;
  }

  get title(): string {
    return he.decode(this.data.snippet?.title ?? '[unknown title]');
  }

  get titleMarkup(): string {
    return `[${this.title}](${this.url})`;
  }

  get authorMarkup(): string {
    return `[${this.data.snippet?.channelTitle}](https://youtube.com/channel/${this.data.snippet?.channelId})`;
  }

  get durationString(): string {
    return this.livestream ? 'livestream' : formatDuration(this.duration);
  }

  get duration(): Duration {
    return normalizeDuration(Duration.fromISO(this.data.contentDetails?.duration as string));
  }

  async getPlayable(ytdlOptions: ytdl.downloadOptions = {}): Promise<Readable> {
    if (!this.data.id) throw new Error(`video '${this.data.snippet?.title}' has no video id`);
    return ytdl(this.data.id, ytdlOptions);
  }
}
