import { Message } from 'discord.js';
import { getLogger } from 'log4js';
import moment from 'moment';
import { client } from '../../../../providers';
import { Context, YoutubeTrack } from '../../../../types';
import { codeBlock, Embed, getPlaylistVideos, regExps } from '../../../../util';
import { CommandPlay } from '../play';

export const getYoutubePlaylist = async (
  context: Context,
  caller: CommandPlay
): Promise<void | Message> => {
  const { msg, args } = context;

  try {
    const id = regExps.youtube.playlist.exec(args._[0])![1];

    const [playlist, videos] = await getPlaylistVideos(id);

    args.sort === 'newest'
      ? videos.sort(
          (a, b) => moment(a.snippet?.publishedAt).date() - moment(b.snippet?.publishedAt).date()
        )
      : args.sort === 'oldest'
      ? videos.sort(
          (a, b) => moment(b.snippet?.publishedAt).date() - moment(a.snippet?.publishedAt).date()
        )
      : args.sort === 'views'
      ? videos.sort(
          (a, b) =>
            parseInt(b.statistics?.viewCount ?? '0') - parseInt(a.statistics?.viewCount ?? '0')
        )
      : undefined;

    videos.forEach(v => {
      caller.queueTrack(new YoutubeTrack(msg.author.id, v), {
        context,
        silent: true,
        beginPlaying: false,
      });
    });

    msg.channel.send(
      Embed.success(
        `Queued ${videos.length.toString()} videos from ` +
          `**[${playlist.snippet?.title}](https://youtube.com/playlist?list=${playlist.id})**`
      )
    );

    const queue = client.queues.get(msg.guild.id);

    queue.updateNowPlaying();
    if (!queue.playing) caller.playNext(context);
  } catch (err) {
    getLogger(`MESSAGE ${msg.id}`).error(err);
    if (err.toString() === 'Error: resource youtube#playlistListResponse not found')
      return msg.channel.send(
        Embed.error("Playlist not found (either it doesn't exist or it's private)")
      );

    return msg.channel.send(Embed.error(codeBlock(err)));
  }
};
