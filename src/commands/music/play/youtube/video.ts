import { Message } from "discord.js";
import { getLogger } from "log4js";
import { client } from "../../../../providers";
import { Context, YoutubeTrack } from "../../../../types";
import { codeBlock, Embed } from "../../../../util";
import { CommandPlay } from "../play";

export const getYoutubeVideo = async (context: Context, caller: CommandPlay): Promise<void | Message> => {
  const { msg, args } = context;

  try {
    const video = await client.youtube.getVideo(args._[0]);
    if (!video)
      return msg.channel.send(
        Embed.error("Video not found (either it doesn't exist or it's private)")
      );
    caller.queueTrack(new YoutubeTrack(msg.author.id, video), { context });
  } catch (err) {
    getLogger(`MESSAGE ${msg.id}`).error(err);
    if (err.toString() === 'Error: resource youtube#videoListResponse not found')
      return msg.channel.send(
        Embed.error("Video not found (either it doesn't exist or it's private)")
      );

    return msg.channel.send(Embed.error(codeBlock(err)));
  }
}
