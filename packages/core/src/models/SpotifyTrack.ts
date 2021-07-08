import { formatDuration } from '@gamerbot/util';
import { Duration } from 'luxon';
import { Readable } from 'stream';
import yts from 'yt-search';
import ytdl from 'ytdl-core';
import { client } from '../providers';
import { Track } from './Track';

export interface SpotifyTrackData {
  title: string;
  artists: (SpotifyApi.ArtistObjectSimplified | SpotifyApi.ArtistObjectFull)[];
  id: string;
  cover: SpotifyApi.ImageObject;
  duration: Duration;
}

// TODO: split spotify track for each track response type
export class SpotifyTrack extends Track {
  internalType = 'spotify' as const;

  constructor(requesterId: string, public data: SpotifyTrackData) {
    super(requesterId);
  }

  get type(): string {
    return 'Spotify';
  }

  get coverUrl(): string {
    return this.data.cover.url;
  }

  get url(): string {
    return 'https://open.spotify.com/track/' + this.data.id;
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

  get authorMarkup(): string {
    return this.data.artists
      .map(a => `[${a.name}](https://open.spotify.com/artist/${a.id})`)
      .join(', ');
  }

  async getPlayable(ytdlOptions: ytdl.downloadOptions = {}): Promise<Readable> {
    const error =
      `could not play **${this.titleMarkup}**\n` + `couldn't find an equivalent video on youtube`;

    const search = await yts({
      query: `${this.data.title} ${this.data.artists.map(a => a.name).join(' ')} topic`,
      category: 'music',
    });
    if (!search.videos.length) throw new Error(error);
    const video = await client.youtube.videos.list({
      part: ['contentDetails', 'snippet'],
      id: [search.videos[0].videoId],
    });
    if (!video || !video.data.items || !video.data.items[0]) throw new Error(error);

    return ytdl(video.data.items[0].id!, ytdlOptions);
  }
}
