import { Message } from 'discord.js';
import { getLogger } from 'log4js';
import yts from 'yt-search';
import { client } from '../../../../providers';
import { Context, YoutubeTrack } from '../../../../types';
import { codeBlock, Embed } from '../../../../util';
import { CommandPlay } from '../play';

export const searchYoutube = async (
  context: Context,
  caller: CommandPlay
): Promise<void | Message> => {
  const { msg, args, config } = context;

  try {
    const searchMessage = await msg.channel.send(Embed.info('loading...'));

    const search = await yts({ query: args._.join(' '), category: 'music' });

    const videos = (
      await Promise.all(search.videos.slice(0, 5).map(v => client.youtube.getVideo(v.url)))
    )
      .flatMap(v => {
        if (!v) return [];
        return {
          ...v,
          livestream: (v.raw.snippet as Record<string, string>).liveBroadcastContent === 'live',
        };
      })
      .map(data => new YoutubeTrack(msg.author.id, data));

    if (!videos.length) return searchMessage.edit(Embed.error('no results found'));

    searchMessage.edit(
      new Embed({
        title: 'choose a video',
        description: videos
          .filter(t => !!t)
          .map(
            (track, index) =>
              `${index + 1}. ` + `**[${track.title}](${track.url})**` + ` (${track.duration})`
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
      if (isNaN(i) || i < 1 || i > videos.length)
        return msg.channel.send(Embed.warning('invalid selection, try again'));

      index = i;
      collector.stop();
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'playcmd') return;
      if (reason === 'cancel') return msg.channel.send(Embed.info('cancelled'));
      if (!index || Number.isNaN(index) || index < 1 || index > videos.length)
        return msg.channel.send(Embed.error("invalid selection, time's up"));

      const video = videos[index - 1];
      if (!video)
        throw new Error('invalid state: video is null after selecting valid returned search');

      caller.queueTrack(video, { context });
    });
  } catch (err) {
    getLogger(`MESSAGE ${msg.id}`).error(err);
    return msg.channel.send(codeBlock(err));
  }
};
