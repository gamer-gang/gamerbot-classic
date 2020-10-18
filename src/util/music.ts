import { Message } from 'discord.js';

import { CmdArgs, Track, TrackType } from '../types';
import { formatDuration, getQueueLength, toDurationSeconds } from '../util';
import { Embed } from './embed';

let embedCache: EmbedArgs;
interface EmbedArgs {
  playing: boolean;
  track: Track;
  thumbPosition: number;
  sliderLength: number;
  cmdArgs: CmdArgs;
}

export const updatePlayingEmbed = async (opts?: Partial<EmbedArgs>): Promise<void | Message> => {
  embedCache ??= opts as EmbedArgs;
  embedCache = {
    playing: opts?.playing ?? embedCache?.playing,
    cmdArgs: opts?.cmdArgs ?? embedCache?.cmdArgs,
    sliderLength: opts?.sliderLength ?? embedCache?.sliderLength,
    thumbPosition: opts?.thumbPosition ?? embedCache?.thumbPosition,
    track: opts?.track ?? embedCache?.track,
  };

  const { track, thumbPosition, sliderLength, cmdArgs, playing } = embedCache;

  const { queueStore, msg } = cmdArgs;

  const queue = queueStore.get(msg.guild?.id as string);

  const seconds = toDurationSeconds(track.data.duration);
  const duration = formatDuration(seconds);

  queue.current.secondsRemaining = seconds - (thumbPosition / sliderLength) * seconds;

  const before = Math.max(thumbPosition, 0);
  const after = Math.max(sliderLength - (thumbPosition + 1), 0);

  const embed = new Embed({
    title: track.data.title,
    description:
      track.type === TrackType.YOUTUBE && track.data.livestream
        ? 'livestream'
        : '–'.repeat(before) +
          (playing ? '\\⚪' : '◻️') +
          '–'.repeat(after) +
          ` (~${formatDuration(
            toDurationSeconds(track.data.duration) - queue.current.secondsRemaining
          )}/${duration})`,
  })
    .setAuthor(
      'gamerbot80: ' + (playing ? 'now playing' : 'not playing'),
      'attachment://hexagon.png'
    )
    .addField('requester', `<@!${track.requesterId}>`, true)
    .addField('queue length', getQueueLength(queue, { first: true }), true);

  track.type === TrackType.YOUTUBE &&
    embed
      .setThumbnail(track.data.thumbnails.maxres.url)
      .setURL(`https://youtu.be/${track.data.id}`)
      .addField('channel', track.data.channel.title, true);

  if (queue.current.embed) return queue.current.embed?.edit(embed);
  else return;
};
