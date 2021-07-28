declare namespace Holotools {
  export interface LiveResponse {
    live: LiveStream[];
    upcoming: UpcomingStream[];
    ended: PastStream[];
    cached: boolean;
  }

  export type Livestream = PastStream | LiveStream | UpcomingStream;

  interface BaseLivestream {
    id: number;
    yt_video_key: string;
    bb_video_id: null;
    title: string;
    thumbnail: string | null;
    live_schedule: string;
    live_start: string | null;
    live_end: string | null;
    live_viewers: number | null;
    channel: Channel;
  }

  interface PastStream extends BaseLivestream {
    status: 'past';
    live_start: string;
    live_end: string;
    live_viewers: null;
  }

  interface LiveStream extends BaseLivestream {
    status: 'live';
    live_start: string;
    live_end: null;
    live_viewers: number;
  }

  interface UpcomingStream extends BaseLivestream {
    status: 'upcoming';
    live_start: null;
    live_end: null;
    live_viewers: null;
  }

  export interface Channel {
    id: number;
    yt_channel_id: string;
    bb_space_id: string | null;
    name: string;
    description: string;
    photo: string;
    published_at: string;
    twitter_link: string;
    view_count: number;
    subscriber_count: number;
    video_count: number;
  }
}
