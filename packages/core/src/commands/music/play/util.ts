import { DateTime } from 'luxon';
import { client } from '../../../providers';

export const checkSpotify = (): void | never => {
  if (client.spotifyDisabled)
    throw new Error('% Spotify support disabled: no credentials provided in environment');

  if (!client.spotify.getAccessToken()) {
    throw new Error(
      `% Cannot connect to spotify. Please try again in ${DateTime.now()
        .plus({ seconds: client.spotifyTimeoutSeconds })
        .toRelative({})}`
    );
  }
};
