import { normalizeDuration, regExps } from '@gamerbot/util';
import { Duration } from 'luxon';
import { SpotifyTrack } from '../../../models/SpotifyTrack';
import { client } from '../../../providers';
import { checkSpotify } from './util';

export const getSpotifyTrack = async (query: string): Promise<SpotifyTrack[]> => {
  const trackId = regExps.spotify.track.exec(query);
  if (!trackId) throw new Error('% Invalid track');

  checkSpotify();

  const track = await client.spotify.getTrack(trackId[1]);
  if (!track) throw new Error('% Invalid track');

  return [
    new SpotifyTrack({
      title: track.body.name,
      cover: track.body.album.images[0],
      artists: track.body.artists,
      id: track.body.id,
      duration: normalizeDuration(Duration.fromMillis(track.body.duration_ms)),
    }),
  ];
};
