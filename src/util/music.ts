import { Message } from 'discord.js';

import { CmdArgs, Track, TrackType } from '../types';
import { formatDuration, getQueueLength, toDurationSeconds } from '../util';
import { Embed } from './embed';

let embedCache: EmbedArgs;
interface EmbedArgs {
  playing: boolean;
  track: Track;
  cmdArgs: CmdArgs;
}

export const updatePlayingEmbed = async (opts?: Partial<EmbedArgs>): Promise<void | Message> => {
  embedCache ??= opts as EmbedArgs;
  embedCache = {
    playing: opts?.playing ?? embedCache?.playing,
    cmdArgs: opts?.cmdArgs ?? embedCache?.cmdArgs,
    track: opts?.track ?? embedCache?.track,
  };

  const { track, cmdArgs, playing } = embedCache;

  const { queueStore, msg } = cmdArgs;

  const queue = queueStore.get(msg.guild?.id as string);

  const seconds = toDurationSeconds(track.data.duration);
  const duration = formatDuration(seconds);

  // queue.current.secondsRemaining = seconds - (thumbPosition / sliderLength) * seconds;

  const embed = new Embed({
    title: track.data.title,
    description:
      track.type === TrackType.SPOTIFY
        ? 'spotify'
        : track.type === TrackType.YOUTUBE
        ? track.data.livestream
          ? 'youtube livestream'
          : 'youtube'
        : 'file',
  })
    .setAuthor(
      playing ? 'now playing' : 'not playing',
      'attachment://hexagon.png'
    )
    .addField('requester', `<@!${track.requesterId}>`, true)
    .addField('queue length', getQueueLength(queue, { first: true }), true);

  track.type === TrackType.YOUTUBE &&
    embed
      .setThumbnail(track.data.thumbnails.maxres.url)
      .setURL(`https://youtu.be/${track.data.id}`)
      .addField('channel', track.data.channel.title, true);

  track.type === TrackType.SPOTIFY &&
    embed
      .setThumbnail(track.data.cover.url)
      .setURL(`https://open.spotify.com/track/${track.data.id}`)
      .addField('artist', track.data.artists.map(a => a.name).join(', '), true);

  if (queue.current.embed) return queue.current.embed?.edit(embed);
  else return;
};
