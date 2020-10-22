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

export const getTrackLength = (track: Track): string =>
  track.type === TrackType.YOUTUBE && track.data.livestream
    ? 'livestream'
    : formatDuration(track.data.duration);

export const getTrackUrl = (track: Track): string =>
  track.type === TrackType.SPOTIFY
    ? 'https://open.spotify.com/track/' + track.data.id
    : track.type === TrackType.YOUTUBE
    ? 'https://youtu.be/' + track.data.id
    : track.data.url;

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

  // queue.current.secondsRemaining = seconds - (thumbPosition / sliderLength) * seconds;

  const embed = new Embed({
    title: playing ? 'now playing' : 'not playing',
    description: `[**${track.data.title}**](${getTrackUrl(track)}) (${
      track.type === TrackType.SPOTIFY
        ? 'spotify'
        : track.type === TrackType.YOUTUBE
        ? track.data.livestream
          ? 'youtube livestream'
          : 'youtube'
        : 'file'
    })`,
  })
    .addField('requested by', `<@!${track.requesterId}>`, true)
    .addField('queue length after', getQueueLength(queue, { first: false }), true);

  if (track.type === TrackType.YOUTUBE)
    embed
      .setThumbnail(track.data.thumbnails.maxres.url)
      .addField('channel', track.data.channel.title, true);
  else if (track.type === TrackType.SPOTIFY)
    embed
      .setThumbnail(track.data.cover.url)
      .addField('artist', track.data.artists.map(a => a.name).join(', '), true);

  if (queue.current.embed) return queue.current.embed?.edit(embed);
  else return;
};
