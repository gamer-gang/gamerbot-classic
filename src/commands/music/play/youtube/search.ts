import { Message } from 'discord.js';
import { getLogger } from 'log4js';
import moment from 'moment';
import yts from 'yt-search';
import { client } from '../../../../providers';
import { Context, YoutubeTrack } from '../../../../types';
import { codeBlock, Embed } from '../../../../util';
import { CommandPlay } from '../play';

const parseAgo = (ago: string) => {
  if (!ago) return Date.now();
  const [number, type] = ago.replace(/ ago$/g, '').split(' ');
  return moment(Date.now())
    .subtract(parseInt(number), type as moment.DurationInputArg2)
    .date();
};

export const searchYoutube = async (
  context: Context,
  caller: CommandPlay
): Promise<void | Message> => {
  const { msg, args, config } = context;

  try {
    const searchMessage = await msg.channel.send(Embed.info('loading...'));

    const search = await yts({ query: args._.join(' '), category: 'music' });

    const results =
      args.sort === 'newest'
        ? search.videos.sort((a, b) => parseAgo(a.ago) - parseAgo(b.ago))
        : args.sort === 'oldest'
        ? search.videos.sort((a, b) => parseAgo(b.ago) - parseAgo(a.ago))
        : args.sort === 'views'
        ? search.videos.sort((a, b) => b.views - a.views)
        : search.videos;

    if (!results.length) return searchMessage.edit(Embed.error('no results found'));

    const list = await client.youtube.videos.list({
      part: ['statistics', 'contentDetails', 'snippet'],
      id: results.slice(0, 5).map(v => v.videoId),
    });

    const tracks = list.data.items
      ?.map(v => ({
        ...v,
        livestream: v.snippet?.liveBroadcastContent === 'live',
      }))
      .map(data => new YoutubeTrack(msg.author.id, data));

    if (!tracks?.length) return searchMessage.edit(Embed.error('no results found'));

    searchMessage.edit(
      new Embed({
        title: 'choose a video',
        description: tracks
          .map(
            (track, index) =>
              `${index + 1}. **${track.titleMarkup}** by ${track.authorMarkup} (${
                track.durationString
              }), ${
                args.sort === 'views'
                  ? `${
                      parseInt(track.data.statistics?.viewCount ?? '0')?.toLocaleString() ?? '?'
                    } views`
                  : args.sort !== undefined
                  ? moment(track.data.snippet?.publishedAt).fromNow()
                  : ''
              }`
          )
          .join('\n'),
      })
    );

    const collector = msg.channel.createMessageCollector(
      (message: Message) => message.author.id === msg.author?.id,
      { idle: 15000 }
    );

    let index: number;
    collector.on('collect', (collected: Message) => {
      if (collected.content.startsWith(`${config.prefix}cancel`)) return collector.stop('cancel');
      if (new RegExp(`^\\${config.prefix}p(lay)?`).test(collected.content))
        return collector.stop('playcmd');

      const i = parseInt(collected.content);
      if (isNaN(i) || i < 1 || i > tracks.length)
        return msg.channel.send(Embed.warning('invalid selection, try again'));

      index = i;
      collector.stop();
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'playcmd') return;
      if (reason === 'cancel') return msg.channel.send(Embed.info('cancelled'));
      if (!index || Number.isNaN(index) || index < 1 || index > tracks.length)
        return msg.channel.send(Embed.error("invalid selection, time's up"));

      const video = tracks[index - 1];
      if (!video)
        throw new Error('invalid state: video is null after selecting valid returned search');

      caller.queueTrack(video, { context });
    });
  } catch (err) {
    getLogger(`MESSAGE ${msg.id}`).error(err);
    return msg.channel.send(codeBlock(err));
  }
};
