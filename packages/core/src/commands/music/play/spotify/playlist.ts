import { Message } from 'discord.js';
import _ from 'lodash';
import { Duration } from 'luxon';
import { client } from '../../../../providers';
import { Context, SpotifyTrack } from '../../../../types';
import { delay, Embed, normalizeDuration, regExps } from '../../../../util';
import { CommandPlay } from '../play';
import { checkSpotify } from '../util';

export const getSpotifyPlaylist = async (
  context: Context,
  caller: CommandPlay
): Promise<void | Message> => {
  const { msg, args } = context;
  const playlistId = regExps.spotify.playlist.exec(args._[0]);
  if (!playlistId) return Embed.error('Invalid playlist').reply(msg);

  if (!checkSpotify(msg)) return;

  const playlist = await client.spotify.getPlaylist(playlistId[1]);
  if (!playlist) return Embed.error('Invalid playlist').reply(msg);

  let tracks = playlist.body.tracks.items;

  switch (args.sort) {
    case 'newest':
    case 'oldest':
      Embed.warning(
        'Sorting by date is not supported for Spotify playlists',
        'Using original playlist order'
      )
        .reply(msg)
        .then(delay(5000))
        .then(m => m.delete());
      break;
    case 'views':
      tracks.sort((a, b) => (b.track.popularity ?? 0) - (a.track.popularity ?? 0));
      break;
    case 'random':
      tracks = _.shuffle(tracks);
      break;
  }

  for (const {
    track: { name, artists, duration_ms, id, album },
  } of tracks) {
    caller.queueTrack(
      new SpotifyTrack(msg.author.id, {
        title: name,
        cover: album.images[0],
        artists,
        duration: normalizeDuration(Duration.fromMillis(duration_ms)),
        id,
      }),
      { context, silent: true, beginPlaying: false }
    );
  }

  const queue = client.queues.get(msg.guild.id);

  Embed.success(
    `Queued ${playlist.body.tracks.items.length} tracks from ` +
      `**[${playlist.body.name}](https://open.spotify.com/playlist/${playlist.body.id})**`,
    queue.paused ? 'music is paused btw' : undefined
  ).reply(msg);

  if (!queue.playing) caller.playNext(context);
};
