import { normalizeDuration, regExps } from '@gamerbot/util';
import { Duration } from 'luxon';
import { SpotifyTrack } from '../../../models/SpotifyTrack';
import { client } from '../../../providers';
import { checkSpotify } from './util';

export const getSpotifyAlbum = async (query: string): Promise<SpotifyTrack[]> => {
  const albumId = regExps.spotify.album.exec(query);
  if (!albumId) throw new Error('% Invalid album');

  checkSpotify();

  const album = await client.spotify.getAlbum(albumId[1]);
  if (!album) throw new Error('% Invalid album');

  // switch (args.sort) {
  //   case 'newest':
  //   case 'oldest':
  //   case 'views':
  //     Embed.warning(
  //       'Sorting by date or popularity is not supported for Spotify albums',
  //       'Using original album order'
  //     ).reply(msg);
  //     break;
  //   case 'random':
  //     tracks = _.shuffle(tracks);
  //     break;
  // }

  return album.body.tracks.items.map(
    ({ name, artists, duration_ms, id }) =>
      new SpotifyTrack({
        title: name,
        cover: album.body.images[0],
        artists,
        duration: normalizeDuration(Duration.fromMillis(duration_ms)),
        id,
      })
  );
};
