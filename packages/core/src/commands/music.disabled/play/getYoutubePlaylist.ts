import { getPlaylistVideos, regExps } from '@gamerbot/util';
import { getLogger } from 'log4js';
import { YoutubeTrack } from '../../../models/YoutubeTrack';

export const getYoutubePlaylist = async (query: string): Promise<YoutubeTrack[]> => {
  try {
    const id = regExps.youtube.playlist.exec(query)![1];

    const [playlist, videos] = await getPlaylistVideos(id);

    // switch (args.sort) {
    //   case 'newest':
    //     videos.sort(
    //       (a, b) =>
    //         DateTime.fromISO(a.snippet?.publishedAt as string).toMillis() -
    //         DateTime.fromISO(b.snippet?.publishedAt as string).toMillis()
    //     );
    //     break;
    //   case 'oldest':
    //     videos.sort(
    //       (a, b) =>
    //         DateTime.fromISO(b.snippet?.publishedAt as string).toMillis() -
    //         DateTime.fromISO(a.snippet?.publishedAt as string).toMillis()
    //     );
    //     break;
    //   case 'views':
    //     videos.sort(
    //       (a, b) =>
    //         parseInt(b.statistics?.viewCount ?? '0') - parseInt(a.statistics?.viewCount ?? '0')
    //     );
    //     break;
    //   case 'random':
    //     videos = _.shuffle(videos);
    //     break;
    // }

    return videos.map(v => new YoutubeTrack(v));

    // Embed.success(
    //   `Queued ${videos.length.toString()} videos from ` +
    //     `**[${playlist.snippet?.title}](https://youtube.com/playlist?list=${playlist.id})**`
    // ).reply(msg);

    // const queue = client.queues.get(msg.guild.id);
    // if (!queue.playing) caller.playNext(context);
  } catch (err) {
    getLogger(`getYoutubePlaylist`).error(err);
    if (err.toString() === 'Error: resource youtube#playlistListResponse not found')
      throw new Error("% Playlist not found (either it doesn't exist or it's private)");

    throw err;
  }
};
