import { Message } from 'discord.js';
import { DateTime } from 'luxon';
import { client } from '../../../providers';
import { Embed } from '../../../util';

export const checkSpotify = (msg: Message): boolean => {
  if (client.spotifyDisabled) {
    msg.channel.send(
      Embed.error('Spotify support disabled', 'No credentials provided in environment')
    );
    return false;
  }

  if (!client.spotify.getAccessToken()) {
    msg.channel.send(
      Embed.error(
        'Cannot connect to spotify',
        `Please try again in ${DateTime.now()
          .plus({ seconds: client.spotifyTimeoutSeconds })
          .toRelative({})}`
      )
    );

    return false;
  }

  return true;
};
