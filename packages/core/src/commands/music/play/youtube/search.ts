import { Context } from '@gamerbot/types';
import { codeBlock, delay, Embed } from '@gamerbot/util';
import { Message, TextChannel } from 'discord.js';
import _ from 'lodash';
import { getLogger } from 'log4js';
import { DateTime } from 'luxon';
import yts from 'yt-search';
import { YoutubeTrack } from '../../../../models';
import { client } from '../../../../providers';
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

    if (!results.length) return Embed.error('No results found').reply(msg);

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

    if (!tracks?.length) return Embed.error('No results found').reply(msg);

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
      const embed = new Embed({
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
                  ? `, ${DateTime.fromISO(track.data.snippet?.publishedAt as string).toRelative()}`
                  : ''
              }`
          )
          .join('\n'),
      });

      const selectionMessage = await embed.reply(msg);

      const collector = msg.channel.createMessageCollector({
        idle: 15000,
        filter: (message: Message) => message.author.id === msg.author?.id,
      });

      collector.on('collect', (collected: Message) => {
        if (collected.content.startsWith(`${config.prefix}cancel`))
          return void collector.stop('cancel');
        if (new RegExp(`^\\${config.prefix}p(lay)?`).test(collected.content))
          return void collector.stop('playcmd');

        const i = parseInt(collected.content);
        if (isNaN(i) || i < 1 || i > tracks.length)
          return void Embed.warning('invalid selection, try again')
            .send(msg.channel)
            .then(delay(5000))
            .then(m => m.delete());

        selectionIndex = i;
        collector.stop();
      });

      collector.on('end', async (collected, reason) => {
        const clean = () =>
          (msg.channel as TextChannel).bulkDelete([
            ...collected.map(m => m.id),
            selectionMessage.id,
          ]);

        if (reason === 'playcmd') return void selectionMessage.delete();
        else if (reason === 'cancel') {
          Embed.info('cancelled')
            .send(msg.channel)
            .then(delay(5000))
            .then(m => m.delete());
          clean();
          return;
        } else if (
          !selectionIndex ||
          Number.isNaN(selectionIndex) ||
          selectionIndex < 1 ||
          selectionIndex > tracks.length
        ) {
          Embed.error("invalid selection, time's up")
            .send(msg.channel)
            .then(delay(5000))
            .then(m => m.delete());
          clean();
          return;
        }

        clean();
        queueVideo();
      });
    }
  } catch (err) {
    getLogger(`MESSAGE ${msg.id}`).error(err);
    return Embed.error(codeBlock(err)).reply(msg);
  }
};
