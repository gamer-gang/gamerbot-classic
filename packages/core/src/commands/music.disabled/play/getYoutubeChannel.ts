import { getPlaylistVideos, regExps } from '@gamerbot/util';
import { getLogger } from 'log4js';
import { YoutubeTrack } from '../../../models/YoutubeTrack';
import { client } from '../../../providers';

export const getYoutubeChannel = async (query: string): Promise<YoutubeTrack[]> => {
  try {
    const id = regExps.youtube.channel.exec(query)![1];
    const response = await client.youtube.channels.list({
      part: ['snippet', 'contentDetails'],
      id: [id],
    });

    if (!response.data.items?.length) throw new Error('% Invalid channel');

    const channel = response.data.items[0];

    const uploadsId = channel?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) throw new Error('% Channel has no uploads list');

    // eslint-disable-next-line prefer-const
    let [uploads, videos] = await getPlaylistVideos(uploadsId);

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

    // videos.forEach(v => {
    //   caller.queueTrack();
    // });

    return videos.map(v => new YoutubeTrack(v));
  } catch (err) {
    if (err.message.includes("Cannot read property 'length' of undefined"))
      throw new Error('% Invalid channel');

    getLogger(`getYoutubeChannel`).error(err);
    throw err;
  }
};
