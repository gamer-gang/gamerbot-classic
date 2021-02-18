import { Message } from 'discord.js';
import { getLogger } from 'log4js';
import { client } from '../../../../providers';
import { Context, YoutubeTrack } from '../../../../types';
import { codeBlock, Embed } from '../../../../util';
import { CommandPlay } from '../play';

export const getYoutubeChannel = async (
  context: Context,
  caller: CommandPlay
): Promise<void | Message> => {
  const { msg, args } = context;

  try {
    const channel = await client.youtube.getChannel(args._[0], {
      part: 'snippet,contentDetails',
    });
    if (!channel) return msg.channel.send(Embed.error('Could not resolve channel'));

    const uploadsId = (channel.raw as any)?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) return msg.channel.send(Embed.error('Channel has no uploads'));

    const uploads = await client.youtube.getPlaylistByID(uploadsId);
    if (!uploads) return msg.channel.send(Embed.error('Upload playlist not found'));

    const videos = await uploads.getVideos();
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
          `**[${uploads.title}](https://youtube.com/playlist?list=${uploads.id})**`
      )
    );

    const queue = client.queues.get(msg.guild.id);
    if (!queue.playing) caller.playNext(context);
  } catch (err) {
    // do not ask
    if (err.message.includes("Cannot read property 'length' of undefined"))
      return msg.channel.send(Embed.error('Invalid channel'));

    getLogger(`MESSAGE ${msg.id}`).error(err);
    return msg.channel.send(Embed.error(codeBlock(err)));
  }
};
