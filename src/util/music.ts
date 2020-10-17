import { formatDuration, getQueueLength, toDurationSeconds } from '.';
import { Embed } from '../embed';
import { CmdArgs, Track, TrackType } from '../types';

let embedCache: EmbedArgs;
interface EmbedArgs {
  playing: boolean;
  video: Track;
  thumbPosition: number;
  sliderLength: number;
  cmdArgs: CmdArgs;
}

export const updateVideoEmbed = async (opts?: Partial<EmbedArgs>): Promise<void> => {
  embedCache ??= opts as EmbedArgs;
  embedCache = {
    playing: opts?.playing ?? embedCache?.playing,
    cmdArgs: opts?.cmdArgs ?? embedCache?.cmdArgs,
    sliderLength: opts?.sliderLength ?? embedCache?.sliderLength,
    thumbPosition: opts?.thumbPosition ?? embedCache?.thumbPosition,
    video: opts?.video ?? embedCache?.video,
  };

  const { video, thumbPosition, sliderLength, cmdArgs, playing } = embedCache;

  const { queueStore, msg } = cmdArgs;

  const queue = queueStore.get(msg.guild?.id as string);

  const seconds = toDurationSeconds(video.data.duration);
  const duration = formatDuration(seconds);

  queue.current.secondsRemaining = seconds - (thumbPosition / sliderLength) * seconds;

  const before = Math.max(thumbPosition, 0);
  const after = Math.max(sliderLength - (thumbPosition + 1), 0);

  const embed = new Embed({
    title: video.data.title,
    description:
      '–'.repeat(before) +
      (playing ? '\\⚪' : '⬜') +
      '–'.repeat(after) +
      ` (${
        video.type === TrackType.YOUTUBE && video.data.livestream
          ? 'livestream'
          : `${formatDuration(
              toDurationSeconds(video.data.duration) - queue.current.secondsRemaining
            )}/${duration}`
      })`,
  })
    .setAuthor('gamerbot80: now playing', 'attachment://hexagon.png')
    .addField('requester', `<@!${video.requesterId}>`, true)
    .addField('queue length', getQueueLength(queue), true);

  video.type === TrackType.YOUTUBE &&
    embed
      .setThumbnail(video.data.thumbnails.high.url)
      .setURL(`https://youtu.be/${video.data.id}`)
      .addField('channel', video.data.title, true);

  queue.current.embed
    ? queue.current.embed?.edit(embed)
    : (queue.current.embed = await msg.channel.send(embed));
};
