import { Message, TextChannel, VoiceChannel, VoiceConnection } from 'discord.js';
import { youtube_v3 } from 'googleapis';
import he from 'he';
import { Duration } from 'luxon';
import { Readable } from 'stream';
import yts from 'yt-search';
import ytdl from 'ytdl-core';
import { client, getLogger } from '../providers';
import { Embed, formatDuration, normalizeDuration } from '../util';

const ytdlOptions: ytdl.downloadOptions = {
  highWaterMark: 1 << 25,
  filter: 'audioonly',
};

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
  abstract getPlayable(): Promise<string | Readable>;
  abstract get titleMarkup(): string;
  abstract get title(): string;
  abstract get durationString(): string;
  abstract get duration(): Duration;

  get coverUrl(): string | null | undefined {
    return;
  }
}

export class YoutubeTrack extends Track {
  internalType = 'youtube' as const;
  livestream: boolean;

  constructor(requesterId: string, public data: youtube_v3.Schema$Video) {
    super(requesterId);
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

  async getPlayable(): Promise<Readable> {
    if (!this.data.id) throw new Error(`video '${this.data.snippet?.title}' has no video id`);
    return ytdl(this.data.id, ytdlOptions);
  }
}

export interface FileTrackData {
  url: string;
  title: string;
  duration: Duration;
}

export class FileTrack extends Track {
  internalType = 'file' as const;

  constructor(requesterId: string, public data: FileTrackData) {
    super(requesterId);
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

  async getPlayable(): Promise<string> {
    return this.data.url;
  }
}
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

  async getPlayable(): Promise<Readable> {
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

export type LoopMode = 'none' | 'one' | 'all';

export class Queue {
  tracks: Track[] = [];
  voiceChannel?: VoiceChannel;
  textChannel?: TextChannel;
  voiceConnection?: VoiceConnection;
  playing = false;
  paused = false;
  loop: LoopMode = 'none';
  index = 0;
  embed?: Message;
  embedInterval?: NodeJS.Timeout;

  constructor(public guildId: string) {}

  get loopSymbol(): string {
    return this.loop === 'all' ? '🔁' : this.loop === 'one' ? '🔂' : '';
  }

  get remainingTime(): number {
    if (!this.playing || !this.voiceConnection?.dispatcher) return 0;
    return (
      this.tracks[this.index].duration.as('seconds') -
      Math.floor(
        this.voiceConnection.dispatcher.totalStreamTime - this.voiceConnection.dispatcher.pausedTime
      ) /
        1000
    );
  }

  get length(): string {
    if (this.tracks.find(v => v.isYoutube() && v.livestream)) return '?';

    const totalDurationSeconds = this.tracks
      .map(t => t.duration.as('seconds'))
      .reduce((a, b) => a + Math.round(b), 0);

    return formatDuration(isNaN(totalDurationSeconds) ? 0 : totalDurationSeconds);
  }

  async updateNowPlaying(): Promise<void | Message> {
    const logger = getLogger(`GUILD ${this.guildId}`);
    logger.debug(`updating now playing embed`);
    if (this.tracks.length === 0 || this.tracks[this.index] == undefined)
      throw new Error('track is null nerd');

    const track = this.tracks[this.index];

    const embed = new Embed({
      title: `Now Playing ${this.loopSymbol} ${this.paused ? '⏸️' : ''}`,
      description: `**${track.titleMarkup}** (${track.type})`,
    });

    if (track.isYoutube()) {
      track.coverUrl && embed.setThumbnail(track.coverUrl);
      embed.addField('Channel', track.authorMarkup, true);
    } else if (track.isSpotify()) {
      embed.setThumbnail(track.coverUrl).addField('Artist', track.authorMarkup, true);
    }

    embed.addField('Duration', track.durationString, true);
    embed.addField('Requested by', `<@${track.requesterId}>`, true);

    if (this.embed && !this.embed.deleted) {
      logger.debug(`existing non-deleted embed, editing it`);
      return this.embed.edit(embed);
    } else if (this.textChannel) {
      logger.debug(`sending new now playing embed`);
      this.embed = await this.textChannel.send(embed);
      return this.embed;
    }

    throw new Error('no text channel set; embed has nowhere to go');
  }
}
