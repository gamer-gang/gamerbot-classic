import { Message } from 'discord.js';
import { Video } from 'simple-youtube-api';

import { client } from '../providers';
import { Track, TrackType } from '../types';
import { formatDuration, getQueueLength } from './duration';
import { Embed } from './embed';
import { Store } from './store';

const embedCache = new Store<EmbedArgs>({ readImmediately: false, writeOnSet: false });
interface EmbedArgs {
  playing: boolean;
  track?: Track;
}

export const isLivestream = (video: Video): boolean =>
  (video.raw.snippet as Record<string, string>).liveBroadcastContent === 'live';

export const getTrackLength = (track: Track): string =>
  track.type === TrackType.YOUTUBE && track.data.livestream
    ? 'livestream'
    : formatDuration(track.data.duration);

export const getTrackUrl = (track: Track): string =>
  track.type === TrackType.SPOTIFY
    ? 'https://open.spotify.com/track/' + track.data.id
    : track.type === TrackType.YOUTUBE
    ? 'https://youtube.com/watch?v=' + track.data.id
    : track.data.url;

export const updatePlayingEmbed = async (
  opts: Partial<EmbedArgs> & { guildId: string }
): Promise<void | Message> => {
  const guildId = opts?.guildId;

  embedCache.setIfUnset(guildId, opts as EmbedArgs);

  const cache = embedCache.get(guildId);

  cache.playing = opts.playing ?? cache.playing ?? true;
  cache.track = opts.track ?? cache.track;

  const { track, playing } = cache;

  const queue = client.queues.get(guildId);

  if (!track) {
    throw new Error('track is null nerd');
  }

  // if (!track && !playing) {
  //   throw new Error('not enough data provided to music embed');
  // }

  // queue.current.secondsRemaining = seconds - (thumbPosition / sliderLength) * seconds;

  const embed = new Embed({
    title: playing ? 'now playing' : 'not playing',
    description: `**[${track.data.title}](${getTrackUrl(track)})** (${
      track.type === TrackType.SPOTIFY
        ? 'spotify'
        : track.type === TrackType.YOUTUBE
        ? track.data.livestream
          ? 'youtube livestream'
          : 'youtube'
        : 'file'
    })`,
  });

  if (track.type === TrackType.YOUTUBE)
    embed
      .setThumbnail(track.data.thumbnails.maxres.url)
      .addField(
        'channel',
        `[${track.data.channel.title}](https://youtube.com/channel/${track.data.channel.id})`,
        true
      );
  else if (track.type === TrackType.SPOTIFY)
    embed
      .setThumbnail(track.data.cover.url)
      .addField(
        'artist',
        track.data.artists
          .map(a => `[${a.name}](https://open.spotify.com/artist/${a.id})`)
          .join(', '),
        true
      );

  embed
    .addField('requested by', `<@!${track.requesterId}>`, true)
    .addField('queue length after', getQueueLength(queue, { first: false }), true);

  if (queue.current.embed) return queue.current.embed?.edit(embed);
  else return;
};
