declare module 'simple-youtube-api' {
  namespace YouTube {
    export interface Thumbnail {
      url: string;
      width: number;
      height: number;
    }
    export interface Duration {
      hours?: number;
      minutes?: number;
      seconds?: number;
    }
    export class Channel {
      constructor(youtube: YouTube, data: Record<string, unknown>);
      commentCount?: number;
      country?: string;
      customUrl?: string;
      defaultLanguage?: string;
      description?: string;
      full: boolean;
      hiddenSubscriberCount?: boolean;
      id: string;
      kind: string;
      localized?: Record<string, unknown>;
      publishedAt?: Date;
      raw: Record<string, unknown>;
      relatedPlaylists: {
        likes?: string;
        favorites?: string;
        uploads?: string;
      };
      subscriberCount?: number;
      thumbnails?: Record<string, Thumbnail>;
      title?: string;
      type: string;
      get url(): string;
      videoCount?: number;
      viewCount?: number;
      youtube: YouTube;
      static extractUrl(url: string): string | null;
      fetch(options?: Record<string, unknown>): Channel;
    }
    export class Playlist {
      constructor(youtube: YouTube, data: Record<string, unknown>);
      channel: Channel;
      channelTitle?: string;
      defaultLanguage?: string;
      description?: string;
      embedHTML: string;
      id: string;
      length: number;
      localized?: Record<string, unknown>;
      privacy: string;
      publishedAt?: Date;
      thumbnails?: Record<string, Thumbnail>;
      title?: string;
      type: string;
      url: string;
      videos: Array<Video>;
      youtube: YouTube;
      static extractID(url: string): string | null;
      fetch(options?: Record<string, unknown>): Playlist;
      getVideos(limit?: number, options?: Record<string, unknown>): Promise<Video[]>;
    }
    export class Video {
      constructor(youtube: YouTube, data: Record<string, unknown>);
      channel: Channel;
      description?: string;
      duration: Duration;
      durationSeconds?: number;
      full: boolean;
      id: string;
      kind: string;
      maxRes: Record<string, unknown>;
      publishedAt: Date;
      raw: Record<string, unknown>;
      shortURL: string;
      thumbnails: Record<'default' | 'medium' | 'high' | 'standard' | 'maxres', Thumbnail>;
      title: string;
      type: string;
      url: string;
      videos: Array<Video>;
      youtube: YouTube;
      static extractID(url: string): string | null;
      fetch(options?: Record<string, unknown>): Video;
    }
  }

  class YouTube {
    // static Video: typeof Video;
    // static Playlist: typeof Playlist;
    // static Channel: typeof Channel;
    static util: {
      parseUrl(url: string): Record<string, unknown>;
    };

    constructor(key: string);
    key?: string;
    getChannel(url: string, options?: Record<string, unknown>): Promise<YouTube.Channel | null>;
    getChannelByID(id: string, options?: Record<string, unknown>): Promise<YouTube.Channel | null>;
    getPlaylist(url: string, options?: Record<string, unknown>): Promise<YouTube.Playlist | null>;
    getPlaylistByID(
      id: string,
      options?: Record<string, unknown>
    ): Promise<YouTube.Playlist | null>;
    getVideo(url: string, options?: Record<string, unknown>): Promise<YouTube.Video | null>;
    getVideoByID(id: string, options?: Record<string, unknown>): Promise<YouTube.Video | null>;
    search(
      query: string,
      limit?: number,
      options?: Record<string, unknown>
    ): Promise<(YouTube.Video | YouTube.Playlist | YouTube.Channel | null)[]>;
    searchChannels(
      query: string,
      limit?: number,
      options?: Record<string, unknown>
    ): Promise<YouTube.Channel[]>;
    searchPlaylists(
      query: string,
      limit?: number,
      options?: Record<string, unknown>
    ): Promise<YouTube.Playlist[]>;
    searchVideos(
      query: string,
      limit?: number,
      options?: Record<string, unknown>
    ): Promise<YouTube.Video[]>;
  }
  export = YouTube;
}
