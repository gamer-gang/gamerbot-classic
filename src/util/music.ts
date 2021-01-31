import { Message } from 'discord.js';
import { Video } from 'simple-youtube-api';
import { client } from '../providers';
import { GuildQueue, Track } from '../types';
import { formatDuration } from './duration';
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
  track.type === 'youtube' && track.data.livestream
    ? 'livestream'
    : formatDuration(track.data.duration);

export const getTrackUrl = (track: Track): string =>
  track.type === 'spotify'
    ? 'https://open.spotify.com/track/' + track.data.id
    : track.type === 'youtube'
    ? 'https://youtube.com/watch?v=' + track.data.id
    : track.data.url;

export const emptyQueue = (): GuildQueue => ({
  tracks: [],
  current: { index: 0 },
  playing: false,
  paused: false,
  loop: 'none',
});

export const getLoopEmoji = (queue: GuildQueue): string =>
  queue.loop === 'all' ? '🔁' : queue.loop === 'one' ? '🔂' : '';

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
    title: `${playing ? 'Now Playing' : 'Not Playing'} ${getLoopEmoji(queue)}`,
    description: `**[${track.data.title}](${getTrackUrl(track)})** (${
      track.type === 'spotify'
        ? 'Spotify'
        : track.type === 'youtube'
        ? track.data.livestream
          ? 'Livestream'
          : 'YouTube'
        : 'File'
    })`,
  });

  if (track.type === 'youtube')
    embed
      .setThumbnail(track.data.thumbnails.maxres.url)
      .addField(
        'Channel',
        `[${track.data.channel.title}](https://youtube.com/channel/${track.data.channel.id})`,
        true
      );
  else if (track.type === 'spotify')
    embed
      .setThumbnail(track.data.cover.url)
      .addField(
        'Artist',
        track.data.artists
          .map(a => `[${a.name}](https://open.spotify.com/artist/${a.id})`)
          .join(', '),
        true
      );

  embed.addField('Requested by', `<@!${track.requesterId}>`, true);

  if (queue.current.embed) return queue.current.embed?.edit(embed);
  else return;
};
