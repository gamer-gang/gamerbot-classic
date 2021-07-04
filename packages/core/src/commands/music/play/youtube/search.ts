import { Message, TextChannel } from 'discord.js';
import _ from 'lodash';
import { getLogger } from 'log4js';
import { DateTime } from 'luxon';
import yts from 'yt-search';
import { client } from '../../../../providers';
import { Context, YoutubeTrack } from '../../../../types';
import { codeBlock, Embed } from '../../../../util';
import { CommandPlay } from '../play';

const parseAgo = (ago: string) => {
  if (!ago) return Date.now();
  const [number, type] = ago.replace(/ ago$/g, '').split(' ');
  return DateTime.now()
    .minus({ [type]: parseInt(number) })
    .toMillis();
};

export const searchYoutube = async (
  context: Context,
  caller: CommandPlay
): Promise<void | Message> => {
  const { msg, args, config } = context;

  try {
    msg.channel.startTyping();

    const search = await yts({ query: args._.join(' '), category: 'music' });

    const results =
      args.sort === 'newest'
        ? search.videos.sort((a, b) => parseAgo(a.ago) - parseAgo(b.ago))
        : args.sort === 'oldest'
        ? search.videos.sort((a, b) => parseAgo(b.ago) - parseAgo(a.ago))
        : args.sort === 'views'
        ? search.videos.sort((a, b) => b.views - a.views)
        : args.sort === 'random'
        ? _.shuffle(search.videos)
        : search.videos;

    if (!results.length) return msg.channel.send(Embed.error('No results found'));

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

    if (!tracks?.length) return msg.channel.send(Embed.error('No results found'));

    let selectionIndex = 0;

    const queueVideo = () => {
      const video = tracks[selectionIndex - 1];
      if (!video)
        throw new Error('invalid state: video is null after selecting valid returned search');

      caller.queueTrack(video, { context });
    };

    for (const arg of [1, 2, 3, 4, 5]) {
      if (args[arg.toString()] === true) selectionIndex = arg;
      break;
    }

    if (selectionIndex !== 0) {
      queueVideo();
    } else {
      msg.channel.stopTyping(true);
      const selectionMessage = await msg.channel.send(
        new Embed({
          title: 'choose a video',
          description: tracks
            .map(
              (track, index) =>
                `${index + 1}. **${track.titleMarkup}** by ${track.authorMarkup} (${
                  track.durationString
                }) ${
                  args.sort === 'views'
                    ? `, ${
                        parseInt(track.data.statistics?.viewCount ?? '0')?.toLocaleString() ?? '?'
                      } views`
                    : args.sort === 'newest' || args.sort === 'oldest'
                    ? `, ${DateTime.fromISO(
                        track.data.snippet?.publishedAt as string
                      ).toRelative()}`
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

      collector.on('collect', (collected: Message) => {
        if (collected.content.startsWith(`${config.prefix}cancel`)) return collector.stop('cancel');
        if (new RegExp(`^\\${config.prefix}p(lay)?`).test(collected.content))
          return collector.stop('playcmd');

        const i = parseInt(collected.content);
        if (isNaN(i) || i < 1 || i > tracks.length)
          return msg.channel
            .send(Embed.warning('invalid selection, try again'))
            .then(m => m.delete({ timeout: 5000 }));

        selectionIndex = i;
        collector.stop();
      });

      collector.on('end', async (collected, reason) => {
        const clean = () =>
          (msg.channel as TextChannel).bulkDelete([
            ...collected.map(m => m.id),
            selectionMessage.id,
          ]);

        if (reason === 'playcmd') return selectionMessage.delete();
        else if (reason === 'cancel') {
          msg.channel.send(Embed.info('cancelled')).then(m => m.delete({ timeout: 5000 }));
          return clean();
        } else if (
          !selectionIndex ||
          Number.isNaN(selectionIndex) ||
          selectionIndex < 1 ||
          selectionIndex > tracks.length
        ) {
          msg.channel
            .send(Embed.error("invalid selection, time's up"))
            .then(m => m.delete({ timeout: 5000 }));
          return clean();
        }

        queueVideo();
      });
    }
  } catch (err) {
    getLogger(`MESSAGE ${msg.id}`).error(err);
    return msg.channel.send(codeBlock(err));
  }
};
