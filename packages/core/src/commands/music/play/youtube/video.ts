import { Context } from '@gamerbot/types';
import { codeBlock, Embed, regExps } from '@gamerbot/util';
import { Message } from 'discord.js';
import { getLogger } from 'log4js';
import { YoutubeTrack } from '../../../../models';
import { client } from '../../../../providers';
import { CommandPlay } from '../play';

export const getYoutubeVideo = async (
  context: Context,
  caller: CommandPlay
): Promise<void | Message> => {
  const { msg, args } = context;

  try {
    const video = await client.youtube.videos.list({
      part: ['snippet', 'contentDetails', 'statistics'],
      id: [regExps.youtube.video.exec(args._[0])![1]],
    });
    if (!video.data.items?.length)
      return Embed.error("Video not found (either it doesn't exist or it's private)").reply(msg);
    caller.queueTrack(new YoutubeTrack(msg.author.id, video.data.items[0]), { context });
  } catch (err) {
    getLogger(`getYoutubeVideo[guild=${context.msg.guild.id}]`).error(err);
    if (err.toString() === 'Error: resource youtube#videoListResponse not found')
      return Embed.error("Video not found (either it doesn't exist or it's private)").reply(msg);

    return Embed.error(codeBlock(err)).reply(msg);
  }
};
