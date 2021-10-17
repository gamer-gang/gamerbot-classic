import { normalizeDuration, regExps } from '@gamerbot/util';
import { Duration } from 'luxon';
import { SpotifyTrack } from '../../../models/SpotifyTrack';
import { client } from '../../../providers';
import { checkSpotify } from './util';

export const getSpotifyPlaylist = async (query: string): Promise<SpotifyTrack[]> => {
  const playlistId = regExps.spotify.playlist.exec(query);
  if (!playlistId) throw new Error('% Invalid playlist');

  checkSpotify();

  const playlist = await client.spotify.getPlaylist(playlistId[1]);
  if (!playlist) throw new Error('% Invalid playlist');

  // switch (args.sort) {
  //   case 'newest':
  //   case 'oldest':
  //     Embed.warning(
  //       'Sorting by date is not supported for Spotify playlists',
  //       'Using original playlist order'
  //     )
  //       .reply(msg)
  //       .then(delay(5000))
  //       .then(m => m.delete());
  //     break;
  //   case 'views':
  //     tracks.sort((a, b) => (b.track.popularity ?? 0) - (a.track.popularity ?? 0));
  //     break;
  //   case 'random':
  //     tracks = _.shuffle(tracks);
  //     break;
  // }

  return playlist.body.tracks.items.map(
    ({ track: { name, artists, duration_ms, id, album } }) =>
      new SpotifyTrack({
        title: name,
        cover: album.images[0],
        artists,
        duration: normalizeDuration(Duration.fromMillis(duration_ms)),
        id,
      })
  );
};
