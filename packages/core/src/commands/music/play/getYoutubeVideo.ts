import { regExps } from '@gamerbot/util';
import { getLogger } from 'log4js';
import { YoutubeTrack } from '../../../models/YoutubeTrack';
import { client } from '../../../providers';

export const getYoutubeVideo = async (query: string): Promise<YoutubeTrack[]> => {
  try {
    const video = await client.youtube.videos.list({
      part: ['snippet', 'contentDetails', 'statistics'],
      id: [regExps.youtube.video.exec(query)![1]],
    });
    if (!video.data.items?.length)
      throw new Error("% Video not found (either it doesn't exist or it's private)");

    return [new YoutubeTrack(video.data.items[0])];
  } catch (err) {
    getLogger(`getYoutubeVideo`).error(err);
    if (err.toString() === 'Error: resource youtube#videoListResponse not found')
      throw new Error("& Video not found (either it doesn't exist or it's private)");

    throw err;
  }
};
