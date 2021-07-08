import { youtube_v3 } from 'googleapis';
import { GaxiosPromise } from 'googleapis/build/src/apis/youtube';
import _ from 'lodash';
import { getClient } from './_client';

export type Video = youtube_v3.Schema$Video;
export type VideoParams = youtube_v3.Params$Resource$Videos$List;
export type VideoList = youtube_v3.Schema$VideoListResponse;

export type Channel = youtube_v3.Schema$Channel;
export type ChannelParams = youtube_v3.Params$Resource$Channels$List;
export type ChannelList = youtube_v3.Schema$ChannelListResponse;

// export type Comment = youtube_v3.Schema$Comment;
// export type CommentParams = youtube_v3.Params$Resource$Comments$List;
// export type CommentList = youtube_v3.Schema$CommentListResponse;

export type Playlist = youtube_v3.Schema$Playlist;
export type PlaylistParams = youtube_v3.Params$Resource$Playlists$List;
export type PlaylistList = youtube_v3.Schema$PlaylistListResponse;

export type PlaylistItem = youtube_v3.Schema$PlaylistItem;
export type PlaylistItemParams = youtube_v3.Params$Resource$Playlistitems$List;
export type PlaylistItemList = youtube_v3.Schema$PlaylistItemListResponse;

export async function getPaginated<T extends Video>(
  endpoint: (params: VideoParams) => GaxiosPromise<VideoList>,
  options?: VideoParams & { [key: string]: any },
  count?: number,
  fetched?: T[],
  pageToken?: string
): Promise<Video[]>;
export async function getPaginated<T extends Channel>(
  endpoint: (params: ChannelParams) => GaxiosPromise<ChannelList>,
  options?: ChannelParams & { [key: string]: any },
  count?: number,
  fetched?: T[],
  pageToken?: string
): Promise<Channel[]>;
export async function getPaginated<T extends PlaylistItem>(
  endpoint: (params: PlaylistItemParams) => GaxiosPromise<PlaylistItemList>,
  options?: PlaylistItemParams & { [key: string]: any },
  count?: number,
  fetched?: T[],
  pageToken?: string
): Promise<PlaylistItem[]>;
// export async function getPaginated<T extends Comment>(
//   endpoint: (params: CommentParams) => GaxiosPromise<CommentList>,
//   count?: number,
//   options?: CommentParams & { [key: string]: any },
//   fetched?: T[],
//   pageToken?: string
// ): Promise<Comment[]>;
export async function getPaginated<T extends Playlist>(
  endpoint: (params: PlaylistParams) => GaxiosPromise<PlaylistList>,
  options?: PlaylistParams & { [key: string]: any },
  count?: number,
  fetched?: T[],
  pageToken?: string
): Promise<Playlist[]>;

export async function getPaginated(
  endpoint: (params: { [key: string]: any }) => GaxiosPromise<any>,
  options: { [key: string]: any } = {},
  count = Infinity,
  fetched: any[] = [],
  pageToken?: string
): Promise<any[]> {
  if (count < 1) throw new Error('Cannot fetch less than 1.');

  const limit = count > 50 ? 50 : count;
  const result = await endpoint({ ...options, pageToken, maxResults: limit });

  const results = [...fetched, ...(result.data.items ?? [])];
  if (result.data.nextPageToken && limit !== count)
    return getPaginated(endpoint, options, count - limit, results, result.data.nextPageToken);

  return results;
}

export const getPlaylistVideos = async (id: string): Promise<[Playlist, Video[]]> => {
  const client = getClient();

  const playlistList = await client.youtube.playlists.list({
    part: ['snippet'],
    id: [id],
  });
  if (!playlistList.data.items?.length)
    throw new Error("Playlist not found (either it doesn't exist or it's private)");

  const playlist = playlistList.data.items[0];

  const playlistItems = await getPaginated<youtube_v3.Schema$PlaylistItem>(
    client.youtube.playlistItems.list.bind(client.youtube.playlistItems),
    { part: ['snippet', 'contentDetails'], playlistId: playlistList.data.items[0]!.id! }
  );

  // fetch videos, 50 at a time
  const chunks = _.chunk(
    playlistItems.map(i => i.contentDetails?.videoId),
    50
  );

  const videos = (
    await Promise.all(
      chunks.map(c =>
        getPaginated<youtube_v3.Schema$Video>(
          client.youtube.videos.list.bind(client.youtube.videos),
          {
            part: ['snippet', 'contentDetails', 'statistics'],
            id: c as string[],
          }
        )
      )
    )
  ).flat(1);

  return [playlist, videos];
};
