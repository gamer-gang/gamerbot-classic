import { Context } from '@gamerbot/types';
import { codeBlock, Embed, getPlaylistVideos, regExps } from '@gamerbot/util';
import { Message } from 'discord.js';
import _ from 'lodash';
import { getLogger } from 'log4js';
import { DateTime } from 'luxon';
import { YoutubeTrack } from '../../../../models';
import { client } from '../../../../providers';
import { CommandPlay } from '../play';

export const getYoutubeChannel = async (
  context: Context,
  caller: CommandPlay
): Promise<void | Message> => {
  const { msg, args } = context;

  try {
    const id = regExps.youtube.channel.exec(args._[0])![1];
    const response = await client.youtube.channels.list({
      part: ['snippet', 'contentDetails'],
      id: [id],
    });

    if (!response.data.items?.length) return Embed.error('Invalid channel').reply(msg);

    const channel = response.data.items[0];

    const uploadsId = channel?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) return Embed.error('Channel has no uploads list').reply(msg);

    // eslint-disable-next-line prefer-const
    let [uploads, videos] = await getPlaylistVideos(uploadsId);

    switch (args.sort) {
      case 'newest':
        videos.sort(
          (a, b) =>
            DateTime.fromISO(a.snippet?.publishedAt as string).toMillis() -
            DateTime.fromISO(b.snippet?.publishedAt as string).toMillis()
        );
        break;
      case 'oldest':
        videos.sort(
          (a, b) =>
            DateTime.fromISO(b.snippet?.publishedAt as string).toMillis() -
            DateTime.fromISO(a.snippet?.publishedAt as string).toMillis()
        );
        break;
      case 'views':
        videos.sort(
          (a, b) =>
            parseInt(b.statistics?.viewCount ?? '0') - parseInt(a.statistics?.viewCount ?? '0')
        );
        break;
      case 'random':
        videos = _.shuffle(videos);
        break;
    }

    videos.forEach(v => {
      caller.queueTrack(new YoutubeTrack(msg.author.id, v), {
        context,
        silent: true,
        beginPlaying: false,
      });
    });

    Embed.success(
      `Queued ${videos.length.toString()} videos from ` +
        `**[${uploads.snippet?.title}](https://youtube.com/playlist?list=${uploads.id})**`
    ).reply(msg);

    const queue = client.queues.get(msg.guild.id);
    if (!queue.playing) caller.playNext(context);
  } catch (err) {
    // do not ask
    if (err.message.includes("Cannot read property 'length' of undefined"))
      return Embed.error('Invalid channel').reply(msg);

    getLogger(`getYoutubeChannel[guild=${context.msg.guild.id}]`).error(err);
    return Embed.error(codeBlock(err)).reply(msg);
  }
};
