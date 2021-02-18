import { Message, TextChannel, VoiceChannel, VoiceConnection } from 'discord.js';
import he from 'he';
import { Duration, Video } from 'simple-youtube-api';
import { Readable } from 'stream';
import yts from 'yt-search';
import ytdl from 'ytdl-core';
import { client } from '../providers';
import { Embed, formatDuration, toDuration, toDurationSeconds } from '../util';

export type TrackType = 'youtube' | 'file' | 'spotify';

export type BaseTrack = {
  requesterId: string;
};

export interface BaseTrackData {
  title: string;
  duration: Duration;
}

export abstract class Track {
  internalType = 'unknown';
  data: BaseTrackData = {
    title: 'Unknown',
    duration: toDuration(0, 'seconds'),
  };

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

  get title(): string {
    return he.decode(this.data.title);
  }

  get coverUrl(): string | undefined {
    return;
  }

  get duration(): string {
    return formatDuration(this.data.duration);
  }
}

export class YoutubeTrack extends Track {
  internalType = 'youtube' as const;
  livestream: boolean;

  constructor(requesterId: string, public data: Omit<Video, 'fetch'>) {
    super(requesterId);
    this.livestream =
      (this.data.raw.snippet as Record<string, string>).liveBroadcastContent === 'live';
  }

  get type(): string {
    return this.livestream ? 'Livestream' : 'YouTube';
  }

  get coverUrl(): string {
    return (this.data.thumbnails.maxres ?? this.data.thumbnails.high ?? this.data.thumbnails.medium)
      ?.url;
  }

  get url(): string {
    return 'https://youtube.com/watch?v=' + this.data.id;
  }

  get authorMarkup(): string {
    return `[${this.data.channel.title}](https://youtube.com/channel/${this.data.channel.id})`;
  }

  get duration(): string {
    return this.livestream ? 'livestream' : formatDuration(this.data.duration);
  }

  async getPlayable(): Promise<Readable> {
    return ytdl(this.data.id ?? this.data.raw.id ?? this.data.url);
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

  get authorMarkup(): string {
    return this.data.artists
      .map(a => `[${a.name}](https://open.spotify.com/artist/${a.id})`)
      .join(', ');
  }

  async getPlayable(): Promise<Readable> {
    const error =
      `could not play **[${this.data.title}](${this.url})**\n` +
      `couldn't find an equivalent video on youtube`;

    const search = await yts({
      query: `${this.data.title} ${this.data.artists.map(a => a.name).join(' ')} topic`,
      category: 'music',
    });
    if (!search.videos.length) throw new Error(error);
    const video = await client.youtube.getVideo(search.videos[0].url);
    if (!video) throw new Error(error);

    return ytdl(video.id);
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
      toDurationSeconds(this.tracks[this.index].data.duration) -
      Math.floor(
        this.voiceConnection.dispatcher.totalStreamTime - this.voiceConnection.dispatcher.pausedTime
      ) /
        1000
    );
  }

  get length(): string {
    if (this.tracks.find(v => v.isYoutube() && v.livestream)) return '?';

    const totalDurationSeconds = this.tracks
      .map(t => toDurationSeconds(t.data.duration as Duration))
      .reduce((a, b) => a + Math.round(b), 0);

    return formatDuration(isNaN(totalDurationSeconds) ? 0 : totalDurationSeconds);
  }

  async updateNowPlaying(): Promise<void | Message> {
    if (this.tracks.length === 0 || this.tracks[this.index] == undefined)
      throw new Error('track is null nerd');

    const track = this.tracks[this.index];

    const embed = new Embed({
      title: `Now Playing ${this.loopSymbol} ${this.paused ? '⏸️' : ''}`,
      description: `**[${track.data.title}](${track.url})** (${track.type})`,
    });

    if (track.isYoutube())
      embed.setThumbnail(track.coverUrl).addField('Channel', track.authorMarkup, true);
    else if (track.isSpotify())
      embed.setThumbnail(track.coverUrl).addField('Artist', track.authorMarkup, true);

    embed.addField('Requested by', `<@!${track.requesterId}>`, true);

    if (this.embed && !this.embed.deleted) return this.embed.edit(embed);
    else if (this.textChannel) {
      this.embed = await this.textChannel.send(embed);
      return this.embed;
    }

    throw new Error('no text channel set; embed has no where to go');
  }
}
