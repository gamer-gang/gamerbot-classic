import { Message, TextChannel, VoiceChannel, VoiceConnection } from 'discord.js';
import { Duration, Video } from 'simple-youtube-api';
import { Embed, formatDuration, getTrackUrl, toDurationSeconds } from '../util';

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

// export interface GuildQueue {
//   tracks: Track[];
//   voiceChannel?: VoiceChannel;
//   textChannel?: TextChannel;
//   voiceConnection?: VoiceConnection;
//   playing: boolean;
//   paused: boolean;
//   loop: LoopMode;
//   current: {
//     index: number;
//     startTime?: Date;
//     pauseTime?: Date;
//     embed?: Message;
//     embedInterval?: NodeJS.Timeout;
//   };
// }

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
    if (this.tracks.find(v => v.type === 'youtube' && v.data.livestream)) return '?';

    const totalDurationSeconds = this.tracks
      .map(t => toDurationSeconds(t.data.duration as Duration))
      .reduce((a, b) => a + Math.round(b), 0);

    return formatDuration(isNaN(totalDurationSeconds) ? 0 : totalDurationSeconds);
  }

  async updateNowPlaying(
    { end = false }: { end?: boolean } = { end: false }
  ): Promise<void | Message> {
    if (this.tracks.length === 0 || this.tracks[this.index] == undefined)
      throw new Error('track is null nerd');

    const track = this.tracks[this.index];

    const embed = new Embed({
      author: {
        name: `${!this.paused && !end ? 'Now Playing' : 'Not Playing'} ${this.loopSymbol}`,
      },
      description: `**[${track.data.title}](${getTrackUrl(track)})** (${
        track.type === 'spotify'
          ? 'Spotify'
          : track.type === 'youtube'
          ? track.data.livestream
            ? 'Livestream'
            : 'YouTube'
          : 'File'
      })`,
    });

    if (track.type === 'youtube')
      embed
        .setThumbnail(track.data.thumbnails.maxres.url)
        .addField(
          'Channel',
          `[${track.data.channel.title}](https://youtube.com/channel/${track.data.channel.id})`,
          true
        );
    else if (track.type === 'spotify')
      embed
        .setThumbnail(track.data.cover.url)
        .addField(
          'Artist',
          track.data.artists
            .map(a => `[${a.name}](https://open.spotify.com/artist/${a.id})`)
            .join(', '),
          true
        );

    embed.addField('Requested by', `<@!${track.requesterId}>`, true);

    return this.embed?.edit(embed);
  }
}
