import { Message } from 'discord.js';
import { getLogger } from 'log4js';
import { client } from '../../../../providers';
import { Context, YoutubeTrack } from '../../../../types';
import { codeBlock, Embed } from '../../../../util';
import { CommandPlay } from '../play';

export const getYoutubePlaylist = async (
  context: Context,
  caller: CommandPlay
): Promise<void | Message> => {
  const { msg, args } = context;
  try {
    const playlist = await client.youtube.getPlaylist(args._[0]);
    if (!playlist)
      return msg.channel.send(
        Embed.error("Playlist not found (either it doesn't exist or it's private)")
      );

    const videos = await playlist.getVideos();
    (await Promise.all(videos.map(v => client.youtube.getVideoByID(v.id)))).map(
      v =>
        v &&
        caller.queueTrack(new YoutubeTrack(msg.author.id, v), {
          context,
          silent: true,
          beginPlaying: false,
        })
    );

    msg.channel.send(
      Embed.success(
        `Queued ${videos.length.toString()} videos from ` +
          `**[${playlist.title}](https://youtube.com/playlist?list=${playlist.id})**`
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
